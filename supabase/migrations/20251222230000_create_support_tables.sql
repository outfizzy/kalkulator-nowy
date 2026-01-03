-- Create failure_reports table
CREATE TABLE IF NOT EXISTS failure_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    equipment_name TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'resolved')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for failure_reports
ALTER TABLE failure_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create failure reports" ON failure_reports;
CREATE POLICY "Users can create failure reports" ON failure_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own failure reports" ON failure_reports;
CREATE POLICY "Users can view their own failure reports" ON failure_reports
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and Managers can view all failure reports" ON failure_reports;
CREATE POLICY "Admins and Managers can view all failure reports" ON failure_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Admins and Managers can update failure reports" ON failure_reports;
CREATE POLICY "Admins and Managers can update failure reports" ON failure_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Create order_requests table
CREATE TABLE IF NOT EXISTS order_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'ordered', 'completed', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for order_requests
ALTER TABLE order_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create order requests" ON order_requests;
CREATE POLICY "Users can create order requests" ON order_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own order requests" ON order_requests;
CREATE POLICY "Users can view their own order requests" ON order_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and Managers can view all order requests" ON order_requests;
CREATE POLICY "Admins and Managers can view all order requests" ON order_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Admins and Managers can update order requests" ON order_requests;
CREATE POLICY "Admins and Managers can update order requests" ON order_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Create fuel_logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_plate TEXT NOT NULL,
    odometer_reading INTEGER NOT NULL,
    liters NUMERIC NOT NULL,
    cost NUMERIC NOT NULL,
    odometer_photo_url TEXT,
    receipt_photo_url TEXT,
    log_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT CHECK (type IN ('installer', 'sales_rep')) DEFAULT 'installer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for fuel_logs
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create fuel logs" ON fuel_logs;
CREATE POLICY "Users can create fuel logs" ON fuel_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own fuel logs" ON fuel_logs;
CREATE POLICY "Users can view their own fuel logs" ON fuel_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and Managers can view all fuel logs" ON fuel_logs;
CREATE POLICY "Admins and Managers can view all fuel logs" ON fuel_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );
