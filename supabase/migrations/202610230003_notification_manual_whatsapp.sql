begin;
alter table public.notifications
  add column manual_state text check (manual_state in ('launch_requested', 'confirmed_sent', 'cancelled')),
  add column manual_updated_at timestamptz,
  add column manual_actor_id uuid;

-- Manual evidence never changes provider status, provider IDs, or sent_at.
create function public.record_manual_whatsapp(p_id uuid, p_action text)
returns public.notifications
language plpgsql security definer set search_path = '' as $$
declare
  notice public.notifications;
  next_state text;
begin
  if not public.is_admin_or_receptionist() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('request', 'confirm', 'cancel') then
    raise exception 'invalid_manual_action';
  end if;
  select * into strict notice from public.notifications where id = p_id for update;
  if notice.channel <> 'whatsapp' then raise exception 'manual_whatsapp_only'; end if;
  next_state := case p_action when 'request' then 'launch_requested'
    when 'confirm' then 'confirmed_sent' else 'cancelled' end;
  if p_action = 'request' then
    if notice.manual_state in ('confirmed_sent', 'cancelled')
      or notice.status not in ('queued', 'failed') or notice.provider_message_id is not null
      or notice.delivery_claimed_at is not null or notice.delivery_uncertain
      or notice.scheduled_at > now() then raise exception 'manual_send_not_eligible'; end if;
    if not exists(select 1 from public.academy_settings where id and 'whatsapp' = any(notification_channels))
      or not (
        exists(select 1 from public.parents p where p.id = notice.parent_id and p.status = 'active'
          and coalesce(p.communication_preferences ->> 'whatsapp', 'true') <> 'false')
        or (notice.parent_id is null and exists(select 1 from public.coaches c
          where c.id = notice.coach_id and c.status = 'active'))
      ) then raise exception 'recipient_or_channel_disabled'; end if;
    if nullif(trim(notice.recipient), '') is null then raise exception 'recipient_contact_missing'; end if;
  elsif notice.manual_state is distinct from next_state
    and notice.manual_state is distinct from 'launch_requested' then
    raise exception 'invalid_manual_transition';
  end if;
  -- Repeated requests/confirmations are idempotent, including duplicate tabs.
  if notice.manual_state = next_state then return notice; end if;
  update public.notifications set manual_state = next_state,
    manual_updated_at = clock_timestamp(), manual_actor_id = auth.uid()
    where id = p_id returning * into notice;
  return notice;
end;
$$;
revoke all on function public.record_manual_whatsapp(uuid, text) from public, anon;
grant execute on function public.record_manual_whatsapp(uuid, text) to authenticated;

-- Claim and manual request both lock the same notification row. Once a manual
-- request exists, even cancellation cannot prove that a message was not sent.


create or replace function public.claim_notification(p_id uuid)
returns setof public.notifications
language sql security definer set search_path = '' as $$
  update public.notifications n
  set status = 'sending', delivery_claimed_at = now(), failure_reason = null,
    retry_count = retry_count + 1
  where n.id = p_id and n.status in ('queued', 'failed')
    and n.manual_state is null and n.channel <> 'in_app' and n.provider_message_id is null
    and n.scheduled_at <= now()
    and n.delivery_claimed_at is null and not n.delivery_uncertain
    and exists (
      select 1 from public.academy_settings where id and n.channel = any(notification_channels)
    )
    -- A deleted/inactive recipient must not receive retained historical messages.
    and (
      exists (
        select 1 from public.parents p where p.id = n.parent_id and p.status = 'active'
          and coalesce(p.communication_preferences ->> n.channel, 'true') <> 'false'
      )
      or (n.parent_id is null and exists (
        select 1 from public.coaches c where c.id = n.coach_id and c.status = 'active'
      ))
    )
  returning n.*;
$$;
alter table public.notification_events drop constraint notification_events_event_type_check;
alter table public.notification_events add constraint notification_events_event_type_check check (event_type in ('created', 'delivery_changed', 'read', 'manual_changed'));
create or replace function public.capture_notification_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous jsonb;
  current_evidence jsonb;
  event_kind text;
begin
  current_evidence := jsonb_build_object(
    'status', new.status, 'provider_message_id', new.provider_message_id,
    'retry_count', new.retry_count, 'failure_reason', new.failure_reason,
    'delivery_uncertain', new.delivery_uncertain,
    'delivery_claimed_at', new.delivery_claimed_at,
    'sent_at', new.sent_at, 'read_at', new.read_at, 'manual_state', new.manual_state, 'manual_updated_at', new.manual_updated_at, 'manual_actor_id', new.manual_actor_id);
  if tg_op = 'INSERT' then
    event_kind := 'created';
  else
    previous := jsonb_build_object(
      'status', old.status, 'provider_message_id', old.provider_message_id,
      'retry_count', old.retry_count, 'failure_reason', old.failure_reason,
      'delivery_uncertain', old.delivery_uncertain,
      'delivery_claimed_at', old.delivery_claimed_at,
      'sent_at', old.sent_at, 'read_at', old.read_at, 'manual_state', old.manual_state, 'manual_updated_at', old.manual_updated_at, 'manual_actor_id', old.manual_actor_id);
    if previous = current_evidence then return new; end if;
    event_kind := case when old.manual_state is distinct from new.manual_state then 'manual_changed' when previous - 'read_at' = current_evidence - 'read_at'
      then 'read' else 'delivery_changed' end;
  end if;
  insert into public.notification_events(notification_id, actor_id, event_type, evidence)
    values (new.id, auth.uid(), event_kind,
      jsonb_build_object('before', previous, 'after', current_evidence));
  return new;
end;
$$;
commit;
