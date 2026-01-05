-- Migration: 20260105170000_add_email_to_profiles.sql
-- Description: Adds email column to profiles and ensures it syncs with auth.users

-- 1. Add email column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill existing emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- 3. Create or Update Trigger Function to sync email
CREATE OR REPLACE FUNCTION public.handle_user_update_email() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 4. Create Trigger on auth.users for updates
DROP TRIGGER IF EXISTS on_auth_user_update_email ON auth.users;
CREATE TRIGGER on_auth_user_update_email
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_update_email();

-- 5. Ensure handle_new_user also sets email (if you have one)
-- Typically handle_new_user inserts into profiles. We should check if we need to update that too.
-- For now, let's create a safeguard trigger for INSERT on profiles? 
-- No, usually the insert into profiles happens via a trigger on auth.users INSERT.
-- Let's update that function if possible. Since we don't know its name for sure (usually handle_new_user), 
-- let's try to replace it standardly or just rely on the backfill for now.
-- But wait, if new user signs up, we want email in profiles.

-- Let's define a trigger on profiles insert? No, profiles is derived.
-- Let's assume the standard 'handle_new_user' exists. We will try to replace it to include email.
-- Standard name: public.handle_new_user

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    'sales_rep', -- Default role
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

-- We don't drop/create the trigger on auth.users for insert because it likely exists and points to this function name. 
-- If the function name is different, this replacement won't work for the trigger. 
-- But 'handle_new_user' is the Supabase default convention.
