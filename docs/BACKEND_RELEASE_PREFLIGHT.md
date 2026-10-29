# Backend release preflight — 16 October 2026

Read-only checks against the already linked project `ttuigbkaluozglzgepsh`. This does not confirm that the project is the intended client release target. No academy records, schema, functions or migration history were changed.

## Priority results

| Priority | Check | Result |
|---|---|---|
| P0 | Frontend literal RPC availability | All 44 distinct literal RPC names found in frontend source exist. This does not establish every signature, dynamic RPC, or behavior. |
| P0 | Recent table/filter functions | Seven current function bodies match latest local migrations after whitespace/comment normalization. Anonymous execution is denied for those functions. An older eight-argument payment overload also remains; current nine-argument version matches. |
| P0 | User-management Edge Function | Active version 2; downloaded source SHA-256 exactly matches local `admin-manage-users/index.ts`. Runtime/authentication behavior still needs live account tests. |
| P0 | RLS enabled | No public ordinary table has RLS disabled. Both column helper views use `security_invoker=true`. This is not complete policy verification. |
| P0 | Student read isolation | Read-only SQL passed for existing Admin, Receptionist, Coach and Parent test profiles. Expected IDs were computed independently from relationships before switching to authenticated role. Coach and Parent had both allowed and forbidden existing records. Anonymous access denied. |
| P0 | Core writes, login and financial correctness | Still pending designated environment/account/write scope. Read-only role simulation does not test actual JWT login, mutation policies, payments, refunds or queue replay. |
| P1 | Events/Holidays and notification automation | Confirmed absent: `academy_events`, `run_academy_notification_automations`, `queue_birthday_email_for_notification`. Events UI calls the missing table; this is a real deployment dependency, not only an unverified feature. |
| Release | Migration history | Twelve local versions absent from ledger. Six recent column-control changes are nevertheless present in the database; do not blindly replay all missing migrations. |

Recent matching functions: `list_column_value`, `list_columns_match`, `get_staff_list_page`, `get_student_columns_page`, `get_payment_list_page` (nine arguments), `get_attendance_table_page`, `get_student_detail_page`.

## Migration reconciliation required

Absent from history: `202610130002` through `202610130007`, and `202610140003` through `202610140008`.

- `202610140003`–`202610140008`: current function bodies and the two helper views are present. Verify complete view definitions, policies and grants before recording already-applied migrations. A matching function alone is insufficient to repair the ledger.
- `202610130002`: creates Events/Holidays plus notification templates, attendance notification behavior and an hourly automation job. Review and test the whole migration on the designated test environment before deployment; it is not just a table creation.
- `202610130005`–`202610130007`: dependent birthday email/template changes; stage only after the base automation migration and its tests pass.
- `202610130003` and `202610130004`: one-off named-student notifications. Exclude from client rollout unless specifically required. Do not bulk `db push --include-all` to overcome this ledger gap.

## Security advisor follow-up

The advisor reports one mutable search path (`change_enrollment_status`), 29 anonymous-executable security-definer warnings, 38 authenticated-executable security-definer warnings and disabled leaked-password protection. These are warnings, not evidence that all listed functions leak data: guarded RPCs intentionally execute for authenticated callers. Review actual authorization guards and negative tests before changing grants. No grant changes or Auth settings were made by this pass.

## Evidence and continuation

Raw local evidence is in ignored `tmp/release-2026-10-19/`: `backend-preflight.json`, `backend-comparison.json`, `rpc-catalog.json`, `security-advisors.json`, `test-profile-availability.json`, `readonly-role-scope.json`, and the downloaded function under `remote-functions/`.

Repeat the non-mutating scope check with:

```powershell
npx --no-install supabase db query --linked --file supabase/tests/release_readonly_role_scope.sql
```

Next priority: confirm whether the linked project is test/staging or production and establish disposable test-data scope; then run existing core enrollment/attendance/payment/role suites. Actual test profiles exist, but passwords were not obtained, reset or tested. Resolve P0 failures before deploying Events/automation. Hosting, device acceptance and authorized external-message delivery remain separate.
