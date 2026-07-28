/**
 * GRYD — E72/E73 : les prix de la BOUTIQUE, lus du Store ou pas affichés.
 *
 * Même grammaire d'états que `usePremium` — parce que c'est la même règle :
 * un chargement n'affirme rien, un échec ne se déguise jamais en « pas de
 * prix », et l'absence de produit publié ne se déguise jamais en panne.
 *
 *   · 'unavailable' → la plateforme ou la configuration ne permet AUCUNE
 *                     lecture de prix (web, Expo Go, clé absente). Ce n'est pas
 *                     une panne : sur un navigateur, il n'existe pas de store.
 *   · 'signedOut'   → RevenueCat n'est configuré qu'avec l'identité Supabase du
 *                     joueur (cf. `client.ts`) ; sans compte, on ne configure
 *                     pas le SDK, donc on ne lit aucun prix.
 *   · 'loading'     → en vol. On ne sait pas encore.
 *   · 'error'       → la lecture a ÉCHOUÉ. On ignore s'il existe des prix.
 *   · 'empty'       → LU, et le store ne publie AUCUN des produits demandés —
 *                     c'est l'état réel tant que la boutique n'est pas ouverte
 *                     côté App Store / Play Console.
 *   · 'ready'       → au moins un prix RÉEL, tel que le store l'a formaté.
 *
 * `labelOf` rend `null` dans TOUS les états sauf quand un montant a vraiment
 * été lu pour cette clé. Il n'existe aucun chemin, dans ce fichier, qui rende
 * un montant venu d'ailleurs que du store — c'est la garantie structurelle
 * demandée par la constitution §9.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../lib/session';
import { configurePurchases, fetchStoreProducts, purchasesCapability } from './client';
import { readStorePrices, storePriceOf, type StorePriceMap } from './storePrices';
import type { PurchaseBlockedReason } from './capability';

export type StorePricesStatus =
  | 'unavailable'
  | 'signedOut'
  | 'loading'
  | 'error'
  | 'empty'
  | 'ready';

export interface UseStorePricesResult {
  readonly status: StorePricesStatus;
  /** Renseigné UNIQUEMENT en 'unavailable'. */
  readonly blockedReason: PurchaseBlockedReason | null;
  /** Le prix store d'une clé de catalogue, ou `null`. Jamais un repli. */
  readonly labelOf: (catalogKey: string) => string | null;
}

/**
 * @param catalogKeys clés de catalogue GRYD dont on veut le prix. La liste est
 *        figée par l'appelant (`useMemo`) : elle sert de dépendance d'effet.
 */
export function useStorePrices(catalogKeys: readonly string[]): UseStorePricesResult {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const capability = useMemo(() => purchasesCapability(), []);
  const [status, setStatus] = useState<StorePricesStatus>('loading');
  const [prices, setPrices] = useState<StorePriceMap>(() => new Map());

  // Clé de dépendance stable : la liste peut être recréée à chaque rendu sans
  // relancer une lecture réseau tant que son CONTENU n'a pas changé.
  const keysSignature = catalogKeys.join(',');

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
        setStatus('signedOut');
        return;
      }
      setStatus('loading');
      const ok = await configurePurchases(userId);
      if (cancelled) return;
      if (!ok) {
        setStatus('error');
        return;
      }
      try {
        // ── LES IDENTIFIANTS DEMANDÉS SONT LES CLÉS NUES, ET C'EST LE CONTRAT ─
        // `supabase/functions/rc_webhook/logic.ts` applique un achat en comparant
        // le `product_id` reçu de RevenueCat À L'IDENTIQUE aux SKUs nus
        // (`sku === SKUS.starterPack`, `sku in CREW_BOOSTS`…). Un identifiant
        // store préfixé ne serait donc jamais appliqué côté serveur : demander
        // ici autre chose que la clé nue divergerait du seul appariement qui
        // existe réellement.
        const products = await fetchStoreProducts(
          keysSignature.length === 0 ? [] : keysSignature.split(','),
        );
        if (cancelled) return;
        if (products === null) {
          setStatus('error');
          return;
        }
        const read = readStorePrices(products);
        setPrices(read);
        setStatus(read.size === 0 ? 'empty' : 'ready');
      } catch {
        if (cancelled) return;
        setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [capability, sessionLoading, userId, keysSignature]);

  const labelOf = useMemo(
    () => (catalogKey: string) => (status === 'ready' ? storePriceOf(prices, catalogKey) : null),
    [prices, status],
  );

  return {
    status,
    blockedReason: capability.available ? null : capability.reason,
    labelOf,
  };
}
