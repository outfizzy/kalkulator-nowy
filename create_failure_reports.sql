-- Create failure_reports table
CREATE TABLE IF NOT EXISTS failure_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    equipment_name TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_failure_reports_user_id ON failure_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_failure_reports_status ON failure_reports(status);

-- Enable RLS
ALTER TABLE failure_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Installers can create and view their own reports
CREATE POLICY "Installers can create failure reports" ON failure_reports
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'installer'
        )
    );

CREATE POLICY "Installers can view their own reports" ON failure_reports
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Policy: Admins and managers can view all reports
CREATE POLICY "Admins can view all failure reports" ON failure_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Policy: Admins and managers can update report status
CREATE POLICY "Admins can update failure reports" ON failure_reports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Create storage bucket for failure report photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('failure-reports', 'failure-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Installers can upload failure photos" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'failure-reports'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'installer'
        )
    );

CREATE POLICY "Anyone authenticated can view failure photos" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'failure-reports'
        AND auth.role() = 'authenticated'
    );
