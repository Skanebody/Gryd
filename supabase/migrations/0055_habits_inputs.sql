-- 0055_habits_inputs.sql
-- GRYD — A-46 §1 : LE PROFIL D'HABITUDES (lecture serveur).
--
-- Demande fondateur (21/07) : proposer un parcours du jour fondé sur les
-- habitudes réelles (kilomètres, créneaux), avec un réglage dans les paramètres.
--
-- CONSTAT D'AUDIT : `features/route/demo.ts` affichait déjà « Adaptée à tes
-- habitudes » alors qu'aucun code n'apprenait quoi que ce soit. Cette migration
-- fournit les FAITS qui rendent la phrase vraie — ou, à défaut de données, qui
-- la rendent impossible à afficher (le moteur renvoie alors « inconnu »).
--
-- ═══ DÉPEND DE 0054_route_preferences.sql ═══════════════════════════════════
-- Numérotée 0055 et NON 0054 : deux chantiers parallèles ont produit un 0054 le
-- même jour. L'autre moitié (`route_preferences`) porte les réglages POSÉS À LA
-- MAIN ; celle-ci porte les faits DÉDUITS. Elles se complètent, elles ne se
-- doublonnent pas — et c'est un choix explicite :
--
--   L'INTERRUPTEUR D'APPRENTISSAGE N'EST PAS DUPLIQUÉ ICI.
--   Une première version de ce fichier ajoutait `users.habits_learning_enabled`.
--   C'était un SECOND interrupteur pour un seul réglage : l'utilisateur l'aurait
--   coupé dans les Paramètres (`route_preferences.learning_enabled`) pendant que
--   cette fonction aurait continué d'apprendre via sa propre colonne. Exactement
--   la classe de bug « ce qui est affiché ≠ ce que le serveur fait » que le repo
--   a déjà payée (`users.streak_weeks` jamais écrit, `daily_zone_awards` jamais
--   alimentée). Source unique : `public.route_preferences`.
--
-- ─── VIE PRIVÉE (contraignant) ──────────────────────────────────────────────
-- Apprendre des habitudes de déplacement est du profilage sur des données de
-- localisation. Trois garde-fous, tous ici :
--   1. STRICTEMENT L'APPELANT. La fonction ne prend AUCUN identifiant en
--      paramètre : elle lit auth.uid(). Il n'existe donc aucune forme d'appel
--      permettant de lire les habitudes d'autrui, même pour un capitaine.
--   2. AUCUNE GÉOGRAPHIE. On ne renvoie ni polyline_masked, ni hex, ni secteur,
--      ni coordonnée — seulement distance, durée, allure, horodatage, statut.
--      Un profil d'habitudes ne peut donc pas ré-exposer le point de départ que
--      §7 floute à 500 m : « le mardi soir » ne dit pas OÙ.
--   3. DÉSACTIVABLE ET OUBLIABLE. `learning_enabled` à false → aucune course
--      renvoyée (le refus est SERVEUR, un client qui l'ignorerait n'obtiendrait
--      rien). `learn_from` resserre la fenêtre : « oublier ce que GRYD a
--      appris » coupe réellement ce que le moteur voit, sans détruire une seule
--      course réelle.
--
-- ANTI PAY-TO-WIN : ces faits alimentent une SUGGESTION de parcours. Aucun
-- point, aucun territoire, aucun multiplicateur n'en dépend.
--
-- Statuts retenus : 'valid' et 'partial' uniquement (miroir de
-- HABITS_COUNTED_STATUSES dans packages/shared/src/habits.ts). Une course
-- rejetée ou signalée n'a pas eu lieu du point de vue du jeu : elle n'apprend
-- rien. Les bornes (fenêtre, plafond) viennent de game-rules et sont passées en
-- paramètre — aucun nombre magique ici.

-- La fonction ne CALCULE pas le profil : elle renvoie les faits, le calcul vit
-- dans packages/shared/src/habits.ts (une seule implémentation, testée, partagée
-- par le mobile et le serveur). Postgres compte en µs, JS en ms : les durées
-- sont renvoyées telles quelles (secondes entières, comme la colonne).
create or replace function public.habits_inputs(
  p_window_days integer,
  p_max_runs    integer
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_prefs    public.route_preferences%rowtype;
  v_learning boolean;
  v_since    timestamptz;
  v_runs     jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_window_days is null or p_window_days <= 0
     or p_max_runs is null or p_max_runs <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_params');
  end if;

  -- Pas de ligne = jamais ouvert l'écran de réglages = défauts du DDL
  -- (learning_enabled true). On ne CRÉE pas de ligne à la lecture.
  select * into v_prefs from public.route_preferences where user_id = v_uid;
  v_learning := coalesce(v_prefs.learning_enabled, true);

  -- Apprentissage coupé : on ne renvoie RIEN. Pas « les données quand même,
  -- charge au client de les ignorer » — le refus se fait côté serveur.
  if v_learning is false then
    return jsonb_build_object('ok', true, 'learning', false, 'runs', '[]'::jsonb);
  end if;

  -- Fenêtre effective = la plus RESTRICTIVE des deux : l'horizon d'apprentissage
  -- (game-rules) et le « repars de zéro » posé par l'utilisateur.
  v_since := now() - make_interval(days => p_window_days);
  if v_prefs.learn_from is not null and v_prefs.learn_from > v_since then
    v_since := v_prefs.learn_from;
  end if;

  select coalesce(jsonb_agg(x order by x->>'startedAt' desc), '[]'::jsonb)
  into v_runs
  from (
    select jsonb_build_object(
             'startedAt',  to_char(r.started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
             'distanceM',  r.distance_m,
             'durationS',  r.duration_s,
             'avgPaceSKm', r.avg_pace_s_km,
             'status',     r.status
           ) as x
    from public.runs r
    where r.user_id = v_uid                       -- ← jamais autrui
      and r.status in ('valid', 'partial')
      and r.started_at >= v_since
      and r.started_at <= now()
    order by r.started_at desc                    -- index runs_user_started_idx
    limit p_max_runs
  ) s;

  return jsonb_build_object('ok', true, 'learning', true, 'runs', coalesce(v_runs, '[]'::jsonb));
end;
$$;

-- PUBLIC hérite EXECUTE à la création : révoquer `from public, anon` est
-- OBLIGATOIRE, révoquer d'anon seul ne suffit pas (piège prouvé du repo).
revoke all on function public.habits_inputs(integer, integer) from public, anon;
grant execute on function public.habits_inputs(integer, integer) to authenticated;

comment on function public.habits_inputs(integer, integer) is
  'A-46 §1 : faits bruts (distance, durée, allure, horodatage) des courses '
  'COMPTABILISÉES de l''APPELANT SEUL, pour computeHabitsProfile(). Aucune '
  'coordonnée, aucune trace, aucun secteur : un profil d''habitudes ne doit '
  'jamais ré-exposer un point de départ. Respecte route_preferences '
  '(learning_enabled = source UNIQUE de l''interrupteur, learn_from = oubli).';
