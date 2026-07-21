/**
 * Tests A-46 §1 « LE PROFIL D'HABITUDES » — moteur PUR.
 *
 * Couvre le SEUIL D'HONNÊTETÉ (historique vide, 1 course, juste sous / juste
 * au-dessus de HABITS_MIN_RUNS), la robustesse à l'aberrant (la médiane ne doit
 * pas bouger sur un semi improvisé), les statuts rejetés/signalés qui ne
 * doivent RIEN apprendre, les dates invalides / futures / hors fenêtre, la
 * confiance, les récurrences jour+créneau (heure locale, `night` à cheval sur
 * minuit) et l'interrupteur d'apprentissage.
 *
 * AUCUN réseau. Importe les copies _shared (re-sync par le vérificateur).
 */
import { assert, assertAlmostEquals, assertEquals } from 'jsr:@std/assert@^1';
import {
  HABITS_CONFIDENT_RUNS,
  HABITS_HISTORY_DAYS,
  HABITS_MIN_RUNS,
  HABITS_PATTERN_MIN_SHARE,
  HABITS_TIGHT_SPREAD_RATIO,
  RUN_MIN_DISTANCE_M,
  RUN_MIN_DURATION_S,
} from '../_shared/game-rules.ts';
import {
  computeHabitsProfile,
  localSlot,
  localWeekday,
  median,
  type HabitRunFact,
  type HabitRunStatus,
} from '../_shared/habits.ts';

const MS_PER_DAY = 86_400_000;
/** Mercredi 22/07/2026 10:00 UTC. */
const NOW = new Date('2026-07-22T10:00:00.000Z');

const daysAgo = (n: number, hourUtc = 18) =>
  new Date(new Date(NOW.getTime() - n * MS_PER_DAY).setUTCHours(hourUtc, 0, 0, 0));

/** Course type : 5 km en 30 min (allure 360 s/km), il y a `n` jours. */
const run = (
  n: number,
  over: Partial<HabitRunFact> = {},
): HabitRunFact => ({
  startedAt: daysAgo(n),
  distanceM: 5_000,
  durationS: 1_800,
  avgPaceSKm: 360,
  status: 'valid',
  ...over,
});

/** `n` courses régulières, une tous les 2 jours en remontant. */
const regular = (n: number, over: Partial<HabitRunFact> = {}) =>
  Array.from({ length: n }, (_, i) => run(2 * i + 1, over));

const profile = (runs: readonly HabitRunFact[], extra: Record<string, unknown> = {}) =>
  computeHabitsProfile({ runs, now: NOW, ...extra });

// ─── Médiane (brique de base) ────────────────────────────────────────────────

Deno.test('median — impair, pair, et insensible à l’ordre', () => {
  assertEquals(median([3, 1, 2]), 2);
  assertEquals(median([4, 1, 3, 2]), 2.5);
  assertEquals(median([5]), 5);
  assert(Number.isNaN(median([])));
});

// ─── SEUIL D'HONNÊTETÉ ───────────────────────────────────────────────────────

Deno.test('historique vide → « inconnu », AUCUNE mesure inventée', () => {
  const p = profile([]);
  assertEquals(p.status, 'unknown');
  assertEquals(p.confidence, 'none');
  assertEquals(p.sampleSize, 0);
  assertEquals(p.runsMissing, HABITS_MIN_RUNS);
  assertEquals(p.distanceM, null);
  assertEquals(p.paceSKm, null);
  assertEquals(p.weekdays, []);
  assertEquals(p.slots, []);
});

Deno.test('UNE course ne fait pas une habitude', () => {
  const p = profile([run(1)]);
  assertEquals(p.status, 'unknown');
  assertEquals(p.sampleSize, 1);
  assertEquals(p.runsMissing, HABITS_MIN_RUNS - 1);
  assertEquals(p.distanceM, null);
});

Deno.test('juste SOUS le seuil → toujours inconnu (rien à afficher)', () => {
  const p = profile(regular(HABITS_MIN_RUNS - 1));
  assertEquals(p.status, 'unknown');
  assertEquals(p.sampleSize, HABITS_MIN_RUNS - 1);
  assertEquals(p.runsMissing, 1);
  assertEquals(p.distanceM, null);
  assertEquals(p.paceSKm, null);
});

Deno.test('juste AU-DESSUS du seuil → profil connu', () => {
  const p = profile(regular(HABITS_MIN_RUNS));
  assertEquals(p.status, 'known');
  assertEquals(p.sampleSize, HABITS_MIN_RUNS);
  assertEquals(p.runsMissing, 0);
  assertEquals(p.distanceM?.median, 5_000);
  assertEquals(p.distanceM?.spread, 0);
  assertEquals(p.paceSKm?.median, 360);
});

// ─── ROBUSTESSE : la sortie longue exceptionnelle ────────────────────────────

Deno.test('une sortie longue exceptionnelle ne déplace PAS le profil', () => {
  // 5 courses de 5 km + 1 semi improvisé de 21,1 km.
  const p = profile([...regular(HABITS_MIN_RUNS), run(20, { distanceM: 21_100, durationS: 7_600 })]);
  assertEquals(p.status, 'known');
  assertEquals(p.distanceM?.median, 5_000, 'la médiane tient — une moyenne aurait dérivé à ~7,7 km');
});

Deno.test('la médiane survit à DEUX aberrations au seuil (argument du n=5)', () => {
  const runs = [
    ...regular(3), // 3 × 5 km
    run(11, { distanceM: 21_100, durationS: 7_600 }),
    run(13, { distanceM: 25_000, durationS: 9_000 }),
  ];
  assertEquals(profile(runs).distanceM?.median, 5_000);
});

Deno.test('spread (MAD) et plage low/high reflètent la vraie dispersion', () => {
  const runs = [
    run(1, { distanceM: 4_000 }),
    run(3, { distanceM: 4_500 }),
    run(5, { distanceM: 5_000 }),
    run(7, { distanceM: 5_500 }),
    run(9, { distanceM: 6_000 }),
  ];
  const m = profile(runs).distanceM!;
  assertEquals(m.median, 5_000);
  assertEquals(m.spread, 500); // écarts {1000,500,0,500,1000} → médiane 500
  assertEquals(m.low, 4_500);
  assertEquals(m.high, 5_500);
  assertEquals(m.tight, true); // 500/5000 = 0,10 ≤ HABITS_TIGHT_SPREAD_RATIO
  assertEquals(m.sampleSize, 5);
});

Deno.test('dispersion forte → tight=false, donc confiance jamais haute', () => {
  const runs = Array.from({ length: HABITS_CONFIDENT_RUNS }, (_, i) =>
    run(i + 1, { distanceM: i % 2 === 0 ? 3_000 : 15_000, durationS: 3_600 }),
  );
  const p = profile(runs);
  assertEquals(p.status, 'known');
  assertEquals(p.distanceM!.tight, false);
  assertEquals(p.confidence, 'low');
  assert(p.distanceM!.spread / p.distanceM!.median > HABITS_TIGHT_SPREAD_RATIO);
});

// ─── CONFIANCE ───────────────────────────────────────────────────────────────

Deno.test('confiance basse au seuil, haute quand échantillon fourni ET régulier', () => {
  assertEquals(profile(regular(HABITS_MIN_RUNS)).confidence, 'low');
  assertEquals(profile(regular(HABITS_CONFIDENT_RUNS - 1)).confidence, 'low');
  assertEquals(profile(regular(HABITS_CONFIDENT_RUNS)).confidence, 'high');
});

// ─── COURSES QUI NE DOIVENT RIEN APPRENDRE ───────────────────────────────────

Deno.test('les courses rejetées et signalées ne comptent pas', () => {
  for (const status of ['rejected', 'flagged'] as HabitRunStatus[]) {
    const p = profile(regular(HABITS_MIN_RUNS + 3, { status }));
    assertEquals(p.status, 'unknown', `status=${status} ne doit rien apprendre`);
    assertEquals(p.sampleSize, 0);
  }
});

Deno.test('« partial » compte (segments douteux exclus, le reste a bien eu lieu)', () => {
  const p = profile(regular(HABITS_MIN_RUNS, { status: 'partial' }));
  assertEquals(p.status, 'known');
  assertEquals(p.sampleSize, HABITS_MIN_RUNS);
});

Deno.test('un rejet ne peut pas faire franchir le seuil à lui seul', () => {
  const runs = [...regular(HABITS_MIN_RUNS - 1), run(30, { status: 'rejected' })];
  assertEquals(profile(runs).status, 'unknown');
});

// ─── ENTRÉES DÉGÉNÉRÉES ──────────────────────────────────────────────────────

Deno.test('dates invalides, futures et hors fenêtre sont ignorées', () => {
  const runs = [
    ...regular(HABITS_MIN_RUNS - 1),
    run(0, { startedAt: new Date('pas-une-date') }),
    run(0, { startedAt: new Date(NOW.getTime() + MS_PER_DAY) }), // futur
    run(HABITS_HISTORY_DAYS + 5), // hors fenêtre
  ];
  const p = profile(runs);
  assertEquals(p.status, 'unknown');
  assertEquals(p.sampleSize, HABITS_MIN_RUNS - 1);
});

Deno.test('la borne de fenêtre est inclusive côté récent, exclusive au-delà', () => {
  assertEquals(profile(regular(HABITS_MIN_RUNS, {})).windowDays, HABITS_HISTORY_DAYS);
  const inside = Array.from({ length: HABITS_MIN_RUNS }, () => run(HABITS_HISTORY_DAYS - 1));
  assertEquals(profile(inside).sampleSize, HABITS_MIN_RUNS);
  const outside = Array.from({ length: HABITS_MIN_RUNS }, () => run(HABITS_HISTORY_DAYS + 1));
  assertEquals(profile(outside).sampleSize, 0);
});

Deno.test('sessions avortées (sous les minimas de course) ignorées', () => {
  const runs = [
    ...regular(HABITS_MIN_RUNS - 1),
    run(20, { distanceM: RUN_MIN_DISTANCE_M - 1 }),
    run(22, { durationS: RUN_MIN_DURATION_S - 1 }),
    run(24, { distanceM: 0, durationS: 0 }),
    run(26, { distanceM: Number.NaN }),
    run(28, { durationS: Number.POSITIVE_INFINITY }),
  ];
  assertEquals(profile(runs).status, 'unknown');
});

Deno.test('now invalide → inconnu, jamais un crash ni une habitude', () => {
  const p = computeHabitsProfile({ runs: regular(20), now: new Date('nope') });
  assertEquals(p.status, 'unknown');
  assertEquals(p.distanceM, null);
});

// ─── ALLURE ──────────────────────────────────────────────────────────────────

Deno.test('allure dérivée quand avg_pace_s_km est absent ou nul', () => {
  const runs = regular(HABITS_MIN_RUNS, { avgPaceSKm: null });
  assertAlmostEquals(profile(runs).paceSKm!.median, 360, 0.001);
});

Deno.test('allure aberrante : la course compte pour la distance, pas pour l’allure', () => {
  const runs = regular(HABITS_MIN_RUNS, { avgPaceSKm: 1, durationS: 5, distanceM: 5_000 });
  const p = profile(runs);
  // durationS < RUN_MIN_DURATION_S → la course est écartée entièrement.
  assertEquals(p.status, 'unknown');

  // Ici la course est valide, seule l'allure STOCKÉE est absurde ; l'allure
  // dérivée (1800/5 = 360) n'est pas utilisée car la valeur stockée existe et
  // est positive — mais elle sort des bornes physiques, donc pas d'échantillon.
  const q = profile(regular(HABITS_MIN_RUNS, { avgPaceSKm: 1 }));
  assertEquals(q.status, 'known');
  assertEquals(q.distanceM?.median, 5_000);
  assertEquals(q.paceSKm, null, 'on connaît la distance, pas l’allure — et on le dit');
});

Deno.test('distance connue mais trop peu d’allures exploitables → paceSKm null', () => {
  const runs = [
    ...regular(HABITS_MIN_RUNS - 1, { avgPaceSKm: 99_999 }),
    run(21, { avgPaceSKm: 99_999 }),
  ];
  const p = profile(runs);
  assertEquals(p.status, 'known');
  assertEquals(p.paceSKm, null);
});

// ─── JOURS ET CRÉNEAUX (heure locale) ────────────────────────────────────────

Deno.test('localWeekday : 0 = lundi, et le décalage local peut changer le jour', () => {
  const mondayUtc = new Date('2026-07-20T12:00:00.000Z');
  assertEquals(localWeekday(mondayUtc, 0), 0);
  const lateSunday = new Date('2026-07-19T23:00:00.000Z');
  assertEquals(localWeekday(lateSunday, 0), 6); // dimanche UTC
  assertEquals(localWeekday(lateSunday, 120), 0); // lundi 01:00 à Paris
});

Deno.test('localSlot : night enjambe minuit, dawn/day/evening bornés', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 6, 20, h, 0, 0));
  assertEquals(localSlot(at(2), 0), 'night');
  assertEquals(localSlot(at(6), 0), 'dawn');
  assertEquals(localSlot(at(12), 0), 'day');
  assertEquals(localSlot(at(19), 0), 'evening');
  assertEquals(localSlot(at(22), 0), 'night');
  // 23:00 UTC = 01:00 à Paris → night des deux côtés, mais pas le même jour.
  assertEquals(localSlot(at(23), 120), 'night');
});

Deno.test('un jour récurrent ressort, le bruit non', () => {
  // 6 courses : 4 le mercredi (≥ 40 %), 1 lundi, 1 samedi.
  // NOW est un mercredi 10:00 → on part de J-7 (jamais J-0 à 18 h, qui serait
  // dans le futur et serait légitimement écarté par le moteur).
  const wed = [7, 14, 21, 28].map((d) => run(d, { startedAt: daysAgo(d, 18) }));
  const runs = [...wed, run(2), run(4)];
  const p = profile(runs);
  assertEquals(p.status, 'known');
  const top = p.weekdays[0];
  assertEquals(top.key, 2, 'mercredi (0=lundi)');
  assertEquals(top.count, 4);
  assert(top.share >= HABITS_PATTERN_MIN_SHARE);
  assert(p.weekdays.every((w) => w.share >= HABITS_PATTERN_MIN_SHARE));
});

Deno.test('aucune récurrence nette → aucun jour surfacé (on ne bluffe pas)', () => {
  // 7 courses réparties sur 7 jours distincts : chaque jour ≈ 14 % < 40 %.
  const runs = Array.from({ length: 7 }, (_, i) => run(i + 1));
  const p = profile(runs);
  assertEquals(p.status, 'known');
  assertEquals(p.weekdays, []);
});

Deno.test('créneau récurrent : tout le monde court le soir', () => {
  const runs = Array.from({ length: HABITS_MIN_RUNS + 2 }, (_, i) =>
    run(i + 1, { startedAt: daysAgo(i + 1, 19) }),
  );
  const p = profile(runs);
  assertEquals(p.slots[0].key, 'evening');
  assertEquals(p.slots[0].share, 1);
});

Deno.test('récurrences triées par part décroissante, ordre déterministe', () => {
  const p = profile([
    run(7, { startedAt: daysAgo(7, 18) }), // mercredi
    run(14, { startedAt: daysAgo(14, 18) }), // mercredi
    run(21, { startedAt: daysAgo(21, 18) }), // mercredi — 3/5 = 60 %
    run(1, { startedAt: daysAgo(1, 18) }), // mardi
    run(8, { startedAt: daysAgo(8, 18) }), // mardi — 2/5 = 40 %
  ]);
  assertEquals(p.weekdays.map((w) => w.key), [2, 1]);
  assert(p.weekdays[0].share > p.weekdays[1].share);
});

// ─── INTERRUPTEUR (vie privée) ───────────────────────────────────────────────

Deno.test('apprentissage désactivé → rien n’est calculé, même avec 50 courses', () => {
  const p = profile(regular(50), { learningEnabled: false });
  assertEquals(p.status, 'disabled');
  assertEquals(p.confidence, 'none');
  assertEquals(p.sampleSize, 0);
  assertEquals(p.distanceM, null);
  assertEquals(p.paceSKm, null);
  assertEquals(p.weekdays, []);
  assertEquals(p.slots, []);
});

Deno.test('learningEnabled absent ou true → calcul normal', () => {
  assertEquals(profile(regular(HABITS_MIN_RUNS)).status, 'known');
  assertEquals(profile(regular(HABITS_MIN_RUNS), { learningEnabled: true }).status, 'known');
});

// ─── AUCUNE GÉOGRAPHIE NE TRANSITE ───────────────────────────────────────────

Deno.test('le profil ne contient aucune clé géographique', () => {
  const keys = Object.keys(profile(regular(HABITS_CONFIDENT_RUNS)));
  const forbidden = ['lat', 'lng', 'polyline', 'hex', 'sector', 'start', 'coord'];
  for (const k of keys) {
    for (const f of forbidden) {
      assert(!k.toLowerCase().includes(f), `clé « ${k} » : le profil doit rester non géographique`);
    }
  }
});
