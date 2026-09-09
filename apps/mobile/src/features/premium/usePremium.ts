/**
 * GRYD — PREMIUM : la machine d'états de l'écran E74.
 *
 * ── SIX ÉTATS DISTINCTS, JAMAIS CONFONDUS ──────────────────────────────────
 * Doctrine « l'app ne ment jamais » (CLAUDE.md), même grammaire que
 * `useSectorSnapshots` / `useActiveSeason` :
 *
 *   · 'loading'     → on ne SAIT pas encore (session en restauration, offres en
 *                     vol). Un chargement n'affirme RIEN sur le joueur.
 *   · 'signedOut'   → pas de compte. Ce n'est ni une panne ni une absence
 *                     d'offre : c'est qu'un achat DOIT s'attacher à un compte
 *                     (rc_webhook écrit `users` sur `app_user_id`). Vendre à un
 *                     anonyme encaisserait sans jamais appliquer le droit.
 *   · 'unavailable' → la plateforme ou la configuration rend l'achat impossible
 *                     (web, Expo Go, clé absente). On le DIT, on ne peint aucun
 *                     bouton d'achat — un CTA qui échoue à 100 % est un mensonge.
 *   · 'error'       → la LECTURE a échoué. On ne sait pas s'il y a des offres :
 *                     on n'en affiche aucune ET on propose de réessayer.
 *   · 'empty'       → LU, et le tableau de bord ne publie AUCUNE offre. C'est un
 *                     fait de configuration, pas une panne : « pas encore ouvert ».
 *   · 'ready'       → des offres RÉELLES, avec les prix DU STORE.
 *
 * `pro` (le droit déjà possédé) est orthogonal : il peut être actif alors que
 * les offres n'ont pas chargé, et il vaut `null` tant qu'aucun CustomerInfo n'a
 * été lu — `null` signifie « pas lu », jamais « pas abonné ».
 *
 * ANTI PAY-TO-WIN (§1.6, constitutionnel) : rien de ce que rend ce hook n'entre
 * dans une règle de jeu. Ni capture, ni défense, ni points, ni classement ne
 * lisent `pro`. Un futur `if (pro.kind === 'active')` dans le moteur serait un
 * défaut de conformité, pas une fonctionnalité.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { refreshServerGrydPlusAccess } from './useGrydPlusAccess';
import { useSession } from '../../lib/session';
import {
  observeCustomerInfo,
  fetchCurrentOffering,
  fetchCustomerInfo,
  purchasePremiumPackage,
  purchasesCapability,
  restorePremiumPurchases,
  PRO_ENTITLEMENT_ID,
} from './client';
import { managementUrlOf, readProStatus, type CustomerInfoLike, type ProStatus } from './entitlement';
import { readPurchaseHistory, type PurchaseRecord } from './purchaseHistory';
import {
  defaultOfferPeriod,
  isPurchasable,
  readSubscriptionOffers2026,
  yearlySavingsPercent,
  type OfferPeriod,
  type PackageLike,
  type PremiumOffer,
} from './offerings';
import type { PurchaseBlockedReason } from './capability';
import type { PurchaseFailure2026 } from './purchaseFailure2026';

export type PremiumStatus = 'loading' | 'signedOut' | 'unavailable' | 'error' | 'empty' | 'ready';

/** Résultat de la DERNIÈRE action, pour le message d'écran. Jamais persistant. */
export type PremiumActionResult =
  /** Le Store a accepté ET le droit `gryd_pro` est ACTIF dans le CustomerInfo rendu. */
  | { readonly kind: 'purchased' }
  /**
   * ── AJOUTÉ LE 28/07/2026 : L'ACHAT NON VÉRIFIÉ AVAIT SON PROPRE MENSONGE ──
   * `purchasePackage()` qui ne jette pas ne prouve QUE ceci : la feuille du
   * Store s'est fermée sans erreur. Il ne prouve pas que le droit est ouvert.
   * Deux cas RÉELS le séparent :
   *  · achat DIFFÉRÉ — « Demander à acheter » (contrôle parental iOS) ou une
   *    authentification forte (SCA) : la transaction reste en attente ;
   *  · identifiant d'entitlement DIVERGENT entre le tableau de bord RevenueCat
   *    et `PRO_ENTITLEMENT_ID` : le paiement passe, le droit ne s'allume pas.
   * Dans ces deux cas l'ancien code imprimait « C'est actif. Merci. » pendant
   * que `ProBanner` — piloté par le MÊME CustomerInfo relu par `readProStatus`
   * — restait absent et que les offres restaient peintes. Le même écran
   * affirmait et infirmait. On distingue donc désormais les deux faits.
   */
  | { readonly kind: 'purchase_pending' }
  | { readonly kind: 'restored' }
  /** Restauration honnête : lue, et il n'y avait aucun achat à rendre. */
  | { readonly kind: 'nothing_to_restore' }
  /**
   * ── AJOUTÉS LE 10/09/2026 : G28 NOMME SEPT ÉTATS, ON EN RENDAIT TROIS ─────
   * `cancelled`, `declined` et `already_owned` tombaient tous dans `failed`,
   * et l'écran écrivait « L'action n'a pas abouti. Réessaie ou contacte le
   * support. » pour les trois. Or :
   *  · une ANNULATION n'est pas une panne — rien à réessayer ;
   *  · un REFUS du Store ne se répare pas en réessayant, et surtout pas par le
   *    support de GRYD : le moyen de paiement se règle dans le Store ;
   *  · « DÉJÀ DÉTENU » est un droit existant : inviter à réessayer revient à
   *    proposer de payer deux fois — c'est « Restaurer » qu'il faut proposer.
   * `failed` conserve les échecs réellement anonymes, avec leur cause lue.
   */
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'declined' }
  | { readonly kind: 'already_owned' }
  | { readonly kind: 'failed'; readonly failure?: PurchaseFailure2026 };

export interface UsePremiumResult {
  readonly status: PremiumStatus;
  /** Renseigné UNIQUEMENT en 'unavailable' — l'écran dit la vraie cause. */
  readonly blockedReason: PurchaseBlockedReason | null;
  /**
   * En 'signedOut' : un écran de connexion qui MARCHE existe-t-il ? Sans backend
   * (O1), `/sign-in` n'a personne au bout — on ne peint alors AUCUN bouton
   * (même garde que `app/amis.tsx` et `app/qr.tsx`).
   */
  readonly canSignIn: boolean;
  readonly offers: readonly PremiumOffer[];
  readonly selected: OfferPeriod | null;
  readonly selectedOffer: PremiumOffer | null;
  /** Économie annuelle CALCULÉE, ou null (jamais une fausse remise). */
  readonly savingsPercent: number | null;
  /** `null` = aucun CustomerInfo lu (≠ « pas abonné »). */
  readonly pro: ProStatus | null;
  /**
   * E75 — achats lisibles du CustomerInfo, du plus récent au plus ancien.
   * `null` = AUCUN CustomerInfo lu, ou le SDK n'a pas fourni le champ : dans
   * les deux cas on ne sait pas, et l'écran le dit au lieu d'écrire « aucun
   * achat ». Un tableau VIDE, lui, est un fait : ce compte n'a rien acheté.
   */
  readonly purchases: readonly PurchaseRecord[] | null;
  /** URL de gestion Store, ou null : sans elle, aucun bouton « Gérer ». */
  readonly managementUrl: string | null;
  readonly busy: 'purchase' | 'restore' | null;
  readonly lastResult: PremiumActionResult | null;
  readonly select: (period: OfferPeriod) => void;
  readonly reload: () => void;
  /**
   * Rend le résultat pour que l'ÉCRAN logge ses events §8 (`purchase_completed`)
   * — `null` quand rien ne s'est passé : action déjà en cours, offre non
   * achetable, ou ANNULATION par le joueur (fermer la feuille du Store n'est ni
   * un succès ni une panne, et ne doit donc produire aucun event).
   */
  readonly purchaseSelected: () => Promise<PremiumActionResult | null>;
  readonly restore: () => Promise<PremiumActionResult | null>;
}

export function usePremium(): UsePremiumResult {
  const { session, loading: sessionLoading, configured } = useSession();
  const userId = session?.user?.id ?? null;
  const owner = useRef(userId); owner.current = userId;
  const actionLock = useRef(false);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const capability = useMemo(() => purchasesCapability(), []);
  const [status, setStatus] = useState<PremiumStatus>('loading');
  const [offering, setOffering] = useState<readonly PackageLike[]>([]);
  const [offers, setOffers] = useState<readonly PremiumOffer[]>([]);
  const [selected, setSelected] = useState<OfferPeriod | null>(null);
  const [info, setInfo] = useState<CustomerInfoLike | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [lastResult, setLastResult] = useState<PremiumActionResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(Date.now());
  const alive = useRef(true);
  const reload = useCallback(() => setReloadKey(value => value + 1), []);
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { setNow(Date.now()); reload(); } });
    return () => { alive.current = false; clearInterval(timer); subscription.remove(); };
  }, [reload]);
  useEffect(() => {
    let cancelled = false;
    setInfo(null); setOffers([]); setOffering([]); setSelected(null); setLastResult(null); setBusy(null); setLoadedOwner(null);
    if (sessionLoading) { setStatus('loading'); return; }
    if (!userId) { setStatus('signedOut'); return; }
    if (!capability.available) { setStatus('unavailable'); return; }
    setStatus('loading');
    const unobserve = observeCustomerInfo(userId, customerInfo => {
      if (!cancelled && owner.current === userId) { setInfo(customerInfo); setLoadedOwner(userId); }
    });
    void Promise.allSettled([fetchCurrentOffering(userId), fetchCustomerInfo(userId)]).then(([current, customer]) => {
      if (cancelled || owner.current !== userId) return;
      setLoadedOwner(userId);
      if (customer.status === 'fulfilled') setInfo(customer.value);
      if (current.status !== 'fulfilled') { setStatus('error'); return; }
      const read = readSubscriptionOffers2026(current.value);
      setOffering(current.value?.availablePackages ?? []); setOffers(read); setSelected(defaultOfferPeriod(read));
      setStatus(read.length ? 'ready' : 'empty');
    });
    return () => { cancelled = true; unobserve(); };
  }, [capability, sessionLoading, userId, reloadKey]);
  const ownInfo = loadedOwner === userId ? info : null;
  const ownOffers = loadedOwner === userId ? offers : [];
  const pro = useMemo<ProStatus | null>(() => ownInfo ? readProStatus(ownInfo, PRO_ENTITLEMENT_ID, now) : null, [ownInfo, now]);
  const purchases = useMemo<readonly PurchaseRecord[] | null>(() => ownInfo?.allPurchaseDatesByProduct == null ? null : readPurchaseHistory(ownInfo), [ownInfo]);
  const selectedOffer = ownOffers.find(offer => offer.period === selected) ?? null;
  const selectedPackage = offering.find(pkg => pkg.identifier === selectedOffer?.packageId) ?? null;
  const purchaseSelected = useCallback(async (): Promise<PremiumActionResult | null> => {
    if (actionLock.current || !userId || owner.current !== userId || loadedOwner !== userId || !selectedOffer || selectedOffer.period === 'lifetime' || !isPurchasable(selectedOffer) || !selectedPackage) return null;
    actionLock.current = true; setBusy('purchase'); setLastResult(null);
    const actionOwner = userId;
    const outcome = await purchasePremiumPackage(selectedPackage, actionOwner);
    actionLock.current = false;
    if (!alive.current || owner.current !== actionOwner) return null;
    setBusy(null);
    // Fermer la feuille du Store reste sans event §8 (`purchaseSelected` rend
    // `null`), mais l'écran doit pouvoir l'ACQUITTER : G28 liste « annulé ».
    if (outcome.kind === 'cancelled') { setLastResult({ kind: 'cancelled' }); return null; }
    let result: PremiumActionResult;
    if (outcome.kind === 'purchased') {
      setInfo(outcome.customerInfo); setLoadedOwner(actionOwner);
      const granted = readProStatus(outcome.customerInfo, PRO_ENTITLEMENT_ID, Date.now());
      result = granted.kind === 'active' ? { kind: 'purchased' } : { kind: 'purchase_pending' };
      void refreshServerGrydPlusAccess().catch(() => false);
    } else if (outcome.failure === 'pending') {
      // Achat DIFFÉRÉ remonté en erreur par le SDK : c'est la même attente que
      // `purchase_pending`, pas une panne.
      result = { kind: 'purchase_pending' };
    } else if (outcome.failure === 'already_owned') {
      result = { kind: 'already_owned' };
      void refreshServerGrydPlusAccess().catch(() => false);
    } else if (outcome.failure === 'declined') {
      result = { kind: 'declined' };
    } else result = { kind: 'failed', failure: outcome.failure };
    setLastResult(result); return result;
  }, [userId, loadedOwner, selectedOffer, selectedPackage]);
  const restore = useCallback(async (): Promise<PremiumActionResult | null> => {
    if (actionLock.current || !userId || owner.current !== userId || !capability.available) return null;
    actionLock.current = true; setBusy('restore'); setLastResult(null);
    const actionOwner = userId;
    const outcome = await restorePremiumPurchases(actionOwner);
    actionLock.current = false;
    if (!alive.current || owner.current !== actionOwner) return null;
    setBusy(null);
    let result: PremiumActionResult = { kind: 'failed', failure: outcome.kind === 'failed' ? outcome.failure : undefined };
    if (outcome.kind === 'restored') {
      setInfo(outcome.customerInfo); setLoadedOwner(actionOwner);
      const restored = readProStatus(outcome.customerInfo, PRO_ENTITLEMENT_ID, Date.now());
      result = restored.kind === 'active' ? { kind: 'restored' } : { kind: 'nothing_to_restore' };
      void refreshServerGrydPlusAccess().catch(() => false);
    }
    setLastResult(result); return result;
  }, [userId, capability]);
  return { status: sessionLoading ? 'loading' : !userId ? 'signedOut' : loadedOwner !== userId && capability.available ? 'loading' : status,
    blockedReason: capability.available ? null : capability.reason, canSignIn: configured && !userId && !sessionLoading,
    offers: ownOffers, selected: loadedOwner === userId ? selected : null, selectedOffer, savingsPercent: yearlySavingsPercent(ownOffers), pro, purchases,
    managementUrl: ownInfo ? managementUrlOf(ownInfo) : null, busy, lastResult,
    select: period => { if (period !== 'lifetime') setSelected(period); }, reload, purchaseSelected, restore };
}
