-- GRYD — 0093 E46 « Membres et rôles » + E47 « Actions sur un membre ».
-- LE CHEMIN SERVEUR DES QUATRE GESTES DE POUVOIR, QUI N'EXISTAIT PAS.
--
-- ═══ LE CONSTAT (28/07/2026, établi par grep, pas par mémoire) ══════════════
-- `grep 'create .*function public\.' supabase/migrations/*.sql` ne rendait
-- AUCUNE fonction de promotion, de rétrogradation, d'exclusion ni de transfert
-- de propriété. `crew_members.role` — posée par 0010, contrainte par 0013,
-- corrigée par 0043 — n'avait STRICTEMENT AUCUNE voie d'écriture ouverte au
-- client : l'INSERT/UPDATE y est révoqué depuis 0042 (§5), `crew_edit` (0084) ne
-- touche que nom/description/recrutement/tags, et `crew_decide_join_request`
-- (0083) n'écrit qu'un rôle d'ENTRÉE. Le rôle d'un membre, une fois posé, était
-- immuable à vie.
--
-- Conséquence côté écran : E47 listait quatre actions (spéc l.1684-1691) dont
-- aucune n'était exécutable. Les peindre aurait fait quatre boutons morts
-- (constitution §2) ; les taire laissait un fondateur chercher un réglage
-- inexistant. Cette migration ouvre la voie — bornée, jamais un raccourci.
--
-- ═══ CE QUE CETTE MIGRATION POSE ════════════════════════════════════════════
--   1. `crew_members.removed_by` — colonne ADDITIVE, nullable : QUI a mis fin à
--      cette adhésion. `null` = départ volontaire (tout l'historique existant).
--   2. `crew_set_member_role(uuid, text)` — promouvoir ET rétrograder.
--   3. `crew_remove_member(uuid)` — exclure.
--   4. `crew_transfer_lead(uuid)` — transférer le rôle de chef, ATOMIQUEMENT.
--   5. `leave_crew()` REMPLACÉE : le dernier chef ne part plus sans transmettre.
--   6. `join_crew_by_code(text)` et `crew_join_intent(uuid)` REMPLACÉES : une
--      EXCLUSION ne déclenche plus le cooldown anti-changement-de-crew, et un
--      crew SANS AUCUN MEMBRE ACTIF n'est plus rejoignable.
--
-- ═══ POURQUOI 5 ET 6, QUI N'ÉTAIENT PAS DEMANDÉS ════════════════════════════
-- · LE CREW ORPHELIN. `leave_crew` (0042:210) posait `left_at = now()` sans
--   regarder le rôle. Un fondateur pouvait donc partir en laissant derrière lui
--   un crew peuplé mais SANS CHEF : plus personne pour éditer, inviter, décider
--   d'une candidature ni transférer quoi que ce soit — un état définitivement
--   cassé, qu'aucune RPC n'aurait pu réparer puisque toutes exigent un rôle.
--   `canLeaveCrew` (packages/engine/src/crew.ts:424) énonçait la règle depuis
--   AMENDEMENT-16 ; elle n'était appliquée NULLE PART. Elle l'est ici.
-- · LE CREW VIDE REJOIGNABLE. Si le fondateur est le DERNIER membre, il a le
--   droit de partir (il n'abandonne personne). Mais le crew, lui, garde son
--   code : quelqu'un pouvait ensuite le rejoindre par code et y naître `rookie`
--   dans un crew sans chef — le même état cassé, par l'autre bout. Un crew sans
--   aucun membre actif est désormais refusé (`dead_crew`), sans rien détruire :
--   la ligne, l'historique et le territoire passé restent intacts.
-- · L'EXCLUSION QUI PUNIT L'EXCLU. `join_crew_by_code` (0043:155) et
--   `crew_join_intent` (0083:516) lisent `max(left_at)` pour appliquer
--   CREW_SWITCH_COOLDOWN_DAYS. Ce cooldown existe contre le NOMADISME — sauter
--   de crew en crew pour cumuler. Quelqu'un qui vient d'être EXCLU n'a sauté
--   nulle part : lui interdire de rejoindre un autre crew pendant 7 jours
--   ferait de l'exclusion une arme de blocage. `removed_by is null` filtre
--   désormais le calcul du cooldown, sans en changer la durée ni la doctrine.
--
-- ═══ ADDITIVE, ET LA BASE EST EN PRODUCTION ═════════════════════════════════
-- Aucun DROP TABLE, aucun DROP COLUMN, aucun DELETE, aucun UPDATE de données.
-- La seule DDL destructrice possible ici serait un `drop function` : il n'y en a
-- pas — `create or replace` conserve les grants existants, et les signatures de
-- `leave_crew()`, `join_crew_by_code(text)` et `crew_join_intent(uuid)` sont
-- rigoureusement identiques à celles déjà appliquées.
--
-- ═══ AUCUN NOMBRE MAGIQUE ═══════════════════════════════════════════════════
-- Les listes de rôles sont recopiées avec la mention `-- game-rules: …` comme
-- partout dans `supabase/migrations` (le SQL ne sait pas importer un module TS).
-- Le test PGlite de cette migration RELIT `packages/shared/src/game-rules.ts` et
-- compare : une divergence casse le gate, elle ne dort pas.
--
-- ═══ ANTI-PAY-TO-WIN ════════════════════════════════════════════════════════
-- Aucune de ces quatre fonctions ne touche `hex_claims`, `territories`,
-- `crews.xp`, `users.foulees` ni un quelconque score. Un rôle ouvre des ACTIONS
-- DE GESTION ; il ne donne « aucun avantage de capture » (spéc E46 l.1677).
-- Promouvoir quelqu'un ne lui donne pas un mètre carré, et exclure quelqu'un ne
-- transfère PAS son territoire au crew : ses zones restent les siennes.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. `crew_members.removed_by` — le départ subi cesse d'être confondu avec le
--    départ choisi. NULLABLE, sans défaut : tout l'historique déjà en base
--    reste « volontaire », ce qui est vrai (aucune exclusion n'a jamais eu lieu,
--    faute de fonction pour en faire une).
-- ════════════════════════════════════════════════════════════════════════════
alter table public.crew_members
  add column if not exists removed_by uuid references public.users (id) on delete set null;

comment on column public.crew_members.removed_by is
  'Auteur de l''EXCLUSION (crew_remove_member, 0093). NULL = départ volontaire — '
  'c''est le cas de tout l''historique antérieur. Lu par join_crew_by_code et '
  'crew_join_intent : une exclusion ne déclenche pas CREW_SWITCH_COOLDOWN_DAYS, '
  'qui vise le nomadisme et non la personne qu''on vient de mettre dehors.';

-- Aucun grant : la colonne suit la table (écriture client révoquée depuis 0042).

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Rang hiérarchique d'un rôle — la seule « arithmétique » du fichier.
--    Miroir EXACT de `crewRoleRank` (packages/engine/src/crew.ts:396) : index
--    dans CREW_ROLES, croissant. Un rôle inconnu rend -1, ce qui le place sous
--    tout le monde et le rend donc inoffensif comme acteur (jamais l'inverse).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_role_rank(p_role text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  -- game-rules: CREW_ROLES (ordre = rang CROISSANT, rookie=0 … founder=6)
  select coalesce(
    array_position(
      array['rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'],
      p_role
    ) - 1,
    -1
  );
$$;

comment on function public.crew_role_rank(text) is
  'Rang hiérarchique d''un rôle crew (rookie=0 … founder=6) — miroir de '
  'crewRoleRank (packages/engine/src/crew.ts). Rôle inconnu → -1 : il ne peut '
  'alors RIEN faire à personne, et tout le monde peut agir sur lui.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. `crew_set_member_role` — PROMOUVOIR et RÉTROGRADER (E47, spéc l.1685-1686)
--
-- UN SEUL POINT D'ENTRÉE POUR LES DEUX GESTES, et ce n'est pas de l'économie :
-- promouvoir et rétrograder sont la même écriture (`role := X`) sous les MÊMES
-- bornes. Deux fonctions auraient été deux endroits où oublier une borne — et
-- la borne oubliée aurait été la faille. Le SENS du geste (montée/descente) est
-- rendu à l'appelant en sortie (`effect`), il n'est pas une entrée.
--
-- LES SIX BORNES, dans l'ordre où elles sont vérifiées :
--   a. l'appelant a une SESSION ;
--   b. l'appelant est membre ACTIF d'un crew (le sien : l'index unique
--      `crew_members_one_active_per_user` (0002) en garantit un seul) ;
--   c. l'appelant a la permission `promote`/`demote` — MÊME liste de rôles dans
--      la matrice, donc une seule vérification (game-rules) ;
--   d. JAMAIS SUR SOI-MÊME. C'est la borne qui empêche l'auto-promotion, et
--      elle est vérifiée AVANT toute autre considération de rang : sans elle un
--      co_captain se nommerait co_captain… puis rien, mais un futur assouplissant
--      la borne (f) en ferait aussitôt une escalade de privilège ;
--   e. la cible est membre ACTIF DU MÊME crew (sinon `not_member` — le même
--      motif qu'un identifiant inexistant : on n'énumère pas les joueurs) ;
--   f. RANG. On ne touche pas quelqu'un de rang ≥ au sien, et on n'attribue pas
--      un rang ≥ au sien. Corollaire direct : le `founder` (rang 6) est
--      INTOUCHABLE par cette fonction, y compris par lui-même, et personne ne
--      s'auto-hisse à son niveau. Le rôle de chef ne se donne que par
--      `crew_transfer_lead`, qui l'ÉCHANGE au lieu de le dupliquer.
--   g. PLAFOND DU CO_CAPTAIN (§8.2) : CO_CAPTAIN_PROMOTE_MAX_ROLE. Il borne la
--      cible du geste ET le rôle attribué — un co_captain ne fabrique pas de
--      capitaine, et ne rétrograde pas un capitaine.
--
-- IDEMPOTENTE : réappliquer le même rôle rend `ok:true, effect:'unchanged'` et
-- n'écrit rien — `role_since` (0013, départ de l'essai rookie §8.7) n'est PAS
-- réarmé, sans quoi re-promouvoir quelqu'un prolongerait sa période d'essai.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_set_member_role(
  p_user_id uuid,
  p_role    text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_crew_id     uuid;
  v_actor_role  text;
  v_target_role text;
  v_new_role    text;
  v_actor_rank  integer;
  v_max_rank    integer;
begin
  -- (a) Session.
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- (b) Mon crew et mon rôle — lus en base, JAMAIS reçus du client.
  select cm.crew_id, cm.role into v_crew_id, v_actor_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- (c) Permission. game-rules: CREW_PERMISSIONS.promote == .demote
  if v_actor_role is null or v_actor_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- (d) Jamais sur soi. game-rules: CREW_MEMBER_ACTIONS[].onSelf === false
  if p_user_id = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  -- Rôle demandé : valide, et jamais `founder` (transfert dédié).
  -- game-rules: CREW_ROLES / canPromoteTo (newRole === 'founder' → false)
  v_new_role := btrim(coalesce(p_role, ''));
  if v_new_role not in ('rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain') then
    return jsonb_build_object('ok', false, 'reason', 'bad_role');
  end if;

  -- (e) La cible, VERROUILLÉE : deux gestes concurrents sur la même personne ne
  -- doivent pas lire le même « avant » et se croire tous deux légitimes.
  select cm.role into v_target_role
  from public.crew_members cm
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;

  -- (f) Rang : ni au-dessus de moi, ni à mon niveau. Le founder est ainsi hors
  -- d'atteinte (rang 6, personne n'a un rang supérieur).
  v_actor_rank := public.crew_role_rank(v_actor_role);
  if public.crew_role_rank(v_target_role) >= v_actor_rank then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;
  if public.crew_role_rank(v_new_role) >= v_actor_rank then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;

  -- (g) Plafond du co_captain (§8.2) — game-rules: CO_CAPTAIN_PROMOTE_MAX_ROLE
  if v_actor_role = 'co_captain' then
    v_max_rank := public.crew_role_rank('strategist');
    if public.crew_role_rank(v_target_role) > v_max_rank
       or public.crew_role_rank(v_new_role) > v_max_rank then
      return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
    end if;
  end if;

  -- IDEMPOTENCE : rien à écrire, et surtout pas `role_since`.
  if v_target_role = v_new_role then
    return jsonb_build_object(
      'ok', true, 'effect', 'unchanged', 'role', v_new_role, 'previousRole', v_target_role);
  end if;

  update public.crew_members cm
  set role = v_new_role, role_since = now()
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null;

  return jsonb_build_object(
    'ok', true,
    -- Le SENS du geste est DÉRIVÉ des rangs, jamais déclaré par l'appelant :
    -- l'écran ne peut donc pas afficher « promu » sur une rétrogradation.
    'effect', case when public.crew_role_rank(v_new_role) > public.crew_role_rank(v_target_role)
                   then 'promoted' else 'demoted' end,
    'role', v_new_role,
    'previousRole', v_target_role
  );
end;
$$;

comment on function public.crew_set_member_role(uuid, text) is
  'E47 promouvoir/rétrograder. Rôle-gaté sur CREW_PERMISSIONS.promote/.demote, '
  'jamais sur soi-même (anti auto-promotion), jamais sur ou vers un rang ≥ au '
  'sien (le founder est donc intouchable ici — voir crew_transfer_lead), plafond '
  'CO_CAPTAIN_PROMOTE_MAX_ROLE pour un co_captain. IDEMPOTENTE : le même rôle '
  'réappliqué n''écrit rien et ne réarme pas role_since. ANTI-P2W : n''octroie ni '
  'territoire, ni point, ni protection.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. `crew_remove_member` — EXCLURE (E47, spéc l.1687)
--
-- Mêmes bornes que ci-dessus, à deux différences près, et les deux comptent :
--   · le périmètre du co_captain n'est PAS le plafond de promotion mais
--     CO_CAPTAIN_KICKABLE_ROLES (§8.2) — plus étroit d'un cran : il ne peut pas
--     exclure un `strategist` qu'il pourrait pourtant nommer. Ce n'est pas une
--     incohérence : nommer se défait, exclure ne se défait pas ;
--   · l'exclusion INSCRIT SON AUTEUR (`removed_by`). C'est ce qui distingue,
--     pour toujours, « il est parti » de « on l'a mis dehors » — et c'est cette
--     distinction qui empêche le cooldown de punir l'exclu (§6).
--
-- ON NE S'EXCLUT PAS SOI-MÊME : `leave_crew` existe pour ça, et elle porte la
-- règle du dernier chef. Deux chemins pour le même geste auraient signifié une
-- règle appliquée dans un seul des deux.
--
-- IDEMPOTENTE : ré-exclure quelqu'un déjà sorti rend `ok:true,
-- effect:'already_removed'` — l'écran d'un second appareil ne verra jamais une
-- fausse erreur pour un geste qui a bel et bien abouti.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_remove_member(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_crew_id     uuid;
  v_actor_role  text;
  v_target_role text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_actor_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- game-rules: CREW_PERMISSIONS.kick
  if v_actor_role is null or v_actor_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_user_id = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  select cm.role into v_target_role
  from public.crew_members cm
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null
  for update;
  if not found then
    -- Déjà sorti DE CE CREW ⇒ le geste a abouti (idempotence). Jamais membre,
    -- ou membre d'un autre crew ⇒ `not_member`, le même motif qu'un identifiant
    -- inconnu : la RPC n'est pas un annuaire.
    if exists (
      select 1 from public.crew_members cm
      where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is not null
    ) then
      return jsonb_build_object('ok', true, 'effect', 'already_removed');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;

  -- Le chef ne s'exclut pas — jamais, par personne. `crew_role_rank('founder')`
  -- valant 6, aucun acteur n'a un rang strictement supérieur : la borne de rang
  -- ci-dessous suffirait. On le DIT quand même par un motif propre, parce qu'un
  -- `out_of_scope` générique laisserait croire à un manque de niveau alors que
  -- c'est une impossibilité de nature.
  if v_target_role = 'founder' then
    return jsonb_build_object('ok', false, 'reason', 'cannot_target_lead');
  end if;

  if public.crew_role_rank(v_target_role) >= public.crew_role_rank(v_actor_role) then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;

  -- §8.2 — game-rules: CO_CAPTAIN_KICKABLE_ROLES
  if v_actor_role = 'co_captain'
     and v_target_role not in ('rookie', 'runner', 'scout') then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;

  update public.crew_members cm
  set left_at = now(), removed_by = v_uid
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null;

  return jsonb_build_object('ok', true, 'effect', 'removed', 'previousRole', v_target_role);
end;
$$;

comment on function public.crew_remove_member(uuid) is
  'E47 exclure un membre. Rôle-gaté sur CREW_PERMISSIONS.kick, périmètre '
  'CO_CAPTAIN_KICKABLE_ROLES pour un co_captain, JAMAIS le founder, jamais '
  'soi-même (leave_crew). Inscrit removed_by : l''exclu échappe au cooldown de '
  'changement de crew, qui vise le nomadisme et non lui. IDEMPOTENTE. ANTI-P2W : '
  'exclure ne transfère AUCUN territoire — les zones de l''exclu restent les '
  'siennes.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. `crew_transfer_lead` — TRANSFÉRER LE RÔLE DE CHEF (E47, spéc l.1688)
--
-- LE GESTE LE PLUS IRRÉVERSIBLE DE L'APPLICATION : après lui, l'appelant ne
-- peut plus le défaire — c'est l'autre qui décide. L'écran DOIT donc le
-- confirmer (§« Toute action sensible affiche une conséquence claire »), mais
-- la confirmation est une politesse d'interface : la borne, elle, est ici.
--
-- ÉCHANGE, JAMAIS DUPLICATION. L'ancien chef devient `co_captain` dans la MÊME
-- transaction — il garde de quoi continuer à administrer, ce qui évite le cas
-- absurde où quelqu'un transmet par erreur et se retrouve simple membre de son
-- propre crew. Il n'y a JAMAIS deux `founder` : les deux UPDATE sont atomiques,
-- et la ligne du crew est verrouillée pour qu'aucun second transfert concurrent
-- ne s'intercale entre eux.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_transfer_lead(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_crew_id     uuid;
  v_actor_role  text;
  v_target_role text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_actor_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- game-rules: CREW_PERMISSIONS.transferFoundership === ['founder']
  if v_actor_role is distinct from 'founder' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_user_id = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  -- Verrou de crew AVANT les deux écritures : deux transferts simultanés vers
  -- deux personnes différentes créeraient sinon deux fondateurs.
  perform 1 from public.crews c where c.id = v_crew_id for update;

  select cm.role into v_target_role
  from public.crew_members cm
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;

  -- Le nouveau chef d'abord, l'ancien ensuite : à aucun instant le crew n'est
  -- sans fondateur (l'inverse laisserait une fenêtre — courte, mais réelle —
  -- où un crash entre les deux UPDATE produirait exactement l'orphelin que
  -- toute cette migration cherche à rendre impossible).
  update public.crew_members cm
  set role = 'founder', role_since = now()
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null;

  update public.crew_members cm
  set role = 'co_captain', role_since = now()   -- game-rules: CREW_ROLES
  where cm.user_id = v_uid and cm.crew_id = v_crew_id and cm.left_at is null;

  return jsonb_build_object(
    'ok', true, 'effect', 'transferred', 'previousRole', v_target_role, 'myRole', 'co_captain');
end;
$$;

comment on function public.crew_transfer_lead(uuid) is
  'E47 transférer le rôle de chef. Founder UNIQUEMENT '
  '(CREW_PERMISSIONS.transferFoundership). ÉCHANGE atomique sous verrou de crew : '
  'la cible devient founder, l''appelant devient co_captain — il n''y a jamais '
  'deux founders, ni aucun instant sans founder. IRRÉVERSIBLE par l''appelant.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. `leave_crew` — LE DERNIER CHEF NE PART PLUS SANS TRANSMETTRE
--
-- Identique à 0042:210 sur tout le reste (même signature, même `no_crew`, même
-- `left_at = now()`), avec UNE borne de plus, celle que `canLeaveCrew`
-- (packages/engine/src/crew.ts:424) énonçait sans que rien ne l'applique.
--
-- LE CAS « SEUL AU MONDE » RESTE AUTORISÉ, et c'est délibéré : un fondateur
-- seul n'abandonne personne. Le crew devient vide — et §7 le rend injoignable,
-- ce qui referme la boucle sans rien détruire.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.leave_crew()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew_id  uuid;
  v_role     text;
  v_others   integer;
  v_rowcount integer;
begin
  -- `no_crew` couvre AUSSI l'absence de session : c'est le contrat de 0042,
  -- consommé tel quel par features/crew/real.ts. On ne le change pas.
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  if v_role = 'founder' then
    -- Verrou de crew : sans lui, le dernier membre pourrait partir « en même
    -- temps » que le fondateur, et les deux se croiraient chacun non-dernier.
    perform 1 from public.crews c where c.id = v_crew_id for update;
    select count(*) into v_others
    from public.crew_members cm
    where cm.crew_id = v_crew_id and cm.left_at is null and cm.user_id <> v_uid;

    if v_others > 0 then
      -- La réponse NOMME le geste manquant : « impossible » sans le chemin
      -- serait un cul-de-sac. `crew_transfer_lead` existe, et l'écran la peint.
      return jsonb_build_object(
        'ok', false, 'reason', 'must_transfer_lead', 'membersLeftBehind', v_others);
    end if;
  end if;

  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;
  get diagnostics v_rowcount = row_count;

  if v_rowcount = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.leave_crew() is
  'Quitter SON crew. Le founder ne peut pas partir tant qu''il reste UN autre '
  'membre actif : refus `must_transfer_lead` (+ membersLeftBehind) — un crew sans '
  'chef est un état définitivement cassé (plus aucune RPC rôle-gatée n''y '
  'fonctionne). Founder DERNIER membre : autorisé, le crew devient vide et '
  'injoignable (join_crew_by_code, 0093). Applique canLeaveCrew '
  '(packages/engine/src/crew.ts), qui n''était appliqué nulle part.';

-- ════════════════════════════════════════════════════════════════════════════
-- 7. `join_crew_by_code` — UNE EXCLUSION NE PUNIT PAS, UN CREW MORT NE RECRUTE PAS
--
-- Reprise MOT POUR MOT de 0043:114 (compteur verrouillé avant plafond inclus),
-- avec exactement deux changements, tous deux justifiés plus haut :
--   · le cooldown ignore les adhésions terminées PAR AUTRUI (`removed_by is null`) ;
--   · un crew sans aucun membre actif refuse (`dead_crew`) au lieu d'accueillir
--     un rookie dans un crew sans chef.
-- Le plafond, la casse du code, l'idempotence et le motif unique `bad_code`
-- (zéro énumération de crews) sont inchangés.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.join_crew_by_code(p_code text) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code char(6);
  v_crew public.crews%rowtype;
  v_last_left timestamptz;
  v_days_left integer;
  v_active_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z0-9]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;
  select * into v_crew from public.crews c where c.code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;

  -- Idempotent : déjà membre actif de CE crew → succès sans rien changer.
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = v_crew.id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
      'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
  end if;

  -- LE COOLDOWN NE COMPTE QUE LES DÉPARTS CHOISIS (0093). `removed_by is null`
  -- est le seul ajout : CREW_SWITCH_COOLDOWN_DAYS vise celui qui saute de crew
  -- en crew, pas celui qu'on vient de mettre dehors.
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null and cm.removed_by is null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  perform 1 from public.crews c where c.id = v_crew.id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = v_crew.id and cm.left_at is null;

  -- CREW MORT (0093) : plus aucun membre actif, donc plus aucun chef. Y entrer
  -- créerait un crew peuplé que personne ne peut administrer — exactement
  -- l'orphelin que `leave_crew` refuse désormais de fabriquer par l'autre bout.
  if v_active_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'dead_crew');
  end if;

  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'rookie');   -- game-rules: CREW_ENTRY_ROLE

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
end;
$$;

comment on function public.join_crew_by_code(text) is
  'Rejoindre un crew par code. Motif UNIQUE bad_code (code mal formé = code '
  'inexistant : zéro énumération). Cooldown CREW_SWITCH_COOLDOWN_DAYS sur les '
  'seuls départs VOLONTAIRES (removed_by is null, 0093). Refuse un crew sans '
  'aucun membre actif (dead_crew) : on n''entre pas dans un crew sans chef.';

-- ════════════════════════════════════════════════════════════════════════════
-- 8. `crew_join_intent` — LE MÊME COOLDOWN, DONC LA MÊME CORRECTION
--
-- Reprise de 0083:473. Sans elle, l'exclu verrait « rejoindre » ouvert par
-- code et fermé depuis la fiche publique du même crew : deux vérités pour un
-- seul fait. Le reste (déjà membre, déjà dans un crew, plafond, statut de
-- recrutement, candidature existante) est INCHANGÉ.
-- ════════════════════════════════════════════════════════════════════════════
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
  v_pending      boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', true, 'intent', 'signed_out');
  end if;

  select * into v_crew from public.crews c where c.id = p_crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = p_crew_id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'intent', 'member');
  end if;

  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'intent', 'already_in_crew');
  end if;

  -- Même correction qu'en §7 : l'exclusion n'arme pas le cooldown.
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null and cm.removed_by is null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', true, 'intent', 'cooldown', 'daysLeft', v_days_left);
  end if;

  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = p_crew_id and cm.left_at is null;
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', true, 'intent', 'full');
  end if;

  select exists (
    select 1 from public.crew_applications ca
    where ca.crew_id = p_crew_id and ca.user_id = v_uid and ca.status = 'pending'
  ) into v_pending;
  if v_pending then
    return jsonb_build_object('ok', true, 'intent', 'pending');
  end if;

  return jsonb_build_object('ok', true, 'intent',
    case v_crew.recruitment_status
      when 'open' then 'join'
      when 'closed' then 'closed'
      when 'invite_only' then 'invite_only'
      else 'request'
    end);
end;
$$;

comment on function public.crew_join_intent(uuid) is
  'Ce que je peux RÉELLEMENT faire face à ce crew (E39/E40) — l''écran ne peint '
  'que le geste rendu ici. Cooldown calculé sur les seuls départs VOLONTAIRES '
  '(removed_by is null, 0093) : une exclusion ne bloque pas l''exclu.';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. PRIVILÈGES
--
-- ⚠ `revoke … from public` D'ABORD, et c'est le point critique (doctrine 0083
-- §7) : Postgres accorde EXECUTE au pseudo-rôle `public` sur toute fonction
-- nouvellement créée. Sur une SECURITY DEFINER qui change des rôles de crew,
-- l'oublier reviendrait à ouvrir la promotion au monde entier — `anon` compris.
--
-- `crew_role_rank` est un utilitaire de lecture pure (aucun effet, aucune
-- donnée) : il reste néanmoins fermé à `anon`, faute d'usage client.
-- ════════════════════════════════════════════════════════════════════════════
revoke all on function public.crew_role_rank(text)                from public, anon;
revoke all on function public.crew_set_member_role(uuid, text)    from public, anon;
revoke all on function public.crew_remove_member(uuid)            from public, anon;
revoke all on function public.crew_transfer_lead(uuid)            from public, anon;
revoke all on function public.leave_crew()                        from public, anon;
revoke all on function public.join_crew_by_code(text)             from public, anon;
revoke all on function public.crew_join_intent(uuid)              from public, anon;

grant execute on function public.crew_role_rank(text)             to authenticated;
grant execute on function public.crew_set_member_role(uuid, text) to authenticated;
grant execute on function public.crew_remove_member(uuid)         to authenticated;
grant execute on function public.crew_transfer_lead(uuid)         to authenticated;
grant execute on function public.leave_crew()                     to authenticated;
grant execute on function public.join_crew_by_code(text)          to authenticated;
grant execute on function public.crew_join_intent(uuid)           to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS (dit ici plutôt que laissé croire)
--
-- · AUCUNE NOTIFICATION. La personne promue, rétrogradée ou exclue ne l'apprend
--   qu'en rouvrant l'onglet Crew. `push_queue` (0033) existe, mais y écrire
--   depuis ces RPC demanderait de trancher ce qu'on notifie d'une
--   rétrogradation — une question de produit, pas de plomberie.
-- · AUCUN JOURNAL. Qui a promu qui, et quand, n'est pas conservé au-delà de
--   `role_since` (la date) et `removed_by` (l'auteur d'une exclusion). Un
--   véritable audit de modération de crew reste à écrire.
-- · AUCUNE RÉINTÉGRATION. Un exclu peut re-rejoindre par code si le crew le
--   laisse : rien ne mémorise une exclusion comme un bannissement. C'est un
--   choix par défaut, pas une garantie — le jour où un crew a besoin de tenir
--   quelqu'un dehors, il faudra une table.
-- · LE CREW VIDE N'EST PAS ARCHIVÉ. Il devient injoignable par code (§7), mais
--   sa ligne, son nom et son historique de territoire restent en base, et il
--   peut encore apparaître dans une découverte. Le nettoyer serait détruire de
--   la donnée — hors de question dans une migration.
-- ════════════════════════════════════════════════════════════════════════════
