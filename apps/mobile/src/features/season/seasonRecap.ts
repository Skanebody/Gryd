/**
 * GRYD — E61 « Fin de saison » : LE FAIT SERVEUR, lu et jamais recalculé.
 * Moteur PUR (aucun import React/RN), testable en Deno.
 *
 * ─── D'OÙ VIENT LE BILAN, ET POURQUOI C'EST LA SEULE SOURCE ADMISSIBLE ───────
 * `season_close/index.ts` insère, à la clôture, UNE notification par RÉSULTAT
 * (type 'season', une par discipline jouée), dont le payload porte le rang final
 * calculé SERVEUR :
 *
 *   { seasonId, activity, rank, tied, points, resetAt, title, body }
 *
 * C'est le seul fait qui autorise E61 à s'afficher. La constitution est
 * explicite : une célébration déclenchée par un calcul CLIENT serait un mensonge
 * doublé d'une violation de « tout est décidé serveur ». Ce module ne DÉRIVE
 * donc aucun rang : il LIT celui que le serveur a gelé (et que
 * `season_scores.rank_cache` porte aussi), ou il ne rend rien.
 *
 * `title` / `body` du payload sont IGNORÉS : ce sont des phrases françaises
 * composées côté Edge Function, et E61 s'affiche dans cinq langues. On lit les
 * champs STRUCTURÉS et l'écran rédige — sinon un joueur allemand lirait « Saison
 * terminée » au milieu de son bilan.
 *
 * ─── LES RÉCOMPENSES NE SONT PAS « ATTRIBUÉES » ICI ──────────────────────────
 * `recapRewards` rejoue EXACTEMENT la règle de `founderBadges` (season_close) :
 * mêmes paliers `SEASON_RANK_TIERS`, même exclusion du legend pour un n°1
 * ex æquo. Ce n'est pas une seconde attribution — le serveur a déjà écrit dans
 * `user_badges` ; c'est l'ÉNONCÉ de ce qu'il a fait. Si les deux divergeaient un
 * jour, c'est ce module qui aurait tort, et le test le dit.
 *
 * ─── ANTI-PAY-TO-WIN (constitution §3) ───────────────────────────────────────
 * Aucune entrée d'achat, aucun palier « premium ». Le rang final vient d'une
 * course validée ; les récompenses sont des badges cosmétiques. Rien ici ne peut
 * être influencé par une transaction.
 */
import { type Activity, ACTIVITIES } from '@klaim/shared';
import { SEASON_REWARD_TIERS, type SeasonRewardTier, tierReachedBy } from './seasonRewards';

/** Le résultat de saison tel que le SERVEUR l'a arrêté. Rien de dérivé. */
export interface SeasonRecap {
  /** Saison close concernée (`seasons.id`). */
  seasonId: string;
  /** Discipline du classement : un résultat par monde, jamais une somme (E14). */
  activity: Activity;
  /** Rang final GELÉ par season_close (≥ 1). */
  rank: number;
  /** Rang PARTAGÉ (§13.6 du règlement) — l'écran le dit, il ne le masque pas. */
  tied: boolean;
  /** Points de saison au moment de la clôture. */
  points: number;
  /** Date du wipe de la carte (ISO), ou `null` si le payload ne la porte pas. */
  resetAt: string | null;
}

function isActivity(value: unknown): value is Activity {
  return typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value);
}

/**
 * Payload d'une notification 'season' → résultat typé, ou `null`.
 *
 * TOTAL et STRICT : un payload amputé (pas de rang, rang ≤ 0, discipline
 * inconnue) ne rend RIEN. Mieux vaut un E61 qui dit « bilan indisponible »
 * qu'un E61 qui affiche « #0 » ou qui devine « run » — un rang deviné serait
 * précisément le calcul client que la constitution interdit.
 */
export function parseSeasonRecap(raw: unknown): SeasonRecap | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  const seasonId = typeof p.seasonId === 'string' ? p.seasonId : null;
  const rank =
    typeof p.rank === 'number' && Number.isFinite(p.rank) && p.rank >= 1
      ? Math.trunc(p.rank)
      : null;
  const points =
    typeof p.points === 'number' && Number.isFinite(p.points) && p.points >= 0
      ? Math.trunc(p.points)
      : null;

  if (seasonId === null || rank === null || points === null || !isActivity(p.activity)) {
    return null;
  }
  // `resetAt` est facultatif : son absence retire la ligne « prochaine saison »,
  // elle n'invalide pas le rang final. Une date illisible est traitée comme
  // absente — on ne montre pas une échéance qu'on n'a pas su lire.
  const resetAtRaw = typeof p.resetAt === 'string' ? p.resetAt : null;
  const resetAt = resetAtRaw !== null && Number.isFinite(Date.parse(resetAtRaw)) ? resetAtRaw : null;

  return { seasonId, activity: p.activity, rank, tied: p.tied === true, points, resetAt };
}

/**
 * Les paliers RÉELLEMENT décrochés par ce rang final — l'énoncé de ce que
 * `founderBadges` a écrit côté serveur, pas une nouvelle attribution.
 */
export function recapRewards(recap: SeasonRecap): SeasonRewardTier[] {
  return SEASON_REWARD_TIERS.filter((tier) => tierReachedBy(tier, recap.rank, recap.tied));
}

// ─── Bilan sportif de la fenêtre de saison ───────────────────────────────────

/** Une course de MOI, lue dans `runs` (RLS owner-only), dans la fenêtre. */
export interface RecapRunRow {
  startedAt: string;
  distanceM: number;
  status: string;
  activity: string;
}

export interface SeasonRecapSummary {
  /** Sorties VALIDÉES (valid + partial) — les seules qui comptent au classement. */
  runs: number;
  /** Jours DISTINCTS (UTC) avec au moins une sortie validée (§13.2 du règlement). */
  activeDays: number;
  /** Distance cumulée, en mètres. */
  distanceM: number;
}

/**
 * Bilan personnel de la saison, dérivé de MES courses. Même définition que le
 * moteur de clôture (`buildScoreInputs` : statuts 'valid' + 'partial', jours
 * distincts en UTC) — deux définitions de « jours actifs » finiraient par
 * afficher un chiffre que le classement ne reconnaît pas.
 *
 * ⚠ CE BILAN NE COMPTE NI LES ZONES NI LES DÉFENSES, volontairement : à la fin
 * d'une saison, `season_close` phase 2 SUPPRIME les lignes `hex_claims`. Un
 * compte de zones lu APRÈS le wipe rendrait 0 pour tout le monde — un chiffre
 * faux présenté comme un souvenir. On n'affiche que ce qui reste vrai.
 *
 * @param rows     mes courses lues sur la fenêtre.
 * @param activity discipline du résultat : un bilan de saison Run ne mélange
 *                 jamais des sorties vélo (E14, jamais de somme).
 */
export function seasonRecapSummary(
  rows: readonly RecapRunRow[],
  activity: Activity,
): SeasonRecapSummary {
  const days = new Set<string>();
  let runs = 0;
  let distanceM = 0;

  for (const row of rows) {
    if (row.activity !== activity) continue;
    if (row.status !== 'valid' && row.status !== 'partial') continue;
    runs += 1;
    if (Number.isFinite(row.distanceM) && row.distanceM > 0) distanceM += row.distanceM;
    // Jour UTC : mêmes 10 caractères que `buildScoreInputs` côté serveur.
    if (typeof row.startedAt === 'string' && row.startedAt.length >= 10) {
      days.add(row.startedAt.slice(0, 10));
    }
  }
  return { runs, activeDays: days.size, distanceM };
}
