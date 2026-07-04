/**
 * GRYD — données démo « Mon territoire » France réelle (AMENDEMENT-13 §3).
 * Saison 0 : Paris (la scène République) + 2e possession chartreuse à LILLE +
 * crew adverse vers LYON. AMENDEMENT-13 §4ter : à l'AFFICHAGE les possessions
 * sont des TRACÉS de course nets (boucle LILLE_BOUCLE, couloir
 * LYON_BERGES_RHONE — consommés par allTerritories) ; les clusters H3 res 10
 * générés ici restent la VÉRITÉ « zones » (KPI/zoneCount — les cellules sont
 * le moteur invisible, jamais rendues). 100 % déterministe — aucune règle de
 * jeu ici, pur ancrage démo. Remplacé par hex_claims (Supabase) au Milestone 2.
 */
import { gridDisk, gridPathCells, latLngToCell } from 'h3-js';
import { H3_RESOLUTION } from '@klaim/shared';
import { battleMapData, battleMapSummary } from '../map/fakeHexes';
import {
  EGO_REPUBLIQUE,
  LYON_RIVAL,
  RUNNER_SCALE_ZOOM,
  type LatLngPoint,
} from '../map/realAnchors';
import { cellsToTerritory, type Territory } from '../map/territory';

// ─── Villes de la vue France (Saison 0 : Paris + Lille ; rival Lyon) ────────

export type FranceCityId = 'paris' | 'lille' | 'lyon';

export interface FranceCity {
  id: FranceCityId;
  /** Libellé court des markers/chips (les tuiles labellisent déjà les villes). */
  label: string;
  /** Crew adverse (orange) — sinon possession chartreuse. */
  rival: boolean;
  center: LatLngPoint;
  /** Zoom du flyTo : Paris = échelle coureur (Battle Map démo), sinon vue blob. */
  zoom: number;
}

/** Zoom « vue ville » des clusters simples (le blob entier + son quartier). */
const CITY_BLOB_ZOOM = 13;

/** Lille — Grand-Place (place du Général-de-Gaulle), cœur du cluster démo. */
export const LILLE_CENTER: LatLngPoint = { lat: 50.6367, lng: 3.0633 };

export const FRANCE_CITIES_DEMO: readonly FranceCity[] = [
  {
    id: 'paris',
    label: 'Paris',
    rival: false,
    center: EGO_REPUBLIQUE,
    zoom: RUNNER_SCALE_ZOOM,
  },
  { id: 'lille', label: 'Lille', rival: false, center: LILLE_CENTER, zoom: CITY_BLOB_ZOOM },
  { id: 'lyon', label: 'Lyon', rival: true, center: LYON_RIVAL, zoom: CITY_BLOB_ZOOM },
] as const;

// ─── Axes réels des clusters démo (waypoints lat/lng, précision ~20-30 m) ───

/** Lille : rue Nationale (Grand-Place → Champ de Mars) puis Vieux-Lille. */
const LILLE_RUE_NATIONALE: readonly LatLngPoint[] = [
  { lat: 50.6367, lng: 3.0633 }, // Grand-Place
  { lat: 50.6372, lng: 3.0567 }, // rue Nationale
  { lat: 50.6385, lng: 3.0521 },
  { lat: 50.6396, lng: 3.0492 }, // vers l'esplanade du Champ de Mars / Citadelle
];
const LILLE_VIEUX_LILLE: readonly LatLngPoint[] = [
  { lat: 50.6367, lng: 3.0633 }, // Grand-Place
  { lat: 50.6389, lng: 3.0626 }, // rue de la Monnaie
  { lat: 50.6407, lng: 3.062 }, // Vieux-Lille, vers la cathédrale de la Treille
];

/**
 * Lyon rival : berges du Rhône, rive gauche (pont de la Guillotière → quai de
 * Serbie). GÉOMÉTRIE RÉELLE DES QUAIS (§4ter « pas de vol d'oiseau ») : ways
 * OSM « Quai Victor Augagneur » + « Quai Général Sarrail » via Overpass
 * (2026-07-05), assemblés (jonction au pont Lafayette), tronqués, RDP 5 m.
 */
export const LYON_BERGES_RHONE: readonly LatLngPoint[] = [
  { lat: 45.7564, lng: 4.84046 }, // pont de la Guillotière
  { lat: 45.75676, lng: 4.84067 },
  { lat: 45.75718, lng: 4.84075 }, // quai Victor-Augagneur, le long du fleuve
  { lat: 45.76378, lng: 4.84144 }, // pont Lafayette
  { lat: 45.76586, lng: 4.84152 }, // quai Général-Sarrail, vers quai de Serbie
];

/**
 * BOUCLE LILLE (AMENDEMENT-13 §4ter : la frontière EST le tracé du run,
 * ~3,1 km) : Grand-Place → rue Nationale/bd de la Liberté → esplanade du
 * Champ de Mars (Façade de l'Esplanade) → rue de Jemmapes → avenue du
 * Peuple-Belge → place Louise-de-Bettignies → rue de la Monnaie → rue
 * Esquermoise → Grand-Place. ROUTÉE SUR LES VRAIES RUES : OSRM public foot +
 * ways OSM (rue de la Monnaie) via Overpass, 2026-07-05, RDP 5 m, figée
 * (aucune dépendance réseau au runtime). Anneau OUVERT.
 */
export const LILLE_BOUCLE: readonly LatLngPoint[] = [
  { lat: 50.6369, lng: 3.06376 }, // Grand-Place
  { lat: 50.63726, lng: 3.06335 },
  { lat: 50.63727, lng: 3.0631 }, // rue Nationale
  { lat: 50.63457, lng: 3.05678 }, // bd de la Liberté
  { lat: 50.6374, lng: 3.05164 }, // square Daubenton (Champ de Mars)
  { lat: 50.63902, lng: 3.05342 }, // square du Ramponneau
  { lat: 50.63949, lng: 3.05364 },
  { lat: 50.63984, lng: 3.05368 }, // Façade de l'Esplanade (bord de Deûle)
  { lat: 50.64264, lng: 3.05351 },
  { lat: 50.64331, lng: 3.05319 }, // rue de Jemmapes
  { lat: 50.64542, lng: 3.06042 }, // rue Maracci
  { lat: 50.64456, lng: 3.06108 }, // avenue du Peuple-Belge
  { lat: 50.64154, lng: 3.064 },
  { lat: 50.64097, lng: 3.06499 }, // place Louise-de-Bettignies
  { lat: 50.64062, lng: 3.06413 }, // rue de la Monnaie (Vieux-Lille)
  { lat: 50.6386, lng: 3.06305 }, // rue Esquermoise
  { lat: 50.6376, lng: 3.0633 },
];

// ─── Génération H3 → territoires organiques (même pipeline que Paris) ───────

/** Cellules H3 traversées par une polyligne (chemin continu, dédupliqué). */
function cellsAlongPath(line: readonly LatLngPoint[]): string[] {
  const out: string[] = [];
  let prev: string | null = null;
  for (const p of line) {
    const cell = latLngToCell(p.lat, p.lng, H3_RESOLUTION);
    if (prev === null) {
      out.push(cell);
    } else if (prev !== cell) {
      for (const step of gridPathCells(prev, cell)) {
        if (!out.includes(step)) out.push(step);
      }
    }
    prev = cell;
  }
  return out;
}

/** Cluster « cœur + couloirs » : disque k=1 au centre + cellules des axes. */
function clusterCells(center: LatLngPoint, axes: readonly (readonly LatLngPoint[])[]): string[] {
  const cells = new Set<string>(gridDisk(latLngToCell(center.lat, center.lng, H3_RESOLUTION), 1));
  for (const axis of axes) for (const c of cellsAlongPath(axis)) cells.add(c);
  return [...cells];
}

export interface FranceClusters {
  /** Cluster chartreuse démo de Lille (2e zone de guerre Saison 0). */
  lille: Territory;
  /** Cluster du crew adverse vers Lyon (orange). */
  lyonRival: Territory;
}

let cachedClusters: FranceClusters | null = null;

/** Territoires organiques Lille + Lyon (déterministes, calculés une fois). */
export function franceClusters(): FranceClusters {
  if (cachedClusters) return cachedClusters;
  const lille = cellsToTerritory(
    clusterCells(LILLE_CENTER, [LILLE_RUE_NATIONALE, LILLE_VIEUX_LILLE]),
    'crew',
  );
  const lyonRival = cellsToTerritory(clusterCells(LYON_RIVAL, [LYON_BERGES_RHONE]), 'rival');
  if (!lille || !lyonRival) {
    // Impossible par construction (clusters jamais vides) — garde-fou strict.
    throw new Error('franceClusters : cluster démo vide');
  }
  cachedClusters = { lille, lyonRival };
  return cachedClusters;
}

// ─── KPI « digital twin » (profil + écran territoire) ───────────────────────

export interface FranceKpi {
  /** Zones tenues par mon crew : Paris (HUD Battle Map) + cluster Lille. */
  totalZones: number;
  /** Villes des possessions — vocabulaire Saison 0. */
  citiesLabel: string;
}

/** Compte DÉRIVÉ des mêmes données que la carte (jamais codé en dur). */
export function franceKpi(): FranceKpi {
  const parisHeld = battleMapSummary(battleMapData().collection).held;
  return {
    totalZones: parisHeld + franceClusters().lille.zoneCount,
    citiesLabel: 'Paris + Lille',
  };
}
