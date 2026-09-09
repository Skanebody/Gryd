-- 0163 — « Ta commune, cette semaine » : LES PORTÉES ACTIVES, ET L'HEURE.
-- ADR-013 §2.1, lot L. ADDITIVE. Crée un job pg_cron, aucune donnée.
--
-- ═══ POURQUOI « ACTIVES » ET NON « TOUTES » ════════════════════════════════
-- Prendre un snapshot de 34 969 communes chaque heure mesurerait 34 969 fois
-- l'absence de course. Une portée est ACTIVE quand un événement PUBLIÉ et
-- ÉLIGIBLE de la semaine en cours tombe dedans — c'est-à-dire quand il y a
-- quelque chose à mesurer. Une commune sans course cette semaine n'a pas de
-- snapshot, et la lecture (0164) le dit avec ses propres mots (« personne n'a
-- encore pris de terrain ici ») au lieu de servir un tableau vide horodaté.
--
-- La liste des portées actives se DÉDUIT donc des événements, jamais d'une
-- table de villes « à surveiller » : le jour où quelqu'un court dans une
-- commune qui vient de s'ouvrir, elle est mesurée à l'heure suivante sans une
-- ligne de configuration. C'est l'ouverture par présence d'ADR-013, appliquée
-- au calcul et pas seulement à l'affichage.
--
-- ═══ VERDICT pg_cron (vérifié en production le 09/09/2026) ═════════════════
-- `pg_cron` 1.6.4 est INSTALLÉ sur le projet `gryd`, avec dix jobs actifs, dont
-- deux de 2026 qui appellent du SQL directement sans passer par le réseau
-- (`publish-capture-events-2026`, `publish-challenges-2026`). Aucune Edge
-- Function n'est donc nécessaire pour planifier ce preneur : ce serait une
-- pièce mobile de plus, un secret de plus, et une panne de plus possible entre
-- l'horloge et la base. Le `do $$ ... $$` conditionnel ne sert qu'aux bases de
-- test, où le schéma `cron` n'existe pas.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LES PORTÉES QUI ONT QUELQUE CHOSE À MESURER CETTE SEMAINE
-- ════════════════════════════════════════════════════════════════════════════
-- `plpgsql` : le corps traverse PostGIS, il ne doit pas être planifié à la
-- création (mêmes raisons qu'en 0161).
create or replace function public.active_leaderboard_scopes_2026(p_at timestamptz default now())
returns table (activity text, scope text, scope_ref text)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  select b.week_start, b.week_end into v_start, v_end
  from public.leaderboard_week_bounds_2026(coalesce(p_at, now())) b;

  return query
  with eligible as (
    -- Les deux disciplines sont parcourues séparément et ne se rencontrent
    -- jamais : `activity` reste porté jusqu'à la sortie (§5.3, §9.3).
    select a.act as activity, el.event_id
    from (select unnest(array['run', 'bike']) as act) a -- game-rules: ACTIVITIES
    cross join lateral public.board_eligible_events_2026(a.act, v_start, v_end) el
  ),
  communes as (
    select distinct el.activity, z.city_id, right(z.city_id, -6) as insee
    from eligible el
    join public.capture_events_2026 e on e.id = el.event_id
    join public.city_zones z
      on z.city_id like 'insee-%'
     and e.new_geometry && ST_SetSRID(ST_GeomFromGeoJSON(z.geojson), 4326)
     and ST_Intersects(e.new_geometry, ST_SetSRID(ST_GeomFromGeoJSON(z.geojson), 4326))
  )
  select c.activity, 'commune'::text, c.city_id from communes c
  union
  select distinct c.activity, 'department'::text, public.gryd_dept_of_insee(c.insee) from communes c
  union
  select distinct c.activity, 'country'::text, 'FR'::text from communes c;
end $$;

comment on function public.active_leaderboard_scopes_2026(timestamptz) is
  'Les portées à mesurer cette semaine : celles où un événement publié et éligible est tombé. Déduites des événements, jamais d''une liste de villes — une commune qui vient de s''ouvrir est mesurée à l''heure suivante, sans configuration.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LE BALAYAGE HORAIRE
-- ════════════════════════════════════════════════════════════════════════════
-- Un verrou consultatif de transaction : deux exécutions qui se chevauchent
-- écriraient deux vérités concurrentes du même tableau (et se heurteraient à
-- l'index d'identité de 0082). La seconde attend, elle n'échoue pas.
create or replace function public.take_active_leaderboard_snapshots_2026(p_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  taken integer := 0;
  v_at timestamptz := coalesce(p_at, now());
begin
  perform pg_advisory_xact_lock(hashtext('leaderboard_snapshots_2026'));
  for r in select * from public.active_leaderboard_scopes_2026(v_at) loop
    perform public.take_leaderboard_snapshot_2026(r.activity, r.scope, r.scope_ref, v_at);
    taken := taken + 1;
  end loop;
  return taken;
end $$;

comment on function public.take_active_leaderboard_snapshots_2026(timestamptz) is
  'Balayage horaire : un snapshot par portée ACTIVE et par discipline. Rend le nombre de snapshots pris. Ne déclenche jamais rebuild_ownership_2026 (il ne fait qu''appeler le preneur, qui ne l''appelle pas non plus).';

revoke all on function public.active_leaderboard_scopes_2026(timestamptz) from public, anon, authenticated;
grant execute on function public.active_leaderboard_scopes_2026(timestamptz) to service_role;

revoke all on function public.take_active_leaderboard_snapshots_2026(timestamptz) from public, anon, authenticated;
grant execute on function public.take_active_leaderboard_snapshots_2026(timestamptz) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. L'HORLOGE
-- ════════════════════════════════════════════════════════════════════════════
-- Toutes les heures, à l'heure ronde. La cadence est celle de
-- `LEADERBOARD_RULES_2026.snapshotIntervalMinutes` (60) et l'écran affiche
-- « mesuré à HH:MM » : le joueur n'a jamais à deviner si ce qu'il lit date de
-- cinq minutes ou de trois jours.
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule(
      'leaderboard-snapshots-2026',
      '0 * * * *', -- game-rules: LEADERBOARD_RULES_2026.snapshotIntervalMinutes
      'select public.take_active_leaderboard_snapshots_2026()'
    );
  end if;
end $$;
