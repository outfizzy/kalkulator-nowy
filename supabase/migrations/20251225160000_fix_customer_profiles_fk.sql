-- Fix Foreign Keys to reference public.profiles instead of auth.users
-- This is required for PostgREST joins to work correctly

ALTER TABLE "public"."customers" 
DROP CONSTRAINT IF EXISTS customers_representative_id_fkey,
DROP CONSTRAINT IF EXISTS customers_contract_signer_id_fkey;

ALTER TABLE "public"."customers"
ADD CONSTRAINT customers_representative_id_fkey 
    FOREIGN KEY (representative_id) 
    REFERENCES "public"."profiles"(id),
ADD CONSTRAINT customers_contract_signer_id_fkey 
    FOREIGN KEY (contract_signer_id) 
    REFERENCES "public"."profiles"(id);
