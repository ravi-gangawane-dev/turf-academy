-- Run as postgres on a disposable/staging database after 202610220002.
-- Requires active admin and receptionist test profiles. All fixtures roll back.
begin;

do $$
declare
  actor record;
  recipient_id uuid;
  coach_id uuid;
  notice_id uuid;
  orphan_id uuid;
  queued_id uuid;
  claimed public.notifications;
  ref text := 'notification-integrity-' || gen_random_uuid()::text;
  staff_count integer := 0;
begin
  if has_table_privilege('authenticated', 'public.notifications', 'INSERT')
    or has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
    or has_table_privilege('authenticated', 'public.notifications', 'DELETE')
    or has_any_column_privilege('authenticated', 'public.notifications', 'UPDATE') then
    raise exception 'authenticated can mutate delivery evidence directly';
  end if;
  if has_function_privilege('authenticated', 'public.claim_notification(uuid)', 'EXECUTE') then
    raise exception 'authenticated can claim deliveries';
  end if;

  update public.academy_settings set notification_channels = array['in_app', 'whatsapp'];
  insert into public.parents(full_name, phone, whatsapp, communication_preferences)
    values ('Notification integrity fixture', '9876543210', '9876543210', '{"whatsapp":false}')
    returning id into recipient_id;
  insert into public.notifications(parent_id, channel, recipient, body, client_reference)
    values (recipient_id, 'whatsapp', '9876543210', 'Fixture only', ref || ':queued')
    returning id into queued_id;

  for actor in
    select distinct on (role) id, role from public.profiles
    where role in ('admin', 'receptionist') and is_active and status = 'active'
    order by role, id
  loop
    staff_count := staff_count + 1;
    perform set_config('request.jwt.claim.sub', actor.id::text, true);
    execute 'set local role authenticated';
    begin
      update public.notifications set status = 'delivered' where id = queued_id;
      raise exception 'staff direct update unexpectedly allowed';
    exception when insufficient_privilege then null; end;
    begin
      delete from public.notifications where id = queued_id;
      raise exception 'staff direct delete unexpectedly allowed';
    exception when insufficient_privilege then null; end;
    begin
      insert into public.notifications(channel, recipient, body, status)
        values ('whatsapp', '9876543210', 'Forged evidence', 'delivered');
      raise exception 'staff direct insert unexpectedly allowed';
    exception when insufficient_privilege then null; end;

    notice_id := public.queue_parent_message(recipient_id, 'in_app', 'Test', 'Published fixture', ref || ':' || actor.role);
    if not exists(select 1 from public.notifications where id = notice_id and status = 'sent' and sent_at is not null) then
      raise exception 'in-app record not published through trusted helper';
    end if;
    if public.queue_parent_message(recipient_id, 'in_app', 'Test', 'Published fixture', ref || ':' || actor.role) <> notice_id then
      raise exception 'idempotent queue duplicated record';
    end if;
    begin
      perform public.queue_parent_message(recipient_id, 'whatsapp', 'Test', 'Opt-out fixture', ref || ':optout:' || actor.role);
      raise exception 'opt-out ignored';
    exception when others then
      if sqlerrm <> 'recipient_channel_disabled' then raise; end if;
    end;
    execute 'reset role';
  end loop;
  if staff_count <> 2 then raise exception 'active admin and receptionist fixtures required'; end if;

  -- No staff identity can impersonate service_role through the claim RPC grant.
  -- Below, postgres exercises atomic eligibility without calling an external provider.
  select * into claimed from public.claim_notification(queued_id);
  if found then raise exception 'opted-out recipient was claimed'; end if;
  update public.parents set communication_preferences = '{"whatsapp":true}' where id = recipient_id;
  update public.notifications set scheduled_at = now() + interval '1 day' where id = queued_id;
  select * into claimed from public.claim_notification(queued_id);
  if found then raise exception 'future delivery claimed early'; end if;
  update public.notifications set scheduled_at = now(), provider_message_id = 'already-accepted' where id = queued_id;
  select * into claimed from public.claim_notification(queued_id);
  if found then raise exception 'provider-accepted record reclaimed'; end if;
  update public.notifications set provider_message_id = null, delivery_uncertain = true where id = queued_id;
  select * into claimed from public.claim_notification(queued_id);
  if found then raise exception 'uncertain record reclaimed'; end if;
  update public.notifications set delivery_uncertain = false where id = queued_id;
  execute 'set local role service_role';
  select * into strict claimed from public.claim_notification(queued_id);
  if claimed.status <> 'sending' or claimed.retry_count <> 1 or claimed.delivery_claimed_at is null then
    raise exception 'claim did not establish processing evidence';
  end if;
  select * into claimed from public.claim_notification(queued_id);
  if found then raise exception 'duplicate claim succeeded'; end if;
  execute 'reset role';

  insert into public.coaches(employee_code, full_name, phone)
    values (ref, 'Retention fixture', '9876543210') returning id into coach_id;
  insert into public.notifications(coach_id, channel, recipient, body)
    values (coach_id, 'whatsapp', '9876543210', 'Retained coach message') returning id into orphan_id;
  delete from public.coaches where id = coach_id;
  if not exists(select 1 from public.notifications where id = orphan_id and notifications.coach_id is null) then
    raise exception 'coach deletion erased history';
  end if;
  select * into claimed from public.claim_notification(orphan_id);
  if found then raise exception 'deleted recipient message claimed'; end if;
end;
$$;

rollback;
