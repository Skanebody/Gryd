-- GRYD — 0023 Attack alerts indexes fix
-- Postgres partial index predicates must be IMMUTABLE; the previous 0022
-- attempted `where expires_at > now()` for a partial index.

drop index if exists public.attack_alerts_hex_active_idx;

create index if not exists public.attack_alerts_hex_exp_idx
  on public.attack_alerts (h3index, expires_at desc);

