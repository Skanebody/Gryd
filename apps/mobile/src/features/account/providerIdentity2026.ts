/**
 * GRYD — LE NOM QU'APPLE NE DONNE QU'UNE FOIS.
 *
 * ═══ LE FAIT TECHNIQUE QUI COMMANDE TOUT CE FICHIER ═════════════════════════
 * `AppleAuthentication.signInAsync` renvoie `fullName` UNIQUEMENT au tout
 * premier consentement d'un compte Apple pour une app donnée. À la deuxième
 * connexion, et pour toujours ensuite, le champ vaut `null` — Apple considère
 * que l'app l'a reçu et devait s'en occuper. Le token d'identité, lui, ne le
 * porte pas : Supabase ne peut donc pas le mettre dans `user_metadata`.
 *
 * Autrement dit : si on ne l'attrape pas à cet instant précis, il est perdu, et
 * le joueur devra retaper son propre nom alors qu'il vient de l'accorder.
 *
 * ═══ POURQUOI EN MÉMOIRE, ET PAS SUR LE DISQUE ══════════════════════════════
 * Parce qu'on n'a le droit de RIEN garder d'un nom que personne n'a encore
 * confirmé. Ce nom n'est pas une donnée de compte : c'est une PROPOSITION,
 * vivante le temps du geste qui la suit — l'écran de configuration du profil
 * s'ouvre dans la seconde. Persisté, il deviendrait une donnée conservée sans
 * consentement, dans une app qui promet de n'en garder aucune en trop ; en
 * mémoire, il disparaît avec le processus, et c'est le bon comportement.
 *
 * ═══ CE QU'IL NE FAIT PAS, ET C'EST L'ESSENTIEL ═════════════════════════════
 * Il ne rend RIEN public. Il pré-remplit un champ que le joueur voit, relit, et
 * peut effacer avant de toucher le seul bouton qui enregistre. Le consentement
 * d'Apple porte sur « partager mon nom avec cette app », pas sur « afficher mon
 * nom à tous les joueurs de ma ville » : la deuxième autorisation est le tap
 * sur CONTINUER, et personne d'autre ne peut la donner à sa place.
 *
 * PUR : ni React, ni RN, ni réseau — Deno-testable.
 */
import { sanitizeHandle } from '../social/playerHandle';
import { HANDLE_MIN_LENGTH } from '@klaim/shared';

/**
 * Le nom tel qu'Apple le décompose. Les deux parties sont indépendamment
 * `null` : quelqu'un peut n'accorder que son prénom, ou avoir édité le nom
 * proposé par Apple pour ne garder qu'une initiale.
 */
export interface ProviderFullName2026 {
  readonly givenName?: string | null;
  readonly familyName?: string | null;
}

/**
 * PURE. `{ givenName, familyName }` → nom affichable, ou `null`.
 *
 * Aucun repli inventé : si Apple n'a rien donné, on rend `null` et l'écran
 * demandera. Un « Joueur » posé ici serait un faux nom présenté comme le sien.
 */
export function providerDisplayName2026(name: ProviderFullName2026 | null | undefined): string | null {
  if (!name) return null;
  const parts = [name.givenName, name.familyName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  return parts.join(' ');
}

/**
 * PURE. Nom affiché → @pseudo PROPOSÉ, ou `null` quand rien d'utilisable n'en
 * sort.
 *
 * ⚠️ `null` PLUTÔT QU'UN PSEUDO BANCAL. `sanitizeHandle` supprime tout ce qui
 * n'est pas `a-z0-9_` (base 0011) : « Bø » rend « b », soit un caractère, en
 * dessous de `HANDLE_MIN_LENGTH`. Proposer « b » puis afficher « trop court »
 * sous le champ serait une proposition qui se contredit elle-même. On ne
 * propose que ce qui a une chance d'être accepté ; pour le reste, le champ
 * reste vide et son aide s'affiche normalement.
 *
 * Aucune vérification de disponibilité ici : c'est le serveur qui répond
 * (`check_handle_available`, 0047), et l'écran l'interroge dès la frappe. Ce
 * module ne réserve rien et n'accorde rien.
 */
export function suggestedHandle2026(displayName: string | null): string | null {
  if (displayName === null) return null;
  const handle = sanitizeHandle(displayName.replace(/\s+/g, '_'));
  return handle.length >= HANDLE_MIN_LENGTH ? handle : null;
}

/**
 * LA PROPOSITION EN ATTENTE. Mémoire de module, volontairement : voir l'entête.
 * `null` est l'état normal — il n'y a de nom à proposer qu'entre un premier
 * « Continuer avec Apple » et l'écran de profil qui le consomme.
 */
let pending: string | null = null;

/** Retient le nom accordé au PREMIER consentement Apple. Rien n'est écrit. */
export function rememberProviderName2026(name: ProviderFullName2026 | null | undefined): void {
  const display = providerDisplayName2026(name);
  if (display !== null) pending = display;
}

/**
 * Rend la proposition et l'OUBLIE. Consommer plutôt que lire : une proposition
 * relue à chaque montage ré-écraserait ce que le joueur vient de corriger dans
 * le champ, ce qui est le contraire de « il peut l'effacer avant d'enregistrer ».
 */
export function consumeProviderName2026(): string | null {
  const value = pending;
  pending = null;
  return value;
}

/** Pour les tests, et pour une déconnexion : rien ne survit à un changement de compte. */
export function forgetProviderName2026(): void {
  pending = null;
}
