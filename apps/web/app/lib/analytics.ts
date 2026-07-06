/**
 * GRYD web — capture d'events PostHog (SPEC §8 / O3). Miroir de l'analytics
 * mobile : on ne capture JAMAIS PostHog en direct depuis les composants, on passe
 * par ce module ; les noms d'events viennent de @klaim/shared (events.ts). No-op
 * silencieux tant que PostHog n'est pas chargé (pas de clé O3 / SSR).
 */
import posthog from 'posthog-js';
import type { EventName } from '@klaim/shared';

type EventProps = Record<string, string | number | boolean | null>;

export function trackWeb(event: EventName, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  // __loaded = true seulement après posthog.init (donc jamais sans clé).
  if (!posthog.__loaded) return;
  posthog.capture(event, props);
}
