-- 0090_crew_invite_tokens.sql
-- GRYD — E52 : UNE INVITATION EST UN LIEN QUI DONNE UN DROIT.
--
-- ═══ CE QUI EXISTAIT AVANT CE FICHIER (relu, pas supposé) ═══════════════════
-- « Inviter » signifiait partager `crews.code` :
--   · 0002_schema.sql:43 — `code char(6) not null unique check (code ~ '^[A-Z0-9]{6}$')` ;
--   · 0036_crews_code_secret.sql — la colonne sort du GRANT client (bien) ;
--   · 0042_crew_real.sql:238 `my_crew_code()` — la rend à TOUT membre actif ;
--   · 0043_crew_roles_fix.sql:114 `join_crew_by_code(text)` — l'honore.
-- Ce code a un vrai mérite : il se TAPE à la main, hors ligne, sans lien. Il
-- n'est pas retiré. Mais il ne peut pas être une invitation, pour trois raisons
-- qui ne se voient pas à l'écran :
--
--   1. IL N'EXPIRE PAS. Une affiche de club photographiée en 2026 recrute
--      encore en 2028. `apps/mobile/app/c/[code].tsx:56` l'écrit noir sur blanc
--      dans ses « écarts assumés » : « NI "Expire dans 7 jours" […] les codes de
--      0042 n'ont AUCUNE expiration en base ».
--   2. IL NE SE RÉVOQUE PAS. Un membre parti, un lien recopié dans un groupe
--      public : la seule parade serait de changer le code de TOUT LE MONDE,
--      c'est-à-dire de casser tous les liens déjà distribués pour en punir un.
--   3. IL SE DEVINE. 36⁶ ≈ 2,2·10⁹ et `join_crew_by_code` n'a aucune limitation
--      de débit : l'énumération n'est pas une hypothèse d'école. Le même
--      fichier écran (`c/[code].tsx:49-55`) refuse pour cette raison précise
--      d'afficher le nom du crew avant l'adhésion — « en écrire une [RPC]
--      exposerait nom + effectif à quiconque devine un code (6 caractères) ».
--
-- ═══ CE QUE CETTE MIGRATION AJOUTE ══════════════════════════════════════════
-- Un JETON D'INVITATION à côté du code. Additif de bout en bout : aucune table
-- n'est modifiée, aucune fonction existante n'est réécrite, aucune donnée n'est
-- touchée (la base de production porte de vrais comptes depuis le 28/07/2026).
--   · `public.crew_invites` — 26 caractères base32 tirés de 128 bits d'entropie,
--     une date d'expiration OBLIGATOIRE, une révocation, un compteur d'usages ;
--   · 5 RPC SECURITY DEFINER — créer, révoquer, lister, PRÉVISUALISER, honorer.
--
-- Et parce que le jeton n'est pas devinable, il DÉBLOQUE ce que le code
-- interdisait : `peek_crew_invite` peut enfin rendre le nom du crew et son
-- effectif AVANT l'adhésion (l'« aperçu » de la spec E52) sans ouvrir la moindre
-- énumération — il faut détenir 128 bits pour poser la question.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §0 — LA BASE NE STOCKE PAS LE JETON, ELLE STOCKE SON EMPREINTE            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- `token_hash bytea` = sha256(jeton). Le jeton en clair n'existe QUE dans la
-- valeur de retour de `create_crew_invite`, une seule fois, dans la seule
-- session de son émetteur. Conséquences voulues :
--   · une fuite de la table (sauvegarde, export, lecture service_role
--     accidentelle) ne rend AUCUN lien utilisable ;
--   · personne — pas même un administrateur — ne peut « retrouver » un lien
--     perdu : on en crée un autre et on révoque l'ancien. C'est le bon geste.
-- `sha256(bytea)` est une fonction du CŒUR de PostgreSQL (≥ 11), pas pgcrypto :
-- elle est donc disponible partout, y compris sous PGlite où le test tourne.
-- Pas de sel : le jeton EST déjà 128 bits aléatoires, un sel n'ajouterait rien
-- contre un attaquant qui, par définition, ne peut pas construire de
-- dictionnaire d'entrées imprévisibles.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §0 bis — VIE PRIVÉE : UN LIEN NE PORTE PERSONNE                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Le jeton est un ALÉA PUR. Il ne dérive ni du crew, ni de l'émetteur, ni du
-- destinataire : une URL d'invitation partagée dans une story publique ne révèle
-- ni @handle, ni identifiant, ni ville. C'est l'exigence de vie privée de E52,
-- et elle est structurelle — il n'y a rien à « penser à ne pas mettre ».
-- Symétriquement, `list_crew_invites` ne rend AUCUN `user_id` : elle dit « c'est
-- toi qui l'as créé » (booléen) ou rien. Savoir QUI d'autre a émis un lien
-- n'aide personne à révoquer et transformerait la liste en registre social.
-- Aucune table de « qui a rejoint par quel lien » n'est créée : le compteur
-- `uses` suffit à décider de révoquer, et un tel registre lierait durablement
-- un nouveau membre à son parrain sans qu'aucun des deux ne l'ait demandé.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §0 ter — ANTI PAY-TO-WIN                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Rien ici ne se vend, ne s'achète, n'accélère et ne protège. Un jeton amène des
-- gens ; il n'attribue ni hex, ni point, ni bonus, ni protection. Aucune de ses
-- constantes n'entre dans un calcul de score
-- (`supabase/functions/ingest_run/anti_pay_to_win_test.ts` n'a rien à voir avec
-- ce fichier, et c'est exactement ce qu'on veut).

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §1 — LA TABLE                                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create table if not exists public.crew_invites (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.crews (id) on delete cascade,
  -- sha256 du jeton (32 octets). UNIQUE : deux invitations ne peuvent pas
  -- partager une empreinte, et la collision d'un tirage se voit à l'insert.
  token_hash  bytea not null unique check (octet_length(token_hash) = 32),
  -- 4 premiers caractères du jeton, EN CLAIR et volontairement.
  -- Pourquoi : sans repère, une liste de trois liens est trois lignes
  -- identiques — donc irrévocable en pratique, donc une révocation qui n'existe
  -- que sur le papier. 4 caractères base32 = 20 bits laissés de côté : il en
  -- reste 108, soit très au-delà de ce qui se force. Une commodité mesurée,
  -- assumée ici plutôt que découverte plus tard.
  prefix      char(4) not null check (prefix ~ '^[0-9A-HJKMNP-TV-Z]{4}$'),
  created_by  uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- OBLIGATOIRE, et c'est tout le sujet. L'« expiration facultative » de la spec
  -- E52 est facultative dans le CHOIX de la durée, jamais dans son existence.
  expires_at  timestamptz not null check (expires_at > created_at),
  revoked_at  timestamptz,
  uses        integer not null default 0 check (uses >= 0),
  last_used_at timestamptz
);

comment on table public.crew_invites is
  'E52 — jetons d''invitation crew : 128 bits d''entropie, expiration obligatoire, révocables. La base ne stocke que sha256(jeton) ; le jeton en clair n''est rendu qu''une fois, à sa création. Aucun identifiant personnel n''y est encodé.';

-- Un seul index utile : la révocation et la liste interrogent par crew.
-- La recherche par jeton passe par l'unicité de `token_hash` (index implicite).
create index if not exists crew_invites_crew_idx
  on public.crew_invites (crew_id, created_at desc);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §2 — RLS : PERSONNE NE LIT CETTE TABLE DEPUIS UN CLIENT                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- RLS activée SANS AUCUNE POLICY permissive : le refus par défaut est le
-- comportement voulu, pas un oubli. S'y ajoutent les révocations de privilèges —
-- ceinture ET bretelles, parce que les deux mécanismes échouent différemment
-- (une policy ajoutée par erreur ne rouvrirait rien sans grant, et un grant
-- rendu par erreur ne rouvrirait rien sans policy).
-- Tout passe par les RPC SECURITY DEFINER du §4, qui, elles, arbitrent.
--
-- ⚠ PAS DE `force row level security` ICI, ET C'EST DÉLIBÉRÉ : `force` soumet
-- AUSSI le propriétaire de la table à la RLS. Or les cinq RPC du §4 sont
-- SECURITY DEFINER, donc exécutées avec les droits du propriétaire — sans
-- policy permissive, `force` les aurait toutes fait échouer en silence. Aucune
-- autre table du dépôt ne l'utilise, pour la même raison.
alter table public.crew_invites enable row level security;

revoke all on public.crew_invites from anon, authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §3 — LE TIRAGE DU JETON                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Alphabet base32 « Crockford » : les 32 symboles moins I, L, O, U. Ni le 1 et
-- le I, ni le 0 et le O ne peuvent plus se confondre — un jeton se relit à voix
-- haute et se retape depuis un écran photographié. L'absence de U est celle de
-- Crockford : elle évite qu'un tirage aléatoire ne compose un mot vulgaire.
--
-- 26 caractères × 5 bits = 130 bits de support pour 128 bits d'entropie
-- (game-rules: CREW_INVITE_TOKEN_LENGTH / CREW_INVITE_TOKEN_BYTES).
-- On tire 26 octets et on prend `octet % 32` : 256 est un multiple exact de 32,
-- donc AUCUN biais (contrairement au `% 36` de 0042:100, biaisé et toléré là-bas
-- parce que le code n'y est qu'opaque — ici l'entropie est la sécurité même).
create or replace function public.gryd_new_invite_token()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_len      constant integer := 26;  -- game-rules: CREW_INVITE_TOKEN_LENGTH
  v_bytes    bytea;
  v_out      text := '';
  v_i        integer;
begin
  v_bytes := extensions.gen_random_bytes(v_len);
  for v_i in 0..(v_len - 1) loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, v_i) % 32) + 1, 1);
  end loop;
  return v_out;
end;
$$;

-- Elle n'est appelée QUE par `create_crew_invite`. Ouverte à un client, elle
-- serait un générateur d'aléa gratuit — inutile et bruyant.
revoke all on function public.gryd_new_invite_token() from public, anon, authenticated;

-- Empreinte d'un jeton présenté par un client. `upper` + retrait des
-- séparateurs : un jeton recopié à la main arrive en minuscules, avec des
-- espaces ou des tirets. Normaliser ICI (et pas dans cinq appelants) garantit
-- que la même chaîne humaine donne toujours la même empreinte.
create or replace function public.gryd_invite_token_hash(p_token text)
returns bytea
language sql
immutable
set search_path = public, pg_temp
as $$
  select sha256(convert_to(upper(regexp_replace(coalesce(p_token, ''), '[^0-9A-Za-z]', '', 'g')), 'UTF8'))
$$;

revoke all on function public.gryd_invite_token_hash(text) from public, anon, authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §4 — LES RPC                                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── 4.1 create_crew_invite ─────────────────────────────────────────────────
-- QUI PEUT INVITER : `CREW_PERMISSIONS.invite = ['co_captain', 'founder']`
-- (game-rules.ts:1332). C'est la matrice qui décide, pas ce fichier.
--
-- ⚠ INCOHÉRENCE HÉRITÉE, DITE PLUTÔT QUE MASQUÉE : `my_crew_code()` (0042:237)
-- rend le code permanent à TOUT membre actif — « Tout membre actif peut
-- inviter », écrit son commentaire — ce qui contredit la même matrice. Cette
-- migration ne réécrit pas 0042 (elle serait alors destructive pour un flux en
-- production) ; elle applique la matrice sur le chemin NEUF, et laisse le
-- constat écrit ici pour que l'arbitrage soit pris les yeux ouverts.
create or replace function public.create_crew_invite(p_ttl_hours integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_crew   uuid;
  v_role   text;
  v_ttl    integer;
  v_active integer;
  v_token  text;
  v_id     uuid;
  v_exp    timestamptz;
  v_try    integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null
  limit 1;

  if v_crew is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- game-rules: CREW_PERMISSIONS.invite
  if v_role is null or v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- Durée : on REFUSE hors bornes au lieu de rogner en silence. Un écran qui
  -- annonce 30 jours et reçoit 7 aurait menti — et c'est le serveur qui
  -- l'aurait fait mentir.
  v_ttl := coalesce(p_ttl_hours, 168);       -- game-rules: CREW_INVITE_DEFAULT_TTL_HOURS
  if v_ttl < 1 or v_ttl > 720 then           -- game-rules: CREW_INVITE_MIN/MAX_TTL_HOURS
    return jsonb_build_object('ok', false, 'reason', 'bad_ttl');
  end if;

  -- Plafond d'exposition : chaque jeton vivant est une porte ouverte, et une
  -- liste qu'on ne relit plus d'un coup d'œil n'est plus révocable en pratique.
  -- Verrou sur la ligne crew AVANT le comptage, même raison qu'en 0043 : deux
  -- créations concurrentes verraient chacune 4 sous READ COMMITTED.
  perform 1 from public.crews c where c.id = v_crew for update;
  select count(*) into v_active
  from public.crew_invites i
  where i.crew_id = v_crew and i.revoked_at is null and i.expires_at > now();
  if v_active >= 5 then                      -- game-rules: CREW_INVITE_MAX_ACTIVE
    return jsonb_build_object('ok', false, 'reason', 'too_many_invites');
  end if;

  v_exp := now() + make_interval(hours => v_ttl);

  -- Collision d'empreinte : impossible en pratique (128 bits), rattrapée quand
  -- même — une exception nue serait un « échec inconnu » à l'écran.
  for v_try in 1..3 loop
    v_token := public.gryd_new_invite_token();
    begin
      insert into public.crew_invites (crew_id, token_hash, prefix, created_by, expires_at)
      values (v_crew, public.gryd_invite_token_hash(v_token), substr(v_token, 1, 4), v_uid, v_exp)
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_id := null;
    end;
  end loop;

  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'error');
  end if;

  -- Le jeton en clair sort d'ici, une fois, et jamais plus.
  return jsonb_build_object('ok', true, 'invite', jsonb_build_object(
    'id',        v_id,
    'token',     v_token,
    'prefix',    substr(v_token, 1, 4),
    'expiresAt', v_exp
  ));
end;
$$;

-- ─── 4.2 revoke_crew_invite ─────────────────────────────────────────────────
-- Révoquer est plus permissif que créer, à dessein : celui qui a émis un lien
-- doit pouvoir le refermer sans demander la permission, même s'il a perdu le
-- droit d'en créer entre-temps (rétrogradation). Au-delà de lui, la matrice
-- `invite` s'applique — un fondateur referme la porte de n'importe qui.
-- Idempotente : re-révoquer rend `ok:true` sans toucher `revoked_at` (rejouer
-- un geste de sécurité ne doit jamais ressembler à un échec).
create or replace function public.revoke_crew_invite(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_crew uuid;
  v_role text;
  v_inv  public.crew_invites%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null
  limit 1;
  if v_crew is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select * into v_inv from public.crew_invites i where i.id = p_id;
  -- `not_found` est la MÊME réponse pour « n'existe pas » et « appartient à un
  -- autre crew » : sinon la RPC devient un oracle d'existence d'invitations.
  if not found or v_inv.crew_id <> v_crew then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_inv.created_by <> v_uid
     and (v_role is null or v_role not in ('co_captain', 'founder')) then  -- game-rules: CREW_PERMISSIONS.invite
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_inv.revoked_at is null then
    update public.crew_invites set revoked_at = now() where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ─── 4.3 list_crew_invites ──────────────────────────────────────────────────
-- Le tableau de bord de la révocation. Ne rend NI jeton, NI empreinte, NI
-- identifiant de personne (§0 bis) : `mine` dit ce qui est utile, `prefix` dit
-- lequel est lequel, `status` dit s'il ouvre encore.
-- Ouverte à tout membre actif : voir les portes ouvertes de son propre crew
-- n'est pas un pouvoir, c'est de la transparence — et c'est ce qui permet à un
-- membre de signaler ce que lui seul a vu passer.
create or replace function public.list_crew_invites()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_crew uuid;
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id into v_crew
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null
  limit 1;
  if v_crew is null then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',        i.id,
           'prefix',    i.prefix,
           'createdAt', i.created_at,
           'expiresAt', i.expires_at,
           'status',    case
                          when i.revoked_at is not null then 'revoked'
                          when i.expires_at <= now()    then 'expired'
                          else 'active'
                        end,
           'uses',      i.uses,
           'mine',      (i.created_by = v_uid)
         ) order by i.created_at desc), '[]'::jsonb)
    into v_rows
  from public.crew_invites i
  where i.crew_id = v_crew;

  return jsonb_build_object('ok', true, 'invites', v_rows);
end;
$$;

-- ─── 4.4 peek_crew_invite ───────────────────────────────────────────────────
-- L'APERÇU DE E52, celui que le code à 6 caractères interdisait.
--
-- POURQUOI `anon` A LE DROIT D'APPELER CELLE-CI, ET ELLE SEULE :
-- l'écran d'atterrissage est traversé par des gens qui n'ont pas encore de
-- compte (`app/c/[code].tsx` état ①). Leur montrer « GRYD · crew inconnu » puis
-- leur demander de s'inscrire à l'aveugle, c'est demander une inscription pour
-- une chose qu'on refuse de nommer. Le rendre possible n'ouvre AUCUNE
-- énumération : il faut détenir 128 bits d'aléa pour poser la question, et la
-- réponse ne contient aucune donnée personnelle (nom du crew — déjà public via
-- `crews_select_all` et la découverte 0083 —, effectif agrégé, date
-- d'expiration). Aucun @handle, aucun membre, aucun émetteur.
-- Un jeton mort répond `expired`/`revoked` plutôt que `bad_token` : dire à
-- quelqu'un « ce lien a expiré » lui permet d'en redemander un ; lui dire
-- « lien invalide » l'envoie chercher une faute de frappe qui n'existe pas.
create or replace function public.peek_crew_invite(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_inv   public.crew_invites%rowtype;
  v_crew  public.crews%rowtype;
  v_count integer;
begin
  select * into v_inv
  from public.crew_invites i
  where i.token_hash = public.gryd_invite_token_hash(p_token);
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

  select count(*) into v_count
  from public.crew_members cm
  where cm.crew_id = v_crew.id and cm.left_at is null;

  return jsonb_build_object('ok', true,
    'crew', jsonb_build_object(
      'id',          v_crew.id,
      'name',        v_crew.name,
      'color',       v_crew.color,
      'cityId',      v_crew.city_id,
      'memberCount', v_count,
      'maxMembers',  50                      -- game-rules: CREW_MAX_MEMBERS
    ),
    'expiresAt', v_inv.expires_at);
end;
$$;

-- ─── 4.5 redeem_crew_invite ─────────────────────────────────────────────────
-- L'ADHÉSION EST DÉCIDÉE ICI, ET NULLE PART AILLEURS. Le client ne s'ajoute
-- jamais lui-même : l'écriture sur `crew_members` lui est révoquée depuis
-- 0042 §5, et cette fonction est SECURITY DEFINER.
--
-- Les refus reprennent MOT POUR MOT le vocabulaire de `join_crew_by_code`
-- (0043 §3 : signed_out / cooldown / full) parce que l'écran d'invitation les
-- rend déjà (`app/c/[code].tsx:109-122`, catalogue i18n `rlErrCooldown` /
-- `rlErrFull`). Un synonyme aurait forcé une seconde traduction du même refus.
-- Trois refus lui sont propres — `bad_token`, `expired`, `revoked` — et c'est
-- toute la raison d'être de cette migration.
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

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §5 — EXÉCUTION                                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
revoke all on function public.create_crew_invite(integer) from public, anon;
revoke all on function public.revoke_crew_invite(uuid)    from public, anon;
revoke all on function public.list_crew_invites()         from public, anon;
revoke all on function public.redeem_crew_invite(text)    from public, anon;
-- `peek_crew_invite` : on révoque `public` puis on rouvre explicitement aux
-- deux rôles clients. `anon` y est délibéré (§4.4) — un visiteur sans compte
-- doit savoir CE QU'ON lui propose de rejoindre avant de créer un compte.
revoke all on function public.peek_crew_invite(text)      from public;

grant execute on function public.create_crew_invite(integer) to authenticated;
grant execute on function public.revoke_crew_invite(uuid)    to authenticated;
grant execute on function public.list_crew_invites()         to authenticated;
grant execute on function public.redeem_crew_invite(text)    to authenticated;
grant execute on function public.peek_crew_invite(text)      to anon, authenticated;
