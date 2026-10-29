begin;
alter table public.notifications add column client_reference text unique;
alter table public.notifications add column delivery_claimed_at timestamptz;
alter table public.notifications add column delivery_uncertain boolean not null default false;

create function public.queue_parent_message(p_parent_id uuid,p_channel text,p_subject text,p_body text,p_reference text)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.parents; n public.notifications; target text;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 if nullif(trim(p_reference),'') is null or nullif(trim(p_subject),'') is null or length(p_subject)>120 or nullif(trim(p_body),'') is null or length(p_body)>1600 then raise exception 'invalid_message'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,2));
 select * into n from public.notifications where client_reference=p_reference;
 if found then
  if n.parent_id is distinct from p_parent_id or n.channel<>p_channel or n.subject<>trim(p_subject) or n.body<>trim(p_body) then raise exception 'message_reference_conflict';end if;return n.id;
 end if;
 if not exists(select 1 from public.academy_settings where id and p_channel=any(notification_channels)) then raise exception 'notification_channel_disabled'; end if;
 select * into strict p from public.parents where id=p_parent_id and status='active';
 target:=case p_channel when 'email' then p.email when 'sms' then p.phone when 'whatsapp' then coalesce(nullif(p.whatsapp,''),p.phone) when 'in_app' then p.id::text end;
 if nullif(trim(target),'') is null then raise exception 'recipient_contact_missing'; end if;
 insert into public.notifications(parent_id,channel,template_key,recipient,subject,body,status,created_by,client_reference)
 values(p_parent_id,p_channel,'staff_message',target,trim(p_subject),trim(p_body),'queued',auth.uid(),p_reference) returning id into n.id;
 return n.id;
end $$;

-- Claims prevent concurrent workers sending the same notification. Only the
-- service role may claim; uncertain outcomes deliberately require reconciliation.
create function public.claim_notification(p_id uuid) returns setof public.notifications
language sql security definer set search_path='' as $$
 update public.notifications n set delivery_claimed_at=now(),failure_reason=null,retry_count=retry_count+1
 where n.id=p_id and n.status in ('queued','failed') and n.channel<>'in_app' and n.delivery_claimed_at is null and not n.delivery_uncertain
 and exists(select 1 from public.academy_settings where id and n.channel=any(notification_channels))
 returning n.*;
$$;
revoke all on function public.claim_notification(uuid) from public,anon,authenticated;
grant execute on function public.claim_notification(uuid) to service_role;
revoke all on function public.queue_parent_message(uuid,text,text,text,text) from public,anon;
grant execute on function public.queue_parent_message(uuid,text,text,text,text) to authenticated;
commit;
