import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const roles = ['admin', 'coach', 'receptionist', 'parent'] as const;
const statuses = ['active', 'inactive', 'suspended'] as const;
const roleLabels: Record<string, string> = { admin: 'Administrator', receptionist: 'Receptionist', coach: 'Coach', parent: 'Parent' };
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALLOWED_REDIRECT_PATHS = ['/auth/reset-password', '/auth/set-password'];

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

  const parseInvitation = (body: Record<string, unknown>) => {
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.fullName ?? '').trim();
    const role = String(body.role ?? '');
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2 || !roles.includes(role as typeof roles[number])) {
      return { error: json({ code: 'invalid_invitation', error: 'Valid name, email, and role are required.' }, 400) };
    }
    if (fullName.length > 150 || email.length > 254 || phone.length > 30) {
      return { error: json({ code: 'invalid_invitation', error: 'Check the name, email and phone number.' }, 400) };
    }
    return { email, fullName, role: role as typeof roles[number], phone };
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
      if (roles.includes(body.role as typeof roles[number])) query = query.eq('role', body.role);
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
      if (roleFilter) query = query.in('role', roles.filter(role => role.includes(roleFilter.toLowerCase())));
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
      const users = (data ?? []).map((profile: Record<string, unknown>) => {
        const invitation = profile.email ? latestByEmail.get(String(profile.email).toLowerCase()) ?? null : null;
        return {
          ...profile,
          invitation,
          pending_activation: Boolean(invitation && invitation.status !== 'accepted'),
        };
      }).filter((profile: { invitation: { status: string } | null }) =>
        !invitationFilter || (profile.invitation?.status ?? '').includes(invitationFilter.toLowerCase()));
      return json({ users, total: count ?? 0, page, pageSize });
    }

    if (body.action === 'invite') {
      const parsed = parseInvitation(body);
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
        data: { full_name: fullName, role, role_label: roleLabels[role] },
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
        const parsed = parseInvitation({ ...body, email });
        if ('error' in parsed) return parsed.error;
        const { data: created, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name: parsed.fullName, role: parsed.role, role_label: roleLabels[parsed.role] },
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

    if (body.action === 'update') {
      const userId = String(body.userId ?? '');
      const role = String(body.role ?? '');
      const status = String(body.status ?? '');
      const reason = String(body.reason ?? '').trim();
      if (!userId || !roles.includes(role as typeof roles[number]) || !statuses.includes(status as typeof statuses[number])) return json({ error: 'Valid user, role, and status are required.' }, 400);
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
        return {
          ...row,
          actor_name: typeof row.actor_id === 'string' ? profileNames.get(row.actor_id) ?? 'Unknown account' : 'System',
          target_name: row.table_name === 'profiles' && typeof row.record_id === 'string'
            ? profileNames.get(row.record_id) ?? row.record_id
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
