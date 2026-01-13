-- Migration: 20260111220000_update_contract_numbering.sql
-- Description: Updates get_next_contract_number to use global sequence starting at 1100 with PL/SEQ/DD/MM/YYYY format.

-- 1. Ensure settings exist and set start to 1100 if explicitly desired or if current is low
-- We update the default start to 1100.
INSERT INTO app_settings (key, value)
VALUES ('contract_number_start', '{"start": 1100}'::jsonb)
ON CONFLICT (key) 
DO UPDATE SET value = jsonb_set(app_settings.value, '{start}', '1100'::jsonb)
WHERE (app_settings.value->>'start')::int < 1100;

-- 2. Update RPC function
CREATE OR REPLACE FUNCTION get_next_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_seq integer;
    start_seq integer;
    current_max_seq integer;
    new_contract_number text;
    date_suffix text;
BEGIN
    -- Format: PL/NUMBER/DD/MM/YYYY
    -- Example: PL/1100/11/01/2026
    
    date_suffix := to_char(now(), 'DD/MM/YYYY');
    
    -- 1. Get Start Number from Settings (default to 1100)
    SELECT (value->>'start')::int INTO start_seq
    FROM app_settings
    WHERE key = 'contract_number_start';
    
    IF start_seq IS NULL THEN
        start_seq := 1100;
    END IF;

    -- 2. Find max sequence from signatures matching PL/NUMBER/...
    -- Regex: PL\/(\d+)\/.*
    SELECT MAX(NULLIF(regexp_replace(contract_data->>'contractNumber', '^PL\/(\d+)\/.*$', '\1'), contract_data->>'contractNumber')::int)
    INTO current_max_seq
    FROM contracts
    WHERE contract_data->>'contractNumber' LIKE 'PL/%';

    -- 3. Calculate Next Sequence
    IF current_max_seq IS NULL THEN
        next_seq := start_seq;
    ELSE
        next_seq := GREATEST(current_max_seq + 1, start_seq);
    END IF;

    -- 4. Format
    new_contract_number := 'PL/' || next_seq::text || '/' || date_suffix;
    
    RETURN new_contract_number;
END;
$$;
