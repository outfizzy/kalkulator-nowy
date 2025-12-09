-- Allow authenticated users (Sales Reps) to create installations
-- Currently only Admins/Managers have "FOR ALL" policy.

-- 1. Enable RLS (just in case)
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- 2. Add INSERT policy for all authenticated users
-- They can create an installation, usually triggered from a contract
DROP POLICY IF EXISTS "Users can insert installations" ON installations;

CREATE POLICY "Users can insert installations"
ON installations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 3. Add UPDATE policy for the creator (optional, but good practice if they made a mistake)
-- Or rely on Admin to manage it later. For now, let's allow them to update what they created.
DROP POLICY IF EXISTS "Users can update own installations" ON installations;

CREATE POLICY "Users can update own installations"
ON installations
FOR UPDATE
USING (auth.uid() = user_id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload config';
