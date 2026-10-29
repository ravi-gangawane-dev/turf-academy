begin;

create table if not exists public.coach_attendance_events (
  id bigint generated always as identity primary key,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  attendance_id uuid not null,
  batch_id uuid not null references public.batches(id) on delete cascade,
  event_type text not null check (event_type in ('INSERT', 'UPDATE', 'DELETE')),
  created_at timestamptz not null default now()
);

create index if not exists coach_attendance_events_coach_created_idx
  on public.coach_attendance_events(coach_id, created_at desc);

alter table public.coach_attendance_events enable row level security;

create policy coach_attendance_events_select_own
on public.coach_attendance_events for select to authenticated
using (
  exists (
    select 1 from public.coaches coach
    where coach.id = coach_attendance_events.coach_id
      and coach.profile_id = auth.uid()
      and coach.status = 'active'
  )
);

grant select on public.coach_attendance_events to authenticated;

create or replace function public.publish_coach_attendance_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attendance_id_value uuid;
  batch_id_value uuid;
begin
  if tg_op = 'DELETE' then
    attendance_id_value := old.id;
    batch_id_value := old.batch_id;
  else
    attendance_id_value := new.id;
    batch_id_value := new.batch_id;
  end if;
  delete from public.coach_attendance_events
  where created_at < now() - interval '7 days';
  insert into public.coach_attendance_events(coach_id, attendance_id, batch_id, event_type)
  select assignment.coach_id, attendance_id_value, batch_id_value, tg_op
  from public.batch_coaches assignment
  join public.coaches coach on coach.id = assignment.coach_id and coach.status = 'active'
  where assignment.batch_id = batch_id_value;
  return null;
end;
$$;

drop trigger if exists publish_coach_attendance_event on public.attendance_records;
create trigger publish_coach_attendance_event
after insert or update or delete on public.attendance_records
for each row execute function public.publish_coach_attendance_event();

do $$ begin
  alter publication supabase_realtime add table public.coach_attendance_events;
exception when duplicate_object then null; end $$;

commit;
