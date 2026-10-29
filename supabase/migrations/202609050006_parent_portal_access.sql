create index if not exists idx_parents_profile on public.parents(profile_id);
create index if not exists idx_student_parents_parent on public.student_parents(parent_id);
create index if not exists idx_enrollments_student_status on public.enrollments(student_id,status);
create index if not exists idx_attendance_student_date on public.attendance_records(student_id,attendance_date desc);
create index if not exists idx_monthly_charges_student_status on public.monthly_charges(student_id,status);
create index if not exists idx_payments_student_date on public.payments(student_id,paid_at desc);

create policy parent_linked_coaches_read on public.coaches for select
using (exists (
  select 1 from public.batch_coaches bc
  join public.enrollments e on e.batch_id=bc.batch_id and e.status in ('active','paused')
  where bc.coach_id=coaches.id and public.parent_owns_student(e.student_id)
));

create policy parent_linked_batch_coaches_read on public.batch_coaches for select
using (exists (
  select 1 from public.enrollments e
  where e.batch_id=batch_coaches.batch_id and e.status in ('active','paused')
    and public.parent_owns_student(e.student_id)
));

create policy parent_own_photo_read on storage.objects for select
using (bucket_id='parent-photos' and exists (
  select 1 from public.parents p where p.profile_id=auth.uid()
    and (storage.foldername(name))[1]=p.id::text
));

create policy parent_receipt_file_read on storage.objects for select
using (bucket_id='receipts' and exists (
  select 1 from public.receipts r join public.payments p on p.id=r.payment_id
  where r.storage_path=name and public.parent_owns_student(p.student_id)
));
