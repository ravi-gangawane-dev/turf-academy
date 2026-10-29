# Updated not-working report

Rechecked: **22 October 2026 (Asia/Kolkata)**. Scope: the five previously reported capabilities. This pass repaired the unit-test pipeline and the notification-provider source (F121/F127); no schema, deployed function or business data was changed. Payment verification used the live RPC read path. Other audit reports remain the 21 October snapshot.

## Current result

**3 unresolved capabilities; 2 cleared.** The unit-test pipeline and the provider source defects are fixed and covered by tests. The remaining items are unchanged from the previous report.

| ID | Capability | Current evidence | Priority |
| --- | --- | --- | --- |
| F099 / I01 | Payment History | Fresh live RPC calls still return HTTP 400, P0001, Invalid payment view for both admin and receptionist. Control calls with list succeed with HTTP 200 and five rows. | P1 |
| F121 / I02 | Full unit-test suite | **Cleared.** `npm test -- --watch=false` now compiles and runs: 104 files, 433 tests, all passing. Production build also succeeds. | Closed |
| F127 | Local notification-provider deployment readiness | **Source cleared.** The provider module compiles inside the Angular test graph and is covered by 10 unit tests. Deployed-function parity with the local source was not re-verified and no deployment was attempted. | P2 |
| F128 / I05 | Attendance business-date consistency | Workspace now uses Asia/Kolkata, but identifyQr still derives UTC date. Notification uses Asia/Kolkata, while SQL uses academy timezone. Static mismatch remains; no live midnight mutation performed. | P2 |
| F129 / I04 | Parent consent preservation on edit | Status and existing address metadata are now preserved in source. communication_preferences still replaces the object with channel only, dropping whatsapp:false and other stored flags. Static defect remains; no live save performed. | P2 |

## Changes since the previous report

- The provider module is valid TypeScript again: `ProviderConfig` declares `whatsappMediaContentSid`, both `deliver()` branches assign `response`, and `deliveryStatus()` reads the provider payload. `src/app/core/supabase/notification-providers.spec.ts` imports that edge module directly, so it is type-checked and executed by the Angular test run.
- The nine spec files that imported missing modules or nonexistent exports now import the real exports and run.
- The suite reached the assertion level and exposed 26 genuine expectation mismatches; all 26 were resolved, 24 by correcting the expectation or the test harness and 2 by fixing the product behaviour they exposed (see below). The suite is green at 433/433.
- Two product defects were found and fixed while resolving those expectations: the CSV exporter dropped every column labelled "Action" even when it held data, and the notification-template list sorted descending when the caller passed no direction.
- Payment History, attendance business dates and parent consent are unchanged; the earlier evidence for those still stands.

## Resolved in this pass

### F121 / I02 - Unit-test pipeline

The 21/22 October reports described a compilation failure ("zero tests execute"). Both causes are gone:

| Problem | Repair |
| --- | --- |
| Nine spec files imported missing modules or nonexistent exports (`http-academy.repositories`, `supabase-attendance-workspace`, `auth-guard`, `permissions`, `role-guard`, `data-error`, `enrollment-finance-services`, `notification-templates-list`, `payment-balances`). | Each spec now imports the real module or export and asserts behaviour instead of placeholder symbols. |
| `supabase/functions/notification-delivery/providers.ts` had a truncated interface literal, an unassigned `response` and a missing `whatsappMediaContentSid` member. | The provider contract is restored and exercised by 10 unit tests through the direct edge-module import. |

### Assertion-level mismatches found once the suite could run

| Spec | Mismatch | Resolution |
| --- | --- | --- |
| `core/auth/permissions.spec.ts` | Expected the administrator to hold `coach:portal` and `children:read`. | Both are role-scoped (the `/coach/*` routes are role-guarded, the child view belongs to the parent portal), so the administrator holds no role-scoped permission. The spec now states that boundary instead of assuming a superset. |
| `shared/data-table/table-tools.spec.ts` | Expected unquoted CSV cells and an exported "Action" column. | The exporter quotes every cell and prefixes formula-like values, matching `features/reports/report-csv.ts`; button-only columns are dropped. The spec now asserts the quoted form and adds a case that proves a data column named "Action" is exported. |
| `core/supabase/domain-services.spec.ts` | Expected the `ilike.*Aarav*` pattern. | The Supabase client sends `ilike.%Aarav%`; `%` is the PostgREST wildcard and matches the rest of the codebase and the sibling `notification-templates-list.spec.ts`. The spec was aligned. |
| `core/supabase/domain-services.spec.ts` | Expected `page.total` to be 1. | The fake PostgREST answered with `Content-Range: 0-0`, which carries no count, so the client could not read a total. The fake now answers `0-0/1` the way the real API does. |
| `core/supabase/domain-services.spec.ts` | Expected a single `channel` filter. | The service always excludes SMS and then narrows by channel, so the request carries `channel=neq.sms&channel=eq.email`. The spec now asserts both filters, as the sibling template-list spec already did. |
| `core/supabase/domain-services.spec.ts` | Expected `name.asc` when no sort direction was given. | **Product fix:** `NotificationTemplatesService.page` sorted descending for a missing direction, which reversed the template directory. It now defaults to ascending, like the other directory services. |
| `shared/data-table/table-tools.ts` | The exporter dropped every column whose header read "Action"/"Actions". | **Product fix:** the parent activity table exports a real "Action" column (created/updated), and its values were silently lost. Button-only columns are now detected from the DOM, so a column that carries data is exported whatever it is called. |
| `layout/staff-layout/staff-layout.spec.ts` | Navigation assertions saw an empty DOM. | The spec created the component but never rendered it. It now renders in setup. |
| `features/students/student-details-page.spec.ts` | The last detail request was always the timeline load. | Under auto change detection the first render happened during `whenStable()` and re-ran `ngOnInit` after the tab and sort calls. The spec now renders in setup, and the sort case selects the timeline tab before sorting. |
| 13 page specs (`attendance-*`, `offline-queue`, `unauthorized`, `manual-check-in`, `login`, `role-redirect`, `coach-portal`, `parent-form`, `parent-profile-form`, `academy-settings`, `settings-navigation`, `users`) | NG0201: no `ActivatedRoute` provider. | Each spec now provides `provideRouter([])`. |

Verification: `npm test -- --watch=false` -> 104 files, 433 tests, 0 failures. `npm run build` (production) -> success, no warnings or budget errors.

Evidence: [Full unit run](unit-suite-2026-10-22.txt).

## Reproduction, sources and recommended fixes

### I01 - Payment History

The route supplies paymentView: history at src/app/app.routes.ts:713. PaymentsService.ledgerPage passes that value unchanged in src/app/core/supabase/domain-services.ts. The allowlist in supabase/migrations/202610140005_payment_columns.sql:20 excludes history.

Recheck: authenticate as each staff role and invoke get_payment_list_page with p_view history, offset 0, limit 5 and empty filters. Both fail; the same request using list succeeds. This recheck validates the API contract, not a fresh browser interaction.

Recommendation: define history semantics and either map the route to the intended ledger view or consistently support history in SQL. Verify filtering, pagination, counts and role access afterward.

Evidence: [Fresh payment RPC results](payment-recheck-2026-10-22.json).

### F127 - Provider deployment readiness

The local provider source now compiles and its behaviour is unit-tested, but the deployed edge function was not compared with it in this pass and no deployment was attempted. Readiness therefore remains unproven.

Recommendation: run the edge function locally against the same secrets, compare the deployed build with the local source, and confirm the supported-channel contract before any production send.

### I05 - Attendance business date

Source: src/app/core/api/supabase-attendance.repository.ts:58,78,154. Workspace and notification now use India time; identifyQr still uses new Date().toISOString().slice(0,10).

Deterministic example: 2026-10-22T19:00:00Z is October 23 in India but October 22 in UTC. QR lookup and workspace can query different days. The remaining hardcoded India timezone also needs reconciliation with configurable academy timezone in supabase/migrations/202609240004_operational_settings.sql.

Recommendation: one academy business-date resolver used consistently by QR, workspace, notifications and server operations. Verify local-midnight and configured-timezone boundaries. Source review only; no clock or attendance rows changed.

### I04 - Parent consent

Source: src/app/features/parents/parent-form-page.ts:102. communication_preferences is reconstructed as { channel: ... } without merging the existing object. An existing whatsapp:false is therefore removed. Attendance recipient resolution rejects only an explicit false in src/app/core/api/supabase-attendance.repository.ts:69.

Recommendation: preserve existing preferences and deliberately map any consent change from the form. Test an opted-out inactive parent receiving an unrelated edit. Status/address preservation is improved in source but not yet verified through a live save.

## Recommended order

1. Repair Payment History's route/RPC contract.
2. Preserve parent WhatsApp consent.
3. Unify QR/workspace/server business dates.
4. Verify the deployed notification function against the repaired local source.

Click-to-Chat sending/delivery remains unconfirmed by design and is not counted as a broken feature merely because a URL cannot establish delivery.

[Previous report snapshot](NOT-WORKING-FEATURES-2026-10-21.md).
