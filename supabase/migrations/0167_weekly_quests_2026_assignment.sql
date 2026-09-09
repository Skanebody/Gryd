-- Défis de la semaine, 3/5 — ATTRIBUTION, CONDITIONS, OCTROI D'OBJET.
-- Requiert 0119 (registre sportif), 0165 (catalogue) et 0166 (faits de boucle).
--
-- ─── LE SERVEUR DÉCIDE, LE CLIENT LIT ───────────────────────────────────────
-- Aucune de ces fonctions n'accepte une déclaration : il n'existe pas de RPC
-- « j'ai réussi ». Une condition est vraie parce que le serveur retrouve, dans
-- SES tables, un fait qu'il a lui-même écrit :
--   · un `capture_events_2026` au statut `published` (0118) ;
--   · une journée admissible du registre `progress_accounts_2026.ledger`, qui
--     n'est écrit que par `commit_progress_2026` (0119/0121/0144) ;
--   · un rendez-vous `crew_events` réellement commencé, avec ses RSVP (0019,
--     0085, 0124).
-- Un client peut au mieux DEMANDER une réévaluation de son propre compte, par
-- la lecture de 0168. Il ne peut ni s'assigner un défi, ni le clore, ni
-- s'octroyer un objet — les tables lui sont fermées et les fonctions révoquées.
--
-- ─── L'EXPIRATION EST SILENCIEUSE ───────────────────────────────────────────
-- `expires_at` n'est jamais renvoyé à un client (voir 0168) : aucun compte à
-- rebours ne peut être peint à partir de cette lecture, et aucune notification
-- ne part d'ici. §4.2 : « Pas d'alarme *tu perds tout* ni de compte à rebours
-- poussant à sortir immédiatement. »

-- ── 1. Les assignations ─────────────────────────────────────────────────────
create table public.weekly_quest_assignments_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  activity text not null check(activity in('run','bike')),
  quest_id text not null references public.weekly_quests_2026(quest_id),
  -- La version REÇUE. Modifier le catalogue ne déplace pas la ligne d'arrivée
  -- d'une semaine déjà commencée.
  quest_version integer not null check(quest_version>0),
  -- Recopié du catalogue à l'attribution : c'est une propriété de la VERSION
  -- reçue, et c'est ce qui rend l'unicité ci-dessous vérifiable par un index.
  cross_discipline boolean not null,
  status text not null default 'active' check(status in('active','completed','expired')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(user_id,week_start,activity,quest_id),
  check((status='completed')=(completed_at is not null))
);
-- Un défi TRANSVERSE (journées actives, double pratique) mesure exactement la
-- même chose dans les deux disciplines : le proposer deux fois serait deux
-- cartes pour un seul effort. Un défi de discipline, lui, décrit deux
-- objectifs différents — « une boucle ailleurs en courant » n'est pas « une
-- boucle ailleurs à vélo » — et peut donc habiter les deux onglets.
create unique index weekly_quest_one_cross_discipline_per_week_2026
  on public.weekly_quest_assignments_2026(user_id,week_start,quest_id) where cross_discipline;
create index weekly_quest_assignments_open_2026
  on public.weekly_quest_assignments_2026(user_id,week_start) where status='active';

-- ── 2. La possession d'un objet, et son équipement ──────────────────────────
-- Permanente (§7.5). Un objet gagné n'est jamais retiré : ni une correction de
-- source, ni la fin d'un abonnement, ni l'expiration d'un autre défi ne peut le
-- reprendre. `quest_id`/`week_start` gardent la PROVENANCE — de quoi expliquer
-- un objet un an plus tard sans avoir à deviner.
create table public.weekly_quest_reward_ownership_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id text not null references public.weekly_quest_reward_templates_2026(reward_id),
  quest_id text not null references public.weekly_quests_2026(quest_id),
  week_start date not null,
  earned_at timestamptz not null default now(),
  primary key(user_id,reward_id)
);
-- Un seul objet porté par emplacement : la clé primaire (user_id,slot) rend
-- structurellement impossible d'en afficher deux.
create table public.weekly_quest_reward_equipment_2026 (
  user_id uuid not null,
  slot text not null check(slot in ('sticker','trace','emblem','poster','composition')),
  reward_id text not null,
  equipped_at timestamptz not null default now(),
  primary key(user_id,slot),
  foreign key(user_id,reward_id)
    references public.weekly_quest_reward_ownership_2026(user_id,reward_id) on delete cascade
);

alter table public.weekly_quest_assignments_2026 enable row level security;
alter table public.weekly_quest_reward_ownership_2026 enable row level security;
alter table public.weekly_quest_reward_equipment_2026 enable row level security;
revoke all on public.weekly_quest_assignments_2026,public.weekly_quest_reward_ownership_2026,
  public.weekly_quest_reward_equipment_2026 from public,anon,authenticated;
grant all on public.weekly_quest_assignments_2026,public.weekly_quest_reward_ownership_2026,
  public.weekly_quest_reward_equipment_2026 to service_role;
-- Plancher explicite, même sans `grant` : une ligne n'appartient qu'à son
-- compte. Toute ouverture future part de « rien », pas de « tout ».
create policy weekly_quest_assignments_own_2026 on public.weekly_quest_assignments_2026
  for select to authenticated using(user_id=auth.uid());
create policy weekly_quest_ownership_own_2026 on public.weekly_quest_reward_ownership_2026
  for select to authenticated using(user_id=auth.uid());
create policy weekly_quest_equipment_own_2026 on public.weekly_quest_reward_equipment_2026
  for select to authenticated using(user_id=auth.uid());

-- ── 3. Les journées admissibles de la semaine, par sport ────────────────────
-- Le registre (`ledger`) est la SEULE source d'une journée : ce fichier ne
-- recalcule pas l'admissibilité, il la lit. La discipline vient de la preuve
-- sportive elle-même (`progress_activity_2026.evidence`), jamais d'un champ
-- déclaré par l'application.
--
-- ⚠️ Le `day` du registre est une date CIVILE dans le fuseau de progression du
-- compte ; la semaine du défi est civile dans `Europe/Paris`. Pour un compte
-- qui voyage, une journée peut donc tomber d'un côté ou de l'autre d'une
-- frontière de semaine. C'est assumé et documenté : deux dates civiles se
-- comparent, on n'invente pas un troisième calendrier.
create function public.weekly_quest_active_days_2026(p_user_id uuid,p_week_start date)
returns table(day date,has_run boolean,has_bike boolean)
language sql stable security definer set search_path=public,pg_temp as $$
  select (d->>'day')::date,
         coalesce(bool_or(e.evidence->>'sport'='run'),false),
         coalesce(bool_or(e.evidence->>'sport'='bike'),false)
    from public.progress_accounts_2026 p
    cross join lateral jsonb_array_elements(coalesce(p.ledger->'days','[]'::jsonb)) d
    left join lateral jsonb_array_elements_text(coalesce(d->'activityIds','[]'::jsonb)) a on true
    left join public.progress_activity_2026 e on e.user_id=p.user_id and e.run_id::text=a
   where p.user_id=p_user_id
     and coalesce((d->>'eligible')::boolean,false)
     and (d->>'day')::date>=p_week_start and (d->>'day')::date<p_week_start+7
   group by 1;
$$;

-- ── 4. Une condition, six implémentations, aucune déclaration ───────────────
create function public.weekly_quest_satisfied_2026(p_user_id uuid,p_activity text,p_week_start date,p_quest_id text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare q public.weekly_quests_2026; rule public.weekly_quest_rules_2026;
  ws timestamptz; we timestamptz; wx timestamptz;
begin
  select * into q from public.weekly_quests_2026 where quest_id=p_quest_id;
  if not found then return false; end if;
  select * into strict rule from public.weekly_quest_rules_2026;
  select b.starts_at,b.ends_at,b.expires_at into ws,we,wx from public.weekly_quest_week_bounds_2026(p_week_start) b;
  case q.condition
    -- « Une boucle dans un secteur où tu n'en avais jamais fermé. » L'histoire
    -- est lue TOUTES disciplines confondues : un endroit où l'on est déjà passé
    -- reste un endroit où l'on est déjà passé. Seuls les événements PUBLIÉS
    -- comptent — une sortie privée ne se trahit pas par un défi.
    when 'new_locality' then
      return exists(
        select 1 from public.weekly_quest_faces_2026 f
        join public.capture_events_2026 e on e.id=f.event_id and e.status='published'
        where f.owner_id=p_user_id and f.activity=p_activity
          and f.closed_at>=ws and f.closed_at<we
          and not exists(
            select 1 from public.weekly_quest_faces_2026 old
            join public.capture_events_2026 oe on oe.id=old.event_id and oe.status='published'
            where old.owner_id=p_user_id and old.locality=f.locality and old.closed_at<ws));
    -- « Deux boucles distinctes cette semaine », au sens de la déduplication
    -- du §7.4 : refaire deux fois la même boucle ne compte que pour une.
    when 'distinct_loops' then
      return (select count(distinct f.signature) from public.weekly_quest_faces_2026 f
        join public.capture_events_2026 e on e.id=f.event_id and e.status='published'
        where f.owner_id=p_user_id and f.activity=p_activity
          and f.closed_at>=ws and f.closed_at<we)>=q.threshold;
    -- « Une sortie de groupe consentie et validée. » Consentie : j'ai répondu
    -- « je viens » AVANT le départ, de ma propre main. Validée : le rendez-vous
    -- a réellement commencé, il n'a pas été annulé, au moins deux membres du
    -- crew y allaient dont un autre que l'organisateur, et j'ai enregistré une
    -- activité de la bonne discipline autour de l'heure annoncée.
    when 'validated_group_outing' then
      return exists(
        select 1 from public.crew_events ev
        join public.crew_event_rsvps mine on mine.event_id=ev.id and mine.user_id=p_user_id and mine.choice='coming'
        where ev.activity=p_activity and ev.cancelled_at_2026 is null and ev.starts_at is not null
          and ev.starts_at>=ws and ev.starts_at<we and ev.starts_at<=now() and mine.updated_at<=ev.starts_at
          and (select count(distinct r.user_id) from public.crew_event_rsvps r
               join public.crew_members m on m.user_id=r.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where r.event_id=ev.id and r.choice='coming')>=rule.group_outing_minimum_participants
          and exists(select 1 from public.crew_event_rsvps other
               join public.crew_members m on m.user_id=other.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where other.event_id=ev.id and other.choice='coming' and other.user_id is distinct from ev.created_by)
          and exists(select 1 from public.runs r2 where r2.user_id=p_user_id and r2.ruleset_version='2026.1'
               and r2.activity=p_activity and r2.started_at is not null
               and r2.started_at>=ev.starts_at-make_interval(hours=>rule.group_outing_proximity_hours)
               and r2.started_at<=ev.starts_at+make_interval(hours=>rule.group_outing_proximity_hours)));
    -- « Une journée course ET une journée vélo » : deux journées DIFFÉRENTES,
    -- comme le dit la famille Double pratique du §7.4.
    when 'run_day_and_bike_day' then
      return exists(select 1 from public.weekly_quest_active_days_2026(p_user_id,p_week_start) a
                    where a.has_run)
         and exists(select 1 from public.weekly_quest_active_days_2026(p_user_id,p_week_start) b
                    where b.has_bike)
         and (select count(distinct d.day) from public.weekly_quest_active_days_2026(p_user_id,p_week_start) d
              where d.has_run or d.has_bike)>=2;
    -- « Deux journées actives », jamais trois : le plafond XP est déjà à 3
    -- (§7.1), et 0165 refuse structurellement un seuil qui l'atteindrait.
    when 'active_days' then
      return (select count(*) from public.weekly_quest_active_days_2026(p_user_id,p_week_start))>=q.threshold;
    -- « Proposer une sortie ouverte à ton crew » — avec de VRAIS participants
    -- (§7.4 : « avec validation et antispam »). Créer dix rendez-vous vides ne
    -- valide rien.
    when 'hosted_open_outing' then
      return exists(
        select 1 from public.crew_events ev
        where ev.created_by=p_user_id and ev.activity=p_activity and ev.cancelled_at_2026 is null
          and ev.starts_at is not null and ev.starts_at>=ws and ev.starts_at<we and ev.starts_at<=now()
          and (select count(distinct r.user_id) from public.crew_event_rsvps r
               join public.crew_members m on m.user_id=r.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where r.event_id=ev.id and r.choice='coming')>=rule.group_outing_minimum_participants
          and exists(select 1 from public.crew_event_rsvps other
               join public.crew_members m on m.user_id=other.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where other.event_id=ev.id and other.choice='coming' and other.user_id is distinct from ev.created_by));
    else return false;
  end case;
end $$;

-- ── 5. L'attribution : idempotente, déterministe, sans grille ───────────────
-- Déterministe : l'ordre vient d'un `md5(compte:semaine:défi)`. La même
-- personne retrouve les mêmes défis à chaque lecture de la même semaine, et
-- deux personnes n'ont pas la même liste. Aucun hasard n'est tiré à l'exécution
-- — donc aucun « relance pour voir » n'est possible.
-- Préférence : à égalité, un défi dont l'objet n'est pas encore possédé passe
-- devant. On ne propose pas d'abord ce qu'on a déjà.
create function public.assign_weekly_quests_2026(p_user_id uuid,p_activity text,p_week_start date)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare rule public.weekly_quest_rules_2026; added integer;
begin
  if p_activity not in('run','bike') then raise exception 'invalid_discipline'; end if;
  if p_week_start is null or p_week_start<>date_trunc('week',p_week_start::timestamp)::date then raise exception 'invalid_week'; end if;
  if not exists(select 1 from public.users where id=p_user_id and deletion_requested_at is null) then return 0; end if;
  select * into strict rule from public.weekly_quest_rules_2026;
  perform pg_advisory_xact_lock(hashtextextended('weekly_quests_2026:'||p_user_id::text,0));
  if exists(select 1 from public.weekly_quest_assignments_2026
    where user_id=p_user_id and week_start=p_week_start and activity=p_activity) then return 0; end if;
  insert into public.weekly_quest_assignments_2026(user_id,week_start,activity,quest_id,quest_version,cross_discipline)
  select p_user_id,p_week_start,p_activity,q.quest_id,q.version,q.cross_discipline
    from public.weekly_quests_2026 q
   where q.enabled
     and (q.requires<>'crew' or exists(select 1 from public.crew_members m where m.user_id=p_user_id and m.left_at is null))
     -- « Double pratique » n'apparaît pas à un mono-sport : proposer un
     -- objectif hors de portée serait exactement la pression que §4.2 refuse.
     and (q.requires<>'both_disciplines' or (
          exists(select 1 from public.runs r where r.user_id=p_user_id and r.ruleset_version='2026.1' and r.activity='run')
      and exists(select 1 from public.runs r where r.user_id=p_user_id and r.ruleset_version='2026.1' and r.activity='bike')))
     and (not q.cross_discipline or not exists(select 1 from public.weekly_quest_assignments_2026 a
                    where a.user_id=p_user_id and a.week_start=p_week_start and a.quest_id=q.quest_id))
   order by exists(select 1 from public.weekly_quest_reward_ownership_2026 o
                   where o.user_id=p_user_id and o.reward_id=q.reward_id),
            md5(p_user_id::text||':'||p_week_start::text||':'||q.quest_id)
   limit rule.simultaneous_per_discipline
  on conflict do nothing;
  get diagnostics added=row_count;
  return added;
end $$;

-- ── 6. L'évaluation : la seule porte vers un objet ──────────────────────────
-- Rejouable sans effet de bord : un défi déjà clos ne se rouvre pas, un objet
-- déjà possédé ne se redonne pas, et un défi EXPIRÉ ne récompense plus rien —
-- même si la condition devient vraie ensuite. C'est la contrepartie honnête
-- d'une semaine : elle finit.
create function public.evaluate_weekly_quests_2026(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.weekly_quest_assignments_2026; wx timestamptz; closed integer:=0;
begin
  if p_user_id is null then return 0; end if;
  if not exists(select 1 from public.users where id=p_user_id and deletion_requested_at is null) then return 0; end if;
  perform pg_advisory_xact_lock(hashtextextended('weekly_quests_2026:'||p_user_id::text,0));
  for a in select * from public.weekly_quest_assignments_2026
           where user_id=p_user_id and status='active' order by week_start,activity,quest_id for update loop
    select b.expires_at into wx from public.weekly_quest_week_bounds_2026(a.week_start) b;
    if now()>=wx then
      -- Silencieusement. Aucune écriture ailleurs, aucun message, aucune trace
      -- dans un journal d'activité : la semaine est passée, c'est tout.
      update public.weekly_quest_assignments_2026 set status='expired'
        where user_id=a.user_id and week_start=a.week_start and activity=a.activity and quest_id=a.quest_id;
      continue;
    end if;
    if public.weekly_quest_satisfied_2026(a.user_id,a.activity,a.week_start,a.quest_id) then
      update public.weekly_quest_assignments_2026 set status='completed',completed_at=now()
        where user_id=a.user_id and week_start=a.week_start and activity=a.activity and quest_id=a.quest_id;
      insert into public.weekly_quest_reward_ownership_2026(user_id,reward_id,quest_id,week_start)
        select a.user_id,q.reward_id,q.quest_id,a.week_start from public.weekly_quests_2026 q where q.quest_id=a.quest_id
        on conflict do nothing;
      closed:=closed+1;
    end if;
  end loop;
  return closed;
end $$;

revoke all on function public.weekly_quest_active_days_2026(uuid,date),
  public.weekly_quest_satisfied_2026(uuid,text,date,text),
  public.assign_weekly_quests_2026(uuid,text,date),
  public.evaluate_weekly_quests_2026(uuid) from public,anon,authenticated;
grant execute on function public.weekly_quest_active_days_2026(uuid,date),
  public.weekly_quest_satisfied_2026(uuid,text,date,text),
  public.assign_weekly_quests_2026(uuid,text,date),
  public.evaluate_weekly_quests_2026(uuid) to service_role;
