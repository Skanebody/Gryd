-- GRYD — 0014 Inventaire, items, achats, crew boosts (AMENDEMENT-16 §4, doc §17-§26).
-- Source de vérité des constantes : packages/shared/src/game-rules.ts
--   (SKU_PRICES_EUR, FOUNDER_PACK_ECLATS, STREAK_GEL_ECLATS, SCOUT_PING_ECLATS,
--    BANNER_CREW_ECLATS, CREW_BOOSTS, CREW_BOOST_CHEST_MULTIPLIER,
--    CREW_BOOST_MAX_ACTIVE, BOOST_BLACKOUT_END_OF_SEASON_H, SKU_GRANTED_ITEM_KEYS).
--   Les valeurs du SEED ci-dessous viennent du doc §16-§23 + de ces constantes
--   (référencées en commentaire) — la DB stocke le CATALOGUE, pas les règles.
--
-- ANTI PAY-TO-WIN ABSOLU (doc §12) : aucun item ne donne territoire, km, zones,
-- points leaderboard ni attaque/défense illimitées. Un crew boost ne multiplie
-- QUE la progression du coffre crew (jamais points/XP).
--
-- Contenu :
--   1. items — catalogue (règle §17 : nom, icône/asset, rareté, animation,
--      règle d'usage, limite, écran → un produit incomplet n'est pas vendu).
--   2. user_inventory / crew_inventory — possessions + équipement (rendu réel
--      des skins de carte = V1, l'équipement est stocké dès MVP §16).
--   3. purchases (0002) += crew_id / item_id / currency / platform / status.
--   4. item_usage_logs — journal d'usage des consommables.
--   5. crew_boosts — contribution groupée capée (§13.1/§21).
--   6. RPC grant_user_items / grant_crew_item (service_role, rc_webhook).
--   7. RLS style 0003/0010 : lecture user/crew concerné, ÉCRITURE service_role
--      only partout (le client n'écrit jamais son inventaire).
--   8. SEED catalogue MVP §18-§21 (57 items, GRYD Pass en status 'draft').

-- ═══ 1. items : catalogue ════════════════════════════════════════════════════
create table if not exists public.items (
  id             uuid primary key default gen_random_uuid(),
  -- Clé stable référencée par le code (SKU_GRANTED_ITEM_KEYS, équipement).
  item_key       text not null unique check (item_key ~ '^[a-z0-9_]{3,60}$'),
  name           text not null check (char_length(name) between 1 and 80),
  type           text not null check (type in (
    'pack', 'eclats', 'skin_territory', 'skin_trace', 'frame_profile',
    'template_share', 'banner_crew', 'emblem_crew', 'shield', 'streak_gel',
    'scout_ping', 'crew_boost', 'cosmetic_chest', 'recruit_template',
    'season_pass', 'badge', 'title'
  )),
  -- Rareté = tiers visuels existants (badges/niveaux, jamais de tier inédit).
  rarity         text not null check (rarity in ('road', 'tempo', 'race', 'carbon', 'elite', 'legend')),
  price_shards   int check (price_shards > 0),   -- prix Éclats (null = pas vendu en Éclats)
  price_eur      numeric(10, 2) check (price_eur > 0), -- prix EUR référence (null = pas vendu en EUR)
  is_consumable  boolean not null default false,
  usage_limit    text,                            -- limite anti-abus affichée (§17.6)
  target_scope   text not null check (target_scope in ('user', 'crew', 'zone', 'route', 'share', 'profile')),
  asset_url      text,                            -- null MVP : assets embarqués par item_key
  animation_key  text not null,                   -- animation d'obtention (§17.4)
  description    text not null,                   -- description FR courte (§17)
  -- 'draft' = catalogué mais NON vendu (GRYD Pass §23 tant que 30 niveaux absents).
  status         text not null default 'active' check (status in ('active', 'draft')),
  created_at     timestamptz not null default now()
);
create index if not exists items_type_idx on public.items (type, status);

-- ═══ 2a. user_inventory ══════════════════════════════════════════════════════
create table if not exists public.user_inventory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  item_id     uuid not null references public.items (id) on delete cascade,
  quantity    int not null default 1 check (quantity >= 0),
  equipped    boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists user_inventory_user_idx on public.user_inventory (user_id);

-- ═══ 2b. crew_inventory ══════════════════════════════════════════════════════
-- acquired_by_user_id NULLABLE : offrande anonyme possible (game-rules:
-- GIFT_ANONYMOUS_ALLOWED, doc §14 — jamais de classement des payeurs).
create table if not exists public.crew_inventory (
  id                  uuid primary key default gen_random_uuid(),
  crew_id             uuid not null references public.crews (id) on delete cascade,
  item_id             uuid not null references public.items (id) on delete cascade,
  quantity            int not null default 1 check (quantity >= 0),
  equipped            boolean not null default false,
  acquired_by_user_id uuid references public.users (id) on delete set null,
  acquired_at         timestamptz not null default now(),
  unique (crew_id, item_id)
);
create index if not exists crew_inventory_crew_idx on public.crew_inventory (crew_id);

-- ═══ 3. purchases (0002) : colonnes doc §26 ══════════════════════════════════
-- Mapping colonnes existantes : sku = product_id, amount = price_eur,
-- at = purchased_at (0002 fait foi, pas de renommage destructif).
alter table public.purchases
  add column if not exists crew_id  uuid references public.crews (id) on delete set null,
  add column if not exists item_id  uuid references public.items (id) on delete set null,
  add column if not exists currency text not null default 'EUR',
  add column if not exists platform text not null default 'unknown'
    check (platform in ('app_store', 'play_store', 'promo', 'unknown')),
  -- 'applied' = crédité ; 'skipped' = anomalie acquittée (ex. boost sans crew actif).
  add column if not exists status   text not null default 'applied'
    check (status in ('applied', 'skipped'));

-- ═══ 4. item_usage_logs ══════════════════════════════════════════════════════
create table if not exists public.item_usage_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  crew_id     uuid references public.crews (id) on delete set null,
  item_id     uuid not null references public.items (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'crew', 'zone', 'route', 'share', 'profile')),
  target_id   uuid,
  used_at     timestamptz not null default now()
);
create index if not exists item_usage_logs_user_idx on public.item_usage_logs (user_id, used_at desc);

-- ═══ 5. crew_boosts (§13.1/§21) ══════════════════════════════════════════════
-- Un boost n'affecte QUE la progression du coffre (multiplier consommé par le
-- moteur boostedChestProgress, borné par CREW_BOOST_CHEST_MULTIPLIER = 1.25).
-- CREW_BOOST_MAX_ACTIVE = 1 : rc_webhook ENCHAÎNE les fenêtres (starts_at du
-- suivant = ends_at du courant) → jamais deux fenêtres ouvertes en même temps ;
-- le moteur prend de toute façon le MAX (jamais le cumul) en ceinture-bretelles.
-- activated_by_user_id NULLABLE : offrande anonyme (GIFT_ANONYMOUS_ALLOWED).
create table if not exists public.crew_boosts (
  id                   uuid primary key default gen_random_uuid(),
  crew_id              uuid not null references public.crews (id) on delete cascade,
  boost_type           text not null check (boost_type in ('boost_24h', 'boost_72h', 'boost_weekend', 'boost_season')),
  activated_by_user_id uuid references public.users (id) on delete set null,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null check (ends_at > starts_at),
  multiplier           numeric(4, 2) not null check (multiplier >= 1), -- game-rules: CREW_BOOST_CHEST_MULTIPLIER (borne moteur)
  status               text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at           timestamptz not null default now()
);
create index if not exists crew_boosts_crew_idx on public.crew_boosts (crew_id, status);
create index if not exists crew_boosts_expiry_idx on public.crew_boosts (ends_at) where status = 'active';

-- ═══ 6. RPC de crédit d'inventaire (service_role only, rc_webhook) ═══════════
-- Upsert quantité +1 par item_key — idempotence GLOBALE assurée en amont par
-- l'insert purchases (rc_event_id unique) : jamais de double crédit d'un event.
create or replace function public.grant_user_items(
  p_user_id   uuid,
  p_item_keys text[]
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_inventory (user_id, item_id, quantity)
  select p_user_id, i.id, 1
  from public.items i
  where i.item_key = any (p_item_keys)
  on conflict (user_id, item_id)
  do update set quantity = public.user_inventory.quantity + 1;
$$;
revoke all on function public.grant_user_items(uuid, text[]) from public, anon, authenticated;

create or replace function public.grant_crew_item(
  p_crew_id  uuid,
  p_item_key text,
  p_by       uuid  -- null = offrande anonyme (GIFT_ANONYMOUS_ALLOWED)
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.crew_inventory (crew_id, item_id, quantity, acquired_by_user_id)
  select p_crew_id, i.id, 1, p_by
  from public.items i
  where i.item_key = p_item_key
  on conflict (crew_id, item_id)
  do update set quantity = public.crew_inventory.quantity + 1;
$$;
revoke all on function public.grant_crew_item(uuid, text, uuid) from public, anon, authenticated;

-- ═══ 7. RLS (style 0003/0010) ════════════════════════════════════════════════
-- AUCUNE policy d'écriture : seules les Edge Functions (service_role, bypass
-- RLS) écrivent — le client n'attribue jamais un item, un achat ni un boost.
alter table public.items           enable row level security;
alter table public.user_inventory  enable row level security;
alter table public.crew_inventory  enable row level security;
alter table public.item_usage_logs enable row level security;
alter table public.crew_boosts     enable row level security;

revoke insert, update, delete on public.items           from anon, authenticated;
revoke insert, update, delete on public.user_inventory  from anon, authenticated;
revoke insert, update, delete on public.crew_inventory  from anon, authenticated;
revoke insert, update, delete on public.item_usage_logs from anon, authenticated;
revoke insert, update, delete on public.crew_boosts     from anon, authenticated;

-- Catalogue : lisible par tout connecté, items 'draft' invisibles (§23).
create policy items_select_active on public.items
  for select to authenticated
  using (status = 'active');

-- Inventaire perso : chacun le sien.
create policy user_inventory_select_own on public.user_inventory
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Inventaire crew : membres actifs du crew.
create policy crew_inventory_select_member on public.crew_inventory
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_inventory.crew_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

-- Journal d'usage : chacun le sien.
create policy item_usage_logs_select_own on public.item_usage_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Boosts : membres actifs du crew (transparence §13.1 — timer visible de tous).
create policy crew_boosts_select_member on public.crew_boosts
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_boosts.crew_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

-- ═══ 8. SEED catalogue MVP (doc §18-§21, prix §16/§19-§21) ═══════════════════
-- Chaque ligne respecte la règle §17 : nom, type, rareté, prix, consommable,
-- limite, portée, animation_key (icône/animation par clé), description FR.
-- Prix EUR = game-rules SKU_PRICES_EUR ; prix Éclats fonctionnels =
-- SHIELD_EXTRA_ECLATS / STREAK_GEL_ECLATS / SCOUT_PING_ECLATS /
-- BANNER_CREW_ECLATS ; skins premium dans [SKIN_PREMIUM_ECLATS_MIN..MAX] sauf
-- exemples chiffrés du doc §16 (Chartreuse Pulse 150, Ghost 300, Gold Border 400…).
insert into public.items
  (item_key, name, type, rarity, price_shards, price_eur, is_consumable, usage_limit, target_scope, animation_key, description, status)
values
  -- ── Packs (§19) ────────────────────────────────────────────────────────────
  ('starter_pack', 'Starter Pack', 'pack', 'tempo', null, 2.99, false, '1 par compte', 'user', 'pack_opening', '120 Éclats, 1 skin de trace, 1 frame Road, 1 template share, 1 Streak Gel.', 'active'), -- game-rules: SKU_PRICES_EUR.starter_pack, STARTER_PACK_ECLATS
  ('founder_pack', 'Founder Pack', 'pack', 'legend', null, 9.99, false, '1 par compte', 'user', 'pack_opening_founder', '300 Éclats + panoplie Founder : badge, frame, skin territoire, skin trace, titre, template.', 'active'), -- game-rules: SKU_PRICES_EUR.founder_pack, FOUNDER_PACK_ECLATS

  -- ── Éclats (§19.3) — monnaie premium, n''achète JAMAIS le territoire ───────
  ('eclats_s',   'Poignée d''Éclats (100)',   'eclats', 'road',   null, 0.99,  true, null, 'user', 'eclats_burst',   '100 Éclats pour le style : skins, frames, templates.', 'active'), -- game-rules: ECLATS_PACKS.eclats_s
  ('eclats_m',   'Sachet d''Éclats (320)',    'eclats', 'road',   null, 2.99,  true, null, 'user', 'eclats_burst',   '320 Éclats. Le territoire, lui, se gagne en courant.', 'active'), -- game-rules: ECLATS_PACKS.eclats_m
  ('eclats_l',   'Caisse d''Éclats (720)',    'eclats', 'tempo',  null, 5.99,  true, null, 'user', 'eclats_burst',   '720 Éclats pour la personnalisation complète.', 'active'), -- game-rules: ECLATS_PACKS.eclats_l
  ('eclats_xl',  'Coffre d''Éclats (1 500)',  'eclats', 'race',   null, 11.99, true, null, 'user', 'eclats_burst_xl', '1 500 Éclats. Style, statut, organisation.', 'active'), -- game-rules: ECLATS_PACKS.eclats_xl
  ('eclats_xxl', 'Réserve d''Éclats (3 200)', 'eclats', 'carbon', null, 24.99, true, null, 'user', 'eclats_burst_xl', '3 200 Éclats. La victoire, elle, ne s''achète pas.', 'active'), -- game-rules: ECLATS_PACKS.eclats_xxl

  -- ── Objets fonctionnels capés (§20) ────────────────────────────────────────
  ('shield',     'Bouclier',   'shield',     'race',  90,  null, true, '2/semaine max (1 inclus Club) — sans effet en fin de saison', 'zone', 'shield_membrane', 'Protège un secteur pendant 48 h. Ne rend pas invincible.', 'active'), -- game-rules: SHIELD_EXTRA_ECLATS, SHIELD_MAX_ACTIVE_PER_WEEK
  ('streak_gel', 'Streak Gel', 'streak_gel', 'tempo', 60,  null, true, '2/mois max', 'user', 'gel_freeze', 'Protège ta série hebdo une semaine. Aucun effet territoire.', 'active'), -- game-rules: STREAK_GEL_ECLATS
  ('scout_ping', 'Scout Ping', 'scout_ping', 'race',  120, null, true, '1/semaine', 'zone', 'radar_scan', 'Révèle une zone fragile ou rentable. Info temporaire, aucune capture auto.', 'active'), -- game-rules: SCOUT_PING_ECLATS

  -- ── Skins territoire (8, §16.3 — rendu carte réel V1, équipement stocké MVP) ─
  ('skin_territory_gold_border',  'Gold Border',    'skin_territory', 'carbon', 400, null, false, null, 'zone', 'skin_equip', 'Frontières dorées sur tes zones. Trait net, zéro halo.', 'active'), -- doc §16.3
  ('skin_territory_ghost',        'Ghost Territory','skin_territory', 'race',   300, null, false, null, 'zone', 'skin_equip', 'Remplissage fantôme translucide sur tes zones.', 'active'), -- doc §16.3
  ('skin_territory_night_grid',   'Night Grid',     'skin_territory', 'tempo',  220, null, false, null, 'zone', 'skin_equip', 'Trame nocturne discrète à l''intérieur des frontières.', 'active'),
  ('skin_territory_blackout',     'Blackout',       'skin_territory', 'race',   260, null, false, null, 'zone', 'skin_equip', 'Zones en noir profond, frontière ivoire.', 'active'),
  ('skin_territory_ivory_lines',  'Ivory Lines',    'skin_territory', 'tempo',  180, null, false, null, 'zone', 'skin_equip', 'Hachures ivoire fines sur tes territoires.', 'active'), -- game-rules: SKIN_PREMIUM_ECLATS_MIN
  ('skin_territory_ember',        'Ember Edge',     'skin_territory', 'race',   280, null, false, null, 'zone', 'skin_equip', 'Frontières braise sur les zones que tu tiens.', 'active'), -- game-rules: SKIN_PREMIUM_ECLATS_MAX
  ('skin_territory_frost',        'Frostline',      'skin_territory', 'tempo',  240, null, false, null, 'zone', 'skin_equip', 'Liséré givré le long de tes frontières.', 'active'),
  ('skin_territory_founder_glow', 'Founder Glow',   'skin_territory', 'legend', null, null, false, null, 'zone', 'skin_equip_founder', 'Exclusif Founder Pack. Tes zones portent la marque des premiers.', 'active'), -- pack-only (§19.2)

  -- ── Skins trace (8, §16.3) ─────────────────────────────────────────────────
  ('skin_trace_electric',         'Electric Route',   'skin_trace', 'race',   220, null, false, null, 'route', 'skin_equip', 'Ta trace en courant électrique continu.', 'active'), -- doc §16.1
  ('skin_trace_chartreuse_pulse', 'Chartreuse Pulse', 'skin_trace', 'tempo',  150, null, false, null, 'route', 'skin_equip', 'Pulsation chartreuse le long du tracé.', 'active'), -- doc §16.3
  ('skin_trace_neon_ivory',       'Neon Ivory',       'skin_trace', 'tempo',  180, null, false, null, 'route', 'skin_equip', 'Trace ivoire lumineuse, sobre et nette.', 'active'), -- + offert Starter Pack
  ('skin_trace_ghost_line',       'Ghost Line',       'skin_trace', 'tempo',  200, null, false, null, 'route', 'skin_equip', 'Trace semi-transparente, style furtif.', 'active'),
  ('skin_trace_carbon_dash',      'Carbon Dash',      'skin_trace', 'carbon', 260, null, false, null, 'route', 'skin_equip', 'Pointillés carbone haute densité.', 'active'),
  ('skin_trace_midnight',         'Midnight Runner',  'skin_trace', 'tempo',  180, null, false, null, 'route', 'skin_equip', 'Trace bleu nuit pour les sorties tardives.', 'active'),
  ('skin_trace_blade',            'Blade',            'skin_trace', 'race',   240, null, false, null, 'route', 'skin_equip', 'Trait lame, effilé aux extrémités.', 'active'),
  ('skin_trace_founder_line',     'Founder Line',     'skin_trace', 'legend', null, null, false, null, 'route', 'skin_equip_founder', 'Exclusif Founder Pack. La ligne des premiers coureurs.', 'active'), -- pack-only (§19.2)

  -- ── Frames profil (6, §16.1) ───────────────────────────────────────────────
  ('frame_road',    'Frame Road',    'frame_profile', 'road',   null, null, false, null, 'profile', 'frame_equip', 'Cadre Road. Offert avec le Starter Pack.', 'active'), -- pack-only (§19.1)
  ('frame_tempo',   'Frame Tempo',   'frame_profile', 'tempo',  150,  null, false, null, 'profile', 'frame_equip', 'Cadre Tempo pour ta Player Card.', 'active'),
  ('frame_race',    'Frame Race',    'frame_profile', 'race',   200,  null, false, null, 'profile', 'frame_equip', 'Cadre Race, liséré affûté.', 'active'),
  ('frame_carbon',  'Frame Carbon',  'frame_profile', 'carbon', 250,  null, false, null, 'profile', 'frame_equip', 'Cadre Carbon, la référence des réguliers.', 'active'), -- doc §16.1
  ('frame_elite',   'Frame Elite',   'frame_profile', 'elite',  300,  null, false, null, 'profile', 'frame_equip', 'Cadre Elite, réservé au style, jamais au score.', 'active'),
  ('frame_founder', 'Frame Founder', 'frame_profile', 'legend', null, null, false, null, 'profile', 'frame_equip_founder', 'Exclusif Founder Pack.', 'active'), -- pack-only (§19.2)

  -- ── Templates share (6, §16.1) ─────────────────────────────────────────────
  ('template_first_zone',   'Template Première Zone', 'template_share', 'road',   100, null, false, null, 'share', 'template_preview', 'Share card « Première zone » — offert avec le Starter Pack.', 'active'),
  ('template_zone_taken',   'Template Zone Prise',    'template_share', 'tempo',  120, null, false, null, 'share', 'template_preview', 'Share card de capture : la zone, la boucle, ton crew.', 'active'),
  ('template_night_run',    'Template Night Run',     'template_share', 'tempo',  150, null, false, null, 'share', 'template_preview', 'Share card nocturne, fond noir, trace chartreuse.', 'active'),
  ('template_before_after', 'Template Before/After',  'template_share', 'race',   150, null, false, null, 'share', 'template_preview', 'Avant/après de ton territoire sur la semaine.', 'active'),
  ('template_route_opened', 'Template Route Ouverte', 'template_share', 'tempo',  120, null, false, null, 'share', 'template_preview', 'Share card d''ouverture de route.', 'active'),
  ('template_founder',      'Template Founder',       'template_share', 'legend', null, null, false, null, 'share', 'template_preview_founder', 'Exclusif Founder Pack. Raconte la Saison 0.', 'active'), -- pack-only (§19.2)

  -- ── Bannières crew (6, §21.5 : 350 Éclats OU 3,99 €) ───────────────────────
  ('crew_banner_impact',     'Bannière Impact',           'banner_crew', 'race',   350, 3.99, false, null, 'crew', 'banner_reveal', 'Bannière Crew HQ à fort contraste. Équipable par le crew.', 'active'), -- game-rules: BANNER_CREW_ECLATS, SKU_PRICES_EUR.banner_crew (cible du SKU gift)
  ('crew_banner_war_ready',  'Bannière War Ready',        'banner_crew', 'carbon', 350, 3.99, false, null, 'crew', 'banner_reveal', 'Pour les crews qui tiennent leurs frontières.', 'active'), -- doc §16.2
  ('crew_banner_blackline',  'Bannière Black Line',       'banner_crew', 'tempo',  350, 3.99, false, null, 'crew', 'banner_reveal', 'Ligne noire minimale, lisible de loin.', 'active'),
  ('crew_banner_chartreuse', 'Bannière Chartreuse Storm', 'banner_crew', 'race',   350, 3.99, false, null, 'crew', 'banner_reveal', 'Orage chartreuse sur fond noir.', 'active'),
  ('crew_banner_district',   'Bannière District',         'banner_crew', 'tempo',  350, 3.99, false, null, 'crew', 'banner_reveal', 'Le plan de ton quartier en étendard.', 'active'),
  ('crew_banner_legend',     'Bannière Legend Row',       'banner_crew', 'elite',  350, 3.99, false, null, 'crew', 'banner_reveal', 'Pour les crews qui écrivent l''histoire locale.', 'active'),

  -- ── Blasons crew premium (§16.2) ───────────────────────────────────────────
  ('crew_emblem_ghost',   'Blason Ghost',   'emblem_crew', 'race',   450, null, false, null, 'crew', 'emblem_forge', 'Blason translucide, présence discrète.', 'active'),
  ('crew_emblem_carbon',  'Blason Carbon',  'emblem_crew', 'carbon', 500, null, false, null, 'crew', 'emblem_forge', 'Blason Carbon — statut, jamais autorité.', 'active'), -- doc §16.2
  ('crew_emblem_gold',    'Blason Or',      'emblem_crew', 'elite',  600, null, false, null, 'crew', 'emblem_forge', 'Blason doré pour la vitrine du crew.', 'active'),
  ('crew_emblem_founder', 'Blason Founder', 'emblem_crew', 'legend', 700, null, false, null, 'crew', 'emblem_forge', 'Le blason des crews de la première heure.', 'active'), -- doc §16.2 (Founder Glow 700)

  -- ── Crew Boosts (§13.1/§21) — effet coffre UNIQUEMENT, capé, non cumulable ─
  ('crew_boost_24',      'Crew Boost 24 h',    'crew_boost', 'tempo',  null, 1.99,  true, '1 boost actif à la fois — aucun effet sur les 48 dernières h de saison', 'crew', 'boost_ignite', '+25 % de progression du coffre crew pendant 24 h. Jamais de points.', 'active'), -- game-rules: CREW_BOOSTS.crew_boost_24, CREW_BOOST_CHEST_MULTIPLIER, BOOST_BLACKOUT_END_OF_SEASON_H
  ('crew_boost_72',      'Crew Boost 72 h',    'crew_boost', 'race',   null, 4.99,  true, '1 boost actif à la fois — aucun effet sur les 48 dernières h de saison', 'crew', 'boost_ignite', '+25 % de progression du coffre crew pendant 72 h.', 'active'), -- game-rules: CREW_BOOSTS.crew_boost_72
  ('crew_boost_weekend', 'Crew Boost Weekend', 'crew_boost', 'race',   null, 6.99,  true, '1 boost actif à la fois — aucun effet sur les 48 dernières h de saison', 'crew', 'boost_ignite_weekend', 'Le coffre du crew accélère tout le weekend. Bannière d''événement incluse.', 'active'), -- game-rules: CREW_BOOSTS.crew_boost_weekend
  ('crew_boost_season',  'Crew Boost Saison',  'crew_boost', 'carbon', null, 14.99, true, '1 boost actif à la fois — aucun effet sur les 48 dernières h de saison', 'crew', 'boost_ignite_season', '+25 % coffre jusqu''à la fin de saison + statut « Crew Boosted ».', 'active'), -- game-rules: CREW_BOOSTS.crew_boost_season

  -- ── Gifting crew (§21.3/§21.4) ─────────────────────────────────────────────
  ('crew_cosmetic_chest',   'Coffre cosmétique crew',      'cosmetic_chest',   'race',  null, 2.99, true,  null, 'crew',  'chest_opening', 'Récompenses cosmétiques aléatoires pour le crew. Zéro zone, zéro point.', 'active'), -- game-rules: SKU_PRICES_EUR.cosmetic_chest_crew
  ('crew_recruit_template', 'Template recrutement premium','recruit_template', 'tempo', 150,  0.99, false, null, 'share', 'template_preview', 'Story de recrutement premium (9:16, 1:1, 16:9) avec blason et territoire.', 'active'), -- game-rules: SKU_PRICES_EUR.recruit_template_crew ; doc §16.2 (150 Éclats)

  -- ── Cosmétiques pack-only Founder (§19.2) ──────────────────────────────────
  ('founder_badge',        'Badge Founder',           'badge', 'legend', null, null, false, null, 'profile', 'badge_unlock',  'Exclusif Founder Pack. Tu étais là avant la carte.', 'active'),
  ('title_founder_runner', 'Titre « Founder Runner »','title', 'legend', null, null, false, null, 'profile', 'title_reveal', 'Exclusif Founder Pack. Un titre, pas un pouvoir.', 'active'),

  -- ── GRYD Pass (§23) — catalogué INACTIF tant que les 30 niveaux n''existent pas ─
  ('gryd_pass', 'GRYD Pass', 'season_pass', 'carbon', null, 7.99, false, '1 par saison', 'user', 'pass_reveal', '30 niveaux de récompenses de saison. Pas lancé avant que le contenu existe.', 'draft'); -- game-rules: SKU_PRICES_EUR.gryd_pass — status draft (§23)
