-- Fix installation_teams RLS policies
-- Issue: Saving teams not working - likely RLS blocking updates

-- Drop existing policies and recreate with proper permissions
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.installation_teams;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.installation_teams;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.installation_teams;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON public.installation_teams;

-- Read: All authenticated users
CREATE POLICY "Enable read access for all authenticated users" ON public.installation_teams
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert: All authenticated users (for now, could be restricted to admin/manager later)
CREATE POLICY "Enable insert access for all authenticated users" ON public.installation_teams
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Update: All authenticated users (for now, could be restricted to admin/manager later)
CREATE POLICY "Enable update access for all authenticated users" ON public.installation_teams
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Delete: All authenticated users (soft delete only, so this is for completeness)
CREATE POLICY "Enable delete access for all authenticated users" ON public.installation_teams
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant table access to authenticated role explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_teams TO authenticated;
