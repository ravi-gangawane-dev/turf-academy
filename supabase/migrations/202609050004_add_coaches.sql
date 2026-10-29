begin;

insert into public.coaches
  (id, employee_code, full_name, phone, email, date_of_birth, experience_years,
   qualification, biography, photo_url, status)
values
  ('20000000-0000-4000-8000-000000000005', 'C005', 'Vivek Sharma', '9876501005',
   'vivek.sharma@turfacademy.in', '1987-06-18', 11,
   'BCCI Level 2 Certified Coach',
   'Experienced batting coach focused on technique, match preparation, and player development.',
   '/branding/coaches/coach-rahul-amit.png', 'active'),
  ('20000000-0000-4000-8000-000000000006', 'C006', 'Priya Nair', '9876501006',
   'priya.nair@turfacademy.in', '1991-11-09', 8,
   'NIS Diploma in Sports Coaching',
   'Specialist in fielding, fitness, and structured development programs for junior cricketers.',
   '/branding/coaches/coach-karan-siddharth.png', 'active')
on conflict (employee_code) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  date_of_birth = excluded.date_of_birth,
  experience_years = excluded.experience_years,
  qualification = excluded.qualification,
  biography = excluded.biography,
  photo_url = excluded.photo_url,
  status = excluded.status;

insert into public.coach_specializations (coach_id, specialization)
values
  ('20000000-0000-4000-8000-000000000005', 'Batting'),
  ('20000000-0000-4000-8000-000000000005', 'Match preparation'),
  ('20000000-0000-4000-8000-000000000006', 'Fielding'),
  ('20000000-0000-4000-8000-000000000006', 'Fitness')
on conflict (coach_id, specialization) do nothing;

do $$
begin
  if (select count(*) from public.coaches where employee_code in ('C005', 'C006')) <> 2 then
    raise exception 'Coach seed verification failed';
  end if;
  if (select count(*) from public.coach_specializations where coach_id in
    ('20000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000006')) <> 4 then
    raise exception 'Coach specialization verification failed';
  end if;
end $$;

commit;
