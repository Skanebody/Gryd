-- GRYD — 0060 : season_current(), LECTURE SEULE de la saison active d'une ville.
--
-- POURQUOI CETTE RPC (doctrine « l'app ne ment jamais ») : l'UI ne doit afficher
-- une date de fin de saison QUE si une saison réelle existe en base. Cette
-- fonction lit la table `seasons` (source de vérité, peuplée par le seed §6.2 et
-- gérée par l'Edge Function season_close) et renvoie la saison ACTIVE de la ville
-- — ou AUCUNE LIGNE. Elle n'invente jamais de fenêtre : pas de saison active =>
-- 0 ligne => le hook `useActiveSeason` répond « aucune », et l'écran le dit.
--
-- La fenêtre (starts_at, ends_at) est brute ; la progression (pct, jours
-- restants, phase) est dérivée CÔTÉ CLIENT par le moteur pur `seasonProgress`
-- (packages/shared/src/season.ts) — aucun seuil de jeu écrit ici.
--
-- NUMÉRO DE SAISON : dérivé, jamais stocké. C'est le rang 0-indexé de la saison
-- dans sa ville, par ordre de `starts_at` — la première saison d'une ville est
-- donc « Saison 0 » (Saison 0 « Fondateurs », seed 0004). Deux saisons ne peuvent
-- pas démarrer au même instant en pratique ; à égalité de `starts_at` le rang est
-- simplement partagé, ce qui reste honnête (aucun numéro fabriqué).
--
-- SÉCURITÉ : `security invoker` — la RLS de `seasons` (lecture réservée à
-- `authenticated`, aucune écriture client, 0003_rls.sql) s'applique telle quelle.
-- `anon` n'a NI politique de select sur `seasons`, NI execute sur cette fonction
-- (revoke ci-dessous) : le décompte de saison est une donnée de joueur connecté,
-- pas une donnée publique. `p_city_id` par défaut = la ville du joueur courant.

create or replace function public.season_current(p_city_id text default null)
returns table (
  season_id     uuid,
  city_id       text,
  starts_at     timestamptz,
  ends_at       timestamptz,
  season_number integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.city_id,
    s.starts_at,
    s.ends_at,
    -- Rang 0-indexé dans la ville (par ancienneté de début) = numéro de saison.
    (
      select count(*)::integer
      from public.seasons s2
      where s2.city_id = s.city_id
        and s2.starts_at < s.starts_at
    ) as season_number
  from public.seasons s
  where s.status = 'active'
    and s.city_id = coalesce(
      p_city_id,
      (select u.city_id from public.users u where u.id = auth.uid())
    )
  -- Index partiel `seasons_one_active_per_city` : au plus une active par ville.
  -- `limit 1` est une ceinture-bretelles au cas où l'invariant serait rompu.
  limit 1;
$$;

-- Périmètre d'exécution : `authenticated` seulement (comme la lecture de la table
-- elle-même). `anon` est explicitement écarté — pas de décompte de saison servi à
-- un visiteur non connecté.
revoke all on function public.season_current(text) from public, anon;
grant execute on function public.season_current(text) to authenticated;
