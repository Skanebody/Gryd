-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — LES RÉGLAGES D'AUDIENCE DEVIENNENT UNE DÉCISION SERVEUR.
--
-- LE DÉFAUT CORRIGÉ : `apps/mobile/src/features/privacy/store.ts` n'écrivait
-- `profileVisibility` QUE dans AsyncStorage. Or le serveur décide déjà depuis
-- `user_profiles` : 0126 (`territory_owner_identity_2026`) lit exactement
-- `profile_visibility` et `discreet_mode` pour décider si le nom et le crew du
-- propriétaire d'un territoire s'affichent sur la carte d'un autre joueur, et
-- `get_ownership_2026` lit `map_sharing`. Un réglage qui ne quitte jamais le
-- téléphone ne pouvait donc RIEN gouverner — l'écran affichait un choix, le
-- serveur en appliquait un autre.
--
-- CE QUE CETTE MIGRATION AJOUTE, ET RIEN DE PLUS :
--   · `my_privacy_settings_2026()`  — lecture des trois colonnes qui gouvernent
--     réellement une exposition, + `hasProfile` pour que le client distingue
--     « pas encore de profil » de « réglage lu ».
--   · `save_privacy_settings_2026(...)` — écriture des mêmes trois colonnes,
--     identité dérivée d'`auth.uid()`, valeurs contraintes.
-- Aucune colonne nouvelle : les trois existent depuis `0011_social.sql:54-60`
-- avec leurs `check`. En ajouter une créerait une SECONDE source de vérité que
-- 0126 ne lirait pas — exactement le défaut qu'on corrige.
--
-- POURQUOI `profile_required` PLUTÔT QU'UN UPSERT : `user_profiles.handle` est
-- `not null unique`. Fabriquer un handle pour poser un réglage, ce serait
-- inventer une identité publique à la place du joueur. Et l'état « pas de ligne
-- `user_profiles` » est DÉJÀ le plus fermé qui soit : 0126 fait
-- `coalesce(profile.discreet_mode,true)` (donc discret), et `get_ownership_2026`
-- exige `exists(... user_profiles ... map_sharing<>'none')` (donc rien n'est
-- publié). Le client le DIT et conduit à la création du profil, il ne peint pas
-- un interrupteur qui échouerait.
-- ═══════════════════════════════════════════════════════════════════════════

create function public.my_privacy_settings_2026()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select case when auth.uid() is null then null else coalesce(
    (select jsonb_build_object(
       'hasProfile',true,
       'profileVisibility',p.profile_visibility,
       'mapSharing',p.map_sharing,
       'discreetMode',p.discreet_mode,
       'updatedAt',p.updated_at)
     from public.user_profiles p where p.user_id=auth.uid()),
    -- Pas de profil : on ne fabrique aucune valeur « choisie ». On rend les
    -- DÉFAUTS de colonne (0011) tels qu'ils s'appliqueraient, avec le drapeau
    -- qui dit que rien n'a été choisi et que rien n'est exposé aujourd'hui.
    jsonb_build_object(
      'hasProfile',false,
      'profileVisibility','crew',
      'mapSharing','simplified',
      'discreetMode',false,
      'updatedAt',null)) end
$$;

create function public.save_privacy_settings_2026(
  p_profile_visibility text,p_map_sharing text,p_discreet_mode boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  -- Les mêmes domaines que les `check` de 0011 : un refus nommé vaut mieux
  -- qu'une violation de contrainte que le client ne saurait pas traduire.
  if p_profile_visibility is null or p_profile_visibility not in ('private','friends','crew','public')
     or p_map_sharing is null or p_map_sharing not in ('precise','simplified','territory_only','none')
     or p_discreet_mode is null then
    raise exception 'invalid_privacy_settings';
  end if;
  update public.user_profiles
     set profile_visibility=p_profile_visibility,
         map_sharing=p_map_sharing,
         discreet_mode=p_discreet_mode,
         updated_at=now()
   where user_id=v_uid;
  if not found then raise exception 'profile_required'; end if;
  return public.my_privacy_settings_2026();
end $$;

revoke all on function public.my_privacy_settings_2026() from public,anon;
revoke all on function public.save_privacy_settings_2026(text,text,boolean) from public,anon;
grant execute on function public.my_privacy_settings_2026() to authenticated,service_role;
grant execute on function public.save_privacy_settings_2026(text,text,boolean) to authenticated,service_role;

comment on function public.my_privacy_settings_2026() is
  'Réglages d''audience RÉELLEMENT opposables (0011 §user_profiles) : '
  'profile_visibility et discreet_mode gouvernent l''identité du propriétaire '
  'sur la carte (0126), map_sharing gouverne la publication du territoire '
  '(get_ownership_2026). NULL hors session. hasProfile=false quand aucune ligne '
  'user_profiles n''existe : rien n''est alors exposé, et les valeurs rendues '
  'sont les défauts de colonne, pas un choix du joueur.';
comment on function public.save_privacy_settings_2026(text,text,boolean) is
  'Écrit les trois réglages d''audience sur le profil d''auth.uid(). '
  'authentication_required hors session, invalid_privacy_settings hors domaine, '
  'profile_required tant qu''aucun profil n''existe (handle obligatoire : on '
  'n''invente pas une identité publique pour poser un réglage).';
