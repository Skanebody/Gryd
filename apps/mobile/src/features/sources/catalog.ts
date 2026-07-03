/**
 * GRYD — catalogue des sources connectées (AMENDEMENT-06 §4, doc v3 §16).
 * Liste EXACTE + états + textes par source repris du doc §16. UI réelle, mais
 * connexions non câblées (TODO(O2) OAuth/HealthKit/Health Connect). Aucune
 * valeur de jeu ici — c'est de la donnée d'affichage. L'ordre suit la priorité
 * §12 (P0 GPS/Apple/Health Connect, puis P1 Strava/Garmin/WHOOP).
 */

/** État d'une source (§16). Pilote le libellé et l'action du bouton. */
export type SourceState =
  | 'active' // GRYD Live GPS — Actif (source native, toujours là)
  | 'connected' // déjà connecté (Apple Health)
  | 'connect' // connectable maintenant (Health Connect, Strava, WHOOP)
  | 'soon'; // pas encore dispo (Garmin — Bientôt)

export interface SourceDef {
  key: string;
  name: string;
  state: SourceState;
  /** Libellé d'état affiché (droite du nom), repris du doc §16. */
  stateLabel: string;
  /** Texte descriptif par source (§16). */
  desc: string;
  /** Peut capturer du territoire (après vérification) — sinon performance seule. */
  canCapture: boolean;
}

export const SOURCES: readonly SourceDef[] = [
  {
    key: 'gryd_live',
    name: 'GRYD Live GPS',
    state: 'active',
    stateLabel: 'Actif',
    desc: 'La source native GRYD. Trace GPS + Motion vérifiées en direct — capture éligible.',
    canCapture: true,
  },
  {
    key: 'apple_health',
    name: 'Apple Health',
    state: 'connected',
    stateLabel: 'Connecté',
    desc: 'Importe tes courses, pas, cadence et données Apple Watch.',
    canCapture: true,
  },
  {
    key: 'health_connect',
    name: 'Health Connect',
    state: 'connect',
    stateLabel: 'Non connecté',
    desc: 'Importe tes activités Android (Health Connect) et les apps compatibles.',
    canCapture: true,
  },
  {
    key: 'strava',
    name: 'Strava',
    state: 'connect',
    stateLabel: 'Connecter',
    desc: 'Importe tes courses Strava. Elles doivent passer GRYD Verify pour capturer.',
    canCapture: true,
  },
  {
    key: 'garmin',
    name: 'Garmin',
    state: 'soon',
    stateLabel: 'Bientôt',
    desc: 'Importe tes activités Garmin. Les courses éligibles peuvent capturer après vérification.',
    canCapture: true,
  },
  {
    key: 'whoop',
    name: 'WHOOP',
    state: 'connect',
    stateLabel: 'Connecter pour Score Forme',
    desc: 'Ajoute récupération, strain et sommeil à ton Score Forme. Ne capture pas de territoire.',
    canCapture: false,
  },
];
