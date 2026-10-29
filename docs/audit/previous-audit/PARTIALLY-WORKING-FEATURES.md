# Partial and unverified workflows

Audit date: 21 October 2026. **Audit only: no fixes or business-data changes during the audit.** Prior authorized attendance E2E evidence is identified separately.

| ID | Module | Capability | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F001 | auth | /auth/splash ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:36; ./features/auth/auth-splash-page | P2 |
| F003 | auth | /auth/login ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:41; ./features/auth/login-page | P2 |
| F004 | unauthorized | /unauthorized ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:46; ./features/auth/unauthorized-page | P2 |
| F005 | auth | /auth/forgot-password ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:52; ./features/auth/auth-utility-page | P2 |
| F006 | auth | /auth/reset-password ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:60; ./features/auth/auth-utility-page | P2 |
| F007 | auth | /auth/otp ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:69; ./features/auth/auth-utility-page | P2 |
| F008 | auth | /auth/session-expired ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:78; ./features/auth/auth-utility-page | P2 |
| F009 | auth | /auth/password-updated ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:86; ./features/auth/auth-utility-page | P2 |
| F015 | coach | /coach/batches ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:144; ./features/coach/coach-portal-page | P2 |
| F016 | coach | /coach/batches/:batchId ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:150; ./features/coach/coach-portal-page | P2 |
| F017 | coach | /coach/students ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:156; ./features/coach/coach-portal-page | P2 |
| F018 | coach | /coach/students/:studentId ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:162; ./features/coach/coach-portal-page | P2 |
| F019 | coach | /coach/attendance ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:168; ./features/coach/coach-portal-page | P2 |
| F020 | coach | /coach/attendance/qr ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:174; ./features/coach/coach-portal-page | P2 |
| F021 | coach | /coach/attendance/check-in ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:180; ./features/coach/coach-portal-page | P2 |
| F022 | coach | /coach/attendance/check-out ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:186; ./features/coach/coach-portal-page | P2 |
| F023 | coach | /coach/attendance/history ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:192; ./features/coach/coach-portal-page | P2 |
| F024 | coach | /coach/attendance/correction ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:198; ./features/coach/coach-portal-page | P2 |
| F025 | coach | /coach/attendance/summary ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:204; ./features/coach/coach-portal-page | P2 |
| F026 | coach | /coach/schedule ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:210; ./features/coach/coach-portal-page | P2 |
| F027 | coach | /coach/notifications ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:216; ./features/coach/coach-portal-page | P2 |
| F028 | coach | /coach/profile ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:222; ./features/coach/coach-portal-page | P2 |
| F029 | coach | /coach/support ? route/read experience | Rendered for coach. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:228; ./features/coach/coach-portal-page | P2 |
| F031 | dashboard | /dashboard/coach ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:243; ./features/dashboard/dashboard-page | P2 |
| F034 | parent | /parent/children/:id/edit ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:267; ./features/students/student-form-page | P2 |
| F035 | parent | /parent/children/:id ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:275; ./features/parents/parent-child-profile-page | P2 |
| F036 | parent | /parent/children ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:285; ./features/parents/parent-portal-page | P2 |
| F037 | parent | /parent/attendance ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:291; ./features/parents/parent-portal-page | P2 |
| F038 | parent | /parent/attendance/calendar ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:297; ./features/parents/parent-portal-page | P2 |
| F039 | parent | /parent/schedule ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:303; ./features/parents/parent-portal-page | P2 |
| F040 | parent | /parent/coach ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:309; ./features/parents/parent-portal-page | P2 |
| F041 | parent | /parent/fees ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:315; ./features/parents/parent-portal-page | P2 |
| F042 | parent | /parent/payments ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:321; ./features/parents/parent-portal-page | P2 |
| F043 | parent | /parent/receipts ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:327; ./features/parents/parent-portal-page | P2 |
| F044 | parent | /parent/notifications ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:333; ./features/parents/parent-portal-page | P2 |
| F045 | parent | /parent/profile ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:339; ./features/parents/parent-portal-page | P2 |
| F046 | parent | /parent/profile/edit ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:345; ./features/parents/parent-profile-form-page | P2 |
| F047 | parent | /parent/support ? route/read experience | Rendered for parent. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:355; ./features/parents/parent-portal-page | P2 |
| F048 | dashboard | /dashboard ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:361; ./features/dashboard/dashboard-page | P2 |
| F049 | search | /search ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:370; ./features/system/search-page | P2 |
| F050 | students | /students/add ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:376; ./features/students/student-form-page | P2 |
| F051 | students | /students/:id/edit ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:384; ./features/students/student-form-page | P2 |
| F052 | students | /students/:id ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:392; ./features/students/student-details-page | P2 |
| F054 | parents | /parents/add ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:408; ./features/parents/parent-form-page | P2 |
| F055 | parents | /parents/:id/edit ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. I04: payload drops opt-out and resets status (static). src/app/app.routes.ts:415; ./features/parents/parent-form-page | P2 |
| F056 | parents | /parents/:id ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:422; ./features/parents/parent-details-page | P2 |
| F058 | batches | /batches/student-allocation ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:435; ./features/batches/batches-page | P2 |
| F059 | batches | /batches/coach-assignment ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:441; ./features/batches/batches-page | P2 |
| F060 | batches | /batches/schedule ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:447; ./features/batches/batches-page | P2 |
| F061 | batches | /batches/capacity ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:453; ./features/batches/batches-page | P2 |
| F063 | coaches | /coaches/add ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:465; ./features/coaches/coach-form-page | P2 |
| F064 | coaches | /coaches/:id/edit ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:472; ./features/coaches/coach-form-page | P2 |
| F065 | coaches | /coaches/:id ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:479; ./features/coaches/coach-details-page | P2 |
| F068 | enrollments | /enrollments/new ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:500; ./features/enrollments/enrollments-page | P2 |
| F069 | enrollments | /enrollments/transfer ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:507; ./features/enrollments/enrollments-page | P2 |
| F070 | enrollments | /enrollments/pause ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:514; ./features/enrollments/enrollments-page | P2 |
| F071 | enrollments | /enrollments/cancel ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:521; ./features/enrollments/enrollments-page | P2 |
| F072 | enrollments | /enrollments/fee-plans ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:528; ./features/fees/fee-plans-page | P2 |
| F073 | enrollments | /enrollments/history ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:534; ./features/enrollments/enrollments-page | P2 |
| F074 | attendance | /attendance ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:541; ./features/attendance/attendance-page | P2 |
| F075 | attendance | /attendance/check-in-out ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:548; ./features/attendance/qr-attendance-page | P2 |
| F079 | attendance | /attendance/correction ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:570; ./features/attendance/attendance-correction-page | P2 |
| F081 | attendance | /attendance/calendar ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:588; ./features/attendance/attendance-calendar-page | P2 |
| F082 | attendance | /attendance/offline-queue ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:597; ./features/attendance/offline-queue-page | P2 |
| F086 | notifications | /notifications/events ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:623; ./features/notifications/academy-events-page | P2 |
| F088 | auth | /auth/change-password ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:635; ./features/auth/auth-utility-page | P2 |
| F089 | fees | /fees/discounts ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:641; ./features/fees/fee-operations-page | P2 |
| F090 | fees | /fees/late-fees ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:646; ./features/fees/fee-operations-page | P2 |
| F091 | fees | /fees/pending ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:651; ./features/fees/fee-operations-page | P2 |
| F092 | fees | /fees/summary ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:656; ./features/fees/fee-operations-page | P2 |
| F094 | payments | /payments/new ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:670; ./features/payments/payments-page | P2 |
| F095 | payments | /payments/partial ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:678; ./features/payments/payments-page | P2 |
| F096 | payments | /payments/full ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:686; ./features/payments/payments-page | P2 |
| F097 | payments | /payments/receipts ? route/read experience | Rendered for receptionist, admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:694; ./features/payments/payments-page | P2 |
| F098 | payments | /payments/refunds ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:699; ./features/payments/payments-page | P2 |
| F101 | notifications | /notifications/templates ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:723; ./features/notifications/notification-templates-page | P2 |
| F106 | settings | /settings ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:751; ./features/settings/academy-settings-page | P2 |
| F109 | settings | /settings/profile ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:771; ./features/settings/academy-settings-page | P2 |
| F110 | settings | /settings/regional ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:777; ./features/settings/academy-settings-page | P2 |
| F111 | settings | /settings/attendance ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:783; ./features/settings/academy-settings-page | P2 |
| F112 | settings | /settings/fees ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:789; ./features/settings/academy-settings-page | P2 |
| F113 | settings | /settings/notifications ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:795; ./features/settings/academy-settings-page | P2 |
| F114 | settings | /settings/roles ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:801; ./features/settings/users-page | P2 |
| F115 | settings | /settings/permissions ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:807; ./features/settings/settings-tools-page | P2 |
| F116 | settings | /settings/theme ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:814; ./features/settings/settings-tools-page | P2 |
| F117 | settings | /settings/backup ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:821; ./features/settings/settings-tools-page | P2 |
| F118 | design | /design/:section/:view ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:829; ./features/system/design-system-page | P2 |
| F119 | handoff | /handoff/:view ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. src/app/app.routes.ts:842; ./features/system/developer-handoff-page | P2 |
| F125 | WhatsApp | Receptionist complete E2E assertion | I03: assertion races checkout. Trace confirms later successful save; corrected test not rerun. | P2 |
| F130 | Offline | Queue identity and replay | I06: persisted operations have no account namespace; cross-account replay scenario untested. | P2 |
| F131 | Attendance | Database checkout preconditions | I07: local staff SQL lacks open-check-in guard present in coach SQL; live mutation not run. | P2 |

## Partial findings

| ID | Module | Problem | Evidence | Root cause / risk | Recommendation | Priority | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I03 | Testing | Receptionist checkout assertion races save | Trace confirmed | Waits for parent name already present in prior preview; reads null timestamp before RPC completes | Await checkout response and event-specific preview, then non-null timestamp | P2 | e2e/live-whatsapp-click-to-chat.spec.ts:94; whatsapp-failed-trace-analysis.json |
| I06 | Offline/auth | Queue ownership risk | Static risk; no exploit attempted | Shared IndexedDB, actorless operations, replay on load; logout does not partition queue | Namespace by authenticated subject and validate ownership before replay | P2 | src/app/core/offline/attendance-outbox.storage.ts:4; attendance-outbox.service.ts:22,92,94; src/app/core/auth/auth.service.ts:121 |
| I07 | Attendance | Staff checkout lacks open-checkin guard | Static local SQL; deployed mutation unverified | Updates checkout even when checkin null; coach RPC guards this | Enforce transactional state precondition and repeat-request behavior | P2 | supabase/migrations/202609040002_security_and_workflows.sql:206; 202609050015_coach_portal_security.sql:130 |

**I03 trace:** Read at11:05:16.475Z had null checkout. RPC at11:05:17.088Z returned200 with checkout11:05:17.077937Z; later read confirms persistence. Test synchronized on stale parent name and formatted null as epoch time. This is a test race, not demonstrated failure to save. Corrected test was not rerun because audit prohibits new data mutations.

**I06 future scenario:** Queue offline as A, sign out, sign in as B, reconnect; require queue ownership remains A. Current RLS read passes do not certify replay identity. No exploit attempted.

**I07 future scenario:** In isolated transactional fixture, attempt staff checkout on absent row with null checkin. Local SQL lacks coach RPC precondition. Verify deployed parity before claiming a live failure.

## Explicitly not verified

| ID | Module | Capability | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F002 | login | /login ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:40; redirect auth/login | P2 |
| F010 | redirect | /redirect/admin ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:95; ./features/auth/role-redirect-page | P2 |
| F011 | redirect | /redirect/coach ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:101; ./features/auth/role-redirect-page | P2 |
| F012 | redirect | /redirect/reception ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:107; ./features/auth/role-redirect-page | P2 |
| F013 | redirect | /redirect/parent ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:118; ./features/auth/role-redirect-page | P2 |
| F076 | attendance | /attendance/manual-check-in ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:555; redirect attendance/check-in-out | P2 |
| F077 | attendance | /attendance/manual-check-out ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:560; redirect attendance/check-in-out | P2 |
| F078 | attendance | /attendance/qr ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:565; redirect attendance/check-in-out | P2 |
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

Rendering, handler existence and existing test files do not prove submission/persistence works. Recovery, real camera permissions, uploads, mutation authorization, financial reconciliation, complete export parity, restore and offline account switching require separate validation.
