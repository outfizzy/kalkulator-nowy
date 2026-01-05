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
  req_uid uuid; -- Declare req_uid here
BEGIN
  req_uid := auth.uid(); -- Assign auth.uid() to req_uid at the start of the BEGIN block

  -- 1. Check permissions
  -- Allow execution if auth.uid() is NULL (running from SQL Editor / Console as superuser)
  IF req_uid IS NULL THEN
     RAISE NOTICE 'Executing as Superuser/Console (auth.uid() is NULL). Proceeding...';
  ELSE
     -- Strict check for App Users
     SELECT role INTO current_role FROM profiles WHERE id = req_uid;
     IF current_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Access Denied: User % has role "%" (Expected admin).', req_uid, current_role;
     END IF;
  END IF;

  -- 2. Truncate Tables (Order matters for constraints, but CASCADE handles most)
  -- We use CASCADE to clean up dependent rows in linked tables
  
  -- Core CRM Data & History
  TRUNCATE TABLE 
    lead_messages,
    tasks,
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
