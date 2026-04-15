-- =====================================================
-- Puls Firmy: User Activity Tracking System
-- =====================================================

-- 1. Extend profiles with presence columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 2. User sessions — tracks login/logout & work time
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_heartbeat TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started ON user_sessions(started_at);

-- 3. Page views — tracks navigation per module
CREATE TABLE IF NOT EXISTS page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    module TEXT NOT NULL,
    entered_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    left_at TIMESTAMPTZ,
    duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_page_views_user_date ON page_views(user_id, entered_at);
CREATE INDEX IF NOT EXISTS idx_page_views_module ON page_views(module, entered_at);

-- 4. RLS policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Users can insert/update their own sessions
CREATE POLICY "Users manage own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Admins can read all sessions
CREATE POLICY "Admins read all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Users can insert/update their own page views
CREATE POLICY "Users manage own page views" ON page_views
    FOR ALL USING (auth.uid() = user_id);

-- Admins can read all page views
CREATE POLICY "Admins read all page views" ON page_views
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- 5. Function to close stale sessions (called by pg_cron or manually)
CREATE OR REPLACE FUNCTION close_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Close sessions with no heartbeat for > 15 minutes
    UPDATE user_sessions
    SET is_active = false,
        ended_at = last_heartbeat,
        duration_minutes = EXTRACT(EPOCH FROM (last_heartbeat - started_at)) / 60
    WHERE is_active = true
      AND last_heartbeat < now() - interval '15 minutes';

    -- Mark those users as offline
    UPDATE profiles
    SET is_online = false
    WHERE is_online = true
      AND id NOT IN (
          SELECT user_id FROM user_sessions WHERE is_active = true
      );
END;
$$;
