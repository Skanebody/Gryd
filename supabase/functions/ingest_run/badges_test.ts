/**
 * Tests badges.ts — AMENDEMENT-04 : catalogue (§1/§2), interprétations gelées
 * (§3), tous attribuables (§4, décision fondateur 03/07/2026), attribution
 * pure (applyRunToStats + evaluateBadges) et décisions pures des nouvelles
 * mécaniques (weatherFlags / shouldCreateOutpost / shouldOpenRoute /
 * inEventWindow) — AUCUN réseau ici, fetchWeather (I/O fail-open) non testé.
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import { BADGE_COUNT, BADGE_FAMILY_COLORS, BADGES } from '../_shared/badges.ts';
import {
  applyRunToStats,
  emptyLifetimeStats,
  evaluateBadges,
  inEventWindow,
  localClock,
  shouldCreateOutpost,
  shouldOpenRoute,
  weatherFlags,
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

Deno.test('catalogue : plus AUCUN dormant — les 59 badges sont attribuables (§4)', () => {
  for (const b of BADGES) {
    assertEquals(
      (b as unknown as Record<string, unknown>).dormant,
      undefined,
      `badge dormant résiduel : ${b.key}`,
    );
  }
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

// ─── Ex-dormants : tous DÉCERNABLES via evaluateBadges (§4, 03/07/2026) ───────

Deno.test('Météo/Hiver/Chaleur/Événement : décernés dès la première course concernée', () => {
  const before = emptyLifetimeStats();
  const after = applyRunToStats(
    before,
    mkRun({ weather: { rain: true, snow: true, heat: true }, duringEvent: true }),
  );
  assertEquals(after.rainRuns, 1);
  assertEquals(after.snowRuns, 1);
  assertEquals(after.heatRuns, 1);
  assertEquals(after.eventRuns, 1);
  const earned = evaluateBadges(before, after, NONE);
  for (const key of ['meteo', 'hiver', 'chaleur', 'evenement']) {
    assert(earned.includes(key), `${key} manquant`);
  }
});

Deno.test('météo indisponible (fail-open) : weather null/absent = aucune stat météo', () => {
  const withNull = applyRunToStats(emptyLifetimeStats(), mkRun({ weather: null }));
  const without = applyRunToStats(emptyLifetimeStats(), mkRun());
  for (const s of [withNull, without]) {
    assertEquals(s.rainRuns, 0);
    assertEquals(s.snowRuns, 0);
    assertEquals(s.heatRuns, 0);
  }
  // …et la course reste comptée normalement.
  assertEquals(withNull.runsValid, 1);
});

Deno.test('Bâtisseur/Connecteur/Bâtisseur Crew : décernés à la première fondation', () => {
  const before = emptyLifetimeStats();
  const after = applyRunToStats(
    before,
    mkRun({ crewSize: 3, newOutposts: 1, newRoutes: 1, newCrewOutposts: 1, newCrewRoutes: 1 }),
  );
  assertEquals(after.outposts, 1);
  assertEquals(after.routes, 1);
  assertEquals(after.crewOutposts, 1);
  assertEquals(after.crewRoutes, 1);
  const earned = evaluateBadges(before, after, NONE);
  assert(earned.includes('batisseur')); // 1 avant-poste
  assert(earned.includes('connecteur')); // 1 route
  assert(earned.includes('batisseur_crew')); // 1 route crew
  assertFalse(earned.includes('stratege')); // 10 avant-postes crew requis
});

Deno.test('Stratège : décerné au 10ᵉ avant-poste crew', () => {
  const atNine = { ...emptyLifetimeStats(), crewOutposts: 9 };
  const after = applyRunToStats(atNine, mkRun({ crewSize: 3, newOutposts: 1, newCrewOutposts: 1 }));
  assertEquals(after.crewOutposts, 10);
  assert(evaluateBadges(atNine, after, NONE).includes('stratege'));
});

Deno.test('avant-poste/route solo : les compteurs crew ne bougent pas', () => {
  const after = applyRunToStats(emptyLifetimeStats(), mkRun({ newOutposts: 1, newRoutes: 1 }));
  assertEquals(after.outposts, 1);
  assertEquals(after.routes, 1);
  assertEquals(after.crewOutposts, 0);
  assertEquals(after.crewRoutes, 0);
});

Deno.test('Légende Crew / Dynastie : plus dormants — décernables au seuil (cap 10 = objectif lointain)', () => {
  const before = emptyLifetimeStats();
  const after = applyRunToStats(before, mkRun({ crewSize: 100 }));
  const earned = evaluateBadges(before, after, NONE);
  assert(earned.includes('commandant'));
  assert(earned.includes('legende_crew'));
  assert(earned.includes('dynastie'));
});

// ─── Décisions pures des nouvelles mécaniques ─────────────────────────────────

Deno.test('weatherFlags : seuils PILE inclus (pluie 0,5 mm/h, neige 0,1 cm/h, chaleur 30 °C)', () => {
  // Bornes exactes : le seuil pile déclenche.
  assertEquals(
    weatherFlags({ tempC: 30, precipMmH: 0.5, snowCmH: 0.1 }),
    { rain: true, snow: true, heat: true },
  );
  // Juste sous chaque seuil : rien.
  assertEquals(
    weatherFlags({ tempC: 29.9, precipMmH: 0.49, snowCmH: 0.09 }),
    { rain: false, snow: false, heat: false },
  );
  // Pluie franche, temps frais : pluie seule.
  assertEquals(
    weatherFlags({ tempC: 12, precipMmH: 2.4, snowCmH: 0 }),
    { rain: true, snow: false, heat: false },
  );
});

Deno.test('shouldCreateOutpost : 100 hexes pile oui, 99 non, avant-poste existant non', () => {
  assert(shouldCreateOutpost(100, 0)); // OUTPOST_MIN_HEXES pile
  assertFalse(shouldCreateOutpost(99, 0)); // un hex de moins
  assertFalse(shouldCreateOutpost(250, 1)); // déjà un avant-poste à ≤ 2 km
  assert(shouldCreateOutpost(250, 0));
});

Deno.test('shouldOpenRoute : bornes (2 km INCLUS), bouts possédés, anti-doublon', () => {
  assert(shouldOpenRoute(true, true, 2, false)); // ROUTE_MIN_KM pile
  assertFalse(shouldOpenRoute(true, true, 1.99, false)); // trop court
  assertFalse(shouldOpenRoute(false, true, 5, false)); // départ non possédé
  assertFalse(shouldOpenRoute(true, false, 5, false)); // arrivée non possédée
  assertFalse(shouldOpenRoute(true, true, 5, true)); // route déjà ouverte
});

Deno.test('inEventWindow : bornes INCLUSES des deux côtés (miroir SQL lte/gte)', () => {
  const event = { startsAt: '2026-07-03T00:00:00+02:00', endsAt: '2026-07-13T23:59:59+02:00' };
  assert(inEventWindow('2026-07-03T00:00:00+02:00', event)); // borne basse INCLUSE
  assert(inEventWindow('2026-07-13T23:59:59+02:00', event)); // borne haute INCLUSE
  assert(inEventWindow('2026-07-08T12:00:00+02:00', event));
  assertFalse(inEventWindow('2026-07-02T23:59:59+02:00', event)); // 1 s avant
  assertFalse(inEventWindow('2026-07-14T00:00:00+02:00', event)); // 1 s après
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
