-- Migration to add Aluxe V2 Freestanding Surcharges
-- Based on user provided data for: Orangeline, Trendline, Topline, Designline

-- Function to safely insert price table and return ID
CREATE OR REPLACE FUNCTION create_price_table_if_not_exists(table_name text) RETURNS uuid AS $$
DECLARE
    new_id uuid;
BEGIN
    SELECT id INTO new_id FROM price_tables WHERE name = table_name;
    IF new_id IS NULL THEN
        INSERT INTO price_tables (name, type, is_active) 
        VALUES (table_name, 'matrix', true) 
        RETURNING id INTO new_id;
    END IF;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_no_fund uuid;
    table_with_fund uuid;
BEGIN
    -- 1. Create Tables
    table_no_fund := create_price_table_if_not_exists('Aluxe V2 - Freestanding Surcharge (No Foundation)');
    table_with_fund := create_price_table_if_not_exists('Aluxe V2 - Freestanding Surcharge (With Foundation)');

    -- 2. Insert Entries for NO FOUNDATION
    -- Clear existing entries for this table to avoid duplicates if re-running
    DELETE FROM price_matrix_entries WHERE price_table_id = table_no_fund;
    
    INSERT INTO price_matrix_entries (price_table_id, width, projection, price) VALUES
    (table_no_fund, 3000, 0, 382.68),
    (table_no_fund, 4000, 0, 450.34),
    (table_no_fund, 5000, 0, 518.00),
    (table_no_fund, 6000, 0, 658.55),
    (table_no_fund, 7000, 0, 726.20);

    -- 3. Insert Entries for WITH FOUNDATION
    -- Clear existing entries for this table
    DELETE FROM price_matrix_entries WHERE price_table_id = table_with_fund;

    INSERT INTO price_matrix_entries (price_table_id, width, projection, price) VALUES
    (table_with_fund, 3000, 0, 459.78),
    (table_with_fund, 4000, 0, 527.45),
    (table_with_fund, 5000, 0, 595.11),
    (table_with_fund, 6000, 0, 774.20),
    (table_with_fund, 7000, 0, 841.86);

END $$;
