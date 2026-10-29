begin;

drop policy if exists parents_read on public.parents;
create policy parents_scoped_read
on public.parents
for select
using (
  public.is_admin_or_receptionist()
  or profile_id = auth.uid()
  or exists (
    select 1
    from public.student_parents link
    where link.parent_id = parents.id
      and public.coach_has_student(link.student_id)
  )
);

commit;
