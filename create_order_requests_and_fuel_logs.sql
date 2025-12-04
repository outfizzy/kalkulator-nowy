-- Order Requests Module

-- Create ENUM for order request status (if not exists)
DO $$ BEGIN
    CREATE TYPE order_request_status AS ENUM ('pending', 'ordered', 'rejected', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create order_requests table
CREATE TABLE IF NOT EXISTS order_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    description text,
    status order_request_status NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for order_requests
CREATE INDEX IF NOT EXISTS idx_order_requests_user_id ON order_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_status ON order_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_requests_created_at ON order_requests(created_at DESC);

-- Enable RLS on order_requests
ALTER TABLE order_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own requests" ON order_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON order_requests;
DROP POLICY IF EXISTS "Managers can view all requests" ON order_requests;
DROP POLICY IF EXISTS "Managers can update all requests" ON order_requests;

-- RLS Policies for order_requests
CREATE POLICY "Users can view their own requests"
    ON order_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
    ON order_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view all requests"
    ON order_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Managers can update all requests"
    ON order_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Fuel Logs Module

-- Create ENUM for fuel log type (if not exists)
DO $$ BEGIN
    CREATE TYPE fuel_log_type AS ENUM ('sales_rep', 'installer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create fuel_logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type fuel_log_type NOT NULL,
    vehicle_plate text,
    odometer_reading integer NOT NULL,
    odometer_photo_url text,
    receipt_photo_url text,
    liters numeric(10,2) NOT NULL,
    cost numeric(10,2) NOT NULL,
    currency text DEFAULT 'PLN',
    log_date date NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for fuel_logs
CREATE INDEX IF NOT EXISTS idx_fuel_logs_user_id ON fuel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_type ON fuel_logs(type);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_log_date ON fuel_logs(log_date DESC);

-- Enable RLS on fuel_logs
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own logs" ON fuel_logs;
DROP POLICY IF EXISTS "Users can create their own logs" ON fuel_logs;
DROP POLICY IF EXISTS "Managers can view all logs" ON fuel_logs;

-- RLS Policies for fuel_logs
CREATE POLICY "Users can view their own logs"
    ON fuel_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own logs"
    ON fuel_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view all logs"
    ON fuel_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Create storage bucket for fuel logs
INSERT INTO storage.buckets (id, name, public)
VALUES ('fuel-logs', 'fuel-logs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload fuel logs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view fuel logs" ON storage.objects;

-- Set up storage policies
CREATE POLICY "Authenticated users can upload fuel logs"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'fuel-logs' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can view fuel logs"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'fuel-logs' AND auth.role() = 'authenticated' );
