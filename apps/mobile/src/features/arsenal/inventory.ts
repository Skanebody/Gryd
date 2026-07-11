/**
 * GRYD — Inventaire & gifting DÉMO (AMENDEMENT-16 §4, doc §14/§16/§26).
 *
 * État local (offline-first) : possession, équipement par PORTÉE (un seul skin
 * territoire équipé, un seul skin trace, une frame…), Crew Boost actif + timer,
 * et Crew Wall (supporters opt-in). O3 : ces états viendront de `user_inventory`
 * / `crew_inventory` / `crew_boosts` (0014, écriture service_role only —
 * jamais le client). Ici tout est DÉMO déterministe.
 *
 * ANTI PAY-TO-WIN : équiper un skin = personnalisation (§16), jamais un
 * avantage. Un boost n'ajoute QUE de la progression coffre (cosmétique/orga).
 * Le Crew Wall n'affiche JAMAIS de montant ni de classement de payeurs (§14).
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CREW_BOOSTS,
  CREW_BOOST_CHEST_MULTIPLIER,
  type CrewBoostSku,
} from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import {
  ARSENAL_CATALOG,
  itemByKey,
  type ArsenalCatalogItem,
  type ArsenalScope,
} from './catalog';

/** Portées équipables (un seul item actif par portée). */
export type EquipScope = Extract<ArsenalScope, 'zone' | 'route' | 'profile' | 'crew' | 'share'>;

/** Item démarré comme possédé (offert Saison 0 / débloqué en courant). */
export const INITIAL_OWNED: readonly string[] = ARSENAL_CATALOG.filter((i) => i.ownedDemo).map(
  (i) => i.key,
);
const INITIAL_OWNED_SET: ReadonlySet<string> = new Set(INITIAL_OWNED);

/** Équipement initial : les skins offerts sont équipés par défaut (démo). */
export const INITIAL_EQUIPPED: Readonly<Partial<Record<EquipScope, string>>> = {
  route: 'skin_trace_neon_ivory',
  profile: 'frame_road',
  share: 'template_first_zone',
};

/** Soldes offline-first pour tester l'Arsenal sans backend configuré. */
export const DEMO_WALLET = { eclats: 820, foulees: 2140, isClub: false } as const;

export interface ArsenalWallet {
  eclats: number;
  foulees: number;
  isClub: boolean;
}

/**
 * Portée d'équipement d'un item (skins/frames/bannières/blasons). Les
 * consommables et packs ne s'équipent pas.
 */
export function equipScopeOf(key: string): EquipScope | null {
  const item = itemByKey(key);
  if (!item || item.consumable) return null;
  if (item.section === 'skins_territory') return 'zone';
  if (item.section === 'skins_trace') return 'route';
  if (item.section === 'frames') return 'profile';
  if (item.section === 'banners' || item.section === 'emblems') return 'crew';
  if (item.section === 'templates') return 'share';
  return null;
}

/** Libellé humain de la portée (feedback équipement). */
export const EQUIP_SCOPE_LABEL: Record<EquipScope, string> = {
  zone: 'Visible sur ta carte à la Saison 0',
  route: 'Visible sur ta trace à la Saison 0',
  profile: 'Visible sur ta Player Card',
  crew: 'Visible dans le Crew HQ',
  share: 'Appliqué à tes cartes de partage',
};

// ─── Équipement PERSISTÉ (source unique lue par la Player Card) ───────────────
//
// AMENDEMENT-16 §16 : équiper un cosmétique doit avoir un EFFET TANGIBLE. Tant
// que `user_inventory` n'est pas branché (O3), on persiste l'équipement démo en
// local (AsyncStorage, même pattern que src/features/crew/chatStore.ts) pour que
// la Player Card reflète RÉELLEMENT le frame / titre équipé.
//
// STORE EXTERNE PARTAGÉ (useSyncExternalStore, natif React) : l'équipement vit au
// niveau MODULE, un seul état pour tous les abonnés. equip()/unequip() depuis
// /profil-edit notifient l'onglet /profil monté → l'anneau de l'avatar change
// immédiatement au retour, SANS remount (AMENDEMENT-16 §16, retour fondateur).

/** Clé de persistance de l'équipement cosmétique (versionnée). */
const EQUIP_STORAGE_KEY = 'gryd.arsenal.equipped.v1';

/** Équipement complet par portée (état canonique, un item actif par portée). */
export type EquipMap = Partial<Record<EquipScope, string>>;

/**
 * La `section: 'frames'` du catalogue mélange FRAMES (cadre autour de l'avatar)
 * et TITRES éditoriaux (« Founder Runner ») : même portée `profile`, rendu
 * différent sur la card. On les distingue par convention de clé (`title_*`).
 */
export function isTitleItem(item: ArsenalCatalogItem): boolean {
  return item.section === 'frames' && item.key.startsWith('title_');
}

/** True si l'item est un vrai cadre d'avatar (portée profile, hors titres). */
export function isFrameItem(item: ArsenalCatalogItem): boolean {
  return item.section === 'frames' && !isTitleItem(item);
}

/** Fusionne l'équipement stocké avec les défauts (tolérant aux clés absentes). */
function hydrateEquip(raw: string | null): EquipMap {
  if (!raw) return { ...INITIAL_EQUIPPED };
  try {
    const parsed = JSON.parse(raw) as EquipMap;
    return { ...INITIAL_EQUIPPED, ...parsed };
  } catch {
    return { ...INITIAL_EQUIPPED };
  }
}

async function readEquip(): Promise<EquipMap> {
  try {
    return hydrateEquip(await AsyncStorage.getItem(EQUIP_STORAGE_KEY));
  } catch {
    return { ...INITIAL_EQUIPPED };
  }
}

async function writeEquip(map: EquipMap): Promise<void> {
  try {
    await AsyncStorage.setItem(EQUIP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Best effort : un stockage indisponible (web privé) ne casse rien.
  }
}

/** Item équipé pour une portée donnée (undefined si aucun). PURE. */
export function equippedItemForScope(
  map: EquipMap,
  scope: EquipScope,
): ArsenalCatalogItem | undefined {
  const key = map[scope];
  return key ? itemByKey(key) : undefined;
}

export interface EquipStore {
  equipped: EquipMap;
  /** True tant que la lecture initiale n'a pas résolu (défauts affichés). */
  loading: boolean;
  /** Équipe l'item (résout sa portée), persiste, notifie tous les abonnés. */
  equip: (key: string) => Promise<void>;
  /** Déséquipe la portée (retour au défaut : rien). */
  unequip: (scope: EquipScope) => Promise<void>;
}

// ─── Store externe partagé (notifier + snapshot mémoïsé) ──────────────────────
//
// Équipement au niveau MODULE : un seul état pour /profil-edit et l'onglet
// /profil. equip()/unequip() mutent `equippedState` puis emit() → tous les
// abonnés re-render (l'anneau de l'avatar change immédiatement au retour).

let equippedState: EquipMap = { ...INITIAL_EQUIPPED };
let equipLoaded = false;
let equipLoadPromise: Promise<void> | null = null;
const equipListeners = new Set<() => void>();

/** Snapshot stable : nouvelle ref UNIQUEMENT quand l'équipement change (getSnapshot pur). */
let equipSnapshot: EquipMap = equippedState;

function emitEquip(): void {
  equipSnapshot = { ...equippedState };
  for (const l of equipListeners) l();
}

/** Lecture lazy et unique de l'équipement persisté (déclenchée au 1ᵉʳ montage). */
function ensureEquipLoaded(): Promise<void> {
  if (!equipLoadPromise) {
    equipLoadPromise = readEquip()
      .then((m) => {
        equippedState = m;
        equipLoaded = true;
        emitEquip();
      })
      .catch(() => {
        equipLoaded = true;
      });
  }
  return equipLoadPromise;
}

function subscribeEquip(listener: () => void): () => void {
  equipListeners.add(listener);
  void ensureEquipLoaded();
  return () => {
    equipListeners.delete(listener);
  };
}

function getEquipSnapshot(): EquipMap {
  return equipSnapshot;
}

/** Équipe un item (résout sa portée), persiste et notifie tous les abonnés. */
export async function equipCosmetic(key: string): Promise<void> {
  const scope = equipScopeOf(key);
  if (scope === null) return;
  equippedState = { ...equippedState, [scope]: key };
  emitEquip();
  await writeEquip(equippedState);
}

/** Déséquipe une portée, persiste et notifie tous les abonnés. */
export async function unequipCosmetic(scope: EquipScope): Promise<void> {
  const next: EquipMap = { ...equippedState };
  delete next[scope];
  equippedState = next;
  emitEquip();
  await writeEquip(equippedState);
}

/**
 * Hook d'accès à l'équipement cosmétique persisté (store externe partagé). Charge
 * en asynchrone (défauts affichés immédiatement → jamais de flash), persiste
 * chaque changement. Tous les écrans partagent le MÊME état : un equip() depuis
 * /profil-edit re-render l'onglet /profil monté (useSyncExternalStore natif).
 */
export function useEquippedCosmetics(): EquipStore {
  const equipped = useSyncExternalStore(subscribeEquip, getEquipSnapshot, getEquipSnapshot);
  const equip = useCallback(equipCosmetic, []);
  const unequip = useCallback(unequipCosmetic, []);
  return { equipped, loading: !equipLoaded, equip, unequip };
}

// ─── Inventaire Arsenal complet (serveur si possible, local sinon) ───────────

export type ArsenalInventorySource = 'local' | 'server';

export interface ArsenalInventoryStore {
  wallet: ArsenalWallet;
  ownedKeys: ReadonlySet<string>;
  equipped: EquipMap;
  source: ArsenalInventorySource;
  loading: boolean;
  /** Débite seulement l'overlay local de démo ; le serveur reste lecture seule. */
  spendEclats: (amount: number) => boolean;
  /** Ajoute un item à l'overlay local après un achat démo / reveal. */
  grantLocalItem: (key: string) => void;
  /** Équipement optimiste local, sans écriture backend. */
  equipItem: (key: string) => Promise<void>;
}

interface RemoteInventorySnapshot {
  wallet: ArsenalWallet;
  ownedKeys: ReadonlySet<string>;
  equipped: EquipMap;
}

type RemoteUserRow = {
  eclats?: unknown;
  foulees?: unknown;
  is_club?: unknown;
};

type RemoteInventoryRow = {
  quantity?: unknown;
  equipped?: unknown;
  acquired_at?: unknown;
  items?: { item_key?: unknown } | { item_key?: unknown }[] | null;
};

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function itemKeyFromInventoryRow(row: RemoteInventoryRow): string | null {
  const item = Array.isArray(row.items) ? row.items[0] : row.items;
  const key = item?.item_key;
  return typeof key === 'string' ? key : null;
}

async function fetchRemoteInventory(userId: string): Promise<RemoteInventorySnapshot | null> {
  if (!supabase) return null;

  const [walletResult, inventoryResult] = await Promise.all([
    supabase
      .from('users')
      .select('eclats, foulees, is_club')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_inventory')
      .select('quantity, equipped, acquired_at, items(item_key)')
      .eq('user_id', userId)
      .order('acquired_at', { ascending: false }),
  ]);

  if (walletResult.error) throw walletResult.error;
  if (inventoryResult.error) throw inventoryResult.error;
  if (!walletResult.data) return null;

  const walletRow = walletResult.data as RemoteUserRow;
  const ownedKeys = new Set<string>();
  const equipped: EquipMap = {};

  for (const row of (inventoryResult.data ?? []) as RemoteInventoryRow[]) {
    const key = itemKeyFromInventoryRow(row);
    const quantity = asNumber(row.quantity) ?? 0;
    if (!key || quantity <= 0) continue;
    ownedKeys.add(key);
    if (row.equipped === true) {
      const scope = equipScopeOf(key);
      if (scope !== null && equipped[scope] === undefined) equipped[scope] = key;
    }
  }

  return {
    wallet: {
      eclats: asNumber(walletRow.eclats) ?? 0,
      foulees: asNumber(walletRow.foulees) ?? 0,
      isClub: walletRow.is_club === true,
    },
    ownedKeys,
    equipped,
  };
}

function unionOwned(base: ReadonlySet<string>, overlay: ReadonlySet<string>): ReadonlySet<string> {
  if (overlay.size === 0) return base;
  return new Set([...base, ...overlay]);
}

export function useArsenalInventory(): ArsenalInventoryStore {
  const { equipped: localEquipped, loading: localEquippedLoading, equip } = useEquippedCosmetics();
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteInventorySnapshot | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [ownedOverlay, setOwnedOverlay] = useState<ReadonlySet<string>>(() => new Set());
  const [equippedOverlay, setEquippedOverlay] = useState<EquipMap>({});
  const [walletDelta, setWalletDelta] = useState({ eclats: 0, foulees: 0 });

  const userId = session?.user.id ?? null;

  useEffect(() => {
    setOwnedOverlay(new Set());
    setEquippedOverlay({});
    setWalletDelta({ eclats: 0, foulees: 0 });
  }, [userId]);

  useEffect(() => {
    if (!configured || !userId || !supabase) {
      setRemote(null);
      setRemoteLoading(false);
      return;
    }

    let alive = true;
    setRemoteLoading(true);
    void fetchRemoteInventory(userId)
      .then((snapshot) => {
        if (alive) setRemote(snapshot);
      })
      .catch(() => {
        if (alive) setRemote(null);
      })
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [configured, userId]);

  const source: ArsenalInventorySource = remote ? 'server' : 'local';
  const baseWallet = remote?.wallet ?? DEMO_WALLET;
  const wallet = useMemo<ArsenalWallet>(
    () => ({
      eclats: Math.max(0, baseWallet.eclats + walletDelta.eclats),
      foulees: Math.max(0, baseWallet.foulees + walletDelta.foulees),
      isClub: baseWallet.isClub,
    }),
    [baseWallet.eclats, baseWallet.foulees, baseWallet.isClub, walletDelta.eclats, walletDelta.foulees],
  );

  const baseOwned = remote?.ownedKeys ?? INITIAL_OWNED_SET;
  const ownedKeys = useMemo(() => unionOwned(baseOwned, ownedOverlay), [baseOwned, ownedOverlay]);
  const baseEquipped = remote?.equipped ?? localEquipped;
  const equipped = useMemo(() => ({ ...baseEquipped, ...equippedOverlay }), [baseEquipped, equippedOverlay]);

  const spendEclats = useCallback(
    (amount: number) => {
      if (amount <= 0) return true;
      if (wallet.eclats < amount) return false;
      setWalletDelta((cur) => ({ ...cur, eclats: cur.eclats - amount }));
      return true;
    },
    [wallet.eclats],
  );

  const grantLocalItem = useCallback((key: string) => {
    setOwnedOverlay((cur) => new Set(cur).add(key));
  }, []);

  const equipItem = useCallback(
    async (key: string) => {
      const scope = equipScopeOf(key);
      if (scope === null) return;
      setEquippedOverlay((cur) => ({ ...cur, [scope]: key }));
      await equip(key);
    },
    [equip],
  );

  return {
    wallet,
    ownedKeys,
    equipped,
    source,
    loading: localEquippedLoading || sessionLoading || remoteLoading,
    spendEclats,
    grantLocalItem,
    equipItem,
  };
}

// ─── Crew Boost DÉMO (doc §13.1) ─────────────────────────────────────────────

export interface CrewBoostState {
  sku: CrewBoostSku;
  /** Timestamp d'activation (ms). */
  activatedAt: number;
  /** Fin de fenêtre (ms) ; null = jusqu'à fin de saison (boost saison). */
  endsAt: number | null;
  /** Offert anonymement (GIFT_ANONYMOUS_ALLOWED) — pas de nom au feed. */
  anonymous: boolean;
  /** Auteur (null si anonyme) — jamais de montant. */
  by: string | null;
}

/** Effet coffre affiché d'un boost : +X % (borne dure CREW_BOOST_CHEST_MULTIPLIER). */
export const BOOST_CHEST_BONUS_LABEL = `+${Math.round((CREW_BOOST_CHEST_MULTIPLIER - 1) * 100)} % coffre`;

/** Durée en heures d'un boost (null = saison). */
export function boostDurationH(sku: CrewBoostSku): number | null {
  return CREW_BOOSTS[sku].durationH;
}

/** Construit l'état d'un boost qu'on vient d'activer (démo). */
export function startBoost(
  sku: CrewBoostSku,
  opts: { anonymous: boolean; by: string | null },
  now: number = Date.now(),
): CrewBoostState {
  const durationH = boostDurationH(sku);
  return {
    sku,
    activatedAt: now,
    endsAt: durationH === null ? null : now + durationH * 3_600_000,
    anonymous: opts.anonymous,
    by: opts.anonymous ? null : opts.by,
  };
}

/** Millisecondes restantes d'un boost (Infinity = boost saison). */
export function boostRemainingMs(boost: CrewBoostState, now: number = Date.now()): number {
  if (boost.endsAt === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, boost.endsAt - now);
}

/** Timer formaté « 23:41:12 » / « Saison » / « Terminé ». */
export function formatBoostRemaining(boost: CrewBoostState, now: number = Date.now()): string {
  const ms = boostRemainingMs(boost, now);
  if (ms === Number.POSITIVE_INFINITY) return 'Toute la saison';
  if (ms <= 0) return 'Terminé';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ─── Crew Wall DÉMO (doc §14/§15) — opt-in, jamais de montant ─────────────────

export interface CrewWallEntry {
  /** Pseudo, ou null si offrande anonyme (« Un membre »). */
  supporter: string | null;
  /** Libellé de la contribution (nom d'item), SANS montant ni prix. */
  contribution: string;
}

/** Supporters de la saison démo (aucun montant, aucun classement par dépense). */
export const INITIAL_CREW_WALL: readonly CrewWallEntry[] = [
  { supporter: 'LENA_RUN', contribution: 'Crew Boost Weekend' },
  { supporter: null, contribution: 'Template recrutement' },
  { supporter: 'KORO', contribution: 'Coffre cosmétique crew' },
];

/** Nom affiché d'un supporter (anonymat respecté). */
export function supporterLabel(entry: CrewWallEntry): string {
  return entry.supporter ?? 'Un membre';
}
