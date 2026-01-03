-- Create inventory_transactions table
create table if not exists public.inventory_transactions (
    id uuid default gen_random_uuid() primary key,
    inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
    user_id uuid references auth.users(id),
    change_amount integer not null,
    new_quantity integer not null,
    operation_type text not null, -- 'adjustment', 'purchase', 'usage', 'return'
    reference_id uuid, -- e.g. installation_id or order_request_id
    reference_type text, -- 'installation', 'order_request', 'manual'
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.inventory_transactions enable row level security;

-- Policies
-- Policies
drop policy if exists "Enable read access for authenticated users" on public.inventory_transactions;
create policy "Enable read access for authenticated users"
    on public.inventory_transactions for select
    to authenticated
    using (true);

drop policy if exists "Enable insert access for authenticated users" on public.inventory_transactions;
create policy "Enable insert access for authenticated users"
    on public.inventory_transactions for insert
    to authenticated
    with check (true);
