/**
 * GRYD — wrapper PostHog (SPEC §8).
 * Chaque écran logge ses events via ce module, JAMAIS PostHog en direct :
 * les noms d'events viennent de @klaim/shared (noms exacts §8, ne pas renommer).
 * Sans clé (point ouvert O3), track() est un no-op silencieux (log en dev).
 */
import PostHog from 'posthog-react-native';
import { EVENTS, type EventName } from '@klaim/shared';

export type EventProps = Record<string, string | number | boolean | null>;

const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

/**
 * Hébergement : UE par défaut (données FR, SPEC §7 / RGPD). Configurable via
 * EXPO_PUBLIC_POSTHOG_HOST — DOIT correspondre à la région du projet PostHog
 * (eu.i.posthog.com pour un projet UE, us.i.posthog.com pour un projet US ; une
 * clé projet US envoyée à l'host UE échoue). Un host US implique un transfert
 * hors UE à divulguer dans la politique de confidentialité.
 */
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

/**
 * DÉFENSIF : `new PostHog(...)` s'exécute à l'import (donc avant tout rendu, hors
 * ErrorBoundary) et touche du natif (stockage, réseau). L'analytique ne doit
 * JAMAIS pouvoir empêcher l'app de démarrer — on dégrade en no-op silencieux.
 */
function makePostHog(): PostHog | null {
  if (!posthogKey) return null;
  try {
    return new PostHog(posthogKey, { host: POSTHOG_HOST });
  } catch (e) {
    console.warn('[GRYD] PostHog indisponible', e);
    return null;
  }
}

const client: PostHog | null = posthogKey
  ? makePostHog()
  : null;

/**
 * P0 C6 (MVP_CHANGESET) — chaque event porte un `event_id` unique (déduplication
 * côté entrepôt : les retries réseau de PostHog peuvent doubler un capture) et un
 * `event_ts` ISO 8601 UTC (l'horodatage d'ÉMISSION, indépendant de l'heure
 * d'ingestion). Posés ici, dans LE wrapper — aucun call-site à modifier.
 */
function commonProps(): EventProps {
  return {
    event_id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    event_ts: new Date().toISOString(),
  };
}

/** Trace un event §8. No-op si PostHog n'est pas configuré (O3). */
export function track(event: EventName, props?: EventProps): void {
  if (!client) {
    if (__DEV__) {
      console.log(`[analytics:noop] ${event}`, props ?? {});
    }
    return;
  }
  client.capture(event, { ...commonProps(), ...props });
}

/**
 * Screen view PostHog standard (`$screen`) — pour les onglets/écrans qui n'ont
 * pas d'event §8 dédié. N'invente JAMAIS de nom d'event custom hors events.ts.
 */
export function screen(name: string, props?: EventProps): void {
  if (!client) {
    if (__DEV__) {
      console.log(`[analytics:noop] $screen ${name}`, props ?? {});
    }
    return;
  }
  client.screen(name, props);
}

/** Associe l'utilisateur connecté aux events (appelé après signup/login). */
export function identify(userId: string, props?: EventProps): void {
  client?.identify(userId, props);
}

/** Détache l'utilisateur (déconnexion). */
export function resetAnalytics(): void {
  client?.reset();
}

export { EVENTS };
export type { EventName };
