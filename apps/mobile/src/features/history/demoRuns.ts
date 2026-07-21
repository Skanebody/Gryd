/**
 * GRYD — GÉOMÉTRIE DE TRACÉ d'une course (AMENDEMENT-25 §2).
 * « L'utilisateur doit retrouver TOUS ses parcours … avec le dessin de son
 * parcours (le tracé réel), en 2D ET en 3D. »
 *
 * ⚠ CE FICHIER EST MAL NOMMÉ — et le renommer demande une ligne dans un fichier
 * hors périmètre. Il ne contient plus AUCUNE donnée fabriquée : seulement le
 * type d'un tracé, le seam de lecture, et le calcul de cadrage caméra. Le nom
 * `demoRuns.ts` doit devenir `runTrace.ts` ; cela suppose de changer l'import de
 * `app/course/[id].tsx` (ligne 33), édité par un autre lot. Voir le rapport
 * AMENDEMENT-47.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 21/07/2026 (AMENDEMENT-47) ──────────────────────
 * `RUN_TRACES` : neuf tracés GPS fabriqués, un par course du catalogue de démo
 * (`history/demo.ts`) — boucle République, quai de Valmy, lac Daumesnil,
 * Vieux-Lille sous la pluie, un import Strava « vélo » refusé… Chacun était une
 * polyligne d'apparence crédible, tirée de vraies rues de Paris et de Lille.
 * C'est précisément ce qui les rendait dangereux : affichés en 2D et en 3D dans
 * le détail d'une course, ils ressemblaient trait pour trait au dessin d'un run
 * que le joueur aurait couru. Les ancres locales qui les composaient
 * (Vincennes, Rivoli aller-retour) sont parties avec eux.
 *
 * Ce qui RESTE est du calcul de rendu, pas de la donnée :
 *   · `RunTrace` — la FORME d'un tracé (polyligne + boucle fermée ou non) ;
 *   · `traceCamera()` — où poser la caméra pour CADRER un tracé quelconque ;
 *   · `runTrace()` — le seam de lecture, aujourd'hui vide (voir plus bas).
 * Aucune règle de jeu ici (comme realAnchors / camera3d) : pur rendu.
 */
import type { RealMapCamera } from '../../ui/game';
import { REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';

export interface RunTrace {
  /** Polyligne lat/lng du parcours (waypoints réels — jamais un vol d'oiseau). */
  points: readonly LatLngPoint[];
  /**
   * `true` = boucle fermée (une aire est enfermée → zone extrudable en 3D) ;
   * `false` = route/aller-retour ouvert (le tracé prime, aucun volume). Miroir
   * de la décision serveur — le client n'attribue jamais rien.
   */
  closed: boolean;
}

/**
 * SEAM du tracé d'une course — TODO(O1) : lire la polyligne de `runs` par id
 * (policy `runs_select_own`, jamais le run d'un autre coureur).
 *
 * Tant que cette lecture n'existe pas, la fonction renvoie `undefined` et les
 * vues appelantes ne dessinent simplement pas de parcours (`RunRouteScene`
 * renvoie `null`). C'est le même parti pris que `findRealRun` dans
 * `app/course/[id].tsx` : une absence honnête plutôt qu'un tracé d'emprunt.
 * Elle reste une FONCTION pour que le rendu 2D/3D demeure typé et compilé — il
 * sera réutilisé tel quel le jour où la requête sera branchée.
 */
export function runTrace(_id: string): RunTrace | undefined {
  return undefined;
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
 * Largeur de référence (m) qui remplit la carte au zoom médian. Calée pour qu'un
 * parcours de quartier (~800 m d'envergure) cadre bien en légère perspective.
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
 * sont portés par RunRoute3D (props RealMap) — ici on ne fixe que le cadrage.
 * Zoom borné pour rester lisible en perspective. `log2` : doubler l'envergure
 * ⇒ −1 niveau de zoom.
 */
export function traceCamera(points: readonly LatLngPoint[]): RealMapCamera {
  const center = traceCentroid(points);
  const span = traceSpanMeters(points);
  const zoom = TRACE_CAMERA_REFERENCE_ZOOM - Math.log2(span / TRACE_CAMERA_REFERENCE_SPAN_M);
  const clamped = Math.min(TRACE_CAMERA_MAX_ZOOM, Math.max(TRACE_CAMERA_MIN_ZOOM, zoom));
  return { lng: center.lng, lat: center.lat, zoom: clamped };
}
