-- Run as postgres on disposable/staging DB after 202610230001. Rolls back.
begin;
do $$
declare
  notice uuid;
  staff uuid;
  event_count integer;
begin
  select id into strict staff from public.profiles
    where role = 'admin' and is_active and status = 'active' limit 1;
  perform set_config('request.jwt.claim.sub', staff::text, true);
  insert into public.notifications(channel, recipient, body)
    values ('in_app', 'timeline-fixture', 'Fixture only') returning id into notice;
  update public.notifications set updated_at = now() where id = notice;
  if (select count(*) from public.notification_events where notification_id = notice) <> 1 then
    raise exception 'creation must record once; unrelated updates must not create evidence';
  end if;
  update public.notifications set status = 'sending', retry_count = 1 where id = notice;
  update public.notifications set status = 'failed', failure_reason = 'Fixture failure',
    delivery_uncertain = true where id = notice;
  update public.notifications set read_at = now() where id = notice;
  select count(*) into event_count from public.notification_events where notification_id = notice;
  if event_count <> 4 then raise exception 'missing transitions'; end if;
  if not exists (select 1 from public.notification_events where notification_id = notice
    and event_type = 'delivery_changed' and actor_id = staff
    and evidence #>> '{before,status}' = 'sending'
    and evidence #>> '{after,status}' = 'failed'
    and evidence #>> '{after,delivery_uncertain}' = 'true') then
    raise exception 'before/after evidence or actor missing';
  end if;
  if not exists(select 1 from public.notification_events where notification_id = notice and event_type = 'read') then
    raise exception 'read must remain distinct';
  end if;
  if has_table_privilege('authenticated', 'public.notification_events', 'INSERT')
    or has_table_privilege('authenticated', 'public.notification_events', 'UPDATE')
    or has_table_privilege('authenticated', 'public.notification_events', 'DELETE')
    or has_table_privilege('service_role', 'public.notification_events', 'INSERT')
    or has_table_privilege('service_role', 'public.notification_events', 'UPDATE')
    or has_table_privilege('service_role', 'public.notification_events', 'DELETE') then
    raise exception 'history permits direct mutations';
  end if;
  execute 'set local role authenticated';
  if (select count(*) from public.notification_events where notification_id = notice) <> 4 then
    raise exception 'active staff cannot read history';
  end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  if exists(select 1 from public.notification_events where notification_id = notice) then
    raise exception 'unknown identity can read staff history';
  end if;
  execute 'reset role';
  delete from public.notifications where id = notice;
  if (select count(*) from public.notification_events where notification_id = notice) <> 4 then
    raise exception 'history was lost after notification deletion';
  end if;
end;
$$;
rollback;
