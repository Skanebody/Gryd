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
  let previousValue: number | null = null;

  rows.forEach((row, index) => {
    // Valeur identique à la précédente ⇒ même rang ; sinon le rang « rattrape »
    // la position (c'est le saut du 1224 après une égalité).
    if (previousValue === null || row.value !== previousValue) rank = index + 1;
    previousValue = row.value;
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
