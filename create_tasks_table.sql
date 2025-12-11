
-- Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- The user responsible (assignee)
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- Optional link to Lead
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE, -- Optional link to Customer
    
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    priority TEXT DEFAULT 'medium', -- low, medium, high
    type TEXT DEFAULT 'task', -- task, call, email, meeting
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. View: Users can view tasks assigned to them OR tasks linked to Leads/Customers they have access to?
-- Simpler: Users can view tasks they created or are assigned to.
-- Actually, for CRM collaboration, maybe view all tasks?
-- Let's stick to: View tasks assigned to me OR created by me.
-- Plus Admins see all.

CREATE POLICY "Users can view own tasks" 
ON public.tasks 
FOR SELECT 
USING (
    auth.uid() = user_id 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 2. Insert: Authenticated users can create tasks
CREATE POLICY "Users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated'
    -- Optionally enforce user_id = auth.uid() or allow assignment
);

-- 3. Update: Users can update their own tasks or Admins
CREATE POLICY "Users can update own tasks" 
ON public.tasks 
FOR UPDATE 
USING (
    auth.uid() = user_id 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 4. Delete: Users can delete their own tasks or Admins
CREATE POLICY "Users can delete own tasks" 
ON public.tasks 
FOR DELETE 
USING (
    auth.uid() = user_id 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Notify PostgREST
NOTIFY pgrst, 'reload config';
