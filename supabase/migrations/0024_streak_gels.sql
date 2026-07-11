-- ⚠️ Rapatriée depuis la prod (schema_migrations) le 11/07/2026 — appliquée en remote,
-- absente du repo local. Reconstruction fidèle des statements déployés.

-- GRYD — 0024 Streak Gel : activation consommable (§20.2).
-- Protège la série hebdo 7 j ; max 2/mois ; aucun effet territoire.

create table if not exists public.streak_gels (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  activated_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  source       text not null check (source in ('club', 'eclats', 'inventory', 'pass')),
  created_at   timestamptz not null default now()
);

create index if not exists streak_gels_user_exp_idx
  on public.streak_gels (user_id, expires_at desc);

create index if not exists streak_gels_user_month_idx
  on public.streak_gels (user_id, activated_at desc);

alter table public.streak_gels enable row level security;

revoke insert, update, delete on public.streak_gels from anon, authenticated;

drop policy if exists streak_gels_select_own on public.streak_gels;

create policy streak_gels_select_own on public.streak_gels
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ═══ RPC activate_arsenal_item (attack_alert + streak_gel) ═══════════════════
create or replace function public.activate_arsenal_item(
  p_item_key text,
  p_h3index text default null,
  p_city_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_id uuid;
  v_is_club boolean;
  v_crew_id uuid;
  v_owner uuid;
  v_claimed_at timestamptz;
  v_week_start timestamptz := date_trunc('week', now() at time zone 'UTC');
  v_month_start timestamptz := date_trunc('month', now() at time zone 'UTC');
  v_user_week int;
  v_crew_week int;
  v_user_month int;
  v_expires timestamptz;
  v_source text;
  v_alert_id uuid;
  v_gel_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if p_item_key not in ('attack_alert', 'streak_gel') then
    raise exception 'item_not_supported';
  end if;

  select i.id into v_item_id
  from public.items i
  join public.user_inventory ui on ui.item_id = i.id
  where ui.user_id = v_user_id
    and i.item_key = p_item_key
    and i.status = 'active'
    and ui.quantity > 0
  limit 1;

  if v_item_id is null then
    raise exception 'item_not_owned';
  end if;

  select coalesce(u.is_club, false) into v_is_club
  from public.users u
  where u.id = v_user_id;

  -- ─── Streak Gel ───────────────────────────────────────────────────────────
  if p_item_key = 'streak_gel' then
    select count(*)::int into v_user_month
    from public.streak_gels
    where user_id = v_user_id
      and activated_at >= v_month_start;

    if v_user_month >= 2 then
      raise exception 'monthly_cap';
    end if;

    if exists (
      select 1 from public.streak_gels
      where user_id = v_user_id and expires_at > now()
    ) then
      raise exception 'already_active';
    end if;

    v_source := case when v_is_club and v_user_month < 1 then 'club' else 'inventory' end;
    v_expires := now() + interval '7 days';

    update public.user_inventory
    set quantity = quantity - 1
    where user_id = v_user_id and item_id = v_item_id and quantity > 0;

    insert into public.streak_gels (user_id, expires_at, source)
    values (v_user_id, v_expires, v_source)
    returning id into v_gel_id;

    insert into public.item_usage_logs (user_id, item_key, used_on_type, used_on_id, effect_applied)
    values (
      v_user_id,
      p_item_key,
      'user',
      v_user_id::text,
      jsonb_build_object('expires_at', v_expires, 'source', v_source, 'gel_id', v_gel_id)
    );

    return jsonb_build_object(
      'gelId', v_gel_id,
      'expiresAt', v_expires,
      'source', v_source
    );
  end if;

  -- ─── Alerte d'attaque ─────────────────────────────────────────────────────
  if p_h3index is null or char_length(p_h3index) < 4 then
    raise exception 'invalid_hex';
  end if;

  select hc.owner_user_id, hc.claimed_at
  into v_owner, v_claimed_at
  from public.hex_claims hc
  where hc.h3index = p_h3index::bigint
    and (p_city_id is null or hc.city_id = p_city_id)
  limit 1;

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'hex_not_owned';
  end if;

  if v_claimed_at is null or v_claimed_at < now() - interval '24 hours' then
    raise exception 'hex_not_fresh';
  end if;

  select count(*)::int into v_user_week
  from public.attack_alerts
  where user_id = v_user_id
    and activated_at >= v_week_start;

  if v_user_week >= 2 then
    raise exception 'weekly_cap_user';
  end if;

  select cm.crew_id into v_crew_id
  from public.crew_members cm
  where cm.user_id = v_user_id and cm.left_at is null
  limit 1;

  if v_crew_id is not null then
    select count(*)::int into v_crew_week
    from public.attack_alerts aa
    join public.crew_members cm on cm.user_id = aa.user_id and cm.left_at is null
    where cm.crew_id = v_crew_id
      and aa.activated_at >= v_week_start;

    if v_crew_week >= 12 then
      raise exception 'weekly_cap_crew';
    end if;
  end if;

  if exists (
    select 1 from public.attack_alerts
    where user_id = v_user_id and h3index = p_h3index::bigint and expires_at > now()
  ) then
    raise exception 'already_active';
  end if;

  v_source := case when v_is_club and v_user_week < 1 then 'club' else 'inventory' end;
  v_expires := now() + interval '3 hours';

  update public.user_inventory
  set quantity = quantity - 1
  where user_id = v_user_id and item_id = v_item_id and quantity > 0;

  insert into public.attack_alerts (user_id, h3index, city_id, expires_at, source)
  values (v_user_id, p_h3index::bigint, p_city_id, v_expires, v_source)
  returning id into v_alert_id;

  insert into public.item_usage_logs (user_id, item_key, used_on_type, used_on_id, effect_applied)
  values (
    v_user_id,
    p_item_key,
    'hex',
    p_h3index,
    jsonb_build_object('expires_at', v_expires, 'source', v_source, 'alert_id', v_alert_id)
  );

  return jsonb_build_object(
    'alertId', v_alert_id,
    'h3index', p_h3index,
    'expiresAt', v_expires,
    'source', v_source
  );
end;
$$;

revoke all on function public.activate_arsenal_item(text, text, text) from public;

grant execute on function public.activate_arsenal_item(text, text, text) to authenticated;
