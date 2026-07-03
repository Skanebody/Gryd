/**
 * GRYD — état de déblocage FACTICE de la collection (aucun backend branché).
 * TODO(O1) : brancher la table `user_badges` (Supabase) + réponse `newBadges`
 * d'ingest_run (AMENDEMENT-04 §5) — supprimer ce fichier à ce moment-là.
 * Set réaliste (~9 badges) cohérent avec le profil factice KORO :
 * 3 semaines de streak, 2 147 hexes, membre des FOULÉES 9³.
 */

/** id badge → date de déblocage affichable (ordre chronologique). */
export const UNLOCKED_DEMO: ReadonlyMap<string, string> = new Map([
  ['premiers_pas', '12 juin 2026'],
  ['fondateur', '12 juin 2026'],
  ['enclenche', '15 juin 2026'],
  ['recrue', '16 juin 2026'],
  ['energie', '19 juin 2026'],
  ['nocturne', '21 juin 2026'],
  ['rival', '24 juin 2026'],
  ['endurance', '28 juin 2026'],
  ['conquerant', '1 juillet 2026'],
]);

/** Ids débloqués (dérivé — l'UI teste l'appartenance ici). */
export const UNLOCKED_IDS: ReadonlySet<string> = new Set(UNLOCKED_DEMO.keys());

/** Les n derniers badges débloqués, du plus récent au plus ancien (aperçu profil). */
export function lastUnlockedIds(n: number): string[] {
  return [...UNLOCKED_DEMO.keys()].slice(-n).reverse();
}
