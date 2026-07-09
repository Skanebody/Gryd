/**
 * GRYD — décodeur polyline Google (encoded) → coordonnées WGS84.
 * Utilisé par onboarding_import (Strava summary_polyline). PUR, sans I/O.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Décode une polyline encodée (précision 1e5, format Google/Strava). */
export function decodeGooglePolyline(encoded: string): LatLng[] {
  if (typeof encoded !== 'string' || encoded.length === 0) return [];

  const out: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return out;
}

/** Répartit les timestamps le long d'une trace (durée totale connue). */
export function latLngsToRunPoints(
  coords: readonly LatLng[],
  startedAt: Date,
  durationS: number,
): { lat: number; lng: number; t: number }[] {
  if (coords.length === 0) return [];
  const startMs = startedAt.getTime();
  if (coords.length === 1) {
    return [{ lat: coords[0]!.lat, lng: coords[0]!.lng, t: startMs }];
  }
  const spanMs = Math.max(durationS, 1) * 1000;
  const step = spanMs / (coords.length - 1);
  return coords.map((c, i) => ({
    lat: c.lat,
    lng: c.lng,
    t: Math.round(startMs + i * step),
  }));
}
