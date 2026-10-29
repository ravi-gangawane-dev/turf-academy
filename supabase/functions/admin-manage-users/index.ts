import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const roles = ['admin', 'coach', 'receptionist', 'parent'] as const;
const statuses = ['active', 'inactive', 'suspended'] as const;

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

  try {
    const body = await request.json();
    if (body.action === 'list') {
      const page = Number.isInteger(body.page) && body.page > 0 ? body.page : 1;
      const pageSize = [5, 10, 20, 50, 100].includes(body.pageSize) ? body.pageSize : 5;
      const search = typeof body.search === 'string' ? body.search.trim().replace(/[%_,()\\"]/g, ' ') : '';
      const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
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
        .select('id,full_name,email,phone,role,status,created_at,updated_at', { count: 'exact' });
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      if (['admin', 'coach', 'receptionist', 'parent'].includes(body.role)) query = query.eq('role', body.role);
      if (statuses.includes(body.status as typeof statuses[number])) query = query.eq('status', body.status);
      const nameFilter = filterText(filters.name);
      const contactFilter = filterText(filters.contact);
      const roleFilter = filterText(filters.role);
      const statusFilter = filterText(filters.status);
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
      return json({ users: data, total: count ?? 0, page, pageSize });
    }
    if (body.action === 'invite') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const fullName = String(body.fullName ?? '').trim();
      const role = String(body.role ?? '');
      if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2 || !roles.includes(role as typeof roles[number])) return json({ error: 'Valid name, email, and role are required.' }, 400);
      const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined;
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: fullName } });
      if (error || !data.user) throw error ?? new Error('Invitation could not be created.');
      const { error: profileError } = await adminClient.from('profiles').update({ full_name: fullName, email, phone: body.phone || null, role, status: 'active', is_active: true }).eq('id', data.user.id);
      if (profileError) throw profileError;
      return json({ userId: data.user.id, message: 'Invitation sent.' }, 201);
    }
    if (body.action === 'update') {
      const userId = String(body.userId ?? '');
      const role = String(body.role ?? '');
      const status = String(body.status ?? '');
      if (!userId || !roles.includes(role as typeof roles[number]) || !statuses.includes(status as typeof statuses[number])) return json({ error: 'Valid user, role, and status are required.' }, 400);
      if (userId === user.id && (role !== 'admin' || status !== 'active')) return json({ error: 'You cannot remove your own active administrator access.' }, 409);
      const { error } = await adminClient.from('profiles').update({ role, status, is_active: status === 'active' }).eq('id', userId);
      if (error) throw error;
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: status === 'active' ? 'none' : '876000h' });
      if (authError) throw authError;
      return json({ message: 'User access updated.' });
    }
    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User operation failed.';
    return json({ error: message }, 400);
  }
});
