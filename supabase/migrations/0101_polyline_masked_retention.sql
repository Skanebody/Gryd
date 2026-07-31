-- 0101_polyline_masked_retention.sql
-- GRYD — La rétention de 90 jours cesse d'être une promesse de commentaire.
--
-- ═══ POURQUOI CETTE MIGRATION NE POUVAIT PAS ATTENDRE ═══════════════════════
-- `0002_schema.sql:107` annonce depuis le premier jour :
--   « polyline_masked text -- trace déjà expurgée des zones privées (§7) ;
--     purge à 90 j (RAW_POLYLINE_RETENTION_DAYS) côté job »
-- Or AUCUN job n'existait. Tant que la colonne restait vide, la promesse ne
-- coûtait rien. À partir du moment où `ingest_run` l'écrit (chantier du
-- 28/07/2026), une doc qui annonce 90 jours sans que rien ne les applique
-- devient une doc qui promet au-delà du code — sur une donnée de LOCALISATION.
-- L'écriture et la purge partent donc ensemble, ou ne partent pas.
--
-- ═══ CE QU'ELLE EFFACE, ET CE QU'ELLE GARDE ═════════════════════════════════
-- Elle met `polyline_masked` à NULL. Elle NE SUPPRIME PAS la course.
-- La distance, la durée, l'allure et le territoire capturé sont des faits que le
-- joueur a GAGNÉS : ils lui appartiennent sans limite de temps. Sa trace
-- géographique est une donnée de localisation : elle a une durée de vie. Les
-- deux n'ont pas le même statut, et les confondre effacerait un historique
-- légitime au nom de la vie privée.
--
-- ═══ IDEMPOTENTE ═══════════════════════════════════════════════════════════
-- Le `where polyline_masked is not null` fait qu'un second passage ne touche
-- aucune ligne. La fonction peut donc être appelée deux fois, ou rejouée après
-- un échec, sans effet de bord.
--
-- ADDITIVE : aucune colonne supprimée, aucune donnée de jeu touchée.
-- Rollback = drop function.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA PURGE
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.purge_expired_polylines(p_retention_days integer)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_purged integer;
begin
  -- Garde-fou : une rétention nulle ou négative effacerait TOUTES les traces,
  -- y compris celle de la course qui vient d'être enregistrée. On refuse plutôt
  -- que d'obéir à un appel manifestement erroné.
  if p_retention_days is null or p_retention_days < 1 then
    raise exception 'purge_expired_polylines : rétention invalide (%). Attendu >= 1 jour.', p_retention_days;
  end if;

  update public.runs
     set polyline_masked = null
   where polyline_masked is not null
     and started_at < now() - make_interval(days => p_retention_days);

  get diagnostics v_purged = row_count;
  return v_purged;
end;
$$;

comment on function public.purge_expired_polylines(integer) is
  'Vague 10 : efface les traces masquées au-delà de la rétention (RAW_POLYLINE_RETENTION_DAYS = 90, packages/shared/src/game-rules.ts). Met la colonne à NULL, ne supprime JAMAIS la course : la distance et le territoire sont des faits gagnés, la trace est une donnée de localisation. Idempotente. Rend le nombre de lignes purgées.';

-- L'appel est RÉSERVÉ au service-role (le job planifié). Aucun client, même
-- authentifié, n'a de raison de déclencher une purge globale.
revoke all on function public.purge_expired_polylines(integer) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. DIAGNOSTIC : la rétention est-elle réellement tenue ?
-- ════════════════════════════════════════════════════════════════════════════
-- Sans cette vue, on ne saurait dire si le job tourne — on le supposerait.
drop view if exists public.polyline_retention_health;
create view public.polyline_retention_health as
select
  count(*) filter (where polyline_masked is not null) as traces_stored,
  count(*) filter (
    where polyline_masked is not null
      and started_at < now() - make_interval(days => 90)
  ) as traces_overdue,
  min(started_at) filter (where polyline_masked is not null) as oldest_trace_at
from public.runs;

comment on view public.polyline_retention_health is
  'Vague 10 DIAGNOSTIC : traces_overdue > 0 signifie que le job de purge ne tourne pas (ou plus). JAMAIS servie aux clients — service-role uniquement.';

revoke all on public.polyline_retention_health from public, anon, authenticated;
