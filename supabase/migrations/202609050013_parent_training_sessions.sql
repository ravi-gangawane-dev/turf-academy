create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete set null,
  title text not null check (length(btrim(title)) between 2 and 120),
  session_date date not null,
  start_time time not null,
  end_time time not null,
  venue text not null check (length(btrim(venue)) between 2 and 160),
  status text not null default 'upcoming' check (status in ('upcoming','completed','cancelled','rescheduled')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists training_sessions_batch_date_idx on public.training_sessions(batch_id,session_date,start_time);
alter table public.training_sessions enable row level security;
create policy training_sessions_staff_read on public.training_sessions for select using (public.is_staff());
create policy training_sessions_parent_read on public.training_sessions for select using (
  public.current_user_role()='parent' and exists (
    select 1 from public.enrollments e where e.batch_id=training_sessions.batch_id
      and e.status in ('active','paused') and public.parent_owns_student(e.student_id)
  )
);
create policy training_sessions_staff_write on public.training_sessions for all
using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
grant select,insert,update,delete on public.training_sessions to authenticated;
create policy parent_linked_coach_photo_read on storage.objects for select using (
  bucket_id='coach-photos' and exists (
    select 1 from public.batch_coaches bc
    join public.enrollments e on e.batch_id=bc.batch_id and e.status in ('active','paused')
    where bc.coach_id=(storage.foldername(name))[1]::uuid
      and public.parent_owns_student(e.student_id)
  )
);
do $$ begin
  alter publication supabase_realtime add table public.training_sessions;
exception when duplicate_object then null; end $$;
