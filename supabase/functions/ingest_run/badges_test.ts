/**
 * Tests badges.ts — AMENDEMENT-04 : catalogue (§1/§2), interprétations gelées
 * (§3), dormants (§4), attribution pure (applyRunToStats + evaluateBadges).
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  BADGE_COUNT,
  BADGE_FAMILY_COLORS,
  BADGES,
  BADGES_BY_KEY,
} from '../_shared/badges.ts';
import {
  applyRunToStats,
  emptyLifetimeStats,
  evaluateBadges,
  localClock,
  type BadgeRunInput,
  type LifetimeStats,
} from '../_shared/engine/badges.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PARIS = { lat: 48.8566, lng: 2.3522 };
/** Point à ~`m` mètres à l'est de `from` (1° lng ≈ 73 km à Paris). */
const eastOf = (from: { lat: number; lng: number }, m: number) => ({
  lat: from.lat,
  lng: from.lng + m / 73_000,
});

function mkRun(over: Partial<BadgeRunInput> = {}): BadgeRunInput {
  return {
    status: 'valid',
    startedAt: '2026-07-03T10:00:00+02:00',
    distanceM: 5_000,
    durationS: 1_800,
    avgPaceSKm: 360,
    hexes: { claimed: 5, stolen: 0, defended: 0, pioneer: 0 },
    startPoint: PARIS,
    endPoint: eastOf(PARIS, 1_500),
    crewSize: 0,
    duringSeasonZero: true,
    ...over,
  };
}

const NONE: ReadonlySet<string> = new Set();

/** Applique n courses successives. */
function applyAll(runs: BadgeRunInput[], from = emptyLifetimeStats()): LifetimeStats {
  return runs.reduce((s, r) => applyRunToStats(s, r), from);
}

// ─── Catalogue (§1/§2) ────────────────────────────────────────────────────────

Deno.test('catalogue : 59 badges (50 + 9 secrets), keys uniques en snake_case', () => {
  assertEquals(BADGE_COUNT, 59);
  assertEquals(new Set(BADGES.map((b) => b.key)).size, 59);
  for (const b of BADGES) assert(/^[a-z0-9_]+$/.test(b.key), `key non snake_case : ${b.key}`);
  assertEquals(BADGES.filter((b) => b.secret).length, 9);
});

Deno.test('catalogue : 10 badges par famille visible, 9 secrets, couleurs de famille', () => {
  const byFamily = new Map<string, number>();
  for (const b of BADGES) {
    byFamily.set(b.family, (byFamily.get(b.family) ?? 0) + 1);
    assertEquals(b.familyColor, BADGE_FAMILY_COLORS[b.family]);
    assertEquals(b.family === 'secret', b.secret === true, `secret incohérent : ${b.key}`);
  }
  for (const family of ['fondateur', 'performance', 'territoire', 'crew', 'special'] as const) {
    assertEquals(byFamily.get(family), 10, `famille ${family}`);
  }
  assertEquals(byFamily.get('secret'), 9);
});

Deno.test('catalogue : les 10 dormants attendus (§4), avec raison', () => {
  const dormant = BADGES.filter((b) => b.dormant !== undefined).map((b) => b.key).sort();
  assertEquals(dormant, [
    'batisseur',
    'batisseur_crew',
    'chaleur',
    'connecteur',
    'dynastie',
    'evenement',
    'hiver',
    'legende_crew',
    'meteo',
    'stratege',
  ]);
  for (const key of dormant) assert((BADGES_BY_KEY.get(key)!.dormant ?? '').length > 0);
});

// ─── Seuils exacts ────────────────────────────────────────────────────────────

Deno.test('seuil exact : 499 → 500 hexes capturés décerne Conquérant, pas avant', () => {
  const at499 = { ...emptyLifetimeStats(), hexesCaptured: 499 };
  const after = applyRunToStats(at499, mkRun({ hexes: { claimed: 1, stolen: 0, defended: 0, pioneer: 0 } }));
  assertEquals(after.hexesCaptured, 500);
  assert(evaluateBadges(at499, after, NONE).includes('conquerant'));
  // Un hex de moins : rien.
  const at498 = { ...emptyLifetimeStats(), hexesCaptured: 498 };
  const at499b = applyRunToStats(at498, mkRun({ hexes: { claimed: 1, stolen: 0, defended: 0, pioneer: 0 } }));
  assertFalse(evaluateBadges(at498, at499b, NONE).includes('conquerant'));
});

Deno.test('non-répétition : un badge déjà gagné n\'est jamais ré-attribué', () => {
  const before = emptyLifetimeStats();
  const after = applyRunToStats(before, mkRun());
  assert(evaluateBadges(before, after, NONE).includes('premiers_pas'));
  assertFalse(evaluateBadges(before, after, new Set(['premiers_pas'])).includes('premiers_pas'));
});

Deno.test('dormants : jamais décernés même seuil largement franchi (§4)', () => {
  const before = emptyLifetimeStats();
  const after: LifetimeStats = {
    ...applyRunToStats(before, mkRun({ crewSize: 100 })),
    rainRuns: 5,
    snowRuns: 5,
    heatRuns: 5,
    eventRuns: 5,
    outposts: 10,
    routes: 10,
    crewOutposts: 20,
    crewRoutes: 20,
    sectorsVisited: 50,
  };
  const earned = evaluateBadges(before, after, NONE);
  for (const b of BADGES.filter((b) => b.dormant !== undefined)) {
    assertFalse(earned.includes(b.key), `dormant décerné : ${b.key}`);
  }
  // maxCrewSize 100 franchit bien Commandant (10, non dormant)…
  assert(earned.includes('commandant'));
  // …mais jamais Légende Crew / Dynastie (cap crew, §4).
  assertFalse(earned.includes('legende_crew'));
  assertFalse(earned.includes('dynastie'));
});

// ─── applyRunToStats : interprétations gelées (§3) ────────────────────────────

Deno.test('course rejetée ou gelée : stats strictement inchangées', () => {
  const before = emptyLifetimeStats();
  assertEquals(applyRunToStats(before, mkRun({ status: 'rejected' })), before);
  assertEquals(applyRunToStats(before, mkRun({ status: 'flagged' })), before);
});

Deno.test('applyRunToStats est pur : l\'entrée n\'est jamais mutée', () => {
  const before = emptyLifetimeStats();
  const snapshot = { ...before };
  applyRunToStats(before, mkRun());
  assertEquals(before, snapshot);
});

Deno.test('partial compte comme course valide (AMENDEMENT-02 §4)', () => {
  const after = applyRunToStats(emptyLifetimeStats(), mkRun({ status: 'partial' }));
  assertEquals(after.runsValid, 1);
});

Deno.test('jours actifs DISTINCTS : 2 courses le même jour = 1 jour actif', () => {
  const after = applyAll([
    mkRun({ startedAt: '2026-07-03T08:00:00+02:00' }),
    mkRun({ startedAt: '2026-07-03T19:00:00+02:00' }),
    mkRun({ startedAt: '2026-07-04T08:00:00+02:00' }),
  ]);
  assertEquals(after.activeDays, 2);
  assertEquals(after.runsValid, 3);
});

Deno.test('streak de jours consécutifs : suit, casse, garde le meilleur', () => {
  const days = ['2026-07-01', '2026-07-02', '2026-07-03', /* trou */ '2026-07-05'];
  const after = applyAll(days.map((d) => mkRun({ startedAt: `${d}T09:00:00+02:00` })));
  assertEquals(after.bestActiveDayStreak, 3);
  assertEquals(after.activeDayStreak, 1); // cassé par le trou du 4
  assertEquals(after.activeDays, 4);
});

Deno.test('hexes capturés = neutres + volés (§3) ; vols et défenses comptés à part', () => {
  const after = applyRunToStats(
    emptyLifetimeStats(),
    mkRun({ hexes: { claimed: 2, stolen: 3, defended: 4, pioneer: 1 } }),
  );
  assertEquals(after.hexesCaptured, 5);
  assertEquals(after.steals, 3);
  assertEquals(after.defends, 4);
  assertEquals(after.pioneerHexes, 1);
  assertEquals(after.maxHexesInRun, 5);
});

Deno.test('solo vs crew : soloRuns sans crew ; contribution = ≥ 1 hex claimé en crew (§3)', () => {
  const solo = applyRunToStats(emptyLifetimeStats(), mkRun({ crewSize: 0 }));
  assertEquals(solo.soloRuns, 1);
  assertEquals(solo.crewContributions, 0);
  assertEquals(solo.crewsJoined, 0);

  const crew = applyRunToStats(emptyLifetimeStats(), mkRun({ crewSize: 5 }));
  assertEquals(crew.soloRuns, 0);
  assertEquals(crew.crewContributions, 1);
  assertEquals(crew.crewsJoined, 1);
  assertEquals(crew.maxCrewSize, 5);

  // Course en crew SANS hex claimé : pas une contribution.
  const idle = applyRunToStats(
    emptyLifetimeStats(),
    mkRun({ crewSize: 5, hexes: { claimed: 0, stolen: 0, defended: 3, pioneer: 0 } }),
  );
  assertEquals(idle.crewContributions, 0);
});

Deno.test('nocturne 22 h-5 h BORNES COMPRISES ; aube 5 h-7 h (§3)', () => {
  const at = (time: string) =>
    applyRunToStats(emptyLifetimeStats(), mkRun({ startedAt: `2026-07-03T${time}:00+02:00` }));
  assertEquals(at('22:00').nightRuns, 1); // borne basse comprise
  assertEquals(at('21:59').nightRuns, 0);
  assertEquals(at('03:30').nightRuns, 1);
  assertEquals(at('05:00').nightRuns, 1); // borne haute comprise…
  assertEquals(at('05:00').dawnRuns, 1); // …et 05:00 pile = aussi l'aube
  assertEquals(at('05:01').nightRuns, 0);
  assertEquals(at('05:01').dawnRuns, 1);
  assertEquals(at('06:59').dawnRuns, 1);
  assertEquals(at('07:00').dawnRuns, 0);
});

Deno.test('Dévoué (42 km CUMULÉS) ≠ Marathonien (42,195 km en UNE course)', () => {
  // 5 courses de 8,4 km : cumul 42 km → Dévoué, jamais Marathonien.
  const before = emptyLifetimeStats();
  const cumul = applyAll(
    Array.from({ length: 5 }, (_, i) =>
      mkRun({ distanceM: 8_400, startedAt: `2026-07-0${i + 1}T10:00:00+02:00` })),
  );
  assertEquals(cumul.totalDistanceM, 42_000);
  const earned = evaluateBadges(before, cumul, NONE);
  assert(earned.includes('devoue'));
  assertFalse(earned.includes('marathonien'));

  // Une course de 42 195 m → Marathonien (+ Endurance, Persévérant, Dévoué).
  const one = applyRunToStats(before, mkRun({ distanceM: 42_195, durationS: 15_000, avgPaceSKm: 355 }));
  const earnedOne = evaluateBadges(before, one, NONE);
  for (const k of ['marathonien', 'endurance', 'perseverant', 'devoue']) {
    assert(earnedOne.includes(k), `${k} manquant`);
  }
});

Deno.test('Sprinter : allure < 4:00/km STRICT sur course valide', () => {
  const fast = applyRunToStats(emptyLifetimeStats(), mkRun({ avgPaceSKm: 239 }));
  assertEquals(fast.sprintRuns, 1);
  assert(evaluateBadges(emptyLifetimeStats(), fast, NONE).includes('sprinter'));
  const exact = applyRunToStats(emptyLifetimeStats(), mkRun({ avgPaceSKm: 240 }));
  assertEquals(exact.sprintRuns, 0); // 4:00 pile ne compte pas
});

// ─── Secrets ──────────────────────────────────────────────────────────────────

Deno.test('secret « La Boucle » : arrivée < 100 m du départ', () => {
  const before = emptyLifetimeStats();
  const loop = applyRunToStats(before, mkRun({ endPoint: eastOf(PARIS, 50) }));
  assert(evaluateBadges(before, loop, NONE).includes('secret_la_boucle'));
  const open = applyRunToStats(before, mkRun({ endPoint: eastOf(PARIS, 150) }));
  assertFalse(evaluateBadges(before, open, NONE).includes('secret_la_boucle'));
});

Deno.test('secret « Dix Pile » : 10,00 km ± 1 %', () => {
  const before = emptyLifetimeStats();
  for (const [distanceM, expected] of [[10_000, true], [10_100, true], [9_900, true], [10_101, false], [9_899, false]] as const) {
    const after = applyRunToStats(before, mkRun({ distanceM }));
    assertEquals(
      evaluateBadges(before, after, NONE).includes('secret_dix_pile'),
      expected,
      `${distanceM} m`,
    );
  }
});

Deno.test('secret « Triplé » : 3 courses validées le même jour', () => {
  const before = emptyLifetimeStats();
  const two = applyAll([
    mkRun({ startedAt: '2026-07-03T08:00:00+02:00' }),
    mkRun({ startedAt: '2026-07-03T12:00:00+02:00' }),
  ]);
  assertFalse(evaluateBadges(before, two, NONE).includes('secret_triple'));
  const three = applyRunToStats(two, mkRun({ startedAt: '2026-07-03T19:00:00+02:00' }));
  assertEquals(three.maxRunsInOneDay, 3);
  assert(evaluateBadges(two, three, NONE).includes('secret_triple'));
});

Deno.test('secret « Heure du Loup » : départ 3 h-4 h (cumule avec Nocturne)', () => {
  const before = emptyLifetimeStats();
  const wolf = applyRunToStats(before, mkRun({ startedAt: '2026-07-03T03:30:00+02:00' }));
  const earned = evaluateBadges(before, wolf, NONE);
  assert(earned.includes('secret_heure_du_loup'));
  assert(earned.includes('nocturne')); // 3 h 30 est aussi dans 22 h-5 h
  const early = applyRunToStats(before, mkRun({ startedAt: '2026-07-03T04:00:00+02:00' }));
  assertFalse(evaluateBadges(before, early, NONE).includes('secret_heure_du_loup'));
});

Deno.test('secret « Ligne Droite » : ≥ 2 km, arrivée ≥ 95 % de la distance à vol d\'oiseau', () => {
  const before = emptyLifetimeStats();
  const straight = applyRunToStats(
    before,
    mkRun({ distanceM: 3_000, endPoint: eastOf(PARIS, 2_900) }),
  );
  assert(evaluateBadges(before, straight, NONE).includes('secret_ligne_droite'));
  // Trop sinueuse (2 km courus, 1 km à vol d'oiseau) : non.
  const wiggly = applyRunToStats(
    before,
    mkRun({ distanceM: 2_000, endPoint: eastOf(PARIS, 1_000) }),
  );
  assertFalse(evaluateBadges(before, wiggly, NONE).includes('secret_ligne_droite'));
});

Deno.test('secret « Centurion » : 100 hexes capturés en une course', () => {
  const before = emptyLifetimeStats();
  const big = applyRunToStats(before, mkRun({ hexes: { claimed: 60, stolen: 40, defended: 0, pioneer: 0 } }));
  assert(evaluateBadges(before, big, NONE).includes('secret_centurion'));
});

Deno.test('secret « Première Foulée de l\'An » : un 1ᵉʳ janvier', () => {
  const before = emptyLifetimeStats();
  const jan1 = applyRunToStats(before, mkRun({ startedAt: '2027-01-01T11:00:00+01:00' }));
  assert(evaluateBadges(before, jan1, NONE).includes('secret_premiere_foulee'));
});

Deno.test('secret « Semaine Parfaite » : 7 jours consécutifs, pas 7 jours épars', () => {
  const before = emptyLifetimeStats();
  const week = applyAll(
    Array.from({ length: 7 }, (_, i) =>
      mkRun({ startedAt: `2026-07-${String(i + 1).padStart(2, '0')}T09:00:00+02:00` })),
  );
  assert(evaluateBadges(before, week, NONE).includes('secret_semaine_parfaite'));
  // 7 jours actifs NON consécutifs (1 sur 2) : Implanté oui, Semaine Parfaite non.
  const spread = applyAll(
    Array.from({ length: 7 }, (_, i) =>
      mkRun({ startedAt: `2026-07-${String(2 * i + 1).padStart(2, '0')}T09:00:00+02:00` })),
  );
  const earned = evaluateBadges(before, spread, NONE);
  assert(earned.includes('implante'));
  assertFalse(earned.includes('secret_semaine_parfaite'));
});

Deno.test('secret « Fidèle au Poste » : 10 départs dans la même cellule H3 res 9', () => {
  const before = emptyLifetimeStats();
  const home = applyAll(Array.from({ length: 10 }, () => mkRun({ startPoint: PARIS })));
  assertEquals(home.homeSpotRuns, 10);
  assert(evaluateBadges(before, home, NONE).includes('secret_fidele_au_poste'));
  // Un départ ailleurs (≫ res 9) ne compte pas pour le spot.
  const away = applyRunToStats(home, mkRun({ startPoint: eastOf(PARIS, 5_000) }));
  assertEquals(away.homeSpotRuns, 10);
});

// ─── Divers ───────────────────────────────────────────────────────────────────

Deno.test('localClock lit l\'heure locale TEXTUELLEMENT (offset conservé)', () => {
  assertEquals(localClock('2026-07-03T22:14:00+02:00'), { date: '2026-07-03', minutes: 22 * 60 + 14 });
  assertEquals(localClock('2026-07-03T04:05:00Z'), { date: '2026-07-03', minutes: 4 * 60 + 5 });
  assertEquals(localClock('pas une date'), null);
});

Deno.test('plusieurs badges décernés d\'un coup, franchis pendant la course d\'abord', () => {
  // Profil jamais persisté : hexesCaptured déjà à 600 (rattrapage Conquérant),
  // la course fait franchir Premiers Pas/Fondateur (crossed).
  const before = { ...emptyLifetimeStats(), hexesCaptured: 600 };
  const after = applyRunToStats(before, mkRun());
  const earned = evaluateBadges(before, after, NONE);
  assert(earned.includes('premiers_pas'));
  assert(earned.includes('conquerant')); // rattrapage : seuil déjà atteint avant
  assert(earned.indexOf('premiers_pas') < earned.indexOf('conquerant'));
});

Deno.test('Saison 0 (1 hex S0) — hors Saison 0 : rien', () => {
  const before = emptyLifetimeStats();
  const s0 = applyRunToStats(before, mkRun({ duringSeasonZero: true }));
  const earnedS0 = evaluateBadges(before, s0, NONE);
  assert(earnedS0.includes('saison_0'));
  const later = applyRunToStats(before, mkRun({ duringSeasonZero: false }));
  const earnedLater = evaluateBadges(before, later, NONE);
  assertFalse(earnedLater.includes('saison_0'));
});

Deno.test('Fondateur = 10 hexes capturés cumulés (planche, plus lié à la S0)', () => {
  const at9 = { ...emptyLifetimeStats(), hexesCaptured: 9 };
  const at10 = applyRunToStats(at9, mkRun({ hexes: { claimed: 1, stolen: 0, defended: 0, pioneer: 0 } }));
  assertEquals(at10.hexesCaptured, 10);
  assert(evaluateBadges(at9, at10, NONE).includes('fondateur'));
});

Deno.test('Explorateur : capture en zone pionnière/sauvage (inPioneerZone)', () => {
  const before = emptyLifetimeStats();
  const pioneer = applyRunToStats(before, mkRun({ inPioneerZone: true }));
  assertEquals(pioneer.pioneerZoneRuns, 1);
  assert(evaluateBadges(before, pioneer, NONE).includes('explorateur'));
  // Zone dense (défaut) : pas d'Explorateur.
  const dense = applyRunToStats(before, mkRun({}));
  assertFalse(evaluateBadges(before, dense, NONE).includes('explorateur'));
  // En zone pionnière SANS capture : ne compte pas.
  const noCapture = applyRunToStats(before, mkRun({
    inPioneerZone: true,
    hexes: { claimed: 0, stolen: 0, defended: 3, pioneer: 0 },
  }));
  assertEquals(noCapture.pioneerZoneRuns, 0);
});

Deno.test('Solitaire : 10ᵉ course solo — une course en crew ne compte pas', () => {
  const nine = applyAll(Array.from({ length: 9 }, (_, i) =>
    mkRun({ startedAt: `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00+02:00` })));
  assertEquals(nine.soloRuns, 9);
  const withCrew = applyRunToStats(nine, mkRun({ crewSize: 4 }));
  assertFalse(evaluateBadges(nine, withCrew, NONE).includes('solitaire'));
  const tenth = applyRunToStats(nine, mkRun());
  assert(evaluateBadges(nine, tenth, NONE).includes('solitaire'));
});
