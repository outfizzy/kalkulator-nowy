-- Add 'customer_id' column to 'leads' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'customer_id') THEN
        ALTER TABLE leads ADD COLUMN customer_id UUID REFERENCES customers(id);
    END IF;
END $$;

-- Add 'email_message_id' column to 'leads' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email_message_id') THEN
        ALTER TABLE leads ADD COLUMN email_message_id TEXT;
    END IF;
END $$;

-- Force schema cache reload again just in case
NOTIFY pgrst, 'reload config';
