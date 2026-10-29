# Pre-GitHub Audit — 2026-10-29

Repository: `turf-academy-ui` (Angular 22 + Supabase)
Scope: everything staged for the first push to GitHub — data, secrets, naming, structure.

## 1. Verdict

**Safe to push.** No secret material is present, no `node_modules`/`dist`/`backups` is
tracked, the index contains only source, config, migrations, tests and documentation,
and build + lint + unit tests are green.

| | Before | After |
| --- | --- | --- |
| Staged files | 959 | **~718** |
| Staged size | 43.3 MB | **~19.9 MB** |
| Local artifacts tracked | 243 files | **0** |
| `npm run lint` | failed (no ESLint) | **passes, 0 problems** |
| `ng test --watch=false` | 547 pass / 2 fail | **550 pass / 0 fail** |
| `ng build --configuration production` | pass | **pass** |

## 2. Repairs applied

- **`.gitignore`** ignores `.scratch/`, `.freebuff/`, `supabase/.temp/`,
  `docs/audit/preview-build/`, `docs/screenshots/`, `screenshots/`
  (already ignored: `dist`, `node_modules`, `backups`, `tmp`, `.angular/cache`,
  `test-results`, `playwright-report*`, `.devserver-*.log`, root `*.png`).
- **Untracked** (files kept on disk): `.scratch/` (102 files),
  `docs/audit/preview-build/` (98 files of compiled app), `docs/screenshots/` (12.7 MB),
  `playwright-report/`, `.devserver-4201.log`, `.freebuff/project-id`, `supabase/.temp/`.
- **Deleted dead scaffolding**: `src/app/app.component.ts|html|spec.ts`. `main.ts`
  bootstraps `App` from `src/app/app.ts`; nothing referenced `AppComponent`.
- **Reorganised the root**: `PNG-Files/` → `docs/design-assets/`, six root
  `*_REPORT.md` / `*_PLAN.md` / `*_GUIDE.md` → `docs/reports/` (relative links fixed),
  `clear-mock-data.py` and `verify-test-credentials.ts` → `scripts/legacy/`.
  `docs/qa-camera-student-qr.png` stays at `docs/` because
  `e2e/ui-recovery-mobile.spec.ts` reads that exact path.
- **README**: real project name, repository layout table, correct Playwright commands,
  quality-gate commands, current test numbers.

## 3. Tooling, typing and metadata fixes

1. **ESLint installed** — `ng add @angular-eslint/schematics` (angular-eslint v22),
   producing [eslint.config.js](../eslint.config.js) with ignores for `dist`, `tmp`,
   `docs`, `supabase/templates` and test-file relaxations (`any` allowed in specs and
   e2e only). All 89 initially reported problems were fixed rather than suppressed:
   unused imports/vars, `any` in production code, empty functions, `Array<T>` →
   `T[]`, index signatures → `Record`, `==` → `===`, an output named `reset` (a DOM
   event name) renamed to `resetFilters`, `prefer-inject`, `prefer-const`, a BOM in
   `batch-workspace.service.ts`, and the dialog backdrop keyboard/focus a11y rules
   (backdrops now use `role="presentation"` with `target === currentTarget` checks
   instead of `stopPropagation()` on the dialog).
2. **`strict` + `strictTemplates` enabled** in `tsconfig.json`. The codebase was
   already clean: `tsc --noEmit` reports 0 errors for both `tsconfig.app.json` and
   `tsconfig.spec.json`, and the production build passes with template checking on.
3. **`package.json`** — `version` 0.1.0, `description`, `license: UNLICENSED`, plus new
   scripts `test:e2e:recovery` and `test:scripts`. `repository` is intentionally left
   out until the GitHub URL exists.
4. **`manifest.webmanifest`** — real `name`/`short_name`/`description`, plus
   `theme_color: #0c6838` and `background_color: #ffffff`; `index.html` gained the
   matching `<meta name="theme-color">`.
5. **Avatars now resolve** — `public/branding/students/*.png` and
   `public/branding/coaches/*.png` were empty while every `photo_url` in the database
   pointed at them. The four referenced photos were exported at 256 px
   (~100 KB each, down from ~2 MB) into those folders, so student/coach avatars render.
   Source masters stay in `docs/design-assets/`.
6. **Script/test convention** — `scripts/*.test.mjs` uses `node:test`, which requires
   the `.test.mjs` suffix; renaming them to `.spec.mjs` would stop them being
   discovered. Instead they are now runnable via `npm run test:scripts`
   (8 tests, green), and `playwright.recovery.config.ts` is wired to
   `npm run test:e2e:recovery`.

## 4. Files that must not be pushed

| Path | Why | State |
| --- | --- | --- |
| `node_modules/` | dependencies, reproducible from lockfile | ignored, not staged |
| `dist/`, `.angular/`, `out-tsc/` | build output | ignored, not staged |
| `backups/`, `tmp/` | database dumps and patches (contain user rows) | ignored, not staged |
| `.scratch/` | agent scratch: logs, probes, generated SQL/JSON | ignored + untracked |
| `docs/audit/preview-build/` | a compiled app bundle committed as docs | ignored + untracked |
| `docs/screenshots/` | 12.7 MB of PNG evidence, regenerable | ignored + untracked |
| `test-results/`, `playwright-report*/`, `*.log` | test output and dev-server logs | ignored, not staged |
| `.env*` | not present in the repo at all — keep it that way | none exist |
| `.freebuff/`, `supabase/.temp/` | local tool state | ignored + untracked |

Never commit: any `service_role` key, `SUPABASE_SERVICE_ROLE_KEY` value, SMTP or
WhatsApp provider credentials, or a `supabase/config.toml` containing real secrets.

## 5. Secret scan

Full-text scan of every staged file for `service_role`, `sb_secret_*`, JWTs,
`-----BEGIN … PRIVATE KEY-----`, and literal `password`/`api_key` assignments:

- **No service-role key, no JWT, no private key, no provider credential.**
- One key value appears in the repo: `sb_publishable_rWM0j3-…` in
  `src/environments/*.ts`, `e2e/live-*.ts`, `scripts/audit-ui.mjs` and two reports.
  This is Supabase's **publishable** (anon) key — shipped to browsers by design and
  not a secret. Its safety depends entirely on **RLS being enabled on every table**;
  verify that in the Supabase dashboard before the repo goes public.
- `service_role` matches are prose in docs and `process.env.SUPABASE_SERVICE_ROLE_KEY`
  reads inside `supabase/functions/*` — no values.
- Test passwords (`academy123`, `NewPass123!`) exist only inside `*.spec.ts` fixtures.

## 6. Naming and structure audit

Passing:

- `src/app/` splits into `core/` (services, no components), `features/` (one folder per
  screen area), `shared/` (standalone reusable components), `layout/`.
- Every component keeps one base name across `.ts` / `.html` / `.scss` / `.spec.ts`;
  all kebab-case, no spaces or capitals under `src/`.
- 112 unit specs, all `*.spec.ts`; maintenance-script tests are `*.test.mjs` for
  `node:test` and now have a script.
- All 82 migrations match `YYYYMMDDNNNN_snake_case.sql` — zero deviations.
- `public/` holds only served assets; `eslint.config.js`, `.editorconfig`,
  `.prettierrc`, `.postcssrc.json`, `.vscode/` (allow-listed) are all sane.

Remaining, deliberately not changed:

1. `docs/` holds 100+ audit/status markdown files, many superseded
   (`FULL_PROJECT_AUDIT.md`, `PROJECT_STATUS_REPORT_*`, `CONTINUATION_STATUS.md`).
   Consider `docs/archive/` for anything older than the current release.
2. `src/app/core/supabase/domain-services.ts` is ~1.7 kLOC — split it by domain when
   it next changes.
3. `docs/design-assets/` keeps the ~9.9 MB of source PNGs (the served copies are the
   optimised 256 px avatars). Drop the masters or move them to external storage if
   repository size matters.
4. Four Playwright configs remain (`base`, `.live`, `.pwa`, `.recovery`); all four now
   have npm scripts.
5. `package.json` still has no `repository` field — add the GitHub URL after the first
   push.

## 7. Validation results

| Check | Result |
| --- | --- |
| `npm run lint` | **pass — 0 problems** (89 were fixed, none suppressed) |
| `npx tsc -p tsconfig.app.json --noEmit` | **0 errors** with `strict: true` |
| `npx tsc -p tsconfig.spec.json --noEmit` | **0 errors** |
| `ng build --configuration production` | **pass** (18.6 s, 503.5 kB initial) |
| `ng test --watch=false` | **550 pass / 0 fail** (112 files), twice in a row |
| `npm run test:scripts` | **8 pass** (`node:test`) |
| Playwright e2e | not run — suites need a dev server plus live Supabase credentials |

Note: one earlier full run showed a single failure in
`parent-portal-page.spec.ts` ("should create"); it passed on two subsequent full runs,
so it is timing-flaky rather than broken.

## 8. Recommended final tree

```
turf-academy-ui/
├── api/openapi.yaml
├── deployment/                 nginx example + dated backend release SQL
├── docs/
│   ├── design-assets/          source brand/photo masters (not served)
│   ├── reports/                historical audit + implementation reports
│   ├── audit/                  runtime audit output (no compiled bundles)
│   └── *.md                    runbooks, guides, QA evidence
├── e2e/                        Playwright specs (live-* need credentials)
├── public/                     branding/ (logo, login art, avatars), icons/, favicon.ico, manifest.webmanifest
├── scripts/                    maintained Node tools (+ legacy/ for one-offs)
├── src/
│   ├── app/{core,features,shared,layout}
│   └── environments/
├── supabase/{migrations,functions,tests,templates}
├── angular.json  package.json  tsconfig*.json  ngsw-config.json  eslint.config.js
├── playwright*.config.ts
├── .editorconfig  .prettierrc  .postcssrc.json  .gitignore
└── README.md
```

## 9. Before you push

1. Confirm RLS is enabled and tested on every Supabase table (the publishable key is public).
2. Add the `repository` URL to `package.json` once the GitHub remote exists.
3. Decide whether `docs/screenshots/` should be re-added (they are now local-only).
4. Optional: move superseded docs into `docs/archive/`, and drop the 9.9 MB masters in
   `docs/design-assets/` if repo size matters.
5. CI can require all four gates from day one: `npm run lint`, `ng test --watch=false`,
   `npm run build`, `npm run test:scripts`.
