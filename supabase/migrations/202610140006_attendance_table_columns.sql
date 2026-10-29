begin;
create or replace function public.get_attendance_table_page(p_resource text,p_page integer,p_size integer,p_columns jsonb,p_sort text,p_direction text,p_scope jsonb default '{}')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare source_sql text;result jsonb;tz text;
begin
 if p_page<1 or p_size not in (5,10,20,50,100,500) or p_direction not in ('asc','desc') then raise exception 'Invalid attendance page';end if;
 select coalesce(timezone,'Asia/Kolkata') into tz from public.academy_settings where id=true;
 tz:=coalesce(tz,'Asia/Kolkata');
 if p_resource='history' then
 source_sql:=$source$select a.id,to_jsonb(a)||jsonb_build_object('student',to_jsonb(s),'batch',to_jsonb(b),'day',trim(to_char(a.attendance_date,'Day')),'check_in_text',to_char(a.check_in_at at time zone $4,'YYYY-MM-DD HH24:MI'),'check_out_text',to_char(a.check_out_at at time zone $4,'YYYY-MM-DD HH24:MI')) payload
 from public.attendance_records a join public.students s on s.id=a.student_id left join public.batches b on b.id=a.batch_id
 where (coalesce($5->>'studentId','')='' or a.student_id::text=$5->>'studentId')
 and (coalesce($5->>'batchId','')='' or a.batch_id::text=$5->>'batchId')
 and (coalesce($5->>'from','')='' or a.attendance_date>=($5->>'from')::date)
 and (coalesce($5->>'to','')='' or a.attendance_date<=($5->>'to')::date)$source$;
 elsif p_resource='corrections' then
 source_sql:=$source$select c.id,to_jsonb(c)||jsonb_build_object('student',to_jsonb(s),'batch',to_jsonb(b),'attendance_date',a.attendance_date,'current',a.status,'requested',c.corrected_values->>'status','attendance',to_jsonb(a)||jsonb_build_object('student',to_jsonb(s),'batch',to_jsonb(b))) payload
 from public.attendance_corrections c join public.attendance_records a on a.id=c.attendance_id
 left join public.students s on s.id=a.student_id left join public.batches b on b.id=a.batch_id$source$;
 else raise exception 'Invalid attendance resource';end if;
 execute 'with source as ('||source_sql||'), filtered as(select * from source where public.list_columns_match(payload,$1)), totals as(select count(*) total,least($2,greatest(1,ceil(count(*)::numeric/$3)::int)) page from filtered), page_rows as(
 select * from filtered order by case when $7=''asc'' then public.list_column_value(payload,$6) end asc nulls last,case when $7=''desc'' then public.list_column_value(payload,$6) end desc nulls last,id
 offset ((select page from totals)-1)*$3 limit $3)
 select jsonb_build_object(''rows'',coalesce((select jsonb_agg(payload order by case when $7=''asc'' then public.list_column_value(payload,$6) end asc nulls last,case when $7=''desc'' then public.list_column_value(payload,$6) end desc nulls last,id) from page_rows),''[]''::jsonb),''total'',(select total from totals),''page'',(select page from totals))'
 into result using p_columns,p_page,p_size,tz,p_scope,p_sort,p_direction;
 return result;
end;
$$;
revoke all on function public.get_attendance_table_page(text,integer,integer,jsonb,text,text,jsonb) from public,anon;
grant execute on function public.get_attendance_table_page(text,integer,integer,jsonb,text,text,jsonb) to authenticated;
commit;
