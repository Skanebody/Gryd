/**
 * GRYD — Bonus aléatoires CIBLÉS : DATA des 6 bonus MVP (AMENDEMENT-19 §2/§6).
 * SOURCE DE VÉRITÉ des FICHES de bonus. « GRYD ne te donne pas des bonus au
 * hasard. Il révèle les bons moments pour agir. »
 *
 * Config-driven : chaque bonus est une fiche DATA (id/name/type/rarity/
 * targetScope/trigger/eligibility/durationH/reward/cap/cooldownH/visibility/
 * cta/copy/antiAbuse). Le moteur pur packages/engine/src/bonus.ts lit ces
 * fiches — AUCUNE règle en dur côté moteur. Tous les nombres (caps, cooldowns,
 * pourcentages, durées, fenêtres) viennent de game-rules.ts — AUCUN nombre
 * magique ici (D12/CLAUDE.md).
 *
 * RÈGLE D'OR (doc §1) : un bonus ne change JAMAIS territoire/points/classement.
 * Reward = coffre crew / XP / progrès badge / durée de protection / cosmétique.
 * Impact capé à +35 % (BONUS_MAX_TOTAL_PCT), UN seul multiplicateur actif.
 *
 * La copie supabase/functions/_shared/… n'inclut PAS ce fichier (les Edge
 * Functions importent bonuses.ts via l'engine généré) — voir sync-game-rules.
 */
import {
  BONUS_BADGE_PROGRESS,
  BONUS_CAPS,
  BONUS_COOLDOWN_H,
  BONUS_DURATION_H,
  BONUS_PROTECTION_H,
  BONUS_REWARD_PCT,
} from './game-rules.ts';
import type { BonusDefinition, BonusId } from './types.ts';

/**
 * 1. BONUS FINISHER (social) — « TERMINER » — À LIVRER EN PREMIER (doc §6.1/§9).
 * Se branche sur les frontières partielles crew (AMENDEMENT-17) : une frontière
 * `open` dont le segment manquant est court + expire bientôt est un « bon
 * moment pour agir ». Fermer la boucle → +25 % coffre + XP crew + progrès badge
 * Finisher. Reward COFFRE/XP/badge — jamais de territoire supplémentaire (la
 * zone vient de la fermeture elle-même, décidée serveur).
 */
const FINISHER: BonusDefinition = {
  id: 'finisher',
  name: 'Bonus Finisher',
  type: 'social',
  rarity: 'rare',
  targetScope: 'crew',
  trigger: ['crew_boundary_open_near'],
  eligibility: ['run_verified', 'same_crew', 'under_player_week_cap', 'under_crew_day_cap', 'zone_cooldown_elapsed'],
  durationH: BONUS_DURATION_H.finisher,
  reward: { chestPct: BONUS_REWARD_PCT.finisher_chest, badgeProgress: BONUS_BADGE_PROGRESS },
  cap: {
    perPlayerPerWeek: BONUS_CAPS.finisher.perPlayerPerWeek,
    perCrewPerDay: BONUS_CAPS.finisher.perCrewPerDay,
  },
  cooldownH: BONUS_COOLDOWN_H.finisher,
  visibility: ['map', 'war_room', 'crew_chat'],
  cta: 'TERMINER',
  copy: {
    title: 'Frontière à fermer',
    body: 'Ton crew a ouvert une frontière tout près. Cours le segment manquant, ferme la zone.',
    button: 'TERMINER',
  },
  antiAbuse: [
    'Run GRYD Verified requis (Motion Trust) — pas de véhicule ni de GPS douteux.',
    'Segment manquant court uniquement (frontière vraiment proche à fermer).',
    'Cap 3/semaine/joueur et 5/jour/crew ; cooldown 24 h sur la même frontière.',
    'Zéro pay-to-win : la zone vient de la course, jamais d’un achat.',
  ],
};

/**
 * 2. DÉFENSE CRITIQUE (défense) — « DÉFENDRE » (doc §6.2). Une zone crew dont le
 * decay tombe dans < 12 h est en danger imminent → +25 % coffre + durée de
 * protection (prolonge le bouclier) + progrès badge Defender. Jamais de gain de
 * territoire : on protège l'existant.
 */
const DEFENSE_CRITICAL: BonusDefinition = {
  id: 'defense_critical',
  name: 'Défense Critique',
  type: 'defense',
  rarity: 'rare',
  targetScope: 'crew',
  trigger: ['crew_zone_decay_soon'],
  eligibility: ['run_verified', 'same_crew', 'under_crew_day_cap', 'zone_cooldown_elapsed'],
  durationH: BONUS_DURATION_H.defense_critical,
  reward: {
    chestPct: BONUS_REWARD_PCT.defense_chest,
    protectionH: BONUS_PROTECTION_H,
    badgeProgress: BONUS_BADGE_PROGRESS,
  },
  cap: { perCrewPerDay: BONUS_CAPS.defense_critical.perCrewPerDay },
  cooldownH: BONUS_COOLDOWN_H.defense_critical,
  visibility: ['map', 'war_room', 'crew_chat'],
  cta: 'DÉFENDRE',
  copy: {
    title: 'Zone en danger',
    body: 'Une zone de ton crew s’efface bientôt. Une sortie la protège.',
    button: 'DÉFENDRE',
  },
  antiAbuse: [
    'Run GRYD Verified requis (Motion Trust).',
    'Un seul déclenchement par jour et par crew ; cooldown 24 h sur la même zone.',
    'Prolonge une protection, ne prend jamais de territoire.',
  ],
};

/**
 * 3. COFFRE CREW (crew) — « VOIR MISSIONS » (doc §6.3). Le coffre hebdo dans sa
 * dernière ligne droite (80-95 %) → +20 % de progression coffre sur les runs
 * vérifiés pendant 6 h. Pousse l'effort collectif au bon moment, sans jamais
 * toucher le classement.
 */
const CREW_CHEST: BonusDefinition = {
  id: 'crew_chest',
  name: 'Coffre Crew',
  type: 'crew',
  rarity: 'epic',
  targetScope: 'crew',
  trigger: ['crew_chest_almost_full'],
  eligibility: ['run_verified', 'same_crew', 'under_crew_day_cap'],
  durationH: BONUS_DURATION_H.crew_chest,
  reward: { chestPct: BONUS_REWARD_PCT.crew_chest },
  cap: { perCrewPerWeek: BONUS_CAPS.crew_chest.perCrewPerWeek },
  cooldownH: BONUS_COOLDOWN_H.crew_chest,
  visibility: ['war_room', 'crew_chat'],
  cta: 'VOIR MISSIONS',
  copy: {
    title: 'Coffre presque plein',
    body: 'Votre coffre crew touche au but. Chaque sortie vérifiée compte double ces prochaines heures.',
    button: 'VOIR MISSIONS',
  },
  antiAbuse: [
    'Run GRYD Verified requis (Motion Trust).',
    'Une seule fenêtre par semaine et par crew.',
    'Progression de coffre uniquement — jamais de points de classement.',
  ],
};

/**
 * 4. RETOUR (streak, ANTI-SHAME) — « 2 km suffisent » (doc §6.4). Joueur absent
 * 5-10 j → un retour DOUX : fragment Streak Gel + template share + XP, 24 h.
 * Le CTA et la copy NE MENACENT JAMAIS la série (« jamais tu vas perdre ta
 * série ») — ils invitent. Reward XP/cosmétique, jamais de territoire.
 */
const RETURN: BonusDefinition = {
  id: 'return',
  name: 'Bonus Retour',
  type: 'streak',
  rarity: 'common',
  targetScope: 'player',
  trigger: ['player_absent'],
  eligibility: ['run_verified'],
  durationH: BONUS_DURATION_H.return,
  reward: {
    xpPct: BONUS_REWARD_PCT.return_xp,
    cosmetic: 'streak_gel_fragment',
    badgeProgress: BONUS_BADGE_PROGRESS,
  },
  cap: { perPlayerPerDays: BONUS_CAPS.return.perPlayerPerDays },
  cooldownH: BONUS_COOLDOWN_H.return,
  visibility: ['map', 'post_run'],
  cta: '2 km suffisent',
  copy: {
    title: 'Content de te revoir',
    body: 'Une sortie courte suffit pour reprendre le fil. 2 km, tranquille.',
    button: '2 km suffisent',
  },
  antiAbuse: [
    'Run GRYD Verified requis (Motion Trust).',
    'Au plus une fois toutes les deux semaines par joueur.',
    'Anti-shame : jamais de menace sur la série, jamais de culpabilisation.',
  ],
};

/**
 * 5. EXPLORATION (exploration) — « OUVRIR ROUTE » (doc §6.5). Secteur vierge/peu
 * couru à proximité → XP + progrès badge Pioneer + route ouverte, 48 h. Pousse
 * la découverte du bon endroit, sans jamais donner de zone gratuite.
 */
const EXPLORATION: BonusDefinition = {
  id: 'exploration',
  name: 'Bonus Exploration',
  type: 'exploration',
  rarity: 'common',
  targetScope: 'player',
  trigger: ['sector_unexplored_near'],
  eligibility: ['run_verified', 'under_player_week_cap', 'zone_cooldown_elapsed'],
  durationH: BONUS_DURATION_H.exploration,
  reward: { xpPct: BONUS_REWARD_PCT.exploration_xp, badgeProgress: BONUS_BADGE_PROGRESS },
  cap: { perPlayerPerWeek: BONUS_CAPS.exploration.perPlayerPerWeek },
  cooldownH: BONUS_COOLDOWN_H.exploration,
  visibility: ['map', 'post_run'],
  cta: 'OUVRIR ROUTE',
  copy: {
    title: 'Secteur à découvrir',
    body: 'Un coin encore vierge t’attend tout près. Ouvre une nouvelle route.',
    button: 'OUVRIR ROUTE',
  },
  antiAbuse: [
    'Run GRYD Verified requis (Motion Trust).',
    'Cap 2/semaine/joueur ; cooldown 24 h sur le même secteur.',
    'XP et progrès de badge — jamais de territoire offert.',
  ],
};

/**
 * 6. BOUCLE PROPRE (conquête) — « VOIR » (doc §6.6). Une boucle bien fermée
 * (compacité OK, GPS trust élevé) → progrès badge + XP + animation post-run.
 * Récompense la qualité d'exécution, pas un gain de jeu supplémentaire.
 */
const CLEAN_LOOP: BonusDefinition = {
  id: 'clean_loop',
  name: 'Boucle Propre',
  type: 'conquete',
  rarity: 'common',
  targetScope: 'player',
  trigger: ['clean_loop_closed'],
  eligibility: ['run_verified'],
  durationH: BONUS_DURATION_H.clean_loop,
  reward: { xpPct: BONUS_REWARD_PCT.clean_loop_xp, badgeProgress: BONUS_BADGE_PROGRESS },
  cap: {},
  cooldownH: BONUS_COOLDOWN_H.clean_loop,
  visibility: ['post_run'],
  cta: 'VOIR',
  copy: {
    title: 'Boucle nickel',
    body: 'Trace propre, boucle bien fermée. Du beau travail.',
    button: 'VOIR',
  },
  antiAbuse: [
    'Run GRYD Verified requis (Motion Trust) + compacité de boucle valide.',
    'Récompense la qualité d’exécution, jamais un avantage de jeu.',
  ],
};

/** Les 6 bonus MVP, indexés par id (source unique pour le moteur et la DB). */
export const BONUS_DEFINITIONS: Readonly<Record<BonusId, BonusDefinition>> = {
  finisher: FINISHER,
  defense_critical: DEFENSE_CRITICAL,
  crew_chest: CREW_CHEST,
  return: RETURN,
  exploration: EXPLORATION,
  clean_loop: CLEAN_LOOP,
};

/** Liste ordonnée des 6 bonus MVP (ordre de la fiche §6). */
export const BONUS_LIST: readonly BonusDefinition[] = [
  FINISHER,
  DEFENSE_CRITICAL,
  CREW_CHEST,
  RETURN,
  EXPLORATION,
  CLEAN_LOOP,
];

/** Fiche d'un bonus par id (helper typé). */
export function bonusById(id: BonusId): BonusDefinition {
  return BONUS_DEFINITIONS[id];
}
