/**
 * GRYD — ÉCHÉANCE D'UNE FRONTIÈRE OUVERTE (planche E09, variante sans capture).
 *
 * La planche veut une raison FACTUELLE sous le hero d'effort : « Il manquait
 * 84 m… la boucle reste disponible. » Les mètres viennent tels quels du serveur
 * (`openBoundary.missingM`) ; l'échéance, elle, arrive en ISO 8601
 * (`openBoundary.expiresAt`) et doit devenir des heures lisibles.
 *
 * Ce que ce module refuse de faire, et pourquoi :
 *   · afficher une échéance PASSÉE comme si elle courait encore (une frontière
 *     expirée pendant que l'écran était ouvert dirait « encore 0 h ») ;
 *   · afficher une échéance ABSURDE issue d'un skew d'horloge ou d'un ISO
 *     illisible — dans ces cas il renvoie `null`, et l'écran se tait ;
 *   · ARRONDIR VERS LE HAUT. « Encore 2 h » quand il reste 1 h 10 est une
 *     promesse que le serveur ne tient pas : on tronque, toujours vers le bas.
 *
 * Le remplaçant honnête de `boundaryExpiryLabel()` (intention.ts), qui formatait
 * « Expire dans {n} h » en FRANÇAIS EN DUR à partir d'un TTL de démo.
 *
 * PUR : zéro import (Deno-testable). L'instant courant est INJECTÉ — une horloge
 * lue en interne rendrait la fonction intestable.
 */

/** Au-delà, on ne parle plus en heures : ce serait un TTL aberrant (skew). */
const MAX_PLAUSIBLE_HOURS = 24 * 14;

export type BoundaryClock =
  /** Il reste `hours` heures PLEINES (≥ 1) avant expiration. */
  | { readonly kind: 'hours'; readonly hours: number }
  /** Moins d'une heure : on ne chiffre pas, on dit « bientôt ». */
  | { readonly kind: 'soon' }
  /** Expirée, illisible, ou aberrante : l'écran n'affiche RIEN. */
  | null;

/**
 * Heures restantes avant `expiresAt`, à l'instant `nowMs`.
 * `expiresAt` = ISO 8601 renvoyé par ingest_run ; toute valeur non parsable
 * donne `null` (jamais un « NaN h » à l'écran).
 */
export function boundaryClock(
  expiresAt: string | undefined,
  nowMs: number,
): BoundaryClock {
  if (!expiresAt) return null;
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end) || !Number.isFinite(nowMs)) return null;
  const leftMs = end - nowMs;
  // Déjà expirée (ou pile à l'instant) : plus rien à proposer de refermer.
  if (leftMs <= 0) return null;
  const hours = Math.floor(leftMs / 3_600_000);
  if (hours > MAX_PLAUSIBLE_HOURS) return null;
  if (hours < 1) return { kind: 'soon' };
  return { kind: 'hours', hours };
}
