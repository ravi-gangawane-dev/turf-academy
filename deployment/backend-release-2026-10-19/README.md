# Backend release package — 19 October 2026

Scripts for fix-plan phases 1.1–1.3.

**APPLIED 19 October 2026 against the linked project `ttuigbkaluozglzgepsh` (operator-approved).**
Order used: schema+data backup (`tmp/audit/db/backup-*-2026-10-19.sql`) → `01` read-only preflight →
`02` (verified: table+RLS+2 policies, functions, 4 ledger entries, cron `active=false`) → `03` as a
commit variant (preconditions passed; `202610140003`–`0008` recorded) → `04` as a commit variant
(`SET search_path TO ''` confirmed) → post-apply regressions: `academy_notification_automations.sql`
14/14 passed, `attendance_workspace_page.sql` passed. Ledger now has no gaps except the two
deliberately excluded one-off migrations `202610130003`/`0004`. Files in this folder still default
to `ROLLBACK` so a future rerun stays review-first.

## Prerequisites (before any script)

1. Confirm `ttuigbkaluozglzgepsh` is the intended target project (it is what the current
   frontend artifact points at; it has not been confirmed as the client's release project).
2. Take a real database backup. The JSON records export is not a backup.
3. Run the read-only preflight and keep its output:

```powershell
npx --no-install supabase db query --linked --file deployment/backend-release-2026-10-19/01-verify-before.sql
```

## Files and order

| Order | File | What it does | Commit condition |
|---|---|---|---|
| 0 | `01-verify-before.sql` | Read-only preflight (8 checks) | never — read-only |
| 1 | `02-events-backend-release.sql` | Creates `academy_events`, automation functions, birthday templates, attendance-trigger update; inserts its own migration-ledger entries; hourly cron job is paused and never committed active. SHA-256 `9dc39607442400ff3d84c146f530e2426b0cc2d6e1eca6156071480056353508`. | after re-verifying the checksum and that the project has not changed since `tmp/release-2026-10-19/events-before.json` |
| 2 | `03-ledger-reconciliation.sql` | Records ledger entries for the six already-applied column-control migrations (`202610140003`–`0008`). No schema changes; refuses to run if the created functions are missing. Regenerate with `node scripts/generate-ledger-reconciliation.mjs` if local migrations change. | after review of the printed rows |
| 3 | `04-security-hardening.sql` | Recreates `change_enrollment_status` with `set search_path = ''` (advisor finding). Behaviour-neutral: all references already schema-qualified. | after the enrollment status-change regression passes |

Excluded on purpose: one-off named-student migrations `202610130003`/`202610130004`, and any
statement that sends an external message.

## After applying

- Verify Events CRUD from the UI (`/notifications/events`) and confirm `cron.job` shows the
  automation job inactive.
- Re-run the attendance regressions — `02` updates the attendance-notification trigger.
- Enable leaked-password protection in the Supabase Auth dashboard (Authentication →
  Settings); it is not controlled by SQL.
- Review the advisor's remaining anonymous/authenticated security-definer warnings one
  function at a time; do not bulk-revoke EXECUTE — guarded RPCs intentionally run for
  authenticated callers.
