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

/** Hébergement UE (données FR, SPEC §7 / RGPD). */
const POSTHOG_HOST = 'https://eu.i.posthog.com';

const client: PostHog | null = posthogKey
  ? new PostHog(posthogKey, { host: POSTHOG_HOST })
  : null;

/** Trace un event §8. No-op si PostHog n'est pas configuré (O3). */
export function track(event: EventName, props?: EventProps): void {
  if (!client) {
    if (__DEV__) {
      console.log(`[analytics:noop] ${event}`, props ?? {});
    }
    return;
  }
  client.capture(event, props);
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
