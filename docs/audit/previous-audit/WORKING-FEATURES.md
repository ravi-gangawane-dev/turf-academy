# Verified working capabilities

Audit date: 21 October 2026. **Audit only: no fixes or business-data changes during the audit.** Prior authorized attendance E2E evidence is identified separately.

## Scope and counting

The catalogue counts 119 named route experiences (including aliases) plus 33 command/cross-cutting capabilities, each with exactly one primary status. Issue IDs do not add to totals. WORKING list entries certify only their explicitly scoped read capability; mutations are separate. Route rendering alone is PARTIALLY WORKING. NOT VERIFIED does not mean absent or broken. Counts are not a percentage of all possible behaviors.

Checks used the existing live development server on port 4202 and live Supabase reads with admin, receptionist, coach and parent accounts. Sessions were seeded to avoid application login audit writes; authentication session lifecycle was necessary. Fresh contexts avoided stored offline operations. Business-write guards saw no business writes. CRUD, corrections, refunds, uploads, password recovery and external delivery were not executed in this audit. Earlier authorized E2E attendance writes and cleanup finished before the audit-only switch. Local migrations do not prove deployed SQL parity. No code/schema/business-data fixes were made.

| ID | Module | Capability | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F053 | students | /students ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:400; ./features/students/students-page | P2 |
| F057 | parents | /parents ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:429; ./features/parents/parents-page | P2 |
| F062 | batches | /batches ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:459; ./features/batches/batches-page | P2 |
| F066 | coaches | /coaches ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:486; ./features/coaches/coaches-page | P2 |
| F067 | enrollments | /enrollments ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:493; ./features/enrollments/enrollments-page | P2 |
| F080 | attendance | /attendance/history ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:579; ./features/attendance/attendance-history-page | P2 |
| F083 | fees | /fees/plans ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:604; ./features/fees/fee-plans-page | P2 |
| F084 | fees | /fees ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:610; ./features/fees/fees-page | P2 |
| F085 | notifications | /notifications ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:616; ./features/notifications/notifications-page | P2 |
| F093 | payments | /payments ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:662; ./features/payments/payments-page | P2 |
| F100 | notifications | /notifications/whatsapp ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:718; ./features/notifications/notifications-page | P2 |
| F102 | notifications | /notifications/failed ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:729; ./features/notifications/notifications-page | P2 |
| F103 | notifications | /notifications/delivery-status ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:734; ./features/notifications/notifications-page | P2 |
| F107 | settings | /settings/users ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:757; ./features/settings/users-page | P2 |
| F108 | settings | /settings/audit-logs ? route/read experience | Read/list scope only: live rendering plus safe controls or fresh-session endpoint checks. CRUD is not certified. src/app/app.routes.ts:764; ./features/settings/audit-log-page | P2 |
| F120 | Build | Production Angular build | npm run build passed; build-output.txt. Edge functions are not in this build graph. | P3 |
| F122 | Testing | Isolated pure logic tests | 19 tests in six files pass; pure-unit-output.txt. | P3 |
| F123 | Authorization | Four-role sessions and sampled read boundaries | Four accounts authenticate, eight forbidden routes denied; anonymous reads empty, parent/coach scope predicates pass. | P2 |
| F124 | WhatsApp | Admin QR and bulk manual Click-to-Chat | Prior authorized E2E: two cases pass including persisted times, relationship recipient and bulk invalid/missing/opt-out handling. | P2 |

## WhatsApp evidence and limits

Earlier records: Rahul Patil parent 321f6158-dc89-4c69-932b-67345736c1eb; Sunil Patil student 3b323daf-af9e-469b-876a-7d0477efac58. Existing student_parents drives the recipient. +919130451715 satisfies the application E.164 shape; ownership/eligibility/delivery are not established by validation. URL: https://wa.me/919130451715 with encoded text. Previews use saved timestamps; student phone is unnecessary. Prior Twilio attempts failed with invalid ContentSid and no provider ID; those failures are separate from manual Click-to-Chat. Opening WhatsApp remains delivery unconfirmed. Prior record report: ../PATIL_WHATSAPP_TEST_2026-10-21.md.

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
