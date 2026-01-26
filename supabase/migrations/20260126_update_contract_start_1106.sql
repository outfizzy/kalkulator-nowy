-- Migration: 20260126_update_contract_start_1106.sql
-- Description: Updates contract numbering to start from 1106.

-- Update the contract_number_start setting to 1106
UPDATE app_settings 
SET value = jsonb_set(value, '{start}', '1106'::jsonb)
WHERE key = 'contract_number_start';

-- If no existing setting, insert it
INSERT INTO app_settings (key, value)
VALUES ('contract_number_start', '{"start": 1106}'::jsonb)
ON CONFLICT (key) DO NOTHING;
