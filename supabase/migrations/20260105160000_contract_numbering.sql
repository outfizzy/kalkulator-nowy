-- Migration: 20260105160000_contract_numbering.sql
-- Description: Updates get_next_contract_number to respect 'contract_number_start' setting and adds the setting default.

-- 1. Insert default setting if not exists
INSERT INTO app_settings (key, value)
VALUES ('contract_number_start', '{"start": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Update RPC function
CREATE OR REPLACE FUNCTION get_next_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to ensure access to app_settings and contracts
AS $$
DECLARE
    year_prefix text;
    next_seq integer;
    start_seq integer;
    current_max_seq integer;
    new_contract_number text;
BEGIN
    year_prefix := to_char(now(), 'YYYY');
    
    -- 1. Get Start Number from Settings (default to 1)
    SELECT (value->>'start')::int INTO start_seq
    FROM app_settings
    WHERE key = 'contract_number_start';
    
    IF start_seq IS NULL THEN
        start_seq := 1;
    END IF;

    -- 2. Find max sequence for current year
    -- Matches format 'UM/YYYY/NNN' or similar ending with /number
    -- Uses regex to extract the last number part
    SELECT MAX(NULLIF(regexp_replace(contract_data->>'contractNumber', '.*\/(\d+)$', '\1'), '')::int)
    INTO current_max_seq
    FROM contracts
    WHERE contract_data->>'contractNumber' LIKE '%/' || year_prefix || '/%';

    -- 3. Calculate Next Sequence
    IF current_max_seq IS NULL THEN
        next_seq := start_seq;
    ELSE
        -- If current max is 5, and start is 100, we should jump to 100? 
        -- Yes, user wants to *start* from X. 
        -- If current max is 105 and start is 100, we go to 106.
        next_seq := GREATEST(current_max_seq + 1, start_seq);
    END IF;

    -- 4. Format
    new_contract_number := 'UM/' || year_prefix || '/' || lpad(next_seq::text, 3, '0');
    
    RETURN new_contract_number;
END;
$$;
