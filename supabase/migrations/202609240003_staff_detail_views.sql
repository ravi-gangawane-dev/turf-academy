begin;
create function public.get_parent_activity(p_parent_id uuid,p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 with events as (
 select a.id,a.action,a.table_name,a.occurred_at as created_at,coalesce(p.full_name,'System') actor
 from public.audit_logs a left join public.profiles p on p.id=a.actor_id
 where (a.table_name='parents' and a.record_id=p_parent_id::text)
 or (a.table_name='students' and a.record_id in (select student_id::text from public.student_parents where parent_id=p_parent_id))
 ), page as (select * from events order by created_at desc,id limit least(greatest(p_limit,1),100) offset greatest(p_offset,0))
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from events)) into result;
 return result;
end $$;
create function public.get_coach_attendance_summary(p_coach_id uuid,p_from date,p_to date)
returns table(batch_id uuid,batch_name text,present bigint,late bigint,absent bigint,total bigint)
language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 if p_to<p_from then raise exception 'invalid_date_range'; end if;
 return query select b.id,b.name,count(a.id) filter(where a.status::text='present'),count(a.id) filter(where a.status::text='late'),count(a.id) filter(where a.status::text='absent'),count(a.id)
 from public.batch_coaches bc join public.batches b on b.id=bc.batch_id
 left join public.attendance_records a on a.batch_id=b.id and a.attendance_date between p_from and p_to
 where bc.coach_id=p_coach_id group by b.id,b.name order by b.name;
end $$;
create function public.search_academy(p_query text)
returns table(id uuid,label text,detail text,kind text)
language plpgsql stable security invoker set search_path='' as $$
declare term text := '%'||replace(replace(replace(trim(p_query),'\','\\'),'%','\%'),'_','\_')||'%';
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 if length(trim(p_query))<2 then return; end if;
 return query
 (select s.id,s.full_name,s.student_code,'students'::text from public.students s where s.full_name ilike term or s.student_code ilike term order by s.full_name limit 20)
 union all (select p.id,p.full_name,p.phone,'parents'::text from public.parents p where p.full_name ilike term or p.phone ilike term order by p.full_name limit 20)
 union all (select c.id,c.full_name,c.employee_code,'coaches'::text from public.coaches c where c.full_name ilike term or c.employee_code ilike term order by c.full_name limit 20)
 union all (select b.id,b.name,b.code,'batches'::text from public.batches b where b.name ilike term or b.code ilike term order by b.name limit 20);
end $$;
revoke all on function public.get_parent_activity(uuid,integer,integer),public.get_coach_attendance_summary(uuid,date,date),public.search_academy(text) from public,anon;
grant execute on function public.get_parent_activity(uuid,integer,integer),public.get_coach_attendance_summary(uuid,date,date),public.search_academy(text) to authenticated;
commit;
