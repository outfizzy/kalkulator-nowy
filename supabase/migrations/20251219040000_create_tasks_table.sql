-- Clean start: Drop the table if it exists to ensure schema correctness (especially Foreign Keys)
DROP TABLE IF EXISTS public.tasks CASCADE;

-- Create the tasks table
CREATE TABLE public.tasks (
    id uuid default gen_random_uuid() primary key,
    -- Foreign Key to PROFILES to allow joining user details (full_name)
    user_id uuid references public.profiles(id) not null,
    lead_id uuid references public.leads(id),
    customer_id uuid references public.customers(id),
    title text not null,
    description text,
    due_date timestamptz,
    status text not null check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    type text not null default 'task' check (type in ('task', 'call', 'email', 'meeting')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- 1. Admins and Managers have full access (CRUD) to everything
CREATE POLICY "Admins and Managers Full Access"
    ON public.tasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- 2. Regular Users (Sales Reps etc) can VIEW tasks assigned to them
CREATE POLICY "Users View Assigned"
    ON public.tasks
    FOR SELECT
    USING (
        auth.uid() = user_id
    );

-- 3. Regular Users can UPDATE tasks assigned to them (e.g. status)
CREATE POLICY "Users Update Assigned"
    ON public.tasks
    FOR UPDATE
    USING (
        auth.uid() = user_id
    );

-- 4. Regular Users can CREATE tasks (assign type check: usually assign to self)
-- Note: Admins/Managers are covered by Policy 1 for creation of any task.
CREATE POLICY "Users Create"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );
