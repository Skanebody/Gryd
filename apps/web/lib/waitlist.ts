/**
 * SPEC §9.5 — waitlist à seuil de déblocage : « ton quartier ouvre à 500 inscrits ».
 * Constante produit du site (pas une règle de jeu §3 → ne vit pas dans game-rules.ts).
 *
 * C'est une RÈGLE ANNONCÉE, pas une mesure : elle dit à partir de combien
 * d'inscrits un quartier ouvre, elle n'affirme rien sur le nombre d'inscrits
 * actuel. Le compteur factice par ville (`FAKE_WAITLIST_COUNTS`) a été SUPPRIMÉ
 * — décision fondateur 21/07/2026 : aucune surface de GRYD n'affiche de donnée
 * fabriquée. Tant que le compte réel n'est pas lisible, on n'affiche pas de
 * compteur du tout.
 */
export const WAITLIST_UNLOCK_THRESHOLD = 500;
