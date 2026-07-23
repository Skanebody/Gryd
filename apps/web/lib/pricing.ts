import { SKU_PRICES_EUR, SKUS } from '@klaim/shared';

/**
 * Prix publics affichés sur le site — ADAPTATEUR, PAS UNE SOURCE.
 *
 * Ce fichier ne contient PLUS aucun prix : il ne fait que re-clefer
 * `SKU_PRICES_EUR` (packages/shared/src/game-rules.ts, source de vérité unique)
 * sur les SKUs RevenueCat. Le site avait dupliqué 4,99 / 34,99 / 2,99 / 7,99 et
 * affichait un Founder Pack à 149 € contre 9,99 € dans game-rules — un facteur
 * 15 d'écart entre la source de vérité et le lien public. Un seul endroit
 * décide d'un prix : game-rules.ts.
 *
 * ⚠️ Aucun de ces prix n'est encaissable aujourd'hui (aucun client IAP, aucun
 * checkout Stripe câblé) : ce sont des prix ANNONCÉS. Toute surface qui les
 * affiche doit le dire et ne jamais peindre un bouton d'achat.
 */
export const PRICES_EUR = {
  [SKUS.clubMonthly]: SKU_PRICES_EUR.club_monthly,
  [SKUS.clubAnnual]: SKU_PRICES_EUR.club_annual,
  [SKUS.starterPack]: SKU_PRICES_EUR.starter_pack,
} as const;

/** Founder Pack (achat unique, doc §19.2) — lu depuis la source, jamais réécrit ici. */
export const FOUNDER_PACK_EUR = SKU_PRICES_EUR[SKUS.founderPack];

/**
 * GRYD Pass — v1.1 « Saison 1 » (SPEC §12, arbitrage A2 AMENDEMENT-02 §12) :
 * catalogué INACTIF (status draft, aucun SKU actif). Annoncé « à venir »,
 * jamais achetable au MVP.
 */
export const SEASON_PASS_PRICE_EUR = SKU_PRICES_EUR.gryd_pass;

/** Économie du plan annuel vs 12 × mensuel, en % entier (affichage toggle pricing). */
export const CLUB_ANNUAL_SAVINGS_PCT = Math.round(
  (1 - PRICES_EUR[SKUS.clubAnnual] / (PRICES_EUR[SKUS.clubMonthly] * 12)) * 100,
);
