alter table public.parents add column if not exists photo_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('parent-photos','parent-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Staff read parent photos" on storage.objects for select
using (bucket_id = 'parent-photos' and public.is_staff());

create policy "Admin manage parent photos" on storage.objects for all
using (bucket_id = 'parent-photos' and public.is_admin_or_receptionist())
with check (bucket_id = 'parent-photos' and public.is_admin_or_receptionist());
