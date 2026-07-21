/**
 * GRYD — CATALOGUE des challenges (contenu produit, identique pour tous).
 *
 * Ce fichier s'appelait `demo.ts` jusqu'au 21/07/2026 et le nom MENTAIT : il ne
 * portait pas que de la démo, il portait le catalogue officiel des challenges —
 * le seul endroit où sont écrits leur nom, leur promesse et leur récompense.
 * Un prochain lecteur qui aurait « nettoyé la démo » aurait supprimé du contenu
 * produit. Renommé `catalog.ts` (AMENDEMENT-47, lot « fichiers démo appelés »).
 *
 * ─── LA FRONTIÈRE, MAINTENANT PORTÉE PAR LE TYPAGE ──────────────────────────
 * Le catalogue décrit CE QUE LE JEU PROPOSE. Il ne dit RIEN sur le joueur.
 *   · `ChallengeDefinition` — nom, promesse, difficulté, métrique, cible, lot.
 *     Écrit par nous, vrai pour tout le monde. AUCUN champ de progression : le
 *     type ne PEUT PAS exprimer « où en est le joueur ».
 *   · `ChallengeCard` — une définition + la progression LUE AU SERVEUR
 *     (`challengeState.ts`). Seul ce type porte `current`, la contribution perso
 *     et les tiers (crew rival, sponsor) que seul le serveur peut prouver.
 * Avant, les deux vivaient dans la même interface et les `current` étaient
 * saisis à la main ici (« 2 courses sur 3 », « 6,4 km »). Ils n'étaient plus
 * lus — `challengeState` les écrasait — mais ils restaient un piège : la
 * première personne à rendre `CHALLENGES` directement affichait la course d'un
 * joueur imaginaire. La séparation des types rend cette faute impossible.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 21/07/2026 ──────────────────────────────────────
 * · `TODAY` / `TODAY_HERO` — l'état « Aujourd'hui » d'un joueur fabriqué
 *   (« BONJOUR KORO », Score Forme 78, 2 courses cette semaine, coffre crew à
 *   66 %, « Route défense République · 4,8 km · +86 zones »). Zéro appelant, et
 *   c'étaient les SEULS imports de `crew/demo`, `map/demo` et `social/demo` :
 *   leur retrait a rendu ces trois fichiers orphelins, donc supprimables.
 * · Les deux entrées qui NOMMAIENT un tiers inventé : le crew rival « Canal
 *   Runners » (score 128-121) et le sponsor « Magasin Pas de Côté ». Un garde
 *   d'exécution (`readable`) les masquait déjà ; un garde n'est pas une
 *   garantie. GRYD n'invente pas de rivaux ni de commerçants (CLAUDE.md).
 *   Le support sponsor reste dans le TYPE — il reviendra par le back-office.
 *
 * Les cibles viennent TOUJOURS des seeds `@klaim/shared` (CHALLENGE_SEEDS) :
 * aucun nombre magique ici.
 */
import {
  CHALLENGE_SEEDS,
  type ChallengeDifficulty,
  type ChallengeType,
} from '@klaim/shared';

/**
 * Sponsor local d'un challenge (AMENDEMENT-32 §3). ANTI PAY-TO-WIN STRICT : le
 * sponsor finance des LOTS/COSMÉTIQUES, JAMAIS du territoire, des points ni une
 * victoire ; l'entrée est GRATUITE. Présence DISCRÈTE : un blason filaire +
 * « Offert par … ». Aucun sponsor n'est écrit dans ce catalogue : un vrai
 * sponsor est une entité réelle, il viendra du back-office avec le challenge.
 */
export interface ChallengeSponsor {
  /** Nom commercial du sponsor. */
  name: string;
  /** Icône blason discrète (token @klaim/shared) — jamais un logo importé. */
  blason: 'boutique' | 'cadeau' | 'medaille';
  /** Nature des lots offerts — LOTS/COSMÉTIQUES uniquement, jamais du jeu. */
  prizeNote: string;
}

/**
 * DÉFINITION d'un challenge : ce que le jeu propose, vrai pour tout le monde.
 * Aucun champ ne parle du joueur — c'est délibéré et c'est le garde-fou.
 */
export interface ChallengeDefinition {
  /**
   * Id de la carte = slug SQL du challenge (`challenges.slug`). Les entrées du
   * catalogue reprennent une clé de `CHALLENGE_SEEDS` ; le type reste large pour
   * les challenges créés au back-office.
   */
  id: keyof typeof CHALLENGE_SEEDS | (string & {});
  type: ChallengeType;
  name: string;
  blurb: string;
  difficulty: ChallengeDifficulty;
  metric: string;
  /** Cible ANNONCÉE (seed). Le serveur reste maître : `primary_goal` l'écrase. */
  target: number;
  /** Unité affichée après les nombres (ex. « courses », « km », « zones »). */
  unit: string;
  /** Crew : minimum perso souple (§8.3) — une RÈGLE annoncée, pas une mesure. */
  personalMinimum?: number;
  /** Récompense annoncée (badge/coffre) — micro-victoire, pas d'échec puni. */
  reward: string;
}

/**
 * Une définition + la progression MESURÉE par le serveur. Tout ce qui affirme
 * quelque chose sur le joueur ou sur un tiers vit ICI, et est rempli par
 * `challengeState.ts` à partir de `challenge_progress` — jamais écrit à la main.
 */
export interface ChallengeCard extends ChallengeDefinition {
  /** MA progression, lue au serveur. Un 0 ici est MESURÉ, jamais supposé. */
  current: number;
  /** Crew : ma contribution (« tu as contribué à X », §11) — jamais un rang. */
  myContrib?: number;
  /** Rivalry : nom de l'autre équipe (respect, pas d'adversaire diabolisé). */
  partnerName?: string;
  /** Rivalry : score des deux camps (jamais « en retard/en tête » en dur). */
  rivalMine?: number;
  rivalOther?: number;
  /** Sponsor local, quand le serveur en attache un. Ne change RIEN au gameplay. */
  sponsor?: ChallengeSponsor;
}

/**
 * Le catalogue. Ordre stable (solo → crew). Les cibles viennent des seeds
 * partagés ; rien ici ne mesure quoi que ce soit.
 */
export const CHALLENGES: readonly ChallengeDefinition[] = [
  {
    id: 'consistency_ii',
    type: CHALLENGE_SEEDS.consistency_ii.type,
    name: 'Consistency II',
    blurb: '3 courses cette semaine, à ton rythme. La régularité prime, pas la vitesse.',
    difficulty: CHALLENGE_SEEDS.consistency_ii.difficulty,
    metric: CHALLENGE_SEEDS.consistency_ii.metric,
    target: CHALLENGE_SEEDS.consistency_ii.target,
    unit: 'courses',
    reward: 'Badge Consistency',
  },
  {
    id: 'distance_10k',
    type: CHALLENGE_SEEDS.distance_10k.type,
    name: 'Distance',
    blurb: '10 km cumulés sur la semaine. En une fois ou en plusieurs, comme tu veux.',
    difficulty: CHALLENGE_SEEDS.distance_10k.difficulty,
    metric: CHALLENGE_SEEDS.distance_10k.metric,
    target: CHALLENGE_SEEDS.distance_10k.target, // 10 000 m
    unit: 'km',
    reward: 'Badge Distance',
  },
  {
    id: 'defense_30',
    type: CHALLENGE_SEEDS.defense_30.type,
    name: 'Defense',
    blurb: '30 zones défendues. Tenir le quartier compte autant que conquérir.',
    difficulty: CHALLENGE_SEEDS.defense_30.difficulty,
    metric: CHALLENGE_SEEDS.defense_30.metric,
    target: CHALLENGE_SEEDS.defense_30.target,
    unit: 'zones',
    reward: 'Badge Defender',
  },
  {
    id: 'crew_defense_week',
    type: CHALLENGE_SEEDS.crew_defense_week.type,
    name: 'Defense Week',
    blurb: 'Objectif collectif du crew. Chaque zone défendue compte pour le coffre.',
    difficulty: CHALLENGE_SEEDS.crew_defense_week.difficulty,
    metric: CHALLENGE_SEEDS.crew_defense_week.metric,
    target: CHALLENGE_SEEDS.crew_defense_week.collectiveTarget, // 300
    unit: 'zones',
    personalMinimum: CHALLENGE_SEEDS.crew_defense_week.personalMinimum, // 20
    reward: 'Coffre crew · palier Or',
  },
];

// ─── Formatage local ─────────────────────────────────────────────────────────

/** Mètres → « 6,4 km » (une décimale, virgule FR). PURE. */
function formatKm(m: number): string {
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Valeur d'un challenge dans son unité d'affichage : `distanceM` en km, le reste
 * en entier. PURE — pas d'Intl (rendu Hermes stable). `unit` gouverne le rendu.
 */
export function formatChallengeValue(value: number, unit: string): string {
  if (unit === 'km') return formatKm(value);
  return `${Math.round(value)}`;
}
