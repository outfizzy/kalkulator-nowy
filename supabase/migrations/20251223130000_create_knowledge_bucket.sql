-- Create knowledge-base bucket if not exists
insert into storage.buckets (id, name, public)
values ('knowledge-base', 'knowledge-base', false)
on conflict (id) do nothing;

-- Storage Policies
-- We need to drop existing policies first to be idempotent since we might re-run
drop policy if exists "Authenticated users can upload knowledge" on storage.objects;
drop policy if exists "Authenticated users can select knowledge" on storage.objects;
drop policy if exists "Authenticated users can delete knowledge" on storage.objects;

create policy "Authenticated users can upload knowledge"
on storage.objects for insert
with check ( bucket_id = 'knowledge-base' and auth.role() = 'authenticated' );

create policy "Authenticated users can select knowledge"
on storage.objects for select
using ( bucket_id = 'knowledge-base' and auth.role() = 'authenticated' );

create policy "Authenticated users can delete knowledge"
on storage.objects for delete
using ( bucket_id = 'knowledge-base' and auth.role() = 'authenticated' );
