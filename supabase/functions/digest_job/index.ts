/**
 * GRYD — Edge Function digest_job (cron du soir, SPEC §6.3, doc notifs §3/§6).
 *
 * Dimanche (heure de Paris) → digest HEBDO par joueur (« +X hexes, Y zones
 * perdues… ») ; les autres jours → digest CREW quotidien (activité des
 * membres), seulement s'il y a des événements — jamais de résumé vide.
 *
 * Inbox toujours (notifications type 'digest', P6) ; push seulement si
 * canPush l'autorise (quiet hours 21h-8h + cap PUSH_MAX_PER_DAY, §4.3),
 * tracé dans push_log. L'envoi Expo réel = TODO (payload prêt).
 *
 * Toute la logique vit dans logic.ts — ce fichier ne fait que de l'I/O.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { buildDigest, canPush, type Digest, type DigestEvent } from './logic.ts';

const MS_PER_DAY = 86_400_000;
const DIGEST_PRIORITY = 6; // P6 (GRYD_notifications_logic.md §2)
const PARIS_TZ = 'Europe/Paris';

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

/** Dimanche à l'heure de Paris ? (jour LOCAL, pas UTC — cron du soir.) */
function isSundayInParis(now: Date): boolean {
  return new Intl.DateTimeFormat('en-US', { timeZone: PARIS_TZ, weekday: 'short' })
    .format(now) === 'Sun';
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const now = new Date();
    const weekly = isSundayInParis(now);
    const digests = weekly ? await weeklyDigests(now) : await crewDigests(now);

    // ── Livraison : inbox pour tous, push si les garde-fous l'autorisent ─────
    const userIds = digests.map((d) => d.userId);
    const pushLogs = await loadRecentPushLogs(userIds, now);
    let pushed = 0;

    for (const { userId, digest } of digests) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'digest',
        priority: DIGEST_PRIORITY,
        payload: { title: digest.title, body: digest.body, itemCount: digest.itemCount },
      });
      if (notifError) throw new Error(`notifications insert: ${notifError.message}`);

      // NB : le digest en quiet hours nécessiterait l'opt-in explicite (doc §3)
      // — pas de settings notifications en MVP, donc on respecte les quiet hours.
      const gate = canPush({ id: userId }, now, pushLogs.get(userId) ?? []);
      if (!gate.allowed) continue;

      const { error: logError } = await supabase.from('push_log').insert({
        user_id: userId,
        sent_at: now.toISOString(),
        type: 'digest',
      });
      if (logError) throw new Error(`push_log insert: ${logError.message}`);
      pushed += 1;

      // TODO(Expo) — envoi push réel via exp.host/--/api/v2/push/send avec les
      // ExpoPushTokens du joueur (table device_tokens à venir). Payload prêt :
      // { to: <expoPushToken>, title: digest.title, body: digest.body,
      //   data: { type: 'digest', cta: 'open_inbox' }, priority: 'default' }
    }

    return json({
      mode: weekly ? 'weekly' : 'crew',
      digests: digests.length,
      pushed,
    });
  } catch (err) {
    console.error('digest_job:', err);
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});

interface UserDigest {
  userId: string;
  digest: Digest;
}

// ─── Digest hebdo (dimanche soir) ────────────────────────────────────────────

async function weeklyDigests(now: Date): Promise<UserDigest[]> {
  const since = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();
  const events = new Map<string, DigestEvent[]>();
  const add = (userId: string, e: DigestEvent) => {
    if (!events.has(userId)) events.set(userId, []);
    events.get(userId)!.push(e);
  };

  // Hexes gagnés / défendus sur la semaine (approximation MVP : état FINAL de
  // hex_claims — les hexes reperdus dans la semaine sortent du compte).
  const { data: hexRows, error: hexError } = await supabase
    .from('hex_claims')
    .select('owner_user_id, claim_type')
    .gte('claimed_at', since)
    .not('owner_user_id', 'is', null);
  if (hexError) throw new Error(`hex_claims read: ${hexError.message}`);
  const gained = new Map<string, number>();
  const defendedCount = new Map<string, number>();
  for (const h of hexRows ?? []) {
    const uid = h.owner_user_id as string;
    const target = h.claim_type === 'defended' ? defendedCount : gained;
    target.set(uid, (target.get(uid) ?? 0) + 1);
  }
  for (const [uid, count] of gained) add(uid, { type: 'hexes_gained', count });
  for (const [uid, count] of defendedCount) add(uid, { type: 'hexes_defended', count });

  // Zones perdues : les notifications de vol de la semaine (posées par le
  // pipeline de vol) tiennent lieu de compteur MVP.
  const { data: steals, error: stealsError } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'steal')
    .gte('created_at', since);
  if (stealsError) throw new Error(`notifications read: ${stealsError.message}`);
  const lost = new Map<string, number>();
  for (const s of steals ?? []) lost.set(s.user_id, (lost.get(s.user_id) ?? 0) + 1);
  for (const [uid, count] of lost) add(uid, { type: 'zones_lost', count });

  // Badges débloqués sur la semaine.
  const { data: badges, error: badgesError } = await supabase
    .from('user_badges')
    .select('user_id')
    .gte('earned_at', since);
  if (badgesError) throw new Error(`user_badges read: ${badgesError.message}`);
  const earned = new Map<string, number>();
  for (const b of badges ?? []) earned.set(b.user_id, (earned.get(b.user_id) ?? 0) + 1);
  for (const [uid, count] of earned) add(uid, { type: 'badges_unlocked', count });

  return buildAll(events, 'weekly');
}

// ─── Digest crew quotidien ───────────────────────────────────────────────────

async function crewDigests(now: Date): Promise<UserDigest[]> {
  const since = new Date(now.getTime() - MS_PER_DAY).toISOString();

  // Membres actifs par crew.
  const { data: members, error: membersError } = await supabase
    .from('crew_members')
    .select('crew_id, user_id')
    .is('left_at', null);
  if (membersError) throw new Error(`crew_members read: ${membersError.message}`);
  const crewOfUser = new Map<string, string>();
  const usersOfCrew = new Map<string, string[]>();
  for (const m of members ?? []) {
    crewOfUser.set(m.user_id, m.crew_id);
    if (!usersOfCrew.has(m.crew_id)) usersOfCrew.set(m.crew_id, []);
    usersOfCrew.get(m.crew_id)!.push(m.user_id);
  }
  if (crewOfUser.size === 0) return [];

  // Activité des membres sur 24 h : courses valides + hexes gagnés.
  const { data: runRows, error: runsError } = await supabase
    .from('runs')
    .select('user_id')
    .in('status', ['valid', 'partial'])
    .gte('started_at', since)
    .in('user_id', [...crewOfUser.keys()]);
  if (runsError) throw new Error(`runs read: ${runsError.message}`);
  const { data: hexRows, error: hexError } = await supabase
    .from('hex_claims')
    .select('owner_user_id')
    .gte('claimed_at', since)
    .in('owner_user_id', [...crewOfUser.keys()]);
  if (hexError) throw new Error(`hex_claims read: ${hexError.message}`);

  const crewRuns = new Map<string, number>();
  for (const r of runRows ?? []) {
    const crewId = crewOfUser.get(r.user_id)!;
    crewRuns.set(crewId, (crewRuns.get(crewId) ?? 0) + 1);
  }
  const crewHexes = new Map<string, number>();
  for (const h of hexRows ?? []) {
    const crewId = crewOfUser.get(h.owner_user_id as string)!;
    crewHexes.set(crewId, (crewHexes.get(crewId) ?? 0) + 1);
  }

  // Un digest identique pour chaque membre du crew actif.
  const events = new Map<string, DigestEvent[]>();
  for (const [crewId, users] of usersOfCrew) {
    const crewEvents: DigestEvent[] = [
      { type: 'crew_runs', count: crewRuns.get(crewId) ?? 0 },
      { type: 'hexes_gained', count: crewHexes.get(crewId) ?? 0 },
    ];
    if (crewEvents.every((e) => e.count <= 0)) continue; // crew silencieux : rien
    for (const userId of users) events.set(userId, crewEvents);
  }
  return buildAll(events, 'crew');
}

function buildAll(events: Map<string, DigestEvent[]>, scope: 'crew' | 'weekly'): UserDigest[] {
  const out: UserDigest[] = [];
  for (const [userId, userEvents] of events) {
    const digest = buildDigest(userEvents, scope);
    if (digest) out.push({ userId, digest }); // null = rien à dire, pas de digest
  }
  return out;
}

// ─── push_log des dernières 48 h (couvre le « jour local » de canPush) ───────

async function loadRecentPushLogs(
  userIds: readonly string[],
  now: Date,
): Promise<Map<string, Date[]>> {
  const map = new Map<string, Date[]>();
  if (userIds.length === 0) return map;
  const since = new Date(now.getTime() - 2 * MS_PER_DAY).toISOString();
  const { data, error } = await supabase
    .from('push_log')
    .select('user_id, sent_at')
    .in('user_id', [...new Set(userIds)])
    .gte('sent_at', since);
  if (error) throw new Error(`push_log read: ${error.message}`);
  for (const row of data ?? []) {
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id)!.push(new Date(row.sent_at));
  }
  return map;
}
