-- Create function update_modified_column if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

-- Create inventory_items table if it doesn't exist
create table if not exists public.inventory_items (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    category text not null default 'Inne',
    quantity integer not null default 0,
    min_quantity integer not null default 5,
    unit text not null default 'szt',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(name)
);

-- Enable RLS
alter table public.inventory_items enable row level security;

-- Create policies defined in a DO block to avoid errors if they already exist
do $$
begin
    -- Policy for reading items (authenticated users)
    if not exists (
        select 1 from pg_policies 
        where schemaname = 'public' 
        and tablename = 'inventory_items' 
        and policyname = 'Enable read access for authenticated users'
    ) then
        create policy "Enable read access for authenticated users"
        on public.inventory_items for select
        to authenticated
        using (true);
    end if;

    -- Policy for inserting items (authenticated users)
    if not exists (
        select 1 from pg_policies 
        where schemaname = 'public' 
        and tablename = 'inventory_items' 
        and policyname = 'Enable insert access for authenticated users'
    ) then
        create policy "Enable insert access for authenticated users"
        on public.inventory_items for insert
        to authenticated
        with check (true);
    end if;

    -- Policy for updating items (authenticated users)
    if not exists (
        select 1 from pg_policies 
        where schemaname = 'public' 
        and tablename = 'inventory_items' 
        and policyname = 'Enable update access for authenticated users'
    ) then
        create policy "Enable update access for authenticated users"
        on public.inventory_items for update
        to authenticated
        using (true);
    end if;

    -- Policy for deleting items (authenticated users)
    if not exists (
        select 1 from pg_policies 
        where schemaname = 'public' 
        and tablename = 'inventory_items' 
        and policyname = 'Enable delete access for authenticated users'
    ) then
        create policy "Enable delete access for authenticated users"
        on public.inventory_items for delete
        to authenticated
        using (true);
    end if;
end $$;

-- Create updated_at trigger
drop trigger if exists update_inventory_items_modtime on public.inventory_items;
create trigger update_inventory_items_modtime
    before update on public.inventory_items
    for each row
    execute function update_modified_column();
