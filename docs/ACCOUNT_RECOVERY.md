# Operator-assisted account recovery

Verified on 19 October 2026 against `ttuigbkaluozglzgepsh`, using a disposable account. The live backend issues eight-digit codes; the UI now accepts 6–10 numeric digits. Deploy the updated recovery build before offering this process.

This fallback requires a trusted Supabase project operator. The application administrator screen does not have a password-reset action. Assign an operator and agree the support contact with the client before release.

## Support procedure

1. Verify the requester's identity using the academy's existing records and a previously verified contact channel. Confirm the account email; an email address alone is not identity proof.
2. On a trusted operator machine, load the project's privileged key into `SUPABASE_SERVICE_ROLE_KEY` through your secret manager. Never put it in frontend code, source control, a support ticket or shared logs. Set `RECOVERY_EMAIL` to the verified account email.
3. From this repository, run the following in a private terminal. It generates a recovery code without sending email. Do not run in recorded/shared CI or save terminal output.

```powershell
@'
const { createClient } = require('@supabase/supabase-js');
(async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.RECOVERY_EMAIL;
  if (!key || !email) throw new Error('Operator key and verified email are required.');
  const client = createClient('https://ttuigbkaluozglzgepsh.supabase.co', key,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.admin.generateLink({ type: 'recovery', email });
  if (error || !data.properties?.email_otp) throw new Error('Recovery code generation failed.');
  console.log(data.properties.email_otp);
})().catch(() => { console.error('Recovery failed; check operator access and account.'); process.exitCode = 1; });
'@ | node -
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:RECOVERY_EMAIL -ErrorAction SilentlyContinue
```

4. Give only the one-time code to the verified requester through the agreed private channel. Never send the operator key or choose/request the user's new password. Do not record the code in the support ticket.
5. Ask the user to open `/auth/otp` on the deployed academy site, enter their account email and complete code, then choose and confirm a new password. The app signs them out after success; they then sign in using the new password.
6. If the code is invalid or expired, repeat identity verification as necessary and generate a fresh code. Record the operator, account, time and outcome in the support record, excluding secrets.

## Evidence and limits

- `e2e/account-recovery.spec.ts`, run with `npx playwright test --config playwright.recovery.config.ts`: passed real code verification, password update, sign-out, new-password browser login, rejection of the old password and rejection of code reuse.
- Disposable account deletion and subsequent absence were verified. Existing accounts/passwords were untouched; no emails were sent.
- `tmp/release-2026-10-19/account-recovery.log` contains sanitized execution results. Recovery traces, screenshots and video are disabled in the dedicated config.
- Twelve focused recovery unit tests passed, including code-length validation and existing expired-session handling.
- SMTP delivery, emailed links, production-domain redirects, elapsed code expiry and revocation of other already-issued access tokens were not verified by this test. The operator code flow avoids relying on recovery email delivery, but still needs a deployed-host smoke test and an available support operator.

For repeat verification, supply the privileged key only through the test process environment. The test creates and deletes its own account; do not substitute client accounts.

## Recovery email preflight ? 19 October 2026

Read-only inspection of the linked project's remote configuration confirmed:

| Setting | Live value | Required correction |
|---|---|---|
| Auth Site URL | `http://localhost:3000` | Set to the actual production HTTPS origin |
| Additional redirect URLs | Empty | Add the exact production `/auth/reset-password` URL |
| Email OTP length | 8 | Already supported by the updated recovery build |

Evidence: `tmp/release-2026-10-19/recovery-email-preflight.json`. No remote settings were changed. Do not push the repository's entire local config: it contains development URLs and may change unrelated live settings.

Production URL and an authorized test account email are still required. SMTP readiness was not established by the configuration preview; absence of notification Edge Function secrets does not establish the Auth SMTP configuration.

Once the real domain is supplied:

1. In Supabase Authentication URL Configuration, set Site URL to that production HTTPS origin and add its exact `/auth/reset-password` address, preserving any other intentionally allowed URLs.
2. Confirm Auth custom SMTP and verified sender configuration separately from notification delivery. Configure provider credentials in Supabase's secure settings, never in chat/source control. Supabase's default mail service restricts delivery to project-team addresses and is not intended for production.
3. Verify `/auth/forgot-password` and `/auth/reset-password` load directly on the deployed HTTPS host.
4. Request a reset through the deployed app for the authorized existing test account. Record the request result without tokens. A successful request alone does not prove an email was delivered or that the account exists.
5. Have the mailbox owner confirm receipt and open the link privately. Confirm it reaches the production reset-password route, never localhost. Do not paste recovery links, codes or passwords into tickets or chat.
6. Complete the reset with a password chosen by the account owner, verify sign-out and new-password sign-in, and verify that the consumed link cannot establish a fresh recovery session. Record only outcomes and timestamps.

Sources: [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls), [Auth SMTP restrictions and setup](https://supabase.com/docs/guides/auth/auth-smtp), [password recovery behavior](https://supabase.com/docs/guides/auth/passwords).

## Authorized local email test ? 19 October 2026

With user approval, updated only live Auth Site URL to `http://localhost:4200` and the redirect allowlist to `http://localhost:4200/auth/reset-password`. The isolated minimal configuration left all undeclared settings unchanged. Follow-up diff confirmed no remaining declared differences. Local reset route returned HTTP 200.

The authorized mailbox had no existing Auth account. A temporary test account was created, and Supabase accepted one recovery-email request with the exact local redirect. This is request acceptance, not proof of delivery. Mailbox receipt, emailed-link navigation, password reset and subsequent sign-in await the user's confirmation. No password or recovery token was recorded. Test account ID and sanitized request evidence are in ignored `tmp/release-2026-10-19/local-recovery-email-result.json`; remove that exact temporary account after verification. Do not delete any unrelated account.

Production-domain recovery remains pending. Replace local configuration with the actual approved production origin/redirect at deployment. SMTP configuration was not changed.

### Local email recovery result

The mailbox owner confirmed: **email received; reset and sign-in worked**. This verifies actual recovery-email delivery and completion on localhost:4200 by user acceptance, in addition to the automated operator-code test. The exact temporary account was deleted through the Admin API, and absence was verified. The test login is no longer available. Evidence JSON records the confirmation and cleanup. Production redirects remain unverified; notification email/WhatsApp is a separate integration.

## Login / forgot-password / recovery-code recheck

Fresh dedicated recovery-config run: **7/7 browser tests passed**, plus **12/12 recovery unit tests**. Logs: `tmp/audit/auth-complete-browser.log`, `tmp/audit/auth-complete-unit.log`.

- Live Admin, Receptionist, Coach and Parent sign-in, session reload, logout and protected-route rejection after logout passed.
- Disposable account: invalid-password login rejected; invalid recovery code rejected; genuine eight-digit operator-generated recovery code accepted; password update and sign-out passed; new-password browser login passed; old password and consumed code rejected. Temporary account deleted and absence verified.
- Forgot-password UI: correct email and origin-specific reset redirect sent; failed request shows error without success; retry shows enumeration-safe confirmation. This browser case intercepts provider responses and sends no email. Actual local email receipt/reset/login remains separately user-confirmed.
- Expired-link error parameter shows recovery guidance and a fresh-request action. This checks error handling, not elapsed-time expiration of a real token.

No application changes were needed. Existing account passwords remain unchanged. Recovery traces/screenshots/video are disabled. Production-domain acceptance remains pending.

## Recovery presentation update

Reviewed the user's email, reset-password and OTP screenshots. Added a branded, mobile-friendly template at `supabase/templates/recovery.html`, referenced in local Supabase config. It includes `ConfirmationURL`, visible `Token`, code-entry link and Back to login. Template variables follow https://supabase.com/docs/guides/auth/auth-email-templates.

**Hosted activation blocked:** Supabase rejected the isolated template push with HTTP 400: ?Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.? No claim that new emails use this design. Set up custom SMTP privately in Supabase or change plan, then push only the recovery subject/content using the isolated config workflow. No provider credentials were requested in chat, and no email was sent by this presentation update. Sender branding remains provider-controlled.

Frontend changes: consistent Back to login links with spacing/focus styles; explicit Send recovery email / Verify code / Update password actions; code-only validation when email is valid; errors shown after submission rather than premature form blur; trimmed recovery email/code; instructions for link-only emails; no static green ticks implying unmet password requirements passed; code-entry and new-email navigation.

Browser previews saved under `tmp/audit/recovery-design-*.png`; email preview uses a dummy token. Do not use preview links/codes for real authentication. Production frontend hosting and template activation remain separate.
