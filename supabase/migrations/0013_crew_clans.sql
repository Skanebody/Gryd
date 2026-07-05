-- GRYD — 0013 Crews façon clan (AMENDEMENT-16 §3, doc gameplay/crews §8-§10).
-- Source de vérité des énumérations : packages/shared/src/game-rules.ts
-- (CREW_ROLES, CREW_RECRUITMENT_STATUSES, CREW_TAGS, ROOKIE_TRIAL_DAYS).
--
-- Contenu :
--   1. crew_members.role : rôles RÉALIGNÉS §8 (rookie/runner/scout/strategist/
--      captain/co_captain/founder) + mapping des anciens rôles (leader→founder,
--      defender→runner, raider→runner — le style vit dans les TAGS §10 et la
--      war_availability §37.2, inchangée) + role_since (essai rookie 7 j §8.7).
--   2. Mêmes rôles sur crew_applications.role_wanted et
--      defense_missions.assigned_role (0010/0011).
--   3. crews.recruitment_status : + invite_only, défaut on_request (§9) —
--      étend le CHECK posé par 0011 (open/on_request/closed), ne le duplique pas.
--   4. crews.tags text[] : les 9 tags de style §10 (CREW_TAGS).
--   5. RLS : politique crew_applications_select_visible RECRÉÉE À L'IDENTIQUE
--      avec les nouveaux noms de rôle (leader→founder) — périmètre inchangé.
-- Écriture client toujours interdite partout (service_role only, cf. 0010/0011).

-- ═══ 1. crew_members : rôles clan + role_since ═══════════════════════════════
-- Le CHECK inline de 0010 s'appelle crew_members_role_check (nommage PG standard).
alter table public.crew_members
  drop constraint if exists crew_members_role_check;

-- Mapping AMENDEMENT-16 §3 : leader→founder ; defender/raider→runner (leur
-- spécialité devient un tag de crew §10 + la war_availability du membre).
update public.crew_members
set role = case role
  when 'leader' then 'founder'
  when 'defender' then 'runner'
  when 'raider' then 'runner'
  else role
end
where role in ('leader', 'defender', 'raider');

alter table public.crew_members
  add constraint crew_members_role_check check (role in
    ('rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'));

-- role_since : départ de la période d'essai rookie (ROOKIE_TRIAL_DAYS §8.7) et
-- historique de promotion. Backfill = now() (aucun membre existant n'est rookie).
alter table public.crew_members
  add column if not exists role_since timestamptz not null default now();

-- ═══ 2. Mêmes rôles sur les colonnes rôle annexes (0010/0011) ════════════════
alter table public.crew_applications
  drop constraint if exists crew_applications_role_wanted_check;
update public.crew_applications
set role_wanted = case role_wanted
  when 'leader' then 'founder'
  when 'defender' then 'runner'
  when 'raider' then 'runner'
  else role_wanted
end
where role_wanted in ('leader', 'defender', 'raider');
alter table public.crew_applications
  add constraint crew_applications_role_wanted_check check (role_wanted in
    ('rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'));

alter table public.defense_missions
  drop constraint if exists defense_missions_assigned_role_check;
update public.defense_missions
set assigned_role = case assigned_role
  when 'leader' then 'founder'
  when 'defender' then 'runner'
  when 'raider' then 'runner'
  else assigned_role
end
where assigned_role in ('leader', 'defender', 'raider');
alter table public.defense_missions
  add constraint defense_missions_assigned_role_check check (assigned_role in
    ('rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'));

-- ═══ 3. crews.recruitment_status : 4 statuts §9, défaut on_request ═══════════
-- 0011 a posé la colonne (open/on_request/closed, défaut open) — on ÉTEND :
-- + invite_only, défaut on_request (« mode recommandé par défaut », §9).
-- Les valeurs existantes restent valides (aucun UPDATE de données nécessaire).
alter table public.crews
  drop constraint if exists crews_recruitment_status_check;
alter table public.crews
  add constraint crews_recruitment_status_check check (recruitment_status in
    ('open', 'on_request', 'invite_only', 'closed'));
alter table public.crews
  alter column recruitment_status set default 'on_request';

-- ═══ 4. crews.tags : les 9 tags de style §10 (clés CREW_TAGS) ════════════════
-- Tableau de clés, sous-ensemble strict du catalogue — discovery/matching/identité.
alter table public.crews
  add column if not exists tags text[] not null default '{}';
alter table public.crews
  drop constraint if exists crews_tags_check;
alter table public.crews
  add constraint crews_tags_check check (tags <@ array[
    'casual', 'competitif', 'defense', 'raid', 'exploration',
    'performance', 'run_club', 'debutants_ok', 'pionnier'
  ]::text[]);

-- ═══ 5. RLS : politique candidatures recréée avec les nouveaux rôles ═════════
-- Périmètre INCHANGÉ (le candidat + les cadres du crew) — seul le nom du rôle
-- sommet change (leader → founder). Aucune autre policy ne cite un rôle.
drop policy if exists crew_applications_select_visible on public.crew_applications;
create policy crew_applications_select_visible on public.crew_applications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.crew_members cm
      where cm.crew_id = crew_applications.crew_id
        and cm.user_id = (select auth.uid())
        and cm.left_at is null
        and cm.role in ('captain', 'co_captain', 'founder')
    )
  );
