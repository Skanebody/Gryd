import { SKUS } from '@klaim/shared';

/**
 * Prix publics affichés sur le site — SPEC §5.1 (MVP) et §12 (v1.1).
 * Constantes PRODUIT du site (précédent : lib/waitlist.ts), clefées sur les
 * SKUs RevenueCat de @klaim/shared pour ne jamais dériver des identifiants.
 * TODO(shared) : si les prix rejoignent un jour packages/shared, supprimer ce fichier.
 */
export const PRICES_EUR = {
  [SKUS.clubMonthly]: 4.99,
  [SKUS.clubAnnual]: 34.99,
  [SKUS.starterPack]: 2.99,
} as const;

/**
 * GRYD Pass — v1.1 « Saison 1 » (SPEC §12, arbitrage A2 AMENDEMENT-02 §12) :
 * affiché en annonce avec badge « à venir », pas achetable au MVP.
 */
export const SEASON_PASS_PRICE_EUR = 7.99;

/** Économie du plan annuel vs 12 × mensuel, en % entier (affichage toggle pricing). */
export const CLUB_ANNUAL_SAVINGS_PCT = Math.round(
  (1 - PRICES_EUR[SKUS.clubAnnual] / (PRICES_EUR[SKUS.clubMonthly] * 12)) * 100,
);
