-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Add team_id to installations
ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policies for teams
CREATE POLICY "Everyone can view teams" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage teams" ON public.teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Policies for team_members
CREATE POLICY "Everyone can view team members" ON public.team_members
    FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_installations_team_id ON public.installations(team_id);
