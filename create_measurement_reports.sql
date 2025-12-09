-- Create measurement_reports table
CREATE TABLE IF NOT EXISTS measurement_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL,
    
    -- Car Details
    car_plate TEXT NOT NULL,
    odometer_start INTEGER NOT NULL,
    odometer_end INTEGER NOT NULL,
    total_km INTEGER NOT NULL,
    with_driver BOOLEAN DEFAULT false,
    car_issues TEXT,
    
    -- Report Description (optional summary)
    report_description TEXT,

    -- JSONB snapshot of measurements/visits included in this report
    -- Structure: Array of { customerName, address, status, notes, ... }
    measurements_snapshot JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE measurement_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own reports, Admins can see all
CREATE POLICY "Users can view own reports" ON measurement_reports
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Policy: Users can create their own reports
CREATE POLICY "Users can insert own reports" ON measurement_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update own reports" ON measurement_reports
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Add index on date and user_id for faster lookups
CREATE INDEX idx_measurement_reports_date ON measurement_reports(date);
CREATE INDEX idx_measurement_reports_user_id ON measurement_reports(user_id);
