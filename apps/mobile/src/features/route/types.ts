/**
 * GRYD — types du ROUTE PLANNER (AMENDEMENT-10 §2 + AMENDEMENT-11 §3/§6 +
 * AMENDEMENT-12 §A). « GRYD ne montre plus seulement le territoire, il dit
 * COURS ICI pour le prendre. » Vocabulaire visible : zones / rues / secteurs —
 * jamais « hex ». Le joueur ne voit que 2 OBJECTIFS : Conquérir / Défendre ;
 * les 8 types du catalogue AMENDEMENT-10 deviennent des SOUS-TYPES INTERNES
 * (constantes conservées, plus exposées comme objectifs). Aucune règle de jeu
 * ici — la vraie génération d'itinéraires est V1 (hors scope).
 */
import type { LatLngPoint } from '../map/basemap';

// ─── Les 2 objectifs joueur (AMENDEMENT-12 §A) ──────────────────────────────

export type RouteObjective = 'conquerir' | 'defendre';

export const ROUTE_OBJECTIVE_ORDER: readonly RouteObjective[] = ['conquerir', 'defendre'];

export const ROUTE_OBJECTIVE_LABELS: Record<RouteObjective, string> = {
  conquerir: 'Conquérir',
  defendre: 'Défendre',
};

/** Nom commun de l'objectif (« Route conquête Canal » / « Route défense République »). */
export const ROUTE_OBJECTIVE_NOUNS: Record<RouteObjective, string> = {
  conquerir: 'conquête',
  defendre: 'défense',
};

/**
 * Sous-type interne → objectif affiché. CONQUÉRIR absorbe capture (neutre),
 * raid (rival) et exploration (pionnier) ; DÉFENDRE = routes défense.
 * Social Run / Course privée restent des MODES de course (RunModeSheet),
 * jamais des objectifs — mappés « conquerir » par défaut, non exposés ici.
 */
export const OBJECTIVE_BY_ROUTE_TYPE: Record<RouteTypeKey, RouteObjective> = {
  capture_rapide: 'conquerir',
  defense: 'defendre',
  raid: 'conquerir',
  exploration: 'conquerir',
  boucle_facile: 'conquerir',
  sortie_longue: 'conquerir',
  social_run: 'conquerir',
  course_privee: 'conquerir',
};

/** SOUS-TYPES internes des routes (ex-catalogue AMENDEMENT-10 §2 — plus un objectif). */
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

/**
 * AMENDEMENT-12 §A : les chips de priorité s'alignent SOUS les 2 objectifs —
 * capture/performance/exploration sous Conquérir, défense sous Défendre.
 */
export const PRIORITIES_BY_OBJECTIVE: Record<RouteObjective, readonly RoutePriority[]> = {
  conquerir: ['capture', 'performance', 'exploration'],
  defendre: ['defense'],
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
  /**
   * AMENDEMENT-12 §C — routes en boucle uniquement : part de `zones` estimée
   * par la FERMETURE de la boucle (« +86 zones dont 52 en boucle »). Donnée
   * démo déterministe comme `zones`, pas une règle : le vrai remplissage est
   * décidé serveur (ingest_run, cellule par cellule).
   */
  loopZones?: number;
  /** Points possibles — dérivés des règles §3 dans demo.ts (jamais en dur). */
  points: number;
  shape: RouteShape;
  difficulty: 'Facile' | 'Modéré' | 'Exigeant';
  /** Défense uniquement : rues à sauver + fenêtre restante. */
  streetsToSave?: number;
  expiresInH?: number;
}
