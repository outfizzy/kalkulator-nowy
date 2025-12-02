-- Robust fix for teams and team_members tables
-- 1. Ensures tables exist
-- 2. Fixes Foreign Key to point to public.profiles (needed for frontend joins)
-- 3. Safely adds policies only if they don't exist

-- 1. Ensure teams table exists
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on teams if not already enabled
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 2. Ensure team_members table exists
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Should reference profiles!
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

-- Enable RLS on team_members if not already enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 3. Fix Foreign Key if it points to auth.users (which breaks joins)
DO $$
BEGIN
    -- Check if we need to drop the old constraint (if it exists)
    -- We just try to drop the standard named constraint and re-add it to be sure
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_user_id_fkey') THEN
        ALTER TABLE public.team_members DROP CONSTRAINT team_members_user_id_fkey;
    END IF;
    
    -- Add the correct constraint pointing to public.profiles
    ALTER TABLE public.team_members
    ADD CONSTRAINT team_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    -- If something goes wrong (e.g. constraint name different), we log it but continue
    RAISE NOTICE 'Error adjusting constraint: %', SQLERRM;
END $$;

-- 4. Safely add policies (checking existence first to avoid 42710 error)
DO $$
BEGIN
    -- Teams policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view teams' AND tablename = 'teams') THEN
        CREATE POLICY "Everyone can view teams" ON public.teams FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage teams' AND tablename = 'teams') THEN
        CREATE POLICY "Admins can manage teams" ON public.teams USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        );
    END IF;

    -- Team members policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view team members' AND tablename = 'team_members') THEN
        CREATE POLICY "Everyone can view team members" ON public.team_members FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage team members' AND tablename = 'team_members') THEN
        CREATE POLICY "Admins can manage team members" ON public.team_members USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        );
    END IF;
END $$;
