-- Run as postgres on staging after 202610230007, with active parent/coach/admin profiles.
begin;
do $$
declare
  actor record;
  linked_parent uuid;
  linked_coach uuid;
  own_notice uuid;
  other_notice uuid;
  kept_notice uuid;
  subject_id uuid;
begin
  for actor in select distinct on (role) id, role from public.profiles
    where role in ('parent', 'coach') and is_active and status = 'active' order by role, id
  loop
    linked_parent := null; linked_coach := null;
    if actor.role = 'parent' then
      insert into public.parents(profile_id, full_name, phone)
        values(actor.id, 'Role test parent', '9876543210') returning id into linked_parent;
    else
      insert into public.coaches(profile_id, employee_code, full_name, phone)
        values(actor.id, gen_random_uuid()::text, 'Role test coach', '9876543210') returning id into linked_coach;
    end if;
    insert into public.notifications(parent_id, coach_id, channel, recipient, body, status)
      values(linked_parent, linked_coach, 'in_app', actor.id::text, 'Own notice', 'sent') returning id into own_notice;
    insert into public.notifications(channel, recipient, body)
      values('email', 'other@fixture.test', 'Other notice') returning id into other_notice;
    perform set_config('request.jwt.claim.sub', actor.id::text, true);
    execute 'set local role authenticated';
    if not exists(select 1 from public.notifications where id = own_notice)
      or exists(select 1 from public.notifications where id = other_notice) then
      raise exception 'recipient isolation failed for %', actor.role;
    end if;
    if exists(select 1 from public.notification_events where notification_id = own_notice) then
      raise exception 'recipient can read internal diagnostics';
    end if;
    if actor.role = 'parent' then
      perform public.parent_mark_notification_read(own_notice);
    else
      perform public.coach_mark_notification_read(own_notice);
    end if;
    if not exists(select 1 from public.notifications where id = own_notice and read_at is not null and status = 'sent') then
      raise exception 'read acknowledgement modified delivery or failed';
    end if;
    begin
      if actor.role = 'parent' then perform public.parent_mark_notification_read(other_notice);
      else perform public.coach_mark_notification_read(other_notice); end if;
      raise exception 'cross-recipient acknowledgement allowed';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
    update public.profiles set is_active = false where id = actor.id;
    execute 'set local role authenticated';
    if exists(select 1 from public.notifications where id = own_notice) then
      raise exception 'inactive profile can read notifications';
    end if;
    begin
      if actor.role = 'parent' then perform public.parent_mark_all_notifications_read();
      else perform public.coach_mark_all_notifications_read(); end if;
      raise exception 'inactive profile can acknowledge notifications';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
    update public.profiles set is_active = true where id = actor.id;
    if actor.role = 'parent' then update public.parents set status = 'inactive' where id = linked_parent;
    else update public.coaches set status = 'inactive' where id = linked_coach; end if;
    execute 'set local role authenticated';
    if exists(select 1 from public.notifications where id = own_notice) then
      raise exception 'inactive recipient can read notifications';
    end if;
    execute 'reset role';
  end loop;
  if (select count(distinct role) from public.profiles where role in ('parent','coach') and is_active and status='active') <> 2 then
    raise exception 'active parent and coach test profiles required';
  end if;
  select id into strict subject_id from public.profiles where role='admin' and is_active and status='active' limit 1;
  perform set_config('request.jwt.claim.sub', subject_id::text, true);
  update public.profiles set status='suspended' where id=subject_id;
  execute 'set local role authenticated';
  if exists(select 1 from public.notifications) then raise exception 'suspended staff can read notifications'; end if;
  begin
    perform public.queue_parent_message(linked_parent, 'in_app', 'Test', 'Blocked', gen_random_uuid()::text);
    raise exception 'suspended staff can queue';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.parents(full_name, phone) values('Retention parent', '9876543210') returning id into linked_parent;
  insert into public.notifications(parent_id, channel, recipient, body)
    values(linked_parent, 'email', 'retained@fixture.test', 'Retained parent notice') returning id into kept_notice;
  delete from public.parents where id=linked_parent;
  if not exists(select 1 from public.notifications where id=kept_notice and parent_id is null) then
    raise exception 'parent deletion removed notification history';
  end if;
end;
$$;
rollback;
