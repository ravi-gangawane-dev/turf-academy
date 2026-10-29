create policy parent_own_photo_insert on storage.objects for insert
with check (bucket_id='parent-photos' and exists (
  select 1 from public.parents p where p.profile_id=auth.uid()
    and (storage.foldername(name))[1]=p.id::text
));
create policy parent_own_photo_update on storage.objects for update
using (bucket_id='parent-photos' and exists (
  select 1 from public.parents p where p.profile_id=auth.uid()
    and (storage.foldername(name))[1]=p.id::text
)) with check (bucket_id='parent-photos' and exists (
  select 1 from public.parents p where p.profile_id=auth.uid()
    and (storage.foldername(name))[1]=p.id::text
));
create policy parent_own_photo_delete on storage.objects for delete
using (bucket_id='parent-photos' and exists (
  select 1 from public.parents p where p.profile_id=auth.uid()
    and (storage.foldername(name))[1]=p.id::text
));
