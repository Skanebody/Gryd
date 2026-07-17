-- 0037_sector_snapshot.sql
-- GRYD — AMENDEMENT-41 §2 : pré-calcul par SECTEUR (§C « pré-calcul serveur »).
--
-- La vue matérialisée `sector_control` (0002) donne, par (secteur, crew), le %
-- d'hexes tenus. Ce snapshot la ROULE en UNE ligne par secteur, viewer-INDÉPENDANTE :
-- propriétaire majoritaire + rival principal + parts + pressure_score (0-100) +
-- statut §C 5 niveaux + contesté. Le CLIENT reçoit ces lignes agrégées (pas toute
-- la base — §C « jamais 200k runners ») et y applique SON rôle via deriveSectorView.
--
-- Écrit UNIQUEMENT par le job `recompute_sectors` (moteur pur engine/sectorSnapshot),
-- jamais par le client. Lecture authenticated.

create table if not exists public.sector_snapshot (
  sector_id         uuid primary key references public.sectors (id) on delete cascade,
  owner_crew_id     uuid references public.crews (id) on delete set null,
  owner_percent     numeric  not null default 0 check (owner_percent     >= 0 and owner_percent     <= 1),
  top_rival_crew_id uuid references public.crews (id) on delete set null,
  top_rival_percent numeric  not null default 0 check (top_rival_percent >= 0 and top_rival_percent <= 1),
  neutral_percent   numeric  not null default 1 check (neutral_percent   >= 0 and neutral_percent   <= 1),
  -- pressure_score / status_level : game-rules §C (SECTOR_PRESSURE_MAX 100, 5 niveaux 0-4).
  pressure_score    smallint not null default 0 check (pressure_score >= 0 and pressure_score <= 100),
  status_level      smallint not null default 0 check (status_level   >= 0 and status_level   <= 4),
  contested         boolean  not null default false,
  last_attack_at    timestamptz,
  updated_at        timestamptz not null default now()
);

-- Un secteur ne peut pas être son propre rival (garde-fou d'agrégation).
alter table public.sector_snapshot
  add constraint sector_snapshot_owner_ne_rival
  check (owner_crew_id is null or top_rival_crew_id is null or owner_crew_id <> top_rival_crew_id);

-- Lecture par crew propriétaire / rival (jointures carte) + secteurs chauds.
create index if not exists sector_snapshot_owner_idx    on public.sector_snapshot (owner_crew_id);
create index if not exists sector_snapshot_pressure_idx on public.sector_snapshot (pressure_score desc);

-- ─── RLS : lecture authenticated, écriture service_role uniquement (job) ──────
alter table public.sector_snapshot enable row level security;
revoke insert, update, delete on public.sector_snapshot from anon, authenticated;
drop policy if exists sector_snapshot_select_all on public.sector_snapshot;
create policy sector_snapshot_select_all on public.sector_snapshot
  for select to authenticated
  using (true);
