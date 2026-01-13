DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'fair_products') THEN 
        ALTER TABLE leads ADD COLUMN fair_products JSONB DEFAULT '[]'::jsonb; 
    END IF;
END $$;
