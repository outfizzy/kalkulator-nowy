-- Clean slate: Remove all existing manual pricing data
truncate table "public"."pricing_base";

-- Ensure RLS is permissive for authenticated users during this setup phase
drop policy if exists "Enable write access for authenticated users" on "public"."pricing_base";
create policy "Enable write access for authenticated users" 
    on "public"."pricing_base" 
    for insert 
    with check (auth.role() = 'authenticated');

-- Ensure update policy covers new columns if strict (usually it's fine, but good to refresh)
drop policy if exists "Enable update for authenticated users" on "public"."pricing_base";
create policy "Enable update for authenticated users" 
    on "public"."pricing_base" 
    for update 
    using (auth.role() = 'authenticated');
