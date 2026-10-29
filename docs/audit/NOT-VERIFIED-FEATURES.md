# Not verified — refreshed catalogue

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

## Scope and counting

152 capabilities: 119 named routes (aliases included) plus 33 command/cross-cutting capabilities. Each has one mutually exclusive primary status; recommendations do not add to totals. WORKING read/list/redirect entries certify only that scope, not every action on a page. Rendering alone is generally PARTIALLY WORKING. NOT VERIFIED is insufficient evidence, not confirmed failure.

Production preview on127.0.0.1:4312 uses the existing live Supabase project. Fresh contexts, authenticated session bootstrap and business-write guards prevent application mutations; authentication sessions themselves were necessary for role testing. CRUD, corrections, refunds, uploads, recovery emails, external notification sending and restore were not run. Prior live attendance E2E is historical only. Service workers were blocked in this sweep, so PWA lifecycle is not verified.

Interrupted sweeps are excluded: the shared4202 server stopped, C: filled during an earlier production run, and shared dist output subsequently disappeared. A separate audit build is now served from memory by the browser harness. The complete resumed production run is authoritative. Cleanup was rejected by automatic approval review; it was not retried. The user freed space. Source hashes were unchanged on resume, so the successful build/unit results remain applicable. No application/data fixes were applied.

| ID | Module | Capability / scope | Evidence | Priority |
| --- | --- | --- | --- | --- |
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

These are evidence limitations, not confirmed failures. Current alias checks are reflected in this catalogue; the prior24 count is historical.
