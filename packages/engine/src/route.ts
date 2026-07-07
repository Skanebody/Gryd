/**
 * GRYD — engine/route.ts : GARDE-FOUS de WALKABILITÉ des itinéraires.
 * « Vérifier que les routes utilisées sont bien accessibles à pied et non des
 * autoroutes. » Fonction PURE (aucune I/O, réseau, horloge) — SOURCE DE VÉRITÉ,
 * testée Deno, mirroir mobile dans apps/mobile/src/features/route/walkability.ts.
 *
 * Deux dimensions de contrôle (défense en profondeur — la génération se fait déjà
 * au profil piéton ROUTE_PEDESTRIAN_PROFILE, ceci RE-VÉRIFIE) :
 *   • CLASSES DE VOIES (si connues, ex. import Strava / génération taguée) :
 *     toute classe de ROUTE_FORBIDDEN_HIGHWAY_CLASSES (motorway/trunk…) → rejet
 *     DUR (non walkable). Classe hors allowlist/denylist → `unknown_class`
 *     (signal doux, pas un rejet).
 *   • CONNEXITÉ GÉOMÉTRIQUE : un saut > ROUTE_MAX_STEP_M entre deux sommets =
 *     `disconnected` (téléport / hors réseau) → non walkable. < ROUTE_MIN_POINTS
 *     points → `too_short`.
 * Toutes les constantes viennent de @klaim/shared/game-rules (aucun nombre magique).
 */
import {
  ROUTE_FORBIDDEN_HIGHWAY_CLASSES,
  ROUTE_MAX_STEP_M,
  ROUTE_MIN_POINTS,
  ROUTE_WALKABLE_HIGHWAY_CLASSES,
} from '@klaim/shared/game-rules';
import { haversineM } from './validation.ts';

/** Provenance d'un itinéraire — module la confiance a priori (audit, UI). */
export type RouteProvenance =
  | 'osrm_foot' // routé au profil piéton (confiance haute)
  | 'strava_import' // trace importée (peut contenir du non-piéton → à vérifier)
  | 'user_drawn' // tracé main utilisateur
  | 'demo'; // données démo GRYD (authoring piéton vérifié à la main)

/** Point minimal d'un itinéraire (lat/lng — pas de dépendance de type externe). */
export interface RouteGeoPoint {
  lat: number;
  lng: number;
}

/** Itinéraire à contrôler : géométrie + classes de voies OPTIONNELLES. */
export interface RouteToCheck {
  points: readonly RouteGeoPoint[];
  /**
   * Classe OSM `highway=*` par SEGMENT (longueur attendue = points.length - 1).
   * Absente = source non taguée (démo/piéton de confiance) : seule la connexité
   * est contrôlée, jamais un faux positif de classe.
   */
  roadClasses?: readonly string[];
  provenance?: RouteProvenance;
}

export type RouteViolationKind =
  | 'too_short' // moins de ROUTE_MIN_POINTS points
  | 'disconnected' // saut > ROUTE_MAX_STEP_M (hors réseau piéton)
  | 'forbidden_class' // classe de voie non piétonne (autoroute…) — rejet dur
  | 'unknown_class'; // classe hors allowlist/denylist — signal doux

export interface RouteViolation {
  kind: RouteViolationKind;
  /** Index du segment/sommet fautif (quand applicable). */
  index?: number;
  /** Détail lisible (classe fautive, distance du saut…). */
  detail?: string;
}

export interface RouteWalkabilityResult {
  /**
   * VRAI si aucune violation DURE : ni classe interdite, ni déconnexion, ni
   * `too_short`. C'est LE verrou — une route non walkable n'est jamais proposée.
   */
  walkable: boolean;
  /** `walkable` ET aucun signal doux (`unknown_class`) — walkabilité stricte. */
  ok: boolean;
  violations: readonly RouteViolation[];
}

const FORBIDDEN = new Set(ROUTE_FORBIDDEN_HIGHWAY_CLASSES);
const WALKABLE = new Set(ROUTE_WALKABLE_HIGHWAY_CLASSES);

/**
 * Contrôle de walkabilité d'un itinéraire (garde-fou piéton). Ordre des
 * violations STABLE : too_short, puis déconnexions (par index), puis classes.
 */
export function validateRouteWalkability(route: RouteToCheck): RouteWalkabilityResult {
  const violations: RouteViolation[] = [];
  const pts = route.points;

  if (pts.length < ROUTE_MIN_POINTS) {
    violations.push({
      kind: 'too_short',
      detail: `${pts.length} point(s) < ${ROUTE_MIN_POINTS}`,
    });
    // Sans géométrie exploitable, inutile d'aller plus loin.
    return { walkable: false, ok: false, violations };
  }

  // Connexité : aucun saut hors réseau piéton entre sommets consécutifs.
  for (let i = 1; i < pts.length; i++) {
    const gap = haversineM(pts[i - 1]!, pts[i]!);
    if (gap > ROUTE_MAX_STEP_M) {
      violations.push({
        kind: 'disconnected',
        index: i,
        detail: `${Math.round(gap)} m > ${ROUTE_MAX_STEP_M} m`,
      });
    }
  }

  // Classes de voies (si fournies) : denylist = rejet dur, hors allowlist = doux.
  if (route.roadClasses) {
    route.roadClasses.forEach((cls, i) => {
      if (FORBIDDEN.has(cls)) {
        violations.push({ kind: 'forbidden_class', index: i, detail: cls });
      } else if (!WALKABLE.has(cls)) {
        violations.push({ kind: 'unknown_class', index: i, detail: cls });
      }
    });
  }

  const hard = violations.some(
    (v) => v.kind === 'forbidden_class' || v.kind === 'disconnected' || v.kind === 'too_short',
  );
  const soft = violations.some((v) => v.kind === 'unknown_class');
  return { walkable: !hard, ok: !hard && !soft, violations };
}

/** Raccourci booléen — VRAI si la route est praticable à pied (aucune violation dure). */
export function isRouteWalkable(route: RouteToCheck): boolean {
  return validateRouteWalkability(route).walkable;
}
