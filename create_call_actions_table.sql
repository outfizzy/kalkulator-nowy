-- Create table for tracking call actions (e.g. callbacks)
create table if not exists public.call_actions (
  id uuid default gen_random_uuid() primary key,
  call_id text not null, -- ID from Ringostat
  user_id uuid references auth.users(id) not null,
  action_type text not null, -- 'callback'
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.call_actions enable row level security;

-- Policies
create policy "Users can view all call actions"
  on public.call_actions for select
  using (true);

create policy "Users can insert call actions"
  on public.call_actions for insert
  with check (auth.uid() = user_id);
