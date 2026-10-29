# Notification database verification

Run `npm run test:notifications:db` from the repository after `npm ci`.

The runner creates an in-memory PostgreSQL engine using the pinned PGlite development dependency. It reads no environment credentials, opens no remote database connection, sends no messages, and closes the database at the end. Its tests execute SQL, triggers, grants and RLS rather than mocking their results.

## Coverage

- Existing notification IDs, content and provider evidence survive the new migrations.
- Authenticated staff cannot directly insert, change or delete notification evidence; only service_role can claim.
- Queue references are idempotent, opted-out recipients cannot be claimed, future schedules are respected, and provider-accepted/uncertain/claimed messages cannot be reclaimed.
- Parent and coach deletion preserve history.
- Parents/coaches can read and acknowledge their own records, cannot acknowledge other records, and cannot access staff event diagnostics.
- Inactive recipients, inactive profiles and suspended staff are denied notification access; suspended staff cannot queue.
- Birthday WhatsApp/email generation respects parent opt-out; eligible messages queue once; disabled channels and inactive recipients are blocked.
- Updating absent attendance to checked-in generates one notice; editing its timestamp does not duplicate it; academy timezone is used.
- Event history and central manual lifecycle transitions preserve provider evidence and record actors.
- Exact entity choices are staff-only. Attendance, fee and absence notices capture batch context at generation; later source changes and batch deletion preserve that snapshot. Older and unrelated notices remain unlinked.
- A pre-migration database snapshot restores original rows and grants in a separate local engine instance.

## Environment boundaries

The runner executes selected real repository migrations listed explicitly in `scripts/test-notification-db.mjs`. It simulates Supabase's auth.users/auth.uid and roles, plus initial schema grants. Storage-only policies and cron scheduling are excluded. No notification function or policy under test is rewritten. Fixtures are synthetic and SQL test transactions roll back.

PGlite runs a single database session: duplicate-claim checks are sequential, not proof of concurrent-worker behavior. This does not run PostgREST, Supabase Auth/JWT validation, realtime, the Edge HTTP handler, provider delivery or production cron. The engine version is reported on each run; it is not necessarily the PostgreSQL 17 version configured for Supabase.

The snapshot restore verifies the test database only. It is **not** a production backup/restore rehearsal. PGlite snapshots are designed to restore into PGlite, not another PostgreSQL distribution. See [PGlite's snapshot API](https://pglite.dev/docs/api#dumpdatadir).

## Remaining staging/deployment checks

1. Verify the deployed migration list and a recoverable backup using the target environment's supported backup process.
2. Apply outstanding migrations in timestamp order to an isolated staging copy, including `202610230007_notification_access_integrity.sql` (fixes recursive ownership checks and inactive-account access).
3. Run the six SQL suites named by the runner as postgres with active admin, receptionist, parent and coach test profiles. Each suite rolls back its fixtures. Include `202610230008_notification_filter_context.sql` before testing Phase 2 filters.
4. Verify live PostgREST grants and JWT role isolation, plus concurrent claims from separate sessions.
5. Deploy compatible Edge code and perform configuration/read checks. Provider sending needs an explicitly designated test recipient.
6. Compare real row counts/evidence and execute the environment-specific restore rehearsal before production rollout.

Phase 1 implementation and local SQL verification can be complete while these operational acceptance checks remain open.
