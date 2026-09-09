/** Les cinq issues de la lecture serveur. Déclarée ICI, dans un module PUR :
 * `ProfileProgress` la ré-exporte, et ce fichier reste testable sous Deno sans
 * traîner React, le SDK Supabase ni AsyncStorage dans son graphe. */
export type ProfileProgressStatus = 'loading' | 'signed-out' | 'unavailable' | 'failed' | 'ready';

/**
 * Le chiffre héros du Profil (« jours actifs ») ne se dérive pas de la présence
 * d'une donnée : il se dérive de l'ÉTAT DE LECTURE. Avant, `progress.data`
 * absent suffisait, et `failed` comme `unavailable` peignaient l'invitation
 * « Tout commence dehors » — l'app affirmait un profil vide là où elle n'avait
 * simplement pas réussi à lire (interdits L8/L14/L19).
 *
 *  · `loading`     — on ne sait pas encore ;
 *  · `guest`       — pas de compte : l'invitation est VRAIE ;
 *  · `empty`       — lu, et zéro journée active : un fait mesuré ;
 *  · `failed`      — la lecture a échoué : on le dit et on propose de réessayer ;
 *  · `unavailable` — pas de serveur ici : ni panne ni vide, un fait de plateforme ;
 *  · `ready`       — une mesure réelle.
 */
export type ProfileMovementState2026 = 'loading' | 'guest' | 'empty' | 'failed' | 'unavailable' | 'ready';

export function profileMovementState2026(input: { status: ProfileProgressStatus; activeDays: number | null }): ProfileMovementState2026 {
  if (input.status === 'signed-out') return 'guest';
  if (input.status === 'failed') return 'failed';
  if (input.status === 'unavailable') return 'unavailable';
  if (input.status !== 'ready' || input.activeDays === null) return 'loading';
  return input.activeDays > 0 ? 'ready' : 'empty';
}
