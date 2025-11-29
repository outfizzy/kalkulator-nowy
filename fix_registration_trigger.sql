-- Fix profiles table and registration trigger

-- 1. Ensure all necessary columns exist in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS nip TEXT;

-- 2. Update handle_new_user function to use correct columns (full_name instead of first_name/last_name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, company_name, nip, status)
  VALUES (
    new.id,
    -- Use full_name from metadata, or construct it from firstName/lastName, or fallback to empty string
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      TRIM(CONCAT(new.raw_user_meta_data->>'firstName', ' ', new.raw_user_meta_data->>'lastName')),
      ''
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'sales_rep'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'companyName',
    new.raw_user_meta_data->>'nip',
    'pending' -- Always pending by default
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
