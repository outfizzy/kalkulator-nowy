-- Add DELETE policy for fuel_logs to allow authenticated users to delete entries

DROP POLICY IF EXISTS "Authenticated users can delete fuel logs" ON fuel_logs;

CREATE POLICY "Authenticated users can delete fuel logs" ON fuel_logs
    FOR DELETE USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "Authenticated users can delete fuel logs" ON fuel_logs 
    IS 'Allow any authenticated user to delete fuel log entries (admin check done in frontend)';
