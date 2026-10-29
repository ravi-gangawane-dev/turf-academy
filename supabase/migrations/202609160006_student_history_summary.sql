begin;

create or replace function public.get_student_history_summary(p_student_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'attendance_total',(select count(*) from public.attendance_records where student_id=p_student_id),
    'present',(select count(*) from public.attendance_records where student_id=p_student_id and status in ('present','checked_out')),
    'late',(select count(*) from public.attendance_records where student_id=p_student_id and status='late'),
    'absent',(select count(*) from public.attendance_records where student_id=p_student_id and status='absent'),
    'payment_total',(select coalesce(sum(amount),0) from public.payments where student_id=p_student_id and status in ('successful','partially_refunded','refunded'))
  )
$$;

grant execute on function public.get_student_history_summary(uuid) to authenticated;

commit;
