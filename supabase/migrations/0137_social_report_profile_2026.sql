-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — ON PEUT SIGNALER UNE PERSONNE, PAS SEULEMENT UN CONTENU.
--
-- LE DÉFAUT CORRIGÉ (App Review 1.2, cahier §13.5) : `social_report_2026`
-- (0124:209) n'acceptait qu'un `post_id` OU un `comment_id`, et la contrainte
-- de table imposait exactement l'un des deux. Le profil d'un membre
-- (`app/member.tsx`) offrait donc « Bloquer » sans « Signaler » : quelqu'un dont
-- le HANDLE, le NOM ou la BIO sont le problème — ou qui harcèle hors du fil —
-- ne pouvait être signalé nulle part. Bloquer protège celui qui bloque ;
-- signaler prévient la modération. Ce ne sont pas les mêmes gestes.
--
-- CE QUI CHANGE : une troisième cible possible, et TOUJOURS une seule à la fois.
-- La contrainte passe de « l'un des deux » à « exactement un des trois » — elle
-- reste donc aussi stricte, et un signalement ne peut pas viser deux objets.
--
-- QUI PEUT SIGNALER QUI : celui qui peut VOIR le profil (même autorité
-- d'audience que partout ailleurs, `social_profile_visible_2026`), plus celui
-- qui a DÉJÀ bloqué la personne. Ce second cas n'est pas un détail : bloquer
-- rend le profil invisible, et sans lui « je bloque d'abord, je signale
-- ensuite » — l'ordre naturel quand on est visé — deviendrait impossible.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.social_reports_2026
  add column target_user_id uuid references public.users(id) on delete cascade;

-- La contrainte de 0124 est anonyme (`check((post_id is null) <> (comment_id is
-- null))`) : on la retrouve par sa DÉFINITION, jamais par un nom généré qu'une
-- version de PostgreSQL pourrait former autrement.
do $drop$
declare v_name text;
begin
  select conname into v_name from pg_constraint
   where conrelid = 'public.social_reports_2026'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%post_id IS NULL%'
     and pg_get_constraintdef(oid) ilike '%comment_id IS NULL%';
  if v_name is not null then
    execute format('alter table public.social_reports_2026 drop constraint %I', v_name);
  end if;
end $drop$;

alter table public.social_reports_2026 add constraint social_reports_one_target_2026
  check ((post_id is not null)::int + (comment_id is not null)::int
       + (target_user_id is not null)::int = 1);

-- Un signalement par personne et par cible : re-signaler n'empile pas la file
-- de modération, et ne devient pas une mesure de la popularité d'une haine.
create unique index social_reports_2026_user_unique
  on public.social_reports_2026(reporter_id, target_user_id) where target_user_id is not null;
create index social_reports_2026_open on public.social_reports_2026(created_at) where reviewed_at is null;

-- Signaler quelqu'un ne peut jamais se retourner contre lui : on ne peut pas se
-- signaler soi-même, et un signalement ne vise personne d'autre que la cible.
alter table public.social_reports_2026 add constraint social_reports_not_self_2026
  check (target_user_id is null or target_user_id <> reporter_id);

-- L'ancienne signature est SUPPRIMÉE plutôt que surchargée : deux fonctions de
-- même nom, l'une à 3 arguments et l'autre à 4 avec défaut, rendraient l'appel
-- à 3 arguments ambigu pour PostgREST. Les clients déjà installés continuent de
-- fonctionner : ils passent leurs arguments par NOM, et le quatrième a un défaut.
drop function if exists public.social_report_2026(text, uuid, uuid);

create function public.social_report_2026(
  p_reason text, p_post_id uuid default null, p_comment_id uuid default null,
  p_target_user_id uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_post uuid := p_post_id;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_reason is null or p_reason not in ('harassment','privacy','inappropriate','other') then
    raise exception 'invalid_reason';
  end if;
  if (p_post_id is not null)::int + (p_comment_id is not null)::int
     + (p_target_user_id is not null)::int <> 1 then
    raise exception 'invalid_target';
  end if;

  -- ── Signalement d'une PERSONNE ──────────────────────────────────────────
  if p_target_user_id is not null then
    if p_target_user_id = auth.uid() then raise exception 'invalid_target'; end if;
    if not (public.social_profile_visible_2026(p_target_user_id)
            or exists(select 1 from public.social_blocks_2026
                       where owner_id = auth.uid() and target_id = p_target_user_id)) then
      raise exception 'profile_unavailable';
    end if;
    insert into public.social_reports_2026(reporter_id, target_user_id, reason)
      values(auth.uid(), p_target_user_id, p_reason) on conflict do nothing;
    return;
  end if;

  -- ── Signalement d'un CONTENU (comportement de 0124, inchangé) ───────────
  if p_comment_id is not null then
    select post_id into v_post from social_comments_2026 where id = p_comment_id and removed_at is null;
  end if;
  if not social_post_visible_2026(v_post) then raise exception 'post_unavailable'; end if;
  insert into social_reports_2026(reporter_id, post_id, comment_id, reason)
    values(auth.uid(), case when p_comment_id is null then v_post else null end, p_comment_id, p_reason)
    on conflict do nothing;
end $$;

revoke all on function public.social_report_2026(text,uuid,uuid,uuid) from public,anon;
grant execute on function public.social_report_2026(text,uuid,uuid,uuid) to authenticated,service_role;

comment on function public.social_report_2026(text,uuid,uuid,uuid) is
  'Signale EXACTEMENT une cible : une publication, un commentaire, ou une '
  'PERSONNE (0137). Le signalement d''une personne exige de pouvoir voir son '
  'profil OU de l''avoir déjà bloquée — sans quoi « je bloque puis je signale » '
  'serait impossible. Un signalement par auteur et par cible : re-signaler '
  'n''empile pas la file et ne compte pas les votes.';
