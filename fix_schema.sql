-- Comprehensive Schema Fix for Profiles Table

-- 1. monthly_target
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'monthly_target') THEN
        ALTER TABLE public.profiles ADD COLUMN monthly_target NUMERIC DEFAULT 50000;
    END IF;
END $$;

-- 2. phone
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 3. email_config
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_config') THEN
        ALTER TABLE public.profiles ADD COLUMN email_config JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Force permissions
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.profiles TO authenticated;

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';

-- Verify
SELECT id, full_name, monthly_target, phone, email_config FROM public.profiles LIMIT 1;
