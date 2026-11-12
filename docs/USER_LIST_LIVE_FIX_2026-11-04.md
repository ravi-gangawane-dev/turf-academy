# Users list 500 — live schema correction

Project: `ttuigbkaluozglzgepsh`. Request: `admin-manage-users`, action `list`, page 1, pageSize 5, empty filters, createdAt descending.

The deployed handler selected `profiles.onboarding_completed_at` and `profiles.last_sign_in_at`, but inspection of the live schema confirmed both columns were absent. `public.user_invitations` was also absent and migration `202610310001` was not recorded as applied.

Applied the existing transactional `supabase/migrations/202610310001_invitation_lifecycle.sql` to this project, then recorded that version as applied using migration repair. Requested a PostgREST schema-cache reload. No unrelated migrations were applied.

Verification:

- The handler's profile projection, ordering and first-page limit execute successfully against the live database as `service_role`, returning 5 rows. Only the count was printed; account details were not logged.
- The invitation table and sign-in marker function exist.
- All 27 Edge Function handler tests pass, including the exact reported list payload and audit payload.
- An authenticated HTTP retry from the user's browser is still needed to confirm end-to-end recovery; the database check is not an authenticated Edge invocation.
