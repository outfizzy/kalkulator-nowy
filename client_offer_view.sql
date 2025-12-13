-- 1. Add public_token to offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid();
ALTER TABLE offers ADD COLUMN IF NOT EXISTS public_token_created_at timestamptz DEFAULT now();

-- Ensure unique index
CREATE UNIQUE INDEX IF NOT EXISTS offers_public_token_idx ON offers(public_token);

-- 2. Create lead_messages table
CREATE TABLE IF NOT EXISTS lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES offers(id) ON DELETE SET NULL,
  sender_type text CHECK (sender_type IN ('client', 'user')),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE lead_messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Authenticated Users (Sales Reps)
CREATE POLICY "Users can manage all messages" ON lead_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. Secure Function to fetch Offer by Token (Public Access)
CREATE OR REPLACE FUNCTION get_offer_by_token(token_input uuid)
RETURNS SETOF offers
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM offers WHERE public_token = token_input LIMIT 1;
$$;

-- 6. Secure Function to send Message as Client (Public Access)
CREATE OR REPLACE FUNCTION send_client_message(token_input uuid, message_content text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_offer_id uuid;
  target_lead_id uuid;
BEGIN
  -- Verify token and find linked Lead
  SELECT id, lead_id INTO target_offer_id, target_lead_id
  FROM offers
  WHERE public_token = token_input;

  IF target_offer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Insert Message
  INSERT INTO lead_messages (lead_id, offer_id, sender_type, content, is_read)
  VALUES (target_lead_id, target_offer_id, 'client', message_content, false);

  RETURN true;
END;
$$;

-- Grant EXECUTE to public/anon for these functions? 
-- Supabase usually allows public execution of functions unless restricted?
-- Explicitly grant just in case, though usually SECURITY DEFINER runs with owner privs.
GRANT EXECUTE ON FUNCTION get_offer_by_token(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION send_client_message(uuid, text) TO anon, authenticated, service_role;
