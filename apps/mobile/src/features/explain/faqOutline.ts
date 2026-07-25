/**
 * GRYD — LE SOMMAIRE DE LA FAQ ET SON ÉTAT D'ACCORDÉON, PURS.
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────────
 * `/faq` empilait à plat 29 accordéons dépliables en mode « Simple », 32 en
 * « Avancé » (25 Q/R du §33 + 3 Saisons + 4 post-run), sans sommaire ni
 * recherche : la page la plus consultée du groupe explicabilité s'ouvrait sur un
 * mur qu'on ne comprend pas en trois secondes (§A). Le remède est de replier
 * aussi les GROUPES — donc d'avoir deux niveaux d'ouverture au lieu d'un.
 *
 * Deux niveaux, c'est exactement là où une machine à états se casse en silence :
 * une question ouverte dans un groupe qu'on referme reste « ouverte » en mémoire
 * et RESSORT dépliée au prochain tap ; une question `advanced` ouverte survit à
 * la bascule vers « Simple » et réapparaît en revenant à « Avancé », alors que
 * l'écran ne l'affiche plus entre-temps. Aucun de ces deux bugs ne se voit sur
 * une capture d'écran — ils se voient sur un parcours. D'où : logique PURE, ici,
 * testée en Deno, et l'écran ne fait que rendre ce qu'elle décide.
 *
 * Rien de ce fichier n'est une règle de JEU : ce sont des règles d'AFFICHAGE
 * (quel groupe existe, lequel est ouvert). Aucune constante de game-rules.ts
 * n'a sa place ici.
 */

/** Ce qu'une Q/R doit porter pour être regroupée : sa catégorie, son niveau. */
export interface FaqGroupable<Cat extends string> {
  readonly category: Cat;
  /** true = détail technique, visible seulement en mode « Avancé ». */
  readonly advanced?: boolean;
}

/** Un groupe du sommaire : son identifiant et les items RÉELLEMENT visibles. */
export interface FaqOutlineGroup<Cat extends string, Item> {
  readonly id: Cat;
  readonly items: readonly Item[];
}

/** Forme minimale acceptée par `resolveAccordion` (groupes hétérogènes). */
export interface OutlineLike {
  readonly id: string;
  readonly items: readonly { readonly id: string }[];
}

/**
 * Regroupe les Q/R par catégorie, dans l'ORDRE demandé, en appliquant le filtre
 * « Simple / Avancé ».
 *
 * Deux garanties qui évitent un mensonge d'interface :
 *  · un groupe VIDE disparaît (jamais un en-tête qui promet des questions
 *    qu'il n'a pas — même raison que « zéro métrique sourcée ⇒ zéro rangée ») ;
 *  · le compteur affiché à côté d'un groupe est `items.length`, donc le nombre
 *    de lignes que le tap ouvrira RÉELLEMENT — pas le total du catalogue.
 */
export function buildFaqOutline<Cat extends string, Item extends FaqGroupable<Cat>>(
  items: readonly Item[],
  order: readonly Cat[],
  advanced: boolean,
): readonly FaqOutlineGroup<Cat, Item>[] {
  const groups: FaqOutlineGroup<Cat, Item>[] = [];
  for (const id of order) {
    const visible = items.filter(
      (item) => item.category === id && (advanced || item.advanced !== true),
    );
    if (visible.length > 0) groups.push({ id, items: visible });
  }
  return groups;
}

/**
 * Ce qui est ouvert : AU PLUS un groupe, et au plus une question DANS ce groupe.
 * Un seul de chaque — c'est la règle « 1 écran = 1 décision » appliquée à une
 * page de lecture : on ne déplie pas trois réponses en même temps.
 */
export interface ExplainAccordion {
  readonly group: string | null;
  readonly item: string | null;
}

/** Tout replié — l'état d'arrivée sur l'écran (le sommaire, rien d'autre). */
export const ACCORDION_ALL_CLOSED: ExplainAccordion = { group: null, item: null };

/**
 * Tap sur un en-tête de groupe. Refermer un groupe referme AUSSI la question
 * qu'il contenait : sans ça, elle ressortirait dépliée sans que personne ne
 * l'ait demandé.
 */
export function toggleGroup(state: ExplainAccordion, groupId: string): ExplainAccordion {
  if (state.group === groupId) return ACCORDION_ALL_CLOSED;
  return { group: groupId, item: null };
}

/** Tap sur une question. Le groupe ouvert ne bouge pas (on lit dans son groupe). */
export function toggleItem(state: ExplainAccordion, itemId: string): ExplainAccordion {
  return { group: state.group, item: state.item === itemId ? null : itemId };
}

/**
 * Ramène l'état à ce qui EXISTE réellement à l'écran maintenant.
 *
 * Appelé au rendu, après le filtre « Simple / Avancé » : si le groupe ouvert a
 * disparu, tout se referme ; si la question ouverte n'est plus dans le groupe
 * ouvert (elle était `advanced`, ou elle appartenait à un autre groupe), elle se
 * referme seule. L'état mémorisé ne peut donc jamais ressusciter une ligne que
 * l'écran n'affiche plus.
 */
export function resolveAccordion(
  state: ExplainAccordion,
  groups: readonly OutlineLike[],
): ExplainAccordion {
  if (state.group === null) return ACCORDION_ALL_CLOSED;
  const open = groups.find((g) => g.id === state.group);
  if (open === undefined) return ACCORDION_ALL_CLOSED;
  if (state.item === null) return { group: open.id, item: null };
  const stillThere = open.items.some((i) => i.id === state.item);
  return { group: open.id, item: stillThere ? state.item : null };
}
