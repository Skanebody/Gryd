-- ⚠️ Rapatriée depuis la prod (schema_migrations) le 11/07/2026 — appliquée en remote,
-- absente du repo local. Reconstruction fidèle des statements déployés.

-- GRYD — Import onboarding fondateur (batch unique : carte, 0 pt saison, XP plafonné).
-- Constantes : packages/shared/src/game-rules.ts (ONBOARDING_IMPORT_*).

-- ─── users : marqueur de batch terminé ───────────────────────────────────────
alter table public.users
  add column if not exists onboarding_import_at timestamptz;

comment on column public.users.onboarding_import_at is
  'Horodatage du batch unique onboarding_import (carte rétro + bonus XP fondateur). null = pas encore fait.';

-- ─── runs : source Strava + flag rétro ─────────────────────────────────────
alter table public.runs drop constraint if exists runs_source_check;

alter table public.runs
  add constraint runs_source_check
  check (source in ('gps', 'healthkit', 'strava'));

alter table public.runs
  add column if not exists is_onboarding_retro boolean not null default false;

alter table public.runs
  add column if not exists onboarding_xp_candidate integer not null default 0
  check (onboarding_xp_candidate >= 0);

create index if not exists runs_user_onboarding_retro_idx
  on public.runs (user_id, is_onboarding_retro)
  where is_onboarding_retro;

-- ─── imported_activities : statut claimed après batch ────────────────────────
alter table public.imported_activities drop constraint if exists imported_activities_status_check;

alter table public.imported_activities
  add constraint imported_activities_status_check
  check (status in (
    'capture_eligible', 'stats_only', 'partial', 'rejected', 'duplicate', 'review', 'claimed'
  ));

-- ─── RPC : crédit XP fondateur + niveau (service_role uniquement) ────────────
create or replace function public.apply_founder_xp(
  p_user_id uuid,
  p_xp      integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_xp  bigint;
  v_new_xp  bigint;
  v_level   integer;
  v_base    numeric := 200;   -- PLAYER_LEVEL_XP_BASE (game-rules)
  v_ratio   numeric := 1.12; -- PLAYER_LEVEL_XP_RATIO
  v_l       integer;
  v_cum     numeric;
  v_max_l   integer := 50;   -- PLAYER_LEVEL_MAX
begin
  if p_xp is null or p_xp < 0 then
    raise exception 'apply_founder_xp: p_xp must be >= 0';
  end if;

  select xp into v_old_xp from public.users where id = p_user_id for update;
  if not found then
    raise exception 'apply_founder_xp: unknown user %', p_user_id;
  end if;

  if (select onboarding_import_at from public.users where id = p_user_id) is not null then
    raise exception 'apply_founder_xp: onboarding import already completed for %', p_user_id;
  end if;

  v_new_xp := v_old_xp + p_xp;

  v_level := 1;
  for v_l in 2..v_max_l loop
    v_cum := round(v_base * (power(v_ratio, v_l - 1) - 1) / (v_ratio - 1));
    if v_new_xp >= v_cum then
      v_level := v_l;
    else
      exit;
    end if;
  end loop;

  update public.users
  set xp = v_new_xp,
      level = v_level,
      onboarding_import_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'xp_awarded', p_xp,
    'xp_total', v_new_xp,
    'level', v_level,
    'onboarding_import_at', (select onboarding_import_at from public.users where id = p_user_id)
  );
end;
$$;

revoke all on function public.apply_founder_xp(uuid, integer) from public;

revoke all on function public.apply_founder_xp(uuid, integer) from anon;

revoke all on function public.apply_founder_xp(uuid, integer) from authenticated;

grant execute on function public.apply_founder_xp(uuid, integer) to service_role;
