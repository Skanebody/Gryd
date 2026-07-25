/**
 * GRYD — CE QUE LE STYLE DE JEU OUVRE, ET CE QU'IL FERME. Dérivation PURE.
 *
 * ─── LE MENSONGE QUE CE MODULE SUPPRIME ─────────────────────────────────────
 * `/settings-motivation` peignait huit pastilles sous le titre « CLASSEMENTS
 * VISIBLES », les niveaux ouverts en blanc et les autres à `opacity: 0.5`. Deux
 * fautes en une :
 *
 *  1. LE TITRE AFFIRMAIT UN ÉTAT. « Classements visibles » se lit « voilà les
 *     classements où tu apparais ». Or `LEADERBOARD_DEFAULT_VISIBILITY` est une
 *     RÈGLE de visibilité par défaut, pas une mesure : GRYD n'ouvre aujourd'hui
 *     aucun classement « région », « France » ou « global ». L'écran promettait
 *     une présence sur des tableaux qui n'existent pas.
 *  2. LA COULEUR PORTAIT LE SENS SEULE. Un `colors.gris` à 50 % d'opacité passe
 *     sous le plancher de lisibilité, et « masqué » n'était écrit nulle part —
 *     un daltonien, ou n'importe qui en plein soleil, lisait huit niveaux
 *     ouverts.
 *
 * Ce module rend la distinction EXPLICITE et TESTABLE : deux listes nommées, que
 * l'écran énonce en toutes lettres. La couleur ne fait plus que redoubler le
 * texte.
 *
 * ─── AUCUN NOMBRE MAGIQUE ───────────────────────────────────────────────────
 * L'ordre canonique vient de `LEADERBOARD_LEVELS` (game-rules) et l'appartenance
 * de `leaderboardVisibility` (./rules.ts, miroir testé de engine/challenge.ts).
 * Rien n'est recopié ici : ce fichier ne fait que PARTITIONNER.
 */
import { LEADERBOARD_LEVELS, type LeaderboardLevel, type PlayStyle } from '@klaim/shared';
import { leaderboardVisibility } from './rules';

/** Les deux moitiés, dans l'ordre canonique de `LEADERBOARD_LEVELS`. */
export interface LeaderboardSplit {
  /** Niveaux que ce style + ce mode discret ouvrent. */
  open: LeaderboardLevel[];
  /** Niveaux qu'ils ferment — dits par le TEXTE, jamais par la seule couleur. */
  hidden: LeaderboardLevel[];
}

/**
 * Partitionne les niveaux de classement selon le style et le mode discret.
 * PURE. Les deux listes réunies redonnent TOUJOURS `LEADERBOARD_LEVELS` dans
 * l'ordre : aucun niveau ne peut disparaître silencieusement d'un écran de
 * réglages, ce qui serait une omission — donc un demi-mensonge.
 */
export function splitLeaderboardLevels(
  playStyle: PlayStyle,
  discreet: boolean,
): LeaderboardSplit {
  const visible = new Set<LeaderboardLevel>(leaderboardVisibility(playStyle, discreet));
  const open: LeaderboardLevel[] = [];
  const hidden: LeaderboardLevel[] = [];
  for (const level of LEADERBOARD_LEVELS) {
    (visible.has(level) ? open : hidden).push(level);
  }
  return { open, hidden };
}
