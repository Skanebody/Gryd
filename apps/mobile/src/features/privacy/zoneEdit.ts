/**
 * GRYD — DÉCLARER UNE ZONE PROTÉGÉE (E77, spec §12.1). LA DÉCISION, PURE.
 *
 * ═══ POURQUOI CE MODULE EXISTE (28/07/2026) ═════════════════════════════════
 * La table `privacy_zones` existe depuis `0002_schema.sql:181`, sa RLS couvre
 * les quatre opérations en owner-only (`0003_rls.sql:150-163`), le pipeline de
 * masquage la lit (`engine/tracePrivacy.ts`) et `ingest_run` l'applique — mais
 * AUCUN ÉCRAN NE PERMETTAIT D'EN DÉCLARER UNE. La liste était donc vide pour
 * tout le monde, et toute la chaîne tournait à vide.
 *
 * L'enjeu a changé le 28/07 : depuis que `ingest_run` persiste une trace masquée
 * dans `runs.polyline_masked`, une zone déclarée n'est plus seulement retirée
 * d'une image de partage — elle est retirée de ce qui est ÉCRIT EN BASE. Le
 * chemin est devenu réellement protecteur ; il ne manquait que la porte.
 *
 * ═══ CE MODULE NE FAIT AUCUNE I/O ═══════════════════════════════════════════
 * Il DÉCIDE, il n'écrit pas. C'est ce qui le rend testable en Deno et ce qui
 * empêche une règle de vie privée de se retrouver dispersée dans un composant.
 * L'écriture vit dans `zonesWrite.ts`, et elle obéit à ce qui est décidé ici.
 *
 * ⚠️ LA VALIDATION ICI NE PROTÈGE PAS LA BASE — elle protège l'UTILISATEUR d'un
 * refus incompréhensible. Les vraies bornes sont les CHECK de `0002` (rayon
 * 200-500 m, index 0-2) : le serveur reste seul juge, et il rejetterait de toute
 * façon. On duplique donc les bornes en les NOMMANT comme un miroir, jamais
 * comme une source — leur valeur vient de game-rules.
 */
import {
  PRIVACY_ZONES_MAX,
  PRIVACY_ZONE_RADIUS_MAX_M,
  PRIVACY_ZONE_RADIUS_MIN_M,
} from '@klaim/shared';

/** Point choisi par le joueur (sa position, ou un point posé sur la carte). */
export interface ZoneCandidate {
  readonly lat: number;
  readonly lng: number;
  readonly radiusM: number;
}

/**
 * Ce que l'écran a le droit de faire, et pourquoi. Les refus sont NOMMÉS : un
 * bouton grisé sans motif est un cul-de-sac, et §A demande qu'on dise pourquoi.
 */
export type ZoneEditPlan =
  /** Écriture possible : `index` est l'emplacement libre (ou celui remplacé). */
  | { readonly kind: 'write'; readonly index: number; readonly radiusM: number }
  /** Les trois emplacements sont pris — il faut en retirer un d'abord. */
  | { readonly kind: 'full' }
  /** Le point n'est pas exploitable (pas de fix GPS, coordonnées aberrantes). */
  | { readonly kind: 'no-position' }
  /** On ne SAIT PAS encore ce qui existe : on ne décide rien (jamais un défaut). */
  | { readonly kind: 'unknown' };

/** Un rayon hors bornes n'est pas un refus : on le ramène dans la plage. */
export function clampRadiusM(radiusM: number): number {
  if (!Number.isFinite(radiusM)) return PRIVACY_ZONE_RADIUS_MIN_M;
  return Math.min(PRIVACY_ZONE_RADIUS_MAX_M, Math.max(PRIVACY_ZONE_RADIUS_MIN_M, Math.round(radiusM)));
}

/** Un point est exploitable s'il est fini et dans les bornes terrestres. */
export function isUsablePoint(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // (0, 0) est le « null island » des capteurs muets : un fix à cet endroit
    // est presque toujours une absence de fix déguisée en position.
    !(lat === 0 && lng === 0)
  );
}

/**
 * Décide ce qu'un écran peut faire d'un point proposé, connaissant les index
 * DÉJÀ occupés.
 *
 * `takenIndexes === null` signifie « la lecture n'a pas abouti » — pas « aucune
 * zone ». On rend alors `unknown` : écrire sur un index qu'on croit libre
 * écraserait peut-être une zone existante, c'est-à-dire retirerait une
 * protection que le joueur croit active.
 */
export function zoneEditPlan(
  candidate: ZoneCandidate | null,
  takenIndexes: readonly number[] | null,
): ZoneEditPlan {
  if (takenIndexes === null) return { kind: 'unknown' };
  if (candidate === null || !isUsablePoint(candidate.lat, candidate.lng)) {
    return { kind: 'no-position' };
  }
  const taken = new Set(takenIndexes);
  for (let i = 0; i < PRIVACY_ZONES_MAX; i += 1) {
    if (!taken.has(i)) return { kind: 'write', index: i, radiusM: clampRadiusM(candidate.radiusM) };
  }
  return { kind: 'full' };
}

/** Combien d'emplacements restent. `null` si on ne sait pas (lecture en échec). */
export function slotsLeft(takenIndexes: readonly number[] | null): number | null {
  if (takenIndexes === null) return null;
  const distinct = new Set(takenIndexes.filter((i) => i >= 0 && i < PRIVACY_ZONES_MAX));
  return Math.max(0, PRIVACY_ZONES_MAX - distinct.size);
}
