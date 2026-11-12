# Deployment readiness — 12 November 2026

## Decision

Not yet signed off for production release because live verification and frontend deployment tasks remain. The five browser failures from the initial assessment are resolved locally. The invitation-link backend was deployed as version 14 on 12 November (see follow-up below). The hosted frontend main bundle differs from the local production build checked during the initial assessment.

## Invitation-link backend deployment — 12 November 2026

- Deployed `admin-manage-users` to project `ttuigbkaluozglzgepsh`, upgrading version 13 to version 14. Status is ACTIVE; `verify_jwt` remains true.
- All 29 invitation-handler tests passed before deployment. Comparison with the downloaded version 13 showed only the 110-line link-action addition.
- Downloaded version 14 source matches local source after newline normalization.
- Live unauthenticated POST returns HTTP 401; OPTIONS from the production frontend origin returns HTTP 200 with expected CORS headers.
- `INVITE_REDIRECT_URL` is present in project secrets. Its value and real redirect behavior were not verified by the metadata check.
- No invitation was generated, no account was created, and no email was sent. Authenticated administrator link generation and recipient acceptance remain unverified because no live administrator test session was configured.
- Rollback source: `artifacts/invitation-deploy-before-2026-11-12/supabase/functions/admin-manage-users/index.ts`. Deployed source snapshot: `artifacts/invitation-deploy-after-2026-11-12/supabase/functions/admin-manage-users/index.ts`.
- Evidence: `artifacts/invitation-deploy-2026-11-12.log`, `artifacts/invitation-deploy-functions-2026-11-12.json`, `artifacts/invitation-deploy-tests-2026-11-12.log`.

## Browser-fix follow-up — 12 November 2026

- Fixed the shared ToastService: its internal queue read now uses `untracked`, so publishing feedback from an Angular effect does not subscribe that effect to queue changes. Previously, dismissing a notification reran the attendance effect and recreated the same message.
- Added a regression test using a real effect and service, verifying dismissal stays dismissed, unrelated notifications do not recreate old feedback, and a changed source still publishes new feedback. All 6 toast-host tests pass.
- Updated two stale desktop/mobile test assertions reached after fixing dismissal: the manual section is directly visible (there is no longer a jump button), and the history status is `Checked Out`.
- Full browser run: 56 passed, 2 failed only on the stale status label. After correcting that expectation, both tests passed in a targeted rerun. All 58 browser cases therefore have passing coverage across the full run and final rerun; this is not a single 58/58 full-run result.
- Lint passes. No browser checks were skipped or timeouts increased.

Evidence: `artifacts/toast-fix-unit-2026-11-12.log`, `artifacts/toast-fix-lint-2026-11-12.log`, `artifacts/toast-fix-full-browser-2026-11-12.log`, `artifacts/toast-fix-manual-final-2026-11-12.log`.

The results below describe the initial assessment before this fix.

## Fresh results

| Check | Result |
|---|---|
| Production build | Passed |
| Lint | Passed, zero errors |
| Unit tests | 797 passed across 143 files |
| Script tests | 39 passed |
| Full mock browser suite | 53 passed, 5 failed |
| Local production PWA/monitoring checks | 2 passed |
| Hosted `/auth/login` | HTTP 200; app shell present |
| Hosted/current build comparison | Hosted `main-NOAUZKXD.js`; local `main-ENGMJFLY.js`: different bundles |

Logs: `artifacts/readiness-2026-11-12-{build,lint,unit,scripts,browser,pwa}.log`. Hosted HTML: `artifacts/readiness-2026-11-12-hosted.html`. Browser failure traces and snapshots: `test-results/readiness-2026-11-12/` (may be cleared by later test runs).

## Initial local failures — resolved by the follow-up above

Investigate and fix notification dismissal or its test synchronization, then rerun the five affected workflows. Each test expects zero notification articles after clicking Dismiss, but one remains after five seconds:

- Attendance history/calendar filtering and export.
- QR check-in, checkout and repeated-checkout prevention.
- Desktop manual attendance workflow.
- Mobile manual attendance workflow.
- Bulk check-in and search selection reset.

The failures occur after successful attendance feedback. They do not establish that attendance persistence is broken; later workflow assertions are not reached. Root cause has not been established by this audit.

Earlier failures for list filters, notification filters, mobile recovery validation, table-tool alignment and directory exports did not recur. The previously noted payment-unit mock failure did not recur in the passing full unit suite.

## Pending release tasks, in order

1. **Resolved:** five browser failures and their downstream assertions; see follow-up evidence above.
2. **Deployment resolved:** invitation-link action is live in version 14 with source and endpoint checks passed. Authenticated generation/acceptance still needs the live check described in item 5.
3. Reconcile remote RBAC migration state before any SQL changes. `RELEASE_READINESS_2026-11-04.md` records the access guard and role catalogue applied; `audits/NOT_WORKING_STATUS_2026-11-11.md` says not applied. Do not blindly reapply based on the latter report.
4. Run authenticated live acceptance for all four roles, including allowed/denied access and session disabling; rerun enrollment, attendance, payments, refunds, balances and reports. No E2E credentials were configured for this session, so these were not rerun today. The 10 November demo report remains historical evidence of the core flow and role-page checks passing.
5. Verify invitation acceptance and password recovery using real email/token flows on the production domain. Passing local recovery UI tests do not establish delivery or token handling.
6. Publish the intended frontend build and run the core workflow against the hosted URL; verify the deployed release identity and production error collector. HTTP 200 and local monitoring tests alone do not certify these.
7. Confirm a current backup and rollback plan. Prior native restore evidence covers database contents, not uploaded object bytes or all hosted/provider settings; close required recovery gaps.
8. Complete physical Android/iOS camera and installed-PWA checks if those capabilities are in the launch scope.
9. If automated notifications are promised at launch, verify provider configuration, authorized WhatsApp/email delivery and scheduler state. These remain historical operational gaps, not freshly reproduced failures.

## Optional backlog, not automatic release blockers

Profile sheets, batch printing, paper-size/orientation overrides, configurable letterhead/footer, localisation, temporary-password user creation, user deletion/deactivation policy, multiple roles and per-user permission overrides. Offline attendance is intentionally disabled; only treat it as a release gap if offline support is promised.

## Scope limits

Local browser tests use the mock backend. Local production PWA/monitoring checks do not prove hosted collector operation. No live account mutations, external message sends, backend deployment or remote migration changes were performed. Remote configuration and physical-device checks remain unverified today.
