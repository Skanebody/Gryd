-- GRYD — 0018 : lecture carte (hex_claims) + helper code crew.
-- game-rules: CREW_CODE_LENGTH, CREW_MAX_MEMBERS

-- ═══ hex_claims_for_city : tuiles carte MVP (Paris/Lille) ═══════════════════
create or replace function public.hex_claims_for_city(p_city_id text)
returns table (
  h3index bigint,
  owner_user_id uuid,
  claim_type text,
  decay_at timestamptz,
  shielded_until timestamptz,
  owner_crew_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    hc.h3index,
    hc.owner_user_id,
    hc.claim_type,
    hc.decay_at,
    hc.shielded_until,
    (
      select cm.crew_id
      from public.crew_members cm
      where cm.user_id = hc.owner_user_id
        and cm.left_at is null
      limit 1
    ) as owner_crew_id
  from public.hex_claims hc
  where hc.city_id = p_city_id
    and hc.owner_user_id is not null
  limit 8000;
$$;

revoke all on function public.hex_claims_for_city(text) from public;
grant execute on function public.hex_claims_for_city(text) to authenticated;

-- ═══ generate_crew_code : code unique 6 chars (service_role / Edge Functions) ═
create or replace function public.generate_crew_code()
returns char(6)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code char(6);
  v_try integer := 0;
begin
  loop
    v_try := v_try + 1;
    if v_try > 50 then
      raise exception 'generate_crew_code: exhausted retries';
    end if;
    v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.crews c where c.code = v_code);
  end loop;
  return v_code;
end;
$$;

revoke all on function public.generate_crew_code() from public, anon, authenticated;
grant execute on function public.generate_crew_code() to service_role;
