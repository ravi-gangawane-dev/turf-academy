-- Demo dataset for the Turf Cricket Academy walkthrough (2026-11-16).
--
-- Adds ~10 records to every operational table. This is the version that was
-- actually executed against project ttuigbkaluozglzgepsh on 2026-11-15 and
-- verified afterwards.
--
-- Notes learned from the live schema (keep these, they are not cosmetic):
--   * monthly_charges.final_amount is a GENERATED column - never insert it.
--   * payments.paid_at is NOT NULL - pending/failed rows still need a timestamp.
--   * academy_events.event_type accepts only 'holiday' | 'special_event'.
--   * discounts.kind accepts only 'fixed' | 'percentage'.
--
-- Safe to re-run: ids are md5('turfdemo:...')::uuid and every insert uses
-- ON CONFLICT DO NOTHING. Everything is tagged DEMO- for later cleanup:
--   delete from public.<table> where <key_column> like 'DEMO-%';
-- Run each block separately; a failure in one block does not affect the others.

-- ------------------------------------------------------------------ fee plans
insert into public.fee_plans (id, name, description, duration_months, monthly_fee, registration_fee, status)
select md5('turfdemo:fee-plan:'||i)::uuid,
       (array['U10 Beginners','U12 Beginners','U14 Intermediate','U16 Intermediate','Elite Advanced',
              'Weekend Skills','Girls Junior','Fast Bowling','Fitness & Fielding'])[i],
       'Demo fee plan for the walkthrough.',
       (array[1,1,3,3,6,3,3,1,3])[i],
       (array[2500,2800,3500,3800,4500,2200,3000,3200,2000])[i],
       (array[500,500,750,750,1000,0,500,500,0])[i],
       'active'::record_status
from generate_series(1,9) i
on conflict do nothing;

insert into public.fee_plans (id, name, description, duration_months, monthly_fee, registration_fee, status)
values (md5('turfdemo:fee-plan:10')::uuid, 'Fitness & Fielding Plus', 'Demo fee plan.', 3, 2000, 0, 'active'::record_status)
on conflict do nothing;

-- -------------------------------------------------------------------- batches
insert into public.batches (id, code, name, age_group, skill_level, capacity, waitlist_capacity,
                            start_date, end_date, start_time, end_time, fee_plan_id, status, description)
select md5('turfdemo:batch:'||i)::uuid,
       'DEMO-B'||lpad(i::text,2,'0'),
       (array['Morning Beginners U10','Evening Beginners U12','Morning Intermediate U14',
              'Evening Intermediate U16','Elite Advanced Squad','Weekend Skills Clinic',
              'Girls Junior Squad','Fast Bowling Clinic','Batting Masterclass','Fitness & Fielding'])[i],
       (array['U10','U12','U14','U16','U19','U12','U14','U16','U16','U19'])[i],
       (array['Beginner','Beginner','Intermediate','Intermediate','Advanced',
              'Beginner','Intermediate','Advanced','Advanced','Intermediate'])[i],
       24, 5, current_date - 60, current_date + 120,
       (array['06:30','17:30','07:00','18:00','05:45','09:00','16:30','17:00','18:30','06:00'])[i]::time,
       (array['08:00','19:00','08:30','19:30','07:30','11:00','18:00','18:30','20:00','07:30'])[i]::time,
       md5('turfdemo:fee-plan:'||i)::uuid, 'active'::record_status, 'Demo batch for the walkthrough.'
from generate_series(1,10) i
on conflict do nothing;

insert into public.batch_days (batch_id, day_of_week)
select md5('turfdemo:batch:'||i)::uuid, ((i % 5) + 1)::smallint from generate_series(1,10) i
on conflict do nothing;

insert into public.batch_days (batch_id, day_of_week)
select md5('turfdemo:batch:'||i)::uuid, (((i + 2) % 5) + 1)::smallint from generate_series(1,10) i
on conflict do nothing;

-- -------------------------------------------------------------------- coaches
insert into public.coaches (id, employee_code, full_name, phone, email, date_of_birth,
                            experience_years, qualification, biography, status)
select md5('turfdemo:coach:'||i)::uuid,
       'DEMO-C'||lpad(i::text,2,'0'),
       (array['Vikram Rathore','Sanjay Mane','Imran Shaikh','Deepak Yadav','Ravi Naik',
              'Anil Kamble','Sagar Kadam','Nikhil Salunkhe','Pravin Ghadge','Ajay Sawant'])[i],
       -- stored without a country code: the coach list renders one "+91 …"
       '982'||lpad((1000000 + i * 11111)::text, 7, '0'),
       'demo.coach'||i||'@turf.local',
       date '1985-04-12' + (i * 137),
       2 + i,
       (array['BCCI Level 2','BCCI Level 1','BCCI Level 1','NIS Certified','BCCI Level 2',
              'BCCI Level 1','NIS Certified','BCCI Level 1','BCCI Level 2','NIS Certified'])[i],
       'Demo coach for the walkthrough.', 'active'::record_status
from generate_series(1,10) i
on conflict do nothing;

insert into public.batch_coaches (batch_id, coach_id, is_primary, assigned_at)
select md5('turfdemo:batch:'||i)::uuid, md5('turfdemo:coach:'||i)::uuid, true, now()
from generate_series(1,10) i
on conflict do nothing;

-- ------------------------------------------------------------------- students
insert into public.students (id, student_code, full_name, date_of_birth, gender, skill_level,
                             phone, email, address, status, joined_on, nationality, version)
select md5('turfdemo:student:'||i)::uuid,
       'DEMO-S'||lpad(i::text,2,'0'),
       (array['Aarav Deshmukh','Vivaan Kulkarni','Aditya Patil','Kabir Joshi','Rohan Shinde',
              'Ishaan Gaikwad','Advait Pawar','Yash Chavan','Arjun Bhosale','Devansh More'])[i],
       date '2010-06-15' + (i * 211), 'Male',
       (array['Beginner','Beginner','Intermediate','Intermediate','Advanced',
              'Beginner','Intermediate','Advanced','Advanced','Intermediate'])[i],
       '973'||lpad((2000000 + i * 11111)::text, 7, '0'),
       'demo.student'||i||'@turf.local',
       jsonb_build_object('line1', (i * 12)||' Shivaji Nagar', 'city', 'Pune',
                          'state', 'Maharashtra', 'pinCode', '4110'||lpad(i::text,2,'0')),
       'active'::record_status, current_date - (i * 9), 'Indian', 1
from generate_series(1,10) i
on conflict do nothing;

-- -------------------------------------------------------------------- parents
insert into public.parents (id, full_name, relation, phone, whatsapp, email, occupation, address, status)
select md5('turfdemo:parent:'||i)::uuid,
       (array['Sunil Deshmukh','Meera Kulkarni','Prakash Patil','Nilesh Joshi','Swati Shinde',
              'Rahul Gaikwad','Amol Pawar','Kavita Chavan','Sachin Bhosale','Poonam More'])[i],
       case when i % 2 = 0 then 'Mother' else 'Father' end,
       '964'||lpad((3000000 + i * 11111)::text, 7, '0'),
       '964'||lpad((3000000 + i * 11111)::text, 7, '0'),
       'demo.parent'||i||'@turf.local',
       (array['Engineer','Teacher','Business','Doctor','Homemaker','Banker',
              'Consultant','Designer','Advocate','Architect'])[i],
       jsonb_build_object('line1', (i * 12)||' Shivaji Nagar', 'city', 'Pune',
                          'state', 'Maharashtra', 'pinCode', '4110'||lpad(i::text,2,'0')),
       'active'::record_status
from generate_series(1,10) i
on conflict do nothing;

insert into public.student_parents (student_id, parent_id, is_primary, can_pick_up)
select md5('turfdemo:student:'||i)::uuid, md5('turfdemo:parent:'||i)::uuid, true, true
from generate_series(1,10) i
on conflict do nothing;

-- ---------------------------------------------------------------- enrollments
insert into public.enrollments (id, student_id, batch_id, fee_plan_id, status,
                                valid_from, valid_till, monthly_fee, notes, created_by)
select md5('turfdemo:enrollment:'||i)::uuid,
       md5('turfdemo:student:'||i)::uuid, md5('turfdemo:batch:'||i)::uuid, md5('turfdemo:fee-plan:'||i)::uuid,
       'active'::enrollment_status,
       date_trunc('month', current_date)::date - 61,
       date_trunc('month', current_date)::date + 103,
       (array[2500,2800,3500,3800,4500,2200,3000,3200,2000,3500])[i],
       'Demo enrollment for the walkthrough.', '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,10) i
on conflict do nothing;

insert into public.enrollment_history (id, enrollment_id, event_type, from_batch_id, to_batch_id,
                                      previous_status, new_status, effective_on, reason, changed_by)
select md5('turfdemo:enroll-history:'||i)::uuid, md5('turfdemo:enrollment:'||i)::uuid, 'created', null,
       md5('turfdemo:batch:'||i)::uuid, null, 'active'::enrollment_status, current_date - 60,
       'Initial demo enrollment.', '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,10) i
on conflict do nothing;

-- ----------------------------------------------------------- monthly charges
-- final_amount is generated - do not insert it.
insert into public.monthly_charges (id, enrollment_id, student_id, charge_month, due_date,
                                    base_amount, discount_amount, late_fee_amount, status)
select md5('turfdemo:charge:'||i)::uuid,
       md5('turfdemo:enrollment:'||i)::uuid,
       md5('turfdemo:student:'||i)::uuid,
       date_trunc('month', current_date)::date,
       date_trunc('month', current_date)::date + 9,
       (array[2500,2800,3500,3800,4500,2200,3000,3200,2000,3500])[i],
       case when i % 4 = 0 then 200 else 0 end, 0,
       case when i <= 6 then 'paid'::charge_status
            when i <= 8 then 'partial'::charge_status
            when i = 9 then 'pending'::charge_status
            else 'overdue'::charge_status end
from generate_series(1,10) i
on conflict do nothing;

-- ------------------------------------------------------------------- payments
-- paid_at is NOT NULL, so pending/failed rows still carry a timestamp.
insert into public.payments (id, student_id, monthly_charge_id, amount, payment_mode,
                             provider_reference, client_reference, status, paid_at, recorded_by, notes)
select md5('turfdemo:payment:'||i)::uuid,
       md5('turfdemo:student:'||i)::uuid,
       md5('turfdemo:charge:'||i)::uuid,
       case when i <= 6 then (array[2500,2800,3500,3600,4500,2200])[i]
            when i = 7 then 1500
            when i = 8 then 1600
            else (array[2000,3500])[i-8] end,
       (array['upi','cash','card','upi','upi','cash','upi','upi','cash','card'])[i],
       'DEMO-PAY-'||lpad(i::text,2,'0'),
       'DEMO-CLIENT-'||lpad(i::text,2,'0'),
       case when i <= 8 then 'successful'::payment_status
            when i = 9 then 'pending'::payment_status
            else 'failed'::payment_status end,
       case when i in (7,8) then now() - interval '65 days'
            else now() - (i * 2) * interval '1 day' end,
       '79c6550b-9a97-41eb-81de-55908c8064da',
       'Demo payment for the walkthrough.'
from generate_series(1,10) i
on conflict do nothing;

insert into public.receipts (id, payment_id, receipt_number, storage_path, issued_at, issued_by)
select md5('turfdemo:receipt:'||i)::uuid, md5('turfdemo:payment:'||i)::uuid,
       'DEMO-RCPT-'||lpad(i::text,3,'0'), null, now() - (i * interval '1 day'),
       '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,8) i
on conflict do nothing;

-- ---------------------------------------------------------------- qr profiles
insert into public.qr_profiles (id, student_id, public_token, active, rotated_at)
select md5('turfdemo:qr:'||i)::uuid, md5('turfdemo:student:'||i)::uuid,
       'DEMO-QR-'||lpad(i::text,3,'0'), true, now()
from generate_series(1,10) i
on conflict do nothing;

-- -------------------------------------------------------- attendance records
insert into public.attendance_records (id, student_id, batch_id, attendance_date, check_in_at,
                                       check_out_at, status, source, idempotency_key, recorded_by, remarks)
select md5('turfdemo:attendance:'||i)::uuid,
       md5('turfdemo:student:'||i)::uuid,
       md5('turfdemo:batch:'||i)::uuid,
       current_date - i,
       (current_date - i) + time '07:00' + (i * interval '1 minute'),
       case when i % 3 = 0 then null else (current_date - i) + time '08:30' end,
       case when i % 5 = 0 then 'absent'::attendance_status
            when i % 4 = 0 then 'late'::attendance_status
            else 'present'::attendance_status end,
       'manual',
       'DEMO-IDEM-'||lpad(i::text,3,'0'),
       '79c6550b-9a97-41eb-81de-55908c8064da',
       'Demo attendance for the walkthrough.'
from generate_series(1,10) i
on conflict do nothing;

insert into public.attendance_corrections (id, attendance_id, previous_values, corrected_values,
                                           reason, requested_by, resolution_status)
select md5('turfdemo:correction:'||i)::uuid,
       md5('turfdemo:attendance:'||i)::uuid,
       jsonb_build_object('status','absent'),
       jsonb_build_object('status','present'),
       'Student attended but was marked absent at the gate.',
       '6eacd528-921d-4cea-b222-02737c7948f8',
       case when i <= 4 then 'pending' else 'approved' end
from generate_series(1,10) i
on conflict do nothing;

-- ----------------------------------------------------------- training sessions
insert into public.training_sessions (id, batch_id, coach_id, title, session_date, start_time,
                                      end_time, venue, status, notes, created_by)
select md5('turfdemo:session:'||i)::uuid,
       md5('turfdemo:batch:'||((i - 1) % 10 + 1))::uuid,
       md5('turfdemo:coach:'||((i - 1) % 10 + 1))::uuid,
       'Practice session '||i,
       current_date + i,
       time '07:00', time '08:30',
       'Turf Academy Ground, Pune',
       case when i <= 10 then 'upcoming' else 'rescheduled' end,
       'Demo session for the walkthrough.',
       '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,12) i
on conflict do nothing;

-- ------------------------------------------------------------- academy events
-- event_type is constrained to 'holiday' | 'special_event'.
insert into public.academy_events (id, event_type, title, event_date, description, status, created_by)
select md5('turfdemo:event:'||i)::uuid,
       case when i % 3 = 0 then 'holiday' else 'special_event' end,
       (array['Inter-Academy Friendly','U14 District Trial','Diwali Break','Parents Meet',
              'Annual Cricket Tournament','U10 Skills Carnival','Republic Day Holiday',
              'Bowling Masterclass','Fitness Assessment Day','Prize Distribution'])[i],
       current_date + (i * 3),
       'Demo academy event for the walkthrough.',
       'active'::record_status,
       '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,10) i
on conflict do nothing;

-- ------------------------------------------------------------------ discounts
-- kind is constrained to 'fixed' | 'percentage'.
insert into public.discounts (id, name, kind, value, valid_from, valid_till, status)
select md5('turfdemo:discount:'||i)::uuid,
       (array['Sibling Discount','Early Bird','Annual Prepay','Girls Team Support','Coach Referral',
              'Festival Offer','Multi-Batch Combo','Scholarship','Returning Student','Referral Bonus'])[i],
       case when i % 2 = 0 then 'percentage' else 'fixed' end,
       case when i % 2 = 0 then 10 else 500 end,
       current_date - 30, current_date + 90,
       'active'::record_status
from generate_series(1,10) i
on conflict do nothing;

-- ---------------------------------------------------------- student documents
insert into public.student_documents (id, student_id, document_type, file_name, storage_path,
                                      mime_type, size_bytes, uploaded_by)
select md5('turfdemo:document:'||i)::uuid, md5('turfdemo:student:'||i)::uuid,
       (array['birth_certificate','aadhaar','photo','medical','school_id'])[(i - 1) % 5 + 1],
       'DEMO-DOC-'||lpad(i::text,2,'0')||'.pdf',
       'demo/students/'||lpad(i::text,2,'0')||'/DEMO-DOC-'||lpad(i::text,2,'0')||'.pdf',
       'application/pdf', 128000,
       '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,10) i
on conflict do nothing;

-- ------------------------------------------------------- student medical records
insert into public.student_medical_records (id, student_id, blood_group, allergies, conditions,
                                            medications, emergency_notes, doctor_name, doctor_phone, updated_by)
select md5('turfdemo:medical:'||i)::uuid, md5('turfdemo:student:'||i)::uuid,
       (array['O+','A+','B+','AB+','O-','A-','B+','O+','A+','B-'])[i],
       case when i % 3 = 0 then 'Dust allergy' else 'None reported' end,
       case when i = 5 then 'Mild asthma' else 'None reported' end,
       case when i = 5 then 'Inhaler as needed' else 'None' end,
       'Parent available on registered phone.',
       'Dr. Sameer Kulkarni', '+919822011001',
       '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,10) i
on conflict do nothing;

-- -------------------------------------------------------------- batch waitlist
insert into public.batch_waitlist (id, batch_id, student_id, status, enrollment_id, created_by)
select md5('turfdemo:waitlist:'||i)::uuid,
       md5('turfdemo:batch:'||i)::uuid,
       md5('turfdemo:student:'||i)::uuid,
       'waiting', null,
       '6eacd528-921d-4cea-b222-02737c7948f8'
from generate_series(1,10) i
on conflict do nothing;

-- -------------------------------------------------------------- notifications
insert into public.notifications (id, student_id, parent_id, channel, template_key, recipient,
                                  subject, body, status, scheduled_at, created_by)
select md5('turfdemo:notification:'||i)::uuid,
       md5('turfdemo:student:'||i)::uuid,
       md5('turfdemo:parent:'||i)::uuid,
       case when i % 2 = 0 then 'whatsapp' else 'sms' end,
       (array['fee_reminder','attendance_absent','batch_change','fee_receipt','event_invite'])[(i - 1) % 5 + 1],
       '964'||lpad((3000000 + i * 11111)::text, 7, '0'),
       'Turf Cricket Academy update',
       'Demo notification generated for the walkthrough.',
       case when i <= 6 then 'delivered'::delivery_status
            when i <= 8 then 'sent'::delivery_status
            when i = 9 then 'queued'::delivery_status
            else 'failed'::delivery_status end,
       now() - (i * interval '3 hours'),
       '79c6550b-9a97-41eb-81de-55908c8064da'
from generate_series(1,10) i
on conflict do nothing;

-- ------------------------------------------------- demo access wiring (QA roles)
-- The demo rows above belong to demo coaches/parents that have no auth users.
-- These links give the existing QA logins something to see:
--   qa.coach.20261029  → 3 demo batches (4th is the pre-existing QA batch)
--   qa.parent.20261029 → 2 demo students
insert into public.batch_coaches (batch_id, coach_id, is_primary, assigned_at)
select md5('turfdemo:batch:'||i)::uuid,
       (select id from public.coaches where employee_code = 'QA-COACH-20261029'),
       false, now()
from generate_series(1,3) i
on conflict do nothing;

insert into public.student_parents (student_id, parent_id, is_primary, can_pick_up)
select md5('turfdemo:student:'||i)::uuid,
       (select id from public.parents where full_name = 'QA Parent' limit 1),
       false, true
from generate_series(1,2) i
on conflict do nothing;
