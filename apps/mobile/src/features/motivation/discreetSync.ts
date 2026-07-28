/**
 * GRYD — LE MODE DISCRET DOIT ARRIVER JUSQU'AU SERVEUR (§10.3).
 *
 * ═══ POURQUOI CE MODULE EXISTE (28/07/2026) ═════════════════════════════════
 * `MotivationPrefs.discreetMode` ne vivait QUE dans AsyncStorage. L'écran de
 * réglages promettait pourtant, dans les cinq langues, « Hors des classements
 * globaux », et l'écran Classement affichait « Ton rang n'apparaît pas dans les
 * classements publics ». Le seul filtre existant était CLIENT et s'appliquait à
 * MON écran :
 *     const rows = discreet ? rankedRows.filter((r) => r.me !== true) : rankedRows;
 * Autrement dit : ma ligne (pseudo, surface, défenses) continuait d'être servie
 * à tous les autres joueurs, et j'étais le seul à ne pas la voir. Une protection
 * que seul le protégé ne voit pas n'est pas une protection.
 *
 * La colonne `user_profiles.discreet_mode` EXISTE depuis 0011 et le `grant
 * update` du propriétaire aussi. La migration 0092 la fait respecter par la RPC
 * `city_player_surface_board`. Ce module est le CHAÎNON MANQUANT : il écrit le
 * réglage là où le serveur le lira.
 *
 * ═══ CE QU'IL NE FAIT PAS, ET LE DIT ════════════════════════════════════════
 * Il n'INVENTE pas de succès. Quatre issues DISTINCTES, jamais confondues —
 * c'est la même doctrine que les quatre états de lecture de la constitution :
 *  · 'synced'      — la ligne de profil a été mise à jour, le serveur sait ;
 *  · 'no_backend'  — aucun client Supabase configuré (build sans backend) ;
 *  · 'no_profile'  — pas de session, ou aucune ligne `user_profiles` (le joueur
 *                    n'a pas encore fait son profil minimal). Le réglage tient
 *                    localement ; il n'y a rien à protéger côté serveur tant
 *                    qu'aucun profil n'existe, mais on ne prétend pas l'avoir
 *                    envoyé ;
 *  · 'failed'      — l'écriture a été TENTÉE et a échoué. C'est le seul cas où
 *                    l'app doit alerter : le joueur croit être retiré des
 *                    classements et ne l'est pas.
 *
 * ── CE FICHIER EST PUR, ET DOIT LE RESTER ─────────────────────────────────
 * Aucun import : ni Supabase, ni React Native. C'est ce qui le rend testable
 * sous Deno (`npm run test:mobile` charge tout `apps/mobile/src`, et
 * `lib/supabase.ts` ne s'y typecheck pas). L'I/O — le mince appel qui traduit
 * une réponse PostgREST en `DiscreetSyncOutcome` — vit dans
 * `discreetSyncClient.ts` et n'a AUCUNE décision à prendre.
 */

export type DiscreetSyncOutcome = 'synced' | 'no_backend' | 'no_profile' | 'failed';

/**
 * Ce que l'écriture SIGNIFIE, sachant ce que l'appel a rendu. PURE : aucun I/O,
 * aucune horloge, aucun accès au client — elle se teste seule.
 *
 * `updatedRows` vaut `null` quand la requête n'a pas abouti du tout (erreur), et
 * un entier sinon : 0 = aucune ligne de profil pour ce compte, ≥ 1 = écrit.
 * On distingue les deux parce que « il n'y a rien à écrire » et « je n'ai pas
 * réussi à écrire » sont deux faits opposés pour le joueur.
 */
export function discreetSyncOutcome(input: {
  readonly hasBackend: boolean;
  readonly userId: string | null;
  readonly error: unknown;
  readonly updatedRows: number | null;
}): DiscreetSyncOutcome {
  if (!input.hasBackend) return 'no_backend';
  if (input.userId === null) return 'no_profile';
  if (input.error != null) return 'failed';
  if (input.updatedRows === null) return 'failed';
  return input.updatedRows > 0 ? 'synced' : 'no_profile';
}

/**
 * Les SEULES issues qui doivent alerter le joueur. Un 'no_backend' ou un
 * 'no_profile' ne mettent personne en danger : sans profil serveur, aucune ligne
 * de classement ne porte ce joueur. Un 'failed', si — d'où la séparation.
 */
export function discreetSyncNeedsWarning(outcome: DiscreetSyncOutcome): boolean {
  return outcome === 'failed';
}
