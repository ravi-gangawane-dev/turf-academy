begin;
do $$ begin
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and is_active limit 1),true);
end $$;
set local role authenticated;
do $$
declare a jsonb; b jsonb; c text; sample public.audit_logs; filters jsonb; expected bigint; tz text;
begin
 select coalesce(timezone,'Asia/Kolkata') into tz from public.academy_settings where id=true;
 select * into sample from public.audit_logs order by occurred_at desc,id limit 1;
 foreach c in array array['occurred_at','action','table_name','record_id','actor_id'] loop
  a:=public.get_audit_log_page(0,5,'{}',c,'asc');
  b:=public.get_audit_log_page(5,5,'{}',c,'asc');
  if jsonb_array_length(a->'rows')>5 or a->'total' is distinct from b->'total' then raise exception 'Invalid pagination'; end if;
  if exists(select 1 from jsonb_array_elements(a->'rows') x join jsonb_array_elements(b->'rows') y on x->>'id'=y->>'id') then raise exception 'Overlapping pages'; end if;
  perform public.get_audit_log_page(0,5,'{}',c,'desc');
 end loop;
 if sample.id is not null then
  filters:=jsonb_build_object('date',(sample.occurred_at at time zone coalesce(tz,'Asia/Kolkata'))::date,'action',sample.action,'table',sample.table_name,'record',left(sample.record_id::text,8),'account',coalesce(left(sample.actor_id::text,8),'System'));
  a:=public.get_audit_log_page(0,5,filters,'occurred_at','desc');
  if (a->>'total')::integer<1 then raise exception 'Combined column filters missed matching row'; end if;
 end if;
 a:=public.get_audit_log_page(0,5,'{"account":"__no_match__"}','actor_id','asc');
 if (a->>'total')::integer<>0 then raise exception 'UUID filter failed'; end if;
 begin
  perform public.get_audit_log_page(0,5,'{}','invalid','asc');
  raise exception 'Sort validation missing';
 exception when raise_exception then
  if sqlerrm<>'Invalid audit log sort' then raise; end if;
 end;
end $$;
reset role;
rollback;
