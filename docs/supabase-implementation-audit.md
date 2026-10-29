# Supabase implementation audit

Date: 2026-09-04

## Existing architecture

- Angular 22 standalone application with feature pages under `src/app/features`.
- `AcademyFacade` is the UI boundary. It writes directly to `AcademyStore` in mock mode and delegates to REST repositories otherwise.
- `AcademyStore` contains realistic fixture data and persists it to local storage when `useMockApi` is enabled.
- Authentication is simulated in mock mode. The non-mock path expects `/api/v1/auth/login` and `/api/v1/auth/refresh-token`.
- Offline attendance is stored in IndexedDB and replayed to the REST attendance repository.
- There is an OpenAPI contract, but no server, database migrations, Supabase client, RLS, storage policy, or backend test environment.

## Gaps and risk

| Area | Finding | Resolution in this implementation |
| --- | --- | --- |
| Configuration | Only REST base URL and mock flag exist | Add public Supabase URL/key configuration with an explicit backend mode |
| Authentication | Session shape is app-specific and roles are trusted from the response | Resolve role from an RLS-protected `profiles` row |
| Persistence | Core data and fee plans use separate browser storage | Add normalized PostgreSQL schema and typed Angular domain services |
| Authorization | Frontend guards are the only permission boundary | Add RLS to every exposed table and role helper functions |
| Financial integrity | Charges/payments can be independently mutated | Use immutable ledger-style payments and transactional RPCs |
| Attendance | Client performs workflow decisions | Use idempotent check-in/check-out/correction RPCs |
| Documents | Data URLs/local fields only | Add private buckets, metadata tables, signed URL helpers, and policies |
| Notifications | UI contains a queue but no delivery backend | Add a queue table; external delivery remains an Edge Function/provider concern |
| Reporting | Reports are generated from client state | Add secured views and query services; large exports remain server-side work |
| Audit | No durable audit trail | Add actor-aware audit triggers for sensitive tables |

## Compatibility decision

The mock backend remains the default until valid Supabase project settings are supplied. This keeps local demos and the existing test suite working. Set `backend: 'supabase'`, `useMockApi: false`, and the two public Supabase values to activate the real backend. The obsolete REST path remains available during migration but is no longer the recommended production target.

## External prerequisites

- A Supabase project and its public URL plus anon/publishable key.
- Supabase CLI or dashboard access to apply migrations.
- Auth users created through Supabase Auth. The profile trigger assigns `parent` by default; an existing admin must promote staff accounts.
- SMS/WhatsApp provider credentials in server-side secrets if message delivery is required.

