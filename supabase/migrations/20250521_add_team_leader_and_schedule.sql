-- Add leader_id column to installation_teams
ALTER TABLE installation_teams ADD COLUMN IF NOT EXISTS leader_id TEXT;

-- Create team schedule overrides table for weekly team composition changes
CREATE TABLE IF NOT EXISTS team_schedule_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES installation_teams(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    members JSONB NOT NULL,
    leader_id TEXT,
    reason TEXT,
    confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_team_schedule_team_week ON team_schedule_overrides(team_id, week_start);

-- RLS policies
ALTER TABLE team_schedule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read team_schedule_overrides"
    ON team_schedule_overrides FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert team_schedule_overrides"
    ON team_schedule_overrides FOR INSERT
    TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update team_schedule_overrides"
    ON team_schedule_overrides FOR UPDATE
    TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete team_schedule_overrides"
    ON team_schedule_overrides FOR DELETE
    TO authenticated USING (true);
