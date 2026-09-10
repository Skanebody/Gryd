-- 0158_capture_provisional_gain_2026.sql
-- GRYD — LE GAIN EXISTE DÈS L'ARRIVÉE, ET IL EST ÉTIQUETÉ POUR CE QU'IL EST.
--
-- ═══ R2S-7a : TRENTE MINUTES DE SILENCE ═════════════════════════════════════
-- `newTerrainM2`, `neutralTakenM2`, `takenFromOthersM2` et `alreadyOwnedM2` ne
-- sont écrits que par `rebuild_ownership_2026`, donc SEULEMENT à la publication
-- — 30 minutes après la fin (§5.6). Entre les deux, `capture_result_2026`
-- renvoyait `null` pour tous : le joueur qui vient de fermer sa boucle n'avait
-- AUCUN chiffre. L'écran ne pouvait ni annoncer un gain (ce serait mentir), ni
-- l'annoncer plus tard sans que le joueur ait fermé l'app.
--
-- ═══ CE QUE CETTE MIGRATION AJOUTE, ET CE QU'ELLE REFUSE D'AJOUTER ═════════
-- Tant que rien n'est publié, le résultat porte une ESTIMATION calculée avec
-- exactement la formule du cahier §5.4 (P contre la possession O du moment),
-- et le champ `provisional` vaut `true`. Le client a de quoi écrire « environ
-- +0,18 km², sous réserve de publication » — jamais « +0,18 km² » tout court.
--
-- Trois refus délibérés :
--  · SEULES les faces `scheduled` comptent. Une face `pending`, `rejected` ou
--    `private` ne prendra aucun terrain : lui prêter un gain serait la
--    promesse la plus cruelle du produit ;
--  · l'estimation est mesurée sur l'UNION des faces de la sortie (§5.4 : « ne
--    pas sommer des polygones qui se recouvrent comme s'ils étaient neufs ») ;
--  · dès qu'un événement est publié ou retiré, on rend les chiffres RÉELS
--    calculés par le rejeu, et `provisional` retombe à `false`. Une estimation
--    ne survit jamais à la vérité.
--
-- L'estimation peut être démentie : une boucle concurrente publiée avant la
-- nôtre reprendra une part. C'est précisément ce que `provisional` annonce, et
-- c'est pour ça qu'aucune progression ni aucun partage ne doit s'appuyer
-- dessus (le contrat de réponse d'`ingest_run` le dit en toutes lettres).
--
-- Le reste de 0123 est préservé mot pour mot : `publishedAreaM2`,
-- `remainingTerrainM2`, `asOf`, le motif filtré par statut, l'autorisation.

create or replace function public.capture_result_2026(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare r public.runs; result jsonb; remaining float8; settled boolean;
  staged geometry; mine geometry; all_owned geometry; empty_geom geometry;
  new_m2 float8; neutral_m2 float8; taken_m2 float8; owned_m2 float8;
begin
  select * into strict r from public.runs where id=p_run_id;
  if coalesce(auth.role(),'')<>'service_role' and r.user_id is distinct from auth.uid() then raise exception 'not_authorized'; end if;
  settled:=exists(select 1 from public.capture_events_2026 where run_id=p_run_id and status in('published','withdrawn'));
  if settled then
    -- A later capture by the SAME player may change event attribution, not possession.
    select coalesce(ST_Area(ST_Intersection(
      (select ST_UnaryUnion(ST_Collect(e.geometry)) from public.capture_events_2026 e
        where e.run_id=p_run_id and e.status in('published','withdrawn')),
      (select ST_UnaryUnion(ST_Collect(o.geometry)) from public.ownership_2026 o
        where o.owner_id=r.user_id and o.activity=r.activity)
    )::geography),0) into remaining;
  -- Le test d'existence est NON spatial et vient en premier : une sortie sans
  -- face admissible ne déclenche aucune géométrie du tout.
  elsif exists(select 1 from public.capture_events_2026 where run_id=p_run_id and status='scheduled') then
    -- ESTIMATION §5.4, sur les seules faces qui peuvent encore être publiées.
    empty_geom:=ST_GeomFromText('MULTIPOLYGON EMPTY',4326);
    select ST_UnaryUnion(ST_Collect(geometry)) into staged
      from public.capture_events_2026 where run_id=p_run_id and status='scheduled';
    if staged is not null then
      select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into mine
        from public.ownership_2026 where activity=r.activity and owner_id=r.user_id and geometry && staged;
      select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into all_owned
        from public.ownership_2026 where activity=r.activity and geometry && staged;
      new_m2:=ST_Area(ST_Difference(staged,mine)::geography);
      neutral_m2:=ST_Area(ST_Difference(staged,all_owned)::geography);
      taken_m2:=ST_Area(ST_Difference(ST_Intersection(staged,all_owned),mine)::geography);
      owned_m2:=ST_Area(ST_Intersection(staged,mine)::geography);
    end if;
  end if;
  select jsonb_build_object('ruleset','2026.1','status',coalesce(r.game_status_2026,'pending'),
    'reason',coalesce(min(e.reason) filter(where e.status=r.game_status_2026 or (r.game_status_2026='private' and e.status='withdrawn')),r.game_reason_2026),
    'loopAreaM2',coalesce(ST_Area(ST_UnaryUnion(ST_Collect(e.geometry))::geography),0),
    'provisional',not settled and staged is not null,
    'newTerrainM2',case when settled then ST_Area(ST_UnaryUnion(ST_Collect(e.new_geometry))::geography) else new_m2 end,
    'neutralTakenM2',case when settled then ST_Area(ST_UnaryUnion(ST_Collect(e.neutral_geometry))::geography) else neutral_m2 end,
    'takenFromOthersM2',case when settled then ST_Area(ST_UnaryUnion(ST_Collect(e.taken_geometry))::geography) else taken_m2 end,
    'alreadyOwnedM2',case when settled then ST_Area(ST_UnaryUnion(ST_Collect(e.already_owned_geometry))::geography) else owned_m2 end,
    'publishedAreaM2',ST_Area(ST_UnaryUnion(ST_Collect(e.geometry) filter(where e.status in('published','withdrawn')))::geography),
    'remainingTerrainM2',remaining,'asOf',now(),'publishAfter',max(e.publish_after)) into result
    from public.capture_events_2026 e where e.run_id=p_run_id;
  return result;
end $$;
revoke all on function public.capture_result_2026(uuid) from public,anon;
grant execute on function public.capture_result_2026(uuid) to authenticated,service_role;
comment on function public.capture_result_2026(uuid) is
  'Reçu de capture d''une sortie. Tant que rien n''est publié, les surfaces sont une ESTIMATION (§5.4) sur les seules faces `scheduled` et `provisional` vaut true ; dès la publication, ce sont les chiffres du rejeu et provisional retombe à false.';
