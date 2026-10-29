begin;

-- Deletion must clean dependent audit/history rows that intentionally have no
-- client-side DELETE policy. The function still performs an explicit admin check.
alter function public.delete_student_profile(uuid) security definer;
revoke all on function public.delete_student_profile(uuid) from public;
grant execute on function public.delete_student_profile(uuid) to authenticated;

commit;
