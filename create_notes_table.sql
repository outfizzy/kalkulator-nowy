-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'customer')),
    entity_id UUID NOT NULL,
    content TEXT,
    user_id UUID REFERENCES auth.users(id),
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view notes for leads/customers they have access to
--    For simplicity (and performance), we'll trust that if you can load the page, you can load the notes.
--    Or we can mimic Lead/Customer RLS.
--    Let's use a simpler policy for now: Authenticated users can read/write notes.
--    Refinement: Admin/Manager can see all. Sales Rep can see notes they created OR notes for entities they are assigned to.

CREATE POLICY "Enable read access for authenticated users" ON public.notes
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.notes
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for own notes" ON public.notes
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for own notes" ON public.notes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Migration: Move existing notes from Leads to Notes table
INSERT INTO public.notes (entity_type, entity_id, content, user_id, created_at)
SELECT 
    'lead', 
    id, 
    notes, 
    COALESCE(assigned_to, auth.uid()), -- If no assignee, assign to current user (runner of script) or null logic
    created_at
FROM public.leads 
WHERE notes IS NOT NULL AND notes != '';

-- Optional: Clear old notes column (or keep as backup for now)
-- UPDATE public.leads SET notes = NULL;
