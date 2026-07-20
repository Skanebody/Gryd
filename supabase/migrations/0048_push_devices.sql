-- GRYD — 0048 push_devices : à qui envoyer le push, et selon quelles préférences.
--
-- POURQUOI. Le decay serveur est réel depuis 0006 (decay_job neutralise + insère
-- une notification `decay_warning` groupée par joueur), mais cette notification
-- n'existait QUE dans la table `notifications` (inbox), que rien ne lit encore.
-- Résultat concret : un joueur perd son quartier sans avoir jamais eu la chance
-- de le défendre. Cette migration apporte le chaînon manquant — le destinataire.
--
-- CE QUE LA TABLE EST (et n'est pas) :
--   • elle stocke un ExpoPushToken PAR APPAREIL (un compte = plusieurs
--     téléphones possibles) ;
--   • elle porte le MIROIR SERVEUR des préférences locales de l'appareil
--     (canaux `notifChannels` de features/motivation/store.ts, langue, fuseau).
--     Un job serveur ne peut pas respecter une préférence qui ne vit qu'en
--     AsyncStorage : sans ce miroir, « notifications off » ne couperait rien.
--     C'est du FILTRAGE D'ENVOI, jamais du gameplay (AMENDEMENT-07 §1).
--   • le fuseau sert aux quiet hours (PUSH_QUIET_HOURS_* de game-rules) : on
--     calcule 21h-8h dans l'heure RÉELLE du joueur, pas dans un Europe/Paris
--     supposé.
--
-- SÉCURITÉ. Un token push est un identifiant d'appareil : jamais lisible par
-- un autre compte. Écriture client interdite en direct (aucune policy
-- insert/update/delete) — tout passe par `register_push_device` /
-- `unregister_push_device`, SECURITY DEFINER à search_path épinglé, qui
-- n'écrivent JAMAIS ailleurs que sur auth.uid().

create table public.push_devices (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  -- ExpoPushToken[...] — unique GLOBALEMENT : un appareil physique ne peut pas
  -- être branché sur deux comptes à la fois (sinon un ancien compte recevrait
  -- les pushs du nouveau propriétaire du téléphone).
  expo_token     text not null unique,
  platform       text not null check (platform in ('ios', 'android')),
  -- Langue de rédaction du push (les 5 locales du catalogue i18n mobile).
  locale         text not null default 'fr' check (locale in ('fr', 'en', 'es', 'de', 'pt')),
  -- IANA. Quiet hours calculées dedans ; défaut = Saison 0 (Paris + Lille).
  time_zone      text not null default 'Europe/Paris',
  -- Miroir de MotivationPrefs.notifChannels. 'off' est exclusif côté client ;
  -- côté serveur, un tableau contenant 'off' (ou vide) = ne rien envoyer.
  notif_channels text[] not null default array['solo', 'crew']::text[]
                 check (notif_channels <@ array['solo', 'crew', 'competition', 'off']::text[]),
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  -- Posé quand Expo répond DeviceNotRegistered : on cesse d'envoyer sans
  -- perdre la trace (le prochain enregistrement réel le remet à null).
  disabled_at    timestamptz
);

create index push_devices_user_idx on public.push_devices (user_id) where disabled_at is null;

alter table public.push_devices enable row level security;

-- Lecture owner-only (l'écran Réglages doit pouvoir DIRE la vérité : « cet
-- appareil est enregistré » / « il ne l'est pas »). Aucune écriture directe.
revoke insert, update, delete on public.push_devices from anon, authenticated;
-- anon n'a rien à faire ici : la RLS le bloquerait déjà (aucune policy pour ce
-- rôle), mais on retire aussi le privilège hérité — défense en profondeur.
revoke select on public.push_devices from anon;

create policy push_devices_select_own on public.push_devices
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── register_push_device : le seul chemin d'écriture ────────────────────────
-- Idempotent (appelé à chaque lancement + à chaque changement de préférence).
-- Réattribution : si le token existe déjà sur un AUTRE compte, l'appareil a
-- changé de main → la ligne bascule, l'ancien compte cesse d'être poussé.
create or replace function public.register_push_device(
  p_token     text,
  p_platform  text,
  p_locale    text default 'fr',
  p_time_zone text default 'Europe/Paris',
  p_channels  text[] default array['solo', 'crew']::text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  -- Un ExpoPushToken fait ~41 caractères ; on borne sans coller au format exact
  -- (Expo peut le faire évoluer) — la vraie validation est l'échec d'envoi.
  if p_token is null or length(p_token) < 10 or length(p_token) > 255 then
    raise exception 'invalid_token' using errcode = '22023';
  end if;

  insert into public.push_devices (user_id, expo_token, platform, locale, time_zone, notif_channels)
  values (
    v_uid,
    p_token,
    p_platform,
    coalesce(p_locale, 'fr'),
    coalesce(p_time_zone, 'Europe/Paris'),
    coalesce(p_channels, array['solo', 'crew']::text[])
  )
  on conflict (expo_token) do update set
    user_id        = v_uid,
    platform       = excluded.platform,
    locale         = excluded.locale,
    time_zone      = excluded.time_zone,
    notif_channels = excluded.notif_channels,
    last_seen_at   = now(),
    disabled_at    = null;
end;
$$;

-- PUBLIC hérite EXECUTE par défaut : le revoke doit nommer public ET anon.
revoke all on function public.register_push_device(text, text, text, text, text[]) from public, anon;
grant execute on function public.register_push_device(text, text, text, text, text[]) to authenticated;

-- ─── unregister_push_device : couper le push depuis l'appareil ───────────────
-- Suppression franche (pas un flag) : « je ne veux plus de push sur ce
-- téléphone » doit effacer l'identifiant d'appareil, pas le garder en base.
create or replace function public.unregister_push_device(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  delete from public.push_devices where expo_token = p_token and user_id = v_uid;
end;
$$;

revoke all on function public.unregister_push_device(text) from public, anon;
grant execute on function public.unregister_push_device(text) to authenticated;
