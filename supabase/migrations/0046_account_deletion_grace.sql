-- 0046_account_deletion_grace.sql
-- GRYD — SUPPRESSION DE COMPTE DIFFÉRÉE (politique « Snapchat ») + surface de
-- revue des SIGNALEMENTS pour l'admin.
--
-- ─── Pourquoi ────────────────────────────────────────────────────────────────
-- L'existant (Edge Function delete_account, 0029) supprimait auth.users
-- IMMÉDIATEMENT : un tap malheureux effaçait tout, sans retour possible. La
-- demande fondateur est la politique du secteur : la demande rend le compte
-- INVISIBLE tout de suite, la purge RÉELLE arrive à l'échéance, et toute
-- reconnexion pendant le délai annule tout.
--
-- ─── L'invariant qui compte ──────────────────────────────────────────────────
-- Le différé N'EST PAS un soft delete éternel : ce serait une violation du
-- droit à l'effacement (RGPD art. 17). À l'échéance, `purge_due_accounts()`
-- supprime la ligne auth.users → CASCADE sur TOUT le graphe applicatif. Cette
-- fonction est ordonnancée ici même par pg_cron (`gryd_purge_accounts`). Sans
-- cet ordonnancement, le compte ne serait jamais supprimé et l'app mentirait :
-- le cron fait donc partie de la migration, pas d'un runbook.
--
-- Choix : la purge est du SQL appelé DIRECTEMENT par pg_cron, pas un http_post
-- vers une Edge Function (comme 0038/0039). Une obligation légale ne doit pas
-- dépendre du réseau, d'un secret Vault ni du déploiement d'une fonction : ici
-- un échec est une transaction qui rollback, pas une requête perdue en silence.
--
-- ─── Délai ───────────────────────────────────────────────────────────────────
-- ACCOUNT_DELETION_GRACE_DAYS (packages/shared/src/game-rules.ts) = 30 jours.
-- Aucun nombre magique : la valeur est répliquée ici en fonction immuable
-- `public.account_deletion_grace_days()` et le drift est testé côté harnais.

-- ═══ 1. Colonne d'état ═══════════════════════════════════════════════════════
-- Un seul horodatage porte tout l'état : NULL = compte vivant ; non-NULL =
-- suppression demandée à cette date, purge à +grace. On NE stocke PAS la date de
-- purge séparément (deux sources de vérité qui peuvent diverger) : elle est
-- toujours DÉRIVÉE de deletion_requested_at + grace.
alter table public.users
  add column if not exists deletion_requested_at timestamptz;

comment on column public.users.deletion_requested_at is
  'Suppression différée (0046) : NULL = compte actif. Non-NULL = invisible '
  'immédiatement, purge réelle à +account_deletion_grace_days(). Toute '
  'reconnexion (cancel_account_deletion) le remet à NULL.';

-- Index partiel : la purge ne balaie QUE les comptes en attente (jamais un
-- seq scan sur toute la table users).
create index if not exists users_deletion_pending_idx
  on public.users (deletion_requested_at)
  where deletion_requested_at is not null;

-- Miroir de la constante shared. Immuable → utilisable en index/vue si besoin.
create or replace function public.account_deletion_grace_days()
returns integer language sql immutable as $$ select 30 $$;

comment on function public.account_deletion_grace_days() is
  'Miroir SQL de ACCOUNT_DELETION_GRACE_DAYS (packages/shared/src/game-rules.ts). '
  'Toute modification doit être faite AUX DEUX ENDROITS.';

-- ═══ 2. Signalements : survivre à la suppression de leur auteur ══════════════
-- Un signalement est à la fois une donnée personnelle du RAPPORTEUR et un
-- enregistrement de MODÉRATION concernant un TIERS. Le faire disparaître avec
-- le compte de son auteur offrirait une échappatoire triviale : signaler, puis
-- supprimer son compte pour effacer la trace. On ANONYMISE donc au lieu de
-- détruire : reporter_id devient NULL, le signalement reste revu.
alter table public.content_reports
  drop constraint if exists content_reports_reporter_id_fkey;
alter table public.content_reports
  alter column reporter_id drop not null;
alter table public.content_reports
  add constraint content_reports_reporter_id_fkey
  foreign key (reporter_id) references public.users (id) on delete set null;

comment on column public.content_reports.reporter_id is
  'NULL = auteur du signalement supprimé (0046) : le signalement est anonymisé, '
  'jamais détruit — sinon supprimer son compte effacerait les signalements émis.';

-- La policy de lecture doit rester close sur un reporter_id NULL : sans le
-- `is not null`, `NULL = auth.uid()` renvoie NULL (donc faux) — mais on est
-- explicite plutôt que de dépendre de la logique ternaire.
drop policy if exists content_reports_select_own on public.content_reports;
create policy content_reports_select_own on public.content_reports
  for select to authenticated
  using (reporter_id is not null and reporter_id = (select auth.uid()));

-- ═══ 3. INVISIBILITÉ IMMÉDIATE ═══════════════════════════════════════════════
-- Les trois surfaces où un compte est exposé à AUTRUI. Filtrées à la source
-- (vue/matview/RPC) plutôt qu'écran par écran : un nouvel écran qui lit ces
-- objets hérite de l'invisibilité sans rien faire.
--
-- NB : le TERRITOIRE (hex_claims) n'est PAS libéré pendant le délai — voir §5
-- pour l'argumentaire. Il n'expose personne : la carte peint les zones par
-- RÔLE (moi/rival/contesté), jamais par identité.

-- 3a. Profil public.
drop view if exists public.public_profiles;
create view public.public_profiles as
select id, pseudo, city_id
from public.users
where deletion_requested_at is null;

revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;

-- 3b. Classement joueurs.
drop view if exists public.player_leaderboard;
create view public.player_leaderboard as
select
  ss.season_id,
  s.city_id,
  ss.user_id,
  u.pseudo,
  ss.points,
  ss.rank_cache
from public.season_scores ss
join public.seasons s on s.id = ss.season_id
join public.users u on u.id = ss.user_id
where u.deletion_requested_at is null;

revoke all on public.player_leaderboard from public, anon;
grant select on public.player_leaderboard to authenticated;

-- 3c. Classement crews — les hexes/points d'un compte en suppression ne
-- comptent plus pour son crew (sinon le crew garde un score fantôme).
drop materialized view if exists public.crew_leaderboard;
create materialized view public.crew_leaderboard as
with active_members as (
  select cm.crew_id, cm.user_id
  from public.crew_members cm
  join public.users u on u.id = cm.user_id
  where cm.left_at is null
    and u.deletion_requested_at is null
),
hexes as (
  select am.crew_id, hc.city_id, count(*)::integer as hexes_held
  from active_members am
  join public.hex_claims hc on hc.owner_user_id = am.user_id
  where hc.decay_at is null or hc.decay_at > now()
  group by am.crew_id, hc.city_id
),
points as (
  select am.crew_id, s.city_id, sum(ss.points)::integer as points_total
  from active_members am
  join public.season_scores ss on ss.user_id = am.user_id
  join public.seasons s on s.id = ss.season_id and s.status = 'active'
  group by am.crew_id, s.city_id
)
select
  c.id as crew_id,
  c.city_id,
  c.name,
  c.color,
  coalesce(h.hexes_held, 0)   as hexes_held,
  coalesce(p.points_total, 0) as points_total
from public.crews c
left join hexes  h on h.crew_id = c.id and h.city_id = c.city_id
left join points p on p.crew_id = c.id and p.city_id = c.city_id;

create unique index crew_leaderboard_crew_idx on public.crew_leaderboard (crew_id);
create index crew_leaderboard_city_idx on public.crew_leaderboard (city_id, points_total desc);

revoke all on public.crew_leaderboard from public, anon;
grant select on public.crew_leaderboard to authenticated;

-- ═══ 4. Cycle de vie de la demande ═══════════════════════════════════════════

-- État lisible par l'UI. Toujours honnête : renvoie la date de purge RÉELLE
-- (dérivée), jamais une promesse approximative.
create or replace function public.account_deletion_status()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_requested timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select deletion_requested_at into v_requested from public.users where id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'pending', v_requested is not null,
    'graceDays', public.account_deletion_grace_days(),
    'requestedAt', v_requested,
    'purgeAt',
      case when v_requested is null then null
      else v_requested + make_interval(days => public.account_deletion_grace_days())
      end
  );
end $$;

-- Demande de suppression. Idempotente : re-demander NE REPOUSSE PAS l'échéance
-- (sinon un double-tap prolongerait la conservation des données — l'inverse de
-- ce que veut l'utilisateur). La 1re demande fait foi.
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_requested timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  update public.users
     set deletion_requested_at = coalesce(deletion_requested_at, now())
   where id = v_uid
  returning deletion_requested_at into v_requested;

  if v_requested is null then
    return jsonb_build_object('ok', false, 'reason', 'no_account');
  end if;

  return jsonb_build_object(
    'ok', true,
    'pending', true,
    'graceDays', public.account_deletion_grace_days(),
    'requestedAt', v_requested,
    'purgeAt', v_requested + make_interval(days => public.account_deletion_grace_days())
  );
end $$;

-- Annulation. Appelée EXPLICITEMENT par l'app à chaque ouverture de session :
-- « toute reconnexion annule la suppression ». Renvoie `restored` pour que l'UI
-- puisse le DIRE clairement au lieu de réactiver le compte en silence.
create or replace function public.cancel_account_deletion()
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_was  timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  update public.users
     set deletion_requested_at = null
   where id = v_uid
     and deletion_requested_at is not null
  returning deletion_requested_at into v_was;

  -- `found` distingue « il y avait une suppression en cours, annulée » de
  -- « compte déjà normal » — l'UI ne doit annoncer une restauration que dans
  -- le premier cas (l'app ne ment jamais).
  return jsonb_build_object('ok', true, 'restored', found, 'pending', false);
end $$;

-- ═══ 5. LA PURGE RÉELLE ══════════════════════════════════════════════════════
-- Ce qui advient du TERRITOIRE d'un compte purgé — décision et argumentaire :
--
-- Les hex_claims sont DÉTRUITS avec le compte (CASCADE), pas transférés à un
-- propriétaire fantôme. Trois raisons :
--   1. RGPD — un hex capturé est une donnée personnelle : il dit où cette
--      personne court. Le conserver sous un compte « Anonyme » ne l'anonymise
--      pas vraiment (l'historique de captures reste un pattern de mobilité
--      ré-identifiant). Le droit à l'effacement l'emporte.
--   2. Honnêteté de jeu — un propriétaire qui n'existe plus ne défend rien.
--      Une zone tenue par un fantôme invincible serait un mensonge et gèlerait
--      la carte : personne ne pourrait jamais la reprendre.
--   3. La carte NE SE TROUE PAS : un hex sans ligne dans hex_claims est un hex
--      NEUTRE — du terrain libre, recapturable, exactement l'état correct.
--      Les agrégats secteur (refresh_sector_control) voient simplement le
--      contrôle baisser, ce qui est la vérité.
-- Ce qui SURVIT, anonymisé : les signalements émis (§2), parce qu'ils
-- concernent des tiers et que la modération ne doit pas être effaçable.
create or replace function public.purge_due_accounts()
returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_purged integer;
begin
  -- Supprimer auth.users suffit : public.users référence auth.users(id) en
  -- `on delete cascade` (0002), et TOUT le graphe applicatif (runs, hex_claims,
  -- season_scores, user_badges, crew_members, …) référence public.users(id) en
  -- cascade à son tour. Une seule instruction, atomique.
  with due as (
    select id from public.users
     where deletion_requested_at is not null
       and deletion_requested_at
           + make_interval(days => public.account_deletion_grace_days()) <= now()
  ), gone as (
    delete from auth.users a using due where a.id = due.id returning a.id
  )
  select count(*)::integer into v_purged from gone;

  return v_purged;
end $$;

comment on function public.purge_due_accounts() is
  'Purge RÉELLE et irréversible des comptes dont le délai de grâce est échu. '
  'Ordonnancée par le cron gryd_purge_accounts (quotidien 03:40 UTC). '
  'Sans cet ordonnancement le différé deviendrait un soft delete éternel = '
  'violation du droit à l''effacement.';

-- ═══ 6. Verrouillage des droits ══════════════════════════════════════════════
-- PIÈGE : PUBLIC hérite d'EXECUTE sur toute fonction nouvellement créée — il
-- faut révoquer `from public` (pas seulement anon), sinon anon garde le droit
-- par héritage. Vérifié côté harnais avec has_function_privilege.
revoke all on function public.purge_due_accounts()           from public, anon, authenticated;
revoke all on function public.account_deletion_grace_days()  from public, anon;
revoke all on function public.request_account_deletion()     from public, anon;
revoke all on function public.cancel_account_deletion()      from public, anon;
revoke all on function public.account_deletion_status()      from public, anon;

grant execute on function public.account_deletion_grace_days() to authenticated;
grant execute on function public.request_account_deletion()    to authenticated;
grant execute on function public.cancel_account_deletion()     to authenticated;
grant execute on function public.account_deletion_status()     to authenticated;
-- purge_due_accounts : service_role UNIQUEMENT (cron). Jamais un client.
grant execute on function public.purge_due_accounts() to service_role;

-- ═══ 7. Ordonnancement de la purge ═══════════════════════════════════════════
-- 03:40 UTC, après decay (03:00) et season_close (03:20) de 0039. Appel SQL
-- direct : aucune dépendance réseau/secret pour une obligation légale.
select cron.schedule(
  'gryd_purge_accounts',
  '40 3 * * *',
  $job$ select public.purge_due_accounts(); $job$
);

-- ═══ 8. SIGNALEMENTS : surface de revue admin ════════════════════════════════
-- Constat de l'audit : content_reports (0029) recevait bien les signalements
-- côté base, mais AUCUNE surface ne les exposait — la console /admin affichait
-- un compteur « Signalements : 5 » codé en dur dans demo-data.ts. Un
-- signalement n'atteignait donc personne. On expose ici la file réelle.
--
-- Service-role UNIQUEMENT : la revue est une action d'administration, jamais
-- une lecture client (anti-shame : aucun compteur public de signalements).
create or replace function public.admin_reports_queue(p_limit integer default 200)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok', true,
    'reports', coalesce(jsonb_agg(to_jsonb(r) order by r.pending_first, r.created_at desc), '[]'::jsonb)
  )
  from (
    select
      cr.id,
      cr.kind,
      cr.target_id,
      cr.author,
      cr.reason,
      cr.status,
      cr.created_at,
      -- Pseudo du rapporteur, ou NULL si son compte a été supprimé (§2) ou est
      -- en cours de suppression. On ne fabrique jamais « Anonyme » : NULL dit
      -- la vérité (« compte supprimé »), l'UI l'affiche comme tel.
      u.pseudo as reporter_pseudo,
      -- Les `pending` d'abord : la file de revue sous 24 h est ce qui compte.
      case when cr.status = 'pending' then 0 else 1 end as pending_first
    from public.content_reports cr
    left join public.users u on u.id = cr.reporter_id
    order by pending_first, cr.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
  ) r;
$$;

-- Compteurs de la file (le dashboard admin doit afficher un VRAI nombre).
create or replace function public.admin_reports_counts()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok', true,
    'pending',  count(*) filter (where status = 'pending'),
    'reviewed', count(*) filter (where status = 'reviewed'),
    'actioned', count(*) filter (where status = 'actioned'),
    'dismissed',count(*) filter (where status = 'dismissed'),
    'total',    count(*)
  )
  from public.content_reports;
$$;

-- Statuer sur un signalement (pending → reviewed/actioned/dismissed).
create or replace function public.admin_resolve_report(p_id uuid, p_status text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_status not in ('reviewed', 'actioned', 'dismissed') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;

  update public.content_reports set status = p_status where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end $$;

revoke all on function public.admin_reports_queue(integer)     from public, anon, authenticated;
revoke all on function public.admin_reports_counts()           from public, anon, authenticated;
revoke all on function public.admin_resolve_report(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_reports_queue(integer)     to service_role;
grant execute on function public.admin_reports_counts()           to service_role;
grant execute on function public.admin_resolve_report(uuid, text) to service_role;

-- ═══ 9. crew_overview() : appliquer l'invisibilité au ROSTER ═════════════════
-- Redéfinition de la fonction de 0044, identique À DEUX FILTRES PRÈS (marqués
-- « 0046 » dans le corps) : un membre dont le compte est en cours de suppression
-- disparaît du roster ET cesse de compter dans le rang de ville du crew.
-- Sans ce patch, la card Crew continuerait d'afficher le pseudo d'un compte
-- censé être invisible — le trou le plus visible de l'invisibilité.

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
    join public.users u on u.id = cm.user_id
    where cm.crew_id = v_crew.id
      and cm.left_at is null
      -- 0046 : un compte en cours de suppression est INVISIBLE immédiatement.
      -- Filtré ici (source) et non à l'écran : tout appelant en hérite.
      and u.deletion_requested_at is null
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
      join public.users u on u.id = cm.user_id
      join public.hex_claims hc
        on hc.owner_user_id = cm.user_id
       and (hc.decay_at is null or hc.decay_at > now())
      where cm.left_at is null
        and u.deletion_requested_at is null   -- 0046 : invisibilité immédiate
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
