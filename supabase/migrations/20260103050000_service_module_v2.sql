-- SERVICE MODULE 2.0 SCHEMA UPGRADE

-- 1. Add TASKS column to service_tickets
-- Stores checklist items as JSONB: [{ id: uuid, label: text, completed: boolean }]
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tickets' AND column_name = 'tasks') THEN 
        ALTER TABLE "public"."service_tickets" ADD COLUMN "tasks" JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Create SERVICE_TICKET_HISTORY table
CREATE TABLE IF NOT EXISTS "public"."service_ticket_history" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "ticket_id" UUID NOT NULL REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE,
    "changed_by" UUID REFERENCES "auth"."users"("id"), -- NULL if system change
    "change_type" TEXT NOT NULL, -- 'status', 'note', 'assignment', 'task', 'info'
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Enable RLS on History
ALTER TABLE "public"."service_ticket_history" ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for History
-- View: Authenticated users can view history
DROP POLICY IF EXISTS "Authenticated can view history" ON "public"."service_ticket_history";
CREATE POLICY "Authenticated can view history" 
    ON "public"."service_ticket_history" FOR SELECT 
    TO authenticated 
    USING (true);

-- Insert: Authenticated users can add history records
DROP POLICY IF EXISTS "Authenticated can insert history" ON "public"."service_ticket_history";
CREATE POLICY "Authenticated can insert history" 
    ON "public"."service_ticket_history" FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- 5. Helper Function to record history (Optional, can be done in app layer, but DB trigger is safer)
-- For now, we'll handle explicit history creation in the Service Layer to keep logic centralized in TypeScript
-- allowing for more context-aware messages.
