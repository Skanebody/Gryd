/**
 * GRYD — LE CODE DE PARRAINAGE REÇU AVANT D'AVOIR UN COMPTE.
 *
 * Même patron que `features/crew/pendingInvite.ts`, et pour la même raison :
 * quelqu'un ouvre `gryd://r/<code>` sans être inscrit. On ne peut pas nouer le
 * lien (la RPC exige `auth.uid()`), donc on MÉMORISE, on envoie créer un compte,
 * et on REPREND dès que la session existe.
 *
 * ─── POURQUOI 7 JOURS, ET PAS LES 24 h DE L'INVITE CREW ─────────────────────
 * L'invite crew fait entrer dans un groupe : une invitation vieille d'une
 * semaine n'en est plus une, et faire entrer quelqu'un sur la foi d'un lien
 * oublié serait une surprise. Un code de parrainage, lui, ne change RIEN à ce
 * qu'on voit ni à qui l'on parle : il ouvre une récompense pour deux personnes.
 * Sa péremption naturelle est celle du serveur — `REFERRAL_REDEEM_MAX_ACCOUNT_
 * AGE_DAYS` (0186 refuse au-delà). Aligner l'intention sur cette borne évite le
 * seul cas absurde : une intention encore valide que le serveur refuserait
 * quand même, ou l'inverse.
 *
 * DOCTRINE : aucune décision ici. `redeem_referral_code_2026` tranche seule, et
 * ses six refus sont typés. Ce module transporte un code, il ne l'honore pas.
 *
 * ZÉRO-CRASH : stockage illisible ou absent ⇒ « pas de code en attente », jamais
 * une exception. L'app doit démarrer même si AsyncStorage est mort.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { normalizeReferralCode, parseRedeemResult2026 } from './referral2026';

const STORAGE_KEY = 'gryd.pendingReferral.v1';

/** La borne du serveur, pas une durée inventée ici (voir l'en-tête). */
export const PENDING_REFERRAL_TTL_MS = REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;

/** Une intention expire-t-elle ? (pur, testable sans horloge réelle). */
export function isReferralIntentExpired(storedAt: number, now: number): boolean {
  if (!Number.isFinite(storedAt)) return true;
  const age = now - storedAt;
  // Une horloge qui recule (fuseau, réglage manuel) ⇒ on ne fait pas confiance.
  return age < 0 || age > PENDING_REFERRAL_TTL_MS;
}

interface StoredReferral {
  code: string;
  /** Epoch ms de la mise en attente. */
  at: number;
}

function parseStored(raw: string | null): StoredReferral | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const code = normalizeReferralCode(typeof record.code === 'string' ? record.code : null);
    const at = typeof record.at === 'number' ? record.at : NaN;
    if (!code || !Number.isFinite(at)) return null;
    return { code, at };
  } catch {
    return null;
  }
}

/**
 * Mémorise le code du visiteur non connecté. Rend `false` si le stockage est
 * indisponible — l'appelant continue quand même vers la porte de compte : la
 * personne pourra toujours saisir le code à la main, jamais un cul-de-sac.
 */
export async function rememberPendingReferral(code: string, now: number = Date.now()): Promise<boolean> {
  const clean = normalizeReferralCode(code);
  if (!clean) return false;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ code: clean, at: now }));
    return true;
  } catch {
    return false;
  }
}

/** Efface l'intention (abandon, expiration, consommation). */
export async function clearPendingReferral(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage mort : rien à purger de toute façon.
  }
}

/**
 * Lecture + purge ATOMIQUE. Le code est retiré AVANT d'être rendu, y compris
 * expiré ou illisible : une intention ne doit jamais pouvoir être rejouée. Deux
 * reprises concurrentes produiraient deux saisies, dont une refusée
 * `already_referred` — un faux échec sous les yeux de quelqu'un qui vient
 * pourtant de réussir.
 */
let consuming: Promise<string | null> | null = null;

export function consumePendingReferral(now: number = Date.now()): Promise<string | null> {
  if (consuming) return consuming;
  consuming = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      await clearPendingReferral();
      const stored = parseStored(raw);
      if (!stored) return null;
      if (isReferralIntentExpired(stored.at, now)) return null;
      return stored.code;
    } catch {
      return null;
    } finally {
      consuming = null;
    }
  })();
  return consuming;
}

// ─── Reprise après authentification ──────────────────────────────────────────

/**
 * UNE seule tentative par lancement d'app. Un refus (compte déjà parrainé, code
 * inconnu) ne se rejoue pas en boucle : l'intention est consommée, la personne
 * reste dans l'app, et `/parrainage` porte le champ de saisie manuelle.
 */
let resumeAttempted = false;

/** Remet le compteur à zéro (déconnexion, tests). */
export function resetReferralResumeGuard(): void {
  resumeAttempted = false;
}

/**
 * Reprend l'intention : consomme le code, appelle la RPC arbitrée serveur, puis
 * ramène TOUJOURS la personne sur `/parrainage` — succès OU refus.
 *
 * Toujours, parce que l'écran d'atterrissage a promis « le code sera appliqué
 * tout seul » : sortir en silence sur un refus laisserait quelqu'un qui vient
 * de créer un compte POUR ce parrainage sans parrain et sans explication.
 * `/parrainage` sait afficher l'état réel, y compris le refus exact.
 */
export async function resumePendingReferral(): Promise<void> {
  if (resumeAttempted) return;
  resumeAttempted = true;
  const code = await consumePendingReferral();
  if (!code || !supabase) return;
  const openReferral = (refusal?: string): void => {
    router.push({ pathname: '/parrainage', params: refusal === undefined ? {} : { refus: refusal } });
  };
  try {
    const { data, error } = await supabase.rpc('redeem_referral_code_2026', { p_code: code });
    if (error) { openReferral('network'); return; }
    const result = parseRedeemResult2026(data);
    openReferral(result.ok ? undefined : result.reason);
  } catch {
    openReferral('network');
  }
}

/**
 * Branche la reprise LÀ OÙ la session devient réellement valide. Appelé une
 * fois depuis le layout racine (toujours monté) — surtout pas depuis un écran :
 * l'écran d'atterrissage est démonté par la redirection post-inscription à
 * l'instant précis où la session arrive, et un effet posé là ne s'exécuterait
 * jamais. Sans backend (O1), no-op.
 */
export function startPendingReferralWatcher(): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') { resetReferralResumeGuard(); return; }
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      void resumePendingReferral();
    }
  });
  return () => data.subscription.unsubscribe();
}
