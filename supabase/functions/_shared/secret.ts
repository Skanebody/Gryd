// GRYD — comparaison de secret à TEMPS CONSTANT.
// ⚠️ Fichier ÉCRIT À LA MAIN — PAS généré par scripts/sync-game-rules.mjs (qui n'écrit que
// game-rules.ts, types.ts, badges.ts, bonuses.ts, engine/*). Ne pas confondre avec les copies
// générées de ce dossier.
//
// Audit sécurité : les gates webhook/cron comparaient le secret avec `!==` (temps NON constant).
// Risque pratique faible (la gigue réseau masque le signal de timing sur un secret), mais
// comparer un secret en temps constant est la bonne pratique — on la câble.
import { timingSafeEqual } from 'node:crypto';

/**
 * `true` si `provided === expected`, en temps ~constant (pas de court-circuit octet par octet).
 * Les longueurs différentes échouent sans révéler le contenu ; la longueur elle-même n'est pas
 * un secret ici (les secrets sont de taille fixe côté config).
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b); // comparaison factice pour lisser le temps, puis échec
    return false;
  }
  return timingSafeEqual(a, b);
}
