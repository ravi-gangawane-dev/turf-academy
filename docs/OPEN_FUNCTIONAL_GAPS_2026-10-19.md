# Open functional gaps ? 19 October 2026

Current-source and read-only linked-backend audit. Inventory: 122 route declarations, 85 feature TypeScript files, 52 unit spec files and 28 browser spec files. Reviewed routes/features, service queries, provider functions, migrations, backup tooling and accumulated verification evidence. Fresh production build passed; fresh unit run passed 221/221 across 52 files. This is not a fresh live browser execution of every route or mutation.

## Confirmed unavailable or defective

| Function | Finding | Evidence |
|---|---|---|
| External notification email | Cannot deliver through the configured Resend integration: required server secrets are absent. Auth recovery email is a separate service and was verified locally. | Fresh Edge Function secret-name inspection; `supabase/functions/notification-delivery/index.ts`. |
| External email notifications | Required Resend API key secrets absent. No actual delivery acceptance. | Same secret inspection and provider implementation. |
| Scheduled birthday/event notification generation | Scheduled job `academy-notification-automations` exists but `active=false`; automatic generation is intentionally paused. This is not an assertion that the manual functions are broken. External sending is separately manual/provider-dependent. | Fresh `cron.job` read. |
| Client-hosted application | No production URL/deployment acceptance established. Localhost is not client hosting. | Latest release and recovery acceptance records. |

## Partial implementation or verification

| Function | Remaining limitation | Evidence |
|---|---|---|
| Events/Holidays create/edit/delete | Backend table is now present and prior SQL regression passed; full browser CRUD acceptance not established. Earlier reports saying backend absent are stale. | Fresh `to_regclass` check; backend release evidence in `tmp/audit/db/`; Events page/service source. |
| Production email recovery | Email receipt/reset/sign-in verified by user on localhost:4200; production redirect/domain and hosted flow remain unverified. | `docs/ACCOUNT_RECOVERY.md`. |
| QR attendance / installed PWA | Real Android/iOS camera, installation, updates and offline reconnect still need acceptance. Browser/token checks do not establish physical-device behavior. | `docs/QR_CAMERA_VERIFICATION_PLAN.md`. |
| Reports and parent summaries at scale | Reports fetch complete datasets and slice/aggregate in the browser; parent fees load all pages for summaries. Larger data volumes increase requests, memory and latency. | `domain-services.ts` report readers; `reports-page.ts` paginatedRows; `parent-portal.service.ts` fee reads. |
| Student/parent/coach photos, student documents and medical editing | Implemented; complete live upload/download/update/delete and cross-role acceptance is not established by the selected executed suites. | Form/profile/storage code; available tests versus recorded runs. |
| Batch setup, schedules, coach assignment and waitlist promotion | Implementation and live test scripts exist, but current complete live acceptance evidence for these cases was not established in this audit. Test presence is not a passing run. | `e2e/live-priority-workflows.spec.ts`; batch page/services. |
| Discounts and late-fee administration | Implemented and locally tested; full authorized mutation/reload and denial scenarios are not certified by the selected live results. | fee-operations-page and tests. |
| User invitation, role/status changes and broader academy settings | Implemented; selected read/access checks do not certify every invitation, role change, suspension and settings mutation. | users page, admin-manage-users function, live-settings-tools spec scope. |
| Full backup and restore | JSON export excludes files/auth; database dump script exists, but no complete storage/auth/config recovery or restore rehearsal is demonstrated; no backup scheduler configured. | `scripts/backup-database.mjs`, `docs/BACKUP_RESTORE.md`. |
| Release package freshness | Previously named recovery ZIP predates two changed application source files (attendance repository/calendar service), plus one changed spec. Fresh build passes, but that ZIP must be regenerated/verified before shipping latest source. | Compared `recovery-artifact-manifest.json` source hashes against current source. |

## Corrections to stale status lists

- Events backend and attendance workspace/day-stat RPCs are present in the linked database now.
- Local recovery email is verified by the mailbox owner; do not label all email recovery broken.
- Refund UI passed four live cases. Student deletion after a refund is a separate defect.
- Student timeline already calls `get_student_detail_page`; old claims that it only merges client arrays are not current.
- SMS is intentionally removed from configurable UI, and general PDF/REST-backend additions are scope choices, not existing broken functions.
- Permission matrix is a read-only display, not an implemented custom-role editor.

Fresh logs: `tmp/audit/current-gap-unit.log`, `tmp/audit/current-gap-build.log`. No customer records, notifications, schema or scheduled jobs were changed by this audit. Older release notes disagree with current workspace/live state; this report records the reconciled findings, not an exhaustive certification of all behavior.

Resolved after audit: student deletion with partial/full refund history is fixed by migration `202610190003`, applied to the linked project. Two live UI cases passed, along with rollback-only deletion and payment-accuracy regressions. Refund snapshots remain in the admin audit log; permanent deletion still removes the student and their ledger records.

Coach attendance/schedule truncation fixed: complete 500-row paged reads replace the 2,000/1,000 total caps, with stable ID tie-breakers, unchanged batch/date scope and errors on incomplete reads. Six new unit tests cover 2,401 attendance rows and 1,301 sessions with a 137-row server cap. Browser test with real Coach authentication and synthetic large responses passed, including 83% attendance and the final schedule entry. Remaining performance scope: browser aggregation/materialization and unpaged Coach roster/batch reads; this is not a server-aggregation redesign.
