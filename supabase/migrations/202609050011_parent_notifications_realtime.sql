alter table public.notifications add column if not exists read_at timestamptz;

create index if not exists notifications_parent_unread_idx
  on public.notifications(parent_id, created_at desc) where read_at is null;

create or replace function public.parent_mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.notifications n set read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id and exists (
    select 1 from public.parents p where p.id = n.parent_id and p.profile_id = auth.uid()
  );
  if not found then raise exception 'Notification not found.' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.parent_mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare updated_count integer;
begin
  update public.notifications n set read_at = now()
  where n.read_at is null and exists (
    select 1 from public.parents p where p.id = n.parent_id and p.profile_id = auth.uid()
  );
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.parent_mark_notification_read(uuid) from public;
revoke all on function public.parent_mark_all_notifications_read() from public;
grant execute on function public.parent_mark_notification_read(uuid) to authenticated;
grant execute on function public.parent_mark_all_notifications_read() to authenticated;

create or replace function public.notify_parents_of_attendance()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  student_name text;
  parent_row record;
  event_key text;
  event_subject text;
  event_body text;
begin
  if tg_op = 'INSERT' and new.check_in_at is not null then
    event_key := 'attendance_check_in'; event_subject := 'Student checked in';
    select s.full_name into student_name from public.students s where s.id = new.student_id;
    event_body := student_name || ' checked in at ' || to_char(new.check_in_at at time zone 'Asia/Kolkata', 'HH12:MI AM') || '.';
  elsif tg_op = 'UPDATE' and old.check_out_at is null and new.check_out_at is not null then
    event_key := 'attendance_check_out'; event_subject := 'Student checked out';
    select s.full_name into student_name from public.students s where s.id = new.student_id;
    event_body := student_name || ' checked out at ' || to_char(new.check_out_at at time zone 'Asia/Kolkata', 'HH12:MI AM') || '.';
  else return new;
  end if;

  for parent_row in
    select p.id, coalesce(nullif(p.email, ''), nullif(p.phone, ''), p.id::text) recipient
    from public.student_parents sp join public.parents p on p.id = sp.parent_id
    where sp.student_id = new.student_id and p.status = 'active'
  loop
    insert into public.notifications(student_id,parent_id,channel,template_key,recipient,subject,body,status,sent_at)
    values(new.student_id,parent_row.id,'in_app',event_key,parent_row.recipient,event_subject,event_body,'sent',now());
  end loop;
  return new;
end;
$$;

drop trigger if exists attendance_parent_notification on public.attendance_records;
create trigger attendance_parent_notification after insert or update of check_out_at
on public.attendance_records for each row execute function public.notify_parents_of_attendance();
