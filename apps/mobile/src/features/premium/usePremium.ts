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
import { useSession } from '../../lib/session';
import {
  configurePurchases,
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
  readOffers,
  yearlySavingsPercent,
  type OfferPeriod,
  type PackageLike,
  type PremiumOffer,
} from './offerings';
import type { PurchaseBlockedReason } from './capability';

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
  | { readonly kind: 'failed' };

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

  const capability = useMemo(() => purchasesCapability(), []);
  const [status, setStatus] = useState<PremiumStatus>('loading');
  const [offering, setOffering] = useState<readonly PackageLike[] | null>(null);
  const [offers, setOffers] = useState<readonly PremiumOffer[]>([]);
  const [selected, setSelected] = useState<OfferPeriod | null>(null);
  const [info, setInfo] = useState<CustomerInfoLike | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [lastResult, setLastResult] = useState<PremiumActionResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /** Empêche un `setState` après démontage (écran quitté pendant la requête). */
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (sessionLoading) {
        setStatus('loading');
        return;
      }
      if (!capability.available) {
        setStatus('unavailable');
        return;
      }
      if (userId === null) {
        // Pas de compte : rien à lire, et surtout rien à vendre (cf. entête).
        setStatus('signedOut');
        return;
      }
      setStatus('loading');
      const configured = await configurePurchases(userId);
      if (cancelled) return;
      if (!configured) {
        setStatus('error');
        return;
      }
      try {
        const [current, customerInfo] = await Promise.all([
          fetchCurrentOffering(),
          fetchCustomerInfo(),
        ]);
        if (cancelled) return;
        const read = readOffers(current);
        setOffering(current?.availablePackages ?? null);
        setOffers(read);
        setSelected(defaultOfferPeriod(read));
        setInfo(customerInfo);
        setStatus(read.length === 0 ? 'empty' : 'ready');
      } catch {
        if (cancelled) return;
        // On ne sait pas s'il existe des offres : on n'en invente aucune.
        setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [capability, sessionLoading, userId, reloadKey]);

  const pro = useMemo<ProStatus | null>(
    () => (info ? readProStatus(info, PRO_ENTITLEMENT_ID, Date.now()) : null),
    [info],
  );

  /**
   * E75. On distingue « pas lu » de « lu et vide » à la source : sans
   * `allPurchaseDatesByProduct`, le SDK n'a rien dit — `null`. Avec le champ,
   * même vide, il a répondu — tableau (éventuellement vide).
   */
  const purchases = useMemo<readonly PurchaseRecord[] | null>(() => {
    if (!info || info.allPurchaseDatesByProduct == null) return null;
    return readPurchaseHistory(info);
  }, [info]);

  const selectedOffer = useMemo(
    () => offers.find((o) => o.period === selected) ?? null,
    [offers, selected],
  );

  /** Le package SDK correspondant à l'offre choisie (identité par packageId). */
  const selectedPackage = useMemo<PackageLike | null>(() => {
    if (!selectedOffer || !offering) return null;
    return offering.find((p) => p.identifier === selectedOffer.packageId) ?? null;
  }, [offering, selectedOffer]);

  const purchaseSelected = useCallback(async (): Promise<PremiumActionResult | null> => {
    if (busy !== null) return null;
    // Garde de dernier recours : aucun achat sans PRIX CONNU (offerings.ts).
    if (!selectedOffer || !isPurchasable(selectedOffer) || !selectedPackage) return null;
    setBusy('purchase');
    setLastResult(null);
    const outcome = await purchasePremiumPackage(selectedPackage);
    if (!alive.current) return null;
    setBusy(null);
    if (outcome.kind === 'purchased') {
      setInfo(outcome.customerInfo);
      // ── ON RELIT LE DROIT, ON NE LE DÉDUIT PAS DU SILENCE DU SDK ─────────
      // Exactement le contrôle que `restore` faisait déjà 30 lignes plus bas
      // (`readProStatus(...)`) : le module savait vérifier, et ne vérifiait pas
      // sur le seul chemin où de l'argent est engagé. C'est la MÊME lecture que
      // celle qui pilote `ProBanner` — les deux ne peuvent donc plus diverger.
      const granted = readProStatus(outcome.customerInfo, PRO_ENTITLEMENT_ID, Date.now());
      const result: PremiumActionResult =
        granted.kind === 'active' ? { kind: 'purchased' } : { kind: 'purchase_pending' };
      setLastResult(result);
      return result;
    }
    // 'cancelled' : aucun message, aucun event — fermer la feuille du Store
    // n'est pas une panne (même doctrine que `isSilentFailure`, lib/auth.ts).
    if (outcome.kind === 'failed') {
      const result: PremiumActionResult = { kind: 'failed' };
      setLastResult(result);
      return result;
    }
    return null;
  }, [busy, selectedOffer, selectedPackage]);

  const restore = useCallback(async (): Promise<PremiumActionResult | null> => {
    if (busy !== null) return null;
    setBusy('restore');
    setLastResult(null);
    const outcome = await restorePremiumPurchases();
    if (!alive.current) return null;
    setBusy(null);
    if (outcome.kind !== 'restored') {
      const result: PremiumActionResult = { kind: 'failed' };
      setLastResult(result);
      return result;
    }
    setInfo(outcome.customerInfo);
    const restored = readProStatus(outcome.customerInfo, PRO_ENTITLEMENT_ID, Date.now());
    const result: PremiumActionResult =
      restored.kind === 'active' ? { kind: 'restored' } : { kind: 'nothing_to_restore' };
    setLastResult(result);
    return result;
  }, [busy]);

  const select = useCallback((period: OfferPeriod) => setSelected(period), []);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    status,
    blockedReason: capability.available ? null : capability.reason,
    canSignIn: configured && userId === null && !sessionLoading,
    offers,
    selected,
    selectedOffer,
    savingsPercent: yearlySavingsPercent(offers),
    pro,
    purchases,
    managementUrl: info ? managementUrlOf(info) : null,
    busy,
    lastResult,
    select,
    reload,
    purchaseSelected,
    restore,
  };
}
