-- Add foreign key relationship for customer_communications -> profiles
-- This fixes the error: "Could not find a relationship between 'customer_communications' and 'profiles'"

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'customer_communications_user_id_fkey'
    ) THEN
        ALTER TABLE "customer_communications"
        ADD CONSTRAINT "customer_communications_user_id_fkey"
        FOREIGN KEY ("user_id")
        REFERENCES "profiles" ("id")
        ON DELETE SET NULL;
    END IF;
END $$;

-- Reload Schema Cache to Apply Changes Immediately
NOTIFY pgrst, 'reload config';
