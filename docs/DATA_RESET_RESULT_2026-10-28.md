# Completed test-data reset - 28 October 2026

The user confirmed the hosted records were testing data, waived the backup requirement, and approved retaining **ravi.gangawane.dev@gmail.com** while removing the other seven accounts. Earlier blockers in the impact report are historical. This reset does not authorize another reset.

## Outcome

- Project: `ttuigbkaluozglzgepsh` (shared by development/live/production configurations).
- 35 deployed public tables inspected. 30 business tables and two application-history tables cleared at execution time.
- One confirmed, active admin retained. Seven other Auth accounts and their profiles removed through the Auth Admin API. The retained password was not changed; session verification sent no email.
- Five uploaded business files removed through the Storage API; all six buckets and policies preserved.
- Academy configuration and 14 functional notification templates preserved, with references to removed profile authors cleared.
- No schema, triggers, constraints, functions, indexes, migrations or RLS policies dropped or disabled. Before/after public constraint/trigger/policy fingerprints match.
- Notification automation cron was already inactive and remains inactive. No seeds/provisioning scripts were run.

## Table results

Removed counts below refer to records present before the reset. Audit triggers generated additional transient audit entries during deletion; those were also cleared, but their incremental count was not separately logged. Four NEW login/logout audit entries appeared after reset during the interruption and were preserved. Temporary API verification fee plans were created and removed and are excluded from baseline counts.

| Public table | Before | Baseline removed | Latest count | Treatment |
|---|---:|---:|---:|---|
| `academy_events` | 1 | 1 | 0 | Cleared |
| `academy_settings` | 1 | 0 | 1 | Required configuration retained |
| `attendance_corrections` | 1 | 1 | 0 | Cleared |
| `attendance_records` | 3 | 3 | 0 | Cleared |
| `audit_logs` | 2781 | 2781 | 0 | Cleared |
| `auth_audit_logs` | 714 | 714 | 4 | Old 714 cleared; 4 new login/logout records preserved |
| `batch_coaches` | 0 | 0 | 0 | Cleared |
| `batch_days` | 3 | 3 | 0 | Cleared |
| `batch_waitlist` | 0 | 0 | 0 | Cleared |
| `batches` | 1 | 1 | 0 | Cleared |
| `coach_attendance_events` | 0 | 0 | 0 | Cleared |
| `coach_specializations` | 8 | 8 | 0 | Cleared |
| `coaches` | 6 | 6 | 0 | Cleared |
| `discounts` | 0 | 0 | 0 | Cleared |
| `enrollment_history` | 0 | 0 | 0 | Cleared |
| `enrollments` | 1 | 1 | 0 | Cleared |
| `fee_plans` | 1 | 1 | 0 | Cleared |
| `late_fee_rules` | 0 | 0 | 0 | Cleared |
| `monthly_charges` | 0 | 0 | 0 | Cleared |
| `notification_templates` | 14 | 0 | 14 | Required configuration retained |
| `notifications` | 232 | 232 | 0 | Cleared |
| `offline_attendance_queue` | 0 | 0 | 0 | Cleared |
| `parents` | 1 | 1 | 0 | Cleared |
| `payment_refunds` | 0 | 0 | 0 | Cleared |
| `payments` | 1 | 1 | 0 | Cleared |
| `profiles` | 8 | 7 | 1 | Retained admin |
| `qr_profiles` | 1 | 1 | 0 | Cleared |
| `receipts` | 1 | 1 | 0 | Cleared |
| `student_discounts` | 0 | 0 | 0 | Cleared |
| `student_documents` | 0 | 0 | 0 | Cleared |
| `student_medical_records` | 1 | 1 | 0 | Cleared |
| `student_parents` | 1 | 1 | 0 | Cleared |
| `students` | 1 | 1 | 0 | Cleared |
| `training_sessions` | 0 | 0 | 0 | Cleared |
| `vaccinations` | 0 | 0 | 0 | Cleared |

`notification_events` is declared in source migrations but absent from the deployed public catalog. It was not created or dropped. Dashboard/report values are derived; no standalone dashboard table was assumed.

## Authentication

| Account | Result |
|---|---|
| ravi.gangawane.dev@gmail.com | Preserved, active admin |
| receptionist@turf.local | Removed |
| coach@turf.local | Removed |
| parent@turf.local | Removed |
| tca_recep@gmail.com | Removed |
| vikram.sharma.parent@turfacademy.in | Removed |
| admin@turf.local | Removed |
| vivek.sharma@turfacademy.in | Removed |

The initially supplied ravi.d.gangawane@gmail.com does not exist and was not created. Provider-managed authentication/security logs were not manually purged. The public application history was cleared once; legitimate subsequent history is retained.

## Storage

| Bucket | Objects removed | Remaining at verification |
|---|---:|---:|
| `student-photos` | 1 | 0 |
| `student-documents` | 0 | 0 |
| `coach-photos` | 0 | 0 |
| `medical-documents` | 0 | 0 |
| `receipts` | 3 | 0 |
| `parent-photos` | 1 | 0 |

Branding, logos and default static assets are preserved. Five previously copied local recovery files remain in ignored backups/reset-review-2026-10-28; they are not served by the app. No restorable database backup was taken, as explicitly waived. Private manifests and execution evidence are in that ignored directory. Temporary administrative key files were removed.

## Frontend cleanup and fixes

One-time project-scoped cleanup runs before bootstrap in the updated build. It clears stale parent selection, mock session state and the two legacy attendance IndexedDB databases. It preserves the actual admin session, device theme and unrelated browser data; mock/E2E builds skip it. Blocked IndexedDB cleanup retries after older tabs close. Other browsers require a reload of the updated build; no remote claim is made to have cleared every device or old deployed build. Asset caches are retained, and the service worker has no API-response cache configured. URL filters reset when navigating to an unfiltered route.

Normal builds still use real APIs. Mock/E2E fixtures, design examples and CSV sample files remain isolated application/testing features and were not loaded into the database.

Validation discovered a pre-existing production-build error referencing a browser service-role environment property. Removed the browser administrative client path and restored fee-plan saves to the authenticated, RLS-protected API client. No administrative key was added to application source.

## Validation results

| Check | Result |
|---|---|
| Business zero counts / existing FK constraints | PASS: constraint-respecting deletion, all 30 business tables empty |
| Public business audit history | PASS: old records cleared; subsequent auth activity retained |
| Main administrator / other-account removal | PASS: one confirmed active administrator |
| Storage inventory | PASS: zero objects, six buckets retained |
| Public constraints/triggers/policies fingerprint | PASS: unchanged |
| Admin authentication | PASS: session verified without password change or email |
| Anonymous API write | PASS: valid fee-plan insert denied |
| New record visible | PASS: temporary fee plan created through authenticated API and visible on Fee Plans |
| Temporary record cleanup | PASS: deleted and absent after reload |
| Dashboard/charts | PASS: zero student/coach/batch/parent totals, zero fees, empty recent activity |
| Students/Parents/Coaches/Batches/Enrollments | PASS: routes render without JavaScript exceptions |
| Attendance/Fees/Payments/Reports | PASS: routes render, payment totals and pagination show zero |
| Notifications | PASS empty state via compatibility fallback; API limitation below |
| Users & Roles | PASS: sole retained administrator visible |
| Browser cleanup | PASS: stale child removed and unrelated storage preserved |
| Production build | PASS |
| Targeted settings/client tests | PASS: 10 tests across 2 files |

## Remaining limitations

1. Deployed notifications lack `manual_state` and the source-declared notification history table. Existing compatibility queries return HTTP 400 before falling back to a correct empty notification page. Full modern notification functionality requires a separately reviewed backend deployment. No schema deployment was folded into this reset.
2. Not every form/filter and every role login was exhaustively exercised. Other roles no longer have accounts. Provider logs/system tables, retained configuration and functional templates are intentionally not empty.
3. Cleanup code is in the local updated source/build. Other deployed clients need that build; reload the application and close older tabs if needed. No unrelated browser state was cleared.
4. Four fresh auth audit records appeared after reset; they were not erased. Do not rerun the broad reset to chase legitimate new activity.
