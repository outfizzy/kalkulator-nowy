-- RESTRICT TASK DELETION TO ADMINS ONLY
-- This migration updates the RLS policies for the "tasks" table.

BEGIN;

ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

-- 1. VIEW: Authenticated users can view all tasks (modify if you want to restrict visibility)
DROP POLICY IF EXISTS "Authenticated can view tasks" ON "public"."tasks";
CREATE POLICY "Authenticated can view tasks" ON "public"."tasks" FOR SELECT TO authenticated USING (true);

-- 2. INSERT: Authenticated users can create tasks
DROP POLICY IF EXISTS "Authenticated can create tasks" ON "public"."tasks";
CREATE POLICY "Authenticated can create tasks" ON "public"."tasks" FOR INSERT TO authenticated WITH CHECK (true);

-- 3. UPDATE: Authenticated users can update tasks (e.g., status, assign)
DROP POLICY IF EXISTS "Authenticated can update tasks" ON "public"."tasks";
CREATE POLICY "Authenticated can update tasks" ON "public"."tasks" FOR UPDATE TO authenticated USING (true);

-- 4. DELETE: Only Admins can delete tasks
DROP POLICY IF EXISTS "Admins can delete tasks" ON "public"."tasks";
CREATE POLICY "Admins can delete tasks" ON "public"."tasks" 
FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

COMMIT;
