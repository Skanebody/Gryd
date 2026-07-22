-- 0064_offensive_lifecycle.sql
-- GRYD — §38 Offensives crew : le CYCLE DE VIE qui manquait (naissance + mort).
--
-- ═══ CE QUI EXISTAIT (0010) ═════════════════════════════════════════════════
--   · table `offensives`      : théâtre (center_h3 res 7 + radius_km), objectif
--                               chiffré, fenêtre, status preparation/active/done,
--                               result victory/partial/fail ;
--   · `offensive_contributions` : hexes pris par membre — ALIMENTÉE EN PRODUCTION
--                               par ingest_run (§38, coefficient crew_mission ×1,1) ;
--   · TODO(V1) l.214          : « create_offensive » — jamais écrit.
--
-- ═══ LES TROIS TROUS QUE CETTE MIGRATION FERME ══════════════════════════════
--   1. AUCUN ÉCRIVAIN  : zéro insert dans tout le repo. La table restait vide à
--                        jamais, donc toute la machinerie tournait à vide.
--   2. AUCUNE CLÔTURE  : `offensives` n'apparaissait dans AUCUN job. Rien ne
--                        passait 'active' → 'done', rien ne calculait `result`.
--   3. CONSÉQUENCE     : ingest_run câble `offensivesCompleted: 0` en dur, donc
--                        les 200 XP crew ne tombent jamais et la famille de
--                        badges Raid Leader / la skill Strategist (métrique
--                        `offensivesJoined`) sont INATTEIGNABLES.
--
-- ═══ CE QUE CETTE MIGRATION N'EST PAS ═══════════════════════════════════════
-- Pas de guerre instanciée : une offensive reste un OBJECTIF DE TERRITOIRE du
-- crew (aucun opponent_crew_id, aucun roster, aucun rating, aucun matchmaking).
-- Aucune donnée n'est fabriquée : sur une base à 0 crew et 0 hex_claim, tout ce
-- qui suit est un no-op silencieux, et c'est la réponse HONNÊTE.
--
-- ═══ ANTI PAY-TO-WIN ════════════════════════════════════════════════════════
-- Aucune fonction ci-dessous ne lit `subscriptions`, un flag premium ou quoi que
-- ce soit de payant. Lancer une offensive dépend du RÔLE crew, la gagner dépend
-- des hexes RÉELLEMENT pris. Un abonnement n'ouvre, ne prolonge, n'agrandit et
-- ne protège aucune offensive.
--
-- ═══ RÈGLE D'IDEMPOTENCE (contrat pour le job de clôture) ═══════════════════
-- La clôture se fait en DEUX transitions atomiques et REPRENABLES :
--   A. `claim_offensive_close(id)` : 'active'|'preparation' → 'done' + closed_at
--      + hexes_taken figé, SOUS VERROU DE LIGNE, avec la garde `status <> 'done'`.
--      Le gagnant de la course reçoit claimed=true ; tout autre appel reçoit
--      claimed=false et NE DOIT RIEN CRÉDITER. `result` reste NULL.
--      Une fois 'done', ingest_run cesse d'écrire des contributions (il ne lit
--      que status='active') → `hexes_taken` est définitif.
--   B. `finalize_offensive(id, ...)` : écrit `result` + crédite, avec la garde
--      `result IS NULL`. Un crash entre A et B laisse l'offensive 'done' /
--      result NULL — le passage de cron SUIVANT la reprend et finalise.
--      AUCUN double crédit possible : le crédit est porté par la même
--      transaction que le passage de `result` de NULL à non-NULL.
-- Conséquence : le job de clôture est rejouable à volonté, dans n'importe quel
-- ordre, sans jamais créditer deux fois ni clôturer deux fois.

-- ═══ 1. offensives : colonnes de cycle de vie ═══════════════════════════════
alter table public.offensives
  -- Horodatage de la transition preparation → active (null = jamais activée).
  add column if not exists activated_at timestamptz,
  -- Horodatage de la clôture (transition A). Non-null ⇔ status = 'done'.
  add column if not exists closed_at    timestamptz,
  -- Hexes pris dans le théâtre, FIGÉS à la clôture (somme des contributions).
  add column if not exists hexes_taken  int,
  -- XP crew effectivement créditée (transition B). Trace honnête du crédit.
  add column if not exists xp_awarded   int,
  -- Horodatage de la finalisation (transition B). Non-null ⇔ result non-null.
  add column if not exists finalized_at timestamptz;

-- Normalisation défensive AVANT contraintes (la table est vide en prod : 0 crew,
-- donc 0 offensive — ceci protège un environnement de dev historique).
update public.offensives
   set closed_at = coalesce(closed_at, ends_at)
 where status = 'done' and closed_at is null;
update public.offensives
   set status = 'done', closed_at = coalesce(closed_at, ends_at)
 where result is not null and status <> 'done';

alter table public.offensives
  drop constraint if exists offensives_closed_consistency;
alter table public.offensives
  add constraint offensives_closed_consistency
  check ((status = 'done') = (closed_at is not null));

-- `result` n'existe que sur une offensive clôturée, et jamais sans horodatage
-- de finalisation : c'est la garde qui rend le double crédit impossible.
alter table public.offensives
  drop constraint if exists offensives_result_consistency;
alter table public.offensives
  add constraint offensives_result_consistency
  check (
    (result is null and finalized_at is null and xp_awarded is null)
    or (result is not null and finalized_at is not null and status = 'done')
  );

alter table public.offensives
  drop constraint if exists offensives_hexes_taken_positive;
alter table public.offensives
  add constraint offensives_hexes_taken_positive
  check (hexes_taken is null or hexes_taken >= 0);

alter table public.offensives
  drop constraint if exists offensives_xp_awarded_positive;
alter table public.offensives
  add constraint offensives_xp_awarded_positive
  check (xp_awarded is null or xp_awarded >= 0);

-- ═══ 2. Index de travail du job ═════════════════════════════════════════════
-- Offensives à activer ou à clôturer : le job balaye ces deux prédicats à
-- chaque passage. Partiels (`status <> 'done'` est immuable) → l'historique
-- clôturé ne pèse jamais sur le balayage.
create index if not exists offensives_pending_close_idx
  on public.offensives (ends_at)
  where status <> 'done';

create index if not exists offensives_pending_activate_idx
  on public.offensives (starts_at)
  where status = 'preparation';

-- Offensives clôturées mais JAMAIS finalisées (reprise après crash entre A et B).
create index if not exists offensives_pending_finalize_idx
  on public.offensives (closed_at)
  where status = 'done' and result is null;

-- Garde-fou anti-spam (OFFENSIVE_MAX_ACTIVE_PER_CREW) : compter les offensives
-- ouvertes d'un crew doit être instantané ET verrouillable.
create index if not exists offensives_crew_open_idx
  on public.offensives (crew_id)
  where status <> 'done';

-- `offensive_contributions` est indexée par sa PK (offensive_id, user_id) :
-- aucun index sur user_id seul → « combien d'offensives ce joueur a-t-il
-- rejointes » était un seq scan. C'est la lecture de la métrique Raid Leader.
create index if not exists offensive_contributions_user_idx
  on public.offensive_contributions (user_id);

-- ═══ 3. create_offensive : L'ÉCRIVAIN QUI N'EXISTAIT PAS ════════════════════
-- Le TODO(V1) de 0010. Pourquoi une RPC et pas un simple insert côté Edge
-- Function : l'appartenance au crew, le rôle et le plafond d'offensives
-- ouvertes doivent être évalués SOUS VERROU, sinon deux requêtes simultanées
-- passent toutes les deux le plafond.
--
-- AUCUN NOMBRE MAGIQUE : le plafond (`p_max_open`) et les rôles autorisés
-- (`p_allowed_roles`) sont PASSÉS par l'appelant, qui les lit dans game-rules
-- (OFFENSIVE_MAX_ACTIVE_PER_CREW / CREW_PERMISSIONS.launchOffensive) — même
-- motif que `add_crew_xp(p_xp_table)` en 0010. Les bornes de forme (rayon,
-- objectif, durée, libellé) sont jugées par le moteur PUR validateOffensiveDraft
-- côté serveur AVANT l'appel, et doublées par les CHECK de la table.
--
-- Retour JSONB (jamais RETURNS TABLE : les noms de colonnes de sortie entrent
-- en collision avec les colonnes réelles dans le corps) :
--   {"offensive_id": uuid|null, "rejected": text|null}
-- `rejected` ∈ {not_member, forbidden_role, too_many_open} — mêmes mots que
-- OffensiveRejectReason côté moteur, pour que l'UI n'invente pas de message.
create or replace function public.create_offensive(
  p_crew_id        uuid,
  p_user_id        uuid,
  p_zone_label     text,
  p_center_h3      bigint,
  p_radius_km      numeric,
  p_objectif_hexes int,
  p_starts_at      timestamptz,
  p_ends_at        timestamptz,
  p_max_open       int,
  p_allowed_roles  text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_open int;
  v_id   uuid;
begin
  -- Sérialise les créations concurrentes DU MÊME CREW sans verrouiller la ligne
  -- `crews` (que add_crew_xp verrouille à chaque course : on ne veut pas qu'un
  -- War Room bloque une ingestion de run).
  perform pg_advisory_xact_lock(hashtextextended(p_crew_id::text, 0));

  -- Le crew existe-t-il, et le demandeur en est-il membre ACTIF ?
  select cm.role into v_role
  from public.crew_members cm
  where cm.crew_id = p_crew_id
    and cm.user_id = p_user_id
    and cm.left_at is null;

  if not found then
    return jsonb_build_object('offensive_id', null, 'rejected', 'not_member');
  end if;

  if not (v_role = any (p_allowed_roles)) then
    return jsonb_build_object('offensive_id', null, 'rejected', 'forbidden_role');
  end if;

  -- Plafond anti-spam, compté sous le verrou consultatif ci-dessus.
  select count(*) into v_open
  from public.offensives o
  where o.crew_id = p_crew_id and o.status <> 'done';

  if v_open >= greatest(0, coalesce(p_max_open, 0)) then
    return jsonb_build_object('offensive_id', null, 'rejected', 'too_many_open');
  end if;

  -- status : 'active' si la fenêtre est déjà ouverte, sinon 'preparation'
  -- (le job d'activation la reprendra). Miroir SQL de offensiveStatusAt().
  insert into public.offensives (
    crew_id, zone_label, center_h3, radius_km, objectif_hexes,
    starts_at, ends_at, status, activated_at, created_by
  ) values (
    p_crew_id, p_zone_label, p_center_h3, p_radius_km, p_objectif_hexes,
    p_starts_at, p_ends_at,
    case when p_starts_at <= now() then 'active' else 'preparation' end,
    case when p_starts_at <= now() then now() else null end,
    p_user_id
  )
  returning id into v_id;

  return jsonb_build_object('offensive_id', v_id, 'rejected', null);
end;
$$;

revoke all on function public.create_offensive(
  uuid, uuid, text, bigint, numeric, int, timestamptz, timestamptz, int, text[]
) from public, anon, authenticated;

-- ═══ 4. activate_due_offensives : preparation → active ══════════════════════
-- Idempotent par construction (ne touche QUE `status = 'preparation'`).
-- Une offensive dont la fenêtre est déjà close n'est PAS activée : le job la
-- clôturera directement (une offensive née pendant une panne ne doit pas
-- s'ouvrir rétroactivement sur une fenêtre déjà expirée).
-- Retour JSONB : {"activated": [uuid, …]} (tableau vide si rien à faire).
create or replace function public.activate_due_offensives()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with moved as (
    update public.offensives o
       set status = 'active', activated_at = now()
     where o.status = 'preparation'
       and o.starts_at <= now()
       and o.ends_at   >  now()
    returning o.id
  )
  select jsonb_build_object('activated', coalesce(jsonb_agg(moved.id), '[]'::jsonb))
  from moved;
$$;

revoke all on function public.activate_due_offensives() from public, anon, authenticated;

-- ═══ 5. claim_offensive_close : transition A (fige, ne crédite RIEN) ════════
-- Passe l'offensive à 'done' et FIGE `hexes_taken` (somme des contributions)
-- sous verrou de ligne. `result` reste NULL — le jugement est rendu par le
-- moteur PUR offensiveResult(), pas en SQL (une seule source de vérité).
--
-- claimed = false ⇒ un autre appel a déjà clôturé : L'APPELANT NE CRÉDITE RIEN.
-- Retour JSONB :
--   {"claimed": bool, "crew_id": uuid|null, "hexes_taken": int|null,
--    "objectif_hexes": int|null, "found": bool}
create or replace function public.claim_offensive_close(p_offensive_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_crew   uuid;
  v_obj    int;
  v_hexes  int;
begin
  select o.status, o.crew_id, o.objectif_hexes, o.hexes_taken
    into v_status, v_crew, v_obj, v_hexes
  from public.offensives o
  where o.id = p_offensive_id
  for update;

  if not found then
    return jsonb_build_object('found', false, 'claimed', false);
  end if;

  if v_status = 'done' then
    -- Déjà clôturée : on renvoie l'état FIGÉ (le job peut avoir à finaliser),
    -- mais claimed = false interdit tout nouveau crédit.
    return jsonb_build_object(
      'found', true, 'claimed', false, 'crew_id', v_crew,
      'hexes_taken', v_hexes, 'objectif_hexes', v_obj
    );
  end if;

  select coalesce(sum(oc.hexes), 0)::int into v_hexes
  from public.offensive_contributions oc
  where oc.offensive_id = p_offensive_id;

  update public.offensives o
     set status = 'done', closed_at = now(), hexes_taken = v_hexes
   where o.id = p_offensive_id;

  return jsonb_build_object(
    'found', true, 'claimed', true, 'crew_id', v_crew,
    'hexes_taken', v_hexes, 'objectif_hexes', v_obj
  );
end;
$$;

revoke all on function public.claim_offensive_close(uuid) from public, anon, authenticated;

-- ═══ 6. finalize_offensive : transition B (juge écrit + crédit UNIQUE) ══════
-- Écrit `result` et crédite, DANS LA MÊME TRANSACTION, sous la garde
-- `result IS NULL`. C'est le point d'idempotence du crédit.
--
-- AUCUN NOMBRE MAGIQUE : p_crew_xp / p_chest_delta viennent de offensiveAward()
-- (CREW_XP_SOURCES.offensiveCompleted × OFFENSIVE_RESULT_AWARD_FACTOR),
-- p_xp_table de CREW_XP_TABLE, p_joined_user_ids de joinedContributors()
-- (seuil OFFENSIVE_JOINED_MIN_HEXES). Cette fonction n'invente aucun barème.
--
-- Le crédit d'XP crew NE PASSE PAS par crew_xp_daily : il est COLLECTIF (imputé
-- à aucun membre), donc il ne contourne pas le plafond anti-farm individuel
-- CREW_XP_DAILY_CAP_PER_MEMBER, qui ne concerne que la contribution d'un membre.
create or replace function public.finalize_offensive(
  p_offensive_id   uuid,
  p_result         text,
  p_crew_xp        int,
  p_chest_delta    int,
  p_xp_table       bigint[],
  p_week_start     date,
  p_joined_user_ids uuid[]
)
-- Retour JSONB :
--   {"finalized": bool, "level_from": int|null, "level_to": int|null, "joined": int}
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_crew   uuid;
  v_result text;
  v_from   int;
  v_to     int;
  v_joined int := 0;
begin
  select o.crew_id, o.result into v_crew, v_result
  from public.offensives o
  where o.id = p_offensive_id and o.status = 'done'
  for update;

  if not found or v_result is not null then
    -- Inconnue, pas encore clôturée, ou DÉJÀ finalisée → aucun crédit.
    return jsonb_build_object('finalized', false, 'joined', 0);
  end if;

  update public.offensives o
     set result = p_result,
         finalized_at = now(),
         xp_awarded = greatest(0, coalesce(p_crew_xp, 0))
   where o.id = p_offensive_id;

  -- XP crew (recalcul du niveau depuis la table passée) — 0 XP sur un échec.
  if coalesce(p_crew_xp, 0) > 0 then
    select a.level_from, a.level_to into v_from, v_to
    from public.add_crew_xp(v_crew, p_crew_xp::bigint, p_xp_table) a;
  end if;

  -- Coffre de la semaine (§39) : progression collective, jamais un palier offert.
  if coalesce(p_chest_delta, 0) > 0 then
    insert into public.crew_chests (crew_id, week_start, progress)
    values (v_crew, p_week_start, p_chest_delta)
    on conflict (crew_id, week_start)
    do update set progress = public.crew_chests.progress + excluded.progress;
  end if;

  -- Métrique `offensivesJoined` (badges Raid Leader, skill Strategist) :
  -- +1 par contributeur RÉEL. La ligne user_stats est créée si absente — sans
  -- elle, le compteur mentirait par omission.
  if p_joined_user_ids is not null and array_length(p_joined_user_ids, 1) > 0 then
    -- DISTINCT obligatoire : « ON CONFLICT DO UPDATE ne peut pas affecter deux
    -- fois la même ligne » — un doublon dans le tableau ferait échouer la
    -- transaction ENTIÈRE, donc annulerait la finalisation.
    with joined_users as (
      select distinct u
      from unnest(p_joined_user_ids) as u
      where u in (select id from public.users)
    ),
    upserted as (
      insert into public.user_stats (user_id, offensives_joined)
      select u, 1 from joined_users
      on conflict (user_id)
      do update set offensives_joined = public.user_stats.offensives_joined + 1
      returning 1
    )
    select count(*)::int into v_joined from upserted;
  end if;

  return jsonb_build_object(
    'finalized', true, 'level_from', v_from, 'level_to', v_to, 'joined', v_joined
  );
end;
$$;

revoke all on function public.finalize_offensive(
  uuid, text, int, int, bigint[], date, uuid[]
) from public, anon, authenticated;

-- ═══ 7. CRON : le job de clôture (motif 0038/0039) ══════════════════════════
-- Edge Function attendue : `close_offensives` (activation + clôture + finalisation).
-- Cadence */10 : une offensive dure au minimum OFFENSIVE_MIN_DURATION_H = 6 h ;
-- une latence ≤ 10 min sur l'ouverture et la fermeture est invisible à l'échelle
-- du jeu, et évite qu'un « il reste 0 min » s'éternise à l'écran.
-- Secret jamais dans le repo : lu depuis Vault (`gryd_cron_secret`, seedé hors
-- migration, comme 0038/0039).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'gryd_close_offensives',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url := 'https://sydwxwwirinjoheeodcg.supabase.co/functions/v1/close_offensives',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gryd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
