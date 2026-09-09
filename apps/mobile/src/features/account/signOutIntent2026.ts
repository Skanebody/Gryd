/**
 * GRYD — QUI A DEMANDÉ CETTE DÉCONNEXION ? Module PUR.
 *
 * ─── LE DÉFAUT (recette du 10/09/2026) ──────────────────────────────────────
 * `supabase-js` émet le MÊME événement, `SIGNED_OUT`, dans deux situations qui
 * n'ont rien à voir :
 *   · le joueur a tapé « Se déconnecter » — il sait ce qu'il vient de faire, et
 *     lui expliquer serait insultant ;
 *   · le rafraîchissement du jeton a échoué (refresh token révoqué, expiré,
 *     horloge décalée, appareil resté hors ligne trop longtemps) — l'app
 *     retombait alors en VISITEUR sans un mot. Le joueur relançait, voyait la
 *     carte d'un inconnu à la place de ses zones, et n'avait aucune raison de
 *     penser à se reconnecter : rien ne le lui disait.
 *
 * `session.tsx` ne peut pas les distinguer depuis l'événement seul. Ce module
 * porte donc l'INTENTION, posée par le seul chemin qui déconnecte volontairement
 * (`lib/auth.ts` / `lib/auth.web.ts`, `signOut()`), et consommée UNE FOIS par le
 * `SIGNED_OUT` qui suit.
 *
 * ─── POURQUOI UN CONSOMMATEUR, ET PAS UN DRAPEAU QU'ON LIT ──────────────────
 * Un drapeau simplement LU resterait vrai après le premier `SIGNED_OUT` : la
 * déconnexion suivante — celle-là subie — serait alors classée « volontaire », et
 * on retomberait exactement sur le silence qu'on corrige. Il se consomme donc,
 * comme un ticket.
 *
 * ⚠️ CE QU'IL N'EST PAS : une sécurité. Il ne protège rien, il n'autorise rien.
 * C'est une note de contexte pour choisir une phrase.
 *
 * PUR (zéro import) : testable sous Deno, contrairement à `lib/auth.ts` qui
 * charge `expo-apple-authentication` au niveau module.
 */

let expected = false;

/**
 * Le joueur vient de demander la déconnexion. À appeler AVANT l'appel réseau :
 * l'événement `SIGNED_OUT` peut arriver pendant l'`await`.
 */
export function markIntentionalSignOut2026(): void {
  expected = true;
}

/**
 * Ce `SIGNED_OUT` était-il demandé ? Consomme l'intention : le suivant repartira
 * de « non demandé ».
 */
export function consumeIntentionalSignOut2026(): boolean {
  const value = expected;
  expected = false;
  return value;
}

/**
 * Oublie une intention qui n'a jamais donné lieu à un `SIGNED_OUT` (échec de
 * l'appel, par exemple) — sinon elle resterait armée et avalerait le silence de
 * la PROCHAINE déconnexion, celle-là subie.
 */
export function forgetIntentionalSignOut2026(): void {
  expected = false;
}
