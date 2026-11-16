import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const FALLBACK_ROLES = ['admin', 'coach', 'receptionist', 'parent'] as const;
const FALLBACK_ROLE_LABELS: Record<string, string> = { admin: 'Administrator', receptionist: 'Receptionist', coach: 'Coach', parent: 'Parent' };
const statuses = ['active', 'inactive', 'suspended'] as const;
const PERMISSION_EFFECTS = ['grant', 'revoke'] as const;
type PermissionEffect = typeof PERMISSION_EFFECTS[number];
type PermissionOverride = { permissionKey: string; effect: PermissionEffect };
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALLOWED_REDIRECT_PATHS = ['/auth/reset-password', '/auth/set-password'];
const TEMP_PASSWORD_LENGTH = 16;
const TEMP_PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TEMP_PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz';
const TEMP_PASSWORD_DIGITS = '23456789';
const TEMP_PASSWORD_SYMBOLS = '!@#$%^&*';
const TEMP_PASSWORD_ALPHABET = TEMP_PASSWORD_UPPER + TEMP_PASSWORD_LOWER + TEMP_PASSWORD_DIGITS + TEMP_PASSWORD_SYMBOLS;

/**
 * Uniform random index without modulo bias. crypto.getRandomValues is available
 * in the Edge runtime, so a temporary password is never derived from Math.random.
 */
const randomIndex = (max: number): number => {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
};

/** One uppercase, lowercase, digit and symbol, then random characters, shuffled. */
const temporaryPassword = (): string => {
  const pick = (alphabet: string) => alphabet[randomIndex(alphabet.length)];
  const chars = [
    pick(TEMP_PASSWORD_UPPER),
    pick(TEMP_PASSWORD_LOWER),
    pick(TEMP_PASSWORD_DIGITS),
    pick(TEMP_PASSWORD_SYMBOLS),
  ];
  while (chars.length < TEMP_PASSWORD_LENGTH) chars.push(pick(TEMP_PASSWORD_ALPHABET));
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join('');
};

/**
 * Columns that reference public.profiles without ON DELETE CASCADE or
 * ON DELETE SET NULL. A hard delete is only offered while every one of these
 * is empty for the target account; the foreign keys themselves remain the
 * final authority if this list drifts behind the schema.
 */
const PROFILE_REFERENCES = [
  { table: 'students', column: 'created_by', label: 'student records' },
  { table: 'enrollments', column: 'created_by', label: 'enrolments' },
  { table: 'enrollment_history', column: 'changed_by', label: 'enrolment history' },
  { table: 'attendance_records', column: 'recorded_by', label: 'attendance records' },
  { table: 'attendance_corrections', column: 'requested_by', label: 'attendance corrections' },
  { table: 'attendance_corrections', column: 'approved_by', label: 'attendance approvals' },
  { table: 'offline_attendance_queue', column: 'created_by', label: 'offline attendance entries' },
  { table: 'student_discounts', column: 'created_by', label: 'discounts' },
  { table: 'payments', column: 'recorded_by', label: 'payments' },
  { table: 'receipts', column: 'issued_by', label: 'receipts' },
  { table: 'payment_refunds', column: 'refunded_by', label: 'refunds' },
  { table: 'notifications', column: 'created_by', label: 'notifications' },
  { table: 'student_documents', column: 'uploaded_by', label: 'student documents' },
  { table: 'student_medical_records', column: 'updated_by', label: 'medical records' },
  { table: 'training_sessions', column: 'created_by', label: 'training sessions' },
  { table: 'batch_waitlist', column: 'created_by', label: 'waitlist entries' },
  { table: 'academy_events', column: 'created_by', label: 'academy events' },
  { table: 'notification_templates', column: 'created_by', label: 'notification templates' },
  { table: 'notification_templates', column: 'updated_by', label: 'notification templates' },
  { table: 'academy_settings', column: 'updated_by', label: 'academy settings' },
  { table: 'audit_logs', column: 'actor_id', label: 'access and finance audit entries' },
] as const;

type RoleOption = { key: string; label: string };
let roleCache: { at: number; rows: RoleOption[] } | null = null;

/**
 * Reads the role catalogue so invitation validation and auth metadata follow
 * the same rows as the Angular settings screens. The built-in list is only a
 * fallback while the catalogue migration has not reached an environment.
 */
const loadRoleOptions = async (adminClient: SupabaseClient): Promise<RoleOption[]> => {
  if (roleCache && Date.now() - roleCache.at < 60_000) return roleCache.rows;
  const { data, error } = await adminClient.from('roles').select('key,label').order('rank');
  if (error) console.error('role catalogue lookup failed', { code: error.code });
  const rows = (error ? [] : data ?? [])
    .filter((row: { key?: string }) => FALLBACK_ROLES.includes(row.key as typeof FALLBACK_ROLES[number]))
    .map((row: { key: string; label: string | null }) => ({ key: row.key, label: row.label || row.key }));
  const options = rows.length ? rows : FALLBACK_ROLES.map((key) => ({ key, label: FALLBACK_ROLE_LABELS[key] }));
  roleCache = { at: Date.now(), rows: options };
  return options;
};

/**
 * Invitation and account-management operations. Every action re-validates the
 * caller's Supabase identity and requires an active administrator profile. The
 * service-role client is only ever used inside this function; no privileged key
 * reaches the Angular application.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required.' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return json({ error: 'Invalid or expired session.' }, 401);
  const { data: caller } = await adminClient.from('profiles').select('role,status,is_active').eq('id', user.id).single();
  if (!caller || caller.role !== 'admin' || caller.status !== 'active' || !caller.is_active) return json({ error: 'Administrator access required.' }, 403);

  const roleOptions = await loadRoleOptions(adminClient);
  const roleKeys = roleOptions.map((role) => role.key);
  const roleLabel = new Map(roleOptions.map((role) => [role.key, role.label]));

  /** Trusted, server-owned password-setup URL. Never taken from the caller. */
  const invitationRedirect = (): string | null => {
    try {
      const target = new URL(Deno.env.get('INVITE_REDIRECT_URL') ?? '');
      if (target.protocol !== 'https:' || target.username || target.password ||
        !ALLOWED_REDIRECT_PATHS.includes(target.pathname) || target.search || target.hash) return null;
      return target.href;
    } catch {
      return null;
    }
  };

  const audit = async (action: string, recordId: string, values: Record<string, unknown>) => {
    const { error } = await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action,
      table_name: action.startsWith('invitation') ? 'user_invitations' : 'profiles',
      record_id: recordId,
      new_values: values,
    });
    // Audit evidence must never fail the user's operation, but it is logged.
    if (error) console.error('audit_logs insert failed', { action, code: error.code });
  };

  const expireStaleInvitations = async () => {
    const { error } = await adminClient.from('user_invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());
    if (error) console.error('expiring invitations failed', { code: error.code });
  };

  /**
   * Human-readable list of the records that currently block a hard delete.
   * A failed probe is logged but not reported as a blocker: the database
   * foreign key still refuses the delete if that record exists.
   */
  const profileBlockers = async (userId: string): Promise<string[]> => {
    const results = await Promise.all(PROFILE_REFERENCES.map(async (reference) => {
      const { count, error } = await adminClient.from(reference.table)
        .select('id', { count: 'exact', head: true })
        .eq(reference.column, userId);
      if (error) {
        console.error('profile reference check failed', {
          table: reference.table,
          column: reference.column,
          code: error.code,
        });
        return null;
      }
      return (count ?? 0) > 0 ? reference.label : null;
    }));
    return [...new Set(results.filter((label): label is string => Boolean(label)))];
  };

  const hasHistoryError = (blockers: string[]) => json({
    code: 'account_has_history',
    error: `This account is linked to ${blockers.join(', ')}. Disable it instead so those records stay available.`,
    blockers,
  }, 409);

  const permissionsUnavailable = () => json({
    code: 'permissions_unavailable',
    error: 'Permission overrides are unavailable. Apply the profile-permissions migration and redeploy this function.',
  }, 503);

  const rolesUnavailable = () => json({
    code: 'roles_unavailable',
    error: 'Role assignments are unavailable. Apply the profile-roles migration and redeploy this function.',
  }, 503);

  const missingRelation = (error: { code?: string } | null | undefined) =>
    error?.code === '42P01' || error?.code === 'PGRST205';

  /**
   * Validates a role set against the catalogue. The account's primary role
   * (profiles.role) must always be present because the database RLS policies
   * read that single role; additional roles only widen the app.
   */
  const parseRoleAssignments = (value: unknown, primary: string, known: readonly string[]) => {
    if (!Array.isArray(value) || !value.length) {
      return { error: json({ code: 'invalid_roles', error: 'At least one role is required.' }, 400) };
    }
    const roles = value.map((role) => (typeof role === 'string' ? role : ''));
    if (roles.some((role) => !known.includes(role))) {
      return { error: json({ code: 'invalid_roles', error: 'Check the role selection and try again.' }, 400) };
    }
    if (new Set(roles).size !== roles.length) {
      return { error: json({ code: 'invalid_roles', error: 'Each role can be assigned only once.' }, 400) };
    }
    if (!roles.includes(primary)) {
      return { error: json({ code: 'invalid_roles', error: 'The primary role must stay assigned.' }, 400) };
    }
    return { roles };
  };

  /**
   * Validates the override list before anything is written. The catalogue is
   * read from the database so a client cannot invent a permission key.
   */
  const parsePermissionOverrides = async (value: unknown) => {
    if (!Array.isArray(value)) {
      return { error: json({ code: 'invalid_permissions', error: 'A list of permission overrides is required.' }, 400) };
    }
    const { data, error } = await adminClient.from('permissions').select('key');
    if (error) {
      console.error('permission catalogue lookup failed', { code: error.code });
      return { error: permissionsUnavailable() };
    }
    const known = new Set((data ?? []).map((row: { key: string }) => row.key));
    const overrides: PermissionOverride[] = [];
    for (const item of value) {
      const permissionKey = item && typeof item === 'object' ? String((item as Record<string, unknown>).permissionKey ?? '') : '';
      const effect = item && typeof item === 'object' ? String((item as Record<string, unknown>).effect ?? '') : '';
      if (!known.has(permissionKey) || !PERMISSION_EFFECTS.includes(effect as PermissionEffect)) {
        return { error: json({ code: 'invalid_permissions', error: 'Check the permission selection and try again.' }, 400) };
      }
      overrides.push({ permissionKey, effect: effect as PermissionEffect });
    }
    if (new Set(overrides.map((override) => override.permissionKey)).size !== overrides.length) {
      return { error: json({ code: 'invalid_permissions', error: 'Each permission can be overridden only once.' }, 400) };
    }
    return { overrides };
  };

  const parseInvitation = (body: Record<string, unknown>, allowedRoles: readonly string[]) => {
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.fullName ?? '').trim();
    const role = String(body.role ?? '');
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2 || !allowedRoles.includes(role)) {
      return { error: json({ code: 'invalid_invitation', error: 'Valid name, email, and role are required.' }, 400) };
    }
    if (fullName.length > 150 || email.length > 254 || phone.length > 30) {
      return { error: json({ code: 'invalid_invitation', error: 'Check the name, email and phone number.' }, 400) };
    }
    return { email, fullName, role, phone };
  };

  /**
   * Maps a Supabase Auth delivery failure to a safe, actionable code. The raw
   * provider status/message is kept in the function logs only, because the
   * existing 502 was opaque: it hid whether SMTP, the address or a duplicate
   * account was the cause.
   */
  const mapProviderError = (error: { code?: string; status?: number; message?: string } | null) => {
    const providerCode = error?.code ?? '';
    const message = (error?.message ?? '').toLowerCase();
    console.error('invitation provider error', { providerCode, status: error?.status, message });
    if (providerCode === 'email_address_not_authorized' || message.includes('not authorized')) {
      return { status: 503, code: 'invite_smtp_required', error: 'Invitation emails require custom SMTP. Configure Supabase Authentication SMTP; the default mail service only sends to project team members.' };
    }
    if (providerCode === 'email_address_invalid' || message.includes('invalid email')) {
      return { status: 400, code: 'invite_email_invalid', error: 'This email address is not accepted by the email provider. Check the address and use a real mailbox.' };
    }
    if (['email_exists', 'user_already_exists'].includes(providerCode) || message.includes('already been registered') || message.includes('already exists')) {
      return { status: 409, code: 'account_exists', error: 'An account already exists for this email. Manage it in Users or use Forgot password.' };
    }
    if (error?.status === 429 || providerCode.includes('rate_limit') || message.includes('rate limit')) {
      return { status: 429, code: 'invite_rate_limited', error: 'Too many invitation emails. Please wait before trying again.' };
    }
    if (message.includes('redirect') || message.includes('url')) {
      return { status: 503, code: 'invite_not_configured', error: 'Invitation email links are not configured. Contact the academy administrator.' };
    }
    return { status: 502, code: 'invite_delivery_failed', error: 'The invitation could not be sent. Check the academy email delivery configuration before retrying.' };
  };

  /**
   * A direct create has no email delivery, so SMTP errors are not relevant. The
   * only expected failures are a duplicate address, a rejected password or a
   * provider outage; the raw message stays in the function log.
   */
  const mapCreateError = (error: { code?: string; status?: number; message?: string } | null) => {
    const providerCode = error?.code ?? '';
    const message = (error?.message ?? '').toLowerCase();
    console.error('account create provider error', { providerCode, status: error?.status });
    if (['email_exists', 'user_already_exists'].includes(providerCode) || message.includes('already been registered') || message.includes('already exists')) {
      return { status: 409, code: 'account_exists', error: 'An account already exists for this email. Manage it in Users or use Forgot password.' };
    }
    if (providerCode === 'email_address_invalid' || message.includes('invalid email')) {
      return { status: 400, code: 'invite_email_invalid', error: 'This email address is not accepted by the email provider. Check the address and use a real mailbox.' };
    }
    if (error?.status === 429 || providerCode.includes('rate_limit') || message.includes('rate limit')) {
      return { status: 429, code: 'invite_rate_limited', error: 'Too many account requests. Please wait before trying again.' };
    }
    if (message.includes('password')) {
      return { status: 400, code: 'temporary_password_rejected', error: 'The temporary password was rejected by the sign-in provider. Try creating the account again.' };
    }
    return { status: 502, code: 'create_failed', error: 'The account could not be created. Retry, or send an invitation instead.' };
  };

  try {
    const body = await request.json() as Record<string, unknown>;

    if (body.action === 'list') {
      await expireStaleInvitations();
      const page = Number.isInteger(body.page) && (body.page as number) > 0 ? body.page as number : 1;
      const pageSize = [5, 10, 20, 50, 100].includes(body.pageSize as number) ? body.pageSize as number : 5;
      const search = typeof body.search === 'string' ? body.search.trim().replace(/[%_,()\\"]/g, ' ') : '';
      const filters = body.filters && typeof body.filters === 'object' ? body.filters as Record<string, unknown> : {};
      const filterText = (value: unknown) => typeof value === 'string' ? value.trim().replace(/[%_,()\\"]/g, ' ').slice(0, 100) : '';
      const sortColumns: Record<string, string> = {
        name: 'full_name',
        email: 'email',
        role: 'role',
        status: 'status',
        createdAt: 'created_at',
      };
      const sortColumn = typeof body.sortBy === 'string' && Object.hasOwn(sortColumns, body.sortBy)
        ? sortColumns[body.sortBy]
        : 'created_at';
      let query = adminClient
        .from('profiles')
        .select('id,full_name,email,phone,role,status,created_at,updated_at,onboarding_completed_at,last_sign_in_at', { count: 'exact' });
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      if (roleKeys.includes(String(body.role ?? ''))) query = query.eq('role', body.role);
      if (statuses.includes(body.status as typeof statuses[number])) query = query.eq('status', body.status);
      const nameFilter = filterText(filters.name);
      const contactFilter = filterText(filters.contact);
      const roleFilter = filterText(filters.role);
      const statusFilter = filterText(filters.status);
      const invitationFilter = filterText(filters.invitation);
      const joinedFilter = typeof filters.joined === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.joined)
        ? filters.joined
        : '';
      if (nameFilter) query = query.ilike('full_name', `%${nameFilter}%`);
      if (contactFilter) query = query.or(`email.ilike.%${contactFilter}%,phone.ilike.%${contactFilter}%`);
      if (roleFilter) query = query.in('role', roleKeys.filter(role => role.includes(roleFilter.toLowerCase())));
      if (statusFilter) query = query.ilike('status', `%${statusFilter}%`);
      if (joinedFilter) {
        const start = new Date(`${joinedFilter}T00:00:00.000Z`);
        if (!Number.isNaN(start.getTime()) && start.toISOString().slice(0, 10) === joinedFilter) {
          const end = new Date(start);
          end.setUTCDate(end.getUTCDate() + 1);
          query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
        }
      }
      const ascending = body.sortDirection === 'asc';
      const { data, error, count } = await query
        .order(sortColumn, { ascending })
        .order('id', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;

      const emails = (data ?? []).map((profile: { email: string | null }) => profile.email).filter((email: string | null): email is string => Boolean(email));
      let invitations: { id: string; email: string; role: string; status: string; invited_at: string; expires_at: string }[] = [];
      if (emails.length) {
        const { data: rows, error: invitationError } = await adminClient
          .from('user_invitations')
          .select('id,email,role,status,invited_at,expires_at')
          .in('email', emails)
          .order('invited_at', { ascending: false });
        if (invitationError) console.error('invitation lookup failed', { code: invitationError.code });
        else invitations = rows ?? [];
      }
      const latestByEmail = new Map<string, typeof invitations[number]>();
      for (const invitation of invitations) {
        const key = invitation.email.toLowerCase();
        if (!latestByEmail.has(key)) latestByEmail.set(key, invitation);
      }
      // Role assignments are an app-level addition; a database without the
      // profile-roles migration still lists each account with its primary role.
      const profileIds = (data ?? []).map((profile: { id: string }) => profile.id);
      const rolesByProfile = new Map<string, string[]>();
      if (profileIds.length) {
        const { data: roleRows, error: roleError } = await adminClient
          .from('profile_roles')
          .select('profile_id,role_key')
          .in('profile_id', profileIds)
          .order('role_key');
        if (roleError) console.error('profile role lookup failed', { code: roleError.code });
        else {
          for (const row of roleRows ?? []) {
            const list = rolesByProfile.get(row.profile_id) ?? [];
            list.push(row.role_key);
            rolesByProfile.set(row.profile_id, list);
          }
        }
      }
      const users = (data ?? []).map((profile: Record<string, unknown>) => {
        const invitation = profile.email ? latestByEmail.get(String(profile.email).toLowerCase()) ?? null : null;
        const assigned = rolesByProfile.get(String(profile.id)) ?? [];
        const primary = String(profile.role);
        return {
          ...profile,
          roles: assigned.length && assigned.includes(primary) ? assigned : [primary],
          invitation,
          pending_activation: Boolean(invitation && invitation.status !== 'accepted'),
        };
      }).filter((profile: { invitation: { status: string } | null }) =>
        !invitationFilter || (profile.invitation?.status ?? '').includes(invitationFilter.toLowerCase()));
      return json({ users, total: count ?? 0, page, pageSize });
    }

    if (body.action === 'invite') {
      const parsed = parseInvitation(body, roleKeys);
      if ('error' in parsed) return parsed.error;
      const { email, fullName, role, phone } = parsed;
      const redirectTo = invitationRedirect();
      if (!redirectTo) return json({ code: 'invite_not_configured', error: 'Invitation email links are not configured. Contact the academy administrator.' }, 503);

      const { data: existingProfile, error: lookupError } = await adminClient
        .from('profiles').select('id').eq('email', email).maybeSingle();
      if (lookupError) throw lookupError;
      if (existingProfile) return json({ code: 'account_exists', error: 'An account already exists for this email. Manage it in Users or use Forgot password.' }, 409);

      await expireStaleInvitations();
      const { data: live } = await adminClient
        .from('user_invitations').select('id,status,attempt_count')
        .eq('email', email).in('status', ['pending', 'failed']).maybeSingle();
      if (live?.status === 'pending') {
        return json({ code: 'invitation_pending', error: 'An invitation is already pending for this email. Use Resend invitation if it did not arrive.' }, 409);
      }

      const now = Date.now();
      const invitationValues = {
        email,
        full_name: fullName,
        phone: phone || null,
        role,
        invited_by: user.id,
        status: 'pending',
        invited_at: new Date(now).toISOString(),
        expires_at: new Date(now + INVITE_TTL_MS).toISOString(),
        last_error_code: null,
      };
      let invitationId = live?.id ?? '';
      if (invitationId) {
        const { data: retried, error: retryError } = await adminClient.from('user_invitations')
          .update({ ...invitationValues, attempt_count: (live?.attempt_count ?? 0) + 1 })
          .eq('id', invitationId).select('id').single();
        if (retryError) throw retryError;
        invitationId = retried?.id ?? invitationId;
      } else {
        const { data: created, error: insertError } = await adminClient.from('user_invitations')
          .insert({ ...invitationValues, attempt_count: 1 }).select('id').single();
        if (insertError) throw insertError;
        invitationId = created?.id ?? '';
      }

      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: fullName, role, role_label: roleLabel.get(role) ?? role },
      });
      if (error || !data?.user) {
        const failure = mapProviderError(error);
        await adminClient.from('user_invitations')
          .update({ status: 'failed', last_error_code: failure.code })
          .eq('id', invitationId);
        return json({ code: failure.code, error: failure.error }, failure.status);
      }

      const { data: profile, error: profileError } = await adminClient.from('profiles')
        .update({
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          status: 'active',
          is_active: true,
          onboarding_completed_at: null,
        })
        .eq('id', data.user.id).select('id,role,status,is_active').single();
      if (profileError || !profile || profile.role !== role || profile.status !== 'active' || !profile.is_active) {
        // The email left the provider but access is unconfirmed: keep the
        // invitation live so an admin can resend instead of creating a duplicate.
        await adminClient.from('user_invitations')
          .update({ status: 'failed', last_error_code: 'invite_profile_failed', auth_user_id: data.user.id })
          .eq('id', invitationId);
        return json({ code: 'invite_profile_failed', error: 'The invitation was sent, but account access could not be confirmed. Review this user in Users before sending another invitation.' }, 502);
      }

      await adminClient.from('user_invitations').update({ auth_user_id: data.user.id }).eq('id', invitationId);
      await audit('invitation_sent', invitationId, { email, role, status: 'pending' });
      return json({
        userId: data.user.id,
        invitationId,
        role,
        expiresAt: invitationValues.expires_at,
        message: 'Invitation sent.',
      }, 201);
    }

    if (body.action === 'create') {
      const parsed = parseInvitation(body, roleKeys);
      if ('error' in parsed) return parsed.error;
      const { email, fullName, role, phone } = parsed;

      const { data: existingProfile, error: lookupError } = await adminClient
        .from('profiles').select('id').eq('email', email).maybeSingle();
      if (lookupError) throw lookupError;
      if (existingProfile) return json({ code: 'account_exists', error: 'An account already exists for this email. Manage it in Users or use Forgot password.' }, 409);

      // The password is generated here and returned once. It is never accepted
      // from the caller, emailed or written to the audit log.
      const password = temporaryPassword();
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
          role_label: roleLabel.get(role) ?? role,
          must_change_password: true,
        },
      });
      if (createError || !created?.user) {
        const failure = mapCreateError(createError);
        return json({ code: failure.code, error: failure.error }, failure.status);
      }

      const { data: profile, error: profileError } = await adminClient.from('profiles')
        .update({
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          status: 'active',
          is_active: true,
          onboarding_completed_at: null,
        })
        .eq('id', created.user.id).select('id,role,status,is_active').single();
      if (profileError || !profile || profile.role !== role || profile.status !== 'active' || !profile.is_active) {
        // Never leave a half-created login: the person could sign in to a
        // profile that does not have the requested role.
        const { error: rollbackError } = await adminClient.auth.admin.deleteUser(created.user.id);
        if (rollbackError) console.error('account create rollback failed', { code: rollbackError.code });
        return json({ code: 'create_profile_failed', error: 'The account could not be prepared. No account was created; please retry.' }, 502);
      }

      await audit('user_created', created.user.id, {
        email,
        full_name: fullName,
        role,
        status: 'active',
        must_change_password: true,
      });
      return json({
        userId: created.user.id,
        email,
        role,
        temporaryPassword: password,
        message: 'User created. Share the temporary password privately.',
      }, 201);
    }

    if (body.action === 'link') {
      const parsed = parseInvitation(body, roleKeys);
      if ('error' in parsed) return parsed.error;
      const { email, fullName, role, phone } = parsed;
      const redirectTo = invitationRedirect();
      if (!redirectTo) return json({ code: 'invite_not_configured', error: 'Invitation email links are not configured. Contact the academy administrator.' }, 503);

      // A link may only target a brand-new account or an invited account whose
      // email has not been confirmed yet. Generating one for a confirmed account
      // would let an administrator take over an existing login.
      const { data: existingProfile, error: lookupError } = await adminClient
        .from('profiles').select('id').eq('email', email).maybeSingle();
      if (lookupError) throw lookupError;
      let pendingAuthUserId = '';
      if (existingProfile) {
        const { data: existingUser, error: authError } = await adminClient.auth.admin.getUserById(existingProfile.id);
        if (authError || !existingUser?.user) {
          console.error('invitation link user lookup failed', { code: authError?.code });
          return json({ code: 'invite_link_failed', error: 'The account for this email could not be read. Try again or use Forgot password.' }, 502);
        }
        if (existingUser.user.email_confirmed_at) {
          return json({ code: 'account_exists', error: 'An account already exists for this email. Manage it in Users or use Forgot password.' }, 409);
        }
        pendingAuthUserId = existingProfile.id;
      }

      await expireStaleInvitations();
      const { data: live } = await adminClient
        .from('user_invitations').select('id,attempt_count')
        .eq('email', email).in('status', ['pending', 'failed']).maybeSingle();

      const now = Date.now();
      const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
      const invitationValues = {
        email,
        full_name: fullName,
        phone: phone || null,
        role,
        invited_by: user.id,
        status: 'pending',
        invited_at: new Date(now).toISOString(),
        expires_at: expiresAt,
        last_error_code: null,
      };
      let invitationId = live?.id ?? '';
      if (invitationId) {
        const { data: retried, error: retryError } = await adminClient.from('user_invitations')
          .update({ ...invitationValues, attempt_count: (live?.attempt_count ?? 0) + 1 })
          .eq('id', invitationId).select('id').single();
        if (retryError) throw retryError;
        invitationId = retried?.id ?? invitationId;
      } else {
        const { data: created, error: insertError } = await adminClient.from('user_invitations')
          .insert({ ...invitationValues, attempt_count: 1 }).select('id').single();
        if (insertError) throw insertError;
        invitationId = created?.id ?? '';
      }

      // No email is sent here. The link is returned to the signed-in admin so it
      // can be shared through another channel when project SMTP cannot deliver.
      const generated = pendingAuthUserId
        ? await adminClient.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })
        : await adminClient.auth.admin.generateLink({
          type: 'invite',
          email,
          options: {
            redirectTo,
            data: { full_name: fullName, role, role_label: roleLabel.get(role) ?? role },
          },
        });
      if (generated.error || !generated.data?.user || !generated.data.properties?.action_link) {
        const failure = mapProviderError(generated.error);
        await adminClient.from('user_invitations')
          .update({ status: 'failed', last_error_code: failure.code })
          .eq('id', invitationId);
        return json({ code: failure.code, error: failure.error }, failure.status);
      }

      const authUserId = generated.data.user.id;
      const { data: profile, error: profileError } = await adminClient.from('profiles')
        .update({
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          status: 'active',
          is_active: true,
          onboarding_completed_at: null,
        })
        .eq('id', authUserId).select('id,role,status,is_active').single();
      if (profileError || !profile || profile.role !== role || profile.status !== 'active' || !profile.is_active) {
        await adminClient.from('user_invitations')
          .update({ status: 'failed', last_error_code: 'invite_profile_failed', auth_user_id: authUserId })
          .eq('id', invitationId);
        return json({ code: 'invite_profile_failed', error: 'The link was created, but account access could not be confirmed. Review this user in Users before sharing another link.' }, 502);
      }

      await adminClient.from('user_invitations').update({ auth_user_id: authUserId }).eq('id', invitationId);
      // The link itself is a credential. It is returned to the admin but never
      // written to the audit log.
      await audit('invitation_link_generated', invitationId, { email, role, status: 'pending' });
      return json({
        invitationId,
        userId: authUserId,
        actionLink: generated.data.properties.action_link,
        expiresAt,
        message: 'Invitation link created.',
      }, 201);
    }

    if (body.action === 'resend') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ code: 'invalid_invitation', error: 'A valid email is required.' }, 400);
      const redirectTo = invitationRedirect();
      if (!redirectTo) return json({ code: 'invite_not_configured', error: 'Invitation email links are not configured. Contact the academy administrator.' }, 503);

      const { data: invitation } = await adminClient.from('user_invitations')
        .select('id,status,auth_user_id,attempt_count,expires_at')
        .eq('email', email).order('invited_at', { ascending: false }).limit(1).maybeSingle();
      if (!invitation) return json({ code: 'invitation_not_found', error: 'No invitation exists for this email. Send a new invitation instead.' }, 404);
      if (invitation.status === 'accepted') return json({ code: 'already_accepted', error: 'This account is already activated. Use Forgot password if the user needs a new password.' }, 409);
      if (invitation.status === 'revoked') return json({ code: 'invitation_revoked', error: 'This invitation was revoked. Send a new invitation instead.' }, 409);

      const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
      const markFailed = async (code: string) => {
        await adminClient.from('user_invitations').update({ status: 'failed', last_error_code: code }).eq('id', invitation.id);
      };

      if (!invitation.auth_user_id) {
        // The earlier attempt never created an Auth user: send a fresh invite.
        const parsed = parseInvitation({ ...body, email }, roleKeys);
        if ('error' in parsed) return parsed.error;
        const { data: created, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name: parsed.fullName, role: parsed.role, role_label: roleLabel.get(parsed.role) ?? parsed.role },
        });
        if (error || !created?.user) {
          const failure = mapProviderError(error);
          await markFailed(failure.code);
          return json({ code: failure.code, error: failure.error }, failure.status);
        }
        await adminClient.from('profiles').update({
          full_name: parsed.fullName, role: parsed.role, status: 'active', is_active: true, onboarding_completed_at: null,
        }).eq('id', created.user.id);
        await adminClient.from('user_invitations').update({
          status: 'pending', invited_at: new Date().toISOString(), expires_at: expiresAt,
          auth_user_id: created.user.id, attempt_count: invitation.attempt_count + 1, last_error_code: null,
        }).eq('id', invitation.id);
        await audit('invitation_resent', invitation.id, { email, status: 'pending' });
        return json({ invitationId: invitation.id, expiresAt, message: 'Invitation resent.' });
      }

      // An unconfirmed Auth user already exists: resend the confirmation email
      // through Supabase Auth so delivery still goes through the configured SMTP.
      const { error } = await adminClient.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        const failure = mapProviderError(error);
        await markFailed(failure.code);
        return json({ code: failure.code, error: failure.error }, failure.status);
      }
      await adminClient.from('user_invitations').update({
        status: 'pending', invited_at: new Date().toISOString(), expires_at: expiresAt,
        attempt_count: invitation.attempt_count + 1, last_error_code: null,
      }).eq('id', invitation.id);
      await audit('invitation_resent', invitation.id, { email, status: 'pending' });
      return json({ invitationId: invitation.id, expiresAt, message: 'Invitation resent.' });
    }

    if (body.action === 'revoke') {
      const invitationId = String(body.invitationId ?? '');
      if (!invitationId) return json({ error: 'An invitation is required.' }, 400);
      const { data: invitation } = await adminClient.from('user_invitations')
        .select('id,email,status').eq('id', invitationId).maybeSingle();
      if (!invitation) return json({ code: 'invitation_not_found', error: 'That invitation no longer exists.' }, 404);
      if (invitation.status === 'accepted') return json({ code: 'already_accepted', error: 'An accepted invitation cannot be revoked. Suspend the account instead.' }, 409);
      await adminClient.from('user_invitations').update({ status: 'revoked', last_error_code: null }).eq('id', invitationId);
      await audit('invitation_revoked', invitationId, { email: invitation.email, status: 'revoked' });
      return json({ message: 'Invitation revoked.' });
    }

    if (body.action === 'permissions') {
      const userId = String(body.userId ?? '');
      if (!userId) return json({ error: 'A user is required.' }, 400);

      const { data: target, error: targetError } = await adminClient.from('profiles')
        .select('id,role').eq('id', userId).maybeSingle();
      if (targetError) throw targetError;
      if (!target) return json({ code: 'user_not_found', error: 'That account no longer exists. Reload the list.' }, 404);

      const { data: rows, error } = await adminClient.from('profile_permissions')
        .select('permission_key,effect,reason,created_at')
        .eq('profile_id', userId)
        .order('permission_key');
      if (error) {
        console.error('profile permission lookup failed', { code: error.code });
        return permissionsUnavailable();
      }
      return json({
        userId,
        role: target.role,
        overrides: (rows ?? []).map((row: Record<string, unknown>) => ({
          permissionKey: row.permission_key,
          effect: row.effect,
          reason: row.reason,
        })),
      });
    }

    if (body.action === 'set_permissions') {
      const userId = String(body.userId ?? '');
      const reason = String(body.reason ?? '').trim();
      if (!userId) return json({ error: 'A user is required.' }, 400);
      if (reason.length < 3 || reason.length > 500) {
        return json({ code: 'reason_required', error: 'Add a short reason (at least 3 characters) for this permission change.' }, 400);
      }

      const parsed = await parsePermissionOverrides(body.overrides);
      if ('error' in parsed) return parsed.error;
      const overrides = parsed.overrides;

      const { data: target, error: targetError } = await adminClient.from('profiles')
        .select('id,role,status,is_active').eq('id', userId).maybeSingle();
      if (targetError) throw targetError;
      if (!target) return json({ code: 'user_not_found', error: 'That account no longer exists. Reload the list.' }, 404);

      const revokesSettings = overrides.some(
        (override) => override.permissionKey === 'settings:write' && override.effect === 'revoke',
      );
      if (revokesSettings) {
        if (userId === user.id) {
          return json({ code: 'self_lockout', error: 'You cannot remove your own settings access. Ask another administrator.' }, 409);
        }
        // An active administrator who loses settings access cannot manage
        // users any more. Refuse the change if no other active administrator
        // still has settings access.
        if (target.role === 'admin' && target.status === 'active' && target.is_active) {
          const { data: otherAdmins, error: adminsError } = await adminClient.from('profiles')
            .select('id').eq('role', 'admin').eq('status', 'active').eq('is_active', true).neq('id', userId);
          if (adminsError) throw adminsError;
          const otherIds = (otherAdmins ?? []).map((row: { id: string }) => row.id);
          if (!otherIds.length) {
            return json({ code: 'last_admin', error: 'At least one active administrator must keep settings access.' }, 409);
          }
          const { data: revoked, error: revokedError } = await adminClient.from('profile_permissions')
            .select('profile_id')
            .in('profile_id', otherIds)
            .eq('permission_key', 'settings:write')
            .eq('effect', 'revoke');
          if (revokedError) {
            console.error('settings override lookup failed', { code: revokedError.code });
            return permissionsUnavailable();
          }
          const blocked = new Set((revoked ?? []).map((row: { profile_id: string }) => row.profile_id));
          if (otherIds.every((id) => blocked.has(id))) {
            return json({ code: 'last_admin', error: 'At least one active administrator must keep settings access.' }, 409);
          }
        }
      }

      const { data: existing, error: existingError } = await adminClient.from('profile_permissions')
        .select('permission_key,effect').eq('profile_id', userId);
      if (existingError) {
        console.error('profile permission lookup failed', { code: existingError.code });
        return permissionsUnavailable();
      }

      const { error: replaceError } = await adminClient.rpc('replace_profile_permissions', {
        target_profile: userId,
        entries: overrides,
        change_reason: reason,
        actor_profile: user.id,
      });
      if (replaceError) {
        console.error('profile permission replacement failed', { code: replaceError.code });
        if (replaceError.code === 'P0002') {
          return json({ code: 'user_not_found', error: 'That account no longer exists. Reload the list.' }, 404);
        }
        if (replaceError.code === '22023') {
          return json({ code: 'invalid_permissions', error: 'Check the permission selection and try again.' }, 400);
        }
        return json({ code: 'permission_update_failed', error: 'The permission overrides could not be saved. Apply the migration and retry.' }, 502);
      }

      await audit('user_permissions_changed', userId, {
        reason,
        before: (existing ?? []).map((row: Record<string, unknown>) => ({
          permissionKey: row.permission_key,
          effect: row.effect,
        })),
        after: overrides,
      });
      return json({ message: 'Permission overrides saved.', overrides });
    }

    if (body.action === 'delete') {
      const userId = String(body.userId ?? '');
      const reason = String(body.reason ?? '').trim();
      if (!userId) return json({ error: 'A user is required.' }, 400);
      if (reason.length < 3 || reason.length > 500) {
        return json({ code: 'reason_required', error: 'Add a short reason (at least 3 characters) for this deletion.' }, 400);
      }
      if (userId === user.id) {
        return json({ code: 'self_delete', error: 'You cannot delete your own account. Ask another administrator.' }, 409);
      }

      const { data: target, error: targetError } = await adminClient.from('profiles')
        .select('id,full_name,email,role,status,is_active').eq('id', userId).maybeSingle();
      if (targetError) throw targetError;
      if (!target) return json({ code: 'user_not_found', error: 'That account no longer exists. Reload the list.' }, 404);

      if (target.role === 'admin' && target.status === 'active' && target.is_active) {
        const { count } = await adminClient.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin').eq('status', 'active').eq('is_active', true);
        if ((count ?? 0) <= 1) return json({ code: 'last_admin', error: 'At least one active administrator must remain.' }, 409);
      }

      // Deleting the Auth user cascades to profiles, so linked history would be
      // erased. Refuse a delete while any of those references exist.
      const blockers = await profileBlockers(userId);
      if (blockers.length) return hasHistoryError(blockers);

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        // Re-check in case a reference was added after this list was written.
        const remaining = await profileBlockers(userId);
        if (remaining.length) return hasHistoryError(remaining);
        console.error('account deletion failed', { userId, code: deleteError.code, status: deleteError.status });
        if (deleteError.status === 404 || deleteError.code === 'user_not_found') {
          return json({ code: 'user_not_found', error: 'That account no longer exists. Reload the list.' }, 404);
        }
        return json({ code: 'delete_failed', error: 'The account could not be deleted. Retry, or disable it instead.' }, 502);
      }

      // The profile is gone, so keep the deletion evidence here. No erased
      // personal values are added beyond the identity needed to explain the row.
      await audit('user_deleted', userId, {
        reason,
        before: {
          full_name: target.full_name,
          email: target.email,
          role: target.role,
          status: target.status,
          is_active: target.is_active,
        },
      });
      return json({ message: 'User deleted.' });
    }

    if (body.action === 'set_roles') {
      const userId = String(body.userId ?? '');
      const reason = String(body.reason ?? '').trim();
      if (!userId) return json({ error: 'A user is required.' }, 400);
      if (reason.length < 3 || reason.length > 500) {
        return json({ code: 'reason_required', error: 'Add a short reason (at least 3 characters) for this role change.' }, 400);
      }

      const { data: target, error: targetError } = await adminClient.from('profiles')
        .select('id,role').eq('id', userId).maybeSingle();
      if (targetError) throw targetError;
      if (!target) return json({ code: 'user_not_found', error: 'That account no longer exists. Reload the list.' }, 404);

      const parsed = parseRoleAssignments(body.roles, target.role, roleKeys);
      if ('error' in parsed) return parsed.error;
      const roles = parsed.roles;

      const { data: existing, error: existingError } = await adminClient.from('profile_roles')
        .select('role_key').eq('profile_id', userId).order('role_key');
      if (existingError) {
        console.error('profile role lookup failed', { code: existingError.code });
        return rolesUnavailable();
      }

      const { error: replaceError } = await adminClient.rpc('replace_profile_roles', {
        target_profile: userId,
        role_keys: roles,
        change_reason: reason,
        actor_profile: user.id,
      });
      if (replaceError) {
        console.error('profile role replacement failed', { code: replaceError.code });
        if (missingRelation(replaceError)) return rolesUnavailable();
        if (replaceError.code === 'P0002') {
          return json({ code: 'user_not_found', error: 'That account no longer exists. Reload the list.' }, 404);
        }
        if (replaceError.code === '22023') {
          return json({ code: 'invalid_roles', error: 'Check the role selection and try again.' }, 400);
        }
        return json({ code: 'role_update_failed', error: 'The role assignments could not be saved. Retry, or contact the academy administrator.' }, 502);
      }

      await audit('user_roles_changed', userId, {
        reason,
        before: (existing ?? []).map((row: Record<string, unknown>) => row.role_key),
        after: roles,
      });
      return json({ message: 'Role assignments saved.', roles });
    }

    if (body.action === 'update') {
      const userId = String(body.userId ?? '');
      const role = String(body.role ?? '');
      const status = String(body.status ?? '');
      const reason = String(body.reason ?? '').trim();
      if (!userId || !roleKeys.includes(role) || !statuses.includes(status as typeof statuses[number])) return json({ error: 'Valid user, role, and status are required.' }, 400);
      if (reason.length < 3 || reason.length > 500) {
        return json({ code: 'reason_required', error: 'Add a short reason (at least 3 characters) for this access change.' }, 400);
      }
      if (userId === user.id && (role !== 'admin' || status !== 'active')) return json({ error: 'You cannot remove your own active administrator access.' }, 409);

      const { data: target } = await adminClient.from('profiles').select('role,status,is_active').eq('id', userId).single();
      const targetIsActiveAdmin = target?.role === 'admin' && target?.status === 'active' && target?.is_active;
      const nextIsActiveAdmin = role === 'admin' && status === 'active';
      const losesAdmin = targetIsActiveAdmin && !nextIsActiveAdmin;
      if (losesAdmin) {
        const { count } = await adminClient.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin').eq('status', 'active').eq('is_active', true);
        if ((count ?? 0) <= 1) return json({ code: 'last_admin', error: 'At least one active administrator must remain.' }, 409);
      }

      const { error } = await adminClient.from('profiles').update({ role, status, is_active: status === 'active' }).eq('id', userId);
      if (error) {
        // The DB guard is the final line of defence for direct/service-role writes.
        if (error.hint === 'last_admin') return json({ code: 'last_admin', error: 'At least one active administrator must remain.' }, 409);
        if (error.hint === 'self_admin_removal') return json({ error: 'You cannot remove your own active administrator access.' }, 409);
        throw error;
      }
      // The trigger keeps the new primary role in profile_roles. Remove the old
      // primary so a role change does not silently leave it as an extra role.
      if (target?.role && target.role !== role) {
        const { error: staleRoleError } = await adminClient.from('profile_roles')
          .delete().eq('profile_id', userId).eq('role_key', target.role);
        if (staleRoleError && !missingRelation(staleRoleError)) {
          console.error('old primary role cleanup failed', { code: staleRoleError.code });
        }
      }
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: status === 'active' ? 'none' : '876000h' });
      if (authError) {
        console.error('auth ban update failed after profile update', { userId, code: authError.code });
        return json({ code: 'access_partial', error: 'The profile was updated but the sign-in restriction could not be applied. Retry this change.' }, 502);
      }
      await audit('user_access_updated', userId, {
        reason,
        before: { role: target?.role ?? null, status: target?.status ?? null, is_active: target?.is_active ?? null },
        after: { role, status, is_active: status === 'active' },
      });
      return json({ message: 'User access updated.' });
    }

    if (body.action === 'audit') {
      const page = Number.isInteger(body.page) && (body.page as number) > 0 ? body.page as number : 1;
      const pageSize = [5, 10, 20, 50, 100].includes(body.pageSize as number) ? body.pageSize as number : 5;
      const { data, error, count } = await adminClient
        .from('audit_logs')
        .select('id,action,table_name,record_id,occurred_at,actor_id,old_values,new_values', { count: 'exact' })
        .in('table_name', ['profiles', 'user_invitations'])
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      const rows = data ?? [];
      const profileIds = [...new Set(
        rows.flatMap((row: Record<string, unknown>) => {
          const ids: string[] = [];
          if (typeof row.actor_id === 'string') ids.push(row.actor_id);
          if (row.table_name === 'profiles' && typeof row.record_id === 'string') ids.push(row.record_id);
          return ids;
        }),
      )];
      let profileNames = new Map<string, string>();
      if (profileIds.length) {
        const { data: profiles, error: profileError } = await adminClient
          .from('profiles')
          .select('id,full_name')
          .in('id', profileIds);
        if (profileError) console.error('audit profile lookup failed', { code: profileError.code });
        profileNames = new Map((profiles ?? []).map((profile: { id: string; full_name: string }) => [profile.id, profile.full_name]));
      }
      const enriched = rows.map((row: Record<string, unknown>) => {
        const values = (row.new_values ?? {}) as Record<string, unknown>;
        const before = (values.before ?? {}) as Record<string, unknown>;
        // A deleted profile cannot be looked up, so the audit row keeps the name
        // recorded at deletion time instead of exposing a bare UUID.
        const deletedName = typeof before.full_name === 'string'
          ? before.full_name
          : typeof before.email === 'string' ? before.email : row.record_id;
        return {
          ...row,
          actor_name: typeof row.actor_id === 'string' ? profileNames.get(row.actor_id) ?? 'Unknown account' : 'System',
          target_name: row.table_name === 'profiles' && typeof row.record_id === 'string'
            ? profileNames.get(row.record_id) ?? deletedName
            : typeof values.email === 'string' ? values.email : row.record_id,
        };
      });
      return json({ rows: enriched, total: count ?? 0, page, pageSize });
    }

    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    // Internal detail stays in the function log; the client gets a safe message.
    console.error('admin-manage-users failed', { message: error instanceof Error ? error.message : String(error) });
    return json({ code: 'operation_failed', error: 'The account operation could not be completed. Please try again.' }, 500);
  }
});
