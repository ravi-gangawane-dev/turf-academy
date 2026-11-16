# Project Cleanup Audit - Turf Cricket Academy

Date: 2026-11-16. Branch: `main`. Status: **audit only; approval required before implementation**.

No application files, dependencies, assets, databases, or temporary files were changed or deleted for this audit. This report is the only intended new file. There were 23 pre-existing staged changes, including authentication, user management, documentation, and three database migrations. Preserve their staged/unstaged state; do not reset, stash, or commit them as part of cleanup without coordination.

## 1. Executive summary

The strongest immediate opportunity is removing old, unreferenced diagnostic logs. Larger directories contain valuable historical evidence and backups, so their size is not a safe-deletion estimate. Several retired Angular entry points and dependencies warrant a separate code-cleanup change. Branding is protected even where byte-identical copies exist.

| Verified metric | Result |
|---|---:|
| Tracked files inventoried and hashed | 1,020 |
| Tracked UTF-8 text files scanned for references | 929 |
| Tracked working-copy bytes | 48,991,833 |
| Suspected unused source files | 9: eight TypeScript entry points plus one `.bak` file; manual review |
| Safely removable diagnostic logs, subject to approval and recheck | 72 |
| Byte-identical groups | 5 groups, 11 files, 6 redundant copies |
| Duplicate-copy bytes, NOT approved recovery | 1,442,582 |
| Public assets without literal filename/path references | 18 candidates; **0 proven safe to delete** |
| Dependency removal candidates | 3: `date-fns`, `@angular/animations`, collector `express` |
| Safe-list recoverable local bytes | 243,013 bytes (0.232 MiB) |
| Verified production bundle reduction | Not measured; no claim |

Counts are separate populations, not additive. Duplicate branding can also appear in the asset candidate list. The nine source candidates do not count their associated templates, styles, or tests as independently unused files. No claim is made that every unused private member or CSS selector has been identified.

### Scope and method

All tracked files were inventoried and SHA-256 hashed, and readable tracked text was scanned across imports/exports, Angular class names/selectors, templates/styles, lazy routes, provider registration, configurations, tests, scripts, SQL, Edge Functions, deployment files, and documentation. Targeted source review checked the candidate families below. This is a repository-wide static audit, not a line-by-line correctness certification or a live production audit.

Installed packages and generated directories received metadata/size inspection, not full vendor-source review. Remote database rows, Storage objects, deployed Edge Functions, external bookmarks, and production logs were not enumerated. Consequently, missing local references alone never authorize deletion of public assets, migrations, deployed functions, or role-specific features. Secrets are not reproduced.

Reference counts below mean other tracked files containing an exact path (logs), or source symbol/selector/module references (code), as specified. They are not runtime invocation counts. Dynamic imports and concatenated names were considered; externally supplied paths remain a manual-review boundary.

### Tracked inventory by area

| Area | Files |
|---|---:|
| `src/` | 558 |
| `public/` | 44 |
| `supabase/` | 137 |
| `scripts/` | 26 |
| `e2e/` | 39 |
| `docs/` | 126 |
| `artifacts/` | 44 |
| `.cloud-attachments/` | 6 |
| `deployment/` | 7 |
| `monitoring-collector/` | 4 |
| `netlify/` | 1 |
| `api/` | 1 |
| `.github/` | 1 |
| `.vscode/` | 3 |

`docs/` additionally contains ignored/generated files: 228 physical files, including 84 Markdown files. Its 126 tracked files are included above. Generated preview files are not additional source components. See `docs/CONSOLIDATED_ISSUES_2026-11-16.md` for the existing documentation issue catalogue; historical failures there are not current test results.

### Local footprint (metadata snapshot; directories may change while tools run)

| Directory | Files | Bytes | Treatment |
|---|---:|---:|---|
| `tmp/` | 301 | 61,057,872 | Only the explicit log allowlist below is proposed |
| `.angular/` | 43 | 13,539,877 | Rebuildable cache; defer until all build/serve processes stop |
| `dist/` | 357 | 40,231,212 | Build output; retain while preview/deployment uses it |
| `artifacts/` | 1,746 | 539,888,366 | Mixed evidence; includes 44 tracked files; review retention |
| `test-results/` | 280 | 511,630,106 | Test traces/results; preserve evidence before regeneration |
| `playwright-report/` | 1 | 647,619 | Review report retention |
| `.scratch/` | 130 | 8,755,564 | Unknown local work; review, not blanket deletion |
| `backups/` | 6,301 | 239,257,868 | Protected pending restore/retention review |
| `node_modules/` | 33,208 | 339,501,944 | Installed tooling; not unused application files |
| `docs/` | 228 | 17,868,736 | Documentation plus generated preview/evidence |
| `public/` | 44 | 16,568,227 | Build assets; branding protected |
| `screenshots/` | 4 | 194,678 | Evidence retention review |

These values are local file lengths, not Git-history size, compressed downloads, or measured bundle size. They are not summed into a cleanup promise.

## 2. Files safe to delete - P0, category G

The following are completed build/lint/test diagnostic outputs, ignored by Git and not imported, routed, injected, deployed, copied from `public/`, or referenced by exact path in tracked source/configuration/scripts/docs. They do not contain application state or database backups. Deletion removes their historical diagnostic evidence; regenerate future logs by rerunning checks. Recheck that no process is writing them and that approval still covers each exact file.

**P0 here means safe housekeeping, not an outage or a security severity.** No directory-wide deletion is proposed.

| File path | Bytes | Reason | References found | Risk | Confidence |
|---|---:|---|---:|---|---|
| `tmp/audit-lint.log` | 63 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/audit-tests.log` | 111,596 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build-qr.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build10.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build11.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build12.log` | 2,408 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build13.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build14.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build15.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build16.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build17.log` | 3,942 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build18.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build19.log` | 11,116 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build2.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build20.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build21.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build22.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build23.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build24.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build25.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build26.log` | 1,859 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build27.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build28.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build29.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build3.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build30.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build31.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build32.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build33.log` | 455 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build34.log` | 1,317 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build35.log` | 2,981 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build36.log` | 3,031 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build37.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build38.log` | 851 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build39.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build4.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build40.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build41.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build42.log` | 5,008 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build43.log` | 913 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build44.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build45.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build46.log` | 610 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build47.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build48.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build49.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build5.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build50.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build51.log` | 3,035 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build52.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build53.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build54.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build55.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build6.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build7.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build8.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/build9.log` | 2,214 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint10.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint11.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint12.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint14.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint15.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint16.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint18.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint2.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint3.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint4.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint5.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint6.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint7.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint8.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |
| `tmp/lint9.log` | 56 | Disposable diagnostic log | 0 exact-path tracked references | Low | High |

## 3. Files requiring manual review

### A/C/F: source entry points and obsolete implementations - P1

All eight TypeScript entries below have no other non-test executable source reference by exported name, module basename, or selector. Tests and documentation references were deliberately retained in the analysis. `tsconfig.app.json` includes `src/**/*.ts`, so lack of an import does not itself mean a file is outside type checking. Their template/style dependencies must be reviewed as a family; deleting tests merely to obtain a passing build is not acceptable.

| File path | Suspected issue | Potential dependency | Recommendation |
|---|---|---|---|
| `src/app/features/attendance/manual-check-in-page.ts` | Old page has no runtime caller | Its `.spec.ts`, `.html`, `.scss`; old URLs remain in routing | `app.routes.ts` redirects manual check-in/out to `attendance/check-in-out`, served by `QrAttendancePage`. Compare behavior, retain redirects, then retire old family if approved |
| `src/app/features/attendance/offline-queue-page.ts` | Unrouted old offline page | Its spec/template/styles and persisted offline operations | Route redirects to check-in/out. Review offline product policy and existing queued data before retiring |
| `src/app/features/coach/coach-attendance-outbox.service.ts` | Root-provided service without runtime consumer | Its spec; IndexedDB `turf-academy-coach-offline`; `allowOfflineAttendance` gate | Do not erase persisted queues. Decide whether feature is intentionally dormant before removing service/test |
| `src/app/features/parents/parent-profile-form-page.ts` | Old parent form has no runtime caller | Its spec/template/styles and validation helper `nationalPhone` | Parent profile edit now loads `UserProfilePage`. Compare validation and parent permissions before retirement |
| `src/app/features/payments/document-pdf.ts` | Exported `downloadDocument` has no source caller | Historical payment audit; blob-download behavior | Candidate removal after confirming print/export uses current pathways; filename misleadingly implies PDF although helper downloads arbitrary blobs |
| `src/app/features/payments/payment-view-navigation.ts` | Unused navigation component | Companion `.scss`; historical payment documentation | Current payments navigation must be checked; remove both files only as an approved pair |
| `src/app/features/settings/settings-tools-page.ts` | Old tools page replaced in routing | Spec/template/styles; `scripts/build-full-audit-report.mjs` historical references | `settings/tools` loads `AcademySettingsPage`. Preserve backup/settings functionality and update report generator references if retiring |
| `src/app/features/system/module-page.ts` | Generic page has no runtime caller | Spec/template/styles, historic inventories | Confirm no planned module scaffold is needed; retain intentional developer-only routed pages elsewhere |
| `src/app/features/enrollments/enrollments-page.ts.bak` | 19,856-byte source backup; zero other tracked filename references | May contain unique user work; not included by `**/*.ts` | Compare against current page and Git history. Delete only after owner confirms unique work is preserved |

No speculative private-method removal is authorized. Referenced exports, signals read in templates, DI factories, and lifecycle hooks are not dead code merely because a text search finds few callers.

### G/C: temporary, historical, deployment, and documentation files

| File path | Suspected issue | Potential dependency | Recommendation |
|---|---|---|---|
| `tmp/` | Mixed disposable and important content | `scripts/audit-ui.mjs` writes `tmp/ui-review/${phase}`; recovery/preflight docs cite evidence here | Do not delete wholesale; use only section 2 allowlist |
| `tmp/audit/db/backup-schema-2026-10-19.sql`, `tmp/audit/db/backup-data-2026-10-19.sql` | Historical database snapshots | Recovery/release rollback | Retain until replacement backup is restore-tested and retention approved |
| `tmp/release-2026-10-19/` | Release packages and SQL evidence | Release rollback and provenance | Review separately; no wildcard deletion |
| `tmp/secrets/`, `tmp/qa-setup/` | Sensitive setup and account-cleanup material | Test account provenance and cleanup | Do not print contents or delete automatically; secure retention review |
| `tmp/recovery-local-config/`, `tmp/recovery-email-design/` | Recovery verification evidence | Account recovery troubleshooting | Review references from `docs/ACCOUNT_RECOVERY.md` before archival |
| `backups/` | Large recovery archive | Native backup and reset recovery | Protect; size alone is not justification |
| `artifacts/` | Generated output mixed with tracked evidence | 44 tracked files; historical/live function snapshots | `.gitignore` does not untrack existing files. Review explicit paths, not `git rm -r` |
| `.cloud-attachments/` | Six tracked imported/context files, 8,580,493 bytes | User reference material and branding provenance | Archive only with owner approval; not application imports |
| `docs/audit/preview-build/` | Generated preview application | Audit preview URLs and historical investigation | Regenerable, but preserve evidence and stop preview before cleanup |
| `docs/audit/previous-audit/` | Historical reports may look obsolete | Links and audit chronology | Retain dated evidence; mark superseded rather than delete by age |
| `scripts/legacy/verify-test-credentials.ts` | Header advertises absent `verify:test-credentials` npm script and `ts-node` command | Live account checks; not part of current npm scripts | Correct instructions or explicitly retire after checking current provision/live workflows; do not run it as cleanup |
| `api/openapi.yaml` | Contract document, not an Angular import | API consumers/documentation | Keep until contract ownership is reviewed |
| `deno.lock` | Root lockfile may be historical | Supabase/Deno deployment tooling | Confirm actual deployment lockfile selection before changing; npm references alone cannot prove it unused |
| `monitoring-collector/index.js` | Local collector overlaps hosted collector | Local environments and PWA checks; native Node HTTP server | Keep service; remove only unused Express dependency if approved |

### D: asset candidates - P1 review only

The following 18 public binary/vector assets have no literal filename or public-relative-path occurrence in other tracked readable files. This is **not** proof they are unused externally. `angular.json` copies all `public/**/*`; `ngsw-config.json` includes image/font patterns in its lazy asset group. Direct URLs, future designs, API/database strings, and external references are not observable here. Protected logos and approved cricketer artwork must remain even if listed.

| Exact path | Finding | Disposition |
|---|---|---|
| `public/branding/login-assets/academy-ground-scene-crop.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/academy-logo-header-crop.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/arrow-right.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/calendar-check.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/coach.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/cricketer-scene-crop.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/eye-off.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/growth.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/hero-left-panel-crop.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/lock.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/login-card-reference-crop.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/mail.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/ref-cards-crop.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/ref-left-side-inspection.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/ref-logo-crop.png` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/shield-check.svg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/training-ground-bg.jpg` | No literal reference in other tracked text | Manual review; no deletion command |
| `public/branding/login-assets/users.svg` | No literal reference in other tracked text | Manual review; no deletion command |

`public/branding/login-assets/README.txt` also has no incoming literal reference, but is provenance documentation, not an unused image. Keep it. Active login references include `training-ground-full.png`, `official-turf-logo-white.png`, `official-turf-logo.png`, and `branding/login/cricketer-reference.png`; splash/utility/role pages use `branding/turf-cricket-academy-logo.png`.

### H: leftover styles - P1

`src/app/features/coach/coach-portal-page.scss` still contains `.student-hero-controls`, `.student-toolbar`, `.attendance-table-head`, `.attendance-side-rail`, `.attendance-quick`, `.attendance-today-summary`, and `.today-session` rules, including responsive variants. Searches in the coach component/template find these names only in SCSS, consistent with the previously removed hero/side-rail/table-toolbar sections. Remove these **selector blocks only** after reviewing global/dynamic class generation and desktop/mobile screenshots. Do not remove the stylesheet.

`.batch-toolbar` is still present on the template's `app-filter-bar`: keep it. Shared descendants and combined selector groups need individual review; do not delete blocks with a broad text regex.

## 4. Duplicate code and files

SHA-256 comparison established five nonempty byte-identical groups. A duplicate is not automatically a redundant runtime path.

| Files | Duplicate functionality/content | Recommended solution |
|---|---|---|
| `docs/audit/feature-catalogue-2026-10-22.json`<br>`docs/audit/feature-catalogue.json` | 53,575 bytes per file | Keep historical evidence until links/generators and snapshot semantics are reviewed; both filenames are referenced. |
| `docs/audit/final-integrity-2026-10-22.json`<br>`docs/audit/resume-integrity-2026-10-22.json` | 43 bytes per file | Keep historical evidence until links/generators and snapshot semantics are reviewed; both filenames are referenced. |
| `public/branding/login-assets/academy-ground-background.jpg`<br>`public/branding/login-assets/training-ground-bg.jpg`<br>`public/branding/login/academy-ground-background.jpg` | 360,731 bytes per file | Keep protected branding paths. Consolidate only with approved URL migration and external-reference checks. |
| `public/branding/login-assets/official-turf-logo.png`<br>`public/branding/turf-cricket-academy-logo.png` | 667,476 bytes per file | Keep protected branding paths. Consolidate only with approved URL migration and external-reference checks. |
| `src/app/shared/print/print-invoice/print-invoice.scss`<br>`src/app/shared/print/print-receipt/print-receipt.scss` | 26 bytes per file | Keep: both component entry files intentionally import the shared print stylesheet; deleting either breaks styleUrl. |

### P2 reuse opportunities

| Files | Similar responsibility | Recommended solution |
|---|---|---|
| `src/app/features/coach/coach-portal-page.html`, `src/app/shared/data-table/data-table.ts`, `src/app/shared/filter-bar/filter-bar.ts` | Table header, filter controls, export and pagination | Coach student/current-attendance/history tables already use shared components. Improve remaining composition only; do not build a second table abstraction |
| `src/app/features/coach/coach-portal-page.ts`, `src/app/features/attendance/qr-attendance-page.ts` | Camera setup and QR attendance entry | Consider a focused camera/scanner adapter after comparing permissions, teardown, errors, and role-specific submission paths; keep attendance authorization separate |
| `src/app/features/coach/coach-attendance-outbox.service.ts`, `src/app/core/offline/attendance-outbox.service.ts` | Queue/replay persistence | Decide offline product policy first. Consolidate mechanics only if scope, storage keys and replay semantics match; preserve persisted data |
| `src/app/shared/print/print-invoice/print-invoice.scss`, `src/app/shared/print/print-receipt/print-receipt.scss`, `src/app/shared/print/_print-document.scss` | Print styles | Already reuse a shared partial through two tiny entry files; no further abstraction warranted |
| `src/app/core/supabase/domain-services.ts`, `src/app/features/coach/coach-portal.service.ts`, `src/app/features/parents/parent-portal.service.ts` | Domain queries and list mapping | Extract proven common mapping/formatting helpers only. Keep role scopes/RPCs and RLS boundaries explicit; similar query syntax is not duplicate authorization logic |
| `src/app/features/coach/coach-portal-page.scss`, `src/styles.css` | Field/button/table styling | Remove verified orphan selectors first, then use existing shared styles/tokens without changing branding or theme |

## 5. Unused dependencies

Root package manifest and nested collector manifest were checked separately. Packages required implicitly by Angular builders, TypeScript emit, CSS processing, test environments, or CLI commands are kept even without an application import.

| Package | Current usage/evidence | Recommendation |
|---|---|---|
| `date-fns` | No application/script/test import or configuration use; `npm explain date-fns` shows root direct dependency only | P1 removal candidate; update manifest/lock together and validate date behavior |
| `@angular/animations` | No animation provider/module/trigger use in source; `npm explain` shows root plus optional platform-browser peer | P1 removal candidate, not an unconditional deletion; verify production/dev/test bootstrap and peer resolution |
| `express` in `monitoring-collector/package.json` | Collector uses native `require('http')`; no Express import; manifest still installs Express | P1 removal candidate; update nested lockfile, smoke-test `/errors`; keep collector |
| `@angular/common`, `@angular/core`, `@angular/forms`, `@angular/platform-browser`, `@angular/router` | Application imports; `src/main.ts` bootstraps browser application | Keep |
| `@angular/compiler`, `@angular/compiler-cli`, `@angular/build`, `@angular/cli` | Angular build, compiler and test toolchain in `angular.json` | Keep |
| `@angular/service-worker` | `app.config.ts` registers worker; production service-worker configuration | Keep |
| `@supabase/supabase-js` | Auth, database services, Edge Functions, live tests | Keep |
| `html5-qrcode` | Lazy camera imports in coach and attendance QR pages | Keep; absence from initial page execution is intentional |
| `qrcode`, `@types/qrcode` | `src/app/shared/print/id-card-qr.ts`; types needed by TypeScript | Keep |
| `primeicons` | CSS import in `src/styles.css`; dynamic `pi-*` classes | Keep |
| `rxjs` | Repository streams, auth and page subscriptions | Keep |
| `tslib` | `tsconfig.json` enables `importHelpers` | Keep despite no explicit source import |
| `@axe-core/playwright`, `@playwright/test` | E2E accessibility, role, layout and PWA tests/configs | Keep |
| `@electric-sql/pglite` | Four local database verification scripts | Keep |
| `@eslint/js`, `eslint`, `angular-eslint`, `typescript-eslint` | `eslint.config.js`, Angular lint builder | Keep |
| `@tailwindcss/postcss`, `tailwindcss`, `postcss` | `.postcssrc.json`, CSS build pipeline | Keep |
| `http-server` | `serve:prod` npm command and built-app testing | Keep |
| `jsdom`, `vitest` | Unit test environment and test imports | Keep |
| `typescript` | Angular/TypeScript compilation and script test tooling | Keep |
| `prettier` | `.prettierrc` establishes formatting workflow | Keep; absence of a package script alone is insufficient |

Dependency install-size savings are not measured. Removing an unused npm package may reduce installs without changing a tree-shaken production bundle.

## 6. Performance and maintainability improvements

1. **P0:** approve the 72-log allowlist independently. It saves only 243,013 local bytes and has no demonstrated application-speed effect.
2. **P1:** remove the three dependency candidates in separate reviewable changes. Run install/peer-resolution checks and verify the nested collector separately. Do not broadly upgrade packages during cleanup.
3. **P1:** retire the eight obsolete entry points only after behavior comparison, then remove associated files/tests explicitly and update live documentation/generator references. Retain old URL redirects.
4. **P1:** remove orphan coach selectors with responsive verification. Source size can decrease; computed-style and layout effects require testing.
5. **P2:** define artifact retention and move design-only assets outside the published asset tree only after branding/runtime URL review. `public/**/*` makes potential delivery-size savings plausible, but no network or bundle improvement has been measured.
6. **P2:** retain current lazy routes and lazy QR loading. Do not eagerly combine role pages or delete developer-only routes because absent in production: `app.routes.ts` explicitly gates design/handoff/dialog-playground routes on `environment.production`.
7. **P2:** keep `docs/CONSOLIDATED_ISSUES_2026-11-16.md` as the documentation issue index; annotate superseded snapshots instead of treating historical failures as current defects.

## Do Not Delete

- Original Turf Cricket Academy logo, approved cricketer artwork, login branding and theme, including byte-identical logo paths used by different pages.
- All 100 tracked database migration files. Migration age is not evidence of redundancy. The three staged `202611160001/2/3` migrations participate in current account/permission/role work.
- `supabase/functions/admin-manage-users/index.ts`: invoked from `user-management.service.ts`; includes `replace_profile_permissions` and `replace_profile_roles` RPC calls.
- `supabase/functions/notification-delivery/index.ts`: invoked from notification services. Remote deployment usage was not verified; no deletion proposed.
- `supabase/config.toml`, auth invite/recovery templates, RLS policies, grants, account lifecycle logic, guards and role-based navigation.
- `netlify/functions/client-errors.mjs`: production monitoring endpoint, separately tested in `scripts/client-errors.test.mjs`. Local collector similarity does not make it redundant.
- All four `src/environments/environment*.ts` files: development, production, E2E and live builds select different configurations. Do not print environment values into the report.
- `netlify.toml`, `ngsw-config.json`, public manifest/icons, Angular/TypeScript/lint config, `.github/workflows/ci.yml`, package lockfiles and test infrastructure.
- Mock repositories and fixtures: required for mock/E2E configurations; `dashboard.providers.ts` selects runtime providers. HTTP repositories still have provider references; do not remove based solely on a backend label.
- Backups, secrets, account setup records, rollback bundles, uncommitted user work and historical evidence until separately reviewed.

## 7. Proposed commands and exact changes - NOT executed

The user explicitly requested approval before cleanup. Review this report first. The following commands are proposals, not authorization to run them. A previous log-deletion attempt in this conversation was rejected by automatic policy review; no deletion occurred. Approval does not guarantee that the execution tool will permit a later attempt; do not bypass a rejection.

### Preserve work before any approved change

Re-run `git status --short` and review `git diff` plus `git diff --cached`. Coordinate preservation of the 23 pre-existing staged edits and any new work; do not stage, reset, or commit them accidentally. Create a cleanup branch only once preservation is settled:

```powershell
git switch -c chore/project-cleanup-2026-11-16
```

A branch alone does not back up uncommitted changes. Establish a user-approved checkpoint or independently verified backup before executing destructive changes. No branch or checkpoint was created during this audit.

### Exact P0 deletion proposal

Run only after approval, with no process writing these logs. This explicit allowlist deliberately excludes live server logs, SQL backups, release archives, credentials, and source scratch files. Validate every resolved target is an ordinary file directly inside this workspace's `tmp`, with no reparse point in its path. The script aborts rather than following a link or deleting a directory.

```powershell
$cleanupRoot = (Get-Location).ProviderPath
$expectedRoot = 'C:\Users\ravig\OneDrive\Desktop\website\tap\turf-academy-ui'
if ($cleanupRoot -ne $expectedRoot) { throw 'Wrong workspace' }
$cleanupTmp = Join-Path $cleanupRoot 'tmp'
if ((Get-Item -LiteralPath $cleanupTmp).Attributes -band [IO.FileAttributes]::ReparsePoint) {
  throw 'Refusing linked tmp directory'
}
$cleanupFiles = @(
  'audit-lint.log'
  'audit-tests.log'
  'build-qr.log'
  'build10.log'
  'build11.log'
  'build12.log'
  'build13.log'
  'build14.log'
  'build15.log'
  'build16.log'
  'build17.log'
  'build18.log'
  'build19.log'
  'build2.log'
  'build20.log'
  'build21.log'
  'build22.log'
  'build23.log'
  'build24.log'
  'build25.log'
  'build26.log'
  'build27.log'
  'build28.log'
  'build29.log'
  'build3.log'
  'build30.log'
  'build31.log'
  'build32.log'
  'build33.log'
  'build34.log'
  'build35.log'
  'build36.log'
  'build37.log'
  'build38.log'
  'build39.log'
  'build4.log'
  'build40.log'
  'build41.log'
  'build42.log'
  'build43.log'
  'build44.log'
  'build45.log'
  'build46.log'
  'build47.log'
  'build48.log'
  'build49.log'
  'build5.log'
  'build50.log'
  'build51.log'
  'build52.log'
  'build53.log'
  'build54.log'
  'build55.log'
  'build6.log'
  'build7.log'
  'build8.log'
  'build9.log'
  'lint10.log'
  'lint11.log'
  'lint12.log'
  'lint14.log'
  'lint15.log'
  'lint16.log'
  'lint18.log'
  'lint2.log'
  'lint3.log'
  'lint4.log'
  'lint5.log'
  'lint6.log'
  'lint7.log'
  'lint8.log'
  'lint9.log'
 )
$cleanupTargets = foreach ($cleanupName in $cleanupFiles) {
  $cleanupPath = Join-Path $cleanupTmp $cleanupName
  $cleanupItem = Get-Item -LiteralPath $cleanupPath -ErrorAction Stop
  if ($cleanupItem.PSIsContainer -or
      ($cleanupItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
      $cleanupItem.DirectoryName -ne $cleanupTmp) { throw "Unsafe target: $cleanupName" }
  $cleanupItem.FullName
}
# Review $cleanupTargets before the approved destructive step.
foreach ($cleanupTarget in $cleanupTargets) {
  Remove-Item -LiteralPath $cleanupTarget -ErrorAction Stop
}
```

No recursive removal command is proposed. If files have changed, references or owners have appeared, or a policy blocks execution, stop and reassess.

### Separate P1 dependency proposal

Only if each candidate is approved, use npm to maintain each manifest/lockfile pair rather than hand-editing lock entries:

```powershell
npm uninstall date-fns @angular/animations
npm --prefix monitoring-collector uninstall express
```

Expected files: root `package.json`, `package-lock.json`, nested `monitoring-collector/package.json`, `monitoring-collector/package-lock.json`; installation contents also change. Inspect the resulting diff for unrelated lock churn. No asset, source-family, migration, backup or historical-document deletion command is supplied because those decisions remain manual review.

For styles, the proposed file edit is limited to the seven orphan selector families named in section 3 and their responsive variants in `coach-portal-page.scss`, after verifying combined rules. For obsolete components, first compare with replacements, list the exact companion files, and migrate useful tests. Approval of P0 does not authorize these P1/P2 edits.

## 8. Validation performed and implementation strategy

### Executed for this audit

| Check | Result |
|---|---|
| Git status / tracked inventory / text reference scans / SHA-256 duplicates / directory metadata | Completed; evidence summarized above |
| `npm explain date-fns` and `npm explain @angular/animations` | Completed; direct and optional-peer relationships recorded |
| `npx tsc --noEmit --incremental false -p tsconfig.app.json` | Passed (exit 0); TypeScript check, not Angular template compilation |
| `npm run lint` | Passed; all files pass linting |
| Production build, unit/script/SQL tests, browser/E2E and hosted integration checks in this audit | Not executed; no runtime success claim |

Earlier conversation checks reported a passing build, 153 unit-test files / 903 tests, and 39 script tests. Those precede current staged auth/RBAC changes and are **historical only**, not validation of today's snapshot or a future cleanup.

### Required after approved implementation

1. Run `npm run build`, `npx tsc --noEmit --incremental false -p tsconfig.app.json`, `npm run lint`, `npx ng test --watch=false`, and `npm run test:scripts`. Production build is required for Angular templates, styles, lazy chunks and service-worker assets; plain TypeScript is insufficient.
2. Run the local SQL suites: `npm run test:notifications:db`, `npm run test:user-access:db`, `npm run test:role-catalog:db`, `npm run test:address:db`. Inspect script prerequisites and use isolated databases. Never apply/reset production databases for cleanup validation.
3. Run mock E2E (`npm run test:e2e`) and PWA (`npm run test:e2e:pwa`) with the configured web servers. Include route coverage, auth/access, role-isolation, table-tools, responsive, QR/manual attendance, print documents, payments and notifications specs. Capture desktop and mobile UI for coach tables/card headers after style edits.
4. Validate admin, coach, receptionist and parent login/logout, password recovery/invitations, redirects, navigation visibility and direct-route denial. Check students, batches, enrollments, attendance check-in/out/history, fees, payments/refunds and notifications. Preserve per-role API/RLS behavior.
5. For dependency changes, confirm a clean install from both lockfiles in an isolated checkout. Start the local collector and test allowed/denied origins, valid/invalid `/errors` payloads and oversized bodies; do not mistake its placeholder `npm test` (currently deliberately failing) for test coverage.
6. With separately authorized non-production credentials, run applicable live suites (`npm run test:e2e:live`, `npm run test:e2e:recovery`, `npm run test:notifications:live`, `npm run test:batch:live`). Some live tests create/modify records: inspect fixtures and cleanup before execution. Report unavailable credentials/browser/database prerequisites as blocked, not passed.
7. Verify deployed Netlify collector behavior and deployed Supabase function versions, invitation email redirects, RPC permissions and RLS with a staging environment. Local static references cannot establish deployment correctness.
8. Compare Git changes against the approved allowlist, verify referenced assets/exports and old route redirects, and measure before/after local bytes and production output. Report measured deltas only; preserve unrelated user edits.

## Approval boundary

Recommended first approval: **P0 log cleanup only** (72 exact files, 243,013 bytes). Dependencies, obsolete source families, styles, asset relocation and artifact retention are separate decisions. No deletion or refactoring will be performed until approval is received.

## P0 execution result - 2026-11-16

User approved P0 log cleanup. Removed exactly the 72 logs listed in section 2 and verified every target is absent: 243,013 bytes removed. All 1,020 tracked file hashes and the Git index match the pre-cleanup snapshot; existing user edits and their staging were preserved.

Created branch `chore/project-cleanup-2026-11-16`. Verified copies of modified files, the audit report, staged/unstaged patches, and the original Git index are retained in `.git/cleanup-checkpoint-20261116-141631/`. No commit was made.

No application code, dependencies, assets, backups, or other temporary files were removed. P1/P2 recommendations remain unimplemented. Build/test suites were not rerun for deletion of ignored diagnostic logs; validation checked the exact deletion allowlist, target absence, unchanged tracked content, and unchanged Git index. Earlier audit test results above remain historical.
