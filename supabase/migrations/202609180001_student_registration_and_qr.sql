begin;

create or replace function public.create_student_profile(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_student_id uuid := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  v_parent_id uuid;
  v_batch_id uuid := nullif(p_payload->>'batch_id', '')::uuid;
  v_fee_plan_id uuid;
  v_monthly_fee numeric;
  v_code text;
begin
  if not public.is_admin_or_receptionist() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_payload->>'full_name', ''))) < 2
     or nullif(p_payload->>'date_of_birth', '') is null
     or length(trim(coalesce(p_payload->>'parent_name', ''))) < 2
     or length(trim(coalesce(p_payload->>'parent_phone', ''))) < 10 then
    raise exception 'required_student_fields_missing' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('student-profile-write'));
  if exists (
    select 1 from students
    where nullif(p_payload->>'phone', '') is not null
      and phone = nullif(p_payload->>'phone', '')
  ) or exists (
    select 1 from students
    where nullif(p_payload->>'email', '') is not null
      and lower(email) = lower(nullif(p_payload->>'email', ''))
  ) then
    raise exception 'student_already_exists' using errcode = '23505';
  end if;

  -- Only academy-generated codes participate; imported/test codes are opaque.
  -- Numeric arithmetic and a dynamic width also handle codes beyond STU9999.
  select 'STU' || lpad(next_number::text, greatest(4, length(next_number::text)), '0')
  into v_code
  from (
    select coalesce(max(substring(student_code from '^STU([0-9]+)$')::numeric), 0) + 1 as next_number
    from students
  ) next_code;

  insert into students (
    id, student_code, full_name, date_of_birth, gender, skill_level, phone, email,
    address, photo_path, status, joined_on, created_by
  ) values (
    v_student_id, v_code, trim(p_payload->>'full_name'), (p_payload->>'date_of_birth')::date,
    nullif(p_payload->>'gender', ''), coalesce(nullif(p_payload->>'skill_level', ''), 'Beginner'),
    nullif(p_payload->>'phone', ''), nullif(p_payload->>'email', ''),
    jsonb_strip_nulls(jsonb_build_object(
      'formatted', nullif(p_payload->>'address', ''), 'city', nullif(p_payload->>'city', ''),
      'state', nullif(p_payload->>'state', ''), 'pinCode', nullif(p_payload->>'pin_code', ''),
      'nationality', nullif(p_payload->>'nationality', ''), 'aadhaar', nullif(p_payload->>'aadhaar', '')
    )), nullif(p_payload->>'photo_path', ''), 'active', (p_payload->>'joined_on')::date, auth.uid()
  ) returning id into v_student_id;

  insert into parents (full_name, relation, phone, whatsapp, email, status)
  values (
    trim(p_payload->>'parent_name'), nullif(p_payload->>'parent_relation', ''),
    trim(p_payload->>'parent_phone'), trim(p_payload->>'parent_phone'),
    nullif(p_payload->>'parent_email', ''), 'active'
  ) returning id into v_parent_id;
  insert into student_parents(student_id, parent_id, is_primary)
  values (v_student_id, v_parent_id, true);

  if nullif(p_payload->>'blood_group', '') is not null then
    insert into student_medical_records(student_id, blood_group, updated_by)
    values(v_student_id, p_payload->>'blood_group', auth.uid());
  end if;

  if v_batch_id is not null then
    select fee_plan_id into v_fee_plan_id from batches where id = v_batch_id and status = 'active';
    if v_fee_plan_id is null then raise exception 'invalid_or_inactive_batch' using errcode = '22023'; end if;
    select monthly_fee into v_monthly_fee from fee_plans where id = v_fee_plan_id and status = 'active';
    insert into enrollments(student_id, batch_id, fee_plan_id, valid_from, monthly_fee, created_by)
    values(v_student_id, v_batch_id, v_fee_plan_id, (p_payload->>'joined_on')::date, v_monthly_fee, auth.uid());
  end if;
  return v_student_id;
end;
$$;

-- Provision opaque QR identities atomically for every newly inserted student.
-- The trigger owns this write so receptionists retain their existing QR read-only access.
create or replace function public.create_student_qr_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.qr_profiles(student_id) values (new.id)
  on conflict (student_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_student_qr_profile() from public;
create trigger students_create_qr_profile
  after insert on public.students
  for each row execute function public.create_student_qr_profile();

-- Preserve all existing tokens, including explicitly deactivated profiles.
insert into public.qr_profiles(student_id)
select id from public.students
on conflict (student_id) do nothing;

commit;
