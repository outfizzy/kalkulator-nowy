-- Add working_days to teams (1=Monday, 7=Sunday)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT '{1,2,3,4,5}';

-- Create table for specific unavailability periods
CREATE TABLE IF NOT EXISTS team_unavailability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date)
);

-- RLS Policies
ALTER TABLE team_unavailability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow re-running script safely
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON team_unavailability;
CREATE POLICY "Allow read access for authenticated users" ON team_unavailability
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write access for authenticated users" ON team_unavailability;
CREATE POLICY "Allow write access for authenticated users" ON team_unavailability
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access for authenticated users" ON team_unavailability;
CREATE POLICY "Allow update access for authenticated users" ON team_unavailability
    FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow delete access for authenticated users" ON team_unavailability;
CREATE POLICY "Allow delete access for authenticated users" ON team_unavailability
    FOR DELETE TO authenticated USING (true);
