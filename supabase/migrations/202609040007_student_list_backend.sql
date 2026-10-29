begin;

alter table public.students rename column admission_number to student_code;
alter table public.students add column if not exists photo_url text;

create index if not exists students_full_name_lower_idx on public.students (lower(full_name));
create index if not exists students_phone_idx on public.students (phone);
create index if not exists students_status_idx on public.students (status);
create index if not exists enrollments_batch_student_idx on public.enrollments (batch_id, student_id);
create index if not exists batch_coaches_coach_batch_idx on public.batch_coaches (coach_id, batch_id);
create index if not exists student_parents_primary_idx on public.student_parents (student_id, is_primary desc);

create or replace function public.get_student_summary()
returns table(total bigint, active bigint, inactive bigint, new_this_month bigint, graduated bigint)
language sql stable security invoker set search_path = public
as $$
  select count(*),
    count(*) filter (where status::text = 'active'),
    count(*) filter (where status::text = 'inactive'),
    count(*) filter (where created_at >= date_trunc('month', now())),
    count(*) filter (where status::text = 'graduated')
  from public.students;
$$;

create or replace function public.get_student_list(
  p_search text default null, p_batch_id uuid default null, p_program_id uuid default null,
  p_coach_id uuid default null, p_status text default null,
  p_page integer default 1, p_page_size integer default 10)
returns table(student_id uuid, student_code text, full_name text, photo_url text,
  batch_id uuid, batch_name text, program_id uuid, program_name text,
  coach_id uuid, coach_name text, date_of_birth date, phone text, status text,
  parent_name text, parent_phone text, join_date date, total_count bigint)
language sql stable security invoker set search_path = public
as $$
  with rows as (
    select s.id student_id, s.student_code, s.full_name, s.photo_url,
      b.id batch_id, b.name batch_name, fp.id program_id, fp.name program_name,
      c.id coach_id, c.full_name coach_name, s.date_of_birth, s.phone,
      s.status::text status, p.full_name parent_name, p.phone parent_phone, s.joined_on join_date
    from public.students s
    left join lateral (
      select e.* from public.enrollments e where e.student_id = s.id
      order by (e.status in ('active','paused')) desc, e.valid_from desc limit 1
    ) e on true
    left join public.batches b on b.id = e.batch_id
    left join public.fee_plans fp on fp.id = e.fee_plan_id
    left join lateral (
      select bc.coach_id from public.batch_coaches bc where bc.batch_id = b.id
      order by bc.is_primary desc, bc.assigned_at limit 1
    ) bc on true
    left join public.coaches c on c.id = bc.coach_id
    left join lateral (
      select pr.full_name, pr.phone from public.student_parents sp
      join public.parents pr on pr.id = sp.parent_id where sp.student_id = s.id
      order by sp.is_primary desc, sp.created_at limit 1
    ) p on true
    where (nullif(trim(p_search), '') is null or s.full_name ilike '%' || trim(p_search) || '%'
      or s.student_code ilike '%' || trim(p_search) || '%' or coalesce(s.phone,'') ilike '%' || trim(p_search) || '%')
      and (p_batch_id is null or b.id = p_batch_id)
      and (p_program_id is null or fp.id = p_program_id)
      and (p_coach_id is null or c.id = p_coach_id)
      and (nullif(p_status, '') is null or s.status::text = p_status)
  )
  select r.*, count(*) over() total_count from rows r order by r.full_name
  limit greatest(1, least(p_page_size, 10000))
  offset (greatest(1, p_page) - 1) * greatest(1, least(p_page_size, 10000));
$$;

grant execute on function public.get_student_summary() to authenticated;
grant execute on function public.get_student_list(text,uuid,uuid,uuid,text,integer,integer) to authenticated;

insert into public.fee_plans(id,name,description,duration_months,monthly_fee,status) values
('10000000-0000-4000-8000-000000000001','Advanced Program','Advanced cricket development',12,3500,'active'),
('10000000-0000-4000-8000-000000000002','Beginners Program','Cricket foundations',12,2000,'active'),
('10000000-0000-4000-8000-000000000003','Elite Program','High-performance cricket',12,5000,'active')
on conflict (name) do update set description=excluded.description;

insert into public.coaches(id,employee_code,full_name,phone,status) values
('20000000-0000-4000-8000-000000000001','C001','Rahul Patil','9876501001','active'),
('20000000-0000-4000-8000-000000000002','C002','Amit Deshmukh','9876501002','active'),
('20000000-0000-4000-8000-000000000003','C003','Karan Jadhav','9876501003','active'),
('20000000-0000-4000-8000-000000000004','C004','Siddharth More','9876501004','active')
on conflict (employee_code) do update set full_name=excluded.full_name, phone=excluded.phone;

insert into public.batches(id,code,name,age_group,skill_level,capacity,fee_plan_id,status) values
('30000000-0000-4000-8000-000000000001','U14-A','U14 - Advanced','U14','Advanced',30,'10000000-0000-4000-8000-000000000001','active'),
('30000000-0000-4000-8000-000000000002','U12-B','U12 - Beginners','U12','Beginner',30,'10000000-0000-4000-8000-000000000002','active'),
('30000000-0000-4000-8000-000000000003','U16-E','U16 - Elite','U16','Elite',25,'10000000-0000-4000-8000-000000000003','active'),
('30000000-0000-4000-8000-000000000004','U18-E','U18 - Elite','U18','Elite',25,'10000000-0000-4000-8000-000000000003','active')
on conflict (code) do update set name=excluded.name, fee_plan_id=excluded.fee_plan_id;

insert into public.batch_coaches(batch_id,coach_id,is_primary) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',true),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',true),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',true),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004',true)
on conflict (batch_id,coach_id) do update set is_primary=true;

insert into public.students(id,student_code,full_name,date_of_birth,skill_level,phone,status,joined_on) values
('40000000-0000-4000-8000-000000000001','STU001','Aarav Sharma','2010-03-12','Advanced','9876543210','active','2024-06-10'),
('40000000-0000-4000-8000-000000000002','STU002','Vihaan Kulkarni','2012-08-08','Beginner','8765432109','active','2024-06-15'),
('40000000-0000-4000-8000-000000000003','STU003','Aditya Mehta','2009-01-21','Elite','7654321098','active','2024-07-01'),
('40000000-0000-4000-8000-000000000004','STU004','Kabir Khan','2010-11-30','Advanced','6543210987','inactive','2024-06-12'),
('40000000-0000-4000-8000-000000000005','STU005','Reyansh Gupta','2008-04-14','Elite','7890123456','active','2024-05-20')
on conflict (student_code) do update set full_name=excluded.full_name, status=excluded.status;

insert into public.parents(id,full_name,relation,phone,status) values
('50000000-0000-4000-8000-000000000001','Vikram Sharma','Father','9876543211','active'),
('50000000-0000-4000-8000-000000000002','Sonal Kulkarni','Mother','8765432100','active'),
('50000000-0000-4000-8000-000000000003','Neha Mehta','Mother','7654321090','active'),
('50000000-0000-4000-8000-000000000004','Imran Khan','Father','6543210980','active'),
('50000000-0000-4000-8000-000000000005','Pooja Gupta','Mother','7890123450','active')
on conflict (id) do update set full_name=excluded.full_name, phone=excluded.phone;

insert into public.student_parents(student_id,parent_id,is_primary) values
('40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',true),
('40000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002',true),
('40000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003',true),
('40000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000004',true),
('40000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000005',true)
on conflict (student_id,parent_id) do update set is_primary=true;

insert into public.enrollments(id,student_id,batch_id,fee_plan_id,status,valid_from,monthly_fee) values
('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','active','2024-06-10',3500),
('60000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','active','2024-06-15',2000),
('60000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','active','2024-07-01',5000),
('60000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','cancelled','2024-06-12',3500),
('60000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','active','2024-05-20',5000)
on conflict (id) do update set status=excluded.status;

commit;
