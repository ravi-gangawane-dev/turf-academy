# Client handover readiness — 4 November 2026

## Follow-up evidence reviewed 5 November 2026

The later `artifacts/p0-live-workflow-final.log` records a passing live browser vertical-slice test on 4 November. Its current test covers student creation, enrollment, attendance check-in/reload/check-out, payment, receipt preview/reload, balance assertions and report generation. This supersedes the missing core-flow evidence below, but does not establish all-role acceptance. The preceding core rerun recorded six passing tests and one failure; the final log reruns only that failed workflow. `artifacts/p0-payment-unit.log` records five passing payment tests.

The native backup attempt on 4 November timed out. On 5 November the native script was corrected to explicitly stream psql input, consume its readiness marker before checksum JSON, reject closed/failed sessions promptly, handle Windows server-launcher pipes, and normalize checksum timestamp formatting to UTC. The completed backup in `backups/native-2026-11-05T06-22-44-937Z` has `restoreVerified: true`: all 80 tables and 1,105 rows matched after an isolated PostgreSQL 17 restore. The local rehearsal server was stopped. This covers public/auth/storage/migration database contents, but excludes uploaded object bytes, hosted/provider settings, role passwords and ownership restoration. Full hosted disaster recovery remains incomplete.

The last Netlify status check reports no authenticated CLI session. Frontend publication remains unverified. Historical blockers below describe the earlier run and should be read alongside this follow-up.

Status: core corrections and available automated checks completed; not yet certified for client handover. Frontend changes are local and built, not published by this run. The database migrations listed below are live on `ttuigbkaluozglzgepsh`.

## Corrections completed

| Item | Change and evidence |
| --- | --- |
| Profile access safeguards | Applied `202611040001_user_access_guard.sql`; verified both profile guard/audit triggers exist. Disposable PostgreSQL tests pass for self-demotion, last-admin protection, audit trail and role restrictions. This does not establish concurrent-update safety. |
| Batch integrity | Applied `202611030001_batch_p0_integrity.sql`; no duplicate primary-coach groups existed beforehand. Live integrity assertions pass for primary coach, open enrollment and waitlist uniqueness. |
| Role catalogue | Applied `202611040002_role_catalog.sql`; live catalogue has four roles. Local database tests pass for catalogue seed and read/write grants. |
| Print/export auditing | Applied missing print-audit table. Moved audit preparation inside its error boundary so an actor lookup failure cannot become an unhandled background rejection. Regression added. |
| Migration collision | Renamed the not-yet-applied print migration from `202611030001_print_audit_events.sql` to `202611030002_print_audit_events.sql` before applying it. All 90 local migration filenames now have unique versions. Applied versions were recorded in migration history. |
| Modal lifecycle | Only release a scroll lock if the directive acquired one. Updated the photo test to open through the real click flow and tear down each fixture. |
| Regression reliability | Fee-dialog test supplies layout geometry absent from jsdom. Parent-photo test waits for FileReader output instead of a fixed 20ms delay. |
| Legacy Fees links | Redirect pending and summary links using UrlTrees with explicit query parameters. Route checks now assert canonical destinations for documented redirects. |

## Verification

- Full unit suite: **775 tests passed in 142 files**, no unhandled-error report. `artifacts/release-unit-tests-final.log`.
- Script suite: **39 tests passed**. `artifacts/release-script-tests.log`.
- Browser mock-auth checks: all five auth/access tests passed, covering restricted direct routes, Coach/Parent navigation, session reload and logout. Both route tests passed after redirect corrections, including the module route list. `artifacts/release-browser-tests.log` preserves the initial route failure; `artifacts/release-browser-routes-final.log` contains the corrected passing run.
- Production build passed: `artifacts/release-build.log`.
- Live financial SQL assertions passed: payment retry identity, partial-refund balance, mismatched refund-reference rejection, top-up, full refund and pagination-stable metrics. Used existing Admin identity claims in SQL, not a browser login; all test fixtures rolled back. `artifacts/release-payment-accuracy.sql`.
- Live enrollment SQL assertions passed for Admin creation/transfer/capacity/history and Coach/Parent denial. Adapted the staff test to the available Admin profile; omitted its Receptionist-specific direct-update assertion. All fixtures rolled back. `artifacts/release-admin-enrollment.sql`.
- Live attendance day-stat assertions passed after retrying a transport failure; fixtures rolled back. Source: `supabase/tests/attendance_day_stats.sql`. This is not a full attendance browser-save acceptance test.
- Read-only live student scopes matched expected results for one available Admin, Coach and Parent, and anonymous reads were denied. Selected Coach had no allowed student fixture; selected Parent had no forbidden student fixture, limiting positive/negative coverage. `artifacts/release-existing-role-scope.sql`.

## Still required before handover

1. Working test-account credentials/session for actual Supabase login, Users/list/audit HTTP requests, save/reload and receipt browser checks. No E2E credential environment variables were configured during this run.
2. A designated active Receptionist account and linked Coach/Parent fixtures covering both permitted and forbidden records. Live profile counts showed no active Receptionist; the original four-role fixture check correctly failed rather than claiming coverage.
3. A complete end-to-end browser flow: student creation → enrollment → attendance save → payment → receipt and balance. Database assertions cover portions only.
4. A fresh usable backup and isolated restore rehearsal. `npm run backup` failed at Docker preflight and created no backup. Existing recovery notes are in `BACKUP_RESTORE.md`; do not reset or format Docker data merely to bypass this blocker.
5. Publish the approved frontend build and verify production URLs. This run did not deploy the frontend.
6. Agree the delivered feature list with the client. No unverified feature was silently removed or marked complete. External messages, token-backed password recovery and optional notification/QR/offline flows remain outside the passing evidence.

The database checks used SQL identity claims and/or service-role queries. They verify database behavior, not password authentication, Edge HTTP behavior or a complete UI session.
