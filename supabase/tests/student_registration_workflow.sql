-- Run with `supabase db query --linked --file ...` or against a local database.
-- Requires active admin and receptionist test profiles. All fixtures roll back.
begin;

select set_config('request.jwt.claim.sub', (
  select id::text from public.profiles where role = 'admin' and is_active limit 1
), true);
set local role authenticated;

do $$
declare
  created_id uuid;
  imported_id uuid := gen_random_uuid();
  next_number numeric;
  created_code text;
begin
  if not public.is_admin() then raise exception 'Active admin fixture required'; end if;
  insert into public.students(id, student_code, full_name, date_of_birth)
  values(imported_id, 'E2E-import-' || imported_id::text, 'Registration imported fixture', '2014-01-01');

  select greatest(coalesce(max(substring(student_code from '^STU([0-9]+)$')::numeric), 0), 9999) + 1
  into next_number from public.students;
  insert into public.students(student_code, full_name, date_of_birth)
  values('STU' || next_number::text, 'Registration code boundary fixture', '2014-01-01');

  created_id := public.create_student_profile(jsonb_build_object(
    'full_name', 'Registration admin fixture', 'date_of_birth', '2014-01-01',
    'parent_name', 'Registration guardian', 'parent_phone', '9000000000',
    'joined_on', current_date
  ));
  select student_code into created_code from public.students where id = created_id;
  if created_code <> 'STU' || (next_number + 1)::text then
    raise exception 'Student numbering failed: %', created_code;
  end if;
  if not exists(select 1 from public.qr_profiles where student_id = created_id and active and length(public_token) = 48) then
    raise exception 'Created student has no active opaque QR token';
  end if;
  if not exists(select 1 from public.qr_profiles where student_id = imported_id) then
    raise exception 'Direct student inserts must also receive a QR profile';
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', (
  select id::text from public.profiles where role = 'receptionist' and is_active limit 1
), true);
set local role authenticated;

do $$
declare created_id uuid;
begin
  if public.current_user_role() <> 'receptionist' then raise exception 'Active receptionist fixture required'; end if;
  created_id := public.create_student_profile(jsonb_build_object(
    'full_name', 'Registration receptionist fixture', 'date_of_birth', '2014-01-01',
    'parent_name', 'Registration guardian', 'parent_phone', '9000000000',
    'joined_on', current_date
  ));
  if not exists(select 1 from public.qr_profiles where student_id = created_id and active) then
    raise exception 'Receptionist-created student has no QR profile';
  end if;
  -- The trigger must not expand receptionist QR mutation permissions.
  update public.qr_profiles set active = false where student_id = created_id;
  if found then raise exception 'Receptionist unexpectedly modified a QR profile'; end if;
end;
$$;

rollback;
