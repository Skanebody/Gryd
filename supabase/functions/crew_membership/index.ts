/**
 * GRYD — Edge Function crew_membership (Phase 1 MVP).
 * create · join_by_code · leave — règles serveur (max membres, 1 crew actif,
 * cooldown, recruitment open). Écriture via service_role ; le client n'insère pas.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import {
  CREW_CODE_LENGTH,
  CREW_ENTRY_ROLE,
  CREW_MAX_MEMBERS,
  CREW_RECRUITMENT_STATUSES,
  CREW_SWITCH_COOLDOWN_DAYS,
  CREW_TAG_KEYS,
} from '../_shared/game-rules.ts';

const MS_PER_DAY = 86_400_000;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

type Action = 'create' | 'join_by_code' | 'leave' | 'apply' | 'update_profile' | 'decide_application';

interface CrewMembershipRequest {
  action: Action;
  name?: string;
  color?: number;
  cityId?: string;
  code?: string;
  crewId?: string;
  message?: string;
  tag?: string;
  recruitmentStatus?: string;
  tags?: string[];
  applicationId?: string;
  decision?: string;
}

function isRequest(body: unknown): body is CrewMembershipRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    b.action === 'create' ||
    b.action === 'join_by_code' ||
    b.action === 'leave' ||
    b.action === 'apply' ||
    b.action === 'update_profile' ||
    b.action === 'decide_application'
  );
}

async function authUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function activeMembership(userId: string) {
  const { data } = await supabase
    .from('crew_members')
    .select('crew_id, joined_at, role, crews(id, name, code, city_id, color, level)')
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  return data;
}

async function assertCanJoin(userId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const active = await activeMembership(userId);
  if (active) return { ok: false, reason: 'already_in_crew' };

  const { data: lastLeft } = await supabase
    .from('crew_members')
    .select('left_at')
    .eq('user_id', userId)
    .not('left_at', 'is', null)
    .order('left_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastLeft?.left_at) {
    const elapsed = Date.now() - new Date(lastLeft.left_at).getTime();
    if (elapsed < CREW_SWITCH_COOLDOWN_DAYS * MS_PER_DAY) {
      return { ok: false, reason: 'cooldown' };
    }
  }
  return { ok: true };
}

async function memberCount(crewId: string): Promise<number> {
  const { count } = await supabase
    .from('crew_members')
    .select('*', { count: 'exact', head: true })
    .eq('crew_id', crewId)
    .is('left_at', null);
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const userId = await authUserId(req);
  if (!userId) return json({ error: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!isRequest(body)) return json({ error: 'invalid_body' }, 400);

  if (body.action === 'leave') {
    const active = await activeMembership(userId);
    if (!active) return json({ error: 'not_in_crew' }, 400);
    const { error } = await supabase
      .from('crew_members')
      .update({ left_at: new Date().toISOString() })
      .eq('crew_id', active.crew_id)
      .eq('user_id', userId)
      .is('left_at', null);
    if (error) return json({ error: 'leave_failed', detail: error.message }, 500);
    return json({ ok: true, action: 'leave' });
  }

  if (body.action === 'create') {
    const can = await assertCanJoin(userId);
    if (!can.ok) return json({ error: can.reason }, 400);

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 40) return json({ error: 'invalid_name' }, 400);
    const cityId = typeof body.cityId === 'string' ? body.cityId : 'paris';
    const color = typeof body.color === 'number' ? Math.floor(body.color) % 12 : 0;

    const { data: codeRow, error: codeErr } = await supabase.rpc('generate_crew_code');
    if (codeErr || !codeRow) return json({ error: 'code_generation_failed' }, 500);
    const code = String(codeRow).toUpperCase().slice(0, CREW_CODE_LENGTH);

    const { data: crew, error: crewErr } = await supabase
      .from('crews')
      .insert({
        name,
        color,
        city_id: cityId,
        code,
        created_by: userId,
        recruitment_status: 'open',
      })
      .select('id, name, code, city_id, color, level')
      .single();
    if (crewErr || !crew) return json({ error: 'create_failed', detail: crewErr?.message }, 500);

    const { error: memberErr } = await supabase.from('crew_members').insert({
      crew_id: crew.id,
      user_id: userId,
      role: 'founder',
      role_since: new Date().toISOString(),
    });
    if (memberErr) return json({ error: 'member_failed', detail: memberErr.message }, 500);

    return json({ ok: true, action: 'create', crew, role: 'founder' });
  }

  if (body.action === 'join_by_code') {
    const can = await assertCanJoin(userId);
    if (!can.ok) return json({ error: can.reason }, 400);

    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (code.length !== CREW_CODE_LENGTH) return json({ error: 'invalid_code' }, 400);

    const { data: crew, error: crewErr } = await supabase
      .from('crews')
      .select('id, name, code, city_id, color, level, recruitment_status')
      .eq('code', code)
      .maybeSingle();
    if (crewErr || !crew) return json({ error: 'crew_not_found' }, 404);
    if (crew.recruitment_status !== 'open') {
      return json({ error: 'recruitment_closed' }, 403);
    }

    const count = await memberCount(crew.id);
    if (count >= CREW_MAX_MEMBERS) return json({ error: 'crew_full' }, 403);

    const { error: memberErr } = await supabase.from('crew_members').insert({
      crew_id: crew.id,
      user_id: userId,
      role: CREW_ENTRY_ROLE,
      role_since: new Date().toISOString(),
    });
    if (memberErr) return json({ error: 'join_failed', detail: memberErr.message }, 500);

    return json({ ok: true, action: 'join_by_code', crew, role: CREW_ENTRY_ROLE });
  }

  if (body.action === 'apply') {
    const can = await assertCanJoin(userId);
    if (!can.ok) return json({ error: can.reason }, 400);

    const crewId = typeof body.crewId === 'string' ? body.crewId.trim() : '';
    if (crewId.length === 0) return json({ error: 'invalid_crew_id' }, 400);

    const { data: crew, error: crewErr } = await supabase
      .from('crews')
      .select('id, name, recruitment_status')
      .eq('id', crewId)
      .maybeSingle();
    if (crewErr || !crew) return json({ error: 'crew_not_found' }, 404);
    if (crew.recruitment_status !== 'on_request') {
      return json({ error: 'recruitment_not_on_request' }, 403);
    }

    const { data: pending } = await supabase
      .from('crew_applications')
      .select('id')
      .eq('crew_id', crewId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();
    if (pending) return json({ error: 'application_exists' }, 409);

    const message =
      typeof body.message === 'string' && body.message.trim().length > 0
        ? body.message.trim().slice(0, 280)
        : null;

    const { error: applyErr } = await supabase.from('crew_applications').insert({
      crew_id: crewId,
      user_id: userId,
      message,
      status: 'pending',
    });
    if (applyErr) return json({ error: 'apply_failed', detail: applyErr.message }, 500);

    return json({ ok: true, action: 'apply', crew: { id: crew.id, name: crew.name } });
  }

  if (body.action === 'update_profile') {
    const active = await activeMembership(userId);
    if (!active) return json({ error: 'not_in_crew' }, 400);
    if (active.role !== 'founder') return json({ error: 'forbidden' }, 403);

    const patch: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 1 || name.length > 40) return json({ error: 'invalid_name' }, 400);
      patch.name = name;
    }

    if (typeof body.tag === 'string') {
      const tag = body.tag.trim().toUpperCase();
      if (!/^[A-Z0-9]{2,6}$/.test(tag)) return json({ error: 'invalid_tag' }, 400);
      patch.tag = tag;
    }

    if (typeof body.recruitmentStatus === 'string') {
      const status = body.recruitmentStatus.trim();
      if (!(CREW_RECRUITMENT_STATUSES as readonly string[]).includes(status)) {
        return json({ error: 'invalid_recruitment_status' }, 400);
      }
      patch.recruitment_status = status;
    }

    if (Array.isArray(body.tags)) {
      const tags = body.tags.filter((t): t is string => typeof t === 'string');
      const valid = tags.every((t) => (CREW_TAG_KEYS as readonly string[]).includes(t));
      if (!valid) return json({ error: 'invalid_tags' }, 400);
      patch.tags = tags;
    }

    if (Object.keys(patch).length === 0) return json({ error: 'empty_patch' }, 400);

    const { data: crew, error: updateErr } = await supabase
      .from('crews')
      .update(patch)
      .eq('id', active.crew_id)
      .select(
        'id, name, code, city_id, color, level, xp, activity_score, activity_status, tag, slug, league, recruitment_status, tags',
      )
      .single();
    if (updateErr || !crew) {
      return json({ error: 'update_failed', detail: updateErr?.message }, 500);
    }

    return json({ ok: true, action: 'update_profile', crew });
  }

  if (body.action === 'decide_application') {
    const active = await activeMembership(userId);
    if (!active) return json({ error: 'not_in_crew' }, 400);
    if (!['founder', 'co_captain', 'captain'].includes(active.role)) {
      return json({ error: 'forbidden' }, 403);
    }

    const applicationId =
      typeof body.applicationId === 'string' ? body.applicationId.trim() : '';
    const decision = typeof body.decision === 'string' ? body.decision.trim() : '';
    if (applicationId.length === 0) return json({ error: 'invalid_application_id' }, 400);
    if (decision !== 'accepted' && decision !== 'rejected') {
      return json({ error: 'invalid_decision' }, 400);
    }

    const { data: application, error: appErr } = await supabase
      .from('crew_applications')
      .select('id, crew_id, user_id, status')
      .eq('id', applicationId)
      .maybeSingle();
    if (appErr || !application) return json({ error: 'application_not_found' }, 404);
    if (application.crew_id !== active.crew_id) return json({ error: 'forbidden' }, 403);
    if (application.status !== 'pending') return json({ error: 'application_not_pending' }, 409);

    const nowIso = new Date().toISOString();

    if (decision === 'rejected') {
      const { error: rejectErr } = await supabase
        .from('crew_applications')
        .update({ status: 'rejected', decided_at: nowIso, decided_by: userId })
        .eq('id', applicationId)
        .eq('status', 'pending');
      if (rejectErr) return json({ error: 'reject_failed', detail: rejectErr.message }, 500);
      return json({ ok: true, action: 'decide_application', decision: 'rejected' });
    }

    const applicantId = application.user_id as string;
    const { data: existingMember } = await supabase
      .from('crew_members')
      .select('crew_id')
      .eq('user_id', applicantId)
      .is('left_at', null)
      .maybeSingle();
    if (existingMember) return json({ error: 'applicant_in_crew' }, 409);

    const count = await memberCount(active.crew_id);
    if (count >= CREW_MAX_MEMBERS) return json({ error: 'crew_full' }, 403);

    const { error: memberErr } = await supabase.from('crew_members').insert({
      crew_id: active.crew_id,
      user_id: applicantId,
      role: CREW_ENTRY_ROLE,
      role_since: nowIso,
    });
    if (memberErr) return json({ error: 'accept_failed', detail: memberErr.message }, 500);

    const { error: acceptErr } = await supabase
      .from('crew_applications')
      .update({ status: 'accepted', decided_at: nowIso, decided_by: userId })
      .eq('id', applicationId)
      .eq('status', 'pending');
    if (acceptErr) return json({ error: 'application_update_failed', detail: acceptErr.message }, 500);

    await supabase.from('crew_feed_events').insert({
      crew_id: active.crew_id,
      actor_id: applicantId,
      event_type: 'join',
      payload: { body: 'Nouveau membre accepté via candidature' },
    });

    return json({ ok: true, action: 'decide_application', decision: 'accepted' });
  }

  return json({ error: 'unknown_action' }, 400);
});
