-- Robust repair script for email_config column

-- 1. Ensure the column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_config') THEN
        ALTER TABLE public.profiles ADD COLUMN email_config JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Force permissions (just in case RLS/Grants are weird)
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.profiles TO authenticated;

-- 3. Reload Schema Cache for PostgREST
NOTIFY pgrst, 'reload config';

-- 4. Verify (Selects one row to prove it works - look at the specific 'email_config' column in Results)
SELECT id, email_config FROM public.profiles LIMIT 1;
