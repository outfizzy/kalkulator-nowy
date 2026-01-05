-- Migration: Deduplicate product_definitions
-- Date: 2026-01-05
-- Goals: 
-- 1. Identify product_definitions with the same name.
-- 2. Keep the oldest one (by created_at or id) as MASTER.
-- 3. Update price_tables to point to MASTER.
-- 4. Delete duplicates.

DO $$
DECLARE
    r RECORD;
    master_id UUID;
BEGIN
    -- Loop through all names that have duplicates
    FOR r IN 
        SELECT name, COUNT(*) 
        FROM product_definitions 
        GROUP BY name 
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Processing duplicates for: %', r.name;

        -- Find Master ID (oldest)
        SELECT id INTO master_id
        FROM product_definitions
        WHERE name = r.name
        ORDER BY created_at ASC, id ASC
        LIMIT 1;

        RAISE NOTICE '  Master ID: %', master_id;

        -- Update price_tables references
        -- We update all price_tables that point to ANY duplicate of this name (except the master itself)
        UPDATE price_tables
        SET product_definition_id = master_id
        WHERE product_definition_id IN (
            SELECT id FROM product_definitions WHERE name = r.name AND id != master_id
        );
        
        -- Delete duplicates
        DELETE FROM product_definitions
        WHERE name = r.name AND id != master_id;
        
        RAISE NOTICE '  Duplicates deleted.';
        
    END LOOP;
END $$;
