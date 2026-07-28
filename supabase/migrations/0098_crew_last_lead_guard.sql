-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0098 — LE DERNIER CHEF NE PART PAS *NON PLUS* PAR LA PORTE DE DERRIÈRE   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ═══ LA FAUTE, DÉMONTRÉE PLUTÔT QU'AFFIRMÉE (28/07/2026) ════════════════════
-- 0093 a posé `must_transfer_lead` : un founder ne peut plus quitter un crew
-- PEUPLÉ, parce qu'un crew sans chef est un état définitivement cassé — plus
-- personne n'y renomme, n'y recrute, n'y règle, n'y archive, et surtout plus
-- personne n'y transfère la propriété (CREW_PERMISSIONS.transferFoundership =
-- ['founder'], game-rules.ts:1328). Aucune RPC ne le répare.
--
-- Son en-tête (0093:38-43) affirmait l'orphelin « fermé des deux bouts ». Il ne
-- l'était pas : `leave_crew` n'est pas la seule fonction qui clôt une adhésion.
-- DEUX AUTRES le font, et aucune ne lisait le rôle avant de le faire —
--   · `join_crew_by_code` (réécrite par 0093 elle-même, l.589-591) ;
--   · `redeem_crew_invite` (0090:529-531).
-- Toutes deux exécutent `update crew_members set left_at = now() where user_id
-- = v_uid and left_at is null` pour honorer l'index `one_active_per_user`. Un
-- founder qui REJOINT ailleurs sort donc de son crew sans jamais passer par
-- `leave_crew`, et le refus posé par 0093 ne s'applique pas.
--
-- SÉQUENCE EXÉCUTÉE EN PGlite SUR LA LIGNÉE 0002 → 0093 (87 migrations), avant
-- cette migration — c'est la preuve, pas une hypothèse :
--   crew « Mien » = founder F + co_captain C + rookie R.
--   1. leave_crew() par F      → {"ok":false,"reason":"must_transfer_lead",
--                                 "membersLeftBehind":2}          ← 0093 tient
--   2. join_crew_by_code('ZZZ999') par LE MÊME F   → {"ok":true}   ← la brèche
--   3. état de « Mien »        → 2 membres actifs, 0 founder actif
--   4. join_crew_by_code('ABC123') par un inconnu  → {"ok":true}
--      (la garde `dead_crew` de 0093 ne mord qu'à ZÉRO membre actif : un crew
--      décapité mais peuplé RECRUTE ENCORE, et il recrute vers l'irréparable)
--   5. crew_transfer_lead par le co_captain restant → {"ok":false,
--                                                     "reason":"forbidden"}
-- Le même scénario passe à l'identique par `redeem_crew_invite`, dont la clôture
-- d'adhésion est la copie de celle de `join_crew_by_code`.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET RIEN DE PLUS ═══════════════════════════
-- Elle REPOSE la borne de 0093 sur les deux portes restantes, avec EXACTEMENT
-- le même refus et la même charge utile (`must_transfer_lead` +
-- `membersLeftBehind`) : un seul motif pour un seul fait, donc une seule
-- traduction et un seul geste réparateur nommé au joueur (transférer la
-- propriété, `crew_transfer_lead`, que l'écran peint déjà).
--
-- Aucune autre ligne des deux fonctions ne bouge : cooldown, plafond,
-- idempotence, `dead_crew`, motif unique `bad_code`, compteur d'usages du lien,
-- verrous. Elles sont recopiées TELLES QUELLES depuis 0093 §7 et 0090 §4.5 —
-- `create or replace` remplace un corps entier, il n'y a pas de patch partiel en
-- SQL, et réécrire de mémoire ce qu'on ne veut pas changer est la façon
-- classique de perdre une garde en la « remettant ».
--
-- ═══ ADDITIVE, ET SANS EFFET SUR LES DONNÉES ════════════════════════════════
-- Zéro DDL : aucune table, colonne, contrainte ni index n'est touché. Deux
-- `create or replace function` et deux `comment on function`. La base de
-- production (3 comptes, 35 397 lignes publiques, 0 crew au 28/07/2026) ne perd
-- rien et n'est même pas lue. Aucun crew orphelin n'existe aujourd'hui : cette
-- migration ferme la porte AVANT que quiconque ne la franchisse — elle ne
-- répare pas un dégât, et ne prétend pas savoir en réparer un.
--
-- ═══ ANTI PAY-TO-WIN, PAR ABSENCE ═══════════════════════════════════════════
-- Ni `hex_claims`, ni `territories`, ni `crews.xp`, ni `users.foulees` ne sont
-- nommés ici. Une borne d'adhésion ne déplace pas un mètre carré.
--
-- ═══ CE QUE ÇA NE PROUVE PAS ════════════════════════════════════════════════
-- Il reste UN chemin qui décapite un crew et qu'aucune RPC ne garde :
-- `purge_due_accounts` (0046:267) supprime la ligne `users`, et la cascade
-- emporte l'adhésion du founder. C'est la suppression de compte RGPD — elle ne
-- peut pas être refusée, et un refus serait illégal. Elle appelle une
-- SUCCESSION automatique (promotion du plus ancien officier), pas une garde ;
-- c'est un chantier à part, et il reste OUVERT. Le dire ici plutôt que laisser
-- l'en-tête suivant re-affirmer que l'orphelin est « fermé ».
-- ════════════════════════════════════════════════════════════════════════════

-- ─── §1. Le compte de ceux qu'on laisserait derrière ────────────────────────
-- Extrait pour être écrit UNE fois : trois fonctions posent désormais la même
-- question, et trois copies de la même requête finiraient par diverger.
--
-- Rend 0 quand l'appelant n'est pas founder, ou n'a pas de crew : dans les deux
-- cas il n'y a rien à bloquer. Rend le nombre d'AUTRES membres actifs sinon.
-- VOLATILE (pas STABLE) : elle prend un verrou de ligne sur le crew, qui
-- sérialise « je pars » et « le dernier autre part » — sans lui, deux départs
-- simultanés se croiraient chacun non-dernier, exactement le trou que 0093
-- ferme déjà dans `leave_crew`.
create or replace function public.crew_members_left_behind(p_uid uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_crew_id uuid;
  v_others  integer;
begin
  select cm.crew_id into v_crew_id
  from public.crew_members cm
  where cm.user_id = p_uid and cm.left_at is null and cm.role = 'founder';
  if not found then
    return 0;                       -- pas de crew, ou pas chef : rien à garder.
  end if;

  perform 1 from public.crews c where c.id = v_crew_id for update;

  select count(*) into v_others
  from public.crew_members cm
  where cm.crew_id = v_crew_id and cm.left_at is null and cm.user_id <> p_uid;

  return coalesce(v_others, 0);
end;
$$;

revoke all on function public.crew_members_left_behind(uuid) from public, anon, authenticated;

comment on function public.crew_members_left_behind(uuid) is
  'Nombre d''AUTRES membres actifs du crew dont p_uid est le founder — 0 s''il '
  'n''est pas founder ou n''a pas de crew. Verrouille la ligne `crews` : deux '
  'départs simultanés ne peuvent pas se croire chacun non-dernier. Interne '
  '(0098) : appelée par leave_crew, join_crew_by_code et redeem_crew_invite.';

-- ─── §2. join_crew_by_code — copie EXACTE de 0093 §7, + la garde ────────────
create or replace function public.join_crew_by_code(p_code text) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code char(6);
  v_crew public.crews%rowtype;
  v_last_left timestamptz;
  v_days_left integer;
  v_active_count integer;
  v_left_behind integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z0-9]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;
  select * into v_crew from public.crews c where c.code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;

  -- Idempotent : déjà membre actif de CE crew → succès sans rien changer.
  -- AVANT la garde, et ce n'est pas un détail : rouvrir son propre lien ne doit
  -- pas répondre « transfère d'abord la propriété » à un founder qui ne part
  -- nulle part.
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = v_crew.id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
      'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
  end if;

  -- ══ LA GARDE (0098) ══════════════════════════════════════════════════════
  -- Rejoindre AILLEURS, c'est PARTIR d'ici : le `update ... set left_at` plus
  -- bas clôt l'adhésion en cours. Le dernier chef ne le fait pas plus par cette
  -- porte que par `leave_crew`. Placée avant le cooldown et le plafond parce
  -- qu'elle ne parle pas du crew VISÉ : elle parle de celui qu'on quitte, et ce
  -- refus-là est vrai quel que soit le code saisi.
  v_left_behind := public.crew_members_left_behind(v_uid);
  if v_left_behind > 0 then
    return jsonb_build_object(
      'ok', false, 'reason', 'must_transfer_lead', 'membersLeftBehind', v_left_behind);
  end if;

  -- LE COOLDOWN NE COMPTE QUE LES DÉPARTS CHOISIS (0093). `removed_by is null`
  -- est le seul ajout : CREW_SWITCH_COOLDOWN_DAYS vise celui qui saute de crew
  -- en crew, pas celui qu'on vient de mettre dehors.
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null and cm.removed_by is null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  perform 1 from public.crews c where c.id = v_crew.id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = v_crew.id and cm.left_at is null;

  -- CREW MORT (0093) : plus aucun membre actif, donc plus aucun chef. Y entrer
  -- créerait un crew peuplé que personne ne peut administrer.
  if v_active_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'dead_crew');
  end if;

  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'rookie');   -- game-rules: CREW_ENTRY_ROLE

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
end;
$$;

comment on function public.join_crew_by_code(text) is
  'Rejoindre un crew par code. Motif UNIQUE bad_code (code mal formé = code '
  'inexistant : zéro énumération). Le DERNIER CHEF ne part pas par cette porte '
  'non plus : must_transfer_lead (+ membersLeftBehind), 0098. Cooldown '
  'CREW_SWITCH_COOLDOWN_DAYS sur les seuls départs VOLONTAIRES (removed_by is '
  'null, 0093). Refuse un crew sans aucun membre actif (dead_crew).';

-- ─── §3. redeem_crew_invite — copie EXACTE de 0090 §4.5, + la garde ─────────
create or replace function public.redeem_crew_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_inv          public.crew_invites%rowtype;
  v_crew         public.crews%rowtype;
  v_last_left    timestamptz;
  v_days_left    integer;
  v_active_count integer;
  v_left_behind  integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Verrou de la ligne d'invitation : il sérialise deux usages simultanés du
  -- MÊME lien, donc le compteur `uses` ne peut pas se perdre.
  select * into v_inv
  from public.crew_invites i
  where i.token_hash = public.gryd_invite_token_hash(p_token)
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'bad_token');
  end if;
  if v_inv.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;
  if v_inv.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select * into v_crew from public.crews c where c.id = v_inv.crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'bad_token');
  end if;

  -- Idempotent : déjà membre actif de CE crew → succès, rien ne bouge, et le
  -- compteur d'usages ne monte pas (rouvrir le lien n'est pas un recrutement).
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = v_crew.id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
      'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
  end if;

  -- ══ LA GARDE (0098) ══════════════════════════════════════════════════════
  -- Même borne, même motif que `join_crew_by_code` : un lien d'invitation
  -- n'achète pas le droit d'abandonner un crew sans chef. Placée après
  -- l'idempotence (le founder qui rouvre le lien de SON crew ne part nulle
  -- part) et avant le compteur d'usages, qui ne doit pas monter sur un refus.
  v_left_behind := public.crew_members_left_behind(v_uid);
  if v_left_behind > 0 then
    return jsonb_build_object(
      'ok', false, 'reason', 'must_transfer_lead', 'membersLeftBehind', v_left_behind);
  end if;

  -- Cooldown 7 j, calculé sur les adhésions DÉJÀ closes (copie fidèle de 0043).
  -- Une invitation ne l'achète pas : ce serait payer un avantage avec un lien.
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  perform 1 from public.crews c where c.id = v_crew.id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = v_crew.id and cm.left_at is null;
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  -- Switch : clôt l'adhésion active à un AUTRE crew (index one_active_per_user).
  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'rookie');   -- game-rules: CREW_ENTRY_ROLE

  update public.crew_invites
  set uses = uses + 1, last_used_at = now()
  where id = v_inv.id;

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
end;
$$;

comment on function public.redeem_crew_invite(text) is
  'Consommer une invitation par JETON. Refus : signed_out / bad_token / expired '
  '/ revoked / must_transfer_lead (0098, le dernier chef ne part pas par un '
  'lien) / cooldown / full. Idempotente pour un membre actif du crew visé, et '
  'le compteur d''usages ne monte que sur un vrai recrutement.';

-- ─── §4. Grants : on remet EXACTEMENT ceux de 0090/0093 ─────────────────────
-- `create or replace` conserve les privilèges existants, mais les re-poser rend
-- le fichier autosuffisant : rejoué sur une base neuve (PGlite, staging), il ne
-- dépend pas de l'ordre d'application pour être correct. `from public, anon` et
-- pas `from anon` seul — anon hérite de PUBLIC (piège attrapé en vrai sur 0083).
revoke all on function public.join_crew_by_code(text)   from public, anon;
revoke all on function public.redeem_crew_invite(text)  from public, anon;
grant execute on function public.join_crew_by_code(text)  to authenticated;
grant execute on function public.redeem_crew_invite(text) to authenticated;
