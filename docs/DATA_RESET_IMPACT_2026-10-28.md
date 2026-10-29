> Completed: see [final report](DATA_RESET_RESULT_2026-10-28.md). Earlier blocked statuses below were superseded by the explicit backup waiver and corrected administrator approval.

# Data reset impact review - 28 October 2026

## Latest user instructions and verification

The user identified the records as testing data and explicitly waived the backup prerequisite. The previous backup gate below is historical, not an outstanding approval requirement. The requested administrator to retain is `ravi.d.gangawane@gmail.com`. A fresh privileged Auth Admin API inventory found eight authentication accounts and **zero matching accounts**; the public profiles lookup also found zero matches. Consequently no deletion has been executed: preserving the specified administrator is not currently possible. Supabase CLI project access was available; the temporary service-role credential file was removed after the read-only auth inventory. Private auth identifiers are recorded under ignored backups/reset-review-2026-10-28/auth-users-inventory.json. Resolve the intended existing admin identity or explicitly authorize creation of that administrator and verify access before resetting.


Status: NOT EXECUTED. All deletion counts are zero. This is a preliminary API-visible inventory, not a certified full database inventory.

## Environment and safety gates

Development, live-test and production builds all reference hosted project `ttuigbkaluozglzgepsh`. Treat this as a production-connected reset. Localhost does not isolate its database. Separate production-specific authorization is required after the remaining gates below.

`npm run backup` was attempted on 28 October and failed: Docker is unavailable; no database backup started. No restorable database backup or restore rehearsal has been verified. No PostgreSQL client binaries or administrative database credentials were available in this session. Browser admin access is subject to RLS and is not a Supabase project administrator credential.

Five API-visible storage objects were copied into ignored `backups/reset-review-2026-10-28/storage/`. Each copy has a SHA-256 manifest and passed local readback verification. This is NOT a complete storage backup certification or a restore rehearsal. The storage manifest preserves original bucket/object paths for recovery; ownership still needs confirmation. No uploads or deletions were performed.

## Inventory coverage

Scanned 82 migration files: 36 declared public tables and 66 foreign-key evidence lines. Full evidence is in the private migration inventory. Later ALTER statements may change these relationships. Run `scripts/reset-review/inventory-readonly.sql` on the actual database to capture authoritative live tables, counts, foreign keys, policies, triggers, auth accounts and storage metadata, including objects absent from migrations. Inspect cron jobs and external notification workers separately.

`notification_events` is declared in migration 202610230001 but the API returned "Could not find the table public.notification_events in the schema cache". This may mean an unapplied migration or API/catalog exposure difference; do not assume it is empty or deploy migrations as part of this reset.

Counts below are exact only within the authenticated API role's visibility at the inventory time. They are not a transactionally consistent snapshot. An unavailable count is unknown, never zero.

| Public table | API-visible rows | Proposed treatment after approval | Deleted |
|---|---:|---|---:|
| `profiles` | 8 | Preserve trusted admin IDs; other profiles depend on auth removal approval | 0 |
| `students` | 1 | Delete business records | 0 |
| `parents` | 1 | Delete business records | 0 |
| `student_parents` | 1 | Delete business records | 0 |
| `coaches` | 6 | Delete business records | 0 |
| `coach_specializations` | 8 | Delete business records | 0 |
| `fee_plans` | 1 | Delete business records | 0 |
| `batches` | 1 | Delete business records | 0 |
| `batch_days` | 3 | Delete business records | 0 |
| `batch_coaches` | 0 | Delete business records | 0 |
| `enrollments` | 1 | Delete business records | 0 |
| `enrollment_history` | 0 | Delete business records | 0 |
| `qr_profiles` | 1 | Delete business records | 0 |
| `attendance_records` | 3 | Delete business records | 0 |
| `attendance_corrections` | 1 | Delete business records | 0 |
| `offline_attendance_queue` | 0 | Delete business records | 0 |
| `discounts` | 0 | Delete business records | 0 |
| `student_discounts` | 0 | Delete business records | 0 |
| `late_fee_rules` | 0 | Delete business records | 0 |
| `monthly_charges` | 0 | Delete business records | 0 |
| `payments` | 1 | Delete business records | 0 |
| `receipts` | 1 | Delete business records | 0 |
| `notifications` | 232 | Delete business records | 0 |
| `student_documents` | 0 | Delete business records | 0 |
| `student_medical_records` | 1 | Delete business records | 0 |
| `vaccinations` | 0 | Delete business records | 0 |
| `audit_logs` | 2781 | Separate explicit history/audit approval required | 0 |
| `auth_audit_logs` | 714 | Separate explicit history/audit approval required | 0 |
| `training_sessions` | 0 | Delete business records | 0 |
| `coach_attendance_events` | 0 | Delete business records | 0 |
| `academy_settings` | 1 | Preserve minimum configuration and branding; review populated fields | 0 |
| `payment_refunds` | 0 | Delete business records | 0 |
| `notification_templates` | 14 | Preserve required functional templates; approve custom/template data cleanup separately | 0 |
| `batch_waitlist` | 0 | Delete business records | 0 |
| `academy_events` | 1 | Delete business records | 0 |
| `notification_events` | UNKNOWN | Separate explicit history/audit approval required | 0 |

Dashboard totals and reports are derived from business tables/RPCs; no separate dashboard deletion is assumed. Generic services/appointments/customer modules were not identified as independent migration tables. Live catalog discovery is still required.

## Authentication

Eight public profiles are visible, including two admins. These are NOT a complete `auth.users` listing. No non-admin account or admin account is approved for deletion yet. Preserve both existing admins until the owner selects the required trusted administrator by UUID and verifies sign-in/recovery. Do not infer ownership from the name "Test Admin" or automatically pick the current browser user. Exact profile IDs/names/roles are in the private live inventory. Auth identities, sessions, MFA and provider data require a privileged backup/recovery plan; a profile export cannot restore authentication.

## Storage

| Bucket | API-visible objects | Local copies | Proposed treatment | Removed |
|---|---:|---:|---|---:|
| `student-photos` | 1 | 1 | Ownership review + explicit approval | 0 |
| `student-documents` | 0 | 0 | Ownership review + explicit approval | 0 |
| `coach-photos` | 0 | 0 | Ownership review + explicit approval | 0 |
| `medical-documents` | 0 | 0 | Ownership review + explicit approval | 0 |
| `receipts` | 3 | 3 | Ownership review + explicit approval | 0 |
| `parent-photos` | 1 | 1 | Ownership review + explicit approval | 0 |

An empty bucket-list response from a browser role is not evidence that no buckets exist. Six buckets were found in migrations and inspected by known name. Private manifest records exact object paths; storage cleanup must use the Storage API, not SQL deletes of storage metadata. Preserve branding in `public/`, icons, default assets and source configuration. Check references from retained settings before approving any object deletion.

## Dependency and automation impact

- Profiles reference auth.users; deleting an auth user can cascade its profile and affect linked parents/coaches and creator/actor foreign keys.
- Students feed parent junctions, QR profiles, enrollments, attendance, discounts, medical/document data, charges and payments. Enrollment history also references batches; payments reference charges; refunds and receipts reference payments.
- Batches depend on fee plans and have day/coach/waitlist junctions; coach assignment and attendance-event relations require live verification.
- Notification history intentionally has no FK to notifications, so deleting notification rows does not clear their history. Deletion must explicitly include approved notification_events if deployed.
- Parent/coach notification links use changed SET NULL policies in later migrations: cascade alone is not a complete reset.
- Audit triggers can create audit records while records are deleted; audited tables must be processed before approved audit cleanup. Auth actions can append more logs after the database phase.
- Notification cron and delivery workers can recreate data or send queued messages. Pause approved producers during maintenance and restore their settings afterwards. Do not disable triggers, RLS or constraints.
- Auth and Storage API deletion are not atomic with a SQL transaction. Maintain a resumable manifest and verified restore points for each phase.

## Frontend and fixtures

- Normal, live and production configurations use the real Supabase APIs (`useMockApi: false`). AcademyStore fixtures are gated by mock mode. They remain test fixtures, not production records; no seeds or fixtures were run.
- `supabase/seed.sql` contains no business inserts. Test provisioning scripts must not run after reset. Required notification templates in migrations are configuration and need classification rather than blanket deletion.
- E2E fixtures, mock repository, design/demo pages and sample import downloads remain source/test features; do not remove application features under a data reset. They are flagged for exclusion from normal business views, not declared deleted.
- Clear only reviewed app state on each deployment origin after approval: `parent-selected-child`, `turf-academy-session`, the target project's Supabase auth session (after confirming retained-admin credentials), reviewed persisted filters/drafts, `turf-academy-offline` and `turf-academy-coach-offline` IndexedDB databases. `academy-theme` is a UI preference, not business data, and can remain unless the user wants default appearance.
- Angular service worker configuration caches application assets only, not API data. Inspect actual cache names/origin scopes before deleting; never call broad localStorage.clear(), caches-wide deletion, or remove unrelated databases. Other browsers/devices require their own logout/state reset.
- Nothing in the current user's browser storage was cleared during this review.

## Validation status

| Check | Status |
|---|---|
| Migration/source inventory | Completed static review; live catalog pending |
| API-visible counts and known storage inventory | Completed, subject to RLS |
| Restorable database backup | BLOCKED - Docker unavailable |
| Storage local file checksums | PASS for five visible objects only |
| Storage restore rehearsal / ownership verification | PENDING |
| Full auth inventory and trusted admin selection | PENDING |
| Tables empty / no orphans | NOT RUN - reset not authorized |
| Empty API/dashboard/list/chart/pagination validation | NOT RUN against an empty environment |
| Create/read/delete validation record | NOT RUN - preserve current data |
| Post-reset authentication/RLS/schema comparison | NOT RUN |
| Records/accounts/objects removed | ZERO |

## Required next steps

1. Supply an approved privileged database/Supabase-admin connection through secure local configuration, not chat. Supply a separate isolated restore target or verified provider restore evidence. Repair Docker or use a supported backup environment without resetting Docker disks.
2. Run the read-only catalog inventory; reconcile all extra tables, policies, jobs and counts, and enumerate auth users. Confirm object ownership and choose retained admin UUID(s).
3. Take a consistent database backup covering business data, auth, storage metadata, schema, permissions, migrations and sequences; separately copy all owned storage bytes and required provider configuration. Restore into the isolated environment and compare data/schema/security/objects. Do not test restoration on this project.
4. Finalize the exact allowlist and deletion order from the live FK graph; rehearse the reset procedure on the restored copy. Refresh the impact report and backup before approval if live data changes.
5. Only then request explicit reset approval, separate production authorization, auth deletion consent, storage deletion consent and audit/history consent against the exact reviewed manifest.

No reset approval is being requested yet because backup and inventory prerequisites are unmet.
