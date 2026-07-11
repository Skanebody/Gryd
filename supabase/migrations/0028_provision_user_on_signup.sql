-- GRYD — 0028 : provisionne public.users à l'inscription (auth.users → public.users).
--
-- TROU O1 (détecté 11/07/2026) : aucun trigger ne créait la ligne public.users
-- à la création d'un compte auth. Conséquences : lecture xp/foulées/éclats/
-- inventaire vide côté app, ingest_run/claim_hexes (`update users … where id=…`)
-- sans effet, et déjà 1 compte auth ORPHELIN (sans public.users). Ce trou bloque
-- tout le câblage « données réelles » (O1).
--
-- FIX : fonction SECURITY DEFINER + trigger AFTER INSERT sur auth.users. Comme
-- `pseudo` est NOT NULL + UNIQUE, le défaut est dérivé de l'id (unique, format
-- ^[a-z0-9_]{3,20}$, renommable ensuite via l'onboarding / profil-edit). Les
-- autres colonnes NOT NULL ont un défaut (foulees/eclats/xp=0, level=1,
-- is_club=false, referral_code=gen_random_bytes, created_at=now()).
--
-- Additif et réversible :
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, pseudo)
  values (
    new.id,
    'runner_' || substr(replace(new.id::text, '-', ''), 1, 12)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill : comptes auth déjà créés sans ligne public.users.
insert into public.users (id, pseudo)
select
  au.id,
  'runner_' || substr(replace(au.id::text, '-', ''), 1, 12)
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;
