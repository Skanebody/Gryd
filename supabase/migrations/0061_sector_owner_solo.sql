-- 0061_sector_owner_solo.sql
-- GRYD — LE SECTEUR NE MENT PLUS : plancher de domination + le joueur SANS CREW
-- existe. Complète 0037 (sector_snapshot) et la matview sector_control (0002).
--
-- ─── LES DEUX MENSONGES CORRIGÉS ────────────────────────────────────────────
-- 1. LE SOLO ÉTAIT EFFACÉ DU MONDE. `sector_control` (0002) part de
--    `active_members` (crew_members where left_at is null) : un joueur SANS crew
--    n'y produit AUCUNE ligne. Son secteur ressortait donc owner = null /
--    neutre = 100 % — la carte annonçait « neutre » un secteur RÉELLEMENT tenu.
--    C'est un mensonge, et c'est aujourd'hui le cas MAJORITAIRE (0 crew en
--    production, l'auth bloquant encore la capture). Cette migration ajoute une
--    source d'agrégation `sector_holdings` qui compte les hexes d'un joueur sans
--    crew POUR LUI (holder_kind = 'user'), et les colonnes de snapshot qui
--    portent cette identité.
-- 2. LE PLANCHER DE DOMINATION est posé côté MOTEUR (packages/engine/
--    sectorSnapshot.ts) : un détenteur n'est retenu qu'à partir de
--    SECTOR_CONTROL_THRESHOLDS.implantation (10 %). Rien à écrire ici — le SQL
--    ne connaît pas les seuils de jeu (aucun nombre magique en base).
--
-- ─── POURQUOI UNE VUE, ET PAS UNE MODIFICATION DE LA MATVIEW ────────────────
-- `sector_control` est une vue MATÉRIALISÉE dont l'unicité (sector_id, crew_id)
-- porte le `refresh`, qui est lue par le client (grant select authenticated,
-- 0003) et rafraîchie par decay_job. Y injecter des lignes à `crew_id is null`
-- casserait cette unicité (NULLs non distincts pour un index unique) et
-- changerait le contrat d'une surface déjà consommée. On la LAISSE INTACTE :
-- elle reste la table de contrôle PAR CREW. La nouvelle vue `sector_holdings`
-- est la source d'agrégation COMPLÈTE (crews + solos), lue par le seul job
-- recompute_sectors (service_role). Vue simple, non matérialisée : le job la lit
-- une fois par passage (*/15), soit exactement le travail qu'un refresh de
-- matview ferait — sans l'étage de staleness en plus.

-- ═══ 1. sector_snapshot : porter l'identité d'un propriétaire SOLO ══════════
alter table public.sector_snapshot
  add column if not exists owner_user_id     uuid references public.users (id) on delete set null,
  add column if not exists top_rival_user_id uuid references public.users (id) on delete set null;

-- Un détenteur est un crew OU un joueur, jamais les deux (garde-fou d'écriture).
alter table public.sector_snapshot
  drop constraint if exists sector_snapshot_owner_one_identity;
alter table public.sector_snapshot
  add constraint sector_snapshot_owner_one_identity
  check (owner_crew_id is null or owner_user_id is null);

alter table public.sector_snapshot
  drop constraint if exists sector_snapshot_rival_one_identity;
alter table public.sector_snapshot
  add constraint sector_snapshot_rival_one_identity
  check (top_rival_crew_id is null or top_rival_user_id is null);

-- owner_kind / top_rival_kind : DÉRIVÉS, jamais écrits. Une colonne générée ne
-- peut pas se désynchroniser de l'identité qu'elle qualifie (et si l'identité
-- disparaît — crew supprimé, compte purgé, `on delete set null` — le kind
-- redevient null tout seul : le secteur se déclare neutre, ce qui est la vérité
-- jusqu'au prochain passage du job). Le job N'ÉCRIT PAS ces colonnes.
alter table public.sector_snapshot
  add column if not exists owner_kind text
  generated always as (
    case when owner_crew_id is not null then 'crew'::text
         when owner_user_id is not null then 'user'::text end
  ) stored;

alter table public.sector_snapshot
  add column if not exists top_rival_kind text
  generated always as (
    case when top_rival_crew_id is not null then 'crew'::text
         when top_rival_user_id is not null then 'user'::text end
  ) stored;

-- Le propriétaire n'est pas son propre rival — étendu aux détenteurs SOLO
-- (deux joueurs sans crew peuvent se disputer un secteur : ce sont deux
-- identités `user`, la contrainte crew d'origine ne les couvrait pas).
alter table public.sector_snapshot
  drop constraint if exists sector_snapshot_owner_ne_rival;
alter table public.sector_snapshot
  add constraint sector_snapshot_owner_ne_rival
  check (
    (owner_crew_id is null or top_rival_crew_id is null or owner_crew_id <> top_rival_crew_id)
    and
    (owner_user_id is null or top_rival_user_id is null or owner_user_id <> top_rival_user_id)
  );

-- Lecture « mes secteurs » pour un joueur solo (miroir de sector_snapshot_owner_idx).
create index if not exists sector_snapshot_owner_user_idx
  on public.sector_snapshot (owner_user_id) where owner_user_id is not null;

-- Les colonnes ajoutées héritent de la RLS et des grants de la table (0037) :
-- select authenticated, aucune écriture client. On le REDIT explicitement — un
-- `add column` ne doit jamais ouvrir une porte d'écriture par distraction.
revoke insert, update, delete on public.sector_snapshot from anon, authenticated;
-- L'identité exposée est un `users.id` : le pseudo se résout via la vue
-- `public_profiles` (0003, select authenticated) — aucune donnée perso de plus
-- ne transite ici que ce qu'un classement expose déjà.

-- ═══ 2. sector_holdings : la source d'agrégation qui n'oublie personne ══════
-- Une ligne par (secteur, détenteur) où détenteur = crew du joueur s'il en a un,
-- SINON le joueur lui-même. `control_percent` est une FRACTION [0;1] — mêmes
-- unités que game-rules: SECTOR_CONTROL_THRESHOLDS, consommée telle quelle par
-- le moteur pur `rollupSectorControl` (qui applique, lui, le plancher).
-- Un joueur ne peut appartenir qu'à UN crew actif (index unique
-- crew_members_one_active_per_user, 0002) : la jointure ne peut pas dupliquer
-- ses hexes.
create or replace view public.sector_holdings as
with live as (
  select hc.sector_id, hc.owner_user_id
  from public.hex_claims hc
  where hc.sector_id is not null
    and (hc.decay_at is null or hc.decay_at > now()) -- hexes déjà décayés = terrain libre
),
attributed as (
  select
    l.sector_id,
    cm.crew_id,                                                 -- null = joueur sans crew
    case when cm.crew_id is null then l.owner_user_id end as holder_user_id
  from live l
  left join public.crew_members cm
    on cm.user_id = l.owner_user_id and cm.left_at is null
),
owned as (
  select sector_id, crew_id, holder_user_id, count(*)::integer as owned_hexes
  from attributed
  group by sector_id, crew_id, holder_user_id
)
select
  o.sector_id,
  o.crew_id,
  o.holder_user_id,
  case when o.crew_id is null then 'user' else 'crew' end as holder_kind,
  o.owned_hexes,
  coalesce(round(o.owned_hexes::numeric / nullif(s.total_hexes, 0), 4), 0) as control_percent
from owned o
join public.sectors s on s.id = o.sector_id;

comment on view public.sector_holdings is
  'Contrôle de secteur par DÉTENTEUR (crew, ou joueur sans crew). Source du job recompute_sectors. Le plancher de domination vit dans le moteur (game-rules), pas ici.';

-- Grants : job SEUL. Supabase accorde par défaut les tables/vues du schéma
-- public à anon+authenticated — on révoque explicitement (PUBLIC compris) avant
-- d'accorder au service_role, sinon la vue serait lisible par tout le monde.
revoke all on public.sector_holdings from public, anon, authenticated;
grant select on public.sector_holdings to service_role;
