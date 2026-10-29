begin;

do $$
declare
  target_student record;
  parent_row record;
  recipient_count integer := 0;
begin
  select id, full_name, date_of_birth
  into strict target_student
  from public.students
  where student_code = 'STU001'
    and full_name = 'Aarav Sharma'
    and status = 'active'
  for update;

  if not exists (
    select 1
    from public.notification_templates
    where template_key = 'student_birthday'
      and channel = 'in_app'
      and status = 'active'
  ) then
    raise exception 'The active student birthday in-app template is unavailable.';
  end if;

  update public.students
  set date_of_birth = make_date(
    extract(year from target_student.date_of_birth)::integer,
    10,
    13
  )
  where id = target_student.id;

  for parent_row in
    select p.id, p.full_name
    from public.student_parents sp
    join public.parents p on p.id = sp.parent_id
    where sp.student_id = target_student.id
      and p.status = 'active'
  loop
    perform public.queue_automated_parent_notice(
      parent_row.id,
      target_student.id,
      'student_birthday',
      'manual:student_birthday:aarav-sharma:2026-10-13:' || parent_row.id::text,
      jsonb_build_object(
        'parent_name', parent_row.full_name,
        'student_name', target_student.full_name
      )
    );
    recipient_count := recipient_count + 1;
  end loop;

  if recipient_count = 0 then
    raise exception 'No active parent is linked to Aarav Sharma; birthday update rolled back.';
  end if;
end;
$$;

commit;
