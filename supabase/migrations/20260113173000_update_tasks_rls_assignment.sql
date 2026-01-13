-- Add created_by column to track who created the task
ALTER TABLE tasks ADD COLUMN created_by uuid REFERENCES public.profiles(id);

-- Set created_by to user_id for existing tasks (safe assumption for migration)
UPDATE tasks SET created_by = user_id WHERE created_by IS NULL;

-- Make created_by not null after population
ALTER TABLE tasks ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Drop old restricted policies
DROP POLICY IF EXISTS "Users View Assigned" ON tasks;
DROP POLICY IF EXISTS "Users Create" ON tasks;

-- Create new broader policies

-- 1. Users can VIEW tasks if they are the assignee OR the creator
CREATE POLICY "Users View Own or Created"
    ON tasks
    FOR SELECT
    USING (
        auth.uid() = user_id OR auth.uid() = created_by
    );

-- 2. Users can CREATE tasks for anyone, provided they mark themselves as creator (enforced by default/trigger or check)
-- Actually, the check matches constraints.
CREATE POLICY "Users Create Any Assignment"
    ON tasks
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
    );

-- 3. Users can UPDATE tasks if they are the assignee OR the creator
-- (e.g. Creator might want to change deadline or reassign)
DROP POLICY IF EXISTS "Users Update Assigned" ON tasks;

CREATE POLICY "Users Update Own or Created"
    ON tasks
    FOR UPDATE
    USING (
        auth.uid() = user_id OR auth.uid() = created_by
    );
