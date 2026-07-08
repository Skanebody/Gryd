/**
 * GRYD — Edge Function crew_social : chat, sorties, requêtes/dons crew.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import {
  CREW_GIFT_CLAIMS_PER_MEMBER,
  CREW_GIFT_EXPIRY_H,
} from '../_shared/game-rules.ts';

const MS_PER_HOUR = 3_600_000;

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

type Action =
  | 'send_message'
  | 'create_event'
  | 'rsvp_event'
  | 'create_request'
  | 'fulfill_request'
  | 'offer_gift'
  | 'claim_gift';

interface CrewSocialRequest {
  action: Action;
  body?: string;
  title?: string;
  whenLabel?: string;
  place?: string;
  zone?: string;
  objective?: string;
  eventId?: string;
  choice?: string;
  requestType?: string;
  infos?: string[];
  requestId?: string;
  giftId?: string;
  rewardsTotal?: number;
  anonymous?: boolean;
  giftKind?: string;
}

function isRequest(body: unknown): body is CrewSocialRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.action === 'string';
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
    .select('crew_id, role')
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  return data;
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

  const membership = await activeMembership(userId);
  if (!membership) return json({ error: 'not_in_crew' }, 400);
  const crewId = membership.crew_id as string;

  if (body.action === 'send_message') {
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (text.length < 1 || text.length > 500) return json({ error: 'invalid_body' }, 400);
    const { data, error } = await supabase
      .from('crew_messages')
      .insert({ crew_id: crewId, author_id: userId, body: text })
      .select('id, created_at')
      .single();
    if (error) return json({ error: 'send_failed', detail: error.message }, 500);
    return json({ ok: true, action: 'send_message', message: data });
  }

  if (body.action === 'create_event') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const whenLabel = typeof body.whenLabel === 'string' ? body.whenLabel.trim() : '';
    const place = typeof body.place === 'string' ? body.place.trim() : '';
    const zone = typeof body.zone === 'string' ? body.zone.trim() : '';
    const objective = body.objective === 'defense' ? 'defense' : 'conquete';
    if (!title || !whenLabel || !place || !zone) return json({ error: 'invalid_event' }, 400);
    const { data, error } = await supabase
      .from('crew_events')
      .insert({
        crew_id: crewId,
        title,
        when_label: whenLabel,
        place_label: place,
        zone_label: zone,
        objective,
        created_by: userId,
      })
      .select('id')
      .single();
    if (error) return json({ error: 'create_event_failed', detail: error.message }, 500);
    return json({ ok: true, action: 'create_event', eventId: data.id });
  }

  if (body.action === 'rsvp_event') {
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const choice = body.choice === 'coming' || body.choice === 'maybe' || body.choice === 'no'
      ? body.choice
      : null;
    if (!eventId || choice === null) return json({ error: 'invalid_rsvp' }, 400);
    const { data: event } = await supabase
      .from('crew_events')
      .select('id')
      .eq('id', eventId)
      .eq('crew_id', crewId)
      .maybeSingle();
    if (!event) return json({ error: 'event_not_found' }, 404);
    const { error } = await supabase.from('crew_event_rsvps').upsert({
      event_id: eventId,
      user_id: userId,
      choice,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,user_id' });
    if (error) return json({ error: 'rsvp_failed', detail: error.message }, 500);
    return json({ ok: true, action: 'rsvp_event', choice });
  }

  if (body.action === 'create_request') {
    const requestType = typeof body.requestType === 'string' ? body.requestType.trim() : '';
    const valid = ['defense', 'finish', 'route', 'scout', 'outing', 'boost'];
    if (!valid.includes(requestType)) return json({ error: 'invalid_request_type' }, 400);
    const zone = typeof body.zone === 'string' && body.zone.trim().length > 0
      ? body.zone.trim().slice(0, 80)
      : 'Crew';
    const infos = Array.isArray(body.infos)
      ? body.infos.filter((i): i is string => typeof i === 'string').slice(0, 6)
      : [];
    const { data, error } = await supabase
      .from('crew_requests')
      .insert({
        crew_id: crewId,
        requester_id: userId,
        request_type: requestType,
        zone_label: zone,
        infos,
      })
      .select('id')
      .single();
    if (error) return json({ error: 'create_request_failed', detail: error.message }, 500);
    return json({ ok: true, action: 'create_request', requestId: data.id });
  }

  if (body.action === 'fulfill_request') {
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    if (!requestId) return json({ error: 'invalid_request_id' }, 400);
    const { data: request, error: readErr } = await supabase
      .from('crew_requests')
      .select('id, request_type, zone_label, status')
      .eq('id', requestId)
      .eq('crew_id', crewId)
      .maybeSingle();
    if (readErr || !request) return json({ error: 'request_not_found' }, 404);
    if (request.status !== 'open') return json({ error: 'request_not_open' }, 409);
    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('crew_requests')
      .update({ status: 'fulfilled', fulfilled_by: userId, fulfilled_at: nowIso })
      .eq('id', requestId)
      .eq('status', 'open');
    if (updErr) return json({ error: 'fulfill_failed', detail: updErr.message }, 500);
    await supabase.from('crew_feed_events').insert({
      crew_id: crewId,
      actor_id: userId,
      event_type: 'defense',
      payload: {
        body: `Aide sur ${request.zone_label as string}`,
        request_type: request.request_type,
      },
    });
    return json({ ok: true, action: 'fulfill_request' });
  }

  if (body.action === 'offer_gift') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const rewardsTotal = typeof body.rewardsTotal === 'number'
      ? Math.floor(body.rewardsTotal)
      : 5;
    const giftKind = body.giftKind === 'boost' ? 'boost' : 'chest';
    if (!title || rewardsTotal < 1) return json({ error: 'invalid_gift' }, 400);
    const expiresAt = new Date(Date.now() + CREW_GIFT_EXPIRY_H * MS_PER_HOUR).toISOString();
    const { data, error } = await supabase
      .from('crew_gifts')
      .insert({
        crew_id: crewId,
        gift_kind: giftKind,
        title,
        rewards_total: rewardsTotal,
        offered_by_user_id: body.anonymous === true ? null : userId,
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single();
    if (error) return json({ error: 'offer_failed', detail: error.message }, 500);
    return json({ ok: true, action: 'offer_gift', giftId: data.id, expiresAt: data.expires_at });
  }

  if (body.action === 'claim_gift') {
    const giftId = typeof body.giftId === 'string' ? body.giftId.trim() : '';
    if (!giftId) return json({ error: 'invalid_gift_id' }, 400);
    const { data: gift, error: giftErr } = await supabase
      .from('crew_gifts')
      .select('id, rewards_total, expires_at')
      .eq('id', giftId)
      .eq('crew_id', crewId)
      .maybeSingle();
    if (giftErr || !gift) return json({ error: 'gift_not_found' }, 404);
    if (new Date(gift.expires_at as string).getTime() <= Date.now()) {
      return json({ error: 'gift_expired' }, 400);
    }
    const { count: myClaims } = await supabase
      .from('crew_gift_claims')
      .select('*', { count: 'exact', head: true })
      .eq('gift_id', giftId)
      .eq('user_id', userId);
    if ((myClaims ?? 0) >= CREW_GIFT_CLAIMS_PER_MEMBER) {
      return json({ error: 'already_claimed' }, 409);
    }
    const { count: totalClaims } = await supabase
      .from('crew_gift_claims')
      .select('*', { count: 'exact', head: true })
      .eq('gift_id', giftId);
    if ((totalClaims ?? 0) >= (gift.rewards_total as number)) {
      return json({ error: 'gift_exhausted' }, 409);
    }
    const { error: claimErr } = await supabase.from('crew_gift_claims').insert({
      gift_id: giftId,
      user_id: userId,
    });
    if (claimErr) return json({ error: 'claim_failed', detail: claimErr.message }, 500);
    return json({ ok: true, action: 'claim_gift' });
  }

  return json({ error: 'unknown_action' }, 400);
});
