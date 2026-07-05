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
import {
  CREW_BOOSTS,
  CREW_BOOST_CHEST_MULTIPLIER,
  type CrewBoostSku,
} from '@klaim/shared';
import { ARSENAL_CATALOG, itemByKey, type ArsenalScope } from './catalog';

/** Portées équipables (un seul item actif par portée). */
export type EquipScope = Extract<ArsenalScope, 'zone' | 'route' | 'profile' | 'crew' | 'share'>;

/** Item démarré comme possédé (offert Saison 0 / débloqué en courant). */
export const INITIAL_OWNED: readonly string[] = ARSENAL_CATALOG.filter((i) => i.ownedDemo).map(
  (i) => i.key,
);

/** Équipement initial : les skins offerts sont équipés par défaut (démo). */
export const INITIAL_EQUIPPED: Readonly<Partial<Record<EquipScope, string>>> = {
  route: 'skin_trace_neon_ivory',
  profile: 'frame_road',
  share: 'template_first_zone',
};

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
