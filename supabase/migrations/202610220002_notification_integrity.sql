-- Phase 1: preserve history and put delivery evidence behind trusted operations.
-- Rehearse on staging and verify backup/restore before applying in production.
begin;

-- Staff still read through notifications_scoped_read. Parent/coach read RPCs and
-- queue helpers are SECURITY DEFINER; provider updates use service_role.
drop policy if exists notifications_staff_write on public.notifications;
revoke insert, update, delete, truncate, references, trigger
  on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;

alter table public.notifications
  drop constraint notifications_coach_id_fkey,
  add constraint notifications_coach_id_fkey
    foreign key (coach_id) references public.coaches(id) on delete set null;

create or replace function public.queue_parent_message(
  p_parent_id uuid, p_channel text, p_subject text, p_body text, p_reference text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  recipient_parent public.parents;
  existing public.notifications;
  target text;
  notification_id uuid;
begin
  if not public.is_admin_or_receptionist() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_channel is null or p_channel not in ('in_app', 'email', 'sms', 'whatsapp')
    or nullif(trim(p_reference), '') is null
    or nullif(trim(p_subject), '') is null or length(p_subject) > 120
    or nullif(trim(p_body), '') is null or length(p_body) > 1600 then
    raise exception 'invalid_message';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_reference, 2));
  select * into existing from public.notifications where client_reference = p_reference;
  if found then
    if existing.parent_id is distinct from p_parent_id or existing.channel <> p_channel
      or existing.subject <> trim(p_subject) or existing.body <> trim(p_body) then
      raise exception 'message_reference_conflict';
    end if;
    return existing.id;
  end if;
  if not exists (
    select 1 from public.academy_settings where id and p_channel = any(notification_channels)
  ) then raise exception 'notification_channel_disabled'; end if;

  select * into strict recipient_parent from public.parents
    where id = p_parent_id and status = 'active';
  if p_channel <> 'in_app'
    and recipient_parent.communication_preferences ->> p_channel = 'false' then
    raise exception 'recipient_channel_disabled';
  end if;
  target := case p_channel
    when 'email' then recipient_parent.email
    when 'sms' then recipient_parent.phone
    when 'whatsapp' then coalesce(nullif(trim(recipient_parent.whatsapp), ''), recipient_parent.phone)
    when 'in_app' then recipient_parent.id::text end;
  if nullif(trim(target), '') is null then raise exception 'recipient_contact_missing'; end if;

  insert into public.notifications(
    parent_id, channel, template_key, recipient, subject, body, status,
    sent_at, created_by, client_reference
  ) values (
    p_parent_id, p_channel, 'staff_message', trim(target), trim(p_subject), trim(p_body),
    case when p_channel = 'in_app' then 'sent'::public.delivery_status else 'queued'::public.delivery_status end,
    case when p_channel = 'in_app' then now() else null end, auth.uid(), p_reference
  ) returning id into notification_id;
  return notification_id;
end;
$$;

create or replace function public.claim_notification(p_id uuid)
returns setof public.notifications
language sql security definer set search_path = '' as $$
  update public.notifications n
  set status = 'sending', delivery_claimed_at = now(), failure_reason = null,
    retry_count = retry_count + 1
  where n.id = p_id and n.status in ('queued', 'failed')
    and n.channel <> 'in_app' and n.provider_message_id is null
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

revoke all on function public.claim_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_notification(uuid) to service_role;
revoke all on function public.queue_parent_message(uuid, text, text, text, text) from public, anon;
grant execute on function public.queue_parent_message(uuid, text, text, text, text) to authenticated;

commit;
