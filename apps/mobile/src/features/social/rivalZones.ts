/**
 * GRYD — E15 « Carte des zones d'un rival » : LE MOTEUR, et la porte
 * d'honnêteté de l'écran. PUR (zéro React, zéro réseau, zéro horloge implicite
 * — `nowMs` est INJECTÉ) : Deno-testable, et surtout INCAPABLE de fabriquer un
 * territoire ou de dégénéraliser une géométrie.
 *
 * ═══ LE MOT « GÉNÉRALISÉ » EST UNE RÈGLE DE VIE PRIVÉE, PAS UN STYLE ════════
 * Constitution §7 / spec §12.3 : « un territoire public est une géométrie
 * DÉRIVÉE ; il ne doit pas permettre de reconstruire le trajet privé exact ».
 * La généralisation est donc faite EN AMONT, et elle est IRRÉVERSIBLE :
 *   1. le producteur — `supabase/functions/ingest_run/territory.ts:198` —
 *      applique `simplifyRing(ring, TERRITORY_GENERALIZE_TOLERANCE_M)` (moteur
 *      `packages/engine/src/polygon.ts:663`) et PERSISTE le résultat dans
 *      `territories.geometry_generalized`, à côté de la géométrie exacte ;
 *   2. la vue serveur `public.public_territories` (migration 0077) n'expose QUE
 *      la colonne généralisée — jamais `geometry`, jamais `source_run_id`,
 *      jamais un horodatage plus fin que l'heure — et uniquement les lignes dont
 *      `publish_after` est échu (publication différée, §1.5).
 * Ce module ne lisse RIEN à l'affichage : il reçoit ce que la vue a rendu. Un
 * lissage client serait un mensonge de forme — la donnée fine aurait déjà voyagé.
 *
 * ⚠️ CE QUI REND CETTE GARANTIE VÉRIFIABLE ICI : `RivalZoneRow` n'a PAS de champ
 * `geometry`. Un appelant qui voudrait passer la géométrie exacte ne compilerait
 * pas. C'est volontaire — la frontière de vie privée est portée par le TYPE, pas
 * par une consigne en commentaire.
 *
 * ═══ LES ÉTATS SONT DISTINCTS, JAMAIS CONFONDUS (constitution §1) ═══════════
 * `signed_out` / `loading` / `failed` / `not_found` / `hidden` / `empty` /
 * `unreadable` / `ready`. En particulier :
 *   · `empty` ≠ `failed` : « il ne tient rien de publié » est une AFFIRMATION,
 *     et on ne la fait que si la lecture a abouti ;
 *   · `unreadable` ≠ `empty` : des lignes sont revenues mais aucune n'a de
 *     contour dessinable. Dire « il ne tient rien » serait faux ;
 *   · `hidden` ≠ `empty` : il a demandé à ne pas partager sa carte. Le masquage
 *     est une décision DE SA PART, pas une absence de territoire.
 *
 * ═══ CE QUE CE MODULE NE CALCULE JAMAIS ════════════════════════════════════
 * Aucun départ, aucune arrivée, aucune allure, aucun horaire à la minute, aucune
 * position courante. La seule grandeur temporelle produite est une ANCIENNETÉ
 * dérivée d'un instant DÉJÀ tronqué à l'heure par la vue.
 */

/**
 * Anneau `[lng, lat]`, fermeture implicite — structurellement identique à
 * `share/mapFrame.FrameRing` et à `map/territoriesSource.PolygonRing`. Déclaré
 * ici plutôt qu'importé pour que ce module reste SANS AUCUNE dépendance (donc
 * chargeable seul par Deno, sans tirer h3-js ni game-rules dans le graphe).
 */
export type RivalRing = readonly (readonly [number, number])[];

/**
 * Réglage de partage de carte du joueur observé (`user_profiles.map_sharing`,
 * migration 0011 : `precise | simplified | territory_only | none`).
 *
 * ⚠️ VÉRITÉ DÉSAGRÉABLE, ÉCRITE PLUTÔT QUE MAQUILLÉE : la vue `public_territories`
 * (0077) NE CONSULTE PAS ce réglage. Le filtre ci-dessous est donc une décision
 * CLIENTE, pas une protection serveur : il empêche GRYD d'afficher une carte que
 * son propriétaire a refusé de partager, il n'empêche pas un appel direct à
 * l'API de la lire. La correction appartient à la vue (ou à une RLS sur
 * `territories`), et elle est inscrite en suspens — pas revendiquée ici.
 */
export type MapSharing = 'precise' | 'simplified' | 'territory_only' | 'none';

/**
 * UNE ligne de `public.public_territories`, telle que PostgREST la rend.
 *
 * `geometryGeneralized` est déjà PARSÉE en anneaux par l'appelant (via
 * `map/territoriesSource.parsePolygonRings`, la brique testée du dépôt) : ce
 * module ne refait pas ce travail et n'accepte pas de `jsonb` brut, pour qu'il
 * n'y ait qu'UN seul endroit dans l'app qui décide ce qu'est une géométrie
 * lisible.
 */
export interface RivalZoneRow {
  readonly id: string;
  /** Contours GÉNÉRALISÉS (seuls contours qui existent côté public). */
  readonly rings: readonly RivalRing[];
  /** `area_m2` — l'aire du polygone autoritaire (§19.2). Ne localise personne. */
  readonly areaM2: number;
  /**
   * `controlled_since_hour` en ms — DÉJÀ tronqué à l'heure par la vue
   * (`PUBLIC_TIMESTAMP_TRUNC`). `null` = la vue n'a pas d'instant à donner ; on
   * n'en invente pas un.
   */
  readonly controlledSinceHourMs: number | null;
}

/** Ce que les deux lectures (profil consenti, puis territoires publics) ont rendu. */
export type RivalZonesRead =
  /** Aucune session : rien n'est lisible, et rien n'est affirmé. */
  | { readonly kind: 'signed_out' }
  /** Lecture EN COURS — n'affirme RIEN sur ce joueur. */
  | { readonly kind: 'loading' }
  /** La lecture a échoué. Jamais déguisé en vide. */
  | { readonly kind: 'failed' }
  /**
   * Le profil n'a pas été rendu : ce handle n'existe pas, OU sa visibilité
   * (`user_profiles.profile_visibility`, RLS 0011) ne m'y donne pas droit. Les
   * deux cas sont volontairement INDISTINGUABLES côté client — les séparer
   * transformerait l'écran en oracle d'existence de comptes.
   */
  | { readonly kind: 'no_profile' }
  | {
      readonly kind: 'loaded';
      readonly mapSharing: MapSharing;
      /** Lignes dont la géométrie généralisée a pu être lue. */
      readonly zones: readonly RivalZoneRow[];
      /**
       * Lignes revenues mais SANS contour dessinable (jsonb illisible, ou
       * `geometry_generalized` absente). Comptées, jamais remplacées par une
       * forme approchée ni par la géométrie exacte — qui n'est de toute façon
       * pas dans la vue.
       */
      readonly unreadable: number;
    };

/** Ancienneté de contrôle, à la granularité que la vue publique autorise. */
export interface HeldFor {
  readonly unit: 'h' | 'd';
  readonly value: number;
}

/** Faits publics agrégés — la seule chose que l'écran chiffre. */
export interface RivalZonesFacts {
  readonly zoneCount: number;
  readonly totalAreaM2: number;
  /**
   * Ancienneté de la PLUS ANCIENNE zone tenue — l'âge de l'emprise, pas un
   * journal zone par zone. Agréger est ici la version la plus grossière, donc la
   * plus sûre. `null` si aucune zone n'a d'instant publiable.
   */
  readonly oldestHeldFor: HeldFor | null;
}

/** L'état d'affichage HONNÊTE de l'écran. */
export type RivalZonesView =
  | { readonly status: 'signed_out' }
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'not_found' }
  /** Il a explicitement refusé de partager sa carte (`map_sharing = 'none'`). */
  | { readonly status: 'hidden' }
  /** Lecture ABOUTIE, zéro territoire publié. Une phrase vraie, pas un « 0 » nu. */
  | { readonly status: 'empty' }
  /** Des lignes sont revenues, aucune n'était dessinable. On ne dit pas « rien ». */
  | { readonly status: 'unreadable'; readonly count: number }
  | {
      readonly status: 'ready';
      readonly zones: readonly RivalZoneRow[];
      readonly facts: RivalZonesFacts;
      /** Lignes écartées faute de contour lisible — dites, jamais tues. */
      readonly unreadable: number;
    };

const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

/**
 * Ancienneté à partir d'un instant DÉJÀ tronqué à l'heure.
 *
 * · en dessous de 24 h → en heures ; au-delà → en jours (arrondi INFÉRIEUR :
 *   « tenu depuis 3 j » est vrai à 3 j 23 h, « 4 j » ne le serait pas) ;
 * · `null` si l'instant manque OU s'il est dans le FUTUR (dérive d'horloge,
 *   ligne incohérente) : on préfère ne rien dire à dire « depuis -2 h ».
 */
export function heldFor(controlledSinceHourMs: number | null, nowMs: number): HeldFor | null {
  if (controlledSinceHourMs === null) return null;
  if (!Number.isFinite(controlledSinceHourMs) || !Number.isFinite(nowMs)) return null;
  const elapsed = nowMs - controlledSinceHourMs;
  if (elapsed < 0) return null;
  const hours = Math.floor(elapsed / MS_PER_HOUR);
  if (hours < HOURS_PER_DAY) return { unit: 'h', value: hours };
  return { unit: 'd', value: Math.floor(hours / HOURS_PER_DAY) };
}

/**
 * Faits agrégés. `areaM2` non finie ou négative est IGNORÉE de la somme (une
 * aire aberrante ne doit pas contaminer un total affiché), la zone reste
 * comptée et dessinée : elle existe, c'est sa mesure qui est douteuse.
 */
export function deriveRivalZonesFacts(
  zones: readonly RivalZoneRow[],
  nowMs: number,
): RivalZonesFacts {
  let totalAreaM2 = 0;
  let oldestMs: number | null = null;
  for (const z of zones) {
    if (Number.isFinite(z.areaM2) && z.areaM2 > 0) totalAreaM2 += z.areaM2;
    const since = z.controlledSinceHourMs;
    if (since !== null && Number.isFinite(since) && (oldestMs === null || since < oldestMs)) {
      oldestMs = since;
    }
  }
  return { zoneCount: zones.length, totalAreaM2, oldestHeldFor: heldFor(oldestMs, nowMs) };
}

/**
 * LA PORTE D'HONNÊTETÉ. Traduit ce que les lectures ont RÉELLEMENT rendu en un
 * état d'écran, sans jamais combler un trou.
 *
 * Ordre des décisions, et pourquoi :
 *  1. `map_sharing = 'none'` PRIME sur tout le reste — même s'il tient cent
 *     zones, il a dit non. Le respecter avant de compter évite qu'un futur
 *     refactor n'inverse l'ordre et ne fasse fuiter un décompte.
 *  2. des contours dessinables → `ready` (avec le nombre d'écartés).
 *  3. rien de dessinable mais des lignes écartées → `unreadable`, PAS `empty`.
 *  4. rien du tout → `empty`, la seule situation où l'écran a le droit de dire
 *     « ce joueur ne tient aucune zone publiée ».
 */
export function resolveRivalZonesState(read: RivalZonesRead, nowMs: number): RivalZonesView {
  switch (read.kind) {
    case 'signed_out':
      return { status: 'signed_out' };
    case 'loading':
      return { status: 'loading' };
    case 'failed':
      return { status: 'failed' };
    case 'no_profile':
      return { status: 'not_found' };
    case 'loaded':
      break;
  }
  if (read.mapSharing === 'none') return { status: 'hidden' };
  if (read.zones.length > 0) {
    return {
      status: 'ready',
      zones: read.zones,
      facts: deriveRivalZonesFacts(read.zones, nowMs),
      unreadable: read.unreadable,
    };
  }
  if (read.unreadable > 0) return { status: 'unreadable', count: read.unreadable };
  return { status: 'empty' };
}

/**
 * `state` de l'event `rival_zones_viewed` (packages/shared/src/events.ts:425),
 * dont le domaine est FERMÉ à 'ready' | 'empty' | 'unavailable'. Tout ce qui
 * n'est ni une carte rendue ni un vide constaté est `unavailable` : on mesure
 * l'ÉTAT, jamais le rival (aucun id, aucun décompte de zones — un compte croisé
 * avec l'heure de consultation situerait quelqu'un).
 *
 * `null` en `loading` : un chargement n'est pas un écran vu, et l'émettre
 * doublerait chaque consultation d'un faux « indisponible ».
 */
export function rivalZonesAnalyticsState(
  view: RivalZonesView,
): 'ready' | 'empty' | 'unavailable' | null {
  switch (view.status) {
    case 'loading':
      return null;
    case 'ready':
      return 'ready';
    case 'empty':
      return 'empty';
    default:
      return 'unavailable';
  }
}
