-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — UN BLOCAGE VAUT AUSSI POUR LES ADHÉSIONS (cahier §13.5).
--
-- LE DÉFAUT CORRIGÉ : `social_block_2026` (0124:216) coupe les lectures, les
-- réactions, le fil, la conversation et le profil — mais RIEN n'empêchait la
-- personne bloquée d'entrer dans le crew par un code (`join_crew_by_code`) ou
-- par un lien d'invitation (`redeem_crew_invite`). Elle se retrouvait dans le
-- même roster, la même conversation, les mêmes rendez-vous que celui qui l'avait
-- bloquée : le blocage devenait un filtre d'affichage, pas une protection.
--
-- LA GARDE, ET SA PORTÉE EXACTE : le blocage est vérifié DANS LES DEUX SENS
-- entre l'adhérent et la DIRECTION du crew (founder, co_captain) — les mêmes
-- rôles qui décident déjà des retraits (0093, 0127). On ne l'étend pas à tout
-- le roster : un crew de cinquante personnes deviendrait injoignable dès qu'un
-- membre quelconque aurait bloqué quelqu'un, et le blocage se transformerait en
-- droit de veto sur le recrutement d'autrui.
--
-- LE MOTIF EST NU (`blocked`), SANS NOM : dire QUI a bloqué désignerait une
-- personne à celui qu'elle fuit. Le refus est compréhensible sans être une
-- dénonciation.
--
-- LA MÉTHODE : on ne recopie pas 90 lignes de logique d'adhésion. On relit la
-- définition RÉELLEMENT déployée (`pg_get_functiondef`) et on y insère la garde
-- — même technique que 0118 pour `crew_stats`. Tout le reste (idempotence,
-- dernier chef, cooldown, crew mort, plafond) reste donc BYTE POUR BYTE ce qui
-- tourne aujourd'hui, et ne peut pas régresser par recopie.
-- ═══════════════════════════════════════════════════════════════════════════

create function public.crew_join_blocked_2026(p_crew_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(
    select 1 from public.crew_members m
     where m.crew_id = p_crew_id and m.left_at is null
       and m.role in ('founder','co_captain')
       and public.social_blocked_2026(auth.uid(), m.user_id))
$$;
revoke all on function public.crew_join_blocked_2026(uuid) from public,anon;
grant execute on function public.crew_join_blocked_2026(uuid) to authenticated,service_role;

comment on function public.crew_join_blocked_2026(uuid) is
  'Vrai si un blocage existe DANS UN SENS OU L''AUTRE entre auth.uid() et la '
  'direction (founder/co_captain) du crew visé. Portée volontairement limitée à '
  'la direction : l''étendre au roster entier ferait d''un blocage un veto sur '
  'le recrutement d''autrui.';

do $patch$
declare
  anchor constant text := '  v_left_behind := public.crew_members_left_behind(v_uid);';
  guard constant text :=
    '  -- ══ LE BLOCAGE VAUT POUR LES ADHÉSIONS (cahier §13.5, migration 0139) ══' || E'\n' ||
    '  -- Placée APRÈS l''idempotence (rouvrir le lien de son propre crew ne peut' || E'\n' ||
    '  -- pas être refusé) et AVANT tout changement d''état ou d''usage.' || E'\n' ||
    '  if public.crew_join_blocked_2026(v_crew.id) then' || E'\n' ||
    '    return jsonb_build_object(''ok'', false, ''reason'', ''blocked'');' || E'\n' ||
    '  end if;' || E'\n' || E'\n';
  target text;
  definition text;
begin
  foreach target in array array['public.join_crew_by_code(text)','public.redeem_crew_invite(text)'] loop
    definition := pg_get_functiondef(target::regprocedure);
    if position('crew_join_blocked_2026' in definition) > 0 then
      continue;  -- déjà patchée (rejeu de migration) : on ne double pas la garde
    end if;
    if position(anchor in definition) = 0 then
      raise exception 'ancre introuvable dans %, la garde de blocage ne serait pas posée', target;
    end if;
    definition := replace(definition, anchor, guard || anchor);
    execute definition;
  end loop;
end $patch$;

comment on function public.join_crew_by_code(text) is
  'Rejoindre un crew par code. Motif UNIQUE bad_code (code mal formé = code '
  'inexistant : zéro énumération). Depuis 0139 : refus `blocked` si un blocage '
  'existe dans un sens ou l''autre avec la direction du crew visé. Le DERNIER '
  'CHEF ne part pas par cette porte non plus : must_transfer_lead (0098). '
  'Cooldown CREW_SWITCH_COOLDOWN_DAYS sur les seuls départs VOLONTAIRES (0093). '
  'Refuse un crew sans aucun membre actif (dead_crew).';

comment on function public.redeem_crew_invite(text) is
  'Consommer un lien d''invitation de crew. Depuis 0139 : refus `blocked` si un '
  'blocage existe dans un sens ou l''autre avec la direction du crew — une '
  'invitation n''achète pas le droit de contourner un blocage. La garde est '
  'posée avant le compteur d''usages : un refus ne consomme jamais le lien.';
