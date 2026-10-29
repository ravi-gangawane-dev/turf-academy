begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('student-photos','student-photos',false,5242880,array['image/jpeg','image/png','image/webp']),
  ('student-documents','student-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
  ('coach-photos','coach-photos',false,5242880,array['image/jpeg','image/png','image/webp']),
  ('medical-documents','medical-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
  ('receipts','receipts',false,5242880,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_staff_read on storage.objects for select to authenticated
using (bucket_id in ('student-photos','student-documents','coach-photos','medical-documents','receipts') and public.is_staff());
create policy storage_parent_student_read on storage.objects for select to authenticated
using (
  bucket_id in ('student-photos','student-documents','medical-documents')
  and split_part(name,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.parent_owns_student(split_part(name,'/',1)::uuid)
);
create policy storage_staff_insert on storage.objects for insert to authenticated
with check (bucket_id in ('student-photos','student-documents','coach-photos','medical-documents','receipts') and public.is_admin_or_receptionist());
create policy storage_staff_update on storage.objects for update to authenticated
using (bucket_id in ('student-photos','student-documents','coach-photos','medical-documents','receipts') and public.is_admin_or_receptionist())
with check (bucket_id in ('student-photos','student-documents','coach-photos','medical-documents','receipts') and public.is_admin_or_receptionist());
create policy storage_admin_delete on storage.objects for delete to authenticated
using (bucket_id in ('student-photos','student-documents','coach-photos','medical-documents','receipts') and public.is_admin());

do $$ begin
  alter publication supabase_realtime add table public.attendance_records;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.payments;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

commit;
