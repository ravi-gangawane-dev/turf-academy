-- Future delivery evidence only: do not fabricate historical attempts.
begin;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  -- Keep history even if a trusted maintenance operation removes the notice.
  notification_id uuid not null,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid,
  event_type text not null check (event_type in ('created', 'delivery_changed', 'read')),
  evidence jsonb not null
);
create index notification_events_timeline_idx
  on public.notification_events(notification_id, occurred_at desc, id desc);
alter table public.notification_events enable row level security;
create policy notification_events_staff_read on public.notification_events
  for select to authenticated using (public.is_admin_or_receptionist());
revoke all on public.notification_events from public, anon, authenticated, service_role;
grant select on public.notification_events to authenticated, service_role;

create function public.capture_notification_event() returns trigger
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
    'sent_at', new.sent_at, 'read_at', new.read_at);
  if tg_op = 'INSERT' then
    event_kind := 'created';
  else
    previous := jsonb_build_object(
      'status', old.status, 'provider_message_id', old.provider_message_id,
      'retry_count', old.retry_count, 'failure_reason', old.failure_reason,
      'delivery_uncertain', old.delivery_uncertain,
      'delivery_claimed_at', old.delivery_claimed_at,
      'sent_at', old.sent_at, 'read_at', old.read_at);
    if previous = current_evidence then return new; end if;
    event_kind := case when previous - 'read_at' = current_evidence - 'read_at'
      then 'read' else 'delivery_changed' end;
  end if;
  insert into public.notification_events(notification_id, actor_id, event_type, evidence)
    values (new.id, auth.uid(), event_kind,
      jsonb_build_object('before', previous, 'after', current_evidence));
  return new;
end;
$$;
revoke all on function public.capture_notification_event() from public, anon, authenticated, service_role;
create trigger notification_delivery_history after insert or update on public.notifications
  for each row execute function public.capture_notification_event();

comment on table public.notification_events is
  'Append-only future evidence. Null actor means no end-user identity was available. No historical backfill.';
commit;
