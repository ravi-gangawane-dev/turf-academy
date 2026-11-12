# Admin & invitation authentication — implementation report (31 October 2026)

Extends the 30 October audit (`docs/ADMIN_AUTH_AUDIT_2026-10-30.md`) and invitation fix
(`docs/INVITATION_FIX_2026-10-30.md`). This turn implemented the missing invitation
lifecycle; it did not rebuild the working login, guards, splash or recovery screens.

Nothing was applied to a database, deployed to Supabase, or sent by email. Those steps
need approval/config and are listed under "Deployment steps".

## What changed

| Area | File | Change |
| --- | --- | --- |
| Database | `supabase/migrations/202610310001_invitation_lifecycle.sql` | `user_invitations` table + statuses, `profiles.onboarding_completed_at` / `last_sign_in_at`, RLS (admin read only), `complete_account_onboarding()`, `record_sign_in()`, operator-only `bootstrap_first_admin()` |
| Invite email | `supabase/templates/invite.html`, `supabase/config.toml` | Branded "You're Invited to Turf Cricket Academy" template (name + role from user metadata), registered under `[auth.email.template.invite]` |
| Edge function | `supabase/functions/admin-manage-users/index.ts` | Invitation rows, idempotent retries, `resend` / `revoke` actions, invitation status + last login in `list`, last-active-admin guard, audit logging, safe error codes |
| Service | `src/app/core/auth/user-management.service.ts` | `UserInvitation` types, `resend()`, `revoke()`, messages for the new server codes |
| Admin UI | `src/app/features/settings/users-settings-panel.{ts,html,scss}` | Columns: full name, email, phone, role, account status, invitation, last login, actions; resend/revoke row actions; pending-activation indicator |
| Auth | `src/app/core/auth/auth.service.ts` | `record_sign_in` on password login, `complete_account_onboarding()` after password setup |
| Activation | `src/app/features/auth/auth-utility-page.{ts,html}` | Read-only account email on the password screens |
| Routes | `src/app/app.routes.ts` | `/auth/set-password` (activation) and `/admin/users` (admin entry to the existing Users page) |

The existing invite dialog, login, splash, recovery screens, guards and role redirects
were preserved.

## Invitation flow

1. Admin opens **Settings → Users & Roles → Invite User** (also `/admin/users`).
2. The Edge Function verifies the caller's bearer token and an active admin profile.
3. It rejects an email that already has a profile (`account_exists`) and an existing live
   invitation (`invitation_pending`), so a retry cannot create a duplicate account.
4. An invitation row is written **before** the email is sent: `pending`, 7-day expiry,
   attempt counter. A failed attempt updates the same row to `failed` and is reused on
   retry (unique partial index on lower(email) for `pending`/`failed`).
5. `auth.admin.inviteUserByEmail` is called with `redirectTo` from the server-owned
   `INVITE_REDIRECT_URL` secret (https only, exact `/auth/reset-password` or
   `/auth/set-password` path). The role and display label are passed as user metadata for
   the email template; the role is **not** trusted from metadata.
6. The invited profile is updated with the chosen role and verified with a returned row.
   Failures keep the invitation live and return `invite_profile_failed`.
7. The user opens the link → Supabase session → `/auth/reset-password` (or
   `/auth/set-password`) → read-only email → new password via `updateUser`.
8. `complete_account_onboarding()` marks onboarding complete and the invitation
   `accepted` using the authenticated identity only. It cannot reactivate a suspended
   account.
9. Role-based redirect sends the user to their dashboard (`/redirect/*` → `/dashboard/admin`,
   `/dashboard/reception`, `/coach/dashboard`, `/parent/dashboard`).

Invitation statuses: `pending`, `accepted`, `expired`, `failed`, `revoked`. Expiry is
applied on every list/invite call. "Pending activation" is derived from the invitation,
so pre-existing accounts are not mislabelled.

## Root cause of the 502 invitation error

Two different failures shared one opaque response:

1. **Delivery**: with no custom SMTP, Supabase's default mailer only delivers to project
   team addresses and rejects other recipients (`email_address_not_authorized`). The old
   handler collapsed this and every other provider error into `invite_delivery_failed`
   (502) without logging the provider code.
2. **Post-send profile verification**: if the profile update did not return the intended
   role, the same 502 shape was returned, so "email failed" and "email sent, access
   unconfirmed" were indistinguishable.

Resolution: the provider code/status is now logged server-side, each cause returns a
distinct safe code (`invite_smtp_required` 503, `invite_email_invalid` 400,
`account_exists` 409, `invitation_pending` 409, `invite_rate_limited` 429,
`invite_delivery_failed` 502, `invite_profile_failed` 502), duplicates are blocked before
sending, and the invitation row records which attempt failed. The Angular service maps
each code to an actionable message; raw provider text is never returned.

## Required configuration (not done here)

1. **Custom SMTP** in Supabase → Authentication → SMTP (host, port 587, user, password,
   verified sender address/name) and verify the sending domain (SPF/DKIM). Without this,
   invitations to non-team addresses will keep returning `invite_smtp_required`.
2. **Redirect allowlist**: Site URL plus `<origin>/auth/reset-password` and
   `<origin>/auth/set-password`.
3. **Invite template**: `supabase config push` (or paste `supabase/templates/invite.html`
   and the subject into the dashboard).
4. **Function secret**: `INVITE_REDIRECT_URL=https://<origin>/auth/reset-password`
   (already set to `https://turf-academy.netlify.app/auth/reset-password` for the current
   deployment) and `supabase functions deploy admin-manage-users`.
5. **Migration**: apply `202610310001_invitation_lifecycle.sql` (`supabase db push` or SQL
   editor) — review before applying; it only adds objects.

## First administrator

`public.bootstrap_first_admin(p_email)` is operator-only: not granted to `anon` or
`authenticated`, refuses when any active admin exists, requires an existing
**email-confirmed** Supabase Auth user, promotes that single identity, and writes an audit
row. No password, role or email is accepted from a browser and there is no public
bootstrap route. It was **not executed**: the project already has active admins, so new
staff must use invitations.

## Tests actually run

| Check | Command | Result |
| --- | --- | --- |
| Edge-function handler (mocked Supabase) | `node --test scripts/admin-invitations.test.mjs` | **24 passed** |
| Angular auth/settings specs | `npm test -- --watch=false --include=src/app/core/auth/*.spec.ts --include=src/app/features/settings/users-settings-panel.spec.ts --include=src/app/features/settings/academy-settings-page.spec.ts --include=src/app/features/auth/*.spec.ts` | **67 passed, 12 files** |
| Production build | `npm run build` | **passed** (bundle generation complete) |

Covered by the edge tests: trusted redirect, alternate activation path, non-https
rejection, non-admin 403, expired identity 401, absent config 503, profile verification
failure, invalid role, existing account, duplicate pending invitation, retry on the same
failed row, five provider error mappings, resend via Supabase Auth, resend/revoke
refusals, revoke, last-active-admin guard, suspend → Auth ban, and partial ban failure.

## Status against the requested checklist

| Feature | Status | Files | Test result |
| --- | --- | --- | --- |
| First Admin creation | Partial — guarded operator function added, not executed (active admins exist) | `202610310001_invitation_lifecycle.sql` | Not executed |
| Admin login | Working (unchanged) | `login-page.*`, `auth.service.ts` | Existing specs pass |
| Invite Reception / Coach / Parent | Working in code; delivery needs SMTP | `admin-manage-users/index.ts`, `user-management.service.ts`, `users-settings-panel.*` | 24 handler tests |
| Email delivery | Blocked — no SMTP configured | `supabase/templates/invite.html`, `config.toml` | Not sent; cannot verify |
| Password setup | Working in code; payload path unchanged, onboarding now recorded | `auth-utility-page.*`, `auth.service.ts` | Existing specs pass |
| Role-based navigation | Working (unchanged) | `app.routes.ts`, `role-redirect-page.ts`, guards | Existing specs pass |
| Permission enforcement | Working (RLS + guards unchanged); admin UI adds last-admin guard | edge function, migration | Handler tests |
| Session management | Working for sign-in; suspension bans the Auth user, stale UI until refresh | `auth.service.ts`, edge function | Handler tests |
| User status management | Working: active/inactive/suspended + pending activation, invitation statuses | panel, edge function | Panel spec |

## Remaining blockers and findings

- Migration not applied; function not deployed; no SMTP credentials. Until all three are
  done, the live app keeps the previous behaviour, and the new columns/actions will error.
- Real email delivery, invite acceptance in a recipient's mailbox, and a live
  admin-login check were **not** performed. No accounts or passwords were created or read.
- Invited Parents/Coaches are still not linked to `parents.profile_id` /
  `coaches.profile_id`; their portal remains empty until an authorised operator links the
  record. This is unchanged and out of scope of the invitation lifecycle.
- Last-admin protection exists in the Edge Function and bootstrap function, but a direct
  admin SQL write could still remove the final admin. **Resolved 4 Nov 2026:**
  `202611040001_user_access_guard.sql` enforces the invariant for every `profiles` UPDATE,
  including direct and service-role writes; the Edge Function maps the trigger hints to
  friendly 409 responses.
- A role or status change is enforced by RLS on the next request, but an already-open
  client keeps its cached role/status until refresh or token refresh revalidation.
- Leaked-password protection (HIBP) remains unavailable on the current Supabase plan;
  minimum password length is 8.
