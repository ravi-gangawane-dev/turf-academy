# Batch Module P1 Implementation Plan

## Completed
- Batch Details route and tabs implemented.
- Legacy routes preserve query parameters and map to workspace views.
- Batch Activity API reads enrollment history.
- Automated route, permission, loading, action-link, and batch tests pass.

## Live verification status
- Authenticated API workflow passed against the linked Supabase project using an isolated temporary admin profile.
- Student allocation/transfer, coach assignment, capacity/waitlist operation, and activity history completed through the API and cleaned up successfully.
- Linked SQL tests require Docker Desktop or direct database connection.
- Schedule update verification is still pending.

## Acceptance blocked
- Schedule update live verification.
- Manual browser redirect verification.

## API verification command
The repeatable authenticated workflow test is available as `npm run test:batch:live`.
It signs in with a test account, creates isolated batch/student records through the service-role client, exercises allocation/transfer, coach assignment, waitlist operations, and activity reads through the authenticated API, then removes the records in a `finally` cleanup block.

Set these variables in the local shell only; do not commit them or paste secrets into source control:

```powershell
$env:BATCH_TEST_EMAIL='verified-test-user@example.com'
$env:BATCH_TEST_PASSWORD='test-password'
$env:SUPABASE_SERVICE_ROLE_KEY='service-role-key-from-supabase'
npm run test:batch:live
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are optional and default to the configured project values in the script. The live acceptance items above remain pending until this command completes successfully against the linked database.
