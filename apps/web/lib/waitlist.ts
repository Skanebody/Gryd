import type { CityId } from '@klaim/shared';

/**
 * SPEC §9.5 — waitlist à seuil de déblocage : « ton quartier ouvre à 500 inscrits ».
 * Constante produit du site (pas une règle de jeu §3 → ne vit pas dans game-rules.ts).
 */
export const WAITLIST_UNLOCK_THRESHOLD = 500;

/**
 * Compteur factice par ville, affiché après inscription.
 * TODO(data) : brancher le count réel (count(*) sur `waitlist` groupé par ville / code postal).
 */
export const FAKE_WAITLIST_COUNTS: Record<CityId, number> = {
  paris: 327,
  lille: 141,
};
