# Administrator authentication audit — 30 October 2026

This is the requested pre-change audit. No authentication implementation, production accounts, roles, passwords, or Auth settings were changed. No invitations/recovery emails were sent. Read-only live database inspection and existing local tests were used. The separate, previously requested Angular NG8107 template fixes were completed and built successfully.

## Current credentials and creation process

- First administrator: `docs/supabase-deployment.md` documents creating a user through Supabase Authentication, then promoting its matching `public.profiles` row in the trusted Supabase SQL editor. There is no public first-admin endpoint or production bootstrap script. The original creation method/password of an existing account cannot be established from this source inspection.
- Live verification found TWO active admin profiles with matching, confirmed Auth users: `ravi.gangawane.dev@gmail.com` and `qa.admin.20261029@turf.local`. These already existed; this audit created neither. The earlier requested main email, `ravi.d.gangawane@gmail.com`, is not either of these admin logins. Changing a contact email does not change an Auth login; any migration must update Auth and profile consistently after explicit approval.
- Login email is authoritative in `auth.users.email` and copied into `public.profiles.email` when the Auth account is created. The trigger synchronizes INSERT only, not later email changes.
- Passwords are submitted to Supabase Auth (`signInWithPassword`, `updateUser`, recovery). Application profile/business tables contain no password-named columns in the inspected live schema. Passwords/hashes were not selected or displayed. No production password is hardcoded in the inspected login path.
- `scripts/provision-live-test-accounts.mjs` is a separate test-only administrative script. It requires service-role credentials, explicit test-project confirmation, caller-supplied emails and a password; it resets existing test passwords and grants test roles. It is NOT a production first-admin workflow and was NOT run.

## Requested audit matrix

“Working” below means the inspected code/schema supports the stated behavior, not that a real email or password interaction was exercised.

| Component | Current implementation | Status | Recommended fix |
|---|---|---|---|
| First Admin creation | Trusted Supabase Auth creation + SQL profile promotion documented; existing admins verified | Partial | Provide operator-only, first-admin-only provisioning with explicit target confirmation, concurrent-operation lock and refusal when an active admin exists. No public bootstrap route. |
| Admin credentials | Auth email plus profile mirror; passwords managed by Auth | Working / operational verification pending | Confirm intended primary email; use invite/recovery links, never shared passwords; synchronize later email changes. |
| Supabase authentication | Real builds use Supabase; password sign-in followed by profile lookup | Working | Add real Supabase-path contract tests; keep E2E mock build out of deployment. |
| User profile mapping | `profiles.id` references `auth.users.id`; live INSERT trigger creates default parent role | Partial | Confirm profile UPDATE affects a row during invitation; explicitly link invited coach/parent to their domain record. |
| Role assignment | `profiles.role` enum; default parent ignores client role metadata; Edge function checks active admin | Working with gaps | Restrict privileged changes to a transactional server operation; enforce last-admin/self-access rules in the database too. |
| Route protection | Auth, role and permission guards; role comes from fetched profile | Working | Revalidate on role/status changes and token refresh, and centralize Supabase session-loss navigation. |
| Admin user management | Settings → Users & Roles → Invite User; all four roles; deployed Edge function present | Partial | Domain linking, robust activation state, idempotency/reconciliation, affected-row checks, safe error mapping and trusted redirect configuration. |
| Password recovery | Supabase email reset, recovery OTP, password update, logout after success | Partial | Verify actual email delivery, redirects, invitation activation and recovery in isolated tests; verify provider strength/rate-limit settings. |
| RLS protection | Live RLS on profiles, students, parents, coaches and student_parents; role and family checks verified | Working for inspected policies; full adversarial coverage missing | Add write-denial and cross-family tests in isolated database; enforce privileged-change invariants below Edge layer. |

## Existing flow and source locations

1. `src/app/features/auth/login-page.ts` submits credentials; no user-selected role authorizes login.
2. `src/app/core/auth/auth.service.ts` calls Supabase password authentication, loads `profiles` by the Auth UUID, validates role, `is_active` and status, and constructs the application session. Missing/inactive/suspended profiles fail login. Auth errors get generic UI messages.
3. `src/app/core/supabase/supabase-client.service.ts` configures Supabase with persistent session storage, automatic token refresh and URL session detection. Browser credentials are the publishable/anon configuration. Service-role access is confined to server/test tooling in the inspected paths; no service-role reference was found under `src`.
4. `src/app/core/auth/{auth.guard,role.guard,permission.guard,permissions}.ts` implement UI guards and the static role-to-permission matrix. There is no database permission-assignment table in this flow; database functions and RLS independently enforce access.
5. `src/app/features/settings/users-settings-panel.ts` and `src/app/core/auth/user-management.service.ts` invoke `supabase/functions/admin-manage-users/index.ts`. The server validates the bearer token via `getUser`, then independently requires an active admin profile before list/invite/update.
6. Invitation uses `auth.admin.inviteUserByEmail`, with full name metadata. The database trigger creates a default parent profile; the trusted function updates the intended role. The email link targets `/auth/reset-password`; `src/app/features/auth/auth-utility-page.ts` calls Auth `updateUser` and signs out after password creation/change. No administrator can retrieve passwords through these APIs.
7. The local Edge implementation is reviewed. Deployment listing confirms `admin-manage-users` ACTIVE, version 7, JWT verification enabled. Deployed source was not downloaded/compared; presence is not proof that all local changes are deployed.

Actual dashboard destinations (`app.routes.ts`, `role-redirect-page.ts`):

| Role | Intermediate route | Final destination |
|---|---|---|
| Admin | `/redirect/admin` | `/dashboard/admin` |
| Coach | `/redirect/coach` | `/coach/dashboard` |
| Receptionist | `/redirect/reception` | `/dashboard/reception` |
| Parent | `/redirect/parent` | `/parent/dashboard` |

## Verified relationships and authorization

- `auth.users.id` → `profiles.id` (FK, cascade deletion).
- `profiles.id` → `parents.profile_id` / `coaches.profile_id` (FK, SET NULL on deletion).
- `parents.id` → `student_parents.parent_id`; `students.id` → `student_parents.student_id` (FKs).
- Coach scope additionally uses `batch_coaches` and student `enrollments`.
- `current_user_role()` reads the database profile for `auth.uid()` and requires active status and `is_active`.
- Live `handle_new_user()` assigns literal `parent`, not metadata-supplied role. There were zero Auth accounts without a profile.
- Live profile SELECT permits self or admin. Writes require `is_admin()`. A normal parent/coach cannot assign themselves admin via this policy.
- Live `parent_owns_student()` requires parent role, active parent record and an explicit student-parent link. Coach helper requires coach role, active coach and active assigned enrollment.
- Supabase JWT identity plus server policies, rather than frontend storage values, authorize database access. The E2E mock authentication branch does derive a demo role from text and storage, but development/live/production environments inspected select Supabase and disable mock API.

## Gaps, risks and priorities

### P0 — release verification gates (not a confirmed unauthenticated escalation)

- Prove unauthorized role changes and cross-family reads/writes are rejected in an isolated end-to-end suite. Existing AuthService specs exercise the mock branch, and UI specs stub authentication.
- Verify hosted Auth signup policy, password requirements, rate limits/CAPTCHA, SMTP and exact redirect allowlist. `supabase/config.toml` only declares site/redirect URLs and the recovery template; it does not establish these hosted protections. Do not claim throttling solely because the UI translates a rate-limit error.
- Confirm whether the existing QA admin belongs in this deployment. No deletion/demotion was performed.

### P1 — implementation candidates requiring approval

- Invited Parent/Coach users are not linked to `parents.profile_id` / `coaches.profile_id`; invitation can succeed while their portal is unusable. Require explicit authorized record selection and reject conflicting links, not automatic email-based ownership assumptions.
- Invitation sends email before role/profile completion; `.update(...).eq(...)` does not verify an affected row. Failure can leave an invited account with a default/wrong role. Add pending activation/reconciliation and idempotent retry behavior.
- Access update writes profile, then Auth ban state in separate calls. Partial failure can leave inconsistent status. Reconcile failures; retain database deny checks as the immediate protection.
- Self-demotion is blocked only in the Edge function. Live admin profile write policy permits direct admin writes that bypass that safeguard; there is no last-active-admin database invariant. This is an administrative lockout risk, not a demonstrated nonadmin escalation. **Resolved 4 Nov 2026:** `202611040001_user_access_guard.sql` adds the DB-level self-demotion/last-active-admin trigger and an audit trigger; `scripts/test-user-access-db.mjs` verifies it on PGlite.
- Automatic `TOKEN_REFRESHED` changes only the cached token, not cached role/status. `SIGNED_OUT` clears state but does not itself redirect. The Angular HTTP interceptor's expiry redirect applies to Angular HTTP requests, not Supabase JS fetches. Server RLS still denies deactivated accounts, but visible UI/session state may stay stale.
- `rememberMe` UI selection is not implemented in the Supabase path; `persistSession: true` is unconditional.
- Auth email changes are not mirrored after INSERT. Add a tightly scoped server synchronization mechanism if email changes are supported.
- Server accepts caller-provided invitation redirect; additionally validate against a server-owned exact allowlist. Supabase's hosted allowlist is an extra control whose live configuration was not checked.

### P2

- Improve user-management error mapping (Edge can return raw exception messages to the authorized admin; UI often reduces them to a generic error).
- Add invitation delivery/activation status and resend flow with throttling; stronger audit events for role/status/invitation outcomes.
- General error monitoring serializes arbitrary error message/stack and logs uncaught errors. Login code does not log passwords, but centralized redaction would provide a stronger guarantee against accidental sensitive errors elsewhere.

## Proposed migrations (none created/applied by this audit)

1. Guard privileged profile changes and last-active-admin invariant transactionally; preserve current active-role checks and avoid recursive RLS.
2. Add narrow server-side invitation finalization/domain-linking operation, plus optional invitation state/idempotency fields; retain existing tables rather than duplicate users.
3. Add Auth email-to-profile synchronization if email-change support is approved.
4. First-admin setup should be an operator-run tool/runbook, not a permanently callable public RPC. No privileged role should be accepted from signup metadata.

## Test results and limits

`npm test -- --watch=false --include=src/app/core/auth/*.spec.ts --include=src/app/features/auth/login-page.spec.ts --include=src/app/features/auth/auth-utility-page.spec.ts --include=src/app/features/auth/role-redirect-page.spec.ts`: **49 passed across 8 files**.

`npm run build`: **passed with no NG8107 warnings** after completing the prior template fix.

| Requested scenario | Evidence / outcome |
|---|---|
| First admin provisioning | Documented manual flow and existing linked admins inspected; NOT executed |
| Valid admin login | UI/auth mocks pass; real credentials NOT used |
| Invalid password | UI failure handling passes; provider rejection NOT exercised |
| Role dashboard redirects | Existing route/redirect tests pass |
| Coach blocked from admin | Role/permission unit tests pass; no live write attempt |
| Reception permission scope | Permission tests/source reviewed; full live operation suite not run |
| Parent family isolation | Live ownership helper and RLS reviewed; no cross-family mutation performed |
| Admin invitation | Server/UI implementation inspected; no invitation sent; activation not E2E verified |
| Password reset/change | Six recovery UI tests pass; no live email/password change |
| Expired/disabled accounts | Guard/UI tests pass; active-profile checks inspected; refresh/cache gaps above |
| Self-assigned admin blocked | Live default-role trigger and profile policies verified; adversarial write test deferred |

No test users, privileged accounts or credentials were created. No passwords, hashes, tokens or service keys were queried or included in this report.

## Secure first-admin procedure for an empty project

This is a proposed operator runbook, not an action performed. The connected project already has active admins, so use its approved existing-admin invitation process instead of bootstrapping another first admin.

1. An authorized project owner confirms the target Supabase project, named intended owner and exact email privately. Confirm there are no active administrator profiles; abort if one already exists.
2. Configure the approved HTTPS origin, exact invitation/recovery redirect, SMTP, password policy and provider abuse controls. Protect the operator's Supabase dashboard access with MFA.
3. Use trusted Supabase Auth invitation tooling to send the verified owner a password-setup link. Never create an application password column or put service credentials in Angular. Do not directly insert Auth password rows.
4. Verify the returned Auth UUID has exactly one matching profile from the trigger. A hardened operator-only bootstrap should lock/check the no-active-admin condition again, assign only this verified UUID the admin role and active flags, and record the operator action. The existing short SQL runbook lacks these guards.
5. The owner follows the link and chooses their own password through Supabase Auth. The operator does not retrieve or distribute it.
6. Verify real login, fetched admin profile and `/dashboard/admin` navigation. Confirm normal users cannot promote themselves. Revoke temporary setup credentials/access and record completion; do not leave a public bootstrap endpoint enabled.
7. Subsequent accounts use Settings → Users & Roles invitations. Parent/Coach record linking must be fixed or explicitly completed by an authorized operator before declaring their portal ready.

## Approval boundary

Your pasted request explicitly says: “First investigate and report how Admin credentials currently work. Then propose fixes and implement only the approved changes.” Accordingly, this report proposes changes but applies no authentication fixes or account changes. Approval can identify P1 items to implement and separately authorize any deployment/account changes; no passwords are needed for code work.
