/**
 * GRYD — LE TABLEAU DE BORD : ce qu'il a le droit d'afficher. PUR (lot M12).
 *
 * ─── CE QU'IL MONTRE, ET POURQUOI PAS PLUS ─────────────────────────────────
 * Quatre chiffres : le territoire tenu, le nombre de sorties, la distance
 * totale, et la dernière course. C'est le suivi qu'un coureur regarde
 * réellement entre deux sorties.
 *
 * Ce qu'il NE montre pas — allures par segment, dénivelé, tendances,
 * comparaisons, carte de chaleur — n'est pas un oubli : c'est la marge
 * délibérée dans laquelle une offre payante pourra s'installer plus tard sans
 * rien reprendre (ADR-011). `GRYD_CAPABILITIES` marque déjà `control_heatmap`
 * en `plus` ; la table reste, seule sa surface n'existe pas.
 *
 * ⚠️ AUCUNE DE CES QUATRE VALEURS N'EST DÉRIVÉE D'UNE AUTRE. La distance vient
 * de `runs.distance_m` (mesurée par le moteur), l'aire de `territories.area_m2`.
 * Les recalculer l'une depuis l'autre créerait un second chiffre qui finirait
 * par contredire le premier — c'est déjà la règle de l'écran de résultat.
 *
 * ─── LES QUATRE ÉTATS, ENCORE ───────────────────────────────────────────────
 * Même discipline que la carte : un chargement n'est pas un vide, un échec de
 * lecture n'est pas un vide, et l'absence de compte n'en est pas un non plus.
 * Un tableau de bord qui affiche des zéros pendant qu'il charge apprend au
 * joueur à ne plus croire ses propres chiffres.
 */

/** Lecture des statistiques personnelles. */
export type StatsRead =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed' }
  | {
      readonly kind: 'ok';
      /** Sorties RETENUES (`status` valide). Une course rejetée n'en est pas une. */
      readonly runs: number;
      /** Somme de `runs.distance_m`. Mesurée, jamais recalculée. */
      readonly distanceM: number;
      /** Somme de `territories.area_m2` — le même chiffre que la carte. */
      readonly areaM2: number;
      /** Epoch ms de la dernière sortie retenue. `null` s'il n'y en a aucune. */
      readonly lastRunAt: number | null;
    };

export interface StatsInput {
  readonly signedIn: boolean;
  readonly read: StatsRead;
}

/**
 * Ce que le tableau de bord a le droit de DIRE.
 *
 *   · `signedOut` — pas de compte : il n'y a pas de « mes » statistiques.
 *   · `loading`   — en cours. N'affirme rien.
 *   · `failed`    — échec. N'affirme rien non plus.
 *   · `empty`     — lu, et aucune sortie. Le seul cas où le vide est vrai.
 *   · `ready`     — lu, et il y a de quoi montrer.
 */
export type StatsStatus = 'signedOut' | 'loading' | 'failed' | 'empty' | 'ready';

/**
 * Réponse honnête. PURE. L'ORDRE écarte une à une les raisons de ne pas savoir,
 * et `empty` n'est atteignable qu'une fois toutes écartées.
 */
export function statsStatus(input: StatsInput): StatsStatus {
  if (!input.signedIn) return 'signedOut';
  if (input.read.kind === 'idle' || input.read.kind === 'loading') return 'loading';
  if (input.read.kind === 'failed') return 'failed';
  return input.read.runs > 0 ? 'ready' : 'empty';
}

/** Une valeur affichable de la lecture, ou `null` si l'état ne sait pas. */
function siPret<T>(input: StatsInput, lire: (r: Extract<StatsRead, { kind: 'ok' }>) => T): T | null {
  return statsStatus(input) === 'ready' && input.read.kind === 'ok' ? lire(input.read) : null;
}

/**
 * Les quatre chiffres, ou `null` chacun.
 *
 * `null` et zéro ne sont PAS interchangeables : « 0 km » affirme que le joueur
 * n'a pas couru, et la constitution interdit le zéro nu précisément parce qu'il
 * se lit comme un fait alors qu'il vient souvent d'un écran qui ne sait pas.
 */
export function statRuns(i: StatsInput): number | null {
  return siPret(i, (r) => r.runs);
}
export function statDistanceM(i: StatsInput): number | null {
  return siPret(i, (r) => r.distanceM);
}
export function statAreaM2(i: StatsInput): number | null {
  // ⚠️ Peut légitimement valoir 0 alors que des courses existent : on peut avoir
  // couru sans jamais refermer une boucle. C'est un fait, pas un état d'ignorance
  // — et l'écran l'affiche, parce qu'ici le zéro RÉPOND à la question posée.
  return siPret(i, (r) => r.areaM2);
}
export function statLastRunAt(i: StatsInput): number | null {
  const v = siPret(i, (r) => r.lastRunAt);
  return v !== null && Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Le tableau de bord peut-il être RECHARGÉ par le joueur ?
 *
 * Seulement après un échec : un bouton « réessayer » sur une lecture réussie
 * est un bouton qui ne répare rien.
 */
export function canRetryStats(i: StatsInput): boolean {
  return statsStatus(i) === 'failed';
}
