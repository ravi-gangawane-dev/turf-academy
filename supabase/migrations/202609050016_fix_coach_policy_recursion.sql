begin;

create or replace function public.can_read_coach(target_coach uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin_or_receptionist()
    or exists (
      select 1
      from public.coaches own
      where own.id = target_coach
        and own.profile_id = auth.uid()
        and own.status = 'active'
    )
    or exists (
      select 1
      from public.batch_coaches requested
      join public.batch_coaches assigned
        on assigned.batch_id = requested.batch_id
      join public.coaches signed_in
        on signed_in.id = assigned.coach_id
      where requested.coach_id = target_coach
        and signed_in.profile_id = auth.uid()
        and signed_in.status = 'active'
    )
    or exists (
      select 1
      from public.batch_coaches requested
      join public.enrollments enrollment
        on enrollment.batch_id = requested.batch_id
       and enrollment.status in ('active', 'paused')
      where requested.coach_id = target_coach
        and public.parent_owns_student(enrollment.student_id)
    );
$$;

revoke all on function public.can_read_coach(uuid) from public;
grant execute on function public.can_read_coach(uuid) to authenticated;

drop policy if exists coaches_scoped_read on public.coaches;
create policy coaches_scoped_read
on public.coaches
for select
using (public.can_read_coach(id));

drop policy if exists coach_specs_scoped_read on public.coach_specializations;
create policy coach_specs_scoped_read
on public.coach_specializations
for select
using (public.can_read_coach(coach_id));

commit;
