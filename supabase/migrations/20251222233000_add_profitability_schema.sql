-- Add hourly_rate to profiles (Admin/Manager only typically, but we trust the inputs for now)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;

-- Add vehicle/fuel stats to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS fuel_consumption NUMERIC DEFAULT 12; -- L/100km median
ALTER TABLE teams ADD COLUMN IF NOT EXISTS vehicle_maintenance_rate NUMERIC DEFAULT 0; -- PLN/km

-- Add financial fields to installations
ALTER TABLE installations ADD COLUMN IF NOT EXISTS hotel_cost NUMERIC DEFAULT 0;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS consumables_cost NUMERIC DEFAULT 0;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS additional_costs NUMERIC DEFAULT 0;

-- Create installation_work_logs table
CREATE TABLE IF NOT EXISTS installation_work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_id UUID REFERENCES installations(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    user_ids UUID[] NOT NULL, -- Snapshot of users present during this session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE installation_work_logs ENABLE ROW LEVEL SECURITY;

-- Policies for work logs
-- Policies for work logs
DROP POLICY IF EXISTS "Users can view work logs for their installations" ON installation_work_logs;
CREATE POLICY "Users can view work logs for their installations" ON installation_work_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM installation_assignments ia
            WHERE ia.installation_id = installation_work_logs.installation_id
            AND ia.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Users can insert work logs for their installations" ON installation_work_logs;
CREATE POLICY "Users can insert work logs for their installations" ON installation_work_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM installation_assignments ia
            WHERE ia.installation_id = installation_id
            AND ia.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update work logs for their installations" ON installation_work_logs;
CREATE POLICY "Users can update work logs for their installations" ON installation_work_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM installation_assignments ia
            WHERE ia.installation_id = installation_work_logs.installation_id
            AND ia.user_id = auth.uid()
        )
    );
