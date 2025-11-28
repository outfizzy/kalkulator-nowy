-- Update profiles table definition to support new roles
ALTER TABLE public.profiles 
DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'sales_rep', 'manager'));

-- Update handle_new_user function to use metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'sales_rep'), -- Default to sales_rep if not provided
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'pending' -- Always pending until approved by admin
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
