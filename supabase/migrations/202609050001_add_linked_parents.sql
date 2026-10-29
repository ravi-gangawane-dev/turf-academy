begin;

insert into public.parents (id, full_name, relation, phone, whatsapp, email, occupation, status)
values
  ('50000000-0000-4000-8000-000000000008', 'Anita Sharma', 'Mother', '9876543221', '9876543221', 'anita.sharma@parent.test', 'Teacher', 'active'),
  ('50000000-0000-4000-8000-000000000009', 'Suresh Kulkarni', 'Father', '8765432119', '8765432119', 'suresh.kulkarni@parent.test', 'Engineer', 'active'),
  ('50000000-0000-4000-8000-000000000010', 'Rajesh Mehta', 'Father', '7654321108', '7654321108', 'rajesh.mehta@parent.test', 'Business owner', 'active'),
  ('50000000-0000-4000-8000-000000000011', 'Sana Khan', 'Mother', '6543210997', '6543210997', 'sana.khan@parent.test', 'Doctor', 'active'),
  ('50000000-0000-4000-8000-000000000012', 'Manish Gupta', 'Father', '7890123466', '7890123466', 'manish.gupta@parent.test', 'Accountant', 'active')
on conflict (id) do update set
  full_name=excluded.full_name, relation=excluded.relation, phone=excluded.phone,
  whatsapp=excluded.whatsapp, email=excluded.email, occupation=excluded.occupation, status=excluded.status;

insert into public.student_parents (student_id, parent_id, is_primary)
values
  ('40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000008', false),
  ('40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000009', false),
  ('40000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000010', false),
  ('40000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000011', false),
  ('40000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000012', false)
on conflict (student_id,parent_id) do update set is_primary=excluded.is_primary;

commit;
