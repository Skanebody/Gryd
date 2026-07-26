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
import {
  buildDigest,
  buildZonesLost,
  canPush,
  type Digest,
  type DigestEvent,
  readActivity,
  readPayloadActivity,
  readPayloadHexCount,
  type StealNotificationRow,
} from './logic.ts';
import { activityScore, chestTierFor } from '../_shared/engine/crew.ts';
import { secretsMatch } from '../_shared/secret.ts';
import {
  ACTIVITIES,
  type Activity,
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
/** Taille des lots pour les clauses `in(…)` — même valeur que steal_push_job. */
const DB_CHUNK = 500;
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

/** Discipline lisible ? Test de FORME sur une colonne, sans repli implicite. */
const isActivity = (v: unknown): v is Activity =>
  typeof v === 'string' && (ACTIVITIES as readonly string[]).includes(v);

/**
 * Les disciplines dans lesquelles chaque joueur a RÉELLEMENT des lignes.
 *
 * POURQUOI `season_scores`, ET PAS `runs` NI `hex_claims` — même arbitrage,
 * mot pour mot, que `steal_push_job.loadPlayerWorlds` : la question posée est
 * booléenne (« ce joueur a-t-il deux mondes à distinguer ? »), mais la table
 * lue décide du volume rapatrié pour apprendre un oui/non. `season_scores` est
 * bornée PAR CONSTRUCTION — clé primaire `(season_id, user_id, activity)`,
 * donc au plus deux lignes par saison jouée —, là où `runs` et `hex_claims`
 * croissent avec l'activité.
 *
 * TOUTES SAISONS confondues, volontairement : la question est « a-t-il déjà
 * roulé/couru dans ce monde », et ses lignes de saisons closes y répondent
 * encore (`season_close` ne purge que `hex_claims` et `shields`). Ce read est
 * donc MONOTONE : il ne peut que gagner des mondes, jamais en perdre, et la
 * seule dérive possible — un joueur devenu bi-discipliné cette semaine — pousse
 * vers l'ABSTENTION, jamais vers un chiffre faux.
 *
 * ÉCHEC DE LECTURE : on ne fabrique rien. La map revient vide, tout `null` de
 * payload reste non attribuable, et `buildZonesLost` s'abstient de chiffrer.
 */
async function loadPlayerWorlds(
  userIds: readonly string[],
): Promise<Map<string, Set<Activity>>> {
  const worlds = new Map<string, Set<Activity>>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return worlds; // aucun vol cette semaine : aucun appel
  // Par lots : le nombre de victimes d'une semaine n'est borné par rien, et un
  // `.in(…)` de dix mille identifiants tomberait sur la longueur d'URL — le
  // digest hebdo de TOUS les joueurs avec lui. Même parade que steal_push_job.
  for (let i = 0; i < unique.length; i += DB_CHUNK) {
    const { data, error } = await supabase
      .from('season_scores')
      .select('user_id, activity')
      .in('user_id', unique.slice(i, i + DB_CHUNK));
    if (error) throw new Error(`season_scores read: ${error.message}`);
    for (const row of data ?? []) {
      // Valeur illisible : elle n'AJOUTE aucun monde (elle n'en retire pas non
      // plus). Ne pas lever ici est cohérent avec l'usage : un monde manquant
      // pousse vers l'abstention, jamais vers un chiffre faux.
      if (!isActivity(row.activity)) continue;
      const activity: Activity = row.activity;
      const uid = String(row.user_id);
      const set = worlds.get(uid);
      if (set) set.add(activity);
      else worlds.set(uid, new Set([activity]));
    }
  }
  return worlds;
}

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
 * n'existe déjà pour ce sujet DANS LE MÊME MONDE (anti-doublon/anti-spam).
 * Retourne 1 si créée, 0 sinon. La récompense reste décidée par ingest_run
 * quand un run RÉPOND ; ici on ne fait qu'OUVRIR la fenêtre au bon moment.
 *
 * `activity` = le monde du DÉCLENCHEUR, ou `null` quand le déclencheur n'a pas
 * de monde (coffre crew : sa progression n'appartient ni à la course ni au
 * vélo). Un `null` de commodité serait un mensonge ; celui-ci est un fait.
 *
 * L'anti-doublon est PAR MONDE, volontairement : une zone vélo qui s'efface et
 * une zone à pied qui s'efface sont deux situations distinctes, chacune
 * défendable par une sortie différente — les confondre en une seule fenêtre
 * ferait disparaître l'une des deux (migration 0071).
 *
 * ORDRE DE DÉPLOIEMENT, à ne pas inverser : la migration 0071 (colonne
 * `active_bonuses.activity`) doit être APPLIQUÉE avant que cette version de la
 * fonction soit déployée. Déployée d'abord, l'insertion échouerait sur une
 * colonne inconnue et le cron du soir tomberait en entier.
 */
async function insertBonusIfAbsent(
  scope: 'crew' | 'player',
  subjectId: string,
  bonusId: BonusId,
  activity: Activity | null,
  now: Date,
): Promise<number> {
  const nowIso = now.toISOString();
  let dup = supabase
    .from('active_bonuses')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('bonus_id', bonusId)
    .eq('status', 'active')
    .gt('expires_at', nowIso);
  dup = activity === null ? dup.is('activity', null) : dup.eq('activity', activity);
  const { data: existing, error: exErr } = await dup.limit(1);
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
    activity,
    starts_at: nowIso,
    expires_at: expiresAt.toISOString(),
  });
  if (insErr) throw new Error(`active_bonuses insert: ${insErr.message}`);
  return 1;
}

/** Range un couple (sujet, monde) — l'unité d'ouverture d'une fenêtre disciplinée. */
function addSubjectWorld(
  map: Map<string, Set<Activity>>,
  subjectId: string,
  activity: Activity,
): void {
  const worlds = map.get(subjectId);
  if (worlds) worlds.add(activity);
  else map.set(subjectId, new Set([activity]));
}

/**
 * CRÉE des fenêtres de bonus CIBLÉES et PONDÉRÉES (démo MVP, AMENDEMENT-19 §7) —
 * jamais partout, seulement là où le contexte fait un « bon moment » :
 *  1. FINISHER (crew) : une frontière `open` du crew dont le segment manquant
 *     est ≤ FINISHER_BONUS_MISSING_MAX_M (« presque fermée ») → fenêtre Finisher
 *     pour ce crew, DANS LE MONDE de la frontière. Une frontière ouverte à vélo
 *     ne se referme pas en courant (0070 : `partial_boundaries.activity`).
 *  2. DÉFENSE CRITIQUE (crew) : une zone crew dont le decay tombe dans les
 *     prochaines BONUS_DEFENSE_DECAY_MAX_H → fenêtre Défense pour ce crew, DANS
 *     LE MONDE de la zone menacée. Sans ça, une zone VÉLO qui s'efface ouvrait
 *     une fenêtre que n'importe quelle course pouvait réclamer — E14 :
 *     « jamais Run + Bike dans une même lecture ».
 *  3. COFFRE CREW (crew) : un coffre de la semaine dont la progression est dans
 *     [80 %, 95 %] de la cible → fenêtre Coffre Crew, SANS monde : la
 *     progression du coffre n'appartient à aucune discipline.
 * Anti-doublon PAR MONDE via insertBonusIfAbsent. Retourne le nombre de
 * fenêtres créées.
 */
async function createTargetedBonuses(now: Date): Promise<number> {
  const nowIso = now.toISOString();
  let created = 0;

  // 1. Finisher : frontières crew ouvertes et PROCHES (segment manquant court).
  const { data: boundaries, error: bErr } = await supabase
    .from('partial_boundaries')
    .select('crew_id, missing_m, activity')
    .eq('status', 'open')
    .gt('expires_at', nowIso)
    .lte('missing_m', FINISHER_BONUS_MISSING_MAX_M);
  if (bErr) throw new Error(`partial_boundaries bonus read: ${bErr.message}`);
  const finisherCrews = new Map<string, Set<Activity>>();
  for (const b of boundaries ?? []) {
    addSubjectWorld(finisherCrews, b.crew_id as string, readActivity(b.activity));
  }
  for (const [crewId, worlds] of finisherCrews) {
    for (const world of worlds) {
      created += await insertBonusIfAbsent('crew', crewId, 'finisher', world, now);
    }
  }

  // 2. Défense Critique : zones dont le decay est imminent (< 12 h). hex_claims
  //    ne stocke pas de crew ; on remonte le crew ACTIF du propriétaire via
  //    crew_members (owner_user_id → crew_id). Une zone menacée d'un membre de
  //    crew ouvre la fenêtre Défense pour son crew, DANS LE MONDE de la zone :
  //    la discipline voyage donc du propriétaire jusqu'à son crew.
  const decayHorizon = new Date(now.getTime() + BONUS_DEFENSE_DECAY_MAX_H * MS_PER_HOUR).toISOString();
  const { data: decaying, error: dErr } = await supabase
    .from('hex_claims')
    .select('owner_user_id, activity')
    .not('owner_user_id', 'is', null)
    .not('decay_at', 'is', null)
    .gt('decay_at', nowIso)
    .lte('decay_at', decayHorizon);
  if (dErr) throw new Error(`hex_claims decay read: ${dErr.message}`);
  const worldsByOwner = new Map<string, Set<Activity>>();
  for (const h of decaying ?? []) {
    addSubjectWorld(worldsByOwner, h.owner_user_id as string, readActivity(h.activity));
  }
  if (worldsByOwner.size > 0) {
    const { data: owners, error: oErr } = await supabase
      .from('crew_members')
      .select('crew_id, user_id')
      .in('user_id', [...worldsByOwner.keys()])
      .is('left_at', null);
    if (oErr) throw new Error(`crew_members decay read: ${oErr.message}`);
    const defenseCrews = new Map<string, Set<Activity>>();
    for (const m of owners ?? []) {
      for (const world of worldsByOwner.get(m.user_id as string) ?? []) {
        addSubjectWorld(defenseCrews, m.crew_id as string, world);
      }
    }
    for (const [crewId, worlds] of defenseCrews) {
      for (const world of worlds) {
        created += await insertBonusIfAbsent('crew', crewId, 'defense_critical', world, now);
      }
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
    // `null` : le coffre n'a pas de discipline (cf. insertBonusIfAbsent).
    created += await insertBonusIfAbsent('crew', chest.crew_id as string, 'crew_chest', null, now);
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
  //
  // PAR DISCIPLINE (0071) : `hex_claims` porte `activity` depuis 0070, et le
  // territoire est SÉPARÉ (`ACTIVITY_SCOPE.territory = 'per_activity'`). Sans
  // ce regroupement, le récap annonçait « 12 zones gagnées » pour 7 à pied et
  // 5 à vélo — une somme que E14 interdit, poussée hors de l'app.
  const { data: hexRows, error: hexError } = await supabase
    .from('hex_claims')
    .select('owner_user_id, claim_type, activity')
    .gte('claimed_at', since)
    .not('owner_user_id', 'is', null);
  if (hexError) throw new Error(`hex_claims read: ${hexError.message}`);
  const gained = new Map<string, number>();
  const defendedCount = new Map<string, number>();
  /** Clé « joueur + monde » : les deux mondes ne partagent jamais un compteur. */
  const worldKey = (uid: string, activity: Activity) => `${uid} ${activity}`;
  const splitKey = (key: string): [string, Activity] => {
    const cut = key.lastIndexOf(' ');
    return [key.slice(0, cut), key.slice(cut + 1) as Activity];
  };
  for (const h of hexRows ?? []) {
    const key = worldKey(h.owner_user_id as string, readActivity(h.activity));
    const target = h.claim_type === 'defended' ? defendedCount : gained;
    target.set(key, (target.get(key) ?? 0) + 1);
  }
  for (const [key, count] of gained) {
    const [uid, activity] = splitKey(key);
    add(uid, { type: 'hexes_gained', count, activity });
  }
  for (const [key, count] of defendedCount) {
    const [uid, activity] = splitKey(key);
    add(uid, { type: 'hexes_defended', count, activity });
  }

  // Zones perdues : les notifications de vol de la semaine (posées par le
  // pipeline de vol) tiennent lieu de compteur MVP.
  //
  // ON COMPTE DES ZONES, PLUS DES LIGNES (26/07/2026). Une ligne
  // `notifications` de type 'steal' est un ÉVÉNEMENT AGRÉGÉ par victime
  // (steal_push_job/index.ts:inboxRow) : elle couvre `payload.hexCount`
  // hexagones. Les compter une par une annonçait « 3 zones perdues » pour
  // vingt zones réelles — et ce nombre part dans l'inbox du joueur.
  //
  // La discipline, elle, ne se lit PAS dans le payload : `payload.activity`
  // vaut `null` aussi bien quand les pertes mêlent les deux mondes que quand
  // le joueur n'en pratique qu'un. `buildZonesLost` (pur, testé) tranche avec
  // `season_scores` et, quand il ne peut pas trancher, ne chiffre RIEN —
  // mieux vaut se taire que chiffrer faux.
  const { data: steals, error: stealsError } = await supabase
    .from('notifications')
    .select('user_id, payload')
    .eq('type', 'steal')
    .gte('created_at', since);
  if (stealsError) throw new Error(`notifications read: ${stealsError.message}`);
  const stealRows: StealNotificationRow[] = (steals ?? []).map((s) => {
    const payload = (s.payload ?? {}) as Record<string, unknown>;
    return {
      userId: s.user_id as string,
      hexCount: readPayloadHexCount(payload.hexCount),
      activity: readPayloadActivity(payload.activity),
    };
  });
  const lost = buildZonesLost(stealRows, await loadPlayerWorlds(stealRows.map((r) => r.userId)));
  for (const { userId, event } of lost.events) add(userId, event);
  // Une abstention se compte : sans cette trace, « aucune zone perdue » et
  // « on n'a pas su le dire » deviendraient indiscernables dans les métriques.
  if (lost.unquantifiable.length > 0) {
    console.warn(
      `digest_job: zones perdues non chiffrables pour ${lost.unquantifiable.length} joueur(s) ` +
        `(pertes mêlant deux mondes, ou payload illisible)`,
    );
  }

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
  // PAR DISCIPLINE (0071) : l'activité territoriale d'un crew se lit monde par
  // monde. « 9 zones prises » pour 6 à pied et 3 à vélo était une somme
  // interdite (E14), envoyée à TOUS les membres du crew.
  const { data: hexRows, error: hexError } = await supabase
    .from('hex_claims')
    .select('owner_user_id, activity')
    .gte('claimed_at', since)
    .in('owner_user_id', [...crewOfUser.keys()]);
  if (hexError) throw new Error(`hex_claims read: ${hexError.message}`);

  const crewRuns = new Map<string, number>();
  for (const r of runRows ?? []) {
    const crewId = crewOfUser.get(r.user_id)!;
    crewRuns.set(crewId, (crewRuns.get(crewId) ?? 0) + 1);
  }
  /** crew → monde → hexes pris sur 24 h. Deux mondes, deux compteurs. */
  const crewHexes = new Map<string, Map<Activity, number>>();
  for (const h of hexRows ?? []) {
    const crewId = crewOfUser.get(h.owner_user_id as string)!;
    const activity = readActivity(h.activity);
    const byWorld = crewHexes.get(crewId) ?? new Map<Activity, number>();
    byWorld.set(activity, (byWorld.get(activity) ?? 0) + 1);
    crewHexes.set(crewId, byWorld);
  }

  // Un digest identique pour chaque membre du crew actif.
  const events = new Map<string, DigestEvent[]>();
  for (const [crewId, users] of usersOfCrew) {
    const crewEvents: DigestEvent[] = [
      // `crew_runs` n'a pas de monde : c'est un compte de SORTIES du crew, pas
      // un territoire. Le nombre de courses n'est pas une lecture compétitive
      // entre disciplines — il dit seulement « le crew a bougé ».
      { type: 'crew_runs', count: crewRuns.get(crewId) ?? 0 },
      ...[...(crewHexes.get(crewId) ?? new Map<Activity, number>())].map(
        ([activity, count]): DigestEvent => ({ type: 'hexes_gained', count, activity }),
      ),
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
