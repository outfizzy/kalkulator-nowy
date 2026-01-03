-- Robustly fix call_actions schema
-- Handles missing table, missing columns, and ensures correct types

DO $$
BEGIN
    -- 1. Create table if it doesn't exist with basic structure
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'call_actions') THEN
        CREATE TABLE "public"."call_actions" (
            "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            "created_at" timestamptz DEFAULT now(),
            "user_id" uuid REFERENCES auth.users(id),
            "call_id" text,
            "action_type" text
        );
    END IF;

    -- 2. Add customer_id if it doesn't exist (Nullable by default)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'call_actions' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."call_actions" 
        ADD COLUMN "customer_id" uuid REFERENCES "public"."customers"("id");
    END IF;

    -- 3. Ensure customer_id is nullable (fix for the specific 42703 error context if it was a weird state, but mostly defines the schema)
    ALTER TABLE "public"."call_actions" ALTER COLUMN "customer_id" DROP NOT NULL;

    -- 4. Ensure call_id is text (in case it was created as something else)
    ALTER TABLE "public"."call_actions" ALTER COLUMN "call_id" TYPE text;

    -- 5. Ensure action_type exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'call_actions' 
        AND column_name = 'action_type'
    ) THEN
        ALTER TABLE "public"."call_actions" 
        ADD COLUMN "action_type" text;
    END IF;

    -- 6. Enable RLS
    ALTER TABLE "public"."call_actions" ENABLE ROW LEVEL SECURITY;

END $$;

-- 7. Grant permissions
GRANT ALL ON TABLE "public"."call_actions" TO authenticated;
GRANT ALL ON TABLE "public"."call_actions" TO service_role;

-- 8. Refresh Policies (Idempotent)
DO $$
BEGIN
   -- Insert Policy
   IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert access for authenticated users' AND tablename = 'call_actions'
   ) THEN
      CREATE POLICY "Enable insert access for authenticated users" ON "public"."call_actions"
      AS PERMISSIVE FOR INSERT
      TO authenticated
      WITH CHECK (true);
   END IF;
   
   -- Select Policy
   IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Enable select access for authenticated users' AND tablename = 'call_actions'
   ) THEN
      CREATE POLICY "Enable select access for authenticated users" ON "public"."call_actions"
      AS PERMISSIVE FOR SELECT
      TO authenticated
      USING (true);
   END IF;
END $$;
