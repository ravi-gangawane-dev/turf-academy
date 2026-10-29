begin;
create or replace function public.get_audit_log_page(
 p_offset integer default 0, p_limit integer default 5, p_filters jsonb default '{}'::jsonb,
 p_sort_by text default 'occurred_at', p_sort_direction text default 'desc'
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; academy_timezone text;
begin
 if p_sort_by is null or p_sort_by not in ('occurred_at','action','table_name','record_id','actor_id')
    or p_sort_direction is null or p_sort_direction not in ('asc','desc') then
  raise exception 'Invalid audit log sort';
 end if;
 if p_offset is null or p_offset<0 or p_limit is null or p_limit<1 or p_limit>500 then
  raise exception 'Invalid audit log page';
 end if;
 select coalesce(timezone,'Asia/Kolkata') into academy_timezone from public.academy_settings where id=true;
 academy_timezone:=coalesce(academy_timezone,'Asia/Kolkata');
 execute format($query$
  with filtered as (
   select id,action,table_name,record_id,occurred_at,actor_id from public.audit_logs
   where (coalesce($1->>'date','')='' or (occurred_at at time zone $4)::date=nullif($1->>'date','')::date)
    and (coalesce($1->>'action','')='' or strpos(lower(action),lower(trim($1->>'action')))>0)
    and (coalesce($1->>'table','')='' or strpos(lower(table_name),lower(trim($1->>'table')))>0)
    and (coalesce($1->>'record','')='' or strpos(lower(record_id::text),lower(trim($1->>'record')))>0)
    and (coalesce($1->>'account','')='' or strpos(lower(coalesce(actor_id::text,'System')),lower(trim($1->>'account')))>0)
  ), page_rows as (
   select * from filtered order by %I %s nulls last, id asc offset $2 limit $3
  ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(p) order by %I %s nulls last, id asc) from page_rows p),'[]'::jsonb),'total',(select count(*) from filtered))
 $query$,p_sort_by,p_sort_direction,p_sort_by,p_sort_direction)
 into result using p_filters,p_offset,p_limit,academy_timezone;
 return result;
end;
$$;
revoke all on function public.get_audit_log_page(integer,integer,jsonb,text,text) from public,anon;
grant execute on function public.get_audit_log_page(integer,integer,jsonb,text,text) to authenticated;
commit;
