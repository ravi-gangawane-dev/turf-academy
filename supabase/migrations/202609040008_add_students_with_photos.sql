begin;

insert into public.students
  (id, student_code, full_name, date_of_birth, skill_level, phone, photo_url, status, joined_on)
values
  ('40000000-0000-4000-8000-000000000006', 'STU006', 'Arjun Deshmukh', '2013-09-05', 'Beginner', '8901234567', '/branding/students/arjun-deshmukh.png', 'active', '2024-08-01'),
  ('40000000-0000-4000-8000-000000000007', 'STU007', 'Samaira Joshi', '2011-02-19', 'Advanced', '9012345678', '/branding/students/samaira-joshi.png', 'active', '2024-07-10')
on conflict (student_code) do update set
  full_name = excluded.full_name,
  date_of_birth = excluded.date_of_birth,
  phone = excluded.phone,
  photo_url = excluded.photo_url,
  status = excluded.status,
  joined_on = excluded.joined_on;

insert into public.parents (id, full_name, relation, phone, status)
values
  ('50000000-0000-4000-8000-000000000006', 'Rohit Deshmukh', 'Father', '8901234560', 'active'),
  ('50000000-0000-4000-8000-000000000007', 'Madhuri Joshi', 'Mother', '9012345670', 'active')
on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone;

insert into public.student_parents (student_id, parent_id, is_primary)
values
  ('40000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000006', true),
  ('40000000-0000-4000-8000-000000000007', '50000000-0000-4000-8000-000000000007', true)
on conflict (student_id, parent_id) do update set is_primary = true;

insert into public.enrollments
  (id, student_id, batch_id, fee_plan_id, status, valid_from, monthly_fee)
values
  ('60000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'active', '2024-08-01', 2000),
  ('60000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'active', '2024-07-10', 3500)
on conflict (id) do update set status = excluded.status, batch_id = excluded.batch_id;

commit;
