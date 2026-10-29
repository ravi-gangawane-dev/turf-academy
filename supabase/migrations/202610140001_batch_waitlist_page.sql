begin;

create or replace function public.get_staff_list_page(
 p_resource text, p_page integer default 1, p_size integer default 5, p_filters jsonb default '{}'::jsonb
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
 source_sql text;
 result jsonb;
 metrics jsonb := '{}'::jsonb;
 options jsonb := '{}'::jsonb;
begin
 if p_page < 1 or p_page is null or p_size is null or p_size not in (5,10,20,50,100) then
  raise exception 'Invalid page or page size';
 end if;
 if p_resource = 'plans' then
  source_sql := 'select to_jsonb(t) payload, concat_ws('' '',t.name,t.description) search_text, t.name sort_key from public.fee_plans t';
  select jsonb_build_object('total',count(*),'active',count(*) filter(where status='active'),
   'inactive',count(*) filter(where status='inactive'),'averagePaise',coalesce(round(avg(monthly_fee) filter(where status='active')*100),0)) into metrics from public.fee_plans;
 elsif p_resource = 'discounts' then
  source_sql := 'select to_jsonb(t) payload, t.name search_text, t.name sort_key from public.discounts t';
 elsif p_resource = 'late-fees' then
  source_sql := 'select to_jsonb(t) payload, t.name search_text, t.name sort_key from public.late_fee_rules t';
 elsif p_resource in ('summary','pending') then
  source_sql := 'select to_jsonb(t) || jsonb_build_object(''student'',jsonb_build_object(''full_name'',s.full_name)) payload,
   coalesce(s.full_name,'''') search_text, lpad((date ''9999-12-31'' - t.due_date)::text,7,''0'') sort_key
   from public.monthly_charge_balances t left join public.students s on s.id=t.student_id';
 elsif p_resource = 'coaches' then
  source_sql := 'select to_jsonb(t) || jsonb_build_object(''coach_specializations'',coalesce((select jsonb_agg(jsonb_build_object(''specialization'',s.specialization) order by s.specialization) from public.coach_specializations s where s.coach_id=t.id),''[]''::jsonb)) payload,
   concat_ws('' '',t.full_name,t.phone,(select string_agg(s.specialization,'' '') from public.coach_specializations s where s.coach_id=t.id)) search_text,
   t.full_name sort_key from public.coaches t';
  select jsonb_build_object('total',count(*),'active',count(*) filter(where status='active'),
   'inactive',count(*) filter(where status='inactive'),'experienced',count(*) filter(where experience_years>=5),
   'specializations',(select count(distinct specialization) from public.coach_specializations)) into metrics from public.coaches;
 elsif p_resource in ('enrollments','allocations') then
  source_sql := 'select to_jsonb(t) || jsonb_build_object(''student'',to_jsonb(s),''batch'',to_jsonb(b),''plan'',to_jsonb(fp)) payload,
   concat_ws('' '',s.full_name,s.student_code,s.phone) search_text,
   s.full_name sort_key from public.enrollments t left join public.students s on s.id=t.student_id
   left join public.batches b on b.id=t.batch_id left join public.fee_plans fp on fp.id=t.fee_plan_id';
  select jsonb_build_object('total',count(*),'active',count(*) filter(where status='active'),
   'paused',count(*) filter(where status='paused'),'cancelled',count(*) filter(where status='cancelled'),
   'expiring',count(*) filter(where status='active' and valid_till between current_date and current_date+30)) into metrics from public.enrollments;
 elsif p_resource = 'batches' then
  source_sql := 'select to_jsonb(t) || jsonb_build_object(
   ''batch_days'',coalesce((select jsonb_agg(jsonb_build_object(''day_of_week'',d.day_of_week) order by d.day_of_week) from public.batch_days d where d.batch_id=t.id),''[]''::jsonb),
   ''batch_coaches'',coalesce((select jsonb_agg(jsonb_build_object(''coach_id'',c.coach_id,''is_primary'',c.is_primary) order by c.coach_id) from public.batch_coaches c where c.batch_id=t.id),''[]''::jsonb),
   ''active_count'',(select count(*) from public.enrollments e where e.batch_id=t.id and e.status=''active''),
   ''waiting_count'',(select count(*) from public.batch_waitlist w where w.batch_id=t.id and w.status=''waiting'')) payload,
   concat_ws('' '',t.name,t.code) search_text, t.name sort_key from public.batches t';
 else
  raise exception 'Unsupported list resource';
 end if;
 execute 'with source as (' || source_sql || '), filtered as (
  select * from source where
   (coalesce($1->>''search'','''')='''' or strpos(lower(search_text),lower(trim($1->>''search'')))>0)
   and (coalesce($1->>''status'','''') in ('''',''all'') or payload->>''status''=$1->>''status'')
   and (coalesce($1->>''batchId'','''')='''' or coalesce(payload->>''batch_id'',payload->>''id'')=$1->>''batchId'')
   and (coalesce($1->>''month'','''')='''' or left(payload->>''charge_month'',7)=$1->>''month'')
   and (coalesce($1->>''coachId'','''')='''' or exists (select 1 from jsonb_array_elements(payload->''batch_coaches'') c where c->>''coach_id''=$1->>''coachId''))
   and ($2<>''pending'' or ((payload->>''balance_amount'')::numeric>0 and payload->>''status''<>''waived''))
   and ($2<>''allocations'' or payload->>''status''<>''cancelled'')
 ), ordered as (
  select *,
   case $1->>''sortBy''
    when ''status'' then payload->>''status''
    when ''date'' then coalesce(payload->>''due_date'',payload->>''valid_from'',payload->>''start_date'',payload->>''charge_month'',payload->>''created_at'')
    when ''code'' then coalesce(payload->>''code'',payload->>''student_code'',payload->''student''->>''student_code'')
    when ''student'' then payload->''student''->>''full_name''
    else sort_key
   end requested_sort_key,
   case
    when $1->>''sortBy'' = ''capacity'' then nullif(payload->>''capacity'','''')::numeric
    when $1->>''sortBy'' = ''amount'' then nullif(coalesce(payload->>''monthly_fee'',payload->>''final_amount'',payload->>''balance_amount'',payload->>''value''),'''')::numeric
    when $1->>''sortBy'' = ''balance'' then nullif(payload->>''balance_amount'','''')::numeric
   end requested_sort_number,
   case when $1->>''sortDirection'' = ''desc'' then ''desc'' else ''asc'' end requested_sort_direction
  from filtered
 ), totals as (select count(*) total from ordered), page_rows as (
  select * from ordered
  order by
   case when requested_sort_direction=''desc'' then requested_sort_number end desc nulls last,
   case when requested_sort_direction<>''desc'' then requested_sort_number end asc nulls last,
   case when requested_sort_direction=''desc'' then requested_sort_key end desc nulls last,
   case when requested_sort_direction<>''desc'' then requested_sort_key end asc nulls last,
   payload->>''id'' asc
  offset (least($3,greatest(1,ceil((select total from totals)::numeric/$4)::integer))-1)*$4 limit $4
 ) select jsonb_build_object(
   ''rows'',coalesce((select jsonb_agg(payload order by
    case when requested_sort_direction=''desc'' then requested_sort_number end desc nulls last,
    case when requested_sort_direction<>''desc'' then requested_sort_number end asc nulls last,
    case when requested_sort_direction=''desc'' then requested_sort_key end desc nulls last,
    case when requested_sort_direction<>''desc'' then requested_sort_key end asc nulls last,
    payload->>''id'' asc) from page_rows),''[]''::jsonb),
   ''total'',(select total from totals),
   ''page'',least($3,greatest(1,ceil((select total from totals)::numeric/$4)::integer)),
   ''totals'',(select jsonb_build_object(''count'',count(*),
    ''base'',coalesce(round(sum((payload->>''base_amount'')::numeric)*100),0),
    ''discount'',coalesce(round(sum((payload->>''discount_amount'')::numeric)*100),0),
    ''late'',coalesce(round(sum((payload->>''late_fee_amount'')::numeric)*100),0),
    ''final'',coalesce(round(sum((payload->>''final_amount'')::numeric)*100),0),
    ''paid'',coalesce(round(sum((payload->>''paid_amount'')::numeric)*100),0),
    ''balance'',coalesce(round(sum((payload->>''balance_amount'')::numeric)*100),0)) from ordered))'
  into result using p_filters,p_resource,p_page,p_size;
 if p_resource in ('batches','allocations','enrollments') then
  select jsonb_build_object('batches',coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'code',code,'status',status,'fee_plan_id',fee_plan_id,'capacity',capacity) order by name,id),'[]'::jsonb)) into options from public.batches;
 end if;
 if p_resource in ('batches','allocations') then
  select jsonb_build_object('batches',(select count(*) from public.batches),'active',(select count(*) from public.enrollments where status='active'),
   'capacity',(select coalesce(sum(capacity),0) from public.batches where status='active'),
   'waiting',(select count(*) from public.batch_waitlist where status='waiting')) into metrics;
  options := options || jsonb_build_object(
   'coaches',coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,'status',status) order by full_name,id) from public.coaches),'[]'::jsonb),
   'plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'monthly_fee',monthly_fee,'duration_months',duration_months,'status',status) order by name,id) from public.fee_plans),'[]'::jsonb),
   'students',case when p_resource='allocations' or p_filters->>'view'='capacity' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,'student_code',student_code,'status',status) order by full_name,id) from public.students),'[]'::jsonb) else '[]'::jsonb end,
   'waiting',case when p_filters->>'view'='capacity' and coalesce(p_filters->>'omitWaitlist','false')<>'true' then coalesce((select jsonb_agg(to_jsonb(w) order by created_at,id) from public.batch_waitlist w where status='waiting'),'[]'::jsonb) else '[]'::jsonb end,
   'enrollments','[]'::jsonb);
 end if;
 return result || jsonb_build_object('metrics',metrics,'options',options);
end;
$$;

revoke all on function public.get_staff_list_page(text,integer,integer,jsonb) from public, anon;
grant execute on function public.get_staff_list_page(text,integer,integer,jsonb) to authenticated;

-- Joined names, column filters and a stable page are evaluated under the caller's RLS.
create or replace function public.get_batch_waitlist_page(
 p_page integer default 1, p_size integer default 5, p_filters jsonb default '{}'::jsonb,
 p_sort_by text default 'created_at', p_sort_direction text default 'asc'
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; academy_timezone text;
begin
 if p_page is null or p_page<1 or p_size is null or p_size not in (5,10,20,50,100) then
  raise exception 'Invalid waiting list page';
 end if;
 if p_sort_by is null or p_sort_by not in ('student_name','batch_name','created_at')
  or p_sort_direction is null or p_sort_direction not in ('asc','desc') then
  raise exception 'Invalid waiting list sort';
 end if;
 select coalesce(timezone,'Asia/Kolkata') into academy_timezone from public.academy_settings where id=true;
 academy_timezone:=coalesce(academy_timezone,'Asia/Kolkata');
 execute format($query$
  with filtered as (
   select w.id,w.batch_id,w.student_id,w.created_at,s.full_name student_name,b.name batch_name
   from public.batch_waitlist w
   join public.students s on s.id=w.student_id
   join public.batches b on b.id=w.batch_id
   where w.status='waiting'
    and (coalesce($1->>'batchId','')='' or w.batch_id=nullif($1->>'batchId','')::uuid)
    and (coalesce($1->>'student','')='' or strpos(lower(s.full_name),lower(trim($1->>'student')))>0)
    and (coalesce($1->>'batch','')='' or strpos(lower(b.name),lower(trim($1->>'batch')))>0)
    and (coalesce($1->>'date','')='' or (w.created_at at time zone $4)::date=nullif($1->>'date','')::date)
  ), totals as (
   select count(*) total,least($2,greatest(1,ceil(count(*)::numeric/$3)::integer)) page from filtered
  ), page_rows as (
   select * from filtered order by %I %s nulls last,id asc
   offset ((select page from totals)-1)*$3 limit $3
  ) select jsonb_build_object(
   'rows',coalesce((select jsonb_agg(to_jsonb(p) order by %I %s nulls last,id asc) from page_rows p),'[]'::jsonb),
   'total',(select total from totals),'page',(select page from totals))
 $query$,p_sort_by,p_sort_direction,p_sort_by,p_sort_direction)
 into result using p_filters,p_page,p_size,academy_timezone;
 return result;
end;
$$;
revoke all on function public.get_batch_waitlist_page(integer,integer,jsonb,text,text) from public,anon;
grant execute on function public.get_batch_waitlist_page(integer,integer,jsonb,text,text) to authenticated;
commit;


