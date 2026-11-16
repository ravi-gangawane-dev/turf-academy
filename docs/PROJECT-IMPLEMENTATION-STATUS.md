# Project Implementation Status — Turf Cricket Academy

> **Single source of truth** for what is implemented, what is verified, and what is still outstanding.
> This file consolidates the previous `docs/` Markdown set. Every entry records the original
> document it came from so nothing is lost when superseded files are archived or deleted.

**Audit date:** 16 November 2026 (Asia/Calcutta)
**Repository revision:** `a0a523d` + working-tree changes (see §6)
**Status vocabulary:** Completed & Verified · Implemented — Not Tested · Partially Completed · Pending · Blocked · Obsolete · Needs Review

---

## 1. Project Overview

| Item | Value |
|---|---|
| Project name | Turf Cricket Academy (`turf-academy-ui`) |
| Frontend | Angular `^22.1.0` (standalone components, signals, zoneless-friendly), TypeScript `~6.0.2`, SCSS |
| Backend | Supabase — Postgres with RLS, Auth, Storage, Realtime, 100 SQL migrations, 2 Edge Functions (`admin-manage-users`, `notification-delivery`) |
| Client SDK | `@supabase/supabase-js ^2.115.0` |
| Hosting | Netlify (SPA + `/.netlify/functions/client-errors` error collector) |
| Live project ref | `ttuigbkaluozglzgepsh` ("Turf Cricket Academy") |
| Roles | `admin`, `receptionist`, `coach`, `parent` (plus app-level multi-role assignments and per-account permission overrides) |
| Documentation files reviewed | **84 Markdown files** in `docs/` (including `audit/` and `audit/previous-audit/`) |
| Requirements extracted | **214** (see §2 for the per-file mapping) |
| Completed & Verified | 96 |
| Partially Completed | 61 |
| Pending | 28 |
| Blocked | 9 |
| Unverified / Needs Review | 20 |

### Current automated state (verified 16 November 2026)

| Check | Command | Result |
|---|---|---|
| Production build | `npx ng build` | **PASS** — exit 0, no errors, no warnings |
| Lint | `npx ng lint` | **PASS** — all files |
| Unit tests | `npx ng test --watch=false` | **PASS** — 153 files, 934 tests |
| Script tests | `npm run test:scripts` | PASS (39 tests, last recorded 16 Nov) |
| Database migrations | `supabase_migrations` | 3 previously-missing migrations applied today (`202611160001`–`0003`) |
| Live RBAC reads | — | `profile_permissions` and `profile_roles` now return **200** (were 404) |
| Production bundle smoke test | `dist/` served, signed in as admin | Students → student details → ID card → Preview renders 2 QR PNGs (12,622 B each), no console errors |

> A local pass is **not** deployment confirmation, and "not verified" is not "broken".
> Live/hosted/device acceptance items are tracked separately in §4 and §6.

---

## 2. Documentation Audit Summary

Action legend: **Consolidate & Delete** — content is fully transferred here and the file has no
unresolved task; **Consolidate & Retain** — content transferred, file kept as evidence or because it
still carries open items; **Retain** — standalone reference required by docs, scripts or CI.

### 2.1 Root of `docs/`

| Original file | Module | Status | Action |
|---|---|---|---|
| `ACCOUNT_LIFECYCLE_POLICY_2026-11-16.md` | Authentication | Completed & Verified | Retain (standalone policy) |
| `ACCOUNT_RECOVERY.md` | Authentication | Partially Completed | Retain (runbook, referenced by `PROJECT-CLEANUP-AUDIT.md`) |
| `ADMIN_AUTH_AUDIT_2026-10-30.md` | Authentication | Partially Completed | Consolidate & Retain |
| `ADMIN_PORTAL_GAP_ANALYSIS.md` | Admin Dashboard | Partially Completed | Consolidate & Retain |
| `APPLICATION_AUDIT_2026-10-21.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `AUTH_INVITATION_SYSTEM_2026-10-31.md` | Authentication | Partially Completed | Consolidate & Retain |
| `BACKEND_RELEASE_PREFLIGHT.md` | Database | Needs Review | Consolidate & Retain |
| `BACKUP_RESTORE.md` | Database | Partially Completed | Retain (referenced by `scripts/backup-database.mjs`) |
| `BATCH_MODULE_P0_IMPLEMENTATION_PLAN_2026-11-03.md` | Batches | Partially Completed | Consolidate & Retain |
| `BATCH_MODULE_P1_IMPLEMENTATION_PLAN_2026-11-03.md` | Batches | Partially Completed | Consolidate & Retain |
| `BLOCKER_RECHECK_2026-10-29.md` | Cross-cutting | Completed & Verified | Consolidate & Delete |
| `CLIENT_DEMO_CHECK_2026-11-10.md` | Acceptance | Partially Completed | Consolidate & Retain |
| `CONSOLIDATED_ISSUES_2026-11-16.md` | Cross-cutting | Needs Review (register) | Retain (referenced by `PROJECT-CLEANUP-AUDIT.md`) |
| `CONTINUATION_STATUS.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `DATA_RESET_IMPACT_2026-10-28.md` | Database | Obsolete | Consolidate & Delete |
| `DATA_RESET_RESULT_2026-10-28.md` | Database | Completed & Verified | Consolidate & Delete |
| `DEPLOYMENT_READINESS_2026-11-12.md` | Deployment | Obsolete | Consolidate & Delete |
| `DEPLOYMENT_READINESS_2026-11-14.md` | Deployment | Partially Completed | Consolidate & Retain |
| `DEVICE_ACCEPTANCE.md` | Attendance | Pending | Retain |
| `FEATURE_HEALTH_REPORT_2026-11-10.md` | Cross-cutting | Partially Completed | Consolidate & Retain |
| `FEES_MODULE_IMPLEMENTATION_PLAN_2026-11-03.md` | Fees | Partially Completed | Consolidate & Retain |
| `FIX_PLAN_2026-10-19.md` | Cross-cutting | Completed & Verified | Consolidate & Delete |
| `FUNCTIONALITY_API_AUDIT_2026-10-27.md` | Cross-cutting | Partially Completed | Retain (referenced by `README.md`) |
| `FUNCTIONALITY_AUDIT_2026-10-15.md` | Cross-cutting | Obsolete | Retain (referenced by `README.md`) |
| `FUNCTIONALITY_STATUS_2026-10-19.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `INVITATION_FIX_2026-10-30.md` | Authentication | Partially Completed | Consolidate & Retain |
| `KNOWN_ISSUES.md` | Cross-cutting | Partially Completed | Consolidate & Retain |
| `LIVE_RELEASE_VERIFICATION.md` | Acceptance | Obsolete | Consolidate & Retain |
| `LOGIN_REDESIGN_2026-10-28.md` | Authentication | Completed & Verified | Consolidate & Delete |
| `NOTIFICATION_DELIVERY_SETUP.md` | Notifications | Partially Completed | Retain (referenced by `scripts/check-delivery-config.mjs`) |
| `NOTIFICATION_PHASE1_ACCEPTANCE_2026-10-23.md` | Notifications | Blocked | Consolidate & Retain |
| `OPEN_FUNCTIONAL_GAPS_2026-10-19.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `P0_BLOCKERS_RESOLUTION.md` | Cross-cutting | Completed & Verified | Consolidate & Delete |
| `P1_BLOCKERS_RESOLUTION.md` | Cross-cutting | Completed & Verified | Consolidate & Delete |
| `PATIL_WHATSAPP_TEST_2026-10-21.md` | Notifications | Completed & Verified | Consolidate & Delete |
| `PAYMENT_MODULE_AUDIT_2026-11-02.md` | Payments | Partially Completed | Consolidate & Retain |
| `PRE_GITHUB_AUDIT_2026-10-29.md` | Cross-cutting | Completed & Verified | Consolidate & Delete |
| `PROJECT_FUNCTIONALITY.md` | Cross-cutting | Needs Review | Consolidate & Retain |
| `PROJECT_STATUS_REPORT_2026-10-19.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `QR_CAMERA_VERIFICATION_PLAN.md` | Attendance | Pending | Retain |
| `RELEASE_2026-10-19.md` | Acceptance | Obsolete | Consolidate & Delete |
| `RELEASE_BLOCKERS_2026-10-29.md` | Acceptance | Obsolete | Consolidate & Retain |
| `RELEASE_READINESS_2026-11-04.md` | Acceptance | Partially Completed | Consolidate & Retain |
| `REMAINING_TASKS_REPORT.md` | Cross-cutting | Partially Completed | Consolidate & Retain |
| `REPAIR_TRACKER.md` | Cross-cutting | Partially Completed | Retain (referenced by `README.md`) |
| `TABLE_OPERATIONS_AUDIT.md` | Shared Components | Partially Completed | Consolidate & Retain |
| `TEST_CREDENTIALS_SETUP.md` | Authentication | Completed & Verified | Retain (referenced by `scripts/legacy/verify-test-credentials.ts`) |
| `UI_ARCHITECTURE_AUDIT_2026-11-14.md` | Shared Components | Partially Completed | Consolidate & Retain |
| `UI_UX_P0_SOURCE_FINDINGS_2026-11-04.md` | Shared Components | Partially Completed | Consolidate & Retain |
| `UI_UX_THEME_IMPLEMENTATION_TRACKER.md` | Shared Components | Partially Completed | Consolidate & Retain |
| `UNIFIED_ATTENDANCE_2026-10-20.md` | Attendance | Completed & Verified | Consolidate & Delete |
| `USER_LIST_LIVE_FIX_2026-11-04.md` | Settings | Completed & Verified | Consolidate & Delete |

### 2.2 `docs/audit/`

| Original file | Module | Status | Action |
|---|---|---|---|
| `audit/COMPONENT-AND-TABLE-AUDIT.md` | Shared Components | Obsolete | Consolidate & Delete |
| `audit/FULL-REPORT.md` | Cross-cutting | Needs Review | Retain (generated by `scripts/build-full-audit-report.mjs`) |
| `audit/IMPROVEMENT-RECOMMENDATIONS.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/MISSING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/NOT-VERIFIED-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/NOT-WORKING-FEATURES-2026-10-21.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/NOT-WORKING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/PARTIALLY-WORKING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/PRIORITY-FIX-PLAN.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/PROJECT-AUDIT-SUMMARY.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/WORKING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/document-inventory-2026-10-27.md` | Cross-cutting | Obsolete | Consolidate & Delete |

### 2.3 `docs/audit/previous-audit/`

All nine files are the literal previous snapshot of §2.2, superseded by `audit/*` and by the
14 November UI audit. They are duplicates for history only.

| Original file | Module | Status | Action |
|---|---|---|---|
| `audit/previous-audit/COMPONENT-AND-TABLE-AUDIT.md` | Shared Components | Obsolete | Consolidate & Delete |
| `audit/previous-audit/IMPROVEMENT-RECOMMENDATIONS.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/previous-audit/MISSING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/previous-audit/NOT-VERIFIED-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/previous-audit/NOT-WORKING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/previous-audit/PARTIALLY-WORKING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/previous-audit/PRIORITY-FIX-PLAN.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `audit/previous-audit/WORKING-FEATURES.md` | Cross-cutting | Obsolete | Consolidate & Delete |

### 2.4 Other directories

| Original file | Module | Status | Action |
|---|---|---|---|
| `audits/NOT_WORKING_STATUS_2026-11-11.md` | Cross-cutting | Partially Completed | Consolidate & Retain |
| `notification-db-tests.md` | Notifications | Completed & Verified | Retain (referenced by `scripts/test-notification-db.mjs`) |
| `notifications-improvement-tracker.md` | Notifications | Partially Completed | Consolidate & Retain |
| `reports/API_INTEGRATION_REPORT.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `reports/FIX_IMPLEMENTATION_REPORT.md` | Cross-cutting | Partially Completed | Consolidate & Retain |
| `reports/FULL_PROJECT_AUDIT.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `reports/HARDCODED_DATA_REPORT.md` | Cross-cutting | Completed & Verified | Consolidate & Delete |
| `reports/PRIORITY_ACTION_PLAN.md` | Cross-cutting | Obsolete | Consolidate & Delete |
| `reports/WHATSAPP_FEATURE_GUIDE.md` | Notifications | Partially Completed | Consolidate & Retain |
| `supabase-deployment.md` | Database | Partially Completed | Retain (referenced by `README.md`) |
| `supabase-implementation-audit.md` | Database | Needs Review | Retain (referenced by `README.md`) |

---

## 3. Module-Wise Implementation Status

### 3.1 Authentication and Authorization

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Email/password sign-in | Supabase `signInWithPassword`, role redirect | Completed & Verified | `src/app/features/auth/login-page.*`, `core/auth/auth.service.ts` | Live sign-in verified for all four roles (16 Nov) |
| Session restoration | Restore session on reload, guard redirect | Completed & Verified | `core/auth/auth.guard.ts`, `auth.service.ts` | Guard redirect to `/auth/login?returnUrl=…` observed |
| Sign-out | Clear session, return to login | Completed & Verified | `staff-layout.ts` | Verified in browser (16 Nov) |
| Password reset | Forgot → email → reset → login | Partially Completed | `features/auth/forgot-password-page.ts`, `reset-password-page.ts` | Local flow recorded; hosted acceptance open (D06) |
| Forced password change | `mustChangePassword` gate before app entry | Completed & Verified | `core/auth/auth.guard.ts:13`, `auth.service.ts:51` | Unit tests + guard spec |
| Invitations | Create account, email/copy-link, expiry | Partially Completed | `supabase/functions/admin-manage-users/index.ts` | Mailbox acceptance unverified (D06) |
| Role + permission guard | Route/menu gating per role | Completed & Verified | `core/auth/permissions.ts`, `auth.guard.ts` | 934 tests + live role isolation |
| Per-account permission overrides | Grant/revoke on top of role | Completed & Verified (16 Nov) | `profile_permissions` table, `replace_profile_permissions()`, `users-settings-panel.ts` | Migration applied; endpoint 200; RLS read policy live |
| Multi-role assignments | Additional roles per account | Completed & Verified (16 Nov) | `profile_roles`, `replace_profile_roles()`, `keep_primary_profile_role` trigger | Migration applied; 7 rows backfilled; endpoint 200 |
| Guarded profile deletion | Block self-delete and last-admin delete | Completed & Verified (16 Nov) | `guard_profile_deletion()` trigger | Migration applied; trigger present |
| "Remember me" | Persist vs session-only storage | **Pending / defect** | `login-page.ts`, `supabase-client.service.ts` | Option exists but has no effect — F01 |

### 3.2 Admin Dashboard

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| KPI analytics | Counts, collections, attendance | Completed & Verified | `features/dashboard/dashboard-page.ts`, RPC `get_dashboard_analytics` | 200 response, cards render (16 Nov) |
| Recent activity | Last 5 audit rows | Completed & Verified | `features/dashboard/recent-activity.ts` | 200 on `audit_logs` |
| Notification bell | Failed/unread aggregate | Completed & Verified | `staff-layout.ts` | Bell shows "2 failed" |
| Quick actions / search | Academy search from top bar | Completed & Verified | `staff-layout.html` | Unit tests |

### 3.3 Students

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| List, filter, sort, paginate | Server-paged table | Completed & Verified | `features/students/students-page.*`, `get_student_columns_page` RPC | Live: 11 students, 5/page, filters |
| Create / edit | Validated form, unique code | Completed & Verified | `students/add`, `students/:id/edit` | Add-student page exercised |
| Detail workspace | Overview, attendance, fees, documents | Completed & Verified | `student-details-page.*` | Live navigation |
| ID card print | CR80 duplex preview, QR | Completed & Verified | `shared/print/*`, `id-card-qr.ts` | Prod bundle: 2 QR PNGs, 3 sheets |
| Documents upload/open/delete | Authorised file workflow | **Pending** | `student-details-page.html` | Renders metadata only — F06 |
| Medical detail editing | Allergies/conditions/medications editor | **Pending** | `student-details-page.ts` | Display-only — F07 |
| Document overview count | Use authoritative total | Partially Completed | `student-details-page.html` | Uses `documents.length` — F03 |

### 3.4 Parents

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| List / create / edit | Consent + status preserved | Completed & Verified | `features/parents/*` | I04 fixed and covered by tests |
| Detail + children | Linked students, balances | Completed & Verified | `parents/:id` | Live |
| Parent portal | Own children only | Completed & Verified | `features/parents/parent-child-profile-page.*` | 3 children rendered |
| Child attendance summary | Totals from server aggregate | Partially Completed | same | Derives from loaded history — F02 |

### 3.5 Coaches

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| List / create / edit | Contact details, specialisations | Completed & Verified | `features/coaches/coaches-page.*` | Phone normalisation fix verified (F4) |
| Coach portal | Own batches/students/sessions | Completed & Verified | `features/coach/*` | 4 batches / 4 students / 5 sessions |
| Coach attendance workspace | Mark, correct, summarise | Completed & Verified | `coach/attendance/*` | Routes + services + tests |
| Roster pagination | Pageable roster, not one request | **Pending** | `coach/coach-portal.service.ts` | Reads all active enrollments — F04 |
| Business date boundaries | Academy timezone, not UTC slice | Partially Completed | `coach-portal.service.ts` | `toISOString().slice(0,10)` — F05 |

### 3.6 Reception

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Reception dashboard | Day view, quick actions | Completed & Verified | `dashboard/reception` route | Live |
| Manual attendance check-in/out | Staff-assisted marking | Completed & Verified | `attendance/manual-check-in`, `manual-check-out` | Live + RPCs |
| Payment collection | Record payment, receipt | Completed & Verified | `payments/new`, `payments/receipts` | Receipt preview verified |
| Role isolation | No admin-only screens | Completed & Verified | guards + permissions | Verified live |

### 3.7 Batches

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| CRUD + capacity | Database-authoritative capacity | Completed & Verified | `features/batches/*` | Pages + tests; concurrency untested (A02) |
| Coach assignment | Many-to-many `batch_coaches` | Completed & Verified | `batches/coach-assignment` | 4 coach links verified |
| Schedule | Session slots per batch | Completed & Verified | `batches/schedule` | Live |
| Waiting list / promotion | Queue and promote | Partially Completed | `batches/waiting-list` | UI + service; edge cases unverified (A02) |
| Student allocation | Move students between batches | Completed & Verified | `batches/student-allocation` | Live |

### 3.8 Enrollments

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Enroll / transfer / pause / cancel | Lifecycle mutations | Completed & Verified | `features/enrollments/*`, `change_enrollment_status` RPC | Pages + tests |
| History + fee plans | Timeline and plan assignment | Completed & Verified | `enrollments/history`, `enrollments/fee-plans` | Live |
| Status transition audit | Recorded in `audit_logs` | Completed & Verified | migrations | Trigger/RPC present |

### 3.9 Attendance

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Unified workspace | One attendance experience | Completed & Verified | `features/attendance/*` | 9 routes live |
| Check-in/out | Idempotent RPCs | Completed & Verified | RPCs + `attendance_records` | Live check-in/out persisted |
| QR attendance | Camera decode → record | Partially Completed | `attendance/qr`, `qr-attendance-page.ts` | Browser decode verified; physical camera pending (A03) |
| Correction + history | Edit with audit | Completed & Verified | `attendance/correction`, `attendance/history` | Live |
| Calendar | Month view + filters | Completed & Verified | `attendance/calendar` | Live |
| Offline queue | Queue and replay | **Pending (scope decision)** | `core/config/api.config.ts` | `allowOfflineAttendance: false` — A08 |
| Device/PWA acceptance | Real devices, install, reconnect | **Pending** | `DEVICE_ACCEPTANCE.md` | 18 unchecked items |

### 3.10 Fees

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Fee plans | Create/edit plans | Completed & Verified | `fees/plans` | Live |
| Monthly charges + balances | `monthly_charge_balances` | Completed & Verified | `domain-services.ts`, view | 200 responses; 16 report rows |
| Discounts | Catalogue CRUD | Partially Completed | `fees/discounts` | UI + tests; live mutation unverified (KI-12) |
| Late fees | Rule evaluation | Partially Completed | `fees/late-fees` | Idempotency path unproven (F08) |
| Pending / summary | Outstanding and collection totals | Completed & Verified | `fees/pending`, `fees/summary` | Live; `collected` defaults to 0 if RPC absent (D02) |

### 3.11 Payments

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Record payment (new/partial/full) | Enum-cast-safe RPC | Completed & Verified | `payments/new`, `payments/partial`, `payments/full` | Live; migration `202610300001` present |
| History | Server-side paged history | Completed & Verified | `payments/history` | Live; I01 repair migration exists |
| Receipts | Printable receipt + QR | Completed & Verified | `payments/receipts`, `shared/print` | Preview verified |
| Refunds | Refund workflow | Completed & Verified | `payments/refunds` | Route + service + tests |
| Currency correctness | INR formatting, no rounding drift | Completed & Verified | `core` formatters | Unit tests |

### 3.12 Notifications

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| In-app activity log | Channel/status filters | Completed & Verified | `features/notifications/*` | Live |
| Templates | CRUD + preview | Completed & Verified | `notifications/templates` | Live |
| Manual WhatsApp (click-to-chat) | Operator-initiated | Completed & Verified | `shared/whatsapp-action/*` | Unit tests + live queue |
| Automated WhatsApp delivery | Provider template + status | **Blocked** | `notification-delivery` function | Invalid Content SID — D04 |
| Email delivery | Provider config + send | **Blocked** | `notification-delivery` | Credentials/delivery unverified — D05 |
| Failed/delivery status views | Retry and status refresh | Completed & Verified | `notifications/failed`, `delivery-status` | Live |
| Birthday/event automation | Scheduled generation | **Blocked** | scheduler | Confirmed inactive — D07 |
| DB notification tests | Script-backed assertions | Completed & Verified | `scripts/test-notification-db.mjs`, `notification-db-tests.md` | Script passes |

### 3.13 Reports

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Attendance/batch reports | Range + batch filters | Completed & Verified | `features/reports/reports-page.*` | Default month now returns 16 rows (F5 fixed) |
| Coach report | Coach-scoped view | Completed & Verified | `reports/coach` | Route live |
| Export | CSV/print export | Completed & Verified | `shared/export/*` | Dialog + tests |
| Large-data aggregation | Server-side aggregation | Partially Completed | `reports-page.ts` | Full in-memory slice — A05 |

### 3.14 User Profile

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Profile page | Own details, avatar | Completed & Verified | `features/profile/user-profile-page.*` | Live |
| Photo upload/edit | Modal with crop/zoom/rotate, keyboard lifecycle | Completed & Verified (source) | `shared/profile-photo-upload/*` | `ModalFocus`, async save, busy guards; browser keyboard walk pending (A04) |
| Avatar pipeline | Storage + signed URLs | Completed & Verified | `core/supabase/storage.service.ts` | Signed URL 200 |

### 3.15 Settings

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Academy settings | Name, contacts, currency, timezone | Completed & Verified | `settings`, `settings/regional` | Live |
| Users management | Create/invite, role change, suspend, delete | Completed & Verified | `settings/users`, `admin/users` | Per-user password once, guarded delete |
| Roles & permissions | Role catalogue + overrides | Completed & Verified (16 Nov) | `settings/roles`, `settings/permissions` | Migrations applied today |
| Audit logs | Filterable log | Completed & Verified | `settings/audit-logs` | Live |
| Print settings | Letterhead/footer persistence | **Partially Completed** | `settings/print` | Columns may be absent remotely — D01 |
| Backup & tools | In-app backup entry | Partially Completed | `settings/backup`, `settings/tools` | Depends on operator tooling (D09) |
| Theme / dialog playgrounds | Design-time tooling | Completed & Verified | `settings/theme`, `settings/dialog-playground` | Routes live |

### 3.16 Shared Components

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Data table | Sort/filter/page/select/export | Completed & Verified | `shared/data-table/*` | Used by 20+ pages, tests |
| Async state | Loading/empty/error/retry | Completed & Verified | `shared/async-state/*`, `aria-busy` on 30 regions | Tests; SR pass pending |
| Dialogs | Focus trap, Escape, scroll lock, busy-aware | Completed & Verified | `shared/interaction-dialog/*` | `ModalFocus` + tests |
| Print documents | ID cards, receipts, profile sheets | Completed & Verified | `shared/print/*` | Prod bundle QR verified |
| List query state | Shared paging/filter state | Partially Completed | `shared/list-query-state.ts` | Pilot adoption only |
| Breakpoint consolidation | Merge duplicate media queries | Partially Completed | SCSS partials | 18 duplicates merged; tiers pending (A07) |
| QR encoder | Lazy-loaded encoder | Completed & Verified (16 Nov) | `shared/print/qr-encode.ts` | Lazy chunk 24.8 kB; main bundle −24.9 kB |

### 3.17 Database and Supabase Integration

| Feature | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| Migrations | 100 SQL migrations, ledger recorded | Completed & Verified | `supabase/migrations/*` | `202611160001–0003` applied 16 Nov |
| RLS | Role-aware row policies | Completed & Verified | migrations | Sampled read probes; writes need review |
| Edge Functions | `admin-manage-users`, `notification-delivery` | Partially Completed | `supabase/functions/*` | Local source; deployment version unverified (D08) |
| Backups | Native backup + restore rehearsal | Partially Completed | `scripts/backup-database.mjs` | DB-only restore verified 5 Nov; objects/config open (D09) |
| Realtime | Attendance/payment/notification streams | Implemented — Not Tested | `supabase-deployment.md` | No current streaming acceptance |
| Storage buckets | Profile photos, student documents | Partially Completed | `core/supabase/storage.service.ts` | Photo path verified; document workflow pending |

---

## 4. Pending Tasks

| Priority | Module | Task | Status | Source |
|---|---|---|---|---|
| P0 | — | No open P0 outage | Completed | §8 of `CONSOLIDATED_ISSUES_2026-11-16.md` |
| P1 | Authentication | Remember-me persists session regardless of choice (F01) | Pending | `ADMIN_AUTH_AUDIT_2026-10-30.md` |
| P1 | Parents | Child attendance totals from server aggregate (F02) | Pending | `FUNCTIONALITY_API_AUDIT_2026-10-27.md` |
| P1 | Students | Documents upload/open/delete workflow (F06) | Pending | same |
| P1 | Students | Medical detail editor or explicit read-only scope (F07) | Pending | same |
| P1 | Fees | Discount assignment + idempotent late-fee assessment (F08) | Pending | same |
| P1 | Authentication | Invitation → `parents.profile_id` / `coaches.profile_id` linking (F09) | Pending | `AUTH_INVITATION_SYSTEM_2026-10-31.md` |
| P1 | Testing | Browser tests expect obsolete login copy (F10) | Pending | `DEPLOYMENT_READINESS_2026-11-14.md` |
| P1 | Coaches | Paginate roster reads (F04) | Pending | `TABLE_OPERATIONS_AUDIT.md` |
| P1 | Settings | Print-settings columns present remotely (D01) | Blocked (external) | `DEPLOYMENT_READINESS_2026-11-14.md` |
| P1 | Fees | `fee_summary.collected` RPC deployed (D02) | Blocked (external) | same |
| P1 | Database | Reconcile `202611130001_profile_self_service` effects (D03) | Needs Review | same |
| P1 | Notifications | Valid WhatsApp Content SID + delivery proof (D04) | Blocked (provider) | `KNOWN_ISSUES.md` KI-01 |
| P1 | Notifications | Email provider credentials + delivery (D05) | Blocked (provider) | KI-02 |
| P1 | Authentication | Hosted recovery/invitation mailbox acceptance (D06) | Blocked (mailbox) | `ACCOUNT_RECOVERY.md` |
| P1 | Notifications | Birthday/event scheduler verification (D07) | Blocked (ops) | `DEPLOYMENT_READINESS_2026-11-14.md` |
| P1 | Deployment | Hosted bundle identity + error ingestion (D08) | Pending | same |
| P1 | Database | Full recovery coverage incl. objects/config (D09) | Pending | `BACKUP_RESTORE.md` |
| P1 | Acceptance | Four-role end-to-end acceptance on the shipped release (A01) | Partially Completed | `CLIENT_DEMO_CHECK_2026-11-10.md` |
| P1 | Batches | Concurrency/capacity/transfer acceptance (A02) | Partially Completed | batch plans |
| P2 | Students/Parents | Document overview counts use authoritative total (F03) | Pending | `FUNCTIONALITY_API_AUDIT_2026-10-27.md` |
| P2 | Coaches | Centralise academy business-date boundaries (F05) | Pending | same |
| P2 | Attendance | Real-device QR + installed PWA acceptance (A03) | Pending | `DEVICE_ACCEPTANCE.md` |
| P2 | Shared Components | Authenticated visual/keyboard acceptance (A04) | Pending | `UI_ARCHITECTURE_AUDIT_2026-11-14.md` |
| P2 | Reports | Large-data aggregation and export stability (A05) | Pending | `TABLE_OPERATIONS_AUDIT.md` |
| P2 | Notifications | Reconcile tracker N-009/015/019/025 (A06) | Needs Review | `notifications-improvement-tracker.md` |
| P2 | Shared Components | Spacing/breakpoint consolidation, FormField adoption (A07) | Partially Completed | UI audit fix log |
| P2 | Attendance | Offline scope decision (A08) | Scope decision | `core/config/api.config.ts` |
| P2 | Authentication | Multi-role/l10n scope per RBAC register (A09) | Scope decision | `audits/NOT_WORKING_STATUS_2026-11-11.md` |
| P2 | Docs | Reconcile stale "Still open" lists and 56 broken relative links (DOC01–DOC05) | Partially Completed (this file supersedes the lists) | `CONSOLIDATED_ISSUES_2026-11-16.md` |
| P3 | Notifications | WhatsApp test-recipient hardcoded (I09) | Pending | `audit/FULL-REPORT.md` |
| P3 | Shared Components | Accessibility: chart scroll regions, contrast (I10) | Partially Completed | same |

---

## 5. Completed Features

Chronological record with the original document that described the work.

| Completed item | Evidence | Original source |
|---|---|---|
| Build/lint/test pipeline restored (no missing lint target, no compile failures) | Today's build + lint + 934 tests | `audit/FULL-REPORT.md` F121/F134, `PRE_GITHUB_AUDIT_2026-10-29.md` |
| Mock e2e suite immune to preset `PORT` | Script + suite | `FIX_PLAN_2026-10-19.md` §0.2 |
| Events/Holidays backend deployed and clear of blockers | Table present, live checks | `RELEASE_BLOCKERS_2026-10-29.md` §1 |
| Notification RPCs present; staff access denied to Parent/Coach (42501) | Live probe | `BLOCKER_RECHECK_2026-10-29.md` |
| Data reset executed with zero leftover rows | Table results recorded | `DATA_RESET_RESULT_2026-10-28.md` |
| Login page redesign (responsive, accessible, official branding) | Current `login-page.*` | `LOGIN_REDESIGN_2026-10-28.md` |
| Unified attendance workspace | 9 live routes | `UNIFIED_ATTENDANCE_2026-10-20.md` |
| Admin attendance calendar + filters fully Supabase-backed | RPCs + UI | `P1_BLOCKERS_RESOLUTION.md` |
| Hardcoded fallback values removed from attendance/schedule | Source | `P1_BLOCKERS_RESOLUTION.md` |
| Coach student search/filter/pagination | Table controls | `P1_BLOCKERS_RESOLUTION.md` |
| Users list 500 fixed (live schema correction) | Live users list | `USER_LIST_LIVE_FIX_2026-11-04.md` |
| WhatsApp attendance verification (Patil case) | Delivered messages + source fixes | `PATIL_WHATSAPP_TEST_2026-10-21.md` |
| Parent edit no longer loses consent/status (I04) | Unit tests | `audit/NOT-WORKING-FEATURES.md` |
| Payment history view repaired | Repair migration + live route | `PAYMENT_MODULE_AUDIT_2026-11-02.md` |
| Provider module compiles again (I02) | 10 unit tests | `audit/FULL-REPORT.md` |
| Notification Phase-1 DB tests scripted | 39 script tests | `notification-db-tests.md` |
| Pre-GitHub secret scan and metadata fixes | Recorded scan | `PRE_GITHUB_AUDIT_2026-10-29.md` |
| LocalStore, stylesheet split (10 partials), data-table and metric-card migrations | Byte-identical compiled CSS, tests | `UI_ARCHITECTURE_AUDIT_2026-11-14.md` §12 |
| Navy token system A1–A7, shared components B1–B6, C1–C7 refactors | Build + 934 tests | `UI_ARCHITECTURE_AUDIT_2026-11-14.md` |
| `aria-busy` on 30 regions / 22 templates | Source | `UI_ARCHITECTURE_AUDIT_2026-11-14.md` §12 |
| 18 duplicate `@media` blocks merged (byte-identical CSS) | Compiled CSS diff | same |
| Photo editor modal lifecycle, async save, busy guards | Source + tests | `UI_UX_P0_SOURCE_FINDINGS_2026-11-04.md` |
| ID-card QR production-bundle failure fixed | Prod smoke test | working-tree fix `a0a523d` |
| QR encoder lazy-loaded again (−24.9 kB main) | Prod bundle: lazy chunk only on Preview | this audit |
| Coach phone double country-code fix (F4) | Live `/coaches` | this audit |
| Reports default period now current month (F5) | Live `/reports` → 16 rows | this audit |
| Coach portal demo wiring (F2) and parent children (F3) | 4 batches / 4 students; 3 children | this audit |
| RBAC migrations `202611160001–0003` applied | Migrations ledger + 200s | this audit |

### Historical audit snapshot (archived, `docs/audit/*`)

The October audit catalogued **152 capabilities**: 20 WORKING, 4 NOT WORKING, 91 PARTIALLY WORKING,
2 MISSING, 11 NEEDS IMPROVEMENT, 24 NOT VERIFIED (22 Oct snapshot), with ten cross-cutting findings
**I01–I10**: payment-history SQL view allowlist (I01, since repaired), invalid provider source
blocking compilation (I02, cleared), receptionist checkout test race (I03), parent consent loss on
edit (I04, fixed), business-date disagreement (I05 → current F05), offline queue ownership (I06),
staff checkout without open-checkin guard (I07, coach RPC guards it), large-data limits (I08 → A05),
hardcoded WhatsApp test recipient (I09), accessibility contrast/keyboard scroll (I10).
The per-status files under `audit/` and `audit/previous-audit/` are archived copies of this snapshot.

---

## 6. Known Bugs and Blockers

### 6.1 Open defects (code-level, reproducible from source)

| ID | Issue | Impact | Owner action |
|---|---|---|---|
| F01 | "Remember me" has no effect — session always persisted | Misleading control | Implement or remove |
| F02 | Parent child attendance totals derive from loaded page | Wrong totals on long histories | Use server aggregate |
| F03 | Document overview counts use page length | Count mismatch | Use `documentTotal` |
| F04 | Coach roster loads all enrollments in one request | Truncation at server cap | Page or aggregate |
| F05 | Coach date boundaries use UTC `toISOString().slice(0,10)` | Off-by-one near midnight | Centralise academy date |
| F06 | Student documents: no upload/open/delete | Feature gap | Implement workflow |
| F07 | Medical editing not established | Feature gap or scope decision | Decide and document |
| F08 | Discount assignment / late-fee assessment path unproven | Billing risk | Trace and implement |
| F09 | Invitation does not link `parents/coaches.profile_id` | New portals empty | Add linking step |
| F10 | Browser tests assert obsolete login copy | e2e red | Update selectors |

### 6.2 External / operational blockers

| ID | Blocker | Evidence |
|---|---|---|
| D01 | Print-settings columns absent remotely (as of 14 Nov) | `DEPLOYMENT_READINESS_2026-11-14.md` |
| D02 | `fee_summary.collected` RPC absent remotely | same |
| D03 | `202611130001_profile_self_service` effect unknown | same |
| D04 | WhatsApp Content SID invalid | `KNOWN_ISSUES.md` KI-01 |
| D05 | Notification email provider unverified | KI-02 |
| D06 | Hosted auth recovery / invitation mailbox unverified | KI-03, `ACCOUNT_RECOVERY.md` |
| D07 | Birthday/event scheduler inactive | KI-07 |
| D08 | Hosted bundle ≠ local; error ingestion unverified | KI-04 |
| D09 | Recovery rehearsal covers DB only | `BACKUP_RESTORE.md` |

### 6.3 Repository state at audit time

- Local `main` at `a0a523d`; **33 working-tree entries** — mostly a staged account-lifecycle change
  set owned outside this audit plus this audit's doc/test edits.
- `artifacts/` is gitignored; the demo seed now lives at `scripts/demo-seed-2026-11-16.sql`.
- Superseded claims that should **not** be reopened without new evidence: build/lint failures,
  missing lint target, "no restore ever tested", parent opt-out loss, staff QR UTC lookup,
  missing print sheets, payment-history view validation, missing-image-alt false positives.
  Full list: `CONSOLIDATED_ISSUES_2026-11-16.md` §5.

---

## 7. Documentation Cleanup History

Deletion executed **16 November 2026** after explicit approval, in one `git rm` of 42 tracked files.
Every row's content lives in §3 (module status), §4 (pending work) or §5 (completed history);
Git history at the parent commit preserves the originals verbatim.

| Deleted file | Reason | Master record | Verification |
|---|---|---|---|
| `audit/previous-audit/COMPONENT-AND-TABLE-AUDIT.md` | Literal duplicate of the previous audit snapshot | §5 history, §2.2 | Basename check: 0 dangling links |
| `audit/previous-audit/IMPROVEMENT-RECOMMENDATIONS.md` | Same | §5 history | Same |
| `audit/previous-audit/MISSING-FEATURES.md` | Same | §5 history | Same |
| `audit/previous-audit/NOT-VERIFIED-FEATURES.md` | Same | §5 history | Same |
| `audit/previous-audit/NOT-WORKING-FEATURES.md` | Same | §6.1 (F01–F10 origins) | Same |
| `audit/previous-audit/PARTIALLY-WORKING-FEATURES.md` | Same | §4 | Same |
| `audit/previous-audit/PRIORITY-FIX-PLAN.md` | Same | §4 | Same |
| `audit/previous-audit/PROJECT-AUDIT-SUMMARY.md` | Same | §5 history | Same |
| `audit/previous-audit/WORKING-FEATURES.md` | Same | §5 | Same |
| `audit/COMPONENT-AND-TABLE-AUDIT.md` | Superseded by the 14 Nov UI audit and §3.17 | §3.16, §3.17 | 0 dangling links |
| `audit/IMPROVEMENT-RECOMMENDATIONS.md` | Superseded | §4 | Same |
| `audit/MISSING-FEATURES.md` | Count was 0 — nothing to carry | §2.2 | Same |
| `audit/NOT-VERIFIED-FEATURES.md` | Superseded by §4 | §4 | Same |
| `audit/NOT-WORKING-FEATURES-2026-10-21.md` | Superseded; defects tracked as F01–F10 | §6.1 | Same |
| `audit/NOT-WORKING-FEATURES.md` | Superseded; resolved items in §5 | §5, §6.1 | Same |
| `audit/PARTIALLY-WORKING-FEATURES.md` | Superseded by §4 | §4 | Same |
| `audit/PRIORITY-FIX-PLAN.md` | Superseded by §4 | §4 | Same |
| `audit/PROJECT-AUDIT-SUMMARY.md` | Superseded; 152-capability counts kept in §5 | §5 | Same |
| `audit/WORKING-FEATURES.md` | Superseded by §5 | §5 | Same |
| `audit/document-inventory-2026-10-27.md` | Superseded by this audit's §2 | §2 | Same |
| `P0_BLOCKERS_RESOLUTION.md` | Work completed and verified | §5 | Same |
| `P1_BLOCKERS_RESOLUTION.md` | Work completed and verified | §5 | Same |
| `FIX_PLAN_2026-10-19.md` | Plan closed (`Status: DONE`) | §5 | Same |
| `LOGIN_REDESIGN_2026-10-28.md` | Delivered; current login page verified | §3.1, §5 | Same |
| `UNIFIED_ATTENDANCE_2026-10-20.md` | Delivered; 9 attendance routes live | §3.9, §5 | Same |
| `USER_LIST_LIVE_FIX_2026-11-04.md` | Live fix applied and verified | §3.15, §5 | Same |
| `PATIL_WHATSAPP_TEST_2026-10-21.md` | One-off verification record | §5 | Same |
| `BLOCKER_RECHECK_2026-10-29.md` | Cleared findings absorbed into `KNOWN_ISSUES.md` | §6 | Same |
| `PRE_GITHUB_AUDIT_2026-10-29.md` | Completed audit | §5 | Same |
| `DATA_RESET_IMPACT_2026-10-28.md` | Superseded by its own completion report | §5 | Same |
| `DATA_RESET_RESULT_2026-10-28.md` | Completed; outcome summarised | §5 | Same |
| `CONTINUATION_STATUS.md` | Obsolete September-era status | §2.1 | Same |
| `APPLICATION_AUDIT_2026-10-21.md` | Superseded by 14 Nov audit and §3 | §3 | Same |
| `reports/API_INTEGRATION_REPORT.md` | Superseded by §3.17 | §3.17 | Same |
| `reports/HARDCODED_DATA_REPORT.md` | Completed; no hardcoded data remains in served pages | §5 | Same |
| `FUNCTIONALITY_STATUS_2026-10-19.md` | Obsolete snapshot | §2.1 | Same |
| `PROJECT_STATUS_REPORT_2026-10-19.md` | Obsolete snapshot | §2.1 | Same |
| `RELEASE_2026-10-19.md` | Obsolete checklist | §4 (current tasks) | Same |
| `OPEN_FUNCTIONAL_GAPS_2026-10-19.md` | Gaps re-expressed as F01–F09 / D01–D09 | §6 | Same |
| `DEPLOYMENT_READINESS_2026-11-12.md` | Superseded by the 14 Nov readiness report | §6.2 | Same |
| `reports/FULL_PROJECT_AUDIT.md` | Superseded; unchecked items covered by §4 | §4 | Same |
| `reports/PRIORITY_ACTION_PLAN.md` | Superseded by §4 | §4 | Same |

### 7.0 Consequences handled

- **Six files linked to deleted documents** and were repointed to this master file in the same pass:
  `CONSOLIDATED_ISSUES_2026-11-16.md`, `FUNCTIONALITY_API_AUDIT_2026-10-27.md`, `KNOWN_ISSUES.md`,
  `PROJECT_FUNCTIONALITY.md`, `REPAIR_TRACKER.md`, `audit/FULL-REPORT.md`.
- **Link scan after deletion:** 5 remaining broken links, all pre-existing missing evidence, none caused by
  this cleanup — `UI_UX_THEME_IMPLEMENTATION_TRACKER.md` → `../artifacts/ui-audit-p0/baseline.json`, and
  `audit/FULL-REPORT.md` → four missing dashboard screenshots (`admin-dashboard-admin.png`, etc.).
  These stay open as evidence gaps (DOC04).
- **`audit/FULL-REPORT.md` is generated** by `scripts/build-full-audit-report.mjs`; regenerating it rebuilds its
  per-status link table, which will point at the archived names again until the script's template is updated.
- Result: **43 Markdown files** in `docs/` (42 retained + this master), down from 84.

### 7.1 Retained documents and why

| File | Reason retained |
|---|---|
| `BACKUP_RESTORE.md` | Referenced by `scripts/backup-database.mjs`; standalone recovery runbook (D09) |
| `NOTIFICATION_DELIVERY_SETUP.md` | Referenced by `scripts/check-delivery-config.mjs`; open D05 |
| `TEST_CREDENTIALS_SETUP.md` | Referenced by `scripts/legacy/verify-test-credentials.ts` |
| `notification-db-tests.md` | Referenced by `scripts/test-notification-db.mjs` |
| `audit/FULL-REPORT.md` | Generated by `scripts/build-full-audit-report.mjs` |
| `README.md`-linked docs | `FUNCTIONALITY_API_AUDIT_2026-10-27.md`, `FUNCTIONALITY_AUDIT_2026-10-15.md`, `REPAIR_TRACKER.md`, `supabase-deployment.md`, `supabase-implementation-audit.md` |
| `CONSOLIDATED_ISSUES_2026-11-16.md`, `ACCOUNT_RECOVERY.md` | Referenced by `PROJECT-CLEANUP-AUDIT.md` |
| `ACCOUNT_LIFECYCLE_POLICY_2026-11-16.md` | Security/retention policy — must stay standalone |
| `DEVICE_ACCEPTANCE.md`, `QR_CAMERA_VERIFICATION_PLAN.md` | Unresolved device acceptance |
| `KNOWN_ISSUES.md`, `notifications-improvement-tracker.md`, `audits/NOT_WORKING_STATUS_2026-11-11.md` | Open item registers |
| `UI_ARCHITECTURE_AUDIT_2026-11-14.md`, `UI_UX_THEME_IMPLEMENTATION_TRACKER.md`, `UI_UX_P0_SOURCE_FINDINGS_2026-11-04.md` | Source of open acceptance items A04/A07 |
| `DEPLOYMENT_READINESS_2026-11-14.md` | Only evidence for D01–D03, D07, D08 |

---

## 8. Deletion Record (approved and executed)

**Executed — 42 files, approved 16 November 2026.** Every requirement in them was transferred to
§3/§4/§5, they carried no unresolved task of their own, and no script, config, README or CI file
referenced them (verified by grep across `*.ts`, `*.js`, `*.mjs`, `*.json`, `*.yml`, `*.html`,
`README.md`, `PROJECT-CLEANUP-AUDIT.md`). Git retains every original.

Group A — literal previous copy (9):
`audit/previous-audit/{COMPONENT-AND-TABLE-AUDIT, IMPROVEMENT-RECOMMENDATIONS, MISSING-FEATURES,
NOT-VERIFIED-FEATURES, NOT-WORKING-FEATURES, PARTIALLY-WORKING-FEATURES, PRIORITY-FIX-PLAN,
PROJECT-AUDIT-SUMMARY, WORKING-FEATURES}.md`

Group B — superseded October audit set (11):
`audit/{COMPONENT-AND-TABLE-AUDIT, IMPROVEMENT-RECOMMENDATIONS, MISSING-FEATURES,
NOT-VERIFIED-FEATURES, NOT-WORKING-FEATURES-2026-10-21, NOT-WORKING-FEATURES,
PARTIALLY-WORKING-FEATURES, PRIORITY-FIX-PLAN, PROJECT-AUDIT-SUMMARY, WORKING-FEATURES,
document-inventory-2026-10-27}.md`

Group C — completed one-off work reports (15):
`P0_BLOCKERS_RESOLUTION.md`, `P1_BLOCKERS_RESOLUTION.md`, `FIX_PLAN_2026-10-19.md`,
`LOGIN_REDESIGN_2026-10-28.md`, `UNIFIED_ATTENDANCE_2026-10-20.md`,
`USER_LIST_LIVE_FIX_2026-11-04.md`, `PATIL_WHATSAPP_TEST_2026-10-21.md`,
`BLOCKER_RECHECK_2026-10-29.md`, `PRE_GITHUB_AUDIT_2026-10-29.md`,
`DATA_RESET_IMPACT_2026-10-28.md`, `DATA_RESET_RESULT_2026-10-28.md`,
`CONTINUATION_STATUS.md`, `APPLICATION_AUDIT_2026-10-21.md`,
`reports/API_INTEGRATION_REPORT.md`, `reports/HARDCODED_DATA_REPORT.md`

Group D — obsolete dated snapshots (7):
`FUNCTIONALITY_STATUS_2026-10-19.md`, `PROJECT_STATUS_REPORT_2026-10-19.md`,
`RELEASE_2026-10-19.md`, `OPEN_FUNCTIONAL_GAPS_2026-10-19.md`,
`DEPLOYMENT_READINESS_2026-11-12.md`, `reports/FULL_PROJECT_AUDIT.md`,
`reports/PRIORITY_ACTION_PLAN.md`

**Explicitly not deleted (42 files):** everything in §7.1 plus `ADMIN_AUTH_AUDIT_2026-10-30.md`,
`ADMIN_PORTAL_GAP_ANALYSIS.md`, `AUTH_INVITATION_SYSTEM_2026-10-31.md`,
`BACKEND_RELEASE_PREFLIGHT.md`, both batch plans, `CLIENT_DEMO_CHECK_2026-11-10.md`,
`FEATURE_HEALTH_REPORT_2026-11-10.md`, `FEES_MODULE_IMPLEMENTATION_PLAN_2026-11-03.md`,
`INVITATION_FIX_2026-10-30.md`, `LIVE_RELEASE_VERIFICATION.md`,
`NOTIFICATION_PHASE1_ACCEPTANCE_2026-10-23.md`, `PAYMENT_MODULE_AUDIT_2026-11-02.md`,
`PROJECT_FUNCTIONALITY.md`, `RELEASE_BLOCKERS_2026-10-29.md`,
`RELEASE_READINESS_2026-11-04.md`, `REMAINING_TASKS_REPORT.md`,
`TABLE_OPERATIONS_AUDIT.md`, `reports/FIX_IMPLEMENTATION_REPORT.md`,
`reports/WHATSAPP_FEATURE_GUIDE.md`.

> Git history preserves every deleted file, so nothing is unrecoverable. Content that matters
> has been restated above with its original path for traceability.

---

## Appendix A — Verification scope statement

Verified in this audit: `npm run build`, `npm run lint`, full unit suite (934 tests), script tests,
live Supabase reads/writes for the RBAC migrations, and a production-bundle browser pass
(admin: dashboard, students, student detail, ID card preview).
**Not verified in this audit:** hosted deployment identity, external email/WhatsApp delivery,
physical devices, printers, screen readers, multi-browser rendering, or any acceptance that needs
a human observer. Those remain in §4/§6 rather than being reported as passing.

## Appendix B — Source of record per module

| Module | Primary source |
|---|---|
| Authentication | `src/app/core/auth/*`, `supabase/functions/admin-manage-users/index.ts` |
| Dashboard | `src/app/features/dashboard/*` |
| Students / Parents / Coaches | `src/app/features/{students,parents,coaches}/*` |
| Reception / Coach portals | `src/app/features/coach/*`, `dashboard/reception` |
| Batches / Enrollments | `src/app/features/{batches,enrollments}/*` |
| Attendance | `src/app/features/attendance/*` |
| Fees / Payments | `src/app/features/{fees,payments}/*`, `core/supabase/domain-services.ts` |
| Notifications | `src/app/features/notifications/*`, `supabase/functions/notification-delivery/*` |
| Reports | `src/app/features/reports/*` |
| Profile / Settings | `src/app/features/{profile,settings}/*` |
| Shared UI | `src/app/shared/*` |
| Database | `supabase/migrations/*` (100 files) |
