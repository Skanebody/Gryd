-- 0198_auth_handoff_2026.sql
-- GRYD — E5 : LA PAGE WEB VALIDE, ET L'APP SE CONNECTE TOUTE SEULE.
--
-- ═══ LA DEMANDE DU FONDATEUR, MOT POUR MOT (12/09/2026) ════════════════════
-- « vas juste vers une page qui dit que ça a été bien validé mais derrière il
-- faut que le compte fonctionne dans l'application ».
--
-- ═══ POURQUOI CE FICHIER EXISTE, ET CE QU'IL REMPLACE ══════════════════════
-- Depuis E4, le lien de l'e-mail vise `https://gryd.run/callback?token_hash=…`
-- et compte sur le LIEN UNIVERSEL pour qu'iOS remette l'adresse à l'app plutôt
-- qu'à Safari. Ce chemin exige la capacité Apple « Associated Domains », que le
-- profil de signature n'a pas encore : le build `fe030292` est ERRORED. Sur un
-- vrai iPhone, aujourd'hui, le clic ouvre Safari — la page pouvait féliciter,
-- et derrière, le compte restait fermé. C'est exactement le défaut nommé.
--
-- La remise inverse la charge :
--   ① l'APP tire un nonce (256 bits) et écrit l'adresse de retour
--      `https://gryd.run/callback?n=<nonce>` dans sa demande de lien ;
--   ② le gabarit d'e-mail y accroche `&token_hash=…&type=…` ;
--   ③ la PAGE WEB vérifie le haché (`verifyOtp`) — elle a donc une session,
--      une vraie — puis DÉPOSE ici son jeton de rafraîchissement contre
--      `sha256(nonce)`, et se déconnecte localement ;
--   ④ l'APP, restée sur « Lien envoyé », RÉCLAME avec son nonce, obtient le
--      jeton une seule fois, et ouvre sa session.
-- Plus aucun lien universel dans la boucle : ça marche sur un Mac, dans un
-- webmail, sur Android, et ça continuera de marcher le jour où le lien
-- universel marchera (les deux chemins coexistent, cf. `app/(auth)/callback.tsx`).
--
-- ═══ LE MODÈLE DE MENACE, ÉCRIT AVANT LE CODE ══════════════════════════════
--
-- CE QUE LE NONCE PROTÈGE. Il est tiré par l'app et ne sort d'elle que par
-- l'adresse de retour écrite dans SON e-mail. Le détenir prouve qu'on est
-- l'appareil qui a demandé le lien. C'est pour ça que `auth_handoff_claim_2026`
-- est ouverte à `anon` : à l'instant où l'app réclame, elle n'a AUCUNE session
-- — exiger `authenticated` rendrait la remise impossible, pas plus sûre.
--
-- CE QUI COMPENSE CETTE OUVERTURE, et chaque point est vérifié par un test :
--   · 256 bits d'entropie (`AUTH_HANDOFF_2026.nonceBytes`, game-rules.ts) :
--     l'énumération n'est pas un risque atténué, elle est hors de portée ;
--   · USAGE UNIQUE : la première réclamation gagnante marque `consumed_at` et
--     EFFACE le jeton de la ligne. Une seconde réclamation ne rend rien ;
--   · 5 MINUTES de vie (`AUTH_HANDOFF_2026.ttlS`) : une ligne qui traîne est
--     une ligne qu'on préfère morte. Une purge ordonnancée les enlève ;
--   · LA TABLE N'EST LISIBLE PAR PERSONNE : RLS activée SANS aucune policy, et
--     `revoke all` par-dessus. Aucun client — ni `anon`, ni `authenticated` —
--     ne peut faire un `select` dessus. Tout passe par les deux RPC ;
--   · LE DÉPÔT EXIGE UNE SESSION : `auth.uid()` doit exister. Une page qui
--     n'aurait rien vérifié ne peut rien déposer, même en connaissant un nonce.
--
-- CE QUE LE NONCE NE PROTÈGE PAS, et il faut le dire : quelqu'un qui lit
-- l'e-mail ET regarde l'écran de l'app a déjà tout. C'est le modèle de menace
-- du lien magique lui-même, pas une faiblesse ajoutée par ce fichier.
--
-- ═══ CE QUE CE FICHIER NE FAIT PAS ═════════════════════════════════════════
--   · il n'écrit AUCUNE donnée de jeu, aucun compte, aucune ville ;
--   · il ne réécrit AUCUNE migration (0001-0197 sont intouchées) ;
--   · il ne stocke jamais le nonce en clair — seulement son empreinte ;
--   · il ne stocke jamais l'`access_token` : un jeton de rafraîchissement
--     suffit à l'app pour en frapper un neuf, et c'est une donnée de moins.
--
-- Rollback : `drop function public.auth_handoff_claim_2026(text);`
--            `drop function public.auth_handoff_deposit_2026(text,text,text);`
--            `drop function public.purge_auth_handoff_2026();`
--            `drop table public.auth_handoff_2026;`
--            `select cron.unschedule('auth-handoff-purge-2026');`

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §1 — LA TABLE : UNE BOÎTE AUX LETTRES, PAS UN REGISTRE                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Elle ne garde rien : cinq minutes, un jeton, puis plus rien. Ce n'est pas une
-- table de données, c'est un point de rendez-vous entre deux appareils.
--
-- `nonce_hash text` (et non `bytea`) : la clé primaire est comparée à une
-- valeur produite par `encode(sha256(…),'hex')`, donc une chaîne de 64
-- caractères hexadécimaux. Le `check` le verrouille — une empreinte d'une autre
-- longueur signalerait un appelant qui ne passe pas par la fonction de hachage.
-- Le nonce EN CLAIR n'entre jamais ici : une fuite de sauvegarde ne rend aucune
-- remise réclamable (même raisonnement qu'en 0090 pour les invitations crew).
create table if not exists public.auth_handoff_2026 (
  nonce_hash    text primary key check (nonce_hash ~ '^[0-9a-f]{64}$'),
  -- Le jeton de rafraîchissement déposé par la page web. NULLABLE, et c'est le
  -- cœur de l'usage unique : la réclamation gagnante le met à NULL. Une ligne
  -- consommée ne porte donc plus rien à voler.
  refresh_token text,
  -- Qui a déposé. Sert à deux choses et deux seulement : empêcher qu'une
  -- seconde session écrase le dépôt d'une autre, et suivre la cascade quand un
  -- compte est supprimé. Jamais rendu à un client.
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- `signup` ou `magiclink`, tel que GoTrue l'a écrit dans le lien. C'est LUI
  -- qui décide si l'app a le droit de dire « Félicitations, ton compte est
  -- créé » (`welcomeKind2026`) : sans lui, l'app devrait deviner, et deviner
  -- ici veut dire féliciter quelqu'un qui se reconnecte.
  callback_type text check (callback_type is null or callback_type in ('signup', 'magiclink', 'recovery', 'invite', 'email_change')),
  created_at    timestamptz not null default now(),
  -- OBLIGATOIRE et toujours postérieure à la création : une remise sans
  -- échéance serait un jeton de session abandonné en base.
  expires_at    timestamptz not null check (expires_at > created_at),
  consumed_at   timestamptz
);

comment on table public.auth_handoff_2026 is
  'E5 (12/09/2026) — remise de session entre la page https://gryd.run/callback '
  'et l''app. Une ligne = un rendez-vous de 5 minutes (AUTH_HANDOFF_2026.ttlS) '
  'entre le navigateur qui a vérifié le lien et le téléphone qui a demandé le '
  'lien. La base ne stocke que sha256(nonce) ; le jeton est effacé par la '
  'PREMIÈRE réclamation. Aucune policy RLS : personne ne lit cette table, tout '
  'passe par auth_handoff_deposit_2026 / auth_handoff_claim_2026.';

-- La purge balaie par échéance : c'est le seul parcours non ponctuel de la
-- table (la lecture par nonce passe par la clé primaire).
create index if not exists auth_handoff_2026_expires_idx
  on public.auth_handoff_2026 (expires_at);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §2 — RLS : PERSONNE NE LIT CETTE TABLE                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- RLS activée SANS AUCUNE policy permissive. Le refus par défaut est le
-- comportement voulu, pas un oubli — et il s'ajoute aux `revoke` ci-dessous :
-- les deux mécanismes échouent différemment, donc les deux sont posés (ceinture
-- et bretelles, même raisonnement qu'en 0090 §2).
--
-- ⚠ PAS DE `force row level security` : `force` soumettrait AUSSI le
-- propriétaire, donc les deux RPC SECURITY DEFINER de ce fichier échoueraient
-- en silence, faute de policy permissive. Aucune table du dépôt ne l'utilise.
alter table public.auth_handoff_2026 enable row level security;

revoke all on public.auth_handoff_2026 from public, anon, authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §3 — L'EMPREINTE                                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- `sha256(bytea)` est une fonction du CŒUR de PostgreSQL (≥ 11), pas pgcrypto :
-- disponible partout, y compris sous PGlite où les tests tournent.
-- Pas de sel : le nonce EST 256 bits d'aléa, un sel n'ajouterait rien contre un
-- attaquant qui, par définition, ne peut construire aucun dictionnaire.
--
-- La FORME est vérifiée ICI, une seule fois, pour les deux RPC : 32 à 64 octets
-- rendus en hexadécimal, soit 64 à 128 caractères. Le plancher refuse qu'un
-- appelant maladroit dépose sur une empreinte de « abc » ; le plafond refuse
-- qu'on fasse hacher un mégaoctet à la base pour rien.
create or replace function public.auth_handoff_nonce_hash_2026(p_nonce text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_nonce is not null and p_nonce ~ '^[0-9a-f]{64,128}$'
      then encode(sha256(convert_to(p_nonce, 'UTF8')), 'hex')
    else null
  end
$$;

comment on function public.auth_handoff_nonce_hash_2026(text) is
  'E5 — sha256 hexadécimal d''un nonce de remise, ou NULL si le nonce n''a pas '
  'la forme attendue (64 à 128 caractères hexadécimaux minuscules, soit 256 à '
  '512 bits). Le NULL est le refus : les deux RPC s''arrêtent dessus.';

-- Elle n'est appelée que par les deux RPC de ce fichier. Ouverte à un client,
-- elle serait un oracle de hachage gratuit — inutile, et bruyant.
revoke all on function public.auth_handoff_nonce_hash_2026(text) from public, anon, authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §4 — LE DÉPÔT (la page web, AUTHENTIFIÉE)                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Appelée par `apps/web/app/callback/page.tsx` juste après un `verifyOtp`
-- réussi, donc avec une session GoTrue fraîche. `auth.uid()` est la GARDE : une
-- page qui n'aurait rien vérifié ne peut rien déposer, même en connaissant un
-- nonce valide.
--
-- ─── POURQUOI `on conflict … do update`, ET SOUS QUELLES CONDITIONS ────────
-- Le même dépôt peut légitimement partir deux fois : React monte, démonte et
-- remonte un effet en développement, un joueur recharge l'onglet, un réseau
-- lent fait réessayer. Refuser le second serait transformer un doublon inoffensif
-- en échec visible. Mais le `where` du `do update` pose les deux seules
-- conditions qui comptent :
--   · `consumed_at is null` — une remise DÉJÀ prise ne se re-remplit jamais.
--     Sans cette clause, réouvrir le lien fabriquerait une session neuve pour
--     un nonce que l'app a déjà consommé, c'est-à-dire un rejeu ;
--   · `user_id = excluded.user_id` — deux comptes différents ne se marchent
--     pas dessus sur une collision (impossible à 256 bits, refusée quand même).
-- Le retour dit ce qui s'est passé, il ne le suppose pas.
create or replace function public.auth_handoff_deposit_2026(
  p_nonce         text,
  p_refresh_token text,
  p_callback_type text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_hash text;
  v_ok   boolean := false;
begin
  if v_uid is null then
    raise exception 'auth_handoff_deposit_2026: une session est requise pour déposer'
      using errcode = '42501';
  end if;

  v_hash := public.auth_handoff_nonce_hash_2026(p_nonce);
  if v_hash is null then
    raise exception 'auth_handoff_deposit_2026: nonce de forme invalide'
      using errcode = '22023';
  end if;

  -- Le jeton de rafraîchissement de GoTrue fait quelques dizaines de
  -- caractères. Les bornes ne devinent pas un format (il n'est pas documenté) :
  -- elles refusent le vide et le déraisonnable, c'est tout ce qu'on sait.
  if p_refresh_token is null or length(p_refresh_token) < 8 or length(p_refresh_token) > 1024 then
    raise exception 'auth_handoff_deposit_2026: jeton de rafraîchissement absent ou hors bornes'
      using errcode = '22023';
  end if;

  insert into public.auth_handoff_2026 as h
    (nonce_hash, refresh_token, user_id, callback_type, expires_at)
  values
    (v_hash, p_refresh_token, v_uid, nullif(p_callback_type, ''),
     -- game-rules.ts : AUTH_HANDOFF_2026.ttlS = 300
     now() + interval '5 minutes')
  on conflict (nonce_hash) do update
    set refresh_token = excluded.refresh_token,
        callback_type = excluded.callback_type,
        expires_at    = excluded.expires_at
    where h.consumed_at is null
      and h.user_id = excluded.user_id
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

comment on function public.auth_handoff_deposit_2026(text, text, text) is
  'E5 — la page https://gryd.run/callback dépose son jeton de rafraîchissement '
  'contre sha256(nonce), pour que l''app qui a demandé le lien vienne le '
  'chercher. Exige une session (auth.uid()). Rend FALSE quand la remise existe '
  'déjà et a été consommée : aucun rejeu, jamais.';

revoke all on function public.auth_handoff_deposit_2026(text, text, text) from public, anon, authenticated;
grant execute on function public.auth_handoff_deposit_2026(text, text, text) to authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §5 — LA RÉCLAMATION (l'app, ANONYME — le seul secret est le nonce)       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Ouverte à `anon` DÉLIBÉRÉMENT : à l'instant où l'app réclame, elle n'a aucune
-- session — c'est précisément ce qu'elle vient chercher. Exiger `authenticated`
-- rendrait la remise impossible, pas plus sûre. Voir le modèle de menace en
-- tête de fichier pour ce qui compense.
--
-- ─── LE VOL DU JETON SE FAIT EN DEUX INSTRUCTIONS, ET IL FAUT SAVOIR POURQUOI
-- `UPDATE … RETURNING` rend la ligne APRÈS écriture : mettre `refresh_token` à
-- NULL dans le même UPDATE rendrait NULL. On prend donc la valeur en marquant
-- `consumed_at` (première instruction), puis on efface (seconde). Les deux
-- vivent dans la même fonction, donc dans la même transaction : un appelant ne
-- peut jamais observer un état intermédiaire.
--
-- ─── LA CONCURRENCE EST TRANCHÉE PAR L'UPDATE LUI-MÊME ─────────────────────
-- Deux réclamations simultanées visent la même ligne. En READ COMMITTED, la
-- seconde attend le verrou de la première puis RÉÉVALUE son `where` sur la
-- version fraîche : `consumed_at` n'est plus NULL, elle ne met à jour aucune
-- ligne, elle rend NULL. L'usage unique tient sans verrou explicite.
--
-- ─── AUCUN MESSAGE D'ERREUR : LE REFUS EST UN `null` ───────────────────────
-- Nonce inconnu, nonce expiré, nonce déjà servi, nonce malformé : tous rendent
-- `null`. Distinguer ces cas dirait à un appelant anonyme qu'un nonce EXISTE —
-- exactement l'information qu'une énumération cherche. L'app, elle, n'a rien à
-- en faire : elle réessaie jusqu'à son plafond, puis propose de renvoyer.
create or replace function public.auth_handoff_claim_2026(p_nonce text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash  text;
  v_token text;
  v_type  text;
begin
  v_hash := public.auth_handoff_nonce_hash_2026(p_nonce);
  if v_hash is null then
    return null;
  end if;

  with taken as (
    update public.auth_handoff_2026 h
       set consumed_at = now()
     where h.nonce_hash = v_hash
       and h.consumed_at is null
       and h.expires_at > now()
    returning h.refresh_token as token, h.callback_type as callback_type
  )
  select taken.token, taken.callback_type into v_token, v_type from taken;

  if v_token is null then
    return null;
  end if;

  -- LE JETON NE SURVIT PAS À SA REMISE. À partir d'ici, la ligne ne porte plus
  -- qu'une empreinte et deux horodatages ; la purge l'enlèvera.
  update public.auth_handoff_2026
     set refresh_token = null
   where nonce_hash = v_hash;

  return jsonb_build_object('refresh_token', v_token, 'type', v_type);
end;
$$;

comment on function public.auth_handoff_claim_2026(text) is
  'E5 — l''app réclame, avec le nonce qu''elle a tiré, le jeton de '
  'rafraîchissement déposé par la page web. USAGE UNIQUE : la première '
  'réclamation gagnante marque consumed_at et efface le jeton. Rend NULL pour '
  'tout refus (inconnu, expiré, déjà servi, malformé) sans jamais dire lequel. '
  'Ouverte à anon parce que l''app n''a, par construction, aucune session à cet '
  'instant : le seul secret est le nonce (256 bits, 5 minutes).';

revoke all on function public.auth_handoff_claim_2026(text) from public;
grant execute on function public.auth_handoff_claim_2026(text) to anon, authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §6 — LA PURGE, ET SON HORLOGE (patron 0190/0196)                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Une ligne échue ne sert plus à rien : elle ne porte plus de jeton dès qu'elle
-- a été réclamée, et elle n'en rendrait aucun si elle ne l'a pas été. La garder
-- ne ferait qu'entretenir un journal de « qui s'est connecté quand », c'est-à-
-- dire une donnée de vie privée que ce lot n'a aucune raison de produire.
create or replace function public.purge_auth_handoff_2026()
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.auth_handoff_2026 where expires_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.purge_auth_handoff_2026() is
  'E5 — efface les remises échues (5 minutes). Ordonnancée toutes les 10 '
  'minutes sous le nom auth-handoff-purge-2026. Idempotente : rien à purger '
  'rend 0. Réservée au service-role.';

revoke all on function public.purge_auth_handoff_2026() from public, anon, authenticated;

-- `pg_cron` 1.6.4 est INSTALLÉ en production (vérifié le 09/09/2026, 0163). Le
-- `do $$ … $$` conditionnel garde ce fichier REJOUABLE sur une base de test où
-- le schéma `cron` n'existe pas — PGlite, notamment.
--
-- Toutes les 10 minutes, et non une fois par nuit : la table doit rester vide à
-- vue d'œil. Une remise vit 5 minutes ; un balayage aux dix minutes garantit
-- qu'aucune ligne ne dépasse le quart d'heure. `cron.schedule` sur un nom
-- existant REMPLACE la planification : réappliquer ne double rien.
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule(
      'auth-handoff-purge-2026',
      '*/10 * * * *',
      'select public.purge_auth_handoff_2026()'
    );
  end if;
end $$;
