-- Create a function to get the next contract number (bypasses RLS)
-- This ensures sequential contract numbers across ALL sales reps
CREATE OR REPLACE FUNCTION public.get_next_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
    next_num INTEGER;
    current_month TEXT;
    current_year TEXT;
    max_num INTEGER;
BEGIN
    -- Get current month and year
    current_month := TO_CHAR(NOW(), 'MM');
    current_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Find the maximum contract number for the current month/year
    -- Contract numbers are in format: PL/{number}/{month}/{year}
    SELECT COALESCE(MAX(
        CASE 
            WHEN split_part(contract_data->>'contractNumber', '/', 2) ~ '^[0-9]+$' 
            THEN CAST(split_part(contract_data->>'contractNumber', '/', 2) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_num
    FROM contracts
    WHERE split_part(contract_data->>'contractNumber', '/', 3) = current_month
      AND split_part(contract_data->>'contractNumber', '/', 4) = current_year;
    
    -- If no contracts exist for this month, start at 1100
    IF max_num = 0 THEN
        next_num := 1100;
    ELSE
        next_num := max_num + 1;
    END IF;
    
    -- Return the formatted contract number
    RETURN 'PL/' || next_num || '/' || current_month || '/' || current_year;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_contract_number() TO authenticated;
