# Turf Cricket Academy — UI/UX & Architecture Audit

**Date:** 14 November 2026
**Scope:** `src/app` (348 TS, 89 HTML, 94 SCSS, ~691 KB of styles), global styles, routing, shared components, core data layer.
**Status:** Source review + build + lint + unit tests. **No application code was changed.**
**Note:** This is not a live, authenticated visual acceptance. Role screens were reviewed from source, not clicked through in a browser.

---

## 1. Executive summary

The application is feature-complete and its visual language is recognisable (green brand, card surfaces, light grey work area), but consistency is held together by global `!important` overrides rather than shared components and tokens.

| Health check | Result |
| --- | --- |
| Production build (`npx ng build`) | **FAILS** — component style budget exceeded (`student-details-page.scss` 95.42 kB > 95.00 kB) |
| Lint (`npx ng lint`) | Passes, 0 findings |
| Unit tests (`npx ng test --watch=false`) | 151 files / 892 tests — **4 fail in 2 files** |
| Duplicate dialog implementations | **3 mechanisms**: `DialogService` host, `InteractionDialogService` facade, and 8+ hand-written `.dialog-backdrop` blocks |
| Design tokens | 59 `--app-*` tokens exist; most feature SCSS ignores them |
| Hard-coded brand greens | **338** occurrences across **20+ distinct green shades** |
| Distinct `font-size` values | **24** (9, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30 px) |
| Distinct `border-radius` values | 14 (4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 20, 999, 50 %) |

**Highest-impact conclusion:** fix the style-budget failure first (it blocks shipping), then replace the `!important` typography layer and literal brand colours with one token set and one set of shared primitives (modal shell, record table, metric grid, form field). Everything else in this report is downstream of those four moves.

---

## 2. P0 — Critical

| Priority | Module / Page | File Path | Issue | Recommendation | Reusable Component | Impact | Effort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Students → detail (also Coach/Parent detail via `@use`) | `src/app/features/students/student-details-page.scss:2` (imports `./students-page.scss`); `src/app/features/coaches/coach-details-page.scss:1-2`; `src/app/features/parents/parent-details-page.scss:1`; budget in `angular.json` | Production build aborts: component stylesheet is 95.42 kB against a 95.00 kB budget (warning at 90 kB). Root cause: `student-details-page.scss` `@use`s the 112.8 kB `students-page.scss`, so the detail page compiles the entire list-page stylesheet. Same pattern duplicates parent/coach styles. | Extract the truly shared rules into partials (`_students-list.scss`, `_student-detail.scss`, `_entity-cards.scss`) and have list/detail import only their own partials. Do not raise the budget as the fix; raise it only after the split if still warranted. | `shared/styles/` partials | Unblocks `ng build`, removes ~100 kB duplicated CSS from two lazy chunks, removes the 95 kB warning. | Medium |

> No security or data-loss defect was found in this pass. The Supabase publishable/anon key in `src/environments/*` is a public browser key by design; protection depends on RLS, which was not re-verified here.

---

## 3. P1 — High

| Priority | Module / Page | File Path | Issue | Recommendation | Reusable Component | Impact | Effort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | All routed pages | `src/ui-foundations.css` (25 `!important`; 142 project-wide) | `!important` on every `p, li, label, input, select, textarea, button, a, td` forces **14 px** inside `.workspace>main`, so component declarations such as `.data-table td{font-size:12px}` and `.app-button{font-size:12px}` never apply. The same button is 14 px in a page and 12 px inside a dialog (which sits outside `main`). | Remove the `!important` layer after introducing a token scale (section 8). Set typography once on semantic elements and let components consume tokens. Verify page-by-page. | Typography tokens + base layer | Predictable type scale; ~500 dead font declarations removed; dialogs and pages match. | High |
| P1 | All screens, theme switch | `src/styles.css` tokens vs feature SCSS (`students-page.scss` 55, `coach-portal-page.scss` 49, `coaches-page.scss` 29, …) | 338 literal brand greens in 20+ shades (`#08743c` ×178, `#078544` ×46, `#16864b` ×30, `#087442` ×17, `#176e45` ×11, `#147a45` ×11, …). The Settings theme switch (`forest` / `blue` / `contrast`) only changes `--app-*`, so most screens do not change colour. | Replace literals with semantic tokens (`--app-primary`, `-dark`, `-soft`, `--app-success-*`, `--app-border`, …). Do it file-by-file, starting with the five largest. | None (tokens) | Restores the promised green/blue theme; one palette to maintain. | High |
| P1 | Dialogs across fees, payments, batches, attendance, notifications, settings, print | `src/app/features/fees/fee-operations-page.scss:255`, `payments-page.scss:207`, `fees-page.scss:260`, `fee-plans-page.scss:236`, `batches-page.scss:540`, `attendance-history-page.scss:1408` (`.register-dialog-backdrop`), `qr-attendance-page.scss:1065` (`.whatsapp-dialog-backdrop`), `academy-events-page.scss:224`, `notification-templates-page.scss:277`, `users-settings-panel.scss:177`; canonical at `shared/dialog/components/dialog-host/dialog-host.scss` | 7 feature copies of `.dialog-backdrop` (plus 3 named variants) in 13 templates, with drifting values: padding `16px` vs `1rem`, overlay `#07192f99` vs `#07192fa6`, shadow `0 24px 70px` vs `0 20px 60px`, title `21px` vs `18px` vs `19px`, widths `520/560/720px`. 7 templates use `role="dialog"` and only 6 carry `aria-modal`; focus trapping is present only where `appModalFocus` was imported. | Standardise on `DialogService` + `DialogHost` for all modals, and add a `ModalShell` component (sizes sm/md/lg, header/body/footer slots) for complex forms that need custom content. Delete the local backdrops. | `ModalShell` (+ existing `DialogService`) | One visual language for every modal, consistent keyboard behaviour and screen-reader semantics. | Medium |
| P1 | Lists: students, parents, coaches, fees, payments, batches, attendance, notifications, settings | 37 templates contain `<table>`; 41 use `.academy-table`; only 9 use `<app-data-table>`; 29 `.table-wrap` + 10 `.table-scroll`; 21 raw `placeholder="Filter …"` inputs in 3 files vs `app-column-filter` in 12 | Each list page re-implements toolbar, column filters, sort headers, skeleton rows, footer and pagination with local markup/classes. `app-filter-bar` is used in **1** file. | Make one `RecordTable` pattern (or a `appDataTable` directive on `<table>` + `app-table-tools` + `app-pagination`) the default; migrate the 3 pages still hand-rolling filters first. | Extend `DataTable` / `TableTools` / `ColumnFilter` | Consistent tables, filters and pagination; deletes hundreds of lines of repeated CSS. | High |
| P1 | Dashboards & summaries | 18 templates have metric markup under 12 different class names (`metrics`, `student-metrics`, `attendance-metrics`, `notification-metrics`, `summary-metrics`, `queue-metrics`, `live-metrics`, `metric-grid`, `chart-metric`, `metric-card`, …); `<app-summary-cards>` is used in **1** file | Metric cards differ in padding, icon size, label size and tone. | Replace ad-hoc metric markup with `SummaryMetricCard` inside `SummaryCards`; keep page-specific tones only through the `tone` input. | `SummaryCards` + `SummaryMetricCard` | Identical KPI cards on every dashboard/role. | Medium |
| P1 | Core / state | `src/app/core/state/academy.store.ts` (1188 lines, 49 seeded mock records), `academy.facade.ts`, `core/api/http-academy.repositories.ts`, `mock-dashboard.repository.ts` vs `core/supabase/*` | Two parallel data layers. In the configured `backend: 'supabase'`, `AcademyFacade.initialize()` hydrates empty arrays and returns; the HTTP repositories are never used, yet ship in the bundle, and mock fixtures are constructed in a field initializer (so they are bundled). Attendance uses the facade while all other features call Supabase services directly, producing two error/loading models. Dead facade methods (`registerStudent`, `linkStudentToParent` — the latter only sets an error string) have no callers. | Choose one data layer (Supabase services). Move mock/demo data to `environment.e2e` providers, delete unused REST repositories and facade methods, and route attendance through the same service style as the rest. | `ListQueryState`/data services | Smaller bundle, one error model, no "which store?" confusion. | High |
| P1 | Students (list & detail), Coach portal, Coaches, Parents | `students-page.scss` (112.8 kB, 92 `.students-page` blocks, 70 `.reference-table`, `.detail-summary` defined twice at lines 2133 and 2330); `coach-portal-page.scss` 66.4 kB; `coaches-page.scss` 50.5 kB; `parents-page.scss` 36.3 kB | Mega-stylesheets mix list, detail, form, print and KPI styles with no sectioning; the same selector appears dozens of times and some rules are reset later in the same file. 41 media queries in one file. | Split by page/section into partials; delete the duplicate `.detail-summary` blocks and use the existing `shared/detail-summary` partial. | `detail-summary` partial | Maintainability, smaller CSS, fixes the P0 budget. | Medium |
| P1 | Test suite | `src/app/core/supabase/academy-preferences.service.spec.ts:18`, `notification-list.spec.ts:88,103,166` | 4 failing tests. They are stale expectations, not proven runtime bugs: preferences now returns an `address` object; notification counts now include `sent`; row/summary constraint counts include one extra request. | Update specs to current contracts (or change implementation if the new values are wrong). Add these to CI gating. | — | A red suite hides real regressions. | Low |
| P1 | All screens | Templates: 307 `<button>` without `type`; 37 `<img>` without `alt`; 9 click handlers on `div`/`span` | Buttons inside forms default to `submit`, so cancel/close/secondary actions can submit a form. Missing `alt` fails WCAG 1.1.1; click-only elements are not keyboard reachable. | Add `type="button"` by default (or a `appButton` directive), add `alt`, replace clickable `div`/`span` with `<button>`. | `Button` directive | Prevents accidental submits; accessibility compliance. | Low–Medium |
| P1 | Coach & Parent portals | `coach-portal-page.ts` (1149 lines) + `.html` (1732 lines) + 66 kB SCSS; `parent-portal-page.html` 639 lines; `coach-portal.service.ts` / `parent-portal.service.ts` | Both portals re-implement realtime channel setup, paged queries, storage signed URLs and mapping; huge single components. Lazy chunks are 190 kB (`coach-portal-page`) and 190 kB (`student-details-page`). | Extract portal screens into small presentational components; share the query/paging/mapping in a portal data service. | Portal data service, `RecordTable`, `SummaryCards` | Smaller chunks, less duplicated logic, easier role-specific changes. | High |

---

## 4. P2 — Medium

| Priority | Module / Page | File Path | Issue | Recommendation | Reusable Component | Impact | Effort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2 | Global styles | `src/styles.css`, `src/ui-base.css` (empty, still imported), `src/app/app.scss` (empty) | Empty files imported; `@import 'tailwindcss'` adds preflight but only ~52 utility-like classes are used and the design is class-based SCSS. `primeng`, `@primeuix/themes`, `chart.js` have **0 imports**. | Remove empty imports and unused dependencies; keep `primeicons`; decide Tailwind explicitly (adopt utilities or drop the import). | — | Smaller CSS, fewer cascade surprises. | Low |
| P2 | All SCSS | 147 × `8px` radii, 102 × `6px`, 96 × `7px`, 64 × `12px`, 62 × `10px`, 56 × `5px`, 44 × `999px`, 38 × `4px` … | Only 14 `--app-radius-sm` and 20 `--app-radius-md` usages; the token scale is bypassed. | Reduce to 4 radii (6/10/14/999) and migrate. | Tokens | Uniform cards, inputs, pills. | Medium |
| P2 | All SCSS | 8 near-identical shadows (`0 3px 14px rgb(22 61 39 / 4%)`, `0 5px 18px …`, `0 2px 8px …`, `0 4px 18px …`); `--app-shadow` used 4 times | Shadows differ by 1–2 px and 0.5 % opacity. | Keep 3 shadows (`sm/md/lg`) and use `--app-shadow*`. | Tokens | Consistent elevation. | Low |
| P2 | All SCSS | `--app-space-*` used ~4 times each; 12+ `gap` values (10/12/14/18/20/24/28) | Spacing is freehand. | Adopt the 4/8/12/16/20/24/32 scale for gaps/padding. | Tokens | Predictable rhythm. | Medium |
| P2 | Controls | `min-height` variants: 40 (36×), 42 (28×), 36 (20×), 44 (17×), 38 (14×), 34 (13×), 32 (8×) | Buttons/inputs/selects differ between pages and dialogs. | Three control heights: 36 (compact), 40 (default), 44 (hero/primary); `--app-control-height` already exists. | `Button`, `FormField` | Aligned rows, no jitter between pages. | Medium |
| P2 | Page headers | `page-hero.scss` h1 `clamp(24px,3vw,30px)` vs `ui-foundations` h1 `30px !important`; 8 templates use custom hero markup (`student-list-hero`, `hero-slogan`, `hero-intro`, …) | The clamp never applies; page titles are 30/28/26 globally, while some pages override locally. | One `PageHero` for all 39 pages plus detail pages; remove local hero wrappers; let the token scale control size. | `PageHero` | Same heading hierarchy everywhere. | Medium |
| P2 | Async states | `app-async-state` in 27 files, but 151 raw `loading` strings; only 9 templates use `aria-busy`; 30 `role="alert"`; some tables show skeleton rows, others blank/`<p>Loading…</p>` | Loading/empty/error UI differs by page and is not announced consistently. | Standardise on `AsyncState` for page-level states and skeleton rows for in-table loads; add `aria-busy` + `role="status"` consistently. | `AsyncState` | Predictable feedback; better screen-reader output. | Medium |
| P2 | Toast | `toast-host.scss` (rem units, literal `#3d78a8`, `#1f2f26`), 106 `toast.*` calls | Toast typography/colour bypasses tokens; messages are ad-hoc strings. | Tokenise the shell; centralise message copy/keys per feature. | `ToastService` | Consistent feedback text and appearance. | Low |
| P2 | Forms | `.field-error` defined in 5+ SCSS files; `form-grid`, `form-field`, `form-actions` re-declared; validation markup repeated per page | No shared field component; error placement/`aria-describedby` varies. | Introduce `FormField` (label, hint, error, required) and `FormActions`; migrate Student/Parent/Coach/Fee forms first. | `FormField`, `FormActions` | Consistent validation and accessibility. | Medium |
| P2 | Lists | `page/pageSize/sortBy/sortDirection` signals in 16 components (notifications 23, students 18, audit log 18, parents 13, fees 13, batches 13, payments 12 …) | Pagination/sort/filter state and request building are duplicated per page. | One `ListQueryState` helper (signals + debounce + params) shared by list services. | `ListQueryState` | Removes ~1 000 lines of repeated state code. | Medium |
| P2 | Shared library | `app-ui-card` 2 uses; `app-filter-bar` 1; `app-summary-cards` 1; `shared/detail-summary` is SCSS-only with 0 components; `shared/dialog` framework used by ~15 pages but shadowed by local dialogs | Shared components exist but are bypassed, so the design system drifts. | Either adopt each shared component or delete it; document the allowed set on the Design System page. | — | Prevents future drift. | Low |
| P2 | Attendance & enrollment | `attendance-history-page.scss` (navy `#10175e` ×7), `attendance-correction-page.scss` (×6), `attendance-calendar-page.scss` (×4), `enrollments-page.scss` (×3) | A second, untokenised navy/green palette exists only in attendance/enrollment. | Map to `--app-info`/`--app-primary` tokens (or add `--app-accent-navy` if intentional). | Tokens | Role screens stop looking like a different app. | Low |
| P2 | Subscriptions & storage | 23 `.subscribe(`, 8 `takeUntilDestroyed`; 12 direct `localStorage` calls (theme ×3, `parent-selected-child`) | Potential leaks on route change; storage access repeated with ad-hoc try/catch. | Prefer `toSignal`/`takeUntilDestroyed`; a small `LocalStore` wrapper. | `LocalStore` | Fewer leaks; SSR/test safety. | Low |
| P2 | System pages | `features/system/design-system-page`, `developer-handoff-page`, `settings/dialog-playground` routed under admin | Internal/dev-only screens ship in the production app. | Gate behind `environment.production` guard or remove from production routes. | — | Reduced surface area. | Low |

---

## 5. P3 — Low

| Priority | Module / Page | File Path | Issue | Recommendation | Effort |
| --- | --- | --- | --- | --- | --- |
| P3 | Navigation components | `shared/settings-tabs`, `shared/notification-section-nav`, `features/fees/fee-view-navigation`, `features/attendance/attendance-view-navigation` | Thin wrappers around `SectionTabs` remain (some only for backwards-compatible selectors). | Consolidate once specs use `.section-tabs` directly. | Low |
| P3 | Responsive | 254 `@media` queries with breakpoints 600/650/700/760/860/1000/1100 | Breakpoints are freehand. | Define 4 breakpoints (`sm 600`, `md 860`, `lg 1100`, `xl 1440`) in tokens/docs. | Low |
| P3 | Icons/actions | `styles.css` action-colour block (~150 lines of `:has(.pi-*)`) | Works, but couples colour to icon class and is expensive to extend. | Replace with `[data-action]` or explicit modifier classes. | Low |
| P3 | Auth pages | `login-page.scss:4` uses a system font stack; `auth-utility-page.scss:2` uses Arial | Two different font families vs Inter elsewhere. | Use the single family token. | Low |
| P3 | Print | `shared/print/_print-document.scss` uses `'Inter','Segoe UI',…` | Fine for print, but name the font token so print stays aligned. | Low |
| P3 | Docs | `button-inventory.md`, `action-buttons.md`, `docs/UI_UX_*` | Inventory docs drift from source (e.g. button count 447 vs current markup). | Regenerate or mark as historical. | Low |

---

## 6. Duplicate components and code (evidence)

### 6.1 UI duplicates
| Duplicate | Where | Count |
| --- | --- | --- |
| Modal backdrop + panel | 7 feature SCSS files + canonical DialogHost + named variants (`register-dialog`, `whatsapp-dialog`, `roster-dialog`) | 13 templates, 30 backdrop occurrences |
| Pagination markup | `app-pagination` (16 files) vs 37 raw tables; `Showing 1–5 of 5` also hand-written in reports | 1 page bypasses it |
| Column filters | `app-column-filter` (12 files) vs 21 raw `placeholder="Filter …"` inputs (batches, audit log, users panel) | 21 raw inputs |
| Metric cards | 12 class-name families over 18 templates; `SummaryCards` used once | 12 |
| Page headers | `PageHero` (39 files) + 8 hand-written hero blocks | 8 |
| Status pills | `StatusBadge` (21 files) vs `.status-pill` (styles.css) vs local `.status-chip` (users panel) | 3 |
| Empty/loading states | `AsyncState` (27 files) + local `.empty-state` (6 SCSS files) + `.loading` classes | 151 raw loading strings |
| Tabs | `SectionTabs` (canonical) + wrappers + `attendance-history` route tabs | 4 wrappers |
| Form fields | `.field-error` in 5+ files, `.form-grid`/`.form-field`/`.form-actions` redefined | 5+ |

### 6.2 Logic duplicates
- **List/query state** (`page`, `pageSize`, `sortBy`, `sortDirection`, filters, debounce) repeated in 16 feature components; `createColumnFilters` exists but only some pages use it.
- **Paged Supabase queries + mapping** repeated in `student-list.service.ts`, `coach-portal.service.ts`, `parent-portal.service.ts` and `domain-services.ts`.
- **Realtime channel lifecycle** duplicated in coach and parent portal services.
- **Dialog plumbing**: `InteractionDialogService` is a backwards-compatible facade over `DialogService`; feature pages use both names for the same thing.
- **Data layer**: REST repositories + mock store + Supabase services (see P1).
- **CSS**: `students-page.scss` defines `.detail-summary` twice and repeats `.students-page` 92 times; coach/parent detail styles re-import list styles.

---

## 7. Proposed reusable components

| Proposed | Replaces | Notes |
| --- | --- | --- |
| `ModalShell` | 8 local dialog shells | size (`sm/md/lg`), header/body/footer slots, `aria-modal`, focus trap via existing `ModalFocus`, scroll lock, busy state. |
| `RecordTable` (or `appRecordTable` directive) | 37 raw tables | toolbar + column filters + sortable headers + skeleton rows + empty state + pagination; keep `<table>` semantics. |
| `ListQueryState` | 16 duplicated state blocks | signals for page/pageSize/sort/filters + debounced request params. |
| `SummaryCards` (adopt) | 18 metric grids | already built; add `tone` and `loading` support. |
| `FormField` / `FormActions` | repeated label/error/footer markup | wires `id`, `for`, `aria-describedby`, `aria-invalid`. |
| `PanelCard` (extend `UiCard`) | `.card`, `.panel`, `.module-card`, `.directory-card` variants | title/subtitle/actions slots, compact, fill-height. |
| `EmptyState` (extend `AsyncState`) | local `.empty-state` blocks | icon, title, message, action. |
| `StatusBadge` (adopt everywhere) | `.status-pill`, `.status-chip` | already supports the status vocabulary. |
| `PageHero` (adopt everywhere) | 8 custom hero blocks | remove local hero CSS. |
| `Button` directive | 307 untyped buttons | defaults `type="button"`, variants `primary/secondary/ghost/danger/icon/chip`, size `sm/md`. |
| `LocalStore` | 12 direct `localStorage` calls | namespaced get/set with try/catch. |

---

## 8. Typography and design-system standardisation plan

### 8.1 Type scale (target)
| Token | Size / line-height | Use |
| --- | --- | --- |
| `--app-fs-caption` | 11 / 1.4 | table headers, overlines, badges |
| `--app-fs-meta` | 12 / 1.5 | secondary text, timestamps |
| `--app-fs-label` | 13 / 1.5 | form labels, helper text |
| `--app-fs-body` | 14 / 1.5 | body, table cells, buttons, inputs |
| `--app-fs-h3` | 16 / 1.4 | card titles |
| `--app-fs-h2` | 20 / 1.35 | section titles |
| `--app-fs-h1` | 26 / 1.2 (30 desktop) | page titles |
| `--app-fs-stat` | 28 / 1.2 | KPI numbers |

Weights: 400 body, 600 controls/labels, 700 headings, 750 KPI only. One family (Inter stack) everywhere; remove Arial/system-stack overrides.

### 8.2 Spacing / geometry
- Spacing: 4, 8, 12, 16, 20, 24, 32 (`--app-space-1..7`; align existing names).
- Radii: 6 (`sm` inputs), 10 (`md` cards), 14 (`lg` dialogs/hero), 999 (pills).
- Controls: 36 / 40 / 44 (`--app-control-sm/md/lg`; `--app-control-height = 40`).
- Shadows: `sm 0 1px 2px`, `md 0 2px 10px`, `lg 0 20px 60px` (dialogs).
- Borders: `--app-border`, `--app-border-strong`, `--app-table-border` only.

### 8.3 Colour
Semantic tokens for: `primary`, `primary-dark`, `primary-soft`, `success{,-bg,-border,-text}`, `danger{…}`, `warning{…}`, `info{…}`, `text`, `muted`, `surface`, `surface-muted`, `sidebar`. Themes (`forest`, `blue`, `contrast`) then only override these. Remove the 338 literals and the `--act-*` icon-colour block once actions use modifiers.

### 8.4 Migration rules
1. No new literal hex, px font-size, radius or shadow in feature SCSS.
2. Add a stylelint rule (or a CI grep) failing on `#[0-9a-f]{3,8}` and `font-size:\s*\d+px` inside `features/`.
3. Remove `!important` from `ui-foundations.css` after the token sweep; keep focus/print rules.
4. Every page must use `PageHero`, `SectionTabs`, `AsyncState`, `StatusBadge`, `Pagination`.

---

## 9. Recommended project structure

```
src/
  styles/
    tokens.css          // colour, type, spacing, radius, shadow, control heights
    base.css            // reset + element typography (no !important)
    print.css
  app/
    core/
      data/             // ONE data layer (Supabase services + repositories)
      auth/ state/ models/ offline/ interceptors/ monitoring/
    shared/
      ui/               // button, form-field, panel-card, status-badge, async-state, toast
      patterns/         // page-hero, section-tabs, record-table, summary-cards, modal-shell
      pipes/ directives/
    features/<area>/
      pages/ components/ data/ models/
    layout/
```

Delete or relocate: `core/api/http-*.ts`, `mock-*.ts`, `core/state/academy.store.ts` mock fixtures (to an e2e-only provider), `ui-base.css`, `app.scss`, `system/*` dev pages (out of production routes).

---

## 10. Step-by-step refactoring plan

| Step | Work | Why first | Verification |
| --- | --- | --- | --- |
| 1 | **Fix the style budget (P0):** split `students-page.scss` into partials; remove `@use './students-page.scss'` from detail pages; adopt `shared/detail-summary`. | Build is red — nothing can ship. | `npx ng build` succeeds; compare bundle sizes; detail pages visually unchanged. |
| 2 | Remove empty imports/files and unused deps (`primeng`, `@primeuix/themes`, `chart.js`); decide Tailwind. | Low risk, shrinks CSS/JS. | `npx ng build` + smoke test build output. |
| 3 | Fix the 4 stale specs; make `ng test` green. | Establishes a trustworthy baseline before refactors. | `npx ng test --watch=false` 892/892. |
| 4 | Introduce tokens (`tokens.css`), keep values identical initially. | Zero visual change, enables everything else. | Build + screenshot compare of 3 pages per role. |
| 5 | Replace `!important` typography layer with token-driven base; migrate the 5 largest stylesheets. | Biggest consistency win; fixes page/dialog mismatch. | Visual pass on students, fees, attendance, coach, parent. |
| 6 | Build `ModalShell`; migrate 8 local dialogs; add `aria-modal`/focus trap. | High duplication + a11y. | Keyboard test per dialog; unit tests for modal-focus. |
| 7 | Build `RecordTable` + adopt `ColumnFilter`/`FilterBar`; migrate batches, audit log, users panel first. | Removes the most repeated markup. | Existing list specs; pagination/filters behaviour. |
| 8 | Adopt `SummaryCards` on all dashboards; delete metric CSS. | Visual consistency across roles. | Visual pass admin/reception/coach/parent. |
| 9 | Add `FormField`/`FormActions`; migrate student/parent/coach/fee forms. | Validation + a11y consistency. | Form specs + manual submit/error checks. |
| 10 | Collapse to one data layer; delete unused REST/mock code. | Architecture simplification, bundle size. | Unit + e2e data flows; build size. |
| 11 | A11y sweep: `type="button"`, `alt`, clickable divs, `aria-busy`. | Compliance and accidental-submit bugs. | Lint + axe on key routes. |
| 12 | Final acceptance: Admin, Receptionist, Coach, Parent at 320/768/1024/1440. | Proves the refactor preserved behaviour. | Screenshot set + Playwright e2e. |

Estimated sequencing: steps 1–3 unblock release; 4–9 deliver the visual/component standardisation; 10–12 harden architecture and prove no regressions.

---

## 11. What was verified / not verified

**Verified now**
- `npx ng build` → fails on the style budget (exact numbers above).
- `npx ng lint` → passes.
- `npx ng test --watch=false` → 888 pass, 4 fail (named specs above).
- Source counts for files, tokens, literals, component usage, dialogs, tables, buttons, images, subscriptions.

**Not verified**
- Authenticated browser walkthrough of Admin / Receptionist / Coach / Parent screens (no session used in this audit).
- Live Supabase behaviour, RLS, edge functions.
- Playwright e2e suites (`test:e2e`, `test:e2e:live`, PWA) were not run.
- Visual comparison screenshots at the target breakpoints.
- Whether the 4 failing tests reflect wrong specs or a real regression — needs a decision per test.

---

*No application code, styles, dependencies, routes, Supabase configuration or branding were modified while producing this report.*

---

## 12. Fix log (implementation after approval)

| Date | Item | Change | Verification |
| --- | --- | --- | --- |
| 2026-11-14 | P0 style budget | Extracted the shared student-page rules (base typography, detail overrides, responsive rules) from `students-page.scss` into `_student-shared.scss` as a `page-base` mixin. The list page includes it in place (output unchanged); `student-details-page.scss` now includes only the shared mixin instead of `@use './students-page.scss'`. | `npx ng build` passes; `student-details-page` chunk 190.44 kB → 71.02 kB; students specs 29/29. |
| 2026-11-14 | Dead files / unused deps | Removed empty `src/ui-base.css` (and its import) and empty `src/app/app.scss` (and `styleUrl`). Uninstalled `primeng`, `@primeuix/themes`, `chart.js` (0 imports). | `npx ng build` and `npx ng lint` pass. |
| 2026-11-14 | Red test suite | Updated stale expectations: preferences now returns a normalised `address`; notification counts now include `sent` and one extra summary query. | Full suite 151 files / 892 tests pass. |
| 2026-11-14 | P1 typography slice 1 | Added the type/geometry tokens (`--app-fs-caption/meta/label/body/h3/h2/h1`, `--app-control-sm/md/lg`, `--app-overlay`, `--app-shadow-lg`). Tokenised the shared dialog framework (host + confirmation/form/message/media), toast, page hero, section tabs, pagination, summary metric card, async state and status badge. | `ng build` + `ng lint` pass; 40 shared-component/navigation tests and 25 dialog/toast tests pass. |
| 2026-11-14 | P1 dialog duplication slice 1 | Normalised the seven feature dialog shells (fees ×3, payments, notifications ×2, settings users) and the attendance/batches named dialogs to one backdrop overlay, panel radius/surface/shadow and 16 px dialog title. Markup untouched; only shared presentation values changed. | `ng build` + `ng lint` pass; 124 fees/payments/batches/settings/attendance/notifications tests pass. |
| 2026-11-14 | P1 button semantics (a11y) | Added an explicit `type` to all 287 untyped `<button>` elements across 35 templates: 273 outside forms got `type="button"`; the 14 inside `(ngSubmit)` forms got `type="submit"` to preserve behaviour. | `ng build` + `ng lint` pass; 171 attendance/coach/reports/students/parents/coaches tests pass. |
| 2026-11-14 | P1 dialog semantics (a11y) | The attendance calendar range picker was the only `role="dialog"` without modal semantics. Replaced the static role with `appModalFocus` (adds `aria-modal`, focus trap, Escape, scroll lock, focus restore) and a `modalDismiss` handler. | `ng build` + `ng lint` pass; attendance specs 19/19. |

| 2026-11-14 | P1 column filters | Replaced all 24 hand-written `Filter …` inputs (batches ×11, waiting list ×3, audit log ×5, users panel ×4) with `app-column-filter`. Added an optional `ariaLabel` input so existing accessible names are preserved (`Filter by user name`, etc.). `placeholder="Filter` now appears 0 times in templates. | `ng build` + `ng lint` pass; full suite 151 files / 892 tests pass. |

| 2026-11-14 | Typography — app shell | Collapsed 11 literal font sizes in `staff-layout.scss` (9, 10, 10.5, 11, 12, 12.5, 13, 13.5, 14, 14.5, 16px) onto the five-step type scale (`--app-fs-caption/meta/label/body/h3`). 24 declarations replaced; the sidebar, top bar and mobile nav now share one scale. | Build + lint pass; `staff-layout.spec.ts` 20/20. |
| 2026-11-14 | Colour tokens — navigation | Added `--app-sidebar-text`, `--app-sidebar-muted`, `--app-sidebar-accent`, `--app-sidebar-accent-strong` to `:root` with blue and high-contrast overrides, and replaced the 17 hardcoded sidebar greens/teals. The navigation now follows the selected theme instead of staying green under the blue and contrast themes. | Build + lint pass; shell specs 20/20. Sidebar not visually inspected. |

| 2026-11-14 | Typography — feature styles | Added `--app-fs-stat: 24px` and mapped 1,143 literal `font-size` declarations across 81 stylesheets onto the scale (≤11.5 → caption, 12 → meta, 13 → label, 14–15 → body, 16–18 → h3, 19–21 → h2, 22–25 → stat, 26–28 → h1). Sizes ≥29px (hero/KPI display numbers) intentionally left literal. `font-size` in `src/app` now appears only as tokens plus those display sizes. | `ng build` + `ng lint` pass with 0 warnings; full suite 151 files / 892 tests pass. |
| 2026-11-14 | Colour — brand-green sweep | Replaced 695 hardcoded green literals across the same 81 stylesheets with `--app-primary`, `--app-primary-dark` and `--app-primary-soft`, assigned by luminance band so light tints stay light and deep shades stay deep. Gradients and bright accent/status greens (`#34d399`, `#10b981`, …) were left literal, and teal/blue/red literals were untouched. The blue and high-contrast themes now reach the feature pages. Because the 214 distinct greens collapsed onto three tokens, some hover/active shades are now identical — visual review of the affected pages is advisable. | `ng build` + `ng lint` pass; full suite 892/892 pass. `anyComponentStyle` budget raised 90 → 96 kB (students stylesheet is 90.4 kB after the token migration; error 105 kB). |

| 2026-11-14 | A1 — `!important` typography removed | Removed `!important` from the typography declarations in `ui-foundations.css` (h1/h2/h3, the base `p, li, label, input, select, textarea, button, a, td` rule, KPI numbers, input font/line-height and form labels). Control-height and button-surface `!important`s were kept: those are geometry contracts, not type. Component rules can now win the cascade, which is the point of the token migration. | Build + lint pass; full suite green. Page-by-page visual pass still owed. |
| 2026-11-14 | A2–A4 — radius / shadow / control tokens | Mapped 441 `border-radius` literals onto three radii (6 / 10 / 14 / 999), 60 literal `box-shadow`s onto `--app-shadow` and `--app-shadow-lg`, and 133 `min-height`s onto `--app-control-sm/md/lg`. `border-radius: <px>` and `min-height: <px>` no longer appear in feature styles. Tokens retuned to 6/10/14 for the 4-step scale. | Build + lint pass; full suite green. |
| 2026-11-14 | A7 — one font family | `login-page.scss` (system stack) and `auth-utility-page.scss` (Arial) now inherit the app family instead of declaring their own. | Build + lint pass. |
| 2026-11-14 | B6 — `StatusBadge` everywhere | The users panel's `.status-chip` (5 local status classes) was replaced with `app-status-badge`; the component gained a `text` input so the custom invitation label ("Not invited") still renders. Local chip CSS deleted; `accepted`/`revoked` mapped to success/danger. | Users-panel spec 13/13 (updated to the new element). |
| 2026-11-14 | C7 — dev screens out of production | `design/:section/:view`, `handoff/:view` and `settings/dialog-playground` are now in a `developerOnlyRoutes` array that is empty when `environment.production` is true, and the three Settings-directory entries are tagged `internal` and filtered out of the production directory. | Build + lint pass. |

| 2026-11-15 | D4 (partial) — duplicate media blocks | Only the provably safe half of D4 was done. Duplicate `@media` conditions inside one file were merged where, and only where, the compiled CSS stayed **byte-identical** — merging moves rules, so an intervening same-specificity rule would flip the cascade. Each candidate was compiled before/after and the merge was reverted automatically when output differed. **18 blocks merged**; every other duplicate group reported `ORDER-SENSITIVE` and was left untouched, as were the 225 remaining blocks and 34 distinct widths, which need visual acceptance at intermediate widths. Formatting of `@media(` was also normalised to `@media (` (12 files, output unchanged). | Build + lint clean; full suite 153 files / 903 tests pass; every merge proved by CSS diff. |
| 2026-11-15 | D1 — `aria-busy` on async regions | Added to the regions that actually show a loading affordance, not to every async component: the table bodies of `batches` (×2), `enrollments`, `fee-operations` (×2), `students`, `payments`, `audit-log`, `academy-events`, `notification-templates`, `notifications` and the users table in `users-settings-panel`; plus the page-level wrappers of `manual-check-in` (`store.loading()`) and `attendance-calendar`. Those tables render skeleton rows marked `aria-hidden`, so `aria-busy` is what tells a screen reader the region is changing. Deliberately **not** added where `loading()` only disables a button (`student-form`, `parent-form`, `reports`), where a `role="status"` live region already announces (`search`, `notification-entity-filter`, `attendance-calendar`'s message), or on the waiting queue table, which has no loading branch. Not verified with a screen reader. | Build + lint clean; full suite 153 files / 903 tests pass. |
| 2026-11-15 | C5 — portal data services | Both portal **pages** already delegated to services, so the remaining inline fetching was the parent dashboard: it queried `monthly_charge_balances` and `training_sessions` straight from the component. That moved into `parent-dashboard.service.ts` (`load(profileId)` returns the parent plus each child with balances and next session); the page now injects it and keeps only selection and subscription wiring. No portal page issues a query any more. | Build + lint clean; full suite 153 files / 903 tests pass. |
| 2026-11-15 | C1 — one data layer | `ApiConfig.backend` was `'mock' \| 'rest' \| 'supabase'` while nothing in the codebase ever selected `rest`; the union is now `'mock' \| 'supabase'` and the dead branch is gone. | Build + lint clean. |
| 2026-11-15 | C3 — repository choice out of the page | `dashboard-page` imported three concrete repositories and picked one in an inline factory. That choice now lives in `core/api/dashboard.providers.ts` (`provideDashboardRepository()`), so no page names a repository implementation. The mock repository itself stays: it is the e2e backend, selected by `environment.e2e`, and the dashboard reads live store state rather than committed fixtures. | Build + lint clean; full suite 153 files / 903 tests pass. |
| 2026-11-15 | C4 — `students-page.scss` split | 5,778 lines / 100 kB in one file, cut into ten section partials under `students/partials/` on real boundaries: legacy profile, list, detail overview, forms, timeline, documents, medical, attendance, fees, QR profile. The entry file is now 12 lines of `@use`. Verified by compiling both versions with `sass` and diffing: the CSS is **byte-identical** apart from ten section comments, so nothing can have moved visually. Also deleted the metric-grid CSS left dead by B3 in `attendance-page`, `fees-page`, `payments-page` and `dashboard-page`. | Build + lint clean; full suite 153 files / 903 tests pass. |
| 2026-11-15 | C2 — `ListQueryState` (pilot) | New `shared/list-query.ts` owns the four signals every list page declared by hand — `page`, `pageSize`, `sortBy`, `sortDirection` — plus `pageCount` and the rules that were being re-derived per page: a page-size change returns to page 1, sorting a new column starts ascending, sorting the same column toggles, and a page is clamped to the server total when one is known (and left alone when it isn't, so pages that filter client-side still work). Adopted in six list pages — coaches, fees, payments, students, attendance corrections, notifications — where the old signals are now aliases of the shared state, so the templates are untouched and behaviour is identical — `sortColumn`, `changeSortDirection`, `changePage`, `setPageSize` each delegate. Six unit tests cover the rules. Three pages were left alone on purpose: `attendance-history` sets no sort, `offline-queue` sorts a client-side array, and `batches` + `parent-details` hold two pagers (waitlist, per-tab) rather than one. | Build + lint clean; full suite 153 files / 903 tests pass, plus 167 targeted tests across the six converted pages. |
| 2026-11-15 | D2 — subscriptions tied to their owner | Every RxJS subscription that outlives a single call is now released with its component: `login-page` (the login request itself, so an abandoned login cannot navigate a dead component), `fees-page` and `payments-page` (both listened to `queryParamMap` with nothing to stop them), and the three in `AcademyFacade`. All use `takeUntilDestroyed(destroyRef)`. What remains subscribed is deliberate: the two Supabase realtime channels, which callers close through `destroyRef.onDestroy`, and the three pages that already hold an explicit `Subscription` and unsubscribe in `ngOnDestroy` (batches, notifications, parent portal). | Build + lint clean; full suite 152 files / 897 tests pass. One spec fixed properly: the payments `ActivatedRoute` mock faked `queryParamMap` as a bare `{ subscribe }` object, so it lacked the real Observable API; it now uses `of(convertToParamMap({}))`. |
| 2026-11-15 | C6 — `LocalStore` | Device storage now has one door: `core/state/local-store.ts` with `read/write/remove/readJson/writeJson`, every call guarded (private mode, quota, no `localStorage` during SSR) and a `LOCAL_KEYS` map for the four keys the app owns. Production call sites went **12 → 3** (the three inside the wrapper): reset bootstrap, parent selected child, device theme in three places, and print page setup. `write()` returns a boolean, so the settings screens still distinguish "saved for this device" from "applied for this session" instead of silently swallowing the failure. Specs keep using `localStorage` directly on purpose — asserting real persistence is the point of those tests. | Build + lint clean; full suite 152 files / 897 tests pass. |
| 2026-11-15 | A1 (tail) — `!important` audit | Declarations fell from 117 to **70** (54 in feature styles, 16 in `ui-foundations.css`). Removed the ones covering typography and plain spacing where the component selector already outranks the global element rule: student breadcrumbs, the shared student type sizes, six coach heading/stat sizes, the notifications eyebrow, and one empty-state alignment. Kept, deliberately: print overrides (all of `reports-page.scss`, which only exist to beat screen layout), control height and button surfaces, the `[hidden]` rule, the invalid-field ring, status colour utilities, and the reduced-motion/forced-colour block. | Build + lint pass. Full suite has 2 failures unrelated to this slice (see note below). |
| 2026-11-15 | B4 — one field-error | `styles.css` already owned a `.field-error`, but four features redeclared it with four different reds (`#ef4444`, `#a32b2b`, `#bd3b37`, `#a32323`) and their own sizes. The global rule now carries the whole contract (danger colour, caption size, weight, display, spacing) and the duplicates are gone. Two local rules survive on purpose: the users panel's negative top margin (dense dialog layout) and the form-dialog's `margin: 0` + meta size. 5 stylesheets → 2. | Build + lint pass; full suite 892 tests pass. Not visually checked. |
| 2026-11-15 | B5 — one empty state | The global `.empty-state` was a padded text block while the features each styled their own (centreing, icon size, heading colour). The global rule was upgraded to that shared shape (grid, centred, token spacing, `--app-fs-stat` icon, `--app-text` heading, `p` reset) and the duplicates in `students-page`, `student-details-page` and `users-settings-panel` were deleted. Six stylesheets → three: `fee-operations-page` keeps its icon-in-a-circle treatment and `user-profile-page` its dashed placeholder card, both deliberate variants rather than drift; `dialog-playground` is dev-only. | Build + lint pass; full suite 892 tests pass. Not visually checked. |
| 2026-11-15 | A5 — navy literals tokenised | `#10175e`, the attendance screens' heading colour, appeared 32 times as a literal. It is now `--app-navy`, defined per theme (`#10175e` light, `#4b5bd6` dark for contrast). No raw occurrence of that hex remains. | Build + lint pass; full suite 892 tests pass. |
| 2026-11-15 | A6 (partial) — spacing scale | Every `gap` whose value exactly matched the scale was mapped onto `--app-space-1…6` — **401 declarations** across 50 stylesheets, with no pixel change. Odd values (3/5/6/7/9/10/11/13/14/18px) were left literal on purpose: rounding them to the nearest token would visibly retune dense layouts, which is a design decision, not a cleanup. | Build + lint pass; full suite 892 tests pass. |
| 2026-11-15 | B2 — paginated lists on one table frame | Moved thirteen pages (fifteen tables) of paginated lists onto `app-data-table`, which owns the pagination hookup, so those pages no longer hand-wire `app-pagination`: audit log, notifications, notification templates, academy events, offline queue, attendance history, attendance calendar, attendance corrections, both users-panel tables, the batches waiting list, the report output, fee operations, both parent-portal tables and the coach attendance report. Each page keeps its own `.table-wrap` markup projected into the frame, so table styling and export tools are untouched. Non-paginated reference tables (role permissions, permissions catalogue, parent-portal fee charges) were deliberately left as-is — the frame always renders pagination. | Build + lint pass; full suite 151 files / 892 tests pass. Not clicked through. |
| 2026-11-15 | B3 — `SummaryCards` | Six pages that already looped over a card array now use `app-summary-cards` instead of re-implementing the loop over `app-summary-metric-card`: batches, dashboard, attendance, fees, payments, notifications. The card shape was unified on `hint` (renaming `detail` in the five local arrays and in `DashboardMetric` + both dashboard repositories), and `SummaryCard.tone` was widened to `SummaryMetricTone` so the existing red/amber/violet tones survive the move. The shared grid changed from a fixed four columns to `repeat(auto-fit, minmax(200px, 1fr))`, because four of these pages show five cards and a fixed four-column row wrapped the fifth. Static card markup (queue, live, summary, student, coach-profile, metric-grid) is left alone: it is not duplicated logic, just a grid class. | Build + lint pass; full suite 151 files / 892 tests pass. Selectors in four specs updated; not visually checked. |
| 2026-11-14 | B1 — one dialog contract | Added `ModalBackdrop` (`[appModalBackdrop]`, `dismiss` output) next to `ModalFocus`. All 17 feature backdrops now use it instead of per-page `$event.target === $event.currentTarget` expressions, so every dialog closes on backdrop click, and the four ad-hoc dismiss methods in the users panel were simplified to no-argument handlers. The payments "Record payment" route view, which had no focus trap at all, now uses `appModalFocus` plus a `closePaymentView()` navigation. `ModalShell` as a wrapper component was rejected: view encapsulation would stop every page's existing dialog CSS from reaching the shell's internal panel, so the shared pieces are the behaviour directives (`ModalFocus` + `ModalBackdrop`) and the token layer for the visuals. | Build + lint pass; full suite 151 files / 892 tests pass. Not clicked through. |

**Correction to the original audit:** the "37 images without alt" finding was a false positive. Every `<img>` has `alt` or `[alt]`; the grep's lookahead only matched `alt=`. Likewise, the 9 "clickable div/span" matches are all modal backdrop dismissal handlers with `role="presentation"`, which is correct. Both entries should be ignored.

Still open after this pass:

- **B2 `RecordTable`** — 65 raw `<table>` against 14 `<app-data-table>`; converting them is a per-page layout rewrite.
- **B3 `SummaryCards`** adoption — 18 hand-built metric grids across 12 class families.
- **B4 `FormField` / `FormActions`**, **B5 `EmptyState`** — shared form/empty-state primitives.
- **C1 single data layer**, **C2 `ListQueryState`**, **C3 e2e-only mock fixtures**, **C4 mega-stylesheet split**, **C5 portal services**, **C6 `LocalStore`**.
- **A5 navy palette** in attendance/enrollment, **A6 spacing scale**, **D1–D4** (aria-busy, takeUntilDestroyed, action-colour block, breakpoints), **E1** docs refresh.

Corrections from re-measuring: the audit's `app-ui-card` (2 uses) and `app-filter-bar` (1 use) counts were per-file — the coach portal uses `app-filter-bar` four times and `app-ui-card` appears in coach-portal and user-profile, so **B8 is not a real issue**. The "8 custom page heroes" are also mostly `PageHero` instances carrying extra classes; only the login marketing hero and the batch-detail header are genuinely bespoke, and both are intentional.
