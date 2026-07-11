-- GRYD — Modération UGC (App Store Guideline 1.2 : cause n°1 de rejet pour les
-- apps à contenu communautaire — chat crew, pseudos). Deux tables persistent les
-- actions de modération PERSONNELLES de l'utilisateur : blocages + signalements.
--
-- Écriture client RLS-CONTRÔLÉE (blocker_id / reporter_id = auth.uid()) : à la
-- différence du game-state (runs/hex_claims/season_scores = service-role only),
-- bloquer ou signaler est une action perso de l'utilisateur sur SON espace ; RLS
-- garantit qu'on ne peut agir que pour soi. La REVUE des signalements (admin,
-- sous 24 h — GRYD_APPSTORE_CHECKLIST) passe en service-role (dashboard admin).
-- Anti-shame : aucun compteur public de signalements, blocage silencieux.

-- ─── user_blocks : pseudos bloqués par l'utilisateur (masquage d'affichage) ───
-- Blocage par PSEUDO (le chat crew masque par pseudo côté client), pas par id :
-- un pseudo suffit au filtrage d'affichage et évite une jointure au moment du run.
create table if not exists public.user_blocks (
  blocker_id     uuid not null references public.users (id) on delete cascade,
  blocked_pseudo text not null,
  created_at     timestamptz not null default now(),
  primary key (blocker_id, blocked_pseudo)
);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon;

-- L'utilisateur ne voit / ne gère QUE ses propres blocages.
create policy user_blocks_select_own on public.user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy user_blocks_insert_own on public.user_blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy user_blocks_delete_own on public.user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- ─── content_reports : signalements émis (message ou membre) ──────────────────
create table if not exists public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  kind        text not null check (kind in ('message', 'member')),
  target_id   text not null,                 -- id du message OU pseudo visé
  author      text not null,                 -- pseudo de l'auteur signalé
  reason      text not null check (reason in ('spam', 'haine', 'harcelement', 'autre')),
  status      text not null default 'pending'
                check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at  timestamptz not null default now()
);
create index content_reports_status_idx on public.content_reports (status, created_at);
create index content_reports_reporter_idx on public.content_reports (reporter_id);

alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon;

-- L'auteur insère / relit SES signalements. Pas d'update/delete client : la revue
-- (pending → reviewed/actioned/dismissed) est faite en service-role (admin).
create policy content_reports_select_own on public.content_reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy content_reports_insert_own on public.content_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
