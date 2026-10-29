# Turf Cricket Academy — complete audit report

**Compiled:** 22 October 2026 (Asia/Kolkata). **Sources:** the 21 October read-only audit sweep, the
22 October unit-pipeline repair pass, and the 22 October test-isolation fix in this session.
Every table below is extracted mechanically from the per-status reports, so this file cannot drift
from [PROJECT-AUDIT-SUMMARY.md](PROJECT-AUDIT-SUMMARY.md),
[NOT-WORKING-FEATURES.md](NOT-WORKING-FEATURES.md) and [PRIORITY-FIX-PLAN.md](PRIORITY-FIX-PLAN.md).

## 1. How to read this report

- The catalogue counts **119 named route experiences** (including aliases) plus **33 command or
  cross-cutting capabilities** = **152 audited capabilities**. Each has exactly one primary status.
  Issue IDs (I01–I10) do not add to the total.
- `WORKING` certifies only the explicitly scoped **read** capability. Mutations are a separate
  capability and are not certified by a working read.
- **Route rendering alone is PARTIALLY WORKING.** A rendered screen with no exercised interaction is
  not a passing feature.
- `NOT VERIFIED` does **not** mean absent or broken. It means the behaviour was not executed
  end to end under the audit's read-only restriction.
- Counts are not a percentage of all possible behaviours.
- The 21 October sweep was read-only: no schema, deployed function or business data was changed.
  The 22 October passes changed the unit-test pipeline, the notification-provider source, two
  product defects those tests exposed, and two spec files.

## 2. Health counts

| Primary status | 21 Oct snapshot | After the 22 Oct passes |
| --- | --- | --- |
| WORKING | 19 | 20 (F121 unit-test pipeline cleared) |
| NOT WORKING | 5 | 4 (F121 cleared; F127 downgraded to source-cleared / parity unverified) |
| PARTIALLY WORKING | 91 | 91 |
| MISSING | 2 | 2 |
| NEEDS IMPROVEMENT | 11 | 11 |
| NOT VERIFIED | 24 | 24 |
| **TOTAL** | **152** | **152** |

**No confirmed P0 finding.** P1 items are the live Payment History failure (I01) and the
payment-view contract. This is not a security certification.

## 3. Verification log

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Angular production build | **PASS** | `npm run build` succeeds, no warnings or budget errors. build-output.txt; initial 302.56 kB, estimated transfer 64.86 kB. |
| Full unit suite (default) | **PASS** | 104 files, 433 tests, 0 failures. unit-suite-2026-10-22.txt and the 22 Oct re-run. |
| Full unit suite (single shared worker) | **PASS** | 104 files, 433 tests, 0 failures with every spec forced into one jsdom global — the worst case for state leakage. |
| Lint | NOT RUN | No configured script (F134). |
| Route sweep | 166 observations | 146 initial LOADED, 12 REVIEW, 8 expected denials; observations are not feature passes. runtime-routes.json. |
| Session-isolated rechecks | 10 PASS | Initial notification/settings 401s from a competing global signout cleared; not retained as product defects. |
| Payment History | **FAIL for two roles** | HTTP 400 P0001 Invalid payment view. failed-endpoint-rechecks.json; payment-recheck-2026-10-22.json. |
| Tables | 12 probes + student recheck | table-runtime.json; student-table-recheck.json. Some generic selectors did not exercise filters. |
| RLS reads | Sampled predicates PASS | rls-read-probes.json; does not certify writes. |
| Responsive | No document overflow observed | 1440px / 390px on visited pages; not every dialog or camera state. |
| Accessibility | Automated violations in four dashboards | accessibility-runtime.json; manual review still needed. |
| Prior live attendance E2E | 2 PASS / 1 FAIL | Admin and bulk pass; receptionist timing assertion races the save, subsequent checkout persists. |
| WhatsApp delivery | UNCONFIRMED | A composed URL and open event are not send/delivery proof. |

## 4. Complete capability catalogue (152 entries)

Long-form per-status evidence: [WORKING-FEATURES.md](WORKING-FEATURES.md),
[PARTIALLY-WORKING-FEATURES.md](PARTIALLY-WORKING-FEATURES.md),
[NOT-WORKING-FEATURES.md](NOT-WORKING-FEATURES.md),
[MISSING-FEATURES.md](MISSING-FEATURES.md),
[IMPROVEMENT-RECOMMENDATIONS.md](IMPROVEMENT-RECOMMENDATIONS.md).

| ID | Module | Capability | Primary status (21 Oct) | Status after 22 Oct pass | Priority |
| --- | --- | --- | --- | --- | --- |
| F001 | auth | /auth/splash ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F002 | login | /login ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F003 | auth | /auth/login ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F004 | unauthorized | /unauthorized ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F005 | auth | /auth/forgot-password ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F006 | auth | /auth/reset-password ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F007 | auth | /auth/otp ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F008 | auth | /auth/session-expired ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F009 | auth | /auth/password-updated ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F010 | redirect | /redirect/admin ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F011 | redirect | /redirect/coach ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F012 | redirect | /redirect/reception ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F013 | redirect | /redirect/parent ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F014 | coach | /coach/dashboard ? route/read experience | NEEDS IMPROVEMENT | unchanged | P2 |
| F015 | coach | /coach/batches ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F016 | coach | /coach/batches/:batchId ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F017 | coach | /coach/students ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F018 | coach | /coach/students/:studentId ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F019 | coach | /coach/attendance ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F020 | coach | /coach/attendance/qr ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F021 | coach | /coach/attendance/check-in ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F022 | coach | /coach/attendance/check-out ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F023 | coach | /coach/attendance/history ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F024 | coach | /coach/attendance/correction ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F025 | coach | /coach/attendance/summary ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F026 | coach | /coach/schedule ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F027 | coach | /coach/notifications ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F028 | coach | /coach/profile ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F029 | coach | /coach/support ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F030 | dashboard | /dashboard/admin ? route/read experience | NEEDS IMPROVEMENT | unchanged | P2 |
| F031 | dashboard | /dashboard/coach ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F032 | dashboard | /dashboard/reception ? route/read experience | NEEDS IMPROVEMENT | unchanged | P2 |
| F033 | parent | /parent/dashboard ? route/read experience | NEEDS IMPROVEMENT | unchanged | P2 |
| F034 | parent | /parent/children/:id/edit ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F035 | parent | /parent/children/:id ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F036 | parent | /parent/children ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F037 | parent | /parent/attendance ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F038 | parent | /parent/attendance/calendar ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F039 | parent | /parent/schedule ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F040 | parent | /parent/coach ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F041 | parent | /parent/fees ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F042 | parent | /parent/payments ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F043 | parent | /parent/receipts ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F044 | parent | /parent/notifications ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F045 | parent | /parent/profile ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F046 | parent | /parent/profile/edit ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F047 | parent | /parent/support ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F048 | dashboard | /dashboard ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F049 | search | /search ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F050 | students | /students/add ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F051 | students | /students/:id/edit ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F052 | students | /students/:id ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F053 | students | /students ? route/read experience | WORKING | unchanged | P2 |
| F054 | parents | /parents/add ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F055 | parents | /parents/:id/edit ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F056 | parents | /parents/:id ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F057 | parents | /parents ? route/read experience | WORKING | unchanged | P2 |
| F058 | batches | /batches/student-allocation ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F059 | batches | /batches/coach-assignment ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F060 | batches | /batches/schedule ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F061 | batches | /batches/capacity ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F062 | batches | /batches ? route/read experience | WORKING | unchanged | P2 |
| F063 | coaches | /coaches/add ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F064 | coaches | /coaches/:id/edit ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F065 | coaches | /coaches/:id ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F066 | coaches | /coaches ? route/read experience | WORKING | unchanged | P2 |
| F067 | enrollments | /enrollments ? route/read experience | WORKING | unchanged | P2 |
| F068 | enrollments | /enrollments/new ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F069 | enrollments | /enrollments/transfer ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F070 | enrollments | /enrollments/pause ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F071 | enrollments | /enrollments/cancel ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F072 | enrollments | /enrollments/fee-plans ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F073 | enrollments | /enrollments/history ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F074 | attendance | /attendance ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F075 | attendance | /attendance/check-in-out ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F076 | attendance | /attendance/manual-check-in ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F077 | attendance | /attendance/manual-check-out ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F078 | attendance | /attendance/qr ? route/read experience | NOT VERIFIED | unchanged | P2 |
| F079 | attendance | /attendance/correction ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F080 | attendance | /attendance/history ? route/read experience | WORKING | unchanged | P2 |
| F081 | attendance | /attendance/calendar ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F082 | attendance | /attendance/offline-queue ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F083 | fees | /fees/plans ? route/read experience | WORKING | unchanged | P2 |
| F084 | fees | /fees ? route/read experience | WORKING | unchanged | P2 |
| F085 | notifications | /notifications ? route/read experience | WORKING | unchanged | P2 |
| F086 | notifications | /notifications/events ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F087 | reports | /reports ? route/read experience | NEEDS IMPROVEMENT | unchanged | P2 |
| F088 | auth | /auth/change-password ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F089 | fees | /fees/discounts ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F090 | fees | /fees/late-fees ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F091 | fees | /fees/pending ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F092 | fees | /fees/summary ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F093 | payments | /payments ? route/read experience | WORKING | unchanged | P2 |
| F094 | payments | /payments/new ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F095 | payments | /payments/partial ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F096 | payments | /payments/full ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F097 | payments | /payments/receipts ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F098 | payments | /payments/refunds ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F099 | payments | /payments/history ? route/read experience | NOT WORKING | STILL NOT WORKING (P1) — live RPC recheck 22 Oct still HTTP 400 P0001 | P1 |
| F100 | notifications | /notifications/whatsapp ? route/read experience | WORKING | unchanged | P2 |
| F101 | notifications | /notifications/templates ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F102 | notifications | /notifications/failed ? route/read experience | WORKING | unchanged | P2 |
| F103 | notifications | /notifications/delivery-status ? route/read experience | WORKING | unchanged | P2 |
| F104 | reports | /reports/coach ? route/read experience | NEEDS IMPROVEMENT | unchanged | P2 |
| F105 | reports | /reports/batch ? route/read experience | NEEDS IMPROVEMENT | unchanged | P2 |
| F106 | settings | /settings ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F107 | settings | /settings/users ? route/read experience | WORKING | unchanged | P2 |
| F108 | settings | /settings/audit-logs ? route/read experience | WORKING | unchanged | P2 |
| F109 | settings | /settings/profile ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F110 | settings | /settings/regional ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F111 | settings | /settings/attendance ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F112 | settings | /settings/fees ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F113 | settings | /settings/notifications ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F114 | settings | /settings/roles ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F115 | settings | /settings/permissions ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F116 | settings | /settings/theme ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F117 | settings | /settings/backup ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F118 | design | /design/:section/:view ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F119 | handoff | /handoff/:view ? route/read experience | PARTIALLY WORKING | unchanged | P2 |
| F120 | Build | Production Angular build | WORKING | unchanged | P3 |
| F121 | Testing | Full Angular unit-test command | NOT WORKING | CLEARED — full suite compiles and runs: 104 files / 433 tests green | P1 |
| F122 | Testing | Isolated pure logic tests | WORKING | unchanged | P3 |
| F123 | Authorization | Four-role sessions and sampled read boundaries | WORKING | unchanged | P2 |
| F124 | WhatsApp | Admin QR and bulk manual Click-to-Chat | WORKING | unchanged | P2 |
| F125 | WhatsApp | Receptionist complete E2E assertion | PARTIALLY WORKING | unchanged | P2 |
| F126 | WhatsApp | Message sent or delivered confirmation | NOT VERIFIED | unchanged | P2 |
| F127 | Notifications | Local edge-provider deployability | NOT WORKING | SOURCE CLEARED (P2) — deploy parity still unverified | P1 |
| F128 | Attendance | Business-date consistency | NOT WORKING | STILL NOT WORKING (P2) — static UTC/Asia-Kolkata mismatch remains | P2 |
| F129 | Parents | Consent/status preservation on edit | NOT WORKING | STILL NOT WORKING (P2) — consent flags still dropped on edit | P2 |
| F130 | Offline | Queue identity and replay | PARTIALLY WORKING | unchanged | P2 |
| F131 | Attendance | Database checkout preconditions | PARTIALLY WORKING | unchanged | P2 |
| F132 | Architecture | Component decomposition | NEEDS IMPROVEMENT | unchanged | P3 |
| F133 | Testing | Colocated spec for every component | MISSING | unchanged | P2 |
| F134 | Tooling | Configured project lint command | MISSING | unchanged | P3 |
| F135 | Auth | UI login/logout audit logs, recovery email, reset, OTP and password change | NOT VERIFIED | unchanged | P2 |
| F136 | Students | Create/edit/delete and document/photo persistence | NOT VERIFIED | unchanged | P2 |
| F137 | Parents | Create/link/unlink/delete and primary-parent persistence | NOT VERIFIED | unchanged | P2 |
| F138 | Coaches | Create/edit/delete and assignment writes | NOT VERIFIED | unchanged | P2 |
| F139 | Batches | Create/edit/delete, waitlist and schedule writes | NOT VERIFIED | unchanged | P2 |
| F140 | Enrollments | Create/transfer/pause/cancel/fee-plan writes | NOT VERIFIED | unchanged | P2 |
| F141 | Attendance | Corrections, offline retry/discard and coach writes | NOT VERIFIED | unchanged | P2 |
| F142 | Fees | Generate charges, discounts, late fees and fee-plan writes | NOT VERIFIED | unchanged | P2 |
| F143 | Payments | Record/allocate/refund and receipt generation | NOT VERIFIED | unchanged | P2 |
| F144 | Notifications | Compose/send/retry, templates and events writes | NOT VERIFIED | unchanged | P2 |
| F145 | Settings | User/role/permission and preference writes | NOT VERIFIED | unchanged | P2 |
| F146 | Storage | Upload/delete/download and storage write-policy lifecycle | NOT VERIFIED | unchanged | P2 |
| F147 | Backup | Restore drill and external retention | NOT VERIFIED | unchanged | P2 |
| F148 | PWA | Production install/update and cross-account offline replay | NOT VERIFIED | unchanged | P2 |
| F149 | Exports | Every-module CSV/PDF completeness and parity | NOT VERIFIED | unchanged | P2 |
| F150 | Attendance | Large-roster selection | NEEDS IMPROVEMENT | unchanged | P2 |
| F151 | WhatsApp | Settings test recipient | NEEDS IMPROVEMENT | unchanged | P3 |
| F152 | Accessibility | Representative dashboard accessibility | NEEDS IMPROVEMENT | unchanged | P2 |

## 5. Findings and defects (I01–I10)

| ID | Module | Problem | Evidence | Root cause / risk | Recommendation | Priority |
| --- | --- | --- | --- | --- | --- | --- |
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

### Findings status after the 22 October passes

| ID | Status now | Note |
| --- | --- | --- |
| I01 | **Open, P1** | Live RPC recheck on 22 Oct: `p_view history` still returns HTTP 400 P0001 for admin and receptionist, while `list` returns 200 with five rows. |
| I02 | **Cleared** | Provider module is valid TypeScript again and is covered by 10 unit tests; nine invalid spec imports fixed. |
| I03 | Open, P2 | Receptionist checkout assertion still races the save. |
| I04 | Partly improved, P2 | Status and address are preserved; `communication_preferences` is still replaced with `{ channel }` and drops `whatsapp:false`. |
| I05 | Open, P2 | Workspace and notifications use Asia/Kolkata; `identifyQr` still derives the UTC date. |
| I06 | Open, P2 | Shared IndexedDB, actorless queued operations, replay on load. |
| I07 | Open, P2 | Staff checkout SQL still lacks the open-check-in guard the coach RPC has. |
| I08 | Open, P2 | Workspace consumes the first 500-row page; report views slice an in-memory dataset. |
| I09 | Open, P3 | Settings still hardcodes the Rahul/Sunil test recipient. |
| I10 | Open, P2 | Automated keyboard-scroll and contrast violations in four dashboards. |

## 6. Priority fix plan (13 items)

| Order | Task | Priority | Status | Affected files | Complexity | Dependencies / acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Repair History contract I01 | P1 | Open | payments-page.ts; domain-services.ts; payment RPC | Low?medium | Define history semantics; both roles filter/sort/page |
| 2 | Restore provider/full test pipeline I02 | P1 | **Done (22 Oct)** | notification-delivery/providers.ts,index.ts; provider spec; nine invalid spec imports; 26 expectation mismatches | Medium | Keep Click-to-Chat independent; edge compile and deployment comparison |
| 3 | Preserve parent consent/status I04 | P2 | Open | parent-form-page.ts | Low?medium | Isolated opted-out/inactive fixture |
| 4 | Unify business date I05 | P2 | Open | attendance repository/date helpers/RPC | Medium | Midnight and timezone tests |
| 5 | Bind offline queue identity I06 | P2 | Open | core/offline;auth;coach offline storage | Medium?high | Account-switch and retry/idempotency tests |
| 6 | Enforce checkout state I07 | P2 | Open | attendance_check_out SQL | Medium | Inspect deployed definition; isolated transactions |
| 7 | Fix receptionist E2E race I03 | P2 | Open | live-whatsapp-click-to-chat.spec.ts | Low | Await checkout; authorized fixture rerun and cleanup |
| 8 | Fix dashboard accessibility I10 | P2 | Open | dashboard/coach/parent templates/styles | Medium | Axe and manual keyboard/screen-reader |
| 9 | Page large data/reduce repeated requests I08 | P2 | Open | attendance/report/notification query flows | Medium?high | Large datasets; preserve explicit exports |
| 10 | Add focused component coverage | P2 | Open | 43 components in inventory | Incremental | Business invariants rather than implementation mirrors |
| 11 | Configure test recipient I09 | P3 | Open | academy-settings-page.ts | Low | Explicit selected recipient |
| 12 | Lint and component decomposition | P3 | Open | package.json;lint;coach/report views | Incremental | Installed Angular22/TypeScript6-compatible tooling |
| 13 | Complete write-side and recovery validation | P2 | Open | E2E suites;RLS/RPC/storage | High | Authorized isolated fixtures for CRUD/refunds/corrections/recovery/restore/exports/offline |

## 7. Change log for the 22 October passes

### 7.1 Unit-test pipeline repair (earlier today)

- The edge provider module became valid TypeScript again: `ProviderConfig` declares
  `whatsappMediaContentSid`, both `deliver()` branches assign `response`, and
  `deliveryStatus()` reads the provider payload.
  `src/app/core/supabase/notification-providers.spec.ts` imports that edge module directly, so it
  is type-checked and executed by the Angular test run.
- The nine spec files that imported missing modules or nonexistent exports now import the real
  exports and assert behaviour.
- The suite reached assertion level and exposed 26 genuine expectation mismatches. All 26 were
  resolved: 24 by correcting the expectation or the test harness, and 2 by fixing product behaviour
  the mismatches exposed — the CSV exporter dropped every column labelled "Action" even when it
  held data, and the notification-template list sorted descending when the caller passed no
  direction.

### 7.2 Cross-file test-isolation defect (this session)

**Symptom:** three `settings-tools-page.spec.ts` tests failed for some developers and passed for
others, depending on which spec files happened to share a worker:

- `exports every page and uses real composite keys for tables without an ID` —
  `SyntaxError: Unexpected non-whitespace character after JSON at position 6`
- `clears old success after failure, avoids partial downloads and allows retry` — expected 1 call, got 3
- `prevents overlapping exports while a request is pending` — expected 1 call, got 4

**Root cause:** the Angular unit-test builder runs Vitest with `isolate: false`, so every spec file
in a worker shares one jsdom global. `src/app/shared/data-table/table-tools.spec.ts` stubbed the
download helper with

```ts
vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
```

`Object.assign` mutates the shared global `URL` object **in place**; `vi.unstubAllGlobals()` only
removes the global binding and does not undo that mutation. `URL.createObjectURL` therefore stayed a
`vi.fn()` mock for the rest of the worker. `vi.spyOn(URL, 'createObjectURL')` in
`settings-tools-page.spec.ts` then returned that *same* mock (Vitest's `spyOn` returns the target
when it is already a mock function), so the spec inherited the leaked call history — and
`vi.restoreAllMocks()` does not clear it, because that only restores spies, not plain `vi.fn()`
mocks. The spec therefore read the leaked CSV blob `"Date","Action"` as if it were the JSON export,
and counted calls that belonged to another file.

**Fix (spec files only, no application code changed):**

- [../../src/app/shared/data-table/table-tools.spec.ts](../../src/app/shared/data-table/table-tools.spec.ts)
  — replaced the mutating `Object.assign` stub with `vi.spyOn(URL, 'createObjectURL' | 'revokeObjectURL')`
  and added `vi.restoreAllMocks()` to `afterEach` so no spy outlives the file.
- [../../src/app/features/settings/settings-tools-page.spec.ts](../../src/app/features/settings/settings-tools-page.spec.ts)
  — `download.mockClear()` after each spy, so the spec starts from a clean call history regardless
  of what ran before it in the same worker.

**Verification:**

| Run | Result |
| --- | --- |
| Forced order (table-tools before settings-tools, one shared worker), before the fix | 3 failed — identical errors and line numbers to the reported failure |
| Same forced order, after the fix | 2 files, 11 tests, all passed |
| Full suite, all 104 files forced into one shared worker | 104 files, 433 tests, all passed |
| Full suite, default `ng test` mode | 104 files, 433 tests, all passed |

**Durability note:** `isolate: false` is the builder default, so any spec that mutates a global
without restoring it can poison later files in the same worker. The remaining
`vi.stubGlobal('open', ...)` calls in `whatsapp-confirmation-dialog.spec.ts` restore inside the
test body, so a failing assertion there could still leak a stubbed `window.open`.

## 8. Release gate

Require, before release: a production build, the full unit suite, separate edge-function
validation, four-role read/write authorization checks, deterministic WhatsApp assertions with
cleanup evidence, and a live recheck of Payment History. Click-to-Chat acceptance remains "URL
composed and opened"; delivery stays unconfirmed unless separately observed.

## 9. Evidence index

[Routes](runtime-routes.json) · [session rechecks](session-isolated-rechecks.json) ·
[endpoint rechecks](failed-endpoint-rechecks.json) · [RLS reads](rls-read-probes.json) ·
[tables](table-runtime.json) · [student recheck](student-table-recheck.json) ·
[accessibility](accessibility-runtime.json) · [checkout trace](whatsapp-failed-trace-analysis.json) ·
[inventory](inventory.json) · [catalogue and counts](feature-catalogue.json) ·
[build](build-output.txt) · [blocked unit log](unit-tests-excluding-provider-output.txt) ·
[pure tests](pure-unit-output.txt) · [unit suite 22 Oct](unit-suite-2026-10-22.txt) ·
[payment recheck 22 Oct](payment-recheck-2026-10-22.json) ·
[components and tables](COMPONENT-AND-TABLE-AUDIT.md)

Screenshots: [admin](admin-dashboard-admin.png) · [receptionist](receptionist-dashboard-reception.png) ·
[coach](coach-coach-dashboard.png) · [parent](parent-parent-dashboard.png).
