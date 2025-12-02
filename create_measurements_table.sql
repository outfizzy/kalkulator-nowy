-- Create measurements table for tracking customer measurement appointments
CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sales_rep_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on sales_rep_id for faster queries
CREATE INDEX idx_measurements_sales_rep ON measurements(sales_rep_id);

-- Create index on scheduled_date for calendar queries
CREATE INDEX idx_measurements_scheduled_date ON measurements(scheduled_date);

-- Create index on status for filtering
CREATE INDEX idx_measurements_status ON measurements(status);

-- Enable Row Level Security
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own measurements
CREATE POLICY "Users can view own measurements"
    ON measurements
    FOR SELECT
    USING (
        sales_rep_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Policy: Sales reps can create measurements
CREATE POLICY "Sales reps can create measurements"
    ON measurements
    FOR INSERT
    WITH CHECK (
        sales_rep_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'sales_rep', 'manager')
        )
    );

-- Policy: Users can update their own measurements
CREATE POLICY "Users can update own measurements"
    ON measurements
    FOR UPDATE
    USING (
        sales_rep_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Policy: Admins and managers can delete measurements
CREATE POLICY "Admins can delete measurements"
    ON measurements
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER measurements_updated_at
    BEFORE UPDATE ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_measurements_updated_at();
