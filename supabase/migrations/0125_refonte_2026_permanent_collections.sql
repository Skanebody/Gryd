-- Three independent non-consumables. No invented Store identifiers or prices.
create table public.commercial_collections_2026 (
  id text primary key check(id in ('contour','relief','clubhouse')),
  entitlement_id text unique,
  product_ids text[] not null default '{}',
  enabled boolean not null default false,
  check(array_position(product_ids,null) is null and array_position(product_ids,'') is null),
  check(not enabled or (nullif(entitlement_id,'') is not null and cardinality(product_ids)>0))
);
insert into public.commercial_collections_2026(id) values('contour'),('relief'),('clubhouse');
create function public.ensure_distinct_commercial_products_2026() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if exists(select 1 from public.commercial_collections_2026 where id<>new.id and product_ids&&new.product_ids) then raise exception 'collection_product_already_assigned'; end if;
  return new;
end $$;
create trigger commercial_products_distinct_2026 before insert or update on public.commercial_collections_2026
for each row execute function public.ensure_distinct_commercial_products_2026();
create table public.commercial_ownership_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  collection_id text not null references public.commercial_collections_2026(id),
  owned boolean not null,
  product_id text,
  acquired_at timestamptz,
  observed_at_ms bigint not null check(observed_at_ms>0),
  verified_at timestamptz not null default now(),
  primary key(user_id,collection_id),
  check(not owned or (product_id is not null and acquired_at is not null))
);
create table public.commercial_receipts_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  event_id text not null,
  observed_at_ms bigint not null,
  primary key(user_id,event_id)
);
create table public.commercial_equipment_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  slot text not null check(slot in ('frame','emblem')),
  collection_id text not null references public.commercial_collections_2026(id),
  primary key(user_id,slot),
  check((slot='frame' and collection_id='relief') or (slot='emblem' and collection_id='clubhouse'))
);
alter table public.commercial_collections_2026 enable row level security;
alter table public.commercial_ownership_2026 enable row level security;
alter table public.commercial_receipts_2026 enable row level security;
alter table public.commercial_equipment_2026 enable row level security;
revoke all on public.commercial_collections_2026,public.commercial_ownership_2026,public.commercial_receipts_2026,public.commercial_equipment_2026 from anon,authenticated;
grant all on public.commercial_collections_2026,public.commercial_ownership_2026,public.commercial_receipts_2026,public.commercial_equipment_2026 to service_role;

create function public.get_commercial_collections_2026() returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('collections',coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'productIds',case when c.enabled then to_jsonb(c.product_ids) else '[]'::jsonb end,
    'configured',c.enabled,'owned',coalesce(o.owned,false),'acquiredAt',o.acquired_at,
    'equipped',exists(select 1 from public.commercial_equipment_2026 e where e.user_id=auth.uid() and e.collection_id=c.id)
  ) order by c.id),'[]'::jsonb)) from public.commercial_collections_2026 c
  left join public.commercial_ownership_2026 o on o.collection_id=c.id and o.user_id=auth.uid();
$$;

-- The Edge function supplies a full authoritative snapshot, never an SDK boolean.
create function public.apply_commercial_snapshot_2026(p_user_id uuid,p_event_id text,p_observed_at_ms bigint,p_items jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; previous public.commercial_ownership_2026; cid text; active boolean;
begin
  if nullif(p_event_id,'') is null or p_observed_at_ms is null or p_observed_at_ms<=0 or p_items is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'invalid_collection_snapshot'; end if;
  perform pg_advisory_xact_lock(hashtextextended('commercial2026:'||p_user_id::text,0));
  perform 1 from public.users where id=p_user_id for key share;
  if not found then return jsonb_build_object('ignored',true); end if;
  if exists(select 1 from public.commercial_receipts_2026 where user_id=p_user_id and event_id=p_event_id) then return jsonb_build_object('replayed',true); end if;
  if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p_items)) then raise exception 'duplicate_collection'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    cid:=item->>'id'; active:=(item->>'owned')::boolean;
    if active is null or not exists(select 1 from public.commercial_collections_2026 where id=cid) then raise exception 'invalid_collection'; end if;
    if active and (nullif(item->>'acquiredAt','') is null or not exists(select 1 from public.commercial_collections_2026 where id=cid and item->>'productId'=any(product_ids))) then raise exception 'unconfigured_collection_product'; end if;
    select * into previous from public.commercial_ownership_2026 where user_id=p_user_id and collection_id=cid for update;
    if not found or p_observed_at_ms>previous.observed_at_ms or (p_observed_at_ms=previous.observed_at_ms and not active) then
      insert into public.commercial_ownership_2026(user_id,collection_id,owned,product_id,acquired_at,observed_at_ms)
      values(p_user_id,cid,active,item->>'productId',(item->>'acquiredAt')::timestamptz,p_observed_at_ms)
      on conflict(user_id,collection_id) do update set owned=excluded.owned,product_id=excluded.product_id,
        acquired_at=excluded.acquired_at,observed_at_ms=excluded.observed_at_ms,verified_at=now();
      if not active then delete from public.commercial_equipment_2026 where user_id=p_user_id and collection_id=cid; end if;
    end if;
  end loop;
  insert into public.commercial_receipts_2026 values(p_user_id,p_event_id,p_observed_at_ms);
  return jsonb_build_object('applied',true);
end $$;

create function public.equip_commercial_collection_2026(p_collection_id text,p_equip boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare target_slot text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_equip is null then raise exception 'invalid_equipment_choice'; end if;
  perform pg_advisory_xact_lock(hashtextextended('commercial2026:'||auth.uid()::text,0));
  target_slot:=case p_collection_id when 'relief' then 'frame' when 'clubhouse' then 'emblem' else null end;
  if target_slot is null then raise exception 'not_an_identity_object'; end if;
  if not p_equip then delete from public.commercial_equipment_2026 where user_id=auth.uid() and collection_id=p_collection_id; return; end if;
  if not exists(select 1 from public.commercial_ownership_2026 where user_id=auth.uid() and collection_id=p_collection_id and owned) then raise exception 'collection_not_owned'; end if;
  insert into public.commercial_equipment_2026 values(auth.uid(),target_slot,p_collection_id)
    on conflict(user_id,slot) do update set collection_id=excluded.collection_id;
end $$;
revoke all on function public.apply_commercial_snapshot_2026(uuid,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.apply_commercial_snapshot_2026(uuid,text,bigint,jsonb) to service_role;
revoke all on function public.get_commercial_collections_2026() from public;
grant execute on function public.get_commercial_collections_2026() to anon,authenticated;
revoke all on function public.equip_commercial_collection_2026(text,boolean) from public,anon;
grant execute on function public.equip_commercial_collection_2026(text,boolean) to authenticated;
