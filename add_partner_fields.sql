-- Add company fields and partner margin to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS nip TEXT,
ADD COLUMN IF NOT EXISTS partner_margin NUMERIC(5,4) DEFAULT 0.25;

-- Update handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role, phone, company_name, nip, status, partner_margin)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'firstName',
    new.raw_user_meta_data->>'lastName',
    COALESCE(new.raw_user_meta_data->>'role', 'sales_rep'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'companyName',
    new.raw_user_meta_data->>'nip',
    'pending', -- Always pending by default
    0.25 -- Default partner margin (25%) for new profiles
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
