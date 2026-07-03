/**
 * Tests badges V2 (AMENDEMENT-06 §1/§2/§4) : catalogue à niveaux + tiers,
 * leveledFamily (bornes/roman/legend), multi-niveaux décernés d'un coup,
 * weeksActive (ISO), cleanDays (reset via applyRejectedRun), dédup (±bornes),
 * les 3 nouveaux secrets (Comeback / Silent Takeover / No Map Run), helpers.
 * AUCUN réseau ici.
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  BADGE_COUNT,
  BADGE_FAMILY_COLORS,
  BADGE_TIERS,
  BADGES,
  familyLevels,
  leveledFamily,
  nextLevelOf,
  progressMetricOf,
  type BadgeFamily,
} from '../_shared/badges.ts';
import {
  applyRejectedRun,
  applyRunToStats,
  dedupeActivity,
  emptyLifetimeStats,
  evaluateBadges,
  isoWeek,
  localClock,
  type BadgeRunInput,
  type LifetimeStats,
} from '../_shared/engine/badges.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PARIS = { lat: 48.8566, lng: 2.3522 };
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
function applyAll(runs: BadgeRunInput[], from = emptyLifetimeStats()): LifetimeStats {
  return runs.reduce((s, r) => applyRunToStats(s, r), from);
}

// ─── Catalogue V2 ─────────────────────────────────────────────────────────────

Deno.test('catalogue V2 : keys uniques snake_case, tiers légaux, cohérence secret/legacy', () => {
  assertEquals(new Set(BADGES.map((b) => b.key)).size, BADGE_COUNT);
  const tiers = new Set(BADGE_TIERS);
  for (const b of BADGES) {
    assert(/^[a-z0-9_]+$/.test(b.key), `key non snake_case : ${b.key}`);
    assert(tiers.has(b.tier), `tier illégal : ${b.key}=${b.tier}`);
    assertEquals(b.familyColor, BADGE_FAMILY_COLORS[b.family]);
    // secret ⇔ famille 'secret'
    assertEquals(b.family === 'secret', b.secret === true, `secret incohérent : ${b.key}`);
  }
});

Deno.test('catalogue V2 : 13 familles (+ healthy AMENDEMENT-07), 12 secrets, 18 médailles saison, 3 héritage', () => {
  const fam = new Set(BADGES.map((b) => b.family));
  const expected: BadgeFamily[] = [
    'onboarding', 'distance', 'territoire', 'attaque', 'defense', 'exploration',
    'routes', 'crew', 'performance', 'healthy', 'saison', 'verified', 'secret',
  ];
  for (const f of expected) assert(fam.has(f), `famille manquante : ${f}`);
  assertEquals(fam.size, 13);
  assertEquals(BADGES.filter((b) => b.secret).length, 12);
  assertEquals(BADGES.filter((b) => b.family === 'saison').length, 18);
  assertEquals(BADGES.filter((b) => b.family === 'healthy').length, 5);
  assertEquals(BADGES.filter((b) => b.legacy).length, 3);
});

Deno.test('catalogue V2 : chaque famille progressive a 6 niveaux (1..5 + legend), tier = niveau', () => {
  const slugs = new Set(BADGES.filter((b) => b.familySlug).map((b) => b.familySlug!));
  assert(slugs.size >= 25, `familles progressives : ${slugs.size}`);
  for (const slug of slugs) {
    const levels = familyLevels(slug);
    assertEquals(levels.length, 6, `${slug} n'a pas 6 niveaux`);
    levels.forEach((b, i) => {
      assertEquals(b.level, i + 1);
      assertEquals(b.tier, BADGE_TIERS[i], `${b.key} tier ≠ niveau`);
    });
    assert(levels[5]!.key.endsWith('_legend'), `${slug} : 6ᵉ niveau ≠ legend`);
  }
});

// ─── leveledFamily ────────────────────────────────────────────────────────────

Deno.test('leveledFamily : keys slug_1..5 + slug_legend, noms romains + LEGEND', () => {
  const fam = leveledFamily('demo', 'Demo', 'territoire', 'hexesCaptured',
    [1, 2, 3, 4, 5, 6], (_l, t) => `x${t}`);
  assertEquals(fam.map((b) => b.key), [
    'demo_1', 'demo_2', 'demo_3', 'demo_4', 'demo_5', 'demo_legend',
  ]);
  assertEquals(fam.map((b) => b.name), [
    'Demo I', 'Demo II', 'Demo III', 'Demo IV', 'Demo V', 'Demo LEGEND',
  ]);
  assertEquals(fam.map((b) => b.tier), [...BADGE_TIERS]);
  assertEquals(fam.map((b) => b.threshold), [1, 2, 3, 4, 5, 6]);
});

Deno.test('multi-niveaux décernés d\'un coup (Hex Hunter I..III franchis ensemble)', () => {
  const before = emptyLifetimeStats();
  const after = applyRunToStats(before, mkRun({
    hexes: { claimed: 1_000, stolen: 0, defended: 0, pioneer: 0 },
  }));
  const earned = evaluateBadges(before, after, NONE);
  for (const k of ['hex_hunter_1', 'hex_hunter_2', 'hex_hunter_3']) assert(earned.includes(k), k);
  assertFalse(earned.includes('hex_hunter_4')); // 5 000 non atteint
});

Deno.test('bornes exactes d\'un niveau : Distance Runner III à 10 km pile, pas à 9 999 m', () => {
  const before = emptyLifetimeStats();
  const at10 = applyRunToStats(before, mkRun({ distanceM: 10_000 }));
  assert(evaluateBadges(before, at10, NONE).includes('distance_runner_3'));
  const at9999 = applyRunToStats(before, mkRun({ distanceM: 9_999 }));
  assertFalse(evaluateBadges(before, at9999, NONE).includes('distance_runner_3'));
});

// ─── weeksActive (ISO) ────────────────────────────────────────────────────────

Deno.test('isoWeek : lundi/dimanche même semaine, bascule au lundi', () => {
  assertEquals(isoWeek('2026-07-06'), isoWeek('2026-07-12')); // lun→dim = W28
  assertNotEquals(isoWeek('2026-07-12'), isoWeek('2026-07-13')); // dim vs lun suivant
});
function assertNotEquals(a: unknown, b: unknown) {
  assert(JSON.stringify(a) !== JSON.stringify(b), `attendu ≠ : ${a} == ${b}`);
}

Deno.test('weeksActive : 2 courses même semaine ISO = 1 ; semaine suivante = 2', () => {
  const s = applyAll([
    mkRun({ startedAt: '2026-07-06T08:00:00+02:00' }), // lundi W28
    mkRun({ startedAt: '2026-07-08T08:00:00+02:00' }), // mercredi W28
    mkRun({ startedAt: '2026-07-13T08:00:00+02:00' }), // lundi W29
  ]);
  assertEquals(s.weeksActive, 2);
});

Deno.test('Consistency I : 2 semaines actives décerne consistency_1', () => {
  const before = emptyLifetimeStats();
  const s = applyAll([
    mkRun({ startedAt: '2026-07-06T08:00:00+02:00' }),
    mkRun({ startedAt: '2026-07-13T08:00:00+02:00' }),
  ]);
  assertEquals(s.weeksActive, 2);
  assert(evaluateBadges(before, s, NONE).includes('consistency_1'));
});

// ─── cleanDays + applyRejectedRun ─────────────────────────────────────────────

Deno.test('cleanDays : croît depuis le 1er jour actif, remis à 0 par un rejet', () => {
  // 1er jour actif le 01, course le 31 → 30 jours propres.
  const day1 = applyRunToStats(emptyLifetimeStats(), mkRun({ startedAt: '2026-07-01T08:00:00+02:00' }));
  const day31 = applyRunToStats(day1, mkRun({ startedAt: '2026-07-31T08:00:00+02:00' }));
  assertEquals(day31.cleanDays, 30);
  assert(evaluateBadges(day1, day31, NONE).includes('clean_runner_1')); // 30 j

  // Un rejet le 31 remet à 0 (applyRunToStats ignore le rejet ; applyRejectedRun trace).
  const rejected = applyRejectedRun(day31, '2026-07-31T20:00:00+02:00');
  assertEquals(rejected.cleanDays, 0);
  assertEquals(rejected.lastRejectedDay, '2026-07-31');
  // Repart du jour du rejet : course le 10 août → 10 jours propres.
  const back = applyRunToStats(rejected, mkRun({ startedAt: '2026-08-10T08:00:00+02:00' }));
  assertEquals(back.cleanDays, 10);
});

Deno.test('applyRejectedRun ignore un ISO invalide (pas de mutation)', () => {
  const s = { ...emptyLifetimeStats(), cleanDays: 5 };
  assertEquals(applyRejectedRun(s, 'pas une date'), s);
});

// ─── GRYD Verified ────────────────────────────────────────────────────────────

Deno.test('verifiedRuns : motionTrust ≥ 70 compte ; < 70 non ; sans signal = valid+non flag', () => {
  assertEquals(applyRunToStats(emptyLifetimeStats(), mkRun({ motionTrust: 70 })).verifiedRuns, 1);
  assertEquals(applyRunToStats(emptyLifetimeStats(), mkRun({ motionTrust: 69 })).verifiedRuns, 0);
  // Sans motionTrust : valid non flaggé = vérifié…
  assertEquals(applyRunToStats(emptyLifetimeStats(), mkRun({ motionTrust: null })).verifiedRuns, 1);
  // …mais flaggé = non vérifié, et 'partial' sans signal = non vérifié.
  assertEquals(applyRunToStats(emptyLifetimeStats(), mkRun({ motionTrust: null, flagged: true })).verifiedRuns, 0);
  assertEquals(applyRunToStats(emptyLifetimeStats(), mkRun({ status: 'partial', motionTrust: null })).verifiedRuns, 0);
});

// ─── 3 nouveaux secrets ───────────────────────────────────────────────────────

Deno.test('secret « Comeback » : reprise après ≥ 30 j d\'inactivité', () => {
  const day1 = applyRunToStats(emptyLifetimeStats(), mkRun({ startedAt: '2026-05-01T09:00:00+02:00' }));
  // 30 j plus tard pile → comeback.
  const back = applyRunToStats(day1, mkRun({ startedAt: '2026-05-31T09:00:00+02:00' }));
  assertEquals(back.comebackRuns, 1);
  assert(evaluateBadges(day1, back, NONE).includes('secret_comeback'));
  // 29 j : pas de comeback.
  const soon = applyRunToStats(day1, mkRun({ startedAt: '2026-05-30T09:00:00+02:00' }));
  assertEquals(soon.comebackRuns, 0);
});

Deno.test('secret « Silent Takeover » : ≥ 50 volés ET départ nocturne', () => {
  const before = emptyLifetimeStats();
  const night = applyRunToStats(before, mkRun({
    startedAt: '2026-07-03T23:30:00+02:00',
    hexes: { claimed: 0, stolen: 50, defended: 0, pioneer: 0 },
  }));
  assertEquals(night.silentTakeoverRuns, 1);
  assert(evaluateBadges(before, night, NONE).includes('secret_silent_takeover'));
  // Même vol de jour : non.
  const day = applyRunToStats(before, mkRun({
    startedAt: '2026-07-03T14:00:00+02:00',
    hexes: { claimed: 0, stolen: 50, defended: 0, pioneer: 0 },
  }));
  assertEquals(day.silentTakeoverRuns, 0);
  // La nuit mais 49 volés : non.
  const few = applyRunToStats(before, mkRun({
    startedAt: '2026-07-03T23:30:00+02:00',
    hexes: { claimed: 0, stolen: 49, defended: 0, pioneer: 0 },
  }));
  assertEquals(few.silentTakeoverRuns, 0);
});

Deno.test('secret « No Map Run » : course valide 100 % pionnière (allPioneer)', () => {
  const before = emptyLifetimeStats();
  const noMap = applyRunToStats(before, mkRun({ allPioneer: true }));
  assertEquals(noMap.noMapRuns, 1);
  assert(evaluateBadges(before, noMap, NONE).includes('secret_no_map_run'));
  const normal = applyRunToStats(before, mkRun({ allPioneer: false }));
  assertEquals(normal.noMapRuns, 0);
});

// ─── Déduplication (§4) ───────────────────────────────────────────────────────

Deno.test('dedupeActivity : polyline_hash identique = doublon (court-circuit)', () => {
  const a = { startedAt: '2026-07-03T10:00:00Z', durationS: 1_800, distanceM: 5_000, polylineHash: 'abc' };
  const b = { startedAt: '2026-07-03T18:00:00Z', durationS: 9_999, distanceM: 42_000, polylineHash: 'abc' };
  assert(dedupeActivity(a, b)); // hash gagne malgré tout le reste différent
});

Deno.test('dedupeActivity : départ ±3 min & durée ±10 % & distance ±10 % (bornes INCLUSES)', () => {
  const base = { startedAt: '2026-07-03T10:00:00Z', durationS: 1_800, distanceM: 5_000 };
  // +3 min pile, +10 % durée pile, +10 % distance pile → doublon.
  assert(dedupeActivity(base, {
    startedAt: '2026-07-03T10:03:00Z', durationS: 1_980, distanceM: 5_500,
  }));
  // +3 min 1 s → hors fenêtre départ.
  assertFalse(dedupeActivity(base, {
    startedAt: '2026-07-03T10:03:01Z', durationS: 1_800, distanceM: 5_000,
  }));
  // Distance +11 % → hors tolérance.
  assertFalse(dedupeActivity(base, {
    startedAt: '2026-07-03T10:01:00Z', durationS: 1_800, distanceM: 5_600,
  }));
  // Durée +11 % → hors tolérance.
  assertFalse(dedupeActivity(base, {
    startedAt: '2026-07-03T10:01:00Z', durationS: 2_010, distanceM: 5_000,
  }));
});

// ─── Helpers de progression ───────────────────────────────────────────────────

Deno.test('nextLevelOf / progressMetricOf', () => {
  assertEquals(nextLevelOf('hex_hunter_3')?.key, 'hex_hunter_4');
  assertEquals(nextLevelOf('hex_hunter_5')?.key, 'hex_hunter_legend');
  assertEquals(nextLevelOf('hex_hunter_legend'), null); // déjà legend
  assertEquals(nextLevelOf('premiers_pas'), null); // simple
  assertEquals(progressMetricOf('hex_hunter_2'), 'hexesCaptured');
  assertEquals(progressMetricOf('inconnu'), null);
});

// ─── Onboarding / conservés ───────────────────────────────────────────────────

Deno.test('First Share : décerné au premier partage', () => {
  const before = emptyLifetimeStats();
  const shared = applyRunToStats(before, mkRun({ shared: true }));
  assertEquals(shared.firstShares, 1);
  assert(evaluateBadges(before, shared, NONE).includes('first_share'));
  const notShared = applyRunToStats(before, mkRun({ shared: false }));
  assertFalse(evaluateBadges(before, notShared, NONE).includes('first_share'));
});

Deno.test('First Crew : courir avec un crew actif décerne first_crew', () => {
  const before = emptyLifetimeStats();
  const crew = applyRunToStats(before, mkRun({ crewSize: 4 }));
  assert(evaluateBadges(before, crew, NONE).includes('first_crew'));
});

Deno.test('seasonDistance vs lifetimeDistance : les deux cumulent (course en S0)', () => {
  const s = applyAll([mkRun({ distanceM: 30_000 }), mkRun({ distanceM: 30_000 })]);
  assertEquals(s.seasonDistanceM, 60_000);
  assertEquals(s.totalDistanceM, 60_000);
  assert(evaluateBadges(emptyLifetimeStats(), s, NONE).includes('season_distance_2')); // 50 km
});

// ─── Pureté / statuts ─────────────────────────────────────────────────────────

Deno.test('course rejetée/gelée : applyRunToStats n\'change rien ; pur', () => {
  const before = emptyLifetimeStats();
  assertEquals(applyRunToStats(before, mkRun({ status: 'rejected' })), before);
  assertEquals(applyRunToStats(before, mkRun({ status: 'flagged' })), before);
  const snap = { ...before };
  applyRunToStats(before, mkRun());
  assertEquals(before, snap);
});

Deno.test('non-répétition : un badge déjà gagné n\'est jamais ré-attribué', () => {
  const before = emptyLifetimeStats();
  const after = applyRunToStats(before, mkRun());
  assert(evaluateBadges(before, after, NONE).includes('premiers_pas'));
  assertFalse(evaluateBadges(before, after, new Set(['premiers_pas'])).includes('premiers_pas'));
});

Deno.test('localClock lit l\'heure locale textuellement', () => {
  assertEquals(localClock('2026-07-03T22:14:00+02:00'), { date: '2026-07-03', minutes: 22 * 60 + 14 });
  assertEquals(localClock('nope'), null);
});

// ─── AMENDEMENT-07 §6 : métriques motivation run-fed ─────────────────────────

Deno.test('Easy Run : easyMode → easyRuns ; allure lente → recoveryRuns', () => {
  const easy = applyRunToStats(emptyLifetimeStats(), mkRun({ easyMode: true, avgPaceSKm: 400 }));
  assertEquals(easy.easyRuns, 1);
  assertEquals(easy.recoveryRuns, 0); // 6:40/km < seuil récup (7:00)
  const recov = applyRunToStats(emptyLifetimeStats(), mkRun({ easyMode: true, avgPaceSKm: 8 * 60 }));
  assertEquals(recov.easyRuns, 1);
  assertEquals(recov.recoveryRuns, 1); // 8:00/km ≥ 7:00 → récup
});

Deno.test('Group Run : run.groupRun → groupRuns incrémenté', () => {
  const s = applyRunToStats(emptyLifetimeStats(), mkRun({ groupRun: true }));
  assertEquals(s.groupRuns, 1);
});

Deno.test('Personal Best : jamais au 1er run ; battu ensuite (distance ou allure)', () => {
  const first = applyRunToStats(emptyLifetimeStats(), mkRun({ distanceM: 5_000, avgPaceSKm: 360 }));
  assertEquals(first.personalBests, 0); // pose la référence, pas de record
  const longer = applyRunToStats(first, mkRun({ distanceM: 8_000, avgPaceSKm: 360 }));
  assertEquals(longer.personalBests, 1); // distance battue
  const faster = applyRunToStats(longer, mkRun({ distanceM: 4_000, avgPaceSKm: 300 }));
  assertEquals(faster.personalBests, 2); // allure battue
});

Deno.test('Smart Runner : vérifiée + non flaggée + allure raisonnable', () => {
  const smart = applyRunToStats(emptyLifetimeStats(), mkRun({ motionTrust: 90, avgPaceSKm: 360 }));
  assertEquals(smart.smartRuns, 1);
  const notVerified = applyRunToStats(emptyLifetimeStats(), mkRun({ motionTrust: 10, avgPaceSKm: 360 }));
  assertEquals(notVerified.smartRuns, 0);
});
