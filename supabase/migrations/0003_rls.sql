-- GRYD — 0003 RLS (DISCOVERY D15, SPEC §6.4/§7, AMENDEMENT-02 §9).
-- Principes :
--   * RLS activé sur TOUTES les tables.
--   * Écriture client owner-only, et uniquement là où c'est légitime.
--   * runs / hex_claims / shields / purchases / seasons / season_scores :
--     AUCUNE policy d'écriture → seules les Edge Functions (service_role,
--     qui bypasse le RLS) écrivent. Défense en profondeur : REVOKE des
--     privilèges d'écriture accordés par défaut à anon/authenticated.
--   * users : lecture directe owner-only ; le public passe par la vue
--     public_profiles (pseudo/city seulement).
--   * `(select auth.uid())` plutôt que `auth.uid()` : initplan évalué une fois.

-- ─── Activation RLS partout ──────────────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.crews         enable row level security;
alter table public.crew_members  enable row level security;
alter table public.runs          enable row level security;
alter table public.hex_claims    enable row level security;
alter table public.shields       enable row level security;
alter table public.seasons       enable row level security;
alter table public.season_scores enable row level security;
alter table public.purchases     enable row level security;
alter table public.privacy_zones enable row level security;
alter table public.referrals     enable row level security;
alter table public.city_zones    enable row level security;
alter table public.waitlist      enable row level security;
alter table public.sectors          enable row level security;
alter table public.outposts         enable row level security;
alter table public.no_capture_zones enable row level security;
alter table public.missions         enable row level security;
alter table public.mission_progress enable row level security;
alter table public.badges           enable row level security;
alter table public.user_badges      enable row level security;

-- ─── users : owner-only + colonnes d'écriture restreintes ────────────────────
-- Un client ne doit JAMAIS pouvoir s'attribuer foulees/eclats/is_club/streak :
-- on retire les privilèges larges et on ne rend que des colonnes sûres.
revoke insert, update, delete on public.users from anon, authenticated;
grant insert (id, pseudo, city_id, referred_by) on public.users to authenticated;
grant update (pseudo, city_id) on public.users to authenticated;

create policy users_select_self on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profil public : pseudo + ville seulement (vue owner → bypasse le RLS de users).
create view public.public_profiles as
select id, pseudo, city_id
from public.users;

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ─── crews : lecture publique, create/update par le créateur ─────────────────
revoke insert, update, delete on public.crews from anon, authenticated;
grant insert (id, name, color, city_id, code, created_by) on public.crews to authenticated;
grant update (name, color) on public.crews to authenticated;
-- NB : le renommage payant (300 Foulées, CREW_RENAME_FOULEES) débite la monnaie
-- via Edge Function ; la policy autorise l'écriture, la règle métier vit côté serveur.

create policy crews_select_all on public.crews
  for select to authenticated
  using (true);

create policy crews_insert_creator on public.crews
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy crews_update_creator on public.crews
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- ─── crew_members : historique visible, écriture self ────────────────────────
-- joined_at n'est pas insérable par le client (default now()) : falsifier la
-- date d'adhésion casserait le cooldown 7 j (CREW_SWITCH_COOLDOWN_DAYS).
revoke insert, update, delete on public.crew_members from anon, authenticated;
grant insert (crew_id, user_id) on public.crew_members to authenticated;
grant update (left_at) on public.crew_members to authenticated;

create policy crew_members_select_all on public.crew_members
  for select to authenticated
  using (true);

create policy crew_members_insert_self on public.crew_members
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy crew_members_update_self on public.crew_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── runs : lecture de SES courses uniquement, écriture service_role only ────
-- « Jamais de trace d'autrui » (§7) : pas de lecture publique.
revoke insert, update, delete on public.runs from anon, authenticated;

create policy runs_select_own on public.runs
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── hex_claims : lecture publique (états de territoire, pas de trace) ───────
revoke insert, update, delete on public.hex_claims from anon, authenticated;

create policy hex_claims_select_all on public.hex_claims
  for select to authenticated
  using (true);

-- ─── shields : zone bouclier visible par tous (fair-play, §3.3) ──────────────
revoke insert, update, delete on public.shields from anon, authenticated;

create policy shields_select_all on public.shields
  for select to authenticated
  using (true);

-- ─── seasons / season_scores / city_zones : lecture publique, zéro écriture ──
revoke insert, update, delete on public.seasons       from anon, authenticated;
revoke insert, update, delete on public.season_scores from anon, authenticated;
revoke insert, update, delete on public.city_zones    from anon, authenticated;

create policy seasons_select_all on public.seasons
  for select to authenticated
  using (true);

create policy season_scores_select_all on public.season_scores
  for select to authenticated
  using (true);

create policy city_zones_select_all on public.city_zones
  for select to authenticated
  using (true);

-- ─── purchases : owner-only strict en lecture, écriture rc_webhook only ──────
revoke insert, update, delete on public.purchases from anon, authenticated;

create policy purchases_select_own on public.purchases
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── privacy_zones : owner-only strict (lecture ET écriture) ─────────────────
create policy privacy_zones_select_own on public.privacy_zones
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy privacy_zones_insert_own on public.privacy_zones
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy privacy_zones_update_own on public.privacy_zones
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy privacy_zones_delete_own on public.privacy_zones
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── referrals : insert par le parrain, activation côté serveur ──────────────
-- activated_at / boost_expires_at ne sont pas insérables par le client :
-- ils ne sont posés qu'après la 1re course validée du filleul (Edge Function).
revoke insert, update, delete on public.referrals from anon, authenticated;
grant insert (referrer_id, referee_id) on public.referrals to authenticated;

create policy referrals_select_own on public.referrals
  for select to authenticated
  using ((select auth.uid()) in (referrer_id, referee_id));

create policy referrals_insert_referrer on public.referrals
  for insert to authenticated
  with check (referrer_id = (select auth.uid()));

-- ─── waitlist : insert anonyme autorisé (site web), lecture interdite ─────────
revoke select, update, delete on public.waitlist from anon, authenticated;

create policy waitlist_insert_anyone on public.waitlist
  for insert to anon, authenticated
  with check (true);

-- ─── sectors / no_capture_zones / missions / badges : référentiels ───────────
-- Lecture authenticated, écriture service_role uniquement (seed/jobs).
revoke insert, update, delete on public.sectors          from anon, authenticated;
revoke insert, update, delete on public.no_capture_zones from anon, authenticated;
revoke insert, update, delete on public.missions         from anon, authenticated;
revoke insert, update, delete on public.badges           from anon, authenticated;

create policy sectors_select_all on public.sectors
  for select to authenticated
  using (true);

create policy no_capture_zones_select_all on public.no_capture_zones
  for select to authenticated
  using (true);

create policy missions_select_all on public.missions
  for select to authenticated
  using (true);

create policy badges_select_all on public.badges
  for select to authenticated
  using (true);

-- ─── outposts : visibles par tous (présence crew sur la carte), écrits serveur ─
revoke insert, update, delete on public.outposts from anon, authenticated;

create policy outposts_select_all on public.outposts
  for select to authenticated
  using (true);

-- ─── mission_progress : owner-only en lecture, écriture service_role only ────
revoke insert, update, delete on public.mission_progress from anon, authenticated;

create policy mission_progress_select_own on public.mission_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── user_badges : lecture publique (vitrine profil), écriture service_role ──
revoke insert, update, delete on public.user_badges from anon, authenticated;

create policy user_badges_select_all on public.user_badges
  for select to authenticated
  using (true);

-- ─── Vues classements / contrôle secteur : lecture authenticated seulement ───
revoke all on public.player_leaderboard from anon;
grant select on public.player_leaderboard to authenticated;

revoke all on public.crew_leaderboard from anon;
grant select on public.crew_leaderboard to authenticated;

revoke all on public.sector_control from anon;
grant select on public.sector_control to authenticated;
