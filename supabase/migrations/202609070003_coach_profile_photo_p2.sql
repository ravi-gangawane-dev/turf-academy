begin;

drop policy if exists coach_own_photo_insert on storage.objects;
create policy coach_own_photo_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'coach-photos'
  and exists (
    select 1 from public.coaches coach
    where coach.profile_id = auth.uid()
      and coach.status = 'active'
      and (storage.foldername(name))[1] = coach.id::text
  )
);

create or replace function public.coach_update_own_profile(
  p_phone text,
  p_photo_path text default null
) returns public.coaches
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_coach public.coaches;
  result public.coaches;
begin
  if public.current_user_role() <> 'coach' then
    raise exception 'coach_access_required' using errcode = '42501';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'invalid_phone';
  end if;

  select * into current_coach
  from public.coaches
  where profile_id = auth.uid() and status = 'active';
  if current_coach.id is null then raise exception 'coach_profile_not_found'; end if;
  if p_photo_path is not null and p_photo_path !~ ('^' || current_coach.id::text || '/') then
    raise exception 'invalid_coach_photo_path' using errcode = '22023';
  end if;

  update public.coaches
  set phone = p_phone,
      photo_path = coalesce(p_photo_path, photo_path),
      photo_url = case when p_photo_path is not null then null else photo_url end,
      updated_at = now()
  where id = current_coach.id
  returning * into result;
  return result;
end;
$$;

revoke all on function public.coach_update_own_profile(text, text) from public;
grant execute on function public.coach_update_own_profile(text, text) to authenticated;

commit;
