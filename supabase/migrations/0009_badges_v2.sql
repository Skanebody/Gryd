-- GRYD — 0009 Badges V2 à NIVEAUX + Activity Hub (AMENDEMENT-06 §1/§3/§4).
-- Source de vérité : packages/shared/src/badges.ts (191 badges : 8 onboarding +
--   25 familles progressives ×6 + 3 saison ×6 [décernées par season_close] +
--   12 secrets + 3 héritage S0). Reseed COMPLET, idempotent (upsert).
-- ⚠ Écrit en cohérence avec badges.ts — les lignes badges sont GÉNÉRÉES depuis
--   le catalogue (scratchpad/gen_rows.ts) ; à terme, générer par script.
-- Raretés → TIERS (§1.1) : le check rarity est remplacé par un check tier.
--   Mapping ancien→nouveau : common→road, rare→tempo, epic→carbon, legend→legend.

-- ─── badges : tier remplace rarity, + colonnes level/family_slug (§1.3) ──────
-- La colonne 'rarity' (0002) devient 'tier' : on renomme si présente, sinon add.
-- IMPORTANT : le CHECK inline de 0002 (auto-nommé badges_rarity_check) suit la
-- colonne au rename et continue de contraindre l'ancien domaine → on le DROP
-- dynamiquement (quel que soit son nom) AVANT tout INSERT, dans le même bloc.
do $$
declare
  con record;
begin
  -- 1) On DROP d'abord TOUT check résiduel sur le domaine raretés/tiers : le
  --    check inline de 0002 (badges_rarity_check) interdit encore 'road'/'tempo'…
  --    et bloquerait l'UPDATE de remappage ci-dessous s'il restait actif.
  for con in
    select conname from pg_constraint
    where conrelid = 'public.badges'::regclass and contype = 'c'
      and (conname = 'badges_rarity_check' or conname = 'badges_tier_check')
  loop
    execute format('alter table public.badges drop constraint %I', con.conname);
  end loop;
  -- 2) Renomme la colonne rarity → tier en remappant les valeurs (common→road…).
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='badges' and column_name='rarity')
  then
    update public.badges set rarity = case rarity
      when 'common' then 'road' when 'rare' then 'tempo'
      when 'epic' then 'carbon' when 'legend' then 'legend' else rarity end;
    alter table public.badges rename column rarity to tier;
  end if;
end $$;

alter table public.badges add column if not exists tier         text;
alter table public.badges add column if not exists level        integer;      -- 1..6 (6=legend), null=simple
alter table public.badges add column if not exists family_slug  text;          -- famille progressive, null=simple
alter table public.badges add column if not exists legacy       boolean not null default false; -- héritage S0 (§1.5)
-- (tier renseigné par le reseed ci-dessous ; on pose le check APRÈS le seed.)

-- ─── Mapping des attributions existantes (§1.5) — AUCUNE perte ──────────────
-- Les keys du catalogue V1 (0007/0008) qui changent de key en V2 : on migre les
-- user_badges vers la nouvelle key AVANT de reseed (mapping APPROXIMATIF assumé,
-- la progression réelle est de toute façon recalculée depuis user_stats à la
-- course suivante). Keys sans équivalent (héritage) sont conservées telles quelles.
update public.user_badges set badge_key = 'hex_hunter_1' where badge_key = 'pionnier';       -- 100 hexes
update public.user_badges set badge_key = 'hex_hunter_2' where badge_key = 'conquerant';     -- 500
update public.user_badges set badge_key = 'hex_hunter_3' where badge_key = 'dominateur';     -- 1 000
update public.user_badges set badge_key = 'hex_hunter_4' where badge_key = 'seigneur';       -- 5 000
update public.user_badges set badge_key = 'hex_hunter_5' where badge_key = 'maitre';         -- 10 000
update public.user_badges set badge_key = 'raider_1'     where badge_key in ('rival','pillard'); -- vols (10)
update public.user_badges set badge_key = 'raider_2'     where badge_key = 'predateur';      -- 50→approx niv II
update public.user_badges set badge_key = 'defender_1'   where badge_key = 'defenseur';      -- 10 défendus
update public.user_badges set badge_key = 'defender_2'   where badge_key = 'forteresse';     -- 50→approx niv II
update public.user_badges set badge_key = 'crew_member_1' where badge_key = 'recrue';        -- rejoint
update public.user_badges set badge_key = 'crew_member_2' where badge_key = 'coequipier';    -- 5 contrib
update public.user_badges set badge_key = 'crew_member_3' where badge_key in ('membre_actif','pilier'); -- 20/50→niv III
update public.user_badges set badge_key = 'crew_captain_1' where badge_key = 'leader';       -- crée un crew
update public.user_badges set badge_key = 'distance_runner_3' where badge_key = 'endurance'; -- 10 km
update public.user_badges set badge_key = 'distance_runner_4' where badge_key = 'perseverant'; -- 21 km
update public.user_badges set badge_key = 'distance_runner_5' where badge_key = 'marathonien'; -- 42 km
update public.user_badges set badge_key = 'lifetime_distance_1' where badge_key = 'iron_runner';   -- 100 km cumul
update public.user_badges set badge_key = 'lifetime_distance_2' where badge_key in ('ultra_runner','devoue'); -- 200/42 km→approx niv II
update public.user_badges set badge_key = 'lifetime_distance_3' where badge_key in ('inarretable','machine'); -- 300/500 km→niv III
-- Note : premiers_pas/enclenche/explorateur/solitaire/sprinter/fondateur/saison_0/first_verified
--   gardent leur key (conservées à l'identique dans le catalogue V2).
-- Dédoublonnage : deux anciennes keys peuvent mapper vers la même nouvelle key
--   (rival+pillard→raider_1) → on supprime les doublons créés.
delete from public.user_badges a using public.user_badges b
  where a.ctid < b.ctid and a.user_id = b.user_id and a.badge_key = b.badge_key;

-- ─── Purge des keys V1 disparues, puis reseed COMPLET du catalogue V2 ────────
-- On vide le catalogue (les attributions ont été migrées ci-dessus ; le FK
-- user_badges→badges est ON DELETE CASCADE en 0002, donc on NE supprime PAS les
-- badges encore référencés : on nettoie seulement les keys orphelines V1).
delete from public.badges
  where key not in (select badge_key from public.user_badges)
    and key not in (
      'premiers_pas', 'enclenche', 'first_crew', 'defenseur_premier', 'first_share', 'first_verified',
      'fondateur', 'saison_0', 'distance_runner_1', 'distance_runner_2', 'distance_runner_3', 'distance_runner_4',
      'distance_runner_5', 'distance_runner_legend', 'season_distance_1', 'season_distance_2', 'season_distance_3', 'season_distance_4',
      'season_distance_5', 'season_distance_legend', 'lifetime_distance_1', 'lifetime_distance_2', 'lifetime_distance_3', 'lifetime_distance_4',
      'lifetime_distance_5', 'lifetime_distance_legend', 'hex_hunter_1', 'hex_hunter_2', 'hex_hunter_3', 'hex_hunter_4',
      'hex_hunter_5', 'hex_hunter_legend', 'zone_taker_1', 'zone_taker_2', 'zone_taker_3', 'zone_taker_4',
      'zone_taker_5', 'zone_taker_legend', 'city_control_1', 'city_control_2', 'city_control_3', 'city_control_4',
      'city_control_5', 'city_control_legend', 'raider_1', 'raider_2', 'raider_3', 'raider_4',
      'raider_5', 'raider_legend', 'sector_breaker_1', 'sector_breaker_2', 'sector_breaker_3', 'sector_breaker_4',
      'sector_breaker_5', 'sector_breaker_legend', 'raid_leader_1', 'raid_leader_2', 'raid_leader_3', 'raid_leader_4',
      'raid_leader_5', 'raid_leader_legend', 'defender_1', 'defender_2', 'defender_3', 'defender_4',
      'defender_5', 'defender_legend', 'hold_the_line_1', 'hold_the_line_2', 'hold_the_line_3', 'hold_the_line_4',
      'hold_the_line_5', 'hold_the_line_legend', 'fortress_1', 'fortress_2', 'fortress_3', 'fortress_4',
      'fortress_5', 'fortress_legend', 'pioneer_1', 'pioneer_2', 'pioneer_3', 'pioneer_4',
      'pioneer_5', 'pioneer_legend', 'frontier_runner_1', 'frontier_runner_2', 'frontier_runner_3', 'frontier_runner_4',
      'frontier_runner_5', 'frontier_runner_legend', 'route_opened_1', 'route_opened_2', 'route_opened_3', 'route_opened_4',
      'route_opened_5', 'route_opened_legend', 'outpost_builder_1', 'outpost_builder_2', 'outpost_builder_3', 'outpost_builder_4',
      'outpost_builder_5', 'outpost_builder_legend', 'supply_line_1', 'supply_line_2', 'supply_line_3', 'supply_line_4',
      'supply_line_5', 'supply_line_legend', 'crew_member_1', 'crew_member_2', 'crew_member_3', 'crew_member_4',
      'crew_member_5', 'crew_member_legend', 'crew_captain_1', 'crew_captain_2', 'crew_captain_3', 'crew_captain_4',
      'crew_captain_5', 'crew_captain_legend', 'united_front_1', 'united_front_2', 'united_front_3', 'united_front_4',
      'united_front_5', 'united_front_legend', 'pace_progress_1', 'pace_progress_2', 'pace_progress_3', 'pace_progress_4',
      'pace_progress_5', 'pace_progress_legend', 'consistency_1', 'consistency_2', 'consistency_3', 'consistency_4',
      'consistency_5', 'consistency_legend', 'score_forme_1', 'score_forme_2', 'score_forme_3', 'score_forme_4',
      'score_forme_5', 'score_forme_legend', 'gryd_verified_1', 'gryd_verified_2', 'gryd_verified_3', 'gryd_verified_4',
      'gryd_verified_5', 'gryd_verified_legend', 'clean_runner_1', 'clean_runner_2', 'clean_runner_3', 'clean_runner_4',
      'clean_runner_5', 'clean_runner_legend', 'season_rank_1', 'season_rank_2', 'season_rank_3', 'season_rank_4',
      'season_rank_5', 'season_rank_legend', 'national_rank_1', 'national_rank_2', 'national_rank_3', 'national_rank_4',
      'national_rank_5', 'national_rank_legend', 'crew_season_1', 'crew_season_2', 'crew_season_3', 'crew_season_4',
      'crew_season_5', 'crew_season_legend', 'secret_la_boucle', 'secret_dix_pile', 'secret_triple', 'secret_heure_du_loup',
      'secret_ligne_droite', 'secret_centurion', 'secret_premiere_foulee', 'secret_semaine_parfaite', 'secret_fidele_au_poste', 'secret_comeback',
      'secret_silent_takeover', 'secret_no_map_run', 'explorateur', 'solitaire', 'sprinter',
      -- Médaille §15 attribuée par season_close (hors catalogue progressif) : préservée.
      'season_top1_local'
    );

-- Reseed / upsert des 191 badges (key, family, tier, name, requirement,
-- family_color, sort, secret, legacy, family_slug, level).
insert into public.badges
  (key, family, tier, name, requirement, family_color, sort, secret, legacy, family_slug, level)
values
  ('premiers_pas', 'onboarding', 'road', 'Premiers Pas', 'Termine ta première course valide.', '#8B5CF6', 1, false, false, null, null),
  ('enclenche', 'onboarding', 'road', 'Enclenché', 'Capture ton premier hexagone.', '#8B5CF6', 2, false, false, null, null),
  ('first_crew', 'onboarding', 'road', 'First Crew', 'Rejoins ton premier crew.', '#8B5CF6', 3, false, false, null, null),
  ('defenseur_premier', 'onboarding', 'road', 'First Defense', 'Défends ton premier hexagone.', '#8B5CF6', 4, false, false, null, null),
  ('first_share', 'onboarding', 'road', 'First Share', 'Partage un résultat de course.', '#8B5CF6', 5, false, false, null, null),
  ('first_verified', 'onboarding', 'road', 'First Verified Run', 'Réalise ta première course vérifiée.', '#8B5CF6', 6, false, false, null, null),
  ('fondateur', 'onboarding', 'carbon', 'Fondateur', 'Rejoins la Saison 0 en tant que fondateur.', '#8B5CF6', 7, false, false, null, null),
  ('saison_0', 'onboarding', 'race', 'Saison 0', 'Capture au moins 1 hex pendant la Saison 0.', '#8B5CF6', 8, false, false, null, null),
  ('distance_runner_1', 'distance', 'road', 'Distance Runner I', 'Cours en une seule course 3 km.', '#F472B6', 9, false, false, 'distance_runner', 1),
  ('distance_runner_2', 'distance', 'tempo', 'Distance Runner II', 'Cours en une seule course 5 km.', '#F472B6', 10, false, false, 'distance_runner', 2),
  ('distance_runner_3', 'distance', 'race', 'Distance Runner III', 'Cours en une seule course 10 km.', '#F472B6', 11, false, false, 'distance_runner', 3),
  ('distance_runner_4', 'distance', 'carbon', 'Distance Runner IV', 'Cours en une seule course 21,1 km.', '#F472B6', 12, false, false, 'distance_runner', 4),
  ('distance_runner_5', 'distance', 'elite', 'Distance Runner V', 'Cours en une seule course 42,195 km.', '#F472B6', 13, false, false, 'distance_runner', 5),
  ('distance_runner_legend', 'distance', 'legend', 'Distance Runner LEGEND', 'Cours en une seule course 50 km.', '#F472B6', 14, false, false, 'distance_runner', 6),
  ('season_distance_1', 'distance', 'road', 'Season Distance I', 'Cumule cette saison 25 km.', '#F472B6', 15, false, false, 'season_distance', 1),
  ('season_distance_2', 'distance', 'tempo', 'Season Distance II', 'Cumule cette saison 50 km.', '#F472B6', 16, false, false, 'season_distance', 2),
  ('season_distance_3', 'distance', 'race', 'Season Distance III', 'Cumule cette saison 100 km.', '#F472B6', 17, false, false, 'season_distance', 3),
  ('season_distance_4', 'distance', 'carbon', 'Season Distance IV', 'Cumule cette saison 250 km.', '#F472B6', 18, false, false, 'season_distance', 4),
  ('season_distance_5', 'distance', 'elite', 'Season Distance V', 'Cumule cette saison 500 km.', '#F472B6', 19, false, false, 'season_distance', 5),
  ('season_distance_legend', 'distance', 'legend', 'Season Distance LEGEND', 'Cumule cette saison 1 000 km.', '#F472B6', 20, false, false, 'season_distance', 6),
  ('lifetime_distance_1', 'distance', 'road', 'Lifetime Distance I', 'Cumule au total 100 km.', '#F472B6', 21, false, false, 'lifetime_distance', 1),
  ('lifetime_distance_2', 'distance', 'tempo', 'Lifetime Distance II', 'Cumule au total 500 km.', '#F472B6', 22, false, false, 'lifetime_distance', 2),
  ('lifetime_distance_3', 'distance', 'race', 'Lifetime Distance III', 'Cumule au total 1 000 km.', '#F472B6', 23, false, false, 'lifetime_distance', 3),
  ('lifetime_distance_4', 'distance', 'carbon', 'Lifetime Distance IV', 'Cumule au total 2 500 km.', '#F472B6', 24, false, false, 'lifetime_distance', 4),
  ('lifetime_distance_5', 'distance', 'elite', 'Lifetime Distance V', 'Cumule au total 5 000 km.', '#F472B6', 25, false, false, 'lifetime_distance', 5),
  ('lifetime_distance_legend', 'distance', 'legend', 'Lifetime Distance LEGEND', 'Cumule au total 10 000 km.', '#F472B6', 26, false, false, 'lifetime_distance', 6),
  ('hex_hunter_1', 'territoire', 'road', 'Hex Hunter I', 'Atteins 100 hexes capturés (cumul vie entière).', '#4ADE80', 27, false, false, 'hex_hunter', 1),
  ('hex_hunter_2', 'territoire', 'tempo', 'Hex Hunter II', 'Atteins 500 hexes capturés (cumul vie entière).', '#4ADE80', 28, false, false, 'hex_hunter', 2),
  ('hex_hunter_3', 'territoire', 'race', 'Hex Hunter III', 'Atteins 1 000 hexes capturés (cumul vie entière).', '#4ADE80', 29, false, false, 'hex_hunter', 3),
  ('hex_hunter_4', 'territoire', 'carbon', 'Hex Hunter IV', 'Atteins 5 000 hexes capturés (cumul vie entière).', '#4ADE80', 30, false, false, 'hex_hunter', 4),
  ('hex_hunter_5', 'territoire', 'elite', 'Hex Hunter V', 'Atteins 10 000 hexes capturés (cumul vie entière).', '#4ADE80', 31, false, false, 'hex_hunter', 5),
  ('hex_hunter_legend', 'territoire', 'legend', 'Hex Hunter LEGEND', 'Atteins 50 000 hexes capturés (cumul vie entière).', '#4ADE80', 32, false, false, 'hex_hunter', 6),
  ('zone_taker_1', 'territoire', 'road', 'Zone Taker I', 'Atteins 1 secteurs contrôlés.', '#4ADE80', 33, false, false, 'zone_taker', 1),
  ('zone_taker_2', 'territoire', 'tempo', 'Zone Taker II', 'Atteins 3 secteurs contrôlés.', '#4ADE80', 34, false, false, 'zone_taker', 2),
  ('zone_taker_3', 'territoire', 'race', 'Zone Taker III', 'Atteins 10 secteurs contrôlés.', '#4ADE80', 35, false, false, 'zone_taker', 3),
  ('zone_taker_4', 'territoire', 'carbon', 'Zone Taker IV', 'Atteins 25 secteurs contrôlés.', '#4ADE80', 36, false, false, 'zone_taker', 4),
  ('zone_taker_5', 'territoire', 'elite', 'Zone Taker V', 'Atteins 50 secteurs contrôlés.', '#4ADE80', 37, false, false, 'zone_taker', 5),
  ('zone_taker_legend', 'territoire', 'legend', 'Zone Taker LEGEND', 'Atteins 100 secteurs contrôlés.', '#4ADE80', 38, false, false, 'zone_taker', 6),
  ('city_control_1', 'territoire', 'road', 'City Control I', 'Contrôle 10 % d''un secteur actif.', '#4ADE80', 39, false, false, 'city_control', 1),
  ('city_control_2', 'territoire', 'tempo', 'City Control II', 'Contrôle 25 % d''un secteur actif.', '#4ADE80', 40, false, false, 'city_control', 2),
  ('city_control_3', 'territoire', 'race', 'City Control III', 'Contrôle 50 % d''un secteur actif.', '#4ADE80', 41, false, false, 'city_control', 3),
  ('city_control_4', 'territoire', 'carbon', 'City Control IV', 'Contrôle 70 % d''un secteur actif.', '#4ADE80', 42, false, false, 'city_control', 4),
  ('city_control_5', 'territoire', 'elite', 'City Control V', 'Contrôle 90 % d''un secteur actif.', '#4ADE80', 43, false, false, 'city_control', 5),
  ('city_control_legend', 'territoire', 'legend', 'City Control LEGEND', 'Domine un secteur actif 30 jours.', '#4ADE80', 44, false, false, 'city_control', 6),
  ('raider_1', 'attaque', 'road', 'Raider I', 'Atteins 10 hexes volés.', '#FF5C33', 45, false, false, 'raider', 1),
  ('raider_2', 'attaque', 'tempo', 'Raider II', 'Atteins 100 hexes volés.', '#FF5C33', 46, false, false, 'raider', 2),
  ('raider_3', 'attaque', 'race', 'Raider III', 'Atteins 500 hexes volés.', '#FF5C33', 47, false, false, 'raider', 3),
  ('raider_4', 'attaque', 'carbon', 'Raider IV', 'Atteins 1 000 hexes volés.', '#FF5C33', 48, false, false, 'raider', 4),
  ('raider_5', 'attaque', 'elite', 'Raider V', 'Atteins 5 000 hexes volés.', '#FF5C33', 49, false, false, 'raider', 5),
  ('raider_legend', 'attaque', 'legend', 'Raider LEGEND', 'Atteins 10 000 hexes volés.', '#FF5C33', 50, false, false, 'raider', 6),
  ('sector_breaker_1', 'attaque', 'road', 'Sector Breaker I', 'Atteins 1 secteurs contestés.', '#FF5C33', 51, false, false, 'sector_breaker', 1),
  ('sector_breaker_2', 'attaque', 'tempo', 'Sector Breaker II', 'Atteins 3 secteurs contestés.', '#FF5C33', 52, false, false, 'sector_breaker', 2),
  ('sector_breaker_3', 'attaque', 'race', 'Sector Breaker III', 'Atteins 10 secteurs contestés.', '#FF5C33', 53, false, false, 'sector_breaker', 3),
  ('sector_breaker_4', 'attaque', 'carbon', 'Sector Breaker IV', 'Atteins 25 secteurs contestés.', '#FF5C33', 54, false, false, 'sector_breaker', 4),
  ('sector_breaker_5', 'attaque', 'elite', 'Sector Breaker V', 'Atteins 50 secteurs contestés.', '#FF5C33', 55, false, false, 'sector_breaker', 5),
  ('sector_breaker_legend', 'attaque', 'legend', 'Sector Breaker LEGEND', 'Atteins 100 secteurs contestés.', '#FF5C33', 56, false, false, 'sector_breaker', 6),
  ('raid_leader_1', 'attaque', 'road', 'Raid Leader I', 'Atteins 1 offensives rejointes.', '#FF5C33', 57, false, false, 'raid_leader', 1),
  ('raid_leader_2', 'attaque', 'tempo', 'Raid Leader II', 'Atteins 5 offensives rejointes.', '#FF5C33', 58, false, false, 'raid_leader', 2),
  ('raid_leader_3', 'attaque', 'race', 'Raid Leader III', 'Atteins 10 offensives rejointes.', '#FF5C33', 59, false, false, 'raid_leader', 3),
  ('raid_leader_4', 'attaque', 'carbon', 'Raid Leader IV', 'Atteins 25 offensives rejointes.', '#FF5C33', 60, false, false, 'raid_leader', 4),
  ('raid_leader_5', 'attaque', 'elite', 'Raid Leader V', 'Atteins 50 offensives rejointes.', '#FF5C33', 61, false, false, 'raid_leader', 5),
  ('raid_leader_legend', 'attaque', 'legend', 'Raid Leader LEGEND', 'Atteins 100 offensives rejointes.', '#FF5C33', 62, false, false, 'raid_leader', 6),
  ('defender_1', 'defense', 'road', 'Defender I', 'Atteins 10 hexes défendus.', '#6FB7FF', 63, false, false, 'defender', 1),
  ('defender_2', 'defense', 'tempo', 'Defender II', 'Atteins 100 hexes défendus.', '#6FB7FF', 64, false, false, 'defender', 2),
  ('defender_3', 'defense', 'race', 'Defender III', 'Atteins 500 hexes défendus.', '#6FB7FF', 65, false, false, 'defender', 3),
  ('defender_4', 'defense', 'carbon', 'Defender IV', 'Atteins 1 000 hexes défendus.', '#6FB7FF', 66, false, false, 'defender', 4),
  ('defender_5', 'defense', 'elite', 'Defender V', 'Atteins 5 000 hexes défendus.', '#6FB7FF', 67, false, false, 'defender', 5),
  ('defender_legend', 'defense', 'legend', 'Defender LEGEND', 'Atteins 10 000 hexes défendus.', '#6FB7FF', 68, false, false, 'defender', 6),
  ('hold_the_line_1', 'defense', 'road', 'Hold The Line I', 'Atteins 3 jours de tenue d''une zone.', '#6FB7FF', 69, false, false, 'hold_the_line', 1),
  ('hold_the_line_2', 'defense', 'tempo', 'Hold The Line II', 'Atteins 7 jours de tenue d''une zone.', '#6FB7FF', 70, false, false, 'hold_the_line', 2),
  ('hold_the_line_3', 'defense', 'race', 'Hold The Line III', 'Atteins 14 jours de tenue d''une zone.', '#6FB7FF', 71, false, false, 'hold_the_line', 3),
  ('hold_the_line_4', 'defense', 'carbon', 'Hold The Line IV', 'Atteins 30 jours de tenue d''une zone.', '#6FB7FF', 72, false, false, 'hold_the_line', 4),
  ('hold_the_line_5', 'defense', 'elite', 'Hold The Line V', 'Atteins 60 jours de tenue d''une zone.', '#6FB7FF', 73, false, false, 'hold_the_line', 5),
  ('hold_the_line_legend', 'defense', 'legend', 'Hold The Line LEGEND', 'Atteins 100 jours de tenue d''une zone.', '#6FB7FF', 74, false, false, 'hold_the_line', 6),
  ('fortress_1', 'defense', 'road', 'Fortress I', 'Atteins 1 clusters protégés.', '#6FB7FF', 75, false, false, 'fortress', 1),
  ('fortress_2', 'defense', 'tempo', 'Fortress II', 'Atteins 3 clusters protégés.', '#6FB7FF', 76, false, false, 'fortress', 2),
  ('fortress_3', 'defense', 'race', 'Fortress III', 'Atteins 10 clusters protégés.', '#6FB7FF', 77, false, false, 'fortress', 3),
  ('fortress_4', 'defense', 'carbon', 'Fortress IV', 'Atteins 25 clusters protégés.', '#6FB7FF', 78, false, false, 'fortress', 4),
  ('fortress_5', 'defense', 'elite', 'Fortress V', 'Atteins 50 clusters protégés.', '#6FB7FF', 79, false, false, 'fortress', 5),
  ('fortress_legend', 'defense', 'legend', 'Fortress LEGEND', 'Atteins 100 clusters protégés.', '#6FB7FF', 80, false, false, 'fortress', 6),
  ('pioneer_1', 'exploration', 'road', 'Pioneer I', 'Atteins 10 hexes pionniers.', '#2DD4BF', 81, false, false, 'pioneer', 1),
  ('pioneer_2', 'exploration', 'tempo', 'Pioneer II', 'Atteins 100 hexes pionniers.', '#2DD4BF', 82, false, false, 'pioneer', 2),
  ('pioneer_3', 'exploration', 'race', 'Pioneer III', 'Atteins 500 hexes pionniers.', '#2DD4BF', 83, false, false, 'pioneer', 3),
  ('pioneer_4', 'exploration', 'carbon', 'Pioneer IV', 'Atteins 1 000 hexes pionniers.', '#2DD4BF', 84, false, false, 'pioneer', 4),
  ('pioneer_5', 'exploration', 'elite', 'Pioneer V', 'Atteins 5 000 hexes pionniers.', '#2DD4BF', 85, false, false, 'pioneer', 5),
  ('pioneer_legend', 'exploration', 'legend', 'Pioneer LEGEND', 'Atteins 10 000 hexes pionniers.', '#2DD4BF', 86, false, false, 'pioneer', 6),
  ('frontier_runner_1', 'exploration', 'road', 'Frontier Runner I', 'Atteins 1 zones rurales ouvertes.', '#2DD4BF', 87, false, false, 'frontier_runner', 1),
  ('frontier_runner_2', 'exploration', 'tempo', 'Frontier Runner II', 'Atteins 3 zones rurales ouvertes.', '#2DD4BF', 88, false, false, 'frontier_runner', 2),
  ('frontier_runner_3', 'exploration', 'race', 'Frontier Runner III', 'Atteins 10 zones rurales ouvertes.', '#2DD4BF', 89, false, false, 'frontier_runner', 3),
  ('frontier_runner_4', 'exploration', 'carbon', 'Frontier Runner IV', 'Atteins 25 zones rurales ouvertes.', '#2DD4BF', 90, false, false, 'frontier_runner', 4),
  ('frontier_runner_5', 'exploration', 'elite', 'Frontier Runner V', 'Atteins 50 zones rurales ouvertes.', '#2DD4BF', 91, false, false, 'frontier_runner', 5),
  ('frontier_runner_legend', 'exploration', 'legend', 'Frontier Runner LEGEND', 'Atteins 100 zones rurales ouvertes.', '#2DD4BF', 92, false, false, 'frontier_runner', 6),
  ('route_opened_1', 'routes', 'road', 'Route Opened I', 'Atteins 1 routes ouvertes.', '#F59E0B', 93, false, false, 'route_opened', 1),
  ('route_opened_2', 'routes', 'tempo', 'Route Opened II', 'Atteins 5 routes ouvertes.', '#F59E0B', 94, false, false, 'route_opened', 2),
  ('route_opened_3', 'routes', 'race', 'Route Opened III', 'Atteins 10 routes ouvertes.', '#F59E0B', 95, false, false, 'route_opened', 3),
  ('route_opened_4', 'routes', 'carbon', 'Route Opened IV', 'Atteins 25 routes ouvertes.', '#F59E0B', 96, false, false, 'route_opened', 4),
  ('route_opened_5', 'routes', 'elite', 'Route Opened V', 'Atteins 50 routes ouvertes.', '#F59E0B', 97, false, false, 'route_opened', 5),
  ('route_opened_legend', 'routes', 'legend', 'Route Opened LEGEND', 'Atteins 100 routes ouvertes.', '#F59E0B', 98, false, false, 'route_opened', 6),
  ('outpost_builder_1', 'routes', 'road', 'Outpost Builder I', 'Atteins 1 avant-postes créés.', '#F59E0B', 99, false, false, 'outpost_builder', 1),
  ('outpost_builder_2', 'routes', 'tempo', 'Outpost Builder II', 'Atteins 3 avant-postes créés.', '#F59E0B', 100, false, false, 'outpost_builder', 2),
  ('outpost_builder_3', 'routes', 'race', 'Outpost Builder III', 'Atteins 5 avant-postes créés.', '#F59E0B', 101, false, false, 'outpost_builder', 3),
  ('outpost_builder_4', 'routes', 'carbon', 'Outpost Builder IV', 'Atteins 10 avant-postes créés.', '#F59E0B', 102, false, false, 'outpost_builder', 4),
  ('outpost_builder_5', 'routes', 'elite', 'Outpost Builder V', 'Atteins 25 avant-postes créés.', '#F59E0B', 103, false, false, 'outpost_builder', 5),
  ('outpost_builder_legend', 'routes', 'legend', 'Outpost Builder LEGEND', 'Atteins 50 avant-postes créés.', '#F59E0B', 104, false, false, 'outpost_builder', 6),
  ('supply_line_1', 'routes', 'road', 'Supply Line I', 'Atteins 1 routes maintenues 7 jours.', '#F59E0B', 105, false, false, 'supply_line', 1),
  ('supply_line_2', 'routes', 'tempo', 'Supply Line II', 'Atteins 3 routes maintenues 7 jours.', '#F59E0B', 106, false, false, 'supply_line', 2),
  ('supply_line_3', 'routes', 'race', 'Supply Line III', 'Atteins 10 routes maintenues 7 jours.', '#F59E0B', 107, false, false, 'supply_line', 3),
  ('supply_line_4', 'routes', 'carbon', 'Supply Line IV', 'Atteins 25 routes maintenues 7 jours.', '#F59E0B', 108, false, false, 'supply_line', 4),
  ('supply_line_5', 'routes', 'elite', 'Supply Line V', 'Atteins 50 routes maintenues 7 jours.', '#F59E0B', 109, false, false, 'supply_line', 5),
  ('supply_line_legend', 'routes', 'legend', 'Supply Line LEGEND', 'Atteins 100 routes maintenues 7 jours.', '#F59E0B', 110, false, false, 'supply_line', 6),
  ('crew_member_1', 'crew', 'road', 'Crew Member I', 'Rejoins un crew.', '#FB923C', 111, false, false, 'crew_member', 1),
  ('crew_member_2', 'crew', 'tempo', 'Crew Member II', 'Réalise 5 contributions crew.', '#FB923C', 112, false, false, 'crew_member', 2),
  ('crew_member_3', 'crew', 'race', 'Crew Member III', 'Réalise 25 contributions crew.', '#FB923C', 113, false, false, 'crew_member', 3),
  ('crew_member_4', 'crew', 'carbon', 'Crew Member IV', 'Réalise 100 contributions crew.', '#FB923C', 114, false, false, 'crew_member', 4),
  ('crew_member_5', 'crew', 'elite', 'Crew Member V', 'Réalise 500 contributions crew.', '#FB923C', 115, false, false, 'crew_member', 5),
  ('crew_member_legend', 'crew', 'legend', 'Crew Member LEGEND', 'Réalise 1 000 contributions crew.', '#FB923C', 116, false, false, 'crew_member', 6),
  ('crew_captain_1', 'crew', 'road', 'Crew Captain I', 'Crée un crew.', '#FB923C', 117, false, false, 'crew_captain', 1),
  ('crew_captain_2', 'crew', 'tempo', 'Crew Captain II', 'Atteins le palier capitaine 3.', '#FB923C', 118, false, false, 'crew_captain', 2),
  ('crew_captain_3', 'crew', 'race', 'Crew Captain III', 'Atteins le palier capitaine 5.', '#FB923C', 119, false, false, 'crew_captain', 3),
  ('crew_captain_4', 'crew', 'carbon', 'Crew Captain IV', 'Atteins le palier capitaine 10.', '#FB923C', 120, false, false, 'crew_captain', 4),
  ('crew_captain_5', 'crew', 'elite', 'Crew Captain V', 'Atteins le palier capitaine 25.', '#FB923C', 121, false, false, 'crew_captain', 5),
  ('crew_captain_legend', 'crew', 'legend', 'Crew Captain LEGEND', 'Atteins le palier capitaine 50.', '#FB923C', 122, false, false, 'crew_captain', 6),
  ('united_front_1', 'crew', 'road', 'United Front I', 'Atteins 2 membres actifs la même semaine.', '#FB923C', 123, false, false, 'united_front', 1),
  ('united_front_2', 'crew', 'tempo', 'United Front II', 'Atteins 5 membres actifs la même semaine.', '#FB923C', 124, false, false, 'united_front', 2),
  ('united_front_3', 'crew', 'race', 'United Front III', 'Atteins 10 membres actifs la même semaine.', '#FB923C', 125, false, false, 'united_front', 3),
  ('united_front_4', 'crew', 'carbon', 'United Front IV', 'Atteins 25 membres actifs la même semaine.', '#FB923C', 126, false, false, 'united_front', 4),
  ('united_front_5', 'crew', 'elite', 'United Front V', 'Atteins 50 membres actifs la même semaine.', '#FB923C', 127, false, false, 'united_front', 5),
  ('united_front_legend', 'crew', 'legend', 'United Front LEGEND', 'Atteins 100 membres actifs la même semaine.', '#FB923C', 128, false, false, 'united_front', 6),
  ('pace_progress_1', 'performance', 'road', 'Pace Progress I', 'Améliore ton allure de 1 s/km sur un mois.', '#22D3EE', 129, false, false, 'pace_progress', 1),
  ('pace_progress_2', 'performance', 'tempo', 'Pace Progress II', 'Améliore ton allure de 10 s/km sur un mois.', '#22D3EE', 130, false, false, 'pace_progress', 2),
  ('pace_progress_3', 'performance', 'race', 'Pace Progress III', 'Améliore ton allure de 20 s/km sur un mois.', '#22D3EE', 131, false, false, 'pace_progress', 3),
  ('pace_progress_4', 'performance', 'carbon', 'Pace Progress IV', 'Améliore ton allure de 30 s/km sur un mois.', '#22D3EE', 132, false, false, 'pace_progress', 4),
  ('pace_progress_5', 'performance', 'elite', 'Pace Progress V', 'Améliore ton allure de 45 s/km sur un mois.', '#22D3EE', 133, false, false, 'pace_progress', 5),
  ('pace_progress_legend', 'performance', 'legend', 'Pace Progress LEGEND', 'Améliore ton allure de 60 s/km sur un mois.', '#22D3EE', 134, false, false, 'pace_progress', 6),
  ('consistency_1', 'performance', 'road', 'Consistency I', 'Atteins 2 semaines actives.', '#22D3EE', 135, false, false, 'consistency', 1),
  ('consistency_2', 'performance', 'tempo', 'Consistency II', 'Atteins 4 semaines actives.', '#22D3EE', 136, false, false, 'consistency', 2),
  ('consistency_3', 'performance', 'race', 'Consistency III', 'Atteins 8 semaines actives.', '#22D3EE', 137, false, false, 'consistency', 3),
  ('consistency_4', 'performance', 'carbon', 'Consistency IV', 'Atteins 12 semaines actives.', '#22D3EE', 138, false, false, 'consistency', 4),
  ('consistency_5', 'performance', 'elite', 'Consistency V', 'Atteins 24 semaines actives.', '#22D3EE', 139, false, false, 'consistency', 5),
  ('consistency_legend', 'performance', 'legend', 'Consistency LEGEND', 'Atteins 52 semaines actives.', '#22D3EE', 140, false, false, 'consistency', 6),
  ('score_forme_1', 'performance', 'road', 'Score Forme I', 'Atteins un Score Forme de 60.', '#22D3EE', 141, false, false, 'score_forme', 1),
  ('score_forme_2', 'performance', 'tempo', 'Score Forme II', 'Atteins un Score Forme de 70.', '#22D3EE', 142, false, false, 'score_forme', 2),
  ('score_forme_3', 'performance', 'race', 'Score Forme III', 'Atteins un Score Forme de 80.', '#22D3EE', 143, false, false, 'score_forme', 3),
  ('score_forme_4', 'performance', 'carbon', 'Score Forme IV', 'Atteins un Score Forme de 85.', '#22D3EE', 144, false, false, 'score_forme', 4),
  ('score_forme_5', 'performance', 'elite', 'Score Forme V', 'Atteins un Score Forme de 90.', '#22D3EE', 145, false, false, 'score_forme', 5),
  ('score_forme_legend', 'performance', 'legend', 'Score Forme LEGEND', 'Atteins un Score Forme de 95.', '#22D3EE', 146, false, false, 'score_forme', 6),
  ('gryd_verified_1', 'verified', 'road', 'GRYD Verified I', 'Atteins 10 courses vérifiées.', '#9BA3AD', 147, false, false, 'gryd_verified', 1),
  ('gryd_verified_2', 'verified', 'tempo', 'GRYD Verified II', 'Atteins 50 courses vérifiées.', '#9BA3AD', 148, false, false, 'gryd_verified', 2),
  ('gryd_verified_3', 'verified', 'race', 'GRYD Verified III', 'Atteins 100 courses vérifiées.', '#9BA3AD', 149, false, false, 'gryd_verified', 3),
  ('gryd_verified_4', 'verified', 'carbon', 'GRYD Verified IV', 'Atteins 250 courses vérifiées.', '#9BA3AD', 150, false, false, 'gryd_verified', 4),
  ('gryd_verified_5', 'verified', 'elite', 'GRYD Verified V', 'Atteins 500 courses vérifiées.', '#9BA3AD', 151, false, false, 'gryd_verified', 5),
  ('gryd_verified_legend', 'verified', 'legend', 'GRYD Verified LEGEND', 'Atteins 1 000 courses vérifiées.', '#9BA3AD', 152, false, false, 'gryd_verified', 6),
  ('clean_runner_1', 'verified', 'road', 'Clean Runner I', 'Atteins 30 jours sans run rejeté.', '#9BA3AD', 153, false, false, 'clean_runner', 1),
  ('clean_runner_2', 'verified', 'tempo', 'Clean Runner II', 'Atteins 60 jours sans run rejeté.', '#9BA3AD', 154, false, false, 'clean_runner', 2),
  ('clean_runner_3', 'verified', 'race', 'Clean Runner III', 'Atteins 90 jours sans run rejeté.', '#9BA3AD', 155, false, false, 'clean_runner', 3),
  ('clean_runner_4', 'verified', 'carbon', 'Clean Runner IV', 'Atteins 180 jours sans run rejeté.', '#9BA3AD', 156, false, false, 'clean_runner', 4),
  ('clean_runner_5', 'verified', 'elite', 'Clean Runner V', 'Atteins 365 jours sans run rejeté.', '#9BA3AD', 157, false, false, 'clean_runner', 5),
  ('clean_runner_legend', 'verified', 'legend', 'Clean Runner LEGEND', 'Atteins 730 jours sans run rejeté.', '#9BA3AD', 158, false, false, 'clean_runner', 6),
  ('season_rank_1', 'saison', 'road', 'Season Rank I', 'Termine dans le top 100 local.', '#E7B84C', 159, false, false, 'season_rank', 1),
  ('season_rank_2', 'saison', 'tempo', 'Season Rank II', 'Termine dans le top 50 local.', '#E7B84C', 160, false, false, 'season_rank', 2),
  ('season_rank_3', 'saison', 'race', 'Season Rank III', 'Termine dans le top 10 local.', '#E7B84C', 161, false, false, 'season_rank', 3),
  ('season_rank_4', 'saison', 'carbon', 'Season Rank IV', 'Termine dans le top 3 local.', '#E7B84C', 162, false, false, 'season_rank', 4),
  ('season_rank_5', 'saison', 'elite', 'Season Rank V', 'Termine #1 local.', '#E7B84C', 163, false, false, 'season_rank', 5),
  ('season_rank_legend', 'saison', 'legend', 'Season Rank LEGEND', 'Remporte la saison locale.', '#E7B84C', 164, false, false, 'season_rank', 6),
  ('national_rank_1', 'saison', 'road', 'National Rank I', 'Termine dans le top 1 000 France.', '#E7B84C', 165, false, false, 'national_rank', 1),
  ('national_rank_2', 'saison', 'tempo', 'National Rank II', 'Termine dans le top 500 France.', '#E7B84C', 166, false, false, 'national_rank', 2),
  ('national_rank_3', 'saison', 'race', 'National Rank III', 'Termine dans le top 100 France.', '#E7B84C', 167, false, false, 'national_rank', 3),
  ('national_rank_4', 'saison', 'carbon', 'National Rank IV', 'Termine dans le top 50 France.', '#E7B84C', 168, false, false, 'national_rank', 4),
  ('national_rank_5', 'saison', 'elite', 'National Rank V', 'Termine dans le top 10 France.', '#E7B84C', 169, false, false, 'national_rank', 5),
  ('national_rank_legend', 'saison', 'legend', 'National Rank LEGEND', 'Termine #1 France.', '#E7B84C', 170, false, false, 'national_rank', 6),
  ('crew_season_1', 'saison', 'road', 'Crew Season I', 'Ton crew termine dans le top 100.', '#E7B84C', 171, false, false, 'crew_season', 1),
  ('crew_season_2', 'saison', 'tempo', 'Crew Season II', 'Ton crew termine dans le top 50.', '#E7B84C', 172, false, false, 'crew_season', 2),
  ('crew_season_3', 'saison', 'race', 'Crew Season III', 'Ton crew termine dans le top 10.', '#E7B84C', 173, false, false, 'crew_season', 3),
  ('crew_season_4', 'saison', 'carbon', 'Crew Season IV', 'Ton crew termine dans le top 3.', '#E7B84C', 174, false, false, 'crew_season', 4),
  ('crew_season_5', 'saison', 'elite', 'Crew Season V', 'Ton crew termine #1 local.', '#E7B84C', 175, false, false, 'crew_season', 5),
  ('crew_season_legend', 'saison', 'legend', 'Crew Season LEGEND', 'Ton crew termine #1 France.', '#E7B84C', 176, false, false, 'crew_season', 6),
  ('secret_la_boucle', 'secret', 'tempo', 'La Boucle', 'Termine une course en revenant à moins de 100 m de ton point de départ.', '#E7B84C', 177, true, false, null, null),
  ('secret_dix_pile', 'secret', 'tempo', 'Dix Pile', 'Cours très exactement 10,00 km (± 1 %).', '#E7B84C', 178, true, false, null, null),
  ('secret_triple', 'secret', 'carbon', 'Triplé', 'Valide 3 courses dans la même journée.', '#E7B84C', 179, true, false, null, null),
  ('secret_heure_du_loup', 'secret', 'carbon', 'Heure du Loup', 'Démarre une course entre 3 h et 4 h du matin.', '#E7B84C', 180, true, false, null, null),
  ('secret_ligne_droite', 'secret', 'tempo', 'Ligne Droite', 'Course ≥ 2 km quasi rectiligne : arrive à vol d''oiseau à ≥ 95 % de la distance courue.', '#E7B84C', 181, true, false, null, null),
  ('secret_centurion', 'secret', 'carbon', 'Centurion', 'Capture 100 hexagones en une seule course.', '#E7B84C', 182, true, false, null, null),
  ('secret_premiere_foulee', 'secret', 'tempo', 'Première Foulée de l''An', 'Cours un 1ᵉʳ janvier.', '#E7B84C', 183, true, false, null, null),
  ('secret_semaine_parfaite', 'secret', 'carbon', 'Semaine Parfaite', 'Cours 7 jours d''affilée.', '#E7B84C', 184, true, false, null, null),
  ('secret_fidele_au_poste', 'secret', 'tempo', 'Fidèle au Poste', 'Démarre 10 courses depuis le même endroit (~150 m).', '#E7B84C', 185, true, false, null, null),
  ('secret_comeback', 'secret', 'race', 'Comeback', 'Reviens courir après au moins 30 jours d''inactivité.', '#E7B84C', 186, true, false, null, null),
  ('secret_silent_takeover', 'secret', 'elite', 'Silent Takeover', 'Vole au moins 50 hexes lors d''une course démarrée la nuit.', '#E7B84C', 187, true, false, null, null),
  ('secret_no_map_run', 'secret', 'elite', 'No Map Run', 'Termine une course valide 100 % en territoire jamais possédé.', '#E7B84C', 188, true, false, null, null),
  ('explorateur', 'onboarding', 'tempo', 'Explorateur', 'Capture au moins 1 hex dans une zone pionnière ou sauvage.', '#8B5CF6', 189, false, true, null, null),
  ('solitaire', 'onboarding', 'tempo', 'Solitaire', '10 courses valides sans appartenir à un crew.', '#8B5CF6', 190, false, true, null, null),
  ('sprinter', 'onboarding', 'race', 'Sprinter', 'Course ≥ 1 km avec une allure moyenne sous 4:00/km.', '#8B5CF6', 191, false, true, null, null)
on conflict (key) do update set
  family       = excluded.family,
  tier         = excluded.tier,
  name         = excluded.name,
  requirement  = excluded.requirement,
  family_color = excluded.family_color,
  sort         = excluded.sort,
  secret       = excluded.secret,
  legacy       = excluded.legacy,
  family_slug  = excluded.family_slug,
  level        = excluded.level;

-- Médaille §15 season_top1_local (awardée par season_close, FOUNDER/LOCAL_TOP1) :
-- rattachée à la famille saison V2, tier legend, hors familles progressives.
update public.badges
set family = 'saison', family_color = '#E7B84C', tier = coalesce(tier, 'legend'),
    secret = false, legacy = false, family_slug = null, level = null
where key = 'season_top1_local';

-- Garde-fou : toute ligne résiduelle sans tier légal (héritage 0006) → 'road'.
update public.badges set tier = 'road'
where tier is null or tier not in ('road','tempo','race','carbon','elite','legend');

-- tier NOT NULL + check (§1.1) — posés après le seed (toutes les lignes remplies).
-- Rejouable : on retire les checks V2 s'ils existent déjà (replay), puis on pose.
alter table public.badges alter column tier set not null;
alter table public.badges drop constraint if exists badges_tier_check;
alter table public.badges drop constraint if exists badges_level_check;
alter table public.badges
  add constraint badges_tier_check
  check (tier in ('road','tempo','race','carbon','elite','legend'));
alter table public.badges
  add constraint badges_level_check check (level is null or (level between 1 and 6));

-- ─── user_stats : nouvelles colonnes V2 (snake_case des BadgeMetric V2) ──────
-- Les anciennes colonnes V1 restent (inoffensives, plus alimentées). On ajoute
-- les métriques V2 + le suivi interne last_active_week / last_rejected_day /
-- first_active_day. Toutes default 0/null, alimentées par ingest_run ou jobs.
alter table public.user_stats add column if not exists season_distance_m       bigint  not null default 0 check (season_distance_m >= 0);
alter table public.user_stats add column if not exists first_shares            integer not null default 0 check (first_shares >= 0);
alter table public.user_stats add column if not exists sectors_controlled      integer not null default 0 check (sectors_controlled >= 0);      -- job
alter table public.user_stats add column if not exists best_sector_control_pct integer not null default 0 check (best_sector_control_pct >= 0);  -- job
alter table public.user_stats add column if not exists sectors_contested       integer not null default 0 check (sectors_contested >= 0);        -- job
alter table public.user_stats add column if not exists offensives_joined       integer not null default 0 check (offensives_joined >= 0);        -- job offensives V1
alter table public.user_stats add column if not exists hold_days               integer not null default 0 check (hold_days >= 0);                -- job
alter table public.user_stats add column if not exists clusters_protected      integer not null default 0 check (clusters_protected >= 0);       -- job (boucliers)
alter table public.user_stats add column if not exists rural_zones_opened      integer not null default 0 check (rural_zones_opened >= 0);
alter table public.user_stats add column if not exists supply_lines            integer not null default 0 check (supply_lines >= 0);             -- job
alter table public.user_stats add column if not exists crew_captain_score      integer not null default 0 check (crew_captain_score >= 0);       -- job
alter table public.user_stats add column if not exists active_members_week     integer not null default 0 check (active_members_week >= 0);      -- job
alter table public.user_stats add column if not exists pace_improvement_s_km   integer not null default 0 check (pace_improvement_s_km >= 0);    -- perf V1
alter table public.user_stats add column if not exists weeks_active            integer not null default 0 check (weeks_active >= 0);
alter table public.user_stats add column if not exists forme_score             integer not null default 0 check (forme_score >= 0);             -- perf V1
alter table public.user_stats add column if not exists verified_runs           integer not null default 0 check (verified_runs >= 0);
alter table public.user_stats add column if not exists clean_days              integer not null default 0 check (clean_days >= 0);
alter table public.user_stats add column if not exists season_rank             integer not null default 0 check (season_rank >= 0);             -- season_close (rang inversé)
alter table public.user_stats add column if not exists national_rank           integer not null default 0 check (national_rank >= 0);           -- season_close
alter table public.user_stats add column if not exists crew_season_rank        integer not null default 0 check (crew_season_rank >= 0);        -- season_close
alter table public.user_stats add column if not exists comeback_runs           integer not null default 0 check (comeback_runs >= 0);
alter table public.user_stats add column if not exists silent_takeover_runs    integer not null default 0 check (silent_takeover_runs >= 0);
alter table public.user_stats add column if not exists no_map_runs             integer not null default 0 check (no_map_runs >= 0);
-- Suivi interne V2 (jamais évalué directement par un badge)
alter table public.user_stats add column if not exists last_active_week        text;  -- 'YYYY-Www' ISO
alter table public.user_stats add column if not exists last_rejected_day       text;  -- 'YYYY-MM-DD' local
alter table public.user_stats add column if not exists first_active_day        text;  -- 'YYYY-MM-DD' local

-- ─── runs : polyline_hash pour la déduplication Activity Hub (§4) ────────────
alter table public.runs add column if not exists polyline_hash text; -- sha-256 hex des points arrondis
create index if not exists runs_user_hash_idx on public.runs (user_id, polyline_hash) where polyline_hash is not null;

-- ─── imported_activities : Activity Hub (§4) ────────────────────────────────
create table if not exists public.imported_activities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  source        text not null check (source in
                  ('gryd_live','healthkit','health_connect','strava','garmin',
                   'whoop','fitbit','polar','coros','suunto')),
  external_id   text,                 -- id de l'activité chez la source (idempotence import)
  started_at    timestamptz not null,
  duration_s    integer check (duration_s >= 0),
  distance_m    integer check (distance_m >= 0),
  polyline_hash text,                 -- sha-256 des points arrondis (dédup §4)
  status        text not null check (status in
                  ('capture_eligible','stats_only','partial','rejected','duplicate','review')),
  matched_run_id uuid references public.runs (id) on delete set null, -- course GRYD liée (dédup)
  created_at    timestamptz not null default now()
);
create index if not exists imported_activities_user_idx on public.imported_activities (user_id, started_at desc);
create unique index if not exists imported_activities_source_ext_idx
  on public.imported_activities (user_id, source, external_id) where external_id is not null;

-- RLS (style 0003) : lecture owner-only, écriture service_role uniquement.
alter table public.imported_activities enable row level security;
revoke insert, update, delete on public.imported_activities from anon, authenticated;
create policy imported_activities_select_own on public.imported_activities
  for select to authenticated
  using (user_id = (select auth.uid()));
