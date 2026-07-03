-- GRYD — 0007 catalogue de badges + stats vie entière (AMENDEMENT-04).
-- Source de vérité : packages/shared/src/badges.ts (59 badges : 50 + 9 secrets).
-- ⚠ Ce seed est écrit À LA MAIN en cohérence avec badges.ts — à terme, le
--   générer depuis badges.ts par script (comme sync-game-rules.mjs).
-- Idempotent : rejouable sans effet de bord (add column if not exists, upsert).

-- ─── badges : colonnes du catalogue (0002 n'avait que key/family/rarity) ────
alter table public.badges add column if not exists name         text;
alter table public.badges add column if not exists requirement  text;
-- Couleur d'accent de la FAMILLE — donnée du catalogue, exception polychrome
-- contrôlée (AMENDEMENT-04 §1) : utilisée uniquement sur les surfaces badge.
alter table public.badges add column if not exists family_color text;
alter table public.badges add column if not exists sort         integer;
-- Masqué en « ? » en UI tant que non débloqué (§2).
alter table public.badges add column if not exists secret       boolean not null default false;
-- Non attribuable en l'état : raison en texte, null = attribuable (§4).
alter table public.badges add column if not exists dormant      text;

-- L'ancien check famille n'existait pas (family text libre en 0002) : les
-- valeurs légales sont désormais celles de BadgeFamily (badges.ts).

-- ─── Reseed des 59 badges du catalogue (upsert idempotent) ───────────────────
-- Couleurs : fondateur #8B5CF6 · performance #22D3EE · territoire #4ADE80 ·
-- crew #FB923C · special #F472B6 · secret #E7B84C (BADGE_FAMILY_COLORS).
insert into public.badges (key, family, rarity, name, requirement, family_color, sort, secret, dormant) values
  -- ── Fondateur (10) — violet ──
  ('premiers_pas',    'fondateur',   'common', 'Premiers Pas',   'Termine ta première course valide.',                       '#8B5CF6',  1, false, null),
  ('enclenche',       'fondateur',   'common', 'Enclenché',      'Capture ton premier hexagone.',                            '#8B5CF6',  2, false, null),
  ('fondateur',       'fondateur',   'common', 'Fondateur',      'Capture 10 hexagones (cumul vie entière).',                '#8B5CF6',  3, false, null),
  ('pionnier',        'fondateur',   'rare',   'Pionnier',       'Capture 100 hexagones (cumul vie entière).',               '#8B5CF6',  4, false, null),
  ('explorateur',     'fondateur',   'rare',   'Explorateur',    'Capture au moins 1 hex dans une zone pionnière ou sauvage.', '#8B5CF6',  5, false, null),
  ('batisseur',       'fondateur',   'epic',   'Bâtisseur',      'Fonde ton premier avant-poste.',                           '#8B5CF6',  6, false, 'Détection avant-postes/routes/secteurs V0 non branchée — attribuable dès qu''elle tourne (AMENDEMENT-04 §4).'),
  ('connecteur',      'fondateur',   'rare',   'Connecteur',     'Relie deux territoires par une route.',                    '#8B5CF6',  7, false, 'Détection avant-postes/routes/secteurs V0 non branchée — attribuable dès qu''elle tourne (AMENDEMENT-04 §4).'),
  ('implante',        'fondateur',   'common', 'Implanté',       '7 jours actifs cumulés (≥ 1 course valide chacun).',       '#8B5CF6',  8, false, null),
  ('racines',         'fondateur',   'rare',   'Racines',        '30 jours actifs cumulés (≥ 1 course valide chacun).',      '#8B5CF6',  9, false, null),
  ('legende_locale',  'fondateur',   'legend', 'Légende Locale', '100 jours actifs cumulés (≥ 1 course valide chacun).',     '#8B5CF6', 10, false, null),
  -- ── Performance (10) — cyan ──
  ('sprinter',        'performance', 'rare',   'Sprinter',       'Course ≥ 1 km avec une allure moyenne sous 4:00/km.',      '#22D3EE', 11, false, null),
  ('energie',         'performance', 'common', 'Énergie',        'Termine 5 courses valides.',                               '#22D3EE', 12, false, null),
  ('endurance',       'performance', 'common', 'Endurance',      'Cours 10 km en une seule course.',                         '#22D3EE', 13, false, null),
  ('perseverant',     'performance', 'rare',   'Persévérant',    'Cours 21 km en une seule course.',                         '#22D3EE', 14, false, null),
  ('devoue',          'performance', 'rare',   'Dévoué',         'Cumule 42 km de course.',                                  '#22D3EE', 15, false, null),
  ('iron_runner',     'performance', 'rare',   'Iron Runner',    'Cumule 100 km de course.',                                 '#22D3EE', 16, false, null),
  ('ultra_runner',    'performance', 'epic',   'Ultra Runner',   'Cumule 200 km de course.',                                 '#22D3EE', 17, false, null),
  ('marathonien',     'performance', 'epic',   'Marathonien',    'Cours 42,195 km en une seule course.',                     '#22D3EE', 18, false, null),
  ('inarretable',     'performance', 'epic',   'Inarrêtable',    'Cumule 300 km de course.',                                 '#22D3EE', 19, false, null),
  ('machine',         'performance', 'legend', 'Machine',        'Cumule 500 km de course.',                                 '#22D3EE', 20, false, null),
  -- ── Territoire (10) — vert ──
  ('conquerant',      'territoire',  'common', 'Conquérant',     'Capture 500 hexagones (cumul vie entière).',               '#4ADE80', 21, false, null),
  ('dominateur',      'territoire',  'rare',   'Dominateur',     'Capture 1 000 hexagones (cumul vie entière).',             '#4ADE80', 22, false, null),
  ('seigneur',        'territoire',  'epic',   'Seigneur',       'Capture 5 000 hexagones (cumul vie entière).',             '#4ADE80', 23, false, null),
  ('maitre',          'territoire',  'legend', 'Maître',         'Capture 10 000 hexagones (cumul vie entière).',            '#4ADE80', 24, false, null),
  ('rival',           'territoire',  'common', 'Rival',          'Vole 1 hexagone à un adversaire.',                         '#4ADE80', 25, false, null),
  ('pillard',         'territoire',  'rare',   'Pillard',        'Vole 10 hexagones à des adversaires.',                     '#4ADE80', 26, false, null),
  ('predateur',       'territoire',  'epic',   'Prédateur',      'Vole 50 hexagones à des adversaires.',                     '#4ADE80', 27, false, null),
  ('defenseur',       'territoire',  'common', 'Défenseur',      'Défends 10 hexagones.',                                    '#4ADE80', 28, false, null),
  ('forteresse',      'territoire',  'epic',   'Forteresse',     'Défends 50 hexagones.',                                    '#4ADE80', 29, false, null),
  ('legende_territoire', 'territoire', 'legend', 'Légende',      'Domine un secteur à 70 % ou plus.',                        '#4ADE80', 30, false, null),
  -- ── Crew (10) — orange ──
  ('recrue',          'crew',        'common', 'Recrue',         'Rejoins un crew.',                                         '#FB923C', 31, false, null),
  ('coequipier',      'crew',        'common', 'Coéquipier',     '5 contributions crew.',                                    '#FB923C', 32, false, null),
  ('membre_actif',    'crew',        'rare',   'Membre Actif',   '20 contributions crew.',                                   '#FB923C', 33, false, null),
  ('pilier',          'crew',        'epic',   'Pilier',         '50 contributions crew.',                                   '#FB923C', 34, false, null),
  ('stratege',        'crew',        'epic',   'Stratège',       'Participe à 10 avant-postes crew.',                        '#FB923C', 35, false, 'Détection avant-postes/routes/secteurs V0 non branchée — attribuable dès qu''elle tourne (AMENDEMENT-04 §4).'),
  ('batisseur_crew',  'crew',        'rare',   'Bâtisseur Crew', 'Ouvre 1 route pour ton crew.',                             '#FB923C', 36, false, 'Détection avant-postes/routes/secteurs V0 non branchée — attribuable dès qu''elle tourne (AMENDEMENT-04 §4).'),
  ('leader',          'crew',        'common', 'Leader',         'Crée un crew.',                                            '#FB923C', 37, false, null),
  ('commandant',      'crew',        'rare',   'Commandant',     'Ton crew atteint 10 membres.',                             '#FB923C', 38, false, null),
  ('legende_crew',    'crew',        'legend', 'Légende Crew',   'Ton crew atteint 50 membres.',                             '#FB923C', 39, false, 'CREW_MAX_MEMBERS = 10 en Saison 0 — attribuable quand le cap sera levé (V2). On ne change pas la règle pour un badge.'),
  ('dynastie',        'crew',        'legend', 'Dynastie',       'Ton crew atteint 100 membres.',                            '#FB923C', 40, false, 'CREW_MAX_MEMBERS = 10 en Saison 0 — attribuable quand le cap sera levé (V2). On ne change pas la règle pour un badge.'),
  -- ── Spécial (10) — rose ──
  ('nocturne',        'special',     'common', 'Nocturne',       'Course démarrée entre 22 h et 5 h.',                       '#F472B6', 41, false, null),
  ('aube',            'special',     'common', 'Aube',           'Course démarrée entre 5 h et 7 h.',                        '#F472B6', 42, false, null),
  ('meteo',           'special',     'rare',   'Météo',          'Cours sous la pluie.',                                     '#F472B6', 43, false, 'Nécessite une source météo (V1).'),
  ('hiver',           'special',     'rare',   'Hiver',          'Cours sous la neige.',                                     '#F472B6', 44, false, 'Nécessite une source météo (V1).'),
  ('chaleur',         'special',     'rare',   'Chaleur',        'Cours par forte chaleur.',                                 '#F472B6', 45, false, 'Nécessite une source météo (V1).'),
  ('solitaire',       'special',     'rare',   'Solitaire',      '10 courses valides sans appartenir à un crew.',            '#F472B6', 46, false, null),
  ('social',          'special',     'common', 'Social',         'Parraine 1 coureur (1re course valide du filleul).',       '#F472B6', 47, false, null),
  ('communaute',      'special',     'epic',   'Communauté',     'Parraine 5 coureurs.',                                     '#F472B6', 48, false, null),
  ('evenement',       'special',     'rare',   'Événement',      'Participe à un événement GRYD.',                           '#F472B6', 49, false, 'Nécessite le système d''événements (V1).'),
  ('saison_0',        'special',     'legend', 'Saison 0',       'Capture au moins 1 hex pendant la Saison 0.',              '#F472B6', 50, false, null),
  -- ── Secrets (9) — or, masqués en « ? » (§2) ──
  ('secret_la_boucle',        'secret', 'rare', 'La Boucle',                'Termine une course en revenant à moins de 100 m de ton point de départ.',                  '#E7B84C', 51, true, null),
  ('secret_dix_pile',         'secret', 'rare', 'Dix Pile',                 'Cours très exactement 10,00 km (± 1 %).',                                                   '#E7B84C', 52, true, null),
  ('secret_triple',           'secret', 'epic', 'Triplé',                   'Valide 3 courses dans la même journée.',                                                    '#E7B84C', 53, true, null),
  ('secret_heure_du_loup',    'secret', 'epic', 'Heure du Loup',            'Démarre une course entre 3 h et 4 h du matin.',                                             '#E7B84C', 54, true, null),
  ('secret_ligne_droite',     'secret', 'rare', 'Ligne Droite',             'Course ≥ 2 km quasi rectiligne : arrive à vol d''oiseau à ≥ 95 % de la distance courue.',   '#E7B84C', 55, true, null),
  ('secret_centurion',        'secret', 'epic', 'Centurion',                'Capture 100 hexagones en une seule course.',                                                '#E7B84C', 56, true, null),
  ('secret_premiere_foulee',  'secret', 'rare', 'Première Foulée de l''An', 'Cours un 1ᵉʳ janvier.',                                                                     '#E7B84C', 57, true, null),
  ('secret_semaine_parfaite', 'secret', 'epic', 'Semaine Parfaite',         'Cours 7 jours d''affilée.',                                                                 '#E7B84C', 58, true, null),
  ('secret_fidele_au_poste',  'secret', 'rare', 'Fidèle au Poste',          'Démarre 10 courses depuis le même endroit (~150 m).',                                       '#E7B84C', 59, true, null)
on conflict (key) do update set
  family       = excluded.family,
  rarity       = excluded.rarity,
  name         = excluded.name,
  requirement  = excluded.requirement,
  family_color = excluded.family_color,
  sort         = excluded.sort,
  secret       = excluded.secret,
  dormant      = excluded.dormant;

-- ─── Harmonisation des keys seedées en 0004 (placeholders AMENDEMENT-02) ─────
-- founder → saison_0 (sémantique identique : fondateur de la Saison 0 ; la
-- planche réserve 'fondateur' à « 10 hex capturés », qui est un autre badge ;
-- season_close/logic.ts FOUNDER_BADGE_KEY mis à jour en conséquence),
-- first_capture → premiers_pas (une capture implique une course valide),
-- first_steal → rival (sémantique identique : 1 vol).
-- Les attributions existantes migrent vers la nouvelle key (sauf doublon déjà présent).
update public.user_badges ub
set badge_key = m.new_key
from (values
  ('founder',       'saison_0'),
  ('first_capture', 'premiers_pas'),
  ('first_steal',   'rival')
) as m(old_key, new_key)
where ub.badge_key = m.old_key
  and not exists (
    select 1 from public.user_badges d
    where d.user_id = ub.user_id and d.badge_key = m.new_key
  );

-- first_defense (1 défense) n'a AUCUN équivalent dans la planche (Défenseur =
-- 10 défenses, seuil différent) : supprimé, pré-bêta, avec ses attributions
-- résiduelles (cascade). Les doublons restants des trois keys migrées partent aussi.
delete from public.badges where key in ('founder', 'first_capture', 'first_steal', 'first_defense');

-- season_top1_local (0006, règlement §15) reste HORS catalogue des 59
-- (attribué par season_close) — on remplit ses colonnes d'affichage.
update public.badges
set name         = 'Gardien·ne locale',
    requirement  = 'Termine n°1 du classement de ta ville à la fin de la saison.',
    family_color = '#F472B6', -- famille special (rose)
    secret       = false
where key = 'season_top1_local';

-- ─── user_stats : stats vie entière (LifetimeStats, engine/badges.ts) ────────
-- 1 ligne par joueur, écrite UNIQUEMENT par service_role (ingest_run applique
-- applyRunToStats ; les pipelines V1 — crews, parrainage, avant-postes, météo,
-- secteurs — alimenteront leurs colonnes). Colonnes = LifetimeStats en snake_case.
create table if not exists public.user_stats (
  user_id                 uuid primary key references public.users (id) on delete cascade,
  -- Volumes
  runs_valid              integer not null default 0 check (runs_valid >= 0),
  total_distance_m        bigint  not null default 0 check (total_distance_m >= 0),
  active_days             integer not null default 0 check (active_days >= 0), -- jours actifs DISTINCTS (§3)
  best_run_distance_m     integer not null default 0 check (best_run_distance_m >= 0),
  best_avg_pace_s_km      integer not null default 0 check (best_avg_pace_s_km >= 0), -- 0 = aucune
  sprint_runs             integer not null default 0 check (sprint_runs >= 0),
  -- Territoire (capturés = neutres + volés, §3)
  hexes_captured          integer not null default 0 check (hexes_captured >= 0),
  steals                  integer not null default 0 check (steals >= 0),
  defends                 integer not null default 0 check (defends >= 0),
  pioneer_hexes           integer not null default 0 check (pioneer_hexes >= 0),
  max_hexes_in_run        integer not null default 0 check (max_hexes_in_run >= 0),
  sectors_visited         integer not null default 0 check (sectors_visited >= 0),   -- V1
  outposts                integer not null default 0 check (outposts >= 0),          -- détection V0
  routes                  integer not null default 0 check (routes >= 0),            -- détection V0
  dominated_sectors       integer not null default 0 check (dominated_sectors >= 0), -- job sector_control V1
  -- Crew / solo (§3)
  crews_joined            integer not null default 0 check (crews_joined >= 0),
  crews_created           integer not null default 0 check (crews_created >= 0),     -- endpoint crew V1
  crew_contributions      integer not null default 0 check (crew_contributions >= 0),
  crew_outposts           integer not null default 0 check (crew_outposts >= 0),     -- détection V0
  crew_routes             integer not null default 0 check (crew_routes >= 0),       -- détection V0
  max_crew_size           integer not null default 0 check (max_crew_size >= 0),
  solo_runs               integer not null default 0 check (solo_runs >= 0),
  referrals_activated     integer not null default 0 check (referrals_activated >= 0), -- pipeline parrainage §3.7
  -- Saison 0
  season_zero_runs        integer not null default 0 check (season_zero_runs >= 0),
  season_zero_hexes       integer not null default 0 check (season_zero_hexes >= 0),
  -- Zones (badge Explorateur : course avec ≥ 1 hex capturé en zone pionnière/sauvage)
  pioneer_zone_runs       integer not null default 0 check (pioneer_zone_runs >= 0),
  -- Plages horaires locales / météo / événements
  night_runs              integer not null default 0 check (night_runs >= 0),
  dawn_runs               integer not null default 0 check (dawn_runs >= 0),
  rain_runs               integer not null default 0 check (rain_runs >= 0), -- météo V1
  snow_runs               integer not null default 0 check (snow_runs >= 0), -- météo V1
  heat_runs               integer not null default 0 check (heat_runs >= 0), -- météo V1
  event_runs              integer not null default 0 check (event_runs >= 0), -- events V1
  -- Secrets
  loop_runs               integer not null default 0 check (loop_runs >= 0),
  exact_ten_runs          integer not null default 0 check (exact_ten_runs >= 0),
  max_runs_in_one_day     integer not null default 0 check (max_runs_in_one_day >= 0),
  wolf_hour_runs          integer not null default 0 check (wolf_hour_runs >= 0),
  straight_runs           integer not null default 0 check (straight_runs >= 0),
  new_year_runs           integer not null default 0 check (new_year_runs >= 0),
  best_active_day_streak  integer not null default 0 check (best_active_day_streak >= 0),
  home_spot_runs          integer not null default 0 check (home_spot_runs >= 0),
  -- Suivi interne (jamais évalué directement par un badge)
  last_active_day         text, -- jour local 'YYYY-MM-DD' (lu textuellement, cf. localClock)
  runs_on_last_active_day integer not null default 0 check (runs_on_last_active_day >= 0),
  active_day_streak       integer not null default 0 check (active_day_streak >= 0),
  -- Cellule H3 res 9 du premier départ (« Fidèle au Poste ») — stockage grossier,
  -- jamais de lat/lng exact (esprit §7). Hex string, jamais jointe (D13 non requis).
  home_spot_h3            text,
  updated_at              timestamptz not null default now()
);

-- ─── RLS : lecture owner-only, écriture service_role uniquement ──────────────
alter table public.user_stats enable row level security;
revoke insert, update, delete on public.user_stats from anon, authenticated;

create policy user_stats_select_own on public.user_stats
  for select to authenticated
  using (user_id = (select auth.uid()));
