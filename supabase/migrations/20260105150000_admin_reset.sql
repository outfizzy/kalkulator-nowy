-- Migration: Admin Reset Function
-- Description: RPC function to wipe all CRM data for a fresh start.

CREATE OR REPLACE FUNCTION public.admin_wipe_crm_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text;
BEGIN
  -- 1. Check permissions (Strictly Admin)
  SELECT role INTO current_role FROM profiles WHERE id = auth.uid();
  
  IF current_role != 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only admins can perform a system reset.';
  END IF;

  -- 2. Truncate Tables (Order matters for constraints, but CASCADE handles most)
  -- We use CASCADE to clean up dependent rows in linked tables
  
  -- Core CRM Data & History
  TRUNCATE TABLE 
    lead_messages,
    tasks,
    communications,
    measurements,
    installations, 
    installation_order_items,
    service_tickets,
    contracts,
    offers,
    leads,
    customers,
    wallet_transactions,
    activity_logs,
    notifications,
    inventory_transactions
  CASCADE;

  -- Note: We do NOT wipe:
  -- - profiles (Users need to exist)
  -- - inventory_items (Physical stock levels)
  -- - product data (catalogs)
  -- - installation_teams (Team definitions)
  -- - notification_rules (Settings)
  
  RAISE NOTICE 'CRM Data Wiped Successfully';
END;
$$;
