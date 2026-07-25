/**
 * GRYD — ce que la page « Mon territoire » est en train de DIRE, en fonctions
 * pures et testées.
 *
 * ─── POURQUOI CE FICHIER ────────────────────────────────────────────────────
 * L'écran déduisait son état dans le corps du composant, et cette déduction
 * portait un BOUTON MORT : « pas connecté » y confondait deux situations très
 * différentes — « il y a un serveur, mais aucune session » (se connecter a du
 * sens) et « il n'y a pas de backend du tout » (`/(auth)/sign-in` redirige
 * immédiatement vers la carte, donc le bouton renvoie le joueur d'où il vient).
 * Séparer les deux est une règle d'honnêteté, pas une finesse de code : c'est
 * la garde `canSignIn` déjà posée sur le Profil recalé.
 *
 * Trois décisions vivent ici, chacune testable sans rendu :
 *   · l'ÉTAT de la page (cinq situations, jamais fondues) ;
 *   · si la carte de 220 px a un objet (elle n'en a un que si l'on SAIT) ;
 *   · quelle NATURE prend l'unique CTA chartreuse du bas.
 */

/**
 * Les cinq situations de la page. `no-backend` n'est pas un raffinement de
 * `signed-out` : c'est une cause différente (pas de serveur vs pas de compte)
 * qui appelle une copie différente ET l'absence du bouton de connexion.
 */
export type TerritoryPageState =
  | 'loading'
  | 'failed'
  | 'no-backend'
  | 'signed-out'
  | 'empty'
  | 'held';

export interface TerritoryPageInput {
  /** Le hook ne SAIT pas encore (restauration de session ou requête en vol). */
  loading: boolean;
  /** La lecture de `hex_claims` a échoué. */
  failed: boolean;
  /** Ni session, ni client Supabase. */
  signedOut: boolean;
  /** Un backend est configuré — sinon se connecter est impossible. */
  configured: boolean;
  /** Zones RÉELLEMENT tenues (somme des `zoneCount` de mes territoires). */
  zonesHeld: number;
}

/**
 * Ordre de priorité IDENTIQUE à celui de la Carte et du HUD : chargement >
 * échec > pas de compte > vide > tenu. Toute divergence rouvrirait la porte à
 * « la page dit une chose, la carte juste en dessous en dit une autre ».
 * `loading` EN PREMIER : pendant la restauration de session, on n'affirme rien.
 */
export function territoryPageState(input: TerritoryPageInput): TerritoryPageState {
  if (input.loading) return 'loading';
  if (input.failed) return 'failed';
  if (input.signedOut) return input.configured ? 'signed-out' : 'no-backend';
  return input.zonesHeld > 0 ? 'held' : 'empty';
}

/**
 * La carte n'est rendue que quand la lecture a ABOUTI — tenue ou vide.
 * Ailleurs, une vue monde sans possession occuperait le premier écran en
 * laissant croire qu'on regarde le territoire du joueur, alors qu'on ne sait
 * rien de lui (chargement, panne) ou qu'il n'y a personne (pas de compte).
 */
export function territoryShowsMap(state: TerritoryPageState): boolean {
  return state === 'held' || state === 'empty';
}

/**
 * Nature de l'unique CTA chartreuse du bas (§A.4). `map` est vrai dans TOUS
 * les cas où il apparaît : la carte existe et s'ouvre, indépendamment de ce
 * qu'on sait du territoire — ce bouton n'affirme donc jamais une lecture finie.
 */
export type TerritoryCta = 'sign-in' | 'retry' | 'map';

export function territoryCta(state: TerritoryPageState): TerritoryCta {
  if (state === 'signed-out') return 'sign-in';
  if (state === 'failed') return 'retry';
  return 'map';
}

/** Les métriques que la page peut montrer, dans l'ordre de mise en avant. */
export type TerritoryMetricKey = 'area' | 'zones';

/**
 * Une métrique sans mesure DISPARAÎT (règle : jamais « — », jamais un « 0 » nu).
 * La surface est la mise en avant : c'est la matière du jeu. Elle peut manquer
 * là où des zones existent (surface non calculée), et l'inverse ne se produit
 * pas — d'où deux tests indépendants plutôt qu'une cascade.
 */
export function territoryMetricKeys(input: {
  areaM2: number;
  zonesHeld: number;
}): TerritoryMetricKey[] {
  const keys: TerritoryMetricKey[] = [];
  if (Number.isFinite(input.areaM2) && input.areaM2 > 0) keys.push('area');
  if (Number.isFinite(input.zonesHeld) && input.zonesHeld > 0) keys.push('zones');
  return keys;
}
