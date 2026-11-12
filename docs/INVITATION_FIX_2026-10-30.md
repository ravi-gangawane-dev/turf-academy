# Invitation dialog fix — 30 October 2026

Scope: Settings → Users & Roles → Invite academy user, including the Admin role shown by the user.

The downloaded deployed Edge source matched the local function before changes. Existing server authorization validates Supabase identity and requires an active admin profile; this was preserved.

Fixed:
- Display failed invitation errors inside the modal rather than behind it.
- Prevent duplicate submissions; disable closing while the request is pending; preserve fields on error.
- Trim submitted details and normalize email case.
- Interpret allowlisted error codes for existing account, expired session, missing configuration, rate limiting, delivery failure and incomplete profile setup, without exposing raw provider messages.
- Require a returned profile with the selected role and active status before reporting success.
- Use a trusted server-configured HTTPS password-setup URL, ignoring caller/browser redirect URLs.

Deployment: `admin-manage-users` deployed to the linked Supabase project; `INVITE_REDIRECT_URL` configured as `https://turf-academy.netlify.app/auth/reset-password`. Frontend changes are in the workspace and production build. A separate frontend hosting deployment was not performed.

Validation:
- 9 server-handler tests passed with mocked Supabase clients (admin role assignment, trusted redirect, unauthorized/expired caller, invalid role, configuration, missing profile, duplicate-account/rate-limit/delivery errors).
- 19 Angular tests passed across user-management service, users panel and recovery UI.
- Production Angular build passed.
- No real invitation was sent, no account was created, and no existing role/password changed.

Limits: actual email delivery and completing an invitation in the recipient's browser are NOT verified. SMTP/provider restrictions and hosted Auth redirect settings can still prevent delivery or activation. Supabase sending and profile updating are separate operations: a profile failure is now reported honestly and requires account review before retrying. Parent/Coach domain-record linking remains a separate outstanding item; this change does not claim to complete that workflow.

For another client deployment, configure INVITE_REDIRECT_URL with that client's deployed HTTPS /auth/reset-password endpoint, and allow it in the client's Supabase Auth redirect configuration. Do not use a browser-provided localhost URL for client invitation emails.

## Follow-up: Send button did not submit

Reproduced the user's click failure in both the rendered Angular test and Chromium. The backdrop expression returned `false` for descendant clicks, causing Angular to prevent the submit button's default action. Replaced it with a void handler that closes only on an actual backdrop click when idle; made submit type explicit.

Validation: all 3 panel tests pass including a real button click. Production build passes. Chromium with intercepted Supabase traffic confirms one invitation API request per click and visible provider-error feedback inside the dialog. No invitation email was sent by these tests.

## Email provider configuration blocker

Read-only `supabase config pull` into the ignored `.scratch/invite-audit` directory found no custom SMTP configuration. The deployed site URL and exact `/auth/reset-password` redirect are present. Supabase documents that its default Auth mail service sends only to project-team addresses (https://supabase.com/docs/guides/auth/auth-smtp).

Added and deployed safe mappings for `email_address_not_authorized` and `email_address_invalid`, with 11 passing server tests. A provider error was not reproduced by sending another real invitation; the new mapping reports the exact category on the next user attempt. Delivering invitations to ordinary client addresses still requires an SMTP provider, verified sender and credentials configured securely in Supabase. No SMTP credentials are available in this session. No email restrictions were bypassed and no account was created.
