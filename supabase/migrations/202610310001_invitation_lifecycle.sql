begin;

-- Invitation lifecycle and onboarding state for the admin user-management flow.
-- The tables are read-only for authenticated clients; every write happens in the
-- trusted admin-manage-users Edge Function (service role) or through the two
-- narrowly scoped functions below that only ever touch the caller's own row.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists last_sign_in_at timestamptz;

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (position('@' in email) > 1 and length(email) <= 254),
  full_name text,
  phone text,
  role public.app_role not null,
  invited_by uuid references public.profiles(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'failed', 'revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live invitation per address: retries must reuse the existing row so a
-- partially successful request can never create a duplicate account record.
create unique index if not exists user_invitations_one_live
  on public.user_invitations (lower(email))
  where status in ('pending', 'failed');

create index if not exists user_invitations_email_idx
  on public.user_invitations (lower(email));
create index if not exists user_invitations_status_idx
  on public.user_invitations (status, invited_at desc);
create index if not exists user_invitations_auth_user_idx
  on public.user_invitations (auth_user_id);

drop trigger if exists user_invitations_set_updated_at on public.user_invitations;
create trigger user_invitations_set_updated_at
  before update on public.user_invitations
  for each row execute function public.set_updated_at();

alter table public.user_invitations enable row level security;

drop policy if exists user_invitations_admin_read on public.user_invitations;
create policy user_invitations_admin_read on public.user_invitations
  for select to authenticated
  using (public.is_admin());

-- No insert/update/delete policies: only the service role (Edge Function) or
-- the security-definer functions below may change invitation rows.

-- Called by the invited user after they set their password. It never accepts a
-- role or email from the caller: the role was assigned server-side at invite
-- time and the row is located by the authenticated identity.
create or replace function public.complete_account_onboarding()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_completed timestamptz := now();
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Activation never overrides a suspension or deactivation an admin applied
  -- after the invitation was sent.
  update public.profiles
    set onboarding_completed_at = coalesce(onboarding_completed_at, v_completed),
        updated_at = now()
    where id = v_user;

  if not found then
    raise exception 'Account profile not configured' using errcode = 'P0002';
  end if;

  update public.user_invitations
    set status = 'accepted',
        accepted_at = coalesce(accepted_at, v_completed),
        auth_user_id = coalesce(auth_user_id, v_user)
    where auth_user_id = v_user
      and status in ('pending', 'failed', 'expired');

  return v_completed;
end;
$$;

revoke all on function public.complete_account_onboarding() from public;
grant execute on function public.complete_account_onboarding() to authenticated;

-- Lightweight sign-in marker for the admin "Last login" column. It can only
-- update the caller's own profile row.
create or replace function public.record_sign_in()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles set last_sign_in_at = now() where id = auth.uid();
end;
$$;

revoke all on function public.record_sign_in() from public;
grant execute on function public.record_sign_in() to authenticated;

-- Operator-only first-administrator provisioning. It is intentionally NOT
-- granted to anon or authenticated: it can only be executed with the service
-- role / SQL editor, it refuses to run once any active administrator exists, and
-- it only accepts an already verified Supabase Auth identity. No password or
-- role is ever supplied by a browser, and no public bootstrap endpoint exists.
create or replace function public.bootstrap_first_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
  v_name text;
begin
  if v_email = '' or position('@' in v_email) < 2 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles
    where role = 'admin' and status = 'active' and is_active
  ) then
    raise exception 'An active administrator already exists; use the invitation flow instead'
      using errcode = '55000';
  end if;

  select id, coalesce(nullif(trim(raw_user_meta_data->>'full_name'), ''), split_part(v_email, '@', 1))
    into v_user, v_name
    from auth.users
   where lower(email) = v_email and email_confirmed_at is not null;

  if v_user is null then
    raise exception 'No verified Supabase Auth user exists for %', v_email using errcode = 'P0002';
  end if;

  insert into public.profiles (id, full_name, email, role, status, is_active)
  values (v_user, v_name, v_email, 'admin', 'active', true)
  on conflict (id) do update
    set role = 'admin', status = 'active', is_active = true,
        onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now()),
        updated_at = now();

  insert into public.audit_logs (actor_id, action, table_name, record_id, new_values)
  values (null, 'bootstrap_first_admin', 'profiles', v_user::text, jsonb_build_object('email', v_email));

  return v_user;
end;
$$;

revoke all on function public.bootstrap_first_admin(text) from public;

commit;
