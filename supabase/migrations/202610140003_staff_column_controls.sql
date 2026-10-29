begin;

-- Shared field projection for staff list column controls; no privileged reads.
create or replace function public.list_column_value(p jsonb,k text) returns text
language sql immutable security invoker set search_path='' as $$
 select case k
 when 'name' then coalesce(p->>'full_name',p->>'name')
 when 'student' then concat_ws(' ',p->'student'->>'full_name',p->'student'->>'student_code')
 when 'batch' then concat_ws(' ',p->'batch'->>'name',p->'batch'->>'code')
 when 'plan' then p->'plan'->>'name'
 when 'batch_name' then concat_ws(' ',p->>'batch_name',p->>'program_name')
 when 'receipt' then p->'receipt'->>'receipt_number'
 when 'contact' then concat_ws(' ',p->>'phone',p->>'email')
 when 'specialization' then coalesce((select string_agg(s->>'specialization',', ') from jsonb_array_elements(p->'coach_specializations') s),'General coaching')
 when 'experience' then p->>'experience_years'
 when 'duration' then p->>'duration_months'
 when 'fee' then p->>'monthly_fee'
 when 'totalFee' then ((p->>'monthly_fee')::numeric*(p->>'duration_months')::numeric)::text
 when 'amount' then coalesce(p->>'final_amount',p->>'amount')
 when 'period' then left(p->>'charge_month',7)
 when 'validity' then concat_ws(' ',p->>'valid_from',p->>'valid_till')
 when 'grace' then p->>'grace_days'
 when 'base' then p->>'base_amount'
 when 'discount' then p->>'discount_amount'
 when 'late' then p->>'late_fee_amount'
 when 'paid' then p->>'paid_amount'
 when 'balance' then p->>'balance_amount'
 else p->>k end;
$$;
create or replace function public.list_columns_match(p jsonb,f jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select not exists(select 1 from jsonb_each_text(f) e where left(e.key,3)='cf_' and trim(e.value)<>'' and
  case when substr(e.key,4) in ('amount','experience','duration','fee','totalFee','value','grace','base','discount','late','paid','balance')
   then case when e.value ~ '^[0-9]+([.][0-9]+)?$' then coalesce(public.list_column_value(p,substr(e.key,4))::numeric=e.value::numeric,false) else false end
   else strpos(lower(coalesce(public.list_column_value(p,substr(e.key,4)),'')),lower(trim(e.value)))>0 end is not true);
$$;
revoke all on function public.list_column_value(jsonb,text),public.list_columns_match(jsonb,jsonb) from public,anon;
grant execute on function public.list_column_value(jsonb,text),public.list_columns_match(jsonb,jsonb) to authenticated;


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
 elsif p_resource in ('summary','pending','charges') then
  source_sql := 'select to_jsonb(t) || jsonb_build_object(''student'',jsonb_build_object(''full_name'',s.full_name),''batch_id'',e.batch_id,''batch_name'',b.name,''plan_name'',fp.name,''batch'',jsonb_build_object(''name'',b.name),''plan'',jsonb_build_object(''name'',fp.name)) payload,
   coalesce(s.full_name,'''') search_text, lpad((date ''9999-12-31'' - t.due_date)::text,7,''0'') sort_key
   from public.monthly_charge_balances t left join public.students s on s.id=t.student_id left join public.enrollments e on e.id=t.enrollment_id left join public.batches b on b.id=e.batch_id left join public.fee_plans fp on fp.id=e.fee_plan_id';
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
   ''waiting_count'',(select count(*) from public.batch_waitlist w where w.batch_id=t.id and w.status=''waiting''),
   ''monthly_fee'',coalesce((select monthly_fee from public.fee_plans fp where fp.id=t.fee_plan_id),0),
   ''schedule_text'',concat_ws('' '',coalesce((select string_agg(to_char(date ''2026-10-11''+d.day_of_week,''Dy''),'', '' order by d.day_of_week) from public.batch_days d where d.batch_id=t.id),''Not scheduled''),left(t.start_time::text,5),left(t.end_time::text,5)),
   ''coach_text'',coalesce((select string_agg(concat_ws('' '',c.full_name,case when bc.is_primary then ''Primary'' else ''Assistant'' end),'', '' order by c.full_name) from public.batch_coaches bc join public.coaches c on c.id=bc.coach_id where bc.batch_id=t.id),''Unassigned'')) payload,
   concat_ws('' '',t.name,t.code) search_text, t.name sort_key from public.batches t';
 else
  raise exception 'Unsupported list resource';
 end if;
 execute 'with source as (' || source_sql || '), filtered as (
  select * from source where public.list_columns_match(payload,$1) and
   (coalesce($1->>''search'','''')='''' or strpos(lower(search_text),lower(trim($1->>''search'')))>0)
   and (coalesce($1->>''status'','''') in ('''',''all'') or payload->>''status''=$1->>''status'')
   and (coalesce($1->>''batchId'','''')='''' or coalesce(payload->>''batch_id'',payload->>''id'')=$1->>''batchId'')
   and (coalesce($1->>''month'','''')='''' or left(payload->>''charge_month'',7)=$1->>''month'')
   and (coalesce($1->>''coachId'','''')='''' or exists (select 1 from jsonb_array_elements(payload->''batch_coaches'') c where c->>''coach_id''=$1->>''coachId''))
   and ($2<>''pending'' or ((payload->>''balance_amount'')::numeric>0 and payload->>''status''<>''waived''))
   and ($2<>''allocations'' or payload->>''status''<>''cancelled'')
   and (coalesce($1->>''student'','''')='''' or strpos(lower(concat_ws('' '',payload->''student''->>''full_name'',payload->''student''->>''student_code'')),lower($1->>''student''))>0)
   and (coalesce($1->>''batch'','''')='''' or strpos(lower(concat_ws('' '',coalesce(payload->''batch''->>''name'',payload->>''name''),coalesce(payload->''batch''->>''code'',payload->>''code''))),lower($1->>''batch''))>0)
   and (coalesce($1->>''schedule'','''')='''' or strpos(lower(payload->>''schedule_text''),lower($1->>''schedule''))>0)
   and (coalesce($1->>''coach'','''')='''' or strpos(lower(payload->>''coach_text''),lower($1->>''coach''))>0)
   and (coalesce($1->>''columnStatus'','''')='''' or strpos(lower(payload->>''status''),lower($1->>''columnStatus''))>0)
   and (coalesce($1->>''start'','''')='''' or payload->>''valid_from''=$1->>''start'')
   and (coalesce($1->>''capacity'','''')='''' or (payload->>''capacity'')::numeric=nullif($1->>''capacity'','''')::numeric)
   and (coalesce($1->>''fee'','''')='''' or (payload->>''monthly_fee'')::numeric=nullif($1->>''fee'','''')::numeric)
 ), ordered as (
  select *,
   case when left($1->>''sortBy'',3)=''cf_'' then public.list_column_value(payload,substr($1->>''sortBy'',4)) else case $1->>''sortBy''
    when ''batch'' then payload->''batch''->>''name''
    when ''schedule'' then payload->>''schedule_text''
    when ''coach'' then payload->>''coach_text''
    when ''status'' then payload->>''status''
    when ''date'' then coalesce(payload->>''due_date'',payload->>''valid_from'',payload->>''start_date'',payload->>''charge_month'',payload->>''created_at'')
    when ''code'' then coalesce(payload->>''code'',payload->>''student_code'',payload->''student''->>''student_code'')
    when ''student'' then payload->''student''->>''full_name''
    else sort_key
   end end requested_sort_key,
   case
    when $1->>''sortBy'' in (''cf_amount'',''cf_experience'',''cf_duration'',''cf_fee'',''cf_totalFee'',''cf_value'',''cf_grace'',''cf_base'',''cf_discount'',''cf_late'',''cf_paid'',''cf_balance'') then nullif(public.list_column_value(payload,substr($1->>''sortBy'',4)),'''')::numeric
    when $1->>''sortBy'' = ''fee'' then nullif(payload->>''monthly_fee'','''')::numeric
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


commit;
