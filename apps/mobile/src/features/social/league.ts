/**
 * GRYD — GABARITS des tableaux de la League (Joueurs / Crews / Ville / France /
 * Pionniers / Performance) : titre, unité, type de classement. RIEN D'AUTRE.
 *
 * Les LIGNES ont été vidées le 21/07/2026. Ce fichier portait six podiums de
 * joueurs entièrement inventés — « KORO #8 Paris à 4 210 pts », LENA_RUN,
 * TOUTDROIT, BPM_BASTILLE, avec leurs crews. Ils n'étaient plus RENDUS
 * (`leagueBoard.ts` ne lit que le gabarit et remplit les lignes depuis le
 * serveur), mais ils restaient un piège : un seul `LEAGUE_BOARDS[0].rows`
 * ailleurs dans le code aurait suffi à publier un classement fictif.
 *
 * La règle qui s'applique ici est la plus catégorique du projet : ne jamais
 * fabriquer de classement. Un tableau sans joueur réel sort VIDE, et l'écran dit
 * « personne n'a encore couru cette saison, sois le premier ».
 *
  * CADRE EUROPE (AMENDEMENT-35 + constitution CLAUDE.md) : l'élargissement Europe
 * est une VISION. La règle est CATÉGORIQUE — « ne jamais fabriquer de données
 * européennes factices (villes/classements/rivaux) tant qu'aucun vrai utilisateur
 * ne les peuple ; la vision se surface en COPIE + docs, pas en inventant des
 * rankings ». L'étiquette « démonstration » NE couvre PAS cet interdit : inventer
 * des rangs européens chiffrés (Berlin/Barcelone/Milan…) EST exactement l'acte
 * prohibé. L'onglet « Ville » reste donc cantonné à la FRANCE (Paris/Lille/Lyon
 * démo) ; la vision Europe vit dans la COPIE de l'écran (demoNote « l'Europe
 * suit »), jamais dans le tableau. (Villes françaises = démo honnête localisée.)
 */
import type { IconName } from '@klaim/shared';

export type LeagueTabId =
  | 'joueurs'
  | 'crews'
  | 'ville'
  | 'france'
  | 'pionniers'
  | 'performance';

export interface LeagueRow {
  rank: number;
  name: string;
  /** Sous-ligne (crew d'appartenance, ville, région…). */
  sub?: string;
  /** Valeur classée (pts, hexes, score) — l'unité vient du board. */
  value: number;
  /** MA ligne (ou mon crew / ma ville) — ancre chartreuse. */
  me?: boolean;
  /** Seed de blason (boards crew) — mêmes seeds que features/crew/demo. */
  crewSeed?: string;
  /** Rupture de séquence avant cette ligne (« ··· » entre #8 et #23). */
  gapBefore?: boolean;
}

export interface LeagueBoard {
  id: LeagueTabId;
  label: string;
  /** Nature des lignes — décide du visuel (avatar / blason / ville). */
  kind: 'player' | 'crew' | 'city';
  /** Unité courte affichée sous la valeur (« pts », « hexes »…). */
  valueLabel: string;
  rows: readonly LeagueRow[];
}

/** Semaine de saison courante (DATA démo — la vraie vient du serveur). */
export const LEAGUE_SEASON_WEEK = 2;

/**
 * Les 6 tableaux démo. Chaque board est ANCRÉ sur moi quand j'y figure
 * (jamais un top-100 anonyme) ; les valeurs recoupent les autres demos.
 */
export const LEAGUE_BOARDS: readonly LeagueBoard[] = [
  {
    id: 'joueurs',
    label: 'Joueurs',
    kind: 'player',
    valueLabel: 'pts',
    rows: [],
  },
  {
    id: 'crews',
    label: 'Crews',
    kind: 'crew',
    valueLabel: 'pts',
    rows: [],
  },
  {
    id: 'ville',
    label: 'Ville',
    kind: 'city',
    valueLabel: 'zones',
    rows: [],
  },
  {
    id: 'france',
    label: 'France',
    kind: 'player',
    valueLabel: 'pts',
    rows: [],
  },
  {
    id: 'pionniers',
    label: 'Pionniers',
    kind: 'player',
    valueLabel: 'zones pionnières',
    rows: [],
  },
  {
    id: 'performance',
    label: 'Performance',
    kind: 'player',
    valueLabel: 'Score Forme',
    rows: [],
  },
] as const;

/**
 * Rang gagné cette semaine (démo) — alimente le RankUpCard « #9 → #8 ».
 * Anti-shame : ce bloc ne sert QUE les montées, jamais les descentes.
 */
export const LEAGUE_RANK_UP = {
  fromRank: 9,
  toRank: 8,
  points: 4210,
} as const;

export interface LeagueRewardDemo {
  icon: IconName;
  label: string;
  sublabel: string;
}

/** Récompenses Top 10 de fin de saison (doc §17) — rendues en RewardCards. */
export const TOP10_REWARDS: readonly LeagueRewardDemo[] = [
  { icon: 'badge', label: 'Badge Paris Race', sublabel: 'Badge exclusif Saison 0' },
  { icon: 'skin', label: 'Frame Tempo', sublabel: 'Cadre de profil · cosmétique' },
  { icon: 'coffre', label: 'Coffre saison', sublabel: "S'ouvre au reset de saison" },
];

/**
 * PROGRESSION LOCALE (§12.2/§19.2) dérivée des lignes RÉELLES du classement de
 * ma ville : ma place #N + les points qu'il me manque pour passer devant #N-1.
 * PUR, honnête :
 *  · `null` si ma ligne n'est pas dans les lignes lues (non classé, ou hors du
 *    top lu) → l'écran n'affiche RIEN plutôt qu'un rang inventé ;
 *  · `deltaToNext === null` quand je suis 1er (rien devant), ou quand la ligne
 *    #N-1 n'a pas été lue (on n'invente pas l'écart) ;
 *  · sinon le delta réel (≥ 0) de points vers la place au-dessus.
 */
export function seasonRankProgress(
  rows: readonly LeagueRow[],
): { readonly rank: number; readonly deltaToNext: number | null } | null {
  const me = rows.find((r) => r.me);
  if (!me) return null;
  if (me.rank <= 1) return { rank: me.rank, deltaToNext: null };
  const above = rows.find((r) => r.rank === me.rank - 1);
  const deltaToNext = above ? Math.max(0, above.value - me.value) : null;
  return { rank: me.rank, deltaToNext };
}
