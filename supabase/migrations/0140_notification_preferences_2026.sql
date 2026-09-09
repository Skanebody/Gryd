-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — LES RÉGLAGES DE NOTIFICATION DEVIENNENT UNE DÉCISION SERVEUR (§14.1).
--
-- ─── LE DÉFAUT CORRIGÉ ─────────────────────────────────────────────────────
-- `apps/mobile/src/features/notifications/notifPrefsStore.ts` n'écrivait ses
-- préférences que dans AsyncStorage, et elles nommaient DEUX catégories que le
-- cahier a abolies : « défense » (le territoire qui s'efface — §5.3 supprime
-- decay, bouclier et contestation) et « rivalité » (l'alarme immédiate de
-- reprise — §14.2 l'interdit en toutes lettres). Un réglage qui ne quitte
-- jamais le téléphone ne peut gouverner aucun envoi ; un réglage qui décrit
-- une mécanique disparue enseigne au joueur des règles fausses.
--
-- ─── CE QUE CETTE MIGRATION AJOUTE, ET RIEN DE PLUS ────────────────────────
--   · `notification_preferences_2026` — une ligne par compte, les six
--     catégories de §14.1 plus « Pause du jeu » et la plage calme choisie.
--   · `notification_categories_2026()` — la liste des catégories, en SQL. Elle
--     est le MIROIR de `NOTIFICATION_RULES_2026.categories` (@klaim/shared), et
--     le test PGlite compare les deux listes caractère par caractère : une
--     divergence ne peut pas rester silencieuse.
--   · `my_notification_settings_2026()` / `save_notification_settings_2026()` —
--     lecture et écriture, identité dérivée d'`auth.uid()`, jamais d'un
--     paramètre. Le client n'écrit JAMAIS la table directement.
--
-- ─── POURQUOI PAS D'UPSERT À LA LECTURE ────────────────────────────────────
-- La lecture est `stable` et ne crée aucune ligne : ouvrir un écran de
-- réglages ne doit pas écrire en base. `hasSettings` distingue « valeurs par
-- défaut, personne n'a rien choisi » de « choix enregistré » — l'écran a besoin
-- des deux, et les confondre reviendrait à montrer au joueur un choix qu'il n'a
-- pas fait. La ligne naît à la première écriture, et pas avant.
--
-- ─── LES DÉFAUTS SONT CEUX DU CAHIER ───────────────────────────────────────
-- Cinq catégories activées, `notify_offers` DÉSACTIVÉE : « promotion
-- désactivée par défaut, avec consentement distinct » (§14.1). Plage calme
-- 21 h → 9 h. Aucun de ces nombres n'est un choix de cette migration : ils sont
-- vérifiés contre `NOTIFICATION_RULES_2026` par le test.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.notification_preferences_2026 (
  user_id          uuid primary key references public.users(id) on delete cascade,
  notify_sport     boolean not null default true,
  notify_crew      boolean not null default true,
  notify_events    boolean not null default true,
  notify_results   boolean not null default true,
  notify_weekly    boolean not null default true,
  -- Opt-IN : la seule valeur par défaut que le cahier IMPOSE.
  notify_offers    boolean not null default false,
  -- « Pause du jeu » : coupe la rétention, conserve compte et événements suivis.
  game_pause       boolean not null default false,
  quiet_start_hour smallint not null default 21 check (quiet_start_hour between 0 and 23),
  quiet_end_hour   smallint not null default 9  check (quiet_end_hour between 0 and 23),
  updated_at       timestamptz not null default now()
);

alter table public.notification_preferences_2026 enable row level security;
-- Aucune écriture client directe : tout passe par les deux RPC ci-dessous.
revoke all on public.notification_preferences_2026 from anon, authenticated;
grant all on public.notification_preferences_2026 to service_role;

-- Une policy de LECTURE quand même : elle ne sert à personne aujourd'hui (le
-- `revoke` ci-dessus retire déjà le droit de table), mais elle documente et
-- verrouille le périmètre si un `grant select` était accordé un jour. Sans
-- elle, ce `grant` exposerait TOUTES les lignes.
create policy notification_preferences_2026_own on public.notification_preferences_2026
  for select using (user_id = auth.uid());

/**
 * La liste des catégories de §14.1, en SQL. MIROIR de
 * `NOTIFICATION_RULES_2026.categories` — comparé par le test PGlite.
 */
create function public.notification_categories_2026()
returns text[] language sql immutable set search_path=public,pg_temp as $$
  select array['sport','crew','events','results','weekly','offers']::text[]
$$;

create function public.my_notification_settings_2026()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select case when auth.uid() is null then null else coalesce(
    (select jsonb_build_object(
       'hasAccount',true,
       'hasSettings',true,
       'sport',p.notify_sport,
       'crew',p.notify_crew,
       'events',p.notify_events,
       'results',p.notify_results,
       'weekly',p.notify_weekly,
       'offers',p.notify_offers,
       'gamePause',p.game_pause,
       'quietStartHour',p.quiet_start_hour,
       'quietEndHour',p.quiet_end_hour,
       'updatedAt',p.updated_at)
     from public.notification_preferences_2026 p where p.user_id = auth.uid()),
    -- Aucune ligne : on rend les DÉFAUTS DE COLONNE tels qu'ils s'appliqueront,
    -- avec le drapeau qui dit que personne n'a encore rien choisi. On n'écrit
    -- rien : une lecture n'est pas une décision.
    jsonb_build_object(
      'hasAccount',true,
      'hasSettings',false,
      'sport',true,'crew',true,'events',true,'results',true,'weekly',true,
      'offers',false,'gamePause',false,
      'quietStartHour',21,'quietEndHour',9,'updatedAt',null)) end
$$;

/**
 * Écriture PARTIELLE : `p_settings` ne porte que ce qui change (l'écran envoie
 * un seul interrupteur à la fois). Une clé absente conserve la valeur courante,
 * une clé inconnue est IGNORÉE — jamais une erreur qui ferait perdre le geste
 * du joueur pour un champ qu'une version plus récente aurait ajouté.
 *
 * Une heure hors domaine, elle, est REFUSÉE : c'est une valeur, pas un champ,
 * et l'accepter en la rabotant en silence donnerait au joueur une plage calme
 * qu'il n'a pas demandée.
 */
create function public.save_notification_settings_2026(p_settings jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid := auth.uid(); v_hour_keys text[] := array['quietStartHour','quietEndHour'];
        v_key text; v_hour int;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'invalid_notification_settings';
  end if;
  if not exists(select 1 from public.users where id = v_uid and deletion_requested_at is null) then
    raise exception 'account_unavailable';
  end if;

  foreach v_key in array v_hour_keys loop
    if p_settings ? v_key then
      if jsonb_typeof(p_settings->v_key) <> 'number' then
        raise exception 'invalid_notification_settings';
      end if;
      v_hour := (p_settings->>v_key)::int;
      if v_hour < 0 or v_hour > 23 then raise exception 'invalid_notification_settings'; end if;
    end if;
  end loop;

  insert into public.notification_preferences_2026(user_id) values(v_uid)
    on conflict(user_id) do nothing;

  update public.notification_preferences_2026 set
    notify_sport   = coalesce((p_settings->>'sport')::boolean, notify_sport),
    notify_crew    = coalesce((p_settings->>'crew')::boolean, notify_crew),
    notify_events  = coalesce((p_settings->>'events')::boolean, notify_events),
    notify_results = coalesce((p_settings->>'results')::boolean, notify_results),
    notify_weekly  = coalesce((p_settings->>'weekly')::boolean, notify_weekly),
    notify_offers  = coalesce((p_settings->>'offers')::boolean, notify_offers),
    game_pause     = coalesce((p_settings->>'gamePause')::boolean, game_pause),
    quiet_start_hour = coalesce((p_settings->>'quietStartHour')::smallint, quiet_start_hour),
    quiet_end_hour   = coalesce((p_settings->>'quietEndHour')::smallint, quiet_end_hour),
    updated_at = now()
  where user_id = v_uid;

  return public.my_notification_settings_2026();
end $$;

revoke all on function public.notification_categories_2026() from public, anon;
revoke all on function public.my_notification_settings_2026() from public, anon;
revoke all on function public.save_notification_settings_2026(jsonb) from public, anon;
grant execute on function public.notification_categories_2026() to authenticated, service_role;
grant execute on function public.my_notification_settings_2026() to authenticated, service_role;
grant execute on function public.save_notification_settings_2026(jsonb) to authenticated, service_role;

comment on table public.notification_preferences_2026 is
  'Réglages de notification du cahier §14.1 : sport, crew, événements suivis, '
  'résultats, résumé hebdomadaire, nouveautés/offres (opt-in, défaut false), '
  'plus « Pause du jeu » et la plage calme. Lus par can_notify_2026 (0141) '
  'avant chaque envoi. Aucune écriture client directe.';
comment on function public.save_notification_settings_2026(jsonb) is
  'Patch partiel des réglages §14.1 pour auth.uid(). Clé absente = inchangée, '
  'clé inconnue = ignorée, heure hors 0..23 = invalid_notification_settings. '
  'authentication_required hors session, account_unavailable sur un compte en '
  'cours de suppression.';
