-- ════════════════════════════════════════════════════════════════════════════
-- 0181 — CE QUE PORTE QUELQU'UN D'AUTRE, LÀ OÙ SON PROFIL EST VU
-- ════════════════════════════════════════════════════════════════════════════
--
-- 0180 pose l'équipement et sa lecture PRIVÉE (`get_profile_cosmetics_2026`,
-- clé sur `auth.uid()`). Sans cette migration-ci, un joueur pourrait donc
-- choisir une couleur de nom, un cadre et une bannière… que PERSONNE d'autre ne
-- verrait jamais. Un cosmétique invisible aux autres n'est pas un cosmétique :
-- c'est un réglage privé, et le vendre un jour serait vendre du vide.
--
-- ─── CE QUI SORT, ET CE QUI NE SORT PAS ─────────────────────────────────────
-- CINQ emplacements sur sept : la couleur du nom, le cadre d'avatar, la
-- bannière, le pin et le badge de titre. Ce sont exactement les objets qu'un
-- profil MONTRE, donc ceux qu'un lecteur de ce profil doit connaître pour le
-- peindre.
--
-- DEUX emplacements restent PRIVÉS, et ce n'est pas un oubli :
--  · `trace` — le style de MA trace sur MA carte. La trace d'un tiers n'est
--    jamais servie à un autre joueur (le dépôt protège la trace partout
--    ailleurs) ; envoyer son style laisserait croire qu'il existe une trace à
--    peindre, et ce serait un champ mort dans une réponse publique.
--  · `cardTheme` — le thème de MES cartes de partage. Il voyage avec l'image
--    exportée, pas avec la fiche d'un membre.
-- Aucun champ nouveau ne décrit une PERSONNE : ni date, ni compte, ni activité.
-- La règle du dépôt tient (« MES arêtes vers cette personne, jamais un tableau
-- de bord sur elle ») : ces cinq identifiants sont du RENDU, pas de la donnée.
--
-- ─── POURQUOI PASSER PAR `social_member_2026` ET PAS PAR UNE RPC DE PLUS ────
-- La fiche d'un membre a DÉJÀ sa porte, et cette porte a déjà sa garde :
-- `social_profile_visible_2026(user_id)`. Une seconde RPC devrait la recopier —
-- et une garde recopiée est une garde qui divergera. En greffant le champ sur
-- la fonction existante, un profil masqué reste masqué avec ses cosmétiques,
-- sans qu'aucune ligne supplémentaire n'ait à s'en souvenir. Les trois
-- lectures qui appellent `social_member_2026` (recherche, fiche, membres du
-- crew) en héritent d'un coup, sans nouvelle surface.
--
-- Requiert : 0124 (social), 0153 (relation), 0180 (cosmétiques).

-- Les cinq emplacements PUBLICS, et la garde de visibilité avec eux. Une
-- fonction dédiée plutôt qu'une sous-requête recopiée : le jour où un sixième
-- emplacement devient public, il se déclare ICI, une fois.
create function public.public_profile_cosmetics_2026(p_user_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_object_agg(slot,item_id),'{}'::jsonb)
  from public.profile_cosmetics_2026
  where user_id=p_user_id
    and slot in ('nameColor','avatarFrame','banner','pin','titleBadge')
    and public.social_profile_visible_2026(p_user_id);
$$;

comment on function public.public_profile_cosmetics_2026(uuid) is
  'Les cinq cosmétiques VISIBLES d''un profil. `trace` et `cardTheme` restent '
  'privés : la trace d''un tiers n''est jamais servie, et le thème de partage '
  'voyage avec l''image, pas avec la fiche. Rien ici ne décrit la personne.';

-- Même corps qu'en 0153, plus `cosmetics`. La relation, elle, ne bouge pas :
-- elle reste nulle sur mon propre profil et hors session.
create or replace function public.social_member_2026(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
 select jsonb_build_object('id',user_id,'handle',handle,'name',coalesce(display_name,handle),'bio',bio,
   'avatarPath',avatar_path_2026,'isMe',user_id=auth.uid(),
   'cosmetics',public.public_profile_cosmetics_2026(p_user_id),
   'relation',case when user_id = auth.uid() or auth.uid() is null then null else jsonb_build_object(
     'following',exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.followee_id=p_user_id),
     'friend',exists(select 1 from public.friendships fr where fr.status='accepted'
       and least(fr.requester_id,fr.addressee_id)=least(auth.uid(),p_user_id)
       and greatest(fr.requester_id,fr.addressee_id)=greatest(auth.uid(),p_user_id)),
     'requestSent',exists(select 1 from public.friendships fr where fr.status='pending'
       and fr.requester_id=auth.uid() and fr.addressee_id=p_user_id),
     'requestReceived',exists(select 1 from public.friendships fr where fr.status='pending'
       and fr.requester_id=p_user_id and fr.addressee_id=auth.uid()),
     'blocked',exists(select 1 from public.social_blocks_2026 b where b.owner_id=auth.uid() and b.target_id=p_user_id)
   ) end)
 from user_profiles where user_id=p_user_id and social_profile_visible_2026(user_id)
$$;

comment on function public.social_member_2026(uuid) is
  'Fiche d''un membre + MA relation à lui (0153) + ses cosmétiques VISIBLES '
  '(0181). Sans les cosmétiques, un joueur choisissait une apparence que '
  'personne d''autre ne voyait. `relation` est nulle sur mon propre profil et '
  'hors session. Elle ne dit RIEN des autres liens de cette personne.';

revoke all on function public.public_profile_cosmetics_2026(uuid) from public, anon;
grant execute on function public.public_profile_cosmetics_2026(uuid) to authenticated;
revoke all on function public.social_member_2026(uuid) from public, anon;
grant execute on function public.social_member_2026(uuid) to authenticated;
