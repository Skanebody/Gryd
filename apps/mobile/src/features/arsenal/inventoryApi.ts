/**
 * GRYD — inventaire joueur live (`user_inventory` + `items`).
 */
import { supabase } from '../../lib/supabase';

export interface UserInventoryRow {
  itemKey: string;
  quantity: number;
  equipped: boolean;
}

export async function fetchUserInventory(userId: string): Promise<UserInventoryRow[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('user_inventory')
    .select('quantity, equipped, items(item_key)')
    .eq('user_id', userId);
  if (error || !Array.isArray(data)) return [];

  return data
    .map((row) => {
      const rawItem = row.items as { item_key: string } | { item_key: string }[] | null;
      const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
      if (!item?.item_key) return null;
      return {
        itemKey: item.item_key,
        quantity: Number(row.quantity),
        equipped: Boolean(row.equipped),
      };
    })
    .filter((row): row is UserInventoryRow => row !== null);
}

/** Clés possédées (quantité > 0) pour fusion avec le catalogue démo. */
export async function fetchOwnedItemKeys(userId: string): Promise<readonly string[]> {
  const rows = await fetchUserInventory(userId);
  return rows.filter((r) => r.quantity > 0).map((r) => r.itemKey);
}

/** Clés d'items équipés côté serveur (`user_inventory.equipped`). */
export async function fetchEquippedItemKeys(userId: string): Promise<readonly string[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('user_inventory')
    .select('equipped, items(item_key)')
    .eq('user_id', userId)
    .eq('equipped', true);
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row) => {
      const rawItem = row.items as { item_key: string } | { item_key: string }[] | null;
      const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
      return item?.item_key ?? null;
    })
    .filter((k): k is string => k !== null);
}

/** Équipe un cosmétique via RPC serveur (un actif par portée). */
export async function equipUserItem(itemKey: string): Promise<boolean> {
  if (supabase === null) return false;
  const { error } = await supabase.rpc('equip_user_item', { p_item_key: itemKey });
  return !error;
}
