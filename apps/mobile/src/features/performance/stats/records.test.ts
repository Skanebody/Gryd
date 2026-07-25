/**
 * GRYD — tests du PALMARÈS (`records.ts`).
 *
 * Ce que ces tests verrouillent, ce sont les façons dont un palmarès peut
 * MENTIR à un joueur :
 *   1. afficher un record à quelqu'un qui n'en a aucun (le « 0 km » interdit) ;
 *   2. attribuer un record à la mauvaise course quand deux sont ex æquo — et
 *      pire, que l'attribution dépende de l'ORDRE dans lequel le serveur a
 *      renvoyé les lignes ;
 *   3. compter une course que le bloc du dessus, lui, écarte (rejetée, date
 *      illisible) — l'écran se contredirait ;
 *   4. fabriquer une allure là où la base n'en a pas ;
 *   5. appeler « série » une semaine isolée.
 *
 * Deno, aucun réseau, aucun mock : on importe DIRECTEMENT le module de prod.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { MIN_RECORD_STREAK_WEEKS, deriveRecords } from './records.ts';
import type { StatsRunRow } from './derive.ts';

/** Une ligne de `runs` plausible ; chaque test ne surcharge que ce qui l'intéresse. */
function run(over: Partial<StatsRunRow> = {}): StatsRunRow {
  return {
    started_at: '2026-07-20T08:00:00.000Z',
    distance_m: 10_000,
    duration_s: 3_000,
    avg_pace_s_km: 300,
    status: 'valid',
    celebration: null,
    ...over,
  };
}

Deno.test('records — aucune course : aucun record, et surtout aucun zéro', () => {
  const r = deriveRecords([]);
  assertEquals(r.longestDistance, null);
  assertEquals(r.longestDuration, null);
  assertEquals(r.bestPace, null);
  assertEquals(r.bestStreakWeeks, null);
  assertEquals(r.hasAny, false);
});

Deno.test('records — une seule course fonde déjà trois records (mais pas une série)', () => {
  const r = deriveRecords([
    run({ started_at: '2026-07-20T08:00:00.000Z', distance_m: 8_400, duration_s: 2_700, avg_pace_s_km: 321 }),
  ]);
  assertEquals(r.longestDistance?.value, 8_400);
  assertEquals(r.longestDuration?.value, 2_700);
  assertEquals(r.bestPace?.value, 321);
  // Le contexte de l'allure est la distance de SA course.
  assertEquals(r.bestPace?.distanceM, 8_400);
  // Une semaine seule n'est pas une suite.
  assertEquals(r.bestStreakWeeks, null);
  assertEquals(r.hasAny, true);
});

Deno.test('records — sans allure exploitable, les autres records survivent', () => {
  const r = deriveRecords([
    run({ avg_pace_s_km: null, distance_m: 12_000, duration_s: 4_000 }),
    run({ started_at: '2026-07-13T08:00:00.000Z', avg_pace_s_km: 0 }),
    // Une allure négative ou non finie n'est pas une allure : on ne la lit pas.
    run({ started_at: '2026-07-06T08:00:00.000Z', avg_pace_s_km: -42 }),
    run({ started_at: '2026-06-29T08:00:00.000Z', avg_pace_s_km: Number.NaN }),
  ]);
  assertEquals(r.bestPace, null);
  assertEquals(r.longestDistance?.value, 12_000);
  assertEquals(r.longestDuration?.value, 4_000);
  assertEquals(r.hasAny, true);
});

Deno.test('records — allure lisible sur une seule course : c’est elle, pas un repli', () => {
  const r = deriveRecords([
    run({ started_at: '2026-07-20T08:00:00.000Z', avg_pace_s_km: null }),
    run({ started_at: '2026-07-18T08:00:00.000Z', avg_pace_s_km: 287, distance_m: 5_000 }),
  ]);
  assertEquals(r.bestPace?.value, 287);
  assertEquals(r.bestPace?.startedAt, '2026-07-18T08:00:00.000Z');
});

Deno.test('records — ex æquo : le record reste à la course la PLUS ANCIENNE', () => {
  const older = '2026-06-02T07:00:00.000Z';
  const newer = '2026-07-20T07:00:00.000Z';
  const rows = [
    run({ started_at: newer, distance_m: 15_000, duration_s: 5_400, avg_pace_s_km: 360 }),
    run({ started_at: older, distance_m: 15_000, duration_s: 5_400, avg_pace_s_km: 360 }),
  ];
  const r = deriveRecords(rows);
  assertEquals(r.longestDistance?.startedAt, older);
  assertEquals(r.longestDuration?.startedAt, older);
  assertEquals(r.bestPace?.startedAt, older);

  // Et le résultat ne dépend PAS de l'ordre des lignes reçues : un tri serveur
  // ne doit jamais décider à qui appartient un record.
  const reversed = deriveRecords([...rows].reverse());
  assertEquals(reversed.longestDistance?.startedAt, older);
  assertEquals(reversed.longestDuration?.startedAt, older);
  assertEquals(reversed.bestPace?.startedAt, older);
});

Deno.test('records — courses écartées par le moteur : jamais un record', () => {
  const r = deriveRecords([
    run({ status: 'rejected', distance_m: 42_195, duration_s: 20_000, avg_pace_s_km: 120 }),
    run({ status: 'flagged', distance_m: 30_000, duration_s: 15_000, avg_pace_s_km: 150 }),
    run({ started_at: 'pas-une-date', distance_m: 25_000, duration_s: 12_000, avg_pace_s_km: 180 }),
    run({ distance_m: 9_000, duration_s: 3_300, avg_pace_s_km: 366 }),
  ]);
  assertEquals(r.longestDistance?.value, 9_000);
  assertEquals(r.longestDuration?.value, 3_300);
  assertEquals(r.bestPace?.value, 366);
});

Deno.test('records — « partial » compte : le joueur a bien couru', () => {
  const r = deriveRecords([run({ status: 'partial', distance_m: 21_100, duration_s: 7_200 })]);
  assertEquals(r.longestDistance?.value, 21_100);
});

Deno.test('records — course vide (0 m / 0 s) : ce n’est pas un record', () => {
  const r = deriveRecords([run({ distance_m: 0, duration_s: 0, avg_pace_s_km: null })]);
  assertEquals(r.longestDistance, null);
  assertEquals(r.longestDuration, null);
  assertEquals(r.hasAny, false);
});

Deno.test('records — distance aberrante (négative, non finie) : écartée, pas ramenée à 0', () => {
  const r = deriveRecords([
    run({ distance_m: -500, duration_s: 1_800, avg_pace_s_km: null }),
    run({ started_at: '2026-07-13T08:00:00.000Z', distance_m: Number.POSITIVE_INFINITY, duration_s: 1_900, avg_pace_s_km: null }),
  ]);
  assertEquals(r.longestDistance, null);
  // La durée, elle, reste lisible : un champ abîmé n'invalide pas la course.
  assertEquals(r.longestDuration?.value, 1_900);
  // Et l'allure garde un contexte NEUTRE plutôt qu'une distance inventée.
  assertEquals(r.longestDuration?.distanceM, 0);
});

Deno.test('records — plus longue série : la meilleure suite, pas la dernière', () => {
  // Quatre semaines d'affilée en mai, un trou, puis deux semaines en juillet.
  const rows = [
    run({ started_at: '2026-05-04T08:00:00.000Z' }),
    run({ started_at: '2026-05-11T08:00:00.000Z' }),
    run({ started_at: '2026-05-18T08:00:00.000Z' }),
    run({ started_at: '2026-05-25T08:00:00.000Z' }),
    run({ started_at: '2026-07-13T08:00:00.000Z' }),
    run({ started_at: '2026-07-20T08:00:00.000Z' }),
  ];
  assertEquals(deriveRecords(rows).bestStreakWeeks, 4);
  // Deux courses la même semaine ne font pas deux semaines.
  assertEquals(
    deriveRecords([
      run({ started_at: '2026-07-20T08:00:00.000Z' }),
      run({ started_at: '2026-07-22T19:00:00.000Z' }),
      run({ started_at: '2026-07-26T10:00:00.000Z' }),
    ]).bestStreakWeeks,
    null,
  );
});

Deno.test('records — série : le seuil est celui du bloc Régularité', () => {
  const twoInARow = deriveRecords([
    run({ started_at: '2026-07-13T08:00:00.000Z' }),
    run({ started_at: '2026-07-20T08:00:00.000Z' }),
  ]);
  assertEquals(twoInARow.bestStreakWeeks, MIN_RECORD_STREAK_WEEKS);
  assertEquals(MIN_RECORD_STREAK_WEEKS, 2);
});

Deno.test('records — une série peut exister sans aucun autre record', () => {
  // Deux semaines consécutives de courses vides : rien à mesurer, mais le joueur
  // est bien sorti deux semaines de suite.
  const r = deriveRecords([
    run({ started_at: '2026-07-13T08:00:00.000Z', distance_m: 0, duration_s: 0, avg_pace_s_km: null }),
    run({ started_at: '2026-07-20T08:00:00.000Z', distance_m: 0, duration_s: 0, avg_pace_s_km: null }),
  ]);
  assertEquals(r.longestDistance, null);
  assertEquals(r.bestStreakWeeks, 2);
  assertEquals(r.hasAny, true);
});
