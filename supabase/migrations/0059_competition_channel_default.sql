-- GRYD — le canal `competition` est ACTIF par défaut (21/07/2026).
--
-- POURQUOI. `planStealPushes` (notification « quelqu'un a pris ton territoire »)
-- exige le canal `competition`. Or ce canal était absent des TROIS défauts du
-- produit : `DEFAULT_PREFS.notifChannels` côté mobile, la colonne
-- `push_devices.notif_channels` et le paramètre `p_channels` de
-- `register_push_device`. Conséquence mesurée : pour tout joueur n'étant jamais
-- allé cocher la case, chaque vol partait en `channel_off` et AUCUN push n'était
-- envoyé. Le mécanisme entier — file, réservation, drain, 835 tests — était
-- inatteignable dans la configuration livree.
--
-- Se faire prendre son territoire sans jamais l'apprendre n'est pas un défaut
-- défendable : c'est la boucle de rétention du jeu. Le joueur garde évidemment
-- la main (Réglages → notifications), et les gardes existantes tiennent
-- toujours : quiet hours dans SON fuseau, plafond journalier, cooldown de vol.
--
-- ANTI PAY-TO-WIN (§22, A-45) : ce défaut est le même pour tous. Aucun statut
-- payant ne l'active plus tôt, plus souvent, ni avec plus de détail.
--
-- Les appareils DÉJÀ enregistrés sont mis à niveau ci-dessous : sans ça, seuls
-- les nouveaux installateurs recevraient l'alerte, ce qui serait un défaut de
-- traitement invisible entre joueurs.

alter table public.push_devices
  alter column notif_channels
  set default array['solo', 'crew', 'competition']::text[];

-- Appareils existants : on AJOUTE `competition` sans toucher aux autres choix,
-- et on ne réveille JAMAIS un joueur qui a explicitement tout coupé (`off`).
update public.push_devices
   set notif_channels = notif_channels || array['competition']::text[]
 where not (notif_channels @> array['competition']::text[])
   and not (notif_channels @> array['off']::text[]);

create or replace function public.register_push_device(
  p_token      text,
  p_platform   text,
  p_locale     text default 'fr',
  p_tz_offset  int default 0,
  p_channels   text[] default array['solo', 'crew', 'competition']::text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  insert into public.push_devices (user_id, token, platform, locale, tz_offset_minutes, notif_channels)
  values (
    auth.uid(), p_token, p_platform, coalesce(p_locale, 'fr'), coalesce(p_tz_offset, 0),
    coalesce(p_channels, array['solo', 'crew', 'competition']::text[])
  )
  on conflict (token) do update
     set user_id           = excluded.user_id,
         platform          = excluded.platform,
         locale            = excluded.locale,
         tz_offset_minutes = excluded.tz_offset_minutes,
         notif_channels    = excluded.notif_channels,
         disabled_at       = null;
end;
$$;

-- PUBLIC hérite d'EXECUTE : révoquer `anon` seul ne suffit pas (piège déjà payé).
revoke all on function public.register_push_device(text, text, text, int, text[]) from public, anon;
grant execute on function public.register_push_device(text, text, text, int, text[]) to authenticated;
