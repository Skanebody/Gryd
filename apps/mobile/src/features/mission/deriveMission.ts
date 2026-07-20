/**
 * GRYD — MISSION DYNAMIQUE RÉELLE (repositionnement « mission-first », décision
 * fondateur 21/07/2026 après l'analyse stratégique : « à chaque ouverture, GRYD
 * répond : où dois-je courir maintenant ? »).
 *
 * Fonction PURE, zéro I/O, zéro horloge implicite — testée en Deno. Elle ne
 * consomme QUE des données RÉELLES (mes hex_claims + ma position GPS) : jamais
 * une menace fabriquée, jamais un rival inventé (règle zéro-mensonge). Les
 * missions crew/rival arriveront quand le crew réel sera câblé bout-en-bout —
 * le type est extensible, pas les mensonges.
 *
 * Priorité (une seule mission à la fois — §A « 1 écran = 1 décision ») :
 *   1. `defend_expiring` — une de MES zones decay dans < MISSION_DEFEND_WINDOW_H
 *      → la plus URGENTE d'abord (puis la plus proche à urgence égale) ;
 *   2. `expand`         — j'ai du territoire, rien n'expire → agrandir depuis
 *      la zone la plus proche de moi ;
 *   3. `first_capture`  — aucun territoire → prendre sa première zone ici.
 */
import { cellToLatLng } from 'h3-js';
import { MISSION_DEFEND_WINDOW_H } from '@klaim/shared';

const MS_PER_HOUR = 3_600_000;
/** Rayon terrestre moyen (m) — haversine locale pour éviter une dépendance moteur. */
const EARTH_RADIUS_M = 6_371_000;

export interface MissionPoint {
  lat: number;
  lng: number;
}

/** Une de MES zones réelles, réduite à ce que la mission consomme. */
export interface MissionTerritoryInput {
  /** Cellules H3 res 10 (strings) de la zone. */
  cells: readonly string[];
  /** Échéance de decay réelle (null = protégée / inconnue). */
  decayAt: Date | null;
  /** Aire réelle sommée (m²) — affichage. */
  areaM2: number;
}

export interface DeriveMissionInput {
  now: Date;
  /** Ma position réelle (null = pas encore de fix → missions sans distance). */
  ego: MissionPoint | null;
  /** MES territoires réels (vide = première capture). */
  mine: readonly MissionTerritoryInput[];
}

export type RealMission =
  | { kind: 'first_capture' }
  | {
      kind: 'defend_expiring';
      /** Centre (centroïde des cellules) de la zone à défendre. */
      anchor: MissionPoint;
      /** Heures restantes avant decay (arrondi supérieur, ≥ 1). */
      hoursLeft: number;
      /** Distance à vol d'oiseau depuis ego (null si position inconnue). */
      distanceM: number | null;
      areaM2: number;
    }
  | {
      kind: 'expand';
      /** Centre de MA zone la plus proche (point d'ancrage de l'extension). */
      anchor: MissionPoint;
      distanceM: number | null;
    };

/** Haversine locale (m). PURE. */
export function haversineDistanceM(a: MissionPoint, b: MissionPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Centroïde (moyenne des centres de cellules). PURE. Null si aucune cellule. */
export function territoryCentroid(cells: readonly string[]): MissionPoint | null {
  if (cells.length === 0) return null;
  let lat = 0;
  let lng = 0;
  let n = 0;
  for (const cell of cells) {
    try {
      const [la, ln] = cellToLatLng(cell);
      lat += la;
      lng += ln;
      n++;
    } catch {
      // Cellule invalide : ignorée (défensif — jamais un crash pour une mission).
    }
  }
  return n === 0 ? null : { lat: lat / n, lng: lng / n };
}

/**
 * LA décision de mission. PURE, déterministe, une seule mission.
 * Une zone dont le decay est DÉJÀ échu n'est plus « à défendre » (elle est
 * neutre pour le moteur) : elle est ignorée ici — la reprendre = expand/capture.
 */
export function deriveRealMission(input: DeriveMissionInput): RealMission {
  const { now, ego, mine } = input;
  const nowMs = now.getTime();

  // Candidates « à défendre » : mes zones avec un decay FUTUR dans la fenêtre.
  let defend: Extract<RealMission, { kind: 'defend_expiring' }> | null = null;
  // Candidate « étendre » : ma zone la plus proche (ou la 1re si pas d'ego).
  let expand: Extract<RealMission, { kind: 'expand' }> | null = null;

  for (const t of mine) {
    const anchor = territoryCentroid(t.cells);
    if (anchor === null) continue;
    const distanceM = ego === null ? null : Math.round(haversineDistanceM(ego, anchor));

    const decayMs = t.decayAt?.getTime() ?? null;
    const msLeft = decayMs === null ? null : decayMs - nowMs;
    if (msLeft !== null && msLeft > 0 && msLeft < MISSION_DEFEND_WINDOW_H * MS_PER_HOUR) {
      const hoursLeft = Math.max(1, Math.ceil(msLeft / MS_PER_HOUR));
      const better =
        defend === null ||
        hoursLeft < defend.hoursLeft ||
        (hoursLeft === defend.hoursLeft &&
          distanceM !== null &&
          (defend.distanceM === null || distanceM < defend.distanceM));
      if (better) {
        defend = { kind: 'defend_expiring', anchor, hoursLeft, distanceM, areaM2: t.areaM2 };
      }
    }

    const closer =
      expand === null ||
      (distanceM !== null && (expand.distanceM === null || distanceM < expand.distanceM));
    if (closer) expand = { kind: 'expand', anchor, distanceM };
  }

  if (defend !== null) return defend;
  if (expand !== null) return expand;
  return { kind: 'first_capture' };
}
