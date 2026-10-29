begin;

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  template_key text not null unique check (template_key ~ '^[a-z0-9_]+$'),
  channel text not null check (channel in ('sms','whatsapp','email','in_app')),
  subject text,
  body text not null check (length(trim(body)) between 1 and 4000),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

alter table public.notification_templates enable row level security;
create policy notification_templates_staff_read on public.notification_templates for select to authenticated using (public.is_staff());
create policy notification_templates_admin_write on public.notification_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select,insert,update,delete on public.notification_templates to authenticated;

create or replace function public.get_admin_coach_report(p_from date,p_to date)
returns table(coach_id uuid,coach_name text,assigned_batches bigint,assigned_students bigint,scheduled_sessions bigint,attendance_records bigint,present_records bigint,attendance_percent numeric)
language sql stable security invoker set search_path='' as $$
  select c.id,c.full_name,
    count(distinct bc.batch_id),
    count(distinct e.student_id) filter(where e.status='active'),
    count(distinct ts.id) filter(where ts.session_date between p_from and p_to),
    count(distinct ar.id),
    count(distinct ar.id) filter(where ar.status in ('present','late','checked_out')),
    case when count(distinct ar.id)=0 then 0 else round(100.0*count(distinct ar.id) filter(where ar.status in ('present','late','checked_out'))/count(distinct ar.id),2) end
  from public.coaches c
  left join public.batch_coaches bc on bc.coach_id=c.id
  left join public.enrollments e on e.batch_id=bc.batch_id
  left join public.training_sessions ts on ts.batch_id=bc.batch_id
  left join public.attendance_records ar on ar.batch_id=bc.batch_id and ar.attendance_date between p_from and p_to
  where public.is_admin()
  group by c.id,c.full_name
  order by c.full_name;
$$;
grant execute on function public.get_admin_coach_report(date,date) to authenticated;

commit;
