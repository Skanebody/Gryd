-- GRYD — 0004 seed : zones Saison 0 (Paris + Lille 'active' = mode Guerre
-- d'office, AMENDEMENT-02 §2), saisons actives, badges de base, missions
-- d'onboarding (GRYD_missions_quests.md §3).
-- Idempotent (on conflict / not exists) : rejouable sans effet de bord.

-- ─── city_zones ──────────────────────────────────────────────────────────────
-- TODO O4: remplacer par les GeoJSON précis avant bêta (DISCOVERY.md O4).
-- Polygones provisoires GROSSIERS : simples bounding polygons.

-- Paris petite couronne (75 + 92 + 93 + 94), approximatif.
insert into public.city_zones (city_id, name, geojson, status)
values (
  'paris', -- game-rules: CITIES.paris
  'Paris',
  '{
    "type": "Polygon",
    "coordinates": [[
      [2.13, 48.69],
      [2.61, 48.69],
      [2.61, 48.99],
      [2.13, 48.99],
      [2.13, 48.69]
    ]]
  }'::jsonb, -- TODO O4: remplacer par les GeoJSON précis avant bêta
  'active' -- mode Guerre d'office Saison 0 (AMENDEMENT-02 §2)
)
on conflict (city_id) do nothing;

-- Métropole européenne de Lille (MEL), approximatif.
insert into public.city_zones (city_id, name, geojson, status)
values (
  'lille', -- game-rules: CITIES.lille
  'Métropole de Lille',
  '{
    "type": "Polygon",
    "coordinates": [[
      [2.83, 50.52],
      [3.28, 50.52],
      [3.28, 50.78],
      [2.83, 50.78],
      [2.83, 50.52]
    ]]
  }'::jsonb, -- TODO O4: remplacer par les GeoJSON précis avant bêta
  'active' -- mode Guerre d'office Saison 0 (AMENDEMENT-02 §2)
)
on conflict (city_id) do nothing;

-- ─── Saison 0 « Fondateurs » : une par zone active ───────────────────────────
insert into public.seasons (city_id, starts_at, ends_at, status)
select
  cz.city_id,
  now(),
  now() + interval '8 weeks', -- game-rules: SEASON_DURATION_WEEKS
  'active'
from public.city_zones cz
where cz.status = 'active'
  and not exists (
    select 1 from public.seasons s
    where s.city_id = cz.city_id and s.status = 'active'
  );

-- ─── Badges de base (AMENDEMENT-02 §6 ; le set complet ~20 arrive avec le contenu) ─
insert into public.badges (key, family, rarity)
values
  ('first_capture', 'conquete', 'common'),
  ('first_steal',   'conquete', 'common'),
  ('first_defense', 'defense',  'common'),
  ('founder',       'special',  'legend')
on conflict (key) do nothing;

-- ─── Missions d'onboarding (GRYD_missions_quests.md §3, 5 missions) ──────────
-- Montants XP provisoires (le doc ne fixe pas les récompenses) — à caler avec
-- l'économie XP avant bêta.
insert into public.missions (key, scope, target, reward_type, reward_amount)
values
  ('onboarding_first_capture', 'onboarding', 1,  'xp', 50), -- Cours 1 km et capture tes premiers hexes.
  ('onboarding_join_crew',     'onboarding', 1,  'xp', 50), -- Rejoins ou crée un crew pour cumuler votre territoire.
  ('onboarding_defend',        'onboarding', 10, 'xp', 75), -- Repasse sur 10 hexes à toi pour les défendre.
  ('onboarding_share',         'onboarding', 1,  'xp', 25), -- Partage ta première conquête en story.
  ('onboarding_discover_map',  'onboarding', 1,  'xp', 25)  -- Appuie sur une zone ennemie ou neutre pour voir le gain potentiel.
on conflict (key) do nothing;
