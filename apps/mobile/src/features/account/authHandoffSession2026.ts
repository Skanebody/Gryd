/**
 * GRYD — LA REMISE DE SESSION : LE CÔTÉ QUI TOUCHE AU DISQUE ET AU RÉSEAU.
 *
 * ═══ LE DÉFAUT DU FONDATEUR (12/09/2026) ════════════════════════════════════
 * « vas juste vers une page qui dit que ça a été bien validé mais derrière il
 * faut que le compte fonctionne dans l'application ».
 *
 * ═══ CE QUE CE MODULE FAIT, ET DANS QUEL ORDRE ══════════════════════════════
 *   ① `rememberHandoff2026` — au moment où l'app demande le lien, elle garde le
 *      nonce qu'elle vient de tirer, l'adresse visée, et l'heure. Sur DISQUE,
 *      pas seulement en mémoire : entre la demande et le clic, il se passe un
 *      aller-retour d'e-mail, et l'OS a tout loisir de tuer l'app ;
 *   ② `claimHandoffSession2026` — l'écran « Lien envoyé » réclame, en boucle.
 *      Quand la base rend un jeton, ce module OUVRE la session ;
 *   ③ `forgetHandoff2026` — dès que la session existe, ou quand le joueur
 *      change d'adresse, l'intention disparaît du disque.
 *
 * ═══ POURQUOI ICI, ET PAS DANS `lib/auth.ts` / `lib/auth.web.ts` ════════════
 * Parce que RIEN de ce fichier n'est natif : `supabase.rpc`, `refreshSession`
 * et AsyncStorage existent à l'identique sur les deux cibles. Le mettre dans
 * les deux `lib/auth*` aurait signifié l'écrire DEUX FOIS — or l'en-tête de
 * `auth.web.ts` documente déjà que « toute évolution de l'un se reporte sur
 * l'autre », c'est-à-dire une parité tenue à la main, qui a déjà lâché une fois
 * (`isSilentFailure`, corrigé le 10/09). Ce qui est commun vit une seule fois.
 * Les deux `lib/auth*` ne gardent que le TIRAGE, qui, lui, diffère vraiment
 * (expo-crypto / WebCrypto).
 *
 * ═══ ZÉRO-CRASH ════════════════════════════════════════════════════════════
 * Stockage illisible, absent, ou refusé : « aucune remise en attente », jamais
 * une exception. L'app doit démarrer même si AsyncStorage est mort — et le pire
 * qui puisse alors arriver, c'est que le joueur retombe sur le parcours E4
 * (la page web et son bouton « Ouvrir GRYD »).
 *
 * ═══ CE QU'IL N'ÉCRIT NULLE PART ═══════════════════════════════════════════
 * Aucun jeton de session ne transite par ce stockage : le nonce n'est PAS un
 * identifiant (c'est un aléa pur), et le jeton de rafraîchissement va
 * directement de la RPC au client Supabase, qui a son propre coffre. Aucun
 * `console.log`, aucun analytics : cette fonction voit passer une clé de
 * session, elle n'en dit rien à personne.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { isHandoffNonce2026, parseHandoffClaim2026 } from './authHandoff2026';
import type { CallbackType2026 } from './welcome2026';

const STORAGE_KEY = 'gryd.authHandoff.v1';

/** La remise que l'app attend : ce qu'elle a tiré, pour qui, et depuis quand. */
export interface PendingHandoff2026 {
  /** Le nonce en clair. Il ne vaut que par le lien parti dans CE courrier. */
  readonly nonce: string;
  /** L'adresse à qui le lien a été envoyé — pour que l'écran la nomme. */
  readonly email: string;
  /** Epoch ms de la demande : c'est de là que part le plafond d'attente. */
  readonly startedAt: number;
}

function parseStored(raw: string | null): PendingHandoff2026 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingHandoff2026> | null;
    if (value === null || typeof value !== 'object') return null;
    if (!isHandoffNonce2026(value.nonce)) return null;
    if (typeof value.email !== 'string' || value.email.length === 0) return null;
    if (typeof value.startedAt !== 'number' || !Number.isFinite(value.startedAt)) return null;
    return { nonce: value.nonce, email: value.email, startedAt: value.startedAt };
  } catch {
    return null;
  }
}

/**
 * Garde la remise en cours. Appelée juste APRÈS que le serveur a accepté
 * d'envoyer le lien — jamais avant : mémoriser une intention pour un courrier
 * qui n'est pas parti ferait attendre l'écran pour rien.
 */
export async function rememberHandoff2026(nonce: string, email: string, now: number): Promise<void> {
  if (!isHandoffNonce2026(nonce)) return;
  const value: PendingHandoff2026 = { nonce, email, startedAt: now };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Le disque a refusé : la remise vivra le temps de l'écran, en mémoire.
    // C'est dégradé, ce n'est pas cassé — et ça ne se dit pas au joueur, qui
    // n'a rien à faire de cette information.
  }
}

/** La remise en attente, ou `null`. Ne lève jamais. */
export async function readHandoff2026(): Promise<PendingHandoff2026 | null> {
  try {
    return parseStored(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Efface l'intention : session ouverte, adresse changée, ou attente abandonnée. */
export async function forgetHandoff2026(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à faire, et rien à dire : au pire l'écran réclamera un nonce déjà
    // consommé, ce que 0198 refuse proprement (`null`).
  }
}

/**
 * Le résultat d'UNE réclamation. Trois cas, et ils ne se confondent pas :
 *  · `claimed`  — la session est ouverte. `type` dit ce que le serveur a nommé ;
 *  · `waiting`  — personne n'a encore ouvert le lien. On réessaiera ;
 *  · `failed`   — le jeton est arrivé mais n'a pas ouvert de session (jeton
 *                 révoqué, réseau coupé au mauvais moment). On ne prétend pas
 *                 que c'est une attente : ça n'a pas marché, et c'est autre
 *                 chose que « pas encore ».
 */
export type HandoffOutcome2026 =
  | { readonly state: 'claimed'; readonly type: CallbackType2026 | null }
  | { readonly state: 'waiting' }
  | { readonly state: 'failed' };

const WAITING: HandoffOutcome2026 = { state: 'waiting' };

/**
 * RÉCLAME UNE FOIS, ET OUVRE LA SESSION SI ELLE EST LÀ.
 *
 * ─── `refreshSession` ET PAS `setSession` ───────────────────────────────────
 * `setSession` exige un `access_token` NON VIDE : il faudrait donc déposer les
 * DEUX jetons en base. On n'en dépose qu'un, parce qu'un jeton de
 * rafraîchissement suffit à en frapper un neuf — et qu'un jeton d'accès de
 * moins qui dort cinq minutes dans une table, c'est une donnée de moins à
 * perdre. `refreshSession({ refresh_token })` fait exactement ça :
 * `POST /auth/v1/token?grant_type=refresh_token`, puis enregistre la session et
 * émet `TOKEN_REFRESHED`, que `lib/session.tsx` écoute déjà (il réagit à TOUT
 * événement, pas au seul `SIGNED_IN`).
 *
 * ─── UN ÉCHEC RÉSEAU N'EST PAS UNE ATTENTE ─────────────────────────────────
 * Si la RPC elle-même échoue (coupure, 503), on rend `waiting` : rien ne prouve
 * que la remise n'existe pas, et la boucle réessaiera dans trois secondes. Si
 * en revanche le JETON est arrivé et que l'ouverture échoue, on rend `failed` :
 * la remise a été CONSOMMÉE (0198 : usage unique), réessayer ne rendra plus
 * rien, et l'écran doit proposer un nouveau lien plutôt que de faire tourner un
 * indicateur pour l'éternité.
 */
/**
 * ⚠️ `onSessionIncoming` N'EST PAS UN CONFORT, C'EST UNE COURSE À FERMER.
 *
 * `refreshSession` fait naître la session AVANT de rendre la main : il émet
 * `TOKEN_REFRESHED`, que `lib/session.tsx` traite pendant l'`await` ci-dessous.
 * L'écran qui appelle cette fonction voit donc, pendant quelques
 * millisecondes, une session ouverte SANS savoir encore qu'il vient de la
 * réclamer — et `app/(auth)/email.tsx` renvoie vers la carte dans ce cas
 * (« ouvert avec une session, rien à faire ici »). Le joueur passerait de sa
 * boîte mail à une carte, sans un mot : exactement le défaut du 12/09.
 *
 * Ce rappel est déclenché AVANT l'appel réseau, de façon SYNCHRONE : quand la
 * session apparaît, l'écran sait déjà qu'elle lui appartient.
 */
export async function claimHandoffSession2026(
  nonce: string,
  onSessionIncoming?: () => void,
): Promise<HandoffOutcome2026> {
  if (!supabase || !isHandoffNonce2026(nonce)) return WAITING;
  let payload: unknown;
  try {
    const { data, error } = await supabase.rpc('auth_handoff_claim_2026', { p_nonce: nonce });
    // Une RPC qui refuse n'a pas dit « pas de remise » : elle n'a rien dit.
    if (error) return WAITING;
    payload = data;
  } catch {
    return WAITING;
  }

  const claim = parseHandoffClaim2026(payload);
  if (claim === null) return WAITING;

  // LE JETON EST LÀ : à partir d'ici, la session qui va apparaître est la
  // NÔTRE. On le dit à l'écran avant même de la demander (voir l'en-tête).
  onSessionIncoming?.();

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: claim.refreshToken,
    });
    if (error || !data.session) return { state: 'failed' };
  } catch {
    return { state: 'failed' };
  }

  // La remise a servi : plus rien à attendre, plus rien à garder.
  await forgetHandoff2026();
  return { state: 'claimed', type: claim.type };
}
