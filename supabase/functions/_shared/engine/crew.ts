// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/crew.ts

/**
 * GRYD — engine/crew.ts (Crews Supercell MVP, AMENDEMENT-06 §2, doc v3 §33-§53).
 *
 * Fonctions PURES : aucune I/O, aucune horloge. L'appelant (ingest_run,
 * digest_job) lit l'état, appelle ces fonctions, persiste. Tous les seuils/
 * barèmes viennent de @klaim/shared/game-rules — AUCUN nombre magique ici.
 *
 * Couvre : niveau crew ↔ XP (§34.3), XP crew d'une course avec caps anti-farm
 * (§34.1), niveau/tier joueur (§43.1), progression + palier de coffre (§39),
 * Activity Score + statut (§45), résultat d'offensive (§38), tier de cadre
 * crew (§43.2).
 */
import {
  ACTIVITY_SCORE_WEIGHTS,
  ACTIVITY_STATUS_THRESHOLDS,
  BOOST_BLACKOUT_END_OF_SEASON_H,
  CREW_BOOST_CHEST_MULTIPLIER,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_TIERS,
  CREW_CHEST_WEEKLY_TARGET,
  CREW_CHEST_WEIGHTS,
  CREW_FRAME_THRESHOLDS,
  CREW_LEVEL_MAX,
  CREW_PERMISSIONS,
  CREW_ROLES,
  CREW_SCORE_TOP_ACTIVE,
  CREW_XP_DAILY_CAP_PER_MEMBER,
  CREW_XP_ROUTE_DUP_DIVISOR,
  CREW_XP_SOURCES,
  CREW_XP_TABLE,
  CO_CAPTAIN_KICKABLE_ROLES,
  CO_CAPTAIN_PROMOTE_MAX_ROLE,
  GRIP_RANK_LEVELS,
  OFFENSIVE_RESULT_THRESHOLDS,
  PLAYER_LEVEL_MAX,
  PLAYER_LEVEL_XP_BASE,
  PLAYER_LEVEL_XP_RATIO,
  PLAYER_TIER_THRESHOLDS,
  ROOKIE_TRIAL_DAYS,
  type CrewActivityStatus,
  type CrewChestSource,
  type CrewChestTier,
  type CrewFrameTier,
  type CrewPermissionAction,
  type CrewRole,
  type GripRank,
  type OffensiveResult,
  type PlayerTier,
} from '../game-rules.ts';

// ─── §34.3 Niveau crew ↔ XP ───────────────────────────────────────────────────

/**
 * Niveau crew (1..CREW_LEVEL_MAX) atteint pour `xp` d'XP cumulée. PURE.
 * Le niveau L requiert CREW_XP_TABLE[L-1] d'XP cumulée ; on prend le plus haut
 * palier franchi. XP négative → niveau 1 (plancher). Table monotone croissante.
 */
export function crewLevelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < CREW_XP_TABLE.length; i++) {
    if (xp >= CREW_XP_TABLE[i]!) level = i + 1;
    else break;
  }
  return Math.min(level, CREW_LEVEL_MAX);
}

// ─── AMENDEMENT-34 §DELTA-CLASH — Score de saison capé aux plus actifs ────────

/**
 * Score de saison d'un crew (AMENDEMENT-34, source = doc Clash→GRYD) : somme des
 * `topN` PLUS GRANDES contributions individuelles. PURE. Empêche le « gros crew
 * qui écrase par le nombre » — seuls les topN membres les plus actifs comptent
 * (défaut CREW_SCORE_TOP_ACTIVE = 30). Les contributions négatives sont
 * ignorées (plancher 0 par membre : personne ne fait BAISSER le score du crew).
 * `topN ≤ 0` → 0 (aucun membre ne compte) ; moins de topN contributeurs → toutes
 * comptent. N'affecte QUE le classement (anti pay-to-win : ne vend rien, plafonne
 * juste l'avantage de la taille).
 */
export function crewSeasonScore(
  contribs: readonly number[],
  topN: number = CREW_SCORE_TOP_ACTIVE,
): number {
  if (topN <= 0) return 0;
  return [...contribs]
    .map((c) => Math.max(0, c))
    .sort((a, b) => b - a)
    .slice(0, topN)
    .reduce((sum, c) => sum + c, 0);
}

// ─── §34.1 XP crew d'une course (sources + caps anti-farm) ────────────────────

/** Événements d'une course pertinents pour l'XP crew (fournis par ingest_run). */
export interface CrewXpRunInput {
  hexesCaptured: number;
  hexesDefended: number;
  /** Routes NOUVELLEMENT ouvertes par cette course (non dupliquées). */
  routesOpened: number;
  /** Routes re-parcourues (dupliquées) : XP ÷ CREW_XP_ROUTE_DUP_DIVISOR. */
  routesDuplicated: number;
  /** Avant-postes crew maintenus/fondés par cette course. */
  outpostsMaintained: number;
  /** Missions crew complétées par cette course. */
  missionsCompleted: number;
  /** Offensives crew terminées créditées à cette course. */
  offensivesCompleted: number;
  /** true si la course est vérifiée (motionTrust ≥ seuil / valide non-flag). */
  verified: boolean;
  /** true si c'est la 1re contribution du membre cette semaine (participation). */
  firstOfWeek: boolean;
}

/**
 * XP crew brute (avant cap quotidien) d'une course. PURE. Somme du barème
 * CREW_XP_SOURCES par source ; les routes dupliquées comptent au tarif route
 * divisé par CREW_XP_ROUTE_DUP_DIVISOR (arrondi bas, anti-farm §34.1).
 */
export function crewXpForRun(run: CrewXpRunInput): number {
  const routeDupXp = Math.floor(
    (run.routesDuplicated * CREW_XP_SOURCES.routeOpened) / CREW_XP_ROUTE_DUP_DIVISOR,
  );
  return (
    run.hexesCaptured * CREW_XP_SOURCES.hexCaptured +
    run.hexesDefended * CREW_XP_SOURCES.hexDefended +
    run.routesOpened * CREW_XP_SOURCES.routeOpened +
    routeDupXp +
    run.outpostsMaintained * CREW_XP_SOURCES.outpostMaintained +
    run.missionsCompleted * CREW_XP_SOURCES.missionCompleted +
    run.offensivesCompleted * CREW_XP_SOURCES.offensiveCompleted +
    (run.verified ? CREW_XP_SOURCES.verifiedRun : 0) +
    (run.firstOfWeek ? CREW_XP_SOURCES.weeklyParticipation : 0)
  );
}

/**
 * Applique le plafond quotidien par membre (§34.1) : `alreadyToday` = XP crew
 * déjà générée par CE membre aujourd'hui. Retourne l'XP effectivement
 * créditable (0..reste). PURE.
 */
export function cappedCrewXp(rawXp: number, alreadyToday: number): number {
  const remaining = Math.max(0, CREW_XP_DAILY_CAP_PER_MEMBER - alreadyToday);
  return Math.min(Math.max(0, rawXp), remaining);
}

// ─── §43.1 Niveau + tier joueur ───────────────────────────────────────────────

/**
 * Table d'XP cumulée par niveau joueur (index 0 = L1 = 0 XP). Courbe géométrique
 * douce documentée (game-rules) : XP(L) = round(BASE × (ratio^(L-1) − 1)/(ratio−1)).
 * PURE, déterministe. Longueur = PLAYER_LEVEL_MAX.
 */
export function playerLevelXpTable(): number[] {
  const table: number[] = [];
  for (let level = 1; level <= PLAYER_LEVEL_MAX; level++) {
    const cumulative = PLAYER_LEVEL_XP_BASE *
      (Math.pow(PLAYER_LEVEL_XP_RATIO, level - 1) - 1) / (PLAYER_LEVEL_XP_RATIO - 1);
    table.push(Math.round(cumulative));
  }
  return table;
}

/** Niveau joueur (1..PLAYER_LEVEL_MAX) pour `xp` d'XP cumulée. PURE. */
export function playerLevelForXp(xp: number): number {
  const table = playerLevelXpTable();
  let level = 1;
  for (let i = 1; i < table.length; i++) {
    if (xp >= table[i]!) level = i + 1;
    else break;
  }
  return Math.min(level, PLAYER_LEVEL_MAX);
}

/** Tier visuel joueur d'un niveau (§43.1 : 1-9 road … 50 legend). PURE. */
export function tierForLevel(level: number): PlayerTier {
  const entries = Object.entries(PLAYER_TIER_THRESHOLDS) as [PlayerTier, number][];
  let tier: PlayerTier = 'road';
  for (const [name, min] of entries) if (level >= min) tier = name;
  return tier;
}

/**
 * Rang du personnage GRIP pour un niveau joueur (§43.3, bornes basses). Réutilise
 * le niveau (playerLevelForXp) — aucune nouvelle courbe. Plancher `rookie`. PURE.
 */
export function gripRankForLevel(level: number): GripRank {
  const entries = Object.entries(GRIP_RANK_LEVELS) as [GripRank, number][];
  let rank: GripRank = 'rookie';
  for (const [name, min] of entries) if (level >= min) rank = name;
  return rank;
}

/** Tier du cadre de blason crew pour un niveau crew (§43.2). PURE. */
export function crewFrameTierForLevel(level: number): CrewFrameTier {
  const entries = Object.entries(CREW_FRAME_THRESHOLDS) as [CrewFrameTier, number][];
  let tier: CrewFrameTier = 'road';
  for (const [name, min] of entries) if (level >= min) tier = name;
  return tier;
}

// ─── §39 Crew Chest ────────────────────────────────────────────────────────────

/** Événements de la semaine pertinents pour la jauge de coffre (§39.1). */
export type CrewChestInput = Partial<Record<CrewChestSource, number>>;

/**
 * Delta de progression du coffre apporté par un lot d'événements (§39.1). PURE.
 * Somme pondérée par CREW_CHEST_WEIGHTS ; sources absentes = 0. Jamais négatif.
 */
export function chestProgressDelta(input: CrewChestInput): number {
  let delta = 0;
  for (const key of Object.keys(CREW_CHEST_WEIGHTS) as CrewChestSource[]) {
    delta += Math.max(0, input[key] ?? 0) * CREW_CHEST_WEIGHTS[key];
  }
  return delta;
}

/**
 * Plus haut palier de coffre atteint pour `progress` points pondérés (§39.2),
 * ou null si sous le premier palier (bronze 25 %). PURE. Le pourcentage est
 * `progress / CREW_CHEST_WEEKLY_TARGET`.
 */
export function chestTierFor(progress: number): CrewChestTier | null {
  const pct = CREW_CHEST_WEEKLY_TARGET > 0 ? progress / CREW_CHEST_WEEKLY_TARGET : 0;
  let reached: CrewChestTier | null = null;
  for (const tier of CREW_CHEST_TIER_ORDER) {
    if (pct >= CREW_CHEST_TIERS[tier]) reached = tier;
    else break;
  }
  return reached;
}

// ─── §45 Crew Activity Score ────────────────────────────────────────────────────

/**
 * Composantes normalisées 0..1 du score de santé crew (§45). Chaque valeur est
 * une fraction déjà normalisée par l'appelant (digest_job) :
 *  - activeMembers7d = actifs 7 j / total membres ;
 *  - verifiedRunsRatio = runs vérifiés / runs de la semaine ;
 *  - missionsRatio = missions complétées / missions ouvertes (1 si aucune ouverte) ;
 *  - coordinationRatio = proxy participation (membres ayant contribué / total) ;
 *  - defenseRatio = hexes défendus / hexes touchés (1 si aucun) ;
 *  - fairPlayRatio = 1 − (runs rejetés / runs de la semaine).
 */
export interface ActivityScoreInput {
  activeMembers7d: number;
  verifiedRunsRatio: number;
  missionsRatio: number;
  coordinationRatio: number;
  defenseRatio: number;
  fairPlayRatio: number;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/**
 * Score de santé crew 0-100 (§45) + statut. PURE. Chaque composante est bornée
 * à [0,1] puis pondérée par ACTIVITY_SCORE_WEIGHTS (somme des poids = 1) ;
 * le résultat ×100 est arrondi. Le statut vient de ACTIVITY_STATUS_THRESHOLDS.
 */
export function activityScore(
  input: ActivityScoreInput,
): { score: number; status: CrewActivityStatus } {
  const raw =
    clamp01(input.activeMembers7d) * ACTIVITY_SCORE_WEIGHTS.activeMembers7d +
    clamp01(input.verifiedRunsRatio) * ACTIVITY_SCORE_WEIGHTS.verifiedRuns +
    clamp01(input.missionsRatio) * ACTIVITY_SCORE_WEIGHTS.missions +
    clamp01(input.coordinationRatio) * ACTIVITY_SCORE_WEIGHTS.coordination +
    clamp01(input.defenseRatio) * ACTIVITY_SCORE_WEIGHTS.defense +
    clamp01(input.fairPlayRatio) * ACTIVITY_SCORE_WEIGHTS.fairPlay;
  const score = Math.round(raw * 100);
  return { score, status: activityStatusForScore(score) };
}

/** Statut de santé crew pour un score 0-100 (§45, bornes basses). PURE. */
export function activityStatusForScore(score: number): CrewActivityStatus {
  const entries = Object.entries(ACTIVITY_STATUS_THRESHOLDS) as [CrewActivityStatus, number][];
  let status: CrewActivityStatus = 'dormant';
  for (const [name, min] of entries) if (score >= min) status = name;
  return status;
}

// ─── §38 Résultat d'offensive ───────────────────────────────────────────────────

/**
 * Résultat d'une offensive crew (§38.3) selon les hexes pris dans la zone vs
 * l'objectif. PURE. victory ≥ 100 %, partial ≥ 50 %, sinon fail. Un objectif
 * ≤ 0 → victory si ≥ 1 hex pris, sinon fail (garde-fou anti-division).
 */
export function offensiveResult(hexesInZone: number, objectiveHexes: number): OffensiveResult {
  if (objectiveHexes <= 0) return hexesInZone >= 1 ? 'victory' : 'fail';
  const pct = Math.max(0, hexesInZone) / objectiveHexes;
  if (pct >= OFFENSIVE_RESULT_THRESHOLDS.victory) return 'victory';
  if (pct >= OFFENSIVE_RESULT_THRESHOLDS.partial) return 'partial';
  return 'fail';
}

/**
 * Un point (lat,lng) est-il dans le rayon `radiusKm` du centre d'une offensive ?
 * PURE (haversine local — évite d'importer validation pour garder crew.ts
 * autonome). Utilisé par ingest_run pour compter la contribution d'une course.
 */
// ─── AMENDEMENT-16 §4 Crew Boost (doc §13.1/§21) — coffre UNIQUEMENT ─────────
// Un boost n'affecte JAMAIS points/XP/leaderboard : seul le delta de
// progression du COFFRE crew est multiplié, borné, non cumulable, éteint
// pendant le blackout de fin de saison.

const MS_PER_HOUR = 3_600_000;

/** Fenêtre d'un crew boost (miroir crew_boosts, timestamps epoch ms). */
export interface CrewBoostWindow {
  startsAtMs: number;
  endsAtMs: number;
  /** Multiplicateur stocké — borné par CREW_BOOST_CHEST_MULTIPLIER à l'usage. */
  multiplier: number;
  status: 'active' | 'expired' | 'cancelled';
}

/**
 * Un boost est-il actif à l'instant `nowMs` ? PURE. Statut `active` ET fenêtre
 * [startsAt, endsAt) ouverte — un boost enchaîné (starts_at futur, doc « 1
 * boost actif à la fois ») n'a AUCUN effet avant l'ouverture de sa fenêtre.
 */
export function crewBoostActive(boost: CrewBoostWindow, nowMs: number): boolean {
  return boost.status === 'active' && nowMs >= boost.startsAtMs && nowMs < boost.endsAtMs;
}

/**
 * Multiplicateur de progression du coffre à l'instant `nowMs`. PURE.
 *  - Blackout (doc §13.1) : dans les BOOST_BLACKOUT_END_OF_SEASON_H dernières
 *    heures avant `seasonEndMs` → 1 (aucun effet), boost actif ou pas.
 *  - Pas de cumul : plusieurs boosts actifs → max des multiplicateurs, JAMAIS
 *    la somme/le produit (CREW_BOOST_MAX_ACTIVE = 1 est garanti côté serveur,
 *    ceci est la ceinture-bretelles moteur).
 *  - Borne dure : résultat dans [1, CREW_BOOST_CHEST_MULTIPLIER].
 */
export function boostChestMultiplier(
  boosts: readonly CrewBoostWindow[],
  nowMs: number,
  seasonEndMs: number | null,
): number {
  if (seasonEndMs !== null) {
    const blackoutStartMs = seasonEndMs - BOOST_BLACKOUT_END_OF_SEASON_H * MS_PER_HOUR;
    if (nowMs >= blackoutStartMs) return 1;
  }
  let max = 1;
  for (const boost of boosts) {
    if (crewBoostActive(boost, nowMs) && boost.multiplier > max) max = boost.multiplier;
  }
  return Math.min(max, CREW_BOOST_CHEST_MULTIPLIER);
}

/**
 * Progression de coffre boostée pour un delta de base (chestProgressDelta).
 * PURE. floor(delta × multiplicateur) — arrondi bas, jamais < delta de base
 * hors blackout, jamais > delta × CREW_BOOST_CHEST_MULTIPLIER. Delta négatif
 * → 0 (le coffre ne recule jamais). S'applique au COFFRE uniquement.
 */
export function boostedChestProgress(
  baseDelta: number,
  boosts: readonly CrewBoostWindow[],
  nowMs: number,
  seasonEndMs: number | null,
): number {
  const safeDelta = Math.max(0, baseDelta);
  return Math.floor(safeDelta * boostChestMultiplier(boosts, nowMs, seasonEndMs));
}

export function withinOffensiveZone(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusKm: number,
): boolean {
  const R = 6_371; // rayon terrestre km
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(point.lat - center.lat);
  const dLng = toRad(point.lng - center.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(center.lat)) * Math.cos(toRad(point.lat)) * Math.sin(dLng / 2) ** 2;
  const distKm = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  return distKm <= radiusKm;
}

// ─── AMENDEMENT-16 §3 — Permissions rôle façon clan (doc §8) ─────────────────
// Le serveur reste SEUL juge (Edge Functions rôle-gated V1) ; l'UI consomme les
// mêmes fonctions pour le gating visuel. Tout vient de CREW_PERMISSIONS — les
// fonctions ci-dessous n'ajoutent que les limites non exprimables en liste
// plate (périmètre du co_captain, départ du founder, essai rookie).

/** Un rôle peut-il exécuter une action de la matrice §8 ? PURE. */
export function hasCrewPermission(role: CrewRole, action: CrewPermissionAction): boolean {
  return (CREW_PERMISSIONS[action] as readonly CrewRole[]).includes(role);
}

/** Rang hiérarchique d'un rôle (index CREW_ROLES : rookie=0 … founder=6). PURE. */
export function crewRoleRank(role: CrewRole): number {
  return CREW_ROLES.indexOf(role);
}

/**
 * `actor` peut-il exclure `target` (§8.1/§8.2) ? PURE. Founder : tout le monde
 * sauf lui-même ; co_captain : uniquement CO_CAPTAIN_KICKABLE_ROLES (jamais le
 * founder ni un autre co_captain) ; les autres rôles n'excluent personne.
 */
export function canKickMember(actor: CrewRole, target: CrewRole): boolean {
  if (!hasCrewPermission(actor, 'kick')) return false;
  if (actor === 'founder') return target !== 'founder';
  return CO_CAPTAIN_KICKABLE_ROLES.includes(target);
}

/**
 * `actor` peut-il promouvoir/rétrograder un membre VERS `newRole` (§8.1/§8.2) ?
 * PURE. `founder` ne s'attribue jamais par promotion (transfert dédié
 * `transferFoundership`) ; co_captain promeut jusqu'à CO_CAPTAIN_PROMOTE_MAX_ROLE.
 */
export function canPromoteTo(actor: CrewRole, newRole: CrewRole): boolean {
  if (!hasCrewPermission(actor, 'promote')) return false;
  if (newRole === 'founder') return false;
  if (actor === 'founder') return true;
  return crewRoleRank(newRole) <= crewRoleRank(CO_CAPTAIN_PROMOTE_MAX_ROLE);
}

/** §8.1 : le Founder ne quitte pas le crew sans transférer son rôle. PURE. */
export function canLeaveCrew(role: CrewRole): boolean {
  return role !== 'founder';
}

/** Fin de l'essai rookie (§8.7) : role_since + ROOKIE_TRIAL_DAYS, en epoch ms. PURE. */
export function rookieTrialEndsAt(roleSinceMs: number): number {
  return roleSinceMs + ROOKIE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

/** L'essai rookie est-il terminé à `nowMs` (l'appelant fournit l'horloge) ? PURE. */
export function isRookieTrialOver(roleSinceMs: number, nowMs: number): boolean {
  return nowMs >= rookieTrialEndsAt(roleSinceMs);
}
