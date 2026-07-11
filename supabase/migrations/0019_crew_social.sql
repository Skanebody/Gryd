-- ⚠️ Rapatriée depuis la prod (schema_migrations) le 11/07/2026 — appliquée en remote,
-- absente du repo local. Reconstruction fidèle des statements déployés.

-- GRYD — 0019 Crew social live : chat, sorties, requêtes/dons, contributions coffre.
-- Écriture service_role only (Edge Functions). Lecture membres actifs du crew.

-- ═══ crew_messages (chat crew) ═══════════════════════════════════════════════
create table if not exists public.crew_messages (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.crews (id) on delete cascade,
  author_id  uuid not null references public.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists crew_messages_crew_idx
  on public.crew_messages (crew_id, created_at desc);

-- ═══ crew_events + RSVPs (sorties crew) ════════════════════════════════════
create table if not exists public.crew_events (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.crews (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  when_label  text not null check (char_length(when_label) between 1 and 60),
  place_label text not null check (char_length(place_label) between 1 and 80),
  zone_label  text not null check (char_length(zone_label) between 1 and 80),
  objective   text not null check (objective in ('defense', 'conquete')),
  created_by  uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists crew_events_crew_idx
  on public.crew_events (crew_id, created_at desc);

create table if not exists public.crew_event_rsvps (
  event_id   uuid not null references public.crew_events (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  choice     text not null check (choice in ('coming', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ═══ crew_requests (demandes crew) ═══════════════════════════════════════════
create table if not exists public.crew_requests (
  id            uuid primary key default gen_random_uuid(),
  crew_id       uuid not null references public.crews (id) on delete cascade,
  requester_id  uuid not null references public.users (id) on delete cascade,
  request_type  text not null check (request_type in
    ('defense', 'finish', 'route', 'scout', 'outing', 'boost')),
  zone_label    text not null check (char_length(zone_label) between 1 and 80),
  infos         jsonb not null default '[]'::jsonb,
  status        text not null default 'open'
    check (status in ('open', 'fulfilled', 'cancelled')),
  fulfilled_by  uuid references public.users (id) on delete set null,
  fulfilled_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists crew_requests_crew_idx
  on public.crew_requests (crew_id, status, created_at desc);

-- ═══ crew_gifts + claims (cadeaux premium réclamables) ═══════════════════════
create table if not exists public.crew_gifts (
  id                   uuid primary key default gen_random_uuid(),
  crew_id              uuid not null references public.crews (id) on delete cascade,
  gift_kind            text not null check (gift_kind in ('boost', 'chest', 'donation')),
  title                text not null check (char_length(title) between 1 and 80),
  rewards_total        int not null check (rewards_total > 0),
  offered_by_user_id   uuid references public.users (id) on delete set null,
  donation_kind        text check (donation_kind in ('route', 'scout', 'defense')),
  expires_at           timestamptz not null,
  created_at           timestamptz not null default now()
);

create index if not exists crew_gifts_crew_idx
  on public.crew_gifts (crew_id, created_at desc);

create table if not exists public.crew_gift_claims (
  gift_id    uuid not null references public.crew_gifts (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (gift_id, user_id)
);

-- ═══ crew_chest_contributions (membre × semaine) ════════════════════════════
create table if not exists public.crew_chest_contributions (
  crew_id    uuid not null references public.crews (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  points     bigint not null default 0 check (points >= 0),
  primary key (crew_id, user_id, week_start)
);

create index if not exists crew_chest_contrib_crew_week_idx
  on public.crew_chest_contributions (crew_id, week_start, points desc);

-- ═══ RPC equip_user_item (cosmétique, un actif par target_scope) ═════════════
create or replace function public.equip_user_item(p_item_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_id uuid;
  v_scope   text;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  select i.id, i.target_scope into v_item_id, v_scope
  from public.items i
  join public.user_inventory ui on ui.item_id = i.id
  where ui.user_id = v_user_id
    and i.item_key = p_item_key
    and ui.quantity > 0
  limit 1;

  if v_item_id is null then
    raise exception 'item_not_owned';
  end if;

  update public.user_inventory ui
  set equipped = false
  from public.items i
  where ui.user_id = v_user_id
    and ui.item_id = i.id
    and i.target_scope = v_scope
    and i.type in (
      'skin_territory', 'skin_trace', 'frame_profile', 'template_share',
      'banner_crew', 'emblem_crew', 'title'
    );

  update public.user_inventory
  set equipped = true
  where user_id = v_user_id and item_id = v_item_id;
end;
$$;

revoke all on function public.equip_user_item(text) from public;

grant execute on function public.equip_user_item(text) to authenticated;

-- ═══ RLS ═════════════════════════════════════════════════════════════════════
alter table public.crew_messages            enable row level security;

alter table public.crew_events              enable row level security;

alter table public.crew_event_rsvps         enable row level security;

alter table public.crew_requests            enable row level security;

alter table public.crew_gifts               enable row level security;

alter table public.crew_gift_claims         enable row level security;

alter table public.crew_chest_contributions enable row level security;

revoke insert, update, delete on public.crew_messages            from anon, authenticated;

revoke insert, update, delete on public.crew_events              from anon, authenticated;

revoke insert, update, delete on public.crew_event_rsvps         from anon, authenticated;

revoke insert, update, delete on public.crew_requests            from anon, authenticated;

revoke insert, update, delete on public.crew_gifts               from anon, authenticated;

revoke insert, update, delete on public.crew_gift_claims         from anon, authenticated;

revoke insert, update, delete on public.crew_chest_contributions from anon, authenticated;

create policy crew_messages_select_member on public.crew_messages
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_messages.crew_id
      and cm.user_id = (select auth.uid()) and cm.left_at is null
  ));

create policy crew_events_select_member on public.crew_events
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_events.crew_id
      and cm.user_id = (select auth.uid()) and cm.left_at is null
  ));

create policy crew_event_rsvps_select_member on public.crew_event_rsvps
  for select to authenticated
  using (exists (
    select 1 from public.crew_events ce
    join public.crew_members cm on cm.crew_id = ce.crew_id
    where ce.id = crew_event_rsvps.event_id
      and cm.user_id = (select auth.uid()) and cm.left_at is null
  ));

create policy crew_requests_select_member on public.crew_requests
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_requests.crew_id
      and cm.user_id = (select auth.uid()) and cm.left_at is null
  ));

create policy crew_gifts_select_member on public.crew_gifts
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_gifts.crew_id
      and cm.user_id = (select auth.uid()) and cm.left_at is null
  ));

create policy crew_gift_claims_select_member on public.crew_gift_claims
  for select to authenticated
  using (exists (
    select 1 from public.crew_gifts g
    join public.crew_members cm on cm.crew_id = g.crew_id
    where g.id = crew_gift_claims.gift_id
      and cm.user_id = (select auth.uid()) and cm.left_at is null
  ));

create policy crew_chest_contrib_select_member on public.crew_chest_contributions
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = crew_chest_contributions.crew_id
      and cm.user_id = (select auth.uid()) and cm.left_at is null
  ));
