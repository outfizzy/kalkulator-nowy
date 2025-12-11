-- Allow everyone to see all leads (Global Visibility)
DROP POLICY IF EXISTS "Leads Visibility Policy" ON leads;

CREATE POLICY "Leads Visibility Policy" ON leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Ensure Insert is allowed
DROP POLICY IF EXISTS "Leads Insert Policy" ON leads;
CREATE POLICY "Leads Insert Policy" ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Ensure Update is consistent (Owner, Admin, or Unassigned)
DROP POLICY IF EXISTS "Leads Update Policy" ON leads;
CREATE POLICY "Leads Update Policy" ON leads
    FOR UPDATE
    TO authenticated
    USING (
        (assigned_to IS NULL) OR 
        (assigned_to = auth.uid()) OR 
        (
            auth.jwt() ->> 'role' IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        (assigned_to IS NULL) OR 
        (assigned_to = auth.uid()) OR 
        (
            auth.jwt() ->> 'role' IN ('admin', 'manager')
        )
    );
