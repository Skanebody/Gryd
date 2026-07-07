/**
 * GRYD — ORIGINE du route planner (web). Position via navigator.geolocation +
 * geocoding France partagé. Le natif utilise origin.ts (expo-location).
 */
import type { LatLngPoint } from '../map/realAnchors';

export * from './geocode';

/** Position actuelle du navigateur (géoloc). `null` si refus / indisponible. */
export async function currentPosition(): Promise<LatLngPoint | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 60_000 },
    );
  });
}
