/**
 * GRYD — LES CHIFFRES DU GUIDE NE SONT JAMAIS TAPÉS À LA MAIN.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 * L'ancienne `/faq` interpolait ses valeurs à la main, dans le JSX, avec la
 * division en clair : `${rules.minimumMovementSecondsPerDay / 60} minutes`
 * (app/faq.tsx, ligne 18, avant ce chantier). C'était juste, et c'était le seul
 * écran qui le faisait : `app/calcul-zones.tsx` n'affichait AUCUN seuil, alors
 * qu'il prétendait expliquer le calcul. Entre les deux, rien n'empêchait
 * d'écrire « 800 m » en dur dans une phrase, et ADR-003 dit pourquoi c'est
 * grave : la phrase survit au changement de règle, et l'app se met à mentir à
 * celui qui la lit POUR APPRENDRE.
 *
 * Ce fichier verrouille les deux bouts : la valeur rendue SUIT la constante
 * (§ dérivation), et le module de mise en forme ne contient aucun nombre qui ne
 * soit une conversion d'unité (§ littéraux).
 */
import { assert, assertEquals } from 'jsr:@std/assert';
import {
  CHALLENGE_RULES_2026,
  LEADERBOARD_RULES_2026,
  PROGRESSION_RULES_2026,
  TERRITORY_RULES_2026,
} from '@klaim/shared';
import { decimal, groupDigits, helpFacts2026, say } from './helpFacts2026.ts';

const SECONDS_PER_MINUTE = 60;
const METRES_PER_KILOMETRE = 1_000;

/** Ce que la mise en forme DOIT rendre pour une distance en mètres. */
function expectDistance(metres: number, fr: boolean): string {
  return metres >= METRES_PER_KILOMETRE
    ? `${decimal(metres / METRES_PER_KILOMETRE, fr)} km`
    : `${decimal(metres, fr)} m`;
}

Deno.test('les chiffres du guide DÉRIVENT de game-rules, dans les deux langues', () => {
  for (const fr of [true, false]) {
    const f = helpFacts2026(fr);
    assertEquals(say(f.closureGapRun), expectDistance(TERRITORY_RULES_2026.run.closureMaxGapM, fr));
    assertEquals(say(f.closureGapBike), expectDistance(TERRITORY_RULES_2026.bike.closureMaxGapM, fr));
    assertEquals(say(f.minLoopRun), expectDistance(TERRITORY_RULES_2026.run.minLoopDistanceM, fr));
    assertEquals(say(f.minLoopBike), expectDistance(TERRITORY_RULES_2026.bike.minLoopDistanceM, fr));
    assertEquals(say(f.endpointAccuracy), expectDistance(TERRITORY_RULES_2026.endpointMaxAccuracyM, fr));
    assertEquals(say(f.insideSectorRun), expectDistance(CHALLENGE_RULES_2026.minimumTraceInsideSectorM.run, fr));
    assertEquals(say(f.insideSectorBike), expectDistance(CHALLENGE_RULES_2026.minimumTraceInsideSectorM.bike, fr));

    assertEquals(f.minAreaRun.value, groupDigits(TERRITORY_RULES_2026.run.minAreaM2));
    assertEquals(f.minAreaBike.value, groupDigits(TERRITORY_RULES_2026.bike.minAreaM2));
    assertEquals(f.publicationDelay.value, groupDigits(TERRITORY_RULES_2026.publicationDelayMinutes));
    assertEquals(f.receiptMaxAge.value, groupDigits(TERRITORY_RULES_2026.captureReceiptMaxAgeHours));
    assertEquals(f.clockTolerance.value, groupDigits(TERRITORY_RULES_2026.clockToleranceSeconds / SECONDS_PER_MINUTE));

    assertEquals(f.dailyMovement.value, groupDigits(PROGRESSION_RULES_2026.minimumMovementSecondsPerDay / SECONDS_PER_MINUTE));
    assertEquals(f.xpPerDay.value, groupDigits(PROGRESSION_RULES_2026.xpPerActiveDay));
    assertEquals(f.creditedDaysPerWeek.value, groupDigits(PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek));
    assertEquals(f.seasonWeeks.value, groupDigits(PROGRESSION_RULES_2026.seasonWeeks));
    assertEquals(f.seasonTiers.value, groupDigits(PROGRESSION_RULES_2026.seasonTierCount));
    assertEquals(f.seasonXpPerTier.value, groupDigits(PROGRESSION_RULES_2026.seasonXpPerTier));

    assertEquals(f.rankedMinimum.value, groupDigits(LEADERBOARD_RULES_2026.minRankedSubjects));
    assertEquals(f.teamSize.value, groupDigits(CHALLENGE_RULES_2026.playersPerTeam));
    assertEquals(f.teamCount.value, groupDigits(CHALLENGE_RULES_2026.teamCount));
    assertEquals(f.challengeDays.value, groupDigits(CHALLENGE_RULES_2026.durationDays));
    assertEquals(f.sectorCount.value, groupDigits(CHALLENGE_RULES_2026.sectorCount));
    assertEquals(f.contributiveDays.value, groupDigits(CHALLENGE_RULES_2026.maximumContributiveDaysPerPlayer));
    assertEquals(f.pointsPerDay.value, groupDigits(CHALLENGE_RULES_2026.pointsPerDay));
    assertEquals(f.maxPointsPerPlayer.value, groupDigits(CHALLENGE_RULES_2026.maximumPointsPerPlayer));
    assertEquals(f.maxPointsPerTeam.value, groupDigits(CHALLENGE_RULES_2026.maximumPointsPerTeam));
    assertEquals(f.finalSyncWindow.value, groupDigits(CHALLENGE_RULES_2026.finalSyncWindowHours));
  }
});

Deno.test('un grand nombre se lit : milliers séparés par une espace fine insécable', () => {
  assertEquals(groupDigits(TERRITORY_RULES_2026.bike.minAreaM2), '20\u202F000');
  assertEquals(groupDigits(TERRITORY_RULES_2026.run.minAreaM2), '5\u202F000');
  assertEquals(groupDigits(TERRITORY_RULES_2026.run.closureMaxGapM), '25');
  // La virgule décimale est FRANÇAISE en français, et pas ailleurs.
  assertEquals(decimal(1.5, true), '1,5');
  assertEquals(decimal(1.5, false), '1.5');
});

Deno.test('l’unité est un MOT traduit, jamais collée au nombre dans la source', () => {
  const frDay = helpFacts2026(true).challengeDays;
  const enDay = helpFacts2026(false).challengeDays;
  assertEquals(frDay.value, enDay.value);
  assert(frDay.unit !== enDay.unit, 'une unité identique dans les deux langues n’est pas traduite');
  assert(!/\d/.test(frDay.unit) && !/\d/.test(enDay.unit), 'une unité ne contient jamais de chiffre');
});

/**
 * § LITTÉRAUX — le module de mise en forme n'a le droit qu'aux conversions.
 *
 * ÉTAPE 0 : ajouter `const MIN_LOOP = 800;` ici ferait tomber ce test, et c'est
 * exactement la façon dont une règle de jeu se recopie dans l'UI sans bruit.
 */
Deno.test('helpFacts2026 ne contient aucun nombre autre que ses conversions d’unités', () => {
  const source = Deno.readTextFileSync(new URL('./helpFacts2026.ts', import.meta.url))
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  // 60 s dans une minute · 1 000 m dans un kilomètre · 0/1/3 : bornes et pas de
  // la mise en forme des milliers (`fromEnd % 3`, `toFixed(1)`, `clamp`).
  const allowed = new Set(['0', '1', '3', '60', '1000']);
  const found = [...source.matchAll(/(?<![\w.$])(\d[\d_]*(?:\.\d+)?)/g)]
    .map((m) => m[1]!.replace(/_/g, ''))
    // `202F` est le point de code de l'espace fine, pas un nombre.
    .filter((value) => !source.includes(`\\u${value}`));
  const strays = [...new Set(found)].filter((value) => !allowed.has(value));
  assertEquals(strays, [], `nombre(s) en dur dans helpFacts2026 : ${strays.join(', ')}`);
});
