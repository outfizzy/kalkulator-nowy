-- Add deleted_at column to tasks table for Soft Delete
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Update RLS policies to filter out deleted tasks by default
-- Note: We generally want to hide deleted tasks from standard SELECTs unless specifically requested (which RLS makes hard if we want "Show Deleted" toggles).
-- Better approach: Allow SELECT on all (if user has access), but filter in the Frontend/Service layer.
-- However, for security, let's keep it simple: Everyone can see deleted tasks if they own them, but we'll filter in the query.

-- Or, we can use a Policy to HIDE them if we want strict security.
-- Let's just add the column for now. The Service layer will handle the filtering `where deleted_at is null`.

-- Optional: Create an index (good for performance as almost all queries will filter by this)
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
