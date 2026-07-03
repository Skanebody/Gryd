/**
 * Constantes d'AFFICHAGE de la landing — pas des règles de jeu §3
 * (celles-ci vivent dans @klaim/shared/game-rules). Précédent : lib/waitlist.ts.
 */

/** Superficie de la France métropolitaine (km², IGN) — AMENDEMENT-02 §2 : France entière capturable. */
export const FRANCE_CAPTURABLE_KM2 = 551_695;

/**
 * Valeurs de démonstration des visuels marketing (mockup téléphone, reward,
 * performance). Ce sont des CHIFFRES DE SHOWCASE, pas des constantes de jeu.
 */
export const DEMO = {
  zoneControlPct: 62,
  hexesGained: 214,
  hexesStolen: 38,
  hexesDefended: 57,
  simHexGainMin: 160,
  simHexGainMax: 320,
  simZonePctMin: 40,
  simZonePctMax: 80,
  levelPct: 62,
  passPct: 38,
  formScore: 82,
  weekKm: 24.8,
  weekRuns: 4,
  weekPace: '5:42',
  weekDeltaPct: 7,
} as const;
