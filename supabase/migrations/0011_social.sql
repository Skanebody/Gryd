-- GRYD — 0011 Social/communauté (AMENDEMENT-07 §1-§4, social Partie D, MVP §52).
-- Complète 0010 (crews Supercell). Source de vérité des constantes/énumérations
-- de jeu : packages/shared/src/{types,game-rules}.ts. La DB ne stocke que des
-- états ; les CHECK n'encodent que des ÉNUMÉRATIONS (visibilité, statuts, styles)
-- et la contrainte de handle (HANDLE_REGEX, mirroir de game-rules).
--
-- Contenu :
--   1. crews += slug/tag/recruitment_status/crew_type/league (SEULEMENT si absents,
--      cf. 0010 qui a déjà posé statut/level/league-like — on ne duplique pas).
--   2. user_profiles (§44 : handle unique regex, display_name, avatar, bio, ville,
--      play_style, visibilités, discreet_mode).
--   3. friendships (§45 : requester/addressee/status, paire ordonnée unique).
--   4. crew_applications (§48).
--   5. group_runs (§49).
--   6. crew_feed_events (§50).
--   7. contested_group_runs (§51).
--   8. RLS (style 0003/0010) : profils selon profile_visibility ; friendships
--      owner-only ; crew_applications candidat + captain/co_captain/leader ;
--      group_runs/crew_feed lisibles par le crew ; écriture service_role only
--      (endpoints rôle-gated = TODO V1, comme 0010).

-- ═══ 1. crews : champs de recrutement/discovery manquants ════════════════════
-- 0010 a déjà posé : statut (open|request|closed), level, activity_status, langue,
-- objectif, signaux discovery. On ajoute UNIQUEMENT ce qui manque au §4 : slug
-- public, tag court, recruitment_status (distinct de statut = état d'ouverture
-- éditorial), crew_type, league. `if not exists` → idempotent, ne duplique rien.
alter table public.crews
  add column if not exists slug text unique
    check (slug is null or slug ~ '^[a-z0-9-]{3,40}$'),
  add column if not exists tag text
    check (tag is null or tag ~ '^[A-Z0-9]{2,6}$'),
  add column if not exists recruitment_status text not null default 'open'
    check (recruitment_status in ('open', 'on_request', 'closed')),
  add column if not exists crew_type text not null default 'mixte'
    check (crew_type in ('casual', 'competitif', 'pionnier', 'mixte')),
  add column if not exists league text not null default 'bronze'
    check (league in ('bronze', 'silver', 'gold', 'carbon', 'elite', 'legend'));

-- ═══ 2. user_profiles (§44) ══════════════════════════════════════════════════
-- 1 ligne par user. handle @ unique (HANDLE_REGEX ^[a-z0-9_]{3,20}$). Défauts =
-- AMENDEMENT-07 §1 : profil visible en jeu (crew), activités crew, PAS de position
-- live (map_sharing simplified), santé masquée, discret off.
create table if not exists public.user_profiles (
  user_id            uuid primary key references public.users (id) on delete cascade,
  handle             text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name       text check (display_name is null or char_length(display_name) between 1 and 40),
  avatar_url         text,
  avatar_shape       text not null default 'hex' check (avatar_shape in ('hex', 'circle', 'square')),
  bio                text check (bio is null or char_length(bio) <= 280),
  main_city          text,
  main_country       text,
  play_style         text not null default 'mixte'
    check (play_style in ('focus_solo', 'mixte', 'crew_war')),
  profile_visibility text not null default 'crew'
    check (profile_visibility in ('private', 'friends', 'crew', 'public')),
  activity_sharing   text not null default 'crew'
    check (activity_sharing in ('private', 'friends', 'crew', 'stats_only')),
  map_sharing        text not null default 'simplified'
    check (map_sharing in ('precise', 'simplified', 'territory_only', 'none')),
  discreet_mode      boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ═══ 3. friendships (§45) ════════════════════════════════════════════════════
-- Une seule ligne par paire d'utilisateurs, quel que soit le sens de la demande.
-- On stocke le sens (requester → addressee) pour l'UI mais l'unicité porte sur la
-- paire ORDONNÉE (least, greatest) via un index d'expression → pas de doublon
-- A→B / B→A. status : pending|accepted|blocked|rejected (§45).
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users (id) on delete cascade,
  addressee_id uuid not null references public.users (id) on delete cascade,
  status       text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
-- Unicité de la paire non ordonnée (A,B) = (B,A).
create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id, status);

-- ═══ 4. crew_applications (§48) ══════════════════════════════════════════════
-- Candidature d'un user à un crew (statut « sur demande »). role_wanted = rôle
-- souhaité (7 rôles §36). status pending|accepted|rejected|withdrawn.
create table if not exists public.crew_applications (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.crews (id) on delete cascade,
  user_id     uuid not null references public.users (id) on delete cascade,
  message     text check (message is null or char_length(message) <= 280),
  role_wanted text check (role_wanted in
    ('runner', 'scout', 'defender', 'raider', 'captain', 'co_captain', 'leader')),
  status      text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references public.users (id) on delete set null
);
-- Une seule candidature EN COURS par (crew, user).
create unique index if not exists crew_applications_pending_unique
  on public.crew_applications (crew_id, user_id) where status = 'pending';
create index if not exists crew_applications_crew_idx
  on public.crew_applications (crew_id, status);

-- ═══ 5. group_runs (§49) ═════════════════════════════════════════════════════
-- Un run groupé détecté (AMENDEMENT-07 §3) : agrège les courses membres d'un même
-- Group Run. members = tableau d'user_id, runs = tableau de run_id (MVP simple).
-- crew_id null = groupe multi-crew (contesté). Écrit par ingest_run (service_role).
create table if not exists public.group_runs (
  id           uuid primary key default gen_random_uuid(),
  crew_id      uuid references public.crews (id) on delete set null,
  started_at   timestamptz not null,
  member_ids   uuid[] not null default '{}',
  run_ids      uuid[] not null default '{}',
  hex_count    int not null default 0 check (hex_count >= 0),
  shared_hexes int not null default 0 check (shared_hexes >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists group_runs_crew_idx on public.group_runs (crew_id, started_at desc);

-- ═══ 6. crew_feed_events (§50) ═══════════════════════════════════════════════
-- Fil d'activité du crew (§28) : capture/défense/badge/rank_up/coffre/group_run.
-- payload jsonb libre (titre/corps/icône côté client). actor_id = user à l'origine.
create table if not exists public.crew_feed_events (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.crews (id) on delete cascade,
  actor_id   uuid references public.users (id) on delete set null,
  event_type text not null check (event_type in
    ('capture', 'defense', 'badge', 'rank_up', 'chest', 'group_run', 'contested', 'join', 'offensive')),
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists crew_feed_events_crew_idx
  on public.crew_feed_events (crew_id, created_at desc);

-- ═══ 7. contested_group_runs (§51) ═══════════════════════════════════════════
-- Historique des hexes contestés entre crews (approx MVP §3 : 2ᵉ ingest d'un autre
-- crew ≤ lock d'un hex fraîchement claimé). Alimente l'anti-collusion (§11 :
-- compteur d'alternances collusionPenalty). h3index = BIGINT (D13). winner_crew_id
-- null = resté neutre/égalité (jamais volé).
create table if not exists public.contested_group_runs (
  id             uuid primary key default gen_random_uuid(),
  h3index        bigint not null,
  city_id        text references public.city_zones (city_id) on delete set null,
  prev_owner_crew_id uuid references public.crews (id) on delete set null,
  winner_crew_id     uuid references public.crews (id) on delete set null,
  challenger_crew_id uuid references public.crews (id) on delete set null,
  run_id         uuid references public.runs (id) on delete set null,
  status         text not null default 'contested'
    check (status in ('contested', 'defended', 'neutralized', 'stats_only')),
  created_at     timestamptz not null default now()
);
-- Historique par hex (anti-collusion) trié chronologiquement.
create index if not exists contested_group_runs_hex_idx
  on public.contested_group_runs (h3index, created_at);

-- ═══ 8. RLS (style 0003/0010) ════════════════════════════════════════════════
alter table public.user_profiles        enable row level security;
alter table public.friendships          enable row level security;
alter table public.crew_applications    enable row level security;
alter table public.group_runs           enable row level security;
alter table public.crew_feed_events     enable row level security;
alter table public.contested_group_runs enable row level security;

-- Écriture client interdite partout (service_role bypasse la RLS). Le profil est
-- la SEULE exception : le user édite SON profil (colonnes sûres — pas de champ de
-- gameplay ici). Les endpoints rôle-gated (candidature, décision) = TODO V1.
revoke insert, update, delete on public.friendships          from anon, authenticated;
revoke insert, update, delete on public.crew_applications    from anon, authenticated;
revoke insert, update, delete on public.group_runs           from anon, authenticated;
revoke insert, update, delete on public.crew_feed_events     from anon, authenticated;
revoke insert, update, delete on public.contested_group_runs from anon, authenticated;

-- ── user_profiles : le user gère SON profil (insert/update self) ─────────────
revoke insert, update, delete on public.user_profiles from anon, authenticated;
grant insert (user_id, handle, display_name, avatar_url, avatar_shape, bio,
  main_city, main_country, play_style, profile_visibility, activity_sharing,
  map_sharing, discreet_mode) on public.user_profiles to authenticated;
grant update (handle, display_name, avatar_url, avatar_shape, bio, main_city,
  main_country, play_style, profile_visibility, activity_sharing, map_sharing,
  discreet_mode) on public.user_profiles to authenticated;

create policy user_profiles_insert_self on public.user_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy user_profiles_update_self on public.user_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Lecture selon profile_visibility (§4/§34) :
--   * public       → tout authenticated ;
--   * self          → toujours ;
--   * friends       → amitié acceptée (friendships accepted, un sens ou l'autre) ;
--   * crew          → membre actif du même crew (crew_members left_at null croisé).
-- private → seul le propriétaire (couvert par « self »).
create policy user_profiles_select_visible on public.user_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or profile_visibility = 'public'
    or (
      profile_visibility = 'friends'
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = (select auth.uid()) and f.addressee_id = user_profiles.user_id)
            or (f.addressee_id = (select auth.uid()) and f.requester_id = user_profiles.user_id)
          )
      )
    )
    or (
      profile_visibility = 'crew'
      and exists (
        select 1
        from public.crew_members me
        join public.crew_members them on them.crew_id = me.crew_id
        where me.user_id = (select auth.uid()) and me.left_at is null
          and them.user_id = user_profiles.user_id and them.left_at is null
      )
    )
  );

-- ── friendships : owner-only (l'un des deux protagonistes) ───────────────────
create policy friendships_select_own on public.friendships
  for select to authenticated
  using (
    requester_id = (select auth.uid()) or addressee_id = (select auth.uid())
  );

-- ── crew_applications : le candidat + les cadres du crew (captain/co_captain/leader) ─
create policy crew_applications_select_visible on public.crew_applications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.crew_members cm
      where cm.crew_id = crew_applications.crew_id
        and cm.user_id = (select auth.uid())
        and cm.left_at is null
        and cm.role in ('captain', 'co_captain', 'leader')
    )
  );

-- ── group_runs : membres actifs du crew concerné (crew_id null = pas de lecture crew) ─
create policy group_runs_select_member on public.group_runs
  for select to authenticated
  using (
    group_runs.crew_id is not null and exists (
      select 1 from public.crew_members cm
      where cm.crew_id = group_runs.crew_id
        and cm.user_id = (select auth.uid())
        and cm.left_at is null
    )
  );

-- ── crew_feed_events : membres actifs du crew ────────────────────────────────
create policy crew_feed_events_select_member on public.crew_feed_events
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_feed_events.crew_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

-- ── contested_group_runs : membres d'un des crews impliqués ──────────────────
-- (le vainqueur, le challenger ou l'ancien propriétaire). Historique sensible →
-- réservé aux crews concernés ; pas de lecture publique.
create policy contested_group_runs_select_involved on public.contested_group_runs
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.user_id = (select auth.uid())
      and cm.left_at is null
      and cm.crew_id in (
        contested_group_runs.winner_crew_id,
        contested_group_runs.challenger_crew_id,
        contested_group_runs.prev_owner_crew_id
      )
  ));

-- TODO(V1) — endpoints rôle-gated (comme 0010) : apply_to_crew / decide_application
--   (captain/co_captain/leader), edit_crew_recruitment. En MVP l'écriture reste
--   service_role only, la permission est vérifiée par l'Edge Function.
