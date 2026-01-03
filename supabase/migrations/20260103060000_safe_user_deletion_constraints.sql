-- Migration: Enable Safe User Deletion by relaxing foreign key constraints on optional relationships
-- Switch FROM 'NO ACTION' (blocker) TO 'SET NULL' for historical/audit fields

BEGIN;

-- 1. Customers: Representative (Sales Rep)
-- If the rep is deleted, the customer remains but unassigned (or assigned generic)
ALTER TABLE "public"."customers" DROP CONSTRAINT IF EXISTS "customers_representative_id_fkey";
ALTER TABLE "public"."customers" 
    ADD CONSTRAINT "customers_representative_id_fkey" 
    FOREIGN KEY ("representative_id") 
    REFERENCES "public"."profiles"("id") 
    ON DELETE SET NULL;

-- 2. Customers: Contract Signer
-- If the signer is deleted, we keep the customer/contract but signer link becomes null (name potentially stored in contract_data)
ALTER TABLE "public"."customers" DROP CONSTRAINT IF EXISTS "customers_contract_signer_id_fkey";
ALTER TABLE "public"."customers" 
    ADD CONSTRAINT "customers_contract_signer_id_fkey" 
    FOREIGN KEY ("contract_signer_id") 
    REFERENCES "public"."profiles"("id") 
    ON DELETE SET NULL;

-- 3. Service Ticket History: Changed By
-- Audit logs should persist even if the user is deleted.
ALTER TABLE "public"."service_ticket_history" DROP CONSTRAINT IF EXISTS "service_ticket_history_changed_by_fkey";
ALTER TABLE "public"."service_ticket_history" 
    ADD CONSTRAINT "service_ticket_history_changed_by_fkey" 
    FOREIGN KEY ("changed_by") 
    REFERENCES "auth"."users"("id") 
    ON DELETE SET NULL;

-- 4. Price Tables: Created By
-- Pricing versions should persist.
ALTER TABLE "public"."price_tables" DROP CONSTRAINT IF EXISTS "price_tables_created_by_fkey";
ALTER TABLE "public"."price_tables" 
    ADD CONSTRAINT "price_tables_created_by_fkey" 
    FOREIGN KEY ("created_by") 
    REFERENCES "auth"."users"("id") 
    ON DELETE SET NULL;

COMMIT;
