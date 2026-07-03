-- GRYD — 0008 tous les badges attribuables (décision fondateur 03/07/2026).
-- AMENDEMENT-04 §4 réécrit : le concept « dormant » disparaît — les mécaniques
-- manquantes sont branchées dans ingest_run : météo Open-Meteo (Météo/Hiver/
-- Chaleur), avant-postes/routes V0 (Bâtisseur/Connecteur/Stratège/Bâtisseur
-- Crew), événements (Événement). Style RLS : 0003 (lecture authenticated,
-- écriture service_role uniquement — les Edge Functions bypassent le RLS).

-- ─── routes : route V0 reliant deux territoires du joueur ────────────────────
-- Détection ingest_run : hexes de DÉPART et d'ARRIVÉE de la course possédés par
-- le joueur AVANT la course, distants de ≥ ROUTE_MIN_KM (badges.ts), pas de
-- doublon à ROUTE_ENDPOINT_MATCH_KM près. crew_id nullable : route personnelle ;
-- set null si le crew disparaît (la route appartient au joueur).
create table public.routes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  crew_id    uuid references public.crews (id) on delete set null,
  from_h3    bigint not null, -- cellule H3 res 10 du bout départ (D13 : BIGINT)
  to_h3      bigint not null, -- cellule H3 res 10 du bout arrivée
  run_id     uuid references public.runs (id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_h3 <> to_h3)
);
create index routes_user_idx on public.routes (user_id);
create index routes_crew_idx on public.routes (crew_id) where crew_id is not null;

-- ─── events : fenêtres d'événements GRYD (badge Événement) ───────────────────
-- ingest_run : duringEvent ssi starts_at <= started_at <= ends_at — bornes
-- INCLUSES des deux côtés (miroir de inEventWindow, engine/badges.ts).
-- name unique : clé d'idempotence du seed.
create table public.events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_window_idx on public.events (starts_at, ends_at);

-- ─── RLS (style 0003) : lecture authenticated, écriture service_role only ────
alter table public.routes enable row level security;
alter table public.events enable row level security;

revoke insert, update, delete on public.routes from anon, authenticated;
revoke insert, update, delete on public.events from anon, authenticated;

create policy routes_select_all on public.routes
  for select to authenticated
  using (true);

create policy events_select_all on public.events
  for select to authenticated
  using (true);

-- ─── Seed : fenêtre réelle de lancement (heure de Paris, UTC+2 en juillet) ───
insert into public.events (name, starts_at, ends_at) values
  ('Grand Départ — Saison 0', '2026-07-03T00:00:00+02:00', '2026-07-13T23:59:59+02:00')
on conflict (name) do nothing;

-- ─── badges : plus AUCUN dormant (la colonne reste, plus jamais renseignée) ──
update public.badges set dormant = null;

-- ─── Index utiles aux détections ingest_run ──────────────────────────────────
-- Comptage des hexes du joueur autour du centroïde : hex_claims_owner_idx (0002).
-- Anti-doublon avant-poste : outposts_user_idx (0002). Anti-doublon route :
-- routes_user_idx (ci-dessus). Rien d'autre à créer — vérifié.
