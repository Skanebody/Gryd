/**
 * GRYD — Edge Function claim_crew_chest (§39.3-§39.4).
 * Réclamation serveur du coffre hebdo : foulees capées par membre actif.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import {
  CREW_CHEST_TIER_FOULEES,
  type CrewChestTier,
} from '../_shared/game-rules.ts';
import { isoWeekStart, validateChestClaim } from './logic.ts';

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

async function authUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const userId = await authUserId(req);
  if (!userId) return json({ error: 'unauthorized' }, 401);

  const { data: membership, error: memberErr } = await supabase
    .from('crew_members')
    .select('crew_id, crews(level)')
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (memberErr) return json({ error: 'membership_read_failed' }, 500);
  if (!membership) return json({ error: 'not_in_crew' }, 400);

  const crewId = membership.crew_id as string;
  const crewRaw = membership.crews as { level: number } | { level: number }[] | null;
  const crewLevel = Array.isArray(crewRaw) ? crewRaw[0]?.level ?? 1 : crewRaw?.level ?? 1;

  const weekStart = isoWeekStart(new Date());
  const { data: chest, error: chestErr } = await supabase
    .from('crew_chests')
    .select('progress, tier_reached, claimed_at')
    .eq('crew_id', crewId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (chestErr) return json({ error: 'chest_read_failed' }, 500);
  if (!chest) return json({ error: 'no_chest_row' }, 400);

  const validation = validateChestClaim({
    crewLevel,
    progress: Number(chest.progress),
    tierReached: (chest.tier_reached as string | null) ?? null,
    claimedAt: (chest.claimed_at as string | null) ?? null,
  });
  if (!validation.ok) return json({ error: validation.reason }, 400);

  const tier = validation.tier as CrewChestTier;
  const fouleesEach = CREW_CHEST_TIER_FOULEES[tier];
  const claimedAt = new Date().toISOString();

  const { error: claimErr } = await supabase
    .from('crew_chests')
    .update({ claimed_at: claimedAt, tier_reached: tier })
    .eq('crew_id', crewId)
    .eq('week_start', weekStart)
    .is('claimed_at', null);
  if (claimErr) return json({ error: 'claim_failed', detail: claimErr.message }, 500);

  const { data: members, error: membersErr } = await supabase
    .from('crew_members')
    .select('user_id')
    .eq('crew_id', crewId)
    .is('left_at', null);
  if (membersErr) return json({ error: 'members_read_failed' }, 500);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  let membersRewarded = 0;
  for (const memberId of memberIds) {
    const { data: user, error: userReadErr } = await supabase
      .from('users')
      .select('foulees')
      .eq('id', memberId)
      .maybeSingle();
    if (userReadErr || !user) continue;
    const { error: updErr } = await supabase
      .from('users')
      .update({ foulees: (user.foulees as number) + fouleesEach })
      .eq('id', memberId);
    if (!updErr) membersRewarded += 1;
  }

  await supabase.from('crew_feed_events').insert({
    crew_id: crewId,
    actor_id: userId,
    event_type: 'chest',
    payload: {
      body: `Coffre ${tier} réclamé — +${fouleesEach} Foulées par membre`,
      tier,
      fouleesEach,
      membersRewarded,
    },
  });

  return json({
    ok: true,
    tier,
    fouleesEach,
    membersRewarded,
    claimedAt,
  });
});
