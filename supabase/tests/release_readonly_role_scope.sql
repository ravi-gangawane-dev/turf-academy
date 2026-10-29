-- No records are created or changed. Uses existing role@turf.local profiles.
-- This checks database SELECT scope, not password login or mutation policies.
begin transaction read only;
do $$
declare
  actor record;
  expected_ids uuid[];
  actual_ids uuid[];
  all_count integer;
  checked integer := 0;
  summary jsonb := '[]'::jsonb;
begin
  select count(*) into all_count from public.students;
  for actor in
    select id, role::text as role from public.profiles
    where email = role::text || '@turf.local'
      and role::text in ('admin','receptionist','coach','parent')
      and is_active and status = 'active'
    order by role::text
  loop
    if actor.role in ('admin','receptionist') then
      select coalesce(array_agg(id order by id),'{}'::uuid[]) into expected_ids from public.students;
    elsif actor.role = 'coach' then
      select coalesce(array_agg(distinct e.student_id order by e.student_id),'{}'::uuid[])
        into expected_ids from public.enrollments e
        join public.batch_coaches bc on bc.batch_id=e.batch_id
        join public.coaches c on c.id=bc.coach_id
        where c.profile_id=actor.id and c.status='active' and e.status='active';
    else
      select coalesce(array_agg(distinct sp.student_id order by sp.student_id),'{}'::uuid[])
        into expected_ids from public.student_parents sp
        join public.parents p on p.id=sp.parent_id
        where p.profile_id=actor.id and p.status='active';
    end if;
    perform set_config('request.jwt.claim.sub',actor.id::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor.id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if public.current_user_role()::text is distinct from actor.role then
      raise exception 'Role resolution failed for %',actor.role;
    end if;
    select coalesce(array_agg(id order by id),'{}'::uuid[]) into actual_ids from public.students;
    if actual_ids is distinct from expected_ids then
      raise exception 'Student SELECT scope mismatch for %',actor.role;
    end if;
    execute 'reset role';
    summary := summary || jsonb_build_array(jsonb_build_object(
      'role',actor.role,'student_scope_matches',true,
      'has_allowed_fixture',cardinality(expected_ids)>0,
      'has_forbidden_fixture',all_count>cardinality(expected_ids)));
    checked := checked+1;
  end loop;
  if checked<>4 then raise exception 'Expected four active designated test profiles; found %',checked; end if;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  execute 'set local role anon';
  begin
    if exists(select 1 from public.students) then
      raise exception 'Anonymous user can read student records';
    end if;
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  perform set_config('release.readonly_scope_result',jsonb_build_object(
    'roles',summary,'anonymous_students_denied',true)::text,true);
end $$;
select current_setting('release.readonly_scope_result')::jsonb as result;
rollback;
