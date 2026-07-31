/**
 * GRYD — ORIGINE du route planner (natif). Position GPS via expo-location +
 * geocoding France partagé. Le web utilise origin.web.ts (navigator.geolocation).
 */
import * as Location from 'expo-location';
import type { PositionFix } from './geocode';

export * from './geocode';

/**
 * Position actuelle de l'appareil (GPS natif). `null` si refus / indisponible.
 *
 * Rend la PRÉCISION avec le point (28/07/2026) : le planificateur en fait le
 * départ d'une boucle, et un fix à 40 m décale ce départ d'une rue. `accuracy`
 * peut être absent ou négatif selon la plateforme — on ne le convertit alors
 * pas en zéro (« précision parfaite »), on rend `null` (« on ne sait pas »).
 */
export async function currentPosition(): Promise<PositionFix | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    const acc = pos.coords.accuracy;
    return {
      point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      accuracyM: typeof acc === 'number' && Number.isFinite(acc) && acc >= 0 ? acc : null,
    };
  } catch {
    return null;
  }
}
