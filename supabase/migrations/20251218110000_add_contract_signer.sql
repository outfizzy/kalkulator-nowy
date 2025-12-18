-- Add signed_by and sales_rep_id to contracts table

-- Reference public.profiles instead of auth.users to allow easy joins via API
ALTER TABLE contracts
ADD COLUMN signed_by uuid REFERENCES public.profiles(id),
ADD COLUMN sales_rep_id uuid REFERENCES public.profiles(id);

-- Optional: Create an index for faster lookups
CREATE INDEX idx_contracts_sales_rep_id ON contracts(sales_rep_id);

-- Comment on columns
COMMENT ON COLUMN contracts.signed_by IS 'User who changed status to signed';
COMMENT ON COLUMN contracts.sales_rep_id IS 'Sales representative responsible for this contract (Account Manager)';
