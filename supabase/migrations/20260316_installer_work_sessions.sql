-- Installer Work Sessions: daily time tracking for installation crews
CREATE TABLE IF NOT EXISTS installer_work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES installation_teams(id),
    leader_user_id UUID NOT NULL REFERENCES auth.users(id),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Confirmed crew for this day (snapshot - may differ from team.members)
    crew_members JSONB NOT NULL DEFAULT '[]'::jsonb,
    crew_confirmed BOOLEAN NOT NULL DEFAULT false,
    
    -- Time tracking
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    break_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- End-of-day context
    drive_to_base BOOLEAN DEFAULT false,    -- counts as work time
    drive_to_hotel BOOLEAN DEFAULT false,   -- does NOT count as work time
    
    -- Computed work duration in minutes (set on end)
    total_work_minutes INTEGER,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'paused', 'completed')),
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One session per team per day
    UNIQUE(team_id, session_date)
);

-- Installer Vehicles: license plates per team
CREATE TABLE IF NOT EXISTS installer_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES installation_teams(id),
    license_plate TEXT NOT NULL,
    vehicle_name TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_work_sessions_team_date ON installer_work_sessions(team_id, session_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_leader ON installer_work_sessions(leader_user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_team ON installer_vehicles(team_id);

-- RLS
ALTER TABLE installer_work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_vehicles ENABLE ROW LEVEL SECURITY;

-- Sessions: leaders can manage their own, admins can see all
CREATE POLICY "Leaders manage own sessions" ON installer_work_sessions
    FOR ALL USING (
        leader_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Vehicles: team members + admins
CREATE POLICY "Team vehicles access" ON installer_vehicles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'installer'))
    );
