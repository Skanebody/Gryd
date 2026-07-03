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
  CREW_XP_DAILY_CAP_PER_MEMBER,
  CREW_XP_SOURCES,
  CREW_XP_TABLE,
  PLAYER_LEVEL_MAX,
} from '../_shared/game-rules.ts';
import {
  activityScore,
  activityStatusForScore,
  cappedCrewXp,
  chestProgressDelta,
  chestTierFor,
  crewFrameTierForLevel,
  crewLevelForXp,
  crewXpForRun,
  offensiveResult,
  playerLevelForXp,
  playerLevelXpTable,
  tierForLevel,
  withinOffensiveZone,
  type ActivityScoreInput,
  type CrewXpRunInput,
} from '../_shared/engine/crew.ts';

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
