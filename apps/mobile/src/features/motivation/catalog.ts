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
 *     (`challengeState.ts`). Seul ce type porte `current`.
 * Avant, les deux vivaient dans la même interface et les `current` étaient
 * saisis à la main ici (« 2 courses sur 3 », « 6,4 km »). Ils n'étaient plus
 * lus — `challengeState` les écrasait — mais ils restaient un piège : la
 * première personne à rendre `CHALLENGES` directement affichait la course d'un
 * joueur imaginaire. La séparation des types rend cette faute impossible.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 25/07/2026 (lot Motivation, Vague 1) ────────────
 * 1. LES CINQ CHAMPS QUE PERSONNE NE REMPLISSAIT. `ChallengeCard` déclarait
 *    `myContrib`, `partnerName`, `rivalMine`, `rivalOther` et `sponsor` — tous
 *    TOUJOURS `undefined`, parce que `challengeState` ne copie que `target` et
 *    `current` (la contribution personnelle n'est ventilée par membre nulle part
 *    côté serveur, et aucun sponsor n'existe). Les deux écrans peignaient
 *    pourtant « Offert par … », deux scores de rivalité et « tu as déjà défendu
 *    {n} zones » dans des branches INATTEIGNABLES. Un champ optionnel que rien
 *    ne remplit n'est pas une préparation, c'est un piège : le prochain lecteur
 *    croit la section vivante. Le support reviendra AVEC sa source serveur, et
 *    le type le rendra alors possible — pas avant.
 * 2. LE FRANÇAIS EN DUR. `blurb` et `reward` étaient des `string` écrites en
 *    français (« 3 courses cette semaine, à ton rythme. », « Coffre crew ·
 *    palier Or ») et rendues BRUTES par `/challenges` et `/challenges/[id]` :
 *    un joueur en EN/ES/DE/PT lisait du français. Ce sont maintenant des
 *    `Entry` du catalogue i18n — parité 5 langues imposée par le type.
 *    Les NOMS (« Consistency II », « Distance », « Defense », « Defense Week »)
 *    restent des INVARIANTS : noms propres GRYD, jamais traduits (cf. l'en-tête
 *    de `i18n/catalog/motivation.ts`).
 *
 * Les cibles viennent TOUJOURS des seeds `@klaim/shared` (CHALLENGE_SEEDS) :
 * aucun nombre magique ici.
 */
import {
  CHALLENGE_SEEDS,
  type ChallengeDifficulty,
  type ChallengeType,
} from '@klaim/shared';
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/motivation';
import { formatKm } from '../../ui/format';

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
  /** Nom propre GRYD — INVARIANT, jamais traduit (cf. en-tête). */
  name: string;
  /** Promesse du défi — 5 langues imposées par le type. */
  blurb: Entry;
  difficulty: ChallengeDifficulty;
  metric: string;
  /** Cible ANNONCÉE (seed). Le serveur reste maître : `primary_goal` l'écrase. */
  target: number;
  /** Unité affichée après les nombres (ex. « courses », « km », « zones »). */
  unit: string;
  /** Crew : minimum perso souple (§8.3) — une RÈGLE annoncée, pas une mesure. */
  personalMinimum?: number;
  /** Récompense annoncée (badge/coffre) — micro-victoire, pas d'échec puni. */
  reward: Entry;
}

/**
 * Une définition + la progression MESURÉE par le serveur. `current` est le SEUL
 * champ qui affirme quelque chose sur le joueur, et il est rempli exclusivement
 * par `challengeState.ts` à partir de `challenge_progress` — jamais à la main.
 */
export interface ChallengeCard extends ChallengeDefinition {
  /** MA progression, lue au serveur. Un 0 ici est MESURÉ, jamais supposé. */
  current: number;
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
    blurb: C.chConsistencyBlurb,
    difficulty: CHALLENGE_SEEDS.consistency_ii.difficulty,
    metric: CHALLENGE_SEEDS.consistency_ii.metric,
    target: CHALLENGE_SEEDS.consistency_ii.target,
    unit: 'courses',
    reward: C.chConsistencyReward,
  },
  {
    id: 'distance_10k',
    type: CHALLENGE_SEEDS.distance_10k.type,
    name: 'Distance',
    blurb: C.chDistanceBlurb,
    difficulty: CHALLENGE_SEEDS.distance_10k.difficulty,
    metric: CHALLENGE_SEEDS.distance_10k.metric,
    target: CHALLENGE_SEEDS.distance_10k.target, // 10 000 m
    unit: 'km',
    reward: C.chDistanceReward,
  },
  {
    id: 'defense_30',
    type: CHALLENGE_SEEDS.defense_30.type,
    name: 'Defense',
    blurb: C.chDefenseBlurb,
    difficulty: CHALLENGE_SEEDS.defense_30.difficulty,
    metric: CHALLENGE_SEEDS.defense_30.metric,
    target: CHALLENGE_SEEDS.defense_30.target,
    unit: 'zones',
    reward: C.chDefenseReward,
  },
  {
    id: 'crew_defense_week',
    type: CHALLENGE_SEEDS.crew_defense_week.type,
    name: 'Defense Week',
    blurb: C.chCrewDefenseBlurb,
    difficulty: CHALLENGE_SEEDS.crew_defense_week.difficulty,
    metric: CHALLENGE_SEEDS.crew_defense_week.metric,
    target: CHALLENGE_SEEDS.crew_defense_week.collectiveTarget, // 300
    unit: 'zones',
    personalMinimum: CHALLENGE_SEEDS.crew_defense_week.personalMinimum, // 20
    reward: C.chCrewDefenseReward,
  },
];

// ─── Formatage local ─────────────────────────────────────────────────────────

/**
 * Valeur d'un challenge dans son unité d'affichage : `distanceM` en km, le reste
 * en entier. `null` quand la valeur n'est PAS affichable (non finie, distance
 * négative) — l'appelant masque alors la ligne plutôt que d'écrire « NaN » ou un
 * faux zéro. En pratique `challengeState` écarte déjà ces lignes ; ce `null` est
 * la ceinture, pas la bretelle.
 *
 * Le séparateur décimal suit la LANGUE (`ui/format`, socle partagé) : la version
 * précédente forçait la virgule française, donc « 6,4 km » à un joueur anglais.
 * Aucun `Intl` (Hermes n'embarque pas ICU).
 */
export function formatChallengeValue(value: number, unit: string): string | null {
  if (unit === 'km') {
    const km = formatKm(value / 1000);
    return km === null ? null : `${km} km`;
  }
  if (!Number.isFinite(value)) return null;
  return `${Math.round(value)}`;
}
