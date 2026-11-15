begin;

create or replace function public.update_student_profile(p_student_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_parent_id uuid;
  v_enrollment_id uuid;
  v_batch_id uuid := nullif(p_payload->>'batch_id', '')::uuid;
  v_fee_plan_id uuid;
  v_monthly_fee numeric;
  v_current_phone text;
  v_current_email text;
  v_next_phone text := regexp_replace(coalesce(p_payload->>'phone', ''), '\D', '', 'g');
  v_current_phone_key text;
  v_next_phone_key text;
begin
  if not public.is_admin_or_receptionist() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('student-profile-write'));
  select phone, email
  into v_current_phone, v_current_email
  from public.students
  where id = p_student_id
  for update;
  if not found then
    raise exception 'student_not_found' using errcode = 'P0002';
  end if;

  v_current_phone_key := regexp_replace(coalesce(v_current_phone, ''), '\D', '', 'g');
  v_next_phone_key := v_next_phone;
  if length(v_current_phone_key) = 12 and left(v_current_phone_key, 2) = '91' then
    v_current_phone_key := right(v_current_phone_key, 10);
  elsif length(v_current_phone_key) = 11 and left(v_current_phone_key, 1) = '0' then
    v_current_phone_key := right(v_current_phone_key, 10);
  end if;
  if length(v_next_phone_key) = 12 and left(v_next_phone_key, 2) = '91' then
    v_next_phone_key := right(v_next_phone_key, 10);
  elsif length(v_next_phone_key) = 11 and left(v_next_phone_key, 1) = '0' then
    v_next_phone_key := right(v_next_phone_key, 10);
  end if;

  if (
    nullif(v_next_phone_key, '') is distinct from nullif(v_current_phone_key, '')
    and exists (
      select 1
      from public.students s
      where s.id <> p_student_id
        and (
          case
            when length(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g')) = 12
              and left(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 2) = '91'
              then right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10)
            when length(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g')) = 11
              and left(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 1) = '0'
              then right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10)
            else regexp_replace(coalesce(s.phone, ''), '\D', '', 'g')
          end
        ) = v_next_phone_key
    )
  ) or (
    lower(nullif(btrim(p_payload->>'email'), '')) is distinct from lower(nullif(btrim(v_current_email), ''))
    and exists (
      select 1
      from public.students s
      where s.id <> p_student_id
        and lower(nullif(btrim(s.email), '')) = lower(nullif(btrim(p_payload->>'email'), ''))
    )
  ) then
    raise exception 'student_already_exists' using errcode = '23505';
  end if;

  update public.students set
    full_name = trim(p_payload->>'full_name'),
    date_of_birth = (p_payload->>'date_of_birth')::date,
    gender = nullif(p_payload->>'gender', ''),
    skill_level = coalesce(nullif(p_payload->>'skill_level', ''), skill_level),
    phone = nullif(p_payload->>'phone', ''),
    email = nullif(p_payload->>'email', ''),
    address = jsonb_strip_nulls(jsonb_build_object(
      'formatted', nullif(p_payload->>'address', ''),
      'city', nullif(p_payload->>'city', ''),
      'state', nullif(p_payload->>'state', ''),
      'pinCode', nullif(p_payload->>'pin_code', ''),
      'nationality', nullif(p_payload->>'nationality', ''),
      'aadhaar', nullif(p_payload->>'aadhaar', '')
    )),
    photo_path = case
      when p_payload ? 'photo_path' then nullif(p_payload->>'photo_path', '')
      else photo_path
    end,
    joined_on = (p_payload->>'joined_on')::date,
    version = version + 1
  where id = p_student_id;

  select parent_id into v_parent_id
  from public.student_parents
  where student_id = p_student_id
  order by is_primary desc, created_at
  limit 1;

  if v_parent_id is null then
    insert into public.parents(full_name, relation, phone, whatsapp, email, status)
    values (
      trim(p_payload->>'parent_name'),
      nullif(p_payload->>'parent_relation', ''),
      trim(p_payload->>'parent_phone'),
      trim(p_payload->>'parent_phone'),
      nullif(p_payload->>'parent_email', ''),
      'active'
    )
    returning id into v_parent_id;
    insert into public.student_parents(student_id, parent_id, is_primary)
    values (p_student_id, v_parent_id, true);
  else
    update public.parents set
      full_name = trim(p_payload->>'parent_name'),
      relation = nullif(p_payload->>'parent_relation', ''),
      phone = trim(p_payload->>'parent_phone'),
      whatsapp = trim(p_payload->>'parent_phone'),
      email = nullif(p_payload->>'parent_email', '')
    where id = v_parent_id;
  end if;

  insert into public.student_medical_records(student_id, blood_group, updated_by)
  values (p_student_id, nullif(p_payload->>'blood_group', ''), auth.uid())
  on conflict (student_id) do update
    set blood_group = excluded.blood_group, updated_by = excluded.updated_by;

  select id into v_enrollment_id
  from public.enrollments
  where student_id = p_student_id and status in ('active', 'paused')
  order by valid_from desc
  limit 1;

  if v_batch_id is null then
    if v_enrollment_id is not null then
      update public.enrollments set status = 'cancelled' where id = v_enrollment_id;
    end if;
  else
    select fee_plan_id into v_fee_plan_id
    from public.batches
    where id = v_batch_id and status = 'active';
    if v_fee_plan_id is null then
      raise exception 'invalid_or_inactive_batch' using errcode = '22023';
    end if;
    select monthly_fee into v_monthly_fee
    from public.fee_plans
    where id = v_fee_plan_id and status = 'active';
    if v_enrollment_id is null then
      insert into public.enrollments(student_id, batch_id, fee_plan_id, valid_from, monthly_fee, created_by)
      values (p_student_id, v_batch_id, v_fee_plan_id, (p_payload->>'joined_on')::date, v_monthly_fee, auth.uid());
    else
      update public.enrollments set
        batch_id = v_batch_id,
        fee_plan_id = v_fee_plan_id,
        valid_from = (p_payload->>'joined_on')::date,
        monthly_fee = v_monthly_fee
      where id = v_enrollment_id;
    end if;
  end if;

  return p_student_id;
end;
$$;

commit;
