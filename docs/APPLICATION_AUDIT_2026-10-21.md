# Application audit — 21 October 2026

Read-only source/test/backend audit of the current workspace. No application code was changed. This document is the audit deliverable.

## Scope and interpretation

Inventory inspected: 123 route declarations (including layouts/redirects), 66 component declarations, 312 literal button declarations and 25 literal form declarations. These are static counts, not unique features or proof that every rendered control was executed. Source review covered authentication, dashboards, students, parents, coaches, batches, enrollment, attendance, fees, payments, notifications/events, reports, settings, portals and shared UI.

The feature totals below count the **56 explicitly listed workflow checks** in this report, not every possible action combination. Working means the stated check passed at the stated evidence level; it does not certify untested live mutations. Missing means an end-to-end capability is absent despite an existing related UI/data model, or a necessary recovery gap. Confirmed source defects are distinguished from threshold/failure-path risks and tests still required. There are **no confirmed Critical issues**; High findings can still affect data integrity and should be addressed before relying on the affected workflows.

## Summary

| Status | Workflow checks |
|---|---:|
| Working | 18 |
| Partially Working | 17 |
| Not Working | 10 |
| Missing | 5 |
| Unverified | 6 |
| **Total reviewed** | **56** |

32 issue findings: 10 Not Working, 17 Partially Working, 5 Missing. Six additional checks remain Unverified and are not counted as broken. This is a broad audit, **not exhaustive runtime certification of every button, CRUD permutation, or deployed security policy**.

## Verification evidence

- Current-source production build passed in the preceding implementation verification.
- Isolated unit suite: **234 tests passed across 54 files**, completed immediately before the audit. An earlier concurrent run's timeouts are not treated as current defects.
- Fresh full mock browser suite: **31/31 passed** (4.1 minutes). Command: `npx playwright test --reporter=list --output=tmp/audit-2026-10-21/browser`.
- Fresh production PWA suite: **1/1 passed**. Command: `npx playwright test --config=playwright.pwa.config.ts --reporter=list --output=tmp/audit-2026-10-21/pwa`.
- Local fault injection against transpiled actual outbox service: persisted syncing operation → zero API calls, status remains syncing; rejected storage write → optimistic record still present, new operation not persisted.
- Fresh live read-only probe: all four designated role logins succeeded. Admin reads succeeded for students (22), parents (24), coaches (7), batches (7), enrollments (22), attendance (73), charges (36), payments (49), refunds (2), events (0), settings (1), notifications (173), templates (14), audit logs (2349), profiles (8), documents (21), medical records (7), sessions (8) and fee plans (16).
- Live staff-list, attendance workspace (21 total), dashboard analytics and admin user-list endpoints succeeded. Coach reads were scoped to 17 students/52 attendance records and zero payments; parent reads to 2 students/26 attendance records/8 payments. These observations are not exhaustive security proof.
- Fresh notification configuration probe returned **in_app and whatsapp**. External notification email is unavailable; older reports stating WhatsApp is unconfigured are stale.
- No live business CRUD, financial mutations, message sends or automation changes were performed. Credentials/tokens are omitted.
- Browser emitted oversized-logo performance warnings. A prior camera-startup cleanup test also logged a library video-play AbortError despite passing stream-release assertions; physical-device impact remains unverified.

## Findings by module

Each module is ordered High → Medium → Low. Overall execution order follows in the action plan. Evidence/source is included in each issue cell.


### Attendance

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F01 | Attendance | Interrupted offline sync | Not Working | Confirmed by fault injection: a persisted syncing operation reloads with zero API calls and remains syncing; bulk replay selects only pending/failed. [src/app/core/offline/attendance-outbox.service.ts:65](../src/app/core/offline/attendance-outbox.service.ts#L65) | High | Recover interrupted operations on load; retain idempotency and test restart after each replay stage. |
| F02 | Attendance | Queue persistence failure | Not Working | Confirmed by fault injection: storage rejection leaves an optimistic attendance record although no operation was saved. [src/app/core/offline/attendance-outbox.service.ts:31](../src/app/core/offline/attendance-outbox.service.ts#L31) | High | Persist before updating the UI, or roll back the optimistic state; await IndexedDB transaction completion. |
| F03 | Attendance | Offline event date/time | Partially Working | Confirmed source: createdAt is stored but not supplied on replay. Reconnected check-ins use server now, so overnight replay can change the business date and lateness. [src/app/core/offline/attendance-outbox.service.ts:69](../src/app/core/offline/attendance-outbox.service.ts#L69); [supabase/migrations/202609240004_operational_settings.sql:55](../supabase/migrations/202609240004_operational_settings.sql#L55) | High | Persist occurrence time and business date; validate and replay them server-side with stable operation IDs. |
| F04 | Attendance | Business-date consistency | Partially Working | Confirmed source: workspace/date lookups use UTC date while check-in SQL uses academy timezone. Dates differ during early local morning. [src/app/core/api/supabase-attendance.repository.ts:60](../src/app/core/api/supabase-attendance.repository.ts#L60); [src/app/features/coach/coach-portal.service.ts:250](../src/app/features/coach/coach-portal.service.ts#L250) | High | Use one academy-timezone business-date provider for staff, coach and server operations; test midnight boundaries. |
| F05 | Attendance | Complete manual roster/search | Partially Working | Confirmed source: workspace requests only 500 rows at offset 0 and drops the total. Manual search and loaded-roster counts cannot cover larger academies; current live roster is below this limit. [src/app/core/api/supabase-attendance.repository.ts:63](../src/app/core/api/supabase-attendance.repository.ts#L63) | High | Add server search/paging and preserve exact totals; load summary aggregates independently. |
| F06 | Attendance | Shared-device queue ownership | Partially Working | Confirmed storage design: operations have no user partition and reconnect replay is not tied to the originating account. Cross-account attribution/exposure requires controlled testing; no RLS bypass is established. [src/app/core/offline/attendance-outbox.storage.ts:4](../src/app/core/offline/attendance-outbox.storage.ts#L4); [src/app/core/offline/attendance-outbox.service.ts:94](../src/app/core/offline/attendance-outbox.service.ts#L94) | High | Partition queues by academy/user; replay only under matching authenticated identity and define logout handling. |
| F07 | Attendance | Offline reload with roster | Partially Working | Source gap: service worker caches shell assets, not the attendance dataset; pending-operation load does not rebuild the roster. Authenticated offline reload still needs browser verification. [ngsw-config.json](../ngsw-config.json); [src/app/core/state/academy.facade.ts](../src/app/core/state/academy.facade.ts); [src/app/core/offline/attendance-outbox.service.ts:92](../src/app/core/offline/attendance-outbox.service.ts#L92) | High | Persist a permission-scoped minimal roster and rebuild pending state; test offline reload and account changes. |
| F08 | Attendance | Whole visit during one outage | Partially Working | Confirmed explicit limitation: checkout of a local pending check-in throws until check-in is synced. [src/app/core/state/academy.store.ts:1028](../src/app/core/state/academy.store.ts#L1028) | Medium | Support dependent check-out operations referencing the local check-in and resolve IDs during ordered replay. |
| F09 | Attendance | Discard/clear queue reconciliation | Partially Working | Confirmed source: discard/clear removes operations without reversing or refreshing optimistic attendance state. [src/app/core/offline/attendance-outbox.service.ts:49](../src/app/core/offline/attendance-outbox.service.ts#L49) | Medium | Reconcile the affected local records and summaries after discard/clear; test online and offline behavior. |

### Students

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F10 | Students | Coach field save | Not Working | Confirmed source: the form exposes/loads coach, but the save mutation omits it. A changed selection cannot persist through this form. [src/app/features/students/student-form-page.ts:43](../src/app/features/students/student-form-page.ts#L43); [src/app/features/students/student-form-page.ts:112](../src/app/features/students/student-form-page.ts#L112) | High | Persist the intended assignment through an authorized API, or replace the editable field with derived batch-coach information. |
| F12 | Students | Medical record editing | Missing | Detailed medical records are displayed, but no editor/write workflow was found for allergies, conditions, medications or emergency notes; blood group is editable separately. [src/app/features/students/student-details-page.html:300](../src/app/features/students/student-details-page.html#L300); [src/app/features/students/student-form-page.ts:112](../src/app/features/students/student-form-page.ts#L112) | High | Add a permission-controlled medical editor with validation and audit history. |
| F13 | Students | Create retry recovery | Partially Working | Confirmed source risk: each create attempt generates a new UUID, with photo upload and cleanup outside the RPC. Lost-response/retry duplication or cleanup after a committed write needs fault testing. [src/app/features/students/student-list.service.ts:473](../src/app/features/students/student-list.service.ts#L473) | High | Retain one mutation ID per attempt, recover committed results and clean up only known-uncommitted uploads. |
| F11 | Students | Document lifecycle | Missing | Document metadata is displayed, but the student workspace has no upload, open/download or delete workflow. Generic storage support alone does not implement it. [src/app/features/students/student-details-page.html:180](../src/app/features/students/student-details-page.html#L180); [src/app/features/students/student-details-page.ts](../src/app/features/students/student-details-page.ts) | Medium | Add authorized upload, signed download, metadata and deletion flows with file validation and failure cleanup. |
| F14 | Students | Detail shortcut context | Partially Working | Attendance and Payment history shortcuts navigate to generic workspaces without the student identifier. [src/app/features/students/student-details-page.ts:104](../src/app/features/students/student-details-page.ts#L104) | Medium | Pass student context and preselect/filter the destination, or open the existing student-specific history tab. |
| F15 | Students | Document total | Not Working | Overview uses the loaded document-page length rather than documentTotal, so it undercounts students with more than the first page. [src/app/features/students/student-details-page.html:174](../src/app/features/students/student-details-page.html#L174); [src/app/features/students/student-list.service.ts:400](../src/app/features/students/student-list.service.ts#L400) | Low | Render documentTotal and test a student with more than five documents. |

### Parents

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F16 | Parents | Editing inactive parent | Not Working | Confirmed source: every parent save sets status active, including edits to an inactive record. [src/app/features/parents/parent-form-page.ts:101](../src/app/features/parents/parent-form-page.ts#L101) | High | Preserve existing status or expose an explicit authorized status change. |
| F17 | Parents | Parent save plus child link | Partially Working | Confirmed source: parent write succeeds before a separate link request. Link failure leaves a partially saved workflow; duplicate creation on retry needs fault testing. [src/app/features/parents/parent-form-page.ts:106](../src/app/features/parents/parent-form-page.ts#L106) | High | Make parent/link save transactional or retain saved identity and retry only the failed step. |
| F18 | Parents | Student selection at scale | Partially Working | The parent form loads only students 0–499, with no server-side lookup for later students. [src/app/features/parents/parent-form-page.ts:52](../src/app/features/parents/parent-form-page.ts#L52) | Medium | Replace the fixed list with paginated server search and retain the currently linked student. |

### Parent portal

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F19 | Parent portal | Child attendance statistics | Not Working | The child profile computes percentage/counts from workspace attendance, which loads only the first five records; the full summary is available but unused. [src/app/features/parents/parent-child-profile-page.ts:38](../src/app/features/parents/parent-child-profile-page.ts#L38); [src/app/features/students/student-list.service.ts:380](../src/app/features/students/student-list.service.ts#L380) | High | Use attendanceSummary for totals/rate; test a history whose first five records differ from its full distribution. |
| F20 | Parent portal | Child profile history paging | Partially Working | Child attendance/payment/document tabs show the initial workspace pages without pagination. Separate portal list pages do not fix this profile workflow. [src/app/features/parents/parent-child-profile-page.html](../src/app/features/parents/parent-child-profile-page.html); [src/app/features/parents/parent-child-profile-page.ts](../src/app/features/parents/parent-child-profile-page.ts); [src/app/features/students/student-list.service.ts:371](../src/app/features/students/student-list.service.ts#L371) | Medium | Add pagers or explicit links to complete, child-filtered histories. |

### Coaches

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F21 | Coaches | Specialization update atomicity | Partially Working | Confirmed source: old specializations are deleted before replacements are inserted. An insert failure loses the previous selection. [src/app/core/supabase/domain-services.ts:650](../src/app/core/supabase/domain-services.ts#L650) | High | Use a transactional RPC for coach and specialization changes; inject insertion failures in tests. |

### Coach portal

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F22 | Coach portal | Student detail buttons | Not Working | More, Documents and Parent details buttons have no action binding. Notes navigates to general notifications rather than a student notes workflow. [src/app/features/coach/coach-portal-page.html:692](../src/app/features/coach/coach-portal-page.html#L692); [src/app/features/coach/coach-portal-page.html:728](../src/app/features/coach/coach-portal-page.html#L728) | Medium | Implement the destinations/actions, or remove/disable unsupported controls with an explanation. |
| F23 | Coach portal | Complete roster loading | Partially Working | Coach batch/student queries lack paging, so a server response cap can truncate a large assigned roster. This is a threshold risk, not a failure reproduced with current live data. [src/app/features/coach/coach-portal.service.ts:114](../src/app/features/coach/coach-portal.service.ts#L114); [src/app/features/coach/coach-portal.service.ts:125](../src/app/features/coach/coach-portal.service.ts#L125) | Medium | Use server paging or the existing read-all-pages helper; test datasets larger than the server cap. |

### Dashboard

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F24 | Dashboard | Recent check-ins ordering | Not Working | Today's attendance is sliced to five without ordering by check-in time or excluding rows without check-in; the resulting list is not reliably the latest check-ins. [src/app/core/api/supabase-dashboard.repository.ts:84](../src/app/core/api/supabase-dashboard.repository.ts#L84) | Medium | Filter non-null check-ins and order descending on the backend before limiting. |

### Fees

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F25 | Fees | Assign student discount | Missing | Discount catalog and student_discounts table exist; generation consumes assignments, but no application assignment workflow was found. [supabase/migrations/202609240004_operational_settings.sql:20](../supabase/migrations/202609240004_operational_settings.sql#L20); [src/app/core/supabase/domain-services.ts](../src/app/core/supabase/domain-services.ts) | High | Add student/enrollment discount assignment, validity dates, permissions and a charge preview. |
| F26 | Fees | Apply late-fee rules | Missing | Late-fee rule CRUD exists, but no calculation/application workflow referencing those rules was found in app/functions/migrations; monthly generation only calculates base and discount. [src/app/core/supabase/domain-services.ts:1142](../src/app/core/supabase/domain-services.ts#L1142); [supabase/migrations/202609240004_operational_settings.sql:10](../supabase/migrations/202609240004_operational_settings.sql#L10) | High | Define assessment timing and caps; implement idempotent assessment and auditable charge adjustments. |

### User management

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F27 | User management | Link invited coach/parent account | Missing | Invite creates Auth/profile records but does not connect the account to coaches.profile_id or parents.profile_id. Portal services depend on that link; externally prelinked accounts can work. [supabase/functions/admin-manage-users/index.ts:80](../supabase/functions/admin-manage-users/index.ts#L80); [src/app/features/coach/coach-portal.service.ts](../src/app/features/coach/coach-portal.service.ts) | High | Add explicit person selection/linking to invitation and verify the first login for each role. |
| F28 | User management | Status change consistency | Partially Working | Profile is updated before Auth ban/unban. A failed Auth update leaves inconsistent account state; failure path is source-confirmed, not injected live. [supabase/functions/admin-manage-users/index.ts:92](../supabase/functions/admin-manage-users/index.ts#L92) | High | Add compensation/reconciliation and return partial-failure details; test failure after each external write. |

### Notifications

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F29 | Notifications | External email delivery | Not Working | Fresh live configuration probe lists in_app and whatsapp, but not email. Email notification delivery is unavailable in this environment; this does not establish an Auth-email failure. [scripts/check-delivery-config.mjs](../scripts/check-delivery-config.mjs); [supabase/functions/notification-delivery](../supabase/functions/notification-delivery) | High | Configure the notification email provider, expose channel readiness and verify delivery to a controlled recipient. |

### Settings / export

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F30 | Settings / export | Export under lower server row cap | Partially Working | Export advances by 500 and stops on a shorter response; a configured cap below 500 silently produces an incomplete export. [src/app/features/settings/settings-tools-page.ts:204](../src/app/features/settings/settings-tools-page.ts#L204) | Medium | Use exact counts/cursors and advance by actual returned rows; validate completeness before downloading. |

### Operations

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F31 | Operations | Complete backup/restore | Partially Working | Backup script explicitly covers database schema/data only, not Auth users or Storage files. A full application restore is not demonstrated by this script. [scripts/backup-database.mjs:14](../scripts/backup-database.mjs#L14) | High | Back up all required services securely and rehearse a full isolated restore with documented recovery objectives. |

### Test suite

| ID | Module / Page | Feature | Status | Issue Description / Evidence | Priority | Recommended Fix |
|---|---|---|---|---|---|---|
| F32 | Test suite | Live attendance route expectations | Not Working | Live role test still expects legacy attendance URLs unchanged; the application intentionally redirects them to the unified page. This is a test defect, not broken app navigation. [e2e/live-role-pages.spec.ts:5](../e2e/live-role-pages.spec.ts#L5); [e2e/live-role-pages.spec.ts:20](../e2e/live-role-pages.spec.ts#L20) | Medium | Update expected canonical URLs while retaining redirect assertions. |

## Checks working within the verified scope

| Module | Feature check | Evidence and limits | References |
|---|---|---|---|
| Authentication | Existing account login for admin, receptionist, coach and parent | Live login succeeded for all four designated test accounts; auth/logout/reload browser tests passed. | [e2e/auth-and-access.spec.ts](../e2e/auth-and-access.spec.ts) |
| Authorization | Route guards and scoped reads | Mock direct-route checks passed; live reads showed restricted coach/parent datasets. This is not a complete write-security certification. | [e2e/auth-and-access.spec.ts](../e2e/auth-and-access.spec.ts); [src/app/app.routes.ts](../src/app/app.routes.ts) |
| Students | Directory search, filters and pagination | Source uses backend student paging/filter RPC rather than only client filtering; live student reads and list layout tests passed. | [src/app/features/students/student-list.service.ts](../src/app/features/students/student-list.service.ts); [e2e/list-layout.spec.ts](../e2e/list-layout.spec.ts) |
| Parents | Directory/detail display | Live parent reads succeeded; existing detail unit tests and responsive route tests pass. | [src/app/features/parents/parent-details-page.spec.ts](../src/app/features/parents/parent-details-page.spec.ts) |
| Coaches | Directory/detail display | Live coach reads succeeded; detail unit tests and route coverage pass. | [src/app/features/coaches/coach-details-page.spec.ts](../src/app/features/coaches/coach-details-page.spec.ts) |
| Batches | Directory, tabs and assignment layout | Live staff-list RPC returned batch rows; tab and coach-assignment layouts passed at desktop/mobile sizes. Live assignment mutations remain unverified. | [e2e/batch-tabs-layout.spec.ts](../e2e/batch-tabs-layout.spec.ts); [e2e/coach-assignment-layout.spec.ts](../e2e/coach-assignment-layout.spec.ts) |
| Enrollments | Workspace and lifecycle logic under tests | Enrollment unit tests and protected-route rendering passed; live enrollment reads succeeded. Real transfer/pause/cancel writes were not run. | [src/app/features/enrollments/enrollments-page.spec.ts](../src/app/features/enrollments/enrollments-page.spec.ts); [e2e/route-coverage.spec.ts](../e2e/route-coverage.spec.ts) |
| Attendance | Unified QR/manual entry | QR identification, confirmation, check-in/out, duplicate checkout protection, bulk check-in and legacy redirects passed in mock browser tests. | [e2e/combined-attendance-qr.spec.ts](../e2e/combined-attendance-qr.spec.ts); [e2e/manual-attendance-layout.spec.ts](../e2e/manual-attendance-layout.spec.ts) |
| Attendance | History/calendar filtering and export | History/calendar mock browser and unit tests pass; live attendance read/workspace RPC succeeds. | [e2e/attendance-history-calendar.spec.ts](../e2e/attendance-history-calendar.spec.ts) |
| Attendance | Camera failure handling | Browser tests pass for denied permission, missing camera, synthetic QR decoding and startup stream cleanup. Physical-device coverage remains unverified. | [e2e/ui-recovery-mobile.spec.ts](../e2e/ui-recovery-mobile.spec.ts) |
| Fees | Fee-plan/catalog and balance display | Fee-plan/fee-page unit tests pass; live fee-plan and monthly-charge reads succeed. This excludes the missing application of discounts/late fees. | [src/app/features/fees/fee-plans-page.spec.ts](../src/app/features/fees/fee-plans-page.spec.ts); [src/app/features/fees/fees-page.spec.ts](../src/app/features/fees/fees-page.spec.ts) |
| Payments | Payment/refund logic and receipt generation under tests | Payment and receipt unit tests pass; live payment/refund reads succeed. No new live financial write was performed. | [src/app/features/payments/payments-page.spec.ts](../src/app/features/payments/payments-page.spec.ts); [src/app/features/payments/receipt-pdf.spec.ts](../src/app/features/payments/receipt-pdf.spec.ts) |
| Notifications | In-app lists/template logic | Notification/template/query unit tests pass and live notifications/templates are readable. External delivery is assessed separately. | [src/app/features/notifications/notifications-page.spec.ts](../src/app/features/notifications/notifications-page.spec.ts); [src/app/features/notifications/notification-templates-page.spec.ts](../src/app/features/notifications/notification-templates-page.spec.ts) |
| Reports | Report calculations, CSV and print implementation | Report/CSV unit tests pass; source implements export and window.print. Live exported totals and physical print output still need acceptance checks. | [src/app/features/reports/reports-page.spec.ts](../src/app/features/reports/reports-page.spec.ts); [src/app/features/reports/reports-page.ts:682](../src/app/features/reports/reports-page.ts#L682) |
| Settings | Settings/audit/user-list reads | Live academy settings, audit logs and admin user-list edge function succeeded; settings/audit unit tests pass. | [src/app/features/settings/settings-tools-page.spec.ts](../src/app/features/settings/settings-tools-page.spec.ts); [src/app/features/settings/audit-log-page.spec.ts](../src/app/features/settings/audit-log-page.spec.ts) |
| Dashboard | Analytics RPC | Live get_dashboard_analytics succeeded; recent-list ordering is a separate defect. | [supabase/migrations/202609240004_operational_settings.sql:27](../supabase/migrations/202609240004_operational_settings.sql#L27) |
| Shared UI | Tested responsive layouts and accessibility | 31 browser checks passed, including desktop/mobile pages and no serious/critical accessibility violations on login/dashboard. No claim of every component being accessible. | [e2e/responsive.spec.ts](../e2e/responsive.spec.ts); [e2e/accessibility.spec.ts](../e2e/accessibility.spec.ts) |
| PWA | Production install shell and offline login reload | Manifest/icons, active controlling service worker, offline login reload and reconnect/update test passed. | [e2e/pwa/pwa.spec.ts](../e2e/pwa/pwa.spec.ts) |

## Checks requiring further testing

These are not confirmed failures and are excluded from the three issue categories.

| ID | Feature | Priority | What remains unknown | Required verification | References |
|---|---|---|---|---|---|
| U1 | Live CRUD end-to-end | High | Student/parent/coach/batch/enrollment/settings CRUD, attendance corrections and payment/refund writes were not exercised against live records in this audit. | Run isolated seeded fixtures; assert DB effects, rollback, concurrency and retry behavior, then clean up. | [playwright.live.config.ts](../playwright.live.config.ts) |
| U2 | Complete RLS and storage authorization | High | Successful scoped reads and route guards do not prove every RPC/table/storage write denies unauthorized roles. | Run positive and negative tests for every role/resource/action, including direct RPC and signed-file access. | [supabase/migrations/202609040002_security_and_workflows.sql](../supabase/migrations/202609040002_security_and_workflows.sql) |
| U3 | WhatsApp and event automation | High | WhatsApp is currently configured, but actual delivery/webhook status was not tested. Event table is readable; current cron activation and event-date notification execution were not verified. | Inspect current cron jobs and deployed functions; deliver controlled test messages/events and verify final statuses. | [scripts/check-delivery-config.mjs](../scripts/check-delivery-config.mjs); [src/app/features/notifications](../src/app/features/notifications) |
| U4 | Physical QR hardware/browser support | Medium | Synthetic Chromium camera tests pass; real mobile camera switching, low-light decoding, iOS permissions and background/resume were not tested. | Run real-device tests with valid/invalid/revoked QR codes and interrupted networks. | [e2e/ui-recovery-mobile.spec.ts](../e2e/ui-recovery-mobile.spec.ts) |
| U5 | Live report/export reconciliation | High | Report unit tests and source implementations do not certify all aggregates against the deployed database, large datasets or all print layouts. | Reconcile reports with known SQL totals, refunds/timezones, exports beyond row caps and print previews. | [src/app/features/reports/reports-page.ts](../src/app/features/reports/reports-page.ts) |
| U6 | Production release and recovery acceptance | High | Production build/PWA local tests passed; deployed-host configuration, scheduled full backups and a successful full restore were not independently verified. | Validate deployed environment/CSP/redirects and rehearse complete isolated disaster recovery. | [docs/BACKUP_RESTORE.md](../docs/BACKUP_RESTORE.md); [scripts/backup-database.mjs](../scripts/backup-database.mjs) |

## Prioritized action plan

1. **High — attendance integrity (F01–F07).** Make queue persistence atomic with UI state; recover interrupted sync; preserve occurrence timestamps/business dates; isolate by user; persist minimal offline roster; remove the 500-row ceiling. Validate midnight, restart, storage rejection, lost response, account switch and more than 500 students.
2. **High — reliable saves and account access (F10, F13, F16, F17, F21, F27, F28).** Fix dropped coach value and parent status reset. Make parent/link and coach/specializations transactional, add stable student-create retry IDs, link invited accounts to domain records, and reconcile Auth/profile updates. Add failure injection at each write boundary.
3. **High — complete operational capabilities (F12, F25, F26, F29).** Add medical editing and discount assignment, implement idempotent late-fee assessment, and configure/test email delivery. Surface unsupported/unready channels before users attempt sends.
4. **High — correct parent statistics (F19).** Use complete attendance aggregates and test histories longer than five rows with mixed attendance statuses.
5. **High — release/security/recovery proof (F31, U1–U3, U5–U6).** Complete isolated live CRUD and negative permission tests, reconcile report totals, verify event scheduling and WhatsApp delivery, then rehearse full database/Auth/Storage restore. Do not treat currently passing mock tests as live acceptance.
6. **Medium — finish workflows and scaling (F08, F09, F11, F14, F18, F20, F22, F23, F24, F30).** Support dependent offline checkout and discard reconciliation; add document lifecycle, student-aware shortcuts, paged selectors/histories/coach rosters, functioning coach buttons, ordered recent check-ins and cap-safe export.
7. **Medium — test reliability and hardware coverage (F32, U4).** Correct legacy URL expectations, test canonical navigation at desktop/mobile sizes, and run physical camera/device tests. Investigate startup AbortError if reproducible on supported devices.
8. **Low — counts and performance polish (F15).** Show exact document totals, resize the branding image to display needs, and recheck console output.

For every change, add a regression test that reproduces the observed failure or threshold condition, run the relevant unit/browser checks, and record an isolated live acceptance result where the fix touches persistence, permissions, delivery or financial state. Re-run the broad suite after the integrated fixes, not after every cosmetic adjustment.

