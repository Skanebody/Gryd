/**
 * GRYD — CE QUE JE PORTE : une seule lecture, partagée par tous les écrans.
 *
 * ─── POURQUOI UN MAGASIN PARTAGÉ, ET PAS UN HOOK PAR ÉCRAN ──────────────────
 * L'équipement est lu par la carte (le pin, la trace), par le profil (le nom,
 * le cadre, la bannière, le titre) et par la collection (la liste). Trois hooks
 * indépendants, c'est trois appels RPC au même moment, et surtout TROIS ÉTATS
 * qui peuvent diverger d'une fraction de seconde : on verrait le nouveau cadre
 * sur le profil et l'ancien pin sur la carte. Un magasin unique règle les deux.
 *
 * `useSyncExternalStore` plutôt qu'un contexte : aucun écran n'a à être
 * enveloppé, et la carte — qui n'est sous aucun fournisseur de ce lot — lit la
 * même source que le reste.
 *
 * ─── CE QUI SE PASSE QUAND LE SERVEUR EST EN RETARD ─────────────────────────
 * Un build posé sur un serveur sans 0180 reçoit une erreur de RPC. L'état
 * devient `unavailable` — jamais `ready` avec un équipement vide, qui ferait
 * croire que le joueur a tout retiré. Les écrans, eux, peignent l'objet LIVRÉ
 * AVEC LE COMPTE (`equippedCosmetic2026` retombe dessus) : l'app garde
 * exactement l'apparence qu'elle avait avant ce lot, ce qui est la vérité.
 *
 * ─── L'IDENTITÉ NE DÉBORDE PAS ──────────────────────────────────────────────
 * Toute réponse est estampillée du compte qui l'a demandée. Une déconnexion
 * suivie d'une reconnexion pendant une lecture ne peut pas peindre le cadre du
 * compte précédent : la réponse est jetée si le propriétaire a changé.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  NO_COSMETICS_EQUIPPED_2026, parseEquippedCosmetics2026,
  type CosmeticSlot2026, type EquippedCosmetics2026,
} from './cosmetics2026';

export type CosmeticsStatus2026 = 'loading' | 'signedOut' | 'ready' | 'unavailable';

/** Les issues NOMMÉES d'un équipement. Chacune a sa phrase, aucune n'en partage. */
export type CosmeticEquipResult2026 =
  /** Le serveur a enregistré. */
  | 'saved'
  /** Le serveur a refusé : l'objet n'est pas obtenu. L'écran s'est trompé. */
  | 'not_unlocked'
  /** L'objet n'existe pas côté serveur (build en avance sur la base). */
  | 'unknown'
  /** Aucun compte : un objet s'attache à un compte, pas à un téléphone. */
  | 'signed_out'
  /** Le réseau ou la base n'a pas répondu. On ne sait pas, et on le dit. */
  | 'failed';

interface CosmeticsState2026 {
  readonly ownerId: string | null;
  readonly status: CosmeticsStatus2026;
  readonly equipped: EquippedCosmetics2026;
}

let state: CosmeticsState2026 = { ownerId: null, status: 'loading', equipped: NO_COSMETICS_EQUIPPED_2026 };
const listeners = new Set<() => void>();
let inFlight: string | null = null;

function publish(next: CosmeticsState2026): void {
  state = next;
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

async function load(ownerId: string | null): Promise<void> {
  if (!ownerId) { publish({ ownerId: null, status: 'signedOut', equipped: NO_COSMETICS_EQUIPPED_2026 }); return; }
  if (!supabase) { publish({ ownerId, status: 'unavailable', equipped: NO_COSMETICS_EQUIPPED_2026 }); return; }
  if (inFlight === ownerId) return;
  inFlight = ownerId;
  try {
    const result = await supabase.rpc('get_profile_cosmetics_2026');
    // La réponse d'un compte qu'on a quitté ne peint rien.
    if (inFlight !== ownerId) return;
    publish(result.error
      ? { ownerId, status: 'unavailable', equipped: NO_COSMETICS_EQUIPPED_2026 }
      : { ownerId, status: 'ready', equipped: parseEquippedCosmetics2026(result.data) });
  } catch {
    if (inFlight === ownerId) publish({ ownerId, status: 'unavailable', equipped: NO_COSMETICS_EQUIPPED_2026 });
  } finally {
    if (inFlight === ownerId) inFlight = null;
  }
}

/** Force une relecture partout — après un équipement, ou un retour au premier plan. */
export function refreshMyCosmetics2026(): void {
  inFlight = null;
  void load(state.ownerId);
}

/**
 * ÉQUIPER. L'écriture passe par la RPC `equip_cosmetic_2026` : le client ne
 * touche JAMAIS la table (ADR : « tout claim est décidé serveur ; écriture
 * client interdite sur les tables de jeu »). Le serveur re-vérifie l'obtention
 * et peut dire non — c'est le cas `not_unlocked`, et l'écran le montre.
 */
export async function equipCosmetic2026(slot: CosmeticSlot2026, itemId: string | null): Promise<CosmeticEquipResult2026> {
  if (!state.ownerId) return 'signed_out';
  if (!supabase) return 'failed';
  const owner = state.ownerId;
  try {
    const result = await supabase.rpc('equip_cosmetic_2026', { p_slot: slot, p_item_id: itemId });
    if (result.error) {
      const message = `${result.error.message} ${result.error.details ?? ''}`;
      if (message.includes('cosmetic_not_unlocked')) return 'not_unlocked';
      if (message.includes('unknown_cosmetic')) return 'unknown';
      if (message.includes('authentication_required')) return 'signed_out';
      return 'failed';
    }
    // Optimiste APRÈS confirmation, jamais avant : on ne peint pas un objet que
    // le serveur n'a pas accepté.
    if (state.ownerId === owner) publish({ ...state, equipped: { ...state.equipped, [slot]: itemId } });
    return 'saved';
  } catch { return 'failed'; }
}

/**
 * Ce que porte le compte connecté. Léger par construction : une RPC qui rend un
 * objet de sept clés au plus, et rien d'autre — pas d'inventaire, pas de
 * catalogue, pas de date. La carte peut donc l'appeler sans coût mesurable.
 */
export function useMyCosmetics2026(): {
  equipped: EquippedCosmetics2026;
  status: CosmeticsStatus2026;
  reload: () => void;
} {
  const { session, loading } = useSession();
  const ownerId = session?.user.id ?? null;
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    if (loading) return;
    if (state.ownerId !== ownerId || state.status === 'loading') {
      inFlight = null;
      void load(ownerId);
    }
  }, [ownerId, loading]);
  const reload = useCallback(() => refreshMyCosmetics2026(), []);
  const own = snapshot.ownerId === ownerId ? snapshot : null;
  return {
    equipped: own?.equipped ?? NO_COSMETICS_EQUIPPED_2026,
    status: loading ? 'loading' : own?.status ?? 'loading',
    reload,
  };
}
