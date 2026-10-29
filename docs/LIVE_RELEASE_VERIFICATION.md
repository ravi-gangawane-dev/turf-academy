# Live release verification — 19 October 2026

Project: `ttuigbkaluozglzgepsh`. The user authorized proceeding with temporary test records. The four existing designated test accounts authenticated successfully; their passwords and accounts were not changed. Recovery verification later created, reset and deleted one disposable account per attempt. No external messages were sent and no website deployment was performed.

## Completed by priority

| Priority | Scope | Result |
|---|---|---|
| P0 | Admin and Receptionist enrollment/finance | Both full UI workflows passed: failed-save recovery, create/reload, pause/reactivate/transfer/cancel, charge creation, payment lost-response recovery, duplicate protection, overpayment rejection, settlement balance, history filters/pagination/CSV. |
| P0 | Coach/Parent restrictions | Both enrollment/finance mutation-denial cases passed. Six additional role-isolation cases passed, including assigned/linked versus unrelated records and protected routes. |
| P0 | Attendance | Admin/Receptionist persisted QR-token check-in/out, failure messaging without false success, and offline browser queue replay exactly once all passed. Physical-camera acceptance remains separate. |
| P0 | Complete UI workflow | Student registration and guardian linking, enrollment, manual check-in/out, payment, receipt, report and logout passed. |
| P1 | Attendance correction | Approval, rejection with reason, concurrent duplicate prevention, duplicate attendance rejection and invalid checkout timestamp rejection passed (four cases). |
| P1 | Refund accuracy | SQL regression passed for partial/full refunds, idempotency, net balance, top-up after refund and settlement filters. Uses newly created fixtures, rolled back in full. Four additional live browser cases now verify the Admin refund workflow and denial for Receptionist, Coach and Parent; see refund acceptance below. |
| P0 | Operator-assisted recovery | Live eight-digit code, password reset, automatic logout, new-password browser login, old-password rejection and code-reuse rejection passed. Disposable account deleted. See `ACCOUNT_RECOVERY.md`. |
| P1 | Missing Events/automation backend | Four selected migrations passed 14 assertions in a rollback-only transaction. Deployment candidate separately passed migration-ledger and paused-scheduler assertions. Still staged, not deployed. |

## Exact runs

Evidence is in ignored `tmp/release-2026-10-19/`:

- `live-core-monday.log`: seven cases passed, followed by one stale empty-state-selector failure; seven remaining cases were not run in this attempt.
- `live-core-remaining.log`: corrected offline case plus the seven previously unrun cases passed (8/8).
- `live-corrections-final.log`: four correction cases passed (4/4).
- Together these establish **19 distinct browser cases passed across targeted runs**, not a claim that one full live suite ran green.
- `account-recovery.log`: one live operator-assisted recovery case passed; `recovery-unit.log`: 12 tests passed; `recovery-build.log`: fresh production build passed; `recovery-pwa.log`: production service-worker/manifest check passed. The updated archive contains 110 files, each verified against build output.
- `refund-accuracy.json`: database regression exited successfully; its transaction ended with rollback.
- `events-preflight.json`: all 14 pgTAP assertions passed; schema, scheduled job and fixture notifications rolled back.
- `events-candidate-preflight.json`: exact proposed schema/ledger package checked with the hourly job paused, then rolled back.

Test maintenance corrected obsolete search/status controls, report date-range selection and expected public validation messages. The fixture now registers newly created students for teardown even if the test body times out. The failed initial workflow's exact-run leftover student/batch/plan (`986aaf95`) was removed; subsequent fixture cleanup assertions passed. The automation regression now qualifies ambiguous SQL variables and includes academy-level event notices when counting five rendered notices.

Recovery verification subsequently exposed a six-digit-only UI constraint against eight-digit backend codes. The input, validator and help text were corrected; 12 focused recovery unit tests and the live recovery case passed. A fresh production build and separately named recovery release archive replace the earlier archive for release purposes. See `ACCOUNT_RECOVERY.md` and `recovery-artifact-manifest.json` in the evidence directory.

## Events deployment candidate

`tmp/release-2026-10-19/events-backend-release.sql` contains only migrations `202610130002`, `202610130005`, `202610130006`, `202610130007`, their migration-history entries, and an explicit `cron.alter_job(... active := false)` within one transaction. The job is never committed active. One-off named-student migrations `202610130003`/`202610130004` are excluded. No provider send function is invoked.

`events-before.json` preserves the previous affected function, trigger and template definitions. `events-release-manifest.json` records the exact script checksum and deployment state. This is an affected-object recovery snapshot, not a complete database backup.

Applying this script is awaiting the specific shared-schema deployment confirmation requested in chat. After approval, first confirm the candidate checksum and that the project/schema have not changed since the snapshot, execute against the explicit project, then verify migration entries, RLS, inactive cron and temporary Events create/edit/delete behavior. Re-run affected attendance regressions because the migration updates the attendance-notification trigger. Do not run the excluded one-off migrations or enable automated/external messages without the agreed recipient/channel scope.

## Still required for release

- Apply and verify the Events package, or explicitly exclude Events/Holidays from this release.
- Confirm host/domain, retain the old deployed frontend and verify the production deployment/cache/deep-link behavior.
- Assign the recovery operator/support contact and smoke-test the documented operator-assisted process on the deployed host. The local UI against live Supabase is verified; recovery email delivery remains unverified.
- Physical phone QR/PWA acceptance and actual external delivery remain unverified. Online/manual-attendance operation is the documented fallback.
- Broader non-core live features (all profile uploads, every settings/account-management action, all report variants) are not certified by these selected checks.

## Refund UI acceptance ? 19 October 2026

`e2e/live-refund-workflow.spec.ts`: **4/4 passed** in `tmp/release-2026-10-19/refund-ui-final.log`.

- Admin: open/cancel without mutation; reject excessive amount and short reason; retain entered amount after a failed save; recover a committed refund after a lost response without duplication; partial refund of 25.25 against 100.50; persist partial status after reload; default the remaining refund to 75.25; complete full refund and disable further refund action after reload.
- Database: exactly two refund records totaling 100.50, net paid 0, outstanding balance 100.50. Fees UI and payment dialog show the restored outstanding amount.
- Receptionist, Coach and Parent: refund route denied and direct refund RPC rejects with permission error `42501`.
- No client records or actual bank/card transfers were used. This verifies the application's refund ledger; provider-side money movement is outside this workflow.
- First attempt passed workflow assertions but failed fixture teardown: refund rows prevent payment deletion, and ordinary Admin cannot delete those rows directly. Its exact-run fixtures were subsequently removed. The final test removes only its own refund rows with an operator client before normal fixture teardown; all cleanup assertions passed. Run with `SUPABASE_SERVICE_ROLE_KEY` supplied privately through the process environment, never committed or printed.
- No application/backend changes were needed. The existing recovery release archive remains current. This adds four live browser cases to the previous 19 core/correction cases and one recovery case: **24 distinct cases across targeted runs**, not one full-suite run.

## Local recovery email acceptance

User confirmed email receipt, successful password reset and subsequent login on localhost:4200 after the authorized Auth URL correction. Exact temporary account deleted and absence verified. Evidence: `local-recovery-email-result.json`. This is user-confirmed local email acceptance, not an additional automated browser case. Production-domain redirects and separate notification-provider delivery remain pending.

## Student deletion after refunds ? fixed and deployed

Migration `202610190003_student_delete_refunds.sql` applied to `ttuigbkaluozglzgepsh`; migration ledger entry and empty function search_path verified. The function keeps existing Admin-only permanent deletion semantics, removes dependent refunds before payments and stores each exact deleted refund in `audit_logs` with the actor and DELETE action. Existing payment audit trigger retains payment deletion snapshots. Affected students/charges/payments are locked before deletion. This is permanent ledger removal with audit retention, not an archive feature or a provider-side refund.

Verification:
- New SQL regression reproduced FK error 23503 before the change, passed with the candidate in a rollback-only transaction and passed against the deployed function. Covers no-refund/partial/full-refund deletion, exact audit snapshots, non-Admin denial, unrelated student survival and missing-student rejection.
- Existing `payment_accuracy.sql` passed against the deployed database; fixtures rolled back.
- `e2e/live-student-delete-refunds.spec.ts`: 2/2 live UI cases passed (partial and full refunds), including reload, dependent-record removal, retained audit evidence and fixture cleanup. First browser attempt failed only because its success-message selector matched both the inline notice and toast; corrected to the inline notice.
- Pre-change function snapshot: `tmp/audit/student-delete-function-before.json`. Deployment used a transaction and exact prior-definition guard. The initial guard attempt aborted due to Windows CRLF conversion; the UTF-8/LF script then applied successfully.
- Logs: `tmp/audit/student-delete-before.log`, `student-delete-preflight.log`, `student-delete-after.log`, `student-delete-payment-regression.log`, `student-delete-browser-final.log`.

Only test-owned student/financial records were deleted during verification. No customer records were deleted. This backend-only fix requires no frontend rebuild; the separately identified old release ZIP freshness issue remains.

## Coach dashboard/schedule completeness fix

Removed fixed 2,000 attendance / 1,000 session total limits in `coach-portal.service.ts`. Uses the existing complete-page reader with exact totals, requests of 500 rows, stable date/time/ID order and original batch/date filters. Continues even when the server returns smaller pages; rejects later-page failures or early empty responses instead of returning partial data.

Fresh checks: 227 unit tests across 53 files passed; production build passed. `e2e/live-coach-large-data.spec.ts` passed with real Coach authentication and synthetic response datasets: 2,401 attendance rows (2,000 present, 401 absent, 83%) and 1,301 sessions, including last session on the schedule. These large datasets were not inserted into Supabase. First browser attempt matched the session text too strictly (UI also includes venue); the corrected calendar-event selector passed.

Logs: `tmp/audit/coach-complete-unit.log`, `coach-complete-build.log`, `coach-complete-browser-final.log`. No database/schema changes needed. Complete records are still assembled and summarized in browser memory; server aggregates and on-demand visible-window queries remain future scalability work. Updated frontend requires deployment; previous ZIP is stale.

## Login / forgot-password / recovery-code recheck

Fresh dedicated recovery-config run: **7/7 browser tests passed**, plus **12/12 recovery unit tests**. Logs: `tmp/audit/auth-complete-browser.log`, `tmp/audit/auth-complete-unit.log`.

- Live Admin, Receptionist, Coach and Parent sign-in, session reload, logout and protected-route rejection after logout passed.
- Disposable account: invalid-password login rejected; invalid recovery code rejected; genuine eight-digit operator-generated recovery code accepted; password update and sign-out passed; new-password browser login passed; old password and consumed code rejected. Temporary account deleted and absence verified.
- Forgot-password UI: correct email and origin-specific reset redirect sent; failed request shows error without success; retry shows enumeration-safe confirmation. This browser case intercepts provider responses and sends no email. Actual local email receipt/reset/login remains separately user-confirmed.
- Expired-link error parameter shows recovery guidance and a fresh-request action. This checks error handling, not elapsed-time expiration of a real token.

No application changes were needed. Existing account passwords remain unchanged. Recovery traces/screenshots/video are disabled. Production-domain acceptance remains pending.
