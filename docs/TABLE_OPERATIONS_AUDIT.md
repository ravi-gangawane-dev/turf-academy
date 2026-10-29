# Table operations audit — 2026-10-13

Source audit completed before implementation. Scope: all routed feature components, their HTML/inline templates, shared tables, services/repositories, and the Supabase queries they call. Related routes sharing one component/query are grouped below. B = backend; F = frontend; Mixed = both; — = no operation/control. B includes fixed server ordering and scoped server filters, not necessarily user-selectable controls. This is a code audit, not a claim that every view passed live regression testing.

| Module | Component / views | Pagination | Sorting | Search | Filter | Status |
|---|---|---|---|---|---|---|
| Notifications | NotificationsPage: activity, channel, delivery status, failed | B | B | B | Mixed → B | **Completed in this iteration** |
| Notifications | NotificationTemplatesPage | B | B | B | Mixed → B | **Completed 2026-10-14** |
| Notifications | AcademyEventsPage | B | B | B | B | Backend query path |
| Students | StudentsPage | B | B | B | B | Backend query path |
| Students | StudentDetailsPage: attendance, payments, documents | B | B | — | B | Backend query path |
| Students | StudentDetailsPage: combined timeline | — | F | — | F | Pending: combines/sorts loaded history arrays |
| Parents | ParentsPage | B | B | B | B | Backend query path |
| Parents | ParentDetailsPage: activity, payments, notifications | B | B | — | B | Backend query path |
| Parents | ParentDetailsPage: linked children | — | — | — | B | Embedded unpaged relationship |
| Coaches | CoachesPage | B | B | B | B | Backend query path |
| Coaches | CoachDetailsPage: assignments, attendance summary | — | B | — | B | Unpaged scoped details/summary |
| Batches | BatchesPage: directory, schedule, coach assignments, capacity cards | B | B | B | B | Backend rows; reference options remain unpaged |
| Batches | BatchesPage: student allocation table | B | B | B | B | Backend rows; reference options remain unpaged |
| Batches | BatchesPage: capacity/allocation waitlist | B | B | B column inputs | B | **Completed 2026-10-14** |
| Enrollment | EnrollmentsPage: directory | B | B | B | B | Backend query path |
| Enrollment | EnrollmentsPage: history | B | B | — | B | Backend query path |
| Enrollment | EnrollmentsPage: enroll/transfer/pause/cancel selection lists | — | — | — | F | Pending: full workspace, eligibility/action filtering in browser |
| Fees | FeePlansPage | B | B | B | B | Backend query path |
| Fees | FeesPage: monthly charges | B | B | B | B | Backend query path |
| Fees | FeeOperationsPage: discounts, late rules, pending fees, summary | B | B | B | B | Backend query path |
| Fees | FeesPage: charge enrollment picker | — | — | — | F | Pending: active selection from full workspace |
| Payments | PaymentsPage: ledger, receipts, refunds | B | B | B | B | Backend query path |
| Payments | PaymentsPage: outstanding-charge picker | — | B | — | F | Pending: loads charges then filters positive balances |
| Attendance | AttendanceHistoryPage | B | B | B | B | Pending lifecycle fix: constructor effect and ngOnInit both load |
| Attendance | AttendanceCalendarPage: list | B | B | B | B | Backend query path |
| Attendance | AttendanceCalendarPage: month/week | — | — | — | B | Pending aggregate endpoint: browser groups all returned records |
| Attendance | AttendanceCorrectionPage | B | B | B | B | Backend query path |
| Attendance | AttendancePage: overview/recent | F limit | F | — | F | Pending: downloads attendance workspace |
| Attendance | ManualCheckInPage: roster/recent | F limit / — | F | F | F | Pending: downloads attendance workspace |
| Attendance | QrAttendancePage: recent | F limit | F | — | F | Pending: downloads attendance workspace |
| Attendance | OfflineQueuePage | F | F | F | F | Local-only exception: unsynced IndexedDB records cannot be queried on server |
| Reports | ReportsPage: attendance, fees, pending, enrollment, payments, coach, batch | F | B / — | — | Mixed | Pending: full datasets, browser slice and summaries/chart aggregation |
| Coach portal | CoachPortalPage: students | B | B | B | B | Main table backend; local fallback/detail lists remain |
| Coach portal | CoachPortalPage: attendance history | B | B | — | B | Main table backend |
| Coach portal | CoachPortalPage: notifications | B | B | — | B | Main table backend |
| Coach portal | CoachPortalPage: batches | — | — | F | F | Pending: loads assigned batches then filters |
| Coach portal | CoachPortalPage: sessions, student/batch details, corrections, dashboard previews | F limit / — | Mixed | — | F | Pending: bulk bounded loads (up to 1000 sessions/2000 attendance), local subsets |
| Parent portal | ParentPortalPage: attendance | B | B | B | B | Backend query path |
| Parent portal | ParentPortalPage: payments | B | B | B | B | Backend query path |
| Parent portal | ParentPortalPage: notifications | B | B | — | B | Backend query path |
| Parent portal | ParentPortalPage: fees, linked children, batch schedule/coaches | — / B limit | B | — | Mixed | Pending: fees fetched across all pages for browser summary; embedded collections |
| Parent portal | ParentChildProfilePage | — | — | — | Mixed | Pending: attendance summary from loaded workspace |
| Parent portal | ParentDashboardPage | — / B limit | B | — | Mixed | Pending: unpaged financial/attendance data used for summaries |
| Dashboard | DashboardPage / SupabaseDashboardRepository | B limit / Mixed | Mixed | — | Mixed | Backend analytics plus role-specific browser summaries; review separately |
| Settings | UsersPage | B | B | B | B | Backend query path |
| Settings | AuditLogPage | B | B | — | B | Backend query path; column text filters serve search |
| System | SearchPage | B limit | B | B | — | Server bounds each category to 20; browser groups display categories |
| Settings/system | SettingsToolsPage permission matrix, settings tabs, design system, developer handoff | — | — | — | — | Static/configuration collections; not record listing APIs |
| System | ModulePage | — | — | — | F | Generic store-based summary; audit route use before changing |
| Forms | Student/parent/coach forms and relationship/specialization pickers | — | — | — | F / — | Form/reference collections, not paginated tables; large option sources need separate bounded lookup work |
| Shared | DataTable, Pagination, SortableHeader, FilterBar | Delegated | Delegated | Delegated | Delegated | Presentational; no row slicing/filtering |

## Evidence and required backend work

- Main directories/fees/batches/enrollments: `core/supabase/server-list.service.ts`, `domain-services.ts`, `features/students/student-list.service.ts`; SQL migrations `202610130001`, `008`–`011`.
- Users: `core/auth/user-management.service.ts` → `supabase/functions/admin-manage-users/index.ts`. Audit: `get_audit_log_page` (`202610130012`).
- Waitlist (resolved): `get_batch_waitlist_page` now returns joined names, filtered totals and a clamped page. Both capacity and allocation views use it; the staff-list request opts out of the legacy full `options.waiting` payload.
- Attendance workspace: `SupabaseAttendanceRepository.workspace/list` loops through every 500-row page. Manual/overview/QR consume this data locally. Needs scoped roster/recent/aggregate queries while preserving offline capture.
- Calendar: `AttendanceCalendarService.getMonthStats/getWeekStats` aggregates raw rows in the browser. Needs server grouped counts, independently of the already paged calendar list.
- Reports: `ReportsPage.paginatedRows` slices `report.rows`; services use `readAllPages`. Needs paged report rows plus server totals/aggregates so chart/export functionality survives.
- Coach: `CoachPortalService.loadBatches/loadStudents/loadDashboardAttendance/loadSessions` supplies browser-filtered detail/preview collections. Existing student/history/notification page APIs can guide the remaining endpoints.
- Parent: `ParentPortalService.load` uses `readAllPages` for fees; dashboards/profile pages compute summaries locally. Needs server fee/attendance summaries and bounded lists.
- Student timeline merges arrays from detail data, so its ordering/coverage depends on loaded history pages. Needs a dedicated ordered timeline query.
- Full exports intentionally iterate backend pages on user request. They are not a justification for loading all records during normal table display.
- Offline queues have no server representation until synchronization. Moving those operations would break offline functionality; retain local processing and label this exception explicitly.
- Backend source is available. No external API ownership blocker was found for server-backed views. New RPCs must preserve existing RLS and role scoping.

## Sequential implementation log

1. **NotificationsPage — completed.** Removed browser row filtering. Existing Supabase REST query now uses exact attendance template matching and birthday-family substring matching before paging/counting. Backend `total` (the existing totalCount contract) drives pagination. Added search debounce, identical in-flight request reuse, stale-response protection, page clamping after deletions, and cleared stale rows/counts on errors. UI unchanged; no migration/dependency required.
   - Validation: 10 tests across notification rendering, list state, and actual Supabase query serialization passed; production build passed.
   - Tests cover combined scope/status/category/search/order/range, total independent of page length, initial single load, debounce, pending request reuse, stale response, destruction, empty/error/retry and page reset/clamping.
2. **NotificationTemplatesPage — completed 2026-10-14.** Removed post-page SMS filtering; the existing backend exclusion applies before count/range. Reused backend `total`, filter/search/sort parameters and shared pagination. Added identical in-flight request reuse, page clamping, applied-filter snapshots, cleared stale rows during loading/errors, retry, and destruction guards. Birthday previews use a separate six-key query, independent of table filters/pages; photos load once rather than on every table interaction. Preview failures no longer fail the table. Mutations refresh template previews without refetching photos. No migration or dependency required.
   - Validation: seven focused state/query tests passed; production build passed. Tests cover combined parameters, count versus page length, resets, empty/error/retry, request deduplication, stale responses, destruction, bounded preview lookup and mutation refresh.
3. **BatchesPage waitlist — completed 2026-10-14.** User selected the recommended waitlist work and requested the Users & Roles column layout. Added sortable Student/Batch/Added headings with text/date filters directly beneath them, reset, independent shared pagination (5/10/20/50/100, default 5), debounce, duplicate pending-query suppression, stale/destruction guards, loading/empty/error/retry states and mutation refresh. New security-invoker RPC preserves RLS, uses academy-timezone dates, stable ID tie breaking, backend total and page clamping. Staff-list requests no longer download the full waitlist. Names come from the paged join rather than unpaged lookup arrays. Applies to Capacity and Student Allocation.
   - Validation: eight component tests and production build passed. Transaction-rollback SQL checks passed for sorting, joined filters, date filtering, counts, non-overlapping pages, empty-page clamping, invalid parameters, option suppression and RLS. Desktop screenshot inspected; mobile viewport had no document overflow. Migration `202610140001` deployed and recorded applied.
4. **Next: StudentDetailsPage timeline**, followed by the remaining pending components in the audit. Use sortable column headings and filters beneath each data column for subsequent tables, as requested. Components marked backend still require targeted lifecycle/interaction validation; this audit does not mark them completed.

## Batch column-filter follow-up ? 2026-10-14

Added the missing column-filter rows to the main Batch directory (batch/code, schedule, coach, capacity, status, monthly fee) and Student Allocation table (student/code, batch/code, status, start date). Extra toolbars remain removed. Text/date/number filters debounce, reset pagination, and execute before backend count/range. Added schedule/coach/fee and allocation-batch ordering. Migration `202610140002` deployed; eight component tests, rollback SQL checks, production build and desktop layout inspection passed.
