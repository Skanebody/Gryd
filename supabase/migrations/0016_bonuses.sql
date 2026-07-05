-- GRYD — 0016 Bonus aléatoires CIBLÉS (AMENDEMENT-19 §2/§5/§7, 05/07/2026).
-- « GRYD ne te donne pas des bonus au hasard. Il révèle les bons moments pour
-- agir. » Aléatoire dans l'apparition, CIBLÉ dans la pertinence, CAPÉ dans
-- l'impact (+35 % max, UN multiplicateur), CLAIR dans l'UX, NON pay-to-win :
-- un bonus ne touche JAMAIS territoire/points/classement — seulement coffre
-- crew / XP / progrès badge / durée de protection / cosmétique.
--
-- Source de vérité des constantes : packages/shared/src/game-rules.ts (bloc
-- AMENDEMENT-19 : BONUS_MAX_TOTAL_PCT, FINISHER_BONUS_MISSING_MAX_M, caps,
-- cooldowns, durées, priorités). Les FICHES des 6 bonus vivent en DATA
-- (packages/shared/src/bonuses.ts). La sélection pondérée et le CAP +35 % sont
-- décidés par le moteur PUR packages/engine/src/bonus.ts — la DB ne stocke que
-- l'état des fenêtres ouvertes et la trace des récompenses (caps/cooldowns).
--
-- Deux tables :
--   1. active_bonuses      : fenêtres de bonus OUVERTES et ciblées (crew|player),
--                            créées par digest_job (pondéré) ou à l'ouverture
--                            d'une frontière ; ingest_run les récompense.
--   2. player_bonus_claims : trace des récompenses accordées à un joueur, pour
--                            appliquer les caps (joueur/semaine, joueur/jours,
--                            cooldown zone) — jamais deux fois hors des limites.
--
-- ANTI-ABUS (appliqué par ingest_run, moteur pur testé) : run GRYD Verified
-- (Motion Trust), même crew pour un bonus crew, caps joueur/crew, cooldown
-- zone ; jamais de récompense de territoire ni de point ; jamais de cumul de
-- multiplicateurs (le meilleur s'applique, cap +35 %).
--
-- RLS (style 0003/0010/0014/0015) : SELECT par membre ACTIF du crew (scope
-- crew) ou par le joueur concerné (scope player) ; ÉCRITURE service_role only
-- partout (le client n'ouvre/ne réclame jamais un bonus côté DB).

-- ═══ 1. active_bonuses : fenêtres de bonus ouvertes/récompensées/expirées ═════
create table if not exists public.active_bonuses (
  id          uuid primary key default gen_random_uuid(),
  -- Portée : 'crew' (subject_id = crews.id) ou 'player' (subject_id = users.id).
  -- Pas de FK polymorphe possible ; l'intégrité du subject_id est garantie par
  -- les Edge Functions (service_role) qui seules écrivent. Nettoyage via digest.
  scope       text not null check (scope in ('crew', 'player')),
  subject_id  uuid not null,
  -- Id du bonus (BonusId de bonuses.ts). CHECK aligné sur les 6 bonus MVP.
  bonus_id    text not null
                check (bonus_id in
                  ('finisher', 'defense_critical', 'crew_chest',
                   'return', 'exploration', 'clean_loop')),
  -- Famille de jeu (BonusType) — dupliquée pour le tri/discovery sans jointure DATA.
  type        text not null
                check (type in
                  ('social', 'defense', 'crew', 'streak', 'exploration', 'conquete')),
  starts_at   timestamptz not null default now(),
  -- Expiration = starts_at + durationH de la fiche (posée par le créateur).
  expires_at  timestamptz not null,
  status      text not null default 'active'
                check (status in ('active', 'claimed', 'expired')),
  created_at  timestamptz not null default now()
);

-- Index (subject_id, status, expires_at) : chargement des bonus ACTIFS d'un
-- crew/joueur (ingest_run : récompense ; selectBonus côté lecture) et balayage
-- des expirés (digest_job).
create index if not exists active_bonuses_subject_status_idx
  on public.active_bonuses (subject_id, status, expires_at);

-- ═══ 2. player_bonus_claims : trace des récompenses (caps/cooldowns) ═════════
-- Une ligne par récompense de bonus effectivement accordée à un joueur. `week`
-- (ISO 'YYYY-Www') et `day` (ISO 'YYYY-MM-DD') sont les buckets des caps
-- joueur/semaine et joueur/jour ; claimed_at sert au cooldown zone/jours.
create table if not exists public.player_bonus_claims (
  id         uuid primary key default gen_random_uuid(),
  bonus_id   text not null
               check (bonus_id in
                 ('finisher', 'defense_critical', 'crew_chest',
                  'return', 'exploration', 'clean_loop')),
  user_id    uuid not null references public.users (id) on delete cascade,
  week       text not null, -- 'YYYY-Www' (cap joueur/semaine)
  day        text not null, -- 'YYYY-MM-DD' (cap joueur/jour, cooldown)
  claimed_at timestamptz not null default now()
);

-- Comptage des caps : par joueur + bonus + semaine, et + jour.
create index if not exists player_bonus_claims_week_idx
  on public.player_bonus_claims (user_id, bonus_id, week);
create index if not exists player_bonus_claims_day_idx
  on public.player_bonus_claims (user_id, bonus_id, day);

-- ═══ 3. RLS (style 0003/0010/0014/0015) ══════════════════════════════════════
-- AUCUNE policy d'écriture : seules les Edge Functions (service_role, bypass
-- RLS) écrivent — le client n'ouvre/ne réclame jamais un bonus.
alter table public.active_bonuses      enable row level security;
alter table public.player_bonus_claims enable row level security;

revoke insert, update, delete on public.active_bonuses      from anon, authenticated;
revoke insert, update, delete on public.player_bonus_claims from anon, authenticated;

-- Bonus actifs : lisibles par le SUJET concerné.
--  - scope 'player' : le joueur lui-même (subject_id = auth.uid()) ;
--  - scope 'crew'   : tout membre ACTIF du crew (subject_id = crew_id).
-- La géométrie/état fin reste filtré côté Edge Functions ; ici on autorise la
-- lecture de la ligne pour afficher le bonus (carte/War Room/chat/post-run).
create policy active_bonuses_select_subject on public.active_bonuses
  for select to authenticated
  using (
    (scope = 'player' and subject_id = (select auth.uid()))
    or (scope = 'crew' and exists (
      select 1 from public.crew_members cm
      where cm.crew_id = active_bonuses.subject_id
        and cm.user_id = (select auth.uid())
        and cm.left_at is null
    ))
  );

-- Réclamations : chacun les siennes (transparence des récompenses gagnées).
create policy player_bonus_claims_select_own on public.player_bonus_claims
  for select to authenticated
  using (user_id = (select auth.uid()));
