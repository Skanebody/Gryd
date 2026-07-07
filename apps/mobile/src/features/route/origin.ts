/**
 * GRYD — ORIGINE du route planner (natif). Position GPS via expo-location +
 * geocoding France partagé. Le web utilise origin.web.ts (navigator.geolocation).
 */
import * as Location from 'expo-location';
import type { LatLngPoint } from '../map/realAnchors';

export * from './geocode';

/** Position actuelle de l'appareil (GPS natif). `null` si refus / indisponible. */
export async function currentPosition(): Promise<LatLngPoint | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
