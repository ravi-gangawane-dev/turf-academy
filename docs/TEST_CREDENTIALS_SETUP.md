# Live test credentials

Test identities are intentionally outside the production migration chain. Never
provision them in a production Supabase project.

## Required secrets

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_ADMIN_EMAIL`
- `E2E_RECEPTIONIST_EMAIL`
- `E2E_COACH_EMAIL`
- `E2E_PARENT_EMAIL`
- `E2E_PASSWORD` (at least 12 characters)
- `CONFIRM_TEST_PROJECT=yes`

Keep the service-role key and password in the CI secret store. The provisioning
command rejects the former shared default password and refuses to run unless the
test-project confirmation is present.

## Provision

```powershell
npm run test:provision
```

This invokes `scripts/provision-live-test-accounts.mjs`. It creates or rotates
the four Auth identities, upserts active profiles and role records, and links
available test batches/students. It is not run by `supabase db push`.

## Verify

```powershell
npm run test:e2e:live
```

The suite verifies authentication, role and RLS isolation, scoped realtime
delivery, calendar batch/student filtering, independent Coach panel failures,
offline queue replay, bounded concurrent history queries, and the complete live
registration-to-reporting backend workflow.

The dedicated linked test project may retain previously provisioned identities.
Its migration history no longer contains a test-account migration.
