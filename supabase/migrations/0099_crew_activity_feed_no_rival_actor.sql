-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0099 — LE FIL D'UN CREW NE NOMME QUE LES GENS DE CE CREW                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ═══ LA DIVULGATION, NOMMÉE PRÉCISÉMENT (28/07/2026) ════════════════════════
-- `crew_activity_feed()` (0096 §5) émet `'actorPseudo', pp.pseudo` par un
-- `left join public.public_profiles pp on pp.id = e.actor_id` appliqué aux DEUX
-- types de faits rendus (0096:381, 388-389). Pour 'boundary_completed' c'est
-- juste : `ingest_run` l'écrit une seule fois, dans le crew de son auteur
-- (index.ts:2141-2145, `crew_id: ctx.crewId, actor_id: ctx.userId`).
--
-- Pour 'contested', ça ne l'est pas. `ingest_run` insère CE MÊME FAIT DANS LES
-- DEUX FLUX avec l'id de L'ATTAQUANT (index.ts:1915-1918) :
--     { crew_id: crewId,      actor_id: userId, event_type: 'contested', … },
--     { crew_id: ownerCrewId, actor_id: userId, event_type: 'contested', … }
-- `ownerCrewId` est le crew VICTIME. Son fil nommait donc un joueur du crew
-- RIVAL, accompagné de l'heure (tronquée) de sa sortie — c'est-à-dire QUI est
-- venu, et QUAND il court. Aucune préférence n'était consultée, alors que le
-- dépôt a tranché l'inverse partout ailleurs sur les surfaces inter-joueurs
-- (0087:85 `and up.map_sharing <> 'none'`, puis 0089).
--
-- L'en-tête de 0096 affirmait au passage que la ligne 'contested' est neutre —
-- « rien dedans ne dit de quel côté on est ». C'était vrai du `payload`, et faux
-- du `select` qui l'enveloppe : il y ajoutait un NOM. Ce fichier rend cette
-- phrase vraie au lieu de la laisser couvrir un fait qu'elle ne décrit pas.
--
-- ═══ LA RÈGLE POSÉE, PLUS LARGE QUE LE SEUL BOGUE ═══════════════════════════
-- Un nom rendu dans le fil DE MON CREW appartient à quelqu'un qui est, ou a
-- été, de MON CREW. Formulé ainsi plutôt qu'« on masque le pseudo quand le type
-- vaut contested » : le prochain `event_type` inséré pour deux crews (le CHECK
-- de 0011/0015 en autorise huit de plus) hériterait de la garde au lieu de
-- rouvrir le même trou. Une exception nommée par son symptôme ne protège que le
-- symptôme connu.
--
-- L'appartenance est lue SANS `left_at is null`, volontairement : quelqu'un qui
-- a fermé une boucle avec le crew puis l'a quitté reste l'auteur de ce fait pour
-- ses anciens coéquipiers. Le masquer réécrirait leur propre histoire ; ce n'est
-- pas une divulgation vers un tiers, c'est la mémoire d'une équipe.
--
-- Effet mesurable : 'boundary_completed' garde son auteur dans 100 % des cas
-- (son crew_id EST celui de l'acteur, par construction dans ingest_run) ;
-- 'contested' garde l'auteur dans le flux de l'ATTAQUANT (les coéquipiers voient
-- qui est parti au contact) et rend `null` dans celui de la VICTIME. Le client
-- n'affiche alors aucune ligne « par … » : `CrewActivityScreen` teste déjà
-- `c.actorPseudo !== null` (CrewActivityScreen.tsx:519). Le fait reste, la
-- personne disparaît — c'est exactement l'inverse de le supprimer.
--
-- ═══ ADDITIVE ═══════════════════════════════════════════════════════════════
-- Un seul `create or replace function`. Aucune table, colonne, contrainte,
-- index ni donnée touchée. Le reste du corps est recopié TEL QUEL de 0096 §5
-- (différé, troncature, liste blanche du payload, fenêtre, plafond, canPost) :
-- `create or replace` remplace un corps entier, et réécrire de mémoire ce qu'on
-- ne veut pas changer est la façon classique de perdre une garde en la
-- « remettant ».
--
-- ═══ CE QUE ÇA NE CORRIGE PAS ═══════════════════════════════════════════════
-- `ingest_run` continue d'écrire l'id de l'attaquant dans le flux de la victime.
-- La ligne reste donc en base, et un futur lecteur qui la relirait sans cette
-- garde ré-exposerait le nom. La bonne correction de fond est côté écriture
-- (n'inscrire dans le flux de la victime aucun acteur), elle touche une Edge
-- Function déployée et sort du périmètre de cette migration : elle est INSCRITE
-- EN SUSPENS, pas faite ici.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.crew_activity_feed()
returns jsonb language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_crew_id   uuid;
  v_role      text;
  v_announce  jsonb;
  v_conquests jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Adhésion ACTIVE unique (index crew_members_one_active_per_user, 0002) :
  -- un joueur ne lit jamais « un » crew, il lit LE SIEN.
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select coalesce(jsonb_agg(public.crew_announcement_row(a.id) order by a.created_at desc), '[]'::jsonb)
  into v_announce
  from public.crew_announcements a
  where a.crew_id = v_crew_id and a.removed_at is null;

  select coalesce(jsonb_agg(x.row order by x.created_at desc), '[]'::jsonb)
  into v_conquests
  from (
    select
      jsonb_build_object(
        'id',   e.id,
        'kind', e.event_type,
        -- LISTE BLANCHE (cf. 0096) : jamais `payload` en bloc.
        -- `name` n'existe que pour 'boundary_completed' (ingest_run:2145) ;
        -- pour 'contested', il vaut NULL et l'écran rend un fait sans nom.
        'name', case when e.event_type = 'boundary_completed'
                     then nullif(btrim(coalesce(e.payload->>'name', '')), '')
                     else null end,
        -- ══ LA GARDE (0099) ═══════════════════════════════════════════════
        -- Le pseudo ne sort QUE si l'acteur appartient (ou a appartenu) au crew
        -- qui lit. `ingest_run` insère 'contested' dans les deux flux avec l'id
        -- de l'ATTAQUANT : sans ce test, le fil de la victime nommait un rival
        -- et l'heure de sa sortie. `null` ⇒ l'écran n'affiche aucune ligne
        -- « par … » (CrewActivityScreen teste actorPseudo !== null).
        'actorPseudo', case
          when exists (
            select 1 from public.crew_members cm2
            where cm2.user_id = e.actor_id and cm2.crew_id = v_crew_id
          ) then pp.pseudo
          else null
        end,
        -- game-rules: PUBLIC_TIMESTAMP_TRUNC — jamais la minute exacte.
        'createdAt', date_trunc('hour', e.created_at)
      ) as row,
      e.created_at
    from public.crew_feed_events e
    left join public.public_profiles pp on pp.id = e.actor_id
    where e.crew_id = v_crew_id
      and e.event_type in ('boundary_completed', 'contested')
      -- game-rules: TERRITORY_PUBLISH_DELAY_MINUTES — publication DIFFÉRÉE.
      and e.created_at <= now() - make_interval(mins => public.crew_activity_publish_delay_min())
      -- game-rules: CREW_ACTIVITY_WINDOW_DAYS — fenêtre d'affichage.
      and e.created_at >= now() - make_interval(days => public.crew_activity_window_days())
    order by e.created_at desc
    -- game-rules: CREW_ACTIVITY_CONQUEST_MAX — plafond de LECTURE (aucun
    -- compte n'est affirmé à l'écran, donc tronquer la liste ne ment pas).
    limit public.crew_activity_conquest_max()
  ) x;

  return jsonb_build_object(
    'ok',               true,
    'role',             v_role,
    -- game-rules: CREW_PERMISSIONS.pinMessage — tranché SERVEUR, jamais dérivé
    -- par le client (qui afficherait sa propre idée de la matrice).
    'canPost',          v_role in ('co_captain', 'founder'),
    'announcements',    coalesce(v_announce, '[]'::jsonb),
    'conquests',        coalesce(v_conquests, '[]'::jsonb),
    'maxAnnouncements', public.crew_announcement_max_active(),
    'bodyMax',          public.crew_announcement_body_max()
  );
end;
$$;

comment on function public.crew_activity_feed() is
  'Fil E48 : annonces épinglées + faits du crew. Différé '
  'TERRITORY_PUBLISH_DELAY_MINUTES, horodatage tronqué PUBLIC_TIMESTAMP_TRUNC, '
  'payload jamais rendu en bloc. Depuis 0098/0099 : `actorPseudo` n''est rendu '
  'que si l''acteur appartient (ou a appartenu) au crew qui lit — ingest_run '
  'insère ''contested'' dans le flux de la VICTIME avec l''id de l''attaquant, '
  'et le fil d''un crew ne nomme jamais quelqu''un d''un autre crew.';

-- Grants : re-posés à l'identique de 0096 §8 pour que le fichier soit
-- autosuffisant s'il est rejoué sur une base neuve. `from public, anon` et pas
-- `from anon` seul — anon hérite de PUBLIC (piège attrapé en vrai sur 0083).
revoke all on function public.crew_activity_feed() from public, anon;
grant execute on function public.crew_activity_feed() to authenticated;
