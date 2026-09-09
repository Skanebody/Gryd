-- Independent durable sporting evidence and idempotent daily progression.
-- No territory, subscription, virtual currency or legacy XP enters this ledger.
create table public.progress_accounts_2026 (
  user_id uuid primary key references public.users(id) on delete cascade,
  initial_timezone text not null default 'Europe/Paris',
  version bigint not null default 0,
  ledger jsonb not null default '{"totalXp":0,"days":[],"collections":[]}'::jsonb
);
create table public.progress_activity_2026 (
  run_id uuid primary key references public.runs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  evidence jsonb not null
);
create table public.progress_corrections_2026 (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  version bigint not null,
  previous_ledger jsonb not null,
  new_ledger jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id,version)
);
alter table public.progress_accounts_2026 enable row level security;
alter table public.progress_activity_2026 enable row level security;
alter table public.progress_corrections_2026 enable row level security;
revoke all on public.progress_accounts_2026,public.progress_activity_2026,public.progress_corrections_2026 from anon,authenticated;
grant all on public.progress_accounts_2026,public.progress_activity_2026,public.progress_corrections_2026 to service_role;

create function public.record_progress_evidence_2026(p_run_id uuid,p_evidence jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid;
begin
  select user_id into strict owner from public.runs where id=p_run_id and ruleset_version='2026.1';
  insert into public.progress_accounts_2026(user_id) values(owner) on conflict do nothing;
  perform 1 from public.progress_accounts_2026 where user_id=owner for update;
  insert into public.progress_activity_2026 values(p_run_id,owner,p_evidence)
    on conflict(run_id) do update set evidence=excluded.evidence
    where progress_activity_2026.evidence is distinct from excluded.evidence;
  if found then update public.progress_accounts_2026 set version=version+1 where user_id=owner; end if;
end $$;

create function public.progress_snapshot_2026(p_user_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('version',p.version,'accountCreatedAt',u.created_at,
    'initialTimeZone',p.initial_timezone,'previousLedger',p.ledger,'activities',
    coalesce((select jsonb_agg(e.evidence order by e.run_id) from public.progress_activity_2026 e where e.user_id=p.user_id),'[]'::jsonb))
  from public.progress_accounts_2026 p join public.users u on u.id=p.user_id where p.user_id=p_user_id;
$$;

create function public.commit_progress_2026(p_user_id uuid,p_version bigint,p_ledger jsonb,p_run_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.progress_accounts_2026; xp_delta integer; run_xp integer;
begin
  select * into strict account from public.progress_accounts_2026 where user_id=p_user_id for update;
  if account.version<>p_version then return jsonb_build_object('committed',false,'xpDelta',0); end if;
  if p_run_id is not null then
    select xp_awarded into strict run_xp from public.runs where id=p_run_id and user_id=p_user_id;
  end if;
  if account.ledger=p_ledger then return jsonb_build_object('committed',true,'xpDelta',0,'runXpAwarded',run_xp); end if;
  xp_delta:=(p_ledger->>'totalXp')::integer-coalesce((account.ledger->>'totalXp')::integer,0);
  insert into public.progress_corrections_2026(user_id,version,previous_ledger,new_ledger)
    values(p_user_id,p_version,account.ledger,p_ledger);
  update public.progress_accounts_2026 set ledger=p_ledger where user_id=p_user_id;
  -- Keep the activity's receipt in the SAME transaction as the account credit.
  -- A concurrent retry receives this receipt instead of overwriting it with 0.
  if p_run_id is not null then
    update public.runs set xp_awarded=xp_awarded+greatest(xp_delta,0) where id=p_run_id and user_id=p_user_id returning xp_awarded into run_xp;
  end if;
  return jsonb_build_object('committed',true,'xpDelta',xp_delta,'runXpAwarded',run_xp);
end $$;

create function public.get_progression_2026()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare ledger jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select p.ledger into ledger from public.progress_accounts_2026 p where p.user_id=auth.uid();
  return jsonb_build_object('ruleset','2026.1','totalXp',coalesce((ledger->>'totalXp')::integer,0),
    'activeDays',coalesce((select count(*) from jsonb_array_elements(ledger->'days') d where (d->>'eligible')::boolean),0),
    'season',null);
end $$;

revoke all on function public.record_progress_evidence_2026(uuid,jsonb),public.progress_snapshot_2026(uuid),public.commit_progress_2026(uuid,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.record_progress_evidence_2026(uuid,jsonb),public.progress_snapshot_2026(uuid),public.commit_progress_2026(uuid,bigint,jsonb,uuid) to service_role;
revoke all on function public.get_progression_2026() from public,anon;
grant execute on function public.get_progression_2026() to authenticated;
