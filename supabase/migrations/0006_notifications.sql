-- GRYD — 0006 notifications + prérequis des jobs (SPEC §4.2.8/§4.3/§6.3,
-- GRYD_notifications_logic.md, GRYD_reglement_saison_0.md §1/§2).
-- Style RLS identique à 0003 : RLS partout, revoke des privilèges par défaut,
-- écriture service_role uniquement (les Edge Functions bypassent le RLS).

-- ─── notifications : l'inbox (§4.2.8, GRYD_notifications_logic.md §7) ────────
-- Un item = titre/texte/CTA dans payload (jsonb) ; statut lu = read_at.
-- priority : P0-P6 (GRYD_notifications_logic.md §2).
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null check (type in ('steal', 'decay_warning', 'streak', 'digest', 'reward', 'season', 'system')),
  priority   smallint not null check (priority between 0 and 6), -- P0-P6
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at    timestamptz check (read_at is null or read_at >= created_at)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

-- ─── push_log : cap PUSH_MAX_PER_DAY + quiet hours (§4.3) ─────────────────────
-- Une ligne = un push réellement envoyé. Le digest_job (et tout job qui pushe)
-- lit les envois du jour avant d'envoyer ; jamais lisible côté client.
create table public.push_log (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  type    text not null
);
create index push_log_user_sent_idx on public.push_log (user_id, sent_at desc);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.notifications enable row level security;
alter table public.push_log      enable row level security;

-- notifications : lecture owner-only ; update restreint à read_at (marquer lu) ;
-- insert/delete service_role uniquement (decay_job, season_close, digest_job…).
revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- push_log : interne aux jobs — aucune lecture/écriture client.
revoke select, insert, update, delete on public.push_log from anon, authenticated;

-- ─── hex_claims : prérequis decay_job ────────────────────────────────────────
-- 1. La neutralisation par decay doit CONSERVER la ligne (everOwned : le bonus
--    pionnier ne doit pas revenir après decay, cf. ingest_run/claims.ts) →
--    owner_user_id devient nullable ; null = hex neutre mais déjà possédé.
alter table public.hex_claims alter column owner_user_id drop not null;

-- 2. Anti double-warning : decay_warned_at = date du dernier avertissement J-3.
--    Un warning « compte » pour le cycle courant ssi decay_warned_at >= decay_at
--    − DECAY_WARNING_DAYS_BEFORE j ; une défense repousse decay_at, l'ancien
--    warning devient caduc et un nouveau repartira au prochain cycle (aucun
--    reset nécessaire — cf. decay_job/logic.ts).
alter table public.hex_claims add column decay_warned_at timestamptz;

-- ─── seasons : prérequis season_close (règlement §1 : phases de clôture) ─────
-- 'closed' = classements gelés, en attente du reset ; 'reset' = carte wipée.
alter table public.seasons drop constraint seasons_status_check;
alter table public.seasons add constraint seasons_status_check
  check (status in ('upcoming', 'active', 'closed', 'reset'));
-- Date du wipe effectif (gel 24 h → résultats J+1 → intersaison 7 j), posée par
-- season_close à la clôture (game-rules: INTERSEASON_DAYS).
alter table public.seasons add column reset_at timestamptz;

-- ─── purchases : idempotence rc_webhook ──────────────────────────────────────
-- Rien à faire : rc_event_id est déjà `not null unique` (0002). Vérifié.

-- ─── Badge titre local (règlement §15 : « Gardien·ne de [quartier] ») ────────
-- Attribué par season_close au n°1 du classement de chaque ville.
insert into public.badges (key, family, rarity)
values ('season_top1_local', 'special', 'epic')
on conflict (key) do nothing;

-- ─── refresh_sector_control() : appelée par decay_job après neutralisation ───
-- NB : `concurrently` est interdit dans une fonction (transaction) → refresh
-- bloquant, acceptable au volume MVP (job quotidien, heures creuses).
create or replace function public.refresh_sector_control()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  refresh materialized view public.sector_control;
end;
$$;

-- Exécutable par service_role uniquement.
revoke all on function public.refresh_sector_control() from public, anon, authenticated;
