-- 0161 — « Ta commune, cette semaine » : LA MESURE. ADR-013 §2.1, lot L.
-- ADDITIVE. Aucune écriture, aucune ligne créée : deux fonctions de lecture.
--
-- ═══ DEUX FONCTIONS, ET LA FRONTIÈRE ENTRE ELLES EST DÉLIBÉRÉE ═════════════
--   · `board_eligible_events_2026()` — QUI a le droit d'être compté. Aucune
--     géométrie : rien que les six exclusions d'ADR-013 §2.1. Elle est donc
--     exécutable — et EXÉCUTÉE — par les tests PGlite, qui n'ont pas PostGIS.
--   · `board_source_metrics_2026()` — COMBIEN de mètres carrés, dans quelle
--     portée. C'est la seule partie spatiale, et elle n'invente aucune règle :
--     elle se contente d'intersecter ce que la première a autorisé.
-- Cette coupure n'est pas cosmétique : sans elle, AUCUNE des règles d'exclusion
-- ne serait rejouable sur ce poste (pas de Docker, pas de PostGIS local), et
-- « le discret n'apparaît pas » resterait une phrase de docblock.
--
-- ═══ L'ATTRIBUTION GÉOGRAPHIQUE, ET POURQUOI ELLE EST SPATIALE ═════════════
-- Rien, dans la base, ne dit dans quelle commune un événement de capture s'est
-- produit : `capture_events_2026` (0118) n'a pas de `city_id`, et `runs` n'en a
-- pas non plus (vérifié en production le 09/09/2026 — la colonne lue par
-- `ingest_run` n'existe plus dans ce schéma). Il n'y a donc pas de raccourci
-- honnête : la commune d'un mètre carré est la commune QUI LE CONTIENT.
--
-- On mesure donc l'AIRE DE L'INTERSECTION entre la géométrie publiée et le
-- contour de chaque commune de la portée. Trois conséquences, toutes voulues :
--   1. une boucle à cheval sur deux communes compte dans les deux, chacune pour
--      sa part — jamais deux fois en entier ;
--   2. le total d'un département est exactement la somme de ses communes : les
--      trois portées ne peuvent pas se contredire, parce qu'elles lisent la
--      MÊME intersection ;
--   3. un mètre carré situé hors de toute commune OUVERTE n'est compté nulle
--      part. C'est assumé : le référentiel ne connaît pas encore ce sol, et
--      l'inventer serait pire que de ne pas le compter.
--
-- ═══ LE DÉLAI DE PUBLICATION EST LA PREMIÈRE RÈGLE, PAS LA DERNIÈRE ════════
-- Seuls les événements `status = 'published'` entrent. Recette n° 36 du cahier,
-- nommément : « Pas de fuite indirecte via compteurs, perte de terrain ou
-- classement. » Un rang qui bougerait avant que le polygone n'apparaisse
-- trahirait une sortie encore privée.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. QUI A LE DROIT D'ÊTRE COMPTÉ — LES SIX EXCLUSIONS, EN UN SEUL ENDROIT
-- ════════════════════════════════════════════════════════════════════════════
-- L'ordre des conditions suit ADR-013 §2.1, garde-fous 4, 5 et 6 :
--   · publié (4) — jamais un `pending`, jamais un `private`, jamais un `withdrawn` ;
--   · consentement de la sortie (5) — `runs.shared_map_consent_2026` est la
--     source de vérité : c'est elle que `publish_capture_events_2026` relit
--     sous verrou avant de publier quoi que ce soit (0118). Elle est relue ICI
--     aussi, parce qu'un consentement RETIRÉ après publication doit sortir la
--     personne du classement sans attendre une republication ;
--   · carte partagée (5) — `user_profiles.map_sharing <> 'none'`, la même
--     condition que `get_ownership_2026` : ce qui n'est pas sur la carte n'est
--     pas dans le classement ;
--   · discrétion (5) — `discreet_mode` exclut la personne entièrement. Le
--     `coalesce(..., true)` reprend la lecture fail-closed de 0126 : un profil
--     dont le drapeau serait nul est traité comme discret ;
--   · compte vivant (5) — une suppression demandée retire du classement, comme
--     de la carte ;
--   · rang ≠ journal (6) — §18.4 sépare « conserver l'activité », « autoriser
--     le jeu libre » et « AUTORISER UN RANG ». Une sortie repassée en `pending`
--     par une revue anti-triche garde ses polygones sur la carte et perd son
--     rang, sans qu'on ait à toucher aux événements.
create or replace function public.board_eligible_events_2026(
  p_activity text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (event_id uuid, owner_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.owner_id
  from public.capture_events_2026 e
  join public.runs r on r.id = e.run_id
  join public.users u on u.id = e.owner_id
  join public.user_profiles up on up.user_id = e.owner_id
  where e.activity = p_activity
    and e.status = 'published'
    and e.new_geometry is not null
    -- La fenêtre porte sur l'instant où la boucle a été FERMÉE, pas sur celui
    -- de la publication : « le terrain que j'ai pris cette semaine » est un
    -- fait de terrain, pas un fait de serveur. Bornes half-open (0160).
    and e.closed_at >= p_from
    and e.closed_at < p_to
    and r.shared_map_consent_2026
    and r.game_status_2026 is distinct from 'pending'
    and up.map_sharing <> 'none'
    and not coalesce(up.discreet_mode, true)
    and u.deletion_requested_at is null
$$;

comment on function public.board_eligible_events_2026(text, timestamptz, timestamptz) is
  'Les événements de capture AUTORISÉS À CLASSER sur une fenêtre : publiés, consentis, carte partagée, propriétaire non discret et vivant, sortie non en revue. Aucune géométrie — c''est la partie rejouable sans PostGIS, donc la partie où les exclusions d''ADR-013 §2.1 sont réellement prouvées.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. COMBIEN — LA MESURE, PAR PROPRIÉTAIRE ET PAR PORTÉE
-- ════════════════════════════════════════════════════════════════════════════
-- `language plpgsql` et non `sql` : le corps n'est pas planifié à la création,
-- ce qui permet à cette migration de S'APPLIQUER sur un PostgreSQL sans PostGIS
-- (les tests PGlite du dépôt) tout en refusant de S'EXÉCUTER. Un vert de test
-- ne peut donc jamais laisser croire que l'aire a été calculée.
--
-- ═══ LE FLUX CLASSE, LE STOCK ACCOMPAGNE ═══════════════════════════════════
-- `new_terrain_m2` (la surface prise dans la fenêtre) est la mesure qui classe.
-- `held_area_m2` (la surface tenue MAINTENANT) voyage avec elle pour être
-- affichée comme un ÉTAT — ADR-013 §2.1 : « affiché comme état, pas comme
-- rang ». Elle n'entre dans aucun tri, pas même en départage.
--
-- ⚠️ SEULS LES SUJETS AYANT PRIS DU TERRAIN SONT RENDUS. Quelqu'un qui tient du
-- terrain sans rien avoir pris cette semaine n'est PAS un sujet classé : sa
-- ligne vaudrait zéro, et un « 0 » nu dans un classement est exactement ce que
-- CLAUDE.md interdit. Il compte pour la carte, pour son journal et pour « où
-- j'en suis » — pas pour le rang.
--
-- ⚠️ CETTE FONCTION NE DÉCLENCHE JAMAIS `rebuild_ownership_2026`. Elle LIT
-- `ownership_2026` telle que la publication l'a laissée. Le rebuild efface et
-- rejoue toute une discipline (son propre commentaire : « Production throughput
-- requires spatial-component replay before a large rollout ») ; l'appeler
-- depuis une mesure de classement ferait d'un tableau de bord un risque de
-- production. ADR-013 §4 le pose en interdit.
create or replace function public.board_source_metrics_2026(
  p_activity text,
  p_scope text,
  p_scope_ref text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (subject_id uuid, new_terrain_m2 double precision, held_area_m2 double precision)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    raise exception 'invalid_activity';
  end if;
  if p_scope is null or not (public.leaderboard_rules_2026() -> 'scopes' ? p_scope) then
    raise exception 'invalid_scope';
  end if;
  if p_scope_ref is null or p_from is null or p_to is null or p_to <= p_from then
    raise exception 'invalid_window';
  end if;

  return query
  with scope as (
    select c.city_id, ST_SetSRID(ST_GeomFromGeoJSON(z.geojson), 4326) as geom
    from public.board_scope_communes_2026(p_scope, p_scope_ref) c
    join public.city_zones z on z.city_id = c.city_id
  ),
  taken as (
    select
      el.owner_id,
      sum(ST_Area(ST_Intersection(e.new_geometry, s.geom)::geography)) as m2
    from public.board_eligible_events_2026(p_activity, p_from, p_to) el
    join public.capture_events_2026 e on e.id = el.event_id
    join scope s on e.new_geometry && s.geom
    group by el.owner_id
  ),
  held as (
    -- L'état, mesuré avec EXACTEMENT les mêmes exclusions que le flux : sinon
    -- une personne exclue du rang réapparaîtrait par sa surface tenue.
    select
      o.owner_id,
      sum(ST_Area(ST_Intersection(o.geometry, s.geom)::geography)) as m2
    from public.ownership_2026 o
    join public.capture_events_2026 e on e.id = o.event_id
    join public.runs r on r.id = e.run_id
    join public.users u on u.id = o.owner_id
    join public.user_profiles up on up.user_id = o.owner_id
    join scope s on o.geometry && s.geom
    where o.activity = p_activity
      and e.status = 'published'
      and r.shared_map_consent_2026
      and up.map_sharing <> 'none'
      and not coalesce(up.discreet_mode, true)
      and u.deletion_requested_at is null
    group by o.owner_id
  )
  select t.owner_id, t.m2, coalesce(h.m2, 0)
  from taken t
  left join held h on h.owner_id = t.owner_id
  where t.m2 > 0;
end $$;

comment on function public.board_source_metrics_2026(text, text, text, timestamptz, timestamptz) is
  'Mesure d''ADR-013 §2.1 : terrain NOUVEAU pris dans la fenêtre (la mesure qui classe) et terrain TENU (l''état, jamais un rang), par propriétaire, pour une portée. L''attribution est spatiale — aucun événement ne porte sa commune. Ne déclenche JAMAIS rebuild_ownership_2026.';

revoke all on function public.board_eligible_events_2026(text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.board_eligible_events_2026(text, timestamptz, timestamptz) to service_role;

revoke all on function public.board_source_metrics_2026(text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.board_source_metrics_2026(text, text, text, timestamptz, timestamptz) to service_role;
