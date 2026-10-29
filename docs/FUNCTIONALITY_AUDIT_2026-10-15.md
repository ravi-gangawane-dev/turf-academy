# Functionality audit — 15 October 2026

This is the pre-repair baseline. See [the repair tracker](REPAIR_TRACKER.md) for subsequent fixes and current blockers.

This is a local source review and automated-check audit, not production certification. No application code was changed for this audit. Live database mutations, account changes, payments and message delivery were not exercised.

## Verification and moving-workspace limitation

- Initial production build passed.
- Unit suite completed: **197 passed, 2 failed across 47 files**.
- Production PWA check passed: manifest/icons, service-worker registration, offline sign-in-page reload and reconnect. This does not test successful offline authentication.
- Browser suite began with 27 tests. Eight checks passed before compilation errors appeared (login accessibility, two attendance layout checks and five authentication/access checks). Dashboard accessibility and desktop batch-toolbar checks failed before those compilation errors.
- Attendance History source/template changed externally during the run. The development server then reported compilation errors. The browser run was stopped because subsequent outcomes could not reliably describe individual features.
- A second production build independently **failed** against the changed Attendance History files. Earlier unit/PWA successes describe the earlier revision, not the final workspace. Do not combine these results into a single full-suite pass percentage.

## Feature status

“Working locally” means the named checks passed, often with mocked services; it does not mean the entire feature works against deployed Supabase. “Partial” includes implemented functionality with incomplete verification.

| Feature | Status | Evidence and limitation |
|---|---|---|
| Build / compilation | Not working in latest checked source | Attendance History causes compiler errors; initial build had passed before external edits. |
| Sign-in, restored session, logout | Working locally | Auth unit tests and browser session/reload/logout checks passed. Live authentication not exercised. |
| Role navigation / protected routes | Working locally | Coach/parent boundaries and unauthenticated redirects passed in mocks. Database authorization remains unverified. |
| Account recovery / OTP / password reset | Partial | Validation, rejected/expired links and mocked submission unit tests pass. Actual email, OTP and real-account recovery unverified. |
| Dashboard | Partial | Navigation works and recent-activity unit checks pass. Accessibility fails on metric hint contrast, 3.77:1 against white versus 4.5:1 expected. Live totals unverified. |
| Student registration and parent linking | Partial | Mock store creation/linking checks pass; routed forms exist. Real save, reload and deletion unverified. |
| Student directory / filters / sorting / pagination | Partial | Current source includes column filters and sortable headings. Old browser checks expect a removed app-filter-bar. Current controls need browser and live query verification. |
| Student profiles, medical data, photos, documents, timeline | Partial | Dedicated implementation exists. Upload/download, persistence and access control were not exercised end to end. |
| Parent directory / details | Partial | Profile/linking, detail state/pagination and complete export unit checks pass. Live CRUD, photos and filters unverified. |
| Coach directory / details | Partial | Mock creation/profile/assignment checks and detail pagination checks pass. Live CRUD and photos unverified. |
| Batches / allocations / coach assignments / schedules / capacity | Partial | Save failure handling, directory and backend-query unit checks pass. Browser tests still target old toolbar markup. Live mutations unverified. |
| Batch waitlist | Partial | Waitlist unit suite passes; deployed RPC and real entries not checked. |
| Enrollment create / transfer / pause / reactivate / cancel / history | Partial | Workflow validation, retry behavior, history queries and mock transfer checks pass. Live transactions unverified. |
| Manual attendance check-in/out | Partial | Store validation and repository routing/error tests pass; desktop/mobile layout checks passed before source changed. Actual writes not verified. Search input exists in the Search Student card. |
| QR attendance | Partial | Identity validation unit checks pass; simulated camera/error tests exist but were not reached in this interrupted browser run. Physical camera and persisted attendance unverified. |
| Attendance History | Not working in latest checked source | Compiler errors; student selector is not forwarded to history query; status filtering applies only to loaded page. CSV implementation incorrectly calls map on a signal. |
| Attendance calendar / correction requests | Partial | Earlier-in-run layout checks and calendar export unit tests pass. Live correction approval and calendar data accuracy not exercised. |
| Offline attendance queues | Working logic locally; live sync unverified | Staff/coach queue unit suites pass. Device reconnect and live replay not exercised. |
| Fee plans / monthly charges / discounts / late fees / pending totals | Partial | Fee and finance unit suites pass, including validation/query behavior. Real database rules and financial writes unverified. |
| Payments / partial-full settlement / refunds | Partial | Mock overpayment protection, retry keys, refund limits and server-total query checks pass. Live recording/refund transactions unverified; no payment-gateway certification. |
| Receipt PDF generation | Working locally | Receipt PDF unit tests pass. Browser download and live receipt accuracy not independently checked. |
| Reports / CSV / currency / refund totals | Partial | Ten Reports page tests and supporting report/CSV/data tests pass; two chart tests fail. Live report accuracy unverified. |
| Automatic chart grouping | Not working as expected by tests | Fees group by period rather than status; attendance groups by date rather than status. Selection logic follows report-column order instead of preferred-key order. |
| SMS page | Unavailable | /notifications/sms is absent from routes and falls through to dashboard. Templates explicitly exclude SMS, so restoring SMS may be a scope decision rather than just adding a route. |
| Notification log / templates / status views | Partial | Query/filter/sort/pagination, template and provider unit checks pass. Actual delivery status and live updates unverified. |
| Email / WhatsApp / SMS delivery | Unverified | Provider/worker implementations exist. Configuration, deployment and real delivery were not checked. |
| Events / holidays / birthday automations | Partial | Page, services and migrations exist. Scheduled execution and notifications not exercised. |
| Users & Roles | Partial | Function request and pagination response tests pass. Deployed admin-manage-users version and real account operations unverified. |
| Academy settings | Partial | Settings routes and save paths exist. Live persistence/effect across all consumers not checked. |
| Audit logs / export | Working logic locally; live access unverified | Column controls, queries, stale-response handling and export snapshot unit checks pass. Deployed policies/data unverified. |
| Appearance / permission reference / records export | Working locally within limited scope | Settings tools unit tests pass. Permission reference is not a permission editor. Records export is not full backup/restore of files and authentication accounts. |
| Academy-wide search | Partial | Query-driven search page and service exist. Real search results and scope not browser-verified. |
| Coach portal | Partial | Role navigation and queue logic pass. Live assigned-data scope, attendance, corrections, schedule, notifications and profile saves unverified. |
| Parent portal | Partial | Access boundaries and fee/net-payment summary unit checks pass. Live linked-child scope and full portal workflows unverified. |
| PWA / offline application shell | Working on initial build | Production PWA check passed. Physical installation, camera behavior and offline sign-in authentication are not established. |
| Responsive design / accessibility | Partial | Initial attendance checks passed at 1440px and 390px; login accessibility passed. Dashboard contrast fails and full browser run was interrupted. |

## Confirmed source findings

1. **Attendance History build blocker:** `src/app/features/attendance/attendance-history-page.html` uses `student.full_name` on the application's `Student` model, unknown values with DatePipe, and an unsupported template `as any` cast. Its TypeScript file assigns typed history rows to an incompatible record array and calls `this.visibleRecords.map` rather than reading the signal. The latest build reports these errors.
2. **Attendance History filtering:** `loadAttendanceHistory()` calls `attendance.history(fromStr, toStr, page, pageSize)` without its student/status filter argument. `studentId` triggers reload but does not scope the request. Status is filtered after pagination, so displayed rows and total may disagree.
3. **Report chart grouping:** `selectedChartGroup` uses `columns.find(column => preferred.includes(column.key))`, choosing the first matching report column rather than the highest-priority preferred key. The attendance test also expects five category counts from four fixture rows; its expected result needs review alongside the implementation. The attendance summary assertions pass before the chart assertion fails, so this is not evidence that all attendance totals are wrong.
4. **Dashboard contrast:** `.metric-hint` in `src/app/shared/summary-metric-card/summary-metric-card.scss` uses `#77877f` on white, reproducing the accessibility failure.
5. **Stale browser selectors:** `e2e/list-layout.spec.ts`, `batch-tabs-layout.spec.ts` and `coach-assignment-layout.spec.ts` look for old filter-bar markup. Current students/batches templates contain column filters. `page-hero.spec.ts` scopes Search students to `app-page-hero`, while the input exists outside it in `manual-check-in-page.html`. These assertions cannot establish that search/filter functionality is absent.

## Recommended order

1. Restore compilation of Attendance History and correct its query/filter/export wiring.
2. Correct report default grouping and reconcile the attendance chart fixture expectation.
3. Fix dashboard contrast.
4. Update browser selectors to the current UI and run the complete suite on a stable source snapshot.
5. Resolve intended SMS scope; then verify deployed migrations/functions and designated live-account workflows.

Raw audit logs are in the Windows temporary directory as `turf-audit-build.log`, `turf-audit-unit.log`, `turf-audit-browser.log`, `turf-audit-pwa.log` and `turf-audit-build-final.log`. Browser failure artifacts are under `turf-audit-browser` there.
