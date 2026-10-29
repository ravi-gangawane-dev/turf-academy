# Functionality and API audit - 27 October 2026

This report supersedes conflicting status claims in the older audit and implementation reports. It covers a scan of all 58 existing Markdown documents, current source inspection, a production build, unit/database tests, and selected read-only checks against the configured Supabase project. It is not certification of every live write workflow.

## API-only requirement and changes made

Normal development, live and production configurations use authenticated Supabase APIs. Supabase JavaScript `.from()`, `.rpc()`, Auth, Storage and Edge calls are network APIs; they are not direct browser database connections. Domain services/repositories supply application data, and signals hold API results for rendering. Static labels, appearance preferences and authentication session storage are not business-record sources.

- Mock business arrays are initialized only in test/mock mode. The store rejects local-only business mutations in API mode, and rejects contradictory Supabase-plus-mock configuration. Unit/E2E fixtures remain available for isolated testing; they are not a fallback for failed API calls.
- Offline attendance is disabled in the runtime API configuration. Staff and coach queue services reject offline writes and do not load or automatically replay existing IndexedDB operations. Existing queued data is preserved untouched. The queue navigation was removed; its old URL redirects to online attendance. Offline UI text now requires reconnection.
- Parent edits now preserve existing API consent flags, including `whatsapp: false`, while updating the chosen communication channel.
- Staff QR lookup now uses the same India civil date as the staff attendance workspace, with a midnight-boundary regression test. A configurable academy-wide timezone refactor remains open below.
- Preferences now query only fields supported by the deployed settings schema. The previous query for undeployed academy code/logo/description/theme columns broke dashboard loading. Those unused fields were removed from the shared preference model; actual settings still come from the API.

The API-only rule does not imply all business workflows are complete. API-backed pages can still have missing workflows, backend deployment gaps, or incorrect calculations.

## Confirmed remaining defects and deployment gaps

| Priority | Finding | Current evidence and impact |
|---|---|---|
| High | Enhanced academy settings cannot be saved against the current schema | Live settings API exposes only the original columns. `academy-settings-page.ts` submits `academy_code`, `academy_logo_url`, `academy_description`, and `theme_preference`; `AcademySettingsService.save()` forwards these fields. Migration `202610230009_academy_settings_enhanced.sql` exists locally. Read loading works after the preference fix; the enhanced save contract remains incompatible. No live settings write was attempted. |
| High | Notification manual-delivery backend is not deployed | Current staff browser requests receive HTTP 400: `column notifications.manual_state does not exist`. `NotificationsService.counts()` deliberately retries the basic counts through an older API-compatible query, so basic lists still load. Manual WhatsApp evidence/history features require their matching migrations and Edge deployment; a rendered list is not acceptance of those features. |
| High | Existing parent test account cannot use its portal | Fresh live checks find no visible linked parent record for the test profile. All six parent routes in this sweep show unavailable/error states. This is a confirmed account-link/fixture failure, not proof that all parent accounts fail. |
| High | Student form coach selection is not persisted | `student-form-page.ts` loads/exposes `coach`, but excludes it from the save mutation. The displayed selection cannot be saved by this form. |
| High | Parent child attendance totals use only the loaded history page | `parent-child-profile-page.ts` derives counts/rate from `workspace.attendance`, although the API supplies `attendanceSummary`. Histories beyond the initial page can show incorrect totals and percentages. |
| Medium | Overview document totals undercount | Student and parent child profile templates use `workspace.documents.length` instead of API `documentTotal`. The staff document table itself is paginated; the overview count is still incorrect. |
| Medium | Coach student detail controls have no working action | `coach-portal-page.html` contains unbound More, Documents and Parent details buttons. Notes opens general notifications rather than student notes. |
| Medium | Dashboard recent check-ins are not reliably recent | `supabase-dashboard.repository.ts` reads today's attendance without descending check-in ordering/non-null filtering, then slices five rows. |
| Medium | Date consistency is incomplete outside the repaired staff QR lookup | `coach-portal.service.ts` still uses UTC date extraction; staff repository uses fixed Asia/Kolkata while server settings support a configurable timezone. Custom zones and midnight boundaries need a shared API-settings-based date policy. |
| Medium | Lint command does not work | Fresh `npm run lint` fails: no lint target exists in `angular.json`. Build/unit checks pass, but they do not replace lint. |

## Missing end-to-end workflows

These source-confirmed gaps remain despite older summary documents claiming zero missing capabilities.

| Workflow | What exists | What is missing |
|---|---|---|
| Student documents | Readable metadata, paged document table, generic Storage service | Student workspace upload, signed open/download and delete actions. |
| Detailed medical editing | Medical records display; blood group in student form | Editor/API workflow for allergies, conditions, medications, emergency notes and doctor details. |
| Assign a discount to a student | Discount catalogue, `student_discounts` schema, generation reads assigned discounts | Application assignment workflow with validity/eligibility and confirmation. |
| Apply late-fee rules | Late-fee rule CRUD | Charge assessment/application workflow consuming these rules, with idempotency and audit evidence. |
| Link invited coach/parent identity | Invite creates Auth/profile records | Invite flow selection/linking of `parents.profile_id` or `coaches.profile_id`. Portal services require those links. |

## Other limitations confirmed in source

- Staff attendance workspace requests only 500 rows at offset zero; manual search and roster-derived summaries cannot cover larger datasets. Parent form student selection similarly stops at 500. Some coach roster reads lack paging. These are threshold defects, not failures demonstrated at current live volumes.
- Parent child profile history tabs show initial pages without full paging. Staff detail pages have separate paged APIs.
- Settings JSON export increments offsets by 500 and treats any shorter page as completion. A lower server row cap can silently truncate output. The shared `readAllPages` helper already handles this elsewhere.
- Parent save/link, coach specialization replacement, and Auth/profile status updates use multiple requests without a transaction spanning all steps. Failure between steps can leave partial changes. Student create retry uses a new ID/upload lifecycle; lost-response recovery needs fault tests.
- Legacy `AcademyFacade.linkStudentToParent()` and `addMonthlyCharge()` remain error-message stubs for its legacy REST interface. Active parent and fee pages use their domain-service APIs; these dead/legacy methods must not be mistaken for proof that the active workflows are absent.
- Browser business data is not persisted as an offline read cache. An offline shell can render, but live data and changes require an API connection by the user's explicit choice. Old offline-replay defects remain in dormant opt-in/test code and are not supported production behavior.
- Support contact values in environment configuration are static configuration, not live academy contact records. Verify them before release.

## Verification on this pass

- Production `npm run build`: passed.
- `npm test -- --watch=false`: 113 files, 534 tests passed. New coverage includes empty API-mode state, blocked local mutations, contradictory backend configuration, blocked offline writes/replay, preserved parent consent, supported settings reads and the QR midnight boundary.
- `npm run test:notifications:db`: all six SQL suites passed, plus migration preservation and local snapshot/grant restoration checks. PGlite with simulated auth is not production deployment or a real restore drill.
- `npm run test:notifications:live`: 14 checks passed and 2 blocked. All four Auth/profile checks and endpoint role authorization checks passed. Parent ownership is blocked by a missing profile link; coach ownership is blocked by an empty inbox. No messages were sent.
- 40 role/route read checks ran in a real browser with business writes blocked. Initial checks overlapped the preference repair and included two harness selector errors on nested main elements; the seven-route recheck is authoritative for those routes. After replacement, 32 route checks have no observed API/browser error, 2 notification routes show the documented compatibility errors, and 6 parent routes fail for the unlinked test account. This measures only page/read behavior.
- Real-browser offline check: `checkIn` rejects with an online-API requirement, attendance is unchanged and queued-operation count remains zero. No attendance record was written.
- `npm run lint`: failed because the target is absent.

Evidence: [documentation inventory](audit/document-inventory-2026-10-27.md), [initial route sweep](audit/api-runtime-2026-10-27.json), [authoritative rechecks](audit/api-runtime-recheck-2026-10-27.json), [offline check](audit/api-only-offline-2026-10-27.json). Command logs are in `.scratch/audit-{build,tests,db,live,lint}.log`.

## Still unverified / release work

No live customer-data mutations, invitation/recovery emails, notification sends, schema deployment or external publication were performed. Existing read-only Auth sign-ins were used. Full CRUD, financial retries/refunds, all RLS/storage denials, actual provider delivery, scheduler status, physical-phone camera/PWA acceptance, hosted recovery redirects and a complete backup/isolated restore still require their own acceptance checks. A transient notification Edge HTTP 503 occurred once; the recheck cleared it, so it is not classified as a permanent provider outage.

The historical release documents record pending backup/restore and migrations. Current API evidence confirms settings/notification schema gaps, but this pass did not re-read the privileged migration ledger or certify every pending version. Do not deploy every local migration blindly; some historical scripts target named records.

## Corrections to older reports

- Payment history currently succeeds against the live API for Admin and Receptionist; the old Invalid payment view report is stale.
- Events pages/API and existing list/attendance/fee/payment/report routes are implemented; an older absent-backend statement is not current evidence.
- Skipping legacy REST initialization in Supabase mode is intentional: feature services own those API queries. Loading raw Supabase rows into camelCase store models in the constructor is not a valid fix.
- Basic parent editing already preserved status; this pass fixed the separate consent-flags loss.
- Prior mock test passes, read rendering and static source existence do not establish full production functionality.
