-- Modify fuel_logs table to support public entries (QR code access)

-- 1. Make user_id nullable for public entries
ALTER TABLE fuel_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add fields for public entries (name instead of user_id)
ALTER TABLE fuel_logs 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS entry_source TEXT CHECK (entry_source IN ('app', 'qr_public')) DEFAULT 'app';

-- 3. Make odometer_reading and cost optional (not required for simple QR entries)
ALTER TABLE fuel_logs 
ALTER COLUMN odometer_reading DROP NOT NULL,
ALTER COLUMN cost DROP NOT NULL;

-- 4. Add comment
COMMENT ON COLUMN fuel_logs.entry_source IS 'Source of entry: app (logged in user) or qr_public (public QR code form)';
COMMENT ON COLUMN fuel_logs.first_name IS 'First name for public QR entries (when user_id is null)';
COMMENT ON COLUMN fuel_logs.last_name IS 'Last name for public QR entries (when user_id is null)';

-- 5. Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create fuel logs" ON fuel_logs;

-- 6. Create new INSERT policy that allows both authenticated and public entries
CREATE POLICY "Allow fuel log creation" ON fuel_logs
    FOR INSERT WITH CHECK (
        -- Authenticated users (app)
        (auth.uid() = user_id AND entry_source = 'app')
        OR
        -- Public QR code entries (no auth required)
        (user_id IS NULL AND entry_source = 'qr_public' AND first_name IS NOT NULL AND last_name IS NOT NULL)
    );

-- 7. Keep existing SELECT policies unchanged
-- (Only authenticated users can view logs)
