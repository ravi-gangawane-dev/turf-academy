begin;

-- Append-only record of every printed document and downloaded export.
-- The browser writes one row per completed action; idempotency is not required
-- because repeating a print is itself an auditable event.

create table if not exists public.print_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.app_role,
  action text not null check (action in ('print', 'download', 'preview')),
  document_kind text not null check (length(document_kind) between 1 and 80),
  document_reference text not null default '' check (length(document_reference) <= 200),
  format text not null check (format in ('print', 'pdf', 'csv', 'json')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists print_audit_events_created_at_idx
  on public.print_audit_events (created_at desc);
create index if not exists print_audit_events_actor_idx
  on public.print_audit_events (actor_id, created_at desc);
create index if not exists print_audit_events_document_idx
  on public.print_audit_events (document_kind, created_at desc);

alter table public.print_audit_events enable row level security;

-- A signed-in user may only append their own events. Admins read the trail;
-- there is no update or delete policy, so the table is append-only for clients.
drop policy if exists print_audit_events_self_insert on public.print_audit_events;
create policy print_audit_events_self_insert on public.print_audit_events
  for insert to authenticated
  with check (actor_id = auth.uid());

drop policy if exists print_audit_events_admin_read on public.print_audit_events;
create policy print_audit_events_admin_read on public.print_audit_events
  for select to authenticated
  using (public.is_admin());

commit;
