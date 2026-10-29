begin;
do $$ begin
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and is_active limit 1),true);
end $$;
set local role authenticated;
do $$
declare a jsonb; sample jsonb; resource text; key text; filters jsonb; value text;
begin
 foreach resource in array array['plans','coaches','discounts','late-fees','pending','summary','charges','enrollments'] loop
  a:=public.get_staff_list_page(resource,1,5,'{}');sample:=a->'rows'->0;
  foreach key in array array['name','student','batch','plan','contact','experience','duration','fee','totalFee','period','status','base','paid','balance'] loop
   value:=public.list_column_value(sample,key);
   if value is not null and value<>'' then
    filters:=jsonb_build_object('cf_'||key,value,'sortBy','cf_'||key,'sortDirection','asc');
    a:=public.get_staff_list_page(resource,1,5,filters);
    if (a->>'total')::int<1 then raise exception 'Filter % failed for %',key,resource; end if;
    if jsonb_array_length(a->'rows')>5 then raise exception 'Unbounded results'; end if;
    perform public.get_staff_list_page(resource,1,5,filters||'{"sortDirection":"desc"}');
   end if;
  end loop;
  a:=public.get_staff_list_page(resource,1,5,'{"cf_name":"__no_match__"}');
  if a->>'total'<>'0' then raise exception 'Filter ignored for %',resource; end if;
 end loop;
 a:=public.get_student_columns_page(1,5,'{}','full_name','asc');sample:=a->'rows'->0;
 if sample is not null then
  a:=public.get_student_columns_page(1,5,jsonb_build_object('cf_full_name',sample->>'full_name','cf_date_of_birth',sample->>'date_of_birth'),'full_name','asc');
  if (a->>'total')::int<1 then raise exception 'Student combined filter failed'; end if;
 end if;
 perform * from public.parent_directory_columns limit 5;
 a:=public.get_payment_list_page('list',0,5,null,'','all','date','desc','{"cf_receipt":"__no_match__"}');
 if a->>'total'<>'0' then raise exception 'Payment column filter ignored'; end if;
end $$;
rollback;
