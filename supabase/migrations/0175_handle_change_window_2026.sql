-- 0175_handle_change_window_2026.sql
-- GRYD — LE @PSEUDO SE CHANGE, AUX CONDITIONS D'INSTAGRAM (LOT H, 10/09/2026).
--
-- DEMANDE FONDATEUR : « Pour les pseudos, inspire-toi d'Instagram : tu as un @
-- et tu peux le changer X fois tous les X temps, reprends les mêmes conditions
-- qu'Instagram. »
--
-- ═══ LES QUATRE RÈGLES D'INSTAGRAM, ET CE QUE GRYD EN FAIT ══════════════════
--  1. Un nom d'utilisateur UNIQUE, précédé de « @ ».
--     → DÉJÀ ACQUIS avant ce lot : `user_profiles.handle` est `unique` depuis
--       0011, et le `check` n'admet que des minuscules, donc l'unicité est
--       déjà INSENSIBLE À LA CASSE (« KORO » ne peut pas exister à côté de
--       « koro » : il ne peut pas exister du tout).
--  2. Deux changements au plus par période de quatorze jours.
--     → NOUVEAU. `handle_changes_2026` + le compteur de `change_my_handle_2026`.
--       game-rules: HANDLE_CHANGES_PER_WINDOW / HANDLE_CHANGE_WINDOW_DAYS.
--  3. L'ancien pseudo reste réservé quatorze jours à son ancien titulaire.
--     → NOUVEAU. `handle_holds_2026`. game-rules: HANDLE_HOLD_DAYS.
--  4. Longueur max 30, minuscules, chiffres, points et tirets bas.
--     → GRYD RESTE PLUS STRICT, et c'était déjà le cas : `^[a-z0-9_]{3,20}$`
--       (0011, miroir `HANDLE_REGEX`). Pas de point : la migration 0047
--       argumente ce refus (sosies invisibles à petite taille, fin de token
--       ambiguë en fin de phrase et en deep link, élargissement irréversible).
--       Quand deux règles se croisent, la plus stricte gagne. Cette migration
--       ne touche donc NI la regex, NI la colonne : elle ajoute la CADENCE.
--
-- ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT (mesuré, pas supposé) ═════════════════════
-- Avant ce fichier, `save_my_social_profile_2026` (0124:111) écrivait le handle
-- à CHAQUE enregistrement du profil, sans mémoire :
--   · aucun compteur — un joueur pouvait se renommer dix fois dans l'heure ;
--   · aucune réservation — à la seconde où il quittait « koro », n'importe qui
--     pouvait prendre « koro », hériter de ses mentions, de ses liens partagés
--     et des recherches faites par ses amis. C'est l'usurpation la moins chère
--     qui existe : elle ne demande que d'attendre que quelqu'un se renomme.
-- `supabase/tests/handle_change_window_2026.pglite.test.mjs` CONSTATE ces deux
-- trous sur la lignée 0011+0047+0124 seule, AVANT de charger ce fichier.
--
-- ═══ POURQUOI `save_my_social_profile_2026` EST REMPLACÉE ICI ═══════════════
-- Poser la règle dans une RPC neuve et laisser 0124 écrire le handle à côté
-- l'aurait rendue DÉCORATIVE : l'app appelle `save_my_social_profile_2026` à
-- chaque « Enregistrer », et ce chemin-là aurait continué de renommer sans
-- compter ni réserver. « Tout claim est décidé serveur » veut dire : il n'y a
-- qu'UNE porte. Les deux RPC passent donc par la MÊME fonction interne
-- (`gryd_handle_change_2026`), et 0124 n'est pas réécrite — elle est remplacée
-- par un `create or replace` dont le corps est celui de 0124 à une branche près.
--
-- ═══ CE QUE CE FICHIER NE FAIT PAS ══════════════════════════════════════════
-- Il n'attribue AUCUN badge, ne crée AUCUN circuit de vérification et ne purge
-- aucune réservation par tâche de fond : une réservation expirée n'est pas
-- supprimée, elle cesse simplement de compter (`released_at > now()`). Une
-- table de quelques lignes par renommage ne justifie pas un travail périodique
-- qu'il faudrait ensuite surveiller.

-- ═══ 0. handle_chosen_2026 — LE PSEUDO ATTRIBUÉ N'EST PAS UN PSEUDO CHOISI ══
-- LE PIÈGE QUE CETTE COLONNE DÉSAMORCE, ET QUI N'ÉTAIT VISIBLE NULLE PART.
-- Depuis 0154, l'inscription PROVISIONNE déjà une ligne `user_profiles` avec un
-- handle dérivé de l'identifiant du compte (« runner_5f3a91c0d4e2 »). Sans cette
-- colonne, le tout premier « Enregistrer » d'un nouveau joueur serait donc un
-- RENOMMAGE au sens de la fenêtre : il consommerait un de ses deux crédits, et
-- il partirait réserver « runner_5f3a91c0d4e2 » pendant quatorze jours. Un
-- joueur qui corrige une faute de frappe dans la minute serait bloqué, et une
-- table de réservations se remplirait de pseudos que personne n'a jamais lus.
--
-- Instagram ne compte pas non plus le choix initial : ce sont les CHANGEMENTS
-- qui sont limités. `handle_chosen_2026` marque le moment où le joueur nomme
-- son pseudo lui-même. Avant, il porte une étiquette ; après, il porte une
-- adresse — et seule une adresse mérite d'être comptée et réservée.
--
-- `default false` s'applique aux lignes existantes : les comptes déjà en base
-- ont donc un premier nommage gratuit. C'est le bon défaut. Aucun d'eux n'a
-- jamais été soumis à une cadence, et leur en facturer une rétroactivement
-- serait une punition pour une règle qui n'existait pas.
alter table public.user_profiles
  add column if not exists handle_chosen_2026 boolean not null default false;

-- Décidé serveur, comme `verified` (0047) : les grants de 0011 sont colonne par
-- colonne, donc une colonne ajoutée n'hérite de rien — le revoke explicite
-- verrouille le cas d'un futur `grant update on user_profiles to authenticated`.
revoke update (handle_chosen_2026) on public.user_profiles from public, anon, authenticated;
revoke insert (handle_chosen_2026) on public.user_profiles from public, anon, authenticated;

comment on column public.user_profiles.handle_chosen_2026 is
  'true dès que le joueur a NOMMÉ son pseudo lui-même. false = il porte encore '
  'le handle dérivé posé par 0154 à l''inscription : le premier nommage n''est '
  'alors pas un changement (aucun crédit consommé, aucune réservation posée).';

-- ═══ 1. handle_changes_2026 — L'HISTORIQUE QUI SERT DE COMPTEUR ═════════════
-- Une ligne par renommage RÉUSSI. C'est cette table, et rien d'autre, qui dit
-- combien de changements ont eu lieu dans la fenêtre : un compteur dénormalisé
-- sur `user_profiles` se serait désynchronisé au premier chemin d'écriture
-- oublié, et n'aurait pas su dire QUAND le crédit revient.
create table if not exists public.handle_changes_2026 (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  old_handle text not null,
  new_handle text not null,
  changed_at timestamptz not null default now()
);

create index if not exists handle_changes_2026_user_time
  on public.handle_changes_2026 (user_id, changed_at desc);

comment on table public.handle_changes_2026 is
  'Historique des renommages de @pseudo. Sert de COMPTEUR à la fenêtre '
  'glissante (game-rules: HANDLE_CHANGES_PER_WINDOW / HANDLE_CHANGE_WINDOW_DAYS). '
  'Aucun client ne la lit : le joueur voit ce qui le concerne par '
  'my_handle_status_2026().';

alter table public.handle_changes_2026 enable row level security;

-- Aucune policy, et le grant de table est révoqué : cette table n'est atteinte
-- que par les fonctions SECURITY DEFINER ci-dessous (patron de 0042/0047). La
-- laisser lisible donnerait à qui veut la carte des pseudos récemment libérés,
-- c'est-à-dire exactement la liste des cibles d'usurpation.
revoke all on public.handle_changes_2026 from public, anon, authenticated;

-- ═══ 2. handle_holds_2026 — LA RÉSERVATION DE QUATORZE JOURS ════════════════
-- `handle` est la CLÉ : un pseudo donné n'est réservé que pour une personne à
-- la fois, et la dernière libération l'emporte (le `on conflict do update`
-- plus bas). `released_at` porte la date de fin, calculée à l'écriture — la
-- lire au lieu de la recalculer permet d'allonger la règle plus tard sans
-- rallonger rétroactivement les réservations déjà posées.
create table if not exists public.handle_holds_2026 (
  handle      text primary key
    check (handle ~ '^[a-z0-9_]{3,20}$'),          -- game-rules: HANDLE_REGEX
  held_for    uuid not null references public.users (id) on delete cascade,
  released_at timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists handle_holds_2026_owner
  on public.handle_holds_2026 (held_for, released_at desc);

comment on table public.handle_holds_2026 is
  'Pseudos LIBÉRÉS, réservés à leur ancien titulaire jusqu''à released_at '
  '(game-rules: HANDLE_HOLD_DAYS). Une réservation expirée n''est pas '
  'supprimée : elle cesse de compter (released_at > now()). Elle rend le '
  'pseudo INDISPONIBLE AUX AUTRES, jamais invisible.';

alter table public.handle_holds_2026 enable row level security;
revoke all on public.handle_holds_2026 from public, anon, authenticated;

-- ═══ 3. gryd_handle_change_2026 — LA RÈGLE, ÉCRITE UNE SEULE FOIS ═══════════
-- Contrat jsonb, identique quel que soit l'appelant :
--   {"ok":true,  "reason":"changed"|"unchanged"|"named", "handle":…,
--    "changes_left":n, "next_change_allowed_at":…|null, "held_until":…|null}
--   {"ok":false, "reason":"no_profile"|"too_short"|"too_long"|"bad_chars"
--                        |"reserved"|"taken"|"held"|"rate_limited",
--    "next_change_allowed_at":…|null, "held_until":…|null}
--
-- « unchanged » est un SUCCÈS qui ne consomme rien : le mobile renvoie le
-- profil entier à chaque « Enregistrer », et faire payer un crédit à quelqu'un
-- qui corrige sa bio viderait ses deux changements sans qu'il se renomme jamais.
--
-- ORDRE DES REFUS, et il n'est pas arbitraire : format d'abord (c'est le seul
-- que le joueur répare en tapant), puis les indisponibilités (réservé, pris,
-- retenu), puis le plafond EN DERNIER. Annoncer « plus de changements » à
-- quelqu'un qui a tapé un pseudo de deux lettres lui cacherait sa vraie faute.
create or replace function public.gryd_handle_change_2026(p_uid uuid, p_new text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_new      text := lower(btrim(ltrim(btrim(coalesce(p_new, '')), '@')));
  v_old      text;
  v_norm     text;
  v_used     int;
  v_oldest   timestamptz;
  v_next     timestamptz;
  v_held     timestamptz;
  v_hold_end timestamptz;
  v_chosen   boolean;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'authentication_required');
  end if;

  select handle, handle_chosen_2026 into v_old, v_chosen
  from public.user_profiles where user_id = p_uid;

  -- Aucun profil : ce n'est PAS un renommage, c'est une création. Elle passe
  -- par save_my_social_profile_2026 (qui appelle cette fonction juste après
  -- avoir posé la ligne) — jamais par change_my_handle_2026 tout seul.
  if v_old is null then
    return jsonb_build_object('ok', false, 'reason', 'no_profile');
  end if;

  if v_new = v_old then
    return jsonb_build_object(
      'ok', true, 'reason', 'unchanged', 'handle', v_old,
      'changes_left', public.gryd_handle_changes_left_2026(p_uid),
      'next_change_allowed_at', null, 'held_until', null);
  end if;

  -- ── Format : miroir EXACT du check de 0011, décomposé pour NOMMER la faute ─
  if char_length(v_new) < 3 then                      -- game-rules: HANDLE_MIN_LENGTH
    return jsonb_build_object('ok', false, 'reason', 'too_short');
  end if;
  if char_length(v_new) > 20 then                     -- game-rules: HANDLE_MAX_LENGTH
    return jsonb_build_object('ok', false, 'reason', 'too_long');
  end if;
  if v_new !~ '^[a-z0-9_]+$' then                     -- game-rules: HANDLE_ALLOWED_CHAR_REGEX
    return jsonb_build_object('ok', false, 'reason', 'bad_chars');
  end if;

  -- ── Marques et termes officiels (0047), comparés sur la forme normalisée ──
  v_norm := replace(v_new, '_', '');
  if exists (select 1 from public.reserved_handles r where r.handle = v_norm) then
    return jsonb_build_object('ok', false, 'reason', 'reserved');
  end if;

  -- ── Déjà porté par quelqu'un d'autre ? (comparaison déjà insensible à la
  --    casse : la colonne n'admet que des minuscules.) ──────────────────────
  if exists (
    select 1 from public.user_profiles up
    where up.handle = v_new and up.user_id <> p_uid
  ) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  -- ── Réservé par QUELQU'UN D'AUTRE (règle 3) ───────────────────────────────
  -- La MIENNE ne me bloque pas : reprendre son ancien pseudo est précisément
  -- ce que la réservation protège. Elle consomme un changement comme les
  -- autres — sinon un aller-retour tiendrait un @ indéfiniment.
  select h.released_at into v_held
  from public.handle_holds_2026 h
  where h.handle = v_new and h.held_for <> p_uid and h.released_at > now();
  if v_held is not null then
    return jsonb_build_object('ok', false, 'reason', 'held', 'held_until', v_held);
  end if;

  -- ── PREMIER NOMMAGE : ce n'est pas un changement ──────────────────────────
  -- Le joueur quitte l'étiquette posée par 0154 pour l'adresse qu'il a choisie.
  -- Rien à compter (il n'a rien changé, il a nommé), rien à réserver (personne
  -- n'a jamais cherché « runner_5f3a91c0d4e2 » dans /amis). Les contrôles de
  -- format, de marque, d'unicité et de réservation, eux, viennent d'être faits :
  -- un premier nommage ne donne aucun passe-droit sur le pseudo d'un autre.
  if v_chosen is not true then
    update public.user_profiles
      set handle = v_new, handle_chosen_2026 = true, updated_at = now()
      where user_id = p_uid;
    return jsonb_build_object(
      'ok', true, 'reason', 'named', 'handle', v_new,
      'changes_left', public.gryd_handle_changes_left_2026(p_uid),
      'next_change_allowed_at', null, 'held_until', null);
  end if;

  -- ── Plafond : fenêtre GLISSANTE, pas calendaire ───────────────────────────
  -- On regarde les HANDLE_CHANGES_PER_WINDOW changements les plus récents DANS
  -- la fenêtre ; le crédit revient quand le plus ancien des deux en sort.
  select count(*), min(w.changed_at) into v_used, v_oldest
  from (
    select c.changed_at
    from public.handle_changes_2026 c
    where c.user_id = p_uid
      and c.changed_at > now() - interval '14 days'   -- game-rules: HANDLE_CHANGE_WINDOW_DAYS
    order by c.changed_at desc
    limit 2                                           -- game-rules: HANDLE_CHANGES_PER_WINDOW
  ) w;

  if v_used >= 2 then                                 -- game-rules: HANDLE_CHANGES_PER_WINDOW
    v_next := v_oldest + interval '14 days';          -- game-rules: HANDLE_CHANGE_WINDOW_DAYS
    return jsonb_build_object(
      'ok', false, 'reason', 'rate_limited', 'next_change_allowed_at', v_next);
  end if;

  -- ── L'écriture. L'unicité de 0011 reste le juge en cas d'égalité de course :
  --    deux joueurs qui valident le même @ à la même seconde ne peuvent pas
  --    l'obtenir tous les deux, et le perdant lit « taken », pas une 23505. ──
  v_hold_end := now() + interval '14 days';           -- game-rules: HANDLE_HOLD_DAYS
  begin
    update public.user_profiles set handle = v_new, updated_at = now()
    where user_id = p_uid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end;

  insert into public.handle_changes_2026 (user_id, old_handle, new_handle)
  values (p_uid, v_old, v_new);

  -- L'ancien pseudo part en réservation ; celle que je tenais sur le NOUVEAU
  -- (cas de la reprise) disparaît, elle n'a plus d'objet.
  insert into public.handle_holds_2026 (handle, held_for, released_at)
  values (v_old, p_uid, v_hold_end)
  on conflict (handle) do update
    set held_for = excluded.held_for,
        released_at = excluded.released_at,
        created_at = now();
  delete from public.handle_holds_2026 where handle = v_new and held_for = p_uid;

  return jsonb_build_object(
    'ok', true, 'reason', 'changed', 'handle', v_new,
    'changes_left', public.gryd_handle_changes_left_2026(p_uid),
    'next_change_allowed_at', null,
    'held_until', v_hold_end);
end;
$$;

revoke all on function public.gryd_handle_change_2026(uuid, text) from public, anon, authenticated;

comment on function public.gryd_handle_change_2026(uuid, text) is
  'LA règle de renommage du @pseudo, écrite une seule fois. Interne : appelée '
  'par change_my_handle_2026 ET par save_my_social_profile_2026, jamais par un '
  'client (aucun grant). Ne lève pas : elle REND un motif.';

-- ═══ 4. gryd_handle_changes_left_2026 — CE QU'IL RESTE, SANS DUPLIQUER ══════
create or replace function public.gryd_handle_changes_left_2026(p_uid uuid)
returns int
language sql
stable
set search_path = public, pg_temp
as $$
  select greatest(0, 2 - (                            -- game-rules: HANDLE_CHANGES_PER_WINDOW
    select count(*)::int from public.handle_changes_2026 c
    where c.user_id = p_uid
      and c.changed_at > now() - interval '14 days'    -- game-rules: HANDLE_CHANGE_WINDOW_DAYS
  ));
$$;

revoke all on function public.gryd_handle_changes_left_2026(uuid) from public, anon, authenticated;

-- ═══ 5. change_my_handle_2026 — LA PORTE DU JOUEUR ══════════════════════════
create or replace function public.change_my_handle_2026(new_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.gryd_handle_change_2026(auth.uid(), new_handle);
end;
$$;

revoke all on function public.change_my_handle_2026(text) from public, anon;
grant execute on function public.change_my_handle_2026(text) to authenticated;

comment on function public.change_my_handle_2026(text) is
  'Renomme MON @pseudo aux conditions d''Instagram : 2 changements par 14 '
  'jours glissants, ancien pseudo réservé 14 jours. Retour jsonb '
  '{ok, reason, handle, changes_left, next_change_allowed_at, held_until}.';

-- ═══ 6. my_handle_status_2026 — CE QUE L'ÉCRAN A LE DROIT DE DIRE ═══════════
-- L'app n'infère RIEN : les trois constantes voyagent dans la réponse
-- (`changes_per_window`, `window_days`, `hold_days`). Un mobile plus vieux que
-- le serveur affiche alors la règle du SERVEUR, pas celle de son binaire.
-- `reclaimable` porte l'ancien pseudo encore réservé pour moi, s'il existe :
-- c'est ce qui permet à l'écran de peindre « Reprendre @ancien » SANS jamais
-- deviner (pas de bouton mort — s'il n'y a rien à reprendre, il n'y a pas de
-- bouton). Quand plusieurs réservations sont en cours (deux renommages), c'est
-- la plus RÉCEMMENT posée qui est proposée : c'est le pseudo que les contacts
-- du joueur connaissent encore.
create or replace function public.my_handle_status_2026()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_handle text;
  v_used   int;
  v_oldest timestamptz;
  v_left   int;
  v_next   timestamptz;
  v_claim  jsonb;
  v_chosen boolean;
begin
  if v_uid is null then
    return null;
  end if;

  select handle, handle_chosen_2026 into v_handle, v_chosen
  from public.user_profiles where user_id = v_uid;

  select count(*), min(w.changed_at) into v_used, v_oldest
  from (
    select c.changed_at from public.handle_changes_2026 c
    where c.user_id = v_uid
      and c.changed_at > now() - interval '14 days'   -- game-rules: HANDLE_CHANGE_WINDOW_DAYS
    order by c.changed_at desc
    limit 2                                           -- game-rules: HANDLE_CHANGES_PER_WINDOW
  ) w;

  v_left := greatest(0, 2 - v_used);                  -- game-rules: HANDLE_CHANGES_PER_WINDOW
  -- Une date de « prochain changement » n'a de sens que s'il est BLOQUÉ. En
  -- afficher une alors qu'il reste des crédits ferait attendre pour rien.
  v_next := case when v_left > 0 then null else v_oldest + interval '14 days' end;

  select jsonb_build_object('handle', h.handle, 'held_until', h.released_at)
    into v_claim
  from public.handle_holds_2026 h
  where h.held_for = v_uid
    and h.released_at > now()
    and h.handle is distinct from v_handle
  order by h.released_at desc
  limit 1;

  return jsonb_build_object(
    'handle', coalesce(v_handle, ''),
    'has_profile', v_handle is not null,
    -- false = le joueur porte encore l'étiquette de 0154 : son prochain
    -- enregistrement NOMME son pseudo, il ne le change pas. L'écran ne doit
    -- donc pas lui décompter un crédit qu'il ne paiera pas.
    'handle_chosen', coalesce(v_chosen, false),
    'changes_per_window', 2,                          -- game-rules: HANDLE_CHANGES_PER_WINDOW
    'window_days', 14,                                -- game-rules: HANDLE_CHANGE_WINDOW_DAYS
    'hold_days', 14,                                  -- game-rules: HANDLE_HOLD_DAYS
    'changes_used', v_used,
    'changes_left', v_left,
    'next_change_allowed_at', v_next,
    'reclaimable', v_claim);
end;
$$;

revoke all on function public.my_handle_status_2026() from public, anon;
grant execute on function public.my_handle_status_2026() to authenticated;

comment on function public.my_handle_status_2026() is
  'MON état de pseudo : changements restants, date du prochain possible, et '
  'ancien pseudo encore réservé pour moi (reclaimable). null si pas de session.';

-- ═══ 7. check_handle_available_2026 — 0047 QUI SAIT LIRE LES RÉSERVATIONS ═══
-- La RPC 0047 reste en place et n'est pas touchée (d'autres appelants peuvent
-- l'utiliser) ; celle-ci la SUCCÈDE pour l'écran d'édition, avec deux
-- différences : elle connaît `held`, et elle rend `held_until` pour que le
-- refus porte une date au lieu d'un « c'est réservé » sans horizon.
create or replace function public.check_handle_available_2026(p_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_handle text := lower(btrim(ltrim(btrim(coalesce(p_handle, '')), '@')));
  v_norm   text;
  v_held   timestamptz;
begin
  if v_uid is not null and exists (
    select 1 from public.user_profiles up
    where up.user_id = v_uid and up.handle = v_handle
  ) then
    return jsonb_build_object('ok', true);
  end if;

  if char_length(v_handle) < 3 then                   -- game-rules: HANDLE_MIN_LENGTH
    return jsonb_build_object('ok', false, 'reason', 'too_short');
  end if;
  if char_length(v_handle) > 20 then                  -- game-rules: HANDLE_MAX_LENGTH
    return jsonb_build_object('ok', false, 'reason', 'too_long');
  end if;
  if v_handle !~ '^[a-z0-9_]+$' then                  -- game-rules: HANDLE_ALLOWED_CHAR_REGEX
    return jsonb_build_object('ok', false, 'reason', 'bad_chars');
  end if;

  v_norm := replace(v_handle, '_', '');
  if exists (select 1 from public.reserved_handles r where r.handle = v_norm) then
    return jsonb_build_object('ok', false, 'reason', 'reserved');
  end if;

  if exists (
    select 1 from public.user_profiles up
    where up.handle = v_handle and (v_uid is null or up.user_id <> v_uid)
  ) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  -- Ma PROPRE réservation ne me refuse rien : c'est mon pseudo, en attente.
  select h.released_at into v_held
  from public.handle_holds_2026 h
  where h.handle = v_handle
    and h.released_at > now()
    and (v_uid is null or h.held_for <> v_uid);
  if v_held is not null then
    return jsonb_build_object('ok', false, 'reason', 'held', 'held_until', v_held);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.check_handle_available_2026(text) from public, anon;
grant execute on function public.check_handle_available_2026(text) to authenticated;

comment on function public.check_handle_available_2026(text) is
  'Disponibilité d''un @pseudo AVANT soumission, réservations de 14 jours '
  'comprises. {"ok":true} ou {"ok":false,"reason":"too_short|too_long|'
  'bad_chars|reserved|taken|held","held_until":…}. N''AUTORISE RIEN : le juge '
  'reste change_my_handle_2026 à l''écriture.';

-- ═══ 8. save_my_social_profile_2026 — LA MÊME PORTE, PAS UNE SECONDE ════════
-- Corps IDENTIQUE à 0124:111, à une chose près : la ligne qui écrivait le
-- handle en même temps que le reste. Elle est remplacée par un appel à
-- `gryd_handle_change_2026`, qui compte, réserve et refuse. Le refus remonte en
-- EXCEPTION NOMMÉE (le contrat de cette RPC-là est l'exception, pas un jsonb —
-- `socialError2026` côté mobile lit ces noms) :
--   handle_taken · handle_held · handle_reserved · handle_rate_limited ·
--   invalid_handle (les trois fautes de format).
-- La CRÉATION d'un profil (première ligne) n'est pas un renommage : elle
-- n'entre pas dans la fenêtre et ne pose aucune réservation.
create or replace function public.save_my_social_profile_2026(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_handle text := lower(btrim(p_profile->>'handle'));
  v_name   text := btrim(p_profile->>'displayName');
  v_vis    text := coalesce(p_profile->>'visibility','crew');
  v_path   text := nullif(p_profile->>'avatarPath','');
  v_data   jsonb;
  v_exists boolean;
  v_rename jsonb;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if v_handle is null or v_handle !~ '^[a-z0-9_]{3,20}$' or v_handle in ('admin','gryd','support','moderator') then raise exception 'invalid_handle'; end if;
  if coalesce(length(v_name),0) not between 1 and 40 or length(coalesce(p_profile->>'bio',''))>280 or v_vis not in ('private','friends','crew','public') then raise exception 'invalid_profile'; end if;
  perform social_validate_media_2026(v_path,'avatar');
  -- Resolve existing pseudo-based blocks before changing that pseudo.
  insert into social_blocks_2026(owner_id,target_id,target_label)
  select b.blocker_id,v_uid,p.handle from user_blocks b join user_profiles p on p.user_id=v_uid and lower(ltrim(b.blocked_pseudo,'@'))=lower(p.handle) where b.blocker_id<>v_uid on conflict do nothing;
  v_data:=jsonb_build_object('title',left(coalesce(p_profile->>'title',''),80),'city',left(coalesce(p_profile->>'city',''),100),'cityId',left(coalesce(p_profile->>'cityId',''),100),'avatarInitials',left(coalesce(p_profile->>'avatarInitials',''),2));

  select true into v_exists from user_profiles where user_id=v_uid;

  if v_exists then
    -- Le handle ne s'écrit PLUS ici : il passe par la règle, ou il ne change pas.
    v_rename := public.gryd_handle_change_2026(v_uid, v_handle);
    if (v_rename->>'ok')::boolean is not true then
      case v_rename->>'reason'
        when 'taken'        then raise exception 'handle_taken';
        when 'held'         then raise exception 'handle_held';
        when 'reserved'     then raise exception 'handle_reserved';
        when 'rate_limited' then raise exception 'handle_rate_limited';
        else raise exception 'invalid_handle';
      end case;
    end if;
    update user_profiles set display_name=v_name,bio=nullif(p_profile->>'bio',''),profile_visibility=v_vis,avatar_path_2026=v_path,profile_data_2026=v_data,updated_at=now()
    where user_id=v_uid;
  else
    -- CRÉATION (aucune ligne de profil) : ce n'est pas un renommage, donc ni
    -- crédit ni réservation. Mais la réservation D'AUTRUI s'applique quand
    -- même : sans ce contrôle, il aurait suffi de créer un compte neuf pour
    -- rafler le pseudo qu'un joueur vient de libérer — le trou exact que ce
    -- fichier vient boucher. `handle_chosen_2026` est posé à true : ce
    -- pseudo-là est un choix, pas l'étiquette de 0154.
    if exists (select 1 from public.handle_holds_2026 h
               where h.handle = v_handle and h.held_for <> v_uid and h.released_at > now()) then
      raise exception 'handle_held';
    end if;
    insert into user_profiles(user_id,handle,display_name,bio,profile_visibility,avatar_path_2026,profile_data_2026,handle_chosen_2026)
    values(v_uid,v_handle,v_name,nullif(p_profile->>'bio',''),v_vis,v_path,v_data,true);
  end if;

  return my_social_profile_2026();
exception when unique_violation then raise exception 'handle_taken';
end $$;

-- `create or replace` conserve l'ACL existante (0124 l'a déjà posée), mais on
-- la réaffirme : une fonction de ce niveau ne doit jamais dépendre d'un grant
-- hérité qu'on ne relit pas.
revoke all on function public.save_my_social_profile_2026(jsonb) from public, anon;
grant execute on function public.save_my_social_profile_2026(jsonb) to authenticated, service_role;
