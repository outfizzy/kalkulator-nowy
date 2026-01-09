-- Remove legacy price tables to clear the UI
truncate table "public"."price_tables" cascade;

-- (Optional) If there are other legacy tables like 'price_matrix_entries', clear them too via cascade
-- Note: 'cascade' on price_tables should handle dependent entries if FKs exist.

-- Re-verify RLS for pricing_base (just to be safe)
drop policy if exists "Enable write access for authenticated users" on "public"."pricing_base";
create policy "Enable write access for authenticated users" 
    on "public"."pricing_base" 
    for insert 
    with check (auth.role() = 'authenticated');
