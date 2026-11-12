# Deployment readiness — 12 November 2026

## Current decision

Local browser blockers are resolved: all 58 browser tests passed in a single full run. The invitation-link backend is deployed and the previously disputed RBAC migrations are confirmed present remotely. Production handover is not yet signed off: the hosted frontend differs from the current build, the hosted error-collector route returns HTML, and authenticated acceptance and operational checks remain incomplete.

This report supersedes the earlier readiness summaries in this file. No frontend deployment, remote migration changes, account creation or external message delivery occurred during this recheck.

## Fresh automated results

| Check | Result | Evidence |
|---|---|---|
| Production build after toast fix | Passed | `artifacts/recheck-build-2026-11-12.log` |
| Lint | Passed, zero errors | `artifacts/recheck-lint-2026-11-12.log` |
| Full mock browser suite | **58 passed in one run**, 7.5 minutes | `artifacts/recheck-browser-2026-11-12.log` |
| Full unit suite | 795 passed, 3 timed out out of 798 tests / 143 files | `artifacts/recheck-unit-2026-11-12.log` |
| Unit timeout rerun | All 34 tests in the three affected files passed without code or timeout changes | `artifacts/recheck-unit-timeouts-2026-11-12.log` |
| Script tests | 39 passed | `artifacts/recheck-scripts-2026-11-12.log` |
| Local production PWA and monitoring | 2 passed | `artifacts/recheck-pwa-2026-11-12.log` |

The initial unit timeouts occurred while other checks were running. Their cause is not established; they did not reproduce in the targeted rerun. All 798 unit cases have passing coverage across the full run and rerun, but this is not a clean single-run 798/798 result. Keep the timeout instability visible in CI.

## Confirmed remote state

| Area | Verified finding | Implication |
|---|---|---|
| Invitation backend | `admin-manage-users` version 14 ACTIVE with `verify_jwt: true` | Deployment task complete |
| Deployed source | Version 14 downloaded source matched local after deployment | Link action is deployed |
| Endpoint protection | Unauthenticated POST returned 401; OPTIONS returned 200 | Basic authentication gateway/CORS checks passed |
| Invitation configuration | `INVITE_REDIRECT_URL` secret exists | Secret presence only; actual redirect/token flow remains unverified |
| RBAC migrations | Versions `202611040001` and `202611040002` are in remote migration history | Do not reapply based on the stale issue register |
| Profile protection | `guard_profile_access_change` and `audit_profile_access_change` triggers enabled | Database guards installed; HTTP/session acceptance still needed |
| Role catalogue | Admin, Receptionist, Coach and Parent rows exist | Catalogue installation confirmed |
| Notification automation | `academy-notification-automations`, hourly schedule, `active: false` | Scheduler is currently paused |
| Notification email | `RESEND_API_KEY` and `NOTIFICATION_EMAIL_FROM` absent from Edge secret metadata | Provider-backed notification email is not configured via the expected secrets; auth email is a separate system |
| WhatsApp | Account/auth/from/content SID secret names exist | Values and actual delivery are not certified; prior invalid ContentSid finding remains unresolved |

Remote evidence: `artifacts/recheck-rbac-2026-11-12.json`, `artifacts/recheck-database-2026-11-12.json` (scheduler), `artifacts/recheck-functions-2026-11-12.json`. Read-only SQL inspected metadata and did not modify migrations or business records.

## Hosted frontend and monitoring

- `/auth/login`, `/auth/set-password` and `/auth/reset-password` return HTTP 200 with the app shell. This establishes route availability, not successful login or token acceptance.
- Hosted bundle is `main-NOAUZKXD.js`; current local production bundle is `main-OEA3LP2I.js`. The hosted site is not serving this exact build.
- `/manifest.webmanifest` and `/ngsw.json` respond successfully. Physical-device install/offline behavior is not established by these HTTP checks.
- GET `/.netlify/functions/client-errors` returns HTTP 200 and the app HTML. The current collector implementation should return HTTP 405 JSON for GET, so the deployed route does not expose the expected collector behavior. Deploy/repair it and verify actual report ingestion and hosted logs.
- Evidence: `artifacts/recheck-hosted-2026-11-12.json`.

## Live account verification limit

No E2E account credentials were configured in the environment. A read-only configuration probe attempted the repository's documented default test-admin login and received `Invalid login credentials`. No credentials were changed or accounts provisioned. Authenticated four-role workflows, administrator invitation-link generation, recipient acceptance and password recovery were therefore not verified in this recheck. Historical 10 November passing core-workflow evidence remains useful but is not a fresh production sign-off.

## Backup and recovery

The verified native backup remains `backups/native-2026-11-05T06-22-44-937Z`. Its manifest records a successful isolated restore of 80 tables and 1,105 rows. Today's archive SHA-256 matches the recorded hash. This verifies the existing archive's integrity, not a new restore rehearsal or current-data backup. Uploaded object bytes, hosted/provider settings, database-role passwords and ownership remain outside its documented recovery coverage.

## Pending tasks in priority order

1. **Deploy the intended frontend and error collector.** Verify deployed bundle identity, collector API behavior and actual hosted log ingestion.
2. **Supply working designated test-account access and run authenticated acceptance.** Cover all four roles, allowed/denied records and actions, disabled sessions, enrollment, attendance, payments, refunds, balances and report totals.
3. **Verify invitation-link generation and recipient acceptance, plus password recovery.** Backend deployment is complete; confirm the production redirect, password setup, intended role and subsequent login with controlled test accounts.
4. **Prepare a current backup and complete the required rollback/recovery coverage.** Existing restore-verified archive is from 5 November and excludes files/settings listed above.
5. **If notifications are in launch scope:** configure notification email, validate WhatsApp template/provider delivery with authorized recipients, and verify automation generation before deciding to activate the paused scheduler. No messages were sent and no scheduler was enabled by this assessment.
6. **If QR/PWA are in launch scope:** finish physical Android/iOS camera, installation and reconnect acceptance.
7. **Monitor unit-test timeout stability.** Three tests timed out in the initial parallel workload and all passed unchanged on targeted rerun; CI should produce a clean full run before final sign-off.

Resolved items: all five browser failures, invitation-link function deployment, and uncertainty about the two RBAC migrations. These should no longer appear as pending implementation/deployment tasks.

## Optional backlog

Profile sheets, batch printing, paper-size/orientation overrides, configurable letterhead/footer, localisation, temporary-password user creation, deletion/deactivation policy, multiple roles and per-user overrides remain scope-dependent follow-ups. Offline attendance remains explicitly disabled (`allowOfflineAttendance: false`); do not promise offline writes unless that scope is implemented and verified.

## Earlier fix and deployment evidence

- ToastService uses `untracked` for queue reads so attendance effects do not recreate dismissed notifications. Regression tests verify dismissal, unrelated notifications and new feedback. Stale manual-section and status-label browser assertions were corrected without removing checkout/history coverage.
- Invitation deployment upgraded version 13 to 14 after all 29 handler tests passed. Rollback source is under `artifacts/invitation-deploy-before-2026-11-12/`; deployed source snapshot is under `artifacts/invitation-deploy-after-2026-11-12/`.
- Deployment logs: `artifacts/invitation-deploy-2026-11-12.log`, `artifacts/invitation-deploy-tests-2026-11-12.log` and `artifacts/invitation-deploy-functions-2026-11-12.json`.
