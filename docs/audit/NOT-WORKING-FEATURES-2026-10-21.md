# Confirmed failures and defects

Audit date: 21 October 2026. **Audit only: no fixes or business-data changes during the audit.** Prior authorized attendance E2E evidence is identified separately.

| ID | Module | Capability | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F099 | payments | /payments/history ? route/read experience | I01: HTTP400 Invalid payment view for admin and receptionist. src/app/app.routes.ts:709; ./features/payments/payments-page | P1 |
| F121 | Testing | Full Angular unit-test command | I02: provider TypeScript parsing fails; zero tests execute, including exclusion attempt. | P1 |
| F127 | Notifications | Local edge-provider deployability | I02: invalid source expressions; local/deployed configuration drift. No deployment attempted. | P1 |
| F128 | Attendance | Business-date consistency | I05: static UTC/academy-date mismatch near midnight; live boundary mutation not run. | P2 |
| F129 | Parents | Consent/status preservation on edit | I04: static confirmed replacement payload drops whatsapp:false and forces active status. | P2 |

| ID | Module | Problem | Evidence | Root cause / risk | Recommendation | Priority | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I01 | Payments | History route fails | Live confirmed | history excluded from SQL view allowlist | Support/map history consistently and test both roles | P1 | src/app/features/payments/payments-page.ts:255; src/app/core/supabase/domain-services.ts:1172; supabase/migrations/202610140005_payment_columns.sql:20 |
| I02 | Notifications/testing | Invalid provider source blocks compilation | Compile confirmed | Literal ...(truncated) in interface and malformed request conditional; incomplete transport contract | Restore typed contract, run full and edge tests, compare deployed configuration | P1 | supabase/functions/notification-delivery/providers.ts:2,43; index.ts:5 |
| I04 | Parents | Edit loses consent/status/metadata | Static confirmed; no live save | Replacement {channel} loses whatsapp:false, status forced active and address replaced | Merge existing metadata; explicitly map consent and preserve status | P2 | src/app/features/parents/parent-form-page.ts:96; src/app/core/api/supabase-attendance.repository.ts:69 |
| I05 | Attendance | Business dates disagree | Static confirmed; no live midnight write | UTC workspace/QR versus India notification and academy-timezone SQL | Share academy business date across reads, writes and previews | P2 | src/app/core/api/supabase-attendance.repository.ts:57,78,154; supabase/migrations/202609240004_operational_settings.sql |

## Reproduction and acceptance

1. **I01:** As admin/receptionist open /payments/history. get_payment_list_page(p_view:history) returns400 Invalid payment view; /payments works. Acceptance: both roles load/filter/sort/page history with correct access and counts.
2. **I02:** Run npm test -- --watch=false; parsing providers.ts fails before tests. Production Angular build passes because edge source is outside its graph. Acceptance: full tests and separate edge validation pass; local and deployed supported-channel contracts agree. Deployed configuration currently reads successfully and advertises WhatsApp; local syntax failure does not establish deployed function failure.
3. **I04 (static):** Trace save with an inactive parent having {whatsapp:false,channel:Email} and country metadata. Replacement payload contains only channel and forces active; resolver rejects only explicit whatsapp:false. Acceptance: unrelated edits preserve consent/status/address metadata, tested later with isolated fixture. No live save performed.
4. **I05 (static):** At 2026-10-21T19:00:00Z, UTC date is October21 but India date October22. Workspace/QR query21 while notification/server day is22. Acceptance: common academy business date across all operations and configurable timezones. No clock or database timestamp changed.
