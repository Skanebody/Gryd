/**
 * GRYD — CE QU'UN ÉCHEC D'AUTHENTIFICATION A LE DROIT DE DIRE. Module PUR.
 *
 * ─── POURQUOI CE FICHIER EXISTE (10/09/2026) ────────────────────────────────
 * Le motif d'échec était déjà calculé, précisément, par `lib/auth.ts` : six
 * valeurs distinctes, chacune documentée. L'écran, lui, les écrasait toutes en
 * un `boolean` :
 *
 *     const [failed, setFailed] = useState(false);
 *     …
 *     {failed ? <Text>{t(C.errorSignInFailed)}</Text> : null}
 *
 * Donc « Sign in with Apple n'est pas disponible sur cet appareil » (une
 * CAPACITÉ absente : réessayer ne changera jamais rien) et « le serveur a
 * refusé le jeton » (une panne : réessayer a du sens) disaient la même phrase,
 * « La connexion a échoué. Réessaie ». On envoyait le joueur réessayer un
 * chemin qui ne peut pas exister sur son appareil.
 *
 * ─── PURE, ET C'EST LA CONDITION POUR QUE CE SOIT TESTÉ ─────────────────────
 * Zéro import : ni React, ni react-native, ni expo, ni Supabase. `lib/auth.ts`
 * importe `expo-apple-authentication` AU NIVEAU MODULE — un module qui en
 * dépend n'est pas typecheckable sous Deno, donc pas testable par
 * `npm run test:mobile`. Le TYPE du motif vit donc ICI et les deux variantes de
 * `lib/auth` (native et web) le RÉEXPORTENT : une seule définition, deux
 * plateformes, et une divergence de moins à surveiller.
 */

/**
 * Les motifs d'échec, UNION des deux plateformes. `web_unsupported` ne peut pas
 * sortir du chemin natif et `apple_not_available` ne sort pas du web — mais un
 * ÉCRAN ne sait pas sur quelle cible il tourne, et n'a pas à le savoir.
 */
export type AuthFailureReason2026 =
  | 'supabase_not_configured' // O1 : pas de backend → mode dev, carte en accès direct
  | 'google_not_configured' // O2 : aucun client id Google POUR CETTE plateforme
  | 'apple_not_available' // le système ne propose pas Sign in with Apple ici
  | 'cancelled' // l'utilisateur a fermé la feuille d'auth — jamais un mur (§4.1)
  | 'no_identity_token'
  | 'auth_error'
  /** Propre au web : le fournisseur n'a aucun chemin utilisable ici. */
  | 'web_unsupported';

export type AuthResult2026 =
  | { ok: true }
  | { ok: false; reason: AuthFailureReason2026; message?: string };

/**
 * UNE ANNULATION N'EST PAS UN ÉCHEC. Fermer la feuille Apple ou la popup Google
 * est un geste banal, volontaire, non erroné : le joueur qui change d'avis ne
 * doit pas lire « Connexion impossible. Réessaie », qui lui impute une panne
 * inexistante. `web_unsupported` non plus n'est pas une panne : c'est l'absence
 * d'un chemin, et l'écran ne peint alors tout simplement pas ce fournisseur.
 *
 * ⚠️ LES DEUX PLATEFORMES NE DISAIENT PAS LA MÊME CHOSE. `lib/auth.ts`
 * documentait « sans oublier `web_unsupported` » mais ne testait QUE
 * `'cancelled'` ; `lib/auth.web.ts` testait les deux. La règle vit désormais à
 * un seul endroit, et les deux fichiers l'appellent.
 *
 * Contrat : `true` ⇒ l'écran ne montre AUCUN message d'erreur, et il ne sort pas
 * non plus (rien n'a réussi) — il reste exactement où il était.
 */
export function isSilentFailure2026(result: AuthResult2026): boolean {
  return !result.ok && (result.reason === 'cancelled' || result.reason === 'web_unsupported');
}

/**
 * LA VOIX de l'échec — ce que l'écran doit DIRE, jamais le message serveur brut
 * (cahier G02 : « Pas de message serveur brut »).
 *
 *  · `'silent'`                — rien à dire (voir `isSilentFailure2026`) ;
 *  · `'apple_unavailable'`     — capacité absente sur CET appareil. Réessayer ne
 *                                changera rien : on nomme l'autre porte ;
 *  · `'google_not_configured'` — O2, même logique ;
 *  · `'no_backend'`            — O1. Ne devrait jamais atteindre un écran de
 *                                compte (il redirige avant), mais un motif qui
 *                                existe se traite : sinon il finit en « réessaie » ;
 *  · `'generic'`               — panne réelle : jeton refusé, réseau, absence de
 *                                token. Réessayer a du sens, et on le dit.
 */
export type AuthFailureVoice2026 =
  | 'silent'
  | 'apple_unavailable'
  | 'google_not_configured'
  | 'no_backend'
  | 'generic';

export function authFailureVoice2026(result: AuthResult2026): AuthFailureVoice2026 | null {
  if (result.ok) return null;
  if (isSilentFailure2026(result)) return 'silent';
  if (result.reason === 'apple_not_available') return 'apple_unavailable';
  if (result.reason === 'google_not_configured') return 'google_not_configured';
  if (result.reason === 'supabase_not_configured') return 'no_backend';
  return 'generic';
}
