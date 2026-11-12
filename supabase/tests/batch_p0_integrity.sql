-- P0 integrity assertions. Run against the linked test database; all fixtures roll back.
begin;

do $$
declare duplicate_count integer;
begin
  select count(*) into duplicate_count
  from pg_indexes
  where schemaname = 'public'
    and indexname in ('one_primary_coach_per_batch', 'one_open_enrollment_per_student', 'batch_waitlist_open');
  if duplicate_count <> 3 then raise exception 'P0 integrity indexes missing'; end if;
end $$;

-- Capacity and transfer locking are exercised by the existing workflow tests.
-- These checks make the expected database invariants explicit for CI review.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'create_enrollment') then raise exception 'create_enrollment RPC missing'; end if;
  if not exists (select 1 from pg_proc where proname = 'transfer_enrollment') then raise exception 'transfer_enrollment RPC missing'; end if;
  if not exists (select 1 from pg_proc where proname = 'manage_batch_waitlist') then raise exception 'manage_batch_waitlist RPC missing'; end if;
end $$;

rollback;
