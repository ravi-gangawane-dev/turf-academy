begin;

alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists qualification text;

alter table public.profiles
  add constraint profiles_date_of_birth_not_future
    check (date_of_birth is null or date_of_birth <= current_date),
  add constraint profiles_qualification_length
    check (qualification is null or char_length(qualification) <= 160);

update public.profiles p
set date_of_birth = c.date_of_birth,
    qualification = c.qualification
from public.coaches c
where c.profile_id = p.id
  and p.role = 'coach';

create or replace function public.sync_coach_profile_personal_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set date_of_birth = new.date_of_birth,
      qualification = new.qualification
  where id = new.profile_id
    and role = 'coach';
  return new;
end;
$$;

create trigger coaches_sync_profile_personal_fields
after update of date_of_birth, qualification on public.coaches
for each row
when (old.date_of_birth is distinct from new.date_of_birth
   or old.qualification is distinct from new.qualification)
execute function public.sync_coach_profile_personal_fields();

drop function if exists public.profile_update_own_details(text, text, jsonb);
create function public.profile_update_own_details(
  p_full_name text,
  p_phone text,
  p_address jsonb,
  p_date_of_birth date,
  p_qualification text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
  next_address jsonb := public.canonical_address(p_address);
  next_qualification text := nullif(btrim(p_qualification), '');
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
  if not public.address_is_valid(next_address) then
    raise exception 'A valid address with a 6-digit PIN code is required.' using errcode = '22023';
  end if;
  if p_date_of_birth > current_date then
    raise exception 'Date of birth cannot be in the future.' using errcode = '22023';
  end if;
  if next_qualification is not null and char_length(next_qualification) > 160 then
    raise exception 'Qualification must be 160 characters or fewer.' using errcode = '22023';
  end if;

  update public.profiles
  set full_name = btrim(p_full_name),
      phone = nullif(btrim(p_phone), ''),
      address = next_address,
      date_of_birth = p_date_of_birth,
      qualification = next_qualification,
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
revoke all on function public.profile_update_own_details(text, text, jsonb, date, text) from public;
grant execute on function public.profile_update_own_details(text, text, jsonb, date, text) to authenticated;

create or replace function public.parent_update_own_profile(p_payload jsonb)
returns public.parents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_parent public.parents;
  updated_parent public.parents;
  next_name text := nullif(btrim(p_payload->>'full_name'), '');
  next_relation text := nullif(btrim(p_payload->>'relation'), '');
  next_phone text := nullif(btrim(p_payload->>'phone'), '');
  next_whatsapp text := nullif(btrim(p_payload->>'whatsapp'), '');
  next_email text := nullif(btrim(p_payload->>'email'), '');
  next_occupation text := nullif(btrim(p_payload->>'occupation'), '');
  next_address jsonb := public.canonical_address(p_payload->'address');
  next_photo_path text := nullif(btrim(p_payload->>'photo_path'), '');
  next_date_of_birth date := case
    when p_payload ? 'date_of_birth' then nullif(btrim(p_payload->>'date_of_birth'), '')::date
    else null
  end;
  next_qualification text := case
    when p_payload ? 'qualification' then nullif(btrim(p_payload->>'qualification'), '')
    else null
  end;
begin
  if public.current_user_role() is distinct from 'parent' then
    raise exception 'Parent account is inactive or unauthorized.' using errcode = '42501';
  end if;
  select p.* into current_parent from public.parents p
  where p.profile_id = auth.uid() and p.status = 'active' for update;
  if not found then raise exception 'No active parent record is linked to this account.' using errcode = 'P0002'; end if;
  if next_name is null or char_length(next_name) < 2 then raise exception 'A valid full name is required.' using errcode = '22023'; end if;
  if next_relation is null then raise exception 'Relationship is required.' using errcode = '22023'; end if;
  if next_phone is null or next_phone !~ '^[0-9]{10}$' then raise exception 'Phone number must contain 10 digits.' using errcode = '22023'; end if;
  if next_whatsapp is not null and next_whatsapp !~ '^[0-9]{10}$' then raise exception 'WhatsApp number must contain 10 digits.' using errcode = '22023'; end if;
  if next_email is not null and next_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email address is invalid.' using errcode = '22023'; end if;
  if not public.address_is_valid(next_address) then raise exception 'A valid address with a 6-digit PIN code is required.' using errcode = '22023'; end if;
  if next_date_of_birth > current_date then raise exception 'Date of birth cannot be in the future.' using errcode = '22023'; end if;
  if next_qualification is not null and char_length(next_qualification) > 160 then raise exception 'Qualification must be 160 characters or fewer.' using errcode = '22023'; end if;
  if next_photo_path is not null and next_photo_path !~ ('^' || current_parent.id::text || '/') then raise exception 'Profile photo path is invalid.' using errcode = '22023'; end if;

  update public.parents p set
    full_name=next_name, relation=next_relation, phone=next_phone,
    whatsapp=next_whatsapp, email=next_email, occupation=next_occupation,
    address=next_address, photo_path=coalesce(next_photo_path,current_parent.photo_path)
  where p.id=current_parent.id returning p.* into updated_parent;

  if p_payload ? 'date_of_birth' or p_payload ? 'qualification' then
    update public.profiles
    set date_of_birth = case when p_payload ? 'date_of_birth' then next_date_of_birth else date_of_birth end,
        qualification = case when p_payload ? 'qualification' then next_qualification else qualification end
    where id = current_parent.profile_id
      and role = 'parent'
      and status = 'active'
      and is_active;
    if not found then raise exception 'Active parent profile not found.' using errcode = 'P0002'; end if;
  end if;
  return updated_parent;
end;
$$;
revoke all on function public.parent_update_own_profile(jsonb) from public;
grant execute on function public.parent_update_own_profile(jsonb) to authenticated;

commit;
