-- Fix RLS policies for measurements table to allow Sales Reps to manage their own checks

-- Allow Sales Reps to UPDATE their own measurements
DROP POLICY IF EXISTS "Sales Reps can update their own measurements" ON measurements;
CREATE POLICY "Sales Reps can update their own measurements"
ON measurements FOR UPDATE
TO authenticated
USING (
  sales_rep_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Allow Sales Reps to DELETE their own measurements
DROP POLICY IF EXISTS "Sales Reps can delete their own measurements" ON measurements;
CREATE POLICY "Sales Reps can delete their own measurements"
ON measurements FOR DELETE
TO authenticated
USING (
  sales_rep_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
