-- 0035_rate_limits.sql
-- GRYD — Sécurité (audit offensif, DoS) : limiteur de débit générique côté serveur.
--
-- ingest_run n'avait AUCUN throttle par utilisateur (seul gate = getUser) alors que chaque
-- appel déclenche ~30-66 requêtes DB + jusqu'à 2 fetch météo. Une boucle depuis un compte
-- gratuit saturait le pool Postgres et le quota d'invocations. Ce limiteur (fenêtre fixe)
-- plafonne par clé (`ingest:<user_id>`), appelé au tout début du handler avant le pipeline.
--
-- Table SANS aucune policy (RLS activé = deny par défaut) → invisible/inaccessible au client ;
-- seul le service_role (Edge Functions) via la RPC SECURITY DEFINER l'alimente.
-- NB : les fenêtres passées s'accumulent ; purge à planifier (pg_cron, fondateur) —
-- `delete from public.rate_limits where window_start < now() - interval '1 day'`.

create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Incrémente atomiquement le compteur de la fenêtre courante et dit si la requête passe.
-- Fenêtre fixe : [floor(epoch/window)*window ; +window[. Renvoie true = autorisé.
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_s integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ws    timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_s) * p_window_s);
  v_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_ws, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
