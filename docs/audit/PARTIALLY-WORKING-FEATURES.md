# Partial and unverified workflows

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

| ID | Module | Capability / scope | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F001 | auth | /auth/splash — route/read experience | Fresh production-preview: admin: LOADED → /auth/splash. Submissions/destructive actions not executed. src/app/app.routes.ts:37 | P2 |
| F003 | auth | /auth/login — route/read experience | Fresh production-preview: admin: LOADED → /auth/login. Submissions/destructive actions not executed. src/app/app.routes.ts:42 | P2 |
| F004 | unauthorized | /unauthorized — route/read experience | Fresh production-preview: admin: LOADED → /unauthorized. Submissions/destructive actions not executed. src/app/app.routes.ts:47 | P2 |
| F005 | auth | /auth/forgot-password — route/read experience | Fresh production-preview: admin: LOADED → /auth/forgot-password. Submissions/destructive actions not executed. src/app/app.routes.ts:53 | P2 |
| F006 | auth | /auth/reset-password — route/read experience | Fresh production-preview: admin: LOADED → /auth/reset-password. Submissions/destructive actions not executed. src/app/app.routes.ts:61 | P2 |
| F007 | auth | /auth/otp — route/read experience | Fresh production-preview: admin: LOADED → /auth/otp. Submissions/destructive actions not executed. src/app/app.routes.ts:70 | P2 |
| F008 | auth | /auth/session-expired — route/read experience | Fresh production-preview: admin: LOADED → /auth/session-expired. Submissions/destructive actions not executed. src/app/app.routes.ts:79 | P2 |
| F009 | auth | /auth/password-updated — route/read experience | Fresh production-preview: admin: LOADED → /auth/password-updated. Submissions/destructive actions not executed. src/app/app.routes.ts:87 | P2 |
| F015 | coach | /coach/batches — route/read experience | Fresh production-preview: coach: LOADED → /coach/batches. Submissions/destructive actions not executed. src/app/app.routes.ts:145 | P2 |
| F016 | coach | /coach/batches/:batchId — route/read experience | Fresh production-preview: coach: LOADED → /coach/batches/30000000-0000-4000-8000-000000000001. Submissions/destructive actions not executed. src/app/app.routes.ts:151 | P2 |
| F017 | coach | /coach/students — route/read experience | Fresh production-preview: coach: LOADED → /coach/students. Submissions/destructive actions not executed. src/app/app.routes.ts:157 | P2 |
| F018 | coach | /coach/students/:studentId — route/read experience | Fresh production-preview: coach: LOADED → /coach/students/69d7156c-f8eb-4c66-acc4-cb893d406604. Submissions/destructive actions not executed. src/app/app.routes.ts:163 | P2 |
| F019 | coach | /coach/attendance — route/read experience | Fresh production-preview: coach: LOADED → /coach/attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:169 | P2 |
| F020 | coach | /coach/attendance/qr — route/read experience | Fresh production-preview: coach: LOADED → /coach/attendance/qr. Submissions/destructive actions not executed. src/app/app.routes.ts:175 | P2 |
| F021 | coach | /coach/attendance/check-in — route/read experience | Fresh production-preview: coach: LOADED → /coach/attendance/check-in. Submissions/destructive actions not executed. src/app/app.routes.ts:181 | P2 |
| F022 | coach | /coach/attendance/check-out — route/read experience | Fresh production-preview: coach: LOADED → /coach/attendance/check-out. Submissions/destructive actions not executed. src/app/app.routes.ts:187 | P2 |
| F023 | coach | /coach/attendance/history — route/read experience | Fresh production-preview: coach: LOADED → /coach/attendance/history. Submissions/destructive actions not executed. src/app/app.routes.ts:193 | P2 |
| F024 | coach | /coach/attendance/correction — route/read experience | Fresh production-preview: coach: LOADED → /coach/attendance/correction. Submissions/destructive actions not executed. src/app/app.routes.ts:199 | P2 |
| F025 | coach | /coach/attendance/summary — route/read experience | Fresh production-preview: coach: LOADED → /coach/attendance/summary. Submissions/destructive actions not executed. src/app/app.routes.ts:205 | P2 |
| F026 | coach | /coach/schedule — route/read experience | Fresh production-preview: coach: LOADED → /coach/schedule. Submissions/destructive actions not executed. src/app/app.routes.ts:211 | P2 |
| F027 | coach | /coach/notifications — route/read experience | Fresh production-preview: coach: LOADED → /coach/notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:217 | P2 |
| F028 | coach | /coach/profile — route/read experience | Fresh production-preview: coach: LOADED → /coach/profile. Submissions/destructive actions not executed. src/app/app.routes.ts:223 | P2 |
| F029 | coach | /coach/support — route/read experience | Fresh production-preview: coach: LOADED → /coach/support. Submissions/destructive actions not executed. src/app/app.routes.ts:229 | P2 |
| F031 | dashboard | /dashboard/coach — route/read experience | Fresh production-preview: admin: LOADED → /dashboard/coach. Submissions/destructive actions not executed. src/app/app.routes.ts:244 | P2 |
| F034 | parent | /parent/children/:id/edit — route/read experience | Fresh production-preview: parent: LOADED → /parent/children/40000000-0000-4000-8000-000000000002/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:268 | P2 |
| F035 | parent | /parent/children/:id — route/read experience | Fresh production-preview: parent: LOADED → /parent/children/40000000-0000-4000-8000-000000000002. Submissions/destructive actions not executed. src/app/app.routes.ts:276 | P2 |
| F036 | parent | /parent/children — route/read experience | Fresh production-preview: parent: LOADED → /parent/children. Submissions/destructive actions not executed. src/app/app.routes.ts:286 | P2 |
| F037 | parent | /parent/attendance — route/read experience | Fresh production-preview: parent: LOADED → /parent/attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:292 | P2 |
| F038 | parent | /parent/attendance/calendar — route/read experience | Fresh production-preview: parent: LOADED → /parent/attendance/calendar. Submissions/destructive actions not executed. src/app/app.routes.ts:298 | P2 |
| F039 | parent | /parent/schedule — route/read experience | Fresh production-preview: parent: LOADED → /parent/schedule. Submissions/destructive actions not executed. src/app/app.routes.ts:304 | P2 |
| F040 | parent | /parent/coach — route/read experience | Fresh production-preview: parent: LOADED → /parent/coach. Submissions/destructive actions not executed. src/app/app.routes.ts:310 | P2 |
| F041 | parent | /parent/fees — route/read experience | Fresh production-preview: parent: LOADED → /parent/fees. Submissions/destructive actions not executed. src/app/app.routes.ts:316 | P2 |
| F042 | parent | /parent/payments — route/read experience | Fresh production-preview: parent: LOADED → /parent/payments. Submissions/destructive actions not executed. src/app/app.routes.ts:322 | P2 |
| F043 | parent | /parent/receipts — route/read experience | Fresh production-preview: parent: LOADED → /parent/receipts. Submissions/destructive actions not executed. src/app/app.routes.ts:328 | P2 |
| F044 | parent | /parent/notifications — route/read experience | Fresh production-preview: parent: LOADED → /parent/notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:334 | P2 |
| F045 | parent | /parent/profile — route/read experience | Fresh production-preview: parent: LOADED → /parent/profile. Submissions/destructive actions not executed. src/app/app.routes.ts:340 | P2 |
| F046 | parent | /parent/profile/edit — route/read experience | Fresh production-preview: parent: LOADED → /parent/profile/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:346 | P2 |
| F047 | parent | /parent/support — route/read experience | Fresh production-preview: parent: LOADED → /parent/support. Submissions/destructive actions not executed. src/app/app.routes.ts:356 | P2 |
| F048 | dashboard | /dashboard — route/read experience | Fresh production-preview: admin: LOADED → /dashboard. Submissions/destructive actions not executed. src/app/app.routes.ts:362 | P2 |
| F049 | search | /search — route/read experience | Fresh production-preview: admin: LOADED → /search; receptionist: LOADED → /search. Submissions/destructive actions not executed. src/app/app.routes.ts:371 | P2 |
| F050 | students | /students/add — route/read experience | Fresh production-preview: admin: LOADED → /students/add; receptionist: LOADED → /students/add. Submissions/destructive actions not executed. src/app/app.routes.ts:377 | P2 |
| F051 | students | /students/:id/edit — route/read experience | Fresh production-preview: admin: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604/edit; receptionist: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:385 | P2 |
| F052 | students | /students/:id — route/read experience | Fresh production-preview: admin: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604; receptionist: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604. Submissions/destructive actions not executed. src/app/app.routes.ts:393 | P2 |
| F054 | parents | /parents/add — route/read experience | Fresh production-preview: admin: LOADED → /parents/add; receptionist: LOADED → /parents/add. Submissions/destructive actions not executed. src/app/app.routes.ts:409 | P2 |
| F055 | parents | /parents/:id/edit — route/read experience | Fresh production-preview: admin: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78/edit; receptionist: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:416 | P2 |
| F056 | parents | /parents/:id — route/read experience | Fresh production-preview: admin: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78; receptionist: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78. Submissions/destructive actions not executed. src/app/app.routes.ts:423 | P2 |
| F058 | batches | /batches/student-allocation — route/read experience | Fresh production-preview: admin: LOADED → /batches/student-allocation; receptionist: LOADED → /batches/student-allocation. Submissions/destructive actions not executed. src/app/app.routes.ts:436 | P2 |
| F059 | batches | /batches/coach-assignment — route/read experience | Fresh production-preview: admin: LOADED → /batches/coach-assignment; receptionist: LOADED → /batches/coach-assignment. Submissions/destructive actions not executed. src/app/app.routes.ts:442 | P2 |
| F060 | batches | /batches/schedule — route/read experience | Fresh production-preview: admin: LOADED → /batches/schedule; receptionist: LOADED → /batches/schedule. Submissions/destructive actions not executed. src/app/app.routes.ts:448 | P2 |
| F061 | batches | /batches/capacity — route/read experience | Fresh production-preview: admin: LOADED → /batches/capacity; receptionist: LOADED → /batches/capacity. Submissions/destructive actions not executed. src/app/app.routes.ts:454 | P2 |
| F063 | coaches | /coaches/add — route/read experience | Fresh production-preview: admin: LOADED → /coaches/add. Submissions/destructive actions not executed. src/app/app.routes.ts:466 | P2 |
| F064 | coaches | /coaches/:id/edit — route/read experience | Fresh production-preview: admin: LOADED → /coaches/20000000-0000-4000-8000-000000000001/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:473 | P2 |
| F065 | coaches | /coaches/:id — route/read experience | Fresh production-preview: admin: LOADED → /coaches/20000000-0000-4000-8000-000000000001; receptionist: LOADED → /coaches/20000000-0000-4000-8000-000000000001. Submissions/destructive actions not executed. src/app/app.routes.ts:480 | P2 |
| F068 | enrollments | /enrollments/new — route/read experience | Fresh production-preview: admin: LOADED → /enrollments/new; receptionist: LOADED → /enrollments/new. Submissions/destructive actions not executed. src/app/app.routes.ts:501 | P2 |
| F069 | enrollments | /enrollments/transfer — route/read experience | Fresh production-preview: admin: LOADED → /enrollments/transfer; receptionist: LOADED → /enrollments/transfer. Submissions/destructive actions not executed. src/app/app.routes.ts:508 | P2 |
| F070 | enrollments | /enrollments/pause — route/read experience | Fresh production-preview: admin: LOADED → /enrollments/pause; receptionist: LOADED → /enrollments/pause. Submissions/destructive actions not executed. src/app/app.routes.ts:515 | P2 |
| F071 | enrollments | /enrollments/cancel — route/read experience | Fresh production-preview: admin: LOADED → /enrollments/cancel; receptionist: LOADED → /enrollments/cancel. Submissions/destructive actions not executed. src/app/app.routes.ts:522 | P2 |
| F072 | enrollments | /enrollments/fee-plans — route/read experience | Fresh production-preview: admin: LOADED → /enrollments/fee-plans; receptionist: LOADED → /enrollments/fee-plans. Submissions/destructive actions not executed. src/app/app.routes.ts:529 | P2 |
| F073 | enrollments | /enrollments/history — route/read experience | Fresh production-preview: admin: LOADED → /enrollments/history; receptionist: LOADED → /enrollments/history. Submissions/destructive actions not executed. src/app/app.routes.ts:535 | P2 |
| F074 | attendance | /attendance — route/read experience | Fresh production-preview: admin: LOADED → /attendance; receptionist: LOADED → /attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:542 | P2 |
| F075 | attendance | /attendance/check-in-out — route/read experience | Fresh production-preview: admin: LOADED → /attendance/check-in-out; receptionist: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:549 | P2 |
| F079 | attendance | /attendance/correction — route/read experience | Fresh production-preview: admin: LOADED → /attendance/correction; receptionist: LOADED → /attendance/correction. Submissions/destructive actions not executed. src/app/app.routes.ts:571 | P2 |
| F081 | attendance | /attendance/calendar — route/read experience | Fresh production-preview: admin: LOADED → /attendance/calendar; receptionist: LOADED → /attendance/calendar. Submissions/destructive actions not executed. src/app/app.routes.ts:589 | P2 |
| F082 | attendance | /attendance/offline-queue — route/read experience | Fresh production-preview: admin: LOADED → /attendance/offline-queue; receptionist: LOADED → /attendance/offline-queue. Submissions/destructive actions not executed. src/app/app.routes.ts:598 | P2 |
| F086 | notifications | /notifications/events — route/read experience | Fresh production-preview: admin: LOADED → /notifications/events; receptionist: LOADED → /notifications/events. Submissions/destructive actions not executed. src/app/app.routes.ts:624 | P2 |
| F088 | auth | /auth/change-password — route/read experience | Fresh production-preview: admin: LOADED → /auth/change-password. Submissions/destructive actions not executed. src/app/app.routes.ts:636 | P2 |
| F089 | fees | /fees/discounts — route/read experience | Fresh production-preview: admin: LOADED → /fees/discounts; receptionist: LOADED → /fees/discounts. Submissions/destructive actions not executed. src/app/app.routes.ts:642 | P2 |
| F090 | fees | /fees/late-fees — route/read experience | Fresh production-preview: admin: LOADED → /fees/late-fees; receptionist: LOADED → /fees/late-fees. Submissions/destructive actions not executed. src/app/app.routes.ts:647 | P2 |
| F091 | fees | /fees/pending — route/read experience | Fresh production-preview: admin: LOADED → /fees/pending; receptionist: LOADED → /fees/pending. Submissions/destructive actions not executed. src/app/app.routes.ts:652 | P2 |
| F092 | fees | /fees/summary — route/read experience | Fresh production-preview: admin: LOADED → /fees/summary; receptionist: LOADED → /fees/summary. Submissions/destructive actions not executed. src/app/app.routes.ts:657 | P2 |
| F094 | payments | /payments/new — route/read experience | Fresh production-preview: admin: LOADED → /payments/new; receptionist: LOADED → /payments/new. Submissions/destructive actions not executed. src/app/app.routes.ts:671 | P2 |
| F095 | payments | /payments/partial — route/read experience | Fresh production-preview: admin: LOADED → /payments/partial; receptionist: LOADED → /payments/partial. Submissions/destructive actions not executed. src/app/app.routes.ts:679 | P2 |
| F096 | payments | /payments/full — route/read experience | Fresh production-preview: admin: LOADED → /payments/full; receptionist: LOADED → /payments/full. Submissions/destructive actions not executed. src/app/app.routes.ts:687 | P2 |
| F097 | payments | /payments/receipts — route/read experience | Fresh production-preview: admin: LOADED → /payments/receipts; receptionist: LOADED → /payments/receipts. Submissions/destructive actions not executed. src/app/app.routes.ts:695 | P2 |
| F098 | payments | /payments/refunds — route/read experience | Fresh production-preview: admin: LOADED → /payments/refunds. Submissions/destructive actions not executed. src/app/app.routes.ts:700 | P2 |
| F101 | notifications | /notifications/templates — route/read experience | Fresh production-preview: admin: LOADED → /notifications/templates. Submissions/destructive actions not executed. src/app/app.routes.ts:724 | P2 |
| F106 | settings | /settings — route/read experience | Fresh production-preview: admin: LOADED → /settings. Submissions/destructive actions not executed. src/app/app.routes.ts:752 | P2 |
| F109 | settings | /settings/profile — route/read experience | Fresh production-preview: admin: LOADED → /settings/profile. Submissions/destructive actions not executed. src/app/app.routes.ts:772 | P2 |
| F110 | settings | /settings/regional — route/read experience | Fresh production-preview: admin: LOADED → /settings/regional. Submissions/destructive actions not executed. src/app/app.routes.ts:778 | P2 |
| F111 | settings | /settings/attendance — route/read experience | Fresh production-preview: admin: LOADED → /settings/attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:784 | P2 |
| F112 | settings | /settings/fees — route/read experience | Fresh production-preview: admin: LOADED → /settings/fees. Submissions/destructive actions not executed. src/app/app.routes.ts:790 | P2 |
| F113 | settings | /settings/notifications — route/read experience | Fresh production-preview: admin: LOADED → /settings/notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:796 | P2 |
| F114 | settings | /settings/roles — route/read experience | Fresh production-preview: admin: LOADED → /settings/roles. Submissions/destructive actions not executed. src/app/app.routes.ts:802 | P2 |
| F115 | settings | /settings/permissions — route/read experience | Fresh production-preview: admin: LOADED → /settings/permissions. Submissions/destructive actions not executed. src/app/app.routes.ts:808 | P2 |
| F116 | settings | /settings/theme — route/read experience | Fresh production-preview: admin: LOADED → /settings/theme. Submissions/destructive actions not executed. src/app/app.routes.ts:815 | P2 |
| F117 | settings | /settings/backup — route/read experience | Fresh production-preview: admin: LOADED → /settings/backup. Submissions/destructive actions not executed. src/app/app.routes.ts:822 | P2 |
| F118 | design | /design/:section/:view — route/read experience | Fresh production-preview: admin: LOADED → /design/foundations/colors. Submissions/destructive actions not executed. src/app/app.routes.ts:830 | P2 |
| F119 | handoff | /handoff/:view — route/read experience | Fresh production-preview: admin: LOADED → /handoff/overview. Submissions/destructive actions not executed. src/app/app.routes.ts:843 | P2 |
| F124 | WhatsApp | Admin QR and bulk manual Click-to-Chat | Historical live admin/bulk attendance tests passed; current unit suite passes. Fresh attendance writes/external sends not run under audit-only restriction. | P2 |
| F125 | WhatsApp | Receptionist complete E2E assertion | Historical receptionist E2E race read checkout prematurely; later response/read succeeded. No current live rerun; historical trace is not a current whole-flow pass. | P2 |
| F127 | Notifications | Local edge-provider deployability | Provider syntax repaired and mocked tests pass. Live configuration read succeeds. Deno entrypoint/deployment/actual delivery unverified; Deno executable unavailable. | P1 |
| F130 | Offline | Queue identity and replay | I06: persisted operations have no account namespace; cross-account replay scenario untested. | P2 |
| F131 | Attendance | Database checkout preconditions | I07: local staff SQL lacks open-check-in guard present in coach SQL; live mutation not run. | P2 |

## Partial findings

| ID | Module | Problem | Evidence | Cause / risk | Recommendation | Priority | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I06 | Offline/auth | Operations lack account ownership | Static risk; no exploit attempted | Shared actorless storage replayed under current session | Partition queues by authenticated subject and validate replay | P2 | src/app/core/offline/attendance-outbox.storage.ts:4; attendance-outbox.service.ts:92,94; src/app/core/auth/auth.service.ts:121 |
| I07 | Attendance | Staff checkout lacks open-check-in guard | Static local SQL; deployed mutation unverified | Staff SQL permits null checkin, coach RPC rejects it | Enforce state preconditions transactionally | P2 | supabase/migrations/202609040002_security_and_workflows.sql:206; 202609050015_coach_portal_security.sql:130 |

Offline queue-as-A/switch-to-B/reconnect remains an untested risk. No exploit was attempted. Staff checkout on a null-checkin row requires deployed parity inspection and isolated transactional test; local SQL is not proof of deployed failure.

Historical receptionist E2E read null before checkout completed; later HTTP200 and read confirmed persistence. Current units pass; no live attendance writes were rerun. Prior admin/bulk success remains historical.

Provider module compiles and mocked tests pass; live configuration read succeeds. Deno entrypoint/deployment, credentials/template eligibility and actual delivery remain unverified. Click-to-Chat opening does not prove sending/delivery.

## Not verified

| ID | Module | Capability / scope | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F126 | WhatsApp | Message sent or delivered confirmation | URL opening does not establish sending or delivery. No recipient receipt available. | P2 |
| F135 | Auth | UI login/logout audit logs, recovery email, reset, OTP and password change | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F136 | Students | Create/edit/delete and document/photo persistence | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F137 | Parents | Create/link/unlink/delete and primary-parent persistence | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F138 | Coaches | Create/edit/delete and assignment writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F139 | Batches | Create/edit/delete, waitlist and schedule writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F140 | Enrollments | Create/transfer/pause/cancel/fee-plan writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F141 | Attendance | Corrections, offline retry/discard and coach writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F142 | Fees | Generate charges, discounts, late fees and fee-plan writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F143 | Payments | Record/allocate/refund and receipt generation | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F144 | Notifications | Compose/send/retry, templates and events writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F145 | Settings | User/role/permission and preference writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F146 | Storage | Upload/delete/download and storage write-policy lifecycle | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F147 | Backup | Restore drill and external retention | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F148 | PWA | Production install/update and cross-account offline replay | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F149 | Exports | Every-module CSV/PDF completeness and parity | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |

Read rendering does not certify CRUD/financial/auth writes. Recovery, uploads, restore, PWA lifecycle, export completeness and real-camera permission/failure cases need separate execution.
