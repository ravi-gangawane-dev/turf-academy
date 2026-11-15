# Deployment readiness — 14 November 2026

## Decision

Not ready for production sign-off. The current production build succeeds, but lint and automated tests are not green, two newer database capabilities are missing, and the hosted frontend is not the current local build. This assessment made no application fixes, deployments, migration changes or external message sends.

## Fresh checks

| Check | Result |
|---|---|
| Production build | Passed |
| Lint | Failed: 3 errors |
| Full unit suite | 864 passed, 4 failed; 149 files, 868 tests |
| Script suite | 39 passed |
| Browser suite | 1 passed, 2 failed, 55 did not run; stopped after two repeated login-selector failures |
| Local production PWA/monitoring | 1 passed (monitoring), 1 failed (obsolete login-heading assertion) |
| Hosted login/password-setup routes | HTTP 200, app shell present |
| Hosted error-collector route | GET returns 405 JSON, matching expected method handling |
| Invitation function | Version 14 ACTIVE, JWT verification enabled |
| Netlify CLI authentication | Not logged in |

Evidence: `artifacts/readiness-2026-11-14-{build,lint,unit,scripts,browser,pwa}.log`; hosted evidence: `artifacts/readiness-2026-11-14-hosted.json`. Browser run used port 4205 to avoid interfering with the existing server on 4203.

## Code and test failures to resolve

1. **Lint:** preserve caught error causes at `src/app/features/coach/coach-portal.service.ts:400` and `src/app/features/profile/user-profile-page.ts:384`; associate the label with its form control at `src/app/features/settings/academy-settings-page.html:100`.
2. **Settings unit test:** `academy-preferences.service.spec.ts` expects an object without the normalized address now returned by the service. Reconcile the expected contract.
3. **Notification unit tests:** three failures in `notification-list.spec.ts`; expectations omit the new `sent` count and expect four/five queries where five/six now run. Verify the intended count/filter contract and update implementation or tests accordingly.
4. **Browser login helper:** `e2e/helpers.ts` still requests the exact label `Email Address`; the current form label is `Email`. Both failed tests stop at this selector before login. Update the test contract and rerun the full suite. Today's failures do not establish broken login, attendance or dashboard functionality.
5. **PWA test:** expects a heading matching `Login to`, while the current heading is `Welcome Back`. Correct this assertion and complete the test. This failure does not establish a service-worker defect.

The 12 November passing suite is historical evidence and does not certify the changed code today.

## Remote database dependencies

Read-only queries confirm:

- `202611040001` and `202611040002` remain applied (RBAC guard/catalogue).
- `202611130002`, `202611140001` and `202611140003` are recorded as applied (profile photo, standardized addresses and optional personal fields).
- **`202611120001_print_document_settings.sql` is absent**, and `print_registration_number`, `print_terms`, `print_footer_note` columns are absent. Current code separately saves basic settings and reports an error when nonempty print settings cannot be saved. Apply/verify the migration before offering configurable print settings.
- **`202611140002_fee_summary_collected.sql` is absent.** Live `get_fee_charge_summary()` returns students/total/pending/overdue, but no `collected` property. Current UI service defaults the missing value to zero, so collected totals can be misleading until this migration is applied and verified.
- **`202611130001_profile_self_service.sql` is absent from history**, although later staff/coach self-update RPC signatures exist. `sync_parent_profile_identity` was absent from the function lookup. Reconcile the intended migration effects and parent identity synchronization before changing history or blindly reapplying the old migration; later migrations replaced function signatures.
- Notification automation job remains inactive.

Evidence: `artifacts/readiness-2026-11-14-db.json`, `artifacts/readiness-2026-11-14-new-migrations.json`, `artifacts/readiness-2026-11-14-rpcs.json`.

## Hosting status

Hosted main bundle: `main-WPRRKRGI.js`. Current production build: `main-L2ZGFSOM.js`. The hosted frontend changed since 12 November but still differs from today's local build.

The previous missing error-collector route finding is superseded: it now returns HTTP 405 with JSON for GET, as the current implementation requires. Actual accepted report ingestion and hosted log retention were not checked today. Local production monitoring test passed.

Netlify CLI still reports no authenticated session. A valid authorized session is needed to publish through this environment. The pending authorization in the conversation is not proof of successful authentication.

## Remaining operational acceptance

- Run all four roles through authenticated hosted workflows, access restrictions, profile/address/photo updates, enrollment, attendance, payments, refunds and reports. No E2E credentials are configured in this environment; these checks were not run today.
- Verify administrator invitation-link generation, recipient acceptance and token-backed password recovery on the hosted frontend. Backend deployment alone is not end-to-end acceptance.
- Confirm a fresh backup and rollback plan. Latest local restore-verified native archive found is dated 5 November; historical scope excluded uploaded object bytes and hosted/provider settings. No new restore rehearsal was performed today.
- Verify notification provider configuration and authorized delivery if included at launch. Last secret check on 12 November found no notification email provider secrets and WhatsApp delivery remained unconfirmed. Provider secrets were not rechecked today. Scheduler is freshly confirmed paused.
- Complete physical Android/iOS QR and installed-PWA acceptance where included in launch scope. Offline attendance remains intentionally disabled.

## Recommended next sequence

1. Resolve lint and test-contract failures; obtain a clean full test run.
2. Review/apply missing print and fee-summary migrations; reconcile profile self-service effects and verify behavior.
3. Authenticate Netlify and publish the intended frontend/functions.
4. Verify hosted release identity, collector ingestion and the live acceptance workflows above.
