begin;

alter table public.profiles
  add column if not exists address jsonb not null default '{"line1":"","city":"","state":"","pinCode":""}'::jsonb;
alter table public.coaches
  add column if not exists address jsonb not null default '{"line1":"","city":"","state":"","pinCode":""}'::jsonb;
alter table public.students
  add column if not exists nationality text,
  add column if not exists aadhaar text;

create or replace function public.canonical_address(value jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
  'line1', coalesce(
    nullif(btrim(value->>'line1'), ''),
    nullif(btrim(value->>'address'), ''),
    nullif(btrim(value->>'formatted'), ''),
    ''
  ),
  'city', coalesce(nullif(btrim(coalesce(value->>'city', '')), ''), ''),
  'state', coalesce(nullif(btrim(coalesce(value->>'state', '')), ''), ''),
  'pinCode', coalesce(
    nullif(btrim(value->>'pinCode'), ''),
    nullif(btrim(value->>'pin_code'), ''),
    nullif(btrim(value->>'postal_code'), ''),
    ''
  )
) || case
  when coalesce(nullif(btrim(value->>'line2'), ''), nullif(btrim(value->>'address_line2'), '')) is null then '{}'::jsonb
  else jsonb_build_object(
    'line2',
    coalesce(nullif(btrim(value->>'line2'), ''), nullif(btrim(value->>'address_line2'), ''))
  )
end;
$$;

create or replace function public.address_is_valid(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and length(btrim(coalesce(value->>'line1', ''))) > 0
    and length(btrim(coalesce(value->>'city', ''))) > 0
    and length(btrim(coalesce(value->>'state', ''))) > 0
    and coalesce(value->>'pinCode', '') ~ '^[0-9]{6}$';
$$;

create or replace function public.canonicalize_address_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.address := public.canonical_address(new.address);
  return new;
end;
$$;

drop trigger if exists profiles_canonical_address on public.profiles;
create trigger profiles_canonical_address before insert or update of address on public.profiles
for each row execute function public.canonicalize_address_before_write();
drop trigger if exists coaches_canonical_address on public.coaches;
create trigger coaches_canonical_address before insert or update of address on public.coaches
for each row execute function public.canonicalize_address_before_write();
drop trigger if exists parents_canonical_address on public.parents;
create trigger parents_canonical_address before insert or update of address on public.parents
for each row execute function public.canonicalize_address_before_write();
drop trigger if exists students_canonical_address on public.students;
create trigger students_canonical_address before insert or update of address on public.students
for each row execute function public.canonicalize_address_before_write();

update public.students
set nationality = coalesce(nationality, nullif(address->>'nationality', '')),
    aadhaar = coalesce(aadhaar, nullif(address->>'aadhaar', '')),
    address = public.canonical_address(address);
update public.parents set address = public.canonical_address(address);
update public.coaches set address = public.canonical_address(address);
update public.profiles set address = public.canonical_address(address);

alter table public.academy_settings
  alter column address type jsonb
  using case
    when nullif(btrim(address), '') is null then '{"line1":"","city":"","state":"","pinCode":""}'::jsonb
    else jsonb_build_object('line1', btrim(address), 'city', '', 'state', '', 'pinCode', '')
  end;
alter table public.academy_settings
  alter column address set default '{"line1":"","city":"","state":"","pinCode":""}'::jsonb;

drop function if exists public.profile_update_own_details(text, text);
create function public.profile_update_own_details(p_full_name text, p_phone text, p_address jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
  next_address jsonb := public.canonical_address(p_address);
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

  update public.profiles
  set full_name = btrim(p_full_name),
      phone = nullif(btrim(p_phone), ''),
      address = next_address,
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
revoke all on function public.profile_update_own_details(text, text, jsonb) from public;
grant execute on function public.profile_update_own_details(text, text, jsonb) to authenticated;

drop function if exists public.coach_update_own_profile_details(text, text, text, date, numeric, text, text, text[], text);
create function public.coach_update_own_profile_details(
  p_full_name text,
  p_phone text,
  p_address jsonb,
  p_email text,
  p_date_of_birth date,
  p_experience_years numeric,
  p_qualification text,
  p_biography text,
  p_specializations text[],
  p_photo_path text
)
returns public.coaches
language plpgsql
security definer
set search_path = ''
as $$
declare
  coach public.coaches;
  updated public.coaches;
  next_address jsonb := public.canonical_address(p_address);
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
  if not public.address_is_valid(next_address) then
    raise exception 'A valid address with a 6-digit PIN code is required.' using errcode = '22023';
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
      address = next_address,
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
revoke all on function public.coach_update_own_profile_details(text, text, jsonb, text, date, numeric, text, text, text[], text) from public;
grant execute on function public.coach_update_own_profile_details(text, text, jsonb, text, date, numeric, text, text, text[], text) to authenticated;

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
  if next_photo_path is not null and next_photo_path !~ ('^' || current_parent.id::text || '/') then raise exception 'Profile photo path is invalid.' using errcode = '22023'; end if;

  update public.parents p set
    full_name=next_name, relation=next_relation, phone=next_phone,
    whatsapp=next_whatsapp, email=next_email, occupation=next_occupation,
    address=next_address, photo_path=coalesce(next_photo_path,current_parent.photo_path)
  where p.id=current_parent.id returning p.* into updated_parent;
  return updated_parent;
end;
$$;
revoke all on function public.parent_update_own_profile(jsonb) from public;
grant execute on function public.parent_update_own_profile(jsonb) to authenticated;

create or replace function public.create_student_profile_v2(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_address jsonb := public.canonical_address(p_payload->'address');
  legacy_payload jsonb;
  student_id uuid;
begin
  if not public.address_is_valid(next_address) then
    raise exception 'A valid address with a 6-digit PIN code is required.' using errcode = '22023';
  end if;
  legacy_payload := p_payload || jsonb_build_object(
    'address', next_address->>'line1',
    'city', next_address->>'city',
    'state', next_address->>'state',
    'pin_code', next_address->>'pinCode'
  );
  student_id := public.create_student_profile(legacy_payload);
  update public.students
  set address = next_address,
      nationality = nullif(p_payload->>'nationality', ''),
      aadhaar = nullif(p_payload->>'aadhaar', '')
  where id = student_id;
  return student_id;
end;
$$;

create or replace function public.update_student_profile_v2(p_student_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_address jsonb := public.canonical_address(p_payload->'address');
  legacy_payload jsonb;
  student_id uuid;
begin
  if not public.address_is_valid(next_address) then
    raise exception 'A valid address with a 6-digit PIN code is required.' using errcode = '22023';
  end if;
  legacy_payload := p_payload || jsonb_build_object(
    'address', next_address->>'line1',
    'city', next_address->>'city',
    'state', next_address->>'state',
    'pin_code', next_address->>'pinCode'
  );
  student_id := public.update_student_profile(p_student_id, legacy_payload);
  update public.students
  set address = next_address,
      nationality = nullif(p_payload->>'nationality', ''),
      aadhaar = nullif(p_payload->>'aadhaar', '')
  where id = student_id;
  return student_id;
end;
$$;

create or replace function public.parent_update_linked_student_v2(p_student_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_address jsonb := public.canonical_address(p_payload->'address');
  legacy_payload jsonb;
  student_id uuid;
begin
  if not public.address_is_valid(next_address) then
    raise exception 'A valid address with a 6-digit PIN code is required.' using errcode = '22023';
  end if;
  legacy_payload := p_payload || jsonb_build_object(
    'address', next_address->>'line1',
    'city', next_address->>'city',
    'state', next_address->>'state',
    'pin_code', next_address->>'pinCode'
  );
  student_id := public.parent_update_linked_student(p_student_id, legacy_payload);
  update public.students
  set address = next_address,
      nationality = nullif(p_payload->>'nationality', ''),
      aadhaar = nullif(p_payload->>'aadhaar', '')
  where id = student_id;
  return student_id;
end;
$$;

revoke all on function public.create_student_profile_v2(jsonb) from public;
revoke all on function public.update_student_profile_v2(uuid, jsonb) from public;
revoke all on function public.parent_update_linked_student_v2(uuid, jsonb) from public;
grant execute on function public.create_student_profile_v2(jsonb) to authenticated;
grant execute on function public.update_student_profile_v2(uuid, jsonb) to authenticated;
grant execute on function public.parent_update_linked_student_v2(uuid, jsonb) to authenticated;

drop function if exists public.get_student_list_page(text, uuid, uuid, uuid, text, integer, integer, text, text);
create function public.get_student_list_page(
  p_search text,
  p_batch_id uuid,
  p_program_id uuid,
  p_coach_id uuid,
  p_status text,
  p_page integer,
  p_page_size integer,
  p_sort_by text,
  p_sort_direction text
) returns table(
  student_id uuid, student_code text, full_name text, photo_url text,
  batch_id uuid, batch_name text, program_id uuid, program_name text,
  coach_id uuid, coach_name text, coach_photo_url text, date_of_birth date, phone text, status text,
  parent_name text, parent_phone text, join_date date, address jsonb, total_count bigint
)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_sort_by is null or p_sort_by not in ('name','code','status','dateOfBirth','joinDate') then
    raise exception 'Invalid student sort field';
  end if;
  if p_sort_direction is null or p_sort_direction not in ('asc','desc') then
    raise exception 'Invalid student sort direction';
  end if;

  return query
  with rows as (
    select s.id as student_id, s.student_code, s.full_name, s.photo_url,
      b.id as batch_id, b.name as batch_name, fp.id as program_id, fp.name as program_name,
      c.id as coach_id, c.full_name as coach_name, c.photo_url as coach_photo_url, s.date_of_birth, s.phone,
      s.status::text as status, p.full_name as parent_name, p.phone as parent_phone, s.joined_on as join_date,
      public.canonical_address(s.address) as address
    from public.students s
    left join lateral (
      select e.* from public.enrollments e where e.student_id = s.id
      order by (e.status in ('active','paused')) desc, e.valid_from desc limit 1
    ) e on true
    left join public.batches b on b.id = e.batch_id
    left join public.fee_plans fp on fp.id = e.fee_plan_id
    left join lateral (
      select bc.coach_id from public.batch_coaches bc where bc.batch_id = b.id
      order by bc.is_primary desc, bc.assigned_at limit 1
    ) bc on true
    left join public.coaches c on c.id = bc.coach_id
    left join lateral (
      select pr.full_name, pr.phone from public.student_parents sp
      join public.parents pr on pr.id = sp.parent_id where sp.student_id = s.id
      order by sp.is_primary desc, sp.created_at limit 1
    ) p on true
    where (nullif(trim(p_search), '') is null or s.full_name ilike '%' || trim(p_search) || '%'
      or s.student_code ilike '%' || trim(p_search) || '%' or coalesce(s.phone,'') ilike '%' || trim(p_search) || '%')
      and (p_batch_id is null or b.id = p_batch_id)
      and (p_program_id is null or fp.id = p_program_id)
      and (p_coach_id is null or c.id = p_coach_id)
      and (nullif(p_status, '') is null or s.status::text = p_status)
  )
  select r.*, count(*) over()
  from rows r
  order by
    case when p_sort_by='dateOfBirth' and p_sort_direction='desc' then r.date_of_birth end desc nulls last,
    case when p_sort_by='dateOfBirth' and p_sort_direction='asc' then r.date_of_birth end asc nulls last,
    case when p_sort_by='joinDate' and p_sort_direction='desc' then r.join_date end desc nulls last,
    case when p_sort_by='joinDate' and p_sort_direction='asc' then r.join_date end asc nulls last,
    case when p_sort_by='name' and p_sort_direction='desc' then lower(r.full_name) end desc nulls last,
    case when p_sort_by='name' and p_sort_direction='asc' then lower(r.full_name) end asc nulls last,
    case when p_sort_by='code' and p_sort_direction='desc' then r.student_code end desc nulls last,
    case when p_sort_by='code' and p_sort_direction='asc' then r.student_code end asc nulls last,
    case when p_sort_by='status' and p_sort_direction='desc' then r.status end desc nulls last,
    case when p_sort_by='status' and p_sort_direction='asc' then r.status end asc nulls last,
    r.student_id asc
  limit greatest(1, least(p_page_size, 10000))
  offset (greatest(1, p_page) - 1) * greatest(1, least(p_page_size, 10000));
end;
$$;
revoke all on function public.get_student_list_page(text, uuid, uuid, uuid, text, integer, integer, text, text) from public, anon;
grant execute on function public.get_student_list_page(text, uuid, uuid, uuid, text, integer, integer, text, text) to authenticated;

create or replace function public.get_student_columns_page(p_page integer,p_size integer,p_columns jsonb,p_sort text,p_direction text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_page<1 or p_size not in (5,10,20,50,100) then raise exception 'Invalid student page'; end if;
 if p_direction not in ('asc','desc') then raise exception 'Invalid direction'; end if;
 with source as (
    select s.id as student_id, s.student_code, s.full_name, s.photo_url,
      b.id as batch_id, b.name as batch_name, fp.id as program_id, fp.name as program_name,
      c.id as coach_id, c.full_name as coach_name, c.photo_url as coach_photo_url, s.date_of_birth, s.phone,
      s.status::text as status, p.full_name as parent_name, p.phone as parent_phone, s.joined_on as join_date,
      public.canonical_address(s.address) as address
    from public.students s
    left join lateral (
      select e.* from public.enrollments e where e.student_id = s.id
      order by (e.status in ('active','paused')) desc, e.valid_from desc limit 1
    ) e on true
    left join public.batches b on b.id = e.batch_id
    left join public.fee_plans fp on fp.id = e.fee_plan_id
    left join lateral (
      select bc.coach_id from public.batch_coaches bc where bc.batch_id = b.id
      order by bc.is_primary desc, bc.assigned_at limit 1
    ) bc on true
    left join public.coaches c on c.id = bc.coach_id
    left join lateral (
      select pr.full_name, pr.phone from public.student_parents sp
      join public.parents pr on pr.id = sp.parent_id where sp.student_id = s.id
      order by sp.is_primary desc, sp.created_at limit 1
    ) p on true
 ), filtered as (
   select *, to_jsonb(source) payload from source where public.list_columns_match(to_jsonb(source), p_columns)
 ), totals as (
   select count(*) total from filtered
 ), page_rows as (
   select * from filtered order by
     case when p_direction='asc' then public.list_column_value(payload,p_sort) end asc nulls last,
     case when p_direction='desc' then public.list_column_value(payload,p_sort) end desc nulls last, student_id
   offset (p_page-1)*p_size limit p_size
 )
 select jsonb_build_object('rows', coalesce((select jsonb_agg(payload order by
   case when p_direction='asc' then public.list_column_value(payload,p_sort) end asc nulls last,
   case when p_direction='desc' then public.list_column_value(payload,p_sort) end desc nulls last, student_id)
   from page_rows), '[]'::jsonb), 'total', (select total from totals)) into result;
 return result;
end;
$$;
revoke all on function public.get_student_columns_page(integer,integer,jsonb,text,text) from public, anon;
grant execute on function public.get_student_columns_page(integer,integer,jsonb,text,text) to authenticated;

commit;
