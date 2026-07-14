-- 0034_waitlist_lockdown.sql
-- GRYD — Sécurité (audit offensif, DoS trivial) : verrouiller l'insertion waitlist.
--
-- BUG : la policy waitlist_insert_anyone (0003:184) `for insert to anon with check(true)`
-- laissait n'importe qui insérer EN MASSE via PostgREST direct (corps TABLEAU → des milliers
-- de lignes en UN POST), la contrainte unique(email_or_user,postal_code) se contournant en
-- variant l'email → disk-fill / sur-facturation stockage + pollution de la SEULE liste
-- d'acquisition + faussage des seuils de déblocage par ville. Aucun rate-limit.
--
-- FIX : plus AUCUN insert client direct sur waitlist. L'inscription passe par une RPC
-- SECURITY DEFINER `waitlist_join(email, postal_code)` qui VALIDE côté serveur (format email +
-- CP FR à 5 chiffres, ne jamais faire confiance au client) et insère EXACTEMENT UNE ligne
-- (idempotente on conflict do nothing). Une RPC à args scalaires ne peut pas insérer un
-- tableau → le vecteur d'amplification en masse est fermé. Le site (apps/web/app/actions.ts)
-- appelle désormais cette RPC.
-- Reste (hors repo) : rate-limit par IP au niveau gateway/edge (fondateur) contre le flood
-- « une RPC par email distinct ».

-- Fermer l'insert direct + retirer la policy permissive.
revoke insert on public.waitlist from anon, authenticated;
drop policy if exists waitlist_insert_anyone on public.waitlist;

create or replace function public.waitlist_join(p_email text, p_postal_code text)
returns text -- 'ok' (inséré ou déjà présent) | 'invalid' (format refusé)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cp    text := trim(coalesce(p_postal_code, ''));
begin
  -- Validation SERVEUR (défense en profondeur — le client valide déjà, mais un appelant
  -- direct de la RPC ne passe pas par le client). Classes POSIX (flavor-safe).
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    return 'invalid';
  end if;
  if v_cp !~ '^[0-9]{5}$' then
    return 'invalid';
  end if;

  insert into public.waitlist (email_or_user, postal_code)
  values (v_email, v_cp)
  on conflict (email_or_user, postal_code) do nothing;
  return 'ok';
end;
$$;

-- Exécutable sans authentification (le site est public), mais SEULE porte d'écriture.
revoke all on function public.waitlist_join(text, text) from public;
grant execute on function public.waitlist_join(text, text) to anon, authenticated;
