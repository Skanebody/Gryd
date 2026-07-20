-- 0042_crew_real.sql
-- GRYD — Crews « pour de vrai » : création / adhésion par code / départ arbitrés SERVEUR.
--
-- BUG (latent, jamais câblé côté client) : depuis 0002/0003, un client `authenticated`
-- pouvait INSÉRER directement dans `crews` (policy crews_insert_creator) et dans
-- `crew_members` (crew_members_insert_self / _update_self). Or TOUTE la logique de jeu du
-- crew — code d'invitation secret (0036), plafond de membres (CREW_MAX_MEMBERS=50), cooldown
-- de changement de crew (CREW_SWITCH_COOLDOWN_DAYS=7 j), unicité « un seul crew actif » — est
-- INEXPRIMABLE en DDL/RLS et serait donc contournable : un client forgerait un `code`, se
-- joindrait à un crew plein, falsifierait `joined_at`/`left_at` pour effacer le cooldown, ou
-- changerait de crew en boucle. « Tout est décidé serveur » (CLAUDE.md) : l'adhésion à un crew
-- ne peut pas rester une écriture client libre.
--
-- FIX : 4 fonctions SECURITY DEFINER (create_crew / join_crew_by_code / leave_crew /
-- my_crew_code) qui portent TOUTES les règles en UNE transaction chacune (natif plpgsql), puis
-- resserrage RLS — on RÉVOQUE l'écriture client sur crews/crew_members et on DROP les policies
-- d'écriture correspondantes. La lecture publique (crews_select_all sur colonnes non secrètes
-- via 0036, crew_members_select_all) reste ouverte : listing/affichage inchangés.
--
-- Le `code` (6 car. A-Z0-9, CREW_CODE_LENGTH) est GÉNÉRÉ SERVEUR à la création (jamais lisible
-- par le client hors service_role, cf. 0036) et n'est retourné qu'au créateur. join_crew_by_code
-- normalise l'entrée (upper/trim) et renvoie `bad_code` DE MANIÈRE INDISTINCTE pour un code mal
-- formé comme pour un code inexistant → aucune énumération des crews.
--
-- Audit avant retrait des grants : le SEUL accès client à crews/crew_members est une LECTURE
-- (`.select('crew_id') … is('left_at', null)` dans apps/mobile/src/features/arsenal/signals.ts).
-- Aucun `insert`/`update` client sur ces deux tables → le resserrage ne casse aucun flux.
--
-- Additif et réversible (drop des 4 fonctions + recréation des policies/grants de 0003).

-- ═══ 1. create_crew ══════════════════════════════════════════════════════════
-- Refuse si déjà membre actif d'un crew (il faut d'abord quitter). Applique aussi
-- le cooldown 7 j : on ne peut pas créer un crew dans la foulée d'un départ récent.
create or replace function public.create_crew(
  p_name    text,
  p_color   smallint,
  p_city_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_name      text;
  v_last_left timestamptz;
  v_days_left integer;
  v_code      char(6);
  v_alphabet  constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_bytes     bytea;
  v_i         integer;
  v_try       integer;
  v_crew      public.crews%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Nom : 1..40 après trim (même borne que le check char_length de 0002).
  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    return jsonb_build_object('ok', false, 'reason', 'bad_name');
  end if;

  -- Couleur : 0..11 (game-rules: CREW_COLORS_COUNT = 12).
  if p_color is null or p_color < 0 or p_color >= 12 then
    return jsonb_build_object('ok', false, 'reason', 'bad_color');
  end if;

  -- Ville : doit exister (crews.city_id NOT NULL references city_zones).
  if p_city_id is null
     or not exists (select 1 from public.city_zones z where z.city_id = p_city_id) then
    return jsonb_build_object('ok', false, 'reason', 'bad_city');
  end if;

  -- Déjà membre actif d'un crew → il faut d'abord quitter.
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.left_at is null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_crew');
  end if;

  -- Cooldown 7 j (game-rules: CREW_SWITCH_COOLDOWN_DAYS) : départ récent d'un crew.
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  -- Génération du code : 6 car. A-Z0-9 (game-rules: CREW_CODE_LENGTH), retry sur collision.
  for v_try in 1..5 loop
    v_code := '';
    v_bytes := extensions.gen_random_bytes(6);   -- game-rules: CREW_CODE_LENGTH
    for v_i in 0..5 loop
      -- get_byte donne 0..255 → modulo 36 sur l'alphabet (léger biais toléré : code opaque).
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_i) % 36) + 1, 1);
    end loop;
    begin
      insert into public.crews (name, color, city_id, code, created_by)
      values (v_name, p_color, p_city_id, v_code, v_uid)
      returning * into v_crew;
      exit;  -- succès
    exception when unique_violation then
      v_crew.id := null;  -- collision de code : on retente
    end;
  end loop;

  if v_crew.id is null then
    -- Épuisement improbable des 5 essais : signalé comme bad_code (pas d'exception nue).
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;

  insert into public.crew_members (crew_id, user_id)
  values (v_crew.id, v_uid);

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id',      v_crew.id,
    'name',    v_crew.name,
    'color',   v_crew.color,
    'city_id', v_crew.city_id,
    'code',    v_crew.code
  ));
end;
$$;

-- ═══ 2. join_crew_by_code ════════════════════════════════════════════════════
-- Idempotent si déjà membre du MÊME crew. Si membre actif d'un AUTRE crew : switch
-- (clôture l'ancienne adhésion puis adhère) — le cooldown 7 j ne bloque que si un
-- left_at récent (< 7 j) existe DÉJÀ avant l'appel (la clôture du switch ne compte pas).
create or replace function public.join_crew_by_code(
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_code         char(6);
  v_crew         public.crews%rowtype;
  v_active_count integer;
  v_last_left    timestamptz;
  v_days_left    integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Normalisation : upper + trim. Un code mal formé donne le MÊME 'bad_code' qu'un
  -- code inexistant (zéro énumération).
  v_code := upper(btrim(coalesce(p_code, '')));

  select * into v_crew from public.crews c where c.code = v_code limit 1;
  if v_crew.id is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;

  -- Idempotent : déjà membre actif de CE crew → succès sans rien changer.
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = v_crew.id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
      'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
  end if;

  -- Cooldown 7 j : basé sur les adhésions DÉJÀ closes avant cet appel.
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  -- Plafond : membres actifs du crew cible < 50 (game-rules: CREW_MAX_MEMBERS).
  -- Verrou sur la ligne crews AVANT le comptage : sans lui, deux joins
  -- concurrents (users distincts) voient chacun count=49 sous READ COMMITTED et
  -- insèrent tous les deux → 51 membres. Le FOR UPDATE sérialise les joins vers
  -- CE crew ; le second attend, recompte 50, reçoit 'full'.
  perform 1 from public.crews c where c.id = v_crew.id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = v_crew.id and cm.left_at is null;
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  -- Switch : clôt l'adhésion active à un AUTRE crew (l'index one_active_per_user
  -- interdit sinon deux adhésions actives). Ce left_at = now() ne déclenche PAS le
  -- cooldown de cet appel (déjà passé).
  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;

  insert into public.crew_members (crew_id, user_id)
  values (v_crew.id, v_uid);

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
end;
$$;

-- ═══ 3. leave_crew ═══════════════════════════════════════════════════════════
create or replace function public.leave_crew()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_rowcount integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;
  get diagnostics v_rowcount = row_count;

  if v_rowcount = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ═══ 4. my_crew_code ═════════════════════════════════════════════════════════
-- Tout membre actif peut inviter → renvoie le code de SON crew actif.
create or replace function public.my_crew_code()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_code char(6);
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select c.code into v_code
  from public.crew_members cm
  join public.crews c on c.id = cm.crew_id
  where cm.user_id = v_uid and cm.left_at is null
  limit 1;

  if v_code is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  return jsonb_build_object('ok', true, 'code', v_code);
end;
$$;

-- ═══ 5. Resserrage RLS : l'écriture crew passe DÉSORMAIS par les RPC ══════════
-- Révoque l'écriture client (table + colonnes) et supprime les policies d'écriture.
-- On CONSERVE : crews_select_all + grants SELECT colonnes (0036), crew_members_select_all,
-- crews_update_creator + grant update(name,color) (renommage payant, Edge Function).
revoke insert on public.crews from authenticated;
revoke insert, update on public.crew_members from authenticated;

drop policy if exists crews_insert_creator       on public.crews;
drop policy if exists crew_members_insert_self    on public.crew_members;
drop policy if exists crew_members_update_self    on public.crew_members;

-- ═══ 6. Exécution : authenticated uniquement (jamais anon) ════════════════════
revoke all on function public.create_crew(text, smallint, text)  from public, anon;
revoke all on function public.join_crew_by_code(text)            from public, anon;
revoke all on function public.leave_crew()                       from public, anon;
revoke all on function public.my_crew_code()                     from public, anon;

grant execute on function public.create_crew(text, smallint, text) to authenticated;
grant execute on function public.join_crew_by_code(text)           to authenticated;
grant execute on function public.leave_crew()                      to authenticated;
grant execute on function public.my_crew_code()                    to authenticated;
