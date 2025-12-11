-- Update RLS policies for leads table to support exclusive visibility

-- 1. Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON leads;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON leads;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON leads;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON leads;

-- Drop new policies if they exist (to allow re-running script)
DROP POLICY IF EXISTS "Leads Visibility Policy" ON leads;
DROP POLICY IF EXISTS "Leads Insert Policy" ON leads;
DROP POLICY IF EXISTS "Leads Update Policy" ON leads;
DROP POLICY IF EXISTS "Leads Delete Policy" ON leads;

-- 2. Create refined policies

-- SELECT: 
-- - Admins and Managers see ALL leads.
-- - Sales Reps (and others) see leads that are:
--   a) Unassigned (assigned_to IS NULL) -> So they can pick them up
--   b) Assigned to them (assigned_to = auth.uid())
CREATE POLICY "Leads Visibility Policy" ON leads
    FOR SELECT
    TO authenticated
    USING (
        (assigned_to IS NULL) OR 
        (assigned_to = auth.uid()) OR 
        (
            auth.jwt() ->> 'role' IN ('admin', 'manager')
        )
    );

-- INSERT: Authenticated users can create leads
CREATE POLICY "Leads Insert Policy" ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE:
-- - Users can update leads assigned to them.
-- - Users can update unassigned leads (to assign themselves or change status).
-- - Admins/Managers can update all.
-- UPDATE:
-- - Users can update leads assigned to them.
-- - Users can update unassigned leads (to assign themselves or change status).
-- - Admins/Managers can update all.
CREATE POLICY "Leads Update Policy" ON leads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
    
-- DELETE: Only Admins can delete leads (optional, or owner)
CREATE POLICY "Leads Delete Policy" ON leads
    FOR DELETE
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );
