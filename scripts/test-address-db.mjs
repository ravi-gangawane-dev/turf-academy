import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = await PGlite.create();
const migration = await readFile(
  new URL('../supabase/migrations/202611140001_standardize_addresses.sql', import.meta.url),
  'utf8',
);
const profileFieldsMigration = await readFile(
  new URL('../supabase/migrations/202611140003_optional_profile_personal_fields.sql', import.meta.url),
  'utf8',
);

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create function public.current_user_role() returns text language sql stable as $$ select 'admin'::text $$;

    create table public.profiles (
      id uuid primary key,
      full_name text,
      email text,
      phone text,
      role text,
      status text,
      is_active boolean,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table public.coaches (
      id uuid primary key,
      profile_id uuid,
      employee_code text,
      full_name text,
      phone text,
      email text,
      date_of_birth date,
      experience_years numeric default 0,
      qualification text,
      biography text,
      photo_path text,
      status text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table public.parents (
      id uuid primary key,
      profile_id uuid,
      full_name text,
      relation text,
      phone text,
      whatsapp text,
      email text,
      occupation text,
      address jsonb not null default '{}'::jsonb,
      status text,
      communication_preferences jsonb default '{}'::jsonb,
      photo_path text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table public.students (
      id uuid primary key default gen_random_uuid(),
      address jsonb not null default '{}'::jsonb
    );
    create table public.academy_settings (address text);
    create table public.coach_specializations (coach_id uuid, specialization text);
    create table public.student_parents (student_id uuid, parent_id uuid, is_primary boolean, created_at timestamptz);
    create table public.enrollments (id uuid, student_id uuid, batch_id uuid, fee_plan_id uuid, status text, valid_from date);
    create table public.batches (id uuid, name text);
    create table public.fee_plans (id uuid, name text);
    create table public.batch_coaches (batch_id uuid, coach_id uuid, is_primary boolean, assigned_at timestamptz);

    create function public.create_student_profile(p_payload jsonb) returns uuid
    language plpgsql as $$
    declare new_id uuid := gen_random_uuid();
    begin
      insert into public.students(id, address) values (
        new_id,
        jsonb_build_object(
          'formatted', p_payload->>'address',
          'city', p_payload->>'city',
          'state', p_payload->>'state',
          'pinCode', p_payload->>'pin_code'
        )
      );
      return new_id;
    end;
    $$;
    create function public.update_student_profile(p_student_id uuid, p_payload jsonb) returns uuid
    language sql as $$ select p_student_id $$;
    create function public.parent_update_linked_student(p_student_id uuid, p_payload jsonb) returns uuid
    language sql as $$ select p_student_id $$;

    insert into public.profiles(id, full_name, role, status, is_active)
    values ('00000000-0000-0000-0000-000000000001', 'Staff User', 'admin', 'active', true);
    insert into public.profiles(id, full_name, role, status, is_active)
    values ('00000000-0000-0000-0000-000000000005', 'Coach User', 'coach', 'active', true);
    insert into public.coaches(id, full_name, phone, status)
    values ('00000000-0000-0000-0000-000000000002', 'Coach User', '9876543210', 'active');
    update public.coaches
    set profile_id = '00000000-0000-0000-0000-000000000005',
        date_of_birth = '1990-05-10',
        qualification = 'Level 2'
    where id = '00000000-0000-0000-0000-000000000002';
    insert into public.parents(id, full_name, phone, address)
    values (
      '00000000-0000-0000-0000-000000000003',
      'Parent User',
      '9876543210',
      '{"line1":"","formatted":"12 MG Road","line2":"","address_line2":"Floor 2","city":"Pune","state":"Maharashtra","pin_code":"411001"}'
    );
    insert into public.students(id, address)
    values (
      '00000000-0000-0000-0000-000000000004',
      '{"formatted":"5 Park Street","city":"Pune","state":"Maharashtra","pin_code":"411002","nationality":"Indian","aadhaar":"1234"}'
    );
    insert into public.academy_settings(address) values ('Main Ground, Pune');
  `);

  await db.exec(migration);
  await db.exec(profileFieldsMigration);

  const coachProfile = (
    await db.query(`select date_of_birth, qualification from public.profiles where id = '00000000-0000-0000-0000-000000000005'`)
  ).rows[0];
  assert.equal(coachProfile.date_of_birth.toISOString().slice(0, 10), '1990-05-10');
  assert.equal(coachProfile.qualification, 'Level 2');
  await db.exec(`
    update public.coaches
    set date_of_birth = '1991-04-20', qualification = 'Level 3'
    where id = '00000000-0000-0000-0000-000000000002'
  `);
  const updatedCoachProfile = (
    await db.query(`select date_of_birth, qualification from public.profiles where id = '00000000-0000-0000-0000-000000000005'`)
  ).rows[0];
  assert.equal(updatedCoachProfile.date_of_birth.toISOString().slice(0, 10), '1991-04-20');
  assert.equal(updatedCoachProfile.qualification, 'Level 3');
  await assert.rejects(
    db.exec(`update public.profiles set date_of_birth = '2999-01-01' where id = '00000000-0000-0000-0000-000000000005'`),
    /profiles_date_of_birth_not_future/,
  );
  await assert.rejects(
    db.exec(`update public.profiles set qualification = repeat('x', 161) where id = '00000000-0000-0000-0000-000000000005'`),
    /profiles_qualification_length/,
  );

  const parentAddress = (
    await db.query(`select address from public.parents where id = '00000000-0000-0000-0000-000000000003'`)
  ).rows[0].address;
  assert.deepEqual(parentAddress, {
    line1: '12 MG Road',
    line2: 'Floor 2',
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411001',
  });

  const student = (
    await db.query(`select address, nationality, aadhaar from public.students where id = '00000000-0000-0000-0000-000000000004'`)
  ).rows[0];
  assert.deepEqual(student.address, {
    line1: '5 Park Street',
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411002',
  });
  assert.equal(student.nationality, 'Indian');
  assert.equal(student.aadhaar, '1234');

  const academyAddress = (await db.query('select address from public.academy_settings')).rows[0].address;
  assert.deepEqual(academyAddress, {
    line1: 'Main Ground, Pune',
    city: '',
    state: '',
    pinCode: '',
  });
  assert.deepEqual(
    (await db.query(`select address from public.profiles where id = '00000000-0000-0000-0000-000000000001'`)).rows[0].address,
    { line1: '', city: '', state: '', pinCode: '' },
  );
  assert.deepEqual(
    (await db.query(`select address from public.coaches where id = '00000000-0000-0000-0000-000000000002'`)).rows[0].address,
    { line1: '', city: '', state: '', pinCode: '' },
  );

  const createdId = (
    await db.query(
      `select public.create_student_profile_v2(
        '{"full_name":"New Student","date_of_birth":"2014-05-06","address":{"line1":"12 MG Road","line2":"Floor 2","city":"Pune","state":"Maharashtra","pinCode":"411001"}}'::jsonb
      ) as id`,
    )
  ).rows[0].id;
  assert.deepEqual(
    (await db.query('select address from public.students where id = $1', [createdId])).rows[0].address,
    {
      line1: '12 MG Road',
      line2: 'Floor 2',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    },
  );
  assert.equal(
    (await db.query(`select public.address_is_valid('{"line1":"Road","city":"Pune","state":"Maharashtra","pinCode":"41100"}'::jsonb) as valid`)).rows[0].valid,
    false,
  );

  console.log('PASS legacy address migration, optional profile fields, coach synchronization, and PIN validation');
  console.log('LIMIT: verified migration behavior on disposable PostgreSQL; no live Supabase session.');
} finally {
  await db.close();
}
