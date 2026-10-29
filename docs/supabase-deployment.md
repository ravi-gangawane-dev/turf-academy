# Supabase backend deployment

## 1. Configure a project

Install the Supabase CLI, authenticate, and link this repository to a project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For a disposable local database (Docker required):

```powershell
npx supabase start
npx supabase db reset
npx supabase db lint
```

`db reset` applies every file in `supabase/migrations` and then `supabase/seed.sql`.

The list-query updates in migrations `202610130008` through `202610130011` add allowlisted server-side sorting and paged search/filter RPCs for staff lists, attendance corrections, payments, and students. The Users & Roles list also depends on the latest `admin-manage-users` Edge Function for its column filters, server-side sorting, exact counts, and pagination. Apply migrations before deploying the matching Angular build, then deploy the updated account-list Edge Function:

```powershell
npx supabase functions deploy admin-manage-users
```

## 2. Configure Angular

Set these deployment-time values in `src/environments/environment.production.ts`, or replace that file in CI:

```ts
backend: 'supabase',
useMockApi: false,
supabaseUrl: 'https://PROJECT_REF.supabase.co',
supabaseAnonKey: 'PUBLIC_ANON_OR_PUBLISHABLE_KEY',
```

The anon/publishable key is intended for browser use. Never put a service-role key in Angular, source control, local storage, or a client-visible CI variable.

## 3. Bootstrap authorization

Create the first user through Supabase Authentication. New users receive a `parent` profile by default. Promote the first trusted administrator from the SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH_USER_UUID';
```

After that, use an admin-only server operation or the SQL editor to promote receptionist and coach accounts. A coach auth profile must be linked through `coaches.profile_id`; a parent account through `parents.profile_id`.

## 4. Data and file conventions

- Money is stored as PostgreSQL `numeric(12,2)` in rupees. Existing UI adapters using paise must multiply/divide exactly once.
- Months are stored as the first day of the month.
- Private object paths start with the owning entity UUID.
- QR codes contain only `qr_profiles.public_token`, never a student UUID or personal data.
- Payment clients must retain and reuse `client_reference` when retrying a request.

## 5. Realtime and notification delivery

Attendance, payments, and notifications are added to Supabase Realtime. Deploy the authenticated `notification-delivery` Edge Function and configure provider credentials as server-side secrets using [Notification delivery setup](./NOTIFICATION_DELIVERY_SETUP.md). The Notifications page can then send queued email and WhatsApp messages and refresh their provider delivery status. External messages remain queued for staff review; there is no automatic bulk sender or cron job.

## 6. Verification checklist

1. Run `npx supabase db reset` and `npx supabase db lint` locally.
2. Create admin, receptionist, coach, and parent test users.
3. Confirm anonymous requests cannot read any table or bucket.
4. Confirm parent queries return only linked children, attendance, documents, charges, payments, and receipts.
5. Confirm a coach sees only operational student data and cannot alter fees or profiles.
6. Exercise enrollment capacity, duplicate attendance, repeated payment reference, overpayment, and correction audit cases.
7. Run `npm test -- --watch=false`, `npm run build`, and `npm run test:e2e`.
