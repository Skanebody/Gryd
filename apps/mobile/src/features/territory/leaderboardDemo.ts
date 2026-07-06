/**
 * GRYD — données démo du CLASSEMENT PAR ZONE (AMENDEMENT-31 §3, [P1]).
 * L'emprunt Strava tenu ici = le segment + KOM/QOM : chaque zone/secteur a SON
 * classement. Mais GRYD ne chronomètre pas un tronçon — la conquête EST la
 * compétition. Donc deux classements par zone :
 *   • TOP CONQUÉRANTS  — qui a pris le plus de rues cette saison ici,
 *   • TOP DÉFENSEURS   — qui a le mieux tenu la zone (défenses réussies).
 *
 * Coordonné avec le moteur `sectors` : les zones portent les NOMS des secteurs
 * démo Paris (sectorsDemo.PARIS_DEMO_SECTORS — Voltaire/Récollets/Villemin/
 * Canal/Louis-Blanc) et chaque coureur a un `role` RELATIF à l'ego démo (KORO,
 * crew République = DEMO_MY_CREW_ID) : `mine` (moi/mon crew, chartreuse), `ally`,
 * `rival`, `neutral`. Le rendu applique `roleColor(role)` — jamais la couleur
 * seule (daltonisme) : le rang + le nom + l'unité portent l'info.
 *
 * ANTI-SHAME (§A, doc stratégie) : QUE du positif. Valeurs = conquêtes/défenses
 * RÉUSSIES (jamais « perdu », jamais de compteur négatif). Le hook « raison de
 * revenir » est une invitation (« reprends la couronne »), pas une humiliation.
 * ANTI PAY-TO-WIN : aucun rang ne s'achète — ces classements ne dépendent que
 * de la course. Déterministe, pur ancrage démo Saison 0 ; remplacé par des vues
 * serveur agrégées (hex_claims / defenses par secteur) au Milestone 2.
 *
 * AUCUNE règle de jeu / constante ici (game-rules.ts reste la source) — ce sont
 * des DONNÉES d'affichage, pas des seuils.
 */
import type { SectorRole } from '../map/sectorsDemo';

/** Une ligne de classement : un coureur, sa valeur, son rôle (→ roleColor). */
export interface LeaderboardEntry {
  /** Rang dans ce classement (1 = tête). */
  rank: number;
  /** Pseudo COURT — jamais tronqué (§A9). */
  runner: string;
  /** Crew court (contexte, jamais tronqué). */
  crew: string;
  /** Valeur du classement, déjà formatée fr (« 128 rues », « 14 défenses »). */
  value: string;
  /** Rôle RELATIF à l'ego (→ roleColor + forme/icône, jamais la couleur seule). */
  role: SectorRole;
  /** true = c'est MOI (surbrillance légère de ma ligne — repère, pas trophée). */
  me?: boolean;
}

/** Le classement d'UNE zone : deux palmarès + un hook « raison de revenir ». */
export interface ZoneLeaderboard {
  /** Id de secteur (miroir sectorsDemo — ex. 'paris-canal'). */
  sectorId: string;
  /** Nom COURT de la zone (jamais tronqué) — ex. « Canal ». */
  zone: string;
  /** Top conquérants (le plus de rues prises ici cette saison). */
  conquerors: readonly LeaderboardEntry[];
  /** Top défenseurs (le mieux tenu — défenses réussies). */
  defenders: readonly LeaderboardEntry[];
  /**
   * Hook « raison de revenir » — une phrase COURTE, positive, actionnable
   * (emprunt Strava : le segment te rappelle). Jamais de honte.
   */
  comeback: string;
}

/**
 * Démo Saison 0 — les 5 zones du canal (mêmes noms que PARIS_DEMO_SECTORS).
 * KORO (crew République = le mien) apparaît dans chaque zone, positionné pour
 * créer une « raison de revenir » : #1 quelque part (fierté), talonné ailleurs
 * (invitation à reprendre la couronne). Les rivaux (Canal Crew) et alliés
 * (Nuit Pacers) donnent de la texture — rôles cohérents avec l'ego démo.
 */
export const PARIS_ZONE_LEADERBOARDS: readonly ZoneLeaderboard[] = [
  {
    sectorId: 'paris-canal',
    zone: 'Canal',
    // Zone tendue : le rival mène la conquête, mais KORO tient la défense (#1).
    conquerors: [
      { rank: 1, runner: 'MIRA', crew: 'Canal Crew', value: '128 rues', role: 'rival' },
      { rank: 2, runner: 'KORO', crew: 'République', value: '121 rues', role: 'mine', me: true },
      { rank: 3, runner: 'ELIO', crew: 'Nuit Pacers', value: '87 rues', role: 'ally' },
    ],
    defenders: [
      { rank: 1, runner: 'KORO', crew: 'République', value: '14 défenses', role: 'mine', me: true },
      { rank: 2, runner: 'MIRA', crew: 'Canal Crew', value: '11 défenses', role: 'rival' },
      { rank: 3, runner: 'SAKO', crew: 'République', value: '9 défenses', role: 'mine' },
    ],
    comeback: 'Reprends la couronne — 7 rues te séparent du #1.',
  },
  {
    sectorId: 'paris-voltaire',
    zone: 'Voltaire',
    // Zone stable, KORO domine les deux palmarès (fierté assumée, anti-shame).
    conquerors: [
      { rank: 1, runner: 'KORO', crew: 'République', value: '96 rues', role: 'mine', me: true },
      { rank: 2, runner: 'SAKO', crew: 'République', value: '61 rues', role: 'mine' },
      { rank: 3, runner: 'JUNO', crew: 'Est Runners', value: '44 rues', role: 'neutral' },
    ],
    defenders: [
      { rank: 1, runner: 'KORO', crew: 'République', value: '18 défenses', role: 'mine', me: true },
      { rank: 2, runner: 'SAKO', crew: 'République', value: '12 défenses', role: 'mine' },
      { rank: 3, runner: 'JUNO', crew: 'Est Runners', value: '6 défenses', role: 'neutral' },
    ],
    comeback: 'Tu tiens la couronne ici — reviens la défendre.',
  },
  {
    sectorId: 'paris-recollets',
    zone: 'Récollets',
    // Un allié mène la conquête, KORO 2e — invitation à repasser devant.
    conquerors: [
      { rank: 1, runner: 'ELIO', crew: 'Nuit Pacers', value: '73 rues', role: 'ally' },
      { rank: 2, runner: 'KORO', crew: 'République', value: '68 rues', role: 'mine', me: true },
      { rank: 3, runner: 'MIRA', crew: 'Canal Crew', value: '52 rues', role: 'rival' },
    ],
    defenders: [
      { rank: 1, runner: 'ELIO', crew: 'Nuit Pacers', value: '10 défenses', role: 'ally' },
      { rank: 2, runner: 'KORO', crew: 'République', value: '8 défenses', role: 'mine', me: true },
      { rank: 3, runner: 'MIRA', crew: 'Canal Crew', value: '5 défenses', role: 'rival' },
    ],
    comeback: 'Repasse en tête — 5 rues suffisent.',
  },
] as const;

/** La zone mise en avant par défaut sur /territoire (la plus disputée : Canal). */
export const DEFAULT_ZONE_LEADERBOARD: ZoneLeaderboard = PARIS_ZONE_LEADERBOARDS[0]!;

/** Retourne le classement d'une zone par son id de secteur (ou undefined). */
export function zoneLeaderboardById(sectorId: string): ZoneLeaderboard | undefined {
  return PARIS_ZONE_LEADERBOARDS.find((z) => z.sectorId === sectorId);
}
