-- 0129_security_audit_2026.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — AUDIT DE SÉCURITÉ OFFENSIF DU 10/09/2026. Ce que cette migration
-- referme a été CONSTATÉ EN PRODUCTION (projet gryd, sondes lecture seule),
-- pas déduit d'une lecture. Preuve rejouable : supabase/tests/
-- security_audit_2026.pglite.test.mjs (étape 0 « le défaut existait »).
--
-- LE MÉCANISME COMMUN AUX TROIS PREMIERS DÉFAUTS
-- Supabase pose, à la création du projet :
--     alter default privileges for role postgres in schema public
--       grant all on functions to anon, authenticated, service_role;
-- Toute fonction créée ensuite naît donc EXÉCUTABLE PAR anon. Les migrations
-- qui écrivent seulement « revoke all on function ... from public » (0026,
-- 0027) ou qui n'écrivent RIEN (0103, et la 0018 d'une branche Cursor
-- abandonnée) laissent la porte ouverte. La dernière section de ce fichier
-- inverse ce défaut pour toujours : à partir d'ici, une fonction naît FERMÉE et
-- s'ouvre explicitement — la même règle que la RLS (deny all, puis ouvertures).
--
-- AUCUNE DONNÉE N'EST DÉTRUITE ICI. Aucune migration antérieure n'est réécrite.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. CRITIQUE — `sync_club_entitlements` accordait GRYD Club à n'importe qui
--
-- 0027 l'a créée SECURITY DEFINER, sans jamais lire `auth.uid()` : la victime
-- est un PARAMÈTRE. Elle accorde cinq droits premium avec `expires_at = null`
-- (permanents). En prod, `anon` ET `authenticated` pouvaient l'exécuter :
-- l'appel sous rôle `anon` avec un UUID inexistant rendait 23503 (violation de
-- clé étrangère → le corps a tourné), et non 42501 (privilège refusé).
--   · anti-pay-to-win (règle 10) : la clé anon publique suffisait à s'offrir
--     l'abonnement, sans passer par RevenueCat ;
--   · grief : `p_active = false` éteint les droits d'un payeur.
-- Aucun appelant dans le dépôt (le webhook 2026 passe par
-- `apply_gryd_plus_snapshot_2026`). On la garde — la supprimer casserait un
-- éventuel appel service — mais on la ferme DEUX FOIS : privilèges + garde
-- interne, pour qu'un futur `grant` distrait ne rouvre pas la faille.
create or replace function public.sync_club_entitlements(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_keys text[] := array[
    'advanced_stats',
    'advanced_history',
    'leaderboard_filters',
    'advanced_goals',
    'route_builder_advanced'
  ];
  v_key text;
begin
  -- LA GARDE. `auth.role()` vaut 'anon'/'authenticated' derrière PostgREST et
  -- 'service_role' avec la clé de service. Elle est NULLE hors PostgREST (psql,
  -- cron, migration) : ce cas-là reste autorisé, sinon l'exploitation perdrait
  -- son propre outil. Un droit d'écriture premium ne se demande jamais depuis
  -- un téléphone.
  if coalesce(auth.role(), 'service_role') <> 'service_role' then
    raise exception 'not_authorized';
  end if;

  if p_active then
    foreach v_key in array v_keys loop
      update public.feature_entitlements
      set is_active = true, expires_at = null, starts_at = now()
      where user_id = p_user_id and feature_key = v_key and source = 'pass';
      if not found then
        insert into public.feature_entitlements (user_id, feature_key, source, starts_at, is_active)
        values (p_user_id, v_key, 'pass', now(), true);
      end if;
    end loop;
  else
    update public.feature_entitlements
    set is_active = false, expires_at = now()
    where user_id = p_user_id
      and feature_key = any (v_keys)
      and source = 'pass';
  end if;
end;
$$;
revoke all on function public.sync_club_entitlements(uuid, boolean) from public, anon, authenticated;
grant execute on function public.sync_club_entitlements(uuid, boolean) to service_role;
comment on function public.sync_club_entitlements(uuid, boolean) is
  'Service uniquement (0129). N''a jamais lu auth.uid() : la victime est un paramètre.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. HAUTE — deux fonctions ORPHELINES vivaient en prod, dans aucune migration
--
-- `hex_claims_for_city(text)` et `generate_crew_code()` viennent d'un
-- `0018_map_and_crew.sql` poussé depuis une branche Cursor abandonnée (commit
-- 6fe1016, jamais ancêtre de cette ligne) : appliquées au projet partagé, puis
-- renumérotées hors du dépôt. Le code du dépôt ne les mentionne nulle part.
--
-- `hex_claims_for_city` est SECURITY DEFINER, exécutable par `anon`, et rend
-- jusqu'à 8000 revendications AVEC `owner_user_id`. Elle contourne donc à la
-- fois la RLS de `hex_claims` (un `select` direct sous `anon` rend 42501) et le
-- filtre `map_sharing` que 0087/0089 imposent à la vue `public_hex_claims` :
-- un joueur ayant coupé le partage de carte y figure quand même. Le trou est
-- structurel — la base porte 0 revendication aujourd'hui, donc rien n'a fuité,
-- mais il aurait fui à la première course.
--
-- `generate_crew_code()` n'est référencée par aucun défaut de colonne, aucun
-- trigger, aucune autre fonction (vérifié au catalogue). Elle part avec.
drop function if exists public.hex_claims_for_city(text);
drop function if exists public.generate_crew_code();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. MOYENNE — des RPC de jeu naissaient ouvertes à l'anonyme
--
-- Toutes exigent déjà `auth.uid()` (ou rendent false) : rien ne change pour un
-- joueur connecté. Ce qui change, c'est la surface offerte SANS compte à des
-- fonctions SECURITY DEFINER qui touchent l'inventaire, les droits et les
-- classements. 0026 voulait explicitement `to authenticated` ; le défaut de
-- privilège Supabase avait ajouté `anon` par-dessus. 0103 n'écrivait aucun
-- grant du tout.
do $$
declare signature text;
begin
  foreach signature in array array[
    'public.activate_arsenal_item(text,text,text)',
    'public.equip_user_item(text)',
    'public.is_feature_entitled(text)',
    'public.dept_player_surface_board(text,text,timestamptz,timestamptz,integer)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format('revoke all on function %s from public, anon', signature);
      execute format('grant execute on function %s to authenticated, service_role', signature);
    end if;
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. BASSE — les fonctions de TRIGGER étaient exécutables par les clients
--
-- Postgres refuse de les appeler hors contexte de trigger : ce n'est pas une
-- faille, c'est du bruit dans la matrice de privilèges — et une matrice bruyante
-- est une matrice qu'on ne relit plus. On la nettoie pour que ce qui reste
-- ouvert soit ce qu'on a VOULU ouvrir.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. BASSE — `anon` détenait TRUNCATE sur 68 tables publiques
--
-- Défaut Supabase (`grant all on tables`). PostgREST n'émet jamais TRUNCATE :
-- ce privilège n'est pas exploitable aujourd'hui par le chemin normal. Il ne
-- sert non plus à rien, et un TRUNCATE ignore la RLS — c'est exactement le
-- genre de privilège qui transforme une petite faille (une fonction SECURITY
-- DEFINER mal écrite, une injection dans du SQL dynamique) en perte totale.
-- REFERENCES et TRIGGER partent pour la même raison. SELECT/INSERT/UPDATE/
-- DELETE ne sont PAS touchés : la RLS reste la seule autorité sur les lignes.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. LE DÉFAUT DE PRIVILÈGE, RESSERRÉ — ET CE QU'IL NE SUFFIT PAS À FAIRE
--
-- On retire `anon` et `authenticated` du défaut posé par Supabase : une
-- fonction créée après ce point ne naît plus avec une ligne d'ACL NOMMÉE pour
-- ces deux rôles.
--
-- ⚠️ CE N'EST PAS « la fonction naît fermée », et il serait malhonnête de
-- l'écrire. Postgres FUSIONNE toujours `acldefault()` — qui accorde EXECUTE à
-- PUBLIC — par-dessus l'entrée de `pg_default_acl` : mesuré sous PGlite, une
-- fonction créée APRÈS un `alter default privileges ... revoke execute on
-- functions from public` porte encore `=X/postgres`, donc reste exécutable par
-- `anon` (membre de PUBLIC). La seule fermeture RÉELLE reste, fonction par
-- fonction, le `revoke all on function ... from public, anon, authenticated` que
-- les migrations 2026 écrivent déjà.
--
-- L'APPLICATION DE LA RÈGLE EST DONC AILLEURS, et elle est exécutable :
-- `npm run verify:rls` échoue désormais si une fonction de `public` est
-- exécutable par `anon` hors de la liste explicitement voulue
-- (scripts/verify-rls-remote.mjs). C'est ce test-là qui empêche de refabriquer
-- les défauts 1 à 3, pas cette instruction.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Même geste pour les TABLES à venir : le défaut Supabase donne `arwdDxtm`,
-- soit TRUNCATE + REFERENCES + TRIGGER en plus des quatre verbes de données.
-- Ici la fusion ne rouvre rien : `acldefault()` n'accorde AUCUN privilège de
-- table à PUBLIC.
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. MOYENNE — une vue MATÉRIALISÉE était lisible par tout compte connecté
--
-- `sector_control` (0002, ouverte à `authenticated` par 0003) agrège le contrôle
-- de secteur par crew. Une vue matérialisée N'A PAS DE RLS : ses lignes sortent
-- telles quelles, sans `map_sharing`, sans blocage, sans mode discret — et un
-- crew d'un seul membre y devient la position de cette personne. Aucun écran
-- ne la lit (les jobs `recompute_sectors` / `decay_job` la RAFRAÎCHISSENT en
-- service ; la carte passe par `sector_snapshot`). On la referme.
do $$ begin
  if to_regclass('public.sector_control') is not null then
    execute 'revoke all on public.sector_control from public, anon, authenticated';
    execute 'grant select on public.sector_control to service_role';
  end if;
end $$;
