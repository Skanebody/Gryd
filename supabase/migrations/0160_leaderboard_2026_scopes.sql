-- 0160 — « Ta commune, cette semaine » : LES RÈGLES, LA SEMAINE, LES PORTÉES.
-- ADR-013 §2.1 (brouillon du 10/09/2026), lot L. ADDITIVE.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT PAS ════════════════
-- FAIT   : (1) `leaderboard_rules_2026()` — le MIROIR SQL de
--          `LEADERBOARD_RULES_2026` (packages/shared/src/game-rules.ts), pour
--          qu'aucun seuil ne vive dans une requête ;
--          (2) `leaderboard_week_bounds_2026()` — la semaine lundi→dimanche à
--          Paris, calculée UNE fois pour tout le lot ;
--          (3) `board_scope_communes_2026()` — la portée, résolue sur le
--          référentiel RÉEL (`city_zones`), sans une donnée ajoutée ;
--          (4) l'ouverture des tables de 0082 aux portées 2026, et leur
--          FERMETURE à la lecture directe.
-- NE FAIT PAS : aucune mesure (0161), aucune prise de snapshot (0162), aucun
--          job (0163), aucune lecture (0164). Aucune ligne n'est créée : après
--          cette migration, `leaderboard_snapshots` est toujours vide, et une
--          table vide ne ment à personne.
-- Rollback = drop des trois fonctions, des deux colonnes et des deux policies
-- restrictives, puis restauration des deux `check` d'origine.
--
-- ═══ POURQUOI 0082 EST ÉTENDUE ET NON RÉÉCRITE ═════════════════════════════
-- 0082 a créé `leaderboard_snapshots` / `leaderboard_entries` le 28/07 avec un
-- vocabulaire de portées tiré de la spec d'alors (local / quartier / ville /
-- amis). ADR-013 en nomme trois autres (commune / département / pays). Les deux
-- `check` sont donc REMPLACÉS par des `check` ÉLARGIS — aucune valeur existante
-- n'est retirée, aucune ligne n'existe pour être invalidée (les deux tables
-- sont vides en production, vérifié le 09/09/2026), et le fichier 0082 n'est
-- pas touché : une migration ne se réécrit jamais, elle se poursuit.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LES RÈGLES — LE MIROIR DE `game-rules.ts`, ET RIEN D'AUTRE
-- ════════════════════════════════════════════════════════════════════════════
-- ADR-003 : `packages/shared/src/game-rules.ts` est la source UNIQUE. Le SQL ne
-- peut pas l'importer ; il en porte donc un miroir, marqué ligne à ligne, et
-- `supabase/tests/leaderboard_2026.pglite.test.mjs` compare les deux champ par
-- champ — c'est le même patron que la matrice de catégories de 0140.
--
-- POURQUOI UNE FONCTION ET PAS UNE TABLE DE CONFIGURATION. Une table serait
-- modifiable en production : on pourrait descendre le seuil à 2 le jour où un
-- classement paraît vide. §6.6 du cahier interdit nommément de bouger une
-- calibration « pour faire monter les utilisateurs ». Une fonction `immutable`
-- ne se change que par une migration, donc par une revue.
create or replace function public.leaderboard_rules_2026()
returns jsonb
language sql
immutable
parallel safe
as $$
  select jsonb_build_object(
    'subject', 'user',                                  -- game-rules: LEADERBOARD_RULES_2026.subject
    'metric', 'weekly_new_terrain_m2',                  -- game-rules: LEADERBOARD_RULES_2026.metric
    'stateMetric', 'held_terrain_m2',                   -- game-rules: LEADERBOARD_RULES_2026.stateMetric
    'minRankedSubjects', 5,                             -- game-rules: LEADERBOARD_RULES_2026.minRankedSubjects
    'scopes', jsonb_build_array('commune', 'department', 'country'), -- game-rules: LEADERBOARD_RULES_2026.scopes
    'declaredNotServed', jsonb_build_array('region', 'europe'),      -- game-rules: LEADERBOARD_RULES_2026.declaredNotServed
    'weekStartsOn', 'monday',                           -- game-rules: LEADERBOARD_RULES_2026.weekStartsOn
    'timeZone', 'Europe/Paris',                         -- game-rules: LEADERBOARD_RULES_2026.timeZone
    'snapshotIntervalMinutes', 60,                      -- game-rules: LEADERBOARD_RULES_2026.snapshotIntervalMinutes
    'snapshotMaxAgeMinutes', 180,                       -- game-rules: LEADERBOARD_RULES_2026.snapshotMaxAgeMinutes
    'maxRows', 50                                       -- game-rules: LEADERBOARD_ROWS_LIMIT
  )
$$;

comment on function public.leaderboard_rules_2026() is
  'Miroir SQL de LEADERBOARD_RULES_2026 (game-rules.ts, ADR-003) + LEADERBOARD_ROWS_LIMIT. IMMUTABLE : le seuil de population ne se change pas en production, il se change par migration. Un test PGlite compare ce miroir au fichier source champ par champ.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LA SEMAINE — LUNDI 00:00 → DIMANCHE 23:59, À PARIS
-- ════════════════════════════════════════════════════════════════════════════
-- La fenêtre rendue est HALF-OPEN : [lundi 00:00, lundi suivant 00:00[. C'est
-- la même semaine que « lundi 00h → dimanche 23h59 » sans la milliseconde
-- perdue d'un `<= 23:59:59.999`, et surtout deux semaines consécutives ne
-- comptent jamais le même événement deux fois (même raison qu'en 0103).
--
-- LE FUSEAU EST NOMMÉ, PAS DÉCALÉ. `at time zone 'Europe/Paris'` suit l'heure
-- d'été ; un `+01:00` en dur ferait glisser le classement d'une heure deux fois
-- par an, et le lundi de mars commencerait un dimanche 23 h. `date_trunc('week')`
-- de PostgreSQL démarre le LUNDI (norme ISO 8601) — c'est ce que le fondateur a
-- demandé, et ce n'est pas une coïncidence à laisser implicite.
create or replace function public.leaderboard_week_bounds_2026(p_at timestamptz)
returns table (week_start timestamptz, week_end timestamptz)
language sql
stable
parallel safe
as $$
  select
    (date_trunc('week', p_at at time zone 'Europe/Paris') at time zone 'Europe/Paris'), -- game-rules: LEADERBOARD_RULES_2026.timeZone / weekStartsOn
    ((date_trunc('week', p_at at time zone 'Europe/Paris') + interval '7 days') at time zone 'Europe/Paris')
$$;

comment on function public.leaderboard_week_bounds_2026(timestamptz) is
  'Semaine de classement : [lundi 00:00 Europe/Paris, lundi suivant 00:00[. Fuseau NOMMÉ (heure d''été suivie), bornes half-open (aucun événement compté deux fois).';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LA PORTÉE — RÉSOLUE SUR LE RÉFÉRENTIEL RÉEL, SANS UNE DONNÉE AJOUTÉE
-- ════════════════════════════════════════════════════════════════════════════
-- Une portée est un ENSEMBLE DE COMMUNES, et une commune n'existe ici que si
-- elle a un CONTOUR ADMINISTRATIF RÉEL — c'est-à-dire une ligne `city_zones`
-- ouverte par présence, dont le `city_id` vaut « insee-<code> » et dont le
-- `geojson` vient de geo.api.gouv.fr (0066 / `ingest_run/commune_open.ts`).
--
-- ⚠️ LES DEUX ZONES DE DÉMARRAGE SONT EXCLUES, ET C'EST LE POINT LE PLUS
-- IMPORTANT DE CETTE FONCTION. `city_zones` contient encore 'paris' et 'lille'
-- (0004), deux RECTANGLES approximatifs — Paris y couvre quatre départements.
-- Les traiter en communes fabriquerait un « classement de Paris » mesuré sur
-- une boîte englobante, et leur `city_id` n'a pas de code INSEE : leur
-- département serait inventé. Le filtre `like 'insee-%'` est donc une règle de
-- vérité, pas une commodité de requête.
--
-- POURQUOI PAS `fr_communes` (34 969 lignes, INSEE, Etalab) : elle n'a PAS de
-- polygone (lat/lng seulement, 0068). Un classement de commune a besoin d'un
-- contour, pas d'un centre ; un disque autour du centre avalerait les communes
-- voisines (`commune_open.ts` le dit déjà pour l'ouverture).
create or replace function public.board_scope_communes_2026(p_scope text, p_scope_ref text)
returns table (city_id text, insee text, name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select z.city_id, right(z.city_id, -6) as insee, z.name
  from public.city_zones z
  where z.city_id like 'insee-%'
    and p_scope_ref is not null
    and (
      (p_scope = 'commune' and z.city_id = p_scope_ref)
      -- Le département est DÉDUIT du code INSEE (0103) : aucune table, aucune
      -- donnée ajoutée, la maille est DANS le code.
      or (p_scope = 'department' and public.gryd_dept_of_insee(right(z.city_id, -6)) = p_scope_ref)
      -- Le pays : toute commune portant un code INSEE est française par
      -- construction. 'FR' est la seule référence acceptée — il n'existe aucun
      -- autre pays dans ce référentiel, donc aucun autre pays ne se sert.
      or (p_scope = 'country' and p_scope_ref = 'FR')
    )
$$;

comment on function public.board_scope_communes_2026(text, text) is
  'Les communes RÉELLES d''une portée (commune / department / country). N''accepte que les zones « insee-<code> » ouvertes par présence : les rectangles de démarrage ''paris'' et ''lille'' (0004) ne sont pas des communes et leur département serait inventé.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. 0082 ACCUEILLE LES PORTÉES 2026
-- ════════════════════════════════════════════════════════════════════════════
alter table public.leaderboard_snapshots
  drop constraint if exists leaderboard_snapshots_scope_check;
alter table public.leaderboard_snapshots
  add constraint leaderboard_snapshots_scope_check check (
    scope in ('local', 'neighborhood', 'city', 'friends', 'commune', 'department', 'country')
  );

-- COMBIEN DE SUJETS ÉTAIENT CLASSÉS AU MOMENT DE LA PRISE. Sans ce compte, la
-- lecture ne pourrait pas distinguer « pas assez de monde ici » (un fait) de
-- « le tableau est vide » (une panne) — et c'est exactement la distinction que
-- les quatre états de CLAUDE.md exigent. Il est STOCKÉ et non recalculé : un
-- snapshot est un fait daté, il doit rester lisible tel qu'il a été pris.
alter table public.leaderboard_snapshots
  add column if not exists subjects_count integer;
alter table public.leaderboard_snapshots
  drop constraint if exists leaderboard_snapshots_subjects_count_positive;
alter table public.leaderboard_snapshots
  add constraint leaderboard_snapshots_subjects_count_positive
  check (subjects_count is null or subjects_count >= 0);

-- QUELLE MESURE A CLASSÉ. 0082 gèle quatre mesures par ligne (§10.2) sans dire
-- laquelle ordonne — pour ses sept classements, c'était toujours la première.
-- Le classement de commune ordonne sur la surface CONQUISE DANS LA SEMAINE
-- (`conquered_area_m2`) et sert la surface tenue (`controlled_area_m2`) comme un
-- ÉTAT. Sans cette colonne, un lecteur futur de la table ne pourrait pas savoir
-- pourquoi la ligne 1 tient moins de terrain que la ligne 2 — il conclurait à un
-- bug. Chaque colonne garde donc son sens d'origine, et celle-ci dit laquelle
-- des deux a fait le rang.
alter table public.leaderboard_snapshots
  add column if not exists metric text;
alter table public.leaderboard_snapshots
  drop constraint if exists leaderboard_snapshots_metric_check;
alter table public.leaderboard_snapshots
  add constraint leaderboard_snapshots_metric_check check (
    metric is null or metric in ('weekly_new_terrain_m2') -- game-rules: LEADERBOARD_RULES_2026.metric
  );

comment on column public.leaderboard_snapshots.subjects_count is
  'Nombre de sujets CLASSÉS au moment de la prise. Sert à distinguer « pas assez de monde ici » d''un tableau vide (CLAUDE.md, quatre états). Stocké, jamais recalculé.';
comment on column public.leaderboard_snapshots.metric is
  'La mesure qui a ORDONNÉ ce snapshot. ''weekly_new_terrain_m2'' = conquered_area_m2 (le flux de la semaine) ; controlled_area_m2 reste la surface tenue, servie comme état et jamais comme rang (ADR-013 §2.1).';

-- ── 4b. LES PORTÉES 2026 NE SE LISENT QUE PAR LA RPC ───────────────────────
-- La policy de 0082 ouvre en lecture tout snapshot dont le scope n'est pas
-- 'friends' — c'était vrai de ses quatre portées, publiques par nature. Elle
-- ouvrirait donc aussi les portées 2026, et un client pourrait lire en direct
-- les lignes d'une commune où quatre personnes seulement ont couru : le seuil
-- de population serait contourné par la table, la RPC ne protégeant plus que
-- l'écran. Une policy PERMISSIVE de plus n'y changerait rien (elles s'ajoutent
-- par OU) : il faut une policy RESTRICTIVE, qui s'ajoute par ET.
--
-- Ce que ça ferme, précisément : la lecture DIRECTE. `read_leaderboard_2026`
-- (0164) est `security definer` — elle traverse la RLS, applique le seuil, et
-- décide ligne par ligne quelle identité peut être nommée.
drop policy if exists leaderboard_snapshots_2026_via_rpc_only on public.leaderboard_snapshots;
create policy leaderboard_snapshots_2026_via_rpc_only on public.leaderboard_snapshots
  as restrictive for select to authenticated
  using (scope not in ('commune', 'department', 'country'));

drop policy if exists leaderboard_entries_2026_via_rpc_only on public.leaderboard_entries;
create policy leaderboard_entries_2026_via_rpc_only on public.leaderboard_entries
  as restrictive for select to authenticated
  using (
    not exists (
      select 1 from public.leaderboard_snapshots s
      where s.id = leaderboard_entries.snapshot_id
        and s.scope in ('commune', 'department', 'country')
    )
  );

comment on policy leaderboard_snapshots_2026_via_rpc_only on public.leaderboard_snapshots is
  'RESTRICTIVE (ET, pas OU) : un classement 2026 ne se lit QUE par read_leaderboard_2026, qui applique le seuil de population et l''autorité d''identité 0126. Sans elle, la policy publique de 0082 servirait un podium à trois en lecture directe.';
comment on policy leaderboard_entries_2026_via_rpc_only on public.leaderboard_entries is
  'Les lignes suivent la fermeture de leur snapshot. Sans elle, l''en-tête serait fermé et le contenu ouvert — c''est-à-dire pas fermé du tout.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. PRIVILÈGES — RIEN N'EST OUVERT QUI N'A PAS BESOIN DE L'ÊTRE
-- ════════════════════════════════════════════════════════════════════════════
revoke all on function public.leaderboard_rules_2026() from public, anon;
grant execute on function public.leaderboard_rules_2026() to authenticated, service_role;

revoke all on function public.leaderboard_week_bounds_2026(timestamptz) from public, anon;
grant execute on function public.leaderboard_week_bounds_2026(timestamptz) to authenticated, service_role;

-- La résolution de portée lit `city_zones` en contournant sa RLS (definer) :
-- serveur uniquement, comme la vue de mesure de 0082.
revoke all on function public.board_scope_communes_2026(text, text) from public, anon, authenticated;
grant execute on function public.board_scope_communes_2026(text, text) to service_role;
