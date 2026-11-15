-- Run against the linked test database. All created rows are rolled back.
begin;

select set_config('request.jwt.claim.sub', (
  select id::text from public.profiles where role = 'admin' and is_active limit 1
), true);
set local role authenticated;

do $$
declare
  student_id uuid;
  updated_student_id uuid;
  parent_id uuid := gen_random_uuid();
  v_coach_id uuid := gen_random_uuid();
  student_email text := 'crud-' || gen_random_uuid()::text || '@example.test';
  phone_number text := '9' || lpad((floor(random() * 1000000000))::bigint::text, 9, '0');
  payload jsonb;
begin
  if not public.is_admin() then
    raise exception 'Active admin fixture required';
  end if;

  payload := jsonb_build_object(
    'full_name', 'CRUD Student Fixture',
    'date_of_birth', '2012-01-01',
    'gender', 'Male',
    'blood_group', 'B+',
    'phone', phone_number,
    'email', student_email,
    'nationality', 'Indian',
    'address', jsonb_build_object(
      'line1', 'CRUD Test Road',
      'line2', 'Suite 1',
      'city', 'Pune',
      'state', 'Maharashtra',
      'pinCode', '412115'
    ),
    'skill_level', 'Beginner',
    'joined_on', current_date,
    'parent_name', 'CRUD Guardian Fixture',
    'parent_relation', 'Guardian',
    'parent_phone', phone_number,
    'parent_email', 'guardian-' || gen_random_uuid()::text || '@example.test'
  );

  student_id := public.create_student_profile_v2(payload);
  if not exists (
    select 1 from public.students
    where id = student_id and full_name = 'CRUD Student Fixture'
      and phone = phone_number and lower(email) = lower(student_email)
  ) then
    raise exception 'Student create/read failed';
  end if;

  payload := payload || jsonb_build_object('full_name', 'CRUD Student Updated');
  updated_student_id := public.update_student_profile_v2(student_id, payload);
  if updated_student_id <> student_id then
    raise exception 'Student update returned % instead of %', updated_student_id, student_id;
  end if;
  if not exists (
    select 1 from public.students
    where id = student_id and full_name = 'CRUD Student Updated'
  ) then
    raise exception 'Student update did not persist; stored name is %',
      (select full_name from public.students where id = student_id);
  end if;

  insert into public.parents(id, full_name, relation, phone, whatsapp, email, occupation)
  values (parent_id, 'CRUD Parent Fixture', 'Guardian', phone_number, phone_number, student_email, 'Coach');
  if not exists (
    select 1 from public.parents where id = parent_id and full_name = 'CRUD Parent Fixture'
  ) then
    raise exception 'Parent create/read failed';
  end if;
  update public.parents set full_name = 'CRUD Parent Updated' where id = parent_id;
  if not exists (
    select 1 from public.parents where id = parent_id and full_name = 'CRUD Parent Updated'
  ) then
    raise exception 'Parent update failed';
  end if;
  delete from public.parents where id = parent_id;
  if exists (select 1 from public.parents where id = parent_id) then
    raise exception 'Parent delete failed';
  end if;

  insert into public.coaches(id, employee_code, full_name, phone, email, experience_years)
  values (v_coach_id, 'CRUD-' || left(v_coach_id::text, 8), 'CRUD Coach Fixture', phone_number, student_email, 1);
  if not exists (
    select 1 from public.coaches where id = v_coach_id and full_name = 'CRUD Coach Fixture'
  ) then
    raise exception 'Coach create/read failed';
  end if;
  insert into public.coach_specializations(coach_id, specialization)
  values (v_coach_id, 'CRUD Test Specialization');
  update public.coaches set full_name = 'CRUD Coach Updated' where id = v_coach_id;
  if not exists (
    select 1 from public.coaches
    where id = v_coach_id and full_name = 'CRUD Coach Updated'
      and exists (
        select 1 from public.coach_specializations cs
        where cs.coach_id = v_coach_id
          and cs.specialization = 'CRUD Test Specialization'
      )
  ) then
    raise exception 'Coach update/read failed';
  end if;
  delete from public.coaches where id = v_coach_id;
  if exists (select 1 from public.coaches where id = v_coach_id) then
    raise exception 'Coach delete failed';
  end if;
  if exists (select 1 from public.coach_specializations cs where cs.coach_id = v_coach_id) then
    raise exception 'Coach specialization cleanup failed';
  end if;

  perform public.delete_student_profile(student_id);
  if exists (select 1 from public.students where id = student_id) then
    raise exception 'Student delete failed';
  end if;
end;
$$;

rollback;
