-- AUDIT & OPTIMIZATION MIGRATION
-- 1. Security Hardening: Restrict DELETE operations
-- 2. Performance: Add Indexes for Foreign Keys

BEGIN;

-- ==============================================================================
-- 1. RLS HARDENING: PREVENT UNAUTHORIZED DELETIONS
-- ==============================================================================

-- A. SERVICE TICKETS
ALTER TABLE "public"."service_tickets" ENABLE ROW LEVEL SECURITY;

-- Drop permissive "ALL" policy
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "public"."service_tickets";
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."service_tickets";

-- Create granular policies
-- Create granular policies
DROP POLICY IF EXISTS "Authenticated can select service_tickets" ON "public"."service_tickets";
CREATE POLICY "Authenticated can select service_tickets" ON "public"."service_tickets" FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert service_tickets" ON "public"."service_tickets";
CREATE POLICY "Authenticated can insert service_tickets" ON "public"."service_tickets" FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update service_tickets" ON "public"."service_tickets";
CREATE POLICY "Authenticated can update service_tickets" ON "public"."service_tickets" FOR UPDATE TO authenticated USING (true);

-- Restrict DELETE to Admins and Managers only
DROP POLICY IF EXISTS "Admins/Managers can delete service_tickets" ON "public"."service_tickets";
CREATE POLICY "Admins/Managers can delete service_tickets" ON "public"."service_tickets" 
FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);


-- B. INSTALLATIONS
ALTER TABLE "public"."installations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view all installations" ON "public"."installations";
DROP POLICY IF EXISTS "Authenticated can insert installations" ON "public"."installations";
DROP POLICY IF EXISTS "Authenticated can update installations" ON "public"."installations";
DROP POLICY IF EXISTS "Authenticated can delete installations" ON "public"."installations";

DROP POLICY IF EXISTS "Authenticated can view all installations" ON "public"."installations";
CREATE POLICY "Authenticated can view all installations" ON "public"."installations" FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert installations" ON "public"."installations";
CREATE POLICY "Authenticated can insert installations" ON "public"."installations" FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update installations" ON "public"."installations";
CREATE POLICY "Authenticated can update installations" ON "public"."installations" FOR UPDATE TO authenticated USING (true);

-- Restrict DELETE to Admins/Managers
DROP POLICY IF EXISTS "Admins/Managers can delete installations" ON "public"."installations";
CREATE POLICY "Admins/Managers can delete installations" ON "public"."installations" 
FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);


-- ==============================================================================
-- 2. DATABASE INDEXING OPTIMIZATION
-- ==============================================================================

-- Service Tickets FKs
CREATE INDEX IF NOT EXISTS "idx_service_tickets_client" ON "public"."service_tickets" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_service_tickets_contract" ON "public"."service_tickets" ("contract_id");
CREATE INDEX IF NOT EXISTS "idx_service_tickets_installation" ON "public"."service_tickets" ("installation_id");
CREATE INDEX IF NOT EXISTS "idx_service_tickets_team" ON "public"."service_tickets" ("assigned_team_id");
CREATE INDEX IF NOT EXISTS "idx_service_tickets_status" ON "public"."service_tickets" ("status");

-- Service Ticket History FKs
CREATE INDEX IF NOT EXISTS "idx_st_history_ticket" ON "public"."service_ticket_history" ("ticket_id");
CREATE INDEX IF NOT EXISTS "idx_st_history_user" ON "public"."service_ticket_history" ("changed_by");

-- Installations FKs
CREATE INDEX IF NOT EXISTS "idx_installations_offer" ON "public"."installations" ("offer_id");
CREATE INDEX IF NOT EXISTS "idx_installations_user" ON "public"."installations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_installations_team" ON "public"."installations" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_installations_scheduled_date" ON "public"."installations" ("scheduled_date");
CREATE INDEX IF NOT EXISTS "idx_installations_status" ON "public"."installations" ("status");

-- Offers FKs (adding common lookups if missing)
CREATE INDEX IF NOT EXISTS "idx_offers_user" ON "public"."offers" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_offers_status" ON "public"."offers" ("status");

-- Contracts FKs
CREATE INDEX IF NOT EXISTS "idx_contracts_offer" ON "public"."contracts" ("offer_id");
CREATE INDEX IF NOT EXISTS "idx_contracts_user" ON "public"."contracts" ("user_id");

COMMIT;
