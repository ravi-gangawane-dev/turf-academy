# Working features — verified scope

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

## Scope and counting

152 capabilities: 119 named routes (aliases included) plus 33 command/cross-cutting capabilities. Each has one mutually exclusive primary status; recommendations do not add to totals. WORKING read/list/redirect entries certify only that scope, not every action on a page. Rendering alone is generally PARTIALLY WORKING. NOT VERIFIED is insufficient evidence, not confirmed failure.

Production preview on127.0.0.1:4312 uses the existing live Supabase project. Fresh contexts, authenticated session bootstrap and business-write guards prevent application mutations; authentication sessions themselves were necessary for role testing. CRUD, corrections, refunds, uploads, recovery emails, external notification sending and restore were not run. Prior live attendance E2E is historical only. Service workers were blocked in this sweep, so PWA lifecycle is not verified.

Interrupted sweeps are excluded: the shared4202 server stopped, C: filled during an earlier production run, and shared dist output subsequently disappeared. A separate audit build is now served from memory by the browser harness. The complete resumed production run is authoritative. Cleanup was rejected by automatic approval review; it was not retried. The user freed space. Source hashes were unchanged on resume, so the successful build/unit results remain applicable. No application/data fixes were applied.

| ID | Module | Capability / scope | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F002 | login | /login — route/read experience | Fresh production-preview: admin: LOADED → /auth/login. Submissions/destructive actions not executed. src/app/app.routes.ts:40 Alias/redirect navigation scope only. | P2 |
| F010 | redirect | /redirect/admin — route/read experience | Fresh production-preview: admin: LOADED → /dashboard/admin. Submissions/destructive actions not executed. src/app/app.routes.ts:96 Alias/redirect navigation scope only. | P2 |
| F011 | redirect | /redirect/coach — route/read experience | Fresh production-preview: coach: LOADED → /coach/dashboard. Submissions/destructive actions not executed. src/app/app.routes.ts:102 Alias/redirect navigation scope only. | P2 |
| F012 | redirect | /redirect/reception — route/read experience | Fresh production-preview: receptionist: LOADED → /dashboard/reception. Submissions/destructive actions not executed. src/app/app.routes.ts:108 Alias/redirect navigation scope only. | P2 |
| F013 | redirect | /redirect/parent — route/read experience | Fresh production-preview: parent: LOADED → /parent/dashboard. Submissions/destructive actions not executed. src/app/app.routes.ts:119 Alias/redirect navigation scope only. | P2 |
| F030 | dashboard | /dashboard/admin — route/read experience | Dashboard read/render and desktop automated-accessibility scope. No violations in selected axe rules; not manual/site-wide certification. production-runtime-2026-10-22.json. | P2 |
| F032 | dashboard | /dashboard/reception — route/read experience | Dashboard read/render and desktop automated-accessibility scope. No violations in selected axe rules; not manual/site-wide certification. production-runtime-2026-10-22.json. | P2 |
| F053 | students | /students — route/read experience | Fresh production-preview: admin: LOADED → /students; receptionist: LOADED → /students. Submissions/destructive actions not executed. src/app/app.routes.ts:401 | P2 |
| F057 | parents | /parents — route/read experience | Fresh production-preview: admin: LOADED → /parents; receptionist: LOADED → /parents. Submissions/destructive actions not executed. src/app/app.routes.ts:430 | P2 |
| F062 | batches | /batches — route/read experience | Fresh production-preview: admin: LOADED → /batches; receptionist: LOADED → /batches. Submissions/destructive actions not executed. src/app/app.routes.ts:460 | P2 |
| F066 | coaches | /coaches — route/read experience | Fresh production-preview: admin: LOADED → /coaches; receptionist: LOADED → /coaches. Submissions/destructive actions not executed. src/app/app.routes.ts:487 | P2 |
| F067 | enrollments | /enrollments — route/read experience | Fresh production-preview: admin: LOADED → /enrollments; receptionist: LOADED → /enrollments. Submissions/destructive actions not executed. src/app/app.routes.ts:494 | P2 |
| F076 | attendance | /attendance/manual-check-in — route/read experience | Fresh production-preview: admin: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:556 Alias/redirect navigation scope only. | P2 |
| F077 | attendance | /attendance/manual-check-out — route/read experience | Fresh production-preview: admin: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:561 Alias/redirect navigation scope only. | P2 |
| F078 | attendance | /attendance/qr — route/read experience | Fresh production-preview: admin: LOADED → /attendance/check-in-out. Submissions/destructive actions not executed. src/app/app.routes.ts:566 Alias/redirect navigation scope only. | P2 |
| F080 | attendance | /attendance/history — route/read experience | Fresh production-preview: admin: LOADED → /attendance/history; receptionist: LOADED → /attendance/history. Submissions/destructive actions not executed. src/app/app.routes.ts:580 | P2 |
| F083 | fees | /fees/plans — route/read experience | Fresh production-preview: admin: LOADED → /fees/plans; receptionist: LOADED → /fees/plans. Submissions/destructive actions not executed. src/app/app.routes.ts:605 | P2 |
| F084 | fees | /fees — route/read experience | Fresh production-preview: admin: LOADED → /fees; receptionist: LOADED → /fees. Submissions/destructive actions not executed. src/app/app.routes.ts:611 | P2 |
| F085 | notifications | /notifications — route/read experience | Fresh production-preview: admin: LOADED → /notifications; receptionist: LOADED → /notifications. Submissions/destructive actions not executed. src/app/app.routes.ts:617 | P2 |
| F093 | payments | /payments — route/read experience | Fresh production-preview: admin: LOADED → /payments; receptionist: LOADED → /payments. Submissions/destructive actions not executed. src/app/app.routes.ts:663 | P2 |
| F100 | notifications | /notifications/whatsapp — route/read experience | Fresh production-preview: admin: LOADED → /notifications/whatsapp; receptionist: LOADED → /notifications/whatsapp. Submissions/destructive actions not executed. src/app/app.routes.ts:719 | P2 |
| F102 | notifications | /notifications/failed — route/read experience | Fresh production-preview: admin: LOADED → /notifications/failed; receptionist: LOADED → /notifications/failed. Submissions/destructive actions not executed. src/app/app.routes.ts:730 | P2 |
| F103 | notifications | /notifications/delivery-status — route/read experience | Fresh production-preview: admin: LOADED → /notifications/delivery-status; receptionist: LOADED → /notifications/delivery-status. Submissions/destructive actions not executed. src/app/app.routes.ts:735 | P2 |
| F107 | settings | /settings/users — route/read experience | Fresh production-preview: admin: LOADED → /settings/users. Submissions/destructive actions not executed. src/app/app.routes.ts:758 | P2 |
| F108 | settings | /settings/audit-logs — route/read experience | Fresh production-preview: admin: LOADED → /settings/audit-logs. Submissions/destructive actions not executed. src/app/app.routes.ts:765 | P2 |
| F120 | Build | Production Angular build | Fresh production build passed; build-2026-10-22.txt. Does not compile Deno edge entrypoint. | P3 |
| F121 | Testing | Full Angular unit-test command | Full npm test -- --watch=false passed 104 files/433 tests. Former provider/spec-import blockers cleared; unit-2026-10-22.txt. | P1 |
| F122 | Testing | Isolated pure logic tests | Utility suites execute within the fresh full passing suite; old isolated19-test result is not represented as a separate fresh run. | P3 |
| F123 | Authorization | Four-role sessions and sampled read boundaries | Fresh four-role sessions, read-scope and negative-access probes. Write authorization not exercised. production-runtime-2026-10-22.json. | P2 |
| F133 | Testing | Colocated component spec presence and execution | All 69 production components have specs;104 total spec files pass. This proves presence/execution, not exhaustive behavioral coverage. | P2 |

## Verification limits

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

Unit providers use mocked transport; no email/SMS/WhatsApp was sent. Component spec presence/execution does not prove every form submission. Production build covers Angular, not edge deployment. Live CRUD requires a separate authorized fixture run.
