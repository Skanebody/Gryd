/**
 * GRYD — season_close/logic.ts (SPEC §3.6, GRYD_reglement_saison_0.md §1/§13/§15).
 *
 * Fonctions PURES :
 *   - buildScoreInputs : range les faits bruts de la saison PAR DISCIPLINE
 *     (E12 « rangs SÉPARÉS », E14 « métriques JAMAIS sommées »).
 *   - computeFinalRanks : classement final avec la cascade d'égalités du
 *     règlement §13 — courses valides > jours actifs > hexes défendus >
 *     ancienneté de la 1re capture > égalité assumée (même rang).
 *     NB : le critère « participation crew » (§13.4) est sauté en MVP — non
 *     mesurable proprement avant les coffres/offensives crew (V1).
 *   - founderBadges : badge Fondateur permanent pour tous les classés + titre
 *     local pour le n°1 (« Gardien·ne de [ville] », règlement §15).
 *   - resetPlan : dates de clôture (règlement §1) — gel 24 h → résultats J+1 →
 *     intersaison INTERSEASON_DAYS → reset carte.
 */
import { type Activity, INTERSEASON_DAYS } from '../_shared/game-rules.ts';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const FREEZE_HOURS = 24; // règlement §1 : gel des scores 24 h

/** Score final d'un joueur, enrichi des critères d'égalité §13. */
export interface SeasonScoreInput {
  userId: string;
  points: number;
  /** §13.1 : nombre de courses valides (valid + partial) sur la saison. */
  validRuns: number;
  /** §13.2 : nombre de jours distincts avec au moins une course valide. */
  activeDays: number;
  /** §13.3 : nombre d'hexes défendus sur la saison. */
  defendedHexes: number;
  /** §13.5 : date de la première capture (null = jamais capturé → dernier). */
  firstCaptureAt: Date | null;
}

export interface RankedScore extends SeasonScoreInput {
  /** Rang compétition (1224) : les ex æquo partagent le rang, le suivant saute. */
  rank: number;
  /** true si le rang est partagé (égalité assumée, §13.6). */
  tied: boolean;
}

// ─── Faits bruts de la saison, rangés PAR DISCIPLINE (E12/E14) ───────────────

/**
 * Une ligne `season_scores` de la saison. Une par (joueur, discipline) depuis
 * la migration 0070 — la clé primaire est `(season_id, user_id, activity)`.
 */
export interface SeasonScoreRow {
  userId: string;
  points: number;
  activity: Activity;
}

/** Une course de la fenêtre de saison (§13.1 volume, §13.2 jours actifs). */
export interface SeasonRunRow {
  userId: string;
  /** ISO — seule la partie date (10 caractères) est lue, en UTC comme avant. */
  startedAt: string;
  activity: Activity;
}

/** Un hexagone tenu en fin de saison (§13.3 défenses, §13.5 ancienneté). */
export interface SeasonHexRow {
  ownerUserId: string;
  claimType: string;
  claimedAt: string;
  activity: Activity;
}

export interface SeasonFacts {
  scores: readonly SeasonScoreRow[];
  runs: readonly SeasonRunRow[];
  hexes: readonly SeasonHexRow[];
}

/**
 * Range les faits de la saison en UN JEU D'ENTRÉES PAR DISCIPLINE. PURE.
 *
 * ═══ POURQUOI CETTE FONCTION EXISTE ════════════════════════════════════════
 * `season_close` agrégeait TOUT sur le seul `user_id`. Depuis 0070, ça produit
 * deux fautes distinctes, et la seconde est irréversible :
 *
 *  1. UN JOUEUR HYBRIDE COMPTAIT DOUBLE. `season_scores` a désormais une ligne
 *     par discipline : le même joueur apparaissait DEUX FOIS dans le
 *     classement, et le gel de `rank_cache` — filtré sur `(season_id, user_id)`
 *     seul — écrasait ses deux lignes avec le dernier rang écrit.
 *  2. LES DÉPARTAGES §13 MÉLANGEAIENT LES MONDES. Ana et Ben à 4 200 points en
 *     COURSE ; Ana a 12 hexes défendus à pied, Ben 9 à pied et 40 à vélo. Le
 *     départage lisant `hex_claims` sur `owner_user_id` seul comptait 49
 *     contre 12 : Ben gagnait le classement COURSE grâce à ses défenses à
 *     VÉLO. Même faute, plus discrète, sur §13.1 (courses valides) et §13.2
 *     (jours actifs) : une sortie vélo départageait un rang de course.
 *     Et cela arrive au moment EXACT où le classement est gelé dans
 *     `rank_cache` : rien, ensuite, ne le rouvre.
 *
 * La discipline n'est donc pas un filtre appliqué à un classement commun :
 * c'est la CLÉ de partition de tout le calcul. Un monde ne départage que
 * lui-même.
 *
 * Ce qui reste volontairement COMMUN : rien. Les quatre critères §13 mesurés
 * ici (points, courses valides, jours actifs, hexes défendus, 1re capture)
 * portent tous sur une performance de saison, donc sur UN monde.
 *
 * Les disciplines sans aucune ligne `season_scores` ne sont PAS fabriquées :
 * la Map ne contient que les mondes réellement joués. Un classement vide
 * n'existe pas — on ne clôt pas une saison de vélo que personne n'a courue.
 */
export function buildScoreInputs(facts: SeasonFacts): Map<Activity, SeasonScoreInput[]> {
  // Clé d'agrégation = (monde, joueur). Le séparateur `|` n'apparaît ni dans une
  // discipline ('run' | 'bike') ni dans un UUID : aucune collision possible entre
  // deux couples distincts.
  const key = (activity: Activity, userId: string): string => `${activity}|${userId}`;
  const validRuns = new Map<string, number>();
  const activeDays = new Map<string, Set<string>>();
  for (const r of facts.runs) {
    const k = key(r.activity, r.userId);
    validRuns.set(k, (validRuns.get(k) ?? 0) + 1);
    let days = activeDays.get(k);
    if (!days) activeDays.set(k, days = new Set());
    days.add(r.startedAt.slice(0, 10));
  }

  const defended = new Map<string, number>();
  const firstCapture = new Map<string, Date>();
  for (const h of facts.hexes) {
    const k = key(h.activity, h.ownerUserId);
    if (h.claimType === 'defended') defended.set(k, (defended.get(k) ?? 0) + 1);
    const claimedAt = new Date(h.claimedAt);
    if (Number.isNaN(claimedAt.getTime())) continue; // date illisible : on n'invente pas
    const prev = firstCapture.get(k);
    if (!prev || claimedAt.getTime() < prev.getTime()) firstCapture.set(k, claimedAt);
  }

  const byActivity = new Map<Activity, SeasonScoreInput[]>();
  for (const s of facts.scores) {
    const k = key(s.activity, s.userId);
    let bucket = byActivity.get(s.activity);
    if (!bucket) byActivity.set(s.activity, bucket = []);
    bucket.push({
      userId: s.userId,
      points: s.points,
      validRuns: validRuns.get(k) ?? 0,
      activeDays: activeDays.get(k)?.size ?? 0,
      defendedHexes: defended.get(k) ?? 0,
      firstCaptureAt: firstCapture.get(k) ?? null,
    });
  }
  return byActivity;
}

/**
 * Les joueurs qui ont RÉELLEMENT un résultat dans PLUS D'UN monde. PURE.
 *
 * ═══ POURQUOI ON NE NOMME PAS LE MONDE À TOUT LE MONDE ══════════════════════
 * « Classement final EN COURSE À PIED : n°3 » lève une ambiguïté qui n'existe
 * que si le joueur a DEUX classements. Pour quelqu'un qui n'a qu'un monde — au
 * 25/07/2026 c'est 100 % des joueurs, zéro ligne `bike` en base — la précision
 * ne distingue rien : elle qualifie une distinction que le produit n'offre pas
 * encore. Du bruit imposé à tous pour zéro cas d'usage (§A : 1 écran = 1 idée).
 *
 * Ce n'est pas non plus une demi-vérité : « n°3 » tout court est EXACT quand
 * il n'y a qu'un classement. On ne cache rien — la discipline reste dans le
 * `payload.activity`, exploitable par l'app sans être imposée à la lecture.
 *
 * La source est le classement LUI-MÊME, pas une lecture de plus : un joueur
 * multi-monde est, par définition, celui qui apparaît dans plusieurs seaux de
 * `buildScoreInputs`. Aucune I/O, aucune approximation.
 */
export function multiWorldUsers(
  byActivity: ReadonlyMap<Activity, readonly SeasonScoreInput[]>,
): Set<string> {
  const seenIn = new Map<string, number>();
  for (const scores of byActivity.values()) {
    // `new Set` : un même joueur ne peut pas se rendre « hybride » tout seul si
    // un jour un seau contenait deux fois la même personne.
    for (const userId of new Set(scores.map((s) => s.userId))) {
      seenIn.set(userId, (seenIn.get(userId) ?? 0) + 1);
    }
  }
  return new Set([...seenIn].filter(([, worlds]) => worlds > 1).map(([userId]) => userId));
}

/** Compare deux scores : négatif si a devant b. Cascade §13 (sans crew, cf. header). */
function compareScores(a: SeasonScoreInput, b: SeasonScoreInput): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.validRuns !== b.validRuns) return b.validRuns - a.validRuns; // §13.1
  if (a.activeDays !== b.activeDays) return b.activeDays - a.activeDays; // §13.2
  if (a.defendedHexes !== b.defendedHexes) return b.defendedHexes - a.defendedHexes; // §13.3
  // §13.5 : première capture la plus ANCIENNE devant ; jamais capturé = dernier.
  const aT = a.firstCaptureAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bT = b.firstCaptureAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (aT !== bT) return aT - bT;
  return 0; // §13.6 : égalité assumée
}

export function computeFinalRanks(scores: readonly SeasonScoreInput[]): RankedScore[] {
  const sorted = [...scores].sort(compareScores);
  const ranked: RankedScore[] = [];
  for (let i = 0; i < sorted.length; i++) {
    // Rang compétition : identique au précédent si égalité parfaite, sinon i+1.
    const rank = i > 0 && compareScores(sorted[i - 1], sorted[i]) === 0
      ? ranked[i - 1].rank
      : i + 1;
    ranked.push({ ...sorted[i], rank, tied: false });
  }
  // Marquage des égalités assumées (rang partagé).
  for (let i = 0; i < ranked.length; i++) {
    ranked[i].tied = (i > 0 && ranked[i - 1].rank === ranked[i].rank) ||
      (i + 1 < ranked.length && ranked[i + 1].rank === ranked[i].rank);
  }
  return ranked;
}

// ─── Badges (règlement §15, SPEC §3.6, catalogue V2 AMENDEMENT-06 §1) ────────

/** Fondateur Saison 0 : badge onboarding 'saison_0' du catalogue V2 (§1.2). */
export const FOUNDER_BADGE_KEY = 'saison_0';
/**
 * Titre n°1 local. Catalogue V2 : plus de 'season_top1_local' — le #1 local
 * correspond au niveau 5 de la famille Season Rank ('Termine #1 local.', §1.2).
 * (Compat : constante conservée, pointe désormais sur la clé V2.)
 */
export const LOCAL_TOP1_BADGE_KEY = 'season_rank_5';

/**
 * Médailles Season Rank (famille saison V2, §1.2, décernées PAR season_close) :
 * paliers de classement LOCAL par rang final (top 100 / 50 / 10 / 3 / #1 /
 * winner). key = season_rank_1..5 + season_rank_legend. Cumulatif : le top 3
 * décroche aussi top 10/50/100 (le moteur d'attribution ignore les doublons).
 * `winner` (season_rank_legend) = « Remporte la saison locale » : réservé au(x)
 * n°1 non ex æquo (un seul vrai vainqueur ; sinon titre #1 partagé sans legend).
 */
const SEASON_RANK_TIERS: readonly { maxRank: number; key: string }[] = [
  { maxRank: 100, key: 'season_rank_1' },
  { maxRank: 50, key: 'season_rank_2' },
  { maxRank: 10, key: 'season_rank_3' },
  { maxRank: 3, key: 'season_rank_4' },
  { maxRank: 1, key: 'season_rank_5' },
];

export interface BadgeAward {
  userId: string;
  badgeKey: string;
}

/**
 * Badges de fin de saison LOCALE. Pour tous les participants (points > 0) :
 *  - Fondateur ('saison_0') ;
 *  - toutes les médailles Season Rank atteintes par leur rang (cumulatif) ;
 *  - 'season_rank_legend' pour le vrai vainqueur (rang 1 NON ex æquo).
 * NB : National Rank / Crew Season (familles saison restantes) relèvent du
 * classement France et du classement crew — hors périmètre du close local MVP.
 */
export function founderBadges(ranks: readonly RankedScore[]): BadgeAward[] {
  const awards: BadgeAward[] = [];
  for (const r of ranks) {
    if (r.points <= 0) continue; // inscrit sans participation : rien
    awards.push({ userId: r.userId, badgeKey: FOUNDER_BADGE_KEY });
    for (const tier of SEASON_RANK_TIERS) {
      if (r.rank <= tier.maxRank) awards.push({ userId: r.userId, badgeKey: tier.key });
    }
    // Vainqueur incontesté : legend. Un #1 ex æquo garde le titre #1 (season_rank_5)
    // mais pas le legend « remporte la saison » (pas de vainqueur unique).
    if (r.rank === 1 && !r.tied) awards.push({ userId: r.userId, badgeKey: 'season_rank_legend' });
  }
  return awards;
}

// ─── Plan de clôture (règlement §1) ──────────────────────────────────────────

export interface ResetPlan {
  /** Gel des scores : aucune écriture de points pendant 24 h après la fin. */
  freezeEndsAt: Date;
  /** Publication des résultats : J+1 après la fin de saison. */
  resultsAt: Date;
  /** Wipe effectif de la carte : résultats + INTERSEASON_DAYS d'intersaison. */
  resetAt: Date;
}

/** @param closesAt fin de la saison (seasons.ends_at) — pas l'heure du cron,
 * pour que le plan soit déterministe quel que soit le retard du job. */
export function resetPlan(closesAt: Date): ResetPlan {
  const freezeEndsAt = new Date(closesAt.getTime() + FREEZE_HOURS * MS_PER_HOUR);
  const resultsAt = new Date(closesAt.getTime() + MS_PER_DAY); // J+1
  const resetAt = new Date(resultsAt.getTime() + INTERSEASON_DAYS * MS_PER_DAY);
  return { freezeEndsAt, resultsAt, resetAt };
}
