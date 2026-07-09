-- GRYD — 0026 Feature entitlements (GRYD Pass / Founder / promo).
-- Matrice : docs/product/GRYD_free_vs_premium_running_layer.md
-- Les features "free" (record_activity, core_leaderboards, …) sont toujours
-- disponibles côté RPC sans ligne — cette table ne concerne que le premium.

create table if not exists public.feature_entitlements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  feature_key  text not null,
  source       text not null check (source in ('pass', 'founder', 'promo', 'admin', 'eclats')),
  starts_at    timestamptz not null default now(),
  expires_at   timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists feature_entitlements_user_key_idx
  on public.feature_entitlements (user_id, feature_key)
  where is_active = true;

create index if not exists feature_entitlements_expires_idx
  on public.feature_entitlements (expires_at)
  where is_active = true and expires_at is not null;

alter table public.feature_entitlements enable row level security;

revoke insert, update, delete on public.feature_entitlements from anon, authenticated;

drop policy if exists feature_entitlements_select_own on public.feature_entitlements;
create policy feature_entitlements_select_own on public.feature_entitlements
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Features gratuites du socle jeu (alignées packages/shared feature-entitlements.ts).
create or replace function public._free_feature_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'record_activity',
    'basic_history',
    'basic_crew',
    'basic_safety',
    'suggested_missions',
    'core_leaderboards',
    'official_challenges',
    'basic_share',
    'gryd_verify',
    'privacy_masking'
  ]::text[];
$$;

-- true si feature gratuite OU entitlement actif non expiré pour l'utilisateur courant.
create or replace function public.is_feature_entitled(p_feature_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if p_feature_key = any (public._free_feature_keys()) then
    return true;
  end if;

  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  return exists (
    select 1
    from public.feature_entitlements fe
    where fe.user_id = v_uid
      and fe.feature_key = p_feature_key
      and fe.is_active = true
      and fe.starts_at <= now()
      and (fe.expires_at is null or fe.expires_at > now())
  );
end;
$$;

revoke all on function public.is_feature_entitled(text) from public;
grant execute on function public.is_feature_entitled(text) to authenticated;
