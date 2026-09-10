/**
 * GRYD — LES FILTRES DE RECHERCHE DE CREW (§2.7). Module PUR (LOT Q4).
 *
 * ═══ CE QU'IL LÈVE ═════════════════════════════════════════════════════════
 * `crew_discovery_2026` (0190) accepte NEUF paramètres. L'écran de découverte
 * n'en envoyait que deux (commune, recherche) et laissait les sept autres à
 * `null` : la moitié de la migration Q3 était écrite, déployée, et morte. Les
 * quatre qui manquaient à l'écran sont ici — discipline, taille, étiquettes,
 * activité récente — plus la question qu'un écran doit savoir poser : « est-ce
 * que je filtre quelque chose, ou est-ce que je regarde tout ? »
 *
 * ═══ POURQUOI CE MODULE EST PUR ════════════════════════════════════════════
 * Parce que le serveur REFUSE une valeur hors catalogue (`bad_activity`,
 * `bad_recruitment`, `bad_requirements`) au lieu de la rogner. Construire la
 * charge utile dans le JSX rendrait ces refus invisibles au test, et un écran
 * qui envoie « les deux disciplines » là où le serveur attend `null` ne
 * filtrerait rien en silence. Ici, c'est testé en Deno.
 *
 * ═══ LES BORNES DE TAILLE NE SONT PAS DES RÈGLES DE JEU ════════════════════
 * §2.7 dit « intervalle » et rien de plus. Trois tranches nommées valent mieux
 * qu'un champ numérique sur un téléphone, mais leurs bornes ne décident RIEN
 * dans le jeu : aucune capture, aucun point, aucune permission ne les lit.
 * Leur place n'est donc pas dans `game-rules.ts`, qui ne contient que ce qui
 * décide du jeu — même arbitrage que `INVITE_EXPIRING_SOON_HOURS`
 * (`crew/inviteToken.ts`). Elles se DÉRIVENT en revanche de la seule constante
 * réelle, `CREW_MAX_MEMBERS` : le jour où un crew peut compter 100 personnes,
 * les tranches suivent au lieu de mentir.
 */
import { CREW_MAX_MEMBERS, type Activity } from '@klaim/shared';

/** Plafond de la tranche « petit groupe » : un cinquième d'un crew plein. */
export const CREW_SIZE_SMALL_MAX_2026 = Math.round(CREW_MAX_MEMBERS / 5);
/** Plafond de la tranche « groupe moyen » : la moitié d'un crew plein. */
export const CREW_SIZE_MEDIUM_MAX_2026 = Math.round(CREW_MAX_MEMBERS / 2);

/** Les tranches proposées. `any` n'est pas une tranche : c'est leur absence. */
export const CREW_SIZE_BANDS_2026 = ['small', 'medium', 'large'] as const;
export type CrewSizeBand2026 = (typeof CREW_SIZE_BANDS_2026)[number];

/** Bornes envoyées au serveur pour une tranche. `null` = pas de borne de ce côté. */
export function sizeBandBounds2026(
  band: CrewSizeBand2026 | null,
): { readonly min: number | null; readonly max: number | null } {
  if (band === 'small') return { min: null, max: CREW_SIZE_SMALL_MAX_2026 };
  if (band === 'medium') {
    return { min: CREW_SIZE_SMALL_MAX_2026 + 1, max: CREW_SIZE_MEDIUM_MAX_2026 };
  }
  if (band === 'large') return { min: CREW_SIZE_MEDIUM_MAX_2026 + 1, max: null };
  return { min: null, max: null };
}

/**
 * ⚠ « JUSQU'À 3 » ÉTIQUETTES (§2.7). Le serveur, lui, n'impose aucun plafond :
 * `c.tags && p_tags` accepte un tableau de n'importe quelle longueur. La borne
 * est donc une règle de LISIBILITÉ, pas une contrainte technique — au-delà de
 * trois, la ligne de filtres devient illisible sur un téléphone et le résultat
 * devient si étroit qu'on ne sait plus lequel des choix l'a vidé.
 */
export const CREW_TAG_FILTER_MAX_2026 = 3;

/** L'état complet des filtres §2.7, tel que l'écran le tient. */
export interface DiscoveryFilterState2026 {
  readonly cityId: string | null;
  readonly query: string;
  /** Discipline TENUE par des membres (`holds_run` / `holds_bike`). */
  readonly activity: Activity | null;
  readonly recruitment: 'open' | 'on_request' | 'invite_only' | null;
  readonly requirements: 'none' | 'any' | 'eligible' | null;
  readonly size: CrewSizeBand2026 | null;
  /** Clés de `CREW_TAGS`, au plus `CREW_TAG_FILTER_MAX_2026`. */
  readonly tags: readonly string[];
  /** « Actif » = une sortie à venir OU une prise de contrôle sous 14 jours. */
  readonly activeOnly: boolean;
}

export const NO_DISCOVERY_FILTER_STATE_2026: DiscoveryFilterState2026 = {
  cityId: null,
  query: '',
  activity: null,
  recruitment: null,
  requirements: null,
  size: null,
  tags: [],
  activeOnly: false,
};

/**
 * Coche ou décoche une étiquette. REFUSE au-delà du plafond plutôt que de
 * jeter la plus ancienne : un filtre qui se décoche tout seul, sans que
 * personne ne l'ait touché, donne un résultat qu'on n'a pas demandé.
 */
export function toggleDiscoveryTag2026(
  tags: readonly string[],
  tag: string,
): readonly string[] {
  if (tags.includes(tag)) return tags.filter((t) => t !== tag);
  if (tags.length >= CREW_TAG_FILTER_MAX_2026) return tags;
  return [...tags, tag];
}

/** Une étiquette de plus est-elle encore possible ? (l'écran grise, il ne ment pas) */
export function canAddDiscoveryTag2026(tags: readonly string[], tag: string): boolean {
  return tags.includes(tag) || tags.length < CREW_TAG_FILTER_MAX_2026;
}

/**
 * Est-ce que ces filtres RESTREIGNENT quelque chose ?
 *
 * La commune et la recherche textuelle n'en font PAS partie, et ce n'est pas
 * un oubli : elles sont servies par l'autre lecture (`crew_discovery`, 0152),
 * qui reste la source de la liste. Seuls comptent ici les critères que SEULE
 * `crew_discovery_2026` sait appliquer — ce sont eux qui décident si l'écran a
 * le droit de retirer des lignes de la liste principale.
 */
export function discoveryFiltersActive2026(f: DiscoveryFilterState2026): boolean {
  return (
    f.activity !== null ||
    f.recruitment !== null ||
    f.requirements !== null ||
    f.size !== null ||
    f.tags.length > 0 ||
    f.activeOnly
  );
}

/** La charge utile de `crew_discovery_2026`, telle qu'elle part sur le fil. */
export interface DiscoveryPayload2026 {
  readonly p_city_id: string | null;
  readonly p_query: string | null;
  readonly p_activity: string | null;
  readonly p_recruitment: string | null;
  readonly p_min_members: number | null;
  readonly p_max_members: number | null;
  readonly p_requirements: string | null;
  readonly p_active_only: boolean;
  readonly p_tags: readonly string[] | null;
}

/**
 * État d'écran → arguments RPC. Deux règles, et elles ont chacune coûté un bug
 * ailleurs dans le dépôt :
 *   · une recherche VIDE n'est pas la recherche de la chaîne vide → `null` ;
 *   · un tableau d'étiquettes VIDE n'est pas « aucune étiquette » → `null`.
 *     Le serveur fait `array_length(p_tags, 1) is null` pour s'en protéger,
 *     mais envoyer `[]` reviendrait à lui demander de se rattraper.
 */
export function discoveryPayload2026(f: DiscoveryFilterState2026): DiscoveryPayload2026 {
  const bounds = sizeBandBounds2026(f.size);
  const query = f.query.trim();
  return {
    p_city_id: f.cityId,
    p_query: query.length > 0 ? query : null,
    p_activity: f.activity,
    p_recruitment: f.recruitment,
    p_min_members: bounds.min,
    p_max_members: bounds.max,
    p_requirements: f.requirements,
    p_active_only: f.activeOnly,
    p_tags: f.tags.length > 0 ? [...f.tags] : null,
  };
}
