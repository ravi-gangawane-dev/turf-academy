# Client demo verification — 10 November 2026

## Requested rerun — 10 November 2026, approximately 19:07 IST

Reran the existing checks without changing application or test code. Results match the earlier run:

| Check | Fresh result | Log |
| --- | --- | --- |
| Production build | Passed | `artifacts/rerun-build.log` |
| Unit tests | 776 passed, 142 files | `artifacts/rerun-unit.log` |
| Script tests | 39 passed | `artifacts/rerun-scripts.log` |
| Lint | 26 errors | `artifacts/rerun-lint.log` |
| Full mock browser suite | 45 passed, 13 failed | `artifacts/rerun-browser.log` |
| Selected live demo workflows | 7 passed, 7 failed | `artifacts/rerun-live.log` |
| Production-build PWA/monitoring | 2 passed | `artifacts/rerun-pwa.log` |

All four live role-page checks, Coach/Parent financial restrictions, and the core student → enrollment → attendance → payment → receipt → report workflow passed again. The same extended-workflow selector/setup failures and local UI-contract failures reproduced. Report accuracy again timed out filling a disabled date field. Logs contain no fixture-cleanup assertion failure. Browser failure evidence is under `test-results/rerun-mock` and `test-results/rerun-live`; live traces were disabled. This rerun does not verify a hosted frontend or external message delivery.

## Decision

The core supervised demo workflow passed against the real Supabase backend using the four supplied QA accounts. This is not an all-features or hosted-deployment sign-off. The frontend was served locally; no deployed demo URL was supplied. No deployment or application-code fixes were performed.

## Verified for the core demo

- Admin, Receptionist, Coach and Parent sign-in, their listed portal pages, desktop/mobile shell checks, and logout: all four live role-page tests passed.
- Real student registration and active batch enrollment.
- Real attendance check-in, reload, check-out, and persisted timestamps/status.
- Cash payment of 500 against a 1,000 charge; database balance confirmed as 500 paid and 500 outstanding.
- Receipt preview, reload persistence, and exactly one payment record.
- Fee report generation with the created student present.
- Coach and Parent denial tests for enrollment and financial mutations passed.

The core workflow uses uniquely named temporary records and cleanup assertions. Its passing result includes fixture cleanup. Evidence: `artifacts/demo-live-core.log`; permission checks: `artifacts/demo-live-extended.log`.

## Local browser checks

Full mock-backend browser suite: **45 passed, 13 failed** (`artifacts/demo-browser-all.log`). Failures must not be equated with 13 broken business features:

| Failure group | Count | Finding and demo implication |
| --- | --- | --- |
| Attendance history/QR/manual workflows | 5 | Tests still expect `.manual-notice`; current feedback is a toast. Snapshot confirms successful attendance feedback. Core live attendance independently passed, but later assertions in these failed tests were not reached. |
| List reset controls | 2 | Desktop/mobile list test stops at Fees because the expected Reset button is absent. Clear fields individually during the demo; restore or revise the intended reset behavior before accepting this check. |
| Notification batch filtering | 2 | Expected batches combobox is absent from the current notification screen. Do not promise batch filtering on this screen until the UI contract is reconciled. External delivery is not tested. |
| Table toolbar alignment | 2 | Students toolbar differs from the test's expected right-edge alignment by 12px versus 2px tolerance. Cosmetic contract mismatch, not evidence of failed data operations. |
| Permissions-table export | 1 | Test targets a legacy permissions matrix and an absent Export page control. The route now redirects to Users; this does not prove current directory exports are broken. |
| Mobile recovery validation | 1 | Expected password-mismatch alert is absent. Successful email/token recovery was not exercised; keep it outside the demonstrated workflow until checked. |

Passing local checks include critical responsive screens, auth/access navigation, batch layouts, invoice/statement/receipt/refund printing, attendance register/matrix, ID cards, enrollment confirmation and roster printing. These print tests use fixtures and do not certify every live data combination.

Production-build checks: **2 passed** (`artifacts/demo-production-checks.log`): manifest/icons/service-worker registration, cached login reload/reconnect, and error reporting through the locally intercepted collector. This does not verify deployed function logs or offline attendance writes.

## Extended live checks requiring follow-up

Admin and Receptionist enrollment and batch/waitlist workflows stop at error-feedback assertions. The tests expect `role=alert`, while current mutation code reports errors through ToastService. Later workflow steps are therefore unverified in these runs; do not label batch promotion or complete enrollment lifecycle as passed. The core successful enrollment path above is independently verified.

Extended live result: **2 passed, 7 failed** (`artifacts/demo-live-extended.log`). The failures consist of the four enrollment/batch cases above, two QR cases, and one report case:

- QR tests stop while looking for a `role=status` success message; later database/reload/check-out assertions are not reached. Test students have no linked active parent, producing a WhatsApp-preparation warning. No message was sent. Do not certify complete QR persistence from these failed runs.
- Refund/report accuracy times out while the report remains on Period=Today with disabled From/To inputs. The test tries to fill dates without selecting Date range first. This is a test setup mismatch, not evidence that refund totals are wrong; its accuracy assertions remain unverified.

Combined live runs: **7 passed, 7 failed across 14 tests**. Failed workflow tests still execute fixture teardown; the logs contain no fixture-cleanup assertion failure. The full original suite was not run; external delivery and recovery-token workflows remain excluded.

## Existing checks from this session

- Production build passed.
- 776 unit tests passed in 142 files.
- 39 script tests passed.
- Lint still fails with 26 errors.

Evidence: `artifacts/audit-current-build.log`, `artifacts/audit-current-unit.log`, `artifacts/audit-current-scripts.log`, `artifacts/audit-current-lint.log`.

## Before presenting to the client

1. Verify the actual hosted URL and deployed version with the same core walkthrough.
2. Prepare stable, clearly labelled demo records; these verification fixtures are temporary, not demo seed data.
3. Use the verified online student → enrollment → attendance → payment → receipt → report flow.
4. Keep automated messages, password recovery, offline attendance, unverified advanced workflows and physical-camera promises outside the demo scope.
5. Reconcile stale browser assertions and the missing filter/reset controls before claiming all features pass.

No credentials are included in this report. Browser tracing was disabled for live credential-based runs. External messages were not sent by this verification.
