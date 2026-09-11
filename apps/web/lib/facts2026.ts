/**
 * GRYD — LES CHIFFRES DU SITE PUBLIC (lot W3).
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * Le cahier de contenu §4.3 : « Aucun chiffre de jeu ne se tape à la main. » La
 * règle a une histoire — le site a un jour affiché un Founder Pack à 149 €
 * contre 9,99 € dans la source, un facteur 15 entre le lien public et la
 * vérité. Ce module est la SEULE porte par laquelle un nombre entre dans une
 * page : il lit `@klaim/shared` et met en forme, il ne DÉCIDE rien.
 *
 * C'est le pendant web de `apps/mobile/src/features/help/helpFacts2026.ts`, et
 * volontairement le même découpage (un nombre, une unité, jamais une chaîne
 * écrite à la main). `apps/web` ne peut pas importer `apps/mobile` (deux React,
 * deux bundlers) ; la source commune des DEUX, elle, est bien unique :
 * `packages/shared/src/game-rules.ts`.
 *
 * ─── CHAQUE VALEUR PORTE LE NOM DE SA CONSTANTE ─────────────────────────────
 * Un `SiteFact` n'est pas une chaîne : c'est une valeur ET sa provenance
 * (`rule`), que le composant `Stat` pose en `data-rule` dans le DOM. On peut
 * donc demander à une page « d'où sort ce nombre » sans lire le code, depuis
 * une capture comme depuis un test.
 *
 * Les seules constantes littérales tolérées ici sont des CONVERSIONS D'UNITÉS
 * universelles (60 secondes dans une minute, 1 000 mètres dans un kilomètre,
 * 100 centimes dans un euro, 365 jours dans une année). Aucune n'est une règle
 * de jeu, aucune ne peut « changer ».
 */
import {
  CHALLENGE_RULES_2026,
  COMMERCIAL_PROPOSAL_2026,
  LEADERBOARD_RULES_2026,
  MIN_AGE_YEARS,
  PROGRESSION_RULES_2026,
  SHARE_TRIM_M,
  TERRITORY_RULES_2026,
  TRACE_RETENTION_DAYS_2026,
} from '@klaim/shared';

/** Conversions d'unités — universelles, jamais des règles de jeu. */
const SECONDS_PER_MINUTE = 60;
const METRES_PER_KILOMETRE = 1_000;
const CENTS_PER_EURO = 100;
const DAYS_PER_YEAR = 365;

/**
 * Espace INSÉCABLE entre un nombre et son unité (typographie française), et
 * espace FINE insécable entre les milliers. Écrites par leur point de code : un
 * caractère invisible tapé au clavier finit un jour remplacé par une espace
 * ordinaire, et la ligne casse entre « 25 » et « m ».
 */
export const NBSP = ' ';
const THIN_NBSP = ' ';

/** Groupe les milliers sans dépendre d'`Intl` — même rendu que le guide de l'app. */
export function groupDigits(value: number): string {
  const digits = Math.abs(Math.round(value)).toString();
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i;
    out += digits.charAt(i);
    if (fromEnd > 1 && fromEnd % 3 === 1) out += THIN_NBSP;
  }
  return (value < 0 ? '-' : '') + out;
}

/** Le nombre seul, virgule décimale française. */
function decimal(value: number): string {
  return Number.isInteger(value) ? groupDigits(value) : value.toFixed(2).replace('.', ',');
}

/** Un nombre et son unité : « 25 m », « 100 XP », « 5 joueurs ». */
function unit(value: number, suffix: string): string {
  return suffix === '' ? decimal(value) : `${decimal(value)}${NBSP}${suffix}`;
}

/** Une distance passe en kilomètres dès qu'elle en vaut au moins un. */
function distance(metres: number): string {
  return metres >= METRES_PER_KILOMETRE
    ? unit(metres / METRES_PER_KILOMETRE, 'km')
    : unit(metres, 'm');
}

/** Un prix en centimes devient un prix en euros : « 5,99 € ». */
export function euros(cents: number): string {
  const value = cents / CENTS_PER_EURO;
  const rendered = Number.isInteger(value) ? groupDigits(value) : value.toFixed(2).replace('.', ',');
  return `${rendered}${NBSP}€`;
}

/** Une valeur affichée ET la constante dont elle sort. */
export interface SiteFact {
  readonly value: string;
  /** Le chemin de la constante source, cité en `data-rule` dans le DOM. */
  readonly rule: string;
}

function fact(value: string, rule: string): SiteFact {
  return { value, rule };
}

const run = TERRITORY_RULES_2026.run;
const bike = TERRITORY_RULES_2026.bike;
const challenge = CHALLENGE_RULES_2026;
const progression = PROGRESSION_RULES_2026;

/**
 * TOUS les chiffres que le site a le droit d'afficher. Un chiffre absent d'ici
 * n'a pas à apparaître à l'écran : le test `siteCopy2026.test.ts` relit chaque
 * phrase et refuse toute suite de chiffres qui ne vienne pas de cette table.
 */
export const SITE_FACTS = {
  // ── La boucle ───────────────────────────────────────────────────────────
  closureRun: fact(distance(run.closureMaxGapM), 'TERRITORY_RULES_2026.run.closureMaxGapM'),
  closureBike: fact(distance(bike.closureMaxGapM), 'TERRITORY_RULES_2026.bike.closureMaxGapM'),
  minLoopRun: fact(distance(run.minLoopDistanceM), 'TERRITORY_RULES_2026.run.minLoopDistanceM'),
  minLoopBike: fact(distance(bike.minLoopDistanceM), 'TERRITORY_RULES_2026.bike.minLoopDistanceM'),
  endpointAccuracy: fact(distance(TERRITORY_RULES_2026.endpointMaxAccuracyM), 'TERRITORY_RULES_2026.endpointMaxAccuracyM'),

  // ── Le terrain ──────────────────────────────────────────────────────────
  minAreaRun: fact(unit(run.minAreaM2, 'm²'), 'TERRITORY_RULES_2026.run.minAreaM2'),
  minAreaBike: fact(unit(bike.minAreaM2, 'm²'), 'TERRITORY_RULES_2026.bike.minAreaM2'),
  publicationDelay: fact(unit(TERRITORY_RULES_2026.publicationDelayMinutes, 'min'), 'TERRITORY_RULES_2026.publicationDelayMinutes'),
  receiptMaxAge: fact(unit(TERRITORY_RULES_2026.captureReceiptMaxAgeHours, 'h'), 'TERRITORY_RULES_2026.captureReceiptMaxAgeHours'),

  // ── Les points ──────────────────────────────────────────────────────────
  dailyMovement: fact(unit(progression.minimumMovementSecondsPerDay / SECONDS_PER_MINUTE, 'min'), 'PROGRESSION_RULES_2026.minimumMovementSecondsPerDay'),
  xpPerDay: fact(unit(progression.xpPerActiveDay, 'XP'), 'PROGRESSION_RULES_2026.xpPerActiveDay'),
  creditedDaysPerWeek: fact(unit(progression.maximumCreditedDaysPerWeek, ''), 'PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek'),
  rankedMinimum: fact(unit(LEADERBOARD_RULES_2026.minRankedSubjects, 'joueurs'), 'LEADERBOARD_RULES_2026.minRankedSubjects'),

  // ── Le crew et son défi ─────────────────────────────────────────────────
  teamSize: fact(unit(challenge.playersPerTeam, 'joueurs'), 'CHALLENGE_RULES_2026.playersPerTeam'),
  teamCount: fact(unit(challenge.teamCount, ''), 'CHALLENGE_RULES_2026.teamCount'),
  challengeDays: fact(unit(challenge.durationDays, 'jours'), 'CHALLENGE_RULES_2026.durationDays'),
  sectorCount: fact(unit(challenge.sectorCount, ''), 'CHALLENGE_RULES_2026.sectorCount'),
  contributiveDays: fact(unit(challenge.maximumContributiveDaysPerPlayer, ''), 'CHALLENGE_RULES_2026.maximumContributiveDaysPerPlayer'),
  pointsPerDay: fact(unit(challenge.pointsPerDay, 'points'), 'CHALLENGE_RULES_2026.pointsPerDay'),
  maxPointsPerPlayer: fact(unit(challenge.maximumPointsPerPlayer, 'points'), 'CHALLENGE_RULES_2026.maximumPointsPerPlayer'),
  maxPointsPerTeam: fact(unit(challenge.maximumPointsPerTeam, ''), 'CHALLENGE_RULES_2026.maximumPointsPerTeam'),
  insideSectorRun: fact(distance(challenge.minimumTraceInsideSectorM.run), 'CHALLENGE_RULES_2026.minimumTraceInsideSectorM.run'),
  insideSectorBike: fact(distance(challenge.minimumTraceInsideSectorM.bike), 'CHALLENGE_RULES_2026.minimumTraceInsideSectorM.bike'),

  // ── La saison ───────────────────────────────────────────────────────────
  seasonWeeks: fact(unit(progression.seasonWeeks, 'semaines'), 'PROGRESSION_RULES_2026.seasonWeeks'),
  seasonTiers: fact(unit(progression.seasonTierCount, ''), 'PROGRESSION_RULES_2026.seasonTierCount'),
  seasonXpPerTier: fact(unit(progression.seasonXpPerTier, 'XP'), 'PROGRESSION_RULES_2026.seasonXpPerTier'),

  // ── Fair-play ───────────────────────────────────────────────────────────
  clockTolerance: fact(unit(TERRITORY_RULES_2026.clockToleranceSeconds / SECONDS_PER_MINUTE, 'min'), 'TERRITORY_RULES_2026.clockToleranceSeconds'),
  finalSyncWindow: fact(unit(challenge.finalSyncWindowHours, 'h'), 'CHALLENGE_RULES_2026.finalSyncWindowHours'),

  // ── Vie privée ──────────────────────────────────────────────────────────
  shareTrim: fact(distance(SHARE_TRIM_M), 'SHARE_TRIM_M'),
  retentionShort: fact(unit(TRACE_RETENTION_DAYS_2026.days_90 ?? 0, 'jours'), 'TRACE_RETENTION_DAYS_2026.days_90'),
  retentionLong: fact(unit((TRACE_RETENTION_DAYS_2026.days_365 ?? 0) / DAYS_PER_YEAR, 'an'), 'TRACE_RETENTION_DAYS_2026.days_365'),
  minimumAge: fact(unit(MIN_AGE_YEARS, 'ans'), 'MIN_AGE_YEARS'),

  // ── L'offre. Des PRIX PRÉVUS : la page le dit avant de les montrer. ──────
  offerMonthly: fact(euros(COMMERCIAL_PROPOSAL_2026.monthlyEurCents), 'COMMERCIAL_PROPOSAL_2026.monthlyEurCents'),
  offerAnnual: fact(euros(COMMERCIAL_PROPOSAL_2026.annualEurCents), 'COMMERCIAL_PROPOSAL_2026.annualEurCents'),
  collectionContour: fact(euros(COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents.contour), 'COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents.contour'),
  collectionRelief: fact(euros(COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents.relief), 'COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents.relief'),
  collectionClubhouse: fact(euros(COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents.clubhouse), 'COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents.clubhouse'),

  // ── Anti-pay-to-win : les trois multiplicateurs, affichés comme facteurs. ─
  captureMultiplier: fact(`×${NBSP}${COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier}`, 'COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier'),
  xpMultiplier: fact(`×${NBSP}${COMMERCIAL_PROPOSAL_2026.paidXpMultiplier}`, 'COMMERCIAL_PROPOSAL_2026.paidXpMultiplier'),
  challengeMultiplier: fact(`×${NBSP}${COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier}`, 'COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier'),
} as const satisfies Record<string, SiteFact>;

export type SiteFactKey = keyof typeof SITE_FACTS;

/** Un chiffre prêt pour le composant `Stat` : sa valeur, son libellé, sa provenance. */
export interface SiteStat {
  readonly value: string;
  readonly label: string;
  readonly rule: string;
}

/**
 * Habille un fait d'un libellé. Le libellé est de la PROSE (il se relit comme
 * une phrase du cahier) ; la valeur et la provenance, elles, restent celles de
 * la constante. Aucune page ne construit un `Stat` autrement.
 */
export function stat(source: SiteFact, label: string): SiteStat {
  return { value: source.value, label, rule: source.rule };
}

/**
 * LES MÊMES VALEURS, SANS LEUR UNITÉ.
 *
 * Une phrase du cahier écrit souvent l'unité elle-même : « deux équipes de 5
 * pendant 7 jours », « au moins 10 minutes de mouvement », « les 250 premiers
 * mètres ». Y interpoler « 5 joueurs » ou « 10 min » casserait la phrase. Ces
 * nombres nus servent À ÇA, et à rien d'autre : ils sortent des mêmes
 * constantes, au même instant, donc une règle qui change change aussi la prose.
 */
export const SITE_COUNTS = {
  teamSize: decimal(challenge.playersPerTeam),
  teamCount: decimal(challenge.teamCount),
  challengeDays: decimal(challenge.durationDays),
  sectorCount: decimal(challenge.sectorCount),
  contributiveDays: decimal(challenge.maximumContributiveDaysPerPlayer),
  pointsPerDay: decimal(challenge.pointsPerDay),
  maxPointsPerPlayer: decimal(challenge.maximumPointsPerPlayer),
  maxPointsPerTeam: decimal(challenge.maximumPointsPerTeam),
  dailyMovementMinutes: decimal(progression.minimumMovementSecondsPerDay / SECONDS_PER_MINUTE),
  xpPerDay: decimal(progression.xpPerActiveDay),
  creditedDaysPerWeek: decimal(progression.maximumCreditedDaysPerWeek),
  rankedMinimum: decimal(LEADERBOARD_RULES_2026.minRankedSubjects),
  seasonWeeks: decimal(progression.seasonWeeks),
  seasonTiers: decimal(progression.seasonTierCount),
  shareTrimMetres: decimal(SHARE_TRIM_M),
  retentionShortDays: decimal(TRACE_RETENTION_DAYS_2026.days_90 ?? 0),
  retentionLongYears: decimal((TRACE_RETENTION_DAYS_2026.days_365 ?? 0) / DAYS_PER_YEAR),
  minimumAge: decimal(MIN_AGE_YEARS),
} as const;

/** Le nom de l'offre, lu à la source. La SEULE forme en capitales de la prose. */
export const OFFER = COMMERCIAL_PROPOSAL_2026.subscriptionName;

/** Toutes les valeurs affichables, à plat. Le test s'en sert de dictionnaire. */
export function factValues(): string[] {
  return [...Object.values(SITE_FACTS).map((value) => value.value), ...Object.values(SITE_COUNTS)];
}
