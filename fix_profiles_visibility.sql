-- Ensure profiles are visible to all authenticated users
-- This is required for the Ringostat widget to show who called back

-- Enable RLS on profiles if not already enabled
alter table public.profiles enable row level security;

-- Drop existing policy if it exists (to avoid conflicts or restrictive policies)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view all profiles" on public.profiles;

-- Create a policy that allows all authenticated users to view all profiles
create policy "Users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Ensure call_actions are also visible (re-applying just in case)
drop policy if exists "Users can view all call actions" on public.call_actions;
create policy "Users can view all call actions"
  on public.call_actions for select
  to authenticated
  using (true);
