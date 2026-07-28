/**
 * GRYD — RANGS DE CLASSEMENT AVEC ÉGALITÉS (planche E11, état « égalité »).
 *
 * ─── LE DÉSACCORD CORRIGÉ (25/07/2026) ───────────────────────────────────────
 * Le lecteur serveur (`features/social/leagueBoard.ts`) numérote les lignes
 * `index + 1`. Deux joueurs à points ÉGAUX s'affichaient donc #3 et #4 — alors
 * que le moteur de clôture (`season_close/logic.ts` : `compareScores` /
 * `RankedScore.tied`) applique un rang 1224 PARTAGÉ. L'écran affirmait un ordre
 * que le jeu ne reconnaît pas : il « départageait » deux ex æquo au hasard de
 * l'ordre Postgres. Ce module ré-attribue les rangs comme le serveur le fera, et
 * marque les lignes concernées pour que l'égalité soit DITE (icône + texte,
 * jamais la couleur seule).
 *
 * PRÉCONDITION : `rows` arrive TRIÉE par valeur décroissante (c'est le contrat de
 * la requête `.order('points', { ascending: false })`). On ne re-trie pas : cela
 * bousculerait l'ordre serveur entre valeurs égales sans rien gagner.
 *
 * Module PUR : aucun import React/RN, testable en Deno.
 */
import type { LeagueRow } from '../social/league';

export interface RankedLeagueRow extends LeagueRow {
  /** Ce rang est PARTAGÉ avec au moins une autre ligne (ex æquo). */
  tied: boolean;
}

/**
 * Rangs 1224 (« standard competition ranking ») : deux valeurs égales partagent
 * le rang, et le suivant saute (1, 1, 3…). Exactement la règle du moteur.
 */
export function withTiedRanks(rows: readonly LeagueRow[]): RankedLeagueRow[] {
  const ranked: RankedLeagueRow[] = [];
  let rank = 0;
  let previousKey: string | null = null;

  rows.forEach((row, index) => {
    // CE QUI FAIT UNE ÉGALITÉ n'est pas toujours la valeur AFFICHÉE. Sur le
    // classement de surface (E53 §10.2), deux joueurs à surface égale peuvent
    // être départagés par leurs défenses puis leur conquête : ils occupent deux
    // rangs distincts et ne doivent pas porter la mention « ex æquo ». La ligne
    // porte alors une `tieKey` qui encode TOUS les critères ; à défaut (boards
    // en points, en hexes…) on retombe sur la valeur, comportement d'origine.
    const key = row.tieKey ?? String(row.value);
    // Clé identique à la précédente ⇒ même rang ; sinon le rang « rattrape »
    // la position (c'est le saut du 1224 après une égalité).
    if (previousKey === null || key !== previousKey) rank = index + 1;
    previousKey = key;
    ranked.push({ ...row, rank, tied: false });
  });

  const shared = new Map<number, number>();
  for (const row of ranked) shared.set(row.rank, (shared.get(row.rank) ?? 0) + 1);

  return ranked.map((row) => ({ ...row, tied: (shared.get(row.rank) ?? 0) > 1 }));
}

/**
 * La ligne juste AU-DESSUS de la mienne — celle qu'il faut dépasser. Avec les
 * égalités, « rang - 1 » peut ne pas exister (1, 1, 3 : pas de #2) : on remonte
 * donc jusqu'à la première ligne au rang STRICTEMENT meilleur. Un ex æquo n'est
 * pas quelqu'un à dépasser, c'est quelqu'un qu'on égale déjà.
 */
export function rowAboveMe(rows: readonly RankedLeagueRow[]): RankedLeagueRow | undefined {
  const meIndex = rows.findIndex((r) => r.me === true);
  if (meIndex < 0) return undefined;
  const me = rows[meIndex];
  if (!me) return undefined;
  for (let i = meIndex - 1; i >= 0; i--) {
    const candidate = rows[i];
    if (candidate && candidate.rank < me.rank) return candidate;
  }
  return undefined;
}

/**
 * ÉCART vers la place au-dessus (planche E11 : barre « 0,12 km²/…pts pour passer
 * #3 » + phrase-objectif du CTA). Cette dérivation vivait INLINE dans l'écran,
 * donc hors de portée d'un test ; extraite ici, elle devient PURE et testable —
 * un seul contrat pour le rendu et sa vérification.
 *
 * Honnêteté portée par le calcul :
 *  · `gapRatio` est un ratio RÉEL (mes points ÷ ceux du dessus), jamais une
 *    échelle inventée, borné à [0,1] ;
 *  · tout vaut 0 quand personne n'est devant — la barre disparaît alors côté
 *    écran, on n'affiche pas une progression fictive ;
 *  · l'unité de `gapPoints` est le POINT (les km²/joueur de la planche n'existent
 *    nulle part) ; `gapHexes` n'est qu'une conversion pour la phrase-objectif.
 */
export interface LeagueGap {
  /** Points d'écart avec la place au-dessus. 0 si je suis en tête ou non classé. */
  gapPoints: number;
  /** `gapPoints` converti en ZONES pour la phrase-objectif (l'écran plancher à 1
   *  à l'affichage). 0 seulement quand il n'y a personne devant. */
  gapHexes: number;
  /** Remplissage 0..1 de la barre : mes points rapportés à ceux du dessus. */
  gapRatio: number;
  /** Une ligne à moi, et personne au-dessus. */
  isLeader: boolean;
}

/**
 * @param me    ma ligne classée, ou `undefined` si je ne figure pas au tableau.
 * @param above la ligne juste au-dessus (`rowAboveMe`), ou `undefined` si je suis
 *              en tête ou absent.
 * @param pointsPerHex points d'une zone neutre (POINTS_NEUTRAL_HEX) — passé en
 *              paramètre pour rester PUR (aucun import de constante applicative).
 */
export function leagueGap(
  me: RankedLeagueRow | undefined,
  above: RankedLeagueRow | undefined,
  pointsPerHex: number,
): LeagueGap {
  const isLeader = me !== undefined && above === undefined;
  if (me === undefined || above === undefined) {
    return { gapPoints: 0, gapHexes: 0, gapRatio: 0, isLeader };
  }
  const gapPoints = Math.max(0, above.value - me.value);
  // Garde-fou : un `pointsPerHex` non strictement positif ne doit jamais produire
  // un Infinity/NaN dans la phrase-objectif — dans ce cas l'écart en zones vaut 0.
  const gapHexes = pointsPerHex > 0 ? Math.ceil(gapPoints / pointsPerHex) : 0;
  const gapRatio = above.value > 0 ? Math.min(1, Math.max(0, me.value / above.value)) : 0;
  return { gapPoints, gapHexes, gapRatio, isLeader };
}
