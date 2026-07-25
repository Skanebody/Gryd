/**
 * GRYD — décisions d'AFFICHAGE de l'historique, isolées en fonctions PURES.
 *
 * ─── POURQUOI CE FICHIER ────────────────────────────────────────────────────
 * Deux décisions de cet écran sont subtiles, et se trompent en silence :
 *   · QUELS filtres montrer — une rangée « Conquêtes 0 · Défenses 0 » répète
 *     trois fois la seule information réelle (il n'y a rien) et donne trois
 *     boutons qui ne mènent nulle part ;
 *   · QUEL impact territorial montrer — un impact INCONNU (`null`, la course
 *     n'a pas de payload serveur) et un impact NUL (`0`, le serveur a décidé
 *     que rien n'a été pris) ne se ressemblent pas et ne doivent jamais se
 *     confondre à l'écran.
 * Elles vivaient dans le JSX, donc sans test. Ici elles sont testables sans
 * réseau ni rendu (`historyView.test.ts`).
 *
 * ─── MODULE PUR : ZÉRO IMPORT ───────────────────────────────────────────────
 * Il ne dépend PAS de `./real` — ce serait un import de React, de Supabase et
 * d'AsyncStorage dans un fichier que les tests Deno doivent pouvoir
 * type-checker seul. Les deux unions de vocabulaire vivent donc ICI, et
 * `real.ts` les réexporte : une seule source, dans le sens qui ne tire rien.
 */

/**
 * Nature d'une course, DÉRIVÉE de l'impact serveur (pas d'une intention
 * déclarée au départ : c'est le terrain qui tranche).
 */
export type RunKindKey = 'conquest' | 'defense' | 'stats';

/** Filtre de l'historique : « Tout » + une nature que la donnée sait nommer. */
export type HistoryFilterKey = 'all' | RunKindKey;

/** Ordre d'affichage des filtres — celui de la planche, jamais un tri. */
export const HISTORY_FILTER_ORDER: readonly HistoryFilterKey[] = [
  'all',
  'conquest',
  'defense',
  'stats',
];

/**
 * Les filtres RÉELLEMENT utiles pour un jeu de compteurs donné.
 *
 * « Tout » est toujours candidat ; une nature ne l'est que si elle porte au
 * moins une course. Et un seul filtre utile n'est PAS un filtre : on renvoie
 * une liste VIDE, à charge de l'écran de ne rien rendre du tout — pas un
 * groupe de choix à un seul choix.
 */
export function visibleHistoryFilters(
  counts: Readonly<Record<HistoryFilterKey, number>>,
): HistoryFilterKey[] {
  const shown = HISTORY_FILTER_ORDER.filter((f) => f === 'all' || counts[f] > 0);
  return shown.length < 2 ? [] : shown;
}

/** Les deux compteurs d'impact que le serveur fige au moment de l'ingestion. */
export type RunImpactKey = 'captured' | 'defended';

/**
 * Quels compteurs d'impact une course affiche.
 *
 *  · `null` = le serveur n'a pas dit — la cellule N'EXISTE PAS (surtout pas un
 *    « 0 » qui affirmerait que la course n'a rien pris) ;
 *  · `captured === 0` = le serveur a dit « rien pris » — on l'AFFICHE : c'est
 *    ce qui explique pourquoi la carte n'a pas bougé ;
 *  · `defended === 0` = personne n'a attaqué — il n'y a rien à raconter, et une
 *    colonne « 0 défendue » sur chaque course de la liste serait du bruit.
 */
export function runImpactKeys(entry: {
  captured: number | null;
  defended: number | null;
}): RunImpactKey[] {
  const keys: RunImpactKey[] = [];
  if (entry.captured !== null) keys.push('captured');
  if (entry.defended !== null && entry.defended > 0) keys.push('defended');
  return keys;
}
