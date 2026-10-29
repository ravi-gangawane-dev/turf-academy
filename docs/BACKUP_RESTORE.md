# Database backup and restore

## Current backup tooling — 23 October 2026

Latest recovery attempt: stopped the hung Docker application/backend processes and relaunched Desktop. Historical backend logs show shutdown after a disk-full error; C: now has approximately 8 GB free. The fresh startup fails with `DockerDesktop/Wsl/ExecError`: WSL bootstrap reports no recognized filesystem on its data block device and its attempted `mkfs` exits with status 1. Docker was stopped after this failure to prevent further initialization retries. No manual reset, disk formatting, volume deletion or database deployment was performed. `npm run backup` correctly exits nonzero before creating a backup. Docker data-disk recovery or a separate working backup environment is required; a routine application restart has not resolved the blocker.

`npm run backup` now checks Docker with a 15-second timeout before creating artifacts. Each dump has a five-minute limit (override with positive `BACKUP_TIMEOUT_MS`). Failed commands stop the run. On timeout the script terminates its own command process tree. It does not restart Docker automatically.

The current output contains `roles.sql`, `schema.sql`, `data.sql`, `migration-schema.sql`, `migration-data.sql`, and `manifest.json`. The migration schema/ledger is dumped explicitly rather than assuming the default dump includes it. Dumps are first written as `.partial`; nonempty successful files are renamed and SHA-256 hashes recorded. Only all five successful dumps produce `status: complete`. This is file-generation success, **not proof of recoverability**; `restoreVerified` remains false.

Separate dump commands do not produce one atomic snapshot. Hosted configuration, provider secrets and uploaded storage objects are excluded. Managed auth/storage schema and data coverage is not certified. Do not rely on the older broad coverage claims below for disaster recovery.

Restore must be rehearsed on an isolated target with compatible Supabase roles/extensions: review roles before applying them, restore schema before corresponding data, include the explicit migration files, stop on any SQL error, and compare counts, grants and provider evidence. Do not assume default data ordering alone makes a restore safe. Never restore onto the live project as a test.

Verification: `node --test scripts/backup-database.test.mjs` — five tests passed for timeout, unavailable Docker, empty output, partial failure, and complete artifacts/hashes with spaced paths. These tests use synthetic CLI output and do not certify a real database backup.

Live attempt: Docker remains unresponsive after a bounded restart attempt. A valid fresh backup and restore rehearsal remain blocked. The earlier zero-byte dump is not usable.

## Historical procedure (19 October; current limitations above take precedence)

Added 19 October 2026 (fix-plan Phase 5.1). Replaces reliance on the records-only JSON
export, which is **not** a backup.

## Taking a backup

```bash
npm run backup
```

Creates `backups/<timestamp>/schema.sql` and `backups/<timestamp>/data.sql` from the linked
project (`ttuigbkaluozglzgepsh`) using `supabase db dump --linked`. The script fails loudly if
either dump is missing or empty. `backups/` is gitignored — dumps contain academy PII.

**Existing backups:** `backups/2026-10-19/` (pre-release safety copy taken before the
19 October backend release) and `backups/2026-10-19T09-17-24/` (verification run).

### Schedule

No scheduler is configured. Until one exists, run `npm run backup`:
- before every schema change (this is what the Phase 1 release used),
- weekly at minimum,
- immediately before any deployment.

Copy each run's folder to durable storage (another machine/object storage); a backup only on
this laptop is not disaster recovery.

## What is covered — and what is not

| Covered by `npm run backup` | NOT covered |
|---|---|
| All Postgres schemas, tables, RLS policies, functions, RPCs | **Storage buckets** (student/coach/parent photos) |
| All row data (students, enrollments, payments, notifications…) | **Auth users** (emails, passwords, MFA) — managed by Supabase Auth |
| Migration ledger (`supabase_migrations.schema_migrations`) | Supabase Auth SMTP/templates configuration |
| Cron job definitions (pg_cron) | Edge Function secrets (documented in `NOTIFICATION_DELIVERY_SETUP.md`) |
| The JSON records export additionally excludes uploaded files and auth accounts | Live application configuration |

For full disaster recovery also plan: storage bucket export (dashboard or `supabase storage`
tooling), auth user export (`auth.admin.listUsers` via a service-role script), and this
repository itself (once committed to git).

## Restore procedure (outline — rehearse before relying on it)

1. **Never restore over a live database without a fresh pre-restore backup.**
2. Empty target: restore `schema.sql` first (`psql "$DATABASE_URL" -f schema.sql`), then
   `data.sql`. The data dump is `--data-only` and was taken from an intact schema, so table
   order and FKs resolve; fix nothing by hand.
3. Restoring into a database that already contains data requires truncating the dumped tables
   first (or a full drop/recreate of the `public` schema). The pg_dump data file does not
   truncate for you.
4. After restore: run the SQL regressions in `supabase/tests/` (at minimum
   `attendance_workspace_page.sql`, `attendance_day_stats.sql`,
   `academy_notification_automations.sql`) and smoke-test sign-in and one write workflow.
5. Migration ledger rows come back with the restore — `supabase migration list` should match.

**Rehearsal status: NOT yet performed.** The first restore should target a scratch project
(e.g. `supabase start` locally or a new empty Supabase project) before this document is
treated as a proven recovery path.
