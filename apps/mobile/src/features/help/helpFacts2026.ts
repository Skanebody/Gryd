/**
 * GRYD — LES CHIFFRES DU GUIDE « Comment ça marche ».
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * Un guide qui explique les règles est l'endroit du dépôt où un nombre en dur
 * est le PLUS tentant et le PLUS grave : il devient une promesse écrite. Le
 * jour où `TERRITORY_RULES_2026.run.minLoopDistanceM` change, un « 800 m » tapé
 * dans une phrase reste affiché, et l'app ment à celui qui la lit pour
 * apprendre. ADR-003 l'interdit ; ce module est la seule porte par laquelle un
 * chiffre entre dans le guide.
 *
 * RÈGLE : ici, on ne DÉCIDE aucune valeur. On lit `@klaim/shared` et on met en
 * forme. Les seules constantes littérales tolérées sont des CONVERSIONS
 * D'UNITÉS universelles (60 secondes dans une minute, 1 000 mètres dans un
 * kilomètre) — au même titre que `MS_PER_DAY` dans `packages/shared/src/season.ts`.
 * Aucune n'est une règle de jeu, aucune ne peut « changer ».
 *
 * Ce module est PUR (zéro import React Native) : les tests Deno le lisent tel
 * quel, et le guide affiche exactement ce que le test a vérifié.
 */
import {
  CHALLENGE_RULES_2026,
  LEADERBOARD_RULES_2026,
  PROGRESSION_RULES_2026,
  TERRITORY_RULES_2026,
} from '@klaim/shared';

/** Conversions d'unités — universelles, jamais des règles de jeu. */
const SECONDS_PER_MINUTE = 60;
const METRES_PER_KILOMETRE = 1_000;

/** Espace fine insécable : « 5 000 m² » ne se coupe jamais en fin de ligne. */
const THIN_NBSP = '\u202F';

/** Groupe les milliers sans jamais dépendre d'`Intl` (absent de certains Hermes). */
export function groupDigits(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = Math.abs(Math.round(value)).toString();
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i;
    out += digits.charAt(i);
    if (fromEnd > 1 && fromEnd % 3 === 1) out += THIN_NBSP;
  }
  return sign + out;
}

/** Le nombre seul, jamais son unité : l'unité est un mot, donc traduit. */
export function decimal(value: number, fr: boolean): string {
  if (Number.isInteger(value)) return groupDigits(value);
  const rendered = value.toFixed(1);
  return fr ? rendered.replace('.', ',') : rendered;
}

/**
 * Unités affichées. Ce ne sont PAS des chiffres : ce sont des mots, et ils se
 * traduisent. Les séparer du nombre est ce qui permet au guide de n'écrire
 * aucun littéral du type « 800 m ».
 */
export type HelpUnitKey = 'metre' | 'kilometre' | 'squareMetre' | 'minute' | 'hour' | 'day' | 'week' | 'xp' | 'point' | 'player' | 'none';

const UNITS: Readonly<Record<HelpUnitKey, { readonly fr: string; readonly en: string }>> = {
  metre: { fr: 'm', en: 'm' },
  kilometre: { fr: 'km', en: 'km' },
  squareMetre: { fr: 'm²', en: 'm²' },
  minute: { fr: 'min', en: 'min' },
  hour: { fr: 'h', en: 'h' },
  day: { fr: 'jours', en: 'days' },
  week: { fr: 'semaines', en: 'weeks' },
  xp: { fr: 'XP', en: 'XP' },
  point: { fr: 'points', en: 'points' },
  player: { fr: 'joueurs', en: 'players' },
  none: { fr: '', en: '' },
};

export interface HelpQuantity {
  /** Le nombre, déjà mis en forme pour la langue (jamais un littéral écrit). */
  readonly value: string;
  /** L'unité, déjà traduite. Vide pour un simple décompte. */
  readonly unit: string;
}

function quantity(value: number, unit: HelpUnitKey, fr: boolean): HelpQuantity {
  return { value: decimal(value, fr), unit: fr ? UNITS[unit].fr : UNITS[unit].en };
}

/** Une distance en mètres devient des kilomètres dès qu'elle en vaut au moins un. */
function distance(metres: number, fr: boolean): HelpQuantity {
  return metres >= METRES_PER_KILOMETRE
    ? quantity(metres / METRES_PER_KILOMETRE, 'kilometre', fr)
    : quantity(metres, 'metre', fr);
}

/** Rendu compact d'une quantité : « 25 m », « 2 km », « 3 » — jamais écrit à la main. */
export function say(quantityValue: HelpQuantity): string {
  return quantityValue.unit === '' ? quantityValue.value : `${quantityValue.value}${THIN_NBSP}${quantityValue.unit}`;
}

export type HelpFactKey = keyof ReturnType<typeof helpFacts2026>;

/**
 * TOUS les chiffres que le guide a le droit d'afficher, dérivés des règles.
 * Un chiffre absent d'ici n'a pas à apparaître à l'écran.
 */
export function helpFacts2026(fr: boolean) {
  const run = TERRITORY_RULES_2026.run;
  const bike = TERRITORY_RULES_2026.bike;
  const challenge = CHALLENGE_RULES_2026;
  const progression = PROGRESSION_RULES_2026;
  return {
    // ── Chapitre « Tu fermes une boucle » ───────────────────────────────────
    closureGapRun: distance(run.closureMaxGapM, fr),
    closureGapBike: distance(bike.closureMaxGapM, fr),
    minLoopRun: distance(run.minLoopDistanceM, fr),
    minLoopBike: distance(bike.minLoopDistanceM, fr),
    endpointAccuracy: distance(TERRITORY_RULES_2026.endpointMaxAccuracyM, fr),
    // ── Chapitre « La boucle devient ton terrain » ──────────────────────────
    minAreaRun: quantity(run.minAreaM2, 'squareMetre', fr),
    minAreaBike: quantity(bike.minAreaM2, 'squareMetre', fr),
    publicationDelay: quantity(TERRITORY_RULES_2026.publicationDelayMinutes, 'minute', fr),
    receiptMaxAge: quantity(TERRITORY_RULES_2026.captureReceiptMaxAgeHours, 'hour', fr),
    // ── Chapitre « Les points » ─────────────────────────────────────────────
    dailyMovement: quantity(progression.minimumMovementSecondsPerDay / SECONDS_PER_MINUTE, 'minute', fr),
    xpPerDay: quantity(progression.xpPerActiveDay, 'xp', fr),
    creditedDaysPerWeek: quantity(progression.maximumCreditedDaysPerWeek, 'none', fr),
    rankedMinimum: quantity(LEADERBOARD_RULES_2026.minRankedSubjects, 'player', fr),
    // ── Chapitre « Le crew » ────────────────────────────────────────────────
    teamSize: quantity(challenge.playersPerTeam, 'player', fr),
    teamCount: quantity(challenge.teamCount, 'none', fr),
    challengeDays: quantity(challenge.durationDays, 'day', fr),
    sectorCount: quantity(challenge.sectorCount, 'none', fr),
    contributiveDays: quantity(challenge.maximumContributiveDaysPerPlayer, 'day', fr),
    pointsPerDay: quantity(challenge.pointsPerDay, 'point', fr),
    maxPointsPerPlayer: quantity(challenge.maximumPointsPerPlayer, 'point', fr),
    maxPointsPerTeam: quantity(challenge.maximumPointsPerTeam, 'point', fr),
    insideSectorRun: distance(challenge.minimumTraceInsideSectorM.run, fr),
    insideSectorBike: distance(challenge.minimumTraceInsideSectorM.bike, fr),
    // ── Chapitre « La saison » ──────────────────────────────────────────────
    seasonWeeks: quantity(progression.seasonWeeks, 'week', fr),
    seasonTiers: quantity(progression.seasonTierCount, 'none', fr),
    seasonXpPerTier: quantity(progression.seasonXpPerTier, 'xp', fr),
    // ── Chapitre « Fair-play et sécurité » ──────────────────────────────────
    clockTolerance: quantity(TERRITORY_RULES_2026.clockToleranceSeconds / SECONDS_PER_MINUTE, 'minute', fr),
    finalSyncWindow: quantity(challenge.finalSyncWindowHours, 'hour', fr),
  } as const;
}
