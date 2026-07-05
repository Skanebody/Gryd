/**
 * GRYD — données démo DÉTERMINISTES de la page Performance (AMENDEMENT-17
 * CHANTIER 3). Une page running + impact GRYD, PAS une copie Strava : le Score
 * Forme et l'Impact GRYD dominent, le reste est du détail secondaire.
 *
 * Rien ici n'est une constante de JEU (celles-ci vivent dans
 * packages/shared/game-rules.ts et sont décidées serveur) : ce sont des
 * VALEURS D'AFFICHAGE figées pour la démo, cohérentes avec le reste de l'app.
 * Le nombre de « zones tenues » est DÉRIVÉ de la même source que le profil et
 * la carte de France (franceKpi) — jamais recodé en dur.
 */
import { franceKpi } from '../territory/franceTerritories';

/** Un point de mini-graph (semaine → valeur). Un seul graph sur la page. */
export interface TrendPoint {
  /** Libellé court d'axe (« S-3 », « S-2 », « S-1 », « Cette sem. »). */
  label: string;
  /** Valeur brute (km) — l'échelle est calculée à l'affichage. */
  km: number;
}

/** Un record personnel : libellé, valeur formatée, sous-texte optionnel. */
export interface PerfRecord {
  key: string;
  /** Ce qui est mesuré (« 5 km », « 10 km », « Plus longue », « Série »). */
  label: string;
  /** Valeur déjà formatée pour l'affichage (« 26:40 », « 12,8 km »). */
  value: string;
  /** Contexte discret (« il y a 2 sem. ») ou vide. */
  meta?: string;
  /** true = record battu récemment → pastille chartreuse discrète. */
  fresh?: boolean;
}

/** Une ligne d'impact GRYD : ce que la course a produit dans le jeu. */
export interface GrydImpactStat {
  key: string;
  /** Icône filaire @klaim/shared (Icon.tsx) — pas d'icône « territoire »
   *  dédiée : « carte » est la plus proche pour les zones tenues. */
  icon:
    | 'carte'
    | 'bouclier'
    | 'route'
    | 'virage'
    | 'crew';
  /** Grand chiffre. */
  value: string;
  /** Vocabulaire varié (zones / frontières / routes…). */
  label: string;
}

export interface PerformanceData {
  // ── Score Forme (héros, /100) ──
  /** Score Forme sur 100 — indicateur running synthétique (affichage). */
  formeScore: number;
  /** Delta vs la semaine dernière (+4). */
  formeDelta: number;
  /** Interprétation humaine, une phrase, jamais culpabilisante (anti-shame). */
  formeReading: string;
  /** Depuis combien de semaines ça progresse (pour la phrase). */
  formeStreakWeeks: number;

  // ── Cette semaine ──
  week: {
    runs: number;
    km: string; // « 18,4 »
    duration: string; // « 1h42 »
    pace: string; // « 5:32 /km »
    /** Objectif hebdo : runs faits / cible → jauge. */
    goalDone: number;
    goalTarget: number;
  };

  // ── Progression (3 signaux max + UN mini-graph) ──
  progression: {
    distancePct: number; // +12
    paceGainSec: number; // 8 (s/km gagnées)
    regularityWeeks: number; // 3
    /** UNE seule courbe : distance hebdo sur 4 semaines. */
    trend: TrendPoint[];
  };

  // ── Records ──
  records: PerfRecord[];

  // ── Impact GRYD (le cœur GRYD, au-dessus du fold) ──
  gryd: {
    stats: GrydImpactStat[];
    /** Ligne crew signature. */
    crewLine: string;
  };

  // ── GRYD Verify (fiabilité) ──
  verify: {
    /** % de courses fiables (capturent). */
    reliablePct: number;
    /** Trois canaux vérifiés, libellés courts. */
    channels: readonly string[];
  };
}

/**
 * Zones tenues DÉRIVÉES de la carte (cohérence profil ↔ territoire ↔ perf).
 * Le reste des chiffres GRYD (défenses, frontières, routes) est figé démo.
 */
const ZONES_HELD = franceKpi().totalZones;

/** Instance unique déterministe — aucune source d'aléa, rendu identique. */
export const PERFORMANCE: PerformanceData = {
  formeScore: 78,
  formeDelta: 4,
  formeReading: 'Bonne forme. Tu progresses depuis 3 semaines.',
  formeStreakWeeks: 3,

  week: {
    runs: 3,
    km: '18,4',
    duration: '1h42',
    pace: '5:32 /km',
    goalDone: 3,
    goalTarget: 4,
  },

  progression: {
    distancePct: 12,
    paceGainSec: 8,
    regularityWeeks: 3,
    trend: [
      { label: 'S-3', km: 12.1 },
      { label: 'S-2', km: 14.6 },
      { label: 'S-1', km: 16.4 },
      { label: 'Cette sem.', km: 18.4 },
    ],
  },

  records: [
    { key: '5k', label: '5 km', value: '26:40', meta: 'il y a 2 sem.', fresh: true },
    { key: '10k', label: '10 km', value: '58:12', meta: 'il y a 5 sem.' },
    { key: 'long', label: 'Plus longue', value: '12,8 km', meta: 'République' },
    { key: 'serie', label: 'Série', value: '4 sem.', meta: 'en cours', fresh: true },
  ],

  gryd: {
    stats: [
      { key: 'held', icon: 'carte', value: String(ZONES_HELD), label: 'zones tenues' },
      { key: 'defended', icon: 'bouclier', value: '12', label: 'défendues' },
      { key: 'boundaries', icon: 'virage', value: '4', label: 'frontières fermées' },
      { key: 'routes', icon: 'route', value: '6', label: 'routes ouvertes' },
    ],
    crewLine: '+420 pts crew cette semaine',
  },

  verify: {
    reliablePct: 92,
    channels: ['GPS', 'Mouvement', 'Sources'],
  },
};
