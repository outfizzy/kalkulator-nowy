-- Create a SEQUENCE for contract numbers to be 100% safe against race conditions
-- We start at 1100 as per previous logic, but keep it global
CREATE SEQUENCE IF NOT EXISTS public.contracts_seq START 1100;

-- Create a function to get the next contract number (bypasses RLS)
-- User request: "PL/dzień/miesiac/rok" sequentially for all.
-- Interpreted as: PL/{GLOBAL_SEQ}/{DD}/{MM}/{YYYY}
CREATE OR REPLACE FUNCTION public.get_next_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
    next_id BIGINT;
    day_str TEXT;
    month_str TEXT;
    year_str TEXT;
BEGIN
    -- Get next value from sequence
    next_id := nextval('public.contracts_seq');
    
    -- Format Date Parts
    day_str := TO_CHAR(NOW(), 'DD');
    month_str := TO_CHAR(NOW(), 'MM');
    year_str := TO_CHAR(NOW(), 'YYYY');

    -- Return the formatted contract number: PL/{SEQ}/{DD}/{MM}/{YYYY}
    RETURN 'PL/' || next_id || '/' || day_str || '/' || month_str || '/' || year_str;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_contract_number() TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.contracts_seq TO authenticated;
