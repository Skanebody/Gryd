/**
 * GRYD — variante WEB de l'adaptateur Strava (aperçu navigateur fondateur).
 * Metro résout `.web.ts` avant `.ts` sur la cible web : la version native
 * (strava.ts) importe lib/supabase + expo-auth-session, volontairement tenus
 * HORS du bundle web (même pattern que auth.web.ts / session.web.tsx — le
 * preview web garde la simulation, AMENDEMENT-15 §0). Ici : états HONNÊTES
 * sans aucune connexion réelle — la vraie liaison Strava se fait dans l'app
 * sur téléphone. Même API exportée que strava.ts.
 */
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

/** O7 absent : clés Strava à créer par le fondateur (strava.com/settings/api). */
const NEEDS_KEYS: SourceAdapterSnapshot = {
  status: 'needs_keys',
  lastSync: null,
  detail: 'Clés Strava à configurer (O7)',
};

/** Clés posées mais aperçu web : la connexion réelle passe par le téléphone. */
const WEB_PREVIEW: SourceAdapterSnapshot = {
  status: 'disconnected',
  lastSync: null,
  detail: 'Connexion depuis l’app sur téléphone',
};

function snapshot(): SourceAdapterSnapshot {
  return process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ? WEB_PREVIEW : NEEDS_KEYS;
}

export const stravaAdapter: SourceAdapter = {
  id: 'strava',
  trustLevel: 'medium', // import → vérification requise (catalog AMENDEMENT-10 §6)
  status: () => Promise.resolve(snapshot()),
  // Aperçu web : pas d'OAuth ici — on reste déconnecté, proprement (GO-first).
  connect: () => Promise.resolve(snapshot()),
  disconnect: () => Promise.resolve(snapshot()),
};
