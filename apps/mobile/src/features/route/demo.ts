/**
 * GRYD — données démo DÉTERMINISTES du Route Planner (AMENDEMENT-10 §2,
 * AMENDEMENT-11 §3/§6, AMENDEMENT-13 §4ter). 3 propositions de routes ROUTÉES
 * SUR LE RÉSEAU VIAIRE RÉEL (« pas de vol d'oiseau ») : polylignes OSRM foot
 * figées à l'authoring depuis l'ego démo place de la République (realAnchors),
 * même technique que realAnchors.ts — aucune dépendance réseau au runtime.
 * S'y ajoutent options de génération + bloc objectif défense + partage crew.
 * La vraie génération d'itinéraires est V1 : ici tout est scripté. Les POINTS
 * possibles sont DÉRIVÉS des règles §3 (@klaim/shared — aucun nombre magique) ;
 * distances/zones/rues sont des étiquettes démo comme dans warroom/demo.ts
 * (les distances collent aux polylignes réelles, écart < 10 %). La bande
 * capturable AFFICHÉE le long du tracé est le RUBAN NET d'allTerritories
 * (§4ter) — plus aucun lissage de cellules côté rendu.
 */
import { POINTS_DEFENDED_HEX, POINTS_NEUTRAL_HEX } from '@klaim/shared';
import {
  OBJECTIVE_BY_ROUTE_TYPE,
  ROUTE_OBJECTIVE_NOUNS,
  type PlannedRouteDemo,
  type RouteObjective,
  type RoutePriority,
  type RouteTypeKey,
} from './types';

/**
 * Allure démo pour l'ESTIMATION de durée des propositions (5'50 /km — cohérente
 * avec la course simulée). Étiquette UI, pas une règle de jeu (§3 borne
 * seulement les allures valides).
 */
export const ROUTE_PACE_S_PER_KM = 350;

/** Durée estimée affichée (min) d'une proposition. */
export function routeDurationMin(route: PlannedRouteDemo): number {
  return Math.round((route.distanceKm * ROUTE_PACE_S_PER_KM) / 60);
}

// ─── Les 3 propositions (AMENDEMENT-10 §2 — Route A / B / C) ────────────────
/**
 * Tracés en BOUCLE (départ = retour = « moi », place de la République — ego
 * démo realAnchors), ROUTÉS RUE PAR RUE (§4ter « pas de vol d'oiseau ») :
 * OSRM public profil foot (routing.openstreetmap.de/routed-foot, 2026-07-05),
 * géométries figées, RDP 7 m, micro-allers-retours de trottoir (< 50 m)
 * retirés à la main — chaque segment droit EST une rue droite, chaque sommet
 * un coin de rue. Zéro réseau au runtime. Les `distanceKm` affichées sont
 * COHÉRENTES avec ces polylignes (mesure du tracé figé — la Route C passe de
 * 4,8 à 4,4 km, seul libellé au-delà des ~10 % d'écart).
 * `loopZones` (AMENDEMENT-12 §C) = part de `zones` estimée en intérieur de
 * boucle (« +86 zones dont 52 en boucle » — la Route C reprend le 86/52 de
 * l'onboarding écran 2). Étiquettes démo, le remplissage réel est serveur.
 */
export const ROUTES_DEMO: readonly PlannedRouteDemo[] = [
  {
    id: 'route_a_rapide',
    letter: 'A',
    name: 'Rapide',
    typeKey: 'capture_rapide',
    zone: 'Bastille',
    distanceKm: 3.4,
    zones: 52,
    loopZones: 28,
    points: 52 * POINTS_NEUTRAL_HEX,
    shape: 'boucle',
    difficulty: 'Facile',
    // République → bd Richard-Lenoir (le canal couvert) → marché Bastille →
    // remontée bd Beaumarchais / Filles-du-Calvaire / bd du Temple (3,4 km).
    line: [
      { lat: 48.86703, lng: 2.36415 }, // place de la République, angle sud-est
      { lat: 48.86524, lng: 2.36744 }, // rue Rampon → bd Richard-Lenoir
      { lat: 48.863, lng: 2.37117 },
      { lat: 48.86245, lng: 2.37187 }, // croisement rue Oberkampf
      { lat: 48.86146, lng: 2.37215 }, // le boulevard s'infléchit plein sud
      { lat: 48.86063, lng: 2.37209 }, // métro Richard-Lenoir
      { lat: 48.8549, lng: 2.36951 }, // marché Bastille (demi-tour Bréguet-Sabin)
      { lat: 48.8586, lng: 2.36838 }, // rue du Pasteur-Wagner → bd Beaumarchais
      { lat: 48.85861, lng: 2.36761 },
      { lat: 48.8592, lng: 2.36748 }, // bd Beaumarchais (Saint-Sébastien)
      { lat: 48.86306, lng: 2.36656 }, // bd des Filles-du-Calvaire
      { lat: 48.86523, lng: 2.36525 }, // bd du Temple
      { lat: 48.8654, lng: 2.36548 },
      { lat: 48.86635, lng: 2.36492 }, // place Pasdeloup
      { lat: 48.86654, lng: 2.36512 },
      { lat: 48.86703, lng: 2.36415 }, // retour place de la République
    ],
  },
  {
    id: 'route_b_optimisee',
    letter: 'B',
    name: 'Optimisée',
    typeKey: 'raid',
    zone: 'Canal',
    distanceKm: 5.1,
    zones: 94,
    loopZones: 57,
    points: 94 * POINTS_NEUTRAL_HEX,
    shape: 'boucle',
    difficulty: 'Exigeant',
    // République → quai de Valmy (canal Saint-Martin) → rue Louis-Blanc →
    // quai de Jemmapes → pointe de raid A/R Faubourg-du-Temple jusqu'à
    // Belleville (la frontière rivale) → retour République (5,1 km).
    line: [
      { lat: 48.86703, lng: 2.36415 }, // place de la République, angle sud-est
      { lat: 48.86722, lng: 2.36383 },
      { lat: 48.86751, lng: 2.36424 }, // rue Beaurepaire → quai de Valmy
      { lat: 48.86774, lng: 2.36436 },
      { lat: 48.86844, lng: 2.36319 }, // square Frédérick-Lemaître
      { lat: 48.86873, lng: 2.36302 },
      { lat: 48.87005, lng: 2.36358 }, // passerelle Alibert / Hôtel du Nord
      { lat: 48.87019, lng: 2.36384 },
      { lat: 48.87172, lng: 2.36453 }, // rue Bichat
      { lat: 48.87176, lng: 2.36469 },
      { lat: 48.87389, lng: 2.36301 }, // jardin Villemin
      { lat: 48.87459, lng: 2.36293 }, // écluse des Récollets
      { lat: 48.87498, lng: 2.36312 },
      { lat: 48.87753, lng: 2.36534 }, // le canal vire nord-est
      { lat: 48.87773, lng: 2.36531 },
      { lat: 48.8796, lng: 2.36709 }, // rue Louis-Blanc (pointe nord, traversée)
      { lat: 48.87772, lng: 2.36551 }, // quai de Jemmapes (rive est)
      { lat: 48.87755, lng: 2.36576 },
      { lat: 48.87755, lng: 2.36607 },
      { lat: 48.8773, lng: 2.366 },
      { lat: 48.87701, lng: 2.36643 },
      { lat: 48.87663, lng: 2.36737 }, // écluse des Récollets, rive est
      { lat: 48.87593, lng: 2.36835 }, // hôpital Saint-Louis
      { lat: 48.87287, lng: 2.36383 }, // le quai file droit le long du canal
      { lat: 48.87086, lng: 2.36538 }, // passerelle de la Grange-aux-Belles
      { lat: 48.87067, lng: 2.36534 },
      { lat: 48.86859, lng: 2.36702 }, // croisement rue du Faubourg-du-Temple
      { lat: 48.86872, lng: 2.36693 },
      { lat: 48.86879, lng: 2.36707 },
      { lat: 48.86883, lng: 2.36746 }, // départ du raid : Faubourg-du-Temple
      { lat: 48.87004, lng: 2.37087 },
      { lat: 48.8708, lng: 2.37348 }, // rue Saint-Maur
      { lat: 48.8721, lng: 2.37678 }, // carrefour Belleville (pointe du raid)
      { lat: 48.87201, lng: 2.37668 }, // demi-tour — retour par le Faubourg
      { lat: 48.8708, lng: 2.37348 },
      { lat: 48.87004, lng: 2.37087 },
      { lat: 48.86883, lng: 2.36746 },
      { lat: 48.86879, lng: 2.36707 },
      { lat: 48.86865, lng: 2.36697 },
      { lat: 48.8678, lng: 2.36447 }, // rue du Faubourg-du-Temple, bas
      { lat: 48.86722, lng: 2.36383 },
      { lat: 48.86703, lng: 2.36415 }, // retour place de la République
    ],
  },
  {
    id: 'route_c_defense',
    letter: 'C',
    name: 'Défense',
    typeKey: 'defense',
    zone: 'République',
    distanceKm: 4.4,
    zones: 86,
    loopZones: 52,
    points: 86 * POINTS_DEFENDED_HEX,
    shape: 'boucle',
    difficulty: 'Modéré',
    streetsToSave: 12,
    expiresInH: 48,
    // Périmètre défensif du secteur République : av. de la République →
    // Père-Lachaise (bd de Ménilmontant) → rue de la Roquette / Léon-Blum →
    // retour bd Voltaire (4,4 km).
    line: [
      { lat: 48.86703, lng: 2.36415 }, // place de la République, angle sud-est
      { lat: 48.86668, lng: 2.36476 }, // départ avenue de la République
      { lat: 48.86688, lng: 2.36514 },
      { lat: 48.86674, lng: 2.36538 },
      { lat: 48.86689, lng: 2.36564 },
      { lat: 48.86671, lng: 2.36662 }, // croisement bd Jules-Ferry (canal couvert)
      { lat: 48.86685, lng: 2.36678 },
      { lat: 48.86637, lng: 2.36959 }, // métro Parmentier
      { lat: 48.86304, lng: 2.38687 }, // Père-Lachaise (bd de Ménilmontant)
      { lat: 48.86277, lng: 2.38676 },
      { lat: 48.86241, lng: 2.3855 }, // rue de la Folie-Regnault
      { lat: 48.86233, lng: 2.38555 },
      { lat: 48.86225, lng: 2.3853 },
      { lat: 48.86128, lng: 2.38583 },
      { lat: 48.86105, lng: 2.3852 },
      { lat: 48.86091, lng: 2.38511 },
      { lat: 48.86039, lng: 2.38543 },
      { lat: 48.86015, lng: 2.38487 }, // rue de la Roquette, vers Voltaire
      { lat: 48.85924, lng: 2.38408 },
      { lat: 48.8588, lng: 2.38435 },
      { lat: 48.8586, lng: 2.38372 },
      { lat: 48.85795, lng: 2.38113 }, // bd Voltaire, place Léon-Blum
      { lat: 48.85793, lng: 2.38066 },
      { lat: 48.85807, lng: 2.38044 },
      { lat: 48.858, lng: 2.37998 },
      { lat: 48.86089, lng: 2.3752 }, // bd Voltaire, Saint-Ambroise
      { lat: 48.86081, lng: 2.37493 },
      { lat: 48.8625, lng: 2.37202 }, // croisement rue Oberkampf
      { lat: 48.86242, lng: 2.37179 },
      { lat: 48.863, lng: 2.37117 },
      { lat: 48.86591, lng: 2.36628 }, // bd Voltaire, dernière ligne droite
      { lat: 48.86703, lng: 2.36415 }, // retour place de la République
    ],
  },
];

/** Route par défaut (recommandée) et routage des entrées War Room `?type=`. */
export const DEFAULT_ROUTE_ID = 'route_c_defense';

/**
 * Entrées externes (`/route-planner?type=raid|defense`, AMENDEMENT-10 §2) :
 * chaque type connu sélectionne la proposition démo correspondante.
 */
export function routeIdForType(type: string | undefined): string {
  switch (type) {
    case 'raid':
      return 'route_b_optimisee';
    case 'defense':
      return 'route_c_defense';
    case 'capture':
    case 'capture_rapide':
      return 'route_a_rapide';
    default:
      return DEFAULT_ROUTE_ID;
  }
}

/**
 * Onglet objectif (AMENDEMENT-12 §A) → proposition présélectionnée : Conquérir
 * ouvre la Route A (rapide), Défendre la Route C (défense République).
 */
export const ROUTE_ID_BY_OBJECTIVE: Record<RouteObjective, string> = {
  conquerir: 'route_a_rapide',
  defendre: 'route_c_defense',
};

/** La priorité (chips) sélectionne une proposition — et réciproquement. */
export const ROUTE_ID_BY_PRIORITY: Record<RoutePriority, string> = {
  capture: 'route_b_optimisee',
  defense: 'route_c_defense',
  performance: 'route_a_rapide',
  exploration: 'route_b_optimisee',
};

export const PRIORITY_BY_ROUTE_ID: Record<string, RoutePriority> = {
  route_a_rapide: 'performance',
  route_b_optimisee: 'capture',
  route_c_defense: 'defense',
};

/** Catalogue → proposition démo la plus proche (null = pas encore de démo). */
export const ROUTE_ID_BY_TYPE: Record<RouteTypeKey, string | null> = {
  capture_rapide: 'route_a_rapide',
  defense: 'route_c_defense',
  raid: 'route_b_optimisee',
  exploration: 'route_b_optimisee',
  boucle_facile: 'route_a_rapide',
  sortie_longue: 'route_b_optimisee',
  social_run: null,
  course_privee: null,
};

/** Types sans démo : message court (routes sociales/privées — V1, §6). */
export const ROUTE_TYPE_SOON_TOAST: Partial<Record<RouteTypeKey, string>> = {
  social_run: 'Social run — invite ton crew depuis le Crew HQ',
  course_privee: 'Course privée — stats uniquement, aucune capture',
};

// ─── Options de génération (chips — démo : la sélection est locale) ─────────

export const ROUTE_DISTANCE_OPTIONS = ['3 km', '5 km', '10 km', 'Libre'] as const;
export type RouteDistanceOption = (typeof ROUTE_DISTANCE_OPTIONS)[number];

/** Distance pré-cochée par proposition (cohérence chips ↔ route affichée). */
export function distanceOptionFor(route: PlannedRouteDemo): RouteDistanceOption {
  if (route.distanceKm <= 3.5) return '3 km';
  if (route.distanceKm <= 6) return '5 km';
  if (route.distanceKm <= 11) return '10 km';
  return 'Libre';
}

/** Contraintes toggles (sécurité / dénivelé — AMENDEMENT-10 §2). */
export interface RouteConstraintOption {
  key: string;
  label: string;
}

export const ROUTE_CONSTRAINTS: readonly RouteConstraintOption[] = [
  { key: 'eviter_grands_axes', label: 'Éviter grands axes' },
  { key: 'denivele_mini', label: 'Dénivelé mini' },
];

// ─── Bloc objectif (War Room ↔ Route Planner — vocabulaire zones/rues) ──────

/** Objectif courant du crew : la défense République (cohérent DEFENSE_SECTOR). */
export const ROUTE_OBJECTIVE = {
  title: 'Défendre République',
  streetsToSave: 12,
  expiresInH: 48,
  routeId: 'route_c_defense',
} as const;

// ─── Route = objet social (AMENDEMENT-11 §6 — MVP léger) ────────────────────

/**
 * Nom social complet d'une route — sur les 2 verbes (AMENDEMENT-12 §A) :
 * « Route conquête Canal » / « Route défense République ».
 */
export function routeSocialName(route: PlannedRouteDemo): string {
  const noun = ROUTE_OBJECTIVE_NOUNS[OBJECTIVE_BY_ROUTE_TYPE[route.typeKey]];
  return `Route ${noun} ${route.zone}`;
}

/** Entrée de feed crew après partage (démo : affichée localement + toast). */
export function routeShareFeedEntry(route: PlannedRouteDemo): string {
  return `${routeSocialName(route)} partagée au crew`;
}

// (§4ter — l'ex-« bande de cellules capturables » a disparu avec les blobs :
// la carte du planner rend un RUBAN NET le long du tracé via allTerritories.)
