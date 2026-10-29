-- Run as postgres on disposable/staging DB after 202610230003. Fixtures roll back.
begin;
do $$
declare
  staff uuid;
  recipient_id uuid;
  notice_id uuid;
  blocked_id uuid;
  snapshot public.notifications;
  history_count integer;
begin
  select id into strict staff from public.profiles
    where role = 'admin' and is_active and status = 'active' limit 1;
  perform set_config('request.jwt.claim.sub', staff::text, true);
  update public.academy_settings set notification_channels = array['in_app', 'whatsapp'];
  insert into public.parents(full_name, phone, whatsapp)
    values ('Manual fixture', '9876543210', '9876543210') returning id into recipient_id;
  insert into public.notifications(parent_id, channel, recipient, body)
    values (recipient_id, 'whatsapp', '9876543210', 'Fixture only') returning id into notice_id;
  insert into public.notifications(parent_id, channel, recipient, body, delivery_uncertain)
    values (recipient_id, 'whatsapp', '9876543210', 'Uncertain fixture', true) returning id into blocked_id;
  execute 'set local role authenticated';
  begin
    perform public.record_manual_whatsapp(blocked_id, 'request');
    raise exception 'uncertain provider outcome allowed manual send';
  exception when raise_exception then
    if sqlerrm <> 'manual_send_not_eligible' then raise; end if;
  end;
  snapshot := public.record_manual_whatsapp(notice_id, 'request');
  perform public.record_manual_whatsapp(notice_id, 'request');
  if snapshot.manual_state <> 'launch_requested' or snapshot.manual_actor_id <> staff
    or snapshot.status <> 'queued' or snapshot.sent_at is not null or snapshot.provider_message_id is not null then
    raise exception 'manual request changed provider evidence or lost actor';
  end if;
  execute 'reset role';
  if exists(select 1 from public.claim_notification(notice_id)) then
    raise exception 'provider claimed a manual request';
  end if;
  execute 'set local role authenticated';
  snapshot := public.record_manual_whatsapp(notice_id, 'confirm');
  perform public.record_manual_whatsapp(notice_id, 'confirm');
  if snapshot.manual_state <> 'confirmed_sent' or snapshot.status <> 'queued' or snapshot.sent_at is not null then
    raise exception 'staff confirmation asserted provider delivery';
  end if;
  select count(*) into history_count from public.notification_events
    where notification_id = notice_id and event_type = 'manual_changed' and actor_id = staff;
  if history_count <> 2 then raise exception 'manual history missing or duplicate transitions'; end if;
  begin
    perform public.record_manual_whatsapp(notice_id, 'cancel');
    raise exception 'terminal manual confirmation was changed';
  exception when raise_exception then
    if sqlerrm <> 'invalid_manual_transition' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    perform public.record_manual_whatsapp(notice_id, 'confirm');
    raise exception 'nonstaff manual mutation allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', staff::text, true);
  update public.notifications set delivery_uncertain = false where id = blocked_id;
  update public.parents set communication_preferences = '{"whatsapp":false}' where id = recipient_id;
  begin
    perform public.record_manual_whatsapp(blocked_id, 'request');
    raise exception 'manual request ignored opt-out';
  exception when raise_exception then
    if sqlerrm <> 'recipient_or_channel_disabled' then raise; end if;
  end;
  update public.parents set communication_preferences = '{"whatsapp":true}' where id = recipient_id;
  perform public.record_manual_whatsapp(blocked_id, 'request');
  snapshot := public.record_manual_whatsapp(blocked_id, 'cancel');
  if snapshot.manual_state <> 'cancelled' or exists(select 1 from public.claim_notification(blocked_id)) then
    raise exception 'cancellation permitted unsafe provider retry';
  end if;
end;
$$;
rollback;
