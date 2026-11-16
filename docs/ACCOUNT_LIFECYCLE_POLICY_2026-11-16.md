# Account deactivation, deletion and retention policy

**Date:** 16 November 2026  
**Scope:** Academy staff and parent portal accounts in `public.profiles`, their Supabase Auth identities, and the records they created or approved.  
**Status:** Policy adopted for P2-14, updated for the guarded hard delete added by P2-11. This document describes the behaviour that exists in the repository and the operator procedure for exceptions. It does not claim a hosted-database or provider check.

## 1. Policy in one page

| Question | Policy |
|---|---|
| How is an account removed from normal use? | An administrator sets **Active → Disabled (inactive)** or **Active → Suspended**. The account is not hard-deleted. |
| Does disabling delete attendance, fees, enrolments or audit history? | No. Those records remain and keep their original references. |
| Can the account be restored? | Yes. Setting the status back to **Active** clears the sign-in ban. The person keeps the same login and history. |
| Is there a delete button? | Yes, but only for an account with **no linked history**. The Users screen offers **Delete**, which calls a guarded Edge action requiring a reason and an explicit confirmation. An account with any blocking record is refused and must be disabled instead. |
| What happens to a parent or coach record? | It is a separate operational record. It survives account removal, and `parents.profile_id` / `coaches.profile_id` become `null` if the profile is ever deleted. |
| What about financial records? | Payments, receipts, charges and refunds are retained. Account removal never removes them. |
| Can personal data be erased? | Yes, through a documented operator anonymisation procedure when the academy approves the request. The transaction history stays under a pseudonymous profile. |
| Who can change access? | An active administrator, through the `admin-manage-users` Edge Function. Every change needs a reason and is audited. |
| What protects the last administrator? | The Edge Function refuses to remove the final active administrator or the caller's own active administrator access, for both access changes and deletion. The database triggers enforce the same rules when applied. |

## 2. Account states

`profiles.status` has three values. The Edge Function keeps `profiles.is_active` in step with them: active sets `is_active = true`, and inactive/suspended set it to false. The client shows `inactive` as **Disabled** because that is the user-facing meaning.

| State | How it is reached | Sign-in | Data access | Records | Reversal |
|---|---|---|---|---|---|
| **Active** | Invitation accepted, or an administrator restores the account | Allowed | Allowed through RLS while `is_active` and `status = 'active'` | Kept | — |
| **Disabled (inactive)** | Administrator changes the status; used for a planned departure, a staff member who no longer needs access, or a parent who has left | Blocked; the Auth user is banned for `876000h` | RLS returns no academy role because `current_user_role()` requires an active profile | Kept | Set back to Active |
| **Suspended** | Administrator changes the status; used for a security or conduct matter pending review | Blocked in the same way | Same as disabled | Kept | Set back to Active after review |
| **Pending activation** | Derived from the latest invitation row, not a stored `profiles.status` value | The invited person has not completed password setup | Access is completed by password setup and onboarding | Invitation row kept | Resend, revoke or create a new link |
| **No profile / removed** | The Auth identity exists but the profile row is missing or unreadable | Session is rejected by the client revalidation | None | Depends on the operator action that removed the profile | Recreate through support/operator action only |

`inactive` and `suspended` are deliberately separate. **Disabled** is the normal reversible off-boarding state. **Suspended** records that access was withdrawn for a review or policy reason, so the access history explains why the person was blocked. Both have the same technical effect on authentication.

Pending activation is not the same as disabled. A pending invite still has `profiles.status = 'active'`, because the profile is prepared before the person sets a password. The Users table therefore shows **Pending activation** instead of **Active** when an invitation has not been accepted.

### 2.1 Directly created accounts

An administrator can create an account directly from **Settings → Users & Roles → Create user**, without sending an email. The Edge Function generates a 16-character temporary password with `crypto.getRandomValues`, creates a **confirmed** Auth user, sets the requested role and an active profile, and writes `user_metadata.must_change_password = true`. The password is shown to the admin once and is never stored by the app, emailed, or written to Access history.

A directly created account is **Active** but not yet usable for academy data. At the next sign-in the login page sends the person to `/auth/reset-password`, and `authGuard` keeps every protected route closed until the password is replaced. `changePassword` clears the metadata flag, completes onboarding and returns the person to normal access. If the profile cannot be prepared after the Auth user is created, the Function deletes the new login, so a half-created account cannot sign in with the wrong role.

Because the admin hands over the temporary password, it must be shared through a private channel. The app cannot show it again after the credential dialog is closed; a lost password is recovered with the normal Forgot-password flow. This path is local-only until the updated Edge Function is deployed.

## 3. What an access change does

When an active administrator confirms a role or status change in **Settings → Users & Roles**:

1. The browser calls the `admin-manage-users` Edge Function with the target user, role, status and a mandatory reason.
2. The Function re-validates the caller's bearer token and requires an active administrator profile.
3. It refuses a change that would remove the caller's own active administrator access (`self_admin_removal`) or the final active administrator (`last_admin`).
4. It updates `profiles.role`, `profiles.status` and `profiles.is_active` in one statement.
5. It applies or clears the Supabase Auth ban (`ban_duration: '876000h'` for a non-active status, `'none'` for active). If the ban cannot be applied, the Function returns `access_partial` and asks the administrator to retry.
6. It writes an `audit_logs` row with action `user_access_updated`, the actor, the reason, and before/after role, status and `is_active` values.

Open sessions do not survive indefinitely. `AuthService` re-reads the signed-in profile when the tab regains focus or visibility and at least every five minutes. A missing profile ends the session as `removed`; an inactive profile ends it as `inactive`; a suspended profile ends it as `suspended`. The expired-session page shows the matching message. RLS independently rejects data requests as soon as the profile is inactive, even if a token has not expired yet.

The database trigger `guard_profile_access_change` repeats the last-admin and self-removal checks for direct writes. The trigger is defined in `supabase/migrations/202611040001_user_access_guard.sql`. **This migration is not applied to the hosted project**, so on the hosted database only the Edge Function protects those two rules. Do not claim database-level protection until the migration is reviewed and applied.

## 4. Disabling versus deleting

### 4.1 Disabling is the default

Disabling is the supported removal path because it is reversible, preserves accountability, and keeps linked operational records intact. A disabled account:

- cannot sign in;
- cannot use an existing session after the next revalidation;
- cannot read or write through RLS;
- keeps its role for historical reporting;
- keeps its `created_by`, `recorded_by`, `issued_by`, `requested_by`, `approved_by` and `refunded_by` references.

### 4.2 Guarded hard deletion

The Users screen now offers **Delete**, but only for a different account and only while that account has no blocking history. Deletion is an explicit admin action with its own safeguards; it is not the normal off-boarding path.

The Flow:

1. The admin chooses **Delete** on a row other than their own.
2. The confirmation dialog requires a reason (3–500 characters) and a checked acknowledgement that the deletion cannot be undone.
3. The browser calls the `admin-manage-users` Edge Function with `action: 'delete'`, the user id and the reason.
4. The Function re-validates the caller as an active administrator, refuses a self-delete (`self_delete`) and refuses to remove the final active administrator (`last_admin`).
5. It probes every `profiles` reference that does not cascade or null out. If any exist it returns `account_has_history` with the blocking categories and deletes nothing.
6. Only then does it call `auth.admin.deleteUser`, which cascades to `profiles`.
7. It writes `audit_logs` action `user_deleted` with the reason and the identity needed to explain the row (`full_name`, `email`, `role`, `status`, `is_active`). The profile is gone, so Access history resolves the name from that recorded `before` block.

When the history check refuses a delete, the dialog stays open with the blocker message and offers **Disable instead**, which opens the normal access-change confirmation pre-set to `inactive`, carrying over the reason. Nothing is deleted.

Actual referential behaviour in the current schema:

| Reference | On delete behaviour | Consequence |
|---|---|---|
| `profiles.id → auth.users(id)` | `cascade` | Deleting the Auth user deletes the profile row |
| `parents.profile_id`, `coaches.profile_id` | `set null` | The operational parent/coach record survives without a login |
| `user_invitations.auth_user_id` | `cascade` | Invitation rows for that Auth user are removed |
| `user_invitations.invited_by` | `set null` | Invitation history remains, without the inviting profile |
| `auth_audit_logs.user_id` | `set null` | Authentication audit rows remain |
| `print_audit_events.actor_id` | `set null` | Print audit rows remain |
| `audit_logs.actor_id` | no action | Blocks deletion when the person has an audit entry |
| `parents`/`coaches`/`students`/`enrollments`/`attendance`/`payments`/`receipts`/`refunds` creator and approver columns | no action on most | Blocks deletion while the person created or approved a record |

The Edge Function checks a hardcoded list of non-cascading references and reports friendly categories. That list can drift behind the schema; the foreign keys remain the final authority, so a missed reference still fails the delete. A provider failure is re-checked against the same list, and an unexpected failure returns `delete_failed` without leaking provider detail.

A hard delete is therefore only possible for an account with no blocking references, such as a mistaken duplicate, a test account, or an invited account that never created or approved anything. Accounts with history must be disabled or anonymised instead.

### 4.3 Operator path for accounts with history

For an approved erasure request where the account has operational references that must be retained:

1. Confirm in writing that the erasure is approved and scope which data must be retained.
2. Deactivate the profile first so the login cannot be used while the work is in progress.
3. Anonymise the profile and any linked people record as described in section 6.
4. Do not delete the Auth identity or the profile: the references would block it, and a forced delete would remove retained evidence.

The UI delete is deliberately not a data-erasure tool. It only removes an account that has nothing worth retaining.

## 5. Retention rules

The application does not run an automatic retention or purge job. The academy owns the retention decision; the application only preserves what exists. Until an approved erasure is executed, the following records are retained:

| Record group | Examples | Rule on account removal |
|---|---|---|
| Financial ledger | `monthly_charges`, `payments`, `receipts`, `refunds` | Never deleted as part of disabling or deleting a login. They remain under the student record. |
| Attendance and enrolment | `attendance_records`, `attendance_corrections`, `enrollments`, `enrollment_history` | Retained. Corrections keep the requesting and approving profile references. |
| Operational people records | `students`, `parents`, `coaches`, `student_parents`, `batch_coaches` | Retained. Parent/coach records can be marked `inactive` independently of the login. |
| Audit evidence | `audit_logs`, `auth_audit_logs`, print audit rows | Retained. `audit_logs` actor references block profile deletion; other audit tables keep the row and may null the actor. |
| Invitations | `user_invitations` | Retained with their final status. Expiry changes `pending` to `expired`; rows are not purged automatically. |
| Notifications | `notifications` and delivery evidence | Retained. Parent deletion preserves notification history through `parent_id`/`on delete set null` behaviour where configured. |

No specific retention duration is asserted here. A duration is an academy/legal decision, not a value encoded in this application. Setting one would require a scheduled job and a separate approval.

## 6. Anonymisation procedure

Anonymisation is used when an approved erasure request exists but the person has history that must remain attributable. It is an operator procedure, not a button in the Users screen.

1. **Approve and scope.** Record who approved the request, which person and which data is in scope, and what must be retained. Do not accept a request that would erase financial or audit evidence without the academy's owner confirming the exception.
2. **Deactivate first.** Set `status = 'inactive'` and `is_active = false`; apply the Auth ban. This makes the account unusable before any data is edited.
3. **Remove direct identifiers from the profile.** Clear `email`, `phone`, `avatar_url` and `avatar_path`. Replace `full_name` with a non-identifying label such as `Former user <first 8 characters of the id>` (the column still requires 2–120 characters).
4. **Handle linked people records deliberately.** A parent or coach record is not the login. If the academy also wants it anonymised, clear or replace its name, phone, email and address and set the record to `inactive`; keep the record so linked attendance, enrolments and notifications remain coherent. If only the login is being erased, leave the operational record as the academy's record of service.
5. **Remove stored objects.** Delete the avatar object in storage if one exists. Do not leave a public URL that still resolves to a personal photo.
6. **Revoke outstanding invitations.** Mark any pending, failed or expired invitation revoked so it cannot complete later.
7. **Write the audit entry.** Add a new `audit_logs` row with the action (for example `user_anonymised`), the actor, the scope and the reason. Do not copy the erased values into `old_values` or `new_values`. Existing audit rows may already contain historical values; they are part of the retained audit evidence and are not rewritten.
8. **Decide the Auth identity separately.** The profile is linked to `auth.users` with `on delete cascade`. Deleting the Auth user would delete the anonymised profile and break history links. For an account with retained history the erasure state is therefore a **banned Auth user plus an anonymised profile**. The guarded delete in section 4.2 is the only supported way to remove an identity, and it refuses any account that still has history.

## 7. Restoring access

To restore a disabled or suspended person:

1. Change the status to **Active** and give a reason.
2. The Edge Function clears the Auth ban. The role can be changed in the same step.
3. The existing login should work again; a new invitation is not needed while the profile and Auth user still exist.
4. If the Auth user or profile was deleted, the email is no longer in `profiles`, so the normal invitation path can create a new account. If the profile still exists, invitation is refused with `account_exists`; restore the existing account instead.

A restored account does not regain data that was scoped to another role. RLS and the role matrix apply the new role immediately on the next request.

## 8. Authority, audit and last-admin rules

- Only an active administrator can invite or change access.
- Every role/status change requires a reason of 3–500 characters. The Edge Function stores it in `audit_logs.new_values.reason`.
- Every deletion requires a reason of 3–500 characters and a checked irreversible-action confirmation. The Edge Function stores it in the `user_deleted` audit row.
- Direct authenticated writes to `profiles` role/status fields are audited by `audit_profile_access_change`; those rows show `Direct change` because they have no reason field.
- The caller cannot remove their own active administrator access, and cannot delete their own account.
- The final active administrator cannot be demoted, disabled, suspended or deleted.
- The Edge Function checks these rules before writing. The database triggers are the defence for direct and service-role writes, but are only present where the migrations have been applied.

### 8.1 Per-user permission overrides (P2-13)

On top of the single role, an active administrator can set targeted **grants** and **revokes** for one account from **Users & Roles → Permissions**. The override set is stored in `public.profile_permissions` (migration `202611160002_profile_permissions.sql`): one row per account and permission, an effect of `grant` or `revoke`, a required 3–500-character reason, and the actor/timestamp. `replace_profile_permissions(...)` validates every key, effect and reason before replacing the whole set atomically.

- `AuthService` loads the signed-in account's overrides during session restore and five-minute revalidation and merges them into `hasPermission()`, so menus, routes and action buttons follow them. If the table is missing or the read fails, the role matrix remains the baseline.
- The Edge Function rejects unknown permission keys, invalid effects, duplicate keys and a missing reason, and writes `user_permissions_changed` with before/after values. It also refuses a self settings revoke (`self_lockout`) and a settings revoke that would leave no active administrator with settings access (`last_admin`).
- **Scope:** overrides are app-level only. The database RLS policies still enforce the base role. A grant cannot widen row access the role is not allowed to read, and a revoke hides the screen/action but is not a hard API boundary until the policies themselves become permission-aware. This limitation is stated in the override dialog.

## 9. UI wording and enforcement added for P2-14

- The Users table now states that **deactivation keeps history** and that only an account with no linked records can be permanently deleted.
- The confirmation dialog shows human-readable role and status labels instead of raw enum values.
- The dialog explains the effect of the selected status before the reason is entered: active restores sign-in, disabled/suspended blocks sign-in immediately, and both keep records and history.
- The dialog states that the change is written to Access history and that deactivation does not remove historical records.
- The status select labels `inactive` as **Disabled (inactive)** so the stored value and the user-facing meaning are both visible.
- The delete dialog states that only accounts with no linked history can be deleted, names the reversible alternative, requires a reason and a confirmation checkbox, and hides the action for the signed-in account. When a delete is refused for history it offers **Disable instead**.
- Access history shows deletion rows as `Account deleted (name or email)` using the identity recorded at deletion time, because the profile no longer exists to look up.

These are wording and decision-support changes. The enforcement remains the Edge Function and, where applied, the database triggers.

## 10. Known gaps

- The Edge `delete` action, `create` action, `permissions`/`set_permissions` actions and the Users create/delete/permission dialogs are local only; the deployed `admin-manage-users` function is still version 13, so those actions are unavailable in the hosted app until redeployed and the profile-permissions migration is applied.
- A directly created account receives its temporary password from the admin. If the credential dialog is closed before it is copied, the password cannot be shown again; the person must use Forgot password or an admin must recreate the account.
- The Edge history list is maintained by hand. It covers the current non-cascading references, but a future column could be missed; the foreign keys still refuse the delete, only the friendly message would be less specific.
- No automated retention or purge job.
- No anonymisation UI; the procedure is operator-run.
- `202611040001_user_access_guard.sql`, `202611160001_profile_delete_guard.sql` and `202611160002_profile_permissions.sql` are not applied to the hosted project, so the database-level last-admin/self-removal and delete guards are local only and per-user overrides are unavailable.
- Per-user overrides are app-level only: RLS remains role-based, so a grant cannot widen database row access and a revoke is not a hard API boundary.
- The Edge Function cannot be type-checked with `deno check` locally because Deno is not installed.
- No hosted or staging RLS/session-disable/delete/create-with-temporary-password/permission-override check was performed for this policy.

## 11. Verification performed

- Focused Angular tests for the Users settings panel cover the access confirmation wording, the disabled-state retention message, the reason requirement, cancellation, server errors, access history, the delete confirmation requirements, the history-blocked delete followed by **Disable instead**, hiding delete on the signed-in account, direct account creation with its one-time credential dialog, and the permission-override editor (open/load, grant/revoke save with reason, reset to role default, load error, server guard, and history summary). The `UserManagementService` spec covers the delete request, the `account_has_history` message, the create request/one-time password response and the permission read/replace requests; the `AuthService` spec covers the must-change-password flag and grant/revoke/failed-override merging; the login-page spec covers the normal role redirects. **67 tests pass across 3 files.**
- Edge Function tests cover a successful no-history delete with its audit row, a history-blocked delete that deletes nothing, self-delete, last-admin, missing reason and a provider failure. They also cover direct creation: a one-time 16-character password with mixed classes, two accounts never sharing a password, duplicate-email refusal, catalogue-role validation, provider-failure mapping and rollback when the profile cannot be prepared. Permission tests cover reading existing overrides, the migration gap, atomic replacement, empty-set clearing, unknown key/effect, duplicate key, missing reason, self settings lockout, last-admin protection, a failed replacement and an unavailable catalogue. **56 tests pass.**
- PGlite tests apply the delete-guard and profile-permissions migrations and verify direct self-delete is blocked, the final administrator cannot be deleted even without a caller, a profile with linked history is refused by the foreign key, a clean profile and its overrides are removed by cascade, override replacement is atomic and can be cleared, invalid key/effect/reason leave the existing set untouched, a browser session cannot replace overrides directly, and override rows are readable only by the account or an administrator. **12 checks pass** on a disposable engine, not a remote database.
- ESLint and a development build are run after the change.
- No remote database, Edge deployment or provider check was performed. The remote migrations remain unapplied and the deployed function remains version 13.
