begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'receptionist', 'coach', 'parent');
create type public.record_status as enum ('active', 'inactive');
create type public.enrollment_status as enum ('active', 'paused', 'cancelled', 'completed');
create type public.attendance_status as enum ('present', 'late', 'checked_out', 'absent');
create type public.queue_status as enum ('pending', 'processing', 'completed', 'failed', 'conflict');
create type public.charge_status as enum ('pending', 'partial', 'paid', 'overdue', 'waived');
create type public.payment_status as enum ('pending', 'successful', 'failed', 'refunded', 'partially_refunded');
create type public.delivery_status as enum ('queued', 'sending', 'sent', 'delivered', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text,
  role public.app_role not null default 'parent',
  phone text,
  avatar_path text,
  avatar_url text,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  admission_number text not null unique,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  date_of_birth date not null check (date_of_birth <= current_date),
  gender text,
  skill_level text not null default 'Beginner',
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb,
  photo_path text,
  status public.record_status not null default 'active',
  joined_on date not null default current_date,
  notes text,
  version integer not null default 1 check (version > 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  relation text,
  phone text not null,
  whatsapp text,
  email text,
  occupation text,
  address jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'active',
  communication_preferences jsonb not null default '{"sms":true,"whatsapp":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_parents (
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  is_primary boolean not null default false,
  can_pick_up boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (student_id, parent_id)
);

create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  employee_code text not null unique,
  full_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  experience_years numeric(4,1) not null default 0 check (experience_years >= 0),
  qualification text,
  biography text,
  photo_path text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_specializations (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  specialization text not null,
  primary key (coach_id, specialization)
);

create table public.fee_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  duration_months integer not null default 1 check (duration_months > 0),
  monthly_fee numeric(12,2) not null check (monthly_fee >= 0),
  registration_fee numeric(12,2) not null default 0 check (registration_fee >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  age_group text,
  skill_level text,
  capacity integer not null check (capacity > 0),
  waitlist_capacity integer not null default 0 check (waitlist_capacity >= 0),
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  fee_plan_id uuid references public.fee_plans(id) on delete set null,
  status public.record_status not null default 'active',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (end_time is null or start_time is null or end_time > start_time)
);

create table public.batch_days (
  batch_id uuid not null references public.batches(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  primary key (batch_id, day_of_week)
);

create table public.batch_coaches (
  batch_id uuid not null references public.batches(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  is_primary boolean not null default false,
  assigned_at timestamptz not null default now(),
  primary key (batch_id, coach_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  batch_id uuid not null references public.batches(id),
  fee_plan_id uuid not null references public.fee_plans(id),
  status public.enrollment_status not null default 'active',
  valid_from date not null,
  valid_till date,
  monthly_fee numeric(12,2) not null check (monthly_fee >= 0),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_till is null or valid_till >= valid_from)
);
create unique index one_open_enrollment_per_student on public.enrollments(student_id)
  where status in ('active', 'paused');

create table public.enrollment_history (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  event_type text not null,
  from_batch_id uuid references public.batches(id),
  to_batch_id uuid references public.batches(id),
  previous_status public.enrollment_status,
  new_status public.enrollment_status,
  effective_on date not null default current_date,
  reason text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.qr_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  public_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  active boolean not null default true,
  rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  batch_id uuid not null references public.batches(id),
  attendance_date date not null default current_date,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status public.attendance_status not null default 'present',
  source text not null default 'manual' check (source in ('manual','qr','offline_sync','correction')),
  idempotency_key text unique,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, batch_id, attendance_date),
  check (check_out_at is null or check_in_at is null or check_out_at >= check_in_at)
);

create table public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance_records(id),
  previous_values jsonb not null,
  corrected_values jsonb not null,
  reason text not null check (length(trim(reason)) >= 3),
  requested_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.offline_attendance_queue (
  id uuid primary key default gen_random_uuid(),
  client_operation_id text not null unique,
  device_id text not null,
  operation text not null check (operation in ('check_in','check_out')),
  payload jsonb not null,
  status public.queue_status not null default 'pending',
  failure_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('fixed','percentage')),
  value numeric(12,2) not null check (value >= 0),
  valid_from date,
  valid_till date,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percentage' or value <= 100)
);

create table public.student_discounts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  discount_id uuid not null references public.discounts(id),
  valid_from date not null,
  valid_till date,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (student_id, discount_id, valid_from)
);

create table public.late_fee_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  grace_days integer not null default 0 check (grace_days >= 0),
  kind text not null check (kind in ('fixed','daily','percentage')),
  value numeric(12,2) not null check (value >= 0),
  maximum_amount numeric(12,2),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monthly_charges (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id),
  student_id uuid not null references public.students(id),
  charge_month date not null check (extract(day from charge_month) = 1),
  due_date date not null,
  base_amount numeric(12,2) not null check (base_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  late_fee_amount numeric(12,2) not null default 0 check (late_fee_amount >= 0),
  final_amount numeric(12,2) generated always as (greatest(0, base_amount - discount_amount + late_fee_amount)) stored,
  status public.charge_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, charge_month)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  monthly_charge_id uuid references public.monthly_charges(id),
  amount numeric(12,2) not null check (amount > 0),
  payment_mode text not null check (payment_mode in ('cash','upi','card','bank_transfer','online')),
  provider_reference text,
  client_reference text not null unique,
  status public.payment_status not null default 'successful',
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id),
  receipt_number text not null unique,
  storage_path text,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles(id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id),
  parent_id uuid references public.parents(id),
  channel text not null check (channel in ('sms','whatsapp','email','in_app')),
  template_key text,
  recipient text not null,
  subject text,
  body text not null,
  status public.delivery_status not null default 'queued',
  provider_message_id text,
  retry_count integer not null default 0 check (retry_count >= 0),
  failure_reason text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.student_medical_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  blood_group text,
  allergies text,
  conditions text,
  medications text,
  emergency_notes text,
  doctor_name text,
  doctor_phone text,
  document_path text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  medical_record_id uuid not null references public.student_medical_records(id) on delete cascade,
  vaccine_name text not null,
  administered_on date,
  next_due_on date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  table_name text not null,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  request_id text,
  occurred_at timestamptz not null default now()
);

create table public.auth_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  action text not null check (action in ('login_success','logout','password_reset_requested','password_changed','account_blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index students_name_idx on public.students using gin (to_tsvector('simple', full_name));
create index parents_phone_idx on public.parents(phone);
create index batch_coaches_coach_idx on public.batch_coaches(coach_id);
create index enrollments_batch_status_idx on public.enrollments(batch_id, status);
create index attendance_date_batch_idx on public.attendance_records(attendance_date desc, batch_id);
create index charges_student_month_idx on public.monthly_charges(student_id, charge_month desc);
create index charges_due_status_idx on public.monthly_charges(due_date, status);
create index payments_student_paid_idx on public.payments(student_id, paid_at desc);
create index notifications_status_schedule_idx on public.notifications(status, scheduled_at);
create index audit_record_idx on public.audit_logs(table_name, record_id, occurred_at desc);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','students','parents','coaches','fee_plans','batches','enrollments','attendance_records','discounts','late_fee_rules','monthly_charges','notifications','student_medical_records']
  loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t); end loop;
end $$;

commit;
