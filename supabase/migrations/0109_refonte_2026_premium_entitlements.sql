-- September 2026 §16. Store tools expire; previously earned season objects do not.
-- RevenueCat's server API is authoritative. No backfill from users.is_club.
create table public.premium_entitlements_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  entitlement_id text not null,
  product_id text,
  is_active boolean not null default false,
  expires_at timestamptz,
  lifetime boolean not null default false,
  event_timestamp_ms bigint not null check(event_timestamp_ms > 0),
  observed_at_ms bigint not null check(observed_at_ms > 0),
  rc_event_id text not null,
  verified_at timestamptz not null default now(),
  primary key(user_id,entitlement_id),
  check(not is_active or product_id is not null),
  check(not is_active or (lifetime and expires_at is null) or (not lifetime and expires_at is not null))
);
create table public.premium_receipts_2026 (
  rc_event_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  event_timestamp_ms bigint not null,
  applied boolean not null,
  completed_at timestamptz not null default now(),
  primary key(rc_event_id,user_id)
);
alter table public.premium_entitlements_2026 enable row level security;
alter table public.premium_receipts_2026 enable row level security;
revoke all on public.premium_entitlements_2026, public.premium_receipts_2026 from anon,authenticated;
grant all on public.premium_entitlements_2026, public.premium_receipts_2026 to service_role;

create or replace function public.has_gryd_plus_access_2026(p_user_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.premium_entitlements_2026 where user_id=p_user_id and is_active and (lifetime or expires_at>now()));
$$;

create or replace function public.get_gryd_plus_access_2026() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r public.premium_entitlements_2026;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into r from public.premium_entitlements_2026 where user_id=auth.uid()
    order by (is_active and (lifetime or expires_at>now())) desc, verified_at desc limit 1;
  return jsonb_build_object('active',coalesce(r.is_active and (r.lifetime or r.expires_at>now()),false),
    'expiresAt',r.expires_at,'lifetime',coalesce(r.lifetime,false),'productId',r.product_id,'verifiedAt',r.verified_at);
end $$;

-- Snapshot + receipt form ONE transaction. A failed write never leaves a success receipt.
-- Locks span entitlement ids so transfers/account deletion cannot cross a partial owner update.
create or replace function public.apply_gryd_plus_snapshot_2026(
  p_user_id uuid,p_entitlement_id text,p_product_id text,p_active boolean,p_expires_at timestamptz,p_lifetime boolean,
  p_event_id text,p_event_timestamp_ms bigint,p_observed_at_ms bigint
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare previous public.premium_entitlements_2026; did_apply boolean := false;
begin
  if nullif(p_event_id,'') is null or nullif(p_entitlement_id,'') is null or p_event_timestamp_ms is null or p_event_timestamp_ms<=0 or p_observed_at_ms is null or p_observed_at_ms<=0 then raise exception 'invalid_premium_snapshot'; end if;
  if p_active and (p_product_id is null or p_lifetime is null or (p_lifetime and p_expires_at is not null) or (not p_lifetime and p_expires_at is null)) then raise exception 'invalid_active_entitlement'; end if;
  perform pg_advisory_xact_lock(hashtextextended('premium2026:'||p_user_id::text,0));
  -- A late Store notification must never recreate a deleted account.
  perform 1 from public.users where id=p_user_id for key share;
  if not found then return jsonb_build_object('ignored',true,'reason','unknown_user'); end if;
  if exists(select 1 from public.premium_receipts_2026 where rc_event_id=p_event_id and user_id=p_user_id) then
    return jsonb_build_object('replayed',true,'active',public.has_gryd_plus_access_2026(p_user_id));
  end if;
  select * into previous from public.premium_entitlements_2026 where user_id=p_user_id and entitlement_id=p_entitlement_id for update;
  -- Snapshot time orders writes; an old webhook can trigger a fresh authoritative read.
  -- Event time is retained monotonically for audit. Equal-time conflict prefers revocation.
  if not found or p_observed_at_ms>previous.observed_at_ms or (p_observed_at_ms=previous.observed_at_ms and not p_active) then
    insert into public.premium_entitlements_2026(user_id,entitlement_id,product_id,is_active,expires_at,lifetime,event_timestamp_ms,observed_at_ms,rc_event_id)
      values(p_user_id,p_entitlement_id,p_product_id,p_active,p_expires_at,p_lifetime,p_event_timestamp_ms,p_observed_at_ms,p_event_id)
      on conflict(user_id,entitlement_id) do update set product_id=excluded.product_id,is_active=excluded.is_active,expires_at=excluded.expires_at,lifetime=excluded.lifetime,
        event_timestamp_ms=greatest(premium_entitlements_2026.event_timestamp_ms,excluded.event_timestamp_ms),observed_at_ms=excluded.observed_at_ms,rc_event_id=excluded.rc_event_id,verified_at=now();
    did_apply := true;
  end if;
  insert into public.premium_receipts_2026(rc_event_id,user_id,event_timestamp_ms,applied) values(p_event_id,p_user_id,p_event_timestamp_ms,did_apply);
  return jsonb_build_object('applied',did_apply,'active',public.has_gryd_plus_access_2026(p_user_id));
end $$;
revoke all on function public.has_gryd_plus_access_2026(uuid),public.apply_gryd_plus_snapshot_2026(uuid,text,text,boolean,timestamptz,boolean,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.has_gryd_plus_access_2026(uuid),public.apply_gryd_plus_snapshot_2026(uuid,text,text,boolean,timestamptz,boolean,text,bigint,bigint) to service_role;
revoke all on function public.get_gryd_plus_access_2026() from public,anon;
grant execute on function public.get_gryd_plus_access_2026() to authenticated;
