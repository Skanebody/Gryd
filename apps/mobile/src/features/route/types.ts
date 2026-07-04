/**
 * GRYD — types du ROUTE PLANNER (AMENDEMENT-10 §2 + AMENDEMENT-11 §3/§6).
 * « GRYD ne montre plus seulement le territoire, il dit COURS ICI pour le
 * prendre. » Vocabulaire visible : zones / rues / secteurs — jamais « hex ».
 * Catalogue des types de routes (doc route planner) + forme d'une proposition
 * démo (tracé le long des rues de la basemap, stats affichées). Aucune règle
 * de jeu ici — la vraie génération d'itinéraires est V1 (hors scope).
 */
import type { LatLngPoint } from '../map/basemap';

/** Catalogue produit des types de routes (AMENDEMENT-10 §2). */
export type RouteTypeKey =
  | 'capture_rapide'
  | 'defense'
  | 'raid'
  | 'exploration'
  | 'boucle_facile'
  | 'sortie_longue'
  | 'social_run'
  | 'course_privee';

export const ROUTE_TYPE_ORDER: readonly RouteTypeKey[] = [
  'capture_rapide',
  'defense',
  'raid',
  'exploration',
  'boucle_facile',
  'sortie_longue',
  'social_run',
  'course_privee',
];

export const ROUTE_TYPE_LABELS: Record<RouteTypeKey, string> = {
  capture_rapide: 'Capture rapide',
  defense: 'Défense',
  raid: 'Raid',
  exploration: 'Exploration',
  boucle_facile: 'Boucle facile',
  sortie_longue: 'Sortie longue',
  social_run: 'Social run',
  course_privee: 'Course privée',
};

/** Priorité de génération (chips d'options — un seul choix actif). */
export type RoutePriority = 'capture' | 'defense' | 'performance' | 'exploration';

export const ROUTE_PRIORITY_ORDER: readonly RoutePriority[] = [
  'capture',
  'defense',
  'performance',
  'exploration',
];

export const ROUTE_PRIORITY_LABELS: Record<RoutePriority, string> = {
  capture: 'Capture',
  defense: 'Défense',
  performance: 'Performance',
  exploration: 'Exploration',
};

/** Forme du tracé : boucle (retour départ) ou aller simple. */
export type RouteShape = 'boucle' | 'aller';

export const ROUTE_SHAPE_LABELS: Record<RouteShape, string> = {
  boucle: 'Boucle',
  aller: 'Aller simple',
};

export interface PlannedRouteDemo {
  id: string;
  /** Lettre de la proposition (Route A / B / C). */
  letter: 'A' | 'B' | 'C';
  /** Nom court (« Rapide », « Optimisée », « Défense »). */
  name: string;
  typeKey: RouteTypeKey;
  /** Secteur traversé/visé (label basemap : Bastille, Canal, République…). */
  zone: string;
  /** Tracé le long des rues de la basemap (démo scriptée — génération = V1). */
  line: readonly LatLngPoint[];
  /** Stats AFFICHÉES (données démo déterministes, pas des constantes de jeu). */
  distanceKm: number;
  /** Zones capturables/défendables annoncées sur la carte de proposition. */
  zones: number;
  /** Points possibles — dérivés des règles §3 dans demo.ts (jamais en dur). */
  points: number;
  shape: RouteShape;
  difficulty: 'Facile' | 'Modéré' | 'Exigeant';
  /** Défense uniquement : rues à sauver + fenêtre restante. */
  streetsToSave?: number;
  expiresInH?: number;
}
