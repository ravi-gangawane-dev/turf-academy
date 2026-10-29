# Continuation status

Updated: 29 September 2026

## UI consistency follow-up (29 September)

Resumed the unfinished UI review from the saved screenshots and reports in `tmp/ui-review`. The previous `after/report.json` contained 342 page/viewport reviews with three remaining overflow results: the Admin attendance calendar at desktop width and the Parent child profile at tablet and phone widths.

- Attendance Calendar now puts the monthly summary and legend below the calendar. Its month grid and record table scroll within their own containers, including the additional phone overflow found in List view. Week entries use responsive cards, and calendar navigation and view selection expose accessible labels/state.
- The Parent child profile uses shrinkable grid columns and wraps long contact details. Photos, profile metrics, documents and all five tab panels stay within the page; tab labels remain intact in a horizontally scrollable tab bar.
- The shared filter bar's border reset targets only its search field, preserving the date field border. Calendar view buttons now retain their styling inside the shared filter component.
- Dashboard captions and empty-state text use the shared muted color. Sidebar help text has sufficient contrast against its dark background.

Verification:

- Production build passed after the final changes: `npm run build`.
- All 97 unit tests passed when resuming the existing UI changes; subsequent edits were to styles and templates.
- All 10 distinct local browser cases passed across runs: nine passed in the initial suite, and both accessibility cases passed after correcting the dashboard/sidebar contrast failure.
- The live dialog case passed: initial focus, forward/backward focus wrapping, Escape dismissal, restored trigger focus and mobile dialog bounds. The confirmation was dismissed without deleting a batch.
- All 48 targeted live page/view/viewport checks passed with no document/main overflow or browser exceptions: calendar Month/Week/List and child profile Overview/Attendance/Fees/Documents/Medical at 1440, 1280, 1024, 768, 390 and 320 pixels.
- Final screenshots and the targeted report are saved under `tmp/ui-review/continuation-after/`; the read-only review script is `tmp/continue-ui-review.mjs`. These local review artifacts are ignored by Git.

No website deployment or business-record changes were performed. The historical full Admin audit remains broader than this UI follow-up.

## Admin settings and workflow follow-up (25 September)

Completed the pending settings routes: `/settings/roles` opens user management, `/settings/permissions` displays the application's role permissions, `/settings/theme` saves a device-specific appearance, and `/settings/backup` downloads academy records as JSON. All four routes require Admin access.

The export reads 28 tables in ordered pages, including composite keys for relationship tables. It downloads only after all queries succeed, prevents overlapping requests, and clears an earlier success message when a new attempt fails. Uploaded file contents, login accounts, QR tokens and audit history are excluded; this is a records export with no database restore capability.

The pending staff form labels, status announcements and refund validation messages are retained. Payment regression tests verify retry references, the remaining refundable amount, settlement filters and server totals.

Verification during this continuation:

- The final production build passed (`npm run build`).
- All 94 existing unit tests passed. The final targeted settings/payment run passed seven tests, including two new export failure/concurrency regressions (96 distinct tests across both runs).
- All four live priority workflow cases passed: Admin and Receptionist batch creation/editing, coach assignment, waitlist promotion, staff details, search, dashboard charts, invoice download, and payment recovery/settlement. Test fixture cleanup also passed.
- Live role checks passed for Receptionist, Coach and Parent: all were rejected from the roles, permissions, appearance and data export routes.
- The live Admin settings case passed: permission reference, appearance persistence after reload, export rejection/retry, valid JSON containing all 28 tables, and mobile layout. The downloaded test file was removed. The failure injection uses HTTP 400 because the database client automatically retries transient HTTP 503 reads.
- Both local browser route smoke tests passed, including all settings routes.

This follow-up does not certify every item in the historical Admin audit. No website deployment was performed.

## Completed fixes

Monthly Charges converted cached totals from rupees to paise again on every filter or page change. For example, a collection of Rs 12,500 appeared as Rs 1,250,000 after one filter change. `FeesPage` now converts only a newly fetched summary and preserves existing totals during list updates.

The component regression verifies stable totals after repeated status changes and pagination. The route-coverage browser test has a 120-second overall timeout and names each route as a test step.

The eight follow-up issues have been addressed:

1. Enrollment pages load students, batches, plans and enrollments from Supabase, including data beyond the first server page.
2. Creation, transfer, pause, cancellation and reactivation await database writes. Failures preserve inputs and do not navigate or display false success. Duplicate submissions are blocked. Action links visibly select the intended enrollment after options load.
3. Monthly Charges records payments through `PaymentsService`, preserves the retry reference, recovers an exact committed payment after a lost response, and refreshes balances and totals.
4. Monthly charge creation saves to Supabase using the student belonging to the selected enrollment. It validates the month, enrollment validity and amount, and reports duplicate charges.
5. Enrollment forms contain supported fields with date validation and persisted notes/reasons. Student profile information links to the profile editor; unsupported scheduling, refund and discount controls were removed from enrollment forms.
6. The enrollment fee-plan route uses the existing Supabase-backed Fee Plans page.
7. History reads actual events, dates, reasons and actors. Filters, pagination and CSV export use database results; export includes every matching page.
8. Component, service, SQL and live browser regressions cover successful writes, failure handling, refresh persistence, history export, money amounts and role restrictions.

## Backend deployment

Migration `202609230001_staff_enrollment_workflows.sql` was deployed to the linked Supabase project on 24 September 2026. Receptionist creation and transfer previously failed because locking a batch applied its Admin-only UPDATE policy. The two existing RPCs now use owner privileges with an empty search path and retain explicit active Admin/Receptionist checks. Direct table permissions were not expanded; anonymous execution is revoked.

`supabase/tests/staff_enrollment_workflows.sql` verifies Receptionist creation/transfer, history attribution, unchanged direct batch permissions, and Coach/Parent rejection. It passed with the proposed migration in a rollback-only transaction before deployment and against the deployed functions afterward.

## Verification

- Production build passed: `npm run build`.
- 80 distinct unit tests passed across the full suite and targeted runs: 73 initial tests, six added service regressions, and one added action-selection regression. The final enrollment component run passed all ten tests.
- All four live cases in `e2e/live-enrollment-fees.spec.ts` passed across targeted runs. Admin and Receptionist exercised the complete enrollment/charge/payment/history UI. Coach and Parent were rejected by both route guards and database mutations. One Receptionist run timed out during a data load and passed on an isolated rerun.
- Live checks include a lost payment response, overpayment rejection, persisted amounts and balances, action reasons, 21-event history pagination/export, filters, and mobile viewport checks.
- Linked database lint reports no schema errors.
- Temporary records from the interrupted test attempt were removed; a targeted database query confirmed none remained. Successful runs clean up their own fixtures.
- The earlier local browser suite passed all ten cases across targeted runs.

## Scope

The eight issues above are the completed scope. This does not certify every feature in the older Admin audit. See [project functionality](PROJECT_FUNCTIONALITY.md) for the feature catalog. The Angular production build is available locally; no website deployment was performed during this continuation.
