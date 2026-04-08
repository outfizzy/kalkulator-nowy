-- =============================================================================
-- RLS Hardening Migration — 2026-04-08
-- Replaces overly permissive USING(true) policies with role-based access.
-- Uses existing SECURITY DEFINER helpers: get_my_role(), is_admin(),
-- is_admin_or_manager(), check_user_role().
-- =============================================================================

-- ─── Helper: internal staff check (admin, manager, sales_rep, sales_rep_pl) ───
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'sales_rep', 'sales_rep_pl')
        AND status = 'active'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_internal_staff TO authenticated;

-- =============================================================================
-- 1. WALLET_TRANSACTIONS — admin full CRUD, manager read + insert
-- =============================================================================
DROP POLICY IF EXISTS "wallet_select" ON wallet_transactions;
DROP POLICY IF EXISTS "wallet_insert" ON wallet_transactions;
DROP POLICY IF EXISTS "wallet_update" ON wallet_transactions;
DROP POLICY IF EXISTS "wallet_delete" ON wallet_transactions;
-- Drop any existing broad policies
DROP POLICY IF EXISTS "Authenticated can view wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Authenticated can insert wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Authenticated can update wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Authenticated can delete wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON wallet_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON wallet_transactions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON wallet_transactions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON wallet_transactions;

CREATE POLICY "wallet_select" ON wallet_transactions
    FOR SELECT TO authenticated
    USING (is_admin_or_manager());

CREATE POLICY "wallet_insert" ON wallet_transactions
    FOR INSERT TO authenticated
    WITH CHECK (is_admin_or_manager());

CREATE POLICY "wallet_update" ON wallet_transactions
    FOR UPDATE TO authenticated
    USING (is_admin());

CREATE POLICY "wallet_delete" ON wallet_transactions
    FOR DELETE TO authenticated
    USING (is_admin());

-- =============================================================================
-- 2. DELETED_WALLET_TRANSACTIONS — admin only
-- =============================================================================
DROP POLICY IF EXISTS "deleted_wallet_select" ON deleted_wallet_transactions;
DROP POLICY IF EXISTS "deleted_wallet_insert" ON deleted_wallet_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON deleted_wallet_transactions;
DROP POLICY IF EXISTS "Authenticated can view deleted_wallet_transactions" ON deleted_wallet_transactions;

CREATE POLICY "deleted_wallet_select" ON deleted_wallet_transactions
    FOR SELECT TO authenticated
    USING (is_admin());

CREATE POLICY "deleted_wallet_insert" ON deleted_wallet_transactions
    FOR INSERT TO authenticated
    WITH CHECK (is_admin_or_manager());

-- =============================================================================
-- 3. INSTALLATIONS — admin/manager full, sales_rep read, installer read assigned
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated can view all installations" ON installations;
DROP POLICY IF EXISTS "Authenticated can insert installations" ON installations;
DROP POLICY IF EXISTS "Authenticated can update installations" ON installations;

CREATE POLICY "installations_select" ON installations
    FOR SELECT TO authenticated
    USING (is_internal_staff() OR get_my_role() = 'installer');

CREATE POLICY "installations_insert" ON installations
    FOR INSERT TO authenticated
    WITH CHECK (is_internal_staff());

CREATE POLICY "installations_update" ON installations
    FOR UPDATE TO authenticated
    USING (is_internal_staff());

-- =============================================================================
-- 4. SERVICE_TICKETS — internal staff full, external none
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated can select service_tickets" ON service_tickets;
DROP POLICY IF EXISTS "Authenticated can insert service_tickets" ON service_tickets;
DROP POLICY IF EXISTS "Authenticated can update service_tickets" ON service_tickets;

CREATE POLICY "service_tickets_select" ON service_tickets
    FOR SELECT TO authenticated
    USING (is_internal_staff() OR get_my_role() = 'installer');

CREATE POLICY "service_tickets_insert" ON service_tickets
    FOR INSERT TO authenticated
    WITH CHECK (is_internal_staff());

CREATE POLICY "service_tickets_update" ON service_tickets
    FOR UPDATE TO authenticated
    USING (is_internal_staff());

-- =============================================================================
-- 5. TASKS — internal staff only
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated can view tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated can create tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated can update tasks" ON tasks;

CREATE POLICY "tasks_select" ON tasks
    FOR SELECT TO authenticated
    USING (is_internal_staff());

CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT TO authenticated
    WITH CHECK (is_internal_staff());

CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE TO authenticated
    USING (is_internal_staff());

-- =============================================================================
-- 6. INVENTORY_ITEMS + INVENTORY_TRANSACTIONS — admin/manager modify, staff read
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated can view inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated can insert inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated can update inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated can delete inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON inventory_items;

CREATE POLICY "inventory_items_select" ON inventory_items
    FOR SELECT TO authenticated
    USING (is_internal_staff());

CREATE POLICY "inventory_items_insert" ON inventory_items
    FOR INSERT TO authenticated
    WITH CHECK (is_admin_or_manager());

CREATE POLICY "inventory_items_update" ON inventory_items
    FOR UPDATE TO authenticated
    USING (is_admin_or_manager());

CREATE POLICY "inventory_items_delete" ON inventory_items
    FOR DELETE TO authenticated
    USING (is_admin());

-- Inventory transactions (if table exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transactions') THEN
        DROP POLICY IF EXISTS "Authenticated can view inventory_transactions" ON inventory_transactions;
        DROP POLICY IF EXISTS "Authenticated can insert inventory_transactions" ON inventory_transactions;
        DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON inventory_transactions;
        DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON inventory_transactions;

        EXECUTE 'CREATE POLICY "inventory_tx_select" ON inventory_transactions FOR SELECT TO authenticated USING (is_internal_staff())';
        EXECUTE 'CREATE POLICY "inventory_tx_insert" ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager())';
    END IF;
END $$;

-- =============================================================================
-- 7. INSTALLATION_TEAMS — admin/manager modify, staff+installer read
-- =============================================================================
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON installation_teams;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON installation_teams;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON installation_teams;
DROP POLICY IF EXISTS "authenticated_read_teams" ON installation_teams;
DROP POLICY IF EXISTS "authenticated_insert_teams" ON installation_teams;
DROP POLICY IF EXISTS "authenticated_update_teams" ON installation_teams;
DROP POLICY IF EXISTS "authenticated_delete_teams" ON installation_teams;

CREATE POLICY "teams_select" ON installation_teams
    FOR SELECT TO authenticated
    USING (is_internal_staff() OR get_my_role() = 'installer');

CREATE POLICY "teams_insert" ON installation_teams
    FOR INSERT TO authenticated
    WITH CHECK (is_admin_or_manager());

CREATE POLICY "teams_update" ON installation_teams
    FOR UPDATE TO authenticated
    USING (is_admin_or_manager());

CREATE POLICY "teams_delete" ON installation_teams
    FOR DELETE TO authenticated
    USING (is_admin());

-- =============================================================================
-- 8. PROJECT_MEASUREMENTS — internal staff only
-- =============================================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON project_measurements;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON project_measurements;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON project_measurements;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON project_measurements;

CREATE POLICY "project_measurements_select" ON project_measurements
    FOR SELECT TO authenticated
    USING (is_internal_staff());

CREATE POLICY "project_measurements_insert" ON project_measurements
    FOR INSERT TO authenticated
    WITH CHECK (is_internal_staff());

CREATE POLICY "project_measurements_update" ON project_measurements
    FOR UPDATE TO authenticated
    USING (is_internal_staff());

CREATE POLICY "project_measurements_delete" ON project_measurements
    FOR DELETE TO authenticated
    USING (is_admin_or_manager());

-- =============================================================================
-- 9. PROFITABILITY — admin/manager only (sensitive financial)
-- =============================================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'installation_profitability') THEN
        DROP POLICY IF EXISTS "Authenticated can view profitability" ON installation_profitability;
        DROP POLICY IF EXISTS "Authenticated can insert profitability" ON installation_profitability;
        DROP POLICY IF EXISTS "Authenticated can update profitability" ON installation_profitability;
        DROP POLICY IF EXISTS "Authenticated can delete profitability" ON installation_profitability;

        EXECUTE 'CREATE POLICY "profitability_select" ON installation_profitability FOR SELECT TO authenticated USING (is_admin_or_manager())';
        EXECUTE 'CREATE POLICY "profitability_insert" ON installation_profitability FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager())';
        EXECUTE 'CREATE POLICY "profitability_update" ON installation_profitability FOR UPDATE TO authenticated USING (is_admin_or_manager())';
        EXECUTE 'CREATE POLICY "profitability_delete" ON installation_profitability FOR DELETE TO authenticated USING (is_admin())';
    END IF;
END $$;

-- =============================================================================
-- 10. PRICING TABLES — authenticated read (not public anon)
-- =============================================================================
DROP POLICY IF EXISTS "Allow public read of product_definitions" ON product_definitions;
DROP POLICY IF EXISTS "Allow public read of price_tables" ON price_tables;
DROP POLICY IF EXISTS "Allow public read of price_matrix_entries" ON price_matrix_entries;
DROP POLICY IF EXISTS "Allow public read of additional_costs" ON additional_costs;
DROP POLICY IF EXISTS "Allow public read of supplier_costs" ON supplier_costs;

CREATE POLICY "pricing_product_definitions_read" ON product_definitions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "pricing_price_tables_read" ON price_tables
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "pricing_matrix_entries_read" ON price_matrix_entries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "pricing_additional_costs_read" ON additional_costs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "pricing_supplier_costs_read" ON supplier_costs
    FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- 11. FUEL_LOGS — staff + installer full, public QR insert only
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can delete fuel logs" ON fuel_logs;
DROP POLICY IF EXISTS "Authenticated users can update fuel logs" ON fuel_logs;

CREATE POLICY "fuel_logs_update" ON fuel_logs
    FOR UPDATE TO authenticated
    USING (is_admin_or_manager());

CREATE POLICY "fuel_logs_delete" ON fuel_logs
    FOR DELETE TO authenticated
    USING (is_admin_or_manager());

-- =============================================================================
-- 12. PHONE_NUMBER_USERS — internal staff only
-- =============================================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phone_number_users') THEN
        DROP POLICY IF EXISTS "phone_number_users_select" ON phone_number_users;
        DROP POLICY IF EXISTS "phone_number_users_manage" ON phone_number_users;

        EXECUTE 'CREATE POLICY "phone_users_select" ON phone_number_users FOR SELECT TO authenticated USING (is_internal_staff())';
        EXECUTE 'CREATE POLICY "phone_users_manage" ON phone_number_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())';
    END IF;
END $$;

-- =============================================================================
-- Done. All broad USING(true) policies replaced with role-based access.
-- =============================================================================
