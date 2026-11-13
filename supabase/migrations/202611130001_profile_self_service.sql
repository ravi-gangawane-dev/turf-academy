begin;

create or replace function public.profile_update_own_details(p_full_name text, p_phone text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if public.current_user_role() not in ('admin', 'receptionist') then
    raise exception 'staff_profile_access_required' using errcode = '42501';
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 120 then
    raise exception 'A valid full name is required.' using errcode = '22023';
  end if;
  if nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '') is not null
     and length(regexp_replace(p_phone, '\D', '', 'g')) not between 10 and 15 then
    raise exception 'Phone number must contain between 10 and 15 digits.' using errcode = '22023';
  end if;

  update public.profiles
  set full_name = btrim(p_full_name),
      phone = nullif(btrim(p_phone), ''),
      updated_at = now()
  where id = auth.uid()
    and role in ('admin', 'receptionist')
    and status = 'active'
    and is_active
  returning * into result;

  if result.id is null then
    raise exception 'Active staff profile not found.' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

create or replace function public.coach_update_own_profile_details(
  p_full_name text,
  p_phone text,
  p_email text,
  p_date_of_birth date,
  p_experience_years numeric,
  p_qualification text,
  p_biography text,
  p_specializations text[],
  p_photo_path text default null
)
returns public.coaches
language plpgsql
security definer
set search_path = ''
as $$
declare
  coach public.coaches;
  updated public.coaches;
  specialties text[] := coalesce(p_specializations, '{}'::text[]);
begin
  if public.current_user_role() is distinct from 'coach' then
    raise exception 'coach_access_required' using errcode = '42501';
  end if;
  select c.* into coach
  from public.coaches c
  where c.profile_id = auth.uid() and c.status = 'active'
  for update;
  if not found then
    raise exception 'coach_profile_not_found' using errcode = 'P0002';
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 120 then
    raise exception 'A valid full name is required.' using errcode = '22023';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if p_email is not null and p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Email address is invalid.' using errcode = '22023';
  end if;
  if p_experience_years is null or p_experience_years not between 0 and 60 then
    raise exception 'Experience must be between 0 and 60 years.' using errcode = '22023';
  end if;
  if p_qualification is not null and char_length(p_qualification) > 160 then
    raise exception 'Qualification must be 160 characters or fewer.' using errcode = '22023';
  end if;
  if p_biography is not null and char_length(p_biography) > 2000 then
    raise exception 'Biography must be 2000 characters or fewer.' using errcode = '22023';
  end if;
  if cardinality(specialties) > 20
     or exists (
       select 1 from unnest(specialties) value
       where char_length(btrim(value)) not between 1 and 80
     ) then
    raise exception 'Specializations must contain up to 20 values of at most 80 characters.' using errcode = '22023';
  end if;
  if p_photo_path is not null and p_photo_path !~ ('^' || coach.id::text || '/') then
    raise exception 'Profile photo path is invalid.' using errcode = '22023';
  end if;

  update public.coaches c
  set full_name = btrim(p_full_name),
      phone = btrim(p_phone),
      email = nullif(btrim(p_email), ''),
      date_of_birth = p_date_of_birth,
      experience_years = p_experience_years,
      qualification = nullif(btrim(p_qualification), ''),
      biography = nullif(btrim(p_biography), ''),
      photo_path = coalesce(p_photo_path, c.photo_path),
      updated_at = now()
  where c.id = coach.id
  returning c.* into updated;

  update public.profiles p
  set full_name = btrim(p_full_name),
      phone = btrim(p_phone),
      updated_at = now()
  where p.id = auth.uid()
    and p.role = 'coach'
    and p.status = 'active'
    and p.is_active;
  if not found then
    raise exception 'Active coach account not found.' using errcode = 'P0002';
  end if;

  delete from public.coach_specializations where coach_id = coach.id;
  insert into public.coach_specializations (coach_id, specialization)
  select coach.id, distinct_specialty
  from (
    select distinct btrim(value) as distinct_specialty
    from unnest(specialties) value
  ) cleaned
  where distinct_specialty <> '';

  return updated;
end;
$$;

create or replace function public.sync_parent_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null then
    update public.profiles
    set full_name = new.full_name,
        phone = new.phone,
        updated_at = now()
    where id = new.profile_id and role = 'parent';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_parent_profile_identity on public.parents;
create trigger sync_parent_profile_identity
after update of full_name, phone on public.parents
for each row execute function public.sync_parent_profile_identity();

revoke all on function public.profile_update_own_details(text, text) from public;
grant execute on function public.profile_update_own_details(text, text) to authenticated;
revoke all on function public.coach_update_own_profile_details(text, text, text, date, numeric, text, text, text[], text) from public;
grant execute on function public.coach_update_own_profile_details(text, text, text, date, numeric, text, text, text[], text) to authenticated;

commit;
