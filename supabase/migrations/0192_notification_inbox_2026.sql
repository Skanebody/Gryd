-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — LA BOÎTE DE RÉCEPTION DEVIENT LISIBLE (§14.2, §14.3).
--
-- Fondateur, 11/09/2026 : « mets en place un producteur de notification, les
-- notifications doivent être courtes avec un emoji ». Cette migration pose la
-- LECTURE et le CATALOGUE ; 0193 pose les producteurs.
--
-- ─── LE DÉFAUT, MESURÉ AVANT D'ÉCRIRE UNE LIGNE ────────────────────────────
-- Au 11/09/2026 : 0140 range les préférences, 0141 arbitre le budget, et
-- `claim_notification_2026` n'a que TROIS appelants (0186, parrainage). Aucun
-- écran ne lit `public.notifications` sauf `useSeasonRecap` (type 'season'),
-- `app/activite.tsx` est un centre d'activité ORPHELIN (aucun `router.push`
-- vers `/activite` dans tout le dépôt) branché sur des sources d'avant la
-- refonte (`user_badges`, `territory_contests`), et `useActivityBell` n'est
-- importé nulle part. Le moteur décidait donc dans le vide, et les faits du jeu
-- n'arrivaient à personne.
--
-- ─── POURQUOI PAS DE TABLE `notification_inbox_2026` ───────────────────────
-- Parce qu'une boîte de réception existe déjà et qu'elle est bonne :
-- `public.notifications` (0006) porte la RLS propriétaire en lecture, le
-- `grant update (read_at)` au seul concerné, l'index des non-lus, la
-- publication temps réel (0020), et depuis 0188 la colonne `event_id` avec son
-- index unique partiel — la déduplication de §14.3 en CONTRAINTE. 0188 avait
-- déjà tranché la question en toutes lettres : « En créer une seconde aurait
-- donné deux inbox à réconcilier ». Créer `notification_inbox_2026` aurait
-- laissé les six faits de crew d'un côté et tout le reste de l'autre, avec deux
-- compteurs de non-lus qui se contrediraient. Le nom de fichier réservé est
-- conservé ; la table, non.
--
-- ─── LA RÈGLE ÉCRITE : QUAND UN REFUS ENTRE QUAND MÊME DANS LA BOÎTE ───────
-- §14.2 met « centre d'activité » et « push si demandé » dans DEUX colonnes :
-- ce sont deux canaux, pas un. §14.1 borne « 3 sollicitations non
-- transactionnelles par semaine, push et email confondus » — une sollicitation
-- va CHERCHER quelqu'un ; une ligne de boîte de réception attend qu'on ouvre
-- l'application. Le budget gouverne donc l'un et pas l'autre, et 0188 l'avait
-- déjà appliqué à ses six faits de crew.
--
-- D'où la règle que `claim_notification_2026` applique désormais, refus par
-- refus :
--   · `allowed`                  → ligne de réception ET budget consommé ;
--   · `quiet_hours`,
--     `activity_in_progress`,
--     `daily_budget`,
--     `weekly_budget`,
--     `monthly_offer_budget`     → ligne de réception, budget INTACT. Ces cinq
--     refus disent « pas maintenant, pas comme ça », jamais « ce fait est
--     faux ». Les taire reviendrait à ce qu'un joueur ne sache JAMAIS qu'il a
--     été averti parce qu'un autre message était passé le matin même ;
--   · `category_off`, `game_paused` → ligne de réception aussi. Le réglage
--     coupe les SOLLICITATIONS ; il n'efface pas l'histoire du compte. Un
--     avertissement de crew invisible parce que la catégorie est décochée, et
--     le retrait qui suit devient incompréhensible — le mensonge exact que L8
--     interdit. Ce que le joueur a coupé ne le RÉVEILLE plus ; il le retrouve
--     quand il vient ;
--   · `event_invalid`, `blocked` → RIEN. §14.3 demande d'« annuler un message
--     devenu faux » et « jamais si auteur bloqué » : ces deux-là ne sont pas
--     des reports, ce sont des messages qui ne doivent pas exister ;
--   · `duplicate` → rien de neuf, par construction (l'index unique).
--
-- ─── AUCUNE PHRASE N'EST ÉCRITE EN BASE ────────────────────────────────────
-- Le catalogue fige la CATÉGORIE, la transactionnalité, la priorité, l'EMOJI,
-- le préfixe d'identifiant et le modèle de lien. Le titre et le corps vivent
-- dans `apps/mobile/src/i18n/catalog/notifications.ts`, où le type impose les
-- cinq langues. Même décision qu'en 0188, pour la même raison : du français en
-- base fige un message en une seule langue (L18). L'emoji, lui, EST en base :
-- il ne se traduit pas, et le figer empêche deux producteurs d'en choisir deux
-- pour le même fait.
--
-- Miroir TypeScript : `NOTIFICATION_EVENTS_2026` (packages/shared). Le test
-- PGlite compare les deux catalogues clé par clé, champ par champ, EMOJI
-- COMPRIS, et vérifie en plus que les six faits de crew coïncident avec
-- `crew_notification_event_2026` (0188). Une divergence ne peut pas se taire.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. LES TROIS FAMILLES QUI MANQUAIENT À `notifications.type` ────────────
-- `crew` et `reward` existaient (0006, 0188). `capture`, `result` et `event`
-- nomment les trois familles que 0193 produit. Rien n'est retiré : les valeurs
-- historiques restent valides, et les lignes déjà écrites restent lisibles.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('steal', 'decay_warning', 'streak', 'digest', 'reward', 'season',
                  'system', 'crew', 'capture', 'result', 'event'));

-- ── 2. LE CATALOGUE GELÉ ───────────────────────────────────────────────────
/**
 * MIROIR EXACT de `NOTIFICATION_EVENTS_2026` (packages/shared/src/game-rules.ts).
 * Les 21 lignes ont été GÉNÉRÉES depuis ce fichier, emoji compris, puis figées
 * ici : le test PGlite relit la source TypeScript et compare.
 *
 * `deep_link` est un MODÈLE : `{clé}` nomme une clé du payload. `null` veut dire
 * « ce message n'ouvre rien », et c'est un fait — retiré d'un crew ou membre
 * d'un crew dissous, il n'existe plus d'écran de ce crew pour toi. L'écran ne
 * peint alors aucune affordance de tap (« aucun bouton mort »).
 */
create function public.notification_kinds_2026()
returns table(
  kind text, category text, transactional boolean, priority smallint,
  emoji text, family text, event_id_prefix text, deep_link text)
language sql immutable set search_path = public, pg_temp as $$
  select *
  from (values
    ('capture_published','sport',false,3,'🏁','capture','capture_published:','/course/{runId}'),
    ('result_pending','results',true,2,'⏳','result','result_pending:','/course/{runId}'),
    ('result_ready','results',true,1,'✅','result','result_ready:','/course/{runId}'),
    ('result_refused','results',true,1,'⛔','result','result_refused:','/course/{runId}'),
    ('weekly_quest_done','sport',false,3,'🎯','reward','weekly_quest_done:','/defis-semaine'),
    ('level_reward','results',false,3,'🏅','reward','level_reward:','/season'),
    ('referral_completed','results',false,3,'🎁','reward','referral_completed:','/parrainage'),
    ('crew_joined','crew',false,2,'👋','crew','crew_joined:','/crew'),
    ('crew_member_joined','crew',false,3,'👥','crew','crew_member_joined:','/crew'),
    ('crew_announcement','crew',false,3,'📣','crew','crew_announcement:','/crew-feed'),
    ('crew_challenge_started','crew',false,3,'⚔️','crew','crew_challenge_started:','/crew-challenges'),
    ('crew_challenge_ended','crew',false,2,'🏆','crew','crew_challenge_ended:','/crew-challenges'),
    ('crew_outing_proposed','events',false,3,'📅','event','crew_outing_proposed:','/crew-sortie'),
    ('crew_outing_changed','events',true,2,'🔁','event','crew_outing_changed:','/crew-sortie'),
    ('crew_outing_cancelled','events',true,1,'🚫','event','crew_outing_cancelled:','/crew-sortie'),
    ('application_received','crew',false,3,'📥','crew','crew_application_received:','/crew-gestion'),
    ('invited','crew',false,2,'✉️','crew','crew_invited:','/crew-rejoindre'),
    ('charter_updated','crew',false,4,'📜','crew','crew_charter_updated:','/crew-regles'),
    ('warning_issued','crew',true,2,'⚠️','crew','crew_warning_issued:','/crew-ma-situation'),
    ('removed','crew',true,1,'🚪','crew','crew_removed:',null),
    ('dissolved','crew',true,1,'📕','crew','crew_dissolved:',null)
  ) as c(kind, category, transactional, priority, emoji, family, event_id_prefix, deep_link)
$$;

create function public.notification_kind_2026(p_kind text)
returns jsonb language sql immutable set search_path = public, pg_temp as $$
  select jsonb_build_object(
      'category', k.category, 'transactional', k.transactional,
      'priority', k.priority, 'emoji', k.emoji, 'family', k.family,
      'eventIdPrefix', k.event_id_prefix, 'deepLink', k.deep_link)
    from public.notification_kinds_2026() k where k.kind = p_kind
$$;

/** L'identifiant d'événement de §14.3 : préfixe du catalogue + clé du fait. */
create function public.notification_event_id_2026(p_kind text, p_key text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select k.event_id_prefix || coalesce(p_key,'')
    from public.notification_kinds_2026() k where k.kind = p_kind
$$;

/**
 * Le chemin INVERSE : d'un `event_id` déjà écrit vers son fait. Il sert aux
 * appelants HISTORIQUES de `claim_notification_2026` — le parrainage (0186)
 * passe un `event_id` complet et ne connaît pas ce catalogue.
 *
 * Le plus LONG préfixe gagne : deux préfixes dont l'un commence l'autre
 * (`crew_outing_changed:` et `crew_outing_change...`) ne se disputeraient pas
 * une ligne en silence.
 */
create function public.notification_kind_for_event_id_2026(p_event_id text)
returns text language sql stable set search_path = public, pg_temp as $$
  select k.kind from public.notification_kinds_2026() k
   where p_event_id like k.event_id_prefix || '%'
   order by length(k.event_id_prefix) desc limit 1
$$;

/**
 * Le lien RÉSOLU, ou `null`. Un modèle dont une clé manque au payload rend
 * `null` plutôt qu'un `/course/{runId}` littéral : mieux vaut une ligne qui ne
 * s'ouvre pas qu'un tap vers une page cassée (§14.3, « un appui sur une
 * notification expirée ouvre une explication, pas une page cassée »).
 */
create function public.notification_deep_link_2026(p_kind text, p_payload jsonb)
returns text language plpgsql immutable set search_path = public, pg_temp as $$
declare v_link text; v_key text;
begin
  select k.deep_link into v_link from public.notification_kinds_2026() k where k.kind = p_kind;
  if v_link is null then return null; end if;
  for v_key in select (regexp_matches(v_link, '\{([a-zA-Z0-9_]+)\}', 'g'))[1] loop
    if coalesce(p_payload, '{}'::jsonb) ->> v_key is null then return null; end if;
    v_link := replace(v_link, '{' || v_key || '}', p_payload ->> v_key);
  end loop;
  return v_link;
end $$;

/** Une ligne est LISIBLE si l'app sait la dire : un fait au catalogue, ou un
 *  titre déjà écrit par un job d'avant la refonte (`digest`, `season`, …). Une
 *  ligne sans l'un ni l'autre ne s'affiche pas — et ne se compte pas non plus,
 *  sans quoi la cloche montrerait un non-lu introuvable dans la liste. */
create function public.notification_renderable_2026(p_payload jsonb)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select public.notification_kind_2026(coalesce(p_payload,'{}'::jsonb) ->> 'event') is not null
      or coalesce(coalesce(p_payload,'{}'::jsonb) ->> 'title', '') <> ''
$$;

/** L'emoji des lignes d'AVANT ce lot, par famille. Elles portent leur texte
 *  mais aucun fait de catalogue : sans cette table, elles s'afficheraient nues
 *  à côté des autres. */
create function public.notification_legacy_emoji_2026(p_type text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case p_type
    when 'digest'        then '📊'
    when 'season'        then '🏁'
    when 'reward'        then '🏅'
    when 'streak'        then '🔥'
    when 'steal'         then '🗺️'
    when 'decay_warning' then '⏳'
    else 'ℹ️' end
$$;

-- ── 3. L'ÉCRITURE ──────────────────────────────────────────────────────────
/**
 * Écrit UN fait dans la boîte de réception. Rend `true` si la ligne est neuve,
 * `false` si le fait était déjà là (déduplication §14.3) ou si le destinataire
 * n'existe plus.
 *
 * NE CONSOMME PAS LE BUDGET §14.1 : voir l'en-tête. C'est `claim_notification_2026`
 * qui décide d'une SOLLICITATION, et lui seul écrit `notification_log_2026`.
 *
 * NE LÈVE PAS pour un destinataire inconnu : un compte supprimé entre-temps ne
 * doit pas faire échouer la transaction du fait lui-même (une exclusion, une
 * capture). Un KIND inconnu, lui, LÈVE : un message hors catalogue n'a ni
 * emoji, ni texte, ni catégorie de réglage — il serait une ligne muette.
 *
 * `crew_notify_2026` (0188) reste la porte de ses SIX faits de crew : elle est
 * en production, testée, et écrit la même table avec la même forme de payload.
 * Deux portes, un seul format, une seule contrainte d'unicité.
 */
create function public.notification_inbox_write_2026(
  p_user_id uuid,
  p_kind    text,
  p_key     text,
  p_payload jsonb default '{}'::jsonb,
  p_at      timestamptz default now()
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_def jsonb := public.notification_kind_2026(p_kind); v_rows integer;
begin
  if v_def is null then
    raise exception 'notification_inbox_write_2026: fait hors catalogue (%)', p_kind;
  end if;
  if p_user_id is null then return false; end if;
  if not exists (select 1 from public.users u where u.id = p_user_id) then return false; end if;

  insert into public.notifications (user_id, type, priority, payload, created_at, event_id)
  values (
    p_user_id,
    v_def->>'family',
    (v_def->>'priority')::smallint,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'event', p_kind, 'transactional', (v_def->>'transactional')::boolean),
    coalesce(p_at, now()),
    public.notification_event_id_2026(p_kind, p_key))
  on conflict (user_id, event_id) where event_id is not null do nothing;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end $$;

/**
 * `claim_notification_2026` — MÊME SIGNATURE, MÊME DÉCISION (0141), plus la
 * ligne de réception. Le corps de 0141 n'est pas réécrit : il est APPELÉ
 * (`can_notify_2026`), et le budget, la plage calme et la déduplication restent
 * décidés là-bas. Ce qui s'ajoute ici est la règle de l'en-tête : quels refus
 * laissent quand même une trace dans la boîte.
 *
 * Le verdict rendu gagne deux clés : `logged` (le budget a-t-il été consommé —
 * elle existait déjà) et `inboxed` (une ligne existe-t-elle pour ce fait, que
 * cet appel l'ait écrite ou non). L'appelant n'a jamais à deviner.
 */
create or replace function public.claim_notification_2026(
  p_user_id uuid,
  p_category text,
  p_event_id text,
  p_at timestamptz default now(),
  p_transactional boolean default false,
  p_activity_in_progress boolean default false,
  p_blocked boolean default false,
  p_event_still_valid boolean default true)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  verdict jsonb;
  v_reason text;
  v_kind text;
  v_prefix text;
  v_logged boolean := false;
  -- Les refus qui disent « pas maintenant », jamais « c'est faux » (en-tête).
  v_deferrals constant text[] := array[
    'quiet_hours','activity_in_progress','daily_budget','weekly_budget',
    'monthly_offer_budget','category_off','game_paused'];
begin
  verdict := public.can_notify_2026(p_user_id, p_category, p_event_id, p_at,
    p_transactional, p_activity_in_progress, p_blocked, p_event_still_valid);
  v_reason := verdict->>'reason';

  -- ① LA SOLLICITATION. Décision et inscription dans la même transaction, comme
  --    en 0141 : deux jobs concurrents ne peuvent pas décider « oui » ensemble.
  if (verdict->>'allowed')::boolean then
    insert into public.notification_log_2026(user_id, category, event_id, transactional, sent_at)
      values (p_user_id, p_category, p_event_id, coalesce(p_transactional,false), p_at)
      on conflict (user_id, event_id) do nothing;
    if found then
      v_logged := true;
    else
      -- Course perdue entre la décision et l'inscription : c'est très exactement
      -- le doublon qu'on empêche, et la boîte n'a rien à ajouter non plus.
      return jsonb_build_object('allowed', false, 'reason', 'duplicate', 'logged', false,
        'inboxed', exists(select 1 from public.notifications n
                           where n.user_id = p_user_id and n.event_id = p_event_id));
    end if;
  end if;

  -- ② LA LIGNE DE RÉCEPTION, si le fait a un nom au catalogue.
  v_kind := public.notification_kind_for_event_id_2026(p_event_id);
  if v_kind is not null and (v_logged or v_reason = any(v_deferrals)) then
    select k.event_id_prefix into v_prefix
      from public.notification_kinds_2026() k where k.kind = v_kind;
    perform public.notification_inbox_write_2026(
      p_user_id, v_kind, substring(p_event_id from length(v_prefix) + 1), '{}'::jsonb, p_at);
  end if;

  return verdict || jsonb_build_object(
    'logged', v_logged,
    'inboxed', exists(select 1 from public.notifications n
                       where n.user_id = p_user_id and n.event_id = p_event_id));
end $$;

-- ── 4. LA LECTURE ──────────────────────────────────────────────────────────
/**
 * La page de la boîte, la plus récente d'abord. `p_before` pagine sur
 * `created_at` (le curseur que rend `nextBefore`), jamais sur un décalage : une
 * ligne écrite pendant la lecture ne fait pas sauter une page.
 *
 * `title` et `body` ne sont JAMAIS remplis pour un fait du catalogue — c'est
 * l'application qui les dit, dans la langue du lecteur. Ils ne le sont que pour
 * les lignes d'AVANT ce lot, qui portent leur texte figé.
 *
 * Rend `null` hors session : l'écran distingue « pas connecté » de « vide », et
 * les confondre serait le repli inventé que L8 interdit.
 */
create function public.my_notifications_2026(
  p_limit integer default 30,
  p_before timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_limit integer; v_items jsonb; v_unread integer;
begin
  if v_uid is null then return null; end if;
  v_limit := least(greatest(coalesce(p_limit, 30), 1), 100);

  select coalesce(jsonb_agg(x.item order by x.created_at desc), '[]'::jsonb) into v_items
  from (
    select n.created_at, jsonb_build_object(
        'id', n.id,
        'kind', n.payload->>'event',
        'family', n.type,
        'emoji', coalesce(
          public.notification_kind_2026(n.payload->>'event')->>'emoji',
          public.notification_legacy_emoji_2026(n.type)),
        'deepLink', public.notification_deep_link_2026(n.payload->>'event', n.payload),
        'params', n.payload - 'title' - 'body' - 'event' - 'transactional',
        'title', case when public.notification_kind_2026(n.payload->>'event') is null
                      then n.payload->>'title' end,
        'body',  case when public.notification_kind_2026(n.payload->>'event') is null
                      then n.payload->>'body' end,
        'createdAt', n.created_at,
        'readAt', n.read_at) as item
    from public.notifications n
    where n.user_id = v_uid
      and public.notification_renderable_2026(n.payload)
      and (p_before is null or n.created_at < p_before)
    order by n.created_at desc
    limit v_limit
  ) x;

  select count(*) into v_unread from public.notifications n
   where n.user_id = v_uid and n.read_at is null
     and public.notification_renderable_2026(n.payload);

  return jsonb_build_object(
    'hasAccount', true,
    'unread', v_unread,
    'items', v_items,
    'hasMore', jsonb_array_length(v_items) >= v_limit);
end $$;

/**
 * Marque comme lu. `p_ids = null` marque TOUT le non-lu du compte — c'est ce
 * que « Tout marquer comme lu » veut dire, y compris au-delà de la page
 * chargée : marquer seulement ce que l'écran affiche laisserait un compteur
 * non nul après un geste qui promet le contraire. LISIBLE et rien de plus :
 * une ligne qu'aucun écran ne sait dire n'a jamais été montrée, donc ce geste
 * ne peut pas l'avoir lue.
 *
 * `read_at` n'est jamais réécrit sur une ligne déjà lue : la date de première
 * lecture est un fait.
 *
 * `greatest(now(), created_at)` n'est pas une coquetterie : 0006 contraint
 * `read_at >= created_at`, et un producteur qui date son fait de l'instant de la
 * clôture d'une course (une horloge d'appareil en avance, un job qui rattrape)
 * rendrait la ligne IMPOSSIBLE À MARQUER. Le geste du joueur ne doit jamais
 * échouer à cause de l'horloge de quelqu'un d'autre.
 */
create function public.mark_notifications_read_2026(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_rows integer;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  update public.notifications set read_at = greatest(now(), created_at)
   where user_id = v_uid and read_at is null
     and public.notification_renderable_2026(payload)
     and (p_ids is null or id = any(p_ids));
  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

/** Le nombre de la cloche. Compte ce que la liste peut RÉELLEMENT montrer. */
create function public.unread_notifications_count_2026()
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select case when auth.uid() is null then null else (
    select count(*)::integer from public.notifications n
     where n.user_id = auth.uid() and n.read_at is null
       and public.notification_renderable_2026(n.payload)) end
$$;

-- ── 5. PRIVILÈGES ──────────────────────────────────────────────────────────
-- Le catalogue et l'écriture sont des DÉCISIONS SERVEUR : aucun client ne les
-- appelle, même en lecture. Seules les trois RPC de lecture/marquage sont
-- ouvertes, et chacune dérive son identité d'`auth.uid()`, jamais d'un
-- paramètre.
revoke all on function public.notification_kinds_2026() from public, anon, authenticated;
revoke all on function public.notification_kind_2026(text) from public, anon, authenticated;
revoke all on function public.notification_event_id_2026(text,text) from public, anon, authenticated;
revoke all on function public.notification_kind_for_event_id_2026(text) from public, anon, authenticated;
revoke all on function public.notification_deep_link_2026(text,jsonb) from public, anon, authenticated;
revoke all on function public.notification_renderable_2026(jsonb) from public, anon, authenticated;
revoke all on function public.notification_legacy_emoji_2026(text) from public, anon, authenticated;
revoke all on function public.notification_inbox_write_2026(uuid,text,text,jsonb,timestamptz)
  from public, anon, authenticated;
grant execute on function public.notification_kinds_2026(),
  public.notification_kind_2026(text), public.notification_event_id_2026(text,text),
  public.notification_kind_for_event_id_2026(text), public.notification_deep_link_2026(text,jsonb),
  public.notification_renderable_2026(jsonb), public.notification_legacy_emoji_2026(text),
  public.notification_inbox_write_2026(uuid,text,text,jsonb,timestamptz) to service_role;

revoke all on function public.my_notifications_2026(integer,timestamptz) from public, anon;
revoke all on function public.mark_notifications_read_2026(uuid[]) from public, anon;
revoke all on function public.unread_notifications_count_2026() from public, anon;
grant execute on function public.my_notifications_2026(integer,timestamptz),
  public.mark_notifications_read_2026(uuid[]),
  public.unread_notifications_count_2026() to authenticated, service_role;

comment on function public.notification_kinds_2026() is
  'Catalogue GELÉ des 21 faits notifiables (§14.2). Miroir exact de '
  'NOTIFICATION_EVENTS_2026 (packages/shared), emoji compris, comparé par le '
  'test PGlite. Aucune phrase : la copie 5 langues vit dans le catalogue typé '
  'du mobile.';
comment on function public.notification_inbox_write_2026(uuid,text,text,jsonb,timestamptz) is
  'Écrit UN fait dans public.notifications. Dédupliqué par event_id. Ne consomme '
  'PAS le budget §14.1 : une boîte de réception n''est pas une sollicitation. '
  'Lève sur un fait hors catalogue, se tait sur un destinataire disparu.';
comment on function public.my_notifications_2026(integer,timestamptz) is
  'La boîte de réception d''auth.uid(), page par page (curseur created_at). '
  'null hors session — « pas connecté » n''est pas « vide ». title/body ne sont '
  'remplis que pour les lignes d''avant ce lot ; les faits du catalogue sont dits '
  'par l''application, dans la langue du lecteur.';
