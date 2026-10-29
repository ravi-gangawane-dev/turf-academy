# Not verified ? updated report

Report updated: **22 October 2026 (Asia/Calcutta)**. Verification baseline: 21 October audit. This update reconciles the exact catalogue entries; it is not a fresh end-to-end test run. No capability is promoted to WORKING without new evidence. No application code, schema or business data changed.

## Corrected summary

**24 entries: 8 route experiences + 1 delivery-confirmation capability + 15 workflow capabilities.** The previous chat incorrectly grouped nine routes and combined PWA with exports. PWA and exports are separate entries below. NOT VERIFIED means insufficient execution evidence, not confirmed failure.

| # | Audit ID | Module | Capability | Why still unverified |
| --- | --- | --- | --- | --- |
| 1 | F002 | login | /login ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:40; redirect auth/login |
| 2 | F010 | redirect | /redirect/admin ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:95; ./features/auth/role-redirect-page |
| 3 | F011 | redirect | /redirect/coach ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:101; ./features/auth/role-redirect-page |
| 4 | F012 | redirect | /redirect/reception ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:107; ./features/auth/role-redirect-page |
| 5 | F013 | redirect | /redirect/parent ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:118; ./features/auth/role-redirect-page |
| 6 | F076 | attendance | /attendance/manual-check-in ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:555; redirect attendance/check-in-out |
| 7 | F077 | attendance | /attendance/manual-check-out ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:560; redirect attendance/check-in-out |
| 8 | F078 | attendance | /attendance/qr ? route/read experience | Registered route; not independently exercised. src/app/app.routes.ts:565; redirect attendance/check-in-out |
| 9 | F126 | WhatsApp | Message sent or delivered confirmation | URL opening does not establish sending or delivery. No recipient receipt available. |
| 10 | F135 | Auth | UI login/logout audit logs, recovery email, reset, OTP and password change | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 11 | F136 | Students | Create/edit/delete and document/photo persistence | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 12 | F137 | Parents | Create/link/unlink/delete and primary-parent persistence | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 13 | F138 | Coaches | Create/edit/delete and assignment writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 14 | F139 | Batches | Create/edit/delete, waitlist and schedule writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 15 | F140 | Enrollments | Create/transfer/pause/cancel/fee-plan writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 16 | F141 | Attendance | Corrections, offline retry/discard and coach writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 17 | F142 | Fees | Generate charges, discounts, late fees and fee-plan writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 18 | F143 | Payments | Record/allocate/refund and receipt generation | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 19 | F144 | Notifications | Compose/send/retry, templates and events writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 20 | F145 | Settings | User/role/permission and preference writes | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 21 | F146 | Storage | Upload/delete/download and storage write-policy lifecycle | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 22 | F147 | Backup | Restore drill and external retention | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 23 | F148 | PWA | Production install/update and cross-account offline replay | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |
| 24 | F149 | Exports | Every-module CSV/PDF completeness and parity | Not executed end to end under audit-only restriction; code/test existence is not a current pass. |

## Interpretation and verification limits

- The eight route entries concern independent alias/redirect behavior in the route sweep. Earlier successful attendance workflow tests do not automatically certify each alias in this catalogue.
- CRUD, financial writes, notifications and account changes were not executed during the audit-only phase. Existing implementation or spec files are not a current test pass.
- Storage, backup restoration and PWA lifecycle need suitable isolated environments; complete export parity requires comparing exported data with source records across pagination.
- Opening a Click-to-Chat URL does not prove sending or delivery. Recipient confirmation or a separate provider-backed delivery signal would be needed; the URL flow itself is not broken for lacking such proof.
- The 22 October focused recheck confirmed Payment History failure and full-test compilation blockers. It did not execute these 24 capabilities and therefore does not clear their status.

## Related reports

- [Updated not-working report](NOT-WORKING-FEATURES.md): fresh payment RPC and unit compilation evidence from 22 October.
- [Original feature catalogue](feature-catalogue.json): stable IDs and primary statuses from the 21 October audit.
- [Original partial/unverified report](PARTIALLY-WORKING-FEATURES.md): original audit coverage and limits.
