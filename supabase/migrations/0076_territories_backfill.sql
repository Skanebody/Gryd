-- 0076_territories_backfill.sql
-- GRYD — LA COURSE EST LA CLÉ DU TERRITOIRE (LOT 1, ÉTAPE 3 sur 4).
--
-- ═══ CETTE MIGRATION NE BACKFILLE RIEN. C'EST SON OBJET. ════════════════════
-- FAIT   : pose un FILET DE DIAGNOSTIC — une vue et une fonction de résumé qui
--          SIGNALENT les cellules `hex_claims` qu'aucun polygone `territories`
--          ne représente, et qui disparaîtraient donc de la carte à la bascule
--          des lectures (étape 4). Elle crie au déploiement si elle en trouve.
-- NE FAIT PAS : aucune ligne `territories` créée, aucune géométrie fabriquée,
--          aucune conversion silencieuse. `hex_claims` n'est ni lue en écriture
--          ni modifiée. Rollback = `drop view` + `drop function`, et il ne
--          détruit rien d'acquis, par construction.
--
-- ═══ POURQUOI PAS DE VRAI BACKFILL — LE RAISONNEMENT, PAS L'EXCUSE ══════════
-- Un backfill honnête devrait reconstruire, pour chaque capture ancienne, LE
-- POLYGONE RÉEL. Or :
--
--   1. LA BASE NE SAIT PAS FAIRE DE GÉOMÉTRIE ICI. La géométrie du dépôt vit en
--      GeoJSON `jsonb` et PostGIS n'est pas utilisé (ARBITRAGES A1-bis, 0074) :
--      pas de `ST_Union`, pas d'agrégat spatial. Et `h3` n'existe pas côté
--      Postgres — la base ne peut même pas transformer un `h3index bigint` en
--      contour. Un backfill en SQL pur est donc IMPOSSIBLE, pas « difficile ».
--
--   2. ET SURTOUT, IL SERAIT FAUX. Même avec h3 disponible, unir les cellules
--      d'une capture rendrait un contour HEXAGONAL — exactement la forme que la
--      spec §1.4 interdit (« aucun hexagone »). On écrirait dans la table des
--      POLYGONES RÉELS une géométrie qui n'a jamais été courue par personne, et
--      elle serait ensuite indiscernable des vraies : même colonne, mêmes
--      lectures, même carte. `algorithm_version = 'backfill-hex@1'` n'y
--      changerait rien — une étiquette ne rend pas une donnée honnête
--      (AMENDEMENT-47). La trace GPS d'origine, elle, n'est PAS conservée en
--      base : `runs` n'a aucune colonne de points. Ce qui a été perdu est perdu ;
--      le reconstruire de mémoire, c'est l'inventer.
--
--   3. CRÉER LA LIGNE SANS GÉOMÉTRIE EST INTERDIT PAR LE SCHÉMA, et c'est tant
--      mieux : `territories.geometry` est `not null` et `area_m2 > 0` (0074).
--      Il n'existe donc aucune forme « dégradée mais vraie » de la ligne. Le
--      schéma refuse le demi-mensonge — on ne le contourne pas.
--
-- Reste la voie d'un script Node hors migration (h3-js + `unionPolygons` du
-- moteur). Elle est TECHNIQUEMENT possible, mais elle bute sur le point 2 : elle
-- produirait, elle aussi, des hexagones adoucis. Elle n'est donc pas écrite ici.
--
-- ═══ CE QUE ÇA COÛTE, DIT FRANCHEMENT ═══════════════════════════════════════
-- À la bascule de l'étape 4, une capture qui n'a QUE des cellules n'aura pas de
-- polygone à afficher. Trois issues possibles, et c'est un ARBITRAGE PRODUIT,
-- pas une décision de migration :
--   (a) elle disparaît de la carte polygonale ;
--   (b) l'étape 4 continue de lire `hex_claims` en repli pour ces captures-là ;
--   (c) on demande au joueur de recourir.
-- Cette migration ne tranche pas. Elle rend le choix VISIBLE et CHIFFRÉ au lieu
-- de le laisser se produire en silence — c'est tout ce qu'elle peut faire
-- honnêtement.
--
-- ═══ ÉTAT CONNU AU 27/07/2026, ET SON DEGRÉ DE CERTITUDE ════════════════════
-- Sur la seule base déployée (projet `gryd`), `hex_claims` était VIDE au
-- 26/07/2026 — donc ce filet devrait ne rien trouver, et le backfill est
-- vraisemblablement un NO-OP. C'est une OBSERVATION DATÉE, pas une garantie :
-- une base d'un autre environnement, ou une capture faite depuis, la périme.
-- D'où un filet plutôt qu'un `raise exception` ou qu'un pari : la migration
-- MESURE au lieu de supposer, et elle ne bloque aucun déploiement.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA VUE — CE QUI N'A PAS DE POLYGONE
-- ════════════════════════════════════════════════════════════════════════════
-- Une ligne par groupe de cellules qu'AUCUN territoire ne représente, groupé sur
-- la clé la plus fine qui existe : la COURSE (`hex_claims.run_id`), puis la
-- discipline, le propriétaire et la ville. La course est la bonne unité parce
-- que c'est exactement la clé qu'`ingest_run` utilise pour écrire un territoire
-- (`territories.source_run_id`, unique depuis 0075) — l'anti-jointure ci-dessous
-- compare donc les deux représentations sur LEUR clé commune, pas sur une
-- ressemblance.
--
-- `run_id is null` (course purgée par la rétention §7, `on delete set null`)
-- forme son propre groupe : ces cellules ne pourront JAMAIS être rattachées à
-- une course, quoi qu'on décide plus tard. La colonne `attributable_to_run` le
-- dit au lieu de les mélanger aux autres.
--
-- ⚠️ CE QUE CETTE VUE NE DIT PAS, et qu'il serait faux de lui faire dire :
-- « un groupe ici = une capture d'avant la double écriture ». C'est FAUX. Trois
-- causes distinctes produisent une ligne, et la base ne peut pas les distinguer :
--   (i)   capture ANTÉRIEURE à la double écriture d'`ingest_run` (0075) — la
--         seule qu'un backfill viserait ;
--   (ii)  course SANS BOUCLE FERMÉE, qui capture des cellules en couloir et
--         n'écrit aucun polygone (0075, suspens 1). Celle-là apparaîtra ici
--         POUR TOUJOURS, y compris après la bascule des lectures. Ce n'est pas
--         une anomalie ;
--   (iii) course purgée (`run_id` null).
-- L'opérateur tranche en comparant `first_claimed_at` / `last_claimed_at` à la
-- date RÉELLE de déploiement de la double écriture — un fait qu'il détient, et
-- que la base n'a nulle part où lire. Elle ne l'invente donc pas.
--
-- La lecture utile est donc asymétrique, et c'est assumé :
--   · ZÉRO ligne  ⇒ il n'y a RIEN à backfiller. Conclusion sûre.
--   · N lignes    ⇒ il faut REGARDER. Pas « il y a N captures à sauver ».
drop view if exists public.territories_backfill_gap;

create view public.territories_backfill_gap as
select
  hc.run_id,
  hc.activity,
  hc.owner_user_id,
  hc.city_id,
  count(*)::bigint            as cell_count,
  min(hc.claimed_at)          as first_claimed_at,
  max(hc.claimed_at)          as last_claimed_at,
  (hc.run_id is not null)     as attributable_to_run
from public.hex_claims hc
left join public.territories t on t.source_run_id = hc.run_id
-- `t.id is null` couvre les DEUX cas d'un seul prédicat : aucune course nommée
-- (`hc.run_id` null ⇒ `null = null` est faux ⇒ pas d'appariement) et course
-- nommée sans territoire. Aucun risque de duplication de cellule : 0075 garantit
-- AU PLUS UN territoire par course, donc l'anti-jointure ne peut pas éclater.
where t.id is null
group by hc.run_id, hc.activity, hc.owner_user_id, hc.city_id;

comment on view public.territories_backfill_gap is
  'DIAGNOSTIC D''OPÉRATEUR (lot 1 étape 3) : cellules hex_claims qu''aucun polygone territories ne représente, groupées par course/discipline/propriétaire/ville. Zéro ligne = rien à backfiller. Des lignes = à REGARDER, pas à convertir : une course sans boucle fermée y figure légitimement et pour toujours. Ne convertit rien, ne fabrique aucune géométrie. JAMAIS servie à un client (aucun grant) : elle expose qui a couru où et quand.';

-- ── POURQUOI AUCUN CLIENT NE LA LIT, ET POURQUOI PAS `security_invoker` ──────
-- Deux raisons, et la seconde est la moins évidente :
--   1. VIE PRIVÉE. Une ligne dit « ce joueur a capturé là, entre ces deux
--      instants ». C'est précisément ce que la publication différée de §1.5
--      protège (AUDIT R3). Un diagnostic d'opérateur n'a rien à faire dans une
--      app.
--   2. JUSTESSE. Sans `security_invoker`, une vue s'évalue avec les droits de
--      son PROPRIÉTAIRE : l'anti-jointure voit donc TOUS les territoires. Si on
--      la basculait en `security_invoker = true`, elle s'évaluerait sous la RLS
--      du lecteur — qui masque les territoires non encore publiés
--      (`territories_select_published`, 0074) — et la vue REPORTERAIT COMME
--      MANQUANTS des polygones qui existent. Un diagnostic qui ment est pire
--      que pas de diagnostic. On garde donc les droits du propriétaire, ET on
--      ferme la vue à tout rôle client : la seule combinaison à la fois juste
--      et sans fuite.
-- `revoke ... from public` est indispensable : Supabase pose des privilèges par
-- défaut sur le schéma `public`, sans ce revoke la vue serait lisible.
revoke all on public.territories_backfill_gap from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LE RÉSUMÉ — UNE LIGNE, POUR RÉPONDRE « OUI OU NON »
-- ════════════════════════════════════════════════════════════════════════════
-- Bâti SUR la vue, jamais en re-dérivant les mêmes jointures : deux définitions
-- de « ce qui manque » finiraient par diverger, et l'une des deux mentirait.
-- `stable` : elle ne lit que des tables, elle n'écrit rien.
create or replace function public.territories_backfill_gap_summary()
returns table (
  gap_groups                 bigint, -- groupes (course × discipline × joueur × ville)
  gap_cells                  bigint, -- cellules totales sans polygone
  cells_attributable_to_run  bigint, -- … dont rattachées à une course encore connue
  cells_without_run          bigint  -- … dont plus rattachables (course purgée §7)
)
language sql
stable
set search_path = public, pg_temp
as $$
  -- `sum()` d'un bigint rend `numeric` en Postgres : le cast est nécessaire, pas
  -- cosmétique. `coalesce` parce que la somme d'un ensemble VIDE est NULL — et
  -- le cas vide est justement le cas nominal attendu ici : il doit rendre 0,
  -- jamais NULL. Un « inconnu » affiché à la place d'un « zéro » serait un
  -- quatrième état inventé.
  select
    count(*)::bigint,
    coalesce(sum(cell_count), 0)::bigint,
    coalesce(sum(cell_count) filter (where attributable_to_run), 0)::bigint,
    coalesce(sum(cell_count) filter (where not attributable_to_run), 0)::bigint
  from public.territories_backfill_gap;
$$;

comment on function public.territories_backfill_gap_summary() is
  'Résumé une-ligne de public.territories_backfill_gap. `select * from public.territories_backfill_gap_summary()` répond « y a-t-il quelque chose à backfiller ? ». Tout à 0 = non. Réservée au service_role : elle agrège une vue qui expose des données de joueurs.';

-- Postgres accorde `execute` à PUBLIC par défaut sur toute fonction : sans ce
-- revoke, n'importe quel client authentifié compterait les captures des autres.
revoke all on function public.territories_backfill_gap_summary() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LE SIGNAL AU DÉPLOIEMENT — LA MIGRATION PARLE, ELLE NE DÉCIDE PAS
-- ════════════════════════════════════════════════════════════════════════════
-- Une vue que personne ne regarde ne protège personne. Ce bloc la lit UNE FOIS,
-- au moment où l'opérateur a les yeux sur la sortie du déploiement.
-- `raise warning`, jamais `raise exception` : refuser d'appliquer la migration
-- n'effacerait pas le problème, ça priverait juste la base de l'outil qui le
-- mesure. Et jamais `raise notice` seul quand il y a quelque chose : un `notice`
-- se noie dans un log, or ce message-là doit être vu.
do $$
declare
  s record;
begin
  select * into s from public.territories_backfill_gap_summary();

  if s.gap_cells = 0 then
    raise notice
      'GRYD 0076 — aucune cellule hex_claims sans polygone : le backfill est un NO-OP sur cette base. Rien n''a été créé, rien n''avait à l''être.';
  else
    raise warning
      'GRYD 0076 — % cellule(s) hex_claims sans polygone territories, en % groupe(s) (% rattachable(s) à une course, % sans course). RIEN N''A ÉTÉ CONVERTI : la géométrie réelle de ces captures n''existe nulle part et l''inventer serait un mensonge. Ces captures n''auront pas de polygone à la bascule des lectures (étape 4) — ARBITRAGE À FAIRE avant. Détail : select * from public.territories_backfill_gap;',
      s.gap_cells, s.gap_groups, s.cells_attributable_to_run, s.cells_without_run;
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/territories_backfill.pglite.test.mjs` exécute le VRAI SQL de
-- ce fichier sur un Postgres réel (PGlite, WASM), par-dessus la LIGNÉE COMPLÈTE
-- des migrations (0002 → 0075, donc `hex_claims.activity` de 0070 incluse — la
-- vue est vérifiée sur le schéma réel, pas sur une maquette) :
--   · la migration s'applique telle quelle, et sur une base VIDE elle ne crée
--     AUCUNE ligne `territories` — le cœur de la promesse ;
--   · base vide ⇒ résumé tout à zéro (et 0, jamais NULL) ;
--   · une capture SANS territoire est SIGNALÉE, avec son compte de cellules,
--     ses bornes de temps, sa discipline et son propriétaire ;
--   · une capture AVEC son territoire n'apparaît PAS (pas de faux positif) ;
--   · Run et Bike sur la MÊME cellule H3 restent DEUX groupes distincts
--     (0070 : la clé primaire est `(h3index, activity)`) ;
--   · les cellules dont la course a été purgée sont comptées à part
--     (`attributable_to_run = false`), jamais confondues avec les autres ;
--   · l'anti-jointure ne duplique aucune cellule ;
--   · aucun rôle client ne peut lire la vue ni exécuter la fonction ;
--   · rejouer la migration est idempotent et ne crée toujours rien.
--
-- CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire :
--   · L'ÉTAT DE LA BASE DE PRODUCTION. PGlite prouve que le filet FONCTIONNE ;
--     il ne prouve pas qu'il ne trouvera rien chez `gryd`. Seul le déploiement
--     le dira — c'est exactement pour ça que le bloc `do` existe.
--   · L'EFFET DES REVOKE. PGlite tourne en SUPERUTILISATEUR : on vérifie que les
--     privilèges sont bien ABSENTS dans `information_schema` / `pg_proc.proacl`,
--     pas qu'une connexion `authenticated` se fasse refuser (même limite qu'en
--     0074).
--
-- POUR LE REJOUER :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/territories_backfill.pglite.test.mjs

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
-- ════════════════════════════════════════════════════════════════════════════
-- 1. LES CAPTURES ANCIENNES N'ONT TOUJOURS PAS DE POLYGONE, et n'en auront pas
--    par cette migration. Le filet les compte ; il ne les sauve pas. L'arbitrage
--    (disparaître / repli hex_claims à l'étape 4 / recourir) N'EST PAS PRIS.
-- 2. PERSONNE NE LIT LE FILET APRÈS LE DÉPLOIEMENT. Le bloc `do` parle une fois ;
--    aucun job, aucune alerte, aucun écran d'admin ne relit la vue ensuite. Un
--    écart qui apparaîtrait plus tard resterait muet jusqu'à ce qu'on pense à
--    interroger la vue.
-- 3. LA VUE NE DISTINGUE PAS SES TROIS CAUSES (capture d'avant la double
--    écriture / course sans boucle fermée / course purgée) au-delà de
--    `attributable_to_run` et des dates. Elle ne le pourra pas tant que la date
--    de déploiement de la double écriture ne sera pas un FAIT en base ;
--    l'inférer d'un `min(created_at)` sur `territories` serait une heuristique
--    déguisée en donnée.
-- 4. AUCUN INDEX N'EST POSÉ POUR ELLE. L'anti-jointure balaie `hex_claims` et
--    s'appuie sur l'index unique `territories_source_run_unique` (0075) côté
--    droit. C'est un outil d'opérateur exécuté à la main, pas une lecture de
--    produit : ajouter un index pour lui coûterait à chaque écriture de capture
--    pour un gain nul en usage normal.
