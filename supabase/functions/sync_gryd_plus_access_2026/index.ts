import { createClient } from 'npm:@supabase/supabase-js@^2';
import { syncPremiumOwner2026 } from '../_shared/premium2026_io.ts';
const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
Deno.serve(async (req: Request): Promise<Response> => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = req.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token || token === authorization) return json({ error: 'authentication_required' }, 401);
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return json({ error: 'authentication_required' }, 401);
  try {
    const result = await syncPremiumOwner2026(db, data.user.id, `sync:${crypto.randomUUID()}`);
    return json(result);
  } catch { return json({ error: 'premium_sync_unavailable' }, 503); }
});
