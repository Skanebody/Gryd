-- 0157_ownership_read_budget_2026.sql
-- GRYD — LIRE LA CARTE NE PEUT PAS COÛTER LA FRANCE ENTIÈRE, ET DOIT LE DIRE.
--
-- ═══ R2S-6 : CE QUE 0126 LAISSAIT PASSER ════════════════════════════════════
-- `get_ownership_2026` renvoie TOUTES les zones qui touchent la fenêtre, en
-- géométrie métier complète, sans `LIMIT` ni simplification. Au démarrage, le
-- client demande la France au zoom 3,9 — trois fois. Chaque zone y pèse ses
-- centaines de sommets pour couvrir deux pixels. Le jour où la carte se peuple,
-- cette requête devient la première panne du produit, et elle emporte l'écran
-- que le joueur vient voir.
--
-- ═══ CE QUE CETTE MIGRATION CHANGE ══════════════════════════════════════════
-- 1. SIMPLIFICATION PAR ZOOM. `p_zoom` (optionnel) donne une tolérance d'UN
--    pixel d'écran : le monde fait 256·2^zoom pixels pour 360°. Au-delà de
--    `fullDetailMinZoom`, la géométrie part telle quelle.
--    ⚠️ §5.5 règle 7 : « Conserver la géométrie métier séparément de la
--    simplification visuelle. Aucun style de carte ne change la propriété ou la
--    surface. » `areaM2` et `capturedAreaM2` sont donc TOUJOURS mesurés sur la
--    géométrie MÉTIER, jamais sur la version simplifiée. Le trait bouge d'un
--    pixel ; le chiffre du joueur, jamais.
-- 2. BORNE. Au plus `maxFeaturesPerViewport` zones, les plus grandes d'abord
--    (celles qu'un œil verrait). Le tri se fait sur une aire PLANAIRE, bon
--    marché ; l'aire géographique vraie n'est calculée que sur les retenues.
-- 3. LA TRONCATURE SE DIT. `truncated` et `availableFeatures` accompagnent la
--    réponse : une carte incomplète qui se tait est un mensonge (L8/L14). Le
--    client peut enfin écrire « zoome pour voir le reste » au lieu de laisser
--    croire que le terrain n'existe pas.
--
-- ═══ COMPATIBILITÉ ══════════════════════════════════════════════════════════
-- La signature à 5 arguments SURVIT, en enveloppe : les clients déjà installés
-- continuent d'appeler exactement la même RPC et gagnent la borne sans rien
-- changer. Le contrat reste `ownership.2026.3` — la liste blanche du client
-- (`territoryModel2026.ts`) refuse tout ce qu'elle ne connaît pas, et un
-- renommage aurait vidé la carte de tous les téléphones déjà déployés. Les
-- nouveaux champs sont ADDITIFS.
--
-- Les budgets viennent de `MAP_READ_RULES_2026` (packages/shared/src/game-rules.ts).
-- Cette RPC est appelée par le CLIENT : elle ne peut pas se les faire injecter
-- sans lui laisser choisir son propre plafond. Les littéraux sont donc ici, et
-- leur dérive est testée dans supabase/tests/ownership_read_2026.pglite.test.mjs.

-- Le filtre de publication porte sur la table jointe : un index partiel évite
-- de relire l'événement complet pour chaque zone d'une fenêtre dense.
create index if not exists capture_events_2026_published on public.capture_events_2026(id) where status='published';

create function public.get_ownership_2026(p_activity text,p_west float8,p_south float8,
  p_east float8,p_north float8,p_zoom float8)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare result jsonb; own_crew jsonb; tolerance float8;
  -- MIROIRS de MAP_READ_RULES_2026 (game-rules.ts) : maxFeaturesPerViewport,
  -- simplifyScreenPixels, fullDetailMinZoom.
  max_features constant integer:=1500;
  screen_pixels constant float8:=1;
  full_detail_min_zoom constant float8:=15;
begin
  if auth.uid() is null or p_activity is null or p_west is null or p_east is null or p_south is null or p_north is null
     or p_activity not in ('run','bike')
     or not(p_west>=-180 and p_east<=180 and p_south>=-90 and p_north<=90 and p_west<p_east and p_south<p_north)
     or (p_zoom is not null and not(p_zoom>=0 and p_zoom<=22)) then raise exception 'invalid_viewport'; end if;
  tolerance:=case when p_zoom is null or p_zoom>=full_detail_min_zoom then null
    else screen_pixels*360.0/(256.0*power(2.0,p_zoom)) end;
  select jsonb_build_object('id',c.id,'name',c.name) into own_crew from public.crew_members m join public.crews c on c.id=m.crew_id
    where m.user_id=auth.uid() and m.left_at is null;
  with visible as (
    select o.event_id,o.owner_id,o.activity,o.geometry,o.controlled_since,
           e.geometry captured,ST_Area(o.geometry) planar
      from public.ownership_2026 o join public.capture_events_2026 e on e.id=o.event_id
     where o.activity=p_activity and e.status='published'
       and o.geometry && ST_MakeEnvelope(p_west,p_south,p_east,p_north,4326)
       and exists(select 1 from public.user_profiles up where up.user_id=o.owner_id and up.map_sharing<>'none')
       and exists(select 1 from public.users u where u.id=o.owner_id and u.deletion_requested_at is null)
       and not public.challenge_pair_blocked_2026(auth.uid(),o.owner_id)
       and not exists(select 1 from public.friendships fr where fr.status='blocked' and
         least(fr.requester_id,fr.addressee_id)=least(auth.uid(),o.owner_id) and greatest(fr.requester_id,fr.addressee_id)=greatest(auth.uid(),o.owner_id))
  ), counted as (select v.*,count(*) over () available from visible v),
  kept as (select c.* from counted c order by c.planar desc,c.event_id limit max_features)
  select jsonb_build_object('type','FeatureCollection','contract','ownership.2026.3','activity',p_activity,
    'asOf',now(),'crew',own_crew,'zoom',p_zoom,
    'availableFeatures',coalesce(max(k.available),0),
    'truncated',coalesce(max(k.available),0)>count(k.event_id),
    'features',coalesce(jsonb_agg(jsonb_build_object('type','Feature','id',k.event_id,
      'geometry',ST_AsGeoJSON(case when tolerance is null then k.geometry
        else coalesce(ST_SimplifyPreserveTopology(k.geometry,tolerance),k.geometry) end)::jsonb,
      'properties',jsonb_build_object('id',k.event_id,
        'ownerId',case when k.owner_id=auth.uid() then k.owner_id else null end,
        'owner',public.territory_owner_identity_2026(k.owner_id,auth.uid()),
        'role',public.territory_role_2026(k.owner_id,auth.uid()),'activity',k.activity,
        -- Aires MÉTIER, jamais celles du trait simplifié (§5.5 règle 7).
        'areaM2',ST_Area(k.geometry::geography),
        'capturedAreaM2',ST_Area(k.captured::geography),
        'controlledSince',k.controlled_since,'ruleset','2026.1'))),'[]'::jsonb)) into result from kept k;
  return result;
end $$;
revoke all on function public.get_ownership_2026(text,float8,float8,float8,float8,float8) from public,anon;
grant execute on function public.get_ownership_2026(text,float8,float8,float8,float8,float8) to authenticated;
comment on function public.get_ownership_2026(text,float8,float8,float8,float8,float8) is
  'Carte partagée d''une discipline. p_zoom simplifie le TRAIT d''un pixel d''écran ; les surfaces restent celles de la géométrie métier. Au plus MAP_READ_RULES_2026.maxFeaturesPerViewport zones, les plus grandes d''abord ; truncated/availableFeatures disent la vérité sur ce qui manque.';

-- L'ancienne signature survit en enveloppe : aucun client déployé ne casse, et
-- tous gagnent la borne. Sans zoom, aucune simplification n'est appliquée.
create or replace function public.get_ownership_2026(p_activity text,p_west float8,p_south float8,p_east float8,p_north float8)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select public.get_ownership_2026(p_activity,p_west,p_south,p_east,p_north,null::float8);
$$;
revoke all on function public.get_ownership_2026(text,float8,float8,float8,float8) from public,anon;
grant execute on function public.get_ownership_2026(text,float8,float8,float8,float8) to authenticated;
