# Release blockers — verified against live Supabase, 2026-10-29

Project: `ttuigbkaluozglzgepsh` (`https://ttuigbkaluozglzgepsh.supabase.co`)
Method: read-only catalog queries + migration history + auth config. No writes were made.

Earlier notes (`docs/LIVE_RELEASE_VERIFICATION.md`, `docs/BACKEND_RELEASE_PREFLIGHT.md`,
16–19 October) are **out of date**: most of what they list as missing is now applied.

> **Update — writes applied this session.**
> `202610230001_notification_events.sql` and `202610230003_notification_manual_whatsapp.sql`
> were applied to the live project. `record_manual_whatsapp`, the `notification_events`
> table, `capture_notification_event` and the delivery-history trigger now exist and are
> verified; `anon` cannot execute the RPC, `authenticated`/`service_role` can.
> The CLI recorded them as `notification_events` (20261029093821) and
> `notification_manual_whatsapp` (20261029093855), so the two original version strings
> will still appear unrecorded in `supabase migration list` — that is a naming artefact,
> not a missing change.
> `202610230008_notification_filter_context.sql` was applied as well: `notification_filter_options`,
> `capture_notification_batch`, the `capture_notification_batch` trigger and the
> `source_batch_id` / `source_batch_name` columns + index on `notifications` now exist.
> That also fixes the batch filter on the notification list, which queried a
> `source_batch_id` column that did not exist.
> Manual WhatsApp and the notifications filter bar are therefore **fixed**; notification
> audit evidence is now captured for every future notification change.
> Recorded as `notification_filter_context` (generated version) — the original
> `202610230008` string will still show as unrecorded.

## Status by blocker

| # | Blocker | Verified state | Verdict |
| --- | --- | --- | --- |
| 1 | Events/Holidays missing in production | `academy_events` exists, RLS enabled, `set_updated_at` trigger present | **Cleared** |
| 2 | Migration ledger gap (12 versions) | 71 of 82 local versions recorded; 11 remain (below) | **Partially cleared** |
| 3 | Auth hardening | `password_hibp_enabled = false`, `password_min_length = 6`, `site_url = http://localhost:4200` | **Open — 3 fixes** |
| 4 | RLS coverage | RLS enabled on all 35 public tables; 3 views present | **Coverage OK**, policy-level tests still owed |
| 5 | Recovery email | Templates customised in Auth settings; SMTP host/user null → Supabase default mailer | **Open — needs host + smoke test** |
| 6 | Host/domain/cache/deep links | No deployment target in repo; `site_url` still localhost | **Open** |
| 7 | Physical QR/PWA | No device evidence in repo | **Open — manual** |
| 8 | CI + monitoring | CI added at `.github/workflows/ci.yml`; no error monitoring | **Partially cleared** |

## 1. Events / Holidays — cleared

`public.academy_events` exists in the live database with RLS enabled, so the Events UI
is no longer calling a missing table. The October note referred to `202610130002`, which
is now recorded in the migration history.

## 2. Migration ledger — 11 local versions not recorded

Applied history has 71 entries; the following local migrations have no ledger row:

| Version | File | Objects |
| --- | --- | --- |
| `202610130004` | `aarav_sharma_birthday.sql` | one-off data notification — intentionally excluded |
| `202610220002` | `notification_integrity.sql` | replaces `queue_parent_message`, `claim_notification` (both already exist) |
| `202610230001` | `notification_events.sql` | **`notification_events` table (missing), `capture_notification_event` (missing)**, delivery-history trigger |
| `202610230002` | `notification_automation_guards.sql` | `queue_automated_parent_whatsapp_notice`, `queue_birthday_email_for_notification`, `attendance_parent_notification` trigger — **already present** |
| `202610230003` | `notification_manual_whatsapp.sql` | **`record_manual_whatsapp` (missing)**, updates `claim_notification` / `capture_notification_event` |
| `202610230004` | `attendance_integrity_p0.sql` | `attendance_check_in`, `attendance_check_out` — **already present** |
| `202610230005` | `attendance_bulk_source.sql` | column/source change — present via later work |
| `202610230006` | `coach_attendance_hardening.sql` | `coach_mark_batch_attendance` — **already present** |
| `202610230007` | `notification_access_integrity.sql` | **`owns_notification_recipient` (missing)**, `notifications_scoped_read` policy, mark-read RPCs (RPCs present) |
| `202610230008` | `notification_filter_context.sql` | **`notification_filter_options` (missing)**, `capture_notification_batch` (missing), index |
| `202610230009` | `academy_settings_enhanced.sql` | `validate_academy_settings` + trigger — **already present** |

So the ledger gap was *cosmetic* for six of them (objects already exist from later,
out-of-band work). All four real ones are now applied: `202610230001`, `202610230003`, `202610230008` and
`202610230007` (which replaced the inline `notifications_scoped_read` policy with one
that calls `owns_notification_recipient` and requires an *active* parent/coach).
The ledger now only lacks rows for the original version strings; the objects exist.

### Frontend calls with no matching function (verified)

Only two RPC names used by the Angular app do not exist in the live database:

- `notification_filter_options` — used by the notifications filter bar
  (`src/app/features/notifications/notifications-page.ts`), added by `202610230008`.
- `record_manual_whatsapp` — used by the manual WhatsApp action
  (`src/app/features/notifications/notifications-page.ts`), added by `202610230003`.

Both will fail at runtime on the deployed app today. Their migrations are otherwise
additive (new table, functions, triggers, indexes, policies).

## 3. Auth configuration — three concrete fixes

| Setting | Current | Required for release |
| --- | --- | --- |
| `site_url` | `http://localhost:4200` | **deferred** — production origin not yet supplied; recovery links stay localhost until set |
| `password_hibp_enabled` | `false` | `true` (leaked-password protection) |
| `password_min_length` | `8` (**fixed 2026-10-29**) | matches the login form's validation message |

`password_hibp_enabled` **cannot be enabled on this plan** — the Management API rejects it
with "Configuring leaked password protection via HaveIBeenPwned.org is available on Pro
Plans and up."

**Decision (2026-10-29): accept the weaker control for now.** Password minimum length is
8; HIBP stays disabled until the project moves to a Pro plan. No code change is needed to
enable it later — it is a dashboard/API toggle.

`uri_allow_list` is redacted by the API, so the redirect allowlist must be confirmed in
the dashboard alongside `site_url`.

## 4. RLS — coverage verified, policy tests pending

All 36 public tables (35 plus `notification_events`) have `relrowsecurity = true` (none
forced), **and every one of them has at least one SELECT policy** — checked per table, so
no table is silently deny-all. The only tables without write policies are the intentional
read-only/trigger-written ones: `audit_logs`, `auth_audit_logs` (read+ledger write),
`batch_waitlist` (writes go through `manage_batch_waitlist`), `coach_attendance_events`,
`notification_events` and `payment_refunds` (written by `refund_payment`).

What remains is behavioural, not structural: an authenticated write/payment/refund test
per role on the deployed origin. Policy presence is not evidence that policies scope rows
correctly.

## 5. Recovery email

`mailer_templates_recovery_content` and subject are customised, but `smtp_host`,
`smtp_user`, `smtp_admin_email` are all null, so messages go through Supabase's default
mailer (rate-limited, and rejected for non-team recipients on some plans). Delivery is
still unverified end to end.

## 6. Host / domain / cache / deep links

`environment.production.ts` points at the live project, but no hosting target, domain or
cache policy exists in the repo (only `deployment/nginx.conf.example`). Deep-link
behaviour must be verified on the real host (SPA fallback to `index.html`).

## 7. QR / PWA on a physical device

**Automated half done (2026-10-29).** `e2e/pwa/pwa.spec.ts` was asserting a heading that
the login redesign removed (`Sign in to continue`), so the suite could never pass. It now
asserts the real `Login to …` heading, and the production bundle passes end to end:
valid manifest, every declared icon resolves, `ngsw-worker.js` registers and takes
control, and an offline reload still renders the app shell. `playwright.pwa.config.ts`
is wired into CI as the `pwa` job.

**Still manual:** camera permission, QR scan, offline attendance queue and the install
prompt on a real phone.

## 8. CI and monitoring

`.github/workflows/ci.yml` runs lint → unit tests → script tests → production build on
push and PR, uploads `dist/`, and adds a `pwa` job that installs Chromium and runs the
manifest/service-worker/offline suite against the built bundle.

**Error monitoring seam added (2026-10-29).** `src/app/core/monitoring/error-monitoring.ts`
defines `GlobalErrorHandler`, registered via `{ provide: ErrorHandler, useClass:
GlobalErrorHandler }`. It keeps console logging, then POSTs a redacted
`ErrorReportPayload` (message, stack, origin+path, release, timestamp; no query string,
no cookies, `credentials: 'omit'`) to `environment.monitoring.endpoint`, deduplicates by
message and caps at 20 reports per session. It is inert while `endpoint` is empty, which
is the case today in every environment file — filling one string activates it. Covered by
6 unit tests.

Remaining: choose a collector and set `environment.monitoring.endpoint` (+ `release`).

## Recommended order

1. Apply `202610230001`, `202610230003`, `202610230007`, `202610230008` to the live
   project (adds the two missing RPCs plus the notification-events table). Then record
   `202610220002`, `202610230002/4/5/6/9` in the ledger without re-running them, or
   reconcile them deliberately — never `db push --include-all`.
2. Set `site_url`, `password_hibp_enabled`, `password_min_length`, and review the
   redirect allowlist.
3. Configure SMTP (or accept the default mailer) and smoke-test password recovery on
   the deployed host.
4. Run authenticated write/payment/refund smoke tests per role on the deployed origin.
5. Physical QR/PWA acceptance.
6. Add error monitoring.
