-- 0044_crew_overview.sql
-- GRYD — « je vois ce que mon crew contrôle » + « ma contribution est visible ».
--
-- Maillons 2 et 4 de la boucle AMENDEMENT-43 §0. L'écran crew natif
-- (apps/mobile/src/features/crew/RealCrewScreen.tsx) n'affiche aujourd'hui que
-- nom / X-sur-50 / liste de pseudos / partager le code / quitter : le joueur ne
-- voit NI le territoire du crew, NI ce que lui-même y a apporté. Deux maillons
-- morts sur cinq. Cette RPC est la source de données qui les rallume.
--
-- ═══ POURQUOI ON N'UTILISE PAS public.crew_leaderboard ════════════════════════
-- C'est le point le plus important de ce fichier pour le prochain lecteur.
--
-- La vue matérialisée public.crew_leaderboard (0002:297) calcule EXACTEMENT ce
-- dont on a besoin (hexes détenus par crew, membres actifs, hors decay). La
-- réutiliser serait le réflexe naturel. C'est un piège.
--
-- Son commentaire annonce « rafraîchie par job ». CE JOB N'EXISTE PAS. Recherche
-- exhaustive du repo au 20/07/2026 : `crew_leaderboard` n'apparaît que 6 fois —
-- create materialized view + 2 create index (0002), 1 revoke + 1 grant (0003),
-- et le commentaire mensonger. AUCUN `refresh materialized view` nulle part :
-- ni migration, ni Edge Function, ni cron (0038/0039 planifient decay_job,
-- recompute_sectors et consorts — jamais celui-ci).
--
-- Conséquence : la vue est FIGÉE sur l'instantané de sa création, c'est-à-dire
-- sur une base vide. Elle renverra « 0 zone » à vie. Brancher l'écran crew
-- dessus, ce serait remplacer un écran incomplet par un écran qui MENT — pile
-- ce que la doctrine zéro-mensonge interdit. On lit donc les tables de BASE
-- (hex_claims + crew_members), toujours fraîches, au prix d'un agrégat à la
-- volée que le volume MVP rend négligeable.
--
-- (À l'inverse public.sector_control, elle, EST rafraîchie — decay_job +
--  recompute_sectors + crons 0038/0039 — et reste lisible en confiance.)
--
-- La vue n'est PAS supprimée ici : un chantier V1 pourra la réactiver en lui
-- adjoignant enfin un cron. On se contente de la marquer (§3 ci-dessous) pour
-- que personne ne retombe dans le piège entre-temps.
--
-- ═══ CHOIX ASSUMÉS ═══════════════════════════════════════════════════════════
--
-- 1. AUCUNE AIRE N'EST RENVOYÉE (pas de clé `areaM2`). Aucune colonne d'aire
--    n'existe en base : ni sur hex_claims, ni sur sectors, ni sur city_zones ;
--    aucune constante d'aire n'existe non plus dans game-rules.ts (grep
--    AREA_M2 / HEX_AREA : zéro occurrence). La seule façon d'afficher des m²
--    serait de multiplier le compte par une aire H3 res-10 « moyenne » — un
--    nombre fabriqué, variable de 20 % selon la latitude, présenté au joueur
--    comme une mesure. C'est un mensonge d'écran : on s'en abstient. La clé est
--    ABSENTE (et non `null`) pour qu'aucun client ne puisse la coalescer en 0 et
--    afficher « 0 m² ». Le jour où une aire réelle est stockée par hex, on
--    ajoute la clé ici — additif, aucun client cassé.
--
-- 2. RANG DE VILLE CALCULÉ À LA VOLÉE. Au MVP (Saison 0 : Paris + Lille,
--    quelques dizaines de crews) classer tous les crews d'une ville à chaque
--    ouverture d'écran coûte un scan trivial, servi par hex_claims_owner_idx.
--    La réponse À L'ÉCHELLE est une vue matérialisée rafraîchie par cron —
--    c'est-à-dire crew_leaderboard RÉPARÉE, pas réécrite. Quand le volume le
--    justifiera : ajouter le cron de refresh, puis basculer CETTE fonction sur
--    la vue. Le contrat de retour ne bouge pas.
--    Ex aequo : `rank()` (et non `dense_rank()`) — deux crews à égalité sont
--    tous deux 2es et le suivant est 4e. On n'invente pas de départage.
--
-- 3. TERRITOIRE NON FILTRÉ PAR VILLE. crew_leaderboard ne comptait que les
--    hexes dont le city_id = celui du crew. Depuis AMENDEMENT-35 l'Europe
--    entière est capturable et hex_claims.city_id est NULLABLE (0002:129) : un
--    hex pris hors zone dense n'a pas de ville. Filtrer effacerait du territoire
--    RÉELLEMENT tenu. On compte donc tout ce que les membres actifs détiennent,
--    où que ce soit. Seul le RANG est, lui, cadré par la ville du crew.
--
-- 4. LE CODE DU CREW N'EST JAMAIS RETOURNÉ (0036 : colonne secrète, révoquée
--    aux clients). L'invitation passe par my_crew_code() (0042) et par elle
--    seule. Cette fonction est SECURITY DEFINER et lit donc `crews` sans
--    restriction de colonne : ne jamais ajouter `code` au jsonb ci-dessous.

-- ═══ 1. crew_overview() ══════════════════════════════════════════════════════
create or replace function public.crew_overview() returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid           uuid := auth.uid();
  v_crew          public.crews%rowtype;
  v_role          text;
  v_hexes_held    integer;
  v_last_capture  timestamptz;
  v_city_rank     integer;
  v_crews_in_city integer;
  v_members       jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Adhésion ACTIVE unique (index partiel crew_members_one_active_per_user,
  -- 0002:62) → un seul crew possible, pas d'ambiguïté à arbitrer.
  -- (deux SELECT plutôt qu'un : plpgsql interdit un %rowtype dans un INTO
  --  multi-cibles. Même ligne source, l'index partiel garantit l'unicité.)
  select c.* into v_crew
  from public.crew_members cm
  join public.crews c on c.id = cm.crew_id
  where cm.user_id = v_uid and cm.left_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select cm.role into v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.crew_id = v_crew.id and cm.left_at is null;

  -- ─── Membres + contributions ───────────────────────────────────────────────
  -- Prédicat de détention repris de crew_leaderboard : membre ACTIF
  -- (left_at is null) et hex NON EXPIRÉ (decay_at is null → protégé compte
  -- neuf, ou decay_at dans le futur). La différence est qu'ici il est évalué
  -- MAINTENANT, pas au dernier refresh d'une vue qui n'en a jamais eu.
  --
  -- LEFT JOIN volontaire : un membre qui n'a rien capturé doit apparaître avec
  -- 0, pas disparaître de la liste — « ma contribution est visible » vaut aussi
  -- quand elle est nulle, sinon le nouveau ne se voit nulle part.
  --
  -- owner_user_id est nullable depuis 0006:57 ; la jointure l'écarte d'office.
  with active as (
    select cm.user_id, cm.role
    from public.crew_members cm
    where cm.crew_id = v_crew.id and cm.left_at is null
  ),
  held as (
    select
      a.user_id,
      a.role,
      count(hc.h3index)::integer as hexes_held,   -- count(col) ignore les NULL du LEFT JOIN
      max(hc.claimed_at)         as last_capture
    from active a
    left join public.hex_claims hc
      on hc.owner_user_id = a.user_id
     and (hc.decay_at is null or hc.decay_at > now())
    group by a.user_id, a.role
  ),
  totals as (
    select coalesce(sum(h.hexes_held), 0)::integer as total,
           max(h.last_capture)                     as last_capture
    from held h
  )
  select
    t.total,
    t.last_capture,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'userId',          h.user_id,
          'pseudo',          u.pseudo,
          'role',            h.role,
          'hexesHeld',       h.hexes_held,
          -- Part entière du membre. Deux gardes :
          --  · nullif(t.total, 0) → crew sans aucune capture ⇒ NULL ⇒ coalesce 0.
          --    Jamais de division par zéro, jamais de NaN à l'écran.
          --  · floor (et non round) → on n'arrondit JAMAIS vers le haut : la
          --    somme des parts ne dépasse donc jamais 100 (elle peut valoir 99
          --    sur des tiers — sous-estimer est honnête, sur-estimer ment).
          --    hexesHeld reste le chiffre exact et non arrondi à côté.
          'contributionPct',
            coalesce(floor(h.hexes_held * 100.0 / nullif(t.total, 0)), 0)::integer
        )
        order by h.hexes_held desc, u.pseudo asc
      ),
      '[]'::jsonb
    )
  into v_hexes_held, v_last_capture, v_members
  from held h
  join public.users u on u.id = h.user_id
  cross join totals t
  group by t.total, t.last_capture;

  -- Crew existant mais sans aucune adhésion active lisible : on ne fabrique rien.
  v_hexes_held := coalesce(v_hexes_held, 0);
  v_members    := coalesce(v_members, '[]'::jsonb);

  -- ─── Rang dans la ville (frais, cf. choix n°2) ─────────────────────────────
  select t.rk, t.n_crews
    into v_city_rank, v_crews_in_city
  from (
    select
      c2.id,
      rank()  over (order by coalesce(h.n, 0) desc) as rk,
      count(*) over ()                              as n_crews
    from public.crews c2
    left join (
      select cm.crew_id, count(hc.h3index)::integer as n
      from public.crew_members cm
      join public.hex_claims hc
        on hc.owner_user_id = cm.user_id
       and (hc.decay_at is null or hc.decay_at > now())
      where cm.left_at is null
      group by cm.crew_id
    ) h on h.crew_id = c2.id
    where c2.city_id = v_crew.city_id
  ) t
  where t.id = v_crew.id;

  return jsonb_build_object(
    'ok', true,
    -- `code` ABSENT volontairement (0036). Ne pas l'ajouter : cf. choix n°4.
    'crew', jsonb_build_object(
      'id',      v_crew.id,
      'name',    v_crew.name,
      'color',   v_crew.color,
      'city_id', v_crew.city_id
    ),
    'role', v_role,
    'territory', jsonb_build_object(
      -- Pas de clé `areaM2` : aucune aire réelle en base (choix n°1).
      'hexesHeld',     v_hexes_held,
      'lastCaptureAt', v_last_capture,   -- null si le crew n'a jamais rien pris
      'cityRank',      v_city_rank,
      'crewsInCity',   v_crews_in_city
    ),
    'members', v_members
  );
end;
$$;

-- ═══ 2. Grants ═══════════════════════════════════════════════════════════════
-- Lecture strictement personnelle (auth.uid()) : rien à offrir à anon.
-- `from public, anon` et PAS `from anon` seul : Postgres accorde d'office
-- EXECUTE à PUBLIC à la création de toute fonction, et anon est membre de
-- PUBLIC — révoquer sur anon seul laisse donc le droit hérité intact
-- (has_function_privilege('anon', …) restait TRUE). C'est le patron déjà
-- appliqué partout ailleurs (0042:277-280, 0006:99, 0010:184) ; cette migration
-- l'avait oublié. Impact nul aujourd'hui (auth.uid() null → signed_out), mais
-- une fonction SECURITY DEFINER appelable sans authentification est une surface
-- ouverte au premier assouplissement du garde.
revoke all on function public.crew_overview() from public, anon;
grant execute on function public.crew_overview() to authenticated;

-- ═══ 3. Marquage de la vue morte ═════════════════════════════════════════════
-- On ne la supprime pas (un chantier V1 peut lui donner le cron qui lui manque),
-- mais elle ne doit plus tromper personne : le commentaire vit désormais DANS la
-- base, visible en \d+ et dans tout introspecteur.
comment on materialized view public.crew_leaderboard is
  'NE PAS LIRE EN L''ÉTAT (constat 0044, 20/07/2026) : cette vue matérialisée '
  'n''est rafraîchie par AUCUN job du repo — aucun `refresh materialized view` '
  'n''existe en migration, Edge Function ou cron (0038/0039). Elle est donc '
  'figée depuis sa création (0002) et renvoie des compteurs à zéro. Toute '
  'lecture affiche un mensonge. Pour le territoire d''un crew, utiliser '
  'public.crew_overview() (0044), qui agrège hex_claims + crew_members à la '
  'volée. Pour réhabiliter cette vue : planifier `refresh materialized view '
  'concurrently public.crew_leaderboard` dans pg_cron (voir 0038/0039 pour le '
  'patron), puis retirer ce commentaire.';
