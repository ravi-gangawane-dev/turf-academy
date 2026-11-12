-- P0 batch integrity hardening.
-- The workflow RPC demotes existing primary coaches before assigning a new one;
-- this index protects the invariant against direct/concurrent writes as well.
create unique index if not exists one_primary_coach_per_batch
  on public.batch_coaches(batch_id)
  where is_primary;

-- Active and paused enrollments are already protected by the canonical index
-- from the core schema. Keep this assertion close to the P0 hardening changes.
create unique index if not exists one_open_enrollment_per_student
  on public.enrollments(student_id)
  where status in ('active', 'paused');

-- A student can have only one open waitlist entry per batch.
create unique index if not exists batch_waitlist_open
  on public.batch_waitlist(batch_id, student_id)
  where status = 'waiting';
