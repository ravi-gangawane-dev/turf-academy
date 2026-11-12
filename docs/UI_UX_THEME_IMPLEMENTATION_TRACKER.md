# UI/UX and Theme Consistency — Implementation Tracker

## Scope and authorization

- User approved starting P0 after creating this tracker.
- P0 records the existing baseline; it does not change application styling or business logic.
- Preserve APIs, permissions, navigation, official logo, and blue/sky-blue cricketer uniforms.
- Preserve the current photo-dialog dimensions during later visual corrections.

## Status definitions

| Status | Meaning |
| --- | --- |
| Not started | Work has not begun. |
| In progress | Work is actively being performed. |
| Partially complete | Some acceptance checks passed; named checks remain. |
| Blocked | A required dependency prevents completion. |
| Complete | The stated acceptance criteria have evidence. |

## Phase tracker

Current correction status (2026-11-04): the six confirmed source/public-screen findings have been addressed. Public browser recheck passes; protected role and dialog runtime acceptance remains blocked. Historical baseline findings below describe the pre-fix state.

| Phase | Scope | Status | Completion requirement |
| --- | --- | --- | --- |
| P0 | Baseline and safeguards | Partially complete | Source inventory, browser captures, role/state coverage, and CSS ownership recorded |
| P1 | Theme foundations | Partially complete | Duplicate imports and reported public contrast defects fixed; protected-theme regression pending |
| P2 | Dialogs and photo workflow | Partially complete | Photo focus/save/busy/crop fixes and focused tests pass; authenticated browser lifecycle pending |
| P3 | Tables and forms | Not started | Shared toolbar/actions/forms verified at all target widths |
| P4 | Module migration | Not started | Route-family and role-specific acceptance passes |
| P5 | Final acceptance | Not started | Before/after evidence, regression results, unresolved issues |

## P0 work items

| ID | Item | Status | Evidence / remaining work |
| --- | --- | --- | --- |
| P0-01 | Inventory routes and feature families | Complete | `src/app/app.routes.ts`; 15 feature folders scanned in audit |
| P0-02 | Document CSS ownership and conflicts | Complete | Ownership section below |
| P0-03 | Capture public screens at 320, 375, 768, 1024, 1440px | Complete | 40 default-state captures across eight public screens; token-backed outcomes remain under P0-06 |
| P0-04 | Capture Admin and Reception screens | Blocked | No authenticated browser session or configured test credentials |
| P0-05 | Capture Coach and Parent screens | Blocked | No authenticated browser session or configured test credentials |
| P0-06 | Record dynamic dialogs and states | Partially complete | Source inspected; authenticated runtime opening and keyboard testing pending |
| P0-07 | Record permissions and business safeguards | Partially complete | 15 anonymous protected-entry redirects passed; authenticated role execution pending |
| P0-08 | Establish responsive and console baseline | Partially complete | 40 public captures: no document overflow/page errors; automated contrast failures recorded below. Protected coverage pending |
| P0-09 | Approve P0 acceptance evidence | Not started | Cannot mark complete until protected role/state checks are performed |

## CSS ownership baseline

| Owner | Existing source | Finding |
| --- | --- | --- |
| Global tokens/imports | `src/styles.css` | Duplicate Tailwind, PrimeIcons, and foundations imports |
| Global foundations | `src/ui-foundations.css` | Broad important typography overrides can defeat component styles |
| Global base | `src/ui-base.css` | Must be reconciled with foundations before changing cascade |
| Table presentation | `src/app/shared/data-table/table-theme.css` | Shared styles coexist with feature-specific table rules |
| Dialog framework | `src/app/shared/dialog/` | Shared service, host, templates, and registry already exist |
| Modal keyboard behavior | `src/app/shared/interaction-dialog/modal-focus.ts` | Reusable focus trap, Escape, scroll lock, focus restoration |
| Photo editor | `src/app/shared/profile-photo-upload/` | Separate shell; fixed colors; premature save dismissal; static crop handles |
| Toasts | `src/app/shared/toast/` | Shared host exists; literal colors and small dismiss target |
| Feature layouts | `src/app/features/` | Local palettes/spacing and overrides require incremental migration |

## Coverage matrix

All protected rows below require live browser verification; source review is not visual acceptance.

| Family | Required cases | Runtime status |
| --- | --- | --- |
| Auth | Login, recovery, set/reset password, expired session | Default-state captures complete; submissions and token-backed flows pending |
| Dashboards | Admin, Reception, Coach, Parent | Blocked |
| Students / Parents / Coaches | Lists, details, add/edit, photo dialogs | Blocked |
| Batches | List, Details tabs, legacy routes, query parameters | Blocked |
| Enrollment | Create, transfer, pause, cancel, history | Blocked |
| Attendance | Check-in/out, scanner, history, corrections, calendar | Blocked |
| Finance | Fees, plans, adjustments, payment dialog, receipts, refunds | Blocked |
| Notifications / Reports | Lists, filters, templates, events, charts, export | Blocked |
| Settings | Sections, Users, permissions, tools, audit log, playground | Blocked |
| System | Search, unauthorized, design/handoff routes | Blocked |

## Acceptance checklist

- [ ] Screenshots at all five widths for each authorized route family
- [ ] Loading, empty, error, success and populated states
- [ ] Keyboard focus, Escape, focus restoration, contrast and touch targets
- [ ] Tables scroll locally and toolbar controls remain reachable
- [ ] Modal/dropdown layering and mobile keyboard behavior
- [ ] No new page errors or broken navigation
- [ ] Permissions and API behavior preserved
- [ ] Before/after file-level report after implementation

## Change log

- Tracker created before P0 execution. No application code modified for this phase.
- Previous browser findings: Login had no horizontal overflow at all requested widths; no page errors captured. Protected Dialog Playground redirected to login.

## P0 browser evidence

- Evidence: [baseline.json](../artifacts/ui-audit-p0/baseline.json); screenshots in artifacts/ui-audit-p0/.
- 20 screenshots captured at 320, 375, 768, 1024 and 1440px, height 900px.
- Routes: login, forgot-password, reset-password, session-expired.
- No horizontal document overflow or JavaScript page errors detected in these captures.
- These are unauthenticated/default states; valid reset-token flows and submission outcomes are not verified.
- Initial capture selector encountered a hidden heading; rerun used visible headings and completed successfully.
- P0 remains partially complete pending authenticated roles, dynamic dialogs, detailed accessibility and state coverage.

## Extended P0 live-browser run

### Corrections and verification — 2026-11-04

- Removed duplicate Tailwind, PrimeIcons and foundations imports while retaining the final import order.
- Darkened login green text, auth utility eyebrow labels and unauthorized-page eyebrow text.
- Photo editor now uses shared modal focus/scroll behavior, awaits an explicit parent save result, preserves edits and displays an inline error after failure, and disables editing/dismissal during processing or persistence.
- Coach and parent consumers now return save outcomes. New-coach photos remain staged for the main form; existing-coach saves wait for persistence. Parent saves preserve the existing form-save workflow.
- Replaced nonfunctional crop handles with a clearly labeled fixed square guide. Crop export now uses the same square proportions without stretching a rectangular region. Shell width, height limit and responsive breakpoint are preserved.
- Shared modal initial focus skips hidden file inputs.
- Production build: `npm run build` passed. `git diff --check` passed.
- Browser recheck: 40 captures, **zero automated accessibility violations**, zero document overflow, zero JavaScript page errors, 15/15 anonymous protected-route redirects. Evidence: `artifacts/ui-audit-p0/public-audit.json` and adjacent PNGs.
- Focused unit regression: **22 tests passed across 4 files**, covering photo delayed success, rejected/thrown writes, retry, duplicate save suppression, staging, busy Escape/dismissal, scroll lock and focus restoration, plus shared dialog and consuming form tests.
- Authenticated runtime acceptance, role permissions and token-backed recovery are still unverified. Automated public checks and component tests do not replace those checks.

### Resumed audit — 2026-11-04

- Local development build passed; reran `node scripts/audit-ui-p0.mjs` against `http://127.0.0.1:4200`.
- Regenerated 40 public-screen captures at 320, 375, 768, 1024 and 1440px: no document overflow, zero JavaScript page errors, and all 15 anonymous protected-route redirects passed.
- Automated accessibility checks still report color-contrast violations in 38 route/width combinations, targeting login links, form eyebrow labels and the unauthorized paragraph. Evidence: `artifacts/ui-audit-p0/public-audit.json`.
- These captures reflect the current working tree, including pre-existing action-color edits; they are not a pristine pre-change baseline.
- Added [dialog and theme source findings](UI_UX_P0_SOURCE_FINDINGS_2026-11-04.md), including missing photo-modal focus handling, premature save dismissal, busy dismissal and decorative crop handles. Application styling and behavior were not changed in this resumed audit.
- P0 remains partially complete. Working test-account/session access is still needed for protected role screens and dynamic dialog acceptance; public redirects do not establish role authorization.

### Test-account access check — 2026-11-04

- Tried the four user-supplied test accounts through the live application's login form, each in a fresh browser context.
- Admin, Receptionist, Coach, and Parent each received HTTP 400 with `Invalid login credentials` from the authentication endpoint.
- All four remained on `/auth/login`; authenticated P0 checks remain blocked.
- Evidence: `artifacts/ui-audit-p0/test-account-login.json` (no passwords or tokens stored).
- Accounts with unknown passwords were not attempted; no recovery emails were sent or passwords changed.
- Next dependency: valid credentials for existing test accounts in the connected Supabase project.

- Repeatable command: `node scripts/audit-ui-p0.mjs`.
- Evidence: `artifacts/ui-audit-p0/public-audit.json`.
- 40 captures: login, forgot-password, reset-password, set-password, OTP, session-expired, password-updated, unauthorized at all five widths (height 900px).
- No document horizontal overflow or JavaScript page errors in this run.
- Automated WCAG A/AA checks found color-contrast violations in 38 route/width combinations. These are repeated findings, not 38 distinct defects.
- Login link: 320/375/768px; auth utility form eyebrow labels: all five widths; unauthorized paragraph: all five widths.
- 15 anonymous entry points redirected to login. This does not prove admin/receptionist/coach/parent authorization.
- Protected screenshots, dialog keyboard checks, actual role permissions, and token-backed recovery remain blocked on existing test-account/session access. No accounts or business records were created.
- P0 remains partially complete. Application styling and business logic have not been changed.

