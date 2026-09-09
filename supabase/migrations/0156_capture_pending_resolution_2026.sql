-- 0156_capture_pending_resolution_2026.sql
-- GRYD — « EN ATTENTE » A UNE FIN, ET LA POSSESSION NE SE REJOUE PLUS EN ENTIER.
--
-- ═══ R2S-4 : LE PURGATOIRE ══════════════════════════════════════════════════
-- `publish_capture_events_2026` (0118:212) ne promeut que `scheduled`. Rien,
-- nulle part, ne faisait jamais sortir un `pending` : une sortie marquée
-- « origine ou horaire à confirmer » l'était POUR TOUJOURS, et l'app affichait
-- une attente qui n'attendait rien. C'est exactement le « repli inventé » que
-- la constitution interdit.
--
-- Deux portes de sortie, et seulement deux :
--   · RÉÉVALUATION — un renvoi de la sortie repasse par `stage_capture_2026`
--     (0155), qui réévalue l'admission sur la MÊME géométrie ;
--   · EXPIRATION — passé le délai de confirmation, la capture ne peut plus
--     changer la carte : elle devient un refus daté (`rejected`).
-- Le délai est celui du cahier §5.5, mesuré depuis la FERMETURE PHYSIQUE :
-- « Réception pour capture courante : dans les 24 h suivant la fermeture
-- physique — permettre le hors ligne et LIMITER LES RÉÉCRITURES TARDIVES. »
-- Une confirmation qui arrive après ce délai réécrirait la carte tardivement ;
-- on refuse, et on le dit.
--
-- LE MOTIF EST CONSERVÉ TEL QUEL à l'expiration. Le remplacer par « délai
-- dépassé » raconterait au joueur que son envoi était en retard alors que la
-- cause était, par exemple, une vérification jamais faite. C'est le STATUT qui
-- porte la finalité ; la raison continue de porter la cause.
-- (`capture_state_for_reason_2026` décrit l'état INITIAL d'un motif frais ;
-- l'expiration est une transition temporelle distincte, pas une contradiction.)
--
-- ═══ R2S-7b : LE REJEU COMPLET À CHAQUE MINUTE ══════════════════════════════
-- `rebuild_ownership_2026` EFFACE toute la possession d'une discipline et
-- rejoue l'intégralité de ses événements. Appelée à chaque tick de publication,
-- elle coûte O(total des captures) par minute — donc de plus en plus cher à
-- mesure que le jeu réussit, pour un résultat presque toujours identique.
--
-- Le corps par événement est EXTRAIT tel quel dans `apply_capture_event_2026` :
-- le rejeu canonique reste la référence, il appelle désormais cette fonction en
-- boucle et son résultat est inchangé. `publish_capture_events_2026` choisit :
--   · si TOUT le lot publié est strictement postérieur à ce qui est déjà
--     appliqué, l'état « avant » de chaque événement EST la possession
--     courante : appliquer en ordre donne le même résultat que rejouer ;
--   · sinon (envoi tardif qui s'intercale, retrait, ordre bousculé) → rejeu
--     complet. On ne devine pas : on ne prend le raccourci que là où il est
--     démontrablement équivalent.
--
-- ⚠️ CE QUE CE FICHIER NE PROUVE PAS ICI : PGlite n'a pas PostGIS. Le test
-- `supabase/tests/capture_pending_resolution_2026.pglite.test.mjs` prouve la
-- DÉCISION (quel chemin, quel état, quel motif) avec des espions à la place des
-- deux fonctions spatiales. L'ÉQUIVALENCE des deux chemins se prouve dans
-- `supabase/tests/refonte2026.postgis.test.mjs`, sur un vrai PostgreSQL.

-- ─── 1. La fin d'une attente ───────────────────────────────────────────────
create function public.resolve_pending_captures_2026(p_activity text,p_receipt_max_hours double precision)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare touched integer; affected uuid[];
begin
  if p_activity not in ('run','bike') then raise exception 'invalid_discipline'; end if;
  if p_receipt_max_hours is null then raise exception 'invalid_receipt_window'; end if;
  with expired as (
    update public.capture_events_2026 set status='rejected'
      where activity=p_activity and status='pending'
        and now()-closed_at > make_interval(secs=>greatest(p_receipt_max_hours,0)*3600)
      returning run_id)
  select count(*)::integer,coalesce(array_agg(distinct run_id),'{}'::uuid[]) into touched,affected from expired;
  -- SEULES les sorties dont un événement vient d'expirer sont relues. Une
  -- condition plus large (« toute sortie en attente sans événement en
  -- attente ») écraserait le statut d'une sortie que ce tour n'a pas touchée.
  update public.runs r set game_status_2026=public.run_capture_status_2026(r.id)
    where r.id=any(affected);
  return touched;
end $$;
revoke all on function public.resolve_pending_captures_2026(text,float8) from public,anon,authenticated;
grant execute on function public.resolve_pending_captures_2026(text,float8) to service_role;

-- ─── 2. UN événement appliqué à la possession ──────────────────────────────
-- Corps extrait de `rebuild_ownership_2026` (0118) sans changement de règle :
-- chaque mètre carré d'une sortie n'est décrit qu'une fois, même si un autre
-- joueur est passé entre ses faces, et un retrait reste une pierre tombale
-- neutralisante — jamais la résurrection d'un ancien propriétaire.
create function public.apply_capture_event_2026(p_event_id uuid)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare e public.capture_events_2026; mine geometry; all_owned geometry; empty_geom geometry; visited geometry; fresh geometry;
begin
  select * into strict e from public.capture_events_2026 where id=p_event_id;
  empty_geom:=ST_GeomFromText('MULTIPOLYGON EMPTY',4326);
  select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into visited
    from public.capture_events_2026 where run_id=e.run_id and status in ('published','withdrawn') and (closed_at,id)<(e.closed_at,e.id);
  fresh:=ST_Difference(e.geometry,visited);
  select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into mine
    from public.ownership_2026 where activity=e.activity and owner_id=e.owner_id and geometry && e.geometry;
  select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into all_owned
    from public.ownership_2026 where activity=e.activity and geometry && e.geometry;
  update public.capture_events_2026 set
    new_geometry=ST_Multi(ST_CollectionExtract(ST_Difference(fresh,mine),3)),
    neutral_geometry=ST_Multi(ST_CollectionExtract(ST_Difference(fresh,all_owned),3)),
    taken_geometry=ST_Multi(ST_CollectionExtract(ST_Difference(ST_Intersection(fresh,all_owned),mine),3)),
    already_owned_geometry=ST_Multi(ST_CollectionExtract(ST_Intersection(fresh,mine),3))
    where id=e.id;
  update public.ownership_2026 set geometry=ST_Multi(ST_CollectionExtract(ST_Difference(geometry,e.geometry),3))
    where activity=e.activity and geometry && e.geometry;
  delete from public.ownership_2026 where activity=e.activity and ST_IsEmpty(geometry);
  if e.status='published' then
    insert into public.ownership_2026(event_id,owner_id,activity,geometry,controlled_since)
      values(e.id,e.owner_id,e.activity,e.geometry,e.closed_at);
  end if;
end $$;
revoke all on function public.apply_capture_event_2026(uuid) from public,anon,authenticated;
grant execute on function public.apply_capture_event_2026(uuid) to service_role;

-- ─── 3. Le rejeu canonique reste la référence ──────────────────────────────
create or replace function public.rebuild_ownership_2026(p_activity text)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare e record;
begin
  if p_activity not in ('run','bike') then raise exception 'invalid_discipline'; end if;
  perform pg_advisory_xact_lock(hashtext('ownership_2026:'||p_activity));
  delete from public.ownership_2026 where activity=p_activity;
  for e in select id from public.capture_events_2026 where activity=p_activity
    and status in ('published','withdrawn') order by closed_at,id loop
    perform public.apply_capture_event_2026(e.id);
  end loop;
end $$;

-- ─── 4. La publication : résoudre, publier, appliquer au plus juste ────────
create or replace function public.publish_capture_events_2026()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
-- `due` et non `e` : la revérification de consentement ci-dessous utilise
-- l'alias SQL `e`, et plpgsql donnerait la priorité à sa variable de boucle.
declare discipline text; changed integer:=0; n integer;
  new_ids uuid[]; oldest timestamptz; watermark timestamptz; due record;
begin
  foreach discipline in array array['run','bike'] loop
    perform pg_advisory_xact_lock(hashtext('ownership_2026:'||discipline));
    -- LITTÉRAL MIROIR de TERRITORY_RULES_2026.captureReceiptMaxAgeHours
    -- (packages/shared/src/game-rules.ts). Cette fonction est appelée par
    -- pg_cron, sans argument : rien ne peut lui injecter la constante. La
    -- dérive est testée dans capture_pending_resolution_2026.pglite.test.mjs.
    perform public.resolve_pending_captures_2026(discipline,24);
    -- Le consentement peut changer pendant qu'un envoi est mis en scène. On le
    -- revérifie SOUS le verrou de publication, avant qu'une victime perde quoi
    -- que ce soit ou qu'une géométrie publique change.
    update public.capture_events_2026 e set status='private',reason='consent_withdrawn'
      where e.activity=discipline and e.status='scheduled' and not exists(
        select 1 from public.runs r join public.users u on u.id=r.user_id
          join public.user_profiles up on up.user_id=u.id
        where r.id=e.run_id and r.shared_map_consent_2026 and up.map_sharing<>'none' and u.deletion_requested_at is null);
    with promoted as (
      update public.capture_events_2026 set status='published'
        where activity=discipline and status='scheduled' and publish_after<=now()
      returning id,closed_at)
    select coalesce(array_agg(id),'{}'::uuid[]),min(closed_at) into new_ids,oldest from promoted;
    n:=coalesce(array_length(new_ids,1),0);
    if n>0 then
      select max(closed_at) into watermark from public.capture_events_2026
        where activity=discipline and status in('published','withdrawn') and not (id=any(new_ids));
      if watermark is null or oldest>watermark then
        for due in select id from public.capture_events_2026 where id=any(new_ids) order by closed_at,id loop
          perform public.apply_capture_event_2026(due.id);
        end loop;
      else
        perform public.rebuild_ownership_2026(discipline);
      end if;
      update public.runs r set game_status_2026=public.run_capture_status_2026(r.id)
        where exists(select 1 from public.capture_events_2026 x where x.id=any(new_ids) and x.run_id=r.id);
    end if;
    changed:=changed+n;
  end loop;
  return changed;
end $$;
