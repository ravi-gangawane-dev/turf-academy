begin;
create or replace function public.get_student_detail_page(p_resource text,p_page integer,p_size integer,p_columns jsonb,p_sort text,p_direction text,p_scope jsonb default '{}')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare source_sql text;result jsonb;tz text;
begin
 if p_page<1 or p_size not in (5,10,20,50,100,500) or p_direction not in ('asc','desc') then raise exception 'Invalid student page';end if;
 select coalesce(timezone,'Asia/Kolkata') into tz from public.academy_settings where id=true;
 tz:=coalesce(tz,'Asia/Kolkata');
 if p_resource='attendance' then
 source_sql:=$source$select a.id,to_jsonb(a)||jsonb_build_object('batch',jsonb_build_object('name',b.name),'recorder',jsonb_build_object('full_name',pr.full_name),'recorder_text',pr.full_name,'check_in_text',to_char(a.check_in_at at time zone $4,'HH24:MI'),'check_out_text',to_char(a.check_out_at at time zone $4,'HH24:MI')) payload from public.attendance_records a left join public.batches b on b.id=a.batch_id left join public.profiles pr on pr.id=a.recorded_by where a.student_id=($5->>'studentId')::uuid$source$;
 elsif p_resource='payments' then
 source_sql:=$source$select a.id,to_jsonb(a)||jsonb_build_object('recorder',jsonb_build_object('full_name',pr.full_name),'recorder_text',pr.full_name,'paid_day',(a.paid_at at time zone $4)::date,'reference',coalesce(a.provider_reference,a.client_reference)) payload from public.payments a left join public.profiles pr on pr.id=a.recorded_by where a.student_id=($5->>'studentId')::uuid$source$;
 elsif p_resource='documents' then
 source_sql:=$source$select a.id,to_jsonb(a)||jsonb_build_object('uploader',jsonb_build_object('full_name',pr.full_name),'uploader_text',pr.full_name,'uploaded_day',(a.created_at at time zone $4)::date) payload from public.student_documents a left join public.profiles pr on pr.id=a.uploaded_by where a.student_id=($5->>'studentId')::uuid$source$;
 elsif p_resource='timeline' then
 source_sql:=$source$select id,jsonb_build_object('id',id,'date',date,'event_day',(date at time zone $4)::date,'title',title,'detail',detail) payload from(
 select id,created_at date,'Attendance' title,status::text detail from public.attendance_records where student_id=($5->>'studentId')::uuid
 union all select id,paid_at,'Payment',status::text from public.payments where student_id=($5->>'studentId')::uuid
 union all select id,created_at,'Document',file_name from public.student_documents where student_id=($5->>'studentId')::uuid) events$source$;
 else raise exception 'Invalid student resource';end if;
 execute 'with source as ('||source_sql||'), filtered as(select * from source where public.list_columns_match(payload,$1 - ''cf_size_bytes'') and (coalesce($1->>''cf_size_bytes'','''')='''' or payload->>''size_bytes''=$1->>''cf_size_bytes'')), totals as(select count(*) total,least($2,greatest(1,ceil(count(*)::numeric/$3)::int)) page from filtered), page_rows as(
 select * from filtered order by case when $7=''asc'' and $6 in (''amount'',''size_bytes'') then nullif(payload->>$6,'''')::numeric end asc nulls last,case when $7=''asc'' and $6 not in (''amount'',''size_bytes'') then public.list_column_value(payload,$6) end asc nulls last,case when $7=''desc'' and $6 in (''amount'',''size_bytes'') then nullif(payload->>$6,'''')::numeric end desc nulls last,case when $7=''desc'' and $6 not in (''amount'',''size_bytes'') then public.list_column_value(payload,$6) end desc nulls last,id
 offset ((select page from totals)-1)*$3 limit $3)
 select jsonb_build_object(''rows'',coalesce((select jsonb_agg(payload order by case when $7=''asc'' and $6 in (''amount'',''size_bytes'') then nullif(payload->>$6,'''')::numeric end asc nulls last,case when $7=''asc'' and $6 not in (''amount'',''size_bytes'') then public.list_column_value(payload,$6) end asc nulls last,case when $7=''desc'' and $6 in (''amount'',''size_bytes'') then nullif(payload->>$6,'''')::numeric end desc nulls last,case when $7=''desc'' and $6 not in (''amount'',''size_bytes'') then public.list_column_value(payload,$6) end desc nulls last,id) from page_rows),''[]''::jsonb),''total'',(select total from totals),''page'',(select page from totals))'
 into result using p_columns,p_page,p_size,tz,p_scope,p_sort,p_direction;
 return result;
end;
$$;
revoke all on function public.get_student_detail_page(text,integer,integer,jsonb,text,text,jsonb) from public,anon;
grant execute on function public.get_student_detail_page(text,integer,integer,jsonb,text,text,jsonb) to authenticated;
commit;
