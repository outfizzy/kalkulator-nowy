-- Fix permissions for Installation Assignments (RLS)
-- Currently only Admins/Managers can manage assignments.
-- We need to allow Sales Reps (and other authenticated users) to assign installers.

ALTER TABLE installation_assignments ENABLE ROW LEVEL SECURITY;

-- 1. Allow INSERT for all authenticated users
-- (So Sales Reps can assign teams/installers)
DROP POLICY IF EXISTS "Users can create assignments" ON installation_assignments;
CREATE POLICY "Users can create assignments"
ON installation_assignments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow DELETE for all authenticated users
-- (So they can remove assignments)
DROP POLICY IF EXISTS "Users can delete assignments" ON installation_assignments;
CREATE POLICY "Users can delete assignments"
ON installation_assignments
FOR DELETE
USING (auth.role() = 'authenticated');

-- 3. Expand SELECT visibility
-- Currently only "Installers can view THEIR assignments".
-- We want users to see ALL assignments for installations they have access to.
-- Ideally, just allow authenticated users to see all assignments is simplest and safe for internal tool.
DROP POLICY IF EXISTS "Installers can view their assignments" ON installation_assignments;
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON installation_assignments;

CREATE POLICY "Authenticated users can view assignments"
ON installation_assignments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Notify schema reload
NOTIFY pgrst, 'reload config';
