/**
 * GRYD — parseur GPX PUR (nouvelle source « Import GPX », alternative gratuite à
 * Strava dont l'API est désormais payante, O7). Un fichier .gpx (Garmin, Coros,
 * Suunto, apps de course…) EST la source directe de la trace : on le parse
 * localement en RunPoint[] (le même contrat que le tracker GPS et l'import
 * HealthKit), puis le pipeline serveur existant (ingest_run) reste SEUL juge du
 * claim (§3.2). Fonction PURE, sans I/O ni dépendance lourde (pas de DOMParser :
 * indisponible côté Deno/tests et lourd côté RN) — extraction par regex sur les
 * <trkpt lat lon>…<time>…</time>. Testable directement (gpx-parse.test.ts).
 *
 * Contrat RunPoint (@klaim/shared) : { lat, lng, t (epoch ms), acc? }. Le GPX ne
 * porte PAS d'accuracy horizontale → acc laissé absent (traité « bon » côté
 * serveur, comme HealthKit). L'altitude <ele> n'est pas un RunPoint (le moteur
 * territorial est 2D) : on l'ignore proprement.
 */
import type { RunPoint } from '@klaim/shared';

/** Résultat de parse : points normalisés + compteurs honnêtes pour l'UI. */
export interface GpxParseResult {
  points: RunPoint[];
  /** Nombre de <trkpt> vus dans le fichier (avant filtrage validité). */
  trackpointCount: number;
  /** Nombre de points rejetés (lat/lon hors bornes, non finis, ou sans <time>). */
  skipped: number;
}

/** Une seule regex <trkpt …> capturant le bloc jusqu'à </trkpt> (ou auto-fermé). */
const TRKPT_RE = /<trkpt\b([^>]*?)\/>|<trkpt\b([^>]*?)>([\s\S]*?)<\/trkpt>/gi;
/** Attribut lat="…" (simple ou double quote), insensible à la casse. */
const LAT_RE = /\blat\s*=\s*["']([^"']+)["']/i;
const LON_RE = /\blon\s*=\s*["']([^"']+)["']/i;
/** <time>…</time> à l'intérieur d'un <trkpt> (ISO 8601 UTC de l'appareil). */
const TIME_RE = /<time>\s*([^<\s][^<]*?)\s*<\/time>/i;

/** Latitude valide (WGS84). */
function isLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}
/** Longitude valide (WGS84). */
function isLon(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

/**
 * Parse un document GPX (chaîne XML) en RunPoint[]. PUR : aucune I/O, aucune
 * exception vers l'appelant (une entrée illisible → résultat vide honnête). Les
 * points sont retournés dans l'ordre du fichier (l'ordre du parcours) ; un
 * <trkpt> sans <time> exploitable est compté dans `skipped` (le pipeline a
 * besoin d'un t pour l'allure — anti-vélo §3.2).
 */
export function parseGpx(xml: string): GpxParseResult {
  const points: RunPoint[] = [];
  let trackpointCount = 0;
  let skipped = 0;

  if (typeof xml !== 'string' || xml.length === 0) {
    return { points, trackpointCount, skipped };
  }

  TRKPT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRKPT_RE.exec(xml)) !== null) {
    trackpointCount += 1;
    // Groupe 1 = attributs d'un <trkpt … />, groupe 2 = attributs de l'ouvrant,
    // groupe 3 = contenu (où vit <time>). Un seul des deux blocs est défini.
    const attrs = m[1] ?? m[2] ?? '';
    const inner = m[3] ?? '';

    const latMatch = LAT_RE.exec(attrs);
    const lonMatch = LON_RE.exec(attrs);
    const latRaw = latMatch?.[1];
    const lonRaw = lonMatch?.[1];
    if (latRaw === undefined || lonRaw === undefined) {
      skipped += 1;
      continue;
    }
    const lat = Number(latRaw);
    const lng = Number(lonRaw);
    if (!isLat(lat) || !isLon(lng)) {
      skipped += 1;
      continue;
    }

    const timeRaw = TIME_RE.exec(inner)?.[1];
    const t = timeRaw !== undefined ? Date.parse(timeRaw) : NaN;
    if (!Number.isFinite(t)) {
      // Pas d'horodatage exploitable : inutilisable pour l'allure (§3.2) — on
      // compte honnêtement plutôt que d'inventer un timestamp.
      skipped += 1;
      continue;
    }

    points.push({ lat, lng, t });
  }

  return { points, trackpointCount, skipped };
}
