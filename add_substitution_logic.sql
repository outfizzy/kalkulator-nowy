-- Add substitution columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS substitute_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS substitute_until TIMESTAMPTZ;

-- Add index for fast lookup of delegations
CREATE INDEX IF NOT EXISTS idx_profiles_substitute_user_id ON public.profiles(substitute_user_id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload config';
