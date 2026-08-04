/**
 * GRYD — QUELLES PORTES DE CONNEXION SONT RÉELLEMENT OUVERTES. PUR (lot M10).
 *
 * ─── « AUCUN BOUTON MORT », À L'ENDROIT LE PLUS COÛTEUX ─────────────────────
 * Un bouton mort sur la carte fait perdre un tap. Un bouton mort ICI fait
 * perdre le joueur : c'est le seul écran dont on ne ressort pas sans succès.
 * « Continuer avec Apple » peint sur un Android, ou « Google » sans client id
 * configuré, envoie quelqu'un dans une impasse au moment exact où il acceptait
 * de s'engager.
 *
 * La capacité est donc SONDÉE, jamais déduite : `Platform.OS === 'ios'` dit sur
 * quel système on tourne, pas que Sign in with Apple est utilisable (entitlement
 * absent, iOS ancien, simulateur sans compte). `lib/auth` a déjà les sondes ;
 * ce module ne fait qu'en tirer les conséquences, et il le fait PUREMENT pour
 * qu'on puisse tester les combinaisons qu'aucun appareil ne produit tout seul.
 *
 * ─── L'E-MAIL EST LE PLANCHER ───────────────────────────────────────────────
 * Il ne dépend d'aucune plateforme ni d'aucune clé — seulement d'un backend
 * joignable. C'est ce qui garantit qu'il reste TOUJOURS au moins une porte
 * quand il y a un serveur : un écran de connexion sans aucune option n'est pas
 * un écran, c'est un mur.
 */

/** Ce que l'écran de connexion peut réellement proposer. */
export interface SignInDoors {
  readonly apple: boolean;
  readonly google: boolean;
  readonly email: boolean;
}

export interface SignInCapability {
  /** `isSupabaseConfigured` — sans backend, aucune méthode ne peut aboutir. */
  readonly backend: boolean;
  /** `isAppleAuthAvailable()` — sonde SYSTÈME, pas une déduction d'OS. */
  readonly appleAvailable: boolean;
  /** `GOOGLE_CAPABLE` — un client id existe POUR CETTE plateforme. */
  readonly googleConfigured: boolean;
}

/**
 * Capacité réelle → portes à peindre. PURE.
 *
 * Sans backend, AUCUNE porte : les trois échoueraient, et proposer trois
 * impasses vaut moins qu'en proposer zéro et le dire.
 */
export function signInDoors(c: SignInCapability): SignInDoors {
  if (!c.backend) return { apple: false, google: false, email: false };
  return { apple: c.appleAvailable, google: c.googleConfigured, email: true };
}

/** Y a-t-il au moins une porte ? Sinon l'écran doit DIRE pourquoi. */
export function hasAnyDoor(d: SignInDoors): boolean {
  return d.apple || d.google || d.email;
}

/**
 * Ce que l'écran fait d'un résultat d'authentification.
 *
 *   · `enter`   — c'est bon, on entre.
 *   · `stay`    — rien à dire, on ne bouge pas. UNE ANNULATION EST ICI :
 *     fermer la feuille Apple est un geste banal et volontaire ; répondre
 *     « Connexion impossible » imputerait une panne inexistante à quelqu'un qui
 *     a simplement changé d'avis (L19).
 *   · `explain` — un vrai échec, qui se nomme.
 */
export type SignInOutcome = 'enter' | 'stay' | 'explain';

export interface AuthAnswer {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * Résultat → suite. PURE.
 *
 * ⚠️ `cancelled` sort en `stay` AVANT tout traitement d'erreur. C'est la règle
 * que `lib/auth.isSilentFailure` porte déjà ; elle est réappliquée ici pour que
 * l'écran MVP ne la réinvente pas, et un test la verrouille — parce qu'elle se
 * reperd exactement le jour où quelqu'un ajoute un message générique.
 */
export function signInOutcome(answer: AuthAnswer | null | undefined): SignInOutcome {
  if (answer?.ok === true) return 'enter';
  if (answer?.reason === 'cancelled') return 'stay';
  // Pas de réponse du tout : on ne sait pas ce qui s'est passé. Se taire serait
  // laisser quelqu'un devant un bouton qui n'a rien fait de visible.
  return 'explain';
}

/**
 * L'e-mail doit-il être peint comme l'action PRIMAIRE ? PURE.
 *
 * ─── LE DÉFAUT QUE CETTE FONCTION CORRIGE ───────────────────────────────────
 * Constaté en preview le 03/08 : sur le web, ni Apple ni Google ne sont
 * disponibles — l'e-mail était donc la SEULE porte, et il restait peint en lien
 * gris discret. Un écran de connexion sans aucun bouton plein ne montre pas la
 * façon d'entrer : il ressemble à une page qui a raté son chargement, et le seul
 * chemin praticable se lit comme une note de bas de page.
 *
 * ⚠️ C'est l'inverse exact du réflexe habituel. Ailleurs dans l'app, une action
 * secondaire reste TEXTE pour préserver « une seule action primaire » (L2). Ici,
 * quand elle est la seule, la garder discrète ne préserve rien du tout — L2
 * interdit DEUX actions primaires, pas d'en avoir une.
 */
export function emailIsPrimary(d: SignInDoors): boolean {
  return d.email && !d.apple && !d.google;
}
