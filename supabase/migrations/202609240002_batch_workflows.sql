begin;
create table public.batch_waitlist (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.batches(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 status text not null default 'waiting' check(status in ('waiting','promoted','removed')),
 enrollment_id uuid references public.enrollments(id) on delete set null,
 created_at timestamptz not null default now(), created_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);
create unique index batch_waitlist_open on public.batch_waitlist(batch_id,student_id) where status='waiting';
alter table public.batch_waitlist enable row level security;
create policy batch_waitlist_staff_read on public.batch_waitlist for select to authenticated using(public.is_admin_or_receptionist());
grant select on public.batch_waitlist to authenticated;

create function public.save_batch_workspace(p_batch jsonb,p_days integer[],p_coaches jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid := coalesce(nullif(p_batch->>'id','')::uuid,gen_random_uuid()); coach jsonb;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 if nullif(trim(p_batch->>'name'),'') is null or nullif(trim(p_batch->>'code'),'') is null or cardinality(p_days)=0 or p_days is null then raise exception 'batch_name_code_days_required'; end if;
 perform 1 from public.batches where id=bid for update;
 if (p_batch->>'capacity')::integer < (select count(*) from public.enrollments where batch_id=bid and status='active') then raise exception 'capacity_below_enrolled_students'; end if;
 if (p_batch->>'waitlist_capacity')::integer < (select count(*) from public.batch_waitlist where batch_id=bid and status='waiting') then raise exception 'waitlist_capacity_below_waiting_students'; end if;
 if jsonb_array_length(p_coaches)>0 and (select count(*) from jsonb_array_elements(p_coaches) c where (c->>'is_primary')::boolean)>1 then raise exception 'only_one_primary_coach'; end if;
 insert into public.batches(id,code,name,age_group,skill_level,capacity,waitlist_capacity,start_date,end_date,start_time,end_time,fee_plan_id,status,description)
 values(bid,trim(p_batch->>'code'),trim(p_batch->>'name'),nullif(p_batch->>'age_group',''),nullif(p_batch->>'skill_level',''),(p_batch->>'capacity')::integer,coalesce((p_batch->>'waitlist_capacity')::integer,0),nullif(p_batch->>'start_date','')::date,nullif(p_batch->>'end_date','')::date,nullif(p_batch->>'start_time','')::time,nullif(p_batch->>'end_time','')::time,nullif(p_batch->>'fee_plan_id','')::uuid,coalesce(p_batch->>'status','active')::public.record_status,nullif(p_batch->>'description',''))
 on conflict(id) do update set code=excluded.code,name=excluded.name,age_group=excluded.age_group,skill_level=excluded.skill_level,capacity=excluded.capacity,waitlist_capacity=excluded.waitlist_capacity,start_date=excluded.start_date,end_date=excluded.end_date,start_time=excluded.start_time,end_time=excluded.end_time,fee_plan_id=excluded.fee_plan_id,status=excluded.status,description=excluded.description,updated_at=now();
 delete from public.batch_days where batch_id=bid;
 insert into public.batch_days(batch_id,day_of_week) select bid,d from unnest(p_days) d;
 delete from public.batch_coaches where batch_id=bid;
 for coach in select * from jsonb_array_elements(p_coaches) loop
   if not exists(select 1 from public.coaches where id=(coach->>'coach_id')::uuid and status='active') then raise exception 'coach_not_active'; end if;
   insert into public.batch_coaches(batch_id,coach_id,is_primary) values(bid,(coach->>'coach_id')::uuid,coalesce((coach->>'is_primary')::boolean,false));
 end loop;
 return bid;
end $$;

create function public.set_batch_coach(p_batch_id uuid,p_coach_id uuid,p_role text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 if p_role not in ('primary','assistant','remove') then raise exception 'invalid_coach_role'; end if;
 perform 1 from public.batches where id=p_batch_id for update;
 if not found then raise exception 'batch_not_found'; end if;
 if p_role='remove' then delete from public.batch_coaches where batch_id=p_batch_id and coach_id=p_coach_id; return; end if;
 if not exists(select 1 from public.coaches where id=p_coach_id and status='active') then raise exception 'coach_not_active'; end if;
 if p_role='primary' then update public.batch_coaches set is_primary=false where batch_id=p_batch_id; end if;
 insert into public.batch_coaches(batch_id,coach_id,is_primary) values(p_batch_id,p_coach_id,p_role='primary')
 on conflict(batch_id,coach_id) do update set is_primary=excluded.is_primary;
end $$;

create function public.manage_batch_waitlist(p_batch_id uuid,p_student_id uuid,p_action text,p_valid_from date default current_date)
returns uuid language plpgsql security definer set search_path='' as $$
declare b public.batches; w public.batch_waitlist; eid uuid;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 select * into strict b from public.batches where id=p_batch_id for update;
 select * into w from public.batch_waitlist where batch_id=p_batch_id and student_id=p_student_id and status='waiting' for update;
 if p_action='add' then
   if w.id is not null then return w.id; end if;
   if b.status<>'active' or not exists(select 1 from public.students where id=p_student_id and status='active') then raise exception 'batch_and_student_must_be_active'; end if;
   if (select count(*) from public.batch_waitlist where batch_id=p_batch_id and status='waiting')>=b.waitlist_capacity then raise exception 'waitlist_full'; end if;
   insert into public.batch_waitlist(batch_id,student_id,created_by) values(p_batch_id,p_student_id,auth.uid()) returning id into eid; return eid;
 elsif p_action='remove' then
   update public.batch_waitlist set status='removed',updated_at=now() where id=w.id; return w.id;
 elsif p_action='promote' then
   if w.id is null then raise exception 'waiting_student_not_found'; end if;
   eid := (public.create_enrollment(p_student_id,p_batch_id,b.fee_plan_id,p_valid_from,null,'Promoted from batch waitlist')).id;
   update public.batch_waitlist set status='promoted',enrollment_id=eid,updated_at=now() where id=w.id;
   return eid;
 end if;
 raise exception 'invalid_waitlist_action';
end $$;
revoke all on function public.save_batch_workspace(jsonb,integer[],jsonb),public.set_batch_coach(uuid,uuid,text),public.manage_batch_waitlist(uuid,uuid,text,date) from public,anon;
grant execute on function public.save_batch_workspace(jsonb,integer[],jsonb),public.set_batch_coach(uuid,uuid,text),public.manage_batch_waitlist(uuid,uuid,text,date) to authenticated;
commit;
