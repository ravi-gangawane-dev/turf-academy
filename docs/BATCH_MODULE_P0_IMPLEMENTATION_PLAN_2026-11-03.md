# Batch Module P0 Implementation Plan

## Objective

Verify and harden batch enrollment integrity, capacity locking, coach assignment uniqueness, waitlist idempotency, transfer/promotion atomicity, schedule conflict handling, and role-based access without changing approved business rules.

## P0 checklist

- [ ] Verify concurrent enrollment capacity locking.
- [x] Verify duplicate active enrollment prevention.
- [x] Verify duplicate coach assignment prevention.
- [x] Verify duplicate waitlist insertion prevention.
- [x] Verify waitlist promotion cannot overbook a batch.
- [x] Verify transfer preserves enrollment and fee history.
- [x] Verify coach assignment permissions.
- [x] Verify parent batch access is limited by RLS.
- [x] Verify archived batches preserve historical records.
- [ ] Run SQL and Angular batch regression tests.
- [ ] Record final acceptance evidence.

## Evidence files

- `supabase/migrations/202609040002_security_and_workflows.sql`
- `supabase/tests/batch_workflows.sql`
- `supabase/tests/batch_waitlist_page.sql`
- `supabase/tests/staff_enrollment_workflows.sql`
- `supabase/tests/attendance_coach_hardening_tests.sql`
- `src/app/core/supabase/batch-workspace.service.ts`
- `src/app/features/batches/batches-page.ts`

## Acceptance criteria

- Capacity is enforced by an atomic database transaction.
- Duplicate active enrollments and duplicate waitlist entries are rejected or idempotent.
- Coach assignment writes require the correct permission.
- Waitlist promotion cannot exceed capacity.
- Historical attendance, fees, and enrollment records remain readable after archival/cancellation.
- No client-side-only capacity decision is treated as authoritative.

- Added workflow assertions for duplicate enrollment rejection, primary-coach uniqueness, and capacity overbooking rejection.
