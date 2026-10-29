# P0 blockers — resolution report

**Status: RESOLVED AND LIVE-VERIFIED**

## Deployment safety

- Test accounts are not part of `supabase/migrations`.
- `npm run test:provision` requires a service-role secret, explicit
  `CONFIRM_TEST_PROJECT=yes`, role-specific email variables, and a non-default
  password of at least 12 characters.
- Migration `202609160001` was removed from the linked test project's migration
  history without deleting its existing test identities.
- Playwright reports and `test-results` are ignored and are not source artifacts.

## Live coverage

The live suite covers:

- Admin, Receptionist, Coach, and Parent authentication and route isolation.
- Coach access to assigned batches/students only.
- Parent access to linked children only.
- Attendance correction, concurrency, and duplicate prevention.
- Actual scoped Supabase realtime delivery after an attendance mutation.
- Realtime RLS visibility restricted to the authenticated Coach's event rows.
- Calendar database-level batch/student filtering plus month, week, and list UI.
- Independent Coach sessions/notifications failure rendering.
- Offline Coach attendance queue, browser reconnection, replay, and IndexedDB cleanup.
- Bounded server pagination under concurrent Coach history query load, with a
  five-second p95 threshold.
- Live registration, enrollment, attendance, payment, and reporting lifecycle,
  including cleanup of generated records.

## Commands

```powershell
npm test -- --watch=false
npm run build
npm run test:e2e:live
npx supabase db lint --linked --level warning
```

## Test organization

- `e2e/live-supabase-scopes.spec.ts` contains Supabase-specific verification.
- `e2e/live-vertical-slice.spec.ts` covers the live business lifecycle.
- `e2e/vertical-slice.spec.ts` remains the mock-repository workflow and is run by
  the normal Playwright configuration, not the live configuration.

No known P0 deployment, authentication, RLS, realtime, calendar-filter, offline
replay, Coach-panel isolation, or live-workflow blocker remains.
