begin;

drop function if exists public.get_student_list(text,uuid,uuid,uuid,text,integer,integer);

create or replace function public.get_student_list(
  p_search text default null, p_batch_id uuid default null, p_program_id uuid default null,
  p_coach_id uuid default null, p_status text default null,
  p_page integer default 1, p_page_size integer default 10)
returns table(student_id uuid, student_code text, full_name text, photo_url text,
  batch_id uuid, batch_name text, program_id uuid, program_name text,
  coach_id uuid, coach_name text, coach_photo_url text, date_of_birth date, phone text, status text,
  parent_name text, parent_phone text, join_date date, address text, pin_code text, total_count bigint)
language sql stable security invoker set search_path = public
as $$
  with rows as (
    select s.id student_id, s.student_code, s.full_name, s.photo_url,
      b.id batch_id, b.name batch_name, fp.id program_id, fp.name program_name,
      c.id coach_id, c.full_name coach_name, c.photo_url coach_photo_url, s.date_of_birth, s.phone,
      s.status::text status, p.full_name parent_name, p.phone parent_phone, s.joined_on join_date,
      nullif(coalesce(s.address->>'formatted', s.address->>'address',
        concat_ws(', ', nullif(s.address->>'line1', ''), nullif(s.address->>'city', ''), nullif(s.address->>'state', ''))), '') address,
      nullif(coalesce(s.address->>'pinCode', s.address->>'pin_code', s.address->>'postal_code'), '') pin_code
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
  select r.*, count(*) over() total_count from rows r order by r.full_name
  limit greatest(1, least(p_page_size, 10000))
  offset (greatest(1, p_page) - 1) * greatest(1, least(p_page_size, 10000));
$$;

grant execute on function public.get_student_list(text,uuid,uuid,uuid,text,integer,integer) to authenticated;

commit;
