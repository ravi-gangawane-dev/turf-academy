-- Run against the linked test database inside one transaction. Every fixture is rolled back.
begin;
create temporary table ads_fixture (name text primary key, id uuid) on commit drop;
do $$
declare p uuid; b1 uuid; b2 uuid; s1 uuid; s2 uuid; suffix text := gen_random_uuid()::text;
begin
  insert into public.fee_plans(name,monthly_fee,duration_months) values('ADS plan '||suffix,1000,1) returning id into p;
  insert into public.batches(code,name,capacity,fee_plan_id) values('ADS-A-'||suffix,'ADS batch A',10,p) returning id into b1;
  insert into public.batches(code,name,capacity,fee_plan_id) values('ADS-B-'||suffix,'ADS batch B',10,p) returning id into b2;
  insert into public.students(student_code,full_name,date_of_birth) values('ADS-S1-'||suffix,'ADS One '||suffix,'2014-01-01') returning id into s1;
  insert into public.students(student_code,full_name,date_of_birth) values('ADS-S2-'||suffix,'ADS Two '||suffix,'2015-02-02') returning id into s2;
  -- Day 1: present + late on batch A, checked_out and absent on batch B
  -- (attendance_records is unique per student, batch and date).
  insert into public.attendance_records(student_id,batch_id,attendance_date,status) values
    (s1,b1,'2028-06-01','present'),
    (s2,b1,'2028-06-01','late'),
    (s1,b2,'2028-06-01','checked_out'),
    (s2,b2,'2028-06-01','absent');
  -- Day 15: two late rows only; every other day of the month must be absent from the result.
  insert into public.attendance_records(student_id,batch_id,attendance_date,status) values
    (s1,b1,'2028-06-15','late'),
    (s2,b1,'2028-06-15','late');
  insert into ads_fixture values('plan',p),('batchA',b1),('batchB',b2),('student1',s1),('student2',s2);
end $$;

do $$
declare r record; day1 record; day15 record; day_count integer := 0; batch_only record; status_only record;
begin
  -- Full month: grouped per-day counts with correct totals.
  for r in select * from public.get_attendance_day_stats('2028-06-01','2028-06-30') loop
    day_count := day_count + 1;
    if r.day = '2028-06-01' then
      day1 := r;
    elsif r.day = '2028-06-15' then
      day15 := r;
    elsif r.day <> '2028-06-01' and r.day <> '2028-06-15' then
      raise exception 'Unexpected day row % with counts', r.day;
    end if;
  end loop;
  if day_count <> 2 then raise exception 'Expected exactly two grouped day rows, got %', day_count; end if;
  if day1.present <> 1 or day1.absent <> 1 or day1.late <> 1 or day1.checked_out <> 1 or day1.total <> 4 then
    raise exception 'Day 1 counts wrong: %', to_jsonb(day1);
  end if;
  if day15.late <> 2 or day15.total <> 2 or day15.present <> 0 then
    raise exception 'Day 15 counts wrong: %', to_jsonb(day15);
  end if;

  -- Batch scope: only batch A rows count (day 1 becomes present1/late1 = 2).
  select * into batch_only from public.get_attendance_day_stats('2028-06-01','2028-06-01',(select id from ads_fixture where name='batchA'),null,null);
  if batch_only.total <> 2 or batch_only.checked_out <> 0 or batch_only.absent <> 0 then
    raise exception 'Batch scope wrong: %', to_jsonb(batch_only);
  end if;

  -- Status scope: filtering to late returns only late counts (matches previous client filter).
  select * into status_only from public.get_attendance_day_stats('2028-06-01','2028-06-01',null,null,'late');
  if status_only.late <> 1 or status_only.present <> 0 or status_only.total <> 1 then
    raise exception 'Status scope wrong: %', to_jsonb(status_only);
  end if;

  -- Student scope is honoured.
  if (select coalesce(sum(total),0) from public.get_attendance_day_stats('2028-06-01','2028-06-30',null,(select id from ads_fixture where name='student2'),null)) <> 3 then
    raise exception 'Student scope wrong';
  end if;
end $$;

-- Invalid ranges are rejected with the documented message.
do $$ begin
  begin
    perform * from public.get_attendance_day_stats('2028-06-30','2028-06-01');
    raise exception 'Reversed range was unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid attendance stats date range' then raise; end if;
  end;
  begin
    perform * from public.get_attendance_day_stats(null, '2028-06-30');
    raise exception 'Null range was unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid attendance stats date range' then raise; end if;
  end;
end $$;

-- Anonymous execution is denied.
do $$ begin
  if has_function_privilege('anon', 'public.get_attendance_day_stats(date,date,uuid,uuid,text)', 'execute') then
    raise exception 'Anonymous EXECUTE must be denied';
  end if;
end $$;

rollback;
