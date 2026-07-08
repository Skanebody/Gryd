/**
 * GRYD — Catalogue Arsenal V2 (AMENDEMENT-16 §4, doc §18-§25).
 *
 * MIROIR du SEED de la migration 0014 (`supabase/migrations/0014_items_inventory.sql`,
 * projet sydwxwwirinjoheeodcg) : mêmes `item_key`, mêmes raretés, mêmes limites,
 * mêmes descriptions FR. La DB reste la source de vérité du catalogue (O3 : ce
 * fichier deviendra un fetch `items` filtré `status = 'active'`) ; ici une copie
 * DÉMO pour l'écran, offline-first.
 *
 * PRIX : jamais en dur. Les prix EUR viennent de `SKU_PRICES_EUR`, les prix
 * Éclats fonctionnels de leurs constantes dédiées (`ATTACK_ALERT_ECLATS`,
 * `STREAK_GEL_ECLATS`, `SCOUT_PING_ECLATS`, `BANNER_CREW_ECLATS`). Les prix
 * Éclats purement cosmétiques (skins/frames/templates/blasons) sont des VALEURS
 * D'AFFICHAGE du seed §16 — bornées, jamais fonctionnelles, jamais du jeu.
 *
 * ANTI PAY-TO-WIN (doc §12) : aucun item de ce catalogue ne donne territoire,
 * km, zones, points leaderboard ni attaque/défense. Un Crew Boost n'agit QUE
 * sur la progression du COFFRE crew (cosmétique/organisation), jamais points.
 */
import {
  BANNER_CREW_ECLATS,
  ECLATS_PACKS,
  FOUNDER_PACK_ECLATS,
  SCOUT_PING_ECLATS,
  ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK,
  ATTACK_ALERT_DURATION_HOURS,
  ATTACK_ALERT_ECLATS,
  ATTACK_ALERT_MAX_PER_WEEK,
  SKUS,
  SKU_PRICES_EUR,
  STARTER_PACK_ECLATS,
  STREAK_GEL_ECLATS,
  STREAK_GEL_MAX_PER_MONTH,
  type BadgeTier,
} from '@klaim/shared';
import type { ArsenalCurrency } from '../../ui/game/ArsenalItemCard';

/** Section de l'Arsenal §25 (ordre = ordre d'affichage). */
export type ArsenalSectionKey =
  | 'featured'
  | 'packs'
  | 'objets'
  | 'skins_territory'
  | 'skins_trace'
  | 'frames'
  | 'emblems'
  | 'banners'
  | 'templates'
  | 'crew_boosts'
  | 'subscriptions';

/** Portée d'un item (miroir de `items.target_scope`). */
export type ArsenalScope = 'user' | 'crew' | 'zone' | 'route' | 'profile' | 'share';

export interface ArsenalCatalogItem {
  /** `item_key` du seed 0014 — clé stable de possession/équipement. */
  key: string;
  name: string;
  /** Slug d'icône (registre arsenal-icons ; résolution par famille sinon). */
  slug: string;
  rarity: BadgeTier;
  /** Section principale §25 (Featured réutilise ces mêmes items par `key`). */
  section: Exclude<ArsenalSectionKey, 'featured'>;
  scope: ArsenalScope;
  /** Description FR courte (miroir seed). */
  description: string;
  /** Prix Éclats (mutuellement exclusif ou combiné avec EUR selon le seed). */
  priceShards?: number;
  /** Prix EUR de référence (achat réel = O3). */
  priceEur?: number;
  /** Limite anti-abus affichée (objets fonctionnels §17.6). */
  limit?: string;
  /** Consommable (item_usage_logs) vs équipable/permanent. */
  consumable?: boolean;
  /** Exclusif d'un pack — non achetable seul (Founder / Starter). */
  packOnly?: boolean;
  /** Offert au démarrage / possédé Saison 0 en démo. */
  ownedDemo?: boolean;
  /** Catalogué mais NON vendu (GRYD Pass §23 tant que 30 niveaux absents). */
  draft?: boolean;
  /** Offrable au crew (gifting §14 — items de portée crew). */
  giftable?: boolean;
  /** Contenu détaillé (packs riches §19). */
  contents?: readonly string[];
}

/** Bornes EUR combinées (bannière/coffre/template §21) — devise par défaut EUR. */
const eur = (n: number): number => n;

// ─── Objets fonctionnels capés (doc §20, option A monétisation) ───────────────
const ATTACK_ALERT_EXTRA_PER_WEEK =
  ATTACK_ALERT_MAX_PER_WEEK - ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK;

/**
 * Catalogue complet (miroir seed 0014). `priceShards`/`priceEur` référencent des
 * constantes quand elles existent ; les valeurs cosmétiques nues sont du seed.
 */
export const ARSENAL_CATALOG: readonly ArsenalCatalogItem[] = [
  // ══ Packs (§19) ═════════════════════════════════════════════════════════════
  {
    key: SKUS.starterPack,
    name: 'Starter Pack',
    slug: 'pack',
    rarity: 'tempo',
    section: 'packs',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.starter_pack),
    limit: '1 par compte',
    description: `${STARTER_PACK_ECLATS} Éclats, 1 skin de trace, 1 frame Road, 1 template share, 1 Streak Gel.`,
    contents: [
      `${STARTER_PACK_ECLATS} Éclats`,
      'Skin trace — Neon Ivory',
      'Frame Road',
      'Template Première Zone',
      '1 Streak Gel',
    ],
  },
  {
    key: SKUS.founderPack,
    name: 'Founder Pack',
    slug: 'pack',
    rarity: 'legend',
    section: 'packs',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.founder_pack),
    limit: '1 par compte',
    description: `${FOUNDER_PACK_ECLATS} Éclats + panoplie Founder : badge, frame, skin territoire, skin trace, titre, template.`,
    contents: [
      `${FOUNDER_PACK_ECLATS} Éclats`,
      'Badge Founder',
      'Frame Founder',
      'Skin territoire — Founder Glow',
      'Skin trace — Founder Line',
      'Titre « Founder Runner »',
      'Template Founder',
    ],
  },

  // ══ Éclats (§19.3) — monnaie de STYLE, n'achète jamais le territoire ════════
  {
    key: SKUS.eclatsS,
    name: `Poignée d'Éclats (${ECLATS_PACKS.eclats_s})`,
    slug: 'eclats',
    rarity: 'road',
    section: 'packs',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.eclats_s),
    consumable: true,
    description: `${ECLATS_PACKS.eclats_s} Éclats pour le style : skins, frames, templates.`,
  },
  {
    key: SKUS.eclatsM,
    name: `Sachet d'Éclats (${ECLATS_PACKS.eclats_m})`,
    slug: 'eclats_pouch',
    rarity: 'road',
    section: 'packs',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.eclats_m),
    consumable: true,
    description: `${ECLATS_PACKS.eclats_m} Éclats. Le territoire, lui, se gagne en courant.`,
  },
  {
    key: SKUS.eclatsL,
    name: `Caisse d'Éclats (${ECLATS_PACKS.eclats_l})`,
    slug: 'eclats_chest',
    rarity: 'tempo',
    section: 'packs',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.eclats_l),
    consumable: true,
    description: `${ECLATS_PACKS.eclats_l} Éclats pour la personnalisation complète.`,
  },
  {
    key: SKUS.eclatsXl,
    name: `Coffre d'Éclats (${ECLATS_PACKS.eclats_xl.toLocaleString('fr-FR')})`,
    slug: 'eclats_chest',
    rarity: 'race',
    section: 'packs',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.eclats_xl),
    consumable: true,
    description: `${ECLATS_PACKS.eclats_xl.toLocaleString('fr-FR')} Éclats. Style, statut, organisation.`,
  },
  {
    key: SKUS.eclatsXxl,
    name: `Réserve d'Éclats (${ECLATS_PACKS.eclats_xxl.toLocaleString('fr-FR')})`,
    slug: 'eclats_chest',
    rarity: 'carbon',
    section: 'packs',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.eclats_xxl),
    consumable: true,
    description: `${ECLATS_PACKS.eclats_xxl.toLocaleString('fr-FR')} Éclats. La victoire, elle, ne s'achète pas.`,
  },

  // ══ Objets fonctionnels capés (§20) ═════════════════════════════════════════
  {
    key: 'attack_alert',
    name: 'Alerte d\'attaque',
    slug: 'radar',
    rarity: 'race',
    section: 'objets',
    scope: 'zone',
    priceShards: ATTACK_ALERT_ECLATS,
    consumable: true,
    ownedDemo: true,
    limit: `${ATTACK_ALERT_EXTRA_PER_WEEK}/semaine (+${ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK} inclus Club) · plafond crew`,
    description: `Surveille une zone fraîche ${ATTACK_ALERT_DURATION_HOURS} h : tu es prévenu si on la cible. Ne bloque pas la capture — cours pour défendre.`,
  },
  {
    key: 'streak_gel',
    name: 'Streak Gel',
    slug: 'streak_gel',
    rarity: 'tempo',
    section: 'objets',
    scope: 'user',
    priceShards: STREAK_GEL_ECLATS,
    consumable: true,
    limit: `${STREAK_GEL_MAX_PER_MONTH}/mois max`,
    ownedDemo: true,
    description: 'Protège ta série hebdo une semaine. Aucun effet territoire.',
  },
  {
    key: 'scout_ping',
    name: 'Scout Ping',
    slug: 'radar',
    rarity: 'race',
    section: 'objets',
    scope: 'zone',
    priceShards: SCOUT_PING_ECLATS,
    consumable: true,
    limit: '1/semaine',
    description: 'Révèle une zone fragile ou rentable. Info temporaire, aucune capture auto.',
  },

  // ══ Skins territoire (8, §16.3 — rendu carte V1, équipement stocké MVP) ══════
  { key: 'skin_territory_gold_border', name: 'Gold Border', slug: 'skin_carbon_grid', rarity: 'carbon', section: 'skins_territory', scope: 'zone', priceShards: 400, description: 'Frontières dorées sur tes zones. Trait net, zéro halo.' },
  { key: 'skin_territory_ghost', name: 'Ghost Territory', slug: 'skin_ghost', rarity: 'race', section: 'skins_territory', scope: 'zone', priceShards: 300, description: 'Remplissage fantôme translucide sur tes zones.' },
  { key: 'skin_territory_night_grid', name: 'Night Grid', slug: 'skin_circuit', rarity: 'tempo', section: 'skins_territory', scope: 'zone', priceShards: 220, description: 'Trame nocturne discrète à l’intérieur des frontières.' },
  { key: 'skin_territory_blackout', name: 'Blackout', slug: 'skin_carbon_grid', rarity: 'race', section: 'skins_territory', scope: 'zone', priceShards: 260, description: 'Zones en noir profond, frontière ivoire.' },
  { key: 'skin_territory_ivory_lines', name: 'Ivory Lines', slug: 'skin_carbon_grid', rarity: 'tempo', section: 'skins_territory', scope: 'zone', priceShards: 180, description: 'Hachures ivoire fines sur tes territoires.' },
  { key: 'skin_territory_ember', name: 'Ember Edge', slug: 'skin_circuit', rarity: 'race', section: 'skins_territory', scope: 'zone', priceShards: 280, description: 'Frontières braise sur les zones que tu tiens.' },
  { key: 'skin_territory_frost', name: 'Frostline', slug: 'streak_gel', rarity: 'tempo', section: 'skins_territory', scope: 'zone', priceShards: 240, description: 'Liséré givré le long de tes frontières.' },
  { key: 'skin_territory_founder_glow', name: 'Founder Glow', slug: 'skin_founder_glow', rarity: 'legend', section: 'skins_territory', scope: 'zone', packOnly: true, description: 'Exclusif Founder Pack. Tes zones portent la marque des premiers.' },

  // ══ Skins trace (8, §16.3) ══════════════════════════════════════════════════
  { key: 'skin_trace_electric', name: 'Electric Route', slug: 'skin_trace', rarity: 'race', section: 'skins_trace', scope: 'route', priceShards: 220, description: 'Ta trace en courant électrique continu.' },
  { key: 'skin_trace_chartreuse_pulse', name: 'Chartreuse Pulse', slug: 'skin_trace', rarity: 'tempo', section: 'skins_trace', scope: 'route', priceShards: 150, description: 'Pulsation chartreuse le long du tracé.' },
  { key: 'skin_trace_neon_ivory', name: 'Neon Ivory', slug: 'skin_trace', rarity: 'tempo', section: 'skins_trace', scope: 'route', priceShards: 180, ownedDemo: true, description: 'Trace ivoire lumineuse, sobre et nette.' },
  { key: 'skin_trace_ghost_line', name: 'Ghost Line', slug: 'skin_ghost', rarity: 'tempo', section: 'skins_trace', scope: 'route', priceShards: 200, description: 'Trace semi-transparente, style furtif.' },
  { key: 'skin_trace_carbon_dash', name: 'Carbon Dash', slug: 'skin_carbon_grid', rarity: 'carbon', section: 'skins_trace', scope: 'route', priceShards: 260, description: 'Pointillés carbone haute densité.' },
  { key: 'skin_trace_midnight', name: 'Midnight Runner', slug: 'skin_trace', rarity: 'tempo', section: 'skins_trace', scope: 'route', priceShards: 180, description: 'Trace bleu nuit pour les sorties tardives.' },
  { key: 'skin_trace_blade', name: 'Blade', slug: 'skin_trace', rarity: 'race', section: 'skins_trace', scope: 'route', priceShards: 240, description: 'Trait lame, effilé aux extrémités.' },
  { key: 'skin_trace_founder_line', name: 'Founder Line', slug: 'skin_founder_glow', rarity: 'legend', section: 'skins_trace', scope: 'route', packOnly: true, description: 'Exclusif Founder Pack. La ligne des premiers coureurs.' },

  // ══ Frames profil (6, §16.1) ════════════════════════════════════════════════
  { key: 'frame_road', name: 'Frame Road', slug: 'frame_gold', rarity: 'road', section: 'frames', scope: 'profile', packOnly: true, ownedDemo: true, description: 'Cadre Road. Offert avec le Starter Pack.' },
  { key: 'frame_tempo', name: 'Frame Tempo', slug: 'frame_gold', rarity: 'tempo', section: 'frames', scope: 'profile', priceShards: 150, description: 'Cadre Tempo pour ta Player Card.' },
  { key: 'frame_race', name: 'Frame Race', slug: 'frame_gold', rarity: 'race', section: 'frames', scope: 'profile', priceShards: 200, description: 'Cadre Race, liséré affûté.' },
  { key: 'frame_carbon', name: 'Frame Carbon', slug: 'frame_gold', rarity: 'carbon', section: 'frames', scope: 'profile', priceShards: 250, description: 'Cadre Carbon, la référence des réguliers.' },
  { key: 'frame_elite', name: 'Frame Elite', slug: 'frame_gold', rarity: 'elite', section: 'frames', scope: 'profile', priceShards: 300, description: 'Cadre Elite, réservé au style, jamais au score.' },
  { key: 'frame_founder', name: 'Frame Founder', slug: 'frame_gold', rarity: 'legend', section: 'frames', scope: 'profile', packOnly: true, description: 'Exclusif Founder Pack.' },

  // ══ Templates share (6, §16.1) ══════════════════════════════════════════════
  { key: 'template_first_zone', name: 'Template Première Zone', slug: 'share_template', rarity: 'road', section: 'templates', scope: 'share', priceShards: 100, ownedDemo: true, description: 'Share card « Première zone » — offert avec le Starter Pack.' },
  { key: 'template_zone_taken', name: 'Template Zone Prise', slug: 'share_template', rarity: 'tempo', section: 'templates', scope: 'share', priceShards: 120, description: 'Share card de capture : la zone, la boucle, ton crew.' },
  { key: 'template_night_run', name: 'Template Night Run', slug: 'share_template', rarity: 'tempo', section: 'templates', scope: 'share', priceShards: 150, description: 'Share card nocturne, fond noir, trace chartreuse.' },
  { key: 'template_before_after', name: 'Template Before/After', slug: 'share_template', rarity: 'race', section: 'templates', scope: 'share', priceShards: 150, description: 'Avant/après de ton territoire sur la semaine.' },
  { key: 'template_route_opened', name: 'Template Route Ouverte', slug: 'share_template', rarity: 'tempo', section: 'templates', scope: 'share', priceShards: 120, description: 'Share card d’ouverture de route.' },
  { key: 'template_founder', name: 'Template Founder', slug: 'share_template', rarity: 'legend', section: 'templates', scope: 'share', packOnly: true, description: 'Exclusif Founder Pack. Raconte la Saison 0.' },

  // ══ Bannières crew (6, §21.5 : 350 Éclats OU 3,99 €) ════════════════════════
  { key: 'crew_banner_impact', name: 'Bannière Impact', slug: 'crew_gear', rarity: 'race', section: 'banners', scope: 'crew', priceShards: BANNER_CREW_ECLATS, priceEur: eur(SKU_PRICES_EUR.banner_crew), giftable: true, description: 'Bannière Crew HQ à fort contraste. Équipable par le crew.' },
  { key: 'crew_banner_war_ready', name: 'Bannière War Ready', slug: 'crew_gear', rarity: 'carbon', section: 'banners', scope: 'crew', priceShards: BANNER_CREW_ECLATS, priceEur: eur(SKU_PRICES_EUR.banner_crew), giftable: true, description: 'Pour les crews qui tiennent leurs frontières.' },
  { key: 'crew_banner_blackline', name: 'Bannière Black Line', slug: 'crew_gear', rarity: 'tempo', section: 'banners', scope: 'crew', priceShards: BANNER_CREW_ECLATS, priceEur: eur(SKU_PRICES_EUR.banner_crew), giftable: true, description: 'Ligne noire minimale, lisible de loin.' },
  { key: 'crew_banner_chartreuse', name: 'Bannière Chartreuse Storm', slug: 'crew_gear', rarity: 'race', section: 'banners', scope: 'crew', priceShards: BANNER_CREW_ECLATS, priceEur: eur(SKU_PRICES_EUR.banner_crew), giftable: true, description: 'Orage chartreuse sur fond noir.' },
  { key: 'crew_banner_district', name: 'Bannière District', slug: 'crew_gear', rarity: 'tempo', section: 'banners', scope: 'crew', priceShards: BANNER_CREW_ECLATS, priceEur: eur(SKU_PRICES_EUR.banner_crew), giftable: true, description: 'Le plan de ton quartier en étendard.' },
  { key: 'crew_banner_legend', name: 'Bannière Legend Row', slug: 'crew_gear', rarity: 'elite', section: 'banners', scope: 'crew', priceShards: BANNER_CREW_ECLATS, priceEur: eur(SKU_PRICES_EUR.banner_crew), giftable: true, description: 'Pour les crews qui écrivent l’histoire locale.' },

  // ══ Blasons crew premium (§16.2) ════════════════════════════════════════════
  { key: 'crew_emblem_ghost', name: 'Blason Ghost', slug: 'crew_gear', rarity: 'race', section: 'emblems', scope: 'crew', priceShards: 450, giftable: true, description: 'Blason translucide, présence discrète.' },
  { key: 'crew_emblem_carbon', name: 'Blason Carbon', slug: 'crew_gear', rarity: 'carbon', section: 'emblems', scope: 'crew', priceShards: 500, giftable: true, description: 'Blason Carbon — statut, jamais autorité.' },
  { key: 'crew_emblem_gold', name: 'Blason Or', slug: 'crew_gear', rarity: 'elite', section: 'emblems', scope: 'crew', priceShards: 600, giftable: true, description: 'Blason doré pour la vitrine du crew.' },
  { key: 'crew_emblem_founder', name: 'Blason Founder', slug: 'crew_gear', rarity: 'legend', section: 'emblems', scope: 'crew', priceShards: 700, giftable: true, description: 'Le blason des crews de la première heure.' },

  // ══ Crew Boosts (§13.1/§21) — effet COFFRE uniquement, capé, non cumulable ══
  {
    key: SKUS.crewBoost24,
    name: 'Crew Boost 24 h',
    slug: 'route_boost',
    rarity: 'tempo',
    section: 'crew_boosts',
    scope: 'crew',
    priceEur: eur(SKU_PRICES_EUR.crew_boost_24),
    consumable: true,
    giftable: true,
    limit: '1 boost actif — aucun effet sur les 48 dernières h de saison',
    description: '+25 % de progression du coffre crew pendant 24 h. Jamais de points.',
  },
  {
    key: SKUS.crewBoost72,
    name: 'Crew Boost 72 h',
    slug: 'route_boost',
    rarity: 'race',
    section: 'crew_boosts',
    scope: 'crew',
    priceEur: eur(SKU_PRICES_EUR.crew_boost_72),
    consumable: true,
    giftable: true,
    limit: '1 boost actif — aucun effet sur les 48 dernières h de saison',
    description: '+25 % de progression du coffre crew pendant 72 h.',
  },
  {
    key: SKUS.crewBoostWeekend,
    name: 'Crew Boost Weekend',
    slug: 'route_boost',
    rarity: 'race',
    section: 'crew_boosts',
    scope: 'crew',
    priceEur: eur(SKU_PRICES_EUR.crew_boost_weekend),
    consumable: true,
    giftable: true,
    limit: '1 boost actif — aucun effet sur les 48 dernières h de saison',
    description: 'Le coffre du crew accélère tout le weekend. Bannière d’événement incluse.',
  },
  {
    key: SKUS.crewBoostSeason,
    name: 'Crew Boost Saison',
    slug: 'route_boost',
    rarity: 'carbon',
    section: 'crew_boosts',
    scope: 'crew',
    priceEur: eur(SKU_PRICES_EUR.crew_boost_season),
    consumable: true,
    giftable: true,
    limit: '1 boost actif — aucun effet sur les 48 dernières h de saison',
    description: '+25 % coffre jusqu’à la fin de saison + statut « Crew Boosted ».',
  },

  // ══ Gifting crew (§21.3/§21.4) ══════════════════════════════════════════════
  {
    key: 'crew_cosmetic_chest',
    name: 'Coffre cosmétique crew',
    slug: 'pack',
    rarity: 'race',
    section: 'crew_boosts',
    scope: 'crew',
    priceEur: eur(SKU_PRICES_EUR.cosmetic_chest_crew),
    consumable: true,
    giftable: true,
    description: 'Récompenses cosmétiques aléatoires pour le crew. Zéro zone, zéro point.',
  },
  {
    key: 'crew_recruit_template',
    name: 'Template recrutement premium',
    slug: 'share_template',
    rarity: 'tempo',
    section: 'templates',
    scope: 'share',
    priceShards: 150,
    priceEur: eur(SKU_PRICES_EUR.recruit_template_crew),
    giftable: true,
    description: 'Story de recrutement premium (9:16, 1:1, 16:9) avec blason et territoire.',
  },

  // ══ Cosmétiques pack-only Founder (§19.2) ═══════════════════════════════════
  { key: 'founder_badge', name: 'Badge Founder', slug: 'skin_founder_glow', rarity: 'legend', section: 'frames', scope: 'profile', packOnly: true, description: 'Exclusif Founder Pack. Tu étais là avant la carte.' },
  { key: 'title_founder_runner', name: 'Titre « Founder Runner »', slug: 'pass_saison', rarity: 'legend', section: 'frames', scope: 'profile', packOnly: true, description: 'Exclusif Founder Pack. Un titre, pas un pouvoir.' },

  // ══ Abonnements & Pass (§22-§23) ════════════════════════════════════════════
  {
    key: SKUS.clubMonthly,
    name: 'GRYD Club',
    slug: 'club',
    rarity: 'carbon',
    section: 'subscriptions',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.club_monthly),
    description: 'Stats avancées, heatmap, export HD, Radar Route et Streak Gel mensuels. Zéro avantage de jeu.',
    contents: [
      'Stats avancées + heatmap personnelle',
      'Historique complet + export share HD',
      `${ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK} alerte d'attaque incluse / semaine`,
      'Templates premium mensuels',
      'Radar Route + Streak Gel mensuels',
    ],
  },
  {
    key: 'gryd_pass',
    name: 'GRYD Pass',
    slug: 'pass_saison',
    rarity: 'carbon',
    section: 'subscriptions',
    scope: 'user',
    priceEur: eur(SKU_PRICES_EUR.gryd_pass),
    limit: '1 par saison',
    draft: true,
    description: '30 niveaux de récompenses de saison. Pas lancé avant que le contenu existe.',
  },
] as const;

/** Devise par défaut d'un item : Éclats si prix Éclats présent, sinon EUR. */
export function defaultCurrency(item: ArsenalCatalogItem): ArsenalCurrency | 'eur' {
  if (item.priceShards !== undefined) return 'eclats';
  return 'eur';
}

/**
 * Items d'une section (Featured est composé à part). Les items `draft` (GRYD
 * Pass §23) restent visibles en TEASER dans « Club & Pass » uniquement.
 */
export function itemsInSection(section: Exclude<ArsenalSectionKey, 'featured'>): ArsenalCatalogItem[] {
  return ARSENAL_CATALOG.filter(
    (i) => i.section === section && (!i.draft || section === 'subscriptions'),
  );
}

/** Résout un item par sa clé (détail sheet, inventaire, gifting). */
export function itemByKey(key: string): ArsenalCatalogItem | undefined {
  return ARSENAL_CATALOG.find((i) => i.key === key);
}

/** Items offrables au crew (gifting §14). */
export const GIFTABLE_ITEMS: readonly ArsenalCatalogItem[] = ARSENAL_CATALOG.filter(
  (i) => i.giftable === true,
);

/** Clés Featured §25 (curation démo : 1 pack, 1 skin, 1 boost). */
export const FEATURED_KEYS: readonly string[] = [
  SKUS.founderPack,
  'skin_territory_gold_border',
  SKUS.crewBoostWeekend,
];

/** Ordre + libellés des sections §25. */
export const ARSENAL_SECTIONS: readonly { key: ArsenalSectionKey; label: string; note?: string }[] = [
  { key: 'featured', label: 'FEATURED' },
  { key: 'packs', label: 'PACKS', note: 'Éclats et bundles — aucun avantage de jeu, jamais du territoire.' },
  { key: 'objets', label: 'OBJETS', note: 'Du confort, jamais un raccourci : chaque objet est capé.' },
  { key: 'skins_territory', label: 'SKINS TERRITOIRE' },
  { key: 'skins_trace', label: 'SKINS TRACE' },
  { key: 'frames', label: 'FRAMES & STATUT' },
  { key: 'emblems', label: 'BLASONS CREW' },
  { key: 'banners', label: 'BANNIÈRES CREW' },
  { key: 'templates', label: 'TEMPLATES SHARE' },
  { key: 'crew_boosts', label: 'CREW BOOSTS', note: 'Contribution groupée capée : +25 % coffre, jamais de points.' },
  { key: 'subscriptions', label: 'CLUB & PASS' },
];
