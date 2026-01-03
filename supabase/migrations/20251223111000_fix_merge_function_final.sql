-- Final fix for customer merge function
-- Addresses both 'text = uuid' and 'uuid = text' operator errors
-- Strategy:
-- 1. In WHERE clause: Cast BOTH sides to ::text so comparison is always text=text
-- 2. In SET clause: Use raw UUID value. Postgres allows assigning UUID to TEXT column implicitly, and UUID to UUID naturally.

CREATE OR REPLACE FUNCTION merge_customers(
    primary_customer_id UUID,
    duplicate_customer_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    dup_id UUID;
BEGIN
    -- Input validation
    IF primary_customer_id IS NULL THEN
        RAISE EXCEPTION 'Primary customer ID cannot be null';
    END IF;

    IF duplicate_customer_ids IS NULL OR array_length(duplicate_customer_ids, 1) IS NULL THEN
        RETURN; -- Nothing to do
    END IF;

    FOREACH dup_id IN ARRAY duplicate_customer_ids
    LOOP
        -- Skip if we are trying to merge customer into itself
        IF dup_id = primary_customer_id THEN
            CONTINUE;
        END IF;

        -- 1. Leads
        UPDATE leads
        SET customer_id = primary_customer_id
        WHERE customer_id = dup_id;

        -- 2. Offers
        UPDATE offers
        SET customer_id = primary_customer_id
        WHERE customer_id = dup_id;

        -- 3. Tasks
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'customer_id') THEN
            UPDATE tasks
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 4. Customer Communications (Potential TEXT column)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_communications') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_communications' AND column_name = 'customer_id') THEN
            UPDATE customer_communications
            SET customer_id = primary_customer_id
            -- Safe comparison regardless of column type
            WHERE customer_id::text = dup_id::text;
        END IF;

        -- 5. Notes (Polymorphic - Known UUID but handle safely)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'entity_id') THEN
            UPDATE notes
            SET entity_id = primary_customer_id -- Assign UUID (works for UUID col, casts implicit for TEXT)
            -- Safe comparison regardless of column type
            WHERE entity_id::text = dup_id::text AND entity_type = 'customer';
        END IF;
        
        -- 6. Wallet Transactions
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'customer_id') THEN
            UPDATE wallet_transactions
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 7. Installations
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'installations') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'customer_id') THEN
            UPDATE installations
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 8. Contracts (Check if customer_id exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'customer_id') THEN
            UPDATE contracts
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 9. Delete the duplicate customer
        DELETE FROM customers
        WHERE id = dup_id;
        
    END LOOP;

END;
$$;
