-- Add public_token column if it doesn't exist
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "public_token" UUID;

-- Add public_token_created_at column
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "public_token_created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add unique constraint to public_token
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'offers_public_token_key'
    ) THEN
        ALTER TABLE "offers" ADD CONSTRAINT "offers_public_token_key" UNIQUE ("public_token");
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS "idx_offers_public_token" ON "offers" ("public_token");

-- Update the get_offer_by_token function to include the new column if it was defined before the column existed
CREATE OR REPLACE FUNCTION get_offer_by_token(token_input UUID)
RETURNS SETOF offers
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM offers
  WHERE public_token = token_input
  LIMIT 1;
$$;
