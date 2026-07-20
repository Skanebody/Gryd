-- 0043_crew_roles_fix.sql
-- GRYD — BUG : le créateur d'un crew n'en est pas le chef.
--
-- Constaté par l'audit de la doctrine Crew MVP (20/07/2026). `create_crew` et
-- `join_crew_by_code` (0042) insèrent dans crew_members SANS la colonne `role`
-- (0010:47, réalignée 0013) → tout le monde tombe sur le DEFAULT. Le seul
-- backfill « le créateur devient leader » est un `update` one-shot de 0010:52-60
-- qui ne rejouera JAMAIS pour un crew créé après cette migration.
--
-- Conséquence : AUCUNE hiérarchie n'existe dans les crews réels. Pas de chef,
-- donc pas de permission, pas de modération, pas de transmission de direction.
-- Toute la §6 de la doctrine (chef / adjoint / membre) repose là-dessus, et
-- c'est une dette de DONNÉES qui s'aggrave à chaque crew créé — d'où le
-- correctif immédiat plutôt qu'un chantier ultérieur.
--
-- Rôles : la source de vérité est packages/shared/src/game-rules.ts §8.1
-- (CREW_ROLES, réalignés par 0013) — `founder` = propriétaire, CREW_ENTRY_ROLE
-- = 'rookie' pour une adhésion. On ne réécrit PAS create_crew/join_crew_by_code
-- en entier : on corrige la seule ligne fautive de chacune, à comportement
-- identique par ailleurs.

-- ─── 1. Backfill idempotent des crews déjà créés sans chef ───────────────────
-- Rejouable sans effet de bord : ne touche que les adhésions ACTIVES du
-- créateur qui n'ont pas déjà un rôle de direction.
update public.crew_members cm
set role = 'founder'
from public.crews c
where cm.crew_id = c.id
  and cm.user_id = c.created_by
  and cm.left_at is null
  and cm.role not in ('founder', 'captain', 'co_captain');

-- ─── 2. create_crew : le créateur naît FONDATEUR ─────────────────────────────
-- Réécriture de la seule instruction d'insertion d'adhésion. Le reste de la
-- fonction (gardes signed_out/bad_name/bad_color/bad_city/already_in_crew/
-- cooldown, génération du code avec retry collision) est repris VERBATIM de
-- 0042 — aucun changement de comportement hors le rôle.
create or replace function public.create_crew(
  p_name text,
  p_color smallint,
  p_city_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_last_left timestamptz;
  v_days_left integer;
  v_code char(6);
  v_crew public.crews%rowtype;
  v_try integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    return jsonb_build_object('ok', false, 'reason', 'bad_name');
  end if;
  if p_color is null or p_color < 0 or p_color >= 12 then   -- game-rules: CREW_COLORS_COUNT
    return jsonb_build_object('ok', false, 'reason', 'bad_color');
  end if;
  if not exists (select 1 from public.city_zones z where z.city_id = p_city_id) then
    return jsonb_build_object('ok', false, 'reason', 'bad_city');
  end if;
  if exists (
    select 1 from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_crew');
  end if;

  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  -- Code 6 chars A-Z0-9 généré SERVEUR (0036 : jamais lisible côté client).
  loop
    v_try := v_try + 1;
    select string_agg(
             substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    (get_byte(b, i) % 36) + 1, 1), '')
      into v_code
    from (select extensions.gen_random_bytes(6) as b) g,
         generate_series(0, 5) as i;
    begin
      insert into public.crews (name, color, city_id, code, created_by)
      values (v_name, p_color, p_city_id, v_code, v_uid)
      returning * into v_crew;
      exit;
    exception when unique_violation then
      if v_try >= 5 then raise; end if;
    end;
  end loop;

  -- LE CORRECTIF : rôle explicite. Sans lui, le créateur tombait sur le DEFAULT
  -- et son propre crew n'avait aucun chef.
  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'founder');

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color,
    'city_id', v_crew.city_id, 'code', v_crew.code));
end;
$$;

-- ─── 3. join_crew_by_code : l'arrivant naît ROOKIE (CREW_ENTRY_ROLE) ─────────
create or replace function public.join_crew_by_code(p_code text) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code char(6);
  v_crew public.crews%rowtype;
  v_last_left timestamptz;
  v_days_left integer;
  v_active_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Normalisation + lookup. `bad_code` est la MÊME réponse pour un code mal
  -- formé et pour un code inexistant : zéro énumération de crews.
  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z0-9]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;
  select * into v_crew from public.crews c where c.code = v_code;
  if not found then
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

  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  -- Verrou AVANT comptage : sans lui, deux joins concurrents voient chacun 49
  -- sous READ COMMITTED et dépassent le plafond (correctif 0042).
  perform 1 from public.crews c where c.id = v_crew.id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = v_crew.id and cm.left_at is null;
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;

  -- LE CORRECTIF : rôle d'entrée explicite (game-rules: CREW_ENTRY_ROLE).
  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'rookie');

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
end;
$$;

revoke all on function public.create_crew(text, smallint, text) from anon;
revoke all on function public.join_crew_by_code(text) from anon;
grant execute on function public.create_crew(text, smallint, text) to authenticated;
grant execute on function public.join_crew_by_code(text) to authenticated;
