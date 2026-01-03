-- Add signed_by and sales_rep_id to contracts table safely
DO $$
BEGIN
    -- Add signed_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'signed_by') THEN
        ALTER TABLE contracts ADD COLUMN signed_by uuid REFERENCES public.profiles(id);
        COMMENT ON COLUMN contracts.signed_by IS 'User who changed status to signed';
    END IF;

    -- Add sales_rep_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'sales_rep_id') THEN
        ALTER TABLE contracts ADD COLUMN sales_rep_id uuid REFERENCES public.profiles(id);
        COMMENT ON COLUMN contracts.sales_rep_id IS 'Sales representative responsible for this contract (Account Manager)';
    END IF;
END $$;

-- Create index safely
CREATE INDEX IF NOT EXISTS idx_contracts_sales_rep_id ON contracts(sales_rep_id);
