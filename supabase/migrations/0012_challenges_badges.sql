-- GRYD — 0012 Challenges + badges motivationnels (AMENDEMENT-07 §5-§7/§9,
-- motivation §15-§16/§19-§20). Complète 0011 (social). Source de vérité des
-- constantes/énumérations : packages/shared/src/{types,game-rules,badges}.ts.
-- La DB ne stocke que des états ; les CHECK n'encodent que des ÉNUMÉRATIONS
-- (types, difficulté, visibilité, sujet) déjà gelées dans game-rules.
--
-- Contenu :
--   1. challenges (§15-§16) : type, name, goals jsonb, personal_minimum jsonb,
--      collective_goal jsonb, rewards, dates, difficulty, visibility.
--   2. challenge_progress (§16) : (challenge_id, subject_id, kind user|crew,
--      progress, done_at, contribution jsonb).
--   3. user_stats += colonnes métriques motivation (snake_case des nouvelles
--      BadgeMetric §6) — additif, default 0.
--   4. RLS (style 0003/0010/0011) : lecture des challenges visibles (public/crew),
--      progress lisible par le sujet (user self / membres du crew) ; écriture
--      service_role only (endpoints rôle-gated = TODO V1).
--   5. Seed MVP des challenges (§15-§16, CHALLENGE_SEEDS de game-rules).
--   6. Reseed ADDITIF des badges : NOUVELLES keys seulement (12 badges §6),
--      insert on conflict do nothing — ne touche PAS les 192 existants.

-- ═══ 1. challenges (§15-§16) ═════════════════════════════════════════════════
-- primary_goal / personal_minimum / collective_goal en jsonb : {metric,target}.
-- metric ∈ CHALLENGE_METRICS (runs|distanceM|hexes|defends) — validé applicatif
-- (le moteur consomme game-rules), la DB ne fige que le type/difficulté/visib.
-- city_id nullable (challenge national ou multi-crew). crew_a/crew_b pour rivalry.
create table if not exists public.challenges (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique check (slug is null or slug ~ '^[a-z0-9_]{3,40}$'),
  type             text not null
    check (type in ('solo', 'crew', 'rivalry', 'event', 'season')),
  name             text not null check (char_length(name) between 1 and 80),
  description      text check (description is null or char_length(description) <= 500),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  difficulty       text not null default 'standard'
    check (difficulty in ('chill', 'standard', 'intense')),
  -- Visibilité (motivation §10/§34) : qui voit le challenge et son classement.
  visibility       text not null default 'public'
    check (visibility in ('private', 'crew', 'public')),
  -- Objectifs jsonb {metric,target} (primary/collective) et {metric,min} (perso).
  primary_goal     jsonb not null,
  personal_minimum jsonb,       -- {metric,min} — null = aucun minimum (§8.3)
  collective_goal  jsonb,       -- {metric,target} — crew/rivalry seulement
  reward_personal  jsonb,       -- {xp?, badgeKey?, chest?} — MVP descriptif
  reward_collective jsonb,      -- {crewXp?, chest?, badgeKey?}
  -- Rattachement territorial/crew (rivalry : deux crews adverses).
  city_id          text references public.city_zones (city_id) on delete set null,
  crew_a_id        uuid references public.crews (id) on delete set null,
  crew_b_id        uuid references public.crews (id) on delete set null,
  share_template   text,        -- clé de share card (§16) — descriptif MVP
  privacy_mode     text not null default 'opt_in'
    check (privacy_mode in ('opt_in', 'crew', 'public')),
  anti_abuse       jsonb,       -- règles anti-abus descriptives (§16) — MVP
  created_at       timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists challenges_active_idx
  on public.challenges (type, starts_at, ends_at);
create index if not exists challenges_city_idx
  on public.challenges (city_id) where city_id is not null;

-- ═══ 2. challenge_progress (§16) ═════════════════════════════════════════════
-- Un sujet (user OU crew) par challenge. kind distingue les deux ; subject_id
-- pointe user OU crew (pas de FK polymorphe — validé applicatif). progress =
-- valeur courante sur primary_goal.metric (ou collective_goal pour un crew).
-- contribution jsonb : ventilation multi-critères (coopétition §9.2) pour le
-- résumé de fin (« 142 hexes défendus, 3 routes… »). done_at = 1er passage done.
create table if not exists public.challenge_progress (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  kind          text not null check (kind in ('user', 'crew')),
  subject_id    uuid not null,           -- user_id (kind user) ou crew_id (kind crew)
  progress      numeric not null default 0 check (progress >= 0),
  done_at       timestamptz,             -- 1er instant où l'objectif est atteint
  contribution  jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  unique (challenge_id, kind, subject_id)
);
create index if not exists challenge_progress_subject_idx
  on public.challenge_progress (subject_id, kind);

-- ═══ 3. user_stats : métriques motivation (§6) — additif ═════════════════════
-- snake_case des nouvelles BadgeMetric. Alimentées par ingest_run (groupRuns,
-- easyRuns, recoveryRuns, smartRuns, personalBests) ou endpoints/jobs V1
-- (invitesSent, reactionsSent, *Weeks). referrals_activated existe déjà (0007).
alter table public.user_stats add column if not exists invites_sent       integer not null default 0 check (invites_sent >= 0);       -- endpoint invite V1
alter table public.user_stats add column if not exists group_runs         integer not null default 0 check (group_runs >= 0);
alter table public.user_stats add column if not exists reactions_sent     integer not null default 0 check (reactions_sent >= 0);     -- endpoint feed V1
alter table public.user_stats add column if not exists personal_bests     integer not null default 0 check (personal_bests >= 0);
alter table public.user_stats add column if not exists clean_weeks        integer not null default 0 check (clean_weeks >= 0);        -- rollup hebdo
alter table public.user_stats add column if not exists easy_runs          integer not null default 0 check (easy_runs >= 0);
alter table public.user_stats add column if not exists recovery_runs      integer not null default 0 check (recovery_runs >= 0);
alter table public.user_stats add column if not exists balanced_weeks     integer not null default 0 check (balanced_weeks >= 0);     -- rollup hebdo
alter table public.user_stats add column if not exists no_pressure_weeks  integer not null default 0 check (no_pressure_weeks >= 0);  -- rollup hebdo
alter table public.user_stats add column if not exists smart_runs         integer not null default 0 check (smart_runs >= 0);

-- ═══ 4. RLS (style 0003/0010/0011) ═══════════════════════════════════════════
alter table public.challenges         enable row level security;
alter table public.challenge_progress enable row level security;

-- Écriture client interdite (service_role bypasse la RLS ; endpoints = TODO V1).
revoke insert, update, delete on public.challenges         from anon, authenticated;
revoke insert, update, delete on public.challenge_progress from anon, authenticated;

-- Lecture des challenges : public → tous ; crew → soit un challenge crew GÉNÉRIQUE
-- (non rattaché à des crews précis : crew_a/crew_b NULL, ex. Defense Week §5) visible
-- de tout membre d'un crew actif ; soit un challenge crew CIBLÉ (rivalry crew_a/crew_b)
-- visible des membres actifs d'un des deux crews concernés ; private → aucun (V1).
create policy challenges_select_visible on public.challenges
  for select to authenticated
  using (
    visibility = 'public'
    or (
      visibility = 'crew'
      and exists (
        select 1 from public.crew_members cm
        where cm.user_id = (select auth.uid())
          and cm.left_at is null
          and (
            (challenges.crew_a_id is null and challenges.crew_b_id is null)
            or cm.crew_id in (challenges.crew_a_id, challenges.crew_b_id)
          )
      )
    )
  );

-- Lecture d'un progress : le sujet lui-même (user self) OU un membre actif du
-- crew sujet (kind crew). Jamais de lecture publique d'un progress nominatif.
create policy challenge_progress_select_subject on public.challenge_progress
  for select to authenticated
  using (
    (kind = 'user' and subject_id = (select auth.uid()))
    or (
      kind = 'crew'
      and exists (
        select 1 from public.crew_members cm
        where cm.user_id = (select auth.uid())
          and cm.left_at is null
          and cm.crew_id = challenge_progress.subject_id
      )
    )
  );

-- ═══ 5. Seed MVP des challenges (§15-§16, CHALLENGE_SEEDS) ════════════════════
-- Fenêtre : semaine ISO courante (starts = lundi, ends = +7 j) pour les hebdos ;
-- rivalry = 48 h. Idempotent par slug (on conflict do nothing). Les cibles/min
-- proviennent de game-rules.CHALLENGE_SEEDS — recopiées ici comme DATA de seed.
insert into public.challenges
  (slug, type, name, description, starts_at, ends_at, difficulty, visibility,
   primary_goal, personal_minimum, collective_goal, privacy_mode)
values
  ('consistency_ii', 'solo', 'Consistency II',
   'Cours 3 fois cette semaine — la régularité, pas la vitesse.',
   date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
   'standard', 'public',
   '{"metric":"runs","target":3}'::jsonb, null, null, 'opt_in'),
  ('distance_10k', 'solo', 'Distance 10 km',
   'Cumule 10 km cette semaine, à ton rythme.',
   date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
   'standard', 'public',
   '{"metric":"distanceM","target":10000}'::jsonb, null, null, 'opt_in'),
  ('defense_30', 'solo', 'Defense',
   'Défends 30 hexes cette semaine.',
   date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
   'standard', 'public',
   '{"metric":"defends","target":30}'::jsonb, null, null, 'opt_in'),
  ('crew_defense_week', 'crew', 'Defense Week',
   'Défendez 300 hexes ensemble — chacun au moins 20.',
   date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
   'intense', 'crew',
   '{"metric":"defends","target":300}'::jsonb,
   '{"metric":"defends","min":20}'::jsonb,
   '{"metric":"defends","target":300}'::jsonb, 'crew'),
  ('rivalry_night_canal', 'rivalry', 'Night Pacers vs Canal',
   'Rivalité 48 h sur Paris Est — le plus d''hexes l''emporte.',
   now(), now() + interval '48 hours',
   'intense', 'public',
   '{"metric":"hexes","target":0}'::jsonb, null,
   '{"metric":"hexes","target":0}'::jsonb, 'public')
on conflict (slug) do nothing;

-- ═══ 6. Reseed ADDITIF des badges motivationnels (§6) ════════════════════════
-- NOUVELLES keys UNIQUEMENT (12 badges AMENDEMENT-07 §6). insert on conflict do
-- nothing : ne modifie AUCUN des 192 badges existants (0009). Colonnes = mêmes
-- que 0009 (key, family, tier, name, requirement, family_color, sort, secret,
-- legacy, family_slug, level). family 'healthy' = nouvelle sous-famille (§6) ;
-- la colonne family est en texte libre (aucun CHECK à étendre).
insert into public.badges
  (key, family, tier, name, requirement, family_color, sort, secret, legacy, family_slug, level)
values
  ('first_invite', 'crew', 'road', 'First Invite', 'Invite ta première recrue ou ami.', '#FB923C', 129, false, false, null, null),
  ('crew_helper', 'crew', 'tempo', 'Crew Helper', 'Envoie 5 invitations pour renforcer ton crew.', '#FB923C', 130, false, false, null, null),
  ('recruiter', 'crew', 'race', 'Recruiter', 'Active 5 recrues via ton parrainage.', '#FB923C', 131, false, false, null, null),
  ('group_run', 'crew', 'tempo', 'Group Run', 'Cours en run groupé (départ synchronisé, trace partagée).', '#FB923C', 132, false, false, null, null),
  ('encourager', 'crew', 'tempo', 'Encourager', 'Envoie 10 réactions de soutien sur le feed de ton crew.', '#FB923C', 133, false, false, null, null),
  ('personal_best', 'performance', 'race', 'Personal Best', 'Bats un record perso (distance ou allure) sur une course.', '#22D3EE', 152, false, false, null, null),
  ('clean_week', 'performance', 'tempo', 'Clean Week', 'Passe une semaine ISO active sans aucun run rejeté.', '#22D3EE', 153, false, false, null, null),
  ('easy_run', 'healthy', 'road', 'Easy Run', 'Réalise une course sans objectif de vitesse (mode facile).', '#34D399', 154, false, false, null, null),
  ('recovery_run', 'healthy', 'road', 'Recovery Run', 'Réalise une course de récupération à allure tranquille.', '#34D399', 155, false, false, null, null),
  ('balanced_week', 'healthy', 'tempo', 'Balanced Week', 'Passe une semaine à volume équilibré (ni trop, ni trop peu).', '#34D399', 156, false, false, null, null),
  ('no_pressure_week', 'healthy', 'tempo', 'No Pressure Week', 'Passe une semaine active 100 % sans enjeu de territoire.', '#34D399', 157, false, false, null, null),
  ('smart_runner', 'healthy', 'race', 'Smart Runner', 'Enchaîne 10 courses vérifiées, propres et à allure raisonnable.', '#34D399', 158, false, false, null, null)
on conflict (key) do nothing;
