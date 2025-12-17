
-- Migration to update price_tables type constraint
-- Allows 'simple' and 'component' types used by new seed scripts

DO $$
BEGIN
    -- Drop old constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_tables_type_check') THEN
        ALTER TABLE price_tables DROP CONSTRAINT price_tables_type_check;
    END IF;

    -- Add new constraint with expanded types
    ALTER TABLE price_tables 
    ADD CONSTRAINT price_tables_type_check 
    CHECK (type IN ('matrix', 'linear', 'fixed', 'simple', 'component'));
END $$;
