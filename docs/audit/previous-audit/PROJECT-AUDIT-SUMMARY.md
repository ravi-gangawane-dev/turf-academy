# Project audit summary

Audit date: 21 October 2026. **Audit only: no fixes or business-data changes during the audit.** Prior authorized attendance E2E evidence is identified separately.

## Scope and counting

The catalogue counts 119 named route experiences (including aliases) plus 33 command/cross-cutting capabilities, each with exactly one primary status. Issue IDs do not add to totals. WORKING list entries certify only their explicitly scoped read capability; mutations are separate. Route rendering alone is PARTIALLY WORKING. NOT VERIFIED does not mean absent or broken. Counts are not a percentage of all possible behaviors.

Checks used the existing live development server on port 4202 and live Supabase reads with admin, receptionist, coach and parent accounts. Sessions were seeded to avoid application login audit writes; authentication session lifecycle was necessary. Fresh contexts avoided stored offline operations. Business-write guards saw no business writes. CRUD, corrections, refunds, uploads, password recovery and external delivery were not executed in this audit. Earlier authorized E2E attendance writes and cleanup finished before the audit-only switch. Local migrations do not prove deployed SQL parity. No code/schema/business-data fixes were made.

## Health counts

| Primary status | Count |
| --- | --- |
| WORKING | 19 |
| NOT WORKING | 5 |
| PARTIALLY WORKING | 91 |
| MISSING | 2 |
| NEEDS IMPROVEMENT | 11 |
| NOT VERIFIED | 24 |
| TOTAL FEATURES AUDITED | 152 |

No confirmed P0 finding. P1 findings are live Payment History failure and malformed local provider code blocking the unit pipeline and edge-source deployability.

## Verification

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Angular build | PASS | build-output.txt; initial 302.56 kB, estimated transfer 64.86 kB. |
| Full unit suite | FAIL / blocked before tests | Malformed providers.ts; exclusion also fails; unit-tests-excluding-provider-output.txt. |
| Isolated suites | 19 PASS, 6 files | Timestamp, mutation-attempt, data-error, latest-query, parent-fee summary and calendar export; pure-unit-output.txt. |
| Lint | NOT RUN | No configured script. |
| Route sweep | 166 observations | 146 initial LOADED,12 REVIEW,8 expected denials; observations are not feature passes. |
| Session-isolated rechecks | 10 PASS | Initial notification/settings 401s from competing global signout cleared; not retained as product defects. |
| Payment History | FAIL for two roles | HTTP400 P0001 Invalid payment view; failed-endpoint-rechecks.json. |
| Tables | 12 probes + student recheck | table-runtime.json; student-table-recheck.json. Some generic selectors did not exercise filters. |
| RLS reads | Sampled predicates PASS | rls-read-probes.json; does not certify writes. |
| Responsive | No document overflow observed | 1440px/390px on visited pages; not every dialog/camera state. |
| Accessibility | Automated violations in four dashboards | accessibility-runtime.json; manual review still needed. |
| Prior live attendance E2E | 2 PASS / 1 FAIL | Admin and bulk pass; receptionist timing assertion fails, subsequent checkout persists. |
| WhatsApp delivery | UNCONFIRMED | Composed URL/open event is not send/delivery proof. |

## Module-wise catalogue

| ID | Module | Feature / scope | Status | Evidence | Priority |
| --- | --- | --- | --- | --- | --- |
| F001 | auth | /auth/splash ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:36; ./features/auth/auth-splash-page | P2 |
| F002 | login | /login ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:40; redirect auth/login | P2 |
| F003 | auth | /auth/login ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:41; ./features/auth/login-page | P2 |
| F004 | unauthorized | /unauthorized ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:46; ./features/auth/unauthorized-page | P2 |
| F005 | auth | /auth/forgot-password ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:52; ./features/auth/auth-utility-page | P2 |
| F006 | auth | /auth/reset-password ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:60; ./features/auth/auth-utility-page | P2 |
| F007 | auth | /auth/otp ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:69; ./features/auth/auth-utility-page | P2 |
| F008 | auth | /auth/session-expired ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:78; ./features/auth/auth-utility-page | P2 |
| F009 | auth | /auth/password-updated ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:86; ./features/auth/auth-utility-page | P2 |
| F010 | redirect | /redirect/admin ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:95; ./features/auth/role-redirect-page | P2 |
| F011 | redirect | /redirect/coach ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:101; ./features/auth/role-redirect-page | P2 |
| F012 | redirect | /redirect/reception ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:107; ./features/auth/role-redirect-page | P2 |
| F013 | redirect | /redirect/parent ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:118; ./features/auth/role-redirect-page | P2 |
| F014 | coach | /coach/dashboard ? route/read experience | NEEDS IMPROVEMENT | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:138; ./features/coach/coach-portal-page | P2 |
| F015 | coach | /coach/batches ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:144; ./features/coach/coach-portal-page | P2 |
| F016 | coach | /coach/batches/:batchId ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:150; ./features/coach/coach-portal-page | P2 |
| F017 | coach | /coach/students ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:156; ./features/coach/coach-portal-page | P2 |
| F018 | coach | /coach/students/:studentId ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:162; ./features/coach/coach-portal-page | P2 |
| F019 | coach | /coach/attendance ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:168; ./features/coach/coach-portal-page | P2 |
| F020 | coach | /coach/attendance/qr ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:174; ./features/coach/coach-portal-page | P2 |
| F021 | coach | /coach/attendance/check-in ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:180; ./features/coach/coach-portal-page | P2 |
| F022 | coach | /coach/attendance/check-out ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:186; ./features/coach/coach-portal-page | P2 |
| F023 | coach | /coach/attendance/history ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:192; ./features/coach/coach-portal-page | P2 |
| F024 | coach | /coach/attendance/correction ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:198; ./features/coach/coach-portal-page | P2 |
| F025 | coach | /coach/attendance/summary ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:204; ./features/coach/coach-portal-page | P2 |
| F026 | coach | /coach/schedule ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:210; ./features/coach/coach-portal-page | P2 |
| F027 | coach | /coach/notifications ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:216; ./features/coach/coach-portal-page | P2 |
| F028 | coach | /coach/profile ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:222; ./features/coach/coach-portal-page | P2 |
| F029 | coach | /coach/support ? route/read experience | PARTIALLY WORKING | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:228; ./features/coach/coach-portal-page | P2 |
| F030 | dashboard | /dashboard/admin ? route/read experience | NEEDS IMPROVEMENT | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:235; ./features/dashboard/dashboard-page | P2 |
| F031 | dashboard | /dashboard/coach ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:243; ./features/dashboard/dashboard-page | P2 |
| F032 | dashboard | /dashboard/reception ? route/read experience | NEEDS IMPROVEMENT | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:251; ./features/dashboard/dashboard-page | P2 |
| F033 | parent | /parent/dashboard ? route/read experience | NEEDS IMPROVEMENT | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:259; ./features/parents/parent-dashboard-page | P2 |
| F034 | parent | /parent/children/:id/edit ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:267; ./features/students/student-form-page | P2 |
| F035 | parent | /parent/children/:id ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:275; ./features/parents/parent-child-profile-page | P2 |
| F036 | parent | /parent/children ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:285; ./features/parents/parent-portal-page | P2 |
| F037 | parent | /parent/attendance ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:291; ./features/parents/parent-portal-page | P2 |
| F038 | parent | /parent/attendance/calendar ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:297; ./features/parents/parent-portal-page | P2 |
| F039 | parent | /parent/schedule ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:303; ./features/parents/parent-portal-page | P2 |
| F040 | parent | /parent/coach ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:309; ./features/parents/parent-portal-page | P2 |
| F041 | parent | /parent/fees ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:315; ./features/parents/parent-portal-page | P2 |
| F042 | parent | /parent/payments ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:321; ./features/parents/parent-portal-page | P2 |
| F043 | parent | /parent/receipts ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:327; ./features/parents/parent-portal-page | P2 |
| F044 | parent | /parent/notifications ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:333; ./features/parents/parent-portal-page | P2 |
| F045 | parent | /parent/profile ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:339; ./features/parents/parent-portal-page | P2 |
| F046 | parent | /parent/profile/edit ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:345; ./features/parents/parent-profile-form-page | P2 |
| F047 | parent | /parent/support ? route/read experience | PARTIALLY WORKING | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:355; ./features/parents/parent-portal-page | P2 |
| F048 | dashboard | /dashboard ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:361; ./features/dashboard/dashboard-page | P2 |
| F049 | search | /search ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:370; ./features/system/search-page | P2 |
| F050 | students | /students/add ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:376; ./features/students/student-form-page | P2 |
| F051 | students | /students/:id/edit ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:384; ./features/students/student-form-page | P2 |
| F052 | students | /students/:id ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:392; ./features/students/student-details-page | P2 |
| F053 | students | /students ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:400; ./features/students/students-page | P2 |
| F054 | parents | /parents/add ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:408; ./features/parents/parent-form-page | P2 |
| F055 | parents | /parents/:id/edit ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. I04: payload drops opt-out and resets status (static). src/app/app.routes.ts:415; ./features/parents/parent-form-page | P2 |
| F056 | parents | /parents/:id ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:422; ./features/parents/parent-details-page | P2 |
| F057 | parents | /parents ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:429; ./features/parents/parents-page | P2 |
| F058 | batches | /batches/student-allocation ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:435; ./features/batches/batches-page | P2 |
| F059 | batches | /batches/coach-assignment ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:441; ./features/batches/batches-page | P2 |
| F060 | batches | /batches/schedule ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:447; ./features/batches/batches-page | P2 |
| F061 | batches | /batches/capacity ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:453; ./features/batches/batches-page | P2 |
| F062 | batches | /batches ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:459; ./features/batches/batches-page | P2 |
| F063 | coaches | /coaches/add ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:465; ./features/coaches/coach-form-page | P2 |
| F064 | coaches | /coaches/:id/edit ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:472; ./features/coaches/coach-form-page | P2 |
| F065 | coaches | /coaches/:id ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:479; ./features/coaches/coach-details-page | P2 |
| F066 | coaches | /coaches ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:486; ./features/coaches/coaches-page | P2 |
| F067 | enrollments | /enrollments ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:493; ./features/enrollments/enrollments-page | P2 |
| F068 | enrollments | /enrollments/new ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:500; ./features/enrollments/enrollments-page | P2 |
| F069 | enrollments | /enrollments/transfer ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:507; ./features/enrollments/enrollments-page | P2 |
| F070 | enrollments | /enrollments/pause ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:514; ./features/enrollments/enrollments-page | P2 |
| F071 | enrollments | /enrollments/cancel ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:521; ./features/enrollments/enrollments-page | P2 |
| F072 | enrollments | /enrollments/fee-plans ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:528; ./features/fees/fee-plans-page | P2 |
| F073 | enrollments | /enrollments/history ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:534; ./features/enrollments/enrollments-page | P2 |
| F074 | attendance | /attendance ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:541; ./features/attendance/attendance-page | P2 |
| F075 | attendance | /attendance/check-in-out ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:548; ./features/attendance/qr-attendance-page | P2 |
| F076 | attendance | /attendance/manual-check-in ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:555; redirect attendance/check-in-out | P2 |
| F077 | attendance | /attendance/manual-check-out ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:560; redirect attendance/check-in-out | P2 |
| F078 | attendance | /attendance/qr ? route/read experience | NOT VERIFIED | Registered route; not independently exercised. src/app/app.routes.ts:565; redirect attendance/check-in-out | P2 |
| F079 | attendance | /attendance/correction ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:570; ./features/attendance/attendance-correction-page | P2 |
| F080 | attendance | /attendance/history ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:579; ./features/attendance/attendance-history-page | P2 |
| F081 | attendance | /attendance/calendar ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:588; ./features/attendance/attendance-calendar-page | P2 |
| F082 | attendance | /attendance/offline-queue ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:597; ./features/attendance/offline-queue-page | P2 |
| F083 | fees | /fees/plans ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:604; ./features/fees/fee-plans-page | P2 |
| F084 | fees | /fees ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:610; ./features/fees/fees-page | P2 |
| F085 | notifications | /notifications ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:616; ./features/notifications/notifications-page | P2 |
| F086 | notifications | /notifications/events ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:623; ./features/notifications/academy-events-page | P2 |
| F087 | reports | /reports ? route/read experience | NEEDS IMPROVEMENT | Rendered for admin. Submissions and exhaustive interactions not executed. I08: interactive display slices an in-memory dataset. src/app/app.routes.ts:629; ./features/reports/reports-page | P2 |
| F088 | auth | /auth/change-password ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:635; ./features/auth/auth-utility-page | P2 |
| F089 | fees | /fees/discounts ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:641; ./features/fees/fee-operations-page | P2 |
| F090 | fees | /fees/late-fees ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:646; ./features/fees/fee-operations-page | P2 |
| F091 | fees | /fees/pending ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:651; ./features/fees/fee-operations-page | P2 |
| F092 | fees | /fees/summary ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:656; ./features/fees/fee-operations-page | P2 |
| F093 | payments | /payments ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:662; ./features/payments/payments-page | P2 |
| F094 | payments | /payments/new ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:670; ./features/payments/payments-page | P2 |
| F095 | payments | /payments/partial ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:678; ./features/payments/payments-page | P2 |
| F096 | payments | /payments/full ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:686; ./features/payments/payments-page | P2 |
| F097 | payments | /payments/receipts ? route/read experience | PARTIALLY WORKING | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:694; ./features/payments/payments-page | P2 |
| F098 | payments | /payments/refunds ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:699; ./features/payments/payments-page | P2 |
| F099 | payments | /payments/history ? route/read experience | NOT WORKING | I01: HTTP400 Invalid payment view for admin and receptionist. src/app/app.routes.ts:709; ./features/payments/payments-page | P1 |
| F100 | notifications | /notifications/whatsapp ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:718; ./features/notifications/notifications-page | P2 |
| F101 | notifications | /notifications/templates ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:723; ./features/notifications/notification-templates-page | P2 |
| F102 | notifications | /notifications/failed ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:729; ./features/notifications/notifications-page | P2 |
| F103 | notifications | /notifications/delivery-status ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:734; ./features/notifications/notifications-page | P2 |
| F104 | reports | /reports/coach ? route/read experience | NEEDS IMPROVEMENT | Rendered for admin. Submissions and exhaustive interactions not executed. I08: interactive display slices an in-memory dataset. src/app/app.routes.ts:740; ./features/reports/reports-page | P2 |
| F105 | reports | /reports/batch ? route/read experience | NEEDS IMPROVEMENT | Rendered for admin. Submissions and exhaustive interactions not executed. I08: interactive display slices an in-memory dataset. src/app/app.routes.ts:745; ./features/reports/reports-page | P2 |
| F106 | settings | /settings ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:751; ./features/settings/academy-settings-page | P2 |
| F107 | settings | /settings/users ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:757; ./features/settings/users-page | P2 |
| F108 | settings | /settings/audit-logs ? route/read experience | WORKING | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:764; ./features/settings/audit-log-page | P2 |
| F109 | settings | /settings/profile ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:771; ./features/settings/academy-settings-page | P2 |
| F110 | settings | /settings/regional ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:777; ./features/settings/academy-settings-page | P2 |
| F111 | settings | /settings/attendance ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:783; ./features/settings/academy-settings-page | P2 |
| F112 | settings | /settings/fees ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:789; ./features/settings/academy-settings-page | P2 |
| F113 | settings | /settings/notifications ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:795; ./features/settings/academy-settings-page | P2 |
| F114 | settings | /settings/roles ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:801; ./features/settings/users-page | P2 |
| F115 | settings | /settings/permissions ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:807; ./features/settings/settings-tools-page | P2 |
| F116 | settings | /settings/theme ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:814; ./features/settings/settings-tools-page | P2 |
| F117 | settings | /settings/backup ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:821; ./features/settings/settings-tools-page | P2 |
| F118 | design | /design/:section/:view ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:829; ./features/system/design-system-page | P2 |
| F119 | handoff | /handoff/:view ? route/read experience | PARTIALLY WORKING | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:842; ./features/system/developer-handoff-page | P2 |
| F120 | Build | Production Angular build | WORKING | npm run build passed; build-output.txt. Edge functions are not in this build graph. | P3 |
| F121 | Testing | Full Angular unit-test command | NOT WORKING | I02: provider TypeScript parsing fails; zero tests execute, including exclusion attempt. | P1 |
| F122 | Testing | Isolated pure logic tests | WORKING | 19 tests in six files pass; pure-unit-output.txt. | P3 |
| F123 | Authorization | Four-role sessions and sampled read boundaries | WORKING | Four accounts authenticate, eight forbidden routes denied; anonymous reads empty, parent/coach scope predicates pass. | P2 |
| F124 | WhatsApp | Admin QR and bulk manual Click-to-Chat | WORKING | Prior authorized E2E: two cases pass including persisted times, relationship recipient and bulk invalid/missing/opt-out handling. | P2 |
| F125 | WhatsApp | Receptionist complete E2E assertion | PARTIALLY WORKING | I03: assertion races checkout. Trace confirms later successful save; corrected test not rerun. | P2 |
| F126 | WhatsApp | Message sent or delivered confirmation | NOT VERIFIED | URL opening does not establish sending or delivery. No recipient receipt available. | P2 |
| F127 | Notifications | Local edge-provider deployability | NOT WORKING | I02: invalid source expressions; local/deployed configuration drift. No deployment attempted. | P1 |
| F128 | Attendance | Business-date consistency | NOT WORKING | I05: static UTC/academy-date mismatch near midnight; live boundary mutation not run. | P2 |
| F129 | Parents | Consent/status preservation on edit | NOT WORKING | I04: static confirmed replacement payload drops whatsapp:false and forces active status. | P2 |
| F130 | Offline | Queue identity and replay | PARTIALLY WORKING | I06: persisted operations have no account namespace; cross-account replay scenario untested. | P2 |
| F131 | Attendance | Database checkout preconditions | PARTIALLY WORKING | I07: local staff SQL lacks open-check-in guard present in coach SQL; live mutation not run. | P2 |
| F132 | Architecture | Component decomposition | NEEDS IMPROVEMENT | 69 OnPush components; 17 inline templates; coach portal 1125 lines, reports 723. | P3 |
| F133 | Testing | Colocated spec for every component | MISSING | 43 of 69 components have no colocated spec, against requested audit standard; indirect coverage may exist. | P2 |
| F134 | Tooling | Configured project lint command | MISSING | package.json has no lint script; development-tooling gap. | P3 |
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
| F151 | WhatsApp | Settings test recipient | NEEDS IMPROVEMENT | I09: fixed Rahul/Sunil test fixture in settings; actual attendance resolver is dynamic. | P3 |
| F152 | Accessibility | Representative dashboard accessibility | NEEDS IMPROVEMENT | I10: automated keyboard-scroll and contrast violations; manual all-route accessibility unverified. | P2 |

## Backend and relationships

Existing student_parents links family records; enrollments link students/batches, coach assignments scope batches, attendance links student/batch/day, and fees/payments link financial data. No duplicate structures created. Parent probe sees only its linked student; coach sees 16 students across three assigned batches with no unexpected students. Anonymous sampled reads return zero; coach payment reads zero; nonadmin user administration returns403. Admin/reception sampled counts match. These are fixture read checks, not write-policy certification.

Repository migrations contain RLS, foreign keys, constrained statuses, attendance uniqueness and guarded RPCs. Deployed definitions/index usage, EXPLAIN/load tests, storage write policies, concurrent transaction behavior and disaster recovery remain unverified. Parent save and linking are separate client operations; failure atomicity and multiple-primary-parent handling require isolated tests.

## Findings

| ID | Module | Problem | Evidence | Root cause / risk | Recommendation | Priority | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I01 | Payments | History route fails | Live confirmed | history excluded from SQL view allowlist | Support/map history consistently and test both roles | P1 | src/app/features/payments/payments-page.ts:255; src/app/core/supabase/domain-services.ts:1172; supabase/migrations/202610140005_payment_columns.sql:20 |
| I02 | Notifications/testing | Invalid provider source blocks compilation | Compile confirmed | Literal ...(truncated) in interface and malformed request conditional; incomplete transport contract | Restore typed contract, run full and edge tests, compare deployed configuration | P1 | supabase/functions/notification-delivery/providers.ts:2,43; index.ts:5 |
| I03 | Testing | Receptionist checkout assertion races save | Trace confirmed | Waits for parent name already present in prior preview; reads null timestamp before RPC completes | Await checkout response and event-specific preview, then non-null timestamp | P2 | e2e/live-whatsapp-click-to-chat.spec.ts:94; whatsapp-failed-trace-analysis.json |
| I04 | Parents | Edit loses consent/status/metadata | Static confirmed; no live save | Replacement {channel} loses whatsapp:false, status forced active and address replaced | Merge existing metadata; explicitly map consent and preserve status | P2 | src/app/features/parents/parent-form-page.ts:96; src/app/core/api/supabase-attendance.repository.ts:69 |
| I05 | Attendance | Business dates disagree | Static confirmed; no live midnight write | UTC workspace/QR versus India notification and academy-timezone SQL | Share academy business date across reads, writes and previews | P2 | src/app/core/api/supabase-attendance.repository.ts:57,78,154; supabase/migrations/202609240004_operational_settings.sql |
| I06 | Offline/auth | Queue ownership risk | Static risk; no exploit attempted | Shared IndexedDB, actorless operations, replay on load; logout does not partition queue | Namespace by authenticated subject and validate ownership before replay | P2 | src/app/core/offline/attendance-outbox.storage.ts:4; attendance-outbox.service.ts:22,92,94; src/app/core/auth/auth.service.ts:121 |
| I07 | Attendance | Staff checkout lacks open-checkin guard | Static local SQL; deployed mutation unverified | Updates checkout even when checkin null; coach RPC guards this | Enforce transactional state precondition and repeat-request behavior | P2 | supabase/migrations/202609040002_security_and_workflows.sql:206; 202609050015_coach_portal_security.sql:130 |
| I08 | Lists/reports | Large-data limits | Static confirmed; load impact unmeasured | Workspace consumes 500 rows only; report UI slices full in-memory data | Page/search roster and interactive reports; keep explicit full exports | P2 | src/app/core/api/supabase-attendance.repository.ts:78; src/app/features/reports/reports-page.ts:203 |
| I09 | WhatsApp settings | Fixed test recipient | Static confirmed | Test-message helper hardcodes named parent/student/phone | Use selected/configurable test recipient | P3 | src/app/features/settings/academy-settings-page.ts:84 |
| I10 | Accessibility | Keyboard-scroll and contrast failures | Automated runtime | Nonfocusable chart scroll regions and insufficient text contrast | Fix identified nodes and verify keyboard/screen-reader behavior | P2 | dashboard-page.html; coach-portal-page.html; parent-dashboard-page.html; accessibility-runtime.json |

## Evidence

[Routes](runtime-routes.json), [session rechecks](session-isolated-rechecks.json), [endpoint rechecks](failed-endpoint-rechecks.json), [RLS reads](rls-read-probes.json), [tables](table-runtime.json), [student recheck](student-table-recheck.json), [accessibility](accessibility-runtime.json), [checkout trace](whatsapp-failed-trace-analysis.json), [inventory](inventory.json), [catalogue/counts](feature-catalogue.json), [build](build-output.txt), [blocked unit log](unit-tests-excluding-provider-output.txt), [pure tests](pure-unit-output.txt).

Screenshots: [admin](admin-dashboard-admin.png), [receptionist](receptionist-dashboard-reception.png), [coach](coach-coach-dashboard.png), [parent](parent-parent-dashboard.png). Initial notification/settings error screenshots are superseded by successful session-isolated rechecks.

## Reports

[Working](WORKING-FEATURES.md) ? [Not working](NOT-WORKING-FEATURES.md) ? [Partial](PARTIALLY-WORKING-FEATURES.md) ? [Missing](MISSING-FEATURES.md) ? [Improvements](IMPROVEMENT-RECOMMENDATIONS.md) ? [Components/tables](COMPONENT-AND-TABLE-AUDIT.md) ? [Fix plan](PRIORITY-FIX-PLAN.md)
