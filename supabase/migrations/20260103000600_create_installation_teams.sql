-- Create Installation Teams table if not exists

CREATE TABLE IF NOT EXISTS public.installation_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    members JSONB DEFAULT '[]'::jsonb, -- Array of strings or objects {name, role}
    vehicle TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policy
ALTER TABLE public.installation_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.installation_teams;
CREATE POLICY "Enable read access for all authenticated users" ON public.installation_teams
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.installation_teams;
CREATE POLICY "Enable insert access for all authenticated users" ON public.installation_teams
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.installation_teams;
CREATE POLICY "Enable update access for all authenticated users" ON public.installation_teams
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Initial Seed Data (Optional)
INSERT INTO public.installation_teams (name, color, members, vehicle)
VALUES 
    ('Ekipa 1 (Janusz)', '#3b82f6', '["Janusz", "Marek"]'::jsonb, 'Ford Transit'),
    ('Ekipa 2 (Tomek)', '#10b981', '["Tomek", "Piotr"]'::jsonb, 'Mercedes Sprinter'),
    ('Ekipa 3 (Serwis)', '#f59e0b', '["Krzysztof"]'::jsonb, 'Fiat Doblo')
ON CONFLICT DO NOTHING;
