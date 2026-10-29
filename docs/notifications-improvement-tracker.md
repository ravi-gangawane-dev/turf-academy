# Notifications audit and implementation tracker

Audit date: 2026-10-22 (Asia/Calcutta). Implementation authorized by the user after reviewing the audit.

## Status and rules

Phase 4 timeline/dialog follow-up (23 October): reproduced and fixed late history responses opening a shared dialog after navigation and missing attempt evidence being displayed as zero. Destroyed pages now ignore history success/error completions; missing counts display Not recorded while recorded zero remains zero. Four regression cases added. Verification: 99/99 notification tests across 15 files, development build and diff whitespace checks passed. No production deployment occurred. Reusable facade/models, broader shared detail/timeline components, action/dialog consolidation and structural cleanup remain open; Phase 4 is not fully closed.

Phase 3 provider follow-up (23 October): reproduced five failing cases and fixed blank/whitespace accepted provider IDs (now uncertain, requiring reconciliation), media-only WhatsApp configuration without a photo (rejected before provider request), in-app routing through the external delivery helper (rejected), and whitespace-only status-lookup IDs (rejected before lookup). Verification: 95/95 notification tests across 15 files, six local SQL suites including manual lifecycle/events, migration preservation, local snapshot restore, and diff whitespace checks passed. Provider requests were mocked; no real sends or Edge deployment occurred. Explicit reconciliation/resend workflows, attendance-linked manual records, bulk outcomes, aggregate optimization and concurrent target acceptance remain open; this does not close Phase 3.

Phase 2 follow-up (23 October): fixed Clear all filters leaving student/recipient/batch choice-search text behind; all three selectors now reset their local search/activity state. Desktop/mobile browser regression verifies the visible search clears. The notification regression suite also exposed settings-tab defects: missing notification form binding, reversed admin preview permission, missing recipient input and missing explicit non-submit button type. Those controls are repaired and covered by the settings spec. Verification: 90/90 notification tests (15 files), 3/3 mock browser tests including desktop/mobile accessibility and legacy-route checks, development build, and diff whitespace check passed. Live filter RPC/role acceptance and migration deployment remain open; no database changes or provider sends occurred.

Latest backup recovery attempt: Docker was relaunched after terminating its hung processes, but WSL data-disk initialization fails (`DockerDesktop/Wsl/ExecError`, filesystem not recognized, `mkfs` exit 1). Docker was stopped; no storage reset was attempted. Backup and Phase 1 deployment remain blocked. Detailed evidence is in [the backup runbook](BACKUP_RESTORE.md).

23 October follow-up: backup tooling now bounds Docker/dump execution, rejects empty output, records explicit migration-ledger dumps and SHA-256 manifests, and keeps incomplete runs distinguishable. Five synthetic CLI regression tests passed. Docker restart did not recover the daemon; a real backup, isolated restore and Phase 1 deployment are still outstanding. See [backup runbook](BACKUP_RESTORE.md).

Latest Phase 1 target verification (23 October): live access and Edge authorization checked; six local SQL suites passed. Deployment remains blocked by stalled Docker backup, missing isolated restore target and an unlinked parent test account. See [target acceptance evidence](NOTIFICATION_PHASE1_ACCEPTANCE_2026-10-23.md). No migrations, Edge deployment or real sends occurred in this verification session.

- Current milestone: **Phase 1 implementation and local database verification complete; staging/deployment acceptance remains open**. Later-phase work remains partial.
- Local implementation, local verification, and deployed verification are separate states.
- No production schema deployment or message sending has been performed for this work.
- Preserve notification IDs, content, recipient history, existing role inboxes, and working delivery safeguards.
- Use the existing custom dialog system, not PrimeNG dialogs.
- New Angular components must have separate TS, HTML, SCSS/CSS, and spec files.
- Never treat opening WhatsApp or staff confirmation as provider-verified delivery.
- Before database deployment: verify backup/restore, deployed migration state, effective grants, and staging regression results.

## Executive summary

The four staff delivery routes already share NotificationsPage, NotificationsService, and the notifications table. Consolidate navigation and filtering rather than rewriting working pagination, request deduplication, stable sorting, and atomic delivery claims.

Retain separate template management, academy event management, and recipient-scoped parent/coach inboxes. Persist manual WhatsApp workflow separately from provider evidence. Evolve existing delivery-shaped notification rows instead of adding a duplicate deliveries table immediately.

## Feature inventory and consolidation decisions

| Feature / route | Data and purpose | Decision / migration |
|---|---|---|
| /notifications | Staff delivery list, notifications table | Canonical management page |
| /notifications/whatsapp | Same list with fixed channel | Compatibility redirect to ?channel=whatsapp |
| /notifications/failed | Same list with initial failed status | Compatibility redirect to ?status=failed |
| /notifications/delivery-status | Same list/actions, different title | Merge into list and details; retain old URL redirect |
| /notifications/templates | notification_templates; admin CRUD and previews | Retain separate page |
| /notifications/events | academy_events; staff scheduling and automation | Retain separate page; expose navigation |
| /settings/notifications | academy_settings and test WhatsApp action | Retain; repair test behavior |
| /parent/notifications | Parent-owned inbox, read state | Retain |
| /coach/notifications | Coach-owned inbox, read state | Retain |
| Parent detail notification panel | Parent-scoped history and queue_parent_message | Retain contextual view; reuse shared contracts |
| Attendance WhatsApp action | Saved attendance, guardian relationship, local preview | Persist manual workflow; preserve saved timestamps |
| Attendance dashboard helpers | Older duplicate WhatsApp/template helpers | Verify reachability before removal |
| Attendance trigger | Check-in/check-out/absence notices | Preserve; test update/correction coverage |
| SQL cron automations | Birthday, fees, events, absence follow-up | Preserve; generation is not external delivery |
| Birthday email trigger | Queue email counterpart | Preserve correlation and idempotency |
| notification-delivery Edge Function | Authenticated provider send/status | Harden and preserve |
| Notification bell / legacy REST repository | Mixed count/state sources | Repair counts; remove unused coupling only after reference review |

## Report A — findings and progress

Statuses: **Open**, **In progress**, **Local verified**, **Migration prepared**, **Deployed verified**, **Preserve**. A prepared migration is not an applied fix.

| ID | Priority | Audit finding and root cause | Recommended action | Progress |
|---|---|---|---|---|
| N-001 | P1 | Four routes share a component; delivery-status adds no distinct workflow | Central list with URL presets | Local verified: canonical page and compatible redirects; deployed verification pending |
| N-002 | Preserve | Exact backend count, pagination, sort allowlist and ID tie-breaker exist | Preserve and regression-test | Preserve |
| N-003 | Preserve | Search debounce, pending-load deduplication and stale-response protection exist | Preserve in facade | Preserve |
| N-004 | P0 | notifications_staff_write permits broad staff FOR ALL access, including evidence fields | Trusted mutations and restricted grants; verify deployed access | Local SQL verified: direct mutation denied, trusted queue/service claim work; active recipient isolation and recursive-policy fix verified; staging/deployment pending |
| N-005 | P0 | coach_id ON DELETE CASCADE can erase notification history | Safe retention migration and deletion tests | Local SQL verified: coach and parent deletion retain notices; target-environment backup/restore and deployment pending |
| N-006 | P1 | pending KPI adds queued + sent, including published in-app notices | Correct pending semantics; later full evidence-aware KPIs | Local verified for pending count; new in-app publication migration prepared |
| N-007 | P1 | DB enum includes sending; list model/filter omit it | Align contracts | Local verified |
| N-008 | P1 | Shared unread filter uses status rather than read_at; staff model omits read state | Correct filter; later staff read presentation | Unread query local verified; staff inbox-read timestamp now displayed separately from delivery status |
| N-009 | P2 | Five count queries per reload; counts only share channel scope | Filtered aggregate and fewer round trips | Partial local verified: four HEAD queries now share all table filters; single aggregate optimization remains open |
| N-010 | P1 | No URL persistence/date range/student/batch filters; hidden route constraints | Typed query model and full reset | Implementation/local verified: URL filters, exact student/recipient selectors, recorded batch context and unlinked scope; shared list/count predicates and reset; browser/staging acceptance pending |
| N-011 | P1 | Manual WhatsApp opens only update local UI | Durable manual lifecycle and event history | Central management lifecycle implemented with migration prepared; attendance click-to-chat integration and SQL verification remain open |
| N-012 | P1 | Browser launch outcome cannot reliably be established | Record opening request, preserve unknown delivery | Central management saves an opening request before explicit browser action; staff confirmation/cancellation never assert provider delivery; deployment and attendance integration pending |
| N-013 | P1 | Manual attendance honors opt-out; automated/generic queues differ | Shared backend recipient eligibility | Local SQL verified: generic queue/dispatch guards, automated parent WhatsApp/birthday email opt-outs, inactive recipients and disabled channels; staging pending |
| N-014 | Preserve | Atomic claim, uncertain-outcome blocking and email idempotency exist | Preserve and integration-test | Preserve |
| N-015 | P1 | Provider-ID rows only refresh; uncertain rows lack reconciliation action | Explicit retry/resend/reconcile | Partial: eligible definite failures have confirmed retry; uncertain reconciliation and explicit resend remain open |
| N-016 | P1 | Mutable status/count/error cannot reconstruct attempts; no notification audit trigger | Append-only notification_events | Migration prepared: future creation/delivery/read evidence with before/after values; staff timeline implemented; SQL execution and manual events remain open |
| N-017 | P1 investigation | Cron generates rows; recurring external dispatcher not found | Verify deployment and intended dispatch model | Repository delivery setup explicitly specifies staff-triggered external dispatch; deployed configuration still unverified |
| N-018 | P1 | Unknown provider states become sent; read/open/click collapse into delivered | Refuse unsupported evidence; later preserve raw/read states | Unsupported-state guard local verified; raw/read evidence still open; Edge deployment pending |
| N-019 | P1 | No detail/timeline/copy/bulk/manual WhatsApp actions in staff list | Reuse custom dialogs and state-aware actions | Partial: full details, copy, bounded timeline and confirmed definite-failure retry implemented; history migration pending; bulk/manual/reconciliation remain open |
| N-020 | P2 | Template CRUD works; placeholders lack event-contract validation; SMS hidden | Rendering parity, supported-channel policy | Open |
| N-021 | P3 | Events CRUD exists but shared section navigation omits it | Expose Events & Holidays | Local verified: Events & Holidays in post-hero navigation |
| N-022 | P1 | Test action ignores test text, uses attendance text and fallback number | Explicit recipient and test preview | Local verified |
| N-023 | P2 | Older dashboard template lookup uses unsupported keys and ignores rendered content | Trace callers, consolidate safely | Open |
| N-024 | P2 | Staff bell depends on unloaded legacy state; parent count fetches a list | Backend count and data ownership | Open |
| N-025 | P2/P3 | Full message/error rows, obsolete CSS and local dialogs | Compact previews, shared dialogs, mobile/keyboard checks | Partial: compact previews and shared detail/history dialogs; cleanup and browser/mobile checks remain open |
| N-026 | P1/P2 | Trigger misses update-to-check-in branch; hardcoded timezone paths | Verify correction contracts and academy timezone | Migration prepared for null-to-check-in updates and academy-timezone attendance text; SQL correction tests and wider timezone unification remain open |

The active click-to-chat component does not mark WhatsApp delivered. Its missing durable history is distinct from false delivery reporting. N-004 is a code-verified policy gap, not a demonstrated live exploit. Effective grants and deployed policies need integration verification.

## Evidence map / affected files

| Area | Files and functions |
|---|---|
| Staff list | [notifications-page.ts](../src/app/features/notifications/notifications-page.ts), adjacent HTML/SCSS/spec; loadPage, reload, delivery, clearFilters |
| Data access | [domain-services.ts](../src/app/core/supabase/domain-services.ts): NotificationsService.page/counts/deliveryAction; template/event services |
| Provider | [index.ts](../supabase/functions/notification-delivery/index.ts), [providers.ts](../supabase/functions/notification-delivery/providers.ts): claim/send/status, deliver, deliveryStatus |
| Security | [core security](../supabase/migrations/202609040002_security_and_workflows.sql), [coach scoping](../supabase/migrations/202609050015_coach_portal_security.sql), [delivery](../supabase/migrations/202609240005_notification_delivery.sql) |
| Automation | [automation migration](../supabase/migrations/202610130002_academy_notification_automations.sql), 202610130005_birthday_email_templates.sql |
| Manual WhatsApp | [repository](../src/app/core/api/supabase-attendance.repository.ts): whatsappMessage; core/services/whatsapp.service.ts; shared/whatsapp-action/* |
| Settings | [academy-settings-page.ts](../src/app/features/settings/academy-settings-page.ts): openTestWhatsAppMessage |
| Templates/events | src/app/features/notifications/notification-templates-page.* and academy-events-page.* |
| Dialogs | src/app/shared/dialog/dialog.service.ts and interaction-dialog facade |
| Navigation/inboxes | src/app/app.routes.ts; shared/notification-section-nav/*; features/parents/parent-portal.service.ts; features/coach/coach-portal.service.ts |
| Bell/legacy | src/app/layout/staff-layout/*; core/state/academy.facade.ts; core/api/http-academy.repositories.ts |

## Report B — consolidation opportunities

| ID | Current duplication | Recommendation | Benefit / limitation |
|---|---|---|---|
| C-001 | All / WhatsApp | Channel filter | One workflow; preserve old links |
| C-002 | All / Failed | Status filter + KPI shortcut | Failures remain discoverable |
| C-003 | All / Delivery status | Status column + timeline | Remove redundant navigation |
| C-004 | Pending / Sent / History | State/date filters | No additional pages |
| C-005 | Manual/provider WhatsApp | Shared identity, distinct execution/evidence | Never infer provider delivery from manual actions |
| C-006 | SQL/client/template rendering | Shared placeholder contract and parity tests | Preserve rendered message snapshot |
| C-007 | Page-local dialogs | Existing DialogService | Consistent focus and confirmation |
| C-008 | Parent panel / central list | Shared query/detail contracts | Keep useful contextual entry |
| C-009 | REST / Supabase abstractions | Supabase feature ownership | Remove only proven-unused code |

## Report C — priority, effort and dependencies

| Priority | IDs | Proposed work | Estimate | Dependencies |
|---|---|---|---|---|
| P0 | N-004 | Trusted mutation boundary and direct-access tests | 2–10 days | Migration, staging grants, Edge compatibility |
| P0 | N-005 | Retention migration | 1–5 days | Verified backup/restore and deletion tests |
| P1 | N-006/007/008 | Honest status/read semantics | 2–5 days | Existing enum, model and aggregate contracts |
| P1 | N-011/012/016 | Manual lifecycle + event history | 5–10 days | Trusted operations and event schema |
| P1 | N-013 | Recipient eligibility | 2–5 days | Queue/automation/claim contracts |
| P1 | N-015/018 | Retry/resend/reconcile | 5–10 days | Provider evidence and event history |
| P1 | N-022 | Safe test action | <2 days | Existing dialog and phone validation |
| P1 | N-001/010/019 | Central page, URL filters, actions | 5–10 days | Status definitions, existing list components |
| P1 investigation | N-017/026 | Dispatch deployment and update-based attendance verification | 1–5 days discovery | Staging and actual operation contracts |
| P2 | N-009/020/023/024/025/026 | Aggregates, rendering, ownership, dialogs, timezone | 2–5 days per workstream | Earlier phases |
| P3 | N-021/025 | Discovery/cosmetic cleanup | <2 days | Functionality migrated first |

Overall planning estimate: **25–43 engineer-days**, with overlapping workstreams; not a delivery commitment. Provider/staging access can extend calendar time.

## Report D — target architecture and design

One staff sidebar item: **Notifications**. Immediately after each hero: **Management | Templates (admin) | Events & Holidays**. Parent/coach inboxes and Settings remain distinct.

Management: backend KPIs (Total, Sent, Delivered, Read where supported, Pending, Failed, WhatsApp), combined filters, one paginated table, and Actions last. Define delivery-record versus logical-message count units. Read and Delivered may overlap; do not imply all KPIs sum to Total.

Columns: ID, recipient/name/role/destination, linked student, type, channel/mode, short message preview, status/evidence source, created time, sent/confirmed time, actions. Use academy timezone. Full content and timeline live in details.

Filters: search, channel, state, type, date range, recipient, student, batch; validated URL query parameters, stable sorting, clear-all. Historical batch filtering needs source-event context, not current enrollment inference.

Actions: view/copy; open manual WhatsApp; staff-confirm sent; cancel; eligible provider send/retry; refresh; explicit resend; reconcile uncertain outcome. Bulk actions need eligibility checks and per-record outcomes; do not bulk-open WhatsApp tabs.

Reuse NotificationsPage, existing NotificationsService, PageHero, SummaryMetricCard, Pagination, ColumnFilter, TableTools and DialogService. Introduce a feature facade and typed contracts rather than parallel services. Extract presentational filters/table/actions/details where responsibilities justify it.

Keep notifications as delivery-shaped rows and notification_templates as configuration. Add notification_events for append-only transitions/attempts/actors/errors. Add source correlation first; defer a separate notification_deliveries table until justified. Recipient-facing APIs must not expose internal delivery diagnostics.

Lifecycles:

- Manual: Draft → Ready → launch requested → staff-confirmed sent / cancelled / observable launch failure. Delivery remains **Unknown**.
- Provider: Queued → processing → provider accepted → delivered → read if supported. Definite failure may retry; uncertain outcome requires reconciliation.
- In-app: Published → Read.

Migration: backup/restore verification; additive schema; retain IDs/content; no inferred historical manual sends; preserve uncertain claims; backfill snapshots explicitly labelled as snapshots; compare row counts; verify retention; deploy compatibility before cleanup.

Role rules: admin/receptionist manage deliveries and events; only admin edits templates/settings; parent/coach read and acknowledge their own inboxes. Trusted backend operations enforce transitions. No unrestricted client evidence updates or history deletion.

## Report E — implementation roadmap

- [ ] Phase 1: implementation and local SQL/UI verification complete; target-environment backup/restore, concurrent-worker checks and deployment acceptance still pending.
- [ ] Phase 2: canonical list, post-hero navigation, combined URL filters, old-route compatibility.
- [ ] Phase 3: manual lifecycle/events, reconciliation, aggregate queries and measured indexes.
- [ ] Phase 4: reusable facade/models, filters, detail/timeline, actions and shared dialog integration.
- [ ] Phase 5: full staging role, migration, accessibility and end-to-end verification (tests also accompany every phase).
- [ ] Phase 6: remove only proven-unused routes/helpers/styles after parity verification.

## Regression checklist

- [ ] Staff cannot directly forge provider evidence or reset claims; parents/coaches cannot access other recipients.
- [ ] Inactive accounts denied; retention preserved on parent/coach deletion.
- [ ] Manual: valid/invalid numbers, missing contact, opt-out, primary/multiple guardians, saved time, preview parity.
- [ ] Manual: launch does not assert delivery; confirmation stores actor/time; cancel/reopen/duplicate tabs/reloads.
- [ ] Provider: disabled channel, atomic claim, concurrent sends, timeout, acceptance/save failure, known failure, resend confirmation.
- [ ] Unknown provider statuses do not become sent; read evidence stays distinct; scheduling respected.
- [ ] Routes/filters persist through refresh/back; combined filters, reset, stable sorting/paging, KPI scope.
- [ ] Empty/loading/error/stale responses; full message/timeline; eligibility; bulk partial failure.
- [ ] Keyboard/focus/Escape/mobile; Actions last and visible.
- [ ] Trigger insert/update/correction coverage; automation idempotency; preferences; template rendering; academy timezone.
- [ ] Migration rehearsed with row-count checks and verified restore strategy.

## Verification log

| Date | Scope | Result / limit |
|---|---|---|
| 2026-10-22 | Initial audit: notification pages/queries/templates/events, providers, list services, WhatsApp action and section navigation | 44 tests across 9 files passed locally; mocked provider/network responses |
| 2026-10-22 | Live SQL / provider / browser audit | Not executed; no live delivery, production permission or browser accessibility certification |

## Change log

- 2026-10-22: Saved audit findings, architecture, estimates, migration precautions, regression checklist and phased roadmap. Began Phase 1 local implementation.

## Next actions

1. Continue remaining Phase 1 items: recipient eligibility across automated generators, status/reconciliation design, and attendance update verification.
2. Rehearse SQL changes on a disposable/staging database; do not mark deployment complete from static inspection.
3. Proceed through the remaining phases while preserving the open audit IDs and updating this tracker.

## Phase 1 batch 1 ? 2026-10-22

- [x] Save audit and phased tracker.
- [x] Replace hardcoded WhatsApp test fallback with an explicit recipient field.
- [x] Preview actual test content through DialogService; cancel performs no launch.
- [x] Launch directly from the confirmation action; report only opening requested and delivery unconfirmed.
- [x] Use a non-submit preview button so testing cannot save settings accidentally.
- [x] Fix unread query to use read_at; include sending in staff status filters/types.
- [x] Exclude sent/published messages from pending; reduce summary requests from five to four.
- [x] Reject unknown provider statuses without replacing existing delivery evidence.
- [x] Prepare migration restricting direct client writes and preserving coach-linked history.
- [x] Prepare trusted queue/claim guards: active recipient, opt-out, due time, existing provider ID, processing state and idempotency.
- [x] Add local regression tests and a rollback-only SQL integration suite.
- [ ] Execute SQL integration suite against a migrated disposable/staging database.
- [ ] Verify backup/restore and deploy migration and Edge Function.
- [ ] Validate production roles/provider configuration after deployment.

Artifacts:
- [Migration](../supabase/migrations/202610220002_notification_integrity.sql)
- [SQL regression suite](../supabase/tests/notification_integrity.sql)
- [Settings regression tests](../src/app/features/settings/academy-settings-page.spec.ts)
- [List-query regression tests](../src/app/core/supabase/notification-list.spec.ts)
- [Provider regression tests](../src/app/core/supabase/notification-providers.spec.ts)

Verification: **56 tests across 10 files passed locally**. Angular development build passed. Diff whitespace check passed. No real WhatsApp/provider messages were sent. Provider tests inject mocked fetch; they do not execute the deployed Edge handler.

Database validation limitation: docker.exe is installed, but docker info did not return a daemon response and was stopped. No psql executable was available on PATH. The SQL suite was authored but **not executed**; no database migration was applied. It requires active admin and receptionist test profiles, a migrated staging database, and a postgres session. Its fixtures roll back. Sequential duplicate-claim checks do not replace a concurrent-worker integration test.

Remaining semantic work: historical queued in-app rows are not rewritten by this migration; read/provider evidence and manual lifecycle remain separate future work. Claiming now requires an active linked parent or coach; review any legitimate legacy rows with neither before rollout. Old routes, manual activity persistence, aggregate filter scope and the rest of the roadmap remain open.

Reproduce local tests:

```powershell
npx ng test --watch=false --include=src/app/features/notifications/*.spec.ts --include=src/app/core/supabase/notification-*.spec.ts --include=src/app/features/settings/academy-settings-page.spec.ts --include=src/app/shared/whatsapp-action/whatsapp-action.spec.ts --include=src/app/shared/notification-section-nav/notification-section-nav.spec.ts
npx ng build --configuration development
```

## Phase 2 batch 1 - recorded 2026-10-23

Continued the interrupted consolidation batch. The prior Phase 1 SQL migration remains unapplied; no message sends or database writes were performed for this batch.

- [x] Use one Notifications Management page for staff delivery records.
- [x] Replace redundant section links with Management, Templates (admin only), and Events & Holidays, directly after the hero.
- [x] Redirect old WhatsApp/Failed/Delivery Status URLs while preserving additional query parameters.
- [x] Add visible search, channel, status and inclusive date-range filters.
- [x] Persist search, channel, status, type preset, column filters, dates, paging and sorting in URL parameters.
- [x] Restore state on query navigation; avoid duplicate loads for the same state.
- [x] Validate URL values, reject invalid edited date ranges, and clear hidden presets with clear-all.
- [x] Keep backend pagination, stable sorting, debouncing and stale-result protection.
- [x] Show compact message previews and full details using the existing DialogService.
- [x] Explicitly label channel-wide summary scope rather than imply that extra table filters affect KPIs.
- [x] Verify route/URL integration, query contracts, backend date bounds and notification regressions: **57 tests across 10 files passed**.
- [ ] Student and batch filters with correct historical source relationships.
- [ ] Shared filter scope for backend aggregates and complete evidence-aware KPIs.
- [ ] Copy, timeline, bulk, manual sending and reconciliation actions.
- [ ] Browser accessibility/mobile and live-role acceptance checks.

Key files:
- [Query contract and redirects](../src/app/features/notifications/notification-query.ts)
- [Management page](../src/app/features/notifications/notifications-page.ts)
- [Page template](../src/app/features/notifications/notifications-page.html)
- [Section navigation](../src/app/shared/notification-section-nav/notification-section-nav.html)
- [Application routes](../src/app/app.routes.ts)
- [Router integration tests](../src/app/features/notifications/notifications-navigation.spec.ts)

Date-range queries currently follow the existing device-local calendar-day convention and the UI labels that behavior. Academy-timezone unification remains N-026; do not claim it is complete.

Validation command:

```powershell
npx ng test --watch=false --include=src/app/features/notifications/*.spec.ts --include=src/app/core/supabase/notification-*.spec.ts --include=src/app/shared/notification-section-nav/notification-section-nav.spec.ts
```

Next batch: complete shared filter/aggregate scope and source-linked recipient/student filtering, while keeping Phase 1 migration staging checks visible as an unresolved dependency. No provider sending or production rollout has been verified.

Build verification (2026-10-23): `npx ng build --configuration development` passed. `git diff --check` passed; Git reported only line-ending normalization notices.

## Phase 2 batch 2 - recorded 2026-10-23

- [x] Add recipient contact and linked student-name filters after the hero/navigation; persist both in the URL and reset with clear-all.
- [x] Show the linked student in table rows and full details, preserving records without a linked student when no student filter is active.
- [x] Share backend filter construction between paginated rows and all four summary counts, including selected status, channel, recipient, student, dates, type and search.
- [x] Describe summaries as matching all active filters across every page. Hide cards during loading and clear stale totals on errors or invalid date ranges.
- [x] Verify combined query predicates, summary scope, URL navigation, student display and reset behavior: **60 tests across 10 files passed locally**.
- [x] Angular development build and diff whitespace check passed.
- [ ] Implement a single aggregate request and complete evidence-aware KPI presentation.
- [ ] Add batch filtering with verified historical relationships and exact recipient/student entity selectors.
- [ ] Complete manual lifecycle, event history, reconciliation and live-role/browser acceptance checks.

Student filtering follows the notification's existing student foreign key and searches the linked record's current name. It does not infer historical enrollment, restore deleted names, or snapshot names at delivery time. Recipient filtering searches the stored contact value; it is not a parent/coach name selector. Date boundaries still use the labelled device timezone.

Counts remain four HEAD requests and are not an atomic snapshot with the list. Tests use mocked network responses; real PostgREST/role acceptance remains pending. No migration was applied and no provider messages were sent. Phase 1 SQL staging validation remains unresolved.

Validation uses the Phase 2 batch 1 test command above and `npx ng build --configuration development`. Next implementation work remains tracked under the open audit IDs; earlier batch checklists are historical snapshots.

## Phase 1/3/4 follow-up - recorded 2026-10-23

- [x] Implement staff-only timeline retrieval, ordered newest first and capped at 100 events, through the existing dialog. Empty history is explicitly distinct from reconstructed past activity.
- [x] Add copy-message action with clipboard failure feedback.
- [x] Display sent/published, scheduled, inbox-read and attempt-count evidence in details; inbox read remains separate from delivery status.
- [x] Restrict immediate send controls to due queued/definitely-failed messages without claims, uncertainty or provider IDs. Definite-failure retry requires confirmation; cancel sends nothing.
- [x] Prepare an append-only event table and trigger capturing future creation, delivery changes and reads with before/after evidence. Direct mutations are revoked from client and service roles; recipient inboxes cannot read staff diagnostics.
- [x] Prepare automated parent WhatsApp and birthday-email opt-out guards.
- [x] Prepare attendance null-to-check-in update notifications and use the academy timezone for rendered attendance event times. Existing reference keys prevent duplicate notices for later timestamp edits.
- [x] Add rollback SQL cases for event evidence, staff access, direct-write restrictions, retention, update-based attendance and opted-out/eligible birthday recipients.
- [ ] Execute new SQL cases and validate actual trigger/grant behavior on staging.
- [ ] Deploy compatible database migrations before enabling timeline use in production.

Artifacts:
- [Event history migration](../supabase/migrations/202610230001_notification_events.sql)
- [Automation guards migration](../supabase/migrations/202610230002_notification_automation_guards.sql)
- [Event SQL regression cases](../supabase/tests/notification_events.sql)
- [Extended attendance/eligibility SQL cases](../supabase/tests/attendance_notifications.sql)

Limits: service-role provider updates do not currently carry the initiating staff identity, so those timeline entries explicitly report system/identity not recorded. No old events are fabricated. Manual lifecycle persistence, explicit resend/reconciliation, bulk outcomes, aggregate optimization, historical batch/entity selectors, template contracts, bell ownership and broader timezone/cleanup work remain open. The attendance trigger retains existing precedence when multiple event fields change together; full correction-contract acceptance is pending.

The repository's [delivery setup](NOTIFICATION_DELIVERY_SETUP.md) specifies staff-triggered external delivery, not an automatic sending cron. Actual deployed scheduling remains unverified; no automatic sender was added.

Database check repeated: Docker again returned no server response and was stopped; psql is not on PATH. Neither new migration nor SQL suite has been executed. No real messages were sent.

Verification: **70 tests across 12 files passed locally**, including the settings and attendance WhatsApp regression suites. Angular development build passed. Diff whitespace check passed with line-ending notices. Timeline tests use mocked network responses; SQL permissions, trigger execution and retention are not yet runtime-verified. The initial retry UI test needed to wait for asynchronous fixture loading; after that test correction the full suite passed.

## Phase 3 manual WhatsApp batch - 2026-10-23

- [x] Central Management manual opening request, staff-confirmed sent and cancelled states, with delivery explicitly unknown.
- [x] Preview before persistence; save the request before offering a direct browser action using the saved message snapshot. Preview cancellation and failed saves never open WhatsApp.
- [x] Restore activity from notification rows after reload; warn about duplicate sends when reopening; keep terminal states closed.
- [x] Prepare trusted, row-locked, idempotent RPC with staff authorization, active-recipient/opt-out/channel/schedule checks and provider-claim exclusion.
- [x] Prepare actor/timestamp evidence and append-only manual transition events without changing provider status, provider IDs or sent_at.
- [x] Exclude manual rows from provider delivery KPIs while retaining them in Total; label this distinction.
- [x] Keep old-schema list/count behavior available through a zero-row schema probe on count errors; hide manual controls until returned records contain the new fields.
- [x] Local full suite: **76 tests across 13 files passed**. Final response-normalization follow-up/build validation recorded below.
- [ ] Execute SQL transition/authorization/retention cases and concurrent manual-versus-provider claim tests on staging.
- [ ] Connect attendance click-to-chat to durable source-linked records. This batch covers existing central notification rows only.

Artifacts: [manual lifecycle migration](../supabase/migrations/202610230003_notification_manual_whatsapp.sql), [SQL cases](../supabase/tests/notification_manual_whatsapp.sql), [UI cases](../src/app/features/notifications/notifications-manual.spec.ts).

Deploy migrations in timestamp order before using the manual workflow. Cancellation cannot recall an external message or prove it was not sent, so it does not reopen provider eligibility. Duplicate RPC requests are idempotent; repeated intentional browser openings are not guaranteed duplicate-free. Browser launch success is not asserted. No historical manual activity is backfilled. SQL has not been executed and no messages were sent.

Overall phase completion: **0 of 6 fully closed**. Phases 1–4 are partial, Phase 5 has local checks but lacks staging/browser acceptance, and Phase 6 cleanup remains open.

Final follow-up: all 12 list/service tests passed after normalizing composite RPC responses; Angular development build and diff whitespace check passed. The earlier full run remains 76 passing tests across 13 files. Database execution and deployment remain unverified.

## Phase 1 closure work - 2026-10-23

The earlier database-execution limitation is now resolved **locally**. A disposable PGlite PostgreSQL runner executes selected real migrations and rollback SQL suites without Docker, remote credentials, real contacts or provider sends.

- [x] Fix a UTF-8 BOM that caused the automation-guard migration to fail SQL parsing.
- [x] Fix recursive notification ownership checks that entered the coach RLS policy recursively. The new security-definer ownership predicate checks only the current active profile and its active parent/coach record.
- [x] Require the correct active role for single/all read acknowledgements. Use null-safe role checks, preserving delivery evidence.
- [x] Verify direct notification writes denied for authenticated staff and claim execution allowed for service_role only.
- [x] Execute recipient isolation, inactive recipient/profile, suspended staff, internal history isolation and cross-recipient acknowledgement tests.
- [x] Execute queue idempotency, opt-out, disabled-channel, future schedule, uncertain/provider-ID blocking and sequential duplicate-claim tests.
- [x] Execute parent/coach retention and preservation of pre-existing notification content/provider evidence through migrations.
- [x] Execute automated birthday eligibility and update-based check-in/timezone tests.
- [x] Rehearse pre-migration snapshot restore in a separate local engine; original rows and prior grants restored.
- [x] Re-run UI/provider regression suite: **76 tests across 13 files passed**.
- [ ] Verify effective grants and full migration history in the target Supabase PostgreSQL 17 environment.
- [ ] Run concurrent-worker, live PostgREST/JWT and Edge HTTP acceptance checks.
- [ ] Verify target-environment backup/restore, deploy migrations/Edge code and confirm deployed configuration.

Run: `npm run test:notifications:db`. **Five SQL suites passed**, plus migration-preservation and snapshot-restore checks. Runtime: PostgreSQL 18.6 / PGlite 0.5.11. Auth scaffolding and default grants are simulated; storage policies and cron registration are excluded. No production migration or message send was performed. Local restore is not a production restore rehearsal.

Artifacts: [test runner](../scripts/test-notification-db.mjs), [verification scope and staging checklist](notification-db-tests.md), [access-integrity migration](../supabase/migrations/202610230007_notification_access_integrity.sql), [role-isolation tests](../supabase/tests/notification_role_isolation.sql), [automation tests](../supabase/tests/notification_automation_guards.sql).

Phase 1 is complete for implementation and local verification. It remains open for operational acceptance; this does not mark production deployment complete or close later-phase items.

Final verification: Angular development build passed; `git diff --check` passed with line-ending normalization notices only.

## Phase 2 remaining implementation - 2026-10-23

- [x] Add searchable exact student and parent/coach recipient selectors with restored URL selection, loading/error/retry states and stale-response protection.
- [x] Add recorded batch and unlinked filters. New attendance, fee-due and absence notifications capture batch context at generation; later enrollment/source changes and batch deletion preserve that snapshot. Older notifications remain unlinked; no inferred historical backfill.
- [x] Apply identical entity predicates to list results and every summary count; validate URL identifiers and preserve clear-all/back navigation.
- [x] Restrict entity lookup RPC to active staff and bound results to 30 choices, including the selected record.
- [x] Verify final Notifications code independently of concurrent coach work: **79 tests across 14 files passed** using the focused TypeScript configuration.
- [x] Execute **six SQL suites**, migration preservation and local snapshot restore. Added coverage for batch snapshots, source changes, deleted batches, literal search, selected choices and nonstaff denial.
- [x] Prepare desktop/mobile browser checks for legacy routing, filters, keyboard navigation, overflow and accessibility.
- [ ] Run full-app build and browser acceptance after the other session completes coach service/caller changes. This turn's browser server could not compile those callers; no browser pass is claimed.
- [ ] Apply outstanding migrations to staging and validate the selectors through live PostgREST and staff roles before production rollout.

Reproduce local checks: `npm run test:notifications` and `npm run test:notifications:db`.
Artifacts: [filter migration](../supabase/migrations/202610230008_notification_filter_context.sql), [SQL coverage](../supabase/tests/notification_filter_context.sql), [browser checks](../e2e/notifications-management.spec.ts), [focused test configuration](../tsconfig.notifications.spec.json).

Notification migrations use suffixes 007 (access integrity) and 008 (filter context) to avoid collisions with the concurrent attendance migrations. No deployment or real message send occurred. The local SQL environment boundaries remain documented in [database verification](notification-db-tests.md).

Phase 2 implementation and focused local verification are complete. Browser and operational acceptance remain open, so Phase 2 is not fully closed. Earlier batch checklists describe their state at that time; this entry supersedes their outstanding exact-entity/batch implementation items.

## 2026-10-23 - Local fixes applied (N-024, N-020, N-023, N-026)
| N-024 | src/app/layout/staff-layout/* | Bell counts now sourced from backend: parent/coach use NotificationsService.unreadCount(); staff uses attentionCount() (failed). Removed dependency on unloaded legacy academy.notifications()/parent full-list fetch. Added realtime subscription for bell-visible roles and accessible count labels. |
| N-020 | src/app/features/notifications/notification-template-contract.ts, notification-templates-page.* | Added event-contract placeholder validation aligned to real automation templates, supported-channel policy (in-app/email/WhatsApp only; SMS unsupported), inline form errors, and dynamic channel options. |
| N-023 | src/app/core/services/whatsapp.service.ts, src/app/core/supabase/domain-services.ts, src/app/features/attendance/attendance-page.ts | NotificationTemplatesService.byKey() added. Attendance WhatsApp lookup uses exact active templates (with legacy key fallback), renders placeholders consistently for preview and launch, fixes batch/timestamp usage, and safely falls back to generated messages when no template exists. |
| N-026 | src/app/core/supabase/notification-time.ts, src/app/core/supabase/domain-services.ts, src/app/features/notifications/notifications-page.html, src/app/core/supabase/notification-list.spec.ts | Notification date filters now use the academy timezone (via AcademyPreferencesService) with correct inclusive day bounds and column-filter parity; UI copy updated. |
**Verification (local):**
- npm run test:notifications — 90/90 passed (15 files)
- npx ng test --watch=false --include=src/app/layout/staff-layout/*.spec.ts — 19/19 passed
- Template contract + page specs — 15/15 passed
- npx ng build --configuration development — succeeded
- npx playwright test e2e/notifications-management.spec.ts — previously verified 3/3 passed (unchanged)

**Notes:** Phase 1/5 operational items remain deployment/staging-blocked. N-009, N-015, N-019, N-025 and Phase 4/6 structural items remain open for follow-up.
