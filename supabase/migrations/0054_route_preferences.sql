-- 0054_route_preferences.sql
-- GRYD — PRÉFÉRENCES DE PARCOURS (demande fondateur 21/07 : « il faut […] avoir
-- un endroit dans les paramètres pour la personnaliser »).
--
-- ═══ CE QUE CETTE MIGRATION EST ═════════════════════════════════════════════
-- Le STOCKAGE des réglages que l'utilisateur pose lui-même sur les parcours qui
-- lui sont PROPOSÉS, plus l'interrupteur qui autorise (ou non) GRYD à apprendre
-- de ses courses. Rien d'autre. Le profil d'habitudes DÉDUIT et la génération de
-- la proposition vivent ailleurs — ici on ne stocke que ce que l'humain a dit.
--
-- ═══ ANTI PAY-TO-WIN (non négociable) ═══════════════════════════════════════
-- Aucune valeur de cette table n'entre JAMAIS dans un calcul de points, de
-- territoire, de decay ou de classement. Une préférence oriente une SUGGESTION.
-- Si un jour une colonne d'ici apparaît dans ingest_run, c'est un bug.
--
-- ═══ VIE PRIVÉE (contraignant) ══════════════════════════════════════════════
-- Apprendre des habitudes de déplacement est du profilage sur des données de
-- localisation. Trois garde-fous sont posés ICI, au niveau du schéma :
--
--   1. AUCUNE COORDONNÉE. Cette table ne contient ni point de départ, ni bbox,
--      ni secteur favori, ni h3index. C'est délibéré et DÉFINITIF : le domicile
--      du joueur est flouté à 500 m par défaut (règle projet), et un « point de
--      départ habituel » stocké en clair ré-exposerait exactement ce que ce flou
--      protège. Toute PR qui ajoute une colonne géographique ici doit être
--      refusée — le besoin réel se traite côté proposition, jamais en persistant
--      une adresse déduite.
--   2. STRICTEMENT PERSONNEL. `auth.uid()` partout, aucune lecture croisée. Un
--      capitaine de crew ne voit pas les habitudes de ses coureurs.
--   3. RÉVOCABLE ET OUBLIABLE. `learning_enabled` coupe l'apprentissage ;
--      `learn_from` fait oublier le passé (cf. LE SEAM ci-dessous).
--
-- ═══ LE SEAM D'APPRENTISSAGE (à respecter par le calcul du profil) ══════════
-- Ces deux colonnes sont la SOURCE UNIQUE de l'interrupteur d'apprentissage.
-- Toute fonction qui dérive un profil d'habitudes depuis `public.runs` DOIT :
--     • ne rien renvoyer du tout si `learning_enabled` est false ;
--     • ne considérer que les courses avec `started_at >= learn_from` quand
--       `learn_from` n'est pas null (fenêtre la plus restrictive des deux avec
--       l'horizon d'apprentissage de game-rules).
-- C'est ce que fait `public.habits_inputs` (migration 0055). Placer la décision
-- côté serveur — et non dans l'écran — est ce qui rend le « je désactive
-- l'apprentissage » réellement contraignant : un client qui l'ignorerait
-- n'obtiendrait quand même rien.
--
-- Il n'existe VOLONTAIREMENT pas de fonction `route_learning_scope()` exposant
-- cette décision : une première version en fournissait une, que personne
-- n'appelait (0055 lit les colonnes directement). Une fonction SECURITY DEFINER
-- morte est précisément ce que ce repo a déjà payé — `daily_zone_awards` jamais
-- alimentée, `users.streak_weeks` jamais écrite. Une seule autorité, lue
-- directement.

create table public.route_preferences (
  user_id           uuid primary key references public.users (id) on delete cascade,

  -- L'interrupteur. `true` par défaut : sans lui, la demande fondateur
  -- (« un algorithme puisse apprendre ») n'existe pas. Il se coupe en un tap.
  learning_enabled  boolean not null default true,

  -- Distance visée FIXÉE À LA MAIN (m). `null` = « Auto » : GRYD décide (via les
  -- habitudes si l'apprentissage est actif, sinon un défaut assumé). Bornes =
  -- game-rules ROUTE_TARGET_DISTANCE_MIN_M / ROUTE_TARGET_DISTANCE_MAX_M.
  target_distance_m integer check (
    target_distance_m is null or target_distance_m between 1000 and 42195
  ),

  -- game-rules: ROUTE_SHAPES.
  route_shape       text not null default 'any'
                    check (route_shape in ('any', 'loop', 'out_and_back')),

  avoid_hills       boolean not null default false,

  -- « Oublier ce que GRYD a appris ». On ne SUPPRIME jamais de courses (elles
  -- sont l'historique sportif du joueur, et son territoire en dépend) : on
  -- déplace la fenêtre d'apprentissage. Effet identique du point de vue du
  -- joueur — « GRYD repart de zéro » — sans détruire de données réelles.
  learn_from        timestamptz,

  updated_at        timestamptz not null default now()
);

alter table public.route_preferences enable row level security;

-- Lecture owner-only. Aucune écriture directe : tout passe par les RPC
-- ci-dessous (validation des bornes en UN seul endroit).
revoke insert, update, delete on public.route_preferences from anon, authenticated;
-- Défense en profondeur : anon n'a aucune policy, mais on retire aussi le
-- privilège hérité.
revoke select on public.route_preferences from anon;

create policy route_preferences_select_own on public.route_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── route_prefs_get : ce que j'ai réglé ─────────────────────────────────────
-- Lecture PURE (aucune ligne créée à la lecture : un joueur qui n'a jamais
-- ouvert l'écran n'a pas de ligne, et c'est très bien — les défauts sont dits
-- ici, une seule fois, alignés sur le DDL ci-dessus).
create or replace function public.route_prefs_get()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.route_preferences%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select * into v_row from public.route_preferences where user_id = v_uid;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'learningEnabled', true,
      'targetDistanceM', null,
      'routeShape', 'any',
      'avoidHills', false,
      'learnFrom', null,
      'updatedAt', null
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'learningEnabled', v_row.learning_enabled,
    'targetDistanceM', v_row.target_distance_m,
    'routeShape', v_row.route_shape,
    'avoidHills', v_row.avoid_hills,
    -- ISO 8601 (to_jsonb d'un timestamptz) : le client fait Date.parse. Jamais
    -- d'epoch brut — Postgres compte en µs, JS en ms, le piège est connu.
    'learnFrom', to_jsonb(v_row.learn_from),
    'updatedAt', to_jsonb(v_row.updated_at)
  );
end;
$$;

revoke all on function public.route_prefs_get() from public, anon;
grant execute on function public.route_prefs_get() to authenticated;

-- ─── route_prefs_set : écriture ÉTAT COMPLET ────────────────────────────────
-- Volontairement PAS un patch partiel : `target_distance_m = null` a un SENS
-- métier (« Auto »), il ne peut donc pas signifier aussi « ne change pas ».
-- L'écran détient toujours l'état complet — il l'envoie en entier.
create or replace function public.route_prefs_set(
  p_learning_enabled  boolean,
  p_target_distance_m integer,
  p_route_shape       text,
  p_avoid_hills       boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_learning_enabled is null or p_avoid_hills is null or p_route_shape is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_input');
  end if;
  if p_route_shape not in ('any', 'loop', 'out_and_back') then
    return jsonb_build_object('ok', false, 'reason', 'bad_shape');
  end if;
  -- Hors bornes : on REFUSE, on ne clampe pas en silence. Un écran qui demande
  -- 80 km et reçoit « enregistré » alors que 42 km ont été écrits mentirait.
  if p_target_distance_m is not null
     and (p_target_distance_m < 1000 or p_target_distance_m > 42195) then
    return jsonb_build_object('ok', false, 'reason', 'bad_distance');
  end if;

  insert into public.route_preferences as rp
    (user_id, learning_enabled, target_distance_m, route_shape, avoid_hills, updated_at)
  values
    (v_uid, p_learning_enabled, p_target_distance_m, p_route_shape, p_avoid_hills, now())
  on conflict (user_id) do update set
    learning_enabled  = excluded.learning_enabled,
    target_distance_m = excluded.target_distance_m,
    route_shape       = excluded.route_shape,
    avoid_hills       = excluded.avoid_hills,
    updated_at        = now();

  return public.route_prefs_get();
end;
$$;

revoke all on function public.route_prefs_set(boolean, integer, text, boolean) from public, anon;
grant execute on function public.route_prefs_set(boolean, integer, text, boolean) to authenticated;

-- ─── route_prefs_forget : « oublie ce que tu as appris » ────────────────────
-- Déplace la fenêtre d'apprentissage à maintenant. AUCUNE course n'est touchée.
create or replace function public.route_prefs_forget()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  insert into public.route_preferences (user_id, learn_from, updated_at)
  values (v_uid, now(), now())
  on conflict (user_id) do update set
    learn_from = now(),
    updated_at = now();

  return public.route_prefs_get();
end;
$$;

revoke all on function public.route_prefs_forget() from public, anon;
grant execute on function public.route_prefs_forget() to authenticated;
