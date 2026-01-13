-- Add attachments column to leads table
alter table leads add column if not exists attachments jsonb[] default '{}';

-- Create storage bucket for lead attachments
insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', true)
on conflict (id) do nothing;

-- storage policies (Check existing first or use unique names)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and policyname = 'Lead Attachments Public Access'
  ) then
    create policy "Lead Attachments Public Access"
      on storage.objects for select
      using ( bucket_id = 'lead-attachments' );
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and policyname = 'Lead Attachments Auth Upload'
  ) then
    create policy "Lead Attachments Auth Upload"
      on storage.objects for insert
      with check ( bucket_id = 'lead-attachments' and auth.role() = 'authenticated' );
  end if;
end $$;
