begin;
-- Populate enough rows for meaningful page checks, rolled back at the end.
insert into public.batch_waitlist(batch_id,student_id,created_at)
 select b.id,s.id,'2026-10-13 20:00:00+00'::timestamptz
 from (select id from public.batches order by id limit 1) b
 cross join (select id from public.students order by id limit 7) s
 on conflict (batch_id,student_id) where status='waiting' do nothing;
do $$ begin
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and is_active limit 1),true);
end $$;
set local role authenticated;
do $$
declare a jsonb; b jsonb; c text; d text; expected jsonb; sample jsonb; tz text; filters jsonb;
begin
 select coalesce(timezone,'Asia/Kolkata') into tz from public.academy_settings where id=true;
 foreach c in array array['student_name','batch_name','created_at'] loop
  foreach d in array array['asc','desc'] loop
   a:=public.get_batch_waitlist_page(1,5,'{}',c,d);
   b:=public.get_batch_waitlist_page(2,5,'{}',c,d);
   if (a->>'total')::int<7 then raise exception 'Need at least 7 fixture records'; end if;
   if jsonb_array_length(a->'rows')<>5 or a->'total' is distinct from b->'total' then raise exception 'Invalid page/count'; end if;
   if exists(select 1 from jsonb_array_elements(a->'rows') x join jsonb_array_elements(b->'rows') y on x->>'id'=y->>'id') then raise exception 'Overlapping pages'; end if;
   execute format('select jsonb_agg(id order by %I %s,id) from (select w.id,s.full_name student_name,b.name batch_name,w.created_at from public.batch_waitlist w join public.students s on s.id=w.student_id join public.batches b on b.id=w.batch_id where w.status=''waiting'' order by %I %s,w.id limit 5) t',c,d,c,d) into expected;
   if (select jsonb_agg(x->'id') from jsonb_array_elements(a->'rows') x) is distinct from expected then raise exception 'Incorrect sort'; end if;
  end loop;
 end loop;
 sample:=a->'rows'->0;
 filters:=jsonb_build_object('student',sample->>'student_name','batch',sample->>'batch_name','batchId',sample->>'batch_id','date',((sample->>'created_at')::timestamptz at time zone coalesce(tz,'Asia/Kolkata'))::date);
 a:=public.get_batch_waitlist_page(1,5,filters);
 if (a->>'total')::int<1 then raise exception 'Combined filters missed row'; end if;
 a:=public.get_batch_waitlist_page(999,5,'{"student":"__no_match__"}');
 if a->>'page'<>'1' or a->>'total'<>'0' or a->'rows'<>'[]'::jsonb then raise exception 'Empty page not clamped'; end if;
 a:=public.get_staff_list_page('batches',1,5,'{"view":"capacity","omitWaitlist":"true"}');
 if a->'options'->'waiting'<>'[]'::jsonb then raise exception 'Full waitlist leaked in options'; end if;
 begin
  perform public.get_batch_waitlist_page(1,5,'{}','invalid','asc');
  raise exception 'Invalid sort accepted' using errcode='XX000';
 exception when raise_exception then null; end;
 begin
  perform public.get_batch_waitlist_page(1,7);
  raise exception 'Invalid size accepted' using errcode='XX000';
 exception when raise_exception then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 a:=public.get_batch_waitlist_page();
 if a->>'total'<>'0' then raise exception 'RLS bypass'; end if;
end $$;
rollback;
