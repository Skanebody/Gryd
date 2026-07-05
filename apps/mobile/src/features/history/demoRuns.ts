/**
 * GRYD — GÉOMÉTRIE DE TRACÉ par course de l'Historique (AMENDEMENT-25 §2).
 * « L'utilisateur doit retrouver TOUS ses parcours … avec le dessin de son
 * parcours (le tracé réel), en 2D ET en 3D. » Ce module est la SOURCE UNIQUE
 * du tracé géographique de CHAQUE course de `demo.ts` (miroir déterministe de
 * ce que le serveur renverra — le client n'attribue jamais rien) : il associe
 * un id de course à une polyligne lat/lng RÉELLE (réutilisée des ancres
 * d'authoring : realAnchors / franceTerritories, « pas de vol d'oiseau »), un
 * drapeau `closed` (boucle fermée → aire capturée / route ouverte), et de quoi
 * cadrer la caméra 3D sur ce tracé.
 *
 * AUCUNE règle de jeu ici (comme realAnchors / demo3d) : pur ancrage
 * géographique de rendu. La 2D (RunLoopMap / aperçu) et la 3D (RunRoute3D)
 * consomment CE module — une seule source de surfaces. Les traces sans ancre
 * dédiée (Vincennes, Belleville, Rivoli, Vieux-Lille, import) réutilisent ou
 * dérivent des ancres existantes ; deux petits tracés locaux sont ajoutés ici
 * (Vincennes, Rivoli aller-retour) car ces quartiers n'ont pas d'ancre.
 */
import type { RealMapCamera } from '../../ui/game';
import {
  AVENUE_DE_LA_REPUBLIQUE,
  BD_RICHARD_LENOIR,
  BOUCLE_BASTILLE,
  BOUCLE_REPUBLIQUE,
  QUAI_VALMY,
  REAL_M_PER_DEG_LAT,
  type LatLngPoint,
} from '../map/realAnchors';
import { LILLE_BOUCLE } from '../territory/franceTerritories';

// ─── Tracés locaux (quartiers sans ancre d'authoring dédiée) ─────────────────

/**
 * Bois de Vincennes — boucle du lac Daumesnil (footing privé). Tracé approché
 * le long des allées (île de Reuilly → allée Royale → retour esplanade), anneau
 * OUVERT. Course « stats only » : pas d'aire capturée, mais un vrai parcours à
 * dessiner (l'Historique montre le tracé même sans capture).
 */
const BOUCLE_VINCENNES: readonly LatLngPoint[] = [
  { lat: 48.8353, lng: 2.4302 }, // bord ouest du lac Daumesnil
  { lat: 48.8339, lng: 2.4335 }, // île de Reuilly
  { lat: 48.8335, lng: 2.4383 }, // allée Royale
  { lat: 48.8352, lng: 2.4416 }, // pointe est
  { lat: 48.8377, lng: 2.4397 }, // route de la Ceinture-du-Lac
  { lat: 48.8383, lng: 2.4345 }, // retour esplanade Saint-Louis
  { lat: 48.8369, lng: 2.4308 },
];

/**
 * Rue de Rivoli — aller-retour (course refusée « zone trop fine » : un couloir
 * sans surface). Le tracé est une ligne droite qui revient sur elle-même : rien
 * à extruder (pas de boucle), mais le parcours se dessine quand même.
 */
const ALLER_RETOUR_RIVOLI: readonly LatLngPoint[] = [
  { lat: 48.8586, lng: 2.3522 }, // Hôtel de Ville
  { lat: 48.8605, lng: 2.3400 }, // Louvre / rue de Rivoli
  { lat: 48.8586, lng: 2.3522 }, // retour Hôtel de Ville
];

/**
 * Vieux-Lille — boucle sous la pluie (GPS instable). Réutilise LILLE_BOUCLE
 * (Grand-Place → esplanade → Vieux-Lille) : un vrai parcours, même si le signal
 * a trop dérivé pour capturer (stats only).
 */
const BOUCLE_VIEUX_LILLE = LILLE_BOUCLE;

/**
 * Import Strava « vélo » (allure incohérente → refusé) : un long trajet
 * République → Bastille par Richard-Lenoir, prolongé — le tracé existe (il a
 * bien été importé), mais l'activité est écartée du territoire (vélo, pas
 * course). On le montre pour l'honnêteté (le calcul explique le refus).
 */
const TRAJET_IMPORT: readonly LatLngPoint[] = BD_RICHARD_LENOIR;

// ─── Table de tracé par course (id de demo.ts → géométrie réelle) ────────────

export interface RunTrace {
  /** Polyligne lat/lng du parcours (waypoints réels — jamais un vol d'oiseau). */
  points: readonly LatLngPoint[];
  /**
   * `true` = boucle fermée (une aire est enfermée → zone extrudable en 3D) ;
   * `false` = route/aller-retour ouvert (le tracé prime, aucun volume). Miroir
   * de la décision serveur (comme `loopMap` de demo.ts).
   */
  closed: boolean;
}

/**
 * Tracé RÉEL par id de course. Chaque course de RUN_HISTORY a une entrée : la
 * liste ET le détail retrouvent le dessin du parcours, en 2D comme en 3D.
 */
export const RUN_TRACES: Readonly<Record<string, RunTrace>> = {
  'r-boucle-republique': { points: BOUCLE_REPUBLIQUE, closed: true },
  'r-defense-ourcq': { points: QUAI_VALMY, closed: false },
  'r-route-base-republique': { points: BD_RICHARD_LENOIR, closed: false },
  'r-footing-prive': { points: BOUCLE_VINCENNES, closed: true },
  'r-partielle-bastille': { points: BOUCLE_BASTILLE, closed: true },
  'r-refus-loop': { points: AVENUE_DE_LA_REPUBLIQUE, closed: false },
  'r-refus-thin': { points: ALLER_RETOUR_RIVOLI, closed: false },
  'r-refus-gps': { points: BOUCLE_VIEUX_LILLE, closed: true },
  'r-refus-speed': { points: TRAJET_IMPORT, closed: false },
};

/** Le tracé d'une course (undefined si l'id est inconnu — jamais un throw). */
export function runTrace(id: string): RunTrace | undefined {
  return RUN_TRACES[id];
}

// ─── Cadrage caméra sur un tracé (barycentre + zoom d'englobement) ───────────

/**
 * Zooms MapLibre de secours — bornes de la caméra 3D d'une course. La caméra
 * cadre le tracé (quartier) : un run court zoome plus (zone lisible), un long
 * dézoome. Bornes purement visuelles (UI, pas des règles de jeu).
 */
const TRACE_CAMERA_MIN_ZOOM = 12.6;
const TRACE_CAMERA_MAX_ZOOM = 15.2;
/**
 * Largeur de référence (m) qui remplit la carte au zoom médian. Calée pour que
 * la boucle République (~800 m d'envergure) cadre bien en légère perspective.
 */
const TRACE_CAMERA_REFERENCE_SPAN_M = 900;
/** Zoom médian associé à TRACE_CAMERA_REFERENCE_SPAN_M. */
const TRACE_CAMERA_REFERENCE_ZOOM = 14.4;

/** Barycentre lat/lng d'un tracé (centre de la caméra). */
function traceCentroid(points: readonly LatLngPoint[]): LatLngPoint {
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  const n = Math.max(1, points.length);
  return { lat: lat / n, lng: lng / n };
}

/** Envergure du tracé (mètres) = plus grand côté de sa boîte englobante. */
function traceSpanMeters(points: readonly LatLngPoint[]): number {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return TRACE_CAMERA_REFERENCE_SPAN_M;
  const mPerDegLng = REAL_M_PER_DEG_LAT * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanY = (maxLat - minLat) * REAL_M_PER_DEG_LAT;
  const spanX = (maxLng - minLng) * mPerDegLng;
  return Math.max(1, spanX, spanY);
}

/**
 * Caméra 3D qui CADRE un tracé : centre = barycentre, zoom déduit de son
 * envergure (plus le parcours est grand, plus on dézoome). Le pitch/bearing
 * sont portés par RunRoute3D (props RealMap) — ici on ne fixe que le cadrage,
 * comme CARTE_3D_CAMERA de demo3d. Zoom borné pour rester lisible en
 * perspective. `log2` : doubler l'envergure ⇒ −1 niveau de zoom.
 */
export function traceCamera(points: readonly LatLngPoint[]): RealMapCamera {
  const center = traceCentroid(points);
  const span = traceSpanMeters(points);
  const zoom = TRACE_CAMERA_REFERENCE_ZOOM - Math.log2(span / TRACE_CAMERA_REFERENCE_SPAN_M);
  const clamped = Math.min(TRACE_CAMERA_MAX_ZOOM, Math.max(TRACE_CAMERA_MIN_ZOOM, zoom));
  return { lng: center.lng, lat: center.lat, zoom: clamped };
}
