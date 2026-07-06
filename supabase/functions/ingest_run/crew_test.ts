/**
 * Tests Crews Supercell MVP (AMENDEMENT-06 §2, doc v3 §33-§53) — moteur PUR.
 * Couvre : niveau crew ↔ XP (bornes de table §34.3), XP crew d'une course +
 * caps anti-farm (§34.1), niveau/tier joueur (§43.1, monotonie), progression +
 * paliers de coffre (§39.2, 25/50/75/100/150 %), Activity Score + statuts (§45),
 * résultat d'offensive (§38.3 : victory/partial/fail), tier de cadre crew (§43.2),
 * zone d'offensive (haversine). AUCUN réseau.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  ACTIVITY_STATUS_THRESHOLDS,
  CREW_CHEST_WEEKLY_TARGET,
  CREW_LEVEL_MAX,
  CREW_PERMISSIONS,
  CREW_ROLES,
  CREW_XP_DAILY_CAP_PER_MEMBER,
  CREW_XP_SOURCES,
  CREW_XP_TABLE,
  PLAYER_LEVEL_MAX,
  ROOKIE_RESTRICTIONS,
  ROOKIE_TRIAL_DAYS,
} from '../_shared/game-rules.ts';
import {
  activityScore,
  activityStatusForScore,
  canKickMember,
  canLeaveCrew,
  canPromoteTo,
  cappedCrewXp,
  chestProgressDelta,
  chestTierFor,
  crewFrameTierForLevel,
  crewLevelForXp,
  crewRoleRank,
  crewXpForRun,
  hasCrewPermission,
  isRookieTrialOver,
  offensiveResult,
  playerLevelForXp,
  crewSeasonScore,
  playerLevelXpTable,
  rookieTrialEndsAt,
  tierForLevel,
  withinOffensiveZone,
  type ActivityScoreInput,
  type CrewXpRunInput,
} from '../_shared/engine/crew.ts';
import { CREW_SCORE_TOP_ACTIVE } from '../_shared/game-rules.ts';

// ─── §34.3 crewLevelForXp : bornes exactes de la table ───────────────────────

Deno.test('crewLevelForXp : niveau 1 à 0 XP et sous le premier palier', () => {
  assertEquals(crewLevelForXp(0), 1);
  assertEquals(crewLevelForXp(-100), 1);
  assertEquals(crewLevelForXp(999), 1);
});

Deno.test('crewLevelForXp : chaque borne de table franchie donne le niveau exact', () => {
  for (let i = 0; i < CREW_XP_TABLE.length; i++) {
    assertEquals(crewLevelForXp(CREW_XP_TABLE[i]!), i + 1, `borne L${i + 1}`);
    // Juste sous la borne suivante → toujours niveau i+1.
    if (i + 1 < CREW_XP_TABLE.length) {
      assertEquals(crewLevelForXp(CREW_XP_TABLE[i + 1]! - 1), i + 1);
    }
  }
});

Deno.test('crewLevelForXp : plafonne à CREW_LEVEL_MAX', () => {
  assertEquals(crewLevelForXp(CREW_XP_TABLE[CREW_LEVEL_MAX - 1]!), CREW_LEVEL_MAX);
  assertEquals(crewLevelForXp(10_000_000), CREW_LEVEL_MAX);
});

// ─── §34.1 crewXpForRun + caps ────────────────────────────────────────────────

const emptyRun: CrewXpRunInput = {
  hexesCaptured: 0,
  hexesDefended: 0,
  routesOpened: 0,
  routesDuplicated: 0,
  outpostsMaintained: 0,
  missionsCompleted: 0,
  offensivesCompleted: 0,
  verified: false,
  firstOfWeek: false,
};

Deno.test('crewXpForRun : course vide = 0 XP', () => {
  assertEquals(crewXpForRun(emptyRun), 0);
});

Deno.test('crewXpForRun : barème par source additif', () => {
  const run: CrewXpRunInput = {
    ...emptyRun,
    hexesCaptured: 10, // 20
    hexesDefended: 5, // 5
    routesOpened: 1, // 50
    outpostsMaintained: 1, // 100
    missionsCompleted: 1, // 30
    offensivesCompleted: 1, // 200
    verified: true, // 15
    firstOfWeek: true, // 25
  };
  const expected = 10 * CREW_XP_SOURCES.hexCaptured + 5 * CREW_XP_SOURCES.hexDefended +
    CREW_XP_SOURCES.routeOpened + CREW_XP_SOURCES.outpostMaintained +
    CREW_XP_SOURCES.missionCompleted + CREW_XP_SOURCES.offensiveCompleted +
    CREW_XP_SOURCES.verifiedRun + CREW_XP_SOURCES.weeklyParticipation;
  assertEquals(crewXpForRun(run), expected);
  assertEquals(expected, 445);
});

Deno.test('crewXpForRun : route dupliquée créditée moitié (arrondi bas)', () => {
  const run: CrewXpRunInput = { ...emptyRun, routesDuplicated: 3 };
  // 3 × 50 / 2 = 75 (floor)
  assertEquals(crewXpForRun(run), 75);
});

Deno.test('cappedCrewXp : plafond quotidien par membre respecté', () => {
  assertEquals(cappedCrewXp(300, 0), 300);
  assertEquals(cappedCrewXp(300, CREW_XP_DAILY_CAP_PER_MEMBER - 100), 100);
  assertEquals(cappedCrewXp(300, CREW_XP_DAILY_CAP_PER_MEMBER), 0);
  assertEquals(cappedCrewXp(300, CREW_XP_DAILY_CAP_PER_MEMBER + 50), 0);
  assertEquals(cappedCrewXp(-10, 0), 0); // jamais négatif
});

// ─── §43.1 Niveau + tier joueur ───────────────────────────────────────────────

Deno.test('playerLevelXpTable : longueur = PLAYER_LEVEL_MAX, L1=0, croissante', () => {
  const table = playerLevelXpTable();
  assertEquals(table.length, PLAYER_LEVEL_MAX);
  assertEquals(table[0], 0);
  for (let i = 1; i < table.length; i++) {
    assert(table[i]! > table[i - 1]!, `strictement croissante à L${i + 1}`);
  }
});

Deno.test('playerLevelForXp : monotone, plancher 1, plafond MAX', () => {
  const table = playerLevelXpTable();
  assertEquals(playerLevelForXp(-1), 1);
  assertEquals(playerLevelForXp(0), 1);
  for (let i = 0; i < table.length; i++) {
    assertEquals(playerLevelForXp(table[i]!), i + 1, `borne L${i + 1}`);
  }
  assertEquals(playerLevelForXp(table[PLAYER_LEVEL_MAX - 1]! + 1_000_000), PLAYER_LEVEL_MAX);
});

Deno.test('tierForLevel : tranches §43.1', () => {
  assertEquals(tierForLevel(1), 'road');
  assertEquals(tierForLevel(9), 'road');
  assertEquals(tierForLevel(10), 'tempo');
  assertEquals(tierForLevel(19), 'tempo');
  assertEquals(tierForLevel(20), 'race');
  assertEquals(tierForLevel(30), 'carbon');
  assertEquals(tierForLevel(40), 'elite');
  assertEquals(tierForLevel(50), 'legend');
  assertEquals(tierForLevel(99), 'legend');
});

Deno.test('crewFrameTierForLevel : tranches §43.2', () => {
  assertEquals(crewFrameTierForLevel(1), 'road');
  assertEquals(crewFrameTierForLevel(4), 'road');
  assertEquals(crewFrameTierForLevel(5), 'tempo');
  assertEquals(crewFrameTierForLevel(9), 'tempo');
  assertEquals(crewFrameTierForLevel(10), 'race');
  assertEquals(crewFrameTierForLevel(15), 'carbon');
  assertEquals(crewFrameTierForLevel(20), 'elite');
  assertEquals(crewFrameTierForLevel(30), 'legend');
});

// ─── §39 Crew Chest ────────────────────────────────────────────────────────────

Deno.test('chestProgressDelta : somme pondérée, sources absentes ignorées', () => {
  // 10 hex capturés (×1) + 1 route (×25) + 1 mission (×20) = 55
  assertEquals(chestProgressDelta({ hexCaptured: 10, routeOpened: 1, missionCompleted: 1 }), 55);
  assertEquals(chestProgressDelta({}), 0);
  assertEquals(chestProgressDelta({ hexCaptured: -5 }), 0); // négatif clampé
});

Deno.test('chestTierFor : paliers 25/50/75/100/150 %', () => {
  const T = CREW_CHEST_WEEKLY_TARGET;
  assertEquals(chestTierFor(0), null);
  assertEquals(chestTierFor(T * 0.25 - 1), null);
  assertEquals(chestTierFor(T * 0.25), 'bronze');
  assertEquals(chestTierFor(T * 0.5), 'silver');
  assertEquals(chestTierFor(T * 0.75), 'gold');
  assertEquals(chestTierFor(T), 'carbon');
  assertEquals(chestTierFor(T * 1.49), 'carbon');
  assertEquals(chestTierFor(T * 1.5), 'elite');
  assertEquals(chestTierFor(T * 10), 'elite'); // au-delà : elite reste le max MVP
});

// ─── §45 Crew Activity Score ────────────────────────────────────────────────────

Deno.test('activityScore : crew mort = 0 / dormant', () => {
  const zero: ActivityScoreInput = {
    activeMembers7d: 0,
    verifiedRunsRatio: 0,
    missionsRatio: 0,
    coordinationRatio: 0,
    defenseRatio: 0,
    fairPlayRatio: 0,
  };
  assertEquals(activityScore(zero), { score: 0, status: 'dormant' });
});

Deno.test('activityScore : crew parfait = 100 / war_ready', () => {
  const full: ActivityScoreInput = {
    activeMembers7d: 1,
    verifiedRunsRatio: 1,
    missionsRatio: 1,
    coordinationRatio: 1,
    defenseRatio: 1,
    fairPlayRatio: 1,
  };
  assertEquals(activityScore(full), { score: 100, status: 'war_ready' });
});

Deno.test('activityScore : composantes bornées à [0,1]', () => {
  const over: ActivityScoreInput = {
    activeMembers7d: 5, // > 1 → clampé
    verifiedRunsRatio: 2,
    missionsRatio: 2,
    coordinationRatio: 2,
    defenseRatio: 2,
    fairPlayRatio: 2,
  };
  assertEquals(activityScore(over).score, 100);
});

Deno.test('activityStatusForScore : bornes exactes §45', () => {
  assertEquals(activityStatusForScore(ACTIVITY_STATUS_THRESHOLDS.dormant), 'dormant');
  assertEquals(activityStatusForScore(ACTIVITY_STATUS_THRESHOLDS.casual - 1), 'dormant');
  assertEquals(activityStatusForScore(ACTIVITY_STATUS_THRESHOLDS.casual), 'casual');
  assertEquals(activityStatusForScore(ACTIVITY_STATUS_THRESHOLDS.active), 'active');
  assertEquals(activityStatusForScore(ACTIVITY_STATUS_THRESHOLDS.competitive), 'competitive');
  assertEquals(activityStatusForScore(ACTIVITY_STATUS_THRESHOLDS.war_ready), 'war_ready');
  assertEquals(activityStatusForScore(100), 'war_ready');
});

// ─── §38.3 Résultat d'offensive ─────────────────────────────────────────────────

Deno.test('offensiveResult : victory / partial / fail', () => {
  assertEquals(offensiveResult(800, 800), 'victory'); // 100 %
  assertEquals(offensiveResult(1000, 800), 'victory'); // > 100 %
  assertEquals(offensiveResult(400, 800), 'partial'); // 50 %
  assertEquals(offensiveResult(799, 800), 'partial'); // ~99 %
  assertEquals(offensiveResult(399, 800), 'fail'); // < 50 %
  assertEquals(offensiveResult(0, 800), 'fail');
});

Deno.test('offensiveResult : objectif nul = garde-fou', () => {
  assertEquals(offensiveResult(1, 0), 'victory');
  assertEquals(offensiveResult(0, 0), 'fail');
});

// ─── §38 Zone d'offensive (haversine) ────────────────────────────────────────

Deno.test('withinOffensiveZone : dans / hors rayon', () => {
  const center = { lat: 48.8566, lng: 2.3522 }; // Paris
  assert(withinOffensiveZone(center, center, 1)); // point central
  // ~1,1 km au nord (~0,01° lat) dans un rayon de 2 km.
  assert(withinOffensiveZone({ lat: 48.8666, lng: 2.3522 }, center, 2));
  // Lille (~200 km) hors d'un rayon de 5 km.
  assert(!withinOffensiveZone({ lat: 50.6292, lng: 3.0573 }, center, 5));
});

// ─── AMENDEMENT-16 §3 — Permissions rôle façon clan (doc §8) ─────────────────

Deno.test('hasCrewPermission : founder peut tout, périmètres §8 respectés', () => {
  for (const action of Object.keys(CREW_PERMISSIONS) as (keyof typeof CREW_PERMISSIONS)[]) {
    assert(hasCrewPermission('founder', action), `founder doit pouvoir ${action}`);
  }
  // Founder seul : nom/blason, recrutement, transfert, archivage.
  for (const action of ['changeNameEmblem', 'manageRecruitment', 'transferFoundership', 'archiveCrew'] as const) {
    assert(!hasCrewPermission('co_captain', action), `co_captain ne doit pas ${action}`);
  }
  // Direction : lancer une offensive = co_captain+ (captain PROPOSE seulement).
  assert(hasCrewPermission('co_captain', 'launchOffensive'));
  assert(!hasCrewPermission('captain', 'launchOffensive'));
  assert(hasCrewPermission('captain', 'proposeOffensive'));
  // Terrain captain : sorties, défense, ping, missions de la semaine.
  assert(hasCrewPermission('captain', 'assignDefense'));
  assert(!hasCrewPermission('strategist', 'assignDefense'));
  // Tactique strategist : routes recommandées, scout ping, plans.
  assert(hasCrewPermission('strategist', 'createRecommendedRoute'));
  assert(hasCrewPermission('strategist', 'useScoutPing'));
  assert(!hasCrewPermission('scout', 'useScoutPing'));
  // Exploration scout : routes, reports, avant-postes.
  assert(hasCrewPermission('scout', 'createScoutReport'));
  assert(hasCrewPermission('scout', 'proposeOutpost'));
  assert(!hasCrewPermission('runner', 'createScoutReport'));
});

Deno.test('hasCrewPermission : restrictions rookie §8.7 (essai 7 j)', () => {
  // Pas d'objets crew, pas de ping massif, War Room limitée.
  assert(!hasCrewPermission('rookie', 'useCrewItems'));
  assert(!hasCrewPermission('rookie', 'massPing'));
  assert(!hasCrewPermission('rookie', 'readWarRoomStats'));
  assert(!hasCrewPermission('rookie', 'inviteViaLink'));
  // Mais il participe : chat, réactions, sorties (contribution comptée).
  assert(hasCrewPermission('rookie', 'chat'));
  assert(hasCrewPermission('rookie', 'react'));
  assert(hasCrewPermission('rookie', 'joinOuting'));
  assert(ROOKIE_RESTRICTIONS.contributionCounted);
  // Le runner standard, lui, a tout ça.
  assert(hasCrewPermission('runner', 'useCrewItems'));
  assert(hasCrewPermission('runner', 'readWarRoomStats'));
});

Deno.test('canKickMember : founder tout sauf founder ; co_captain périmètre §8.2', () => {
  assert(canKickMember('founder', 'co_captain'));
  assert(canKickMember('founder', 'rookie'));
  assert(!canKickMember('founder', 'founder'));
  // co_captain : Rookie/Runner/Scout uniquement — jamais founder ni co_captain.
  assert(canKickMember('co_captain', 'rookie'));
  assert(canKickMember('co_captain', 'runner'));
  assert(canKickMember('co_captain', 'scout'));
  assert(!canKickMember('co_captain', 'strategist'));
  assert(!canKickMember('co_captain', 'captain'));
  assert(!canKickMember('co_captain', 'co_captain'));
  assert(!canKickMember('co_captain', 'founder'));
  // Les autres rôles n'excluent personne.
  assert(!canKickMember('captain', 'rookie'));
  assert(!canKickMember('runner', 'rookie'));
});

Deno.test('canPromoteTo : founder tout sauf founder ; co_captain jusqu à strategist', () => {
  assert(canPromoteTo('founder', 'co_captain'));
  assert(canPromoteTo('founder', 'runner'));
  assert(!canPromoteTo('founder', 'founder')); // transfert dédié
  assert(canPromoteTo('co_captain', 'strategist'));
  assert(canPromoteTo('co_captain', 'runner'));
  assert(!canPromoteTo('co_captain', 'captain'));
  assert(!canPromoteTo('co_captain', 'co_captain'));
  assert(!canPromoteTo('co_captain', 'founder'));
  assert(!canPromoteTo('captain', 'runner')); // pas la permission promote
});

Deno.test('crewRoleRank : ordre hiérarchique CREW_ROLES (rookie < … < founder)', () => {
  const ranks = CREW_ROLES.map((r) => crewRoleRank(r));
  for (let i = 1; i < ranks.length; i++) assert(ranks[i]! > ranks[i - 1]!);
  assertEquals(crewRoleRank('rookie'), 0);
  assertEquals(crewRoleRank('founder'), CREW_ROLES.length - 1);
});

Deno.test('canLeaveCrew : le founder ne quitte pas sans transfert (§8.1)', () => {
  assert(!canLeaveCrew('founder'));
  assert(canLeaveCrew('co_captain'));
  assert(canLeaveCrew('rookie'));
});

Deno.test('rookieTrialEndsAt / isRookieTrialOver : bornes exactes ROOKIE_TRIAL_DAYS', () => {
  const start = Date.UTC(2026, 6, 1); // horloge fournie par l'appelant (PURE)
  const end = rookieTrialEndsAt(start);
  assertEquals(end - start, ROOKIE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  assert(!isRookieTrialOver(start, end - 1));
  assert(isRookieTrialOver(start, end)); // borne incluse : essai fini pile à J+7
  assert(isRookieTrialOver(start, end + 1));
});

// ─── AMENDEMENT-34 §DELTA-CLASH — crewSeasonScore (topN plus actifs) ──────────

Deno.test('crewSeasonScore : somme toutes les contributions sous le seuil topN', () => {
  // Moins de topN contributeurs → toutes comptent.
  assertEquals(crewSeasonScore([10, 20, 30]), 60);
  assertEquals(crewSeasonScore([]), 0);
});

Deno.test('crewSeasonScore : ne garde que les topN PLUS GRANDES contributions', () => {
  // 4 contributions, topN=2 → 40 + 30 = 70 (les deux plus grandes).
  assertEquals(crewSeasonScore([10, 40, 20, 30], 2), 70);
  // L'ordre d'entrée n'importe pas (tri desc interne).
  assertEquals(crewSeasonScore([30, 20, 40, 10], 2), 70);
});

Deno.test('crewSeasonScore : un gros crew ne score que sur CREW_SCORE_TOP_ACTIVE membres', () => {
  // 40 membres à 100 chacun, défaut topN = CREW_SCORE_TOP_ACTIVE → 30 × 100.
  const contribs = Array.from({ length: 40 }, () => 100);
  assertEquals(crewSeasonScore(contribs), CREW_SCORE_TOP_ACTIVE * 100);
  // Ajouter des membres FAIBLES au-delà du top ne change pas le score.
  assertEquals(crewSeasonScore([...contribs, 1, 2, 3]), CREW_SCORE_TOP_ACTIVE * 100);
});

Deno.test('crewSeasonScore : contributions négatives ignorées (plancher 0/membre)', () => {
  assertEquals(crewSeasonScore([50, -100, 20], 3), 70);
  assertEquals(crewSeasonScore([-5, -10], 3), 0);
});

Deno.test('crewSeasonScore : topN ≤ 0 → 0 (aucun membre ne compte)', () => {
  assertEquals(crewSeasonScore([10, 20, 30], 0), 0);
  assertEquals(crewSeasonScore([10, 20, 30], -1), 0);
});
