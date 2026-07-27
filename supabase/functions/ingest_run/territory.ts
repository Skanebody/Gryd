/**
 * GRYD — ingest_run : LA LIGNE `territories` D'UNE COURSE (LOT 1, ÉTAPE 2 sur 4).
 *
 * ═══ CE QUE FAIT CE MODULE, ET CE QU'IL NE FAIT PAS ═════════════════════════
 * FAIT   : à partir du POLYGONE de la boucle rendu par le moteur (`DetectedLoop.
 *          polygon`, une trace RÉELLE), il construit la LIGNE à insérer dans
 *          `public.territories` (migration 0074) — géométrie autoritaire,
 *          géométrie généralisée, aire géodésique, état, échéance de publication,
 *          version d'algorithme.
 * NE FAIT PAS : aucune écriture, aucune lecture, aucune horloge (l'instant est
 *          INJECTÉ), aucune décision de JEU. Il ne remplace RIEN : `hex_claims`
 *          reste la propriété effective et le comportement en vigueur. Après
 *          cette étape, DEUX représentations coexistent et l'utilisateur ne voit
 *          strictement aucune différence — personne ne LIT encore `territories`
 *          (bascule des lectures = étape 4).
 *
 * ═══ POURQUOI CE FICHIER PLUTÔT QUE DU CODE DANS index.ts ═══════════════════
 * `index.ts` appelle `Deno.serve` au chargement : il n'est pas importable, donc
 * pas testable. Tout ce qui décide quelque chose en sort — c'est le patron déjà
 * établi par `validate.ts`, `city_zone.ts`, `boundary_open.ts`, `dedup.ts`,
 * `commune_open.ts`, `activity.ts`. Sans ce fichier, « une capture écrit un
 * territoire cohérent » resterait une intention non prouvée.
 *
 * PURE : aucune I/O, aucune horloge, aucun `Date.now()`, aucun aléa.
 */
import type { Activity } from '../_shared/game-rules.ts';
import { MIN_POLYGON_AREA_M2 } from '../_shared/game-rules.ts';
import type { LatLngPoint } from '../_shared/engine/hexing.ts';
import {
  type GeoJsonPolygon,
  normalizeRing,
  polygonAreaM2,
  simplifyRing,
  toGeoJsonPolygon,
} from '../_shared/engine/polygon.ts';

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ DEUX CONSTANTES DE JEU QUI DEVRAIENT VIVRE DANS game-rules.ts
// ═══════════════════════════════════════════════════════════════════════════
// TODO(LOT 1, étape 3) — `packages/shared/src/game-rules.ts` était HORS du
// périmètre de cette étape (d'autres chantiers y écrivent en parallèle). Les
// deux valeurs ci-dessous sont donc posées ICI, à découvert, et elles VIOLENT
// « aucun nombre magique » (CLAUDE.md) tant qu'elles n'ont pas déménagé. Elles
// sont exportées pour que les tests les lisent au lieu de les recopier, et pour
// que le déménagement soit un simple changement d'import — pas une chasse.
// Rien d'autre dans le dépôt ne les duplique.

/**
 * §1.5 — « La publication d'un nouveau territoire est différée de 60 minutes
 * par défaut. » Alimente `territories.publish_after`, que la migration 0074 a
 * volontairement laissée `not null` SANS DÉFAUT : c'est l'ÉCRIVAIN qui décide
 * l'instant, jamais le schéma (une valeur par défaut en SQL aurait enterré une
 * constante de jeu dans la base).
 *
 * TODO(game-rules) : à déplacer en `TERRITORY_PUBLISH_DELAY_MINUTES`.
 */
export const TERRITORY_PUBLISH_DELAY_MINUTES = 60;

/**
 * §12.3 — « Un territoire public est une géométrie DÉRIVÉE. Il ne doit pas
 * permettre de reconstruire le trajet privé exact. » Tolérance Douglas-Peucker
 * (m) appliquée à l'anneau pour produire `geometry_generalized`.
 *
 * POURQUOI 30 m. C'est l'ordre de grandeur déjà retenu ailleurs dans le dépôt
 * pour « une forme reconnaissable, un trajet non reconstituable » :
 * `COMMUNE_CONTOUR_SIMPLIFY_DEG = 0,0003°` ≈ 33 m (game-rules.ts:926). C'est
 * aussi ~le double de l'incertitude GPS urbaine typique : sous cette tolérance
 * on rendrait le côté de rue emprunté, ce que §12.3 interdit précisément.
 * La valeur est TUNABLE : elle borne une RÉSOLUTION, elle ne change ni ce qui
 * est capturé, ni combien ça rapporte.
 *
 * TODO(game-rules) : à déplacer en `TERRITORY_GENERALIZE_TOLERANCE_M`.
 */
export const TERRITORY_GENERALIZE_TOLERANCE_M = 30;

/**
 * Version de l'algorithme qui a produit CE polygone (spec §19, colonne
 * `territories.algorithm_version`, `not null` et non vide).
 *
 * IDENTIFIANT STABLE, et ce qu'il désigne EXACTEMENT : la chaîne de dérivation
 * `detectLoop` (fermeture par tolérance OU auto-intersection, seuils de la
 * discipline) → `normalizeRing` (CCW, sommets dédupliqués) → `toGeoJsonPolygon`
 * pour `geometry`, et `simplifyRing(TERRITORY_GENERALIZE_TOLERANCE_M)` pour
 * `geometry_generalized`.
 *
 * QUAND LE CHANGER : dès que l'une de ces étapes change de RÉSULTAT pour une
 * même trace — nouveau mode de fermeture, autre tolérance de généralisation,
 * autre formule d'aire. PAS pour un refactor iso-comportement. Un territoire
 * ancien reste alors lisible pour ce qu'il est : le produit de `v1`, pas une
 * ligne qu'un recalcul futur croirait à tort avoir écrite lui-même.
 */
export const TERRITORY_ALGORITHM_VERSION = 'gryd-loop-polygon@1';

/** Ce dont la construction d'une ligne `territories` a besoin. Rien de plus. */
export interface TerritoryRowInput {
  /**
   * Anneau de la boucle détectée (`DetectedLoop.polygon`) — la TRACE RÉELLE,
   * jamais une union de cellules H3. `null` quand la course n'a fermé aucune
   * boucle : il n'y a alors pas de polygone, donc pas de territoire.
   */
  readonly polygon: readonly LatLngPoint[] | null;
  /**
   * L'intérieur de la boucle a-t-il été REFUSÉ par le moteur (forme trop
   * étroite, GPS sous le seuil) ? Si oui, le joueur n'a PAS gagné cette
   * surface : écrire le polygone quand même affirmerait le contraire.
   */
  readonly interiorRejected: boolean;
  /**
   * Nombre de cellules réellement CAPTURÉES par cette course (claimed_neutral
   * ou stolen, après la RPC). Zéro ⇒ aucune capture ⇒ aucun territoire : une
   * défense ou un run bloqué au plafond quotidien ne crée pas de propriété.
   */
  readonly capturedCellCount: number;
  /** Discipline de la sortie (E14) — `run` et `bike` ne se mélangent jamais. */
  readonly activity: Activity;
  /** Propriétaire. Voir `TerritoryRow.owner_type` pour l'écart CREW assumé. */
  readonly ownerUserId: string;
  /** Ville de rattachement déjà arbitrée serveur, ou null (territoire rural). */
  readonly cityId: string | null;
  /** Course source (`runs.id`) — c'est AUSSI la clé d'idempotence. */
  readonly runId: string;
  /** Instant de référence, INJECTÉ (le module n'a pas d'horloge). */
  readonly now: Date;
}

/** La ligne `public.territories` (0074), prête pour un insert tel quel. */
export interface TerritoryRow {
  readonly activity: Activity;
  /**
   * TOUJOURS `'user'` à cette étape. La spec prévoit `'crew'`, mais un crew ne
   * peut PAS posséder aujourd'hui : `hex_claims.owner_user_id` est `not null` et
   * la propriété effective reste hexagonale. Écrire `'crew'` ici ferait diverger
   * les deux représentations dès la première capture — un mensonge silencieux.
   * La propriété crew est le LOT 7.
   */
  readonly owner_type: 'user';
  readonly owner_id: string;
  /** Géométrie AUTORITAIRE : le polygone de la trace, normalisé, refermé. */
  readonly geometry: GeoJsonPolygon;
  /**
   * Géométrie DÉRIVÉE pour le rendu public (§12.3) — ou `null` si la
   * simplification n'a PAS pu retirer de sommet. Dans ce cas on n'écrit RIEN :
   * recopier `geometry` servirait la trace exacte sous un nom qui promet
   * l'inverse (0074 l'interdit explicitement).
   */
  readonly geometry_generalized: GeoJsonPolygon | null;
  /** Aire GÉODÉSIQUE du POLYGONE (m²) — jamais la somme des cellules H3. */
  readonly area_m2: number;
  readonly city_id: string | null;
  /** §5.3 — une capture personnelle produit un territoire `owned_personal`. */
  readonly state: 'owned_personal';
  /** §9.2 — un territoire naît NON fortifié. La fortification se joue, lot 3. */
  readonly defense_level: 0;
  readonly controlled_since: string;
  /** §1.5 — instant de publication, décidé ici et jamais par le schéma. */
  readonly publish_after: string;
  readonly algorithm_version: string;
  readonly source_run_id: string;
}

/**
 * Construit la ligne `territories` d'une course, ou `null` s'il n'y a pas de
 * territoire à écrire. PURE.
 *
 * LES QUATRE PORTES, dans cet ordre (de la moins chère à la plus géométrique) :
 *  1. AUCUNE BOUCLE → aucun polygone. Un couloir (« trait ») capture des
 *     cellules sans enclore quoi que ce soit : il n'a pas de surface à décrire.
 *     Écart assumé, inscrit en suspens : ces captures-là n'ont PAS de ligne
 *     `territories` à cette étape.
 *  2. INTÉRIEUR REFUSÉ (forme trop fine, GPS sous le seuil) → la course reste
 *     valide et le couloir payé, mais la SURFACE n'a pas été gagnée.
 *  3. AUCUNE CELLULE CAPTURÉE → rien n'a changé de mains (défense pure, plafond
 *     quotidien, zone interdite…). Un territoire sans capture serait une
 *     propriété inventée.
 *  4. AIRE SOUS `MIN_POLYGON_AREA_M2` (§8.2, game-rules) → le polygone existe
 *     géométriquement mais ne capture rien. Ce plancher est aujourd'hui
 *     REDONDANT (la plus petite unité capturable est une cellule res 10, ~15 047
 *     m² > 5 000 m²) : il est appliqué quand même parce qu'il deviendra
 *     l'autorité le jour où le polygone SERA la donnée de capture — et parce
 *     qu'un `area_m2 > 0` en base ne dit rien de la jouabilité d'une surface.
 */
export function buildTerritoryRow(input: TerritoryRowInput): TerritoryRow | null {
  if (input.polygon === null) return null;
  if (input.interiorRejected) return null;
  if (input.capturedCellCount <= 0) return null;

  // `normalizeRing` déduplique et oriente CCW ; sous 3 sommets distincts il n'y
  // a pas de polygone (0074 refuserait de toute façon une aire nulle).
  const ring = normalizeRing(input.polygon);
  if (ring.length < 3) return null;

  const areaM2 = polygonAreaM2(ring);
  if (!Number.isFinite(areaM2) || areaM2 < MIN_POLYGON_AREA_M2) return null;

  // §12.3 : la version publique n'est écrite QUE si elle est STRICTEMENT plus
  // grossière. Une simplification qui ne retire aucun sommet rendrait la trace
  // exacte sous le nom `geometry_generalized` — pire que de ne rien servir.
  const simplified = simplifyRing(ring, TERRITORY_GENERALIZE_TOLERANCE_M);
  const generalized = simplified.length < ring.length ? toGeoJsonPolygon(simplified) : null;

  const publishAfter = new Date(
    input.now.getTime() + TERRITORY_PUBLISH_DELAY_MINUTES * 60_000,
  );

  return {
    activity: input.activity,
    owner_type: 'user',
    owner_id: input.ownerUserId,
    geometry: toGeoJsonPolygon(ring),
    geometry_generalized: generalized,
    area_m2: areaM2,
    city_id: input.cityId,
    state: 'owned_personal',
    defense_level: 0,
    controlled_since: input.now.toISOString(),
    publish_after: publishAfter.toISOString(),
    algorithm_version: TERRITORY_ALGORITHM_VERSION,
    source_run_id: input.runId,
  };
}
