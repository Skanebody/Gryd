/**
 * GRYD — LES DATES DE LA SAISON 0 (lot W3).
 *
 * ─── LA SEULE COPIE, ET ELLE EST ICI ────────────────────────────────────────
 * Cahier de contenu §3.4 : « ces deux dates ne se retapent nulle part ailleurs.
 * Une seule copie, `apps/web/lib/season2026.ts`, avec en commentaire la ligne de
 * production dont elles sont le miroir : si la saison change en base, ce fichier
 * change ou la page ment. »
 *
 * ─── LA LIGNE DE PRODUCTION DONT CECI EST LE MIROIR ─────────────────────────
 * `season_collections_2026`, configurée le 11/09/2026 sur le projet `gryd`
 * (`sydwxwwirinjoheeodcg`) : fenêtre **14/09 00:00 → 25/10 23:59, Europe/Paris**,
 * 12 modèles de collection, 0 inscription avant l'heure, rejeu idempotent.
 * Relevé dans `docs/STATUS.md` (encart du 11/09/2026).
 *
 * ⚠️ CE N'EST PAS UNE RÈGLE DE JEU. La DURÉE (six semaines) et le NOMBRE DE
 * PALIERS (douze) viennent, eux, de `PROGRESSION_RULES_2026` et se lisent dans
 * `facts2026.ts` : ce fichier ne porte que les deux BORNES, qui sont une donnée
 * d'exploitation et n'existent dans aucune constante partagée. Les écrire ici
 * plutôt que dans `game-rules.ts` évite exactement ça : une date d'exploitation
 * déguisée en règle du jeu.
 *
 * Les deux libellés sont écrits en toutes lettres plutôt que dérivés d'un
 * `Date` : un rendu par `Intl` dépend de l'ICU du navigateur et de la locale du
 * visiteur, et une date de saison qui change de forme selon le téléphone n'est
 * pas la même promesse. Le test relit la cohérence des deux formes.
 */

/** La borne d'ouverture, forme machine (`<time dateTime>`), fuseau de Paris. */
export const SEASON_ZERO_START_ISO = '2026-09-14' as const;
/** La borne de clôture, forme machine. Le dernier jour est INCLUS. */
export const SEASON_ZERO_END_ISO = '2026-10-25' as const;

/** La borne d'ouverture, telle qu'elle se lit dans une phrase. */
export const SEASON_ZERO_START_LABEL = 'lundi 14 septembre 2026' as const;
/** La borne de clôture, telle qu'elle se lit dans une phrase. */
export const SEASON_ZERO_END_LABEL = 'dimanche 25 octobre 2026' as const;

/** Le nom de la saison en cours de configuration. Pas un numéro tapé dans une phrase. */
export const SEASON_ZERO_NAME = 'Saison 0' as const;

/** Le fuseau qui fait foi, nommé et jamais réduit à un décalage fixe. */
export const SEASON_ZERO_TIME_ZONE_LABEL = 'heure de Paris' as const;
