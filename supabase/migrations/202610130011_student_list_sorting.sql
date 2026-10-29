begin;

create or replace function public.get_student_list_page(
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
  parent_name text, parent_phone text, join_date date, address text, pin_code text, total_count bigint
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
      nullif(coalesce(s.address->>'formatted', s.address->>'address',
        concat_ws(', ', nullif(s.address->>'line1', ''), nullif(s.address->>'city', ''), nullif(s.address->>'state', ''))), '') as address,
      nullif(coalesce(s.address->>'pinCode', s.address->>'pin_code', s.address->>'postal_code'), '') as pin_code
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

revoke all on function public.get_student_list_page(text,uuid,uuid,uuid,text,integer,integer,text,text) from public,anon;
grant execute on function public.get_student_list_page(text,uuid,uuid,uuid,text,integer,integer,text,text) to authenticated;
commit;
