/**
 * GRYD — engine/revanche.ts
 * AMENDEMENT-34 §DELTA-CLASH — REVANCHE (emprunt Clash of Clans → GRYD).
 *
 * SOURCE = le doc « Clash → GRYD » du fondateur : après s'être fait attaquer/
 * voler une zone, on peut « rendre la pareille » pendant un temps limité. Ici,
 * PUREMENT : un instant de déclenchement + une fenêtre → la revanche est-elle
 * ouverte, quand expire-t-elle, combien d'heures reste-t-il.
 *
 * Fonctions PURES : aucune I/O, aucune horloge implicite — l'appelant fournit
 * `now`. AUCUN nombre magique (REVANCHE_WINDOW_HOURS gelée dans game-rules).
 *
 * ANTI PAY-TO-WIN STRICT : la revanche ne donne NI point, NI territoire
 * supplémentaire, NI protection. C'est un MARQUEUR temporel (signal social
 * « prends ta revanche ») qui invite à re-courir la zone ; le gain éventuel
 * reste celui des règles normales de reprise/vol (§3.4). Ce module ne calcule
 * qu'une fenêtre temporelle.
 */
import { REVANCHE_WINDOW_HOURS } from '@klaim/shared/game-rules';

// Conversion d'unités — pas une règle de jeu.
const MS_PER_HOUR = 3_600_000;

/**
 * Instant d'expiration de la fenêtre de revanche (AMENDEMENT-34). PURE.
 * = `triggeredAt` + `windowH` heures. `windowH` défaut REVANCHE_WINDOW_HOURS.
 */
export function revancheExpiry(
  triggeredAt: Date,
  windowH: number = REVANCHE_WINDOW_HOURS,
): Date {
  return new Date(triggeredAt.getTime() + windowH * MS_PER_HOUR);
}

/**
 * La fenêtre de revanche est-elle OUVERTE à `now` (AMENDEMENT-34) ? PURE.
 * Ouverte sur [triggeredAt, triggeredAt + windowH) : dès le déclenchement,
 * fermée pile à l'échéance. Un `now` antérieur au déclenchement (horloge
 * incohérente) → false. `windowH` défaut REVANCHE_WINDOW_HOURS.
 */
export function revancheActive(
  triggeredAt: Date,
  now: Date,
  windowH: number = REVANCHE_WINDOW_HOURS,
): boolean {
  const t = triggeredAt.getTime();
  const n = now.getTime();
  return n >= t && n < revancheExpiry(triggeredAt, windowH).getTime();
}

/**
 * Heures restantes avant l'expiration de la revanche (AMENDEMENT-34). PURE.
 * Borné à 0 (jamais négatif une fois expirée). Valeur fractionnaire (l'appelant
 * arrondit pour l'affichage). `windowH` défaut REVANCHE_WINDOW_HOURS.
 */
export function revancheHoursLeft(
  triggeredAt: Date,
  now: Date,
  windowH: number = REVANCHE_WINDOW_HOURS,
): number {
  const leftMs = revancheExpiry(triggeredAt, windowH).getTime() - now.getTime();
  return leftMs <= 0 ? 0 : leftMs / MS_PER_HOUR;
}
