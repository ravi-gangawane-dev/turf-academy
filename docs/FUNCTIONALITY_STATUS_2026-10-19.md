# Functionality status — 19 October 2026 (fresh verification)

Independent re-verification of the whole repository. All local checks were rerun today against
the current workspace source; historical claims from earlier documents were not counted unless
reconfirmed. Live-database results are quoted from [live release verification](LIVE_RELEASE_VERIFICATION.md)
(19 October, same source revision); no live records were created or changed by this pass.

## Fresh local results (19 October)

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` | **PASS** (exit 0, ~18s) |
| Unit suite | `npm test -- --watch=false` | **PASS — 211 tests, 51 files** |
| Mock browser suite | `npm run test:e2e -- --reporter=list` | **PASS — 28/28** (one transient `net::ERR_NETWORK_CHANGED` failure; the same test passed on isolated rerun, so 27 + 1 flake) |
| Production PWA check | `npm run test:e2e:pwa` | **PASS — 1/1** (manifest/icons, service-worker registration) |
| Dev server startup | `npm start -- --configuration e2e` | **PASS** — served HTTP 200 after ~31s build |

### Tooling issue found (not an app defect)

This shell exports `PORT=0`. The Angular dev server prints
`Environment variable "PORT" detected. Using port 0.` and binds a **random** port, ignoring
`--port 4203`. Playwright's `webServer` then times out after 120 s waiting on 4203.
Workaround used: `env -u PORT npm run test:e2e`. Consider unsetting/overriding `PORT` inside
`playwright.config.ts`'s `webServer.command` or the npm script so mock e2e is reproducible.

## Working (verified locally today, and live where noted)

- **Authentication** — login, session restore, logout, session-expired and route-guard redirects for all four roles (mock suite + live 19 Oct).
- **Role isolation** — coach/parent rejections on staff routes and unauthorized landing (mock suite; six live role-isolation cases on 19 Oct).
- **Students / Parents / Coaches / Batches** directories — list, column filters, sorting, pagination, responsive layouts at 1440 px and 390 px (mock layout suites). Live CRUD beyond core slice not certified.
- **Enrollments** — create, pause, reactivate, transfer, cancel, history with filters/pagination/CSV (fully exercised live on 19 Oct for Admin and Receptionist, including failed-save recovery).
- **Attendance** — manual check-in/out, QR **token** check-in/out, failure messaging, offline browser-queue replay-exactly-once (live 19 Oct); history filters + CSV, calendar month/week/list, exports (mock suite).
- **Attendance corrections** — approve, reject with reason, duplicate prevention (four live cases, 19 Oct).
- **Fees & payments** — charge creation, partial/full settlement, lost-response recovery, duplicate-reference protection, overpayment rejection (live 19 Oct); refund accuracy proven by rolled-back SQL regression (partial/full, idempotency, net balance, top-up).
- **Receipt PDF**, enrollment/history/parent/audit CSV exports, paginated JSON records export.
- **Account recovery** — operator-assisted flow verified live (eight-digit code fix); invalid/expired-code and reset UI covered by 12 unit tests.
- **Accessibility & responsive** — axe checks pass on login and dashboard; all layout specs pass at desktop and mobile widths.
- **PWA shell** — production manifest/icons and service-worker registration (browser level).

## Partially working / unverified

| Area | What works | What is missing |
|---|---|---|
| **Events / Holidays / birthday automations** | Full UI (`/notifications/events`), services, and four local migrations (rollback-tested, 14 assertions) | Table `academy_events` and the automation functions are **absent from the linked Supabase project** — the live Events page will error. Deployment candidate is staged, awaiting approval. |
| **External notifications (email)** | In-app logs, templates, delivery-status views; edge function `notification-delivery` with Resend providers implemented | Provider secrets not configured; no real message has ever been sent (LIVE-03 BLOCKED). |
| **SMS** | Legacy delivery code for old records | SMS route/page intentionally removed (FIX-06); not a configurable channel any more. |
| **Account recovery by email** | Operator-assisted reset works live | Actual recovery **email delivery** unverified; support operator/host not assigned. |
| **QR attendance** | Token entry, simulated-camera decode, permission-denial flows (mock + live token entry) | Physical camera scanning on a real phone never tested (DEVICE-01 BLOCKED). |
| **Offline PWA** | Browser queue replay verified live | Real device install/update/reconnect acceptance never done. |
| **Dashboard, reports, portals, calendar** | Correct results at current data volumes; many lists moved to server-side paging | Several views still download whole workspaces or aggregate in the browser (attendance workspace, calendar month/week stats, report rows, coach/parent portal summaries, student timeline) — see `TABLE_OPERATIONS_AUDIT.md` "Pending" rows. Scalability risk on large datasets. |
| **Backup / restore** | Records-only JSON export of 28 tables | Excludes uploaded files and auth accounts; **no restore UI**. Operational backup must be arranged separately. |
| **REST backend (`api/openapi.yaml`, `http-*` repositories)** | Contract and HTTP repository implementations exist | No server implements `/api/v1`; the app runs on the Supabase backend everywhere. Dead/unused path (nginx proxy only matters if this backend is revived). |

## Not working / not established

1. **No deployment** — no host/domain identified; artifact is packaged in `tmp/release-2026-10-19/` only. Deep-link, cache and rollback behaviour on a real host is untested.
2. **Backend hygiene on the linked project** — 12 local migrations are missing from the migration ledger (six of them are actually applied; do not bulk-replay). Security advisor reports a mutable `search_path` on `change_enrollment_status`, anonymous/authenticated security-definer warnings, and disabled leaked-password protection.
3. **Physical-device acceptance** — QR camera, PWA install, offline replay on Android/iOS (BLOCKED on target devices).
4. **External message delivery of any kind** — never demonstrated (BLOCKED on provider config + authorized recipient).
5. **Git history** — the repository has **no commits**; everything is staged but never committed. There is no version-control safety net yet.

## Environment notes

- Default `npm start` (development) targets the live Supabase project `ttuigbkaluozglzgepsh` with
  `useMockApi: false`; local development touches real data. Only the `e2e` configuration uses mocks.
- A developer's dev server is running on port 4200 in this workspace; mock e2e deliberately uses 4203.
- `PORT=0` in this shell breaks Playwright's mock suite (see tooling issue above).
