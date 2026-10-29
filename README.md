# Turf Cricket Academy — UI

Angular 22 single-page app for academy operations: students, parents, coaches, batches, attendance, fees/payments, notifications, reports and settings. Backend is Supabase (Postgres + RLS, edge functions, storage).

## Repository layout

| Path | Contents |
| --- | --- |
| `src/app/core/` | Framework-free services: `api/` repositories, `auth/`, `supabase/` data services, `state/` stores, `models/`, `offline/`, `interceptors/` |
| `src/app/features/` | One folder per screen area (`students`, `attendance`, `fees`, `payments`, `settings`, ...). Component = `.ts` + `.html` + `.scss` + `.spec.ts`, same base name |
| `src/app/shared/` | Reusable standalone components (data-table, dialogs, page-hero, pagination, toast, ...) |
| `src/app/layout/` | Shell layouts (`staff-layout`) |
| `src/environments/` | `environment.ts` (dev), `environment.production.ts`, `environment.e2e.ts`, `environment.live.ts` |
| `public/` | Served static files — `branding/` (logo, login art, 256px student/coach avatars), `icons/` (PWA icons), `favicon.ico`, `manifest.webmanifest` |
| `supabase/migrations/` | Timestamped SQL migrations (`YYYYMMDDNNNN_name.sql`), applied in order |
| `supabase/functions/` | Deno edge functions (`admin-manage-users`, `notification-delivery`) |
| `supabase/tests/`, `supabase/templates/` | pgTAP tests and SQL/email templates |
| `e2e/` | Playwright specs (`*.spec.ts`); `live-*` specs hit a real Supabase project |
| `scripts/` | Node maintenance scripts; `scripts/legacy/` holds superseded one-offs; tests use `*.test.mjs` for `node:test` |
| `docs/` | Audits, runbooks, guides; `docs/reports/`, `docs/audit/`, `docs/design-assets/` |
| `api/openapi.yaml` | HTTP contract for the API-only deployment |
| `deployment/` | nginx example and dated backend release SQL |

Not committed: `node_modules/`, `dist/`, `backups/`, `tmp/`, `.angular/`, `.scratch/`, `.freebuff/`, `test-results/`, `playwright-report*/`, `docs/screenshots/`, `docs/audit/preview-build/`, `*.log` (see `.gitignore`).

Current functionality and API-only findings: [27 October audit](docs/FUNCTIONALITY_API_AUDIT_2026-10-27.md). Offline attendance is disabled; changes require an online API response.

For ongoing fixes, verification results, and remaining blockers, read [the repair tracker](docs/REPAIR_TRACKER.md) before continuing work. The [15 October functionality audit](docs/FUNCTIONALITY_AUDIT_2026-10-15.md) records the pre-repair baseline.

The application supports a mock backend for demos and a Supabase backend for production. See [the implementation audit](docs/supabase-implementation-audit.md) and [Supabase deployment guide](docs/supabase-deployment.md). Database migrations, RLS policies, transactional workflows, storage buckets, realtime publication, and seed fixtures live under `supabase/`.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Quality gates

```bash
npm run lint                 # ESLint + angular-eslint (flat config, eslint.config.js)
npx ng test --watch=false    # Vitest unit suite
npm run test:scripts         # node:test suites for the maintenance scripts
npm run build                # production build
```

TypeScript runs with `strict` and `strictTemplates` enabled (see `tsconfig.json`).

### Error monitoring

Uncaught errors are logged as before and, when configured, POSTed to a collector as a
redacted JSON payload (no query string, no cookies). Enable it by setting
`monitoring.endpoint` (and `release`) in `src/environments/environment.production.ts`.
An empty endpoint keeps reporting inert.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

E2E coverage uses Playwright (not the CLI `ng e2e` schematic):

```bash
npm run test:e2e         # offline/mocked suites (playwright.config.ts)
npm run test:e2e:live    # live Supabase suites, needs live credentials
npm run test:e2e:pwa     # service-worker/PWA suite
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## WhatsApp Attendance Notification Feature

### Overview
The application includes a free WhatsApp Click-to-Chat integration for attendance notifications. This feature:
- Uses WhatsApp's free Click-to-Chat (wa.me) URLs
- Does NOT require a paid WhatsApp API
- Prepares messages with student name, batch, action, and timestamp
- Opens WhatsApp chat with prefilled text for administrator/coach review
- Requires manual confirmation - the administrator/coach must press Send
- Does NOT claim automatic message delivery

### How to Use
1. **Check in/Check out a student** through the attendance dashboard, QR attendance, or manual check-in page
2. **After successful attendance save**, a WhatsApp notification card appears if a parent/guardian number is linked to the student
3. **Click the WhatsApp button** on the notification card to open WhatsApp with a prefilled message
4. **Review the prefilled message** which includes:
   - Student name
   - Attendance action (check-in/check-out)
   - Batch name
   - Date and time of attendance
   - Academy name
5. **Press Send** in WhatsApp to message the parent/guardian (manual action required)

### Technical Details
- The feature uses the `WhatsappService` which builds `wa.me` links
- Parent phone numbers must be linked to students through the academy's enrollment system
- Only authorized admin/coach users can access parent contact details through existing RLS policies
- The message text is generated dynamically based on the attendance record
- No paid WhatsApp Business API is required - only Click-to-Chat functionality

### Testing
- WhatsAppAction component tests pass (4/4)
- Full unit suite: 112 files / 550 tests passing (`ng test --watch=false`)
- Production build (`ng build --configuration production`) succeeds with no errors
- To manually test: run `ng serve`, check in a student, and click the WhatsApp notification card that appears
