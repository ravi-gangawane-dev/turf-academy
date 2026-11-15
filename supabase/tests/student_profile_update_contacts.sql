-- Run against the linked test database. All fixtures and writes roll back.
begin;

select set_config('request.jwt.claim.sub', (
  select id::text from public.profiles where role = 'admin' and is_active limit 1
), true);
set local role authenticated;

do $$
declare
  existing_id uuid := gen_random_uuid();
  duplicate_id uuid := gen_random_uuid();
  conflict_id uuid := gen_random_uuid();
  existing_code text := 'E2E-contact-' || gen_random_uuid()::text;
  duplicate_code text := 'E2E-contact-' || gen_random_uuid()::text;
  conflict_code text := 'E2E-contact-' || gen_random_uuid()::text;
  saved_id uuid;
  update_payload jsonb;
begin
  if not public.is_admin() then
    raise exception 'Active admin fixture required';
  end if;

  insert into public.students(id, student_code, full_name, date_of_birth, phone, email)
  values
    (existing_id, existing_code, 'Existing contact fixture', '2012-01-01', '+91 9130451715', 'shared@example.test'),
    (duplicate_id, duplicate_code, 'Duplicate contact fixture', '2012-01-01', '9130451715', 'shared@example.test'),
    (conflict_id, conflict_code, 'Changed contact fixture', '2012-01-01', '+91 9130451716', 'other@example.test');

  update_payload := jsonb_build_object(
    'full_name', 'Updated contact fixture',
    'date_of_birth', '2012-01-01',
    'gender', 'Male',
    'blood_group', 'B+',
    'phone', '9130451715',
    'email', 'shared@example.test',
    'address', jsonb_build_object(
      'line1', 'Address Line 1',
      'line2', 'Address Line 2',
      'city', 'Pune',
      'state', 'Maharashtra',
      'pinCode', '412115'
    ),
    'skill_level', 'Beginner',
    'joined_on', current_date,
    'parent_name', 'QA Parent',
    'parent_relation', 'Guardian',
    'parent_phone', '9130451715',
    'parent_email', 'parent@example.test'
  );

  saved_id := public.update_student_profile_v2(existing_id, update_payload);
  if saved_id <> existing_id then
    raise exception 'Update returned the wrong student ID';
  end if;

  begin
    perform public.update_student_profile_v2(
      existing_id,
      update_payload || jsonb_build_object('phone', '9130451716')
    );
    raise exception 'A changed phone number already in use should be rejected';
  exception
    when unique_violation then
      if sqlerrm <> 'student_already_exists' then
        raise;
      end if;
  end;
end;
$$;

rollback;
