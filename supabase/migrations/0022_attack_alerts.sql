-- GRYD — 0022 Alerte d'attaque (option A) : remplace le bouclier territorial payant.
-- Notifie le défenseur ; ne bloque jamais la capture (anti pay-to-win).

-- ═══ Type item attack_alert ═══════════════════════════════════════════════════
alter table public.items drop constraint if exists items_type_check;
alter table public.items add constraint items_type_check check (type in (
  'pack', 'eclats', 'skin_territory', 'skin_trace', 'frame_profile',
  'template_share', 'banner_crew', 'emblem_crew', 'shield', 'attack_alert',
  'streak_gel', 'scout_ping', 'crew_boost', 'cosmetic_chest', 'recruit_template',
  'season_pass', 'badge', 'title'
));

-- Bouclier territorial → draft (legacy engine lit encore shielded_until).
update public.items
set status = 'draft',
    usage_limit = 'Remplacé par Alerte d''attaque — cosmétique/defense info uniquement',
    description = 'Obsolète : ne bloque plus les zones. Utilise Alerte d''attaque.'
where item_key = 'shield';

insert into public.items (
  item_key, name, type, rarity, price_shards, price_eur, is_consumable,
  usage_limit, target_scope, animation_key, description, status
) values (
  'attack_alert',
  'Alerte d''attaque',
  'attack_alert',
  'race',
  50,
  null,
  true,
  '2/semaine max (1 inclus Club) — n''empêche pas la capture',
  'zone',
  'radar_pulse',
  'Surveille une zone fraîche : tu es prévenu si on la cible. Défends en courant.',
  'active'
)
on conflict (item_key) do update set
  name = excluded.name,
  type = excluded.type,
  price_shards = excluded.price_shards,
  is_consumable = excluded.is_consumable,
  usage_limit = excluded.usage_limit,
  description = excluded.description,
  status = excluded.status;

-- ═══ attack_alerts : surveillance active par hex ════════════════════════════
create table if not exists public.attack_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  h3index      bigint not null,
  city_id      text,
  activated_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  source       text not null check (source in ('club', 'eclats', 'inventory', 'pass')),
  created_at   timestamptz not null default now()
);
create index if not exists attack_alerts_user_exp_idx
  on public.attack_alerts (user_id, expires_at desc);
-- Postgres requires immutable expressions in partial-index predicates.
-- Use a regular index; queries already filter with `expires_at > now()` at runtime.
create index if not exists attack_alerts_hex_exp_idx
  on public.attack_alerts (h3index, expires_at desc);

-- ═══ item_usage_logs (monétisation CoC→GRYD) ════════════════════════════════
create table if not exists public.item_usage_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  item_key      text not null,
  used_on_type  text,
  used_on_id    text,
  effect_applied jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
-- Si la table existe déjà sans `created_at` (ex: précédent db push interrompu),
-- on la rajoute pour que les index ci-dessous restent valides.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'item_usage_logs'
      and column_name = 'created_at'
  ) then
    alter table public.item_usage_logs
      add column created_at timestamptz not null default now();
  end if;
end $$;
create index if not exists item_usage_logs_user_idx
  on public.item_usage_logs (user_id, created_at desc);

alter table public.attack_alerts    enable row level security;
alter table public.item_usage_logs  enable row level security;

revoke insert, update, delete on public.attack_alerts   from anon, authenticated;
revoke insert, update, delete on public.item_usage_logs from anon, authenticated;

create policy attack_alerts_select_own on public.attack_alerts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy item_usage_logs_select_own on public.item_usage_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ═══ RPC activate_arsenal_item (attack_alert MVP) ════════════════════════════
create or replace function public.activate_arsenal_item(
  p_item_key text,
  p_h3index text,
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
  v_user_week int;
  v_crew_week int;
  v_expires timestamptz;
  v_source text;
  v_alert_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if p_item_key <> 'attack_alert' then
    raise exception 'item_not_supported';
  end if;

  if p_h3index is null or char_length(p_h3index) < 4 then
    raise exception 'invalid_hex';
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

  select coalesce(u.is_club, false) into v_is_club
  from public.users u
  where u.id = v_user_id;

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
    where user_id = v_user_id and h3index = p_h3index and expires_at > now()
  ) then
    raise exception 'already_active';
  end if;

  v_source := case when v_is_club and v_user_week < 1 then 'club' else 'inventory' end;
  v_expires := now() + interval '3 hours';

  update public.user_inventory
  set quantity = quantity - 1
  where user_id = v_user_id and item_id = v_item_id and quantity > 0;

  insert into public.attack_alerts (user_id, h3index, city_id, expires_at, source)
  values (v_user_id, p_h3index, p_city_id, v_expires, v_source)
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
