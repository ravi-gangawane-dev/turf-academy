begin;

-- Do not expose broad table UPDATE rights through RLS. The security-definer RPC
-- checks the parent-child link and writes only the explicitly mapped profile fields.
drop policy if exists parent_linked_student_update on public.students;
drop policy if exists parent_linked_medical_insert on public.student_medical_records;
drop policy if exists parent_linked_medical_update on public.student_medical_records;

alter function public.parent_update_linked_student(uuid, jsonb) security definer;

revoke all on function public.parent_update_linked_student(uuid, jsonb) from public;
grant execute on function public.parent_update_linked_student(uuid, jsonb) to authenticated;

commit;
