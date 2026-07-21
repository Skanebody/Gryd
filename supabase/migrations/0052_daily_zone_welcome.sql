-- 0052_daily_zone_welcome.sql
-- GRYD — LOT 3 : ZONE DU JOUR + DÉFI 7 JOURS D'ACCUEIL (A-45 §3, actions 3 et 4).
--
-- DÉCISION FONDATEUR 21/07/2026 : l'app est GRATUITE, monétisée uniquement par
-- achats intégrés. Les deux mécaniques ci-dessous sont des mécaniques de
-- RÉTENTION GRATUITES. Rien n'est vendu, rien n'est accéléré contre de l'argent,
-- et la seule récompense (la distinction de Zone du Jour) est COSMÉTIQUE et
-- TEMPORAIRE : zéro point, zéro XP, zéro Foulée, aucun effet sur le decay ni sur
-- le classement (anti pay-to-win STRICT §22).
--
-- ═══ CE QUE CETTE MIGRATION NE FAIT PAS ═════════════════════════════════════
--   · Elle ne CHOISIT pas la Zone du Jour. Le tirage est la dérivation PURE
--     `chooseDailyZone` (packages/engine/src/dailyZone.ts, tests Deno). Le SQL
--     n'expose que les FAITS. Même séparation qu'en 0049 : l'arbitrage est
--     testable hors base, et le changer ne demande aucune migration.
--   · Elle ne PERSISTE pas le tirage. Il est déterministe (hash de
--     jour+ville sur la liste éligible triée) : le serveur le REFAIT à
--     l'identique pour valider une capture. Une table de tirage serait une
--     seconde vérité à maintenir, donc une occasion de diverger.
--   · Elle ne stocke pas la progression du défi d'accueil : les 5 paliers se
--     lisent INTÉGRALEMENT dans `user_stats` (colonnes déjà alimentées par
--     ingest_run). Les recopier créerait un état parallèle qui dériverait au
--     premier correctif de stats — et un écran qui contredit le compteur, c'est
--     précisément le mensonge que la doctrine interdit.
--
-- ═══ CE QUI EST RÉUTILISÉ DE 0012 (challenges + badges) ═════════════════════
--   · `public.challenges` : le défi d'accueil y est seedé comme un challenge
--     `solo` ordinaire (§5 ci-dessous) — il hérite donc de la RLS de lecture, de
--     l'écran Challenges et du deep-link /challenges/[id] existants ;
--   · `public.challenge_progress` : AUCUNE ligne n'est créée pour ce défi, et
--     c'est délibéré (cf. §5) ;
--   · les colonnes de métriques `user_stats` (0007/0009/0012) portent les 5
--     paliers. Aucune table, aucun compteur nouveau.
--
-- ═══ POURQUOI LA FENÊTRE « FRAGILE » EST UN PARAMÈTRE ═══════════════════════
-- « fragile = decay dans les N heures » est une RÈGLE DE JEU. Sa seule source
-- légitime est packages/shared/src/game-rules.ts (DAILY_ZONE_FRAGILE_WINDOW_H).
-- L'écrire en dur ici en ferait une deuxième vérité. L'appelant la passe ; une
-- fenêtre absente ou négative est REFUSÉE plutôt que remplacée par un défaut que
-- personne n'a décidé. Ce n'est pas « le client décide » : la fonction est en
-- LECTURE SEULE, bornée à auth.uid(), et n'écrit ni claim ni score.

-- ═══ 1. daily_zone_awards — la distinction, et rien d'autre ══════════════════
-- Une ligne = « ce joueur a capturé dans la Zone du Jour, ce jour-là ». C'est le
-- SEUL état persisté de la mécanique, parce que c'est le seul qui ne se
-- recalcule pas (une capture est un événement, pas une projection).
--
-- La PK (day_key, user_id) rend l'attribution IDEMPOTENTE : un retry d'ingest_run
-- ne peut pas créer deux distinctions, et un joueur qui capture dix zones dans le
-- secteur du jour en obtient une seule. Aucune quantité n'est cumulée — il n'y a
-- rien à cumuler, la récompense n'a pas de valeur de jeu.
--
-- `day_key` est du TEXTE 'YYYY-MM-DD' (le jour LOCAL du joueur, calculé par
-- `dayKeyOf`), pas une date UTC : « aujourd'hui » est une notion vécue, et un
-- coureur qui sort à 23 h doit voir sa journée, pas celle de demain en UTC.
create table if not exists public.daily_zone_awards (
  day_key     text not null check (day_key ~ '^\d{4}-\d{2}-\d{2}$'),
  user_id     uuid not null references public.users (id) on delete cascade,
  -- Le secteur RÉELLEMENT tiré ce jour-là. Conservé pour pouvoir REJOUER le
  -- tirage et vérifier une distinction a posteriori (support, litige).
  sector_id   uuid not null references public.sectors (id) on delete cascade,
  -- Ville du tirage (`city_zones.city_id`) : c'est la clé de hachage, elle fait
  -- partie de la preuve. Sans elle, le tirage n'est pas rejouable.
  city_id     text not null references public.city_zones (city_id) on delete cascade,
  awarded_at  timestamptz not null default now(),
  primary key (day_key, user_id)
);

-- Lecture « ma distinction du jour » (RLS) et rejeu par jour+ville (support).
create index if not exists daily_zone_awards_user_idx
  on public.daily_zone_awards (user_id, awarded_at desc);
create index if not exists daily_zone_awards_day_city_idx
  on public.daily_zone_awards (day_key, city_id);

alter table public.daily_zone_awards enable row level security;

-- Écriture client interdite : la distinction récompense une CAPTURE, et « tout
-- claim est décidé serveur ». Seul ingest_run (service_role, qui bypasse la RLS)
-- l'attribue, après avoir rejoué le tirage et constaté la capture.
revoke insert, update, delete on public.daily_zone_awards from anon, authenticated;

drop policy if exists daily_zone_awards_select_self on public.daily_zone_awards;
create policy daily_zone_awards_select_self on public.daily_zone_awards
  for select to authenticated
  using (user_id = (select auth.uid()));

comment on table public.daily_zone_awards is
  'A-45 §3 — distinction COSMÉTIQUE et TEMPORAIRE (DAILY_ZONE_DISTINCTION_H) '
  'obtenue en capturant dans la Zone du Jour. Zéro point, zéro XP, zéro Foulée, '
  'aucun effet sur le decay ni le classement (anti pay-to-win STRICT). PK '
  '(day_key, user_id) = idempotence : une seule distinction par jour et par '
  'joueur. sector_id/city_id sont conservés pour REJOUER le tirage déterministe.';

-- ═══ 2. daily_zone_inputs() — les FAITS, jamais le choix ═════════════════════
-- Renvoie la ville RÉELLE du joueur et l'état de ses secteurs. Le tirage est
-- fait par `chooseDailyZone` à partir de ça.
--
-- La ville est déduite de faits RÉELS, dans cet ordre :
--   1. la DERNIÈRE CAPTURE du joueur (`hex_claims.city_id`, posé par ingest_run) —
--      c'est là qu'il joue vraiment ;
--   2. à défaut, la ville de son CREW (`crews.city_id` via une adhésion active) —
--      un joueur fraîchement inscrit qui a rejoint un crew local a une ville
--      parfaitement réelle avant sa première capture.
-- NB : `runs` ne porte PAS de `city_id` (contrairement à ce qu'affirme un
-- commentaire de 0015 — vérifié sur le schéma, la colonne n'existe pas), il n'y
-- a donc rien à en tirer ici.
--
-- Aucun repli sur « la ville la plus proche », aucune ville par défaut : un
-- coureur hors zone dense et sans crew sort avec cityId null, et l'écran dit
-- « pas de zone du jour aujourd'hui ». C'est A-35 (l'Europe entière est
-- capturable) appliqué honnêtement, pas un trou fonctionnel.
create or replace function public.daily_zone_inputs(
  p_fragile_window_h integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_city_id    text;
  v_fragile    interval;
  v_candidates jsonb;
  v_award      jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Fenêtre invalide : on REFUSE. Substituer un défaut ferait désigner une zone
  -- « fragile » sur un seuil que personne n'a décidé.
  if p_fragile_window_h is null or p_fragile_window_h < 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_window');
  end if;
  v_fragile := make_interval(hours => p_fragile_window_h);

  -- ─── Ville RÉELLE du joueur ───────────────────────────────────────────────
  select hc.city_id into v_city_id
  from public.hex_claims hc
  where hc.owner_user_id = v_uid and hc.city_id is not null
  order by hc.claimed_at desc
  limit 1;

  if v_city_id is null then
    select c.city_id into v_city_id
    from public.crew_members cm
    join public.crews c on c.id = cm.crew_id
    where cm.user_id = v_uid and cm.left_at is null and c.city_id is not null;
  end if;

  -- Pas de ville connue = pas de tirage. Surtout pas une ville inventée.
  if v_city_id is null then
    return jsonb_build_object('ok', true, 'cityId', null, 'candidates', '[]'::jsonb, 'award', null);
  end if;

  -- ─── Secteurs RÉELS de cette ville ────────────────────────────────────────
  -- freeHexes  : total RÉEL du secteur − claims VIVANTS (`sectors.total_hexes`
  --              est posé par discover_sectors depuis la propriété H3 des
  --              enfants res-10 d'un res-7 — un compte exact, pas une estimation).
  --              greatest(...,0) : un rattachement en retard ne doit jamais
  --              produire un négatif.
  -- fragileHexes : zones vivantes dont l'échéance RÉELLE (`hex_claims.decay_at`,
  --              posée à la capture) tombe dans la fenêtre passée en paramètre.
  --              `decay_at is null` = zone protégée : jamais fragile.
  --
  -- AUCUNE identité de détenteur n'est exposée. La doctrine bannit les rivaux
  -- fabriqués, et nommer un vrai joueur sur un objectif quotidien partagé par
  -- toute une ville ouvrirait un vecteur de harcèlement non modéré.
  with claims_per_sector as (
    select hc.sector_id,
           count(*)::integer as alive,
           count(*) filter (
             where hc.decay_at is not null and hc.decay_at <= now() + v_fragile
           )::integer as fragile
    from public.hex_claims hc
    where hc.sector_id is not null
      and (hc.decay_at is null or hc.decay_at > now())
    group by hc.sector_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sectorId',     s.id,
        -- Nom RÉEL (reverse-geocode Nominatim, discover_sectors) ou null tant
        -- que le secteur n'est pas nommé. Jamais de nom de repli inventé.
        'sectorName',   s.name,
        'freeHexes',    greatest(0, s.total_hexes - coalesce(c.alive, 0))::integer,
        'fragileHexes', coalesce(c.fragile, 0)
      )
      -- Ordre stable. Le moteur re-trie par sectorId de toute façon (le tirage ne
      -- doit PAS dépendre de l'ORDER BY d'ici), mais une charge utile
      -- déterministe rend les diffs et les captures de support lisibles.
      order by s.id asc
    ),
    '[]'::jsonb
  )
  into v_candidates
  from public.sectors s
  left join claims_per_sector c on c.sector_id = s.id
  where s.city_id = v_city_id;

  -- ─── Ma distinction du jour, si elle existe ───────────────────────────────
  -- Renvoyée telle quelle (jour + instant) : c'est le moteur pur
  -- `isDistinctionActive` qui décide si elle est encore active, avec la durée
  -- venue de game-rules — pas une expiration écrite en SQL.
  select jsonb_build_object(
           'dayKey',    a.day_key,
           'sectorId',  a.sector_id,
           'awardedAt', a.awarded_at
         )
  into v_award
  from public.daily_zone_awards a
  where a.user_id = v_uid
  order by a.awarded_at desc
  limit 1;

  return jsonb_build_object(
    'ok',         true,
    'cityId',     v_city_id,
    'candidates', coalesce(v_candidates, '[]'::jsonb),
    'award',      v_award
  );
end;
$$;

-- `from public, anon` et PAS `from anon` seul : Postgres accorde d'office EXECUTE
-- à PUBLIC à la création de toute fonction, et anon est membre de PUBLIC —
-- révoquer sur anon seul laisserait le droit HÉRITÉ intact
-- (has_function_privilege('anon', …) resterait TRUE, ce que information_schema
-- ne montre pas). Patron de 0049:§2 / 0044:§2 / 0042:277-280 / 0010:184.
revoke all on function public.daily_zone_inputs(integer) from public, anon;
grant execute on function public.daily_zone_inputs(integer) to authenticated;

comment on function public.daily_zone_inputs(integer) is
  'A-45 §3 action 3 — FAITS de la Zone du Jour pour auth.uid() : ville réelle '
  '(dernière capture, sinon ville du crew ; jamais une ville de repli), '
  'secteurs de cette ville avec zones libres et zones fragiles, et ma dernière '
  'distinction. LECTURE SEULE. Ne TIRE PAS la zone : le tirage déterministe est '
  'engine/dailyZone.ts `chooseDailyZone`, rejouable serveur. La fenêtre fragile '
  '(heures) est un PARAMÈTRE parce que sa source unique est game-rules.ts '
  '(DAILY_ZONE_FRAGILE_WINDOW_H) ; nulle ou négative, elle est refusée. Aucune '
  'identité de détenteur, aucun h3index, aucune géométrie n''est exposée.';

-- ═══ 3. welcome_challenge_facts() — les 5 paliers, lus au réel ═══════════════
-- Renvoie les QUATRE compteurs `user_stats` qui portent les cinq paliers, plus
-- l'id du challenge seedé (pour le deep-link /challenges/[id]). La projection
-- sur les paliers est faite par `deriveWelcomeChallenge` (pur, testé Deno).
--
-- Absence de ligne `user_stats` = joueur qui n'a encore rien fait : on renvoie
-- des zéros, ce qui est EXACTEMENT vrai. Ce n'est pas un défaut sympathique, et
-- l'inverse (null → « inconnu ») ferait disparaître le défi de l'écran au moment
-- précis où il est le plus utile.
create or replace function public.welcome_challenge_facts()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_uid   uuid := auth.uid();
  v_facts jsonb;
  v_cid   uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select jsonb_build_object(
           -- RECORD, jamais un cumul : le palier « 5 km » demande UNE course de
           -- 5 km, pas 5 km étalés sur la semaine.
           'bestRunDistanceM', coalesce(us.best_run_distance_m, 0),
           'loopRuns',         coalesce(us.loop_runs, 0),
           'hexesCaptured',    coalesce(us.hexes_captured, 0),
           'shares',           coalesce(us.first_shares, 0)
         )
  into v_facts
  from public.user_stats us
  where us.user_id = v_uid;

  select c.id into v_cid
  from public.challenges c
  where c.slug = 'welcome_7d'   -- WELCOME_CHALLENGE_SLUG (game-rules)
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'challengeId', v_cid,
    'facts', coalesce(
      v_facts,
      jsonb_build_object(
        'bestRunDistanceM', 0, 'loopRuns', 0, 'hexesCaptured', 0, 'shares', 0
      )
    )
  );
end;
$$;

revoke all on function public.welcome_challenge_facts() from public, anon;
grant execute on function public.welcome_challenge_facts() to authenticated;

comment on function public.welcome_challenge_facts() is
  'A-45 §3 action 4 — compteurs RÉELS (user_stats) des 5 paliers du défi '
  'd''accueil + id du challenge seedé. LECTURE SEULE. La projection sur les '
  'paliers est engine/welcomeChallenge.ts `deriveWelcomeChallenge` (pur). '
  'Aucune progression n''est STOCKÉE : elle se dérive des compteurs, sans quoi '
  'un état parallèle finirait par contredire les stats. ANTI-SHAME : aucun '
  'décompte de jours, aucune expiration, aucune remise à zéro n''existe ici.';

-- ═══ 4. Seed du défi d'accueil dans `challenges` (réutilise 0012) ════════════
-- Pourquoi une fenêtre quasi infinie : le défi d'accueil n'est PAS une saison.
-- Il est disponible en permanence pour tout nouveau joueur, et son « 7 jours »
-- est un RYTHME SUGGÉRÉ affiché par palier (WELCOME_STEPS[].day), jamais une
-- échéance globale. Une fenêtre de 7 jours en base l'aurait fermé pour tous ceux
-- qui s'inscrivent après — et l'aurait fait EXPIRER au visage de qui a raté un
-- jour, ce que la règle anti-shame interdit.
--
-- `primary_goal.metric = 'welcome_steps'` n'appartient VOLONTAIREMENT pas à
-- CHALLENGE_METRICS : `processChallenges` (ingest_run) calcule un incrément nul
-- pour une métrique inconnue et passe son chemin. Le défi ne crée donc AUCUNE
-- ligne `challenge_progress`, et il n'y a aucune double comptabilité à
-- resynchroniser. C'est voulu, pas un oubli.
--
-- Idempotent par slug (on conflict do nothing) : ré-appliquer la migration ne
-- duplique rien et n'écrase aucun libellé retouché en base.
insert into public.challenges
  (slug, type, name, description, starts_at, ends_at, difficulty, visibility,
   primary_goal, personal_minimum, collective_goal, privacy_mode)
values
  ('welcome_7d', 'solo', 'Premiers pas',
   'Cinq étapes pour découvrir GRYD à ton rythme : 3 km, 5 km, une boucle, une capture, un partage. Rien n''expire, rien ne se perd.',
   now(), timestamptz '2100-01-01 00:00:00+00',
   'chill', 'public',
   '{"metric":"welcome_steps","target":5}'::jsonb, null, null, 'opt_in')
on conflict (slug) do nothing;
