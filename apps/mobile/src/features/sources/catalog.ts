/**
 * GRYD — catalogue du GRYD VERIFY HUB (AMENDEMENT-10 §6, copy trust par
 * source ; remplace la liste AMENDEMENT-08 §10). Chaque source = un niveau de
 * confiance + un chemin de vérification visible : « GRYD Live GPS — Trust
 * élevé · Capture directe », « Strava — Trust moyen · Vérification requise »,
 * montres « Bientôt » (non connectables). Ici : identité/copy UNIQUEMENT —
 * les STATUTS réels (Connecté / Configuration requise / Dev build requis /
 * Bientôt) viennent des adaptateurs (adapters/registry, AMENDEMENT-15 §3).
 * Aucune valeur de jeu ici.
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
  },
  {
    key: 'apple_health',
    name: 'Apple Health',
    icon: 'lien',
    availability: 'connectable',
    trust: 'high',
    path: 'Import + vérif',
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
    // Alternative GRATUITE à Strava (O7 payant) : un fichier .gpx exporté par
    // n'importe quelle montre / app EST la source directe de la trace → trust
    // élevé. Parse local (features/sources/adapters/gpx-parse.ts) → RunPoint[],
    // puis pipeline serveur (ingest_run) seul juge du claim.
    key: 'gpx',
    name: 'Import GPX',
    icon: 'lien',
    availability: 'connectable',
    trust: 'high',
    path: 'Import + vérif',
  },
  {
    // Adaptateur + edge `strava_import` prêts, MAIS l'API Strava est désormais
    // réservée aux abonné(e)s (O7 : clés + abonnement) → on ne l'annonce plus
    // comme connectable immédiatement. Apple Santé / Health Connect prennent la
    // tête (gratuits). Repasser à 'connectable' dès que O7 est levé.
    key: 'strava',
    name: 'Strava',
    icon: 'route',
    availability: 'soon',
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
