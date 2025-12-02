-- Create wallet_transactions table
create table if not exists public.wallet_transactions (
    id uuid default gen_random_uuid() primary key,
    type text not null check (type in ('income', 'expense')),
    amount decimal(10, 2) not null,
    category text not null,
    description text,
    date timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Optional link to customer/contract for income
    customer_id uuid references public.offers(id), -- Linking to offer as "customer" context often comes from there, or we can just store name
    customer_name text,
    contract_number text,
    
    -- Metadata
    processed_by uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.wallet_transactions enable row level security;

-- Policies
create policy "Admins can view all transactions"
    on public.wallet_transactions for select
    using (
        exists (
            select 1 from public.users
            where users.id = auth.uid()
            and users.role in ('admin', 'manager')
        )
    );

create policy "Admins can insert transactions"
    on public.wallet_transactions for insert
    with check (
        exists (
            select 1 from public.users
            where users.id = auth.uid()
            and users.role in ('admin', 'manager')
        )
    );

create policy "Admins can update transactions"
    on public.wallet_transactions for update
    using (
        exists (
            select 1 from public.users
            where users.id = auth.uid()
            and users.role in ('admin', 'manager')
        )
    );

create policy "Admins can delete transactions"
    on public.wallet_transactions for delete
    using (
        exists (
            select 1 from public.users
            where users.id = auth.uid()
            and users.role in ('admin', 'manager')
        )
    );
