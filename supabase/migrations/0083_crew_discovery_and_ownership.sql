-- 0083_crew_discovery_and_ownership.sql
-- GRYD — LOT 7 (CREWS, E38→E52) : la DÉCOUVERTE devient réelle, et la question
-- de la PROPRIÉTÉ CREW est TRANCHÉE.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ PARTIE 0 — L'ARBITRAGE : UN CREW NE POSSÈDE PAS, IL EST LE CONTEXTE      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ─── LA CONTRADICTION, POSÉE HONNÊTEMENT ────────────────────────────────────
-- La spec produit (§19.2) décrit `territories.ownerType: 'USER' | 'CREW'` : un
-- crew POSSÉDERAIT un territoire, au même titre qu'un joueur. Trois faits du
-- dépôt s'y opposent, et ils ne sont pas de même poids :
--
--   1. `hex_claims.owner_user_id` est la colonne dont TOUT le moteur dépend :
--      le decay (0017), la garde TOCTOU du claim (0031), le crédit de points
--      (0018), le relais (0041), le verrouillage d'écriture client (0079).
--      ⚠ ET SON `NULL` EST DÉJÀ PRIS. Elle est nullable depuis 0006:56-57, avec
--      un sens EXPLICITE : « null = hex neutre mais déjà possédé ». Le seul
--      emplacement libre pour un propriétaire non humain porte donc déjà une
--      autre signification — un hexagone « sans propriétaire humain » veut dire
--      NEUTRE, pas « appartenant au crew ». Y loger la propriété crew ne serait
--      pas une extension : ce serait une COLLISION de sens sur une colonne lue
--      par six migrations.
--   2. Une décision RÉCENTE et EXPLICITE dit l'inverse de la spec :
--      `hex_co_captures.crew_id` est documenté « Contexte d'AFFICHAGE
--      uniquement (couleur/attribution sociale) — jamais de propriété : le crew
--      ne possède rien (SPEC §3.5, A-41 §1) » (0041:30-32).
--   3. Et pourtant `territories.owner_type` (0074:76-77) ACCEPTE déjà 'crew',
--      avec des CHECK cohérents et une RLS qui sait rendre un territoire à tous
--      les membres du crew propriétaire (0074:277-281). La capacité existe en
--      schéma. Simplement, PERSONNE ne l'écrit : `ingest_run/territory.ts:207`
--      pose `owner_type: 'user'` EN DUR, et son type l'interdit même
--      (`readonly owner_type: 'user'`, ligne 136).
--
-- Autrement dit : la table est prête, l'écrivain ne l'est pas, et une décision
-- de conception dit qu'il ne doit pas l'être. Il faut trancher, pas empiler.
--
-- ─── LES DEUX VOIES, ÉVALUÉES ───────────────────────────────────────────────
--
-- VOIE A — PROPRIÉTÉ CREW RÉELLE. Un territoire dont le propriétaire est un
-- crew, sans propriétaire humain. Ce qu'elle coûte, concrètement :
--   · `hex_claims` devrait recevoir un `owner_crew_id` (le `NULL` de
--     `owner_user_id` étant déjà pris par « neutre », cf. ci-dessus), et TOUTES
--     les lectures de propriété devraient devenir polymorphes : 0031 (garde
--     TOCTOU indexée sur le propriétaire), 0017 (horloge de decay par
--     propriétaire), 0018 (crédit de points), 0041 (part harmonique par rang),
--     0046 (suppression de compte), 0079 (verrouillage d'écriture). Six
--     migrations à rouvrir autour d'un invariant qui tient depuis 0002.
--   · L'ANTI-TRICHE perd son sujet. `scoreRun` juge une COURSE, donc un HUMAIN
--     (packages/engine/src/anticheat.ts). Si le territoire appartient au crew,
--     qui est sanctionné quand la course est rejetée ? Le crew entier, pour un
--     seul tricheur ? On invente une responsabilité collective que la spec
--     §11 n'a jamais définie.
--   · Le DÉPART d'un membre orpheline le territoire, ou le lui confisque. Aucune
--     règle de saison ne dit laquelle des deux. Il faudrait l'inventer.
--   · ET SURTOUT : l'anti-pay-to-win. §E46 impose « aucun rôle ne donne
--     d'avantage de capture ». Si un crew possède, alors quelqu'un décide POUR
--     le crew (assigner une mission, déclarer un territoire crew) — et cette
--     décision devient un pouvoir de jeu attaché à un rôle. La hiérarchie
--     cesserait d'être sociale pour devenir mécanique.
--
-- VOIE B — PROPRIÉTÉ CREW DÉRIVÉE (RETENUE). Invariant conservé : UN territoire
-- a EXACTEMENT UN propriétaire HUMAIN. La « propriété crew » est un ATTRIBUT
-- LU, pas une ligne de propriété : c'est le crew de ce propriétaire AU MOMENT
-- DU CLAIM. Pourquoi c'est la bonne :
--   · C'EST DÉJÀ CE QUE LA SPEC DÉCRIT AILLEURS. §8.4 attribue selon le
--     CONTEXTE au départ : « joueur sans crew : personnel ; joueur avec crew et
--     mission crew active : crew ». L'attribution est une fonction de l'état AU
--     MOMENT DE LA COURSE — c'est exactement une dérivation, pas une propriété
--     autonome. §19.2 en est la projection en table ; §8.4 en est la RÈGLE.
--     Entre les deux, la règle prime.
--   · ELLE NE CASSE RIEN. `hex_claims` reste intacte, decay/TOCTOU/points/
--     relais/anti-triche gardent leur sujet humain, et 0041 n'a plus à être
--     contredit : le crew reste « contexte », on ne fait que le PERSISTER.
--   · ELLE EST ANTI-P2W PAR CONSTRUCTION. Personne n'attribue un territoire au
--     crew : c'est la course qui le fait, et seule la course. Aucun rôle,
--     aucun achat, aucune décision de chef ne peut déplacer une frontière.
--   · ELLE EST HONNÊTE À L'ÉCRAN. « Ce territoire a été pris sous les couleurs
--     du crew X par Y » est vérifiable. « Le crew X possède ce territoire »
--     ne l'est pas tant que rien ne dit ce qui arrive quand Y s'en va.
--
-- ─── CE QUE LA VOIE B IMPOSE, ET CE QUI RESTE À FAIRE ───────────────────────
-- Elle exige UNE colonne : le crew du propriétaire À L'INSTANT du claim (et non
-- « son crew d'aujourd'hui », qui est une autre question — cf. plus bas). Cette
-- migration la POSE. Elle ne la remplit pas : l'écrivain est `ingest_run`, HORS
-- du périmètre de ce lot. Même patron que 0074 (« ON POSE LA TABLE. PERSONNE
-- N'ÉCRIT ENCORE DEDANS ») : la colonne naît NULL partout, et NULL veut dire
-- « on ne sait pas », JAMAIS « pas de crew ». Aucun écran de ce lot ne la lit ;
-- les surfaces livrées ici lisent la seule dérivation déjà vraie aujourd'hui
-- (l'emprise des membres ACTIFS, exactement comme `crew_overview`, 0071).
--
-- ⚠ DEUX DÉRIVATIONS EXISTENT, ET IL NE FAUT PAS LES CONFONDRE :
--   · APPARTENANCE VIVANTE (ce que fait `crew_overview` et ce que fait cette
--     migration) : « ce que tiennent, MAINTENANT, les membres ACTIFS ». Un crew
--     gagne de la surface en recrutant, en perd quand quelqu'un part. C'est
--     vrai, mesurable aujourd'hui, et c'est ce qu'affiche la découverte.
--   · CONTEXTE AU CLAIM (`territories.context_crew_id`, posée ici, non écrite) :
--     « ce qui a été pris sous les couleurs du crew ». C'est la lecture que
--     §8.4 décrit, et celle qui permettra un jour un palmarès de crew stable.
-- Les deux coexisteront ; elles répondent à deux questions différentes. Ce qui
-- serait fautif, c'est d'afficher l'une en prétendant l'autre.
--
-- ─── CE QUI EST DÉCIDÉ POUR `owner_type = 'crew'` ───────────────────────────
-- On NE SUPPRIME PAS la valeur 'crew' du CHECK de 0074 : la spec la veut, la
-- RLS sait déjà la servir, et un rollback de capacité serait une perte. Mais on
-- INSCRIT en base, par un commentaire de colonne, qu'AUCUN écrivain ne la
-- produit — pour qu'un futur lecteur ne prenne pas une capacité dormante pour
-- une fonctionnalité en service. Une capacité non utilisée qui se sait est un
-- palier ; une capacité non utilisée qui s'ignore est un piège.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ PARTIE 1 — CE QUE CETTE MIGRATION LIVRE DE FONCTIONNEL                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- E39 (découverte) et E40 (profil public) sont notés ABSENTS dans AUDIT_GRYD :
-- les deux routes sont des `<Redirect href="/crew"/>` depuis A-47, parce que la
-- version d'avant listait des crews INVENTÉS. Le seul chemin d'adhésion réel du
-- dépôt est le CODE — un secret qu'il faut recevoir de quelqu'un. Sans annuaire
-- ni candidature, un joueur seul ne peut littéralement PAS rejoindre un crew.
--
-- Trois fonctions ferment ce trou, toutes SECURITY DEFINER (le client n'écrit
-- jamais dans `crew_members` ni `crew_applications` : cf. 0003 revoke) :
--   · `crew_discovery(p_city_id, p_query)` — des FAITS, jamais un classement ;
--   · `crew_public_profile(p_crew_id)`     — la fiche publique, sans privé ;
--   · `crew_join_intent(p_crew_id)`        — rejoindre OU candidater, selon le
--                                            recrutement RÉEL du crew ;
--   · `crew_join_requests()` / `crew_decide_join_request(...)` — sans quoi une
--     candidature serait un bouton qui fait semblant.
--
-- ─── LE CLASSEMENT N'EST PAS ICI, ET C'EST VOULU ────────────────────────────
-- §E39 veut un ordre de pertinence (ville > amis > activité > capacité >
-- compatibilité Run/Bike). Le pondérer en SQL enterrerait des constantes de jeu
-- dans le schéma — interdit (CLAUDE.md : « aucun nombre magique »). La fonction
-- renvoie donc des FAITS BRUTS (même ville ? combien d'amis ? dernière capture
-- quand ? combien de membres ? quelle discipline ?) et le classement vit dans
-- `apps/mobile/src/features/crew/discovery.ts` — pur, testé.
--
-- ─── CE QU'ON REFUSE D'EXPOSER, ET POURQUOI ─────────────────────────────────
-- `crews` porte des colonnes SÉDUISANTES qui seraient des mensonges :
-- `activity_score`, `activity_status`, `league`, `xp`, `level` (0010/0011). Elles
-- sont documentées « dérivées par les jobs » — et AUCUN job du dépôt ne les
-- écrit. Toutes valent donc leur DÉFAUT : 0, 'dormant', 'bronze', 1. Les
-- afficher en découverte peindrait un écosystème entier de crews « dormants en
-- bronze » sans qu'un seul octet ne l'ait mesuré. Elles ne sortent pas d'ici.
-- Ce qui sort est calculé FRAIS depuis `hex_claims` / `crew_members`, avec le
-- MÊME prédicat que `crew_overview` (membre actif, hex non expiré).
-- Et `crews.code` reste hors de portée (secret depuis 0036) : une découverte qui
-- livrerait le code rendrait tout crew privé publiquement joignable.
--
-- ─── CONFIDENTIALITÉ (§12 / §E40) ───────────────────────────────────────────
-- La découverte et la fiche publique ne renvoient AUCUNE identité de membre :
-- ni pseudo, ni id, ni contribution individuelle, ni la moindre position. Un
-- COMPTE, et rien d'autre. « Aucun chat ni information privée avant adhésion »
-- (§E40) est donc tenu par la FORME du retour, pas par la discipline de l'écran.
-- Seule exception mesurée : le NOMBRE d'amis déjà présents — un entier calculé
-- sur MES amitiés acceptées, qui ne nomme personne et ne révèle rien à autrui.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA COLONNE DE CONTEXTE (voie B) — POSÉE, PAS ÉCRITE
-- ════════════════════════════════════════════════════════════════════════════
-- `on delete set null` : un crew dissous ne doit pas emporter le territoire de
-- ses anciens membres. Le territoire reste, son contexte disparaît — ce qui est
-- exactement la vérité (« pris sous des couleurs qui n'existent plus »).
alter table public.territories
  add column if not exists context_crew_id uuid references public.crews (id) on delete set null;

comment on column public.territories.context_crew_id is
  'VOIE B (arbitrage 0083) : crew du propriétaire HUMAIN À L''INSTANT du claim — contexte d''attribution (§8.4), JAMAIS un propriétaire. NULL = inconnu, jamais « pas de crew ». ⚠ AUCUN ÉCRIVAIN AUJOURD''HUI : ingest_run/territory.ts pose owner_type=''user'' en dur et n''alimente pas cette colonne ; elle est donc NULL partout. Ne rien afficher à partir d''elle tant que ce câblage n''existe pas.';

comment on column public.territories.owner_type is
  'CAPACITÉ DORMANTE pour ''crew'' : le CHECK et la RLS (0074) l''acceptent, mais AUCUN écrivain ne la produit — ingest_run/territory.ts:136 la type ''user'' littéral. Arbitrage 0083 (voie B) : un territoire a exactement UN propriétaire HUMAIN ; la propriété crew est DÉRIVÉE (context_crew_id + appartenance vivante). Ne pas lire ''crew'' comme un état atteignable en production.';

create index if not exists territories_context_crew_idx
  on public.territories (context_crew_id)
  where context_crew_id is not null;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. UN PRÉDICAT, UNE SEULE FOIS : L'EMPRISE VIVANTE D'UN CREW
-- ════════════════════════════════════════════════════════════════════════════
-- Repris À L'IDENTIQUE de `crew_overview` (0071) : membre ACTIF (left_at null),
-- compte non en suppression (0046), hex NON expiré (decay_at null ou futur),
-- et `count(distinct h3index)` — jamais `count(*)`, sans quoi un joueur complet
-- (run + bike sur le même hexagone) compterait deux territoires (0070/0071).
--
-- SECURITY DEFINER + `stable` : appelée par les trois fonctions ci-dessous, qui
-- l'appellent chacune sur un ensemble de crews. Retour SETOF pour rester
-- jointable ; aucune notion de classement ici.
create or replace function public.crew_live_footprint(p_crew_ids uuid[])
returns table (
  crew_id       uuid,
  member_count  integer,
  hexes_held    integer,
  hexes_run     integer,
  hexes_bike    integer,
  last_capture  timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with active as (
    select cm.crew_id, cm.user_id
    from public.crew_members cm
    join public.users u on u.id = cm.user_id
    where cm.crew_id = any(p_crew_ids)
      and cm.left_at is null
      and u.deletion_requested_at is null
  )
  select
    c.id,
    (select count(*) from active a where a.crew_id = c.id)::integer,
    coalesce(f.hexes_held, 0)::integer,
    coalesce(f.hexes_run, 0)::integer,
    coalesce(f.hexes_bike, 0)::integer,
    f.last_capture
  from unnest(p_crew_ids) as c(id)
  left join lateral (
    select
      count(distinct hc.h3index)::integer as hexes_held,
      (count(distinct hc.h3index) filter (where hc.activity = 'run'))::integer  as hexes_run,
      (count(distinct hc.h3index) filter (where hc.activity = 'bike'))::integer as hexes_bike,
      max(hc.claimed_at)                                                        as last_capture
    from active a
    join public.hex_claims hc on hc.owner_user_id = a.user_id
    where a.crew_id = c.id
      and (hc.decay_at is null or hc.decay_at > now())
  ) f on true;
$$;

comment on function public.crew_live_footprint(uuid[]) is
  'Emprise VIVANTE d''un crew : ce que tiennent MAINTENANT ses membres ACTIFS (même prédicat que crew_overview, 0071). N''est PAS la propriété crew (arbitrage 0083, voie B) — c''est une lecture agrégée, sans identité de membre.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. E39 — DÉCOUVERTE : DES FAITS, PAS UN CLASSEMENT
-- ════════════════════════════════════════════════════════════════════════════
-- p_city_id : la ville CHOISIE (ou celle du joueur si null). §E38 : « proposer
--   d'abord les crews locaux pertinents, pas un annuaire mondial ». Quand elle
--   est connue, on ne sort PAS de la ville : un annuaire européen serait à la
--   fois inutile et contraire à AMENDEMENT-35 (zéro donnée EU fabriquée — ici
--   ce ne serait pas fabriqué, mais ce serait du bruit sans pertinence).
--   Ville inconnue ET non fournie → la fonction le DIT (`reason:'no_city'`),
--   elle ne se rabat pas sur « tous les crews du monde ».
-- p_query : recherche libre sur nom/tag, insensible à la casse et aux accents
--   approximés par `ilike` (pas d'unaccent : l'extension n'est pas installée,
--   et la promettre serait mentir sur la recherche).
--
-- LE PLAFOND TECHNIQUE de 200 lignes n'est PAS une constante de jeu : il ne
-- décide de rien dans la partie, il empêche un retour non borné sur une ville
-- très peuplée. Il est écrit ici et nulle part ailleurs, exprès.
create or replace function public.crew_discovery(
  p_city_id text default null,
  p_query   text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_city    text;
  v_q       text;
  v_in_crew boolean;
  v_rows    jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_city := nullif(btrim(coalesce(p_city_id, '')), '');
  if v_city is null then
    select u.city_id into v_city from public.users u where u.id = v_uid;
  end if;
  if v_city is null then
    -- ÉTAT DISTINCT, jamais confondu avec « aucun crew » : on ne sait pas OÙ
    -- chercher. L'écran demande alors une ville (sélecteur réel), il n'invente
    -- ni Paris ni « près de chez vous ».
    return jsonb_build_object('ok', false, 'reason', 'no_city');
  end if;

  v_q := nullif(btrim(coalesce(p_query, '')), '');

  select exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.left_at is null
  ) into v_in_crew;

  with matched as (
    select c.id, c.name, c.tag, c.color, c.city_id, c.recruitment_status, c.created_at
    from public.crews c
    where c.city_id = v_city
      and (
        v_q is null
        or c.name ilike '%' || v_q || '%'
        or coalesce(c.tag, '') ilike '%' || v_q || '%'
      )
    -- Ordre TECHNIQUE (déterministe) uniquement : la pertinence se calcule
    -- côté client, sur les faits ci-dessous. `created_at` n'est pas un critère
    -- de §E39, il ne sert qu'à rendre la troncature reproductible.
    order by c.created_at asc, c.id asc
    limit 200
  ),
  fp as (
    select * from public.crew_live_footprint(array(select m.id from matched m))
  ),
  friends as (
    -- Amis À MOI déjà membres actifs du crew. Un ENTIER, jamais une liste :
    -- §12 (les membres ne voient pas les autres avant d'entrer) vaut aussi
    -- pour ce qu'on révèle de MES amitiés à l'écran de découverte.
    select cm.crew_id, count(distinct cm.user_id)::integer as n
    from public.crew_members cm
    join public.friendships f
      on f.status = 'accepted'
     and ((f.requester_id = v_uid and f.addressee_id = cm.user_id)
       or (f.addressee_id = v_uid and f.requester_id = cm.user_id))
    where cm.left_at is null
    group by cm.crew_id
  ),
  mine as (
    -- Ma candidature EN COURS, s'il y en a une (§E39 « état des demandes »).
    select ca.crew_id, ca.status
    from public.crew_applications ca
    where ca.user_id = v_uid and ca.status = 'pending'
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',                 m.id,
      'name',               m.name,
      'tag',                m.tag,
      'color',              m.color,
      'cityId',             m.city_id,
      'recruitmentStatus',  m.recruitment_status,
      'memberCount',        fp.member_count,
      'hexesHeld',          fp.hexes_held,
      'hexesRun',           fp.hexes_run,
      'hexesBike',          fp.hexes_bike,
      'lastCaptureAt',      fp.last_capture,
      'friendsInside',      coalesce(fr.n, 0),
      'myRequestPending',   (mine.crew_id is not null)
    )
    order by m.created_at asc, m.id asc
  ), '[]'::jsonb)
  into v_rows
  from matched m
  join fp on fp.crew_id = m.id
  left join friends fr on fr.crew_id = m.id
  left join mine on mine.crew_id = m.id;

  return jsonb_build_object(
    'ok', true,
    'cityId', v_city,
    'cityName', (select z.name from public.city_zones z where z.city_id = v_city),
    'viewerInCrew', v_in_crew,
    'crews', v_rows
  );
end;
$$;

comment on function public.crew_discovery(text, text) is
  'E39 — découverte RÉELLE, bornée à UNE ville (§E38 : pas d''annuaire mondial). Renvoie des FAITS (emprise vivante, effectif, amis présents, recrutement, ma candidature) ; le classement de pertinence §E39 est PUR et vit côté client. N''expose ni code de crew (secret 0036), ni identité de membre (§12), ni les colonnes dérivées jamais alimentées (activity_score/league/xp).';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. E40 — FICHE PUBLIQUE D'UN CREW
-- ════════════════════════════════════════════════════════════════════════════
-- Même discipline que la découverte, plus le rang dans la ville — calculé
-- FRAIS, jamais lu dans `crew_leaderboard` (vue matérialisée qu'aucun job du
-- dépôt ne rafraîchit : elle afficherait « 0 zone » à vie, constat 0044).
create or replace function public.crew_public_profile(p_crew_id uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew    public.crews%rowtype;
  v_fp      record;
  v_rank    integer;
  v_total   integer;
  v_friends integer;
  v_pending boolean;
  v_member  boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_crew_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_crew from public.crews c where c.id = p_crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_fp from public.crew_live_footprint(array[p_crew_id]);

  -- Rang dans la ville, à emprise ÉGALE = rang ÉGAL (ex aequo partagés, comme
  -- crew_overview). Un crew sans aucune emprise n'a pas de rang : afficher
  -- « dernier » à un crew neuf serait une humiliation calculée sur du vide.
  if v_fp.hexes_held > 0 then
    with peers as (
      select f.crew_id, f.hexes_held
      from public.crews c
      join lateral public.crew_live_footprint(array[c.id]) f on true
      where c.city_id = v_crew.city_id
    )
    select
      (select count(*) + 1 from peers p where p.hexes_held > v_fp.hexes_held),
      (select count(*) from peers p where p.hexes_held > 0)
    into v_rank, v_total;
  end if;

  select count(distinct cm.user_id)::integer into v_friends
  from public.crew_members cm
  join public.friendships f
    on f.status = 'accepted'
   and ((f.requester_id = v_uid and f.addressee_id = cm.user_id)
     or (f.addressee_id = v_uid and f.requester_id = cm.user_id))
  where cm.crew_id = p_crew_id and cm.left_at is null;

  select exists (
    select 1 from public.crew_applications ca
    where ca.crew_id = p_crew_id and ca.user_id = v_uid and ca.status = 'pending'
  ) into v_pending;

  select exists (
    select 1 from public.crew_members cm
    where cm.crew_id = p_crew_id and cm.user_id = v_uid and cm.left_at is null
  ) into v_member;

  return jsonb_build_object(
    'ok', true,
    'crew', jsonb_build_object(
      'id',                v_crew.id,
      'name',              v_crew.name,
      'tag',               v_crew.tag,
      'color',             v_crew.color,
      'cityId',            v_crew.city_id,
      'cityName',          (select z.name from public.city_zones z where z.city_id = v_crew.city_id),
      'recruitmentStatus', v_crew.recruitment_status,
      'createdAt',         v_crew.created_at,
      'memberCount',       v_fp.member_count,
      'hexesHeld',         v_fp.hexes_held,
      'hexesRun',          v_fp.hexes_run,
      'hexesBike',         v_fp.hexes_bike,
      'lastCaptureAt',     v_fp.last_capture,
      'cityRank',          v_rank,
      'crewsRanked',       v_total,
      'friendsInside',     coalesce(v_friends, 0),
      'myRequestPending',  v_pending,
      'iAmMember',         v_member
    )
  );
end;
$$;

comment on function public.crew_public_profile(uuid) is
  'E40 — fiche PUBLIQUE d''un crew : agrégats réels + rang de ville calculé frais (jamais crew_leaderboard, jamais rafraîchie). AUCUNE identité de membre, aucun message, aucun code : « aucun chat ni information privée avant adhésion » (§E40) est tenu par la forme du retour.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. REJOINDRE OU CANDIDATER — UNE SEULE PORTE, LE SERVEUR TRANCHE
-- ════════════════════════════════════════════════════════════════════════════
-- §E40 veut « REJOINDRE » ou « DEMANDER À REJOINDRE » selon le crew. Le client
-- ne doit PAS choisir lequel des deux exécuter : il montre un libellé d'après
-- `recruitmentStatus`, mais c'est le serveur qui décide de l'effet. Un client
-- désynchronisé (statut changé entre la lecture et le tap) ne peut donc pas
-- forcer une adhésion dans un crew fermé.
--
-- Refus repris À L'IDENTIQUE de `join_crew_by_code` (0043) — même vocabulaire,
-- donc mêmes messages d'erreur déjà traduits : signed_out / already_in_crew /
-- cooldown / full / closed / not_found.
create or replace function public.crew_join_intent(p_crew_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_crew         public.crews%rowtype;
  v_last_left    timestamptz;
  v_days_left    integer;
  v_active_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_crew_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_crew from public.crews c where c.id = p_crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Déjà membre actif de CE crew → succès idempotent (patron 0043).
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = p_crew_id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'effect', 'joined');
  end if;

  -- Membre d'un AUTRE crew : on refuse au lieu de le déplacer en silence. La
  -- sortie est une décision qui se prend sur l'écran Crew, pas un effet de bord
  -- d'un tap sur une fiche publique.
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.left_at is null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_crew');
  end if;

  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  -- 'closed' ET 'invite_only' (0013) : aucun chemin depuis la découverte. Un
  -- crew sur invitation garde le CODE comme seule porte — c'est le sens du mot.
  if v_crew.recruitment_status in ('closed', 'invite_only') then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  -- Verrou AVANT comptage (correctif 0042 : deux adhésions concurrentes voient
  -- chacune 49 sous READ COMMITTED et dépassent le plafond).
  perform 1 from public.crews c where c.id = p_crew_id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = p_crew_id and cm.left_at is null;
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  if v_crew.recruitment_status = 'open' then
    insert into public.crew_members (crew_id, user_id, role)
    values (p_crew_id, v_uid, 'rookie');   -- game-rules: CREW_ENTRY_ROLE
    return jsonb_build_object('ok', true, 'effect', 'joined');
  end if;

  -- 'on_request' → candidature. IDEMPOTENT : l'index partiel
  -- crew_applications_pending_unique (0011) interdit deux candidatures en cours
  -- pour la même paire ; on ne double donc jamais une demande, et re-taper
  -- renvoie le même état plutôt qu'une erreur.
  insert into public.crew_applications (crew_id, user_id)
  values (p_crew_id, v_uid)
  on conflict (crew_id, user_id) where status = 'pending' do nothing;

  return jsonb_build_object('ok', true, 'effect', 'requested');
end;
$$;

comment on function public.crew_join_intent(uuid) is
  'E40 — UNE porte d''entrée : le SERVEUR décide « rejoindre » (recrutement open) ou « candidater » (on_request), et refuse closed/invite_only. Le client n''attribue jamais une adhésion. Refus au vocabulaire de join_crew_by_code (0043).';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. LES CANDIDATURES SONT VUES ET TRANCHÉES — SINON C'EST UN BOUTON MORT
-- ════════════════════════════════════════════════════════════════════════════
-- Une candidature que personne ne peut lire ni accepter serait exactement le
-- mensonge d'interface que le dépôt s'interdit. Ces deux fonctions sont donc
-- la CONTREPARTIE OBLIGATOIRE de `crew_join_intent`.
--
-- ⚠ LA LISTE DE RÔLES CI-DESSOUS EST UNE CONSTANTE DE JEU DÉPORTÉE.
-- Sa source est `CREW_PERMISSIONS.acceptApplications` dans
-- `packages/shared/src/game-rules.ts` (= ['co_captain', 'founder']). SQL ne
-- peut pas importer TypeScript ; le dépôt règle ce genre de duplication par un
-- test de DÉRIVE plutôt que par une promesse — ici
-- `supabase/tests/crew_discovery.pglite.test.mjs`, qui lit game-rules.ts et
-- refuse que les deux listes divergent. Ne pas modifier l'une sans l'autre.
create or replace function public.crew_join_requests() returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_role    text;
  v_rows    jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- game-rules: CREW_PERMISSIONS.acceptApplications
  if v_role is null or v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- Le pseudo du candidat est révélé au SEUL décideur, et seulement pour une
  -- candidature EN COURS : sans lui, la décision porterait sur un identifiant
  -- machine. Aucune autre donnée du candidat ne sort (ni ville, ni emprise, ni
  -- historique) — on décide d'une entrée, on n'audite pas une personne.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',        ca.id,
      'pseudo',    u.pseudo,
      'message',   ca.message,
      'createdAt', ca.created_at
    ) order by ca.created_at asc
  ), '[]'::jsonb)
  into v_rows
  from public.crew_applications ca
  join public.users u on u.id = ca.user_id
  where ca.crew_id = v_crew_id
    and ca.status = 'pending'
    and u.deletion_requested_at is null;

  return jsonb_build_object('ok', true, 'requests', v_rows);
end;
$$;

create or replace function public.crew_decide_join_request(
  p_request_id uuid,
  p_accept     boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_crew_id      uuid;
  v_role         text;
  v_app          public.crew_applications%rowtype;
  v_active_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.acceptApplications
  if v_role is null or v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_app
  from public.crew_applications ca
  where ca.id = p_request_id and ca.crew_id = v_crew_id and ca.status = 'pending'
  for update;
  if not found then
    -- Déjà tranchée, retirée, ou d'un autre crew : la MÊME réponse dans les
    -- trois cas, pour ne pas transformer l'écran en oracle d'existence.
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if not coalesce(p_accept, false) then
    update public.crew_applications ca
    set status = 'rejected', decided_at = now(), decided_by = v_uid
    where ca.id = v_app.id;
    return jsonb_build_object('ok', true, 'effect', 'rejected');
  end if;

  -- Le candidat a pu, entre-temps, rejoindre ailleurs : on ne le déplace pas.
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_app.user_id and cm.left_at is null
  ) then
    update public.crew_applications ca
    set status = 'withdrawn', decided_at = now(), decided_by = v_uid
    where ca.id = v_app.id;
    return jsonb_build_object('ok', false, 'reason', 'already_in_crew');
  end if;

  perform 1 from public.crews c where c.id = v_crew_id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = v_crew_id and cm.left_at is null;
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew_id, v_app.user_id, 'rookie');   -- game-rules: CREW_ENTRY_ROLE

  update public.crew_applications ca
  set status = 'accepted', decided_at = now(), decided_by = v_uid
  where ca.id = v_app.id;

  return jsonb_build_object('ok', true, 'effect', 'accepted');
end;
$$;

comment on function public.crew_decide_join_request(uuid, boolean) is
  'Accepte/refuse une candidature. Rôle-gaté sur CREW_PERMISSIONS.acceptApplications (dérive testée en PGlite). ⚠ ANTI-P2W : accepter quelqu''un n''octroie AUCUN territoire, AUCUN point, AUCUN avantage de capture — l''entrée se fait au rôle d''essai, et le rôle ne capture pas (§E46).';

-- ════════════════════════════════════════════════════════════════════════════
-- 7. PRIVILÈGES
-- ════════════════════════════════════════════════════════════════════════════
-- ⚠ ON RÉVOQUE D'ABORD À `public`, ET C'EST LE POINT CRITIQUE. Postgres accorde
-- EXECUTE au pseudo-rôle `public` sur TOUTE fonction nouvellement créée : un
-- `revoke … from anon` seul ne retire RIEN, puisque `anon` hérite du privilège
-- par `public`. Le test PGlite de cette migration l'a attrapé en vrai (les cinq
-- RPC ressortaient exécutables par `anon` malgré leurs revoke). Sur des
-- fonctions SECURITY DEFINER, c'est la différence entre « fermé » et « ouvert au
-- monde entier » — le même piège que la révocation PUBLIC des vues du dépôt.
revoke all on function public.crew_live_footprint(uuid[])             from public, anon, authenticated;
revoke all on function public.crew_discovery(text, text)              from public, anon;
revoke all on function public.crew_public_profile(uuid)               from public, anon;
revoke all on function public.crew_join_intent(uuid)                  from public, anon;
revoke all on function public.crew_join_requests()                    from public, anon;
revoke all on function public.crew_decide_join_request(uuid, boolean) from public, anon;

grant execute on function public.crew_discovery(text, text)            to authenticated;
grant execute on function public.crew_public_profile(uuid)             to authenticated;
grant execute on function public.crew_join_intent(uuid)                to authenticated;
grant execute on function public.crew_join_requests()                  to authenticated;
grant execute on function public.crew_decide_join_request(uuid, boolean) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS (dit ici plutôt que laissé croire)
-- ════════════════════════════════════════════════════════════════════════════
-- 1. `territories.context_crew_id` N'EST ÉCRITE PAR PERSONNE. Le câblage est
--    dans `ingest_run` (territory.ts : lire le crew actif de l'auteur au moment
--    du claim et le poser ici ; son type `owner_type: 'user'` littéral reste
--    JUSTE et ne doit PAS être élargi). Hors périmètre du lot 7.
-- 2. AUCUNE NOTIFICATION de candidature. Un chef ne sait qu'il a des demandes
--    qu'en ouvrant son écran Crew. Aucune table de notification n'est câblée ;
--    promettre « vous serez prévenu » serait faux.
-- 3. LE RECRUTEMENT N'EST PAS ÉDITABLE (E51). `create_crew` laisse le défaut
--    'on_request' (0013) et aucune RPC ne change `recruitment_status` : tous
--    les crews existants passent donc par la candidature. Une fois E51 livré,
--    'open' deviendra atteignable et `crew_join_intent` le servira sans
--    modification.
-- 4. LA RECHERCHE EST LITTÉRALE (`ilike`), sans normalisation d'accents :
--    `unaccent` n'est pas installée dans le dépôt. « Crew des Épinettes » ne
--    sort pas sur « epinettes ». Dit, pas caché.
-- 5. AUCUNE MODÉRATION DE CANDIDATURE côté candidat (retrait de sa propre
--    demande) : `status = 'withdrawn'` existe en base, aucune RPC ne l'écrit
--    pour l'utilisateur lui-même.
