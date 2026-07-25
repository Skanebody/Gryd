/**
 * GRYD — ingest_run : OUVRIR une frontière crew, DANS SA DISCIPLINE (E14).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * `detectOpenBoundary(trace, activity = DEFAULT_ACTIVITY)` porte une valeur par
 * DÉFAUT. C'est ce qui rend la rétro-compatibilité gratuite… et c'est aussi ce
 * qui a laissé passer le défaut : dans `index.ts`, le chemin frontière crew
 * threadait la discipline PARTOUT (`boundaryCtx.activity`, `completeBoundaries`,
 * `runCrewBoundaryClose`, l'insert `partial_boundaries.activity`) SAUF sur cet
 * appel-là, écrit `detectOpenBoundary(loopTrace)`. Un argument omis ne se voit
 * pas : ni le compilateur, ni un test de borne unitaire ne pouvaient le dire.
 *
 * Les DEUX sens de la faute, mesurés (cf. `boundary_open_test.ts`) :
 *   · TROP PERMISSIF — un cycliste ouvrait une frontière sur un périmètre
 *     complété de 2,8 km, alors que le plancher de boucle vélo est 5 km. Un
 *     FACTEUR 5 de contournement, suivi d'une capture de l'intérieur au plafond
 *     d'aire VÉLO (×25 en aire à distance égale) ;
 *   · TROP STRICT — une sortie vélo qui s'auto-intersecte sur ~2,4 km était vue
 *     comme une BOUCLE FERMÉE sous les règles course (plancher 1 km), donc
 *     « rien à ouvrir » : le cycliste ne pouvait PAS ouvrir une frontière qu'il
 *     avait le droit d'ouvrir. Le défaut ne fait pas que tricher, il empêche
 *     aussi de jouer.
 *
 * ═══ CE QUI VERROUILLE, ET POURQUOI CE N'EST PAS UN COMMENTAIRE ═════════════
 * `activity` est une propriété REQUISE de `OpenBoundaryInput` : l'oublier n'est
 * plus un silence, c'est une erreur de typecheck. Le défaut d'origine était
 * littéralement « un argument optionnel qu'on a oublié » — on retire donc
 * l'option, on ne se contente pas de corriger l'appel.
 * Un second filet, `boundary_open_test.ts`, refuse qu'`index.ts` réimporte
 * `detectOpenBoundary` directement : le contournement de ce module est aussi
 * une régression.
 *
 * PURE : aucune I/O, aucune horloge. Toutes les bornes viennent de
 * `activityRules(activity)` via le moteur — aucun nombre magique ici.
 */
import { detectOpenBoundary, type OpenBoundary } from '../_shared/engine/boundary.ts';
import type { LatLngPoint } from '../_shared/engine/hexing.ts';
import type { Activity } from '../_shared/game-rules.ts';

/** Tout ce dont la décision « ouvre-t-on une frontière ? » a besoin. */
export interface OpenBoundaryInput {
  /** Trace CLAIMABLE et contiguë du coureur (loopTracePoints), déjà filtrée. */
  readonly trace: readonly LatLngPoint[];
  /**
   * Discipline de la sortie. REQUISE — pas de défaut, jamais. C'est l'omission
   * de cet argument (optionnel côté moteur) qui a produit le défaut corrigé ici.
   */
  readonly activity: Activity;
  /** La trace forme déjà une boucle fermée : la zone est prise, rien à ouvrir. */
  readonly loopClosed: boolean;
  /** GRYD Verified (motionTrust ≥ VERIFIED_MIN_TRUST) : anti-abus, décidé amont. */
  readonly finisherVerified: boolean;
}

/**
 * Cette course OUVRE-t-elle une frontière partielle crew ? PURE.
 *
 * Ordre des gardes (du moins cher au plus géométrique), identique à celui
 * qu'`index.ts` appliquait à la main :
 *   1. boucle déjà fermée → null (elle fait sa zone, il n'y a pas de « trou ») ;
 *   2. run non vérifié   → null (un segment douteux n'ouvre rien) ;
 *   3. géométrie         → `detectOpenBoundary` AVEC la discipline.
 *
 * L'appelant reste seul responsable des conditions de CONTEXTE que ce module ne
 * peut pas connaître (le coureur a un crew, aucune complétion n'a eu lieu sur
 * cette course) : elles relèvent de l'état, pas de la géométrie.
 */
export function decideOpenBoundary(input: OpenBoundaryInput): OpenBoundary | null {
  if (input.loopClosed) return null;
  if (!input.finisherVerified) return null;
  return detectOpenBoundary(input.trace, input.activity);
}
