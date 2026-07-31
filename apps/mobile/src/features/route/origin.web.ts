/**
 * GRYD — ORIGINE du route planner (web). Position via navigator.geolocation +
 * geocoding France partagé. Le natif utilise origin.ts (expo-location).
 */
import type { PositionFix } from './geocode';

export * from './geocode';

/**
 * Position actuelle du navigateur (géoloc). `null` si refus / indisponible.
 * Même contrat que le natif : la précision voyage avec le point, et une valeur
 * absente ou aberrante reste `null` (jamais convertie en « précision parfaite »).
 */
export async function currentPosition(): Promise<PositionFix | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const acc = p.coords.accuracy;
        resolve({
          point: { lat: p.coords.latitude, lng: p.coords.longitude },
          accuracyM: typeof acc === 'number' && Number.isFinite(acc) && acc >= 0 ? acc : null,
        });
      },
      () => resolve(null),
      { timeout: 6000, maximumAge: 60_000 },
    );
  });
}
