begin;
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

 ), filtered as (select *,to_jsonb(source) payload from source where public.list_columns_match(to_jsonb(source),p_columns)),
 totals as (select count(*) total from filtered), page_rows as (
 select * from filtered order by
 case when p_direction='asc' then public.list_column_value(payload,p_sort) end asc nulls last,
 case when p_direction='desc' then public.list_column_value(payload,p_sort) end desc nulls last,student_id
 offset (p_page-1)*p_size limit p_size)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(payload order by
 case when p_direction='asc' then public.list_column_value(payload,p_sort) end asc nulls last,
 case when p_direction='desc' then public.list_column_value(payload,p_sort) end desc nulls last,student_id) from page_rows),'[]'::jsonb),'total',(select total from totals)) into result;
 return result;
end;
$$;
revoke all on function public.get_student_columns_page(integer,integer,jsonb,text,text) from public,anon;
grant execute on function public.get_student_columns_page(integer,integer,jsonb,text,text) to authenticated;
create or replace view public.parent_directory_columns with (security_invoker=true) as
 select p.*,p.status::text status_text, (p.created_at at time zone coalesce((select timezone from public.academy_settings where id=true),'Asia/Kolkata'))::date joined_date,
 coalesce((select string_agg(s.full_name,', ' order by s.full_name) from public.student_parents sp join public.students s on s.id=sp.student_id where sp.parent_id=p.id),'') children_text,
 coalesce((select jsonb_agg(jsonb_build_object('is_primary',sp.is_primary,'student',jsonb_build_object('id',s.id,'full_name',s.full_name)) order by sp.is_primary desc,s.full_name) from public.student_parents sp join public.students s on s.id=sp.student_id where sp.parent_id=p.id),'[]'::jsonb) student_parents
 from public.parents p;
grant select on public.parent_directory_columns to authenticated;
commit;
