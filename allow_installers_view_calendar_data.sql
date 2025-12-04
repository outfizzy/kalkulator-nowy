-- Allow installers to view all installations for the planning calendar
DROP POLICY IF EXISTS "Installers can view assigned installations" ON installations;
CREATE POLICY "Installers can view all installations" ON installations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('installer', 'admin', 'manager', 'sales_rep')
        )
    );

-- Allow installers to view all teams
DROP POLICY IF EXISTS "Installers can view teams" ON teams;
CREATE POLICY "Installers can view teams" ON teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('installer', 'admin', 'manager', 'sales_rep')
        )
    );

-- Allow installers to view all team members
DROP POLICY IF EXISTS "Installers can view team members" ON team_members;
CREATE POLICY "Installers can view team members" ON team_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('installer', 'admin', 'manager', 'sales_rep')
        )
    );
