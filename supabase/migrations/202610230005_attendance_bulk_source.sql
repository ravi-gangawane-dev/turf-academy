begin;

-- C-04: coach_mark_batch_attendance records provenance as source='bulk', but
--   the attendance_records source check constraint (core schema,
--   202609040001) never learned that value, so every coach "mark unmarked
--   students present" call aborts with a check_violation before inserting a
--   single row -- the feature is broken end to end. Extend the constraint with
--   'bulk' so the sanctioned function can store its declared provenance.
--   Existing rows and every other provenance value are unchanged, and unknown
--   values are still rejected.

alter table public.attendance_records
  drop constraint if exists attendance_records_source_check;

alter table public.attendance_records
  add constraint attendance_records_source_check
  check (source in ('manual', 'qr', 'offline_sync', 'correction', 'bulk'));

commit;
