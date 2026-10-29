# Admin Portal Gap Analysis

Audit date: 16 September 2026

Deployment update: migration `202609160002_admin_finance_settings.sql` was deployed to the linked Supabase project on 16 September 2026. Local and remote migration histories match, and remote schema lint reports no errors.

P1 implementation update: the Fees discount/late-fee/pending/summary routes, Notification channel/status routes, Coach/Batch reports, private receipt PDF storage, and outstanding-balance report correction are implemented. Production build and 50 unit tests pass. The live Supabase suite passed 40/40 after its scoped realtime test was aligned with the production `coach_id` server filter; the additional Admin settings/refund RLS test also passes independently.

Scope: Angular Admin UI, authentication/authorization, Supabase/PostgreSQL schema, RLS, feature services, shared UI, automated tests, and cross-role data flow.

Status is based on the complete checked-in code path, not on route or screen presence alone. Live deployment state and production data were not assumed from local migrations.

## Executive summary

The portal has a strong Supabase foundation and substantial working coverage for Students, Parents, Coaches, Batches, Enrollments, and Attendance. It is not yet a complete Admin Portal. Payments, Academy Settings, several Fees/Notification/Report subroutes, receipt/refund workflows, and some history/schedule views are generic placeholder surfaces or client-store views. The production environment correctly disables mock mode, but the default development environment still enables mock state while declaring Supabase as its backend. Several Admin pages therefore do not consistently use the database as their source of truth.

No service-role key was found in the Angular client. Core tables have RLS enabled and explicit policies, and authentication waits for Supabase initialization before protected rendering. The largest current risks are incomplete financial UI/workflows, inconsistent data architecture between direct Supabase services and the legacy `AcademyFacade`, broad Receptionist permissions for financial and attendance-correction operations, and lack of verified live deployment state for all migrations.

## Required module gap analysis

| Module | UI | Backend | RLS | Status | Issue | Priority |
|---|---|---|---|---|---|---|
| Admin authentication | Implemented | Supabase Auth + profile lookup | Profile self/admin policies | COMPLETE | Login, restoration, refresh, logout, inactive/suspended checks and guards exist; live negative-path verification remains required | P1 High |
| Admin dashboard | Implemented | Direct Supabase repository | Covered by entity policies | PARTIAL | Real counts exist, but dashboard coverage is narrower than the requested activity, fee, session and notification panels | P1 High |
| Students | List/form/profile/documents/medical/history present | Typed list RPC + CRUD RPCs/direct queries | Explicit scoped policies | COMPLETE | Strongest Admin vertical slice; shared UI and live CRUD regression coverage can improve | P2 Medium |
| Parents | List/form/profile/linking present | Direct Supabase services | Explicit scoped policies | PARTIAL | Uses browser `prompt()` for key actions and contains large duplicated page markup; history is not a dedicated verified workflow | P1 High |
| Coaches | List/form/profile present | Direct Supabase services | Admin write/scoped read policies | PARTIAL | Assignment is handled in Batches; Admin schedule and attendance-summary experience are incomplete as dedicated flows | P1 High |
| Batches | Large multi-view page | Direct Supabase service | Admin write/scoped read policies | PARTIAL | CRUD/assignment/allocation exist, but one 4,500+ line feature is difficult to test and maintain; capacity invariant needs DB-level proof | P1 High |
| Enrollments | Multi-view workflow present | RPC-backed create/status/transfer | Scoped policies + history table | PARTIAL | Core mutations exist, but parts of the form UI are presentation-only/unbound and full history persistence needs live verification | P1 High |
| Attendance | Dashboard, manual, QR, correction, history, calendar, offline queue | Supabase services/RPCs + IndexedDB outbox | Scoped policies and correction RPCs | COMPLETE | Broad implementation and tests exist; live scanner/device and reconnect verification remain | P1 High |
| Fees | Fee plans and charge page present | Fee RPCs/direct queries | Explicit policies | PARTIAL | Discounts, late fees, pending and summary routes use generic `ModulePage`; no complete Admin workflows | P1 High |
| Payments | Generic module surface only | `record_payment` RPC exists | Insert/read policies exist | MISSING | No complete list/detail/new payment/receipt/refund/idempotency UI; route presence is not implementation | P0 Critical |
| Receipts | No dedicated Admin workflow | Receipt table/policies exist | Read/insert policies | MISSING | No private receipt generation/download flow or receipt detail validation | P0 Critical |
| Refunds | Placeholder route | No verified refund RPC/workflow | No dedicated refund policy/workflow found | MISSING | Financial reversal and audit trail absent | P0 Critical |
| Notifications | Main activity screen present | Legacy facade in Supabase mode does not hydrate it | Policies and parent/coach realtime exist | BROKEN | Admin main and subroutes can render empty/stale client state; SMS/WhatsApp/templates/failed/delivery routes are generic views | P1 High |
| Reports | Filter/export UI present | Legacy REST repository path | Entity RLS exists | BROKEN | Supabase mode does not provide a Supabase report repository through the facade; Coach/Batch routes are placeholders | P1 High |
| Settings | Users & Roles works; Academy settings placeholder | Edge function for user management | Profile admin policies | PARTIAL | Academy profile/contact/timezone/currency/attendance/fee/notification settings are not implemented | P1 High |
| Global search | Header input present | Limited direct coach lookup | Entity RLS exists | PARTIAL | Does not provide a complete debounced, cancellable Admin search over students/parents/coaches/batches | P2 Medium |
| Audit log | No Admin viewer | Generic DB audit triggers + auth logs | Admin read policies | PARTIAL | Backend audit exists, but safe metadata coverage and Admin review UI are not complete | P2 Medium |

## UI consistency audit

| Screen | Theme | Alignment | Responsive | Reusability | Action |
|---|---|---|---|---|---|
| Dashboard | Correct | Mostly consistent | Covered by responsive tests | Medium | Adopt shared page header/stat cards and add independent panel states |
| Student List/Profile/Form | Correct | Mostly consistent | Strong desktop/mobile assets and tests | Medium | Consolidate headers, filters, badges and confirmations |
| Parent List/Profile/Form | Correct | Partial | Large templates need focused verification | Low | Replace duplicated sections and browser prompts with shared dialogs/forms |
| Coach List/Profile/Form | Correct | Partial | Responsive styles exist | Low | Reuse header, stat, filter, table and status primitives |
| Batches | Correct | Partial | Complex single-template responsiveness is fragile | Low | Split view-specific components; retain one feature state/service |
| Enrollments | Correct | Partial | Partial | Low | Bind presentation-only controls and extract repeated filter/table/dialog UI |
| Attendance suite | Correct | Mostly consistent | Covered at key viewports | Medium/High | Continue using shared calendar/data table/pagination/async state |
| Fees | Correct | Partial | Partial | Low | Replace generic subroutes with real feature views using shared financial components |
| Payments | Superficial | Superficial | Generic page only | Low | Implement the actual workflows before visual refinement |
| Notifications | Correct | Mostly consistent | Basic responsive styling | Low | Move to Supabase service and shared async/filter/status components |
| Reports | Correct | Mostly consistent | Table can scroll | Low | Add real Supabase query/RPC service and reusable report filters/table |
| Settings | Partial | Partial | Not meaningfully testable | Low | Implement Academy Settings with shared forms and independent sections |

## Reusability report

| Existing component/pattern | Duplicate locations | Reusable replacement |
|---|---|---|
| Feature/page headers and breadcrumbs | Dashboard, Students, Parents, Coaches, Batches, Enrollments, Attendance, Fees, Reports, Settings | Extend `PageHero` into a typed page-header API rather than create a parallel component |
| KPI/summary articles | Dashboard, Students, Parents, Coaches, Attendance, Fees, Notifications | Extend `SummaryCards`/`UiCard` with typed variants and loading state |
| Native data tables | Nearly every Admin list | Incrementally adopt existing `DataTable`; add sort/action/custom-cell support only where proven necessary |
| Search/filter toolbars | Students, Parents, Coaches, Batches, Enrollments, Fees, Attendance | Typed composable filter controls; avoid a 100-input universal filter component |
| Status pills | All entity and transaction lists | Small typed `StatusBadge` with centralized status-to-variant mapping |
| Loading/empty/error blocks | Most backend pages | Extend existing `AsyncState` and add skeleton variants |
| Pagination markup | Students, Coach portal, Attendance and list pages | Existing `Pagination` component with one typed pagination model |
| Confirmation/prompt flows | Students, Parents, Batches, Fees, Coach attendance | Accessible shared confirm dialog plus feature-specific forms |
| Repeated lookup queries | Students, batches, enrollment and form dropdowns | Supabase-backed lookup store with cache invalidation after mutation |

## Reusable component plan

| Component | Purpose | Used by | Inputs | Outputs | Current duplicate code | Expected benefit |
|---|---|---|---|---|---|---|
| PageHeader (evolve PageHero) | Consistent title, breadcrumb and actions | All Admin features | title, subtitle, breadcrumbs, icon, actions | action | Repeated headers | Alignment and accessibility |
| StatCard/StatsGrid (evolve SummaryCards) | Backend KPI presentation | Dashboard and entity summaries | label, value, icon, trend, variant, loading | optional select | Repeated article cards | No fake zero while loading |
| StatusBadge | Central status visuals and labels | All lists/details | typed status, optional label | none | Repeated pill CSS | Consistency and non-color cues |
| FilterBar | Compose search/select/date filters | Entity lists, history, fees, payments | typed filter descriptors/value/loading | change, apply, reset | Repeated toolbars | Predictable server-filter behavior |
| ConfirmDialog | Destructive-action confirmation | Deactivate/delete/unlink/cancel/refund/correction | title, message, confirm label, severity | confirm, cancel | `window.confirm/prompt` | Accessibility and testability |
| LoadingSkeleton | Honest loading presentation | Dashboard/cards/tables/profiles | variant, rows | none | Ad-hoc spinners/text | Prevent misleading zero values |

Existing `DataTable`, `Pagination`, `AsyncState`, `CalendarLayout`, `UiCard`, `SummaryCards`, and `PageHero` should be evolved and reused. Creating duplicate replacements would increase—not reduce—technical debt.

## Backend, RLS and security report

- Authentication initialization is correctly awaited by `authGuard`; the Supabase profile must have a valid role and be active before a session is accepted.
- Route permissions protect all child routes. Explicit Admin-only role guards are present on Admin dashboard, user management, design and handoff routes; other Admin routes also allow Receptionist where its permission map grants access.
- No service-role credential is present in the browser configuration. The publishable anon key is expected in a Supabase client.
- RLS is enabled for every table created by the core schema, including financial, attendance, document and audit tables. Later Coach/Parent policies narrow role-specific reads.
- Important mutations use security-definer RPCs for student CRUD, enrollment workflows, attendance, corrections and payments. Their live deployed definitions still require verification.
- The Receptionist role currently has `fees:write` and attendance correction/write permissions, while several database policies similarly use `is_admin_or_receptionist()`. This may be intentional, but it conflicts with a strict Admin-only financial/refund posture and requires a documented authorization decision.
- `notifications_read` permits all staff to read notification records. Because notifications can contain parent/student information, Admin/Receptionist operational access should be explicitly confirmed rather than inherited from broad `is_staff()`.
- Audit triggers cover many core tables and auth actions. Refunds/settings are incomplete, so their required audit events are also incomplete.
- Local migration presence does not prove remote deployment. Migration/version and live RLS checks are mandatory before release.

## Prioritized implementation backlog

### P0 Critical

1. Implement complete payment recording/list/detail and receipt generation using paise-only values and an idempotency key.
2. Implement refund authorization, atomic balance reversal, receipt state and audit history in PostgreSQL/RPCs.
3. Verify deployed migrations and live RLS using Admin, Receptionist, Coach and Parent accounts; prove that cross-role reads are isolated.
4. Decide and enforce the Receptionist financial/attendance-correction permission boundary consistently in Angular permissions, RLS and RPCs.

### P1 High

1. Replace all Admin `ModulePage` business routes with functional feature pages or remove them from navigation until implemented.
2. Move Admin Notifications and Reports from the non-hydrated legacy facade to dedicated Supabase services/RPCs.
3. Implement Academy Settings as a single authoritative backend source with typed section forms.
4. Complete Discounts, Late Fees, Pending Fees and Fee Summary workflows.
5. Complete Coach schedule/attendance summary and Parent/Enrollment history flows.
6. Replace `window.prompt`, `window.confirm` and ad-hoc destructive actions with accessible dialogs.
7. Add full Admin and cross-role live E2E vertical slices, including refresh persistence and negative authorization cases.

### P2 Medium

1. Evolve existing shared components instead of introducing duplicate component families.
2. Add a typed Supabase lookup store for programs, batches, coaches and fee plans with mutation invalidation.
3. Break oversized Batches, Parents, Coach Portal and Enrollment templates into view components while retaining shared feature state.
4. Replace remaining broad `any`/`Record<string, unknown>` boundary types with explicit database DTOs and mappers.
5. Add centralized user-safe Supabase error normalization and a reusable toast service.
6. Add server pagination/search/sort for every large Admin list and cancellation/latest-request protection.
7. Expand responsive and accessibility tests across dialogs, tables, filters and financial screens.

### P3 Enhancement

1. Add quick-view drawers only where they measurably reduce navigation.
2. Add PDF exports after the underlying report/receipt data is authoritative and tested.
3. Add richer dashboard trends and charts backed by aggregate RPCs.

## Audit conclusion

The Admin Portal is **PARTIAL** and must not be reported complete. Core identity, entity management and attendance are materially implemented; financial completion, settings, notification/report data paths, reusable interaction patterns and live cross-role verification remain the release-critical work.

## Baseline verification

- Production Angular build: **PASS** (`npm run build`, 16 September 2026)
- Unit tests: **PASS** (13 files, 44 tests)
- Live Supabase E2E: **not run during the audit phase**; it mutates the linked project and requires the documented live test accounts/fixtures
- Audit-phase implementation changes: **none**; this document is the required gate before P0/P1 code changes
