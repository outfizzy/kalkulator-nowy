-- Fix for 500 error during registration
-- The profiles table likely has a constraint that restricts roles to only 'admin' and 'user'.
-- We need to allow 'installer', 'sales_rep', 'manager', and 'partner'.

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'sales_rep', 'manager', 'partner', 'installer'));

-- Also ensure the handle_new_user function is up to date and handles the role correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, company_name, nip, status)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      TRIM(CONCAT(new.raw_user_meta_data->>'firstName', ' ', new.raw_user_meta_data->>'lastName')),
      ''
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'sales_rep'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'companyName',
    new.raw_user_meta_data->>'nip',
    'pending'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
