# Repair plan and progress tracker

Updated: 19 October 2026

19 October: [live release verification](LIVE_RELEASE_VERIFICATION.md) records 19 distinct passing core/correction browser cases, one recovery case, four refund UI/access cases, passing refund accuracy, and 14 passing Events/automation assertions in rollback-only testing. Events deployment candidate is staged with scheduling paused; the eight-digit recovery fix is included in the rebuilt recovery archive; refund verification required only test changes.

Current release handoff: [Monday release checklist](RELEASE_2026-10-19.md). Fresh local checks passed: production build, 205 unit tests, 28 mock browser tests and 1 production PWA test. Selected live verification is recorded separately; remaining scope is listed below.

16 October backend follow-up: [read-only preflight](BACKEND_RELEASE_PREFLIGHT.md) verified current list RPCs, user-management function source, RLS enablement and four-role student SELECT isolation. Events/automation dependencies are confirmed absent; migration history needs reconciliation. Live write tests and target-environment confirmation remain pending.

Read this file before resuming work. The [functionality audit](FUNCTIONALITY_AUDIT_2026-10-15.md) is the pre-repair baseline. Preserve unrelated workspace edits. No commits or deployment have been made by this repair pass.

Statuses: **TODO**, **IN PROGRESS**, **BLOCKED**, **DONE**. DONE requires recorded evidence. Local mock/unit success never closes a live-verification item.

## Repair progress

| ID | Status | Repair | Evidence / next action |
|---|---|---|---|
| FIX-01 | DONE | Attendance History and Calendar build blockers | Production build passed after fixing model types, Angular expressions, signal reads, missing export types and malformed calendar markup. Final production build also passed after directory CSS changes. |
| FIX-02 | DONE | Attendance History filters, paging and CSV | Filters are sent before pagination; exact server total is retained; stale responses/errors cannot replace current rows. Student options load in live mode. CSV includes student identity, escapes formulas, and explicitly exports the current page. Focused unit tests and mock check-in ? history ? filter ? export browser flow passed. |
| FIX-03 | DONE | Report chart default grouping | Preferred keys are applied in priority order. Fee/status and attendance/category tests pass. Corrected a fixture that expected five chart counts from four records; summary Present still includes checked-out records. |
| FIX-04 | DONE | Dashboard metric contrast | Hint color changed to #596b61. Dashboard axe browser check passed. |
| FIX-05 | DONE | List controls and mobile accessibility | Tests target column filters rather than obsolete toolbars. Student/parent/coach mobile columns restored. Coach filter/reset overlap corrected with automatic column sizing. Full 16 October browser suite passed, including desktop/mobile controls across all eight list pages. |
| FIX-06 | DONE | SMS route scope | Notification delivery documentation explicitly says configurable SMS was removed. Removed obsolete SMS route expectations from mock/live tests and aligned the feature catalog; legacy delivery code preserved. |
| FIX-07 | DONE | Calendar data correctness and exports | Civil month dates avoid UTC shifts; summaries read all server pages; status/student/batch filters are applied consistently; view/page changes reload; stale responses are ignored; month/week/current-page exports use the matching data. Mock attendance timestamps normalized. Unit and focused browser checks passed. |
| FIX-08 | DONE | Reliable browser-test environment | Mock Playwright uses dedicated port 4203 and refuses to reuse an existing server. Port 4200 belonged to a developer's server serving stale styles; it was left running. Live tests remain on 4202 and PWA on 4300. |
| QA-01 | DONE | Staff local regression | 205 unit tests pass across 51 files; the full 28-test mock browser suite passes, including route/layout/control checks. Full CRUD against Supabase remains LIVE-02. |
| QA-02 | DONE | Coach/parent local access and attendance regression | Fresh mock role/navigation, session/logout, queue unit tests, simulated QR decode and permission recovery pass. Database RLS and real queue replay remain LIVE-02/DEVICE-01. |
| QA-03 | DONE | Final local regression | 16 October: production build passed; 205 unit tests passed; 28 mock browser tests passed; 1 production PWA test passed. Source unchanged during verification. |

## Remaining external verification

Remaining dependencies are separated below. Authorized temporary live attendance/financial fixtures were exercised and cleaned up; SQL regressions rolled back. No account changes, external messages or website deployment were performed.

| ID | Status | Remaining | Dependency / how to unblock |
|---|---|---|---|
| LIVE-01 | IN PROGRESS | Verify deployed migrations, RPCs, RLS and Edge Function versions, especially admin-manage-users | Read-only linked-project checks completed; see backend preflight. Events/automation dependencies missing and migration ledger inconsistent with deployed column functions. Target confirmation and reviewed reconciliation/deployment still needed. |
| LIVE-02 | IN PROGRESS | Core persistence, role isolation, enrollment, attendance/corrections, finance/refunds and recovery | Core cases now verified against the linked project: 19 core/correction browser cases, four refund UI/access cases and refund SQL. Operator-assisted recovery also passed (eight-digit input fixed); local recovery-email receipt/reset/sign-in is user-confirmed; deployed-host recovery acceptance and broader non-core CRUD remain pending; see live verification report. |
| LIVE-03 | BLOCKED | Actual email/WhatsApp delivery and provider status | Needs configured providers and an explicitly authorized recipient/message. Do not send messages based only on this tracker. |
| DEVICE-01 | BLOCKED | Physical phone QR scanning, PWA installation and offline/reconnect | Requires target Android/iOS devices and observed hardware results. Simulated camera video and browser offline checks are not substitutes. |

## Verification log

16 October release run: `tmp/release-2026-10-19/build.log`, `unit.log`, `browser.log` and `pwa.log` record the fresh successful checks. Browser run: 28 passed in 6.3 minutes. No application changes were needed. Packaged production artifact and checksums are in the same ignored directory. This is not production or live-backend certification.

| Stage | Result | Scope / limitation |
|---|---|---|
| Audit baseline | 197 unit passed, 2 failed; initial build/PWA passed; later build failed after external Attendance History edits | Historical baseline only. |
| Repair unit suite | `npm test -- --watch=false`: **205 passed**, 51 files | Includes history filter/stale-response/CSV tests, capped calendar summaries, month/list controls and timestamp normalization. |
| Earlier full browser run | 26 passed, 2 failed | New workflow test initially had a selector issue; mobile directory filters were hidden. Subsequently fixed, but this run is not the final result. |
| Focused attendance flow | Passed on isolated mock server | Records mock check-in, filters/restores history, downloads CSV, navigates calendar months and filters calendar list. |
| Final production build/PWA | Production build passed; production PWA **1 passed** | Final CSS/timestamp changes included. Service worker, manifest/icons, offline page reload and reconnect checked. |
| Mobile control probe / repair | Found coach status input intercepting Reset; fixed | Automatic table layout applied. Isolated and final-suite 390px browser checks passed across all eight list pages. |

Raw logs and failure artifacts are under the Windows temporary directory with the `turf-repair-` prefix. The final summary should identify the exact final run rather than aggregate interrupted/stale runs.

## Next action

Continue from the Monday release checklist: confirm intended host/Supabase project and permitted test-account/data scope; verify backend compatibility and core live workflows; prepare actual host/database rollback and deploy the verified artifact. Local regression is complete. Do not claim live deployment or real delivery success without completing those separate items.

External verification references: [Supabase deployment](supabase-deployment.md), [test account setup](TEST_CREDENTIALS_SETUP.md), [notification providers](NOTIFICATION_DELIVERY_SETUP.md), [physical camera verification](QR_CAMERA_VERIFICATION_PLAN.md).

19 October follow-up: student deletion with refund history fixed and deployed (`202610190003`). Refund audit snapshots retained. Two live UI cases and deletion/payment SQL regressions passed; see LIVE_RELEASE_VERIFICATION.md.
