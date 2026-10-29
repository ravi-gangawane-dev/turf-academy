begin;

-- Student writes span several related tables. Keep them atomic so a failed guardian,
-- medical, or enrollment write never leaves a partially-created profile.
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

  select 'STU' || lpad((coalesce(max(nullif(regexp_replace(student_code, '\\D', '', 'g'), '')::integer), 0) + 1)::text, 4, '0')
    into v_code from students;

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
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  if not exists(select 1 from students where id=p_student_id) then raise exception 'student_not_found' using errcode='P0002'; end if;
  if exists(select 1 from students where id<>p_student_id and phone=nullif(p_payload->>'phone',''))
     or exists(select 1 from students where id<>p_student_id and lower(email)=lower(nullif(p_payload->>'email',''))) then
    raise exception 'student_already_exists' using errcode='23505';
  end if;

  update students set
    full_name=trim(p_payload->>'full_name'), date_of_birth=(p_payload->>'date_of_birth')::date,
    gender=nullif(p_payload->>'gender',''), skill_level=coalesce(nullif(p_payload->>'skill_level',''),skill_level),
    phone=nullif(p_payload->>'phone',''), email=nullif(p_payload->>'email',''),
    address=jsonb_strip_nulls(jsonb_build_object(
      'formatted',nullif(p_payload->>'address',''),'city',nullif(p_payload->>'city',''),
      'state',nullif(p_payload->>'state',''),'pinCode',nullif(p_payload->>'pin_code',''),
      'nationality',nullif(p_payload->>'nationality',''),'aadhaar',nullif(p_payload->>'aadhaar','')
    )), photo_path=case when p_payload ? 'photo_path' then nullif(p_payload->>'photo_path','') else photo_path end,
    joined_on=(p_payload->>'joined_on')::date, version=version+1
  where id=p_student_id;

  select parent_id into v_parent_id from student_parents where student_id=p_student_id order by is_primary desc, created_at limit 1;
  if v_parent_id is null then
    insert into parents(full_name,relation,phone,whatsapp,email,status)
    values(trim(p_payload->>'parent_name'),nullif(p_payload->>'parent_relation',''),trim(p_payload->>'parent_phone'),trim(p_payload->>'parent_phone'),nullif(p_payload->>'parent_email',''),'active')
    returning id into v_parent_id;
    insert into student_parents(student_id,parent_id,is_primary) values(p_student_id,v_parent_id,true);
  else
    update parents set full_name=trim(p_payload->>'parent_name'), relation=nullif(p_payload->>'parent_relation',''),
      phone=trim(p_payload->>'parent_phone'), whatsapp=trim(p_payload->>'parent_phone'), email=nullif(p_payload->>'parent_email','')
    where id=v_parent_id;
  end if;

  insert into student_medical_records(student_id,blood_group,updated_by)
  values(p_student_id,nullif(p_payload->>'blood_group',''),auth.uid())
  on conflict(student_id) do update set blood_group=excluded.blood_group,updated_by=excluded.updated_by;

  select id into v_enrollment_id from enrollments where student_id=p_student_id and status in ('active','paused') order by valid_from desc limit 1;
  if v_batch_id is null then
    if v_enrollment_id is not null then update enrollments set status='cancelled' where id=v_enrollment_id; end if;
  else
    select fee_plan_id into v_fee_plan_id from batches where id=v_batch_id and status='active';
    if v_fee_plan_id is null then raise exception 'invalid_or_inactive_batch' using errcode='22023'; end if;
    select monthly_fee into v_monthly_fee from fee_plans where id=v_fee_plan_id and status='active';
    if v_enrollment_id is null then
      insert into enrollments(student_id,batch_id,fee_plan_id,valid_from,monthly_fee,created_by)
      values(p_student_id,v_batch_id,v_fee_plan_id,(p_payload->>'joined_on')::date,v_monthly_fee,auth.uid());
    else
      update enrollments set batch_id=v_batch_id,fee_plan_id=v_fee_plan_id,
        valid_from=(p_payload->>'joined_on')::date,monthly_fee=v_monthly_fee where id=v_enrollment_id;
    end if;
  end if;
  return p_student_id;
end;
$$;

create or replace function public.delete_student_profile(p_student_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare v_parent_ids uuid[];
begin
  if not public.is_admin() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  if not exists(select 1 from students where id=p_student_id) then raise exception 'student_not_found' using errcode='P0002'; end if;
  select array_agg(parent_id) into v_parent_ids from student_parents where student_id=p_student_id;
  delete from attendance_corrections where attendance_id in (select id from attendance_records where student_id=p_student_id);
  delete from attendance_records where student_id=p_student_id;
  delete from receipts where payment_id in (select id from payments where student_id=p_student_id);
  delete from payments where student_id=p_student_id;
  delete from monthly_charges where student_id=p_student_id;
  delete from enrollment_history where enrollment_id in (select id from enrollments where student_id=p_student_id);
  delete from enrollments where student_id=p_student_id;
  delete from student_discounts where student_id=p_student_id;
  update notifications set student_id=null where student_id=p_student_id;
  delete from students where id=p_student_id;
  delete from parents p where p.id=any(coalesce(v_parent_ids,array[]::uuid[]))
    and not exists(select 1 from student_parents sp where sp.parent_id=p.id) and p.profile_id is null;
end;
$$;

grant execute on function public.create_student_profile(jsonb) to authenticated;
grant execute on function public.update_student_profile(uuid,jsonb) to authenticated;
grant execute on function public.delete_student_profile(uuid) to authenticated;

commit;
