'use client';

/**
 * GRYD web — init PostHog (SPEC §8 / O3). Hébergement UE (eu.i.posthog.com) pour
 * rester conforme à la politique de confidentialité (données dans l'UE, RGPD FR).
 * Sans clé `NEXT_PUBLIC_POSTHOG_KEY` (dev / O3 non configuré) : no-op silencieux —
 * le site tourne normalement. Pageviews capturés à la main (App Router).
 * Aucun nom d'event custom : les events §8 viennent de @klaim/shared (events.ts).
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let started = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!POSTHOG_KEY || started) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Pageviews gérés manuellement (Next App Router) ; profils seulement pour
      // les visiteurs identifiés (RGPD : pas de profil anonyme persistant inutile).
      capture_pageview: false,
      person_profiles: 'identified_only',
    });
    started = true;
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY || !started || typeof window === 'undefined') return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [pathname]);

  return <>{children}</>;
}
