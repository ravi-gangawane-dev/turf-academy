begin;
do $$ begin
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and is_active limit 1),true);
end $$;
set local role authenticated;
do $$
declare a jsonb; sample jsonb; filters jsonb; c text; d text;
begin
 a:=public.get_staff_list_page('batches',1,5);
 sample:=a->'rows'->0;
 if sample is null then raise exception 'Need a batch fixture'; end if;
 filters:=jsonb_build_object('batch',sample->>'name','schedule',sample->>'schedule_text','coach',sample->>'coach_text','capacity',sample->>'capacity','columnStatus',sample->>'status','fee',sample->>'monthly_fee');
 a:=public.get_staff_list_page('batches',1,5,filters);
 if (a->>'total')::int<1 then raise exception 'Combined batch filters missed row'; end if;
 foreach c in array array['batch','schedule','coach','columnStatus'] loop
  a:=public.get_staff_list_page('batches',1,5,jsonb_build_object(c,'__no_match__'));
  if a->>'total'<>'0' then raise exception 'Filter % ignored',c; end if;
 end loop;
 foreach c in array array['schedule','coach','fee','capacity','status'] loop
  foreach d in array array['asc','desc'] loop
   a:=public.get_staff_list_page('batches',1,5,jsonb_build_object('sortBy',c,'sortDirection',d));
   if jsonb_array_length(a->'rows')>5 then raise exception 'Unbounded page'; end if;
  end loop;
 end loop;
 a:=public.get_staff_list_page('allocations',1,5);
 sample:=a->'rows'->0;
 if sample is null then raise exception 'Need an allocation fixture'; end if;
 filters:=jsonb_build_object('student',sample->'student'->>'full_name','batch',sample->'batch'->>'name','columnStatus',sample->>'status','start',sample->>'valid_from','sortBy','batch');
 a:=public.get_staff_list_page('allocations',1,5,filters);
 if (a->>'total')::int<1 then raise exception 'Combined allocation filters missed row'; end if;
 a:=public.get_staff_list_page('allocations',999,5,'{"student":"__no_match__"}');
 if a->>'total'<>'0' or a->>'page'<>'1' then raise exception 'Empty page failed'; end if;
end $$;
rollback;
