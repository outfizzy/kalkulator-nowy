-- Create activity_logs table for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'LOGIN', 'CREATE_OFFER', 'UPDATE_STATUS'
    entity_type TEXT NOT NULL, -- e.g. 'offer', 'customer'
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
DROP POLICY IF EXISTS "Admins can view all logs" ON activity_logs;
CREATE POLICY "Admins can view all logs" ON activity_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Everyone can insert logs (system triggers or service calls)
DROP POLICY IF EXISTS "Everyone can insert logs" ON activity_logs;
CREATE POLICY "Everyone can insert logs" ON activity_logs
    FOR INSERT
    WITH CHECK (true); -- Ideally restrict to authenticated, but true for simplicity now

-- Create notifications table if not exists (often useful to ensure schema)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own notifications
DROP POLICY IF EXISTS "Users can see own notifications" ON notifications;
CREATE POLICY "Users can see own notifications" ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: System/Admin can insert notifications (simplified)
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (true); 
