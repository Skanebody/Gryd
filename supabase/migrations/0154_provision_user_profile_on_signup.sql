-- GRYD — 0154 : l'inscription provisionne AUSSI `public.user_profiles`.
--
-- ═══ LE DÉFAUT (recette statique du 10/09/2026) ═══════════════════════════════
-- `0028_provision_user_on_signup.sql` ne crée que `public.users`. Les SEULS
-- écrivains de `public.user_profiles` sont `app/setup/profile.tsx:437` (E08,
-- injoignable depuis la refonte de septembre : plus aucune route n'y mène) et
-- `save_my_social_profile_2026` (0124), atteint par `/profil-edit`.
--
-- Or `get_ownership_2026` (0126:42) exige une ligne de profil pour servir une
-- possession :
--
--     and exists (select 1 from public.user_profiles up
--                 where up.user_id = o.owner_id and up.map_sharing <> 'none')
--
-- Conséquence exacte, et elle est grave : un compte fraîchement créé qui ferme
-- une boucle voit son résultat annoncer « +X km² », mais la carte ne rend son
-- terrain à PERSONNE — pas même à lui, puisque le filtre s'applique aussi quand
-- `o.owner_id = auth.uid()`. L'app annonçait une capture que sa propre carte
-- démentait. C'est l'interdit n°1 (« l'app ne ment jamais »).
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET RIEN DE PLUS ════════════════════════════
--  1. `public.gryd_default_profile_handle(uuid)` — dérive un @handle LIBRE et
--     STABLE depuis l'identifiant du compte (jamais un aléatoire : le même
--     compte retrouve le même handle si la ligne est recréée) ;
--  2. `public.handle_new_user()` insère la ligne de profil juste après celle de
--     `public.users`, avec les DÉFAUTS de 0011 (`profile_visibility = 'crew'`,
--     `activity_sharing = 'crew'`, `map_sharing = 'simplified'`,
--     `discreet_mode = false`) — aucune valeur n'est réécrite ici ;
--  3. rattrapage IDEMPOTENT des comptes déjà créés sans ligne de profil.
--
-- Elle ne touche AUCUNE ligne existante : `where not exists` + `on conflict do
-- nothing`. Rejouée, elle ne crée rien de plus.
--
-- ⚠️ CE QU'ELLE NE DÉCIDE PAS. Le handle par défaut n'est pas une identité
-- publique choisie : c'est un identifiant technique lisible, que le joueur
-- remplace dans `/profil-edit`. Rien ici ne publie quoi que ce soit — les
-- défauts de 0011 sont ceux d'un profil VISIBLE PAR LE CREW, pas public.
--
-- Additif et réversible (la version 0028 de la fonction reste dans son fichier) :
--   drop function if exists public.gryd_default_profile_handle(uuid);
--   -- puis rejouer 0028 pour restaurer l'ancienne `handle_new_user()`.

-- ═══ 1. LE @HANDLE PAR DÉFAUT ════════════════════════════════════════════════
-- Contrainte de 0011:45 — `handle text not null unique check (handle ~
-- '^[a-z0-9_]{3,20}$')`. Trois exigences, tenues ici :
--
--  · MÊME DÉRIVATION QUE LE PSEUDO (0028) : `'runner_' || 12 premiers caractères
--    hexadécimaux de l'uuid` = 19 caractères, tous dans la classe autorisée
--    (`uuid::text` est en minuscules en Postgres). Le pseudo de `public.users`
--    et le @handle du profil coïncident donc, ce qui évite d'exposer au joueur
--    deux identités techniques différentes pour le même compte.
--  · UNIQUE POUR DE VRAI : le handle dérivé peut être PRIS — non pas par
--    collision d'uuid (négligeable) mais parce qu'un humain peut l'avoir
--    revendiqué dans `/profil-edit`. On cherche donc le premier candidat LIBRE.
--  · JAMAIS UNE EXCEPTION DANS LE TRIGGER : une violation d'unicité ferait
--    échouer l'INSERT sur `auth.users`, donc l'inscription elle-même. Un compte
--    sans profil est un défaut ; un compte impossible à créer est une panne.
create or replace function public.gryd_default_profile_handle(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  hex        text;
  candidate  text;
  attempt    int;
begin
  if p_user is null then return null; end if;
  hex := replace(p_user::text, '-', '');

  -- Candidat n°1 : exactement le pseudo de 0028.
  candidate := 'runner_' || substr(hex, 1, 12);
  if not exists (select 1 from public.user_profiles up where up.handle = candidate) then
    return candidate;
  end if;

  -- Candidat n°2 : un caractère de plus (20 = la longueur maximale autorisée).
  candidate := 'runner_' || substr(hex, 1, 13);
  if not exists (select 1 from public.user_profiles up where up.handle = candidate) then
    return candidate;
  end if;

  -- Repli DÉTERMINISTE : md5 rend 32 caractères [0-9a-f], on en garde 19 après
  -- un préfixe alphabétique. `attempt` est dans la graine, donc chaque essai
  -- donne un candidat différent — et le même pour ce compte à chaque rejeu.
  for attempt in 1..32 loop
    candidate := 'r' || substr(md5(p_user::text || ':' || attempt::text), 1, 19);
    if not exists (select 1 from public.user_profiles up where up.handle = candidate) then
      return candidate;
    end if;
  end loop;

  -- 34 candidats pris pour un seul compte : on ne devine pas, on ne force pas.
  return null;
end $$;

revoke all on function public.gryd_default_profile_handle(uuid) from public, anon, authenticated;
grant execute on function public.gryd_default_profile_handle(uuid) to service_role;

-- ═══ 2. LE TRIGGER D'INSCRIPTION ═════════════════════════════════════════════
-- Reprend MOT POUR MOT l'insertion `public.users` de 0028 (elle n'a pas changé)
-- et lui ajoute la ligne de profil. L'ordre compte : `user_profiles.user_id`
-- référence `public.users (id)`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_handle text;
begin
  insert into public.users (id, pseudo)
  values (
    new.id,
    'runner_' || substr(replace(new.id::text, '-', ''), 1, 12)
  )
  on conflict (id) do nothing;

  -- SOUS-BLOC GARDÉ : quoi qu'il arrive ici, l'inscription aboutit. Sans cette
  -- garde, la moindre contrainte future sur `user_profiles` transformerait une
  -- migration en panne de création de compte, et le joueur lirait « connexion
  -- impossible » sans qu'aucun écran ne puisse dire pourquoi.
  begin
    new_handle := public.gryd_default_profile_handle(new.id);
    if new_handle is not null then
      insert into public.user_profiles (user_id, handle)
      values (new.id, new_handle)
      on conflict (user_id) do nothing;
    end if;
  exception when others then
    -- On ne fabrique pas de profil approximatif et on n'annule pas le compte :
    -- le rattrapage ci-dessous (rejouable) reste la voie de réparation.
    null;
  end;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══ 3. RATTRAPAGE DES COMPTES EXISTANTS ═════════════════════════════════════
-- Ligne à ligne, et non `insert … select` : `gryd_default_profile_handle` lit
-- `user_profiles` pour trouver un handle libre, et à l'intérieur d'un seul
-- `insert … select` cette lecture ne verrait AUCUNE des lignes que le même
-- ordre vient d'insérer. Deux comptes servis dans la même passe pourraient donc
-- recevoir le même handle et faire échouer toute la migration.
--
-- IDEMPOTENT : le `where not exists` est réévalué à chaque passage, et le
-- `on conflict (user_id) do nothing` couvre une exécution concurrente.
do $$
declare
  r          record;
  new_handle text;
begin
  for r in
    select u.id
    from public.users u
    where not exists (select 1 from public.user_profiles up where up.user_id = u.id)
    order by u.id
  loop
    new_handle := public.gryd_default_profile_handle(r.id);
    if new_handle is not null then
      insert into public.user_profiles (user_id, handle)
      values (r.id, new_handle)
      on conflict (user_id) do nothing;
    end if;
  end loop;
end $$;
