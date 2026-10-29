begin;
-- Snapshots deliberately have no cascading FK. Do not infer old enrollment history.
alter table public.notifications add column source_batch_id uuid, add column source_batch_name text;
create index notifications_source_batch_created_idx on public.notifications(source_batch_id, created_at desc);

create function public.capture_notification_batch() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parts text[]; source_id uuid; target_batch uuid;
begin
  new.source_batch_id := null; new.source_batch_name := null;
  parts := string_to_array(new.client_reference, ':');
  if parts[1] = 'attendance' and parts[2] ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    source_id := parts[2]::uuid;
    select batch_id into target_batch from public.attendance_records where id=source_id and student_id=new.student_id;
  elsif parts[1] = 'automation' and parts[2] = 'fee_due_today'
    and parts[3] ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    source_id := parts[3]::uuid;
    select e.batch_id into target_batch from public.monthly_charges c join public.enrollments e on e.id=c.enrollment_id
      where c.id=source_id and c.student_id=new.student_id;
  elsif parts[1] = 'automation' and parts[2] = 'attendance_missed_three_days'
    and parts[3] = new.student_id::text
    and parts[4] ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    target_batch := parts[4]::uuid;
  end if;
  select id, name into new.source_batch_id, new.source_batch_name from public.batches where id=target_batch;
  return new;
end;
$$;
revoke all on function public.capture_notification_batch() from public, anon, authenticated, service_role;
create trigger capture_notification_batch before insert on public.notifications
  for each row execute function public.capture_notification_batch();

create function public.notification_filter_options(p_kind text, p_search text default '', p_selected text default '')
returns table(value text, label text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  if p_kind is null or p_kind not in ('student','recipient','batch') then raise exception 'invalid_filter_kind'; end if;
  return query
    with candidates as (
      select s.id::text v, s.full_name || ' · Born ' || to_char(s.date_of_birth,'DD Mon YYYY') l from public.students s where p_kind='student'
      union all
      select 'parent:' || p.id::text, p.full_name || ' · Parent · ' || coalesce(p.phone,'') from public.parents p where p_kind='recipient'
      union all
      select 'coach:' || c.id::text, c.full_name || ' · Coach · ' || coalesce(c.phone,'') from public.coaches c where p_kind='recipient'
      union all
      select b.id::text, b.name || ' · ' || b.code from public.batches b where p_kind='batch'
      union all
      select n.source_batch_id::text, coalesce((array_agg(n.source_batch_name order by n.created_at desc, n.id desc))[1],'Removed batch') || ' · Historical'
        from public.notifications n where p_kind='batch' and n.source_batch_id is not null
          and not exists(select 1 from public.batches b where b.id=n.source_batch_id)
        group by n.source_batch_id
    )
    select v, l from candidates where v=p_selected or position(lower(left(trim(coalesce(p_search,'')),200)) in lower(l)) > 0
    order by (v=p_selected) desc, l, v limit 30;
end;
$$;
revoke all on function public.notification_filter_options(text,text,text) from public, anon;
grant execute on function public.notification_filter_options(text,text,text) to authenticated;
commit;
