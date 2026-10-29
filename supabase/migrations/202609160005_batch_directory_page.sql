begin;

create or replace function public.get_admin_batch_page(
  p_search text default '', p_age text default 'all', p_type text default 'all',
  p_status text default 'all', p_offset integer default 0, p_limit integer default 12
)
returns table(
  id uuid, code text, name text, age_group text, skill_level text, capacity integer,
  waitlist_capacity integer, start_date date, end_date date, start_time time, end_time time,
  status text, description text, monthly_fee numeric, registration_fee numeric,
  coach_id uuid, coach_name text, coach_specialization text, active_count bigint,
  days smallint[], total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select b.*
    from public.batches b
    where (trim(p_search) = '' or b.name ilike '%' || trim(p_search) || '%' or b.code ilike '%' || trim(p_search) || '%')
      and (p_age = 'all' or b.age_group = p_age)
      and (p_status = 'all' or b.status::text = p_status)
      and (p_type = 'all' or
        (p_type = 'Specialized' and (b.name ilike '%elite%' or b.name ilike '%advanced%')) or
        (p_type = 'Weekend' and b.name ilike '%weekend%') or
        (p_type = 'Foundation' and b.name ilike '%foundation%') or
        (p_type = 'Regular' and not (b.name ilike any(array['%elite%','%advanced%','%weekend%','%foundation%']))))
  )
  select f.id,f.code,f.name,f.age_group,f.skill_level,f.capacity,f.waitlist_capacity,
    f.start_date,f.end_date,f.start_time,f.end_time,f.status::text,f.description,
    coalesce(fp.monthly_fee,0),coalesce(fp.registration_fee,0),coach.id,coach.full_name,
    coalesce(spec.specialization,'No coach assigned'),
    (select count(*) from public.enrollments e where e.batch_id=f.id and e.status='active'),
    coalesce((select array_agg(d.day_of_week order by d.day_of_week) from public.batch_days d where d.batch_id=f.id),'{}'),
    count(*) over()
  from filtered f
  left join public.fee_plans fp on fp.id=f.fee_plan_id
  left join lateral (
    select c.id,c.full_name from public.batch_coaches bc join public.coaches c on c.id=bc.coach_id
    where bc.batch_id=f.id order by bc.is_primary desc,bc.assigned_at limit 1
  ) coach on true
  left join lateral (
    select string_agg(cs.specialization,', ' order by cs.specialization) specialization
    from public.coach_specializations cs where cs.coach_id=coach.id
  ) spec on true
  order by f.name offset greatest(p_offset,0) limit least(greatest(p_limit,1),100);
$$;

grant execute on function public.get_admin_batch_page(text,text,text,text,integer,integer) to authenticated;

commit;
