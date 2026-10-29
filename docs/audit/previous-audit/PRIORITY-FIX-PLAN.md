# Prioritized fix plan

Audit date: **21 October 2026**. Updated **22 October 2026** after the unit-test pipeline repair. The 21 October audit was read-only; the 22 October pass changed only the unit-test pipeline, the notification-provider source and two defects those tests exposed. No schema, deployed function or business data was changed.

No confirmed P0; this is not a security certification.

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

## Item 2 - what was completed

- The edge provider module is valid TypeScript again (`ProviderConfig` declares `whatsappMediaContentSid`, both `deliver()` branches assign `response`, `deliveryStatus()` parses the provider payload) and is type-checked and executed by the Angular test run through the direct import in `src/app/core/supabase/notification-providers.spec.ts`.
- The nine spec files that imported missing modules or nonexistent exports now import the real exports and assert behaviour.
- The 26 assertion-level mismatches found once the suite could run were resolved: 24 by correcting the expectation or the test harness, and 2 by fixing product behaviour (the CSV exporter dropped data columns named "Action"; the notification-template list sorted descending when no direction was supplied).
- Verification: 104 test files, 433 tests, 0 failures; production build succeeds. Evidence in [unit-suite-2026-10-22.txt](unit-suite-2026-10-22.txt).
- Still open under this item: comparing the deployed notification function with the repaired local source, and confirming the supported-channel contract before any production send.

Require production build, full units, separate edge validation, four-role read/write authorization, deterministic WhatsApp assertions and cleanup evidence before release. Click-to-Chat acceptance remains URL composed/opened and delivery unconfirmed unless separately observed.
