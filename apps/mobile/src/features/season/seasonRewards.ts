/**
 * GRYD — PALIERS RÉELS de fin de saison (planche E12 « Récompenses de saison »).
 *
 * ─── POURQUOI CE MODULE EXISTE (25/07/2026) ──────────────────────────────────
 * L'écran Saison affichait 3 `TOP10_REWARDS` (features/social/league.ts) :
 * « Badge Paris Race » (Paris CODÉ EN DUR alors que le classement est celui de MA
 * ville, quelle qu'elle soit), « Frame Tempo », « Coffre saison » (contenu défini
 * nulle part — promettre un coffre est une garantie que le code ne tient pas).
 * Trois libellés français hors i18n, pour des récompenses qui n'existent pas.
 *
 * Ce qui EXISTE vraiment, et qui est décerné par le serveur à la clôture
 * (supabase/functions/season_close/logic.ts → `founderBadges`) : les médailles
 * `season_rank_1..5` + `season_rank_legend` de la famille « saison » du catalogue
 * @klaim/shared. Ce module reconstruit CETTE échelle, et rien d'autre.
 *
 * ⚠ DETTE ASSUMÉE (« aucun nombre magique ») : les rangs de coupure
 * (100/50/10/3/1) vivent aujourd'hui dans `SEASON_RANK_TIERS`, une constante
 * PRIVÉE de `season_close/logic.ts` — donc inaccessible au client. Les seuils du
 * catalogue shared (`badges.ts`, famille season_rank) sont des NIVEAUX (1..6),
 * pas des rangs. Ils sont donc recopiés ici, à l'identique et documentés. Le
 * correctif propre est d'exporter `SEASON_RANK_TIERS` depuis packages/shared —
 * hors périmètre de ce chantier (voir observations).
 *
 * Le MATÉRIAU (rareté) et le NOM ne sont PAS réinventés : ils sont LUS dans
 * `BADGES_BY_KEY` (@klaim/shared) — acier sombre (road) → chrome (tempo/race) →
 * titane (carbon) → élite → or limité (legend). Aucune couleur en dur.
 *
 * Module PUR : aucun import React/RN, testable en Deno.
 */
import { BADGES_BY_KEY, type BadgeTier } from '@klaim/shared';

/** Un palier de fin de saison RÉEL — décerné par season_close, pas par l'écran. */
export interface SeasonRewardTier {
  /** Clé de badge RÉELLE (`user_badges.badge_key`) — jamais un libellé inventé. */
  badgeKey: string;
  /** Rang final maximal qui décroche le palier (rang ≤ maxRank). */
  maxRank: number;
  /**
   * Vrai pour `season_rank_legend` : « Remporte la saison locale » n'est décerné
   * qu'au vainqueur NON ex æquo (logic.ts : `r.rank === 1 && !r.tied`).
   */
  soleWinnerOnly: boolean;
  /** Matériau/rareté LU du catalogue shared (road → legend). */
  tier: BadgeTier;
  /** Nom du badge (nom propre @klaim/shared — invariant, jamais traduit). */
  name: string;
}

/** Rangs de coupure — recopie DOCUMENTÉE de season_close/logic.ts (cf. en-tête). */
const LADDER: readonly { badgeKey: string; maxRank: number; soleWinnerOnly: boolean }[] = [
  { badgeKey: 'season_rank_1', maxRank: 100, soleWinnerOnly: false },
  { badgeKey: 'season_rank_2', maxRank: 50, soleWinnerOnly: false },
  { badgeKey: 'season_rank_3', maxRank: 10, soleWinnerOnly: false },
  { badgeKey: 'season_rank_4', maxRank: 3, soleWinnerOnly: false },
  { badgeKey: 'season_rank_5', maxRank: 1, soleWinnerOnly: false },
  { badgeKey: 'season_rank_legend', maxRank: 1, soleWinnerOnly: true },
];

/**
 * L'échelle affichable, du palier le plus accessible au plus rare. Le matériau et
 * le nom viennent du catalogue shared ; si une clé manquait (catalogue amputé),
 * le palier est SILENCIEUSEMENT écarté plutôt qu'affiché avec un nom inventé.
 */
export const SEASON_REWARD_TIERS: readonly SeasonRewardTier[] = LADDER.flatMap((rung) => {
  const def = BADGES_BY_KEY.get(rung.badgeKey);
  if (!def) return [];
  return [{ ...rung, tier: def.tier, name: def.name }];
});

/** Ce palier serait-il décroché par un rang final donné ? PUR. */
export function tierReachedBy(tier: SeasonRewardTier, rank: number, tied: boolean): boolean {
  if (rank > tier.maxRank) return false;
  // Le legend exige un vainqueur UNIQUE : un #1 ex æquo garde le titre, pas le legend.
  return !(tier.soleWinnerOnly && tied);
}

export interface SeasonStanding {
  /** Le meilleur palier que mon rang ACTUEL décrocherait — `null` si aucun. */
  current: SeasonRewardTier | null;
  /** Le premier palier NON atteint — `null` si je les tiens tous. */
  next: SeasonRewardTier | null;
  /**
   * Places à remonter pour atteindre `next`. `null` quand l'écart ne se compte
   * pas en places (cas du legend à rang 1 ex æquo : il faut être seul, pas monter).
   */
  placesToNext: number | null;
}

/**
 * Position PROVISOIRE dans l'échelle de fin de saison, dérivée du rang RÉEL lu
 * dans le classement. Rien n'est décerné avant la clôture — l'écran le dit.
 *
 * @param rank rang local courant, ou `null` si je ne suis pas classé.
 * @param tied mon rang est-il partagé (ex æquo) ?
 */
export function seasonStanding(rank: number | null, tied: boolean): SeasonStanding {
  if (rank === null || !Number.isFinite(rank) || rank < 1) {
    return { current: null, next: null, placesToNext: null };
  }
  let current: SeasonRewardTier | null = null;
  let next: SeasonRewardTier | null = null;
  for (const tier of SEASON_REWARD_TIERS) {
    if (tierReachedBy(tier, rank, tied)) {
      current = tier;
    } else if (next === null) {
      next = tier;
    }
  }
  const gap = next === null ? null : rank - next.maxRank;
  return { current, next, placesToNext: gap !== null && gap > 0 ? gap : null };
}
