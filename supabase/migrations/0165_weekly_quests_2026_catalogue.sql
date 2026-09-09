-- Cahier §7.4/§7.5 + ADR-013 §2.2 ① — DÉFIS PERSONNELS DE LA SEMAINE : le
-- catalogue, les règles gelées et les objets qu'ils peuvent donner.
--
-- ─── CE QUI N'EXISTAIT PAS ──────────────────────────────────────────────────
-- Le dépôt avait les défis de crew (0122) et la saison (0121). Entre les deux,
-- rien : aucune table ne pouvait exprimer « ce que je peux faire cette semaine,
-- seul, sans courir plus ». ADR-013 appelle ce niveau le seul ajout réellement
-- nouveau de la demande du 10/09/2026.
--
-- ─── POURQUOI UNE MAISON D'OBJETS DÉDIÉE ────────────────────────────────────
-- Même raisonnement que 0144 (récompenses de niveau), et pour les mêmes faits :
--  · `season_reward_ownership_2026` (0121) exige une collection PUBLIÉE
--    (FK `season_collections_2026`). Un défi hebdomadaire n'appartient à aucun
--    calendrier ; l'y ranger obligerait à inventer une saison. Et sa table de
--    modèles est un instantané GELÉ de SEASON_REWARDS_2026 dont `tier` est
--    UNIQUE : y ajouter six lignes casserait l'instantané et son test.
--  · `commercial_ownership_2026` (0125) enregistre un REÇU DU STORE. Une
--    récompense gratuite n'a pas de reçu ; en forger un décrirait un achat.
-- On reprend donc la forme éprouvée — modèles gelés + possession + équipement —
-- avec ses propres tables, ancrées sur une SEMAINE au lieu d'un calendrier.
--
-- ─── CE QUE CETTE MIGRATION REFUSE, STRUCTURELLEMENT ────────────────────────
--  · Un objet dont la nature n'est pas cosmétique : `check(kind in (…))`. Il
--    n'existe aucune colonne où écrire « xp » — la promesse « récompense = un
--    objet, jamais de l'XP » (§7.1) n'est pas un commentaire, c'est une
--    contrainte.
--  · Un cadre ou un titre : ces emplacements d'identité sont déjà partagés par
--    0121 et 0144 (G22, « pas de sept rangs différents au-dessus du nom »).
--  · Un défi acheté, accéléré ou multiplié : aucune colonne de prix, d'offre ou
--    de multiplicateur n'entre ici (§16.2).
--
-- ADDITIVE. Aucune migration existante n'est réécrite. Aucune assignation,
-- aucun joueur, aucune récompense n'est semée : seul le catalogue l'est.

-- ── 1. Les règles, copie GELÉE de WEEKLY_QUEST_RULES_2026 ───────────────────
-- Le test PGlite compare cette ligne champ par champ au fichier partagé : une
-- dérive est une erreur, pas une variante locale (ADR-003).
create table public.weekly_quest_rules_2026 (
  singleton boolean primary key default true check(singleton),
  simultaneous_per_discipline integer not null check(simultaneous_per_discipline>0),
  week_time_zone text not null,
  late_sync_hours integer not null check(late_sync_hours>=0),
  xp_reward integer not null check(xp_reward=0),
  reward_kinds text[] not null,
  locality_tile_degrees double precision not null check(locality_tile_degrees>0),
  distinct_loop_tile_degrees double precision not null check(distinct_loop_tile_degrees>0),
  distinct_loop_area_bucket_m2 double precision not null check(distinct_loop_area_bucket_m2>0),
  regularity_active_days integer not null check(regularity_active_days>0),
  exploration_distinct_loops integer not null check(exploration_distinct_loops>0),
  group_outing_minimum_participants integer not null check(group_outing_minimum_participants>=2),
  group_outing_proximity_hours integer not null check(group_outing_proximity_hours>0),
  -- Miroir de PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek (§7.1). Il
  -- n'est pas une règle de défi : il est la BORNE au-dessus de laquelle un
  -- défi de journées deviendrait une injonction de sortie (§4.2).
  xp_day_cap_per_week integer not null check(xp_day_cap_per_week>0)
);
-- `xp_reward=0` est une CONTRAINTE et non une valeur par défaut : personne ne
-- peut ouvrir cette porte par un simple UPDATE de configuration.
insert into public.weekly_quest_rules_2026 values(
  true,2,'Europe/Paris',24,0,
  array['sticker','trace_pattern','photo_composition','personal_emblem','poster'],
  0.01,0.002,10000,2,2,2,6,3);

-- ── 2. Les objets, tirés des familles du §7.5 ───────────────────────────────
create table public.weekly_quest_reward_templates_2026 (
  reward_id text primary key,
  kind text not null,
  -- Un seul objet porté par emplacement. Aucun emplacement d'identité ici.
  slot text not null check(slot in ('sticker','trace','emblem','poster','composition')),
  label text not null check(length(label) between 1 and 60),
  constraint weekly_quest_reward_kind_2026 check(
    kind in ('sticker','trace_pattern','photo_composition','personal_emblem','poster'))
);
insert into public.weekly_quest_reward_templates_2026 values
  ('quest_sticker_ailleurs','sticker','sticker','Sticker Ailleurs'),
  ('quest_pattern_deux_boucles','trace_pattern','trace','Motif Deux boucles'),
  ('quest_emblem_ensemble','personal_emblem','emblem','Emblème Ensemble'),
  ('quest_poster_double_pratique','poster','poster','Affiche Double pratique'),
  ('quest_pattern_regulier','trace_pattern','trace','Motif Régulier'),
  ('quest_composition_accueil','photo_composition','composition','Composition Accueil');
-- Un identifiant de défi ne peut pas s'emparer d'un palier de saison ni d'un
-- mérite de niveau : le catalogue reste étanche même si quelqu'un le complète.
-- La vérification passe par du SQL DYNAMIQUE : PL/pgSQL planifie l'expression
-- entière avant de l'évaluer, donc un simple `to_regclass(...) is not null`
-- n'empêcherait pas l'erreur « relation inexistante » sur un environnement où
-- l'autre maison n'est pas encore appliquée.
do $$ declare other text; collides boolean; begin
  foreach other in array array['public.season_reward_templates_2026','public.level_reward_templates_2026'] loop
    if to_regclass(other) is not null then
      execute format('select exists(select 1 from public.weekly_quest_reward_templates_2026 t
        where exists(select 1 from %s o where o.reward_id=t.reward_id))',other) into collides;
      if collides then raise exception 'quest_reward_collides_with_%',other; end if;
    end if;
  end loop;
end $$;

-- ── 3. Le catalogue VERSIONNÉ des défis ─────────────────────────────────────
-- `version` : un défi dont la condition change devient une NOUVELLE version.
-- Une assignation garde la version qu'elle a reçue — on ne déplace jamais la
-- ligne d'arrivée sous les pieds de quelqu'un qui court déjà (§4.2).
create table public.weekly_quests_2026 (
  quest_id text primary key,
  version integer not null check(version>0),
  family text not null check(family in ('start','regularity','exploration','ensemble','hosting','running','cycling','double_practice')),
  -- Vrai : la condition ignore la discipline consultée (journées actives,
  -- cumulées sans chevauchement entre les deux sports — §7.1). Un tel défi
  -- n'est proposé QU'UNE FOIS par semaine, quelle que soit la discipline.
  cross_discipline boolean not null,
  -- Ce que le compte doit RÉELLEMENT porter pour que le défi soit proposé.
  requires text not null check(requires in ('none','crew','both_disciplines')),
  -- La condition VÉRIFIABLE côté serveur. Aucune valeur libre : chacune est
  -- implémentée par `weekly_quest_satisfied_2026` (0167) et testée.
  condition text not null check(condition in (
    'new_locality','distinct_loops','validated_group_outing',
    'run_day_and_bike_day','active_days','hosted_open_outing')),
  threshold integer not null check(threshold>0),
  reward_id text not null references public.weekly_quest_reward_templates_2026(reward_id),
  enabled boolean not null default true,
  published_at timestamptz not null default now(),
  -- Deux défis ne partagent pas un objet : « je l'ai déjà » ne doit jamais
  -- rendre une semaine vide de récompense.
  unique(reward_id)
);
-- La liste de départ (décision fondateur du 10/09/2026). Elle est
-- SATISFAISABLE PAR UNE SEMAINE NORMALE : « ailleurs », « avec quelqu'un »,
-- « autrement » — jamais « plus ».
insert into public.weekly_quests_2026(quest_id,version,family,cross_discipline,requires,condition,threshold,reward_id) values
  ('exploration_new_locality',1,'exploration',false,'none','new_locality',1,'quest_sticker_ailleurs'),
  ('exploration_two_distinct_loops',1,'exploration',false,'none','distinct_loops',2,'quest_pattern_deux_boucles'),
  ('ensemble_group_outing',1,'ensemble',false,'crew','validated_group_outing',1,'quest_emblem_ensemble'),
  ('double_practice_two_sports',1,'double_practice',true,'both_disciplines','run_day_and_bike_day',1,'quest_poster_double_pratique'),
  ('regularity_two_active_days',1,'regularity',true,'none','active_days',2,'quest_pattern_regulier'),
  ('hosting_open_outing',1,'hosting',false,'crew','hosted_open_outing',1,'quest_composition_accueil');
-- Le plafond XP hebdomadaire est déjà à 3 journées (§7.1) : un défi de
-- régularité qui en demanderait autant ou plus deviendrait l'injonction de
-- sortie que §4.2 interdit. La borne est vérifiée ici, une fois pour toutes.
do $$ begin
  if exists(select 1 from public.weekly_quests_2026 q cross join public.weekly_quest_rules_2026 r
    where q.condition in('active_days','run_day_and_bike_day') and q.threshold>=r.xp_day_cap_per_week) then
    raise exception 'regularity_quest_would_push_a_third_day';
  end if;
end $$;

-- ── 4. Refus par défaut ─────────────────────────────────────────────────────
alter table public.weekly_quest_rules_2026 enable row level security;
alter table public.weekly_quest_reward_templates_2026 enable row level security;
alter table public.weekly_quests_2026 enable row level security;
revoke all on public.weekly_quest_rules_2026,public.weekly_quest_reward_templates_2026,
  public.weekly_quests_2026 from public,anon,authenticated;
grant all on public.weekly_quest_rules_2026,public.weekly_quest_reward_templates_2026,
  public.weekly_quests_2026 to service_role;

-- ── 5. La semaine, définie une seule fois ───────────────────────────────────
-- Lundi 00:00 → dimanche 23:59:59 dans le fuseau des règles. `date_trunc` de
-- PostgreSQL découpe déjà la semaine ISO au lundi : on ne réécrit pas un
-- calendrier, on nomme celui qui existe.
create function public.weekly_quest_week_start_2026(p_at timestamptz)
returns date language sql stable security definer set search_path=public,pg_temp as $$
  select (date_trunc('week',p_at at time zone r.week_time_zone))::date
    from public.weekly_quest_rules_2026 r;
$$;
-- Bornes réelles de la semaine, fuseau compris (une semaine de changement
-- d'heure ne dure pas 168 h, et personne ne doit y perdre une soirée).
create function public.weekly_quest_week_bounds_2026(p_week_start date)
returns table(starts_at timestamptz,ends_at timestamptz,expires_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
  select (p_week_start::timestamp at time zone r.week_time_zone),
         ((p_week_start+7)::timestamp at time zone r.week_time_zone),
         ((p_week_start+7)::timestamp at time zone r.week_time_zone)+make_interval(hours=>r.late_sync_hours)
    from public.weekly_quest_rules_2026 r;
$$;
revoke all on function public.weekly_quest_week_start_2026(timestamptz),
  public.weekly_quest_week_bounds_2026(date) from public,anon,authenticated;
grant execute on function public.weekly_quest_week_start_2026(timestamptz),
  public.weekly_quest_week_bounds_2026(date) to service_role;
