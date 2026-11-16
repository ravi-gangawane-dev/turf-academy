# Consolidated issues and remaining work

Reviewed: **16 November 2026 (Asia/Calcutta)**.

## Summary

The local application builds successfully, lint passes, and **903 unit tests plus 39 script tests pass**. Older reports describing a broken build, missing lint target, or four failing unit tests are not the current local baseline.

There are still source-confirmed functional gaps, broken test contracts, inconsistent documentation, and unresolved deployment/acceptance dependencies. Passing local tests does not establish that the hosted application or external delivery works.

This report consolidates the entire `docs/` inventory: **226 files before this report**, including **82 Markdown documents, 28 JSON files, 10 text files and 2 audit scripts**. Remaining files are images, fonts, and generated preview assets. Text evidence was scanned for failures, open work and subsequent corrections; relevant findings were compared with current source. All 28 JSON files parse. Binary assets and generated bundles were inventoried, not treated as fresh functional evidence. This is a documentation/source review with local checks, not a new live-system audit.

No application fixes, remote database changes, deployments, account changes or external messages were performed for this review. Source documents remain unchanged.

## Fresh verification

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | Passed | [Build log](../artifacts/docs-review-build-2026-11-16.log) |
| `npm run lint` | Passed | [Lint log](../artifacts/docs-review-lint-2026-11-16.log) |
| `npx ng test --watch=false` | 153 files, 903 tests passed | [Unit log](../artifacts/docs-review-unit-2026-11-16.log) |
| `npm run test:scripts` | 39 passed | [Script log](../artifacts/docs-review-scripts-2026-11-16.log) |
| Markdown relative-link scan | 56 unresolved path occurrences in existing documents | Appendix B; counts include repeated references and missing historical evidence |
| Browser/live/backend/device tests | Not run in this review | Do not infer a pass or failure from local results |

Logs are local artifacts and may be ignored by Git. Preserve them with release evidence if sharing this report outside this workspace.

## Status and priority rules

- **Confirmed source issue:** the present code or document demonstrates the problem; no claim of a newly reproduced production failure.
- **Recorded deployment gap:** a dated live report established the problem; remote state needs rechecking before changing anything.
- **Needs acceptance:** implemented or historically tested, but current end-to-end proof is missing.
- **Scope decision:** intentional limitation or proposed capability, not automatically a defect.
- **P1:** functional correctness or release dependency. **P2:** acceptance, maintainability or usability. No newly demonstrated P0 outage was found.

## 1. Current source issues and workflow gaps

| ID | Priority / status | Issue and evidence | Required fix and closure evidence |
|---|---|---|---|
| F01 | P1 · Confirmed source issue | **Remember me has no effect on Supabase persistence.** The login form exposes `rememberMe`, but `loginWithSupabase()` uses only identity/password and the client always sets `persistSession: true`. [Auth audit](ADMIN_AUTH_AUDIT_2026-10-30.md), [client](../src/app/core/supabase/supabase-client.service.ts), [auth service](../src/app/core/auth/auth.service.ts). | Implement the intended remembered/session-only storage behavior or remove the misleading option. Verify both choices across browser restart, refresh and logout. |
| F02 | P1 · Confirmed source issue | **Parent child attendance totals/rate derive from loaded history, not the full summary.** The `attendance` computed value reads `data()?.attendance`; overview uses `workspace.attendance.length`. Large histories can report page-sized totals. [API audit](FUNCTIONALITY_API_AUDIT_2026-10-27.md), [parent child component](../src/app/features/parents/parent-child-profile-page.ts), [template](../src/app/features/parents/parent-child-profile-page.html). | Use the server aggregate and total independently of history pagination. Verify with more records than one page and a known rate. |
| F03 | P2 · Confirmed source issue | **Document overview counts use page length.** Both student and parent child overviews use `workspace.documents.length`; the student table separately receives `workspace.documentTotal`. [Student template](../src/app/features/students/student-details-page.html), [parent child template](../src/app/features/parents/parent-child-profile-page.html). | Use the authoritative total; verify overview/table counts agree across multiple pages. |
| F04 | P1 · Confirmed source limitation | **Coach roster reads are not paginated.** `loadStudents()` queries active enrollments in one request, unlike the paged student table. Summary/detail collections can truncate at a server cap. It maps enrollment rows directly, so confirm whether multi-batch students should be counted once or per enrollment. [Table audit](TABLE_OPERATIONS_AUDIT.md), [coach service](../src/app/features/coach/coach-portal.service.ts). | Page the roster or use server aggregates. Test a deliberately low server cap, multiple batches per student, and totals independent of table pagination. |
| F05 | P2 · Confirmed source inconsistency | **Date policy remains inconsistent outside repaired staff QR lookup.** Coach attendance/session range boundaries still use `toISOString().slice(0, 10)`; this is UTC extraction, while academy operations support a configured timezone. [API audit](FUNCTIONALITY_API_AUDIT_2026-10-27.md), [coach service](../src/app/features/coach/coach-portal.service.ts). | Centralize academy business-date boundaries; test midnight transitions and a non-default timezone. Do not claim the old staff QR bug is still present. |
| F06 | P1 · Workflow gap | **Student documents are displayed without an upload/open/delete workflow in the reviewed student workspace.** The current documents table renders metadata only. Existing upload-related SCSS and generic storage services do not implement a workflow. [API audit](FUNCTIONALITY_API_AUDIT_2026-10-27.md), [student template](../src/app/features/students/student-details-page.html). | Implement authorized upload, signed read/download and deletion with clear failure states; verify persistence, storage cleanup and cross-role denial. |
| F07 | P1 · Workflow gap | **Detailed medical editing is not established.** Current student detail code displays allergies, conditions, medications and doctor information; the audit records no corresponding complete editor/API workflow. [API audit](FUNCTIONALITY_API_AUDIT_2026-10-27.md), [student details](../src/app/features/students/student-details-page.ts). | Provide an authorized editor if required, or explicitly define this as read-only scope. Verify field persistence and access restrictions. |
| F08 | P1 · Workflow gap | **Discount catalogue and late-fee rules do not establish application to students/charges.** The API audit identifies missing student-discount assignment and idempotent late-fee assessment workflows. Current production TypeScript references `student_discounts` in backup coverage, without a visible assignment workflow found in this scan. [API audit](FUNCTIONALITY_API_AUDIT_2026-10-27.md), [fees plan](FEES_MODULE_IMPLEMENTATION_PLAN_2026-11-03.md). | Trace and implement the complete assignment/assessment path; agree stacking/proration rules first. Verify amounts, retry idempotency, audit history and unauthorized rejection. |
| F09 | P1 · Recorded onboarding gap | **Invitation does not prove a usable Coach/Parent portal.** The invitation report records absent linking to `parents.profile_id` / `coaches.profile_id`. No such linking was found in the invitation entrypoint during this review. Separate authorized linking may exist elsewhere. [Invitation report](AUTH_INVITATION_SYSTEM_2026-10-31.md), [handler](../supabase/functions/admin-manage-users/index.ts). | Trace the approved onboarding path from invitation through record linking; provide explicit linking or an operator step. Verify a newly invited Coach/Parent sees only their own records. |
| F10 | P1 · Confirmed test-contract issue | **Browser tests still expect obsolete login text.** `e2e/helpers.ts` uses exact `Email Address`; the login screen uses `Email`. Auth/PWA tests expect `Login to…`, while the screen says `Welcome Back`. [Readiness report](DEPLOYMENT_READINESS_2026-11-14.md), [helper](../e2e/helpers.ts), [auth tests](../e2e/auth-and-access.spec.ts), [PWA tests](../e2e/pwa/pwa.spec.ts). | Update assertions to the intended accessible contract, then rerun browser/PWA suites. Check recovery screens independently rather than replacing every occurrence blindly. These failures do not prove broken login or PWA behavior. |

## 2. Recorded deployment and operational gaps

These are **last-known findings**, not claims about the live environment on 16 November. No remote configuration or migration ledger was queried today.

| ID | Priority | Last evidence / impact | Next action and closure requirement |
|---|---|---|---|
| D01 | P1 | On 14 November, `202611120001_print_document_settings.sql` and its print-setting columns were absent remotely. Custom letterhead/footer settings could not persist. [Readiness](DEPLOYMENT_READINESS_2026-11-14.md). | Recheck columns and migration effects; apply the reviewed migration only if needed. Save, reload and print all three configured fields. |
| D02 | P1 | On 14 November, `202611140002_fee_summary_collected.sql` was absent. The API omitted `collected`; current service defaults it to zero, potentially showing misleading financial totals. [Readiness](DEPLOYMENT_READINESS_2026-11-14.md), [service](../src/app/core/supabase/domain-services.ts). | Recheck deployed RPC output; reconcile the migration and verify a known nonzero collected total and intended refund semantics. |
| D03 | P1 | `202611130001_profile_self_service.sql` was absent from recorded history; later replacement RPCs existed, but `sync_parent_profile_identity` was not found. [Readiness](DEPLOYMENT_READINESS_2026-11-14.md). | Compare effective schema/functions/triggers with intended behavior. Do not blindly replay an older migration over newer signatures. Verify parent/profile synchronization. |
| D04 | P1 | Automated WhatsApp last recorded an invalid Content SID; no later delivery proof. Manual click-to-chat is a separate working mechanism and does not prove delivery. [Known issues](KNOWN_ISSUES.md), [WhatsApp guide](reports/WHATSAPP_FEATURE_GUIDE.md). | Validate provider/template configuration and an explicitly authorized recipient/message; record provider ID and final callback/status. |
| D05 | P1 | Notification email provider credentials/delivery were not established by the latest readiness evidence. Auth recovery email is separate. [Delivery setup](NOTIFICATION_DELIVERY_SETUP.md), [Readiness](DEPLOYMENT_READINESS_2026-11-14.md). | Verify readiness, sender configuration and an authorized end-to-end delivery. |
| D06 | P1 | Invitation/resend mailbox acceptance and hosted recovery remain unverified; branded Auth-email activation previously required SMTP/provider support. [Invitation report](AUTH_INVITATION_SYSTEM_2026-10-31.md), [Recovery](ACCOUNT_RECOVERY.md). | Verify hosted redirects, invitation acceptance, expiry/revocation, password reset and subsequent login. Test the copy-link fallback separately from email delivery. |
| D07 | P1 if automation required | Birthday/event scheduler was confirmed inactive on 14 November. [Readiness](DEPLOYMENT_READINESS_2026-11-14.md). | Confirm intended schedule, timezone and duplicate prevention; verify generation before enabling. Message generation is not delivery proof. |
| D08 | P1 | Hosted bundle differed from local build on 14 November. Collector GET returned expected 405, but accepted error ingestion, retention and alerting were not verified. [Readiness](DEPLOYMENT_READINESS_2026-11-14.md). | Verify the intended release identity, publish through an authorized deployment process, and trace an accepted test error through hosted logs. A 405 route response is not end-to-end monitoring acceptance. |
| D09 | P1 | Full disaster recovery is incomplete. Native database restore was verified on 5 November, but uploaded object bytes, hosted/provider configuration, ownership and role-password recovery were outside that rehearsal. No scheduler is documented. [Backup runbook](BACKUP_RESTORE.md). | Define backup coverage/retention and recovery objectives; obtain fresh backups and rehearse complete recovery on an isolated target. Do not label all backups broken: the database-only rehearsal passed. |

## 3. Acceptance and maintenance work

| ID | Priority / status | Remaining work | Closure evidence |
|---|---|---|---|
| A01 | P1 · Needs acceptance | Current hosted Admin, Receptionist, Coach and Parent workflows and positive/negative permissions. Historical core live success is recorded on 10 November, but does not certify every later change. [Demo report](CLIENT_DEMO_CHECK_2026-11-10.md), [live checklist](LIVE_RELEASE_VERIFICATION.md). | Stable test fixtures; authenticated creation/edit/reload, enrollment, attendance, finance and role-isolation results against the release being shipped. |
| A02 | P1 · Needs acceptance | Batch capacity concurrency, schedule updates, transfer/waitlist edge cases. Plans have unchecked acceptance items; historical API success is narrower. [P0 plan](BATCH_MODULE_P0_IMPLEMENTATION_PLAN_2026-11-03.md), [P1 plan](BATCH_MODULE_P1_IMPLEMENTATION_PLAN_2026-11-03.md). | Concurrent transactional tests and browser persistence/denial checks. Keep capacity enforcement authoritative in the database. |
| A03 | P2 · Needs acceptance | Android/iOS QR permissions, real scanning, installed PWA updates/reconnect; physical CR80 duplex/crop alignment. [Device checklist](DEVICE_ACCEPTANCE.md), [QR plan](QR_CAMERA_VERIFICATION_PLAN.md), [print register](audits/NOT_WORKING_STATUS_2026-11-11.md). | Observed target-device/printer results. Synthetic video and unit tests are not substitutes. |
| A04 | P2 · Needs acceptance | Recent role-page, dialog, theme, table and responsive refactors lack complete authenticated visual/keyboard acceptance. [UI audit](UI_ARCHITECTURE_AUDIT_2026-11-14.md), [theme tracker](UI_UX_THEME_IMPLEMENTATION_TRACKER.md). | Screenshots and interaction checks at 320/768/1024/1440 pixels; focus, Escape, busy states, wrapping and contrast checked in each role. |
| A05 | P2 · Needs investigation | Large-data aggregation and whole-workspace reads in reports, parent summaries and selection lists; partial-write recovery across multi-request mutations. [Table audit](TABLE_OPERATIONS_AUDIT.md), [API audit](FUNCTIONALITY_API_AUDIT_2026-10-27.md). | Reproduce with server caps and representative volumes; verify complete exports, stable pagination and lost-response/idempotency behavior. Old hardcoded coach session/attendance caps are superseded by current `readAllPages` code. |
| A06 | P2 · Recorded follow-up | Notification aggregate request count, uncertain-send reconciliation/resend, and mobile/detail-history acceptance remain in N-009/N-015/N-019/N-025. Some manual operations were later implemented, so the old tracker is not wholly current. [Tracker](notifications-improvement-tracker.md), [blocker recheck](PROJECT-IMPLEMENTATION-STATUS.md). | Reconcile the tracker with current handlers; verify uncertain sends cannot be accidentally duplicated and that timeline/provider states match. |
| A07 | P2 · Maintenance | Spacing and breakpoint consolidation is partial; shared list state is a pilot; full FormField/FormActions adoption is not established. [UI audit fix log](UI_ARCHITECTURE_AUDIT_2026-11-14.md). | Migrate only demonstrated duplication; retain intentional variants and require visual parity before changing geometry. Do not redo completed LocalStore, stylesheet split, data-table or metric-card migrations. |
| A08 | P2 · Scope decision | Offline attendance is explicitly disabled (`allowOfflineAttendance: false`). [Configuration](../src/app/core/config/api.config.ts). | Document online-only operation or separately approve offline scope with account-isolated replay/duplicate tests. Do not enable it merely to satisfy an old checklist. |
| A09 | P2 · Scope decision | Localization labels and multi-role assignments remain scope decisions in the print/RBAC register. Per-user grants/revokes are now implemented as **app-level overrides**: the Users screen has a Permissions action backed by `profile_permissions` and `permissions`/`set_permissions` Edge actions, and `hasPermission()` merges the overrides into menus, routes and action buttons. Database RLS still follows the base role, so a grant cannot widen row access and a revoke is not a hard API boundary. Direct temporary-password creation is also implemented: the Users screen can create a confirmed account, shows the server-generated password once, forces a replacement at first sign-in and never emails or audits the password. Hard user deletion is implemented as a guarded action: the Users screen can permanently delete an account only when it has no linked history, with a required reason, self/last-admin guards, a database delete trigger and an audit row; accounts with history must be disabled or anonymised. The remaining items are enhancements/policy decisions, not proof that invitation-based single-role access fails. The new migration and Edge actions are local only. [Register](audits/NOT_WORKING_STATUS_2026-11-11.md). | Agree required scope for multi-role assignments and translation coverage; apply the migrations and deploy the updated Edge function before claiming the overrides in production. |

## 4. Documentation defects to fix

| ID | Priority | Problem | Fix |
|---|---|---|---|
| DOC01 | P2 | UI audit's final “Still open” list contradicts its own 15 November fix log (LocalStore, list-state pilot, stylesheet split, navy tokens, data tables, summary cards and more). | Replace the stale closing list with remaining acceptance/partial items and dated evidence. |
| DOC02 | P2 | The 11 November register still says RBAC migrations were not applied and invitation function was version 13. The 14 November readiness report records applied RBAC migrations and version 14 ACTIVE. | Mark the earlier deployment assertions superseded; retain mailbox/link acceptance as open. |
| DOC03 | P2 | Older reports advertise missing lint, broken builds, failing payment mocks, unimplemented refunds/settings, and no restore rehearsal as current. New evidence supersedes many of these claims. | Give reports a prominent snapshot date and link to this consolidated register; preserve historical evidence without presenting it as current. |
| DOC04 | P2 | 56 relative Markdown link occurrences resolve to absent paths, including relocated reports and missing screenshot/log evidence. | Repair paths where evidence exists; otherwise label the artifact unavailable. Appendix B lists exact references. Do not fabricate replacement evidence. |
| DOC05 | P2 | Old device and release instructions assume offline queue replay, while production config disables it; several implementation plans retain unchecked boxes despite later progress. | Align acceptance instructions and checklists with the delivered scope. Require separate evidence for local implementation, live deployment and device acceptance. |

## 5. Findings that should not be reopened without new evidence

- Production compile failures and lint/test failures reported earlier: today's checks pass.
- Missing lint target: lint now runs successfully.
- Student-detail style-budget blocker: current production build passes; shared stylesheet work is recorded in the UI fix log.
- Missing role-guard/catalogue migrations and invitation function version 13: later remote evidence supersedes these claims; no current remote verification is claimed.
- Missing print/profile sheets, page-size controls, batch ID-card/receipt printing and live receipt rendering: later print-register updates record implementations. Remote print-settings persistence is still D01.
- Parent opt-out loss and staff QR UTC lookup: later feature-health evidence records fixes. Broader timezone consistency remains F05.
- Payment history rejected by old RPC view validation: a dedicated repair migration exists and later payment reports describe the history view as supported; verify current deployment before alleging a regression.
- “No backup restore was ever tested”: superseded by the 5 November native restore. Recovery coverage remains D09.
- UI audit's missing-image-alt/clickable-backdrop findings: the audit explicitly retracts them as false positives.
- Static “coach selection not persisted” finding: the form still has a coach control internally, but no corresponding `formControlName="coach"` was found in the current template. Do not present an exposed broken selector as confirmed without reproducing it.

## 6. Recommended sequence

1. Fix F01–F05 correctness problems and F10 browser-test contracts; rerun focused tests and browser checks.
2. Recheck D01–D03 against the target backend, reconcile actual schema effects and verify the affected workflows.
3. Decide required scope for F06–F09 and A08–A09; implement missing workflows without changing approved financial or access rules silently.
4. Complete provider, hosted-release, recovery and four-role acceptance (D04–D09, A01–A06).
5. Reconcile document status blocks and links (DOC01–DOC05); maintain one dated register with evidence per closure.

An issue closes only when the stated acceptance evidence exists. “Not verified” is not “broken,” and a local test pass is not a deployment confirmation.

## Appendix A — Markdown documents inventoried

The list below records coverage, including historical copies. Inclusion does not endorse an old document's status as current.

- [ACCOUNT_RECOVERY.md](ACCOUNT_RECOVERY.md)
- [ADMIN_AUTH_AUDIT_2026-10-30.md](ADMIN_AUTH_AUDIT_2026-10-30.md)
- [ADMIN_PORTAL_GAP_ANALYSIS.md](ADMIN_PORTAL_GAP_ANALYSIS.md)
- [APPLICATION_AUDIT_2026-10-21.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/COMPONENT-AND-TABLE-AUDIT.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/document-inventory-2026-10-27.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/FULL-REPORT.md](audit/FULL-REPORT.md)
- [audit/IMPROVEMENT-RECOMMENDATIONS.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/MISSING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/NOT-VERIFIED-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/NOT-WORKING-FEATURES-2026-10-21.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/NOT-WORKING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/PARTIALLY-WORKING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/COMPONENT-AND-TABLE-AUDIT.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/IMPROVEMENT-RECOMMENDATIONS.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/MISSING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/NOT-VERIFIED-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/NOT-WORKING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/PARTIALLY-WORKING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/PRIORITY-FIX-PLAN.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/PROJECT-AUDIT-SUMMARY.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/previous-audit/WORKING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/PRIORITY-FIX-PLAN.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/PROJECT-AUDIT-SUMMARY.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audit/WORKING-FEATURES.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [audits/NOT_WORKING_STATUS_2026-11-11.md](audits/NOT_WORKING_STATUS_2026-11-11.md)
- [AUTH_INVITATION_SYSTEM_2026-10-31.md](AUTH_INVITATION_SYSTEM_2026-10-31.md)
- [BACKEND_RELEASE_PREFLIGHT.md](BACKEND_RELEASE_PREFLIGHT.md)
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md)
- [BATCH_MODULE_P0_IMPLEMENTATION_PLAN_2026-11-03.md](BATCH_MODULE_P0_IMPLEMENTATION_PLAN_2026-11-03.md)
- [BATCH_MODULE_P1_IMPLEMENTATION_PLAN_2026-11-03.md](BATCH_MODULE_P1_IMPLEMENTATION_PLAN_2026-11-03.md)
- [BLOCKER_RECHECK_2026-10-29.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [CLIENT_DEMO_CHECK_2026-11-10.md](CLIENT_DEMO_CHECK_2026-11-10.md)
- [CONTINUATION_STATUS.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [DATA_RESET_IMPACT_2026-10-28.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [DATA_RESET_RESULT_2026-10-28.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [DEPLOYMENT_READINESS_2026-11-12.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [DEPLOYMENT_READINESS_2026-11-14.md](DEPLOYMENT_READINESS_2026-11-14.md)
- [DEVICE_ACCEPTANCE.md](DEVICE_ACCEPTANCE.md)
- [FEATURE_HEALTH_REPORT_2026-11-10.md](FEATURE_HEALTH_REPORT_2026-11-10.md)
- [FEES_MODULE_IMPLEMENTATION_PLAN_2026-11-03.md](FEES_MODULE_IMPLEMENTATION_PLAN_2026-11-03.md)
- [FIX_PLAN_2026-10-19.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [FUNCTIONALITY_API_AUDIT_2026-10-27.md](FUNCTIONALITY_API_AUDIT_2026-10-27.md)
- [FUNCTIONALITY_AUDIT_2026-10-15.md](FUNCTIONALITY_AUDIT_2026-10-15.md)
- [FUNCTIONALITY_STATUS_2026-10-19.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [INVITATION_FIX_2026-10-30.md](INVITATION_FIX_2026-10-30.md)
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md)
- [LIVE_RELEASE_VERIFICATION.md](LIVE_RELEASE_VERIFICATION.md)
- [LOGIN_REDESIGN_2026-10-28.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [notification-db-tests.md](notification-db-tests.md)
- [NOTIFICATION_DELIVERY_SETUP.md](NOTIFICATION_DELIVERY_SETUP.md)
- [NOTIFICATION_PHASE1_ACCEPTANCE_2026-10-23.md](NOTIFICATION_PHASE1_ACCEPTANCE_2026-10-23.md)
- [notifications-improvement-tracker.md](notifications-improvement-tracker.md)
- [OPEN_FUNCTIONAL_GAPS_2026-10-19.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [P0_BLOCKERS_RESOLUTION.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [P1_BLOCKERS_RESOLUTION.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [PATIL_WHATSAPP_TEST_2026-10-21.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [PAYMENT_MODULE_AUDIT_2026-11-02.md](PAYMENT_MODULE_AUDIT_2026-11-02.md)
- [PRE_GITHUB_AUDIT_2026-10-29.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [PROJECT_FUNCTIONALITY.md](PROJECT_FUNCTIONALITY.md)
- [PROJECT_STATUS_REPORT_2026-10-19.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [QR_CAMERA_VERIFICATION_PLAN.md](QR_CAMERA_VERIFICATION_PLAN.md)
- [RELEASE_2026-10-19.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [RELEASE_BLOCKERS_2026-10-29.md](RELEASE_BLOCKERS_2026-10-29.md)
- [RELEASE_READINESS_2026-11-04.md](RELEASE_READINESS_2026-11-04.md)
- [REMAINING_TASKS_REPORT.md](REMAINING_TASKS_REPORT.md)
- [REPAIR_TRACKER.md](REPAIR_TRACKER.md)
- [reports/API_INTEGRATION_REPORT.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [reports/FIX_IMPLEMENTATION_REPORT.md](reports/FIX_IMPLEMENTATION_REPORT.md)
- [reports/FULL_PROJECT_AUDIT.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [reports/HARDCODED_DATA_REPORT.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [reports/PRIORITY_ACTION_PLAN.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [reports/WHATSAPP_FEATURE_GUIDE.md](reports/WHATSAPP_FEATURE_GUIDE.md)
- [supabase-deployment.md](supabase-deployment.md)
- [supabase-implementation-audit.md](supabase-implementation-audit.md)
- [TABLE_OPERATIONS_AUDIT.md](TABLE_OPERATIONS_AUDIT.md)
- [TEST_CREDENTIALS_SETUP.md](TEST_CREDENTIALS_SETUP.md)
- [UI_ARCHITECTURE_AUDIT_2026-11-14.md](UI_ARCHITECTURE_AUDIT_2026-11-14.md)
- [UI_UX_P0_SOURCE_FINDINGS_2026-11-04.md](UI_UX_P0_SOURCE_FINDINGS_2026-11-04.md)
- [UI_UX_THEME_IMPLEMENTATION_TRACKER.md](UI_UX_THEME_IMPLEMENTATION_TRACKER.md)
- [UNIFIED_ATTENDANCE_2026-10-20.md](PROJECT-IMPLEMENTATION-STATUS.md)
- [USER_LIST_LIVE_FIX_2026-11-04.md](PROJECT-IMPLEMENTATION-STATUS.md)

## Appendix B — Unresolved relative-link occurrences

Automated path-existence scan of existing Markdown documents. URL links and fragment-only links were excluded; anchor validity was not checked. Historical missing artifacts are distinguished from application defects.

| Source document | Unresolved relative target |
|---|---|
| `APPLICATION_AUDIT_2026-10-21.md` | `../src/app/features/payments/receipt-pdf.spec.ts` |
| `audit/document-inventory-2026-10-27.md` | `../../API_INTEGRATION_REPORT.md` |
| `audit/document-inventory-2026-10-27.md` | `../../FIX_IMPLEMENTATION_REPORT.md` |
| `audit/document-inventory-2026-10-27.md` | `../../FULL_PROJECT_AUDIT.md` |
| `audit/document-inventory-2026-10-27.md` | `../../HARDCODED_DATA_REPORT.md` |
| `audit/document-inventory-2026-10-27.md` | `../../PRIORITY_ACTION_PLAN.md` |
| `audit/document-inventory-2026-10-27.md` | `../../WHATSAPP_FEATURE_GUIDE.md` |
| `audit/FULL-REPORT.md` | `admin-dashboard-admin.png` |
| `audit/FULL-REPORT.md` | `receptionist-dashboard-reception.png` |
| `audit/FULL-REPORT.md` | `coach-coach-dashboard.png` |
| `audit/FULL-REPORT.md` | `parent-parent-dashboard.png` |
| `audit/previous-audit/NOT-WORKING-FEATURES.md` | `unit-suite-2026-10-22.txt` |
| `audit/previous-audit/NOT-WORKING-FEATURES.md` | `payment-recheck-2026-10-22.json` |
| `audit/previous-audit/NOT-WORKING-FEATURES.md` | `NOT-WORKING-FEATURES-2026-10-21.md` |
| `audit/previous-audit/PRIORITY-FIX-PLAN.md` | `unit-suite-2026-10-22.txt` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `runtime-routes.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `session-isolated-rechecks.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `failed-endpoint-rechecks.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `rls-read-probes.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `table-runtime.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `student-table-recheck.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `accessibility-runtime.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `whatsapp-failed-trace-analysis.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `inventory.json` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `build-output.txt` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `unit-tests-excluding-provider-output.txt` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `pure-unit-output.txt` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `admin-dashboard-admin.png` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `receptionist-dashboard-reception.png` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `coach-coach-dashboard.png` |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | `parent-parent-dashboard.png` |
| `audit/PROJECT-AUDIT-SUMMARY.md` | `production-2026-10-22-admin.png` |
| `audit/PROJECT-AUDIT-SUMMARY.md` | `production-2026-10-22-receptionist.png` |
| `audit/PROJECT-AUDIT-SUMMARY.md` | `production-2026-10-22-coach.png` |
| `audit/PROJECT-AUDIT-SUMMARY.md` | `production-2026-10-22-parent.png` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/core/supabase/attendance-calendar.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-calendar-page.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-calendar-page.html` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/core/supabase/attendance-calendar.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/coach/coach-portal-enhanced.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-history-page.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-history-page.html` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/coach/coach-portal-enhanced.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/coach/coach-portal-enhanced.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/core/supabase/attendance-calendar.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/coach/coach-portal-enhanced.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-calendar-page.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-calendar-page.html` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-history-page.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/attendance/attendance-history-page.html` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/coach/coach-portal-page.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/core/supabase/attendance-calendar.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `src/app/features/coach/coach-portal-enhanced.service.ts` |
| `P1_BLOCKERS_RESOLUTION.md` | `supabase/migrations/202609050015_coach_portal_security.sql` |
| `P1_BLOCKERS_RESOLUTION.md` | `supabase/migrations/202609040001_core_schema.sql` |
| `UI_UX_THEME_IMPLEMENTATION_TRACKER.md` | `../artifacts/ui-audit-p0/baseline.json` |
