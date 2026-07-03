/**
 * GRYD — accès UI mobile aux règles motivation (AMENDEMENT-07 §7/§9.2, motivation
 * §10). Même parti pris que features/crew/rules.ts : on importe les constantes
 * RÉELLES depuis la racine @klaim/shared (le tsconfig Expo ne résout pas les
 * subpath exports ; @klaim/engine tirerait h3-js dans le bundle) et on
 * ré-implémente ICI le MÊME lookup PUR que packages/engine/src/challenge.ts.
 *
 * ⚠ Miroir logique de engine/challenge.ts (leaderboardVisibility). Toute
 * évolution du barème se fait dans game-rules ; ceci reste une lecture de table.
 * AUCUN nombre magique.
 */
import {
  LEADERBOARD_DEFAULT_VISIBILITY,
  type LeaderboardLevel,
  type PlayStyle,
} from '@klaim/shared';

/**
 * Niveaux de classement VISIBLES par défaut pour un joueur (§10.2) selon son
 * play_style, amputés du `global` en mode discret (§10.3 : jamais en leaderboard
 * global). PURE. Renvoie une NOUVELLE liste, jamais l'array de constante.
 * Miroir de engine/challenge.ts#leaderboardVisibility.
 */
export function leaderboardVisibility(
  playStyle: PlayStyle,
  discreet: boolean,
): LeaderboardLevel[] {
  const levels = [...(LEADERBOARD_DEFAULT_VISIBILITY[playStyle] ?? [])];
  if (!discreet) return levels;
  return levels.filter((l) => l !== 'global');
}

/** Un niveau de classement est-il visible par défaut pour ce profil ? PURE. */
export function isLeaderboardVisible(
  level: LeaderboardLevel,
  playStyle: PlayStyle,
  discreet: boolean,
): boolean {
  return leaderboardVisibility(playStyle, discreet).includes(level);
}
