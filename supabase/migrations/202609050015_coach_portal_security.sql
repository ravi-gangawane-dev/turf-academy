begin;

alter table public.attendance_records add column if not exists remarks text;
alter table public.notifications add column if not exists coach_id uuid references public.coaches(id) on delete cascade;
create index if not exists notifications_coach_created_idx on public.notifications(coach_id,created_at desc);

create or replace function public.coach_has_batch(target_batch uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_user_role()='coach' and exists(
    select 1 from public.batch_coaches bc join public.coaches c on c.id=bc.coach_id
    where bc.batch_id=target_batch and c.profile_id=auth.uid() and c.status='active'
  )
$$;
create or replace function public.coach_has_student(target_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_user_role()='coach' and exists(
    select 1 from public.enrollments e join public.batch_coaches bc on bc.batch_id=e.batch_id
    join public.coaches c on c.id=bc.coach_id
    where e.student_id=target_student and e.status='active'
      and c.profile_id=auth.uid() and c.status='active'
  )
$$;

drop policy if exists batches_read on public.batches;
create policy batches_scoped_read on public.batches for select using (
  public.is_admin_or_receptionist() or public.coach_has_batch(id) or
  (public.current_user_role()='parent' and exists(
    select 1 from public.enrollments e where e.batch_id=batches.id
      and e.status in ('active','paused') and public.parent_owns_student(e.student_id)
  ))
);
drop policy if exists batch_days_read on public.batch_days;
create policy batch_days_scoped_read on public.batch_days for select using (
  public.is_admin_or_receptionist() or public.coach_has_batch(batch_id) or
  exists(select 1 from public.enrollments e where e.batch_id=batch_days.batch_id
    and e.status in ('active','paused') and public.parent_owns_student(e.student_id))
);
drop policy if exists batch_coaches_read on public.batch_coaches;
create policy batch_coaches_scoped_read on public.batch_coaches for select using (
  public.is_admin_or_receptionist() or public.coach_has_batch(batch_id) or
  exists(select 1 from public.enrollments e where e.batch_id=batch_coaches.batch_id
    and e.status in ('active','paused') and public.parent_owns_student(e.student_id))
);
drop policy if exists coaches_read on public.coaches;
create policy coaches_scoped_read on public.coaches for select using (
  public.is_admin_or_receptionist() or profile_id=auth.uid() or exists(
    select 1 from public.batch_coaches requested
    join public.batch_coaches own_link on own_link.batch_id=requested.batch_id
    join public.coaches own_coach on own_coach.id=own_link.coach_id
    where requested.coach_id=coaches.id and own_coach.profile_id=auth.uid()
  )
);
drop policy if exists coach_specs_read on public.coach_specializations;
create policy coach_specs_scoped_read on public.coach_specializations for select using (
  public.is_admin_or_receptionist() or exists(
    select 1 from public.coaches c where c.id=coach_specializations.coach_id
      and (c.profile_id=auth.uid() or exists(
        select 1 from public.batch_coaches requested
        join public.batch_coaches own_link on own_link.batch_id=requested.batch_id
        join public.coaches own_coach on own_coach.id=own_link.coach_id
        where requested.coach_id=c.id and own_coach.profile_id=auth.uid()
      ))
  )
);
drop policy if exists training_sessions_staff_read on public.training_sessions;
create policy training_sessions_staff_scoped_read on public.training_sessions for select using (
  public.is_admin_or_receptionist() or public.coach_has_batch(batch_id)
);
drop policy if exists notifications_read on public.notifications;
create policy notifications_scoped_read on public.notifications for select using (
  public.is_admin_or_receptionist() or
  exists(select 1 from public.coaches c where c.id=notifications.coach_id and c.profile_id=auth.uid()) or
  exists(select 1 from public.parents p where p.id=notifications.parent_id and p.profile_id=auth.uid())
);
drop policy if exists qr_profiles_read on public.qr_profiles;
create policy qr_profiles_scoped_read on public.qr_profiles for select using (
  public.is_admin_or_receptionist() or public.coach_has_student(student_id) or public.parent_owns_student(student_id)
);

drop policy if exists attendance_staff_write on public.attendance_records;
create policy attendance_admin_write on public.attendance_records for all
using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());

create or replace function public.coach_check_in_student(
  p_student_id uuid,p_batch_id uuid,p_attendance_date date default current_date,
  p_check_in_at timestamptz default now(),p_status public.attendance_status default 'present',
  p_remarks text default null,p_source text default 'manual'
) returns public.attendance_records language plpgsql security definer set search_path='' as $$
declare result public.attendance_records;
begin
  if public.current_user_role()<>'coach' or not public.coach_has_batch(p_batch_id) then
    raise exception 'coach_batch_access_denied' using errcode='42501';
  end if;
  if not exists(select 1 from public.enrollments e where e.student_id=p_student_id
    and e.batch_id=p_batch_id and e.status='active') then
    raise exception 'student_not_actively_enrolled' using errcode='42501';
  end if;
  if exists(select 1 from public.attendance_records a where a.student_id=p_student_id
    and a.batch_id=p_batch_id and a.attendance_date=p_attendance_date) then
    raise exception 'attendance_already_recorded';
  end if;
  if p_status='absent' then p_check_in_at:=null; end if;
  insert into public.attendance_records(student_id,batch_id,attendance_date,check_in_at,status,source,remarks,recorded_by)
  values(p_student_id,p_batch_id,p_attendance_date,p_check_in_at,p_status,p_source,p_remarks,auth.uid())
  returning * into result;
  return result;
end $$;

create or replace function public.coach_mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.notifications n set read_at=coalesce(n.read_at,now())
  where n.id=p_notification_id and exists(
    select 1 from public.coaches c where c.id=n.coach_id
      and c.profile_id=auth.uid() and c.status='active'
  );
  if not found then raise exception 'coach_notification_not_found' using errcode='42501'; end if;
end $$;

create or replace function public.coach_check_out_student(
  p_attendance_id uuid,p_check_out_at timestamptz default now(),p_remarks text default null
) returns public.attendance_records language plpgsql security definer set search_path='' as $$
declare result public.attendance_records;
begin
  select * into result from public.attendance_records where id=p_attendance_id for update;
  if result.id is null then raise exception 'attendance_not_found'; end if;
  if public.current_user_role()<>'coach' or not public.coach_has_batch(result.batch_id) then
    raise exception 'coach_batch_access_denied' using errcode='42501';
  end if;
  if result.check_in_at is null then raise exception 'open_check_in_required'; end if;
  if result.check_out_at is not null then raise exception 'student_already_checked_out'; end if;
  if p_check_out_at<result.check_in_at then raise exception 'checkout_before_checkin'; end if;
  update public.attendance_records set check_out_at=p_check_out_at,status='checked_out',
    remarks=coalesce(p_remarks,remarks),updated_at=now() where id=p_attendance_id returning * into result;
  return result;
end $$;

create or replace function public.coach_update_own_profile(p_phone text,p_photo_path text default null)
returns public.coaches language plpgsql security definer set search_path='' as $$
declare result public.coaches;
begin
  if public.current_user_role()<>'coach' then raise exception 'coach_access_required' using errcode='42501'; end if;
  if length(regexp_replace(coalesce(p_phone,''),'\D','','g'))<10 then raise exception 'invalid_phone'; end if;
  update public.coaches set phone=p_phone,photo_path=coalesce(p_photo_path,photo_path),updated_at=now()
  where profile_id=auth.uid() and status='active' returning * into result;
  if result.id is null then raise exception 'coach_profile_not_found'; end if;
  return result;
end $$;

revoke all on function public.coach_check_in_student(uuid,uuid,date,timestamptz,public.attendance_status,text,text) from public;
revoke all on function public.coach_check_out_student(uuid,timestamptz,text) from public;
revoke all on function public.coach_update_own_profile(text,text) from public;
revoke all on function public.coach_mark_notification_read(uuid) from public;
grant execute on function public.coach_check_in_student(uuid,uuid,date,timestamptz,public.attendance_status,text,text) to authenticated;
grant execute on function public.coach_check_out_student(uuid,timestamptz,text) to authenticated;
grant execute on function public.coach_update_own_profile(text,text) to authenticated;
grant execute on function public.coach_mark_notification_read(uuid) to authenticated;

insert into public.notifications(coach_id,channel,template_key,recipient,subject,body,status,sent_at)
select c.id,'in_app',n.key,coalesce(c.email,c.phone),n.subject,n.body,'delivered',n.sent_at
from public.coaches c cross join (values
  ('batch_assignment','Batch assignment','You are assigned to U14 - Advanced as an academy coach.',now()-interval '4 days'),
  ('session_reminder','Session reminder','Your next academy training session starts tomorrow morning.',now()-interval '1 day'),
  ('academy_announcement','Academy announcement','Inter-academy match preparations begin this week.',now()-interval '2 hours')
) n(key,subject,body,sent_at)
where c.profile_id is not null and not exists(
  select 1 from public.notifications x where x.coach_id=c.id and x.template_key=n.key and x.subject=n.subject
);

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

commit;
