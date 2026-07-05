/**
 * GRYD — rc_webhook/logic.ts (SPEC §5.1/§6.3).
 *
 * Fonction PURE : mappe un event webhook RevenueCat vers une décision typée,
 * appliquée par index.ts (insert purchases + update users). Idempotence par
 * rc_event_id (unique en base, 0002) — la logique n'a pas à s'en soucier.
 *
 * Règles :
 *   - Club (club_monthly / club_annual, SKUS §5.1) :
 *       INITIAL_PURCHASE / RENEWAL / UNCANCELLATION / PRODUCT_CHANGE → club_on
 *       CANCELLATION → ignore (auto-renew coupé, l'accès court jusqu'à
 *       l'expiration — c'est EXPIRATION qui coupe l'entitlement)
 *       EXPIRATION → club_off
 *   - Éclats (eclats_s/m/l) : crédités UNIQUEMENT sur un achat one-time
 *     (NON_RENEWING_PURCHASE, ou INITIAL_PURCHASE par tolérance) — jamais sur
 *     RENEWAL (un renewal ne re-crédite rien).
 *   - Starter pack : one-time → skin + STARTER_PACK_ECLATS Éclats + 1 bouclier.
 *   - AMENDEMENT-16 §4 : Founder Pack (Éclats + items), crew boosts
 *     (crew_boost_24/72/weekend/season → crew_boosts), gifts crew
 *     (cosmetic_chest_crew / recruit_template_crew / banner_crew →
 *     crew_inventory). Les items crédités viennent de SKU_GRANTED_ITEM_KEYS ;
 *     AUCUN SKU ne touche territoire/points/leaderboard (anti pay-to-win §12).
 *   - Tout le reste (event inconnu, SKU inconnu, payload incomplet) → ignore.
 */
import {
  CREW_BOOST_CHEST_MULTIPLIER,
  CREW_BOOSTS,
  ECLATS_PACKS,
  FOUNDER_PACK_ECLATS,
  SKU_GRANTED_ITEM_KEYS,
  SKUS,
  STARTER_PACK_ECLATS,
  type CrewBoostSku,
  type CrewBoostType,
} from '../_shared/game-rules.ts';

/** Sous-ensemble utile du payload `event` RevenueCat (v1/v2). */
export interface RevenueCatEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  price?: number;
}

export type WebhookDecision =
  | {
    kind: 'club_on' | 'club_off';
    rcEventId: string;
    userId: string;
    sku: string;
    price: number | null;
  }
  | {
    kind: 'credit_eclats' | 'starter_pack' | 'founder_pack';
    rcEventId: string;
    userId: string;
    sku: string;
    eclats: number;
    /** Items crédités à l'inventaire (item_key du catalogue 0014, packs). */
    itemKeys: readonly string[];
    price: number | null;
  }
  | {
    /** Contribution groupée capée (AMENDEMENT-16 §4) — crew de l'acheteur. */
    kind: 'crew_boost';
    rcEventId: string;
    userId: string;
    sku: string;
    boostType: CrewBoostType;
    /** null = jusqu'à la fin de la saison active (boost saison). */
    durationH: number | null;
    /** Multiplicateur de COFFRE uniquement (jamais points/XP/leaderboard). */
    multiplier: number;
    price: number | null;
  }
  | {
    /** Gift crew : coffre cosmétique / template recrutement / bannière (§14/§21). */
    kind: 'crew_item';
    rcEventId: string;
    userId: string;
    sku: string;
    itemKey: string;
    price: number | null;
  }
  | { kind: 'ignore'; reason: string };

const CLUB_SKUS: ReadonlySet<string> = new Set([SKUS.clubMonthly, SKUS.clubAnnual]);
const ECLATS_SKUS: ReadonlySet<string> = new Set(Object.keys(ECLATS_PACKS));

/** Events qui (ré)activent l'entitlement Club. */
const CLUB_ON_EVENTS: ReadonlySet<string> = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);
/** Events one-time qui créditent (consommables / non-subscriptions). */
const ONE_TIME_EVENTS: ReadonlySet<string> = new Set([
  'NON_RENEWING_PURCHASE',
  'INITIAL_PURCHASE',
]);

export function mapRevenueCatEvent(event: RevenueCatEvent): WebhookDecision {
  const { id, type, app_user_id: userId, product_id: sku } = event;
  if (!id || !type) return { kind: 'ignore', reason: 'missing_event_id_or_type' };
  if (!userId) return { kind: 'ignore', reason: 'missing_app_user_id' };
  const price = typeof event.price === 'number' ? event.price : null;

  // ── Club (abonnement) ──────────────────────────────────────────────────────
  if (sku && CLUB_SKUS.has(sku)) {
    if (CLUB_ON_EVENTS.has(type)) {
      return { kind: 'club_on', rcEventId: id, userId, sku, price };
    }
    if (type === 'EXPIRATION') {
      return { kind: 'club_off', rcEventId: id, userId, sku, price };
    }
    // CANCELLATION (auto-renew off), BILLING_ISSUE… : l'accès ne change pas ici.
    return { kind: 'ignore', reason: `club_event_no_effect:${type}` };
  }

  // ── One-time : Éclats / Packs ─────────────────────────────────────────────
  if (sku === SKUS.starterPack) {
    if (!ONE_TIME_EVENTS.has(type)) {
      return { kind: 'ignore', reason: `one_time_event_expected:${type}` };
    }
    return {
      kind: 'starter_pack',
      rcEventId: id,
      userId,
      sku,
      eclats: STARTER_PACK_ECLATS,
      itemKeys: SKU_GRANTED_ITEM_KEYS.starter_pack,
      price,
    };
  }

  if (sku === SKUS.founderPack) {
    if (!ONE_TIME_EVENTS.has(type)) {
      return { kind: 'ignore', reason: `one_time_event_expected:${type}` };
    }
    return {
      kind: 'founder_pack',
      rcEventId: id,
      userId,
      sku,
      eclats: FOUNDER_PACK_ECLATS,
      itemKeys: SKU_GRANTED_ITEM_KEYS.founder_pack,
      price,
    };
  }

  if (sku && ECLATS_SKUS.has(sku)) {
    // RENEWAL/EXPIRATION sur un consommable = anomalie → jamais de re-crédit.
    if (!ONE_TIME_EVENTS.has(type)) {
      return { kind: 'ignore', reason: `one_time_event_expected:${type}` };
    }
    return {
      kind: 'credit_eclats',
      rcEventId: id,
      userId,
      sku,
      eclats: ECLATS_PACKS[sku as keyof typeof ECLATS_PACKS],
      itemKeys: [],
      price,
    };
  }

  // ── Crew Boosts (AMENDEMENT-16 §4, doc §13.1/§21) — coffre UNIQUEMENT ─────
  if (sku && sku in CREW_BOOSTS) {
    if (!ONE_TIME_EVENTS.has(type)) {
      return { kind: 'ignore', reason: `one_time_event_expected:${type}` };
    }
    const boost = CREW_BOOSTS[sku as CrewBoostSku];
    return {
      kind: 'crew_boost',
      rcEventId: id,
      userId,
      sku,
      boostType: boost.type,
      durationH: boost.durationH,
      multiplier: CREW_BOOST_CHEST_MULTIPLIER,
      price,
    };
  }

  // ── Gifts crew (doc §14/§21.3-§21.5) — item unique vers crew_inventory ────
  const CREW_GIFT_ITEM_KEYS: Readonly<Record<string, string>> = {
    [SKUS.cosmeticChest]: SKU_GRANTED_ITEM_KEYS.cosmetic_chest_crew[0],
    [SKUS.recruitTemplate]: SKU_GRANTED_ITEM_KEYS.recruit_template_crew[0],
    [SKUS.bannerCrew]: SKU_GRANTED_ITEM_KEYS.banner_crew[0],
  };
  if (sku && sku in CREW_GIFT_ITEM_KEYS) {
    if (!ONE_TIME_EVENTS.has(type)) {
      return { kind: 'ignore', reason: `one_time_event_expected:${type}` };
    }
    return {
      kind: 'crew_item',
      rcEventId: id,
      userId,
      sku,
      itemKey: CREW_GIFT_ITEM_KEYS[sku]!,
      price,
    };
  }

  // SKU inconnu (skins vendus en Éclats, pas en SKU store) ou event système
  // (TEST, TRANSFER, SUBSCRIBER_ALIAS…) : on acquitte sans effet.
  return { kind: 'ignore', reason: sku ? `unknown_sku:${sku}` : `no_product:${type}` };
}
