# Overall project status report — 19 October 2026 (evening refresh)

Consolidation of the full engagement: audit, fixes, backend deployment and the first two
scalability items. Supersedes the morning edition of this file. Sources:
[functionality status](FUNCTIONALITY_STATUS_2026-10-19.md), [fix plan](FIX_PLAN_2026-10-19.md),
[live release verification](LIVE_RELEASE_VERIFICATION.md), release package
`deployment/backend-release-2026-10-19/`.

## 1. Project snapshot

| Item | Detail |
|---|---|
| Application | Turf Cricket Academy management PWA (`turf-academy-ui`): Angular 22 + PrimeNG + Tailwind 4, Supabase (Postgres/RLS/Edge Functions), installable PWA |
| Roles / routes | Admin, Receptionist, Coach, Parent; ~122 routes guarded by route guards + database RLS |
| Tests | 52 unit spec files (221 tests); 26 Playwright specs (mock/live/PWA/recovery); 70 SQL migrations; pgTAP/SQL regressions in `supabase/tests/` |
| Backend | Linked project `ttuigbkaluozglzgepsh` — **now confirmed in use and updated today** |
| Git | Branch `main`, **still zero commits** — every change below lives only in the working tree |

## 2. Verification evidence (final state, rerun after last edits)

| Check | Result |
|---|---|
| Production build | PASS (exit 0) |
| Unit suite | **221/221**, 52 files |
| Mock browser suite | **28/28** (incl. rerun with `PORT=0` forced, exit 0) |
| Production PWA check | PASS 1/1 |
| SQL regressions vs deployed DB | `attendance_workspace_page` PASS, `attendance_day_stats` PASS, `academy_notification_automations` 14/14 — all fixtures rolled back |
| Live browser | `live-staff-attendance` **4/4**; live calendar case **1/1** — exit 0 |
| Backend preflight | read-only checks matched documented state before any write |

## 3. Functionality status

**Working (locally verified + live where noted):** auth/session/role guards for four roles ·
student/parent/coach/batch directories with server paging/filters · enrollments full lifecycle
(live-verified) · attendance manual/QR-token/offline-queue (live-verified incl. exactly-once
replay) · corrections (live) · fees/payments/refunds incl. overpayment & idempotency (live +
SQL) · receipts, CSV/JSON exports, audit logs · operator-assisted recovery · accessibility and
responsive layouts · PWA shell · settings · **Events/Holidays page (backend deployed today:
table, RLS, functions, ledger; SQL regression 14/14 — browser CRUD still untested)** ·
**calendar month/week stats now server-grouped (live browser case passed)**.

**Partial:** external email/WhatsApp delivery (providers unconfigured, never sent — secrets
table and config-probe UI ready) · recovery email delivery (operator path works live; SMTP
pending) · QR on physical devices & PWA install (simulated only; printable-QR procedure ready)
· reports/portals/timeline still aggregate in the browser (Phase 4 items 3–6).

**Resolved today:** SMS — verified working-as-designed (live DB has zero SMS records; legacy
support retained, route intentionally removed; re-adding SMS is a client scope decision).
Backup/restore — `npm run backup` automation with runbook; dumps live in gitignored `backups/`
(restored from `tmp/`), restore itself not yet rehearsed.

**Not working / not established:** no deployment/host · no git history · security-definer grant
review (~38 advisor warnings) open · leaked-password protection not enabled (dashboard toggle)
· never-tested external delivery of any kind · physical-device acceptance.

## 4. Work completed today (19 October)

| # | Item | Evidence |
|---|---|---|
| 1 | Whole-repo functionality audit (fresh) | [FUNCTIONALITY_STATUS_2026-10-19.md](FUNCTIONALITY_STATUS_2026-10-19.md) |
| 2 | Root-caused + fixed mock e2e `PORT=0` timeout (Playwright pins `PORT=4203`) | 28/28 with `PORT=0` forced |
| 3 | `.gitignore` hygiene (uncommitted, index untouched) | worktree change |
| 4 | Ordered fix plan | [FIX_PLAN_2026-10-19.md](FIX_PLAN_2026-10-19.md) with live statuses |
| 5 | **Backend release applied + verified**: schema/data backup → preflight → Events package (table+RLS+functions, cron paused) → ledger reconciliation (preconditions enforced) → `search_path` pin on `change_enrollment_status` | backups in `tmp/audit/db/`; only `202610130003/0004` (excluded one-offs) remain unrecorded |
| 6 | **Phase 4.1 — attendance workspace**: `get_attendance_workspace_page` replaces N×500 enrollment scan + full day read; QR identity uses targeted reads; offline capture unchanged | deployed + regression PASS + live 4/4 |
| 7 | **Phase 4.2 — calendar day stats**: `get_attendance_day_stats` replaces full-month row download; mock grouping preserved | deployed + regression PASS + live calendar 1/1 |
| 8 | Live spec maintenance: stale dropdown assertion rewritten to assert the batch reaches the server request (dropdown is academy-wide by design: 21 students vs largest batch 14) | live case passes |
| 9 | **Backup automation (Phase 5.1)**: `npm run backup` script, `/backups` gitignored, dumps relocated from `tmp/`, runbook with coverage limits | real run exit 0 → `backups/2026-10-19T09-17-24/` |
| 10 | **Six-partial triage**: SMS confirmed done-by-design (0 SMS rows live); delivery/recovery/device items reduced to external inputs with complete runbooks | live DB query + doc review |

Bugs found and fixed by the regressions during deployment: dollar-quote generator defect
(aborted safely, no partial apply), enum-to-text RPC return mismatch, fixture unique-constraint
violation, exact-count assertions colliding with real production data (moved to empty 2028-06
range), wrong parent-ownership join key (`parents.profile_id`), false-negative `search_path`
assertion. None were worked around by weakening checks.

## 5. Blocked — needs owner input

| Blocker | Unblocks |
|---|---|
| Permission for one git commit | Version-control safety net (biggest residual risk) |
| Resend accounts + 2 edge-function secrets + one authorized recipient | Real delivery E2E (Phase 2) |
| Supabase Auth SMTP config (or accept operator fallback) | Emailed recovery links |
| Host/domain | Deployment, rollback rehearsal, recovery-host smoke test (Phase 3) |
| Target phones | QR/PWA/offline device acceptance |
| Copy `backups/` off this machine + rehearse restore on a scratch project | Real disaster-recovery path |
| Auth dashboard: enable leaked-password protection | Advisor item closure |

## 6. Risk register (highest first)

1. **No git commits** — the entire product, including both deployed migrations' source, exists only as a working tree.
2. **No durable backup** — today's dumps sit in gitignored `tmp/`.
3. **No host** — client has nothing deployed; rollback story theoretical.
4. **Security-definer grant review open** — ~38 advisor warnings unreviewed per function.
5. **External delivery never demonstrated** — no email/WhatsApp/SMS promise is supportable.
6. **Unbounded loads remain** in reports/portals/timeline (Phase 4.3–4.6).
7. **Live Events browser CRUD untested** (objects + SQL verified only).

## 7. Next actions in order

1. Initial git commit (once permitted).
2. Phase 4.3: paged report rows + server totals → 4.4 coach portal → 4.5 parent portal → 4.6 student timeline.
3. Close hardening: security-definer grant review, leaked-password toggle, Events browser CRUD check.
4. Owner actions: provider secrets (or disable delivery explicitly), Auth SMTP decision,
   host + device acceptance, move `backups/` to durable storage, rehearse one restore.

*Generated 19 October 2026. Backend writes performed today were operator-approved with a
pre-write backup; every script verified between steps. No messages sent, no site deployed, no
git commits created.*
