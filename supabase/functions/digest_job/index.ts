/**
 * GRYD — Edge Function digest_job (cron du soir, SPEC §6.3, doc notifs §3/§6).
 *
 * Dimanche (heure de Paris) → digest HEBDO par joueur (« +X hexes, Y zones
 * perdues… ») ; les autres jours → digest CREW quotidien (activité des
 * membres), seulement s'il y a des événements — jamais de résumé vide.
 *
 * Inbox toujours (notifications type 'digest', P6). Le PUSH du digest n'est
 * PAS envoyé : son texte est composé en français en dur (buildDigest) alors que
 * push_devices.locale sait dans quelle langue écrire. Il ne consomme donc plus
 * le cap PUSH_MAX_PER_DAY (PÉRIMÈTRE 3 — il l'écrivait à tort dans push_log).
 * L'infrastructure d'envoi réelle vit dans _shared/expo-push.ts + _shared/push.ts
 * et sert déjà l'avertissement de decay (decay_job).
 *
 * Toute la logique vit dans logic.ts — ce fichier ne fait que de l'I/O.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { buildDigest, canPush, type Digest, type DigestEvent } from './logic.ts';
import { activityScore, chestTierFor } from '../_shared/engine/crew.ts';
import { secretsMatch } from '../_shared/secret.ts';
import {
  BONUS_CREW_CHEST_MAX_RATIO,
  BONUS_CREW_CHEST_MIN_RATIO,
  BONUS_DEFENSE_DECAY_MAX_H,
  BONUS_DURATION_H,
  CREW_CHEST_WEEKLY_TARGET,
  FINISHER_BONUS_MISSING_MAX_M,
} from '../_shared/game-rules.ts';
import { bonusById } from '../_shared/bonuses.ts';
import type { BonusId } from '../_shared/types.ts';

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
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
  if (!secret || !secretsMatch(req.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const now = new Date();
    const weekly = isSundayInParis(now);
    // Clôture QUOTIDIENNE des crew boosts expirés (AMENDEMENT-16 §4) : la
    // fenêtre temporelle fait déjà foi côté moteur (crewBoostActive), ce
    // statut fige l'historique et allège les lectures.
    const boostsExpired = await expireCrewBoosts(now);
    // Clôture des frontières partielles expirées (AMENDEMENT-17 §CH2) : une
    // frontière `open` non fermée dans son TTL passe `expired` — ses segments
    // comptent en exploration/contribution (déjà crédités à l'ouverture via la
    // course de l'ouvreur), JAMAIS en zone (aucun claim intérieur sans fermeture).
    const boundariesExpired = await expirePartialBoundaries(now);
    // AMENDEMENT-19 §7 : cycle de vie des bonus ciblés. D'abord EXPIRER les
    // fenêtres échues (active → expired), puis en CRÉER de nouvelles, CIBLÉES et
    // pondérées (jamais partout) : Finisher sur une frontière crew ouverte et
    // proche, Défense Critique sur une zone crew qui s'efface bientôt, Coffre
    // Crew sur un coffre dans sa dernière ligne droite. « Le bon moment pour agir. »
    const bonusesExpired = await expireActiveBonuses(now);
    const bonusesCreated = await createTargetedBonuses(now);
    // Maintenance crew hebdo (Supercell §2) : Activity Score + clôture des
    // coffres de la semaine PASSÉE (tier figé) + signaux discovery.
    if (weekly) await crewWeeklyMaintenance(now);
    const digests = weekly ? await weeklyDigests(now) : await crewDigests(now);

    // ── Livraison : inbox pour tous, push si les garde-fous l'autorisent ─────
    const userIds = digests.map((d) => d.userId);
    const pushLogs = await loadRecentPushLogs(userIds, now);
    // « éligible » = les garde-fous auraient laissé passer un push. Ce n'est PAS
    // un envoi : rien n'est encore poussé pour le digest (voir plus bas).
    let pushEligible = 0;

    for (const { userId, digest } of digests) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'digest',
        priority: DIGEST_PRIORITY,
        payload: { title: digest.title, body: digest.body, itemCount: digest.itemCount },
      });
      if (notifError) throw new Error(`notifications insert: ${notifError.message}`);

      // NB : le digest en quiet hours nécessiterait l'opt-in explicite (doc §3)
      // — on respecte donc les quiet hours.
      const gate = canPush({ id: userId }, now, pushLogs.get(userId) ?? []);
      if (!gate.allowed) continue;
      pushEligible += 1;

      // PÉRIMÈTRE 3 — CORRECTION D'UN MENSONGE : ce bloc écrivait une ligne
      // `push_log` alors qu'AUCUN push n'était envoyé (l'envoi Expo était un
      // TODO). Conséquences réelles : le cap PUSH_MAX_PER_DAY était consommé
      // par des envois fantômes — donc l'avertissement de decay, lui bien
      // réel depuis ce chantier, pouvait être supprimé pour « cap atteint »
      // à cause d'un digest jamais parti. On ne journalise plus rien ici.
      //
      // Ce qui manque pour brancher le digest sur le vrai envoi (tout le reste
      // est prêt : `_shared/expo-push.ts`, `push_devices`, planification) :
      // `buildDigest` compose son texte en français en dur, alors que
      // `push_devices.locale` sait dans quelle langue écrire au joueur. Pousser
      // en l'état enverrait du français à un joueur allemand. À faire dans le
      // chantier i18n serveur, pas ici.
    }

    return json({
      mode: weekly ? 'weekly' : 'crew',
      digests: digests.length,
      pushEligible,
      pushed: 0, // le digest n'est pas encore poussé (i18n serveur manquante)
      boostsExpired,
      boundariesExpired,
      bonusesExpired,
      bonusesCreated,
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

// ─── Clôture des crew boosts expirés (AMENDEMENT-16 §4, doc §13.1) ────────────

/**
 * Passe en 'expired' tout boost 'active' dont la fenêtre est terminée
 * (ends_at ≤ now). Idempotent — un boost déjà clos n'est jamais retouché,
 * l'effet réel étant de toute façon borné par la fenêtre côté moteur
 * (crewBoostActive/boostChestMultiplier). Retourne le nombre de clôtures.
 */
async function expireCrewBoosts(now: Date): Promise<number> {
  const { data, error } = await supabase
    .from('crew_boosts')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lte('ends_at', now.toISOString())
    .select('id');
  if (error) throw new Error(`crew_boosts expire: ${error.message}`);
  return (data ?? []).length;
}

// ─── Clôture des frontières partielles expirées (AMENDEMENT-17 §CH2) ──────────

/**
 * Passe en 'expired' toute frontière partielle 'open' dont le TTL est écoulé
 * (expires_at ≤ now). Idempotent — une frontière déjà close (completed/expired/
 * contested) n'est jamais retouchée. Aucune zone n'est attribuée : les segments
 * de l'ouvreur ont déjà été crédités (exploration/contribution) par sa course ;
 * faute de fermeture, l'intérieur reste NON capturé. Retourne le nombre de
 * clôtures. Le nettoyage réel des lignes = rétention/anonymisation V1.
 */
async function expirePartialBoundaries(now: Date): Promise<number> {
  const { data, error } = await supabase
    .from('partial_boundaries')
    .update({ status: 'expired' })
    .eq('status', 'open')
    .lte('expires_at', now.toISOString())
    .select('id');
  if (error) throw new Error(`partial_boundaries expire: ${error.message}`);
  return (data ?? []).length;
}

// ─── Bonus ciblés : cycle de vie (AMENDEMENT-19 §7) ──────────────────────────

/**
 * Passe en 'expired' toute fenêtre de bonus 'active' échue (expires_at ≤ now).
 * Idempotent — une fenêtre déjà close (claimed/expired) n'est jamais retouchée.
 * Aucune récompense n'est due à l'expiration (le bonus non « répondu » disparaît
 * simplement — pas de culpabilisation). Retourne le nombre de clôtures.
 */
async function expireActiveBonuses(now: Date): Promise<number> {
  const { data, error } = await supabase
    .from('active_bonuses')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lte('expires_at', now.toISOString())
    .select('id');
  if (error) throw new Error(`active_bonuses expire: ${error.message}`);
  return (data ?? []).length;
}

/**
 * Insère une fenêtre `active_bonuses` si AUCUNE fenêtre `active` du même bonus
 * n'existe déjà pour ce sujet (anti-doublon/anti-spam). PURE côté décision (la
 * durée vient de la fiche). Retourne 1 si créée, 0 sinon. La récompense reste
 * décidée par ingest_run quand un run RÉPOND ; ici on ne fait qu'OUVRIR la
 * fenêtre au bon moment.
 */
async function insertBonusIfAbsent(
  scope: 'crew' | 'player',
  subjectId: string,
  bonusId: BonusId,
  now: Date,
): Promise<number> {
  const nowIso = now.toISOString();
  const { data: existing, error: exErr } = await supabase
    .from('active_bonuses')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('bonus_id', bonusId)
    .eq('status', 'active')
    .gt('expires_at', nowIso)
    .limit(1);
  if (exErr) throw new Error(`active_bonuses dup read: ${exErr.message}`);
  if ((existing ?? []).length > 0) return 0; // déjà une fenêtre ouverte : pas de doublon

  const durationH = (BONUS_DURATION_H as Record<string, number>)[bonusId] ??
    bonusById(bonusId).durationH;
  const expiresAt = new Date(now.getTime() + durationH * MS_PER_HOUR);
  const { error: insErr } = await supabase.from('active_bonuses').insert({
    scope,
    subject_id: subjectId,
    bonus_id: bonusId,
    type: bonusById(bonusId).type,
    starts_at: nowIso,
    expires_at: expiresAt.toISOString(),
  });
  if (insErr) throw new Error(`active_bonuses insert: ${insErr.message}`);
  return 1;
}

/**
 * CRÉE des fenêtres de bonus CIBLÉES et PONDÉRÉES (démo MVP, AMENDEMENT-19 §7) —
 * jamais partout, seulement là où le contexte fait un « bon moment » :
 *  1. FINISHER (crew) : une frontière `open` du crew dont le segment manquant
 *     est ≤ FINISHER_BONUS_MISSING_MAX_M (« presque fermée ») → fenêtre Finisher
 *     pour ce crew. Se branche sur les partial_boundaries (AMENDEMENT-17).
 *  2. DÉFENSE CRITIQUE (crew) : une zone crew dont le decay tombe dans les
 *     prochaines BONUS_DEFENSE_DECAY_MAX_H → fenêtre Défense pour ce crew.
 *  3. COFFRE CREW (crew) : un coffre de la semaine dont la progression est dans
 *     [80 %, 95 %] de la cible → fenêtre Coffre Crew pour ce crew.
 * Anti-doublon via insertBonusIfAbsent. Retourne le nombre de fenêtres créées.
 */
async function createTargetedBonuses(now: Date): Promise<number> {
  const nowIso = now.toISOString();
  let created = 0;

  // 1. Finisher : frontières crew ouvertes et PROCHES (segment manquant court).
  const { data: boundaries, error: bErr } = await supabase
    .from('partial_boundaries')
    .select('crew_id, missing_m')
    .eq('status', 'open')
    .gt('expires_at', nowIso)
    .lte('missing_m', FINISHER_BONUS_MISSING_MAX_M);
  if (bErr) throw new Error(`partial_boundaries bonus read: ${bErr.message}`);
  const finisherCrews = new Set<string>();
  for (const b of boundaries ?? []) finisherCrews.add(b.crew_id as string);
  for (const crewId of finisherCrews) {
    created += await insertBonusIfAbsent('crew', crewId, 'finisher', now);
  }

  // 2. Défense Critique : zones dont le decay est imminent (< 12 h). hex_claims
  //    ne stocke pas de crew ; on remonte le crew ACTIF du propriétaire via
  //    crew_members (owner_user_id → crew_id). Une zone menacée d'un membre de
  //    crew ouvre la fenêtre Défense pour son crew.
  const decayHorizon = new Date(now.getTime() + BONUS_DEFENSE_DECAY_MAX_H * MS_PER_HOUR).toISOString();
  const { data: decaying, error: dErr } = await supabase
    .from('hex_claims')
    .select('owner_user_id')
    .not('owner_user_id', 'is', null)
    .not('decay_at', 'is', null)
    .gt('decay_at', nowIso)
    .lte('decay_at', decayHorizon);
  if (dErr) throw new Error(`hex_claims decay read: ${dErr.message}`);
  const decayingOwners = new Set<string>();
  for (const h of decaying ?? []) decayingOwners.add(h.owner_user_id as string);
  if (decayingOwners.size > 0) {
    const { data: owners, error: oErr } = await supabase
      .from('crew_members')
      .select('crew_id')
      .in('user_id', [...decayingOwners])
      .is('left_at', null);
    if (oErr) throw new Error(`crew_members decay read: ${oErr.message}`);
    const defenseCrews = new Set<string>();
    for (const m of owners ?? []) defenseCrews.add(m.crew_id as string);
    for (const crewId of defenseCrews) {
      created += await insertBonusIfAbsent('crew', crewId, 'defense_critical', now);
    }
  }

  // 3. Coffre Crew : coffre de LA SEMAINE dont la progression ∈ [80 %, 95 %] de
  //    la cible hebdo (dernière ligne droite). closed_at is null = semaine en cours.
  const weekStart = isoWeekStart(now);
  const minProgress = Math.floor(BONUS_CREW_CHEST_MIN_RATIO * CREW_CHEST_WEEKLY_TARGET);
  const maxProgress = Math.ceil(BONUS_CREW_CHEST_MAX_RATIO * CREW_CHEST_WEEKLY_TARGET);
  const { data: chests, error: cErr } = await supabase
    .from('crew_chests')
    .select('crew_id, progress')
    .eq('week_start', weekStart)
    .is('closed_at', null)
    .gte('progress', minProgress)
    .lte('progress', maxProgress);
  if (cErr) throw new Error(`crew_chests bonus read: ${cErr.message}`);
  for (const chest of chests ?? []) {
    created += await insertBonusIfAbsent('crew', chest.crew_id as string, 'crew_chest', now);
  }

  return created;
}

// ─── Maintenance crew hebdomadaire (Crews Supercell §2/§45/§39) ──────────────

/** Lundi ISO ('YYYY-MM-DD') de la semaine d'une date. */
function isoWeekStart(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // lundi=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/**
 * Recalcule l'Activity Score (§45) de chaque crew depuis l'activité des 7 j,
 * clôt les coffres de la semaine PASSÉE en figeant le palier atteint (§39.2),
 * et rafraîchit les signaux discovery (war/defense active).
 * Le calcul du score utilise le moteur PUR activityScore ; l'I/O est ici.
 */
async function crewWeeklyMaintenance(now: Date): Promise<void> {
  const since = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();

  // Membres actifs par crew (adhésions actives).
  const { data: members, error: membersError } = await supabase
    .from('crew_members')
    .select('crew_id, user_id')
    .is('left_at', null);
  if (membersError) throw new Error(`crew_members read: ${membersError.message}`);
  const membersOfCrew = new Map<string, string[]>();
  const crewOfUser = new Map<string, string>();
  for (const m of members ?? []) {
    if (!membersOfCrew.has(m.crew_id)) membersOfCrew.set(m.crew_id, []);
    membersOfCrew.get(m.crew_id)!.push(m.user_id);
    crewOfUser.set(m.user_id, m.crew_id);
  }
  const userIds = [...crewOfUser.keys()];

  // Runs de la semaine par membre (statut → vérifié/rejeté ; jours actifs).
  const activeUsers = new Set<string>();
  const runsByCrew = new Map<string, number>();
  const verifiedByCrew = new Map<string, number>();
  const rejectedByCrew = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: runRows, error: runsError } = await supabase
      .from('runs')
      .select('user_id, status, motion_trust')
      .in('user_id', userIds)
      .gte('started_at', since);
    if (runsError) throw new Error(`runs read: ${runsError.message}`);
    for (const r of runRows ?? []) {
      const crewId = crewOfUser.get(r.user_id)!;
      const valid = r.status === 'valid' || r.status === 'partial';
      if (valid) {
        activeUsers.add(r.user_id);
        runsByCrew.set(crewId, (runsByCrew.get(crewId) ?? 0) + 1);
        if ((r.motion_trust ?? 0) >= 70) { // VERIFIED_MIN_TRUST — cohérent badges.ts
          verifiedByCrew.set(crewId, (verifiedByCrew.get(crewId) ?? 0) + 1);
        }
      } else {
        rejectedByCrew.set(crewId, (rejectedByCrew.get(crewId) ?? 0) + 1);
      }
    }
  }

  // Missions de défense complétées / ouvertes cette semaine par crew.
  const missionsDone = new Map<string, number>();
  const missionsTotal = new Map<string, number>();
  const { data: missionRows, error: missionsError } = await supabase
    .from('defense_missions')
    .select('crew_id, done')
    .gte('created_at', since);
  if (missionsError) throw new Error(`defense_missions read: ${missionsError.message}`);
  for (const m of missionRows ?? []) {
    missionsTotal.set(m.crew_id, (missionsTotal.get(m.crew_id) ?? 0) + 1);
    if (m.done) missionsDone.set(m.crew_id, (missionsDone.get(m.crew_id) ?? 0) + 1);
  }

  // Score + statut par crew (moteur pur), puis UPDATE crews.
  for (const [crewId, crewMembers] of membersOfCrew) {
    const total = crewMembers.length || 1;
    const active7d = crewMembers.filter((u) => activeUsers.has(u)).length;
    const runs = runsByCrew.get(crewId) ?? 0;
    const verified = verifiedByCrew.get(crewId) ?? 0;
    const rejected = rejectedByCrew.get(crewId) ?? 0;
    const mTotal = missionsTotal.get(crewId) ?? 0;
    const mDone = missionsDone.get(crewId) ?? 0;
    const { score, status } = activityScore({
      activeMembers7d: active7d / total,
      verifiedRunsRatio: runs > 0 ? verified / runs : 0,
      missionsRatio: mTotal > 0 ? mDone / mTotal : 0, // aucune mission = 0 (rien coordonné)
      coordinationRatio: active7d / total, // proxy MVP : part de membres actifs
      defenseRatio: mTotal > 0 ? mDone / mTotal : 0, // défense = missions honorées
      fairPlayRatio: runs + rejected > 0 ? runs / (runs + rejected) : 1,
    });
    const { error: updErr } = await supabase
      .from('crews')
      .update({ activity_score: score, activity_status: status })
      .eq('id', crewId);
    if (updErr) throw new Error(`crews activity update: ${updErr.message}`);
  }

  // Clôture des coffres de la semaine PASSÉE : fige le palier atteint (§39.2).
  const lastWeekStart = isoWeekStart(new Date(now.getTime() - 7 * MS_PER_DAY));
  const { data: chests, error: chestErr } = await supabase
    .from('crew_chests')
    .select('crew_id, progress')
    .eq('week_start', lastWeekStart)
    .is('closed_at', null);
  if (chestErr) throw new Error(`crew_chests read: ${chestErr.message}`);
  for (const chest of chests ?? []) {
    const tier = chestTierFor(chest.progress as number);
    const { error: closeErr } = await supabase
      .from('crew_chests')
      .update({ tier_reached: tier, closed_at: now.toISOString() })
      .eq('crew_id', chest.crew_id)
      .eq('week_start', lastWeekStart);
    if (closeErr) throw new Error(`crew_chests close: ${closeErr.message}`);
  }

  // Signaux discovery (war/defense active) — fonction SQL.
  const { error: sigErr } = await supabase.rpc('refresh_crew_discovery_signals');
  if (sigErr) throw new Error(`refresh_crew_discovery_signals rpc: ${sigErr.message}`);
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
