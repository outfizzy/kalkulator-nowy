-- Ensure the table exists (it should, but good for idempotency if we were creating it, here we assume it exists or we alert)
-- We'll use a safe DO block to add the constraint if it doesn't exist

DO $$
BEGIN
    -- Check if constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'call_actions_user_id_fkey'
        AND table_name = 'call_actions'
    ) THEN
        ALTER TABLE "public"."call_actions"
        ADD CONSTRAINT "call_actions_user_id_fkey"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("id");
    END IF;
END $$;

-- Enable RLS if not already enabled (good practice)
ALTER TABLE "public"."call_actions" ENABLE ROW LEVEL SECURITY;

-- Ensure policy exists for viewing (if not exists)
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'call_actions'
   ) THEN
      CREATE POLICY "Enable read access for all users" ON "public"."call_actions"
      AS PERMISSIVE FOR SELECT
      TO public
      USING (true);
   END IF;
END $$;

-- Ensure policy exists for inserting (if not exists)
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert access for authenticated users' AND tablename = 'call_actions'
   ) THEN
      CREATE POLICY "Enable insert access for authenticated users" ON "public"."call_actions"
      AS PERMISSIVE FOR INSERT
      TO authenticated
      WITH CHECK (true);
   END IF;
END $$;
