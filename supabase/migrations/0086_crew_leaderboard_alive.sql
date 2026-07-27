-- 0086_crew_leaderboard_alive.sql
-- (numérotée 0086 et non 0085 : un chantier voisin — E49, sortie de crew — a
--  déposé `0085_crew_outing_create.sql` dans la même vague. Deux fichiers au
--  même numéro rendent l'ordre d'application ambigu pour un lecteur, même quand
--  ils sont indépendants ; on décale plutôt que de laisser le doute.)
-- GRYD — E54 « Classement crews » (spec l.1831) + la source serveur de E50
-- « Statistiques du crew » (spec l.1738).
--
-- ═══ LE CONSTAT QUI OUVRE CE FICHIER ════════════════════════════════════════
-- `public.crew_leaderboard` existe depuis 0002 et n'a JAMAIS été rafraîchie.
-- L'appel qui devait le faire n'a jamais existé ailleurs que DANS UN
-- COMMENTAIRE :
--     0002_schema.sql:296
--     « Matérialisée : rafraîchie par job (refresh materialized view
--       concurrently public.crew_leaderboard). »
-- 0044 (20/07/2026) a fait le tour du dépôt, constaté l'absence totale de job,
-- qualifié ce commentaire de mensonge, et posé sur la vue un
-- `comment on materialized view` qui dit « NE PAS LIRE EN L'ÉTAT ». 0049:42,
-- 0079:62, 0083:366, `apps/mobile/src/features/crew/real.ts:65` et
-- `apps/mobile/app/(tabs)/classement.tsx:95` répètent depuis la même consigne.
--
-- IL N'Y A DONC AUCUNE RAISON DE FOND À NE PAS RAFRAÎCHIR — et c'est ce qu'il
-- fallait établir avant de toucher quoi que ce soit. 0044 ne dit pas « cette
-- vue est dangereuse », il dit l'inverse, noir sur blanc :
--     « Pour réhabiliter cette vue : planifier `refresh materialized view
--       concurrently public.crew_leaderboard` dans pg_cron (voir 0038/0039 pour
--       le patron), puis retirer ce commentaire. »
-- Ce fichier fait EXACTEMENT cela, plus la seule chose que 0044 ne pouvait pas
-- prévoir : de quoi PROUVER qu'un rafraîchissement a eu lieu (§1).
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT PAS ════════════════
-- FAIT   : (1) `matview_refresh_state` — la DATE du dernier rafraîchissement,
--              lisible par le client, sans quoi une vue matérialisée vide est
--              indiscernable d'une vue jamais calculée ;
--          (2) `crew_leaderboard` REDÉFINIE : elle porte désormais l'effectif
--              actif et LA SURFACE RÉELLE en m² (dérivée de `territories`,
--              jamais d'un compte de cellules) — les trois colonnes que E54
--              demande (« crews ; membres ; surface ») ;
--          (3) `refresh_crew_leaderboard()` — le rafraîchissement, IDEMPOTENT,
--              qui horodate son passage ;
--          (4) `crew_board()` — la lecture cliente du classement, bornée à LA
--              VILLE du joueur, qui REFUSE de servir une vue jamais rafraîchie ;
--          (5) `crew_stats()` — les trois mesures que E50 réclame et que
--              `crew_overview()` (0044) ne rend pas : défenses réussies,
--              distance collective, série hebdomadaire.
-- NE FAIT PAS : aucune planification pg_cron n'est posée ici. L'appelant est
--          `supabase/functions/recompute_sectors/index.ts`, déjà planifié toutes
--          les 15 minutes par 0038 et déjà porteur du même geste pour
--          `sector_control`. Ajouter un second ordonnanceur pour la même famille
--          d'agrégats aurait créé deux propriétaires du même rafraîchissement.
--          ⚠ CONSÉQUENCE DIRECTE, dite plutôt que laissée croire : tant que
--          `recompute_sectors` n'est pas REDÉPLOYÉ, cette migration seule ne
--          rafraîchit rien — et `crew_board()` répondra `never_refreshed`, ce
--          qui est la vérité.
--
-- ═══ LA BASE EST VIDE, ET LE CLASSEMENT RESTERA VIDE ═══════════════════════
-- Aucun crew réel n'existe au 27/07/2026. Après ce fichier, `crew_board()`
-- renverra une liste VIDE — et c'est le comportement juste. Rien ici ne fabrique
-- un crew, un rang, une ville ou un rival ; aucune ligne de seed, aucun
-- `coalesce` qui inventerait un classement là où il n'y a personne. Les trois
-- états que le client doit distinguer sont RENDUS DISTINCTS par le contrat de
-- retour, et c'est le seul point de design qui compte dans ce fichier :
--   · `{ok:false, reason:'never_refreshed'}` → GRYD n'a pas encore calculé ce
--     classement. Un fait sur GRYD ;
--   · `{ok:true, rows:[]}`                  → le calcul a eu lieu, personne ne
--     tient de terrain ici. Un fait sur le MONDE ;
--   · un échec réseau                       → ni l'un ni l'autre, et c'est le
--     client qui le sait.
-- Les confondre transformerait une limite technique en jugement sur les joueurs.
--
-- ═══ AUCUN NOMBRE MAGIQUE ══════════════════════════════════════════════════
-- Aucun seuil de jeu n'est écrit ici. Les deux bornes d'affichage
-- (`LEADERBOARD_ROWS_LIMIT`, `CREW_STATS_TREND_WEEKS`) arrivent en PARAMÈTRE
-- depuis `packages/shared/src/game-rules.ts` ; les fonctions se contentent de
-- refuser les valeurs absurdes. Aucune cadence de rafraîchissement n'est
-- enterrée dans le schéma non plus — elle vit dans 0038, avec les autres.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. « QUAND CETTE VUE A-T-ELLE ÉTÉ CALCULÉE ? » — LA QUESTION QUI MANQUAIT
-- ════════════════════════════════════════════════════════════════════════════
-- C'est LE défaut structurel qui a rendu possibles quatre ans de commentaire
-- mensonger : une vue matérialisée ne porte AUCUNE trace de son dernier refresh.
-- `pg_matviews.ispopulated` dit seulement qu'elle a été peuplée UNE FOIS — à sa
-- création, donc toujours `true`, y compris pour la vue morte de 0002. Rien, en
-- base, ne distinguait « calculée il y a 3 minutes sur une base vide » de
-- « jamais recalculée depuis 2026 ». Les deux rendent zéro ligne.
--
-- Sans cette table, brancher un écran sur la matview reviendrait à rejouer
-- exactement la faute de 0002 : afficher un vide dont on ne sait pas s'il décrit
-- le monde ou l'inertie d'un job absent. AVEC elle, `crew_board()` peut REFUSER
-- de servir un classement jamais calculé (§4) — c'est-à-dire dire la vérité.
--
-- GÉNÉRIQUE et non `crew_leaderboard_refreshed_at` : `sector_control` a
-- exactement le même trou (rafraîchie par decay_job et recompute_sectors, sans
-- que rien ne date le passage). Une seule table pour la même question, plutôt
-- qu'une colonne par vue qui divergerait au premier ajout.
create table public.matview_refresh_state (
  -- Nom qualifié de la vue matérialisée (`public.crew_leaderboard`). `text` et
  -- non `regclass` : une vue supprimée puis recréée changerait d'OID et perdrait
  -- son historique de fraîcheur ; le nom, lui, survit.
  view_name text primary key,

  -- L'INSTANT DU DERNIER RAFRAÎCHISSEMENT RÉUSSI. `not null` sans défaut :
  -- l'écrivain doit décider — une ligne présente signifie « calculée », et
  -- l'absence de ligne signifie « jamais ». Ces deux états sont le tout de cette
  -- table ; un défaut `now()` les aurait fondus.
  refreshed_at timestamptz not null,

  -- Combien de lignes le calcul a produit. Ce n'est PAS de la décoration : il
  -- rend le vide LISIBLE côté exploitation — « rafraîchie il y a 4 min, 0 ligne »
  -- est un diagnostic, « 0 ligne » tout court est une énigme.
  row_count integer not null
    constraint matview_refresh_state_row_count_positive check (row_count >= 0)
);

comment on table public.matview_refresh_state is
  'DATE du dernier rafraîchissement d''une vue matérialisée. Elle existe parce que Postgres ne la donne pas : `pg_matviews.ispopulated` reste `true` dès la création, donc une matview jamais recalculée est indiscernable d''une matview à jour sur une base vide — c''est exactement ce qui a permis au commentaire mensonger de 0002:296 de survivre jusqu''à 0044. ABSENCE DE LIGNE = jamais calculée : `crew_board()` refuse alors de servir, plutôt que de faire passer l''inertie d''un job pour un constat sur les joueurs.';

alter table public.matview_refresh_state enable row level security;

-- Lisible par les clients : c'est ce qui leur permet de DATER un classement
-- (« arrêté à 14 h 05 ») au lieu de le présenter comme instantané. Aucune
-- policy d'écriture — seul le service_role écrit, et il contourne la RLS par
-- nature (patron de 0003 et 0082 §5b).
revoke all on public.matview_refresh_state from anon, authenticated;
grant select on public.matview_refresh_state to authenticated;

create policy matview_refresh_state_select_all on public.matview_refresh_state
  for select to authenticated
  using (true);

comment on policy matview_refresh_state_select_all on public.matview_refresh_state is
  'La fraîcheur d''un agrégat public est publique : elle ne contient ni identité, ni position, ni score. La cacher empêcherait seulement l''app de dater honnêtement ce qu''elle affiche.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. `crew_leaderboard` REDÉFINIE — ELLE PORTE ENFIN CE QUE E54 DEMANDE
-- ════════════════════════════════════════════════════════════════════════════
-- Spec E54 : « Même structure [que E53], avec : crews ; membres ; surface ;
-- progression ». La vue de 0070 rendait `hexes_held` et `points_total` : ni
-- l'effectif, ni la surface. On l'ÉTEND — on ne la remplace pas par une seconde
-- vue, ce qui aurait créé deux définitions du territoire d'un crew.
--
-- ⚠️ LA SURFACE VIENT DE `territories`, JAMAIS D'UN COMPTE DE CELLULES.
-- Constitution §6 : « aucun hexagone, le territoire est POLYGONAL ». Multiplier
-- `hexes_held` par une aire H3 « moyenne » aurait produit un m² FABRIQUÉ (faux
-- de ~20 % selon la latitude) présenté comme une mesure — la faute que 0044
-- refusait déjà (« choix n°1 : aucune aire n'est renvoyée »). Ce refus était
-- juste EN 0044, où aucune aire n'existait en base. Depuis 0074/0076,
-- `territories.area_m2` porte l'aire géodésique du polygone réellement bouclé,
-- produite par le moteur pur : la clé peut donc naître, et elle naît MESURÉE.
-- Le filtre d'états est `territory_state_is_controlled()` (0082 §1) — la
-- définition UNIQUE de « surface contrôlée validée », pas une seconde liste.
--
-- `hexes_held` et `points_total` RESTENT. La propriété opérationnelle est
-- toujours hexagonale (0079), les points sont toujours ceux de `season_scores` :
-- les retirer casserait des lectures vivantes pour une bascule qui n'est pas
-- celle de ce fichier. Les deux représentations coexistent, comme partout
-- ailleurs depuis le lot 1.
--
-- LA DISCIPLINE RESTE DANS LA CLÉ (0070 : une ligne par (crew, activité), jamais
-- une somme — §1.2). Le `cross join` sur les deux disciplines est CONSERVÉ : un
-- crew existe dans les deux mondes même s'il ne tient rien dans l'un des deux,
-- et l'absence de ligne rendrait « pas de donnée » indiscernable de « zéro ».
drop materialized view if exists public.crew_leaderboard;
create materialized view public.crew_leaderboard as
with activities as (
  select unnest(array['run', 'bike']) as activity -- game-rules: ACTIVITIES
),
active_members as (
  select cm.crew_id, cm.user_id
  from public.crew_members cm
  join public.users u on u.id = cm.user_id
  where cm.left_at is null
    and u.deletion_requested_at is null
),
members as (
  select am.crew_id, count(distinct am.user_id)::integer as members_active
  from active_members am
  group by am.crew_id
),
hexes as (
  select am.crew_id, hc.city_id, hc.activity, count(*)::integer as hexes_held
  from active_members am
  join public.hex_claims hc on hc.owner_user_id = am.user_id
  where hc.decay_at is null or hc.decay_at > now()
  group by am.crew_id, hc.city_id, hc.activity
),
points as (
  select am.crew_id, s.city_id, ss.activity, sum(ss.points)::integer as points_total
  from active_members am
  join public.season_scores ss on ss.user_id = am.user_id
  join public.seasons s on s.id = ss.season_id and s.status = 'active'
  group by am.crew_id, s.city_id, ss.activity
),
-- LE TERRITOIRE D'UN CREW, EN DEUX BRANCHES QUI NE PEUVENT PAS SE RECOUVRIR :
-- un territoire a UN propriétaire (contrainte `territories_owner_coherent`), il
-- tombe donc dans exactement une des deux.
--   · branche 1 — tenu par un MEMBRE ACTIF. C'est la seule qui produise quelque
--     chose aujourd'hui : `ingest_run` écrit toujours `owner_type = 'user'` ;
--   · branche 2 — tenu par le CREW lui-même (`owned_crew`, §5.3). PERSONNE NE
--     L'ÉCRIT au 27/07/2026 — elle rend zéro ligne. Elle est là parce que la
--     DÉFINITION de « ce que tient un crew » serait fausse sans elle le jour où
--     un transfert au crew existera, et qu'un oubli à ce moment-là passerait
--     inaperçu (la vue continuerait de compiler, en sous-comptant).
crew_territories as (
  select am.crew_id, t.activity, t.area_m2
  from active_members am
  join public.territories t
    on t.owner_type = 'user' and t.owner_id = am.user_id
  where public.territory_state_is_controlled(t.state)
  union all
  select c.id as crew_id, t.activity, t.area_m2
  from public.crews c
  join public.territories t
    on t.owner_type = 'crew' and t.owner_id = c.id
  where public.territory_state_is_controlled(t.state)
),
surface as (
  select
    ct.crew_id,
    ct.activity,
    sum(ct.area_m2)   as controlled_area_m2,
    count(*)::integer as territory_count
  from crew_territories ct
  group by ct.crew_id, ct.activity
)
select
  c.id as crew_id,
  a.activity,
  c.city_id,
  c.name,
  c.color,
  coalesce(m.members_active, 0)   as members_active,
  coalesce(h.hexes_held, 0)       as hexes_held,
  coalesce(p.points_total, 0)     as points_total,
  -- `coalesce(..., 0)` ici n'invente RIEN : la ligne existe déjà (le crew
  -- existe), et « ce crew ne tient aucune surface » est un fait vrai. C'est
  -- l'inverse d'un repli fabriqué — le repli fabriqué serait d'estimer une aire
  -- à partir d'un compte de cellules.
  coalesce(s.controlled_area_m2, 0)::double precision as controlled_area_m2,
  coalesce(s.territory_count, 0)  as territory_count
from public.crews c
cross join activities a
left join members m on m.crew_id = c.id
left join hexes   h on h.crew_id = c.id and h.city_id = c.city_id and h.activity = a.activity
left join points  p on p.crew_id = c.id and p.city_id = c.city_id and p.activity = a.activity
left join surface s on s.crew_id = c.id and s.activity = a.activity;

-- Index unique requis par `refresh materialized view concurrently` — il porte la
-- discipline (0070), sinon le rafraîchissement concurrent échouerait sur doublon.
create unique index crew_leaderboard_crew_idx on public.crew_leaderboard (crew_id, activity);
-- LA LECTURE DE E54 : « les crews de MA ville, par surface décroissante ».
-- `points_total desc` de 0070 est conservé dans un index séparé : les points
-- restent lus ailleurs, et supprimer leur index aurait ralenti une lecture
-- vivante pour un chantier qui ne la concerne pas.
create index crew_leaderboard_city_surface_idx
  on public.crew_leaderboard (city_id, activity, controlled_area_m2 desc);
create index crew_leaderboard_city_idx
  on public.crew_leaderboard (city_id, activity, points_total desc);

-- LES CLIENTS NE LISENT PAS LA MATVIEW DIRECTEMENT. Ils passent par
-- `crew_board()` (§4), qui est la seule surface capable de refuser une vue
-- jamais rafraîchie. Un `grant select` nu rouvrirait précisément le trou que ce
-- fichier referme : lire un agrégat sans savoir de quand il date.
-- (0070 accordait `select` à `authenticated` ; on le RETIRE — aucune lecture
--  cliente n'existait, le grep de 0044 le prouvait déjà.)
revoke all on public.crew_leaderboard from public, anon, authenticated;
grant select on public.crew_leaderboard to service_role;

comment on materialized view public.crew_leaderboard is
  'CLASSEMENT DES CREWS (E54) : une ligne par (crew, discipline) — crews, effectif ACTIF, surface contrôlée en m² dérivée de `territories` (jamais d''un compte de cellules, constitution §6), plus les compteurs hexagonaux et les points hérités de 0070. RAFRAÎCHIE POUR DE VRAI depuis 0086 par `refresh_crew_leaderboard()`, appelée par `recompute_sectors` (planifiée toutes les 15 min par 0038) ; la date de chaque passage est écrite dans `matview_refresh_state`. Les clients ne la lisent PAS directement : `crew_board()` est la seule porte, parce qu''elle sait REFUSER une vue jamais calculée au lieu d''en servir le vide.';

comment on column public.crew_leaderboard.controlled_area_m2 is
  'Surface contrôlée validée (§10.1), en m², somme des `territories.area_m2` tenus par les membres ACTIFS (et par le crew lui-même le jour où `owned_crew` sera écrit). Filtre d''états = `territory_state_is_controlled()` (0082), la définition UNIQUE — jamais une seconde liste recopiée.';
comment on column public.crew_leaderboard.members_active is
  'Effectif ACTIF (`crew_members.left_at is null`, compte non supprimé). Ce n''est PAS l''effectif historique : un crew que tout le monde a quitté affiche 0, ce qui est vrai.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LE RAFRAÎCHISSEMENT — IDEMPOTENT, ET IL LAISSE UNE TRACE
-- ════════════════════════════════════════════════════════════════════════════
-- PATRON REPRIS TEL QUEL DE `refresh_sector_control()` (0006:87), y compris sa
-- contrainte : `concurrently` est INTERDIT depuis une fonction (« REFRESH
-- MATERIALIZED VIEW CONCURRENTLY cannot be executed from a function »). Le
-- rafraîchissement est donc BLOQUANT — un `access exclusive` le temps du calcul.
-- Acceptable au volume MVP exactement comme il l'est pour `sector_control`
-- depuis 0006, et honnête à dire : ce n'est pas la forme définitive à 200 000
-- joueurs. L'index unique `crew_leaderboard_crew_idx` est conservé pour que la
-- bascule vers `concurrently` (depuis un appelant hors fonction) ne demande
-- aucun travail de schéma.
--
-- IDEMPOTENTE PAR NATURE : deux appels consécutifs produisent le MÊME contenu.
-- Le second réécrit `refreshed_at`, ce qui est le comportement voulu — la date
-- doit dire « dernier passage », pas « premier ».
create or replace function public.refresh_crew_leaderboard()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
begin
  refresh materialized view public.crew_leaderboard;

  select count(*)::integer into v_rows from public.crew_leaderboard;

  insert into public.matview_refresh_state (view_name, refreshed_at, row_count)
  values ('public.crew_leaderboard', now(), v_rows)
  on conflict (view_name) do update
    set refreshed_at = excluded.refreshed_at,
        row_count    = excluded.row_count;
end;
$$;

comment on function public.refresh_crew_leaderboard() is
  'Recalcule `crew_leaderboard` et HORODATE le passage dans `matview_refresh_state`. IDEMPOTENTE : deux appels de suite rendent le même contenu. Appelée par `supabase/functions/recompute_sectors/index.ts` (planifiée toutes les 15 min par 0038), exactement comme `refresh_sector_control()` — un seul ordonnanceur pour la même famille d''agrégats. `concurrently` est impossible depuis une fonction (restriction Postgres) : le refresh est bloquant, comme celui de `sector_control` depuis 0006.';

-- Service-role uniquement, patron de 0006:99. `from public, anon, authenticated`
-- et pas `from anon` seul : EXECUTE est accordé d'office à PUBLIC à la création.
revoke all on function public.refresh_crew_leaderboard()
  from public, anon, authenticated;
grant execute on function public.refresh_crew_leaderboard() to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. `crew_board()` — LA LECTURE DE E54, ET SON DEVOIR D'HONNÊTETÉ
-- ════════════════════════════════════════════════════════════════════════════
-- Portée : LA VILLE DU JOUEUR. §10 de la spec : « l'utilisateur est comparé à
-- des joueurs atteignables », « pas de podium mondial au premier écran ». Aucun
-- classement inter-villes n'est produit ici — et aucune ville n'est nommée que
-- `city_zones` ne porte pas (constitution §8 : zéro donnée européenne factice).
--
-- CE QUI EST CLASSÉ : les crews qui tiennent effectivement du terrain
-- (`controlled_area_m2 > 0`). Un crew à zéro n'est pas « dernier » — il n'est
-- PAS CLASSÉ, et le client le dit avec ses propres mots (`crewStickyUnranked`).
-- L'inclure produirait une queue de crews ex aequo à 0 m² qui n'apprend rien et
-- transforme une absence de jeu en humiliation de classement.
--
-- LE RANG : `rank()` — rang de COMPÉTITION, deux ex aequo partagent le rang et
-- le suivant saute. AUCUN DÉPARTAGE N'EST INVENTÉ ICI, et c'est délibéré : les
-- quatre critères de §10.2 (surface → défenses → conquête → ancienneté du
-- snapshot) vivent dans le moteur pur `packages/engine/src/leaderboard.ts`, qui
-- sert les SNAPSHOTS de 0082. Réécrire ces départages en SQL créerait une
-- seconde source de vérité qui dériverait au premier changement de règle. Ce
-- board LIVE n'expose donc QUE le critère 1 et laisse les égalités égales —
-- ne rien trancher est honnête ; trancher autrement que le moteur ne le serait
-- pas. (Même arbitrage que le rang de ville de `crew_overview()`, 0044 choix
-- n°2, qui utilise déjà `rank()` et refuse `dense_rank()`.)
--
-- TROIS REFUS DISTINCTS, jamais fondus en un `null` :
--   · 'signed_out'       — pas de session : il n'y a pas « ma ville » ;
--   · 'city_unknown'     — connecté, `users.city_id` NULL : la ville se rattache
--     au premier effort compté (`ensureHomeCity`), on n'en devine aucune ;
--   · 'never_refreshed'  — la matview n'a jamais été calculée. C'EST LE REFUS
--     QUI JUSTIFIE TOUT CE FICHIER : sans lui, l'écran afficherait un vide qui
--     ressemble à un constat sur les joueurs alors qu'il décrit un job absent.
create or replace function public.crew_board(
  p_activity text,
  p_limit integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_city_id      text;
  v_city_name    text;
  v_refreshed_at timestamptz;
  v_my_crew      uuid;
  v_my_rank      integer;
  v_my_area      double precision;
  v_rows         jsonb;
  v_ranked_total integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Bornes de LECTURE, pas de jeu : la valeur vient de `LEADERBOARD_ROWS_LIMIT`
  -- côté appelant. On refuse seulement l'absurde, on ne décide pas à sa place.
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    return jsonb_build_object('ok', false, 'reason', 'bad_limit');
  end if;

  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    return jsonb_build_object('ok', false, 'reason', 'bad_activity');
  end if;

  select u.city_id into v_city_id from public.users u where u.id = v_uid;
  if v_city_id is null then
    return jsonb_build_object('ok', false, 'reason', 'city_unknown');
  end if;

  -- Le NOM de la ville est LU, jamais deviné. Absent ⇒ `null`, et le client
  -- n'affiche alors aucune légende de portée plutôt qu'un nom inventé.
  select cz.name into v_city_name
  from public.city_zones cz where cz.city_id = v_city_id;

  select st.refreshed_at into v_refreshed_at
  from public.matview_refresh_state st
  where st.view_name = 'public.crew_leaderboard';

  if v_refreshed_at is null then
    return jsonb_build_object('ok', false, 'reason', 'never_refreshed');
  end if;

  -- Mon crew (adhésion ACTIVE unique, index partiel `crew_members_one_active_per_user`).
  select cm.crew_id into v_my_crew
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;

  with board as (
    select
      cl.crew_id,
      cl.name,
      cl.color,
      cl.members_active,
      cl.territory_count,
      cl.controlled_area_m2,
      rank() over (order by cl.controlled_area_m2 desc) as rk,
      count(*) over ()                                  as n_ranked
    from public.crew_leaderboard cl
    where cl.city_id = v_city_id
      and cl.activity = p_activity
      and cl.controlled_area_m2 > 0
  ),
  page as (
    select * from board order by rk, name asc limit p_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'crewId',        pg.crew_id,
          'name',          pg.name,
          'color',         pg.color,
          'membersActive', pg.members_active,
          -- « zones », jamais « hexagones » : c'est le nombre de POLYGONES tenus.
          'zonesHeld',     pg.territory_count,
          'areaM2',        pg.controlled_area_m2,
          'rank',          pg.rk
        )
        order by pg.rk, pg.name asc
      ),
      '[]'::jsonb
    ),
    max(pg.n_ranked)
  into v_rows, v_ranked_total
  from page pg;

  -- MON RANG, cherché dans le classement COMPLET et non dans la page : « ton
  -- crew est 63ᵉ » reste vrai quand la page s'arrête à 50. `null` si mon crew ne
  -- tient rien (il n'est pas classé) ou si je n'ai pas de crew.
  if v_my_crew is not null then
    select t.rk, t.area into v_my_rank, v_my_area
    from (
      select
        cl.crew_id,
        cl.controlled_area_m2 as area,
        rank() over (order by cl.controlled_area_m2 desc) as rk
      from public.crew_leaderboard cl
      where cl.city_id = v_city_id
        and cl.activity = p_activity
        and cl.controlled_area_m2 > 0
    ) t
    where t.crew_id = v_my_crew;
  end if;

  return jsonb_build_object(
    'ok',          true,
    'activity',    p_activity,
    'cityId',      v_city_id,
    'cityName',    v_city_name,          -- null = pas de nom en base, pas de légende
    'refreshedAt', v_refreshed_at,       -- le client DATE ce qu'il montre
    'rankedTotal', coalesce(v_ranked_total, 0),
    'myCrewId',    v_my_crew,            -- null = aucun crew
    'myRank',      v_my_rank,            -- null = crew non classé (0 m²)
    'myAreaM2',    v_my_area,
    'rows',        v_rows
  );
end;
$$;

comment on function public.crew_board(text, integer) is
  'E54 — classement des crews de MA ville, pour UNE discipline, lu dans `crew_leaderboard`. Rend la date du dernier calcul (`refreshedAt`) pour que l''écran DATE ce qu''il montre, et REFUSE (`never_refreshed`) une vue jamais rafraîchie plutôt que d''en servir le vide : un job absent ne doit jamais ressembler à un constat sur les joueurs. Seuls les crews qui tiennent du terrain sont classés — un crew à 0 m² n''est pas dernier, il n''est pas classé. `rank()` (ex aequo partagés) et AUCUN départage : les quatre critères de §10.2 vivent dans le moteur pur, les réécrire ici créerait une seconde vérité.';

revoke all on function public.crew_board(text, integer) from public, anon;
grant execute on function public.crew_board(text, integer) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. `crew_stats()` — CE QUE E50 DEMANDE ET QUE `crew_overview()` NE REND PAS
-- ════════════════════════════════════════════════════════════════════════════
-- Spec E50 : « surface ; rang local ; défenses ; distance collective ; courbe
-- quatre semaines ; top contributeurs ; lien membres ».
--
-- ⚠️ CETTE FONCTION NE REND DÉLIBÉRÉMENT NI LA SURFACE, NI LE RANG LOCAL, NI
-- LES TOP CONTRIBUTEURS. `crew_overview()` (0044) les rend déjà — zones tenues,
-- dernière capture, rang de ville, contribution par membre — et l'écran E50 lit
-- LA MÊME SOURCE que le HQ crew. Les recopier ici aurait produit deux chiffres
-- pour la même chose, qui divergeraient au premier correctif appliqué d'un seul
-- côté. Cette fonction ne couvre QUE les trois trous réels :
--   · DÉFENSES RÉUSSIES  — contestations closes en `defended` (§9.3) sur des
--     territoires tenus par le crew ;
--   · DISTANCE COLLECTIVE — somme des distances des membres ACTIFS ;
--   · SÉRIE HEBDOMADAIRE  — la « courbe quatre semaines ».
--
-- TOUT EST BORNÉ PAR LA MÊME FENÊTRE, et l'écran l'annonce UNE fois (« Quatre
-- dernières semaines »). Mélanger un total « depuis toujours » et une courbe sur
-- quatre semaines dans le même bloc aurait produit deux échelles sous un seul
-- titre — la lecture en moins de 3 s (§A) n'y survit pas.
--
-- `p_weeks` VIENT DE `CREW_STATS_TREND_WEEKS` (game-rules) : aucune profondeur
-- n'est écrite ici. La fonction refuse seulement l'absurde.
--
-- SEMAINES ISO (`date_trunc('week', …)` = lundi) : la même maille que partout
-- ailleurs dans Postgres, et une maille STABLE — des fenêtres glissantes de 7
-- jours feraient bouger tous les points de la courbe à chaque ouverture d'écran.
-- La semaine EN COURS est incluse et forcément partielle ; c'est vrai de toute
-- semaine en cours, et l'écran ne prétend pas l'inverse.
--
-- ⚠️ APPROXIMATION ASSUMÉE, la même qu'en 0082 : faute d'historique de
-- propriété, une défense est rattachée au propriétaire ACTUEL du territoire. Un
-- territoire défendu puis perdu dans la fenêtre crédite le nouveau propriétaire.
-- Inscrit en suspens en fin de fichier.
create or replace function public.crew_stats(
  p_activity text,
  p_weeks integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew     uuid;
  v_from     timestamptz;
  v_defenses integer;
  v_distance bigint;
  v_trend    jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    return jsonb_build_object('ok', false, 'reason', 'bad_activity');
  end if;

  -- Profondeur d'AFFICHAGE, décidée par l'appelant (game-rules). Bornée par
  -- l'absurde seulement — 52 semaines = un an, au-delà ce n'est plus une courbe.
  if p_weeks is null or p_weeks < 1 or p_weeks > 52 then
    return jsonb_build_object('ok', false, 'reason', 'bad_weeks');
  end if;

  select cm.crew_id into v_crew
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;

  if v_crew is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- Début du LUNDI de la (p_weeks - 1)ᵉ semaine avant celle en cours : la
  -- fenêtre couvre donc p_weeks semaines ISO, dont la courante.
  v_from := date_trunc('week', now()) - make_interval(weeks => p_weeks - 1);

  -- ── MEMBRES ACTIFS — un seul prédicat, répété par référence ───────────────
  -- Sous-requête plutôt que table temporaire : une `create temporary table` dans
  -- une fonction SECURITY DEFINER dépend du `search_path` et de la durée de la
  -- transaction de l'appelant — deux choses qu'une RPC ne contrôle pas. Le
  -- prédicat est court, le planificateur le réutilise, et il reste LITTÉRALEMENT
  -- le même aux trois endroits (même définition que `active_members` du §2).
  --
  -- ── DÉFENSES RÉUSSIES sur la fenêtre ──────────────────────────────────────
  -- `status = 'defended'` UNIQUEMENT : une contestation `active` n'a rien prouvé,
  -- `transferred` est une perte, `cancelled` n'a pas eu lieu. Même prédicat
  -- qu'en 0082 §3 — un seul vocabulaire pour la même chose.
  select count(*)::integer into v_defenses
  from public.territory_contests tc
  join public.territories t on t.id = tc.territory_id
  where tc.status = 'defended'
    and tc.resolved_at >= v_from
    and t.activity = p_activity
    and (
      (t.owner_type = 'user' and t.owner_id in (
      select cm2.user_id
      from public.crew_members cm2
      join public.users u2 on u2.id = cm2.user_id
      where cm2.crew_id = v_crew
        and cm2.left_at is null
        and u2.deletion_requested_at is null
    ))
      or (t.owner_type = 'crew' and t.owner_id = v_crew)
    );

  -- ── DISTANCE COLLECTIVE sur la fenêtre ────────────────────────────────────
  -- `valid` ET `partial` : une course partiellement validée a été COURUE, et ses
  -- segments retenus ont compté pour le territoire (AMENDEMENT-02 §4). L'exclure
  -- ferait disparaître des kilomètres réels. `flagged`/`rejected` sont exclues :
  -- elles n'ont rien crédité.
  select coalesce(sum(r.distance_m), 0)::bigint into v_distance
  from public.runs r
  where r.user_id in (
      select cm2.user_id
      from public.crew_members cm2
      join public.users u2 on u2.id = cm2.user_id
      where cm2.crew_id = v_crew
        and cm2.left_at is null
        and u2.deletion_requested_at is null
    )
    and r.activity = p_activity
    and r.status in ('valid', 'partial')
    and r.started_at >= v_from;

  -- ── LA COURBE : une ligne PAR SEMAINE, y compris les semaines à zéro ───────
  -- `generate_series` d'abord, `left join` ensuite : sans cela une semaine sans
  -- sortie DISPARAÎTRAIT de la courbe et les quatre points se resserreraient en
  -- trois, ce qui ferait mentir la forme. Une semaine à 0 est une information.
  select coalesce(
    jsonb_agg(
      jsonb_build_object('weekStart', w.week_start, 'distanceM', coalesce(d.meters, 0))
      order by w.week_start asc
    ),
    '[]'::jsonb
  ) into v_trend
  from generate_series(v_from, date_trunc('week', now()), interval '1 week') as w(week_start)
  left join (
    select date_trunc('week', r.started_at) as week_start,
           sum(r.distance_m)::bigint        as meters
    from public.runs r
    where r.user_id in (
      select cm2.user_id
      from public.crew_members cm2
      join public.users u2 on u2.id = cm2.user_id
      where cm2.crew_id = v_crew
        and cm2.left_at is null
        and u2.deletion_requested_at is null
    )
      and r.activity = p_activity
      and r.status in ('valid', 'partial')
      and r.started_at >= v_from
    group by 1
  ) d on d.week_start = w.week_start;

  return jsonb_build_object(
    'ok',        true,
    'activity',  p_activity,
    'weeks',     p_weeks,
    'since',     v_from,
    'defenses',  v_defenses,
    'distanceM', v_distance,
    'trend',     v_trend
  );
end;
$$;

comment on function public.crew_stats(text, integer) is
  'E50 — les TROIS mesures que `crew_overview()` (0044) ne rend pas : défenses réussies, distance collective et courbe hebdomadaire, toutes bornées par la MÊME fenêtre de `p_weeks` semaines ISO (CREW_STATS_TREND_WEEKS). Ne rend NI la surface, NI le rang de ville, NI les contributeurs : `crew_overview()` les rend déjà et l''écran lit la même source — deux chiffres pour la même chose divergeraient au premier correctif. Approximation assumée (identique à 0082) : faute d''historique de propriété, une défense est rattachée au propriétaire ACTUEL du territoire.';

revoke all on function public.crew_stats(text, integer) from public, anon;
grant execute on function public.crew_stats(text, integer) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/crew_leaderboard_alive.pglite.test.mjs` exécute le VRAI SQL de
-- ce fichier sur un Postgres réel (PGlite, WASM), par-dessus la lignée complète :
-- la matview porte bien l'effectif et la surface ; la surface vient de
-- `territories` et JAMAIS de `hex_claims` ; Run et Bike ne se rencontrent
-- jamais ; `refresh_crew_leaderboard()` horodate son passage et est idempotente ;
-- `crew_board()` REFUSE tant qu'aucun refresh n'a eu lieu, puis rend une liste
-- VIDE sur une base sans crew, puis classe pour de vrai avec ex aequo partagés ;
-- `crew_stats()` borne ses trois mesures à la fenêtre et garde les semaines à 0.
--
-- CE QU'IL NE PROUVE PAS : l'effet réel de la RLS (PGlite tourne en
-- superutilisateur, `auth.uid()` y est un bouchon), et que `recompute_sectors`
-- appelle réellement la fonction toutes les 15 minutes — seul un vrai Supabase
-- peut le montrer (`select * from cron.job`).
--
-- POUR LE REJOUER :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/crew_leaderboard_alive.pglite.test.mjs

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA BASE EST VIDE. Aucun crew réel n'existe : `crew_board()` répondra
--    `{ok:true, rows:[]}` dès le premier rafraîchissement, et c'est le
--    comportement juste. Rien ici ne le déguise en autre chose.
-- 2. LE RAFRAÎCHISSEMENT DÉPEND D'UN DÉPLOIEMENT. `recompute_sectors` doit être
--    redéployé pour que l'appel existe en production. Tant qu'il ne l'est pas,
--    `matview_refresh_state` reste vide et l'écran affiche « pas encore ouvert »
--    — ce qui est vrai, mais ce n'est pas fini.
-- 3. « PROGRESSION » DE E54 N'EST PAS RENDUE. La spec la liste ; elle exige de
--    comparer au relevé PRÉCÉDENT, donc les snapshots de 0082 — dont personne ne
--    prend encore. `crew_board()` n'invente donc aucune variation, et les clés
--    i18n `crewProgressUp/Down/Unknown` existent déjà pour le jour où le preneur
--    de snapshot existera. Une flèche fabriquée serait pire qu'une flèche
--    absente.
-- 4. LE REFRESH EST BLOQUANT (`concurrently` interdit depuis une fonction). Au
--    volume MVP c'est invisible ; à l'échelle il faudra un appelant hors
--    fonction. L'index unique nécessaire est déjà là.
-- 5. AUCUN HISTORIQUE DE PROPRIÉTÉ (identique au suspens 3 de 0082) : les
--    défenses de `crew_stats()` sont rattachées au propriétaire ACTUEL.
-- 6. `owned_crew` N'EST ÉCRIT PAR PERSONNE. La branche « territoire tenu par le
--    crew lui-même » de la matview rend zéro ligne aujourd'hui ; elle existe
--    pour que la définition soit juste le jour où un transfert au crew existera.
-- 7. `sector_control` N'EST TOUJOURS PAS DATÉE. `matview_refresh_state` est
--    générique et l'attend, mais `refresh_sector_control()` (0006) n'y écrit
--    pas : le faire toucherait `decay_job` et `recompute_sectors` au-delà du
--    périmètre de ce fichier.
