-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — LE MOTEUR DE DÉCISION DE §14.3, EN SQL.
--
-- « Avant chaque envoi : événement toujours valide, audience autorisée,
--   préférence de canal, budget, heure locale, activité en cours, blocages,
--   message déjà vu, dernier envoi et fraîcheur du lien. »
--
-- Cette migration implémente les portes que le SERVEUR peut trancher seul :
-- préférence, pause du jeu, budget (hebdomadaire, quotidien, offres mensuelles),
-- heure locale, et déduplication par identifiant d'événement. Les trois autres —
-- validité de l'événement, blocage de l'auteur, activité en cours — dépendent du
-- contexte de l'appelant : `can_notify_2026` les reçoit en paramètre plutôt que
-- de les DEVINER. Deviner ici aurait été pire que ne rien faire : le moteur
-- aurait autorisé un rappel pour un événement annulé en se croyant complet.
--
-- ─── LA PLAGE CALME EST DANS LE FUSEAU DU JOUEUR ───────────────────────────
-- Pas celui du serveur, et pas Europe/Paris « par défaut de code » : le fuseau
-- vient de `progress_accounts_2026.initial_timezone` (0119), le seul fuseau que
-- ce compte ait jamais déclaré. Sans compte de progression, on retombe sur
-- Europe/Paris — c'est le défaut de cette colonne, pas une invention d'ici. Un
-- fuseau illisible (valeur héritée, appareil exotique) ferait LEVER
-- `at time zone` et tuerait l'envoi : il est rattrapé, et on le dit.
--
-- ─── LE JOURNAL EST LA PREUVE DU BUDGET ────────────────────────────────────
-- `notification_log_2026` porte `unique(user_id, event_id)` : la déduplication
-- de §14.3 n'est pas une politique appliquée par du code appelant, c'est une
-- CONTRAINTE. Deux jobs concurrents ne peuvent pas envoyer deux fois le même
-- événement, même en se croisant.
--
-- ─── LES NOMBRES VIENNENT DU CAHIER ────────────────────────────────────────
-- 3 par semaine, 1 par jour, 2 offres par mois, plage calme 21 h → 9 h. Ils
-- sont écrits ici en littéraux — le SQL ne peut pas importer TypeScript — et le
-- test PGlite les COMPARE à `NOTIFICATION_RULES_2026` (packages/shared). Un
-- glissement d'un côté rend le test rouge.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.notification_log_2026 (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.users(id) on delete cascade,
  category      text not null check (category = any(public.notification_categories_2026())),
  -- L'identifiant d'événement de §14.3. UNIQUE par compte : c'est la contrainte
  -- qui empêche le doublon, pas la bonne volonté de l'appelant.
  event_id      text not null,
  -- Hors budget (incident de compte, événement annulé) — jamais hors dédup.
  transactional boolean not null default false,
  sent_at       timestamptz not null default now(),
  unique(user_id, event_id)
);
create index notification_log_2026_budget_idx
  on public.notification_log_2026(user_id, sent_at desc);

alter table public.notification_log_2026 enable row level security;
revoke all on public.notification_log_2026 from anon, authenticated;
grant all on public.notification_log_2026 to service_role;

/**
 * L'heure LOCALE d'un compte à un instant donné. Rattrape un fuseau illisible
 * plutôt que de faire tomber un job entier — un message envoyé une heure à côté
 * vaut mieux qu'un cron mort, et c'est déjà l'arbitrage de `_shared/push.ts`.
 */
create function public.account_local_hour_2026(p_user_id uuid, p_at timestamptz)
returns int language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_tz text;
begin
  select coalesce(initial_timezone,'Europe/Paris') into v_tz
    from public.progress_accounts_2026 where user_id = p_user_id;
  v_tz := coalesce(v_tz,'Europe/Paris');
  begin
    return extract(hour from (p_at at time zone v_tz))::int;
  exception when others then
    return extract(hour from (p_at at time zone 'Europe/Paris'))::int;
  end;
end $$;

/**
 * §14.3. Rend `{"allowed":bool,"reason":text|null}` — jamais un booléen nu : la
 * raison est journalisée et parfois affichée, et « budget » à propos d'un
 * message que le joueur a explicitement coupé serait une explication fausse.
 *
 * L'ORDRE des portes est celui du cahier, et c'est le MÊME que le miroir client
 * (`apps/mobile/src/features/notifications/notifications2026.ts`) : les deux
 * tests rejouent les mêmes scénarios.
 */
create function public.can_notify_2026(
  p_user_id uuid,
  p_category text,
  p_event_id text,
  p_at timestamptz default now(),
  p_transactional boolean default false,
  p_activity_in_progress boolean default false,
  p_blocked boolean default false,
  p_event_still_valid boolean default true)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  pref public.notification_preferences_2026%rowtype;
  v_enabled boolean;
  v_paused boolean;
  v_hour int; v_start int; v_end int;
  v_day int; v_week int; v_offers int;
  -- « Pause du jeu » coupe la RÉTENTION et conserve ce à quoi on s'est inscrit :
  -- crew, événements suivis et résultats en sont volontairement absents (§14.1).
  v_paused_categories constant text[] := array['sport','weekly','offers'];
begin
  if p_user_id is null or p_event_id is null or p_event_id = ''
     or not (p_category = any(public.notification_categories_2026())) then
    raise exception 'invalid_notification_request';
  end if;

  if not coalesce(p_event_still_valid, true) then
    return jsonb_build_object('allowed', false, 'reason', 'event_invalid');
  end if;
  if coalesce(p_blocked, false) then
    return jsonb_build_object('allowed', false, 'reason', 'blocked');
  end if;

  -- Déjà vu (§14.3) — avant tout le reste, et y compris pour un transactionnel :
  -- « les informations transactionnelles […] sont regroupées et dédupliquées ».
  if exists(select 1 from public.notification_log_2026
             where user_id = p_user_id and event_id = p_event_id) then
    return jsonb_build_object('allowed', false, 'reason', 'duplicate');
  end if;

  select * into pref from public.notification_preferences_2026 where user_id = p_user_id;
  if not found then
    -- Aucun choix enregistré : les DÉFAUTS de colonne s'appliquent, exactement
    -- comme `my_notification_settings_2026` les annonce au joueur.
    v_enabled := (p_category <> 'offers');
    v_paused  := false;
    v_start   := 21;
    v_end     := 9;
  else
    v_enabled := case p_category
      when 'sport'   then pref.notify_sport
      when 'crew'    then pref.notify_crew
      when 'events'  then pref.notify_events
      when 'results' then pref.notify_results
      when 'weekly'  then pref.notify_weekly
      when 'offers'  then pref.notify_offers
    end;
    v_paused := pref.game_pause;
    v_start  := pref.quiet_start_hour;
    v_end    := pref.quiet_end_hour;
  end if;

  if not v_enabled then
    return jsonb_build_object('allowed', false, 'reason', 'category_off');
  end if;
  if v_paused and p_category = any(v_paused_categories) then
    return jsonb_build_object('allowed', false, 'reason', 'game_paused');
  end if;

  -- Transactionnel : hors budget, hors plage calme, hors « activité en cours ».
  -- Un événement annulé ce soir ne se retient pas jusqu'à 9 h du matin.
  if coalesce(p_transactional, false) then
    return jsonb_build_object('allowed', true, 'reason', null);
  end if;

  if coalesce(p_activity_in_progress, false) then
    return jsonb_build_object('allowed', false, 'reason', 'activity_in_progress');
  end if;

  v_hour := public.account_local_hour_2026(p_user_id, p_at);
  -- Intervalle CIRCULAIRE : 21 h → 9 h enjambe minuit. `start` pile est déjà
  -- silencieux, `end` pile est de nouveau autorisé — même convention que
  -- `_shared/push.ts#canPush` et que le miroir client, sinon les trois moteurs
  -- refuseraient des minutes différentes. `start = end` = AUCUNE plage calme,
  -- pas 24 h de silence : couper 24 h se dit en coupant les catégories.
  if v_start <> v_end and (
       (v_start < v_end and v_hour >= v_start and v_hour < v_end)
    or (v_start > v_end and (v_hour >= v_start or v_hour < v_end))) then
    return jsonb_build_object('allowed', false, 'reason', 'quiet_hours');
  end if;

  select count(*) into v_day from public.notification_log_2026
    where user_id = p_user_id and not transactional and sent_at > p_at - interval '1 day';
  if v_day >= 1 then
    return jsonb_build_object('allowed', false, 'reason', 'daily_budget');
  end if;

  select count(*) into v_week from public.notification_log_2026
    where user_id = p_user_id and not transactional and sent_at > p_at - interval '7 days';
  if v_week >= 3 then
    return jsonb_build_object('allowed', false, 'reason', 'weekly_budget');
  end if;

  if p_category = 'offers' then
    select count(*) into v_offers from public.notification_log_2026
      where user_id = p_user_id and not transactional and category = 'offers'
        and sent_at > p_at - interval '30 days';
    if v_offers >= 2 then
      return jsonb_build_object('allowed', false, 'reason', 'monthly_offer_budget');
    end if;
  end if;

  return jsonb_build_object('allowed', true, 'reason', null);
end $$;

/**
 * DÉCIDER PUIS INSCRIRE, EN UNE SEULE INSTRUCTION. Un appelant qui ferait
 * `can_notify_2026` puis `insert` séparément laisserait une fenêtre où deux
 * jobs concurrents décident « oui » tous les deux. Ici la décision et
 * l'inscription partagent la transaction, et la contrainte
 * `unique(user_id,event_id)` reste le dernier filet.
 *
 * Rend le MÊME objet que `can_notify_2026`, plus `logged` : l'appelant n'envoie
 * que si `allowed`, et sait sans ambiguïté si le budget a été consommé.
 */
create function public.claim_notification_2026(
  p_user_id uuid,
  p_category text,
  p_event_id text,
  p_at timestamptz default now(),
  p_transactional boolean default false,
  p_activity_in_progress boolean default false,
  p_blocked boolean default false,
  p_event_still_valid boolean default true)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare verdict jsonb;
begin
  verdict := public.can_notify_2026(p_user_id, p_category, p_event_id, p_at,
    p_transactional, p_activity_in_progress, p_blocked, p_event_still_valid);
  if not (verdict->>'allowed')::boolean then
    return verdict || jsonb_build_object('logged', false);
  end if;
  insert into public.notification_log_2026(user_id, category, event_id, transactional, sent_at)
    values (p_user_id, p_category, p_event_id, coalesce(p_transactional,false), p_at)
    on conflict (user_id, event_id) do nothing;
  if not found then
    -- Un autre appel a gagné la course entre la décision et l'insertion : ce
    -- n'est pas une erreur, c'est très exactement le doublon qu'on empêche.
    return jsonb_build_object('allowed', false, 'reason', 'duplicate', 'logged', false);
  end if;
  return jsonb_build_object('allowed', true, 'reason', null, 'logged', true);
end $$;

-- DÉCISION SERVEUR : aucun client ne l'appelle, même en lecture. Le miroir
-- client (`notifications2026.ts`) sert les notifications LOCALES et n'a pas
-- besoin de cette fonction — lui donner le droit d'appeler reviendrait à faire
-- croire qu'un téléphone peut arbitrer le budget d'un compte.
revoke all on function public.account_local_hour_2026(uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.can_notify_2026(uuid,text,text,timestamptz,boolean,boolean,boolean,boolean)
  from public, anon, authenticated;
revoke all on function public.claim_notification_2026(uuid,text,text,timestamptz,boolean,boolean,boolean,boolean)
  from public, anon, authenticated;
grant execute on function public.account_local_hour_2026(uuid,timestamptz) to service_role;
grant execute on function public.can_notify_2026(uuid,text,text,timestamptz,boolean,boolean,boolean,boolean)
  to service_role;
grant execute on function public.claim_notification_2026(uuid,text,text,timestamptz,boolean,boolean,boolean,boolean)
  to service_role;

comment on table public.notification_log_2026 is
  'Journal des sollicitations §14.3. unique(user_id,event_id) EST la '
  'déduplication du cahier. `transactional` sort du budget mais jamais de la '
  'déduplication.';
comment on function public.can_notify_2026(uuid,text,text,timestamptz,boolean,boolean,boolean,boolean) is
  'Moteur §14.3 : événement valide, blocage, déjà vu, préférence, pause du jeu, '
  '(transactionnel = laissez-passer), activité en cours, plage calme dans le '
  'fuseau du compte, budget 1/jour, 3/semaine, 2 offres/mois. Rend '
  '{allowed,reason}. Les trois portes contextuelles arrivent en paramètre : ce '
  'moteur ne devine jamais si un événement est encore valide.';
