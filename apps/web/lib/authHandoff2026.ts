/**
 * GRYD — LA REMISE DE SESSION, CÔTÉ PAGE WEB. PURE.
 *
 * ═══ LA DEMANDE DU FONDATEUR, MOT POUR MOT (12/09/2026) ════════════════════
 * « vas juste vers une page qui dit que ça a été bien validé mais derrière il
 * faut que le compte fonctionne dans l'application ».
 *
 * ═══ CE QUE CE LOT CHANGE, ET POURQUOI IL RENVERSE UNE DÉCISION DE E4 ══════
 * L'en-tête de `authCallbackLink2026.ts` explique, avec trois arguments, que
 * cette page NE DOIT PAS vérifier le haché : il ne sert qu'une fois, et le
 * consommer ici le rendrait mort pour l'app. Cet argument était juste, et il
 * reposait sur une hypothèse : que l'app, elle, puisse recevoir le lien. Elle
 * ne le peut pas — le lien universel exige la capacité Apple « Associated
 * Domains », absente du profil de signature (build `fe030292` ERRORED). Sur un
 * vrai iPhone, aujourd'hui, le clic ouvre Safari, et le haché reste intact…
 * pour personne.
 *
 * E5 lève l'hypothèse plutôt que la conclusion. La page vérifie — donc elle
 * consomme le haché — MAIS elle ne garde rien : elle DÉPOSE son jeton de
 * rafraîchissement contre `sha256(nonce)` (migration 0198) et se déconnecte.
 * L'app, restée sur « Lien envoyé », vient le chercher avec le nonce qu'elle a
 * elle-même tiré. Le haché sert toujours une seule fois, simplement il sert à
 * quelqu'un.
 *
 * ⚠️ ET SEULEMENT QUAND LE NONCE EST LÀ. Sans `?n=…` — un lien parti avant ce
 * lot, encore valide une heure — la page ne vérifie RIEN et retombe mot pour
 * mot sur le comportement E4 (`readAuthCallbackLink2026` et son bouton
 * « Ouvrir GRYD »). Casser ces liens-là pour installer le nouveau chemin serait
 * casser des courriers déjà dans des boîtes mail.
 *
 * ═══ POURQUOI CE MODULE EST SÉPARÉ DE LA PAGE ══════════════════════════════
 * La page est un composant client : ni Deno ni un rendu statique ne peuvent la
 * jouer. La DÉCISION — « que contient cette adresse, et qu'a-t-on le droit d'en
 * conclure ? » — n'a besoin ni de React ni du DOM. Elle vit ici, elle est
 * testée (`authHandoff2026.test.ts`, joué par `npm run test:web`), et la page
 * ne fait que l'exécuter. Une condition écrite au milieu d'un JSX n'aurait
 * jamais été rejouable sans ouvrir un e-mail.
 *
 * ═══ CE QUE CE MODULE REFUSE DE FAIRE ══════════════════════════════════════
 *  1. DEVINER UN SUCCÈS. Un `token_hash` n'est JAMAIS une félicitation tant que
 *     `verifyOtp` n'a pas répondu : rien n'est vérifié quand cette page se
 *     peint. Le verdict « validé » n'existe qu'APRÈS la réponse du serveur.
 *  2. CONFONDRE EXPIRÉ ET CASSÉ. Un lien périmé se redemande ; un lien invalide
 *     ne se redemande pas de la même manière. Même séparation qu'en E4.
 *  3. JOURNALISER QUOI QUE CE SOIT. Cette adresse porte un haché à usage unique
 *     ET un nonce de remise : ni trace, ni analytics, ni titre de page.
 */
import { AUTH_HANDOFF_2026, AUTH_HANDOFF_NONCE_PARAM_2026 } from '@klaim/shared';
import {
  readAuthCallbackLink2026,
  type AuthCallbackLinkLocation,
  type AuthCallbackLinkView,
} from './authCallbackLink2026';

/**
 * Longueur MINIMALE, en caractères, d'un nonce accepté ici.
 *
 * Dérivée de `AUTH_HANDOFF_2026.nonceBytes` — la même source que l'app qui le
 * tire et que la migration 0198 qui le hache. La borne HAUTE (128) est celle de
 * 0198 : au-delà, la base refuserait, et accepter ici ce que le serveur
 * refusera là-bas ferait une page qui promet une remise impossible.
 */
export const HANDOFF_NONCE_MIN_LENGTH_2026 = AUTH_HANDOFF_2026.nonceBytes * 2;
export const HANDOFF_NONCE_MAX_LENGTH_2026 = 128;

const NONCE_RE = /^[0-9a-f]+$/;

/**
 * Les types de lien que `verifyOtp` sait échanger contre une session.
 *
 * Fermé, et c'est la garde : une valeur inconnue ne part PAS au serveur — elle
 * fait retomber la page sur le parcours E4, qui, lui, ne consomme rien. Copie
 * de la liste `EmailOtpType` de `@supabase/supabase-js`, tenue ici pour que ce
 * module reste pur (aucun import du SDK).
 */
export const HANDOFF_OTP_TYPES_2026 = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
] as const;
export type HandoffOtpType2026 = (typeof HANDOFF_OTP_TYPES_2026)[number];

/** Ce que la page lit de `window.location`. Rien d'autre n'entre ici. */
export type HandoffLocation2026 = AuthCallbackLinkLocation;

/**
 * LE PLAN DE LA PAGE. Deux modes, jamais un troisième.
 *  · `handoff` — l'adresse porte un nonce ET un haché : la page vérifie, dépose
 *    et félicite. C'est le parcours de E5 ;
 *  · `link`    — tout le reste (pas de nonce, pas de haché, une erreur, un
 *    fragment de session, un code PKCE) : la page se comporte comme en E4, et
 *    le verdict vient de `readAuthCallbackLink2026`, inchangé.
 */
export type HandoffPlan2026 =
  | {
      readonly mode: 'handoff';
      readonly nonce: string;
      readonly tokenHash: string;
      readonly type: HandoffOtpType2026;
    }
  | { readonly mode: 'link'; readonly view: AuthCallbackLinkView };

function paramsFrom(part: string | null | undefined): URLSearchParams {
  if (!part) return new URLSearchParams();
  return new URLSearchParams(part.replace(/^[?#]/, ''));
}

/**
 * Le nonce porté par l'adresse, ou `null`. PURE.
 *
 * La FORME est vérifiée ici, et elle est exactement celle que 0198 acceptera :
 * hexadécimal minuscule, de `HANDOFF_NONCE_MIN_LENGTH_2026` à 128 caractères.
 * Laisser passer une autre forme ferait partir un dépôt que la base refuserait,
 * après avoir consommé le haché — le pire des deux mondes.
 */
export function handoffNonce2026(location: HandoffLocation2026): string | null {
  const query = paramsFrom(location.search);
  const fragment = paramsFrom(location.hash);
  const value = query.get(AUTH_HANDOFF_NONCE_PARAM_2026) ?? fragment.get(AUTH_HANDOFF_NONCE_PARAM_2026);
  if (value === null) return null;
  const nonce = value.trim();
  if (nonce.length < HANDOFF_NONCE_MIN_LENGTH_2026) return null;
  if (nonce.length > HANDOFF_NONCE_MAX_LENGTH_2026) return null;
  return NONCE_RE.test(nonce) ? nonce : null;
}

/**
 * Lit l'adresse et décide ce que la page a le droit de faire. PURE.
 *
 * ⚠️ L'ERREUR PASSE AVANT TOUT. Quand GoTrue a déjà refusé (`error_code=…`), il
 * n'y a rien à vérifier : on ne consomme pas, on retombe sur le verdict E4, qui
 * sait dire « expiré » plutôt que « cassé ».
 */
export function handoffPlan2026(location: HandoffLocation2026): HandoffPlan2026 {
  const view = readAuthCallbackLink2026(location);
  // ① Un refus serveur, une session déjà ouverte, un code PKCE : rien à faire
  //    de plus que ce que E4 faisait déjà.
  if (view.kind !== 'token_hash') return { mode: 'link', view };

  const nonce = handoffNonce2026(location);
  if (nonce === null) return { mode: 'link', view };

  const query = paramsFrom(location.search);
  const fragment = paramsFrom(location.hash);
  const tokenHash = (query.get('token_hash') ?? fragment.get('token_hash') ?? '').trim();
  if (tokenHash.length === 0) return { mode: 'link', view };

  const rawType = (query.get('type') ?? fragment.get('type') ?? '').trim();
  if (!(HANDOFF_OTP_TYPES_2026 as readonly string[]).includes(rawType)) {
    // Sans type utilisable, `verifyOtp` ne saurait pas quel jeton chercher :
    // on préfère ne rien consommer et tendre le bouton E4.
    return { mode: 'link', view };
  }

  return { mode: 'handoff', nonce, tokenHash, type: rawType as HandoffOtpType2026 };
}

/**
 * Le lien vient-il de CRÉER le compte ? PURE.
 *
 * `signup` est le seul type qui autorise « Félicitations, ton compte est créé ».
 * `invite` fait exister un compte lui aussi, mais personne n'en émet dans GRYD
 * (aucun code n'appelle `inviteUserByEmail`) : le classer « retour » est le
 * choix prudent — accueillir quelqu'un qu'on félicite serait moins grave que
 * féliciter quelqu'un qui revient, et c'est cette asymétrie qui tranche.
 */
export function handoffIsNewAccount2026(type: HandoffOtpType2026): boolean {
  return type === 'signup';
}

/**
 * Le refus du serveur, classé en DEUX, jamais en un. PURE.
 *
 * Mêmes mots-clés que `readAuthCallbackLink2026` et que `linkVerdictFromParams`
 * côté mobile : c'est `error_description` / `msg` de GoTrue qui porte le mot
 * « expired ». Un lien périmé se redemande ; un lien refusé pour autre chose ne
 * se redemande pas de la même manière, et confondre les deux fait brûler un
 * quota d'envoi pour rien.
 */
export function handoffFailureKind2026(message: string | null | undefined): 'expired' | 'failed' {
  if (typeof message !== 'string') return 'failed';
  const lower = message.toLowerCase();
  return lower.includes('expired') || lower.includes('invalid or has expired') ? 'expired' : 'failed';
}

/**
 * L'ADRESSE PROPRE QUI REMPLACE CELLE-CI DANS L'HISTORIQUE. PURE.
 *
 * L'adresse ouverte porte un haché à usage unique ET un nonce de remise. Les
 * laisser dans la barre d'adresse, c'est les laisser dans l'historique, dans une
 * capture d'écran, dans un « partager cette page ». On les retire dès qu'ils
 * ont été LUS — `history.replaceState` ne recharge rien et n'ajoute aucune
 * entrée.
 *
 * ⚠️ CE QUE CE NETTOYAGE NE FAIT PAS, ET IL FAUT LE DIRE : la requête HTTP est
 * DÉJÀ partie avec sa query. L'hébergeur du site a pu la voir. C'est une
 * propriété du lien de E4 (le haché y voyage aussi), pas une régression de E5 —
 * et c'est pour ça que la remise vit cinq minutes et ne sert qu'une fois.
 */
export function handoffCleanUrl2026(pathname: string | null | undefined): string {
  const path = typeof pathname === 'string' && pathname.length > 0 ? pathname : '/callback';
  return path.split('?')[0]?.split('#')[0] ?? '/callback';
}
