-- Messenger conversations
CREATE TABLE messenger_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL UNIQUE,
  sender_name text,
  sender_profile_pic text,
  lead_id uuid REFERENCES leads(id),
  lead_data jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  message_count int DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messenger messages
CREATE TABLE messenger_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  sender_name text,
  direction text NOT NULL DEFAULT 'inbound',
  message text NOT NULL,
  ai_response text,
  lead_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messenger_conv_sender ON messenger_conversations(sender_id);
CREATE INDEX idx_messenger_msg_conv ON messenger_messages(conversation_id);
CREATE INDEX idx_messenger_msg_created ON messenger_messages(created_at DESC);

-- RLS: allow service_role full access, authenticated read
ALTER TABLE messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_messenger_conv" ON messenger_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_messenger_conv" ON messenger_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role_messenger_msg" ON messenger_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_messenger_msg" ON messenger_messages FOR SELECT TO authenticated USING (true);
