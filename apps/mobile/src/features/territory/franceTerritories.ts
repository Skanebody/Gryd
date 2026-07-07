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
  { lat: 50.6369, lng: 3.06376 },
  { lat: 50.637, lng: 3.06364 },
  { lat: 50.63723, lng: 3.06339 },
  { lat: 50.63728, lng: 3.06319 },
  { lat: 50.63717, lng: 3.0629 },
  { lat: 50.6371, lng: 3.06273 },
  { lat: 50.63694, lng: 3.06235 },
  { lat: 50.63676, lng: 3.06194 },
  { lat: 50.63632, lng: 3.06089 },
  { lat: 50.63587, lng: 3.05984 },
  { lat: 50.63581, lng: 3.05969 },
  { lat: 50.63575, lng: 3.05955 },
  { lat: 50.63567, lng: 3.05937 },
  { lat: 50.63528, lng: 3.05844 },
  { lat: 50.63522, lng: 3.05829 },
  { lat: 50.63507, lng: 3.05795 },
  { lat: 50.63495, lng: 3.05766 },
  { lat: 50.63467, lng: 3.057 },
  { lat: 50.63457, lng: 3.05678 },
  { lat: 50.63466, lng: 3.05662 },
  { lat: 50.63479, lng: 3.05639 },
  { lat: 50.63521, lng: 3.05563 },
  { lat: 50.63536, lng: 3.05537 },
  { lat: 50.63578, lng: 3.0546 },
  { lat: 50.63617, lng: 3.0539 },
  { lat: 50.63629, lng: 3.0537 },
  { lat: 50.63661, lng: 3.05312 },
  { lat: 50.63678, lng: 3.05281 },
  { lat: 50.63699, lng: 3.05242 },
  { lat: 50.63728, lng: 3.05192 },
  { lat: 50.63736, lng: 3.05175 },
  { lat: 50.63749, lng: 3.05173 },
  { lat: 50.63742, lng: 3.05192 },
  { lat: 50.63759, lng: 3.05207 },
  { lat: 50.63795, lng: 3.05243 },
  { lat: 50.6381, lng: 3.05258 },
  { lat: 50.63821, lng: 3.05271 },
  { lat: 50.6384, lng: 3.05292 },
  { lat: 50.63849, lng: 3.05302 },
  { lat: 50.6386, lng: 3.05313 },
  { lat: 50.63869, lng: 3.05322 },
  { lat: 50.63865, lng: 3.05306 },
  { lat: 50.63887, lng: 3.05328 },
  { lat: 50.63897, lng: 3.05338 },
  { lat: 50.6391, lng: 3.05348 },
  { lat: 50.63922, lng: 3.05354 },
  { lat: 50.63933, lng: 3.05359 },
  { lat: 50.63949, lng: 3.05364 },
  { lat: 50.6396, lng: 3.05367 },
  { lat: 50.63972, lng: 3.05368 },
  { lat: 50.63984, lng: 3.05368 },
  { lat: 50.63996, lng: 3.05376 },
  { lat: 50.64018, lng: 3.05374 },
  { lat: 50.64049, lng: 3.05371 },
  { lat: 50.6409, lng: 3.05367 },
  { lat: 50.64106, lng: 3.05366 },
  { lat: 50.64136, lng: 3.05364 },
  { lat: 50.6419, lng: 3.0536 },
  { lat: 50.64206, lng: 3.05358 },
  { lat: 50.64218, lng: 3.05357 },
  { lat: 50.64257, lng: 3.05352 },
  { lat: 50.64283, lng: 3.05347 },
  { lat: 50.64306, lng: 3.05336 },
  { lat: 50.64319, lng: 3.05328 },
  { lat: 50.64331, lng: 3.05319 },
  { lat: 50.6434, lng: 3.05348 },
  { lat: 50.64353, lng: 3.05392 },
  { lat: 50.64359, lng: 3.05414 },
  { lat: 50.6438, lng: 3.05484 },
  { lat: 50.64385, lng: 3.05501 },
  { lat: 50.64391, lng: 3.05521 },
  { lat: 50.64398, lng: 3.05546 },
  { lat: 50.64428, lng: 3.05648 },
  { lat: 50.64446, lng: 3.0571 },
  { lat: 50.64459, lng: 3.05754 },
  { lat: 50.64502, lng: 3.05905 },
  { lat: 50.64513, lng: 3.05944 },
  { lat: 50.64517, lng: 3.0596 },
  { lat: 50.6454, lng: 3.06034 },
  { lat: 50.64494, lng: 3.06084 },
  { lat: 50.64483, lng: 3.06088 },
  { lat: 50.64472, lng: 3.06094 },
  { lat: 50.64456, lng: 3.06108 },
  { lat: 50.64436, lng: 3.06127 },
  { lat: 50.64425, lng: 3.06137 },
  { lat: 50.6436, lng: 3.062 },
  { lat: 50.64305, lng: 3.06254 },
  { lat: 50.64288, lng: 3.0627 },
  { lat: 50.64258, lng: 3.06301 },
  { lat: 50.64247, lng: 3.06313 },
  { lat: 50.64231, lng: 3.06329 },
  { lat: 50.64218, lng: 3.06343 },
  { lat: 50.64187, lng: 3.06373 },
  { lat: 50.64173, lng: 3.06383 },
  { lat: 50.64154, lng: 3.064 },
  { lat: 50.64143, lng: 3.06412 },
  { lat: 50.6411, lng: 3.06473 },
  { lat: 50.64102, lng: 3.06488 },
  { lat: 50.64089, lng: 3.06492 },
  { lat: 50.64057, lng: 3.06459 },
  { lat: 50.64055, lng: 3.06437 },
  { lat: 50.64062, lng: 3.06413 },
  { lat: 50.64057, lng: 3.06431 },
  { lat: 50.6405, lng: 3.06449 },
  { lat: 50.64038, lng: 3.06447 },
  { lat: 50.64025, lng: 3.06452 },
  { lat: 50.64014, lng: 3.06451 },
  { lat: 50.64003, lng: 3.06449 },
  { lat: 50.63988, lng: 3.06441 },
  { lat: 50.63977, lng: 3.06433 },
  { lat: 50.63963, lng: 3.06419 },
  { lat: 50.63946, lng: 3.064 },
  { lat: 50.63935, lng: 3.06378 },
  { lat: 50.63912, lng: 3.06308 },
  { lat: 50.63905, lng: 3.06281 },
  { lat: 50.63894, lng: 3.06292 },
  { lat: 50.63881, lng: 3.06307 },
  { lat: 50.63868, lng: 3.06306 },
  { lat: 50.63847, lng: 3.06286 },
  { lat: 50.63833, lng: 3.06275 },
  { lat: 50.63797, lng: 3.06296 },
  { lat: 50.63761, lng: 3.06319 },
  { lat: 50.63756, lng: 3.06338 },
  { lat: 50.63743, lng: 3.06329 },
  { lat: 50.63729, lng: 3.06325 },
  { lat: 50.637, lng: 3.06364 },
  { lat: 50.6369, lng: 3.06376 },
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
