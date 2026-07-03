-- GRYD — 0002 schéma (SPEC §6.2 + AMENDEMENT-02 §9, décisions D13/D14).
-- Toutes les constantes littérales sont tracées par un commentaire `-- game-rules: <NOM>`
-- (source de vérité : packages/shared/src/game-rules.ts).

-- ─── city_zones ──────────────────────────────────────────────────────────────
-- AMENDEMENT-02 §2 : la France entière est capturable — les zones ne bornent
-- PLUS la capture, elles ne servent qu'à la densité (mode Guerre, bonus
-- pionnier). GeoJSON stocké en jsonb (géométrie brute) ; PostGIS dispo si
-- besoin de requêtes spatiales plus tard.
create table public.city_zones (
  city_id    text primary key,
  name       text not null,
  geojson    jsonb not null,
  -- Densité de zone (AMENDEMENT-02 §2) : plus de 'open'/'waitlist' bloquant.
  status     text not null default 'wild' check (status in ('active', 'emerging', 'pioneer', 'wild')),
  created_at timestamptz not null default now()
);

-- ─── users ───────────────────────────────────────────────────────────────────
-- Profil applicatif, 1:1 avec auth.users.
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  pseudo        text not null unique,
  city_id       text references public.city_zones (city_id) on delete set null,
  created_at    timestamptz not null default now(),
  streak_weeks  integer not null default 0 check (streak_weeks >= 0),
  foulees       integer not null default 0 check (foulees >= 0),
  eclats        integer not null default 0 check (eclats >= 0),
  is_club       boolean not null default false,
  referral_code text not null unique default encode(extensions.gen_random_bytes(4), 'hex'),
  referred_by   uuid references public.users (id) on delete set null,
  -- XP joueur permanent : jamais acheté, survit au reset de saison (AMENDEMENT-02 §6).
  xp            bigint not null default 0 check (xp >= 0),
  level         integer not null default 1 check (level >= 1)
);

-- ─── crews ───────────────────────────────────────────────────────────────────
create table public.crews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  color      smallint not null check (color >= 0 and color < 12), -- game-rules: CREW_COLORS_COUNT
  city_id    text not null references public.city_zones (city_id) on delete restrict,
  code       char(6) not null unique check (code ~ '^[A-Z0-9]{6}$'), -- game-rules: CREW_CODE_LENGTH
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
-- Bornes 2-10 membres (CREW_MIN/MAX_MEMBERS) : appliquées côté Edge Function,
-- non exprimables proprement en DDL.

-- ─── crew_members ────────────────────────────────────────────────────────────
-- Historique complet des adhésions (left_at nullable) : nécessaire au cooldown
-- de changement de crew de 7 j (game-rules: CREW_SWITCH_COOLDOWN_DAYS, §3.5).
create table public.crew_members (
  crew_id   uuid not null references public.crews (id) on delete cascade,
  user_id   uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at   timestamptz check (left_at is null or left_at >= joined_at),
  primary key (crew_id, user_id, joined_at)
);
create index crew_members_user_idx on public.crew_members (user_id);
-- Un seul crew actif par joueur à la fois.
create unique index crew_members_one_active_per_user
  on public.crew_members (user_id) where left_at is null;

-- ─── seasons ─────────────────────────────────────────────────────────────────
create table public.seasons (
  id        uuid primary key default gen_random_uuid(),
  city_id   text not null references public.city_zones (city_id) on delete restrict,
  starts_at timestamptz not null,
  ends_at   timestamptz not null check (ends_at > starts_at),
  status    text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed'))
);
-- Une seule saison active par ville.
create unique index seasons_one_active_per_city
  on public.seasons (city_id) where status = 'active';

-- ─── sectors ─────────────────────────────────────────────────────────────────
-- Unité stratégique (AMENDEMENT-02 §2, arbitrage A3) : secteurs auto-générés
-- simples — une cellule H3 res 7 = un secteur, nommage par géocodage inverse
-- différé. city_id nullable : un secteur rural n'appartient à aucune zone.
create table public.sectors (
  id             uuid primary key default gen_random_uuid(),
  city_id        text references public.city_zones (city_id) on delete set null,
  name           text not null,
  type           text not null check (type in ('urban', 'suburban', 'rural', 'wild')),
  center_h3_res7 bigint not null unique, -- game-rules: SECTOR_H3_RESOLUTION
  geojson        jsonb,
  total_hexes    integer not null check (total_hexes > 0),
  created_at     timestamptz not null default now()
);
create index sectors_city_idx on public.sectors (city_id) where city_id is not null;

-- ─── runs ────────────────────────────────────────────────────────────────────
-- Écrite uniquement par service_role (Edge Function ingest_run) — cf. 0003_rls.
create table public.runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  client_run_id  uuid not null,
  source         text not null check (source in ('gps', 'healthkit')),
  started_at     timestamptz not null,
  distance_m     integer not null check (distance_m >= 0),
  duration_s     integer not null check (duration_s >= 0),
  avg_pace_s_km  integer check (avg_pace_s_km > 0),
  -- 'partial' (AMENDEMENT-02 §4) : segments douteux exclus, le reste claim.
  status         text not null check (status in ('valid', 'partial', 'flagged', 'rejected')),
  reject_reason  text,
  polyline_masked text, -- trace déjà expurgée des zones privées (§7) ; purge à 90 j (RAW_POLYLINE_RETENTION_DAYS) côté job
  points_awarded integer not null default 0 check (points_awarded >= 0),
  -- GRYD Verify (AMENDEMENT-02 §4) : scores nullable, remplis au fil des versions.
  trust_score    smallint check (trust_score between 0 and 100),
  gps_trust      smallint check (gps_trust between 0 and 100),
  motion_trust   smallint check (motion_trust between 0 and 100),
  step_count     integer check (step_count >= 0), -- podomètre, cohérence pas/distance
  -- XP joueur crédité par cette course (AMENDEMENT-02 §6, D18 : 1:1 points territoire).
  xp_awarded     integer not null default 0 check (xp_awarded >= 0),
  celebration    jsonb, -- payload de célébration persisté : un retry d'ingest_run renvoie ce résultat (D14)
  created_at     timestamptz not null default now(),
  -- Idempotence ingest_run (D14) : le client génère client_run_id, un retry matche ici.
  constraint runs_user_client_run_unique unique (user_id, client_run_id)
);
create index runs_user_started_idx on public.runs (user_id, started_at desc);

-- ─── hex_claims ──────────────────────────────────────────────────────────────
-- Un hex H3 res 10 = une ligne ; pas de ligne = hex neutre. h3index en BIGINT (D13).
-- city_id NULLABLE (AMENDEMENT-02 §2) : la France entière est capturable, un
-- claim hors zone dense n'est rattaché à aucune city_zone.
create table public.hex_claims (
  h3index          bigint primary key,
  city_id          text references public.city_zones (city_id) on delete set null,
  sector_id        uuid references public.sectors (id) on delete set null, -- rattachement stratégique (res 7), posé par ingest_run
  owner_user_id    uuid not null references public.users (id) on delete cascade,
  crew_color_cache smallint check (crew_color_cache >= 0 and crew_color_cache < 12), -- game-rules: CREW_COLORS_COUNT
  claim_type       text not null check (claim_type in ('neutral', 'stolen', 'defended', 'pioneer')),
  claimed_at       timestamptz not null default now(),
  run_id           uuid references public.runs (id) on delete set null,
  locked_until     timestamptz, -- lock 24 h anti ping-pong (HEX_LOCK_HOURS)
  shielded_until   timestamptz, -- bouclier 48 h (SHIELD_DURATION_HOURS)
  decay_at         timestamptz  -- claimed_at + 21 j (DECAY_DAYS), repoussé à chaque défense ; null = protégé (compte < 14 j)
);
create index hex_claims_city_idx   on public.hex_claims (city_id) where city_id is not null;
create index hex_claims_sector_idx on public.hex_claims (sector_id) where sector_id is not null;
create index hex_claims_owner_idx  on public.hex_claims (owner_user_id);
create index hex_claims_decay_idx  on public.hex_claims (decay_at) where decay_at is not null;

-- ─── shields ─────────────────────────────────────────────────────────────────
create table public.shields (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  center_h3    bigint not null,
  hex_count    integer not null check (hex_count between 1 and 300), -- game-rules: SHIELD_MAX_CLUSTER_HEXES
  activated_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  source       text not null check (source in ('club', 'eclats'))
);
create index shields_user_idx on public.shields (user_id, activated_at desc);

-- ─── season_scores ───────────────────────────────────────────────────────────
create table public.season_scores (
  season_id  uuid not null references public.seasons (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  points     integer not null default 0 check (points >= 0),
  rank_cache integer,
  primary key (season_id, user_id)
);
create index season_scores_points_idx on public.season_scores (season_id, points desc);

-- ─── purchases ───────────────────────────────────────────────────────────────
-- Alimentée par le webhook RevenueCat (service_role) ; rc_event_id unique = idempotence webhook.
create table public.purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  sku         text not null,
  rc_event_id text not null unique,
  amount      numeric(10, 2),
  at          timestamptz not null default now()
);
create index purchases_user_idx on public.purchases (user_id, at desc);

-- ─── privacy_zones ───────────────────────────────────────────────────────────
-- §7 : centre stocké en H3 res 8 (grossier) — JAMAIS de lat/lng exact en base.
create table public.privacy_zones (
  user_id        uuid not null references public.users (id) on delete cascade,
  zone_index     smallint not null check (zone_index between 0 and 2), -- game-rules: PRIVACY_ZONES_MAX (3 zones : index 0-2)
  center_h3_res8 bigint not null, -- game-rules: PRIVACY_ZONE_H3_RESOLUTION
  radius_m       integer not null default 300 -- game-rules: PRIVACY_ZONE_DEFAULT_RADIUS_M
    check (radius_m between 200 and 500), -- game-rules: PRIVACY_ZONE_RADIUS_MIN_M / PRIVACY_ZONE_RADIUS_MAX_M
  created_at     timestamptz not null default now(),
  primary key (user_id, zone_index)
);

-- ─── referrals ───────────────────────────────────────────────────────────────
create table public.referrals (
  referrer_id      uuid not null references public.users (id) on delete cascade,
  referee_id       uuid not null references public.users (id) on delete cascade,
  activated_at     timestamptz, -- posé par le serveur après la 1re course validée du filleul (§3.7)
  boost_expires_at timestamptz, -- activated_at + 7 j (REFERRAL_BOOST_DAYS)
  created_at       timestamptz not null default now(),
  primary key (referrer_id, referee_id),
  check (referrer_id <> referee_id)
);
-- Un filleul n'a qu'un parrain.
create unique index referrals_referee_unique on public.referrals (referee_id);

-- ─── waitlist ────────────────────────────────────────────────────────────────
-- Alimentée sans compte depuis le site (§3.1 hors-zone + apps/web).
create table public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email_or_user text not null,
  postal_code   text not null,
  created_at    timestamptz not null default now(),
  unique (email_or_user, postal_code)
);

-- ─── outposts ────────────────────────────────────────────────────────────────
-- Avant-poste V0 minimal (AMENDEMENT-02 §8) : détection ≥ 100 hexes dans un
-- rayon de 2 km (OUTPOST_MIN_HEXES / OUTPOST_RADIUS_KM) → badge + cette entrée.
-- crew_id nullable : un joueur sans crew peut fonder un avant-poste.
create table public.outposts (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid references public.crews (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  center_h3  bigint not null,
  hex_count  integer not null check (hex_count >= 100), -- game-rules: OUTPOST_MIN_HEXES
  created_at timestamptz not null default now()
);
create index outposts_user_idx on public.outposts (user_id);
create index outposts_crew_idx on public.outposts (crew_id) where crew_id is not null;

-- ─── no_capture_zones ────────────────────────────────────────────────────────
-- Zones non capturables (AMENDEMENT-02 §2) : autoroutes, zones militaires…
-- Traversables dans la trace, mais aucun claim ; jamais recommandées en objectif.
create table public.no_capture_zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  geojson    jsonb not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

-- ─── missions / mission_progress ─────────────────────────────────────────────
-- MVP (AMENDEMENT-02 §6) : 5 missions d'onboarding + objectif du jour + hebdo simples.
create table public.missions (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  scope         text not null check (scope in ('daily', 'weekly', 'onboarding', 'crew')),
  target        integer not null check (target > 0),
  reward_type   text not null check (reward_type in ('xp', 'foulees', 'badge')),
  reward_amount integer not null default 0 check (reward_amount >= 0),
  created_at    timestamptz not null default now()
);

create table public.mission_progress (
  mission_id   uuid not null references public.missions (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  progress     integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  primary key (mission_id, user_id)
);
create index mission_progress_user_idx on public.mission_progress (user_id);

-- ─── badges / user_badges ────────────────────────────────────────────────────
-- ~20 badges de base (AMENDEMENT-02 §6) ; rangs Shoe Rank complets = V1.
create table public.badges (
  key    text primary key,
  family text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legend'))
);

create table public.user_badges (
  user_id   uuid not null references public.users (id) on delete cascade,
  badge_key text not null references public.badges (key) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);
create index user_badges_badge_idx on public.user_badges (badge_key);

-- ─── Vues classements (§3.5 : 2 classements par ville) ───────────────────────

-- Classement joueurs : points de saison, pseudo public.
-- Vue "owner" (postgres) : contourne le RLS des tables sous-jacentes,
-- n'expose que des colonnes publiques. Accès contrôlé par GRANT (0003).
create view public.player_leaderboard as
select
  ss.season_id,
  s.city_id,
  ss.user_id,
  u.pseudo,
  ss.points,
  ss.rank_cache
from public.season_scores ss
join public.seasons s on s.id = ss.season_id
join public.users u on u.id = ss.user_id;

-- Classement crews : hexes détenus (union des hexes des membres actifs, hors decay)
-- + points cumulés des membres sur la saison active de la ville du crew.
-- Matérialisée : rafraîchie par job (refresh materialized view concurrently public.crew_leaderboard).
create materialized view public.crew_leaderboard as
with active_members as (
  select cm.crew_id, cm.user_id
  from public.crew_members cm
  where cm.left_at is null
),
hexes as (
  select am.crew_id, hc.city_id, count(*)::integer as hexes_held
  from active_members am
  join public.hex_claims hc on hc.owner_user_id = am.user_id
  where hc.decay_at is null or hc.decay_at > now()
  group by am.crew_id, hc.city_id
),
points as (
  select am.crew_id, s.city_id, sum(ss.points)::integer as points_total
  from active_members am
  join public.season_scores ss on ss.user_id = am.user_id
  join public.seasons s on s.id = ss.season_id and s.status = 'active'
  group by am.crew_id, s.city_id
)
select
  c.id as crew_id,
  c.city_id,
  c.name,
  c.color,
  coalesce(h.hexes_held, 0)   as hexes_held,
  coalesce(p.points_total, 0) as points_total
from public.crews c
left join hexes  h on h.crew_id = c.id and h.city_id = c.city_id
left join points p on p.crew_id = c.id and p.city_id = c.city_id;

-- Index unique requis pour `refresh materialized view concurrently`.
create unique index crew_leaderboard_crew_idx on public.crew_leaderboard (crew_id);
create index crew_leaderboard_city_idx on public.crew_leaderboard (city_id, points_total desc);

-- ─── sector_control (vue matérialisée, AMENDEMENT-02 §2) ─────────────────────
-- Contrôle de secteur par crew : % d'hexes possédés (hors decay) par les
-- membres actifs. control_percent est une FRACTION [0;1] — mêmes unités que
-- game-rules: SECTOR_CONTROL_THRESHOLDS. Compacité/activité récente = V1.
-- Rafraîchie par job (refresh materialized view concurrently public.sector_control).
create materialized view public.sector_control as
with active_members as (
  select cm.crew_id, cm.user_id
  from public.crew_members cm
  where cm.left_at is null
),
owned as (
  select hc.sector_id, am.crew_id, count(*)::integer as owned_hexes
  from public.hex_claims hc
  join active_members am on am.user_id = hc.owner_user_id
  where hc.sector_id is not null
    and (hc.decay_at is null or hc.decay_at > now())
  group by hc.sector_id, am.crew_id
)
select
  o.sector_id,
  o.crew_id,
  o.owned_hexes,
  round(o.owned_hexes / nullif(s.total_hexes, 0)::numeric, 4) as control_percent,
  case -- game-rules: SECTOR_CONTROL_THRESHOLDS (bornes basses 0.1 / 0.3 / 0.5 / 0.7)
    when o.owned_hexes >= s.total_hexes * 0.7 then 'dominated'
    when o.owned_hexes >= s.total_hexes * 0.5 then 'controlled'
    when o.owned_hexes >= s.total_hexes * 0.3 then 'contested'
    when o.owned_hexes >= s.total_hexes * 0.1 then 'implantation'
    else 'presence'
  end as status
from owned o
join public.sectors s on s.id = o.sector_id;

-- Index unique requis pour `refresh materialized view concurrently`.
create unique index sector_control_sector_crew_idx on public.sector_control (sector_id, crew_id);
create index sector_control_crew_idx on public.sector_control (crew_id);
