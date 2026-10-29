# Complete project audit — refreshed

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

## Scope and counting

152 capabilities: 119 named routes (aliases included) plus 33 command/cross-cutting capabilities. Each has one mutually exclusive primary status; recommendations do not add to totals. WORKING read/list/redirect entries certify only that scope, not every action on a page. Rendering alone is generally PARTIALLY WORKING. NOT VERIFIED is insufficient evidence, not confirmed failure.

Production preview on127.0.0.1:4312 uses the existing live Supabase project. Fresh contexts, authenticated session bootstrap and business-write guards prevent application mutations; authentication sessions themselves were necessary for role testing. CRUD, corrections, refunds, uploads, recovery emails, external notification sending and restore were not run. Prior live attendance E2E is historical only. Service workers were blocked in this sweep, so PWA lifecycle is not verified.

Interrupted sweeps are excluded: the shared4202 server stopped, C: filled during an earlier production run, and shared dist output subsequently disappeared. A separate audit build is now served from memory by the browser harness. The complete resumed production run is authoritative. Cleanup was rejected by automatic approval review; it was not retried. The user freed space. Source hashes were unchanged on resume, so the successful build/unit results remain applicable. No application/data fixes were applied.

## Health summary

| Status | Count |
| --- | --- |
| WORKING | 30 |
| NOT WORKING | 4 |
| PARTIALLY WORKING | 93 |
| MISSING | 0 |
| NEEDS IMPROVEMENT | 9 |
| NOT VERIFIED | 16 |
| TOTAL | 152 |

No confirmed P0 finding. Payment History remains a P1 business failure. Prior provider/spec-import compile blockers are cleared.

## Changes from previous audit

- Full suite now passes 433 tests in 104 files.
- All 69 components have colocated specs; previous 43-missing claim cleared. 21 component specs are creation-only, so depth remains an improvement.
- Lint command exists but lacks target: NOT WORKING, not missing command.
- Parent status/address preservation improved; opt-out loss remains.
- Workspace now uses India date; QR still UTC.
- Provider module repaired; deployment/live delivery still unverified.
- Fresh alias/redirect observations replace old unverified route entries where successful.

## Verification

| Check | Outcome | Evidence / limit |
| --- | --- | --- |
| Production build | PASS | build-2026-10-22.txt |
| Full unit suite | 104 files /433 tests PASS | unit-2026-10-22.txt; mocked tests do not certify live writes |
| Lint | FAIL | No Angular lint target; lint-2026-10-22.txt |
| Browser sweep | 174 observations | {"LOADED":164,"REVIEW":2,"DENIED_AS_EXPECTED":8} |
| Table controls | 12 page probes | Sort/page-size/filter request traces; not exhaustive count reconciliation |
| Mutation guard | 0 blocked requests | No mutation action intentionally submitted; see evidence paths |
| Role/read boundaries | Four accounts checked | Current counts/scoped predicates/API denials; writes not certified |
| Dashboard accessibility | 2 rule violations | Four desktop states, selected axe rules; manual/all-route review incomplete |
| Deno edge entrypoint | NOT VERIFIED | Deno unavailable; imported provider module tests pass |
| Live state-changing E2E | NOT RUN | Audit-only restriction; no external message send |

## Module-wise complete catalogue

| ID | Module | Feature | Status | Evidence | Priority |
| --- | --- | --- | --- | --- | --- |
| F001 | auth | /auth/splash — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/splash. Submissions/destructive actions not executed. src/app/app.routes.ts:37 | P2 |
| F002 | login | /login — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /auth/login. Submissions/destructive actions not executed. src/app/app.routes.ts:40 Alias/redirect navigation scope only. | P2 |
| F003 | auth | /auth/login — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/login. Submissions/destructive actions not executed. src/app/app.routes.ts:42 | P2 |
| F004 | unauthorized | /unauthorized — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /unauthorized. Submissions/destructive actions not executed. src/app/app.routes.ts:47 | P2 |
| F005 | auth | /auth/forgot-password — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/forgot-password. Submissions/destructive actions not executed. src/app/app.routes.ts:53 | P2 |
| F006 | auth | /auth/reset-password — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/reset-password. Submissions/destructive actions not executed. src/app/app.routes.ts:61 | P2 |
| F007 | auth | /auth/otp — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/otp. Submissions/destructive actions not executed. src/app/app.routes.ts:70 | P2 |
| F008 | auth | /auth/session-expired — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/session-expired. Submissions/destructive actions not executed. src/app/app.routes.ts:79 | P2 |
| F009 | auth | /auth/password-updated — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/password-updated. Submissions/destructive actions not executed. src/app/app.routes.ts:87 | P2 |
| F010 | redirect | /redirect/admin — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /dashboard/admin. Submissions/destructive actions not executed. src/app/app.routes.ts:96 Alias/redirect navigation scope only. | P2 |
| F011 | redirect | /redirect/coach — route/read experience | WORKING | Fresh production-preview: coach: LOADED → /coach/dashboard. Submissions/destructive actions not executed. src/app/app.routes.ts:102 Alias/redirect navigation scope only. | P2 |
| F012 | redirect | /redirect/reception — route/read experience | WORKING | Fresh production-preview: receptionist: LOADED → /dashboard/reception. Submissions/destructive actions not executed. src/app/app.routes.ts:108 Alias/redirect navigation scope only. | P2 |
| F013 | redirect | /redirect/parent — route/read experience | WORKING | Fresh production-preview: parent: LOADED → /parent/dashboard. Submissions/destructive actions not executed. src/app/app.routes.ts:119 Alias/redirect navigation scope only. | P2 |
| F014 | coach | /coach/dashboard — route/read experience | NEEDS IMPROVEMENT | Dashboard read/render and desktop automated-accessibility scope. color-contrast: 12 nodes production-runtime-2026-10-22.json. | P2 |
| F015 | coach | /coach/batches — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/batches. Submissions/destructive actions not executed. src/app/app.routes.ts:145 | P2 |
| F016 | coach | /coach/batches/:batchId — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/batches/30000000-0000-4000-8000-000000000001. Submissions/destructive actions not executed. src/app/app.routes.ts:151 | P2 |
| F017 | coach | /coach/students — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/students. Submissions/destructive actions not executed. src/app/app.routes.ts:157 | P2 |
| F018 | coach | /coach/students/:studentId — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/students/69d7156c-f8eb-4c66-acc4-cb893d406604. Submissions/destructive actions not executed. src/app/app.routes.ts:163 | P2 |
| F019 | coach | /coach/attendance — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:169 | P2 |
| F020 | coach | /coach/attendance/qr — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/attendance/qr. Submissions/destructive actions not executed. src/app/app.routes.ts:175 | P2 |
| F021 | coach | /coach/attendance/check-in — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/attendance/check-in. Submissions/destructive actions not executed. src/app/app.routes.ts:181 | P2 |
| F022 | coach | /coach/attendance/check-out — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/attendance/check-out. Submissions/destructive actions not executed. src/app/app.routes.ts:187 | P2 |
| F023 | coach | /coach/attendance/history — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/attendance/history. Submissions/destructive actions not executed. src/app/app.routes.ts:193 | P2 |
| F024 | coach | /coach/attendance/correction — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/attendance/correction. Submissions/destructive actions not executed. src/app/app.routes.ts:199 | P2 |
| F025 | coach | /coach/attendance/summary — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/attendance/summary. Submissions/destructive actions not executed. src/app/app.routes.ts:205 | P2 |
| F026 | coach | /coach/schedule — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/schedule. Submissions/destructive actions not executed. src/app/app.routes.ts:211 | P2 |
| F027 | coach | /coach/notifications — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:217 | P2 |
| F028 | coach | /coach/profile — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/profile. Submissions/destructive actions not executed. src/app/app.routes.ts:223 | P2 |
| F029 | coach | /coach/support — route/read experience | PARTIALLY WORKING | Fresh production-preview: coach: LOADED → /coach/support. Submissions/destructive actions not executed. src/app/app.routes.ts:229 | P2 |
| F030 | dashboard | /dashboard/admin — route/read experience | WORKING | Dashboard read/render and desktop automated-accessibility scope. No violations in selected axe rules; not manual/site-wide certification. production-runtime-2026-10-22.json. | P2 |
| F031 | dashboard | /dashboard/coach — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /dashboard/coach. Submissions/destructive actions not executed. src/app/app.routes.ts:244 | P2 |
| F032 | dashboard | /dashboard/reception — route/read experience | WORKING | Dashboard read/render and desktop automated-accessibility scope. No violations in selected axe rules; not manual/site-wide certification. production-runtime-2026-10-22.json. | P2 |
| F033 | parent | /parent/dashboard — route/read experience | NEEDS IMPROVEMENT | Dashboard read/render and desktop automated-accessibility scope. color-contrast: 1 nodes production-runtime-2026-10-22.json. | P2 |
| F034 | parent | /parent/children/:id/edit — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/children/40000000-0000-4000-8000-000000000002/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:268 | P2 |
| F035 | parent | /parent/children/:id — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/children/40000000-0000-4000-8000-000000000002. Submissions/destructive actions not executed. src/app/app.routes.ts:276 | P2 |
| F036 | parent | /parent/children — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/children. Submissions/destructive actions not executed. src/app/app.routes.ts:286 | P2 |
| F037 | parent | /parent/attendance — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:292 | P2 |
| F038 | parent | /parent/attendance/calendar — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/attendance/calendar. Submissions/destructive actions not executed. src/app/app.routes.ts:298 | P2 |
| F039 | parent | /parent/schedule — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/schedule. Submissions/destructive actions not executed. src/app/app.routes.ts:304 | P2 |
| F040 | parent | /parent/coach — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/coach. Submissions/destructive actions not executed. src/app/app.routes.ts:310 | P2 |
| F041 | parent | /parent/fees — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/fees. Submissions/destructive actions not executed. src/app/app.routes.ts:316 | P2 |
| F042 | parent | /parent/payments — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/payments. Submissions/destructive actions not executed. src/app/app.routes.ts:322 | P2 |
| F043 | parent | /parent/receipts — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/receipts. Submissions/destructive actions not executed. src/app/app.routes.ts:328 | P2 |
| F044 | parent | /parent/notifications — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:334 | P2 |
| F045 | parent | /parent/profile — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/profile. Submissions/destructive actions not executed. src/app/app.routes.ts:340 | P2 |
| F046 | parent | /parent/profile/edit — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/profile/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:346 | P2 |
| F047 | parent | /parent/support — route/read experience | PARTIALLY WORKING | Fresh production-preview: parent: LOADED → /parent/support. Submissions/destructive actions not executed. src/app/app.routes.ts:356 | P2 |
| F048 | dashboard | /dashboard — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /dashboard. Submissions/destructive actions not executed. src/app/app.routes.ts:362 | P2 |
| F049 | search | /search — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /search; receptionist: LOADED → /search. Submissions/destructive actions not executed. src/app/app.routes.ts:371 | P2 |
| F050 | students | /students/add — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /students/add; receptionist: LOADED → /students/add. Submissions/destructive actions not executed. src/app/app.routes.ts:377 | P2 |
| F051 | students | /students/:id/edit — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604/edit; receptionist: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:385 | P2 |
| F052 | students | /students/:id — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604; receptionist: LOADED → /students/69d7156c-f8eb-4c66-acc4-cb893d406604. Submissions/destructive actions not executed. src/app/app.routes.ts:393 | P2 |
| F053 | students | /students — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /students; receptionist: LOADED → /students. Submissions/destructive actions not executed. src/app/app.routes.ts:401 | P2 |
| F054 | parents | /parents/add — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /parents/add; receptionist: LOADED → /parents/add. Submissions/destructive actions not executed. src/app/app.routes.ts:409 | P2 |
| F055 | parents | /parents/:id/edit — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78/edit; receptionist: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:416 | P2 |
| F056 | parents | /parents/:id — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78; receptionist: LOADED → /parents/5e975d64-64ea-4d29-84a0-1414da5f7c78. Submissions/destructive actions not executed. src/app/app.routes.ts:423 | P2 |
| F057 | parents | /parents — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /parents; receptionist: LOADED → /parents. Submissions/destructive actions not executed. src/app/app.routes.ts:430 | P2 |
| F058 | batches | /batches/student-allocation — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /batches/student-allocation; receptionist: LOADED → /batches/student-allocation. Submissions/destructive actions not executed. src/app/app.routes.ts:436 | P2 |
| F059 | batches | /batches/coach-assignment — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /batches/coach-assignment; receptionist: LOADED → /batches/coach-assignment. Submissions/destructive actions not executed. src/app/app.routes.ts:442 | P2 |
| F060 | batches | /batches/schedule — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /batches/schedule; receptionist: LOADED → /batches/schedule. Submissions/destructive actions not executed. src/app/app.routes.ts:448 | P2 |
| F061 | batches | /batches/capacity — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /batches/capacity; receptionist: LOADED → /batches/capacity. Submissions/destructive actions not executed. src/app/app.routes.ts:454 | P2 |
| F062 | batches | /batches — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /batches; receptionist: LOADED → /batches. Submissions/destructive actions not executed. src/app/app.routes.ts:460 | P2 |
| F063 | coaches | /coaches/add — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /coaches/add. Submissions/destructive actions not executed. src/app/app.routes.ts:466 | P2 |
| F064 | coaches | /coaches/:id/edit — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /coaches/20000000-0000-4000-8000-000000000001/edit. Submissions/destructive actions not executed. src/app/app.routes.ts:473 | P2 |
| F065 | coaches | /coaches/:id — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /coaches/20000000-0000-4000-8000-000000000001; receptionist: LOADED → /coaches/20000000-0000-4000-8000-000000000001. Submissions/destructive actions not executed. src/app/app.routes.ts:480 | P2 |
| F066 | coaches | /coaches — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /coaches; receptionist: LOADED → /coaches. Submissions/destructive actions not executed. src/app/app.routes.ts:487 | P2 |
| F067 | enrollments | /enrollments — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /enrollments; receptionist: LOADED → /enrollments. Submissions/destructive actions not executed. src/app/app.routes.ts:494 | P2 |
| F068 | enrollments | /enrollments/new — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /enrollments/new; receptionist: LOADED → /enrollments/new. Submissions/destructive actions not executed. src/app/app.routes.ts:501 | P2 |
| F069 | enrollments | /enrollments/transfer — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /enrollments/transfer; receptionist: LOADED → /enrollments/transfer. Submissions/destructive actions not executed. src/app/app.routes.ts:508 | P2 |
| F070 | enrollments | /enrollments/pause — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /enrollments/pause; receptionist: LOADED → /enrollments/pause. Submissions/destructive actions not executed. src/app/app.routes.ts:515 | P2 |
| F071 | enrollments | /enrollments/cancel — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /enrollments/cancel; receptionist: LOADED → /enrollments/cancel. Submissions/destructive actions not executed. src/app/app.routes.ts:522 | P2 |
| F072 | enrollments | /enrollments/fee-plans — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /enrollments/fee-plans; receptionist: LOADED → /enrollments/fee-plans. Submissions/destructive actions not executed. src/app/app.routes.ts:529 | P2 |
| F073 | enrollments | /enrollments/history — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /enrollments/history; receptionist: LOADED → /enrollments/history. Submissions/destructive actions not executed. src/app/app.routes.ts:535 | P2 |
| F074 | attendance | /attendance — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /attendance; receptionist: LOADED → /attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:542 | P2 |
| F075 | attendance | /attendance/check-in-out — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /attendance/check-in-out; receptionist: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:549 | P2 |
| F076 | attendance | /attendance/manual-check-in — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:556 Alias/redirect navigation scope only. | P2 |
| F077 | attendance | /attendance/manual-check-out — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:561 Alias/redirect navigation scope only. | P2 |
| F078 | attendance | /attendance/qr — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:566 Alias/redirect navigation scope only. | P2 |
| F079 | attendance | /attendance/correction — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /attendance/correction; receptionist: LOADED → /attendance/correction. Submissions/destructive actions not executed. src/app/app.routes.ts:571 | P2 |
| F080 | attendance | /attendance/history — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /attendance/history; receptionist: LOADED → /attendance/history. Submissions/destructive actions not executed. src/app/app.routes.ts:580 | P2 |
| F081 | attendance | /attendance/calendar — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /attendance/calendar; receptionist: LOADED → /attendance/calendar. Submissions/destructive actions not executed. src/app/app.routes.ts:589 | P2 |
| F082 | attendance | /attendance/offline-queue — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /attendance/offline-queue; receptionist: LOADED → /attendance/offline-queue. Submissions/destructive actions not executed. src/app/app.routes.ts:598 | P2 |
| F083 | fees | /fees/plans — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /fees/plans; receptionist: LOADED → /fees/plans. Submissions/destructive actions not executed. src/app/app.routes.ts:605 | P2 |
| F084 | fees | /fees — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /fees; receptionist: LOADED → /fees. Submissions/destructive actions not executed. src/app/app.routes.ts:611 | P2 |
| F085 | notifications | /notifications — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /notifications; receptionist: LOADED → /notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:617 | P2 |
| F086 | notifications | /notifications/events — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /notifications/events; receptionist: LOADED → /notifications/events. Submissions/destructive actions not executed. src/app/app.routes.ts:624 | P2 |
| F087 | reports | /reports — route/read experience | NEEDS IMPROVEMENT | Fresh production-preview: admin: LOADED → /reports. Submissions/destructive actions not executed. src/app/app.routes.ts:630 | P2 |
| F088 | auth | /auth/change-password — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /auth/change-password. Submissions/destructive actions not executed. src/app/app.routes.ts:636 | P2 |
| F089 | fees | /fees/discounts — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /fees/discounts; receptionist: LOADED → /fees/discounts. Submissions/destructive actions not executed. src/app/app.routes.ts:642 | P2 |
| F090 | fees | /fees/late-fees — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /fees/late-fees; receptionist: LOADED → /fees/late-fees. Submissions/destructive actions not executed. src/app/app.routes.ts:647 | P2 |
| F091 | fees | /fees/pending — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /fees/pending; receptionist: LOADED → /fees/pending. Submissions/destructive actions not executed. src/app/app.routes.ts:652 | P2 |
| F092 | fees | /fees/summary — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /fees/summary; receptionist: LOADED → /fees/summary. Submissions/destructive actions not executed. src/app/app.routes.ts:657 | P2 |
| F093 | payments | /payments — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /payments; receptionist: LOADED → /payments. Submissions/destructive actions not executed. src/app/app.routes.ts:663 | P2 |
| F094 | payments | /payments/new — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /payments/new; receptionist: LOADED → /payments/new. Submissions/destructive actions not executed. src/app/app.routes.ts:671 | P2 |
| F095 | payments | /payments/partial — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /payments/partial; receptionist: LOADED → /payments/partial. Submissions/destructive actions not executed. src/app/app.routes.ts:679 | P2 |
| F096 | payments | /payments/full — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /payments/full; receptionist: LOADED → /payments/full. Submissions/destructive actions not executed. src/app/app.routes.ts:687 | P2 |
| F097 | payments | /payments/receipts — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /payments/receipts; receptionist: LOADED → /payments/receipts. Submissions/destructive actions not executed. src/app/app.routes.ts:695 | P2 |
| F098 | payments | /payments/refunds — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /payments/refunds. Submissions/destructive actions not executed. src/app/app.routes.ts:700 | P2 |
| F099 | payments | /payments/history — route/read experience | NOT WORKING | I01: live history RPC returns400 Invalid payment view; list control returns200. Fresh browser/backend evidence. | P1 |
| F100 | notifications | /notifications/whatsapp — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /notifications/whatsapp; receptionist: LOADED → /notifications/whatsapp. Submissions/destructive actions not executed. src/app/app.routes.ts:719 | P2 |
| F101 | notifications | /notifications/templates — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /notifications/templates. Submissions/destructive actions not executed. src/app/app.routes.ts:724 | P2 |
| F102 | notifications | /notifications/failed — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /notifications/failed; receptionist: LOADED → /notifications/failed. Submissions/destructive actions not executed. src/app/app.routes.ts:730 | P2 |
| F103 | notifications | /notifications/delivery-status — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /notifications/delivery-status; receptionist: LOADED → /notifications/delivery-status. Submissions/destructive actions not executed. src/app/app.routes.ts:735 | P2 |
| F104 | reports | /reports/coach — route/read experience | NEEDS IMPROVEMENT | Fresh production-preview: admin: LOADED → /reports/coach. Submissions/destructive actions not executed. src/app/app.routes.ts:741 | P2 |
| F105 | reports | /reports/batch — route/read experience | NEEDS IMPROVEMENT | Fresh production-preview: admin: LOADED → /reports/batch. Submissions/destructive actions not executed. src/app/app.routes.ts:746 | P2 |
| F106 | settings | /settings — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings. Submissions/destructive actions not executed. src/app/app.routes.ts:752 | P2 |
| F107 | settings | /settings/users — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /settings/users. Submissions/destructive actions not executed. src/app/app.routes.ts:758 | P2 |
| F108 | settings | /settings/audit-logs — route/read experience | WORKING | Fresh production-preview: admin: LOADED → /settings/audit-logs. Submissions/destructive actions not executed. src/app/app.routes.ts:765 | P2 |
| F109 | settings | /settings/profile — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/profile. Submissions/destructive actions not executed. src/app/app.routes.ts:772 | P2 |
| F110 | settings | /settings/regional — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/regional. Submissions/destructive actions not executed. src/app/app.routes.ts:778 | P2 |
| F111 | settings | /settings/attendance — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/attendance. Submissions/destructive actions not executed. src/app/app.routes.ts:784 | P2 |
| F112 | settings | /settings/fees — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/fees. Submissions/destructive actions not executed. src/app/app.routes.ts:790 | P2 |
| F113 | settings | /settings/notifications — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:796 | P2 |
| F114 | settings | /settings/roles — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/roles. Submissions/destructive actions not executed. src/app/app.routes.ts:802 | P2 |
| F115 | settings | /settings/permissions — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/permissions. Submissions/destructive actions not executed. src/app/app.routes.ts:808 | P2 |
| F116 | settings | /settings/theme — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/theme. Submissions/destructive actions not executed. src/app/app.routes.ts:815 | P2 |
| F117 | settings | /settings/backup — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /settings/backup. Submissions/destructive actions not executed. src/app/app.routes.ts:822 | P2 |
| F118 | design | /design/:section/:view — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /design/foundations/colors. Submissions/destructive actions not executed. src/app/app.routes.ts:830 | P2 |
| F119 | handoff | /handoff/:view — route/read experience | PARTIALLY WORKING | Fresh production-preview: admin: LOADED → /handoff/overview. Submissions/destructive actions not executed. src/app/app.routes.ts:843 | P2 |
| F120 | Build | Production Angular build | WORKING | Fresh production build passed; build-2026-10-22.txt. Does not compile Deno edge entrypoint. | P3 |
| F121 | Testing | Full Angular unit-test command | WORKING | Full npm test -- --watch=false passed 104 files/433 tests. Former provider/spec-import blockers cleared; unit-2026-10-22.txt. | P1 |
| F122 | Testing | Isolated pure logic tests | WORKING | Utility suites execute within the fresh full passing suite; old isolated19-test result is not represented as a separate fresh run. | P3 |
| F123 | Authorization | Four-role sessions and sampled read boundaries | WORKING | Fresh four-role sessions, read-scope and negative-access probes. Write authorization not exercised. production-runtime-2026-10-22.json. | P2 |
| F124 | WhatsApp | Admin QR and bulk manual Click-to-Chat | PARTIALLY WORKING | Historical live admin/bulk attendance tests passed; current unit suite passes. Fresh attendance writes/external sends not run under audit-only restriction. | P2 |
| F125 | WhatsApp | Receptionist complete E2E assertion | PARTIALLY WORKING | Historical receptionist E2E race read checkout prematurely; later response/read succeeded. No current live rerun; historical trace is not a current whole-flow pass. | P2 |
| F126 | WhatsApp | Message sent or delivered confirmation | NOT VERIFIED | URL opening does not establish sending or delivery. No recipient receipt available. | P2 |
| F127 | Notifications | Local edge-provider deployability | PARTIALLY WORKING | Provider syntax repaired and mocked tests pass. Live configuration read succeeds. Deno entrypoint/deployment/actual delivery unverified; Deno executable unavailable. | P1 |
| F128 | Attendance | Business-date consistency | NOT WORKING | I05: workspace/message use India date; identifyQr still UTC at repository.ts:154. Static mismatch; no live midnight write. | P2 |
| F129 | Parents | Consent/status preservation on edit | NOT WORKING | I04: parent status/address now preserved, but preferences replacement at parent-form-page.ts:102 drops whatsapp:false. Static confirmed; live save not run. | P2 |
| F130 | Offline | Queue identity and replay | PARTIALLY WORKING | I06: persisted operations have no account namespace; cross-account replay scenario untested. | P2 |
| F131 | Attendance | Database checkout preconditions | PARTIALLY WORKING | I07: local staff SQL lacks open-check-in guard present in coach SQL; live mutation not run. | P2 |
| F132 | Architecture | Component decomposition | NEEDS IMPROVEMENT | 69 OnPush components,17 inline templates; coach1125/report723 lines; 21 component specs contain only one creation check. | P3 |
| F133 | Testing | Colocated component spec presence and execution | WORKING | All 69 production components have specs;104 total spec files pass. This proves presence/execution, not exhaustive behavioral coverage. | P2 |
| F134 | Tooling | Configured project lint command | NOT WORKING | I11: npm run lint exists but fails: Cannot find lint target for the specified project. angular.json lacks target; lint-2026-10-22.txt. | P2 |
| F135 | Auth | UI login/logout audit logs, recovery email, reset, OTP and password change | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F136 | Students | Create/edit/delete and document/photo persistence | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F137 | Parents | Create/link/unlink/delete and primary-parent persistence | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F138 | Coaches | Create/edit/delete and assignment writes | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F139 | Batches | Create/edit/delete, waitlist and schedule writes | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F140 | Enrollments | Create/transfer/pause/cancel/fee-plan writes | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F141 | Attendance | Corrections, offline retry/discard and coach writes | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F142 | Fees | Generate charges, discounts, late fees and fee-plan writes | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F143 | Payments | Record/allocate/refund and receipt generation | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F144 | Notifications | Compose/send/retry, templates and events writes | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F145 | Settings | User/role/permission and preference writes | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F146 | Storage | Upload/delete/download and storage write-policy lifecycle | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F147 | Backup | Restore drill and external retention | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F148 | PWA | Production install/update and cross-account offline replay | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F149 | Exports | Every-module CSV/PDF completeness and parity | NOT VERIFIED | Not executed end to end under audit-only restriction; code/test existence is not a current pass. | P2 |
| F150 | Attendance | Large-roster selection | NEEDS IMPROVEMENT | I08: first 500-row workspace page consumed without continuation; current small data does not exercise limit. | P2 |
| F151 | WhatsApp | Settings test recipient | NEEDS IMPROVEMENT | I09: settings uses contactPhone but falls back to9130451715; constructs check-in link while generic test-message variables are unused. Actual attendance remains relationship-driven. | P3 |
| F152 | Accessibility | Representative dashboard accessibility | NEEDS IMPROVEMENT | I10: current dashboard axe violations, detailed below; manual/all-route accessibility incomplete. | P2 |

## Backend relationships and security

| Role | Students | Parents | Batches | Payments | Admin API status | Scope predicate |
| --- | --- | --- | --- | --- | --- | --- |
| admin | 22 | 24 | 7 | 45 | 200 | "Staff; detailed counts in evidence" |
| receptionist | 22 | 24 | 7 | 45 | 403 | "Staff; detailed counts in evidence" |
| coach | 16 | 6 | 3 | 0 | 403 | {"assignedBatches":3,"visible":16,"withinAssignments":true,"errors":[]} |
| parent | 1 | 1 | 1 | 4 | 403 | {"visible":1,"withinLinks":true,"errors":[]} |

Existing student_parents links families; enrollments link students/batches/fee plans; batch_coaches scopes coaches; attendance links student/batch/day; charges/payments/receipts hold finances. Repository schema has foreign keys, status types, open-enrollment uniqueness, attendance uniqueness and chronological checks. Checkout constraint permits null checkin (I07). Parent save/link are separate client operations; primary-parent ambiguity/atomicity need isolated tests, not claims of corrupt live data.

RLS and guarded RPC source reviewed, including empty search_path on key SECURITY DEFINER helpers. Indexes cover parent phone, coach assignment, enrollment batch/status, attendance date/batch, charge month/due status, payments paid date and notification schedule/status (core schema lines381–390). Index presence does not establish query-plan efficiency. Deployed-schema diff, EXPLAIN/load tests, concurrency, write-side RLS attacks, storage mutation and restore are not verified. Anonymous and scoped role results are in evidence.

## Findings register

| ID | Module | Problem | Evidence | Cause / risk | Recommendation | Priority | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I01 | Payments | History rejects valid route | Live confirmed | history excluded from allowed views | Support/map history consistently and test both roles | P1 | src/app/app.routes.ts:713; src/app/core/supabase/domain-services.ts:1172; supabase/migrations/202610140005_payment_columns.sql:20 |
| I04 | Parents | Edit drops opt-out | Static confirmed; no live save | Preferences reconstructed with channel only | Merge stored flags; preserve explicit consent | P2 | src/app/features/parents/parent-form-page.ts:102; src/app/core/api/supabase-attendance.repository.ts:69 |
| I05 | Attendance | QR day differs from workspace/server | Static confirmed; no midnight write | QR UTC versus India frontend and academy-timezone SQL | Share academy business-date resolution | P2 | src/app/core/api/supabase-attendance.repository.ts:58,78,154; supabase/migrations/202609240004_operational_settings.sql |
| I06 | Offline/auth | Operations lack account ownership | Static risk; no exploit attempted | Shared actorless storage replayed under current session | Partition queues by authenticated subject and validate replay | P2 | src/app/core/offline/attendance-outbox.storage.ts:4; attendance-outbox.service.ts:92,94; src/app/core/auth/auth.service.ts:121 |
| I07 | Attendance | Staff checkout lacks open-check-in guard | Static local SQL; deployed mutation unverified | Staff SQL permits null checkin, coach RPC rejects it | Enforce state preconditions transactionally | P2 | supabase/migrations/202609040002_security_and_workflows.sql:206; 202609050015_coach_portal_security.sql:130 |
| I08 | Roster/reports | Large-data bounds | Static; load impact unmeasured | First 500 roster only; report UI slices materialized rows | Server-page/search interactive data; separate full exports | P2 | src/app/core/api/supabase-attendance.repository.ts:78; src/app/features/reports/reports-page.ts:203 |
| I09 | WhatsApp settings | Test-recipient/message semantics | Static; no send | contactPhone fallback9130451715; creates attendance check-in link | Explicit recipient and test message, no arbitrary fallback | P3 | src/app/features/settings/academy-settings-page.ts:84 |
| I11 | Tooling | Lint command fails | Fresh command confirmed | ng lint without architect.lint target | Configure compatible builder/rules and rerun | P2 | package.json:scripts.lint; angular.json:architect |
| I10 | Accessibility | Dashboard rule violations | Fresh axe runtime | Current contrast/keyboard findings in evidence | Fix identified nodes and manually verify | P2 | production-runtime-2026-10-22.json:accessibility |

## Evidence and reports

[Inventory](inventory-2026-10-22.json), [current catalogue](feature-catalogue-2026-10-22.json), [production browser/backend evidence](production-runtime-2026-10-22.json), [build](build-2026-10-22.txt), [units](unit-2026-10-22.txt), [lint](lint-2026-10-22.txt), [resume integrity](resume-integrity-2026-10-22.json).

[Working](WORKING-FEATURES.md) · [Not working](NOT-WORKING-FEATURES.md) · [Partial](PARTIALLY-WORKING-FEATURES.md) · [Missing](MISSING-FEATURES.md) · [Improvements](IMPROVEMENT-RECOMMENDATIONS.md) · [Components/tables](COMPONENT-AND-TABLE-AUDIT.md) · [Fix plan](PRIORITY-FIX-PLAN.md) · [Not verified](NOT-VERIFIED-FEATURES.md). [Redirect and user-list rechecks](redirect-and-users-recheck-2026-10-22.json) wait for the intentional 1200ms role redirect and capture user-list edge requests (the main tracer captured REST only). Previous reports retained in previous-audit/.

## Screenshots and final integrity

[Admin dashboard](production-2026-10-22-admin.png) ? [Receptionist dashboard](production-2026-10-22-receptionist.png) ? [Coach dashboard](production-2026-10-22-coach.png) ? [Parent dashboard](production-2026-10-22-parent.png).

[Final source hash comparison](final-integrity-2026-10-22.json) found no changes against the audited source snapshot. [Isolated preview build log](preview-build-2026-10-22.txt) confirms the rebuild after shared output disappeared.

Primary counts describe explicitly scoped capabilities, not a pass percentage for all possible interactions. The 93 PARTIALLY WORKING entries predominantly mean rendering is verified while state-changing workflows remain outside this read-only audit.
