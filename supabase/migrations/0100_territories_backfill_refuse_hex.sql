-- 0100_territories_backfill_refuse_hex.sql
-- GRYD — Vague 10.1 : GARDE-FOU, pas un inventeur de polygones.
--
-- FAIT :
--   1. Empêche d'écrire dans `territories` une géométrie taguée comme backfill
--      hexagonal (`algorithm_version` préfixé `backfill-hex`) — la constitution
--      §6 interdit les hexagones visibles, et un contour reconstruit depuis H3
--      serait indistinguable d'un vrai polygone de trace.
--   2. Pose une vue opérateur `territories_backfill_trace_ready` : courses qui
--      ont des hex_claims sans ligne `territories` ET pour lesquelles une trace
--      exploitable existerait (`runs.polyline_masked` non null). Aujourd'hui
--      `ingest_run` N'ÉCRIT PAS `polyline_masked` (anticheat_wiring.ts) : cette
--      vue doit donc rester VIDE — c'est le diagnostic honnête, pas un échec.
--
-- NE FAIT PAS : aucune ligne `territories` créée, aucune géométrie fabriquée,
-- aucune conversion H3→polygone. Les captures sans trace restent sans géométrie
-- et la carte client (`allowHexFallback: false`) continue de le dire.
--
-- ADDITIVE. Rollback = drop trigger/function/view.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. REFUS STRUCTUREL D'UN BACKFILL HEX
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.territories_refuse_hex_backfill()
returns trigger
language plpgsql
as $$
begin
  if new.algorithm_version ~* '^backfill-hex'
     or new.algorithm_version ~* '^hex-union'
     or new.algorithm_version ~* '^h3-union' then
    raise exception
      'GRYD refuse algorithm_version=% : reconstruire un polygone depuis H3 injecterait un contour hexagonal indistinguable d''une vraie trace (constitution §6). Backfill légitime = trace GPS uniquement.',
      new.algorithm_version;
  end if;
  return new;
end;
$$;

comment on function public.territories_refuse_hex_backfill() is
  'Vague 10.1 : bloque toute écriture territories dont algorithm_version avoue un backfill hexagonal. La seule source légitime est la trace GPS de la course.';

drop trigger if exists territories_refuse_hex_backfill_trg on public.territories;
create trigger territories_refuse_hex_backfill_trg
  before insert or update of algorithm_version on public.territories
  for each row
  execute function public.territories_refuse_hex_backfill();

-- ════════════════════════════════════════════════════════════════════════════
-- 2. FILET : Y A-T-IL UNE TRACE EXPLOITABLE POUR BACKFILLER ?
-- ════════════════════════════════════════════════════════════════════════════
drop view if exists public.territories_backfill_trace_ready;
create view public.territories_backfill_trace_ready as
select
  g.run_id,
  g.activity,
  g.owner_user_id,
  g.city_id,
  g.cell_count,
  g.first_claimed_at,
  g.last_claimed_at,
  (r.polyline_masked is not null and length(trim(r.polyline_masked)) > 0) as has_trace
from public.territories_backfill_gap g
left join public.runs r on r.id = g.run_id
where g.attributable_to_run
  and r.polyline_masked is not null
  and length(trim(r.polyline_masked)) > 0;

comment on view public.territories_backfill_trace_ready is
  'Vague 10.1 DIAGNOSTIC : groupes hex_claims sans polygone territories POUR LESQUELS une polyline_masked existe encore sur runs. Zéro ligne = rien à backfiller depuis une trace (état attendu tant que ingest_run n''écrit pas polyline_masked). JAMAIS servie aux clients.';

revoke all on public.territories_backfill_trace_ready from public, anon, authenticated;
