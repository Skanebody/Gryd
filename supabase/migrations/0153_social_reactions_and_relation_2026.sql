-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0153 — TROIS RÉACTIONS HUMAINES, UN LIEN PROFOND QUI TIENT, UN ÉTAT DE   ║
-- ║        RELATION QUI EXISTE                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Trois constats, une seule migration parce qu'ils touchent les trois mêmes
-- fonctions de 0124 et qu'on ne réécrit pas un corps deux fois.
--
-- ═══ 1. « LIKE » DÉGUISÉ → LES TROIS RÉACTIONS DU CAHIER (§13.4) ═══════════
-- §13.4 : « Réactions limitées et humaines : encouragement, merci, à la
-- prochaine. » `social_reactions_2026` (0124) est une table à DEUX colonnes de
-- clé : réagir, c'est exister ou ne pas exister. C'est un like.
--
-- LIMITÉES, ET C'EST LE MOT IMPORTANT : la clé primaire reste (post, personne).
-- Une personne pose UNE réaction, et en choisir une autre REMPLACE la
-- précédente. Le cahier demande plus RICHE, pas plus ABONDANT — trois
-- compteurs qu'on peut empiler seraient trois likes au lieu d'un.
--
-- La liste est FERMÉE par un CHECK : pas d'emoji libre, donc pas de modération
-- d'emoji à inventer, et pas de réaction qui se lise comme une moquerie.
--
-- ═══ 2. UN LIEN PROFOND VERS UN POST VÉLO OUVRAIT UN VIDE ══════════════════
-- `social_feed_2026(p_activity, p_post_id)` (0124:170) filtre TOUJOURS sur
-- `r.activity = p_activity`. L'écran `/crew-feed` ne connaît pas la discipline
-- d'un post ouvert par identifiant : il envoie sa valeur par défaut, 'run'
-- (`app/crew-feed.tsx:15`). Un lien profond vers une sortie à VÉLO rendait donc
-- zéro ligne, et l'écran affichait « Cette publication n'est plus accessible » —
-- une affirmation FAUSSE sur un contenu qui existe et qu'on a le droit de voir.
-- Le client ne PEUT pas corriger ça : il faudrait connaître la discipline avant
-- de lire le post. Le filtre ne s'applique donc plus quand un identifiant
-- précis est demandé. Aucune audience n'est élargie : `social_post_visible_2026`
-- reste seul juge de qui voit quoi.
--
-- ═══ 3. TROIS ACTIONS PEINTES ENSEMBLE SUR UNE RELATION INCONNUE ═══════════
-- `app/member.tsx` peignait « Demander en ami », « Suivre » ET « Ne plus
-- suivre » en même temps, parce que `social_member_2026` ne renvoie AUCUN état
-- de relation. Deux de ces trois échouent toujours (ou ne font rien) : ce sont
-- des boutons morts, interdits. La relation existe pourtant en base
-- (`follows` 0088, `friendships` 0011, `social_blocks_2026` 0124) — elle
-- n'était simplement pas lue. Elle l'est maintenant, du point de vue du
-- LECTEUR, et seulement pour lui.
--
-- ⚠️ CE QUE LA RELATION NE DIT PAS : ni depuis quand, ni combien d'abonnés a la
-- personne, ni qui la suit. Ce sont MES arêtes à moi, celles qui décident de ce
-- que j'ai le droit de faire — pas un tableau de bord sur quelqu'un d'autre.
--
-- ═══ ADDITIVE ═══════════════════════════════════════════════════════════════
-- Une colonne AJOUTÉE avec un défaut (aucune ligne existante n'est réécrite :
-- une réaction d'avant est un encouragement, ce qu'elle était déjà), trois
-- fonctions remplacées, une fonction ajoutée. Aucune donnée supprimée.
-- ════════════════════════════════════════════════════════════════════════════

-- ═══ 1. LA COLONNE : trois valeurs, jamais un texte libre ══════════════════
alter table public.social_reactions_2026
  add column if not exists kind text not null default 'cheer';

do $$ begin
  alter table public.social_reactions_2026
    add constraint social_reactions_2026_kind_check
    -- §13.4 : encouragement, merci, à la prochaine. Liste FERMÉE.
    check (kind in ('cheer', 'thanks', 'next_time'));
exception when duplicate_object then null;
end $$;

comment on column public.social_reactions_2026.kind is
  '§13.4 — encouragement (cheer), merci (thanks), à la prochaine (next_time). '
  'La clé primaire reste (post_id, user_id) : UNE réaction par personne et par '
  'publication, remplaçable. Les lignes d''avant 0153 valent ''cheer'', ce '
  'qu''elles étaient déjà — aucune n''est réinterprétée.';

-- ═══ 2. RÉAGIR — la nouvelle porte, et l'ancienne qui n'est pas morte ══════
create or replace function public.social_react_2026(
  p_post_id uuid, p_kind text, p_reacted boolean
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not social_post_visible_2026(p_post_id) then raise exception 'post_unavailable'; end if;
  if p_kind is null or p_kind not in ('cheer', 'thanks', 'next_time') then
    -- Un motif inconnu n'est pas ramené sur « encouragement » : le serveur ne
    -- devine pas ce qu'une personne a voulu dire.
    raise exception 'invalid_reaction';
  end if;
  if p_reacted is true then
    insert into social_reactions_2026(post_id, user_id, kind)
    values (p_post_id, auth.uid(), p_kind)
    on conflict (post_id, user_id) do update set kind = excluded.kind, created_at = now();
  else
    -- On ne retire QUE si c'est bien celle-là : un double tap sur « merci »
    -- alors qu'on avait posé « à la prochaine » ne doit pas effacer l'autre.
    delete from social_reactions_2026
    where post_id = p_post_id and user_id = auth.uid() and kind = p_kind;
  end if;
end $$;

revoke all on function public.social_react_2026(uuid, text, boolean) from public, anon;
grant execute on function public.social_react_2026(uuid, text, boolean) to authenticated;

-- L'ANCIENNE SIGNATURE SURVIT, et ce n'est pas de la complaisance : un client
-- déjà installé l'appelle (`p_post_id` + `p_reacted`). La supprimer casserait
-- son bouton d'encouragement sans rien améliorer. Elle délègue, elle ne
-- duplique pas la règle.
create or replace function public.social_react_2026(p_post_id uuid, p_reacted boolean)
returns void language sql security definer set search_path = public, pg_temp as $$
  select public.social_react_2026(p_post_id, 'cheer', p_reacted);
$$;

revoke all on function public.social_react_2026(uuid, boolean) from public, anon;
grant execute on function public.social_react_2026(uuid, boolean) to authenticated;

-- ═══ 3. LE FIL — trois compteurs, MA réaction, et le lien profond réparé ═══
create or replace function public.social_feed_2026(
  p_activity text default 'run', p_post_id uuid default null
) returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
 select coalesce(jsonb_agg(x.item order by x.created_at desc),'[]') from (
 select p.created_at,jsonb_build_object('id',p.id,'body',p.body,'mediaPath',p.media_path,'createdAt',p.created_at,'mine',p.author_id=auth.uid(),
 'author',jsonb_build_object('id',p.author_id,'handle',u.handle,'name',coalesce(u.display_name,u.handle),'avatarPath',case when social_profile_visible_2026(p.author_id) then u.avatar_path_2026 else null end),
 'activity',r.activity,'distanceM',r.distance_m,'durationS',r.duration_s,
 'reactionCount',(select count(*) from social_reactions_2026 a where a.post_id=p.id and not social_blocked_2026(auth.uid(),a.user_id)),
 -- §13.4 : le DÉTAIL par réaction. Trois compteurs, jamais un total qui
 -- écraserait « merci » et « encouragement » dans le même nombre.
 'reactions',jsonb_build_object(
   'cheer',(select count(*) from social_reactions_2026 a where a.post_id=p.id and a.kind='cheer' and not social_blocked_2026(auth.uid(),a.user_id)),
   'thanks',(select count(*) from social_reactions_2026 a where a.post_id=p.id and a.kind='thanks' and not social_blocked_2026(auth.uid(),a.user_id)),
   'nextTime',(select count(*) from social_reactions_2026 a where a.post_id=p.id and a.kind='next_time' and not social_blocked_2026(auth.uid(),a.user_id))),
 -- LA MIENNE, nommée : sans elle l'écran ne saurait pas laquelle est allumée.
 'myReaction',(select a.kind from social_reactions_2026 a where a.post_id=p.id and a.user_id=auth.uid()),
 'reacted',exists(select 1 from social_reactions_2026 a where a.post_id=p.id and a.user_id=auth.uid()),
 'commentCount',(select count(*) from social_comments_2026 c where c.post_id=p.id and c.removed_at is null and not social_blocked_2026(auth.uid(),c.author_id))) item
 from social_posts_2026 p join runs r on r.id=p.run_id join user_profiles u on u.user_id=p.author_id
 -- LE FILTRE DE DISCIPLINE NE S'APPLIQUE PAS À UNE DEMANDE NOMMÉE. Sinon un
 -- lien profond vers une sortie à vélo répond « plus accessible » alors que la
 -- publication existe et est visible. L'audience, elle, ne bouge pas d'un iota :
 -- `social_post_visible_2026` reste seul juge.
 where (p_post_id is not null or r.activity=p_activity) and (p_post_id is null or p.id=p_post_id) and social_post_visible_2026(p.id)
 order by p.created_at desc limit 50) x
$$;

comment on function public.social_feed_2026(text, uuid) is
  'Fil du crew. Depuis 0153 : trois compteurs de réaction (§13.4) + la mienne '
  'nommée, et le filtre de discipline ne s''applique plus quand une publication '
  'est demandée par identifiant — un lien profond vers une sortie à vélo '
  'affichait « plus accessible » sur un contenu bien visible.';

revoke all on function public.social_feed_2026(text, uuid) from public, anon;
grant execute on function public.social_feed_2026(text, uuid) to authenticated;

-- ═══ 4. LA RELATION — ce que J'AI le droit de faire, et rien de plus ═══════
create or replace function public.social_member_2026(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
 select jsonb_build_object('id',user_id,'handle',handle,'name',coalesce(display_name,handle),'bio',bio,
   'avatarPath',avatar_path_2026,'isMe',user_id=auth.uid(),
   -- MES arêtes vers cette personne. Vues du LECTEUR, jamais un tableau de bord
   -- sur quelqu'un d'autre : ni nombre d'abonnés, ni ancienneté, ni qui la suit.
   'relation',case when user_id = auth.uid() or auth.uid() is null then null else jsonb_build_object(
     'following',exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.followee_id=p_user_id),
     'friend',exists(select 1 from public.friendships fr where fr.status='accepted'
       and least(fr.requester_id,fr.addressee_id)=least(auth.uid(),p_user_id)
       and greatest(fr.requester_id,fr.addressee_id)=greatest(auth.uid(),p_user_id)),
     -- Qui a demandé décide de l'action possible : envoyer, ou répondre.
     'requestSent',exists(select 1 from public.friendships fr where fr.status='pending'
       and fr.requester_id=auth.uid() and fr.addressee_id=p_user_id),
     'requestReceived',exists(select 1 from public.friendships fr where fr.status='pending'
       and fr.requester_id=p_user_id and fr.addressee_id=auth.uid()),
     'blocked',exists(select 1 from public.social_blocks_2026 b where b.owner_id=auth.uid() and b.target_id=p_user_id)
   ) end)
 from user_profiles where user_id=p_user_id and social_profile_visible_2026(user_id)
$$;

comment on function public.social_member_2026(uuid) is
  'Fiche d''un membre + MA relation à lui (0153). Sans cet état, l''écran '
  'peignait « Suivre », « Ne plus suivre » et « Demander en ami » ensemble : '
  'deux boutons morts sur trois. `relation` est nulle sur mon propre profil et '
  'hors session. Elle ne dit RIEN des autres liens de cette personne.';

revoke all on function public.social_member_2026(uuid) from public, anon;
grant execute on function public.social_member_2026(uuid) to authenticated;
