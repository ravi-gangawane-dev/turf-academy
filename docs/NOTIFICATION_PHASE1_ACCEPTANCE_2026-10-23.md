# Phase 1 target acceptance — 23 October 2026

Status: **Incomplete; release blocked by backup/restore prerequisites.**

Target: `ttuigbkaluozglzgepsh`, PostgreSQL 17.6. CLI access works. No production database changes, Edge deployment or message sends occurred during this verification.

## Evidence

- Live ledger: notification migrations `202610220002`, `202610230001`, `202610230002`, `202610230003`, `202610230007`, `202610230008` are pending. Other attendance/settings changes and the older named-student migration `202610130004` are also absent. Avoid an unreviewed blanket push.
- Live grants: authenticated INSERT/UPDATE remain enabled; authenticated claim execution is denied; service_role claim execution is allowed. Pending integrity fixes remain necessary. Table grants alone do not establish what current RLS permits.
- Six local SQL suites, migration preservation and local snapshot restore passed. This is not target recovery verification.
- Real Auth sign-in/profile checks passed for all four roles. Staff notification reads and coach ownership sample passed.
- Parent ownership acceptance failed: the existing parent test profile has no linked parent record, confirmed by privileged read-only SQL. No records were modified to manufacture a pass.
- Deployed Edge HTTP checks passed: anonymous/invalid JWT rejected, staff configuration permitted, parent/coach configuration denied, unsupported action and GET rejected. Configuration reports in_app and WhatsApp; no sending was tested.

## Blockers

`npm run backup` stalled after starting the schema dump. Docker version and desktop status probes also did not respond. The backup process tree was stopped. `backups/2026-10-23T15-12-30/schema.sql` is zero bytes and is **not a backup**.

The project has no preview branches; no isolated restore target has been identified. Concurrent-worker checks, target restore rehearsal, migration deployment and matching Edge deployment remain open.

## Repeatable verification

```powershell
npm run test:notifications:db
npm run test:notifications:live
supabase db query --linked --file supabase/tests/notification_live_preflight.sql
```

The live script performs read-only checks, uses existing E2E account environment overrides/defaults, prints no credentials and exits nonzero on failures. Ownership checks sample at most 100 records; empty inboxes do not prove isolation. It does not test inactive accounts, concurrent claims, sending or backup recovery.

## Continuation

1. Restore working backup tooling and take a fresh backup.
2. Restore it to an isolated target and compare schema, grants, counts and provider evidence.
3. Stage the reviewed notification migrations in dependency order; run SQL and concurrent-worker tests with synthetic fixtures and sending disabled.
4. Provide a linked parent staging fixture and complete JWT/PostgREST acceptance.
5. Deploy the verified migrations and matching Edge code, then repeat target checks and record versions.
