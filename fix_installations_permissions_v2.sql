-- Comprehensive RLS Fix for Installations
-- Run this script in Supabase SQL Editor to fix "new row violates row-level security policy" errors.

-- 1. Ensure RLS is enabled
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- 2. INSERT Policy
-- Allow ANY authenticated user (e.g. Sales Reps) to create an installation.
DROP POLICY IF EXISTS "Users can insert installations" ON installations;
CREATE POLICY "Users can insert installations"
ON installations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 3. SELECT Policy
-- Need complex logic:
-- A. Admins/Managers see ALL
-- B. Creator (user_id) sees their own
-- C. Assigned Installers (via installation_assignments) see theirs
DROP POLICY IF EXISTS "Installations visibility policy" ON installations;
DROP POLICY IF EXISTS "Admins and managers can view all installations" ON installations;
DROP POLICY IF EXISTS "Installers can view assigned installations" ON installations;

CREATE POLICY "Installations visibility policy"
ON installations
FOR SELECT
USING (
    -- A. Admin/Manager
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
    OR
    -- B. Creator (Owner)
    user_id = auth.uid()
    OR
    -- C. Assigned Installer
    EXISTS (
        SELECT 1 FROM installation_assignments ia
        WHERE ia.installation_id = id
        AND ia.user_id = auth.uid()
    )
);

-- 4. UPDATE Policy
-- Allow Creator or Admin/Manager to update
DROP POLICY IF EXISTS "Users can update own installations" ON installations;
CREATE POLICY "Users can update own installations"
ON installations
FOR UPDATE
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- 5. DELETE Policy
-- Only Admins/Managers can delete? (Or maybe creator? stick to safe side)
DROP POLICY IF EXISTS "Admins can delete installations" ON installations;
CREATE POLICY "Admins can delete installations"
ON installations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- Notify schema cache reload
NOTIFY pgrst, 'reload config';
