-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0184 : LE CODE DE PARRAINAGE EXISTE, ET C'EST LE SERVEUR QUI L'ÉCRIT.
--
-- Dérogation fondateur du 11/09/2026 (« il faut faire comme Tesla, il faut
-- qu'un mec qui parraine ait quelque chose à gagner que les autres n'ont
-- pas ») — consignée dans `docs/product/ADR-017-BROUILLON-PARRAINAGE.md`, et
-- bornée par `packages/shared/src/game-rules.ts` §3.7.
--
-- ─── POURQUOI `users.referral_code` (0002) N'EST PAS RÉUTILISÉ ──────────────
-- La colonne existe depuis le premier schéma :
--   `referral_code text not null unique default encode(gen_random_bytes(4),'hex')`
-- Elle a trois défauts qui la rendent inutilisable pour ce chantier, et aucun
-- n'est corrigeable sans réécrire 0002 (interdit) :
--   1. HUIT caractères hexadécimaux, alphabet `0-9a-f` : `0`/`o`, `1`/`l`,
--      `b`/`6` se confondent à voix haute et à la recopie. Le cahier veut un
--      code qu'on DICTE.
--   2. Elle est portée par une table que le client LIT (`users`) : le code d'un
--      tiers y est à portée de la moindre policy trop large, et énumérer
--      `users` reviendrait à énumérer les codes.
--   3. Aucune ligne d'usage n'existait : `public.referrals` (0002) n'a JAMAIS
--      été écrite (`grep -rn "from('referrals')" supabase/` ne rend rien) et sa
--      policy d'insertion exige que le CLIENT connaisse l'`user_id` du filleul,
--      valeur que l'app n'expose jamais. Le chemin était mort dès l'écriture.
-- La colonne n'est ni supprimée ni touchée : elle reste ce qu'elle a toujours
-- été, un champ inutilisé. `public.referrals` non plus. Rien n'est réécrit.
--
-- ─── CE QUE CETTE MIGRATION POSE, ET RIEN DE PLUS ──────────────────────────
-- Une table `referral_codes_2026` (un code, un compte, jamais régénérable) et
-- la fonction qui le fabrique. Le LIEN entre deux comptes est en 0185, les
-- RÉCOMPENSES en 0186 : trois migrations, trois faits, aucune ne dépend d'une
-- future pour être cohérente.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.referral_codes_2026 (
  user_id    uuid primary key references public.users(id) on delete cascade,
  -- game-rules §3.7 : REFERRAL_CODE_ALPHABET (32 lettres, ni I/1 ni O/0) et
  -- REFERRAL_CODE_LENGTH = 6. La contrainte est la copie GELÉE de ces deux
  -- constantes ; le test PGlite les relit dans la source et refuse la dérive.
  code       text not null unique check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  created_at timestamptz not null default now()
);

alter table public.referral_codes_2026 enable row level security;
-- AUCUNE POLICY, ET C'EST VOULU. Un code est un SECRET partagé : le lire par
-- `select` reviendrait à pouvoir énumérer les codes des autres comptes (32^6
-- est grand, une table ne l'est pas). Le seul chemin de lecture est la RPC
-- `my_referral_2026()` (0186), `security definer`, qui ne rend JAMAIS que le
-- code de `auth.uid()`.
revoke all on public.referral_codes_2026 from public, anon, authenticated;
grant all on public.referral_codes_2026 to service_role;

/**
 * LE CODE D'UN COMPTE, CRÉÉ À LA PREMIÈRE DEMANDE ET PLUS JAMAIS CHANGÉ.
 *
 * Idempotente : deux appels rendent le même code. C'est ce qui permet de
 * l'appeler depuis une lecture d'écran sans redouter un doublon, et c'est aussi
 * la règle produit — « un code qui tourne est un code qu'on revend »
 * (docs/product/GRYD_REGLAGES_PROFIL_AUDIT_2026_09.md §5.2).
 *
 * Tirage : `gen_random_bytes` puis modulo sur l'alphabet sans ambiguïté. Le
 * biais du modulo est négligeable ici (256 = 8 × 32 EXACTEMENT : l'alphabet a
 * 32 lettres, donc le tirage est même parfaitement uniforme) et le code n'a
 * aucune valeur cryptographique — il n'ouvre rien, il DÉSIGNE quelqu'un.
 * Cinq essais en cas de collision, puis une exception : mieux vaut un refus
 * bruyant qu'un code partagé par deux comptes.
 *
 * Un compte en cours de suppression n'en reçoit pas : on ne fabrique pas une
 * identité pour un compte qui s'en va.
 */
create function public.ensure_referral_code_2026(p_user_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- game-rules: REFERRAL_CODE_ALPHABET
  v_length   constant int  := 6;                                   -- game-rules: REFERRAL_CODE_LENGTH
  v_existing text;
  v_bytes    bytea;
  v_code     text;
  v_i        int;
  v_try      int;
begin
  if p_user_id is null then raise exception 'referral_user_required'; end if;
  select code into v_existing from public.referral_codes_2026 where user_id = p_user_id;
  if v_existing is not null then return v_existing; end if;
  if not exists(select 1 from public.users where id = p_user_id and deletion_requested_at is null) then
    return null;
  end if;
  for v_try in 1..5 loop
    v_code := '';
    v_bytes := extensions.gen_random_bytes(v_length);
    for v_i in 0..(v_length - 1) loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1, 1);
    end loop;
    begin
      insert into public.referral_codes_2026(user_id, code) values(p_user_id, v_code);
      return v_code;
    exception when unique_violation then
      -- Deux causes possibles : collision de code, ou course entre deux
      -- premières lectures du MÊME compte. La seconde a déjà gagné : on rend
      -- son code plutôt que d'en fabriquer un deuxième.
      select code into v_existing from public.referral_codes_2026 where user_id = p_user_id;
      if v_existing is not null then return v_existing; end if;
    end;
  end loop;
  raise exception 'referral_code_exhausted';
end $$;

/**
 * Normalise ce qu'un humain a tapé : ponctuation retirée, majuscules.
 *
 * ELLE NE DEVINE RIEN. Un `O` ou un `1` saisi par quelqu'un qui recopie mal
 * reste un `O` ou un `1` : ils ne sont pas dans l'alphabet, la vérification de
 * format de `redeem_referral_code_2026` (0186) refusera, et le refus sera
 * NOMMÉ. Substituer `O`→`0` serait inventer une intention — et un jour, faire
 * entrer quelqu'un dans le mauvais parrainage.
 */
create function public.normalize_referral_code_2026(p_raw text)
returns text language sql immutable set search_path=public,pg_temp as $$
  select nullif(upper(regexp_replace(coalesce(p_raw, ''), '[^A-Za-z0-9]', '', 'g')), '');
$$;

revoke all on function public.ensure_referral_code_2026(uuid) from public, anon, authenticated;
revoke all on function public.normalize_referral_code_2026(text) from public, anon, authenticated;
grant execute on function public.ensure_referral_code_2026(uuid) to service_role;
grant execute on function public.normalize_referral_code_2026(text) to service_role;

comment on table public.referral_codes_2026 is
  'Code de parrainage 2026 : un par compte, jamais régénérable, alphabet sans '
  'ambiguïté (game-rules §3.7). Aucune policy : le seul chemin de lecture est '
  'my_referral_2026() (0186), qui ne rend que le code de auth.uid().';
comment on function public.ensure_referral_code_2026(uuid) is
  'Rend le code du compte, en le créant à la première demande. Idempotente.';
