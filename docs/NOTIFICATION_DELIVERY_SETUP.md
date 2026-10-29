# Notification delivery

Provider integration: Resend for email. The Edge Function `notification-delivery` verifies the signed-in user and requires an active Admin or Receptionist. Provider secrets stay on the server.

## Required Supabase Edge Function secrets

Configure these in the linked project's **Edge Functions → Secrets**. Do not put provider keys in Angular, commit them, or paste them into chat.

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | Resend key for a verified sending domain |
| `NOTIFICATION_EMAIL_FROM` | Verified sender, e.g. `Academy <updates@your-domain>` |
|  `NOTIFICATION_COUNTRY_CODE` | Optional; defaults to `91` for existing Indian ten-digit contacts |

Enable email under Academy Settings → Notifications. Provider readiness is displayed on the Notifications page. A channel is unavailable until its required secrets are configured.

## Verifying configuration

After setting secrets, run the read-only probe (it signs in with the documented E2E admin
test account and sends nothing):

```bash
node scripts/check-delivery-config.mjs
```

- exit `0` with the channel listed → configured and ready for the authorized-recipient test.
- exit `2` with `(none)` → a required secret is still missing. Current state on 19 October
  2026: `channels:["in_app"]` — no external secrets set.

## Workflow

1. Open a parent profile → Send message. Select a channel and queue the message. In-app messages are immediately available to that parent.
2. For external messages, open Notifications and select **Send queued message** on the intended record.
3. Select **Refresh delivery status** to retrieve the provider's actual status. Accepted messages remain `sent` until delivery is confirmed.

There is no automatic bulk send or cron job. Deploying the function does not send existing queued messages. A failed provider request is shown in the log. If a response was lost after a possible send, the message is marked as uncertain and blocked from automatic resubmission. An administrator must reconcile it with the provider's records before clearing the claim; never clear an uncertain claim solely to try again.

Birthday automations create in-app student and coach greetings. When email is enabled, the birthday email trigger queues messages to available parent/coach email addresses. External birthday messages remain queued for staff review and must be sent from Notifications.

The first live delivery should use a recipient authorized by the academy. No external test message was sent during implementation; provider credentials were absent.

## API references

- [Resend send email](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [retrieve delivery state](https://resend.com/docs/api-reference/emails/retrieve-email)
The unit tests use mock provider responses and cover email idempotency, contact normalization, missing configuration, uncertain sends and status transitions.
