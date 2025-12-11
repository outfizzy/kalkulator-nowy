-- Ensure teams table exists
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure team_members table exists
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policies for teams
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.teams;
CREATE POLICY "Enable read access for authenticated users" ON public.teams
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Enable insert for admins and managers" ON public.teams;
CREATE POLICY "Enable insert for admins and managers" ON public.teams
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Enable update for admins and managers" ON public.teams;
CREATE POLICY "Enable update for admins and managers" ON public.teams
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Enable delete for admins and managers" ON public.teams;
CREATE POLICY "Enable delete for admins and managers" ON public.teams
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Policies for team_members
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.team_members;
CREATE POLICY "Enable read access for authenticated users" ON public.team_members
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Enable insert for admins and managers" ON public.team_members;
CREATE POLICY "Enable insert for admins and managers" ON public.team_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Enable delete for admins and managers" ON public.team_members;
CREATE POLICY "Enable delete for admins and managers" ON public.team_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );
