-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — LES SIGNALEMENTS SONT TRAITÉS, ET LA DIRECTION D'UN CREW PEUT RETIRER.
--
-- LES DEUX DÉFAUTS CORRIGÉS (cahier §13.5, App Review 1.2) :
--   1. `social_reports_2026.reviewed_at` (0124:40) n'était JAMAIS écrit. Aucune
--      RPC, aucun job, aucune vue ne le touchait : un signalement entrait dans
--      la table et n'en sortait plus. « Une personne l'examine » était donc une
--      phrase sans destinataire.
--   2. `social_remove_2026` (0124:202) filtre sur `author_id = auth.uid()` : un
--      capitaine ne pouvait pas retirer du fil de SON crew la publication ou le
--      commentaire d'un autre — alors qu'il le peut déjà pour un MESSAGE
--      (`crew_message_remove_2026`, 0127). Le fil était le seul endroit sans
--      recours : signaler, attendre, et regarder le contenu rester.
--
-- CE QUI EST AJOUTÉ, ET RIEN DE PLUS :
--   · `social_moderate_2026(kind, id, action)` — ouverte au `founder` et au
--     `co_captain` du crew PROPRIÉTAIRE du contenu, personne d'autre ;
--   · `removed_by` sur les trois tables de contenu, `reviewed_by` sur les deux
--     tables de signalement : un retrait sans auteur n'est pas auditable ;
--   · `social_reports_queue_2026` — la file des signalements OUVERTS, priorité
--     aux menaces, réservée au `service_role`.
--
-- ⚠️ PAS DE RÔLE `moderator` GLOBAL, ET VOICI POURQUOI. Le dépôt n'a AUCUN
-- modèle de rôle hors crew : `crew_members.role` est borné à sept valeurs de
-- crew (0093:104), et « moderator » n'existe que comme HANDLE RÉSERVÉ (0047) —
-- pas comme une habilitation. En inventer une ici, ce serait décider seul qui
-- l'attribue, par quelle surface, et avec quel journal : un arbitrage produit,
-- pas un correctif. La modération centrale passe donc par la file
-- `service_role`, exactement comme `admin_reports_queue` (0046 §8) pour le
-- monde legacy. Le jour où un rôle staff existera, il s'ajoutera à la garde de
-- `social_moderation_role_2026` — un seul endroit à changer.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.social_posts_2026 add column removed_by uuid references public.users(id) on delete set null;
alter table public.social_comments_2026 add column removed_by uuid references public.users(id) on delete set null;
alter table public.crew_messages_2026 add column removed_by uuid references public.users(id) on delete set null;
alter table public.social_reports_2026 add column reviewed_by uuid references public.users(id) on delete set null;
alter table public.crew_message_reports_2026 add column reviewed_at timestamptz;
alter table public.crew_message_reports_2026 add column reviewed_by uuid references public.users(id) on delete set null;
create index crew_message_reports_2026_open on public.crew_message_reports_2026(created_at) where reviewed_at is null;

-- ─── Le crew PROPRIÉTAIRE d'un contenu, quel que soit son genre ─────────────
-- Une seule fonction, pour qu'il n'existe qu'une définition de « à quel crew
-- appartient ce contenu ». Rend NULL quand le contenu n'existe pas, ou quand il
-- n'a pas de crew (signalement visant une PERSONNE) : dans les deux cas, aucune
-- direction de crew n'a autorité, et l'appelant sera refusé.
create function public.social_content_crew_2026(p_kind text, p_id uuid)
returns uuid language sql stable security definer set search_path=public,pg_temp as $$
  select case p_kind
    when 'post' then (select crew_id from public.social_posts_2026 where id = p_id)
    when 'comment' then (select p.crew_id from public.social_comments_2026 c
                          join public.social_posts_2026 p on p.id = c.post_id where c.id = p_id)
    when 'message' then (select crew_id from public.crew_messages_2026 where id = p_id)
    when 'report' then (select coalesce(
        (select p.crew_id from public.social_posts_2026 p where p.id = r.post_id),
        (select p.crew_id from public.social_comments_2026 c
          join public.social_posts_2026 p on p.id = c.post_id where c.id = r.comment_id))
      from public.social_reports_2026 r where r.id = p_id)
    else null end
$$;

-- ─── L'habilitation ────────────────────────────────────────────────────────
-- Le rôle de l'appelant DANS le crew propriétaire, ou NULL. C'est l'unique
-- endroit qui décide « cette personne peut-elle modérer ce contenu ».
create function public.social_moderation_role_2026(p_kind text, p_id uuid)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select m.role from public.crew_members m
   where m.user_id = auth.uid() and m.left_at is null
     and m.crew_id = public.social_content_crew_2026(p_kind, p_id)
     and m.role in ('founder','co_captain')
$$;

create function public.social_moderate_2026(p_kind text, p_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_post uuid;
  v_comment uuid;
  v_message uuid;
  v_reviewed integer := 0;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_kind is null or p_kind not in ('post','comment','message','report')
     or p_action is null or p_action not in ('remove','dismiss') or p_id is null then
    raise exception 'invalid_moderation';
  end if;

  -- LA GARDE : la direction du crew PROPRIÉTAIRE, et elle seule. La direction
  -- d'un AUTRE crew n'a aucun pouvoir ici — c'est le refus qui compte le plus,
  -- parce que sans lui n'importe quel capitaine effacerait le fil du voisin.
  v_role := public.social_moderation_role_2026(p_kind, p_id);
  if v_role is null then raise exception 'forbidden'; end if;

  -- On résout la CIBLE réelle. Un signalement (`report`) désigne un contenu :
  -- classer ou retirer se fait sur ce contenu, jamais sur la ligne de
  -- signalement — sinon « classer » effacerait la trace de l'alerte.
  if p_kind = 'report' then
    select post_id, comment_id into v_post, v_comment from public.social_reports_2026 where id = p_id;
  elsif p_kind = 'post' then v_post := p_id;
  elsif p_kind = 'comment' then v_comment := p_id;
  else v_message := p_id;
  end if;

  if p_action = 'remove' then
    if v_comment is not null then
      update public.social_comments_2026
         set removed_at = coalesce(removed_at, now()), removed_by = coalesce(removed_by, v_uid)
       where id = v_comment;
    elsif v_post is not null then
      update public.social_posts_2026
         set removed_at = coalesce(removed_at, now()), removed_by = coalesce(removed_by, v_uid)
       where id = v_post;
    elsif v_message is not null then
      update public.crew_messages_2026
         set removed_at = coalesce(removed_at, now()), removed_by = coalesce(removed_by, v_uid)
       where id = v_message;
    else
      -- Un signalement visant une PERSONNE n'a pas de contenu à retirer : il
      -- relève de la file service_role, pas d'une direction de crew.
      raise exception 'no_content_to_remove';
    end if;
    if not found then raise exception 'content_unavailable'; end if;
  end if;

  -- ── Le signalement est TRAITÉ, dans les deux actions ────────────────────
  -- `remove` comme `dismiss` referment les alertes liées : c'est exactement ce
  -- que `reviewed_at` n'avait jamais reçu. On ne réécrit jamais une revue déjà
  -- posée (`where reviewed_at is null`) : la première décision fait foi.
  with closed as (
    update public.social_reports_2026 r
       set reviewed_at = now(), reviewed_by = v_uid
     where r.reviewed_at is null
       and ((v_post is not null and r.post_id = v_post)
         or (v_comment is not null and r.comment_id = v_comment))
    returning 1
  ) select count(*)::integer into v_reviewed from closed;

  if v_message is not null then
    with closed as (
      update public.crew_message_reports_2026 r
         set reviewed_at = now(), reviewed_by = v_uid
       where r.reviewed_at is null and r.message_id = v_message
      returning 1
    ) select v_reviewed + count(*)::integer into v_reviewed from closed;
  end if;

  return jsonb_build_object('ok', true, 'kind', p_kind, 'id', p_id,
    'action', p_action, 'reportsReviewed', v_reviewed);
end $$;

revoke all on function public.social_content_crew_2026(text,uuid) from public,anon,authenticated;
revoke all on function public.social_moderation_role_2026(text,uuid) from public,anon;
revoke all on function public.social_moderate_2026(text,uuid,text) from public,anon;
grant execute on function public.social_content_crew_2026(text,uuid) to service_role;
grant execute on function public.social_moderation_role_2026(text,uuid) to authenticated,service_role;
grant execute on function public.social_moderate_2026(text,uuid,text) to authenticated,service_role;

comment on function public.social_moderate_2026(text,uuid,text) is
  'Retire (remove) ou classe (dismiss) un contenu de crew. Ouverte au founder '
  'et au co_captain du crew PROPRIÉTAIRE uniquement — jamais à un membre '
  'ordinaire, jamais à la direction d''un autre crew. Les deux actions '
  'renseignent reviewed_at/reviewed_by sur les signalements liés : c''est ce '
  'qui manquait depuis 0124. Ne supprime jamais une ligne de signalement — une '
  'alerte classée reste une alerte reçue.';

-- ─── CE QUE LA DIRECTION D'UN CREW VOIT, ET RIEN DE PLUS ────────────────────
-- Sans surface, « Retirer » et « Classer » seraient des boutons sans objet : la
-- direction ne saurait même pas qu'un contenu a été signalé. Cette RPC lui rend
-- les alertes OUVERTES de SON crew — jamais celles d'un autre.
--
-- L'IDENTITÉ DE CELUI QUI SIGNALE N'EN SORT JAMAIS. Dans un crew de dix
-- personnes, nommer l'auteur d'un signalement, c'est le désigner à celui qu'il
-- signale. On rend le NOMBRE d'alertes et le motif le plus grave, pas les noms.
-- L'auteur du CONTENU, lui, est déjà visible dans le fil : le taire ici ne
-- protégerait personne et rendrait la modération aveugle.
create function public.social_moderation_queue_2026()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_crew uuid; v_role text; v_items jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'reason','signed_out'); end if;
  select crew_id, role into v_crew, v_role from public.crew_members
   where user_id = auth.uid() and left_at is null;
  if v_crew is null then return jsonb_build_object('ok',false,'reason','no_crew'); end if;
  if v_role is null or v_role not in ('founder','co_captain') then
    -- Membre ordinaire : réponse VALIDE et explicite, pas une erreur. L'écran
    -- doit pouvoir ne rien peindre sans avoir à deviner pourquoi.
    return jsonb_build_object('ok',true,'canModerate',false,'items','[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(x.item order by x.priority, x.oldest),'[]') into v_items from (
    select q.priority, q.oldest, jsonb_build_object('kind',q.kind,'id',q.id,'excerpt',left(q.body,140),
      'author',q.author,'reports',q.reports,'reason',q.reason,'oldest',q.oldest) item
    from (
      select 'post' as kind, p.id, left(p.body,140) as body,
        coalesce(up.display_name, up.handle) as author, count(*)::int as reports,
        min(r.created_at) as oldest,
        min(case r.reason when 'harassment' then 0 when 'privacy' then 1 when 'inappropriate' then 2 else 3 end) as priority,
        (array_agg(r.reason order by case r.reason when 'harassment' then 0 when 'privacy' then 1 when 'inappropriate' then 2 else 3 end))[1] as reason
      from public.social_reports_2026 r
      join public.social_posts_2026 p on p.id = r.post_id
      left join public.user_profiles up on up.user_id = p.author_id
      where r.reviewed_at is null and p.crew_id = v_crew and p.removed_at is null
      group by p.id, p.body, up.display_name, up.handle
      union all
      select 'comment', c.id, left(c.body,140),
        coalesce(up.display_name, up.handle), count(*)::int, min(r.created_at),
        min(case r.reason when 'harassment' then 0 when 'privacy' then 1 when 'inappropriate' then 2 else 3 end),
        (array_agg(r.reason order by case r.reason when 'harassment' then 0 when 'privacy' then 1 when 'inappropriate' then 2 else 3 end))[1]
      from public.social_reports_2026 r
      join public.social_comments_2026 c on c.id = r.comment_id
      join public.social_posts_2026 p on p.id = c.post_id
      left join public.user_profiles up on up.user_id = c.author_id
      where r.reviewed_at is null and p.crew_id = v_crew and c.removed_at is null
      group by c.id, c.body, up.display_name, up.handle
      union all
      select 'message', m.id, left(m.body,140),
        coalesce(up.display_name, up.handle), count(*)::int, min(r.created_at),
        min(case r.reason when 'harassment' then 0 else 3 end),
        (array_agg(r.reason order by case r.reason when 'harassment' then 0 else 3 end))[1]
      from public.crew_message_reports_2026 r
      join public.crew_messages_2026 m on m.id = r.message_id
      left join public.user_profiles up on up.user_id = m.author_id
      where r.reviewed_at is null and m.crew_id = v_crew and m.removed_at is null
      group by m.id, m.body, up.display_name, up.handle
    ) q
    order by q.priority, q.oldest limit 50
  ) x;
  return jsonb_build_object('ok',true,'canModerate',true,'items',v_items);
end $$;

revoke all on function public.social_moderation_queue_2026() from public,anon;
grant execute on function public.social_moderation_queue_2026() to authenticated,service_role;

comment on function public.social_moderation_queue_2026() is
  'Alertes OUVERTES du crew de l''appelant, pour sa DIRECTION seulement. '
  'canModerate=false pour un membre ordinaire (réponse valide, pas une erreur). '
  'Ne rend JAMAIS l''identité de celui qui signale : dans un petit crew, ce '
  'serait le désigner à celui qu''il signale. Priorité 0 = harcèlement.';

-- ─── LA FILE DE MODÉRATION (service_role) ───────────────────────────────────
-- Ce que 0124 n'avait pas : une surface où les signalements sont VUS. Priorité
-- aux menaces (§13.5) — le harcèlement d'abord, puis la vie privée, puis le
-- reste. Union des deux mondes de contenu pour qu'il n'y ait qu'UNE file à
-- regarder ; sans elle, la conversation de crew aurait sa propre file oubliée.
create view public.social_reports_queue_2026 as
  select 'social'::text as source, r.id::text as report_id, r.created_at, r.reason,
    case r.reason when 'harassment' then 0 when 'privacy' then 1 when 'inappropriate' then 2 else 3 end as priority,
    case when r.post_id is not null then 'post' when r.comment_id is not null then 'comment' else 'profile' end as target_kind,
    coalesce(r.post_id, r.comment_id, r.target_user_id) as target_id,
    public.social_content_crew_2026('report', r.id) as crew_id,
    r.reporter_id,
    coalesce(
      (select p.removed_at from public.social_posts_2026 p where p.id = r.post_id),
      (select c.removed_at from public.social_comments_2026 c where c.id = r.comment_id)) as content_removed_at
  from public.social_reports_2026 r
  where r.reviewed_at is null
  union all
  select 'crew_message'::text, r.message_id::text || ':' || r.reporter_id::text, r.created_at, r.reason,
    case r.reason when 'harassment' then 0 else 3 end,
    'message', r.message_id,
    (select m.crew_id from public.crew_messages_2026 m where m.id = r.message_id),
    r.reporter_id,
    (select m.removed_at from public.crew_messages_2026 m where m.id = r.message_id)
  from public.crew_message_reports_2026 r
  where r.reviewed_at is null;

revoke all on public.social_reports_queue_2026 from public,anon,authenticated;
grant select on public.social_reports_queue_2026 to service_role;

comment on view public.social_reports_queue_2026 is
  'File des signalements OUVERTS (reviewed_at is null), fil et conversation de '
  'crew réunis, triable par `priority` — 0 = menace (harcèlement), 1 = vie '
  'privée. service_role UNIQUEMENT : aucun compteur public de signalements, '
  'jamais de surface de honte.';
