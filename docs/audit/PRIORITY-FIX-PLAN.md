# Prioritized fix plan

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

No confirmed P0. No fixes implemented. Prior provider parsing/spec-import blockers are cleared.

| Order | Task | Priority | Affected files | Complexity | Dependencies / acceptance |
| --- | --- | --- | --- | --- | --- |
| 1 | Repair History contract I01 | P1 | app.routes.ts; domain-services.ts; payment RPC | Low–medium | Both-role paging/filter/count regression |
| 2 | Preserve parent consent I04 | P2 | parent-form-page.ts | Low–medium | Opt-out fixture; keep status/address improvements |
| 3 | Unify QR/workspace/server dates I05 | P2 | attendance repository/date helpers/RPC | Medium | Midnight/configurable timezone tests |
| 4 | Configure working lint target I11 | P2 | angular.json;package.json;lint config | Low–medium | Compatible builder/rules; lint passes |
| 5 | Bind offline queue identity I06 | P2 | core/offline;auth;coach outbox | Medium–high | Account-switch/replay/idempotency scenarios |
| 6 | Validate checkout state I07 | P2 | attendance_check_out SQL | Medium | Deployed parity; isolated transaction tests |
| 7 | Fix remaining accessibility findings | P2 | Affected dashboard templates/styles | Medium | Current axe selectors/manual review; skip cleared findings |
| 8 | Scale roster/report queries I08 | P2 | attendance repository;reports page | Medium–high | >500 roster/large report fixtures; preserve exports |
| 9 | Strengthen creation-only specs | P2 | 21 specs listed in component audit | Incremental | Meaningful permission/consent/state assertions |
| 10 | Correct settings test-message semantics I09 | P3 | academy-settings-page.ts | Low | Explicit recipient/test text |
| 11 | Split large views | P3 | coach/report views | Incremental | Preserve OnPush/shared controls |
| 12 | Complete unverified workflows | P2 | E2E/RPC/storage/PWA suites | High | Authorized isolated CRUD/refund/correction/recovery/restore/offline data |
| 13 | Validate edge deployment separately | P2 | notification-delivery functions | Medium | Deno tools/deployed parity/credentials/templates; no automatic live send |

Release evidence should include build, units, lint, scoped read/write authorization, edge validation, deterministic attendance assertions and cleanup. Click-to-Chat means correct URL/open request; delivery stays unconfirmed unless separately observed.
