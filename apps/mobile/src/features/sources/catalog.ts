/**
 * GRYD — catalogue du GRYD VERIFY HUB (AMENDEMENT-10 §6, copy trust par
 * source ; remplace la liste AMENDEMENT-08 §10). Chaque source = un niveau de
 * confiance + un chemin de vérification visible : « GRYD Live GPS — Trust
 * élevé · Capture directe », « Strava — Trust moyen · Vérification requise »,
 * montres « Bientôt » (non connectables). UI réelle, connexions non câblées
 * (TODO(O2) OAuth/HealthKit/Health Connect) : les statuts sont des données de
 * DÉMO locales, aucune valeur de jeu ici.
 */
import type { IconName } from '@klaim/shared';

/** native = toujours active ; connectable = CTA Connecter ; soon = Bientôt. */
export type SourceAvailability = 'native' | 'connectable' | 'soon';

/** Niveau de confiance GRYD Verify (élevé = signal direct, moyen = import). */
export type SourceTrustLevel = 'high' | 'medium';

/** Libellés FR visibles du trust (copy AMENDEMENT-10 §6). */
export const TRUST_LABELS: Record<SourceTrustLevel, string> = {
  high: 'Trust élevé',
  medium: 'Trust moyen',
};

export interface VerifySourceDef {
  key: string;
  name: string;
  /** Icône filaire de la source (gps pour le Live GPS, lien sinon). */
  icon: IconName;
  availability: SourceAvailability;
  /** Absent pour les sources « Bientôt » (aucun trust affiché). */
  trust?: SourceTrustLevel;
  /** Chemin de vérification visible (« Capture directe », « Import + vérif »). */
  path?: string;
  /** Connectée par défaut dans la démo. */
  connected?: boolean;
}

/**
 * Ordre AMENDEMENT-10 §6 : natif d'abord, puis santé OS, puis Strava, puis
 * les montres « Bientôt ». Seules les sources vérifiées capturent — les
 * autres enrichissent les stats.
 */
export const VERIFY_SOURCES: readonly VerifySourceDef[] = [
  {
    key: 'gryd_live',
    name: 'GRYD Live GPS',
    icon: 'gps',
    availability: 'native',
    trust: 'high',
    path: 'Capture directe',
    connected: true,
  },
  {
    key: 'apple_health',
    name: 'Apple Health',
    icon: 'lien',
    availability: 'connectable',
    trust: 'high',
    path: 'Import + vérif',
    connected: true,
  },
  {
    key: 'health_connect',
    name: 'Health Connect',
    icon: 'lien',
    availability: 'connectable',
    trust: 'high',
    path: 'Import + vérif',
  },
  {
    key: 'strava',
    name: 'Strava',
    icon: 'route',
    availability: 'connectable',
    trust: 'medium',
    path: 'Vérification requise',
  },
  { key: 'garmin', name: 'Garmin', icon: 'radar', availability: 'soon' },
  { key: 'whoop', name: 'WHOOP', icon: 'performance', availability: 'soon' },
  { key: 'fitbit', name: 'Fitbit', icon: 'performance', availability: 'soon' },
  { key: 'polar', name: 'Polar', icon: 'radar', availability: 'soon' },
  { key: 'coros', name: 'Coros', icon: 'radar', availability: 'soon' },
  { key: 'suunto', name: 'Suunto', icon: 'radar', availability: 'soon' },
];
