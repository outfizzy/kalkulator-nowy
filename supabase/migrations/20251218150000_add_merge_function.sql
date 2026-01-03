-- Function to merge duplicate customers into a primary customer
-- Reassigns all related records and deletes the duplicates

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
        -- 1. Leads
        UPDATE leads
        SET customer_id = primary_customer_id
        WHERE customer_id = dup_id;

        -- 2. Offers
        UPDATE offers
        SET customer_id = primary_customer_id
        WHERE customer_id = dup_id;

        -- 3. Tasks
        -- Check if 'tasks' table exists and has customer_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'customer_id') THEN
            UPDATE tasks
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 4. Customer Communications (Notes, Calls, Emails)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_communications' AND column_name = 'customer_id') THEN
            UPDATE customer_communications
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 5. Generic Notes (Poly-morphic)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'entity_id') THEN
            UPDATE notes
            SET entity_id = primary_customer_id
            WHERE entity_id = dup_id AND entity_type = 'customer';
        END IF;
        
        -- 6. Wallet Transactions (if linked to customer)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'customer_id') THEN
            UPDATE wallet_transactions
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 7. Installations (Safety check)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'customer_id') THEN
            UPDATE installations
            SET customer_id = primary_customer_id
            WHERE customer_id = dup_id;
        END IF;

        -- 8. Delete the duplicate customer
        DELETE FROM customers
        WHERE id = dup_id;
        
    END LOOP;

END;
$$;
