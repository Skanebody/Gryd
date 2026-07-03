-- GRYD — 0010 Crews Supercell MVP (AMENDEMENT-06 §2, doc v3 §33-§53).
-- Source de vérité des constantes : packages/shared/src/game-rules.ts
--   (CREW_XP_TABLE, CREW_ROLES, WAR_AVAILABILITY, CREW_CHEST_TIERS, …).
--   AUCUN nombre magique dupliqué ici : les valeurs (barème XP, cap quotidien,
--   cibles de coffre, poids) restent côté serveur/moteur ; la DB ne stocke que
--   des états. Les CHECK n'encodent que des ÉNUMÉRATIONS (rôles, statuts).
--
-- Contenu :
--   1. crews  += xp / level / activity_score / activity_status / langue /
--      objectif / statut (open|request|closed) + signaux discovery.
--   2. crew_members += role (7 rôles §36, default runner, leader=created_by
--      backfill) + war_availability (§37.2).
--   3. crew_chests / offensives / offensive_contributions / defense_missions.
--   4. RPC add_crew_xp (security definer, service_role) — crédit atomique XP +
--      recalcul du niveau depuis la table game-rules (passée en paramètre par
--      l'Edge Function pour ne pas dupliquer le barème en SQL).
--   5. refresh_crew_activity : fonction SQL de recalcul hebdo de l'Activity
--      Score (digest_job) — proxy MVP documenté.
--   6. RLS style 0003 : lecture réservée aux membres du crew via crew_members ;
--      écriture service_role only (les endpoints rôle-gated sont V1, cf. TODO).

-- ═══ 1. crews : progression + discovery ══════════════════════════════════════
alter table public.crews
  add column if not exists xp             bigint  not null default 0 check (xp >= 0),
  add column if not exists level          int     not null default 1 check (level >= 1),
  add column if not exists activity_score int     not null default 0
    check (activity_score between 0 and 100),
  add column if not exists activity_status text  not null default 'dormant'
    check (activity_status in ('dormant', 'casual', 'active', 'competitive', 'war_ready')),
  add column if not exists langue         text    not null default 'fr',
  add column if not exists objectif       text    not null default 'casual'
    check (objectif in ('casual', 'competitif', 'pionnier')),
  add column if not exists statut         text    not null default 'open'
    check (statut in ('open', 'request', 'closed')),
  -- Signaux discovery (§46) — dérivés par les jobs, non écrits par le client.
  add column if not exists war_active        boolean not null default false,
  add column if not exists defense_active    boolean not null default false,
  add column if not exists beginner_friendly boolean not null default false,
  add column if not exists competitive       boolean not null default false,
  add column if not exists pioneer_friendly  boolean not null default false;

create index if not exists crews_discovery_idx
  on public.crews (city_id, statut, level desc);

-- ═══ 2. crew_members : rôle + disponibilité de guerre ════════════════════════
-- role : 7 rôles §36 (default runner) ; leader backfillé = created_by du crew.
alter table public.crew_members
  add column if not exists role text not null default 'runner'
    check (role in ('runner', 'scout', 'defender', 'raider', 'captain', 'co_captain', 'leader')),
  add column if not exists war_availability text not null default 'casual'
    check (war_availability in ('war', 'defense', 'exploration', 'casual', 'absent'));

-- Backfill : le créateur du crew devient leader (adhésion active uniquement).
update public.crew_members cm
set role = 'leader'
from public.crews c
where cm.crew_id = c.id
  and cm.user_id = c.created_by
  and cm.left_at is null
  and cm.role = 'runner';

-- ═══ 3a. crew_chests : coffre hebdomadaire (§39) ═════════════════════════════
-- week_start = lundi ISO (date) de la semaine. tier_reached : plus haut palier
-- atteint (null tant que < bronze). Figé à la clôture par digest_job.
create table if not exists public.crew_chests (
  crew_id      uuid not null references public.crews (id) on delete cascade,
  week_start   date not null,
  progress     bigint not null default 0 check (progress >= 0),
  tier_reached text check (tier_reached in ('bronze', 'silver', 'gold', 'carbon', 'elite')),
  claimed_at   timestamptz,
  closed_at    timestamptz, -- posé par digest_job à la clôture de semaine
  primary key (crew_id, week_start)
);

-- ═══ 3a-bis. crew_xp_daily : compteur du cap anti-farm par membre/jour (§34.1) ═
-- CREW_XP_DAILY_CAP_PER_MEMBER s'applique par membre ET par jour : on mémorise
-- l'XP crew déjà générée par ce membre aujourd'hui (jour UTC) pour que
-- cappedCrewXp (moteur) borne la course suivante. Purgeable (rétention courte).
create table if not exists public.crew_xp_daily (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  day     date not null,
  xp      int  not null default 0 check (xp >= 0),
  primary key (crew_id, user_id, day)
);

-- ═══ 3b. offensives + contributions (§38) ════════════════════════════════════
-- Offensive simple 24 h (OFFENSIVE_DURATION_H) : zone cible = center_h3 res 7
-- + radius_km. status préparation→active→terminée ; result null tant que non
-- terminée puis victory|partial|fail (OFFENSIVE_RESULT_THRESHOLDS).
create table if not exists public.offensives (
  id             uuid primary key default gen_random_uuid(),
  crew_id        uuid not null references public.crews (id) on delete cascade,
  zone_label     text not null check (char_length(zone_label) between 1 and 80),
  center_h3      bigint not null,     -- H3 res 7 en BIGINT (D13)
  radius_km      numeric not null check (radius_km > 0),
  objectif_hexes int not null check (objectif_hexes > 0),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null check (ends_at > starts_at),
  status         text not null default 'preparation'
    check (status in ('preparation', 'active', 'done')),
  result         text check (result in ('victory', 'partial', 'fail')),
  created_by     uuid references public.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists offensives_crew_idx on public.offensives (crew_id, status);
-- Recherche des offensives actives à un instant t (wiring ingest_run).
create index if not exists offensives_active_idx
  on public.offensives (status, starts_at, ends_at) where status = 'active';

create table if not exists public.offensive_contributions (
  offensive_id uuid not null references public.offensives (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  hexes        int not null default 0 check (hexes >= 0),
  primary key (offensive_id, user_id)
);

-- ═══ 3c. defense_missions (§38.3) ════════════════════════════════════════════
create table if not exists public.defense_missions (
  id            uuid primary key default gen_random_uuid(),
  crew_id       uuid not null references public.crews (id) on delete cascade,
  zone_label    text not null check (char_length(zone_label) between 1 and 80),
  center_h3     bigint not null,      -- H3 res 7 en BIGINT
  assigned_role text check (assigned_role in
    ('runner', 'scout', 'defender', 'raider', 'captain', 'co_captain', 'leader')),
  expires_at    timestamptz not null,
  done          boolean not null default false,
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists defense_missions_crew_idx
  on public.defense_missions (crew_id) where done = false;

-- ═══ 4. RPC add_crew_xp : crédit atomique XP + recalcul du niveau ════════════
-- Le barème/cap vit côté moteur (engine/crew.ts) : l'Edge Function calcule
-- l'XP DÉJÀ cappée et passe la table de niveaux (p_xp_table) pour éviter de
-- dupliquer CREW_XP_TABLE en SQL. Retourne { level_from, level_to } pour la
-- réponse crewLevelUp. security definer : contourne la RLS (service_role only).
create or replace function public.add_crew_xp(
  p_crew_id  uuid,
  p_xp       bigint,
  p_xp_table bigint[]   -- CREW_XP_TABLE (XP cumulée par niveau, index 1 = L1)
)
returns table (level_from int, level_to int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_xp    bigint;
  v_new_xp    bigint;
  v_from      int;
  v_to        int;
  i           int;
begin
  select xp, level into v_old_xp, v_from
  from public.crews where id = p_crew_id for update;
  if not found then
    return; -- crew inconnu : no-op silencieux (course sans crew géré en amont)
  end if;

  v_new_xp := v_old_xp + greatest(0, coalesce(p_xp, 0));

  -- Niveau = plus haut index i tel que xp >= p_xp_table[i] (table croissante).
  v_to := 1;
  for i in 1 .. array_length(p_xp_table, 1) loop
    if v_new_xp >= p_xp_table[i] then
      v_to := i;
    else
      exit;
    end if;
  end loop;

  update public.crews
  set xp = v_new_xp, level = v_to
  where id = p_crew_id;

  level_from := v_from;
  level_to := v_to;
  return next;
end;
$$;

revoke all on function public.add_crew_xp(uuid, bigint, bigint[]) from public, anon, authenticated;

-- ═══ 5. refresh_crew_activity : recalcul hebdo de l'Activity Score (§45) ═════
-- Proxy MVP documenté (le calcul fin — poids exacts — vit dans engine/crew.ts,
-- appelé par digest_job qui passe le score déjà calculé à cette fonction, OU
-- l'utilise directement en SQL simplifié ci-dessous pour les signaux discovery).
-- Ici : met à jour war_active/defense_active depuis l'état des offensives et
-- missions ; le score/statut numériques sont écrits par digest_job via UPDATE.
create or replace function public.refresh_crew_discovery_signals()
returns void
language sql
security definer
set search_path = public
as $$
  update public.crews c set
    war_active = exists (
      select 1 from public.offensives o
      where o.crew_id = c.id and o.status = 'active'
    ),
    defense_active = exists (
      select 1 from public.defense_missions dm
      where dm.crew_id = c.id and dm.done = false and dm.expires_at > now()
    );
$$;

revoke all on function public.refresh_crew_discovery_signals() from public, anon, authenticated;

-- ═══ 6. RLS (style 0003) ═════════════════════════════════════════════════════
-- Lecture réservée aux membres du crew (via crew_members actif) ; AUCUNE policy
-- d'écriture → seules les Edge Functions (service_role, bypass RLS) écrivent.
-- TODO(V1) — endpoints rôle-gated : create_offensive / create_defense_mission
--   ouverts aux rôles CREW_PERMISSIONS (captain/co_captain/leader selon §36).
--   En MVP l'écriture reste service_role only, la permission est vérifiée par
--   l'Edge Function (pas de policy client).
alter table public.crew_chests            enable row level security;
alter table public.crew_xp_daily          enable row level security;
alter table public.offensives             enable row level security;
alter table public.offensive_contributions enable row level security;
alter table public.defense_missions       enable row level security;

revoke insert, update, delete on public.crew_chests            from anon, authenticated;
revoke insert, update, delete on public.crew_xp_daily          from anon, authenticated;
revoke insert, update, delete on public.offensives             from anon, authenticated;
revoke insert, update, delete on public.offensive_contributions from anon, authenticated;
revoke insert, update, delete on public.defense_missions       from anon, authenticated;

-- crew_xp_daily : chaque membre lit SA propre contribution du jour (pas celle
-- des autres — évite d'exposer l'activité fine, §37.3 « ne pas afficher »).
create policy crew_xp_daily_select_self on public.crew_xp_daily
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Prédicat réutilisé : le lecteur est-il membre actif du crew ?
--   exists (select 1 from crew_members cm where cm.crew_id = X
--           and cm.user_id = auth.uid() and cm.left_at is null)

create policy crew_chests_select_member on public.crew_chests
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_chests.crew_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

create policy offensives_select_member on public.offensives
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = offensives.crew_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

create policy offensive_contributions_select_member on public.offensive_contributions
  for select to authenticated
  using (exists (
    select 1
    from public.offensives o
    join public.crew_members cm on cm.crew_id = o.crew_id
    where o.id = offensive_contributions.offensive_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

create policy defense_missions_select_member on public.defense_missions
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = defense_missions.crew_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));
