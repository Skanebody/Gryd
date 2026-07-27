/**
 * GRYD — E13 : LE FIL entre l'écran de recherche et la caméra de la carte.
 *
 * ─── POURQUOI UN STORE, ET PAS UN PARAMÈTRE DE ROUTE ────────────────────────
 * `/map/search` est une route POUSSÉE par-dessus l'onglet Carte : les deux
 * vivent dans des sous-arbres DISJOINTS, et la `ref` MapLibre (`mapRef.flyTo`)
 * est privée à `MapScreen`. C'est exactement la situation qui a déjà produit
 * `mapUiStore.ts` (sheet ↔ barre de nav), et on en reprend la grammaire :
 * `useSyncExternalStore`, instantané STABLE par référence, émission uniquement
 * sur changement réel.
 *
 * Un paramètre d'URL (`?lat=…&lng=…`) aurait fait le même travail EN PIRE : il
 * inscrirait des coordonnées de lieu dans un historique de navigation, alors que
 * §12 demande précisément que chercher un lieu ne publie rien. Le store ne
 * traverse pas l'appareil.
 *
 * ─── CE QUE CE MODULE NE FAIT PAS ───────────────────────────────────────────
 * Il ne décide RIEN. Déplacer la caméra n'attribue aucun territoire, n'ouvre
 * aucune ville, ne change aucun classement : le claim est serveur, toujours
 * (constitution 4). Ce n'est qu'un cadrage.
 *
 * ─── LE TICKET ──────────────────────────────────────────────────────────────
 * Chaque demande porte un numéro croissant. Sans lui, revenir DEUX FOIS sur le
 * même lieu ne re-cadrerait pas (état identique ⇒ pas d'émission), et le second
 * tap paraîtrait mort. Avec lui, la carte vole à chaque demande — et une seule
 * fois par demande, parce que le consommateur mémorise le dernier ticket honoré.
 */
import { useSyncExternalStore } from 'react';
import type { LatLngPoint } from './realAnchors';

export interface PlaceFocusRequest {
  /** Ticket croissant. `0` = aucune demande depuis le lancement. */
  readonly ticket: number;
  readonly point: LatLngPoint;
  /** Niveau de zoom demandé (échelle « ville », cf. `CITY_SCALE_ZOOM`). */
  readonly zoom: number;
}

/** Aucune demande : ticket 0, et un point qui n'est jamais lu (garde du ticket). */
const NO_REQUEST: PlaceFocusRequest = { ticket: 0, point: { lat: 0, lng: 0 }, zoom: 0 };

let current: PlaceFocusRequest = NO_REQUEST;
const listeners = new Set<() => void>();

/**
 * Demande à la carte de se cadrer sur un lieu. Appelé par E13 au moment du
 * choix — jamais pendant la frappe : la carte ne suit pas la saisie, elle
 * répond à une décision.
 */
export function requestPlaceFocus(point: LatLngPoint, zoom: number): void {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
  current = { ticket: current.ticket + 1, point: { ...point }, zoom };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PlaceFocusRequest {
  return current;
}

/**
 * Dernière demande de cadrage. Le consommateur (MapScreen) compare le `ticket`
 * à celui qu'il a déjà honoré : il vole une fois, puis laisse le joueur
 * déplacer la carte sans la lui reprendre (piège caméra MapLibre déjà payé sur
 * ce dépôt — cf. `mapUiStore.ts`, « on publie uniquement au SNAP »).
 */
export function usePlaceFocus(): PlaceFocusRequest {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Remise à zéro — tests uniquement (le store est un singleton de module). */
export function resetPlaceFocusForTest(): void {
  current = NO_REQUEST;
  for (const listener of listeners) listener();
}
