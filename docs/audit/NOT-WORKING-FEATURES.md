# Current not-working features

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

| ID | Module | Capability / scope | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F099 | payments | /payments/history — route/read experience | I01: live history RPC returns400 Invalid payment view; list control returns200. Fresh browser/backend evidence. | P1 |
| F128 | Attendance | Business-date consistency | I05: workspace/message use India date; identifyQr still UTC at repository.ts:154. Static mismatch; no live midnight write. | P2 |
| F129 | Parents | Consent/status preservation on edit | I04: parent status/address now preserved, but preferences replacement at parent-form-page.ts:102 drops whatsapp:false. Static confirmed; live save not run. | P2 |
| F134 | Tooling | Configured project lint command | I11: npm run lint exists but fails: Cannot find lint target for the specified project. angular.json lacks target; lint-2026-10-22.txt. | P2 |

| ID | Module | Problem | Evidence | Cause / risk | Recommendation | Priority | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I01 | Payments | History rejects valid route | Live confirmed | history excluded from allowed views | Support/map history consistently and test both roles | P1 | src/app/app.routes.ts:713; src/app/core/supabase/domain-services.ts:1172; supabase/migrations/202610140005_payment_columns.sql:20 |
| I04 | Parents | Edit drops opt-out | Static confirmed; no live save | Preferences reconstructed with channel only | Merge stored flags; preserve explicit consent | P2 | src/app/features/parents/parent-form-page.ts:102; src/app/core/api/supabase-attendance.repository.ts:69 |
| I05 | Attendance | QR day differs from workspace/server | Static confirmed; no midnight write | QR UTC versus India frontend and academy-timezone SQL | Share academy business-date resolution | P2 | src/app/core/api/supabase-attendance.repository.ts:58,78,154; supabase/migrations/202609240004_operational_settings.sql |
| I11 | Tooling | Lint command fails | Fresh command confirmed | ng lint without architect.lint target | Configure compatible builder/rules and rerun | P2 | package.json:scripts.lint; angular.json:architect |

## Reproduction and acceptance

1. **I01:** As admin/receptionist open /payments/history or call get_payment_list_page with history: HTTP400 Invalid payment view. Identical list control succeeds200. Support history consistently; retest filters/page/counts.
2. **I04 (static):** {whatsapp:false,channel:Email} becomes a channel-only object on edit. Resolver rejects only explicit false. Merge flags and test isolated opted-out parent. Status/address are now preserved in source, not still forcibly reset. No live save.
3. **I05 (static):** At2026-10-22T19:00:00Z, India is October23 while UTC is October22. QR/workspace can query different dates. Unify academy date and test timezone boundaries. No clock/row changes.
4. **I11:** npm run lint fails because Angular has no lint target. Configure actual builder/rules, then rerun.

## Cleared older blockers

Provider syntax and invalid spec imports no longer block the full suite:104 files/433 tests pass. Provider deployment remains partially verified; older compile-failure logs are historical.

## Evidence and reports

[Inventory](inventory-2026-10-22.json), [current catalogue](feature-catalogue-2026-10-22.json), [production browser/backend evidence](production-runtime-2026-10-22.json), [build](build-2026-10-22.txt), [units](unit-2026-10-22.txt), [lint](lint-2026-10-22.txt), [resume integrity](resume-integrity-2026-10-22.json).

[Working](WORKING-FEATURES.md) · [Not working](NOT-WORKING-FEATURES.md) · [Partial](PARTIALLY-WORKING-FEATURES.md) · [Missing](MISSING-FEATURES.md) · [Improvements](IMPROVEMENT-RECOMMENDATIONS.md) · [Components/tables](COMPONENT-AND-TABLE-AUDIT.md) · [Fix plan](PRIORITY-FIX-PLAN.md) · [Not verified](NOT-VERIFIED-FEATURES.md). [Redirect and user-list rechecks](redirect-and-users-recheck-2026-10-22.json) wait for the intentional 1200ms role redirect and capture user-list edge requests (the main tracer captured REST only). Previous reports retained in previous-audit/.
