begin;

create or replace function public.get_attendance_correction_page(
  p_page integer default 1,
  p_size integer default 5,
  p_status text default 'pending',
  p_search text default '',
  p_sort_by text default 'createdAt',
  p_sort_direction text default 'desc'
) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
begin
  if p_page < 1 or p_page is null or p_size is null or p_size not in (5,10,20,50,100) then
    raise exception 'Invalid page or page size';
  end if;
  if p_status not in ('pending','approved','rejected','all') then
    raise exception 'Invalid correction status';
  end if;
  if p_sort_by not in ('createdAt','attendanceDate','student','status') then
    raise exception 'Invalid correction sort field';
  end if;
  if p_sort_direction not in ('asc','desc') then
    raise exception 'Invalid correction sort direction';
  end if;

  with filtered as (
    select
      c.id,
      c.reason,
      c.resolution_status,
      c.corrected_values,
      c.created_at,
      a.attendance_date,
      s.full_name as student_name,
      jsonb_build_object(
        'id', a.id,
        'attendance_date', a.attendance_date,
        'status', a.status,
        'student', case when s.id is null then null else jsonb_build_object(
          'id', s.id, 'student_code', s.student_code, 'full_name', s.full_name
        ) end,
        'batch', case when b.id is null then null else jsonb_build_object(
          'id', b.id, 'name', b.name
        ) end
      ) as attendance
    from public.attendance_corrections c
    join public.attendance_records a on a.id = c.attendance_id
    left join public.students s on s.id = a.student_id
    left join public.batches b on b.id = a.batch_id
    where (p_status = 'all' or c.resolution_status = p_status)
      and (
        coalesce(trim(p_search), '') = ''
        or strpos(lower(concat_ws(' ', c.reason, s.full_name, s.student_code, b.name, c.corrected_values->>'status')),
          lower(trim(p_search))) > 0
      )
  ), totals as (
    select count(*) as total from filtered
  ), page_rows as (
    select *
    from filtered
    order by
      case when p_sort_by = 'createdAt' and p_sort_direction = 'desc' then created_at end desc nulls last,
      case when p_sort_by = 'createdAt' and p_sort_direction = 'asc' then created_at end asc nulls last,
      case when p_sort_by = 'attendanceDate' and p_sort_direction = 'desc' then attendance_date end desc nulls last,
      case when p_sort_by = 'attendanceDate' and p_sort_direction = 'asc' then attendance_date end asc nulls last,
      case when p_sort_by = 'student' and p_sort_direction = 'desc' then student_name end desc nulls last,
      case when p_sort_by = 'student' and p_sort_direction = 'asc' then student_name end asc nulls last,
      case when p_sort_by = 'status' and p_sort_direction = 'desc' then resolution_status end desc nulls last,
      case when p_sort_by = 'status' and p_sort_direction = 'asc' then resolution_status end asc nulls last,
      id asc
    offset (least(p_page, greatest(1, ceil((select total from totals)::numeric / p_size)::integer)) - 1) * p_size
    limit p_size
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id,
      'reason', reason,
      'resolution_status', resolution_status,
      'corrected_values', corrected_values,
      'attendance', attendance
    ) order by
      case when p_sort_by = 'createdAt' and p_sort_direction = 'desc' then created_at end desc nulls last,
      case when p_sort_by = 'createdAt' and p_sort_direction = 'asc' then created_at end asc nulls last,
      case when p_sort_by = 'attendanceDate' and p_sort_direction = 'desc' then attendance_date end desc nulls last,
      case when p_sort_by = 'attendanceDate' and p_sort_direction = 'asc' then attendance_date end asc nulls last,
      case when p_sort_by = 'student' and p_sort_direction = 'desc' then student_name end desc nulls last,
      case when p_sort_by = 'student' and p_sort_direction = 'asc' then student_name end asc nulls last,
      case when p_sort_by = 'status' and p_sort_direction = 'desc' then resolution_status end desc nulls last,
      case when p_sort_by = 'status' and p_sort_direction = 'asc' then resolution_status end asc nulls last,
      id asc) from page_rows), '[]'::jsonb),
    'total', (select total from totals),
    'page', least(p_page, greatest(1, ceil((select total from totals)::numeric / p_size)::integer))
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_attendance_correction_page(integer,integer,text,text,text,text) from public, anon;
grant execute on function public.get_attendance_correction_page(integer,integer,text,text,text,text) to authenticated;
commit;
