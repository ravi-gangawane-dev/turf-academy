begin;

-- Complete the existing student and guardian profiles so profile, list, and detail
-- screens all render meaningful values from the same records.
update public.students set
  gender = case student_code
    when 'STU007' then 'Female'
    else 'Male'
  end,
  email = lower(replace(full_name, ' ', '.')) || '@student.turfacademy.in',
  address = jsonb_build_object(
    'address', case student_code
      when 'STU001' then '18, Baner Road'
      when 'STU002' then '42, Kothrud Depot Road'
      when 'STU003' then '7, Model Colony'
      when 'STU004' then '29, Camp Area'
      when 'STU005' then '15, Aundh Road'
      when 'STU006' then '21, Green Park Society'
      else '11, Prabhat Road'
    end,
    'city', 'Pune',
    'state', 'Maharashtra',
    'pinCode', case student_code
      when 'STU001' then '411045'
      when 'STU002' then '411038'
      when 'STU003' then '411016'
      when 'STU004' then '411001'
      when 'STU005' then '411007'
      when 'STU006' then '411001'
      else '411004'
    end,
    'nationality', 'Indian'
  ),
  notes = 'Regular academy student. Emergency contact is the primary linked guardian.'
where student_code between 'STU001' and 'STU007';

update public.parents set
  whatsapp = phone,
  email = lower(replace(full_name, ' ', '.')) || '.parent@turfacademy.in',
  occupation = case relation when 'Mother' then 'Professional' else 'Business professional' end,
  address = jsonb_build_object('address', 'Pune', 'city', 'Pune', 'state', 'Maharashtra', 'pinCode', '411045')
where id between '50000000-0000-4000-8000-000000000001' and '50000000-0000-4000-8000-000000000012';

update public.coaches set
  email = coalesce(email, lower(replace(full_name, ' ', '.')) || '@turfacademy.in'),
  experience_years = case employee_code
    when 'C001' then 9 when 'C002' then 7 when 'C003' then 8 when 'C004' then 10
    else experience_years
  end,
  qualification = coalesce(qualification, 'BCCI Level 1 Certified Coach'),
  biography = coalesce(biography, 'Player-focused academy coach specialising in technique, fitness, and match preparation.')
where employee_code between 'C001' and 'C006';

insert into public.coach_specializations(coach_id, specialization)
select id, case employee_code
  when 'C001' then 'Batting & Technique'
  when 'C002' then 'Bowling & Fundamentals'
  when 'C003' then 'Match Strategy'
  when 'C004' then 'High Performance'
  when 'C005' then 'Batting'
  else 'Fielding & Fitness'
end
from public.coaches where employee_code between 'C001' and 'C006'
on conflict (coach_id, specialization) do nothing;

update public.batches set
  start_time = case code when 'U12-B' then '07:30'::time else '06:00'::time end,
  end_time = case code when 'U12-B' then '09:30'::time else '08:00'::time end,
  start_date = coalesce(start_date, '2026-06-01'),
  end_date = coalesce(end_date, '2027-03-31'),
  description = coalesce(description, name || ' structured cricket training at the Main Ground')
where code in ('U14-A','U12-B','U16-E','U18-E');

insert into public.batch_days(batch_id, day_of_week)
select id, day from public.batches cross join (values (0::smallint),(3::smallint),(6::smallint)) d(day)
where code in ('U14-A','U12-B','U16-E','U18-E')
on conflict (batch_id, day_of_week) do nothing;

-- Completed and upcoming schedule entries shared by staff and linked parents.
insert into public.training_sessions
  (id,batch_id,coach_id,title,session_date,start_time,end_time,venue,status,notes)
values
  ('71000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Batting practice','2026-09-06','06:00','08:00','Main Ground','upcoming','Bring batting kit and water bottle.'),
  ('71000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Fielding drills','2026-09-09','06:00','08:00','Main Ground','upcoming','High catches and ground fielding.'),
  ('71000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Bowling fundamentals','2026-09-06','07:30','09:30','Practice Nets','upcoming','Line, length, and run-up drills.'),
  ('71000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Fitness training','2026-09-09','07:30','09:30','Fitness Zone','upcoming','Mobility and cricket conditioning.'),
  ('71000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','Match simulation','2026-09-06','06:00','08:00','Match Ground','upcoming','Scenario-based match practice.'),
  ('71000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','High performance session','2026-09-06','06:00','08:00','Performance Centre','upcoming','Advanced skills assessment.'),
  ('71000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Match practice','2026-09-12','06:00','08:00','Main Ground','rescheduled','Rescheduled from 11 September.'),
  ('71000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Academy holiday','2026-09-13','07:30','09:30','Turf Cricket Academy','cancelled','Academy closed for maintenance.')
on conflict (id) do update set
  title=excluded.title,session_date=excluded.session_date,start_time=excluded.start_time,
  end_time=excluded.end_time,venue=excluded.venue,status=excluded.status,notes=excluded.notes;

-- Ten recent attendance rows per active student. Conflict handling makes the seed safe
-- to reapply and leaves unrelated operational records untouched.
insert into public.attendance_records
  (student_id,batch_id,attendance_date,check_in_at,check_out_at,status,source,idempotency_key)
select e.student_id, e.batch_id, d.attendance_date,
  case when d.status='absent' then null else (d.attendance_date::text || ' ' || d.check_in)::timestamptz end,
  case when d.status='absent' then null else (d.attendance_date::text || ' ' || d.check_out)::timestamptz end,
  d.status::public.attendance_status, 'manual',
  'sample-attendance-' || s.student_code || '-' || to_char(d.attendance_date,'YYYYMMDD')
from public.enrollments e
join public.students s on s.id=e.student_id
cross join (values
  ('2026-08-16'::date,'06:02','08:05','checked_out'),
  ('2026-08-19'::date,'06:00','08:00','checked_out'),
  ('2026-08-22'::date,'06:14','08:00','late'),
  ('2026-08-23'::date,'06:04','08:06','checked_out'),
  ('2026-08-26'::date,'06:01','08:01','checked_out'),
  ('2026-08-29'::date,'06:05','08:10','checked_out'),
  ('2026-08-30'::date,null,null,'absent'),
  ('2026-09-02'::date,'06:03','08:04','checked_out'),
  ('2026-09-03'::date,'06:12','08:00','late'),
  ('2026-09-05'::date,'06:02','08:05','checked_out')
) d(attendance_date,check_in,check_out,status)
where e.status='active' and s.student_code between 'STU001' and 'STU007'
on conflict (student_id,batch_id,attendance_date) do update set
  check_in_at=excluded.check_in_at,check_out_at=excluded.check_out_at,
  status=excluded.status,source=excluded.source;

-- Four monthly charges, including paid, partial, and pending states.
insert into public.monthly_charges
  (enrollment_id,student_id,charge_month,due_date,base_amount,discount_amount,late_fee_amount,status)
select e.id,e.student_id,m.charge_month,(m.charge_month + interval '9 days')::date,e.monthly_fee,
  case when m.charge_month='2026-08-01' then 250 else 0 end,
  case when m.charge_month='2026-09-01' then 100 else 0 end,
  case when m.charge_month in ('2026-06-01','2026-07-01','2026-08-01') then 'paid'::public.charge_status
       else 'partial'::public.charge_status end
from public.enrollments e
cross join (values ('2026-06-01'::date),('2026-07-01'::date),('2026-08-01'::date),('2026-09-01'::date)) m(charge_month)
join public.students s on s.id=e.student_id
where e.status='active' and s.student_code between 'STU001' and 'STU007'
on conflict (enrollment_id,charge_month) do update set
  due_date=excluded.due_date,base_amount=excluded.base_amount,
  discount_amount=excluded.discount_amount,late_fee_amount=excluded.late_fee_amount,
  status=excluded.status;

insert into public.payments
  (student_id,monthly_charge_id,amount,payment_mode,provider_reference,client_reference,status,paid_at,notes)
select c.student_id,c.id,
  case when c.charge_month='2026-09-01' then greatest(500,c.final_amount / 2) else c.final_amount end,
  case extract(month from c.charge_month)::int % 4
    when 0 then 'cash' when 1 then 'upi' when 2 then 'card' else 'bank_transfer' end,
  'TXN-' || s.student_code || '-' || to_char(c.charge_month,'YYYYMM'),
  'sample-payment-' || s.student_code || '-' || to_char(c.charge_month,'YYYYMM'),
  'successful', c.charge_month + interval '5 days 10 hours 30 minutes',
  case when c.charge_month='2026-09-01' then 'First instalment received' else 'Monthly academy fee' end
from public.monthly_charges c
join public.students s on s.id=c.student_id
where s.student_code between 'STU001' and 'STU007'
on conflict (client_reference) do update set
  amount=excluded.amount,payment_mode=excluded.payment_mode,
  provider_reference=excluded.provider_reference,status=excluded.status,paid_at=excluded.paid_at;

insert into public.receipts(payment_id,receipt_number,issued_at)
select p.id,'RCP-' || replace(upper(p.client_reference),'SAMPLE-PAYMENT-',''),p.paid_at
from public.payments p where p.client_reference like 'sample-payment-%'
on conflict (payment_id) do update set receipt_number=excluded.receipt_number,issued_at=excluded.issued_at;

-- Keep charge status authoritative after the sample payments are present.
update public.monthly_charges c set status = case
  when coalesce(x.paid,0) >= c.final_amount then 'paid'::public.charge_status
  when coalesce(x.paid,0) > 0 then 'partial'::public.charge_status
  when c.due_date < current_date then 'overdue'::public.charge_status
  else 'pending'::public.charge_status end
from (
  select monthly_charge_id,sum(amount) filter (where status='successful') paid
  from public.payments group by monthly_charge_id
) x where x.monthly_charge_id=c.id;

insert into public.student_medical_records
  (student_id,blood_group,allergies,conditions,medications,emergency_notes,doctor_name,doctor_phone)
select id,
  case (right(student_code,1)::int % 4) when 0 then 'A+' when 1 then 'O+' when 2 then 'B+' else 'AB+' end,
  'No known allergies','No medical conditions','None',
  'Guardian should be contacted for any injury.','Dr. Anjali Rao','020-26123456'
from public.students where student_code between 'STU001' and 'STU007'
on conflict (student_id) do update set
  blood_group=excluded.blood_group,allergies=excluded.allergies,conditions=excluded.conditions,
  medications=excluded.medications,emergency_notes=excluded.emergency_notes,
  doctor_name=excluded.doctor_name,doctor_phone=excluded.doctor_phone;

insert into public.student_documents
  (student_id,document_type,file_name,storage_path,mime_type,size_bytes)
select s.id,d.document_type,d.file_name,
  s.id::text || '/sample/' || d.storage_name,'application/pdf',d.size_bytes
from public.students s cross join (values
  ('Identity','Birth Certificate','birth-certificate.pdf',245760::bigint),
  ('Academic','School ID Card','school-id-card.pdf',184320::bigint),
  ('Medical','Fitness Certificate','fitness-certificate.pdf',307200::bigint)
) d(document_type,file_name,storage_name,size_bytes)
where s.student_code between 'STU001' and 'STU007'
on conflict (storage_path) do update set
  document_type=excluded.document_type,file_name=excluded.file_name,
  mime_type=excluded.mime_type,size_bytes=excluded.size_bytes;

-- Parent-specific messages cover every notification filter used by the portal.
insert into public.notifications
  (student_id,parent_id,channel,template_key,recipient,subject,body,status,sent_at,scheduled_at,read_at)
select sp.student_id,sp.parent_id,'in_app',n.template_key,p.phone,n.subject,
  replace(n.body,'{student}',s.full_name),'delivered',n.created_at,n.created_at,n.read_at
from public.student_parents sp
join public.parents p on p.id=sp.parent_id
join public.students s on s.id=sp.student_id
cross join (values
  ('attendance_check_in','Check-in recorded','{student} checked in at the academy at 6:02 AM.',now()-interval '2 hours',null::timestamptz),
  ('fee_reminder','Fee reminder','The September fee instalment for {student} is pending. Due date: 10 Sep 2026.',now()-interval '1 day',null::timestamptz),
  ('batch_schedule','Upcoming training session','The next training session for {student} is scheduled at the Main Ground.',now()-interval '2 days',now()-interval '1 day'),
  ('academy_announcement','Academy announcement','Inter-academy practice matches begin this month. The detailed schedule will be shared shortly.',now()-interval '3 days',now()-interval '2 days')
) n(template_key,subject,body,created_at,read_at)
where sp.is_primary and s.student_code between 'STU001' and 'STU007'
  and not exists (
    select 1 from public.notifications existing
    where existing.parent_id=sp.parent_id and existing.student_id=sp.student_id
      and existing.template_key=n.template_key and existing.subject=n.subject
  );

do $$
declare missing text;
begin
  select string_agg(section,', ') into missing from (values
    ('attendance', (select count(*) from public.attendance_records where idempotency_key like 'sample-attendance-%')),
    ('sessions', (select count(*) from public.training_sessions where id::text like '71000000-%')),
    ('charges', (select count(*) from public.monthly_charges c join public.students s on s.id=c.student_id where s.student_code between 'STU001' and 'STU007')),
    ('payments', (select count(*) from public.payments where client_reference like 'sample-payment-%')),
    ('receipts', (select count(*) from public.receipts r join public.payments p on p.id=r.payment_id where p.client_reference like 'sample-payment-%')),
    ('documents', (select count(*) from public.student_documents where storage_path like '%/sample/%')),
    ('medical', (select count(*) from public.student_medical_records m join public.students s on s.id=m.student_id where s.student_code between 'STU001' and 'STU007')),
    ('notifications', (select count(*) from public.notifications where template_key in ('fee_reminder','batch_schedule','academy_announcement')))
  ) checks(section,row_count) where row_count=0;
  if missing is not null then raise exception 'Sample portal data verification failed: %',missing; end if;
end $$;

commit;
