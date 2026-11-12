# Known issues

Updated: 30 October 2026

This list consolidates the remaining issues discussed in the latest changes review. It is based on repository code and recorded audits, not a fresh live-system audit. An unverified item is not a confirmed defect. Older findings need rechecking before being treated as current production failures.

| ID | Issue | Status / evidence | Closure requirement |
| --- | --- | --- | --- |
| KI-01 | Automated WhatsApp delivery | Last recorded Twilio attempt failed with `The ContentSid is Invalid`. | Configure a valid template Content SID and verify delivery and provider status using an explicitly authorized recipient/message. |
| KI-02 | External notification email | Earlier audit found missing Resend credentials; no later delivery confirmation was established in this review. This is separate from Auth recovery email. | Recheck provider configuration and verify authorized email delivery. |
| KI-03 | Production password recovery | Local email receipt/reset/sign-in passed; hosted-domain acceptance remains unverified. | Verify production redirect configuration, email receipt, reset link, password change and subsequent login. |
| KI-04 | Production error monitoring | Current source includes a Netlify collector and production endpoint configuration. Deployment and live collection remain unverified; the older localhost configuration finding is superseded. | Deploy the current source and confirm a deliberately triggered browser error reaches function logs. Confirm operational log retention and alerting arrangements. |
| KI-05 | Physical-device QR attendance and installed PWA | Browser decoding and persisted check-in/out were verified. Physical Android/iOS camera and installed-app acceptance remain pending. | Verify camera permissions/scanning, installation, updates, offline operation and reconnect on target devices. |
| KI-06 | Payment charge-status enum casts | Local migration `202610300001_record_payment_status_cast.sql` restores explicit enum casts in `record_payment`. Live application and regression results were not established in this review. | Confirm the migration is applied and verify payment recording, partial/paid status, receipts and repeat-request behavior. |
| KI-07 | Scheduled birthday/event automation | Earlier audit recorded `academy-notification-automations` as intentionally paused. Current live scheduler state needs rechecking. | Confirm intended scheduling, verify generation behavior, and enable only when authorized and ready. External delivery has separate provider dependencies. |
| KI-08 | Full backup and restore | Earlier audit found no demonstrated complete storage/auth/config recovery or restore rehearsal, and no configured backup scheduler. | Recheck existing arrangements, establish required backup coverage and schedule, and record a successful restore rehearsal. |
| KI-09 | Events/Holidays CRUD acceptance | Backend presence and SQL regression were recorded; complete live browser create/edit/delete acceptance was not established. | Verify authorized create/edit/delete, reload persistence and access denial. |
| KI-10 | Photos, student documents and medical editing | Implemented; complete live upload/download/update/delete and cross-role acceptance remains unverified in the recorded scope. | Execute the relevant storage/editing workflows and role-isolation checks. |
| KI-11 | Batch setup, schedules, coach assignment and waitlist promotion | Implementation and test scripts exist; complete live acceptance evidence was not established. | Verify each workflow, persistence and role restrictions against the target backend. |
| KI-12 | Discounts and late-fee administration | Local tests exist; full live mutation/reload and denial scenarios remain unverified. | Verify authorized changes, resulting amounts, persistence and unauthorized-access rejection. |
| KI-13 | User invitations, role/status changes and academy settings | Selected read/access checks do not certify all administrative mutations. | Verify invitations, role changes, suspension and settings updates with appropriate access checks. |
| KI-14 | Broader database and deployed-function verification | Recent role checks cover notification filters/manual actions, not every table policy or deployed function. Older deployment findings may be stale. | Verify remaining relevant deployed migrations/functions and cross-role access; reconcile evidence without assuming missing migration version strings mean missing functions. |
| KI-15 | Reports and parent summaries at scale | Earlier audit recorded full-dataset reads and browser aggregation; coach paging fixes did not resolve every aggregation/roster performance concern. Current source behavior needs targeted rechecking. | Measure representative larger datasets and address excessive requests, memory use or latency where reproduced. |
| KI-16 | Release validation and artifact freshness | Current changes include staged, unstaged and untracked files. This review did not run tests or verify deployment; older packaged artifacts do not establish coverage of current source. | Run appropriate checks against the final source, prepare a current release artifact, and verify the deployed version. |
| KI-17 | Conflicting status documentation | Historical reports contain superseded claims, including absent RPCs and localhost production monitoring configuration. | Keep this list aligned with new evidence and update or clearly mark superseded reports. |

## Cleared findings

The latest recorded blocker recheck clears the following claims; they are not open defects in this list:

- Manual WhatsApp RPC is missing: live Admin/Receptionist QA exercised queueing, manual activity requests and cancellation. This does not prove external message delivery.
- Notification filter RPCs are missing: student, recipient and batch queries succeeded for Admin/Receptionist.
- Parent/Coach can use those staff notification operations: tested calls were denied with `42501`. This is limited to the tested workflows.
- Events backend is absent: the later functional-gap audit records that the table is present.
- All recovery email is broken: the mailbox owner confirmed local email recovery; production acceptance remains KI-03.

## Sources

- [Latest blocker recheck](BLOCKER_RECHECK_2026-10-29.md)
- [Earlier functional gaps and follow-up corrections](OPEN_FUNCTIONAL_GAPS_2026-10-19.md)
- [Repair tracker and verification scope](REPAIR_TRACKER.md)
- [Pre-GitHub audit](PRE_GITHUB_AUDIT_2026-10-29.md)
- [Production monitoring configuration](../src/environments/environment.production.ts)
- [Netlify error collector](../netlify/functions/client-errors.mjs)
- [Payment enum-cast migration](../supabase/migrations/202610300001_record_payment_status_cast.sql)

Close an item only when its closure evidence is recorded. No external messages, deployment, database changes or scheduler changes were performed while compiling this list.
