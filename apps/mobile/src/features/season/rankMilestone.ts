/**
 * GRYD — E59 « prochain jalon » : le RANG SUIVANT sur l'échelle GRIP, et l'XP
 * qui en sépare. Moteur PUR (aucun import React/RN), testable en Deno.
 *
 * ─── POURQUOI CE MODULE, ET CE QU'IL NE FAIT PAS ─────────────────────────────
 * La spéc E59 demande « XP » et « prochain jalon ». Les deux existaient déjà
 * SÉPARÉMENT dans le dépôt et nulle part ensemble :
 *   · la courbe d'XP → niveau vit dans `@klaim/engine` (`playerLevelXpTable`,
 *     `playerLevelForXp`) et l'échelle des rangs dans `GRIP_RANK_LEVELS`
 *     (@klaim/shared) ;
 *   · l'écran Profil recalculait à la main plancher/plafond de niveau
 *     (app/(tabs)/profil.tsx : `levelFloor` / `levelCeil` / `levelRatio`), donc
 *     hors de portée d'un test.
 * Ici, cette dérivation devient une fonction pure, et le JALON (« quel rang
 * s'ouvre, à quel niveau ») en découle sans nouvelle courbe.
 *
 * ── CE QU'IL N'INVENTE JAMAIS ────────────────────────────────────────────────
 *  · aucune table d'XP locale : le tableau cumulé est passé en PARAMÈTRE (même
 *    discipline que `leagueGap(…, pointsPerHex)`), pour qu'il n'existe qu'une
 *    seule courbe dans le produit — celle du moteur ;
 *  · aucun jalon au-delà du dernier rang : au sommet, `next` vaut `null` et
 *    l'écran DIT « il n'y a rien au-dessus » plutôt que de peindre un palier ;
 *  · aucune progression fabriquée : sans plafond lisible (dernier niveau), le
 *    ratio vaut 1 — jamais un NaN, jamais une barre qui repart à zéro.
 *
 * ── ANTI-PAY-TO-WIN (constitution §3) ────────────────────────────────────────
 * L'unique entrée de ce module est l'XP, et l'XP ne se crédite QUE par une
 * course validée serveur (`claim_hexes`, D18). Aucun paramètre d'achat, de
 * boost ou d'abonnement n'entre ici : un rang ne peut pas s'acheter, y compris
 * par accident.
 */
import { GRIP_RANK_LEVELS, type GripRank } from '@klaim/shared';

/** Un barreau de l'échelle GRIP : le rang, et le niveau qui l'ouvre. */
export interface RankRung {
  rank: GripRank;
  /** Niveau joueur MINIMAL qui ouvre ce rang (borne basse, §43.3). */
  level: number;
}

/**
 * L'échelle GRIP triée par niveau CROISSANT, dérivée de `GRIP_RANK_LEVELS` —
 * jamais réécrite ici. Le tri est explicite : l'ordre des clés d'un objet est
 * une propriété du fichier source, pas un contrat.
 */
export const RANK_LADDER: readonly RankRung[] = (
  Object.entries(GRIP_RANK_LEVELS) as [GripRank, number][]
)
  .map(([rank, level]) => ({ rank, level }))
  .sort((a, b) => a.level - b.level);

export interface RankMilestone {
  /** Rang tenu au niveau donné (plancher `rookie` — jamais « aucun rang »). */
  current: RankRung;
  /** Le barreau suivant, ou `null` au sommet de l'échelle. */
  next: RankRung | null;
  /** Niveaux à gagner pour l'atteindre. `null` quand il n'y a plus de suivant. */
  levelsToNext: number | null;
}

/**
 * Où se situe un NIVEAU sur l'échelle des rangs. Total et défensif : un niveau
 * absurde (0, NaN, négatif) retombe sur le premier barreau plutôt que de rendre
 * un rang indéfini que l'écran devrait deviner.
 */
export function rankMilestoneFor(level: number): RankMilestone {
  const safeLevel = Number.isFinite(level) ? Math.trunc(level) : 1;
  // RANK_LADDER n'est jamais vide (GRIP_RANK_LEVELS a sept entrées), mais le
  // typage strict ne le sait pas : plancher explicite.
  const first = RANK_LADDER[0] ?? { rank: 'rookie' as GripRank, level: 1 };

  let current: RankRung = first;
  let next: RankRung | null = null;
  for (const rung of RANK_LADDER) {
    if (safeLevel >= rung.level) current = rung;
    else if (next === null) next = rung;
  }
  return {
    current,
    next,
    levelsToNext: next === null ? null : Math.max(0, next.level - safeLevel),
  };
}

/** Progression DANS le niveau courant, bornes réelles lues dans la courbe. */
export interface LevelProgress {
  /** Niveau courant (celui rendu par la courbe pour cet XP). */
  level: number;
  /** XP cumulée qui ouvre le niveau courant. */
  floorXp: number;
  /** XP cumulée qui ouvre le niveau SUIVANT. `null` au dernier niveau. */
  ceilXp: number | null;
  /** Remplissage 0..1 entre plancher et plafond. 1 au dernier niveau. */
  ratio: number;
  /** XP restante avant le niveau suivant. `null` au dernier niveau. */
  xpToNext: number | null;
}

/**
 * Progression d'XP à l'intérieur du niveau, à partir de la COURBE RÉELLE.
 *
 * @param xp    XP cumulée du joueur (users.xp, valeur serveur).
 * @param table tableau d'XP cumulée par niveau (index 0 = niveau 1), tel que
 *              rendu par `playerLevelXpTable()` (@klaim/engine). Passé en
 *              paramètre pour qu'il n'existe qu'une seule courbe dans GRYD.
 * @param level niveau courant (`playerLevelForXp(xp)`), passé plutôt que
 *              recalculé : deux dérivations du même nombre finiraient par
 *              diverger.
 */
export function levelProgress(
  xp: number,
  table: readonly number[],
  level: number,
): LevelProgress {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : 1;
  const floorXp = table[safeLevel - 1] ?? 0;
  const rawCeil = table[safeLevel];
  // Un plafond qui ne dépasse pas le plancher n'est pas un plafond : on le
  // traite comme un sommet (ratio plein) plutôt que de diviser par zéro.
  const ceilXp = rawCeil !== undefined && rawCeil > floorXp ? rawCeil : null;
  if (ceilXp === null) {
    return { level: safeLevel, floorXp, ceilXp: null, ratio: 1, xpToNext: null };
  }
  const ratio = Math.min(1, Math.max(0, (safeXp - floorXp) / (ceilXp - floorXp)));
  return {
    level: safeLevel,
    floorXp,
    ceilXp,
    ratio,
    xpToNext: Math.max(0, ceilXp - safeXp),
  };
}
