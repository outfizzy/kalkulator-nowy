-- Migration: Enable Safe Customer Deletion by Cascading Deletion to Dependencies
-- Tables affected: offers, contracts, installations, service_tickets

BEGIN;

-- 1. OFFERS -> CUSTOMERS
ALTER TABLE "public"."offers" DROP CONSTRAINT IF EXISTS "offers_customer_id_fkey";
ALTER TABLE "public"."offers"
    ADD CONSTRAINT "offers_customer_id_fkey"
    FOREIGN KEY ("customer_id")
    REFERENCES "public"."customers"("id")
    ON DELETE CASCADE;

-- 2. CONTRACTS -> OFFERS (Indirect link to customer)
ALTER TABLE "public"."contracts" DROP CONSTRAINT IF EXISTS "contracts_offer_id_fkey";
ALTER TABLE "public"."contracts"
    ADD CONSTRAINT "contracts_offer_id_fkey"
    FOREIGN KEY ("offer_id")
    REFERENCES "public"."offers"("id")
    ON DELETE CASCADE;

-- 3. INSTALLATIONS -> OFFERS (Indirect link to customer)
-- Ensure that deleting an offer also removes the installation
ALTER TABLE "public"."installations" DROP CONSTRAINT IF EXISTS "installations_offer_id_fkey";
ALTER TABLE "public"."installations"
    ADD CONSTRAINT "installations_offer_id_fkey"
    FOREIGN KEY ("offer_id")
    REFERENCES "public"."offers"("id")
    ON DELETE CASCADE;

-- 4. SERVICE TICKETS -> CUSTOMERS
ALTER TABLE "public"."service_tickets" DROP CONSTRAINT IF EXISTS "service_tickets_client_id_fkey";
ALTER TABLE "public"."service_tickets" 
    ADD CONSTRAINT "service_tickets_client_id_fkey" 
    FOREIGN KEY ("client_id") 
    REFERENCES "public"."customers"("id") 
    ON DELETE CASCADE;

-- 5. TASKS (If any link to customers exists? Usually via CRM)
-- Checking for 'tasks' table if it exists. 
-- Assuming tasks might be service_tickets tasks (jsonb) or separate.
-- If separate 'tasks' table exists (from 20251219040000_create_tasks_table.sql), check it.
COMMIT;
