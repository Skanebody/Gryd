-- 0088_social_graph_and_duels.sql
--
-- ⚠ NUMÉRO CORRIGÉ LE 27/07/2026 — ce fichier est né « 0087 », en collision avec
-- `0087_public_territories_respects_map_sharing.sql` (écrits le même soir par
-- deux chantiers parallèles). `supabase db push` enregistre la VERSION dérivée
-- du préfixe dans `supabase_migrations.schema_migrations`, dont c'est la clé
-- primaire : deux fichiers « 0087 » n'auraient jamais pu être appliqués tous les
-- deux — l'un aurait échoué, ou pire, aurait été silencieusement considéré comme
-- déjà appliqué et SAUTÉ. Le renumérotage est licite ici, et seulement ici,
-- parce qu'AUCUNE base n'a reçu ce fichier (le projet `gryd` est vide) : une
-- migration déjà appliquée quelque part ne se renumérote jamais, elle
-- s'empile. `scripts/audit-migrations.mjs` (dans le gate) refuse désormais toute
-- nouvelle collision de préfixe.
-- GRYD — E57 (SUIVIS ET AMIS) + E58 (DÉFI) : le lien social devient RÉEL, et il
-- se DEMANDE au lieu de se PRENDRE.
--
-- ═══ CONSTAT AVANT TRAVAUX (vérifié fichier par fichier, pas supposé) ════════
--
--   • `public.friendships` EXISTE depuis 0011:70-88 : paire ordonnée unique,
--     statuts pending|accepted|blocked|rejected, RLS de lecture owner-only
--     (0011 « friendships_select_own »). ELLE N'A JAMAIS EU DE CHEMIN
--     D'ÉCRITURE : `revoke insert, update, delete … from anon, authenticated`
--     (0011), et aucune RPC, aucune Edge Function du dépôt ne l'écrit
--     (grep `friendships` sur apps/ packages/ supabase/functions/, 27/07/2026 :
--     uniquement des policies et des commentaires). Une table d'amitiés sans
--     écrivain est exactement ce que E57 devait débloquer.
--
--   • IL N'EXISTE AUCUNE TABLE `follows`. Le « suivi » de E57 — asymétrique,
--     sans réciprocité demandée — n'a jamais eu de support. La spec dit « le
--     suivi n'autorise aucune donnée supplémentaire de localisation » : cette
--     migration le tient PAR CONSTRUCTION (§4), pas par convention.
--
--   • IL N'EXISTE AUCUN DÉFI JOUEUR-CONTRE-JOUEUR. ⚠ Ne pas confondre avec
--     `public.challenges` (0007) et l'écran `/challenges` : ce sont des
--     OBJECTIFS SOLO servis par le serveur à tout le monde, sans destinataire.
--     E58 est une SOLLICITATION adressée à UNE personne — elle a un émetteur,
--     un destinataire, et surtout un DROIT DE REFUS. Rien de tout cela n'existe
--     dans `challenges`, et l'y loger aurait mélangé un catalogue avec une
--     boîte de réception.
--
--   • `apps/mobile/src/i18n/catalog/qr.ts:20-21` le disait déjà noir sur blanc :
--     « il n'existe ni système de suivi, ni défi joueur-contre-joueur ». Cette
--     migration est ce que ce commentaire attendait.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §0 — LA DÉCISION DE CONFIDENTIALITÉ : IL N'Y A PAS D'ANNUAIRE            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- La tentation évidente serait une fonction `search_players(prefix)`. Elle est
-- REFUSÉE, et il faut dire pourquoi plutôt que de la laisser en TODO :
--
--   · un préfixe suffit à ASPIRER l'annuaire (26 requêtes rendent l'essentiel
--     des handles d'une ville) ; une recherche qui borne à l'exact ne borne
--     rien, puisqu'on peut l'appeler en boucle ;
--   · GRYD est un jeu GÉOLOCALISÉ. Un annuaire consultable, croisé avec la
--     ville du profil, transforme « qui joue » en « qui court par ici » — la
--     §12 (confidentialité géospatiale) tombe sans qu'aucune coordonnée n'ait
--     jamais été servie ;
--   · et la base est VIDE. Une recherche qui ne rendrait jamais personne
--     ressemblerait à une panne, pas à une vérité.
--
-- CE QUI REMPLACE L'ANNUAIRE, et qui existe déjà : le @handle se reçoit de la
-- personne elle-même (écran `/qr`, lien de profil, code lu en vrai). On suit
-- donc quelqu'un dont on a le handle — jamais quelqu'un qu'on a trouvé.
-- `follow_user` est LE SEUL point du produit où l'existence d'un handle est
-- observable ; il est plafonné à SOCIAL_FOLLOW_MAX_PER_DAY nouveaux suivis par
-- 24 h, ce qui rend l'énumération inutilisable sans gêner un usage réel.
--
-- ⚠ ET LE DÉFI NE S'ADRESSE PAS À UN INCONNU. `duel_create` EXIGE un lien
-- préexistant (amitié acceptée, ou suivi RÉCIPROQUE). Autrement dit : pour
-- pouvoir défier quelqu'un, il faut qu'il vous ait au moins suivi en retour.
-- Sans cette règle, le plafond de défis aurait borné le VOLUME du harcèlement
-- sans jamais borner sa CIBLE.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ §0bis — ANTI-PAY-TO-WIN : CE QUI N'EXISTE PAS DANS CE SCHÉMA            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- `public.duels` n'a AUCUNE colonne de mise, d'enjeu, de gage, de récompense ni
-- de coût. Ce n'est pas un oubli : E58 dit « aucune mise d'argent ni récompense
-- pay-to-win », et la seule façon de le garantir est qu'il n'y ait PAS DE
-- COLONNE où l'écrire. De même, aucun plafond ci-dessous n'est relevable par un
-- achat : les constantes vivent dans game-rules.ts et sont les mêmes pour tous.
-- Un défi ne déplace aucun territoire, ne crédite aucun point, ne touche ni
-- `hex_claims` ni `territories` — il n'existe d'ailleurs aucun `grant` qui le
-- lui permettrait.

-- ═══ §1. follows — LE SUIVI (asymétrique, révocable, sans réciprocité) ══════
-- Clé primaire = l'arête elle-même : suivre deux fois est un no-op naturel, pas
-- une erreur à rattraper. `on delete cascade` des deux côtés : un compte
-- supprimé (0046) emporte ses arêtes dans les deux sens.
create table if not exists public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  followee_id uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);
-- « Qui me suit » (abonnés) — l'autre sens est déjà servi par la PK.
create index if not exists follows_followee_idx on public.follows (followee_id, created_at desc);

comment on table public.follows is
  'E57 — suivi asymétrique. N''octroie AUCUNE donnée de localisation supplémentaire : '
  'aucune policy de ce dépôt ne cite follows pour élargir la lecture de runs, '
  'territories, hex_claims ou user_profiles (spec E57 : « le suivi n''autorise aucune '
  'donnée supplémentaire de localisation »).';

-- ═══ §2. duels — LE DÉFI (E58) ══════════════════════════════════════════════
-- Une SOLLICITATION : émetteur, destinataire, format, fenêtre, et un statut qui
-- rend le refus banal. `declined` n'est pas un échec, c'est une réponse.
--
-- `expires_at` est MATÉRIALISÉ (pas dérivé au vol) parce qu'il est le contrat
-- montré au destinataire au moment où il reçoit le défi : si DUEL_EXPIRY_HOURS
-- changeait, les défis déjà envoyés ne devraient pas voir leur échéance bouger
-- sous les yeux de quelqu'un.
create table if not exists public.duels (
  id            uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.users (id) on delete cascade,
  opponent_id   uuid not null references public.users (id) on delete cascade,
  -- game-rules: DUEL_KINDS — liste FERMÉE, miroir exact de la spec E58.
  kind          text not null check (kind in ('surface_period', 'loops', 'defend_zone', 'distance')),
  -- La discipline est celle du jeu (0070) : un défi Run ne se compare pas à un Bike.
  activity      text not null default 'run' check (activity in ('run', 'bike')),
  -- game-rules: DUEL_PERIOD_DAYS_MIN / DUEL_PERIOD_DAYS_MAX
  period_days   int  not null check (period_days between 1 and 14),
  -- Cible chiffrée du format (km, boucles, zones). NULL pour un format qui n'en
  -- prend pas. Jamais négative, jamais nulle : « 0 km en 7 jours » n'est pas un défi.
  target_value  numeric check (target_value is null or target_value > 0),
  -- kind = 'defend_zone' : LIBELLÉ public de la zone, jamais une coordonnée ni
  -- un identifiant d'hexagone (§12 — un défi ne doit pas transporter de position).
  zone_label    text check (zone_label is null or char_length(zone_label) between 1 and 80),
  status        text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  responded_at  timestamptz,
  constraint duels_no_self check (challenger_id <> opponent_id),
  -- Une zone ne se nomme QUE pour le format qui la défend ; un défi de distance
  -- portant un libellé de zone serait un champ qui ment.
  constraint duels_zone_only_for_defense
    check ((kind = 'defend_zone') = (zone_label is not null))
);

-- UN SEUL défi en attente par paire, QUEL QUE SOIT LE SENS. Sans le `least/
-- greatest`, A pourrait « répondre » à un défi de B en lui en envoyant un autre,
-- et deux sollicitations croisées resteraient ouvertes en même temps.
create unique index if not exists duels_one_pending_per_pair
  on public.duels (least(challenger_id, opponent_id), greatest(challenger_id, opponent_id))
  where status = 'pending';
create index if not exists duels_opponent_idx on public.duels (opponent_id, status, created_at desc);
create index if not exists duels_challenger_idx on public.duels (challenger_id, status, created_at desc);
-- Le cooldown anti-relance interroge « le dernier refus/expiration de cette
-- paire » : l'index le sert sans balayer la table.
create index if not exists duels_pair_history_idx
  on public.duels (least(challenger_id, opponent_id), greatest(challenger_id, opponent_id), responded_at desc);

comment on table public.duels is
  'E58 — défi joueur contre joueur. AUCUNE colonne de mise, d''enjeu ni de récompense : '
  'l''anti-pay-to-win est tenu par l''ABSENCE de champ, pas par une convention. '
  'Ne touche ni hex_claims ni territories ni users.foulees.';

-- ═══ §3. RLS — lecture de MES arêtes seulement, écriture nulle part ═════════
alter table public.follows enable row level security;
alter table public.duels   enable row level security;

revoke insert, update, delete on public.follows from anon, authenticated;
revoke insert, update, delete on public.duels   from anon, authenticated;

-- Je vois les arêtes dont je suis une extrémité, et RIEN d'autre. En
-- particulier : la liste des personnes que suit un TIERS n'est jamais lisible —
-- c'est un graphe social, la donnée la plus ré-identifiante du produit.
create policy follows_select_own on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

create policy duels_select_own on public.duels
  for select to authenticated
  using (challenger_id = (select auth.uid()) or opponent_id = (select auth.uid()));

-- ═══ §4. CE QUE LE SUIVI N'OUVRE PAS ════════════════════════════════════════
-- Aucune policy de cette migration n'élargit la lecture d'une donnée de
-- localisation. `user_profiles.profile_visibility = 'friends'` (0011) reste
-- adossée à `friendships.status = 'accepted'` — le SUIVI n'y donne pas droit,
-- et c'est délibéré : suivre est unilatéral, l'amitié est consentie des deux
-- côtés. Confondre les deux ferait d'un clic de suivi une élévation de
-- privilège sur le profil d'autrui.

-- ═══ §5. Constantes de jeu, RÉPLIQUÉES EN FONCTIONS (jamais en dur) ═════════
-- Même patron que 0085 : une fonction immuable par constante, pour que le
-- nombre soit CITABLE dans les tests et remplaçable en un seul endroit. Fermées
-- aux rôles clients : ce sont des détails d'implémentation du serveur.
create or replace function public.social_follow_max_per_day() returns integer
  language sql immutable as $$ select 40 $$;                -- game-rules: SOCIAL_FOLLOW_MAX_PER_DAY
create or replace function public.social_friend_requests_max_pending() returns integer
  language sql immutable as $$ select 20 $$;                -- game-rules: SOCIAL_FRIEND_REQUESTS_MAX_PENDING
create or replace function public.social_friend_request_cooldown_days() returns integer
  language sql immutable as $$ select 30 $$;                -- game-rules: SOCIAL_FRIEND_REQUEST_COOLDOWN_DAYS
create or replace function public.social_list_rows_limit() returns integer
  language sql immutable as $$ select 200 $$;               -- game-rules: SOCIAL_LIST_ROWS_LIMIT
create or replace function public.duel_expiry_hours() returns integer
  language sql immutable as $$ select 72 $$;                -- game-rules: DUEL_EXPIRY_HOURS
create or replace function public.duel_max_pending_sent() returns integer
  language sql immutable as $$ select 5 $$;                 -- game-rules: DUEL_MAX_PENDING_SENT
create or replace function public.duel_retry_cooldown_hours() returns integer
  language sql immutable as $$ select 168 $$;               -- game-rules: DUEL_RETRY_COOLDOWN_HOURS

revoke all on function public.social_follow_max_per_day()           from public, anon, authenticated;
revoke all on function public.social_friend_requests_max_pending()  from public, anon, authenticated;
revoke all on function public.social_friend_request_cooldown_days() from public, anon, authenticated;
revoke all on function public.social_list_rows_limit()              from public, anon, authenticated;
revoke all on function public.duel_expiry_hours()                   from public, anon, authenticated;
revoke all on function public.duel_max_pending_sent()               from public, anon, authenticated;
revoke all on function public.duel_retry_cooldown_hours()           from public, anon, authenticated;

-- ═══ §6. social_resolve_handle — la résolution, INTERNE et fermée ═══════════
/**
 * @handle → user_id, ou NULL. FERMÉE aux rôles clients (aucun grant) : exposée,
 * elle SERAIT l'annuaire que §0 refuse. Elle n'est appelable que depuis les
 * fonctions SECURITY DEFINER ci-dessous, toutes plafonnées.
 *
 * Un profil `private` n'est PAS résolu : on ne peut ni le suivre, ni lui
 * demander en ami, ni le défier. C'est le seul réglage qui rend quelqu'un
 * complètement injoignable, et il doit tenir.
 */
create or replace function public.social_resolve_handle(p_handle text)
returns uuid
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select up.user_id
  from public.user_profiles up
  where up.handle = lower(btrim(coalesce(p_handle, '')))
    and up.profile_visibility <> 'private'
  limit 1;
$$;
revoke all on function public.social_resolve_handle(text) from public, anon, authenticated;

-- ═══ §7. social_pair_state — l'état d'une paire, en UN endroit ══════════════
/**
 * Rend l'état RELATIONNEL entre `p_a` et `p_b`, vu de `p_a` :
 *   iFollow / followsMe / friend / friendPending / friendBlocked.
 * Un seul lieu de vérité pour une question posée par quatre fonctions ; deux
 * implémentations auraient divergé sur le sens de `least/greatest`.
 */
create or replace function public.social_pair_state(p_a uuid, p_b uuid)
returns jsonb
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'iFollow',   exists (select 1 from public.follows f
                         where f.follower_id = p_a and f.followee_id = p_b),
    'followsMe', exists (select 1 from public.follows f
                         where f.follower_id = p_b and f.followee_id = p_a),
    'friend',    exists (select 1 from public.friendships fr
                         where fr.status = 'accepted'
                           and least(fr.requester_id, fr.addressee_id) = least(p_a, p_b)
                           and greatest(fr.requester_id, fr.addressee_id) = greatest(p_a, p_b)),
    'friendPending', exists (select 1 from public.friendships fr
                         where fr.status = 'pending'
                           and least(fr.requester_id, fr.addressee_id) = least(p_a, p_b)
                           and greatest(fr.requester_id, fr.addressee_id) = greatest(p_a, p_b)),
    'blocked',   exists (select 1 from public.friendships fr
                         where fr.status = 'blocked'
                           and least(fr.requester_id, fr.addressee_id) = least(p_a, p_b)
                           and greatest(fr.requester_id, fr.addressee_id) = greatest(p_a, p_b))
  );
$$;
revoke all on function public.social_pair_state(uuid, uuid) from public, anon, authenticated;

-- ═══ §8. social_person — la carte d'identité MINIMALE d'un lien ════════════
/**
 * Ce qu'on a le droit de montrer d'une personne avec qui on est en relation :
 * son @handle et son nom affiché. RIEN D'AUTRE. Pas de ville (§12 : croisée
 * avec un graphe social, elle localise), pas d'activité, pas de dernière
 * course, pas de surface. Un écran d'amis n'est pas un écran d'espionnage.
 *
 * `handle` peut être NULL : un compte sans `user_profiles` (provisionné par
 * 0028 mais jamais complété) existe réellement. On rend alors un objet dont le
 * handle est `null`, jamais un pseudo inventé et JAMAIS un `null` nu — une
 * liste de personnes qui contiendrait des trous ferait crasher ou mentir
 * l'écran. L'objet vide dit « personne sans nom affichable », ce qui est vrai.
 */
create or replace function public.social_person(p_user_id uuid)
returns jsonb
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select jsonb_build_object('handle', up.handle, 'displayName', up.display_name)
     from public.user_profiles up
     where up.user_id = p_user_id),
    jsonb_build_object('handle', null, 'displayName', null)
  );
$$;
revoke all on function public.social_person(uuid) from public, anon, authenticated;

-- ═══ §9. social_graph — CE QUE L'ÉCRAN E57 LIT ═════════════════════════════
/**
 * Mes suivis, mes abonnés, mes amis, mes demandes (reçues et envoyées).
 *
 * ── CE QUI N'Y EST PAS, ET POURQUOI ────────────────────────────────────────
 * · AUCUNE SUGGESTION. game-rules `SOCIAL_SUGGESTIONS_SOURCE_EXISTS = false` :
 *   il n'existe ni import de contacts (aucune permission Contacts dans
 *   app.json) ni source de proximité qui ne révélerait pas une présence
 *   géographique. Un tableau `suggestions: []` serait déjà un demi-mensonge
 *   (« il n'y en a pas AUJOURD'HUI »), alors que la vérité est « il n'y a pas
 *   de source ». La clé est donc `suggestionsSource: 'none'`, et l'écran le dit.
 * · AUCUN AMI D'AMI. Le graphe ne se traverse jamais à la profondeur 2 : c'est
 *   la fuite classique d'un écran social, et elle n'est pas nécessaire ici.
 * · AUCUN COMPTE GLOBAL DU JEU (« 12 340 joueurs ») : la base est vide et un
 *   chiffre pareil serait faux dans les deux sens.
 *
 * Chaque section est bornée à `social_list_rows_limit()`, et rend le TOTAL
 * réel à côté — sans quoi « 200 amis » sur 340 serait un chiffre faux.
 */
create or replace function public.social_graph()
returns jsonb
language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_limit  integer := public.social_list_rows_limit();
  v_me     jsonb;
  v_following jsonb; v_followers jsonb; v_friends jsonb;
  v_in     jsonb; v_out jsonb;
  v_n_following int; v_n_followers int; v_n_friends int; v_n_in int; v_n_out int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_me := public.social_person(v_uid);

  -- ── Suivis (« suit ») ────────────────────────────────────────────────────
  select count(*) into v_n_following from public.follows f where f.follower_id = v_uid;
  select coalesce(jsonb_agg(p order by p->>'handle'), '[]'::jsonb) into v_following
  from (
    select public.social_person(f.followee_id) as p
    from public.follows f
    where f.follower_id = v_uid
    order by f.created_at desc
    limit v_limit
  ) s;

  -- ── Abonnés ──────────────────────────────────────────────────────────────
  select count(*) into v_n_followers from public.follows f where f.followee_id = v_uid;
  select coalesce(jsonb_agg(p order by p->>'handle'), '[]'::jsonb) into v_followers
  from (
    select public.social_person(f.follower_id) as p
    from public.follows f
    where f.followee_id = v_uid
    order by f.created_at desc
    limit v_limit
  ) s;

  -- ── Amis (amitié ACCEPTÉE, quel que soit qui a demandé) ──────────────────
  select count(*) into v_n_friends
  from public.friendships fr
  where fr.status = 'accepted' and v_uid in (fr.requester_id, fr.addressee_id);
  select coalesce(jsonb_agg(p order by p->>'handle'), '[]'::jsonb) into v_friends
  from (
    select public.social_person(
      case when fr.requester_id = v_uid then fr.addressee_id else fr.requester_id end
    ) as p
    from public.friendships fr
    where fr.status = 'accepted' and v_uid in (fr.requester_id, fr.addressee_id)
    order by fr.updated_at desc
    limit v_limit
  ) s;

  -- ── Demandes REÇUES : les seules qui portent un `id`, parce que ce sont les
  --    seules sur lesquelles j'ai une décision à prendre. ───────────────────
  select count(*) into v_n_in
  from public.friendships fr where fr.status = 'pending' and fr.addressee_id = v_uid;
  select coalesce(jsonb_agg(x order by x->>'handle'), '[]'::jsonb) into v_in
  from (
    select public.social_person(fr.requester_id) || jsonb_build_object('id', fr.id) as x
    from public.friendships fr
    where fr.status = 'pending' and fr.addressee_id = v_uid
    order by fr.created_at desc
    limit v_limit
  ) s;

  -- ── Demandes ENVOYÉES : pas d'`id`. Une demande envoyée ne se « retire »
  --    pas dans cette version — et un id sans action serait une promesse.
  select count(*) into v_n_out
  from public.friendships fr where fr.status = 'pending' and fr.requester_id = v_uid;
  select coalesce(jsonb_agg(p order by p->>'handle'), '[]'::jsonb) into v_out
  from (
    select public.social_person(fr.addressee_id) as p
    from public.friendships fr
    where fr.status = 'pending' and fr.requester_id = v_uid
    order by fr.created_at desc
    limit v_limit
  ) s;

  return jsonb_build_object(
    'ok',        true,
    'me',        v_me,
    'following', v_following, 'followingTotal', v_n_following,
    'followers', v_followers, 'followersTotal', v_n_followers,
    'friends',   v_friends,   'friendsTotal',   v_n_friends,
    'requestsIn',  v_in,  'requestsInTotal',  v_n_in,
    'requestsOut', v_out, 'requestsOutTotal', v_n_out,
    'rowsLimit', v_limit,
    -- game-rules: SOCIAL_SUGGESTIONS_SOURCE_EXISTS = false. Ce n'est pas
    -- « aucune suggestion aujourd'hui », c'est « aucune source de suggestions ».
    'suggestionsSource', 'none',
    'importedFriendsSource', 'none'
  );
end;
$$;

-- ═══ §10. follow_user / unfollow_user ══════════════════════════════════════
/**
 * Suivre quelqu'un DONT ON A LE @HANDLE. Le serveur tranche tout : existence,
 * visibilité, blocage, plafond quotidien.
 *
 * ORDRE DES CONTRÔLES : identité → forme → résolution → soi-même → blocage →
 * déjà suivi (idempotent, AVANT le plafond : re-suivre quelqu'un qu'on suit
 * déjà ne doit pas consommer un quota) → plafond → écriture.
 */
create or replace function public.follow_user(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_state  jsonb;
  v_today  integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if char_length(btrim(coalesce(p_handle, ''))) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_handle');
  end if;

  v_target := public.social_resolve_handle(p_handle);
  if v_target is null then
    -- Handle inconnu OU profil privé : la même réponse pour les deux, sinon la
    -- distinction elle-même révélerait l'existence d'un compte privé.
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_target = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  v_state := public.social_pair_state(v_uid, v_target);
  if (v_state->>'blocked')::boolean then
    -- Un blocage ne se raconte pas : la personne bloquée n'apprend rien.
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if (v_state->>'iFollow')::boolean then
    return jsonb_build_object('ok', true, 'already', true,
                             'person', public.social_person(v_target));
  end if;

  select count(*) into v_today
  from public.follows f
  where f.follower_id = v_uid and f.created_at > now() - interval '24 hours';
  if v_today >= public.social_follow_max_per_day() then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited',
                             'maxPerDay', public.social_follow_max_per_day());
  end if;

  insert into public.follows (follower_id, followee_id)
  values (v_uid, v_target)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'already', false,
                           'person', public.social_person(v_target));
end;
$$;

/** Se désabonner. TOUJOURS possible, sans condition, sans délai, sans plafond :
 *  un lien qu'on ne peut pas défaire n'est pas un lien, c'est une prise. */
create or replace function public.unfollow_user(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  -- On ne passe PAS par social_resolve_handle : il refuse les profils privés,
  -- et quelqu'un qui passe son profil en privé après coup doit rester
  -- « désuivable ». On cherche donc dans MES arêtes, ce qui est de toute façon
  -- la seule chose que j'ai le droit de défaire.
  select f.followee_id into v_target
  from public.follows f
  join public.user_profiles up on up.user_id = f.followee_id
  where f.follower_id = v_uid and up.handle = lower(btrim(coalesce(p_handle, '')));
  if v_target is null then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  delete from public.follows where follower_id = v_uid and followee_id = v_target;
  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

-- ═══ §11. friend_request / friend_respond ══════════════════════════════════
/**
 * Demander en ami. Une DEMANDE : elle n'établit rien, elle attend une réponse.
 *
 * TROIS GARDE-FOUS, dans cet ordre :
 *   1. blocage → réponse indistinguable de « inconnu » ;
 *   2. cooldown après refus (SOCIAL_FRIEND_REQUEST_COOLDOWN_DAYS) — sans lui,
 *      « non » ne serait qu'une invitation à recommencer ;
 *   3. plafond de demandes EN ATTENTE (SOCIAL_FRIEND_REQUESTS_MAX_PENDING).
 *
 * CAS PARTICULIER, ET IL COMPTE : si la personne m'a DÉJÀ demandé, ma demande
 * vaut ACCEPTATION. Sans ça, deux personnes qui se demandent mutuellement
 * resteraient bloquées par l'index d'unicité de paire (0011), chacune croyant
 * avoir demandé.
 */
create or replace function public.friend_request(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_target  uuid;
  v_state   jsonb;
  v_row     public.friendships%rowtype;
  /**
   * ⚠ PIÈGE PL/pgSQL, ET IL A MORDU : `FOUND` est RÉÉCRIT par CHAQUE ordre SQL,
   * y compris un `select count(*) into …`, qui rend TOUJOURS une ligne et pose
   * donc `FOUND = true`. Le `if found then update … else insert` de la fin
   * partait alors systématiquement en UPDATE, sur `where id = NULL` : zéro
   * ligne touchée, aucune erreur, et la fonction rendait « demande émise »
   * alors que la table restait vide. On CAPTURE donc l'existence dans une
   * variable, immédiatement après le SELECT qui la mesure.
   */
  v_exists  boolean;
  v_pending integer;
  v_last    timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  v_target := public.social_resolve_handle(p_handle);
  if v_target is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_target = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  v_state := public.social_pair_state(v_uid, v_target);
  if (v_state->>'blocked')::boolean then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if (v_state->>'friend')::boolean then
    return jsonb_build_object('ok', true, 'status', 'accepted', 'already', true);
  end if;

  select * into v_row from public.friendships fr
  where least(fr.requester_id, fr.addressee_id) = least(v_uid, v_target)
    and greatest(fr.requester_id, fr.addressee_id) = greatest(v_uid, v_target);
  v_exists := found; -- cf. le piège FOUND documenté plus haut

  -- Demande CROISÉE → acceptation immédiate (cf. docblock).
  if v_exists and v_row.status = 'pending' and v_row.addressee_id = v_uid then
    update public.friendships set status = 'accepted', updated_at = now() where id = v_row.id;
    return jsonb_build_object('ok', true, 'status', 'accepted', 'already', false,
                              'person', public.social_person(v_target));
  end if;
  if v_exists and v_row.status = 'pending' and v_row.requester_id = v_uid then
    return jsonb_build_object('ok', true, 'status', 'pending', 'already', true);
  end if;

  -- Cooldown après un refus : il porte sur la PAIRE, pas sur le sens.
  if v_exists and v_row.status = 'rejected' then
    v_last := coalesce(v_row.updated_at, v_row.created_at);
    if v_last > now() - (public.social_friend_request_cooldown_days() || ' days')::interval then
      return jsonb_build_object('ok', false, 'reason', 'cooldown',
                                'cooldownDays', public.social_friend_request_cooldown_days());
    end if;
  end if;

  select count(*) into v_pending
  from public.friendships fr
  where fr.requester_id = v_uid and fr.status = 'pending';
  if v_pending >= public.social_friend_requests_max_pending() then
    return jsonb_build_object('ok', false, 'reason', 'too_many_pending',
                              'maxPending', public.social_friend_requests_max_pending());
  end if;

  if v_exists then
    -- Une ligne 'rejected' hors cooldown est RÉUTILISÉE : l'index d'unicité de
    -- paire (0011) interdit d'en insérer une seconde.
    update public.friendships
       set requester_id = v_uid, addressee_id = v_target,
           status = 'pending', updated_at = now()
     where id = v_row.id;
  else
    insert into public.friendships (requester_id, addressee_id, status)
    values (v_uid, v_target, 'pending');
  end if;

  return jsonb_build_object('ok', true, 'status', 'pending', 'already', false,
                            'person', public.social_person(v_target));
end;
$$;

/**
 * Répondre à une demande d'ami. SEUL le destinataire répond — un émetteur qui
 * pourrait « accepter » sa propre demande n'aurait jamais rien demandé.
 * Refuser ne demande AUCUN motif et n'envoie AUCUNE notification de refus :
 * `refuse sans friction et sans culpabilisation` vaut des deux côtés.
 */
create or replace function public.friend_respond(p_request_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.friendships%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  select * into v_row from public.friendships where id = p_request_id;
  if not found or v_row.addressee_id <> v_uid then
    -- « Pas à moi » et « n'existe pas » se répondent pareil : sinon l'écart
    -- permettrait de sonder les demandes des autres par leur identifiant.
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending', 'status', v_row.status);
  end if;

  update public.friendships
     set status = case when p_accept then 'accepted' else 'rejected' end,
         updated_at = now()
   where id = v_row.id;

  return jsonb_build_object('ok', true,
                            'status', case when p_accept then 'accepted' else 'rejected' end);
end;
$$;

-- ═══ §12. duel_create — E58, LA SOLLICITATION ══════════════════════════════
/**
 * Défier quelqu'un. Le serveur tranche : lien préexistant, format, fenêtre,
 * unicité, cooldown, plafond.
 *
 * ── LE LIEN PRÉEXISTANT EST LA RÈGLE CENTRALE ──────────────────────────────
 * On ne défie que quelqu'un avec qui on a DÉJÀ un lien consenti : amitié
 * acceptée, ou suivi RÉCIPROQUE (je le suis ET il me suit). Un suivi
 * unilatéral ne suffit pas — sinon suivre quelqu'un serait le moyen de
 * s'autoriser à le solliciter, ce qui reviendrait à prendre un lien.
 *
 * ── LES QUATRE FORMATS (spec E58), ET CE QU'ILS EXIGENT ────────────────────
 *   surface_period → une cible de surface sur la fenêtre (target_value) ;
 *   loops          → un nombre de boucles (target_value entier) ;
 *   defend_zone    → un LIBELLÉ de zone publique (zone_label), pas de cible ;
 *   distance       → une distance sportive (target_value).
 *
 * ── CE QU'IL N'ÉCRIT PAS ───────────────────────────────────────────────────
 * Aucune mise, aucun enjeu, aucun point, aucun territoire, aucune notification
 * push (la file `push_devices` de 0048 n'est PAS touchée : la boîte de
 * réception E58 se lit, elle ne poursuit personne).
 */
create or replace function public.duel_create(
  p_handle      text,
  p_kind        text,
  p_period_days integer,
  p_activity    text    default 'run',
  p_target      numeric default null,
  p_zone_label  text    default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_target  uuid;
  v_state   jsonb;
  v_zone    text;
  v_zone_refusal text;
  v_pending integer;
  v_last    timestamptz;
  v_id      uuid;
  v_expires timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_target := public.social_resolve_handle(p_handle);
  if v_target is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_target = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  v_state := public.social_pair_state(v_uid, v_target);
  if (v_state->>'blocked')::boolean then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  -- LIEN PRÉEXISTANT (cf. docblock). Ni ami, ni suivi réciproque → refus net,
  -- avec un motif que l'écran peut expliquer.
  if not ((v_state->>'friend')::boolean
          or ((v_state->>'iFollow')::boolean and (v_state->>'followsMe')::boolean)) then
    return jsonb_build_object('ok', false, 'reason', 'no_relation');
  end if;

  -- ── Format ───────────────────────────────────────────────────────────────
  -- game-rules: DUEL_KINDS
  if p_kind is null or p_kind not in ('surface_period', 'loops', 'defend_zone', 'distance') then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;
  if p_activity is null or p_activity not in ('run', 'bike') then
    return jsonb_build_object('ok', false, 'reason', 'bad_activity');
  end if;
  -- game-rules: DUEL_PERIOD_DAYS_MIN / DUEL_PERIOD_DAYS_MAX
  if p_period_days is null or p_period_days < 1 or p_period_days > 14 then
    return jsonb_build_object('ok', false, 'reason', 'bad_period');
  end if;

  v_zone := nullif(btrim(coalesce(p_zone_label, '')), '');
  if p_kind = 'defend_zone' then
    if v_zone is null or char_length(v_zone) > 80 then
      return jsonb_build_object('ok', false, 'reason', 'bad_zone');
    end if;
    if p_target is not null then
      return jsonb_build_object('ok', false, 'reason', 'bad_target');
    end if;

    -- ── VIE PRIVÉE DU LIBELLÉ (constitution §7 ; spec §12) ─────────────────
    -- `zone_label` est le SEUL champ de texte libre de tout E58, et il voyage :
    -- `duel_inbox` le ressert VERBATIM au destinataire. Un champ qui part chez
    -- un autre humain sans garde serveur, c'est exactement la faute constatée
    -- en vague 4 — et l'écran, lui, la connaissait déjà : sa note dit « Un lieu
    -- public uniquement : ce libellé part chez l'autre personne, et une adresse
    -- n'a rien à y faire » (i18n/catalog/social.ts). Un AVERTISSEMENT N'EST PAS
    -- UNE PROTECTION : au moment où l'écran conseille, rien n'empêche l'envoi.
    --
    -- Les deux gardes existaient déjà dans le dépôt, testées, et n'étaient pas
    -- appelées ici. Elles le sont, dans le MÊME ordre et avec la MÊME doctrine
    -- de motif que `crew_outing_create` (0085:498-519) :
    --   1. `crew_outing_place_refusal` (0085:236) — adresse de voie ou détail de
    --      porte. Motif RENDU au joueur (`kind`) : il n'essaie pas de
    --      contourner, il essaie d'être utile ; lui dire quoi corriger est ce
    --      qui le fait corriger.
    --   2. `crew_description_refusal` (0084:193) — modération de prose. Motif
    --      OPAQUE (doctrine 0050) : le détailler serait un mode d'emploi du
    --      contournement.
    -- Sans ça, un défi devenait un canal de texte libre non modéré entre deux
    -- personnes, et un joueur pouvait publier son adresse de départ chez un tiers.
    v_zone_refusal := public.crew_outing_place_refusal(v_zone);
    if v_zone_refusal is not null then
      return jsonb_build_object(
        'ok', false,
        'reason', 'zone_looks_like_address',
        'kind', v_zone_refusal
      );
    end if;
    if public.crew_description_refusal(v_zone) is not null then
      return jsonb_build_object('ok', false, 'reason', 'zone_unavailable');
    end if;
  else
    v_zone := null; -- un libellé de zone sur un autre format serait un champ qui ment
    if p_target is null or p_target <= 0 then
      return jsonb_build_object('ok', false, 'reason', 'bad_target');
    end if;
  end if;

  -- ── Un seul défi ouvert par paire ────────────────────────────────────────
  if exists (
    select 1 from public.duels d
    where d.status = 'pending'
      and least(d.challenger_id, d.opponent_id) = least(v_uid, v_target)
      and greatest(d.challenger_id, d.opponent_id) = greatest(v_uid, v_target)
      and d.expires_at > now()
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_pending');
  end if;

  -- ── Cooldown anti-relance (refus OU expiration, sur la PAIRE) ────────────
  select max(coalesce(d.responded_at, d.expires_at)) into v_last
  from public.duels d
  where d.status in ('declined', 'expired')
    and least(d.challenger_id, d.opponent_id) = least(v_uid, v_target)
    and greatest(d.challenger_id, d.opponent_id) = greatest(v_uid, v_target);
  -- Un défi encore marqué 'pending' mais EXPIRÉ compte aussi : sinon laisser
  -- pourrir un défi rendrait le cooldown contournable en n'y touchant jamais.
  select greatest(coalesce(v_last, '-infinity'::timestamptz), coalesce(max(d.expires_at), '-infinity'::timestamptz))
  into v_last
  from public.duels d
  where d.status = 'pending' and d.expires_at <= now()
    and least(d.challenger_id, d.opponent_id) = least(v_uid, v_target)
    and greatest(d.challenger_id, d.opponent_id) = greatest(v_uid, v_target);
  if v_last is not null
     and v_last > now() - (public.duel_retry_cooldown_hours() || ' hours')::interval then
    return jsonb_build_object('ok', false, 'reason', 'cooldown',
                              'cooldownHours', public.duel_retry_cooldown_hours());
  end if;

  -- ── Plafond de défis en attente ÉMIS ─────────────────────────────────────
  select count(*) into v_pending
  from public.duels d
  where d.challenger_id = v_uid and d.status = 'pending' and d.expires_at > now();
  if v_pending >= public.duel_max_pending_sent() then
    return jsonb_build_object('ok', false, 'reason', 'too_many_pending',
                              'maxPending', public.duel_max_pending_sent());
  end if;

  v_expires := now() + (public.duel_expiry_hours() || ' hours')::interval;
  insert into public.duels (challenger_id, opponent_id, kind, activity, period_days,
                            target_value, zone_label, status, expires_at)
  values (v_uid, v_target, p_kind, p_activity, p_period_days, p_target, v_zone, 'pending', v_expires)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'expiresAt', v_expires,
                            'person', public.social_person(v_target));
end;
$$;

-- ═══ §13. duel_respond — LE REFUS EST UN TAP, ET IL NE COÛTE RIEN ══════════
/**
 * Accepter ou refuser un défi reçu. Le destinataire seul répond.
 *
 * REFUSER N'EXIGE AUCUN MOTIF, et il n'existe aucun champ pour en écrire un :
 * un formulaire de refus est une culpabilisation déguisée. L'émetteur voit son
 * défi passer à `declined`, sans texte, et ne peut pas relancer avant
 * DUEL_RETRY_COOLDOWN_HOURS.
 *
 * `cancelled` est réservé à l'ÉMETTEUR (`duel_cancel`) : un défi qu'on a envoyé
 * par erreur doit pouvoir être retiré, sinon l'émetteur non plus n'est pas
 * libre.
 */
create or replace function public.duel_respond(p_duel_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.duels%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  select * into v_row from public.duels where id = p_duel_id;
  if not found or v_row.opponent_id <> v_uid then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending', 'status', v_row.status);
  end if;
  if v_row.expires_at <= now() then
    -- Il a expiré tout seul : on le CONSTATE plutôt que de laisser accepter un
    -- défi mort. Le destinataire n'a rien à se reprocher, il n'a rien refusé.
    update public.duels set status = 'expired' where id = v_row.id;
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  update public.duels
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where id = v_row.id;

  return jsonb_build_object('ok', true,
                            'status', case when p_accept then 'accepted' else 'declined' end);
end;
$$;

/** Retirer un défi qu'on a envoyé, tant qu'il n'a pas reçu de réponse. */
create or replace function public.duel_cancel(p_duel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.duels%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  select * into v_row from public.duels where id = p_duel_id;
  if not found or v_row.challenger_id <> v_uid then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending', 'status', v_row.status);
  end if;
  update public.duels set status = 'cancelled', responded_at = now() where id = v_row.id;
  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;

-- ═══ §14. duel_inbox — ce que l'écran E58 LIT ══════════════════════════════
/**
 * Mes défis : reçus en attente, envoyés en attente, et acceptés en cours.
 *
 * L'EXPIRATION EST APPLIQUÉE À LA LECTURE, sans cron : un `pending` dont
 * `expires_at` est passé est rendu `expired`. Aucun `cron.schedule` n'est posé
 * ici — 0038/0039 en portent déjà, et un job de plus pour changer un mot d'état
 * serait une pièce mobile pour rien. La conséquence est assumée et testée :
 * `duel_create` et `duel_respond` traitent eux aussi un pending périmé comme
 * expiré, donc aucune décision ne s'appuie sur l'affichage.
 *
 * AUCUN SCORE N'EST RENDU. Le défi est ACCEPTÉ, il n'est pas ARBITRÉ : le
 * moteur qui mesurerait une surface sur une fenêtre et déciderait d'un vainqueur
 * n'existe pas (cf. le suspens en fin de fichier). Rendre un score aujourd'hui
 * serait l'inventer.
 */
create or replace function public.duel_inbox()
returns jsonb
language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_limit integer := public.social_list_rows_limit();
  v_in jsonb; v_out jsonb; v_active jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]'::jsonb) into v_in
  from (
    select jsonb_build_object(
      'id', d.id, 'kind', d.kind, 'activity', d.activity, 'periodDays', d.period_days,
      'target', d.target_value, 'zoneLabel', d.zone_label,
      'expiresAt', d.expires_at, 'createdAt', d.created_at,
      'from', public.social_person(d.challenger_id)
    ) as x
    from public.duels d
    where d.opponent_id = v_uid and d.status = 'pending' and d.expires_at > now()
    order by d.created_at desc limit v_limit
  ) s;

  select coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]'::jsonb) into v_out
  from (
    select jsonb_build_object(
      'id', d.id, 'kind', d.kind, 'activity', d.activity, 'periodDays', d.period_days,
      'target', d.target_value, 'zoneLabel', d.zone_label,
      'expiresAt', d.expires_at, 'createdAt', d.created_at,
      'to', public.social_person(d.opponent_id)
    ) as x
    from public.duels d
    where d.challenger_id = v_uid and d.status = 'pending' and d.expires_at > now()
    order by d.created_at desc limit v_limit
  ) s;

  select coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]'::jsonb) into v_active
  from (
    select jsonb_build_object(
      'id', d.id, 'kind', d.kind, 'activity', d.activity, 'periodDays', d.period_days,
      'target', d.target_value, 'zoneLabel', d.zone_label,
      'createdAt', d.created_at, 'respondedAt', d.responded_at,
      'with', public.social_person(
        case when d.challenger_id = v_uid then d.opponent_id else d.challenger_id end),
      'iChallenged', d.challenger_id = v_uid
    ) as x
    from public.duels d
    where d.status = 'accepted' and v_uid in (d.challenger_id, d.opponent_id)
    order by d.created_at desc limit v_limit
  ) s;

  return jsonb_build_object(
    'ok', true,
    'incoming', v_in, 'outgoing', v_out, 'active', v_active,
    'expiryHours', public.duel_expiry_hours(),
    'maxPendingSent', public.duel_max_pending_sent(),
    -- Le défi n'est pas arbitré (cf. docblock) : l'écran doit le SAVOIR pour ne
    -- pas peindre un score. Un booléen explicite vaut mieux qu'une absence de
    -- clé, qu'un client pourrait interpréter comme « 0 ».
    'scoringExists', false
  );
end;
$$;

-- ═══ §15. Privilèges — le client EXÉCUTE, il n'écrit jamais en table ═══════
revoke all on function public.social_graph()                       from public, anon;
revoke all on function public.follow_user(text)                    from public, anon;
revoke all on function public.unfollow_user(text)                  from public, anon;
revoke all on function public.friend_request(text)                 from public, anon;
revoke all on function public.friend_respond(uuid, boolean)        from public, anon;
revoke all on function public.duel_create(text, text, integer, text, numeric, text)
                                                                   from public, anon;
revoke all on function public.duel_respond(uuid, boolean)          from public, anon;
revoke all on function public.duel_cancel(uuid)                    from public, anon;
revoke all on function public.duel_inbox()                         from public, anon;

grant execute on function public.social_graph()                    to authenticated;
grant execute on function public.follow_user(text)                 to authenticated;
grant execute on function public.unfollow_user(text)               to authenticated;
grant execute on function public.friend_request(text)              to authenticated;
grant execute on function public.friend_respond(uuid, boolean)     to authenticated;
grant execute on function public.duel_create(text, text, integer, text, numeric, text)
                                                                   to authenticated;
grant execute on function public.duel_respond(uuid, boolean)       to authenticated;
grant execute on function public.duel_cancel(uuid)                 to authenticated;
grant execute on function public.duel_inbox()                      to authenticated;

-- Réaffirmé ici pour que la migration se lise seule (0011 le disait déjà pour
-- friendships) : aucune écriture directe, jamais.
revoke insert, update, delete on public.friendships from anon, authenticated;
revoke insert, update, delete on public.follows     from anon, authenticated;
revoke insert, update, delete on public.duels       from anon, authenticated;

-- ═══ §16. CE QUI RESTE EN SUSPENS (dit ici, pas promis ailleurs) ═══════════
-- · L'ARBITRAGE D'UN DÉFI. Aucun moteur ne mesure « surface sur 7 jours » ni
--   « nombre de boucles » PAR JOUEUR sur une fenêtre, et n'en désigne le
--   vainqueur. `duel_inbox()` rend donc `scoringExists: false` et AUCUN score.
--   Le jour où ce moteur existera, il ajoutera des colonnes de résultat — il ne
--   changera pas le sens de celles-ci.
-- · LA NOTIFICATION D'UN DÉFI REÇU. `push_devices` (0048) existe, mais aucune
--   Edge Function n'est branchée ici : un défi se découvre en ouvrant l'écran.
--   C'est un manque, pas une faute — pousser une sollicitation vers l'écran de
--   verrouillage de quelqu'un demande une décision de produit qui n'est pas
--   prise.
-- · LE BLOCAGE EXPLICITE. `friendships.status = 'blocked'` est LU par toutes les
--   fonctions ci-dessus (et rend la personne invisible), mais AUCUNE RPC ne
--   l'ÉCRIT : il n'y a pas encore d'écran « bloquer quelqu'un ». La lecture est
--   posée pour que le jour où cet écran existera, rien n'ait à être rouvert.
-- · L'IMPORT DE CONTACTS et LES SUGGESTIONS LOCALES (spec E57) : sans source,
--   cf. game-rules SOCIAL_SUGGESTIONS_SOURCE_EXISTS.
