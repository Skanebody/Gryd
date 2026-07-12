/**
 * GRYD — masquage privacy des traces partagées (doc « partage social viral »
 * §privacy + AMENDEMENT-07). AVANT tout rendu de partage, la trace du coureur
 * passe ici : on RETIRE les premiers et derniers mètres (départ/arrivée =
 * domicile potentiel). PUR (aucun effet de bord) — la géométrie de la ZONE
 * conquise n'est jamais touchée (territoire public), seule la position du
 * coureur est protégée. Le rayon par défaut s'aligne sur le réglage
 * Confidentialité (maskRadius, défaut 500 → ici l'échelle card utilise la
 * valeur produit SHARE_TRIM_M, assez grande pour être VISIBLE sur la mini-carte).
 */
import type { LatLngPoint } from '../map/realAnchors';

/**
 * Mètres masqués à CHAQUE extrémité de la trace partagée. Valeur produit du
 * doc partage (« jamais les 200 premiers/derniers mètres ») — indépendante du
 * rayon domicile/travail de la page Confidentialité (qui protège la carte live).
 */
export const SHARE_TRIM_M = 200;

const EARTH_R_M = 6371000;

/** Distance haversine en mètres entre deux points. */
export function haversineM(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Retire `trimM` mètres au début ET à la fin de la trace (distance cumulée le
 * long de la polyligne). Résultat OUVERT : le trou est le masquage, on ne le
 * referme jamais. Si la trace est trop courte pour survivre au double trim
 * (< 3 points restants), on retourne le segment médian minimal — jamais la
 * trace brute.
 */
export function applySharePrivacy(
  trace: readonly LatLngPoint[],
  trimM: number = SHARE_TRIM_M,
): readonly LatLngPoint[] {
  // trimM <= 0 = masquage explicitement désactivé (l'appelant ne montre alors
  // pas le badge « masqués ») → on rend le tracé tel quel.
  if (trimM <= 0) return trace;
  // Trop court pour masquer honnêtement : on ne rend RIEN plutôt que la trace
  // brute (départ/arrivée = domicile potentiel). La zone publique reste, elle,
  // rendue par ailleurs — seule la position du coureur disparaît.
  if (trace.length < 3) return [];

  // Distances cumulées depuis le départ.
  const cum: number[] = [0];
  for (let i = 1; i < trace.length; i++) {
    const prev = trace[i - 1];
    const here = trace[i];
    cum.push((cum[i - 1] ?? 0) + (prev && here ? haversineM(prev, here) : 0));
  }
  const total = cum[cum.length - 1] ?? 0;
  // Trace trop courte pour un double trim honnête → on garde le tiers médian.
  if (total <= trimM * 2.5) {
    const from = Math.floor(trace.length / 3);
    const to = Math.max(from + 2, Math.ceil((trace.length * 2) / 3));
    return trace.slice(from, to);
  }

  let startIdx = 0;
  while (startIdx < cum.length && (cum[startIdx] ?? 0) < trimM) startIdx++;
  let endIdx = trace.length - 1;
  while (endIdx > 0 && total - (cum[endIdx] ?? 0) < trimM) endIdx--;

  if (endIdx - startIdx < 2) {
    const mid = Math.floor(trace.length / 2);
    return trace.slice(Math.max(0, mid - 1), Math.min(trace.length, mid + 2));
  }
  return trace.slice(startIdx, endIdx + 1);
}
