/**
 * GRYD — catalogue du GRYD VERIFY HUB (AMENDEMENT-08 §10, doc §21 ; remplace
 * la liste « settings » AMENDEMENT-06 §4). Les 10 sources doc §21 avec statut,
 * trust level, rôle des données et éligibilité capture vs stats only — le
 * format attendu par `SourceTrustCard`. UI réelle, connexions non câblées
 * (TODO(O2) OAuth/HealthKit/Health Connect) : les statuts sont des données de
 * DÉMO locales, aucune valeur de jeu ici.
 */
import type { IconName } from '@klaim/shared';
import type { SourceStatus, SourceTrust } from '../../ui/game';

export interface VerifySourceDef {
  key: string;
  name: string;
  /** Icône filaire de la source (gps pour le Live GPS, lien sinon). */
  icon: IconName;
  /** Statut de connexion DÉMO (`SourceTrustCard`). */
  status: SourceStatus;
  /** Niveau de confiance GRYD Verify (élevé = montre/GPS natif, moyen = import). */
  trust: SourceTrust;
  /** Rôle des données (« courses, pas, cadence »). */
  role: string;
  /** Éligibilité : capture après vérification, ou stats uniquement. */
  capture: 'verified' | 'statsonly';
  /** CTA (« Connecter » / « Gérer ») — absent pour la source native toujours là. */
  actionLabel?: string;
}

/**
 * Ordre doc §21 : natif d'abord, puis santé OS, puis plateformes, puis montres.
 * Trust élevé = signal GPS/capteur direct ; moyen = import de plateforme ou
 * données bien-être. Seules les sources « verified » peuvent capturer — et
 * uniquement après passage par GRYD Verify.
 */
export const VERIFY_SOURCES: readonly VerifySourceDef[] = [
  {
    key: 'gryd_live',
    name: 'GRYD Live GPS',
    icon: 'gps',
    status: 'connected',
    trust: 'high',
    role: 'trace GPS + Motion en direct',
    capture: 'verified',
    // Source native : toujours active, pas de bouton connecter/déconnecter.
  },
  {
    key: 'apple_health',
    name: 'Apple Health',
    icon: 'lien',
    status: 'connected',
    trust: 'high',
    role: 'courses, pas, cadence',
    capture: 'verified',
    actionLabel: 'Gérer',
  },
  {
    key: 'health_connect',
    name: 'Health Connect',
    icon: 'lien',
    status: 'disconnected',
    trust: 'high',
    role: 'activités Android compatibles',
    capture: 'verified',
    actionLabel: 'Connecter',
  },
  {
    key: 'strava',
    name: 'Strava',
    icon: 'route',
    status: 'disconnected',
    trust: 'medium',
    role: 'courses importées',
    capture: 'verified',
    actionLabel: 'Connecter',
  },
  {
    key: 'garmin',
    name: 'Garmin',
    icon: 'radar',
    status: 'disconnected',
    trust: 'high',
    role: 'courses montre, FC, cadence',
    capture: 'verified',
    actionLabel: 'Connecter',
  },
  {
    key: 'whoop',
    name: 'WHOOP',
    icon: 'performance',
    status: 'disconnected',
    trust: 'medium',
    role: 'récupération, strain, sommeil',
    capture: 'statsonly',
    actionLabel: 'Connecter',
  },
  {
    key: 'fitbit',
    name: 'Fitbit',
    icon: 'performance',
    status: 'disconnected',
    trust: 'medium',
    role: 'pas, sommeil, FC',
    capture: 'statsonly',
    actionLabel: 'Connecter',
  },
  {
    key: 'polar',
    name: 'Polar',
    icon: 'radar',
    status: 'disconnected',
    trust: 'high',
    role: 'courses montre, FC',
    capture: 'verified',
    actionLabel: 'Connecter',
  },
  {
    key: 'coros',
    name: 'Coros',
    icon: 'radar',
    status: 'disconnected',
    trust: 'high',
    role: 'courses montre, allure',
    capture: 'verified',
    actionLabel: 'Connecter',
  },
  {
    key: 'suunto',
    name: 'Suunto',
    icon: 'radar',
    status: 'disconnected',
    trust: 'high',
    role: 'courses montre, altitude',
    capture: 'verified',
    actionLabel: 'Connecter',
  },
];
