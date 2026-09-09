-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0149 : UN REFUS DE DÉFI PORTE UN NOM QUE L'ÉCRAN PEUT DIRE.
--
-- LE DÉFAUT CORRIGÉ (0122:146). `create_crew_challenge_2026` résolvait le crew
-- de l'appelant par `select … into STRICT own_crew from crew_members …`. Sans
-- adhésion active, PL/pgSQL lève `NO_DATA_FOUND` (P0002, « query returned no
-- rows ») : une erreur de plomberie, que l'écran ne sait pas traduire et qui
-- retombait donc sur « L'action n'a pas abouti. Actualise puis réessaie. »
-- (`CrewChallenges2026Screen.errorLabel`, dernier repli). Le fondateur d'un
-- compte sans crew lisait un message de panne là où la seule chose vraie est :
-- il faut un crew. Même faute dans `accept_…` et `lock_…`, où l'absence de
-- ligne « équipe dont je suis la direction » retombait sur le même repli alors
-- que `direction_required` existe déjà au contrat (docs/product §RPC).
--
-- CE QUE CETTE MIGRATION AJOUTE :
--   · `no_crew`            — aucune adhésion active (0122:146).
--   · `arena_unavailable`  — l'arène choisie n'existe plus ou a été retirée
--     (`retired_at`). Le cas devient RÉEL dès que 0151 permet de publier et de
--     retirer des arènes : un client qui garde en mémoire une arène retirée
--     doit lire pourquoi, pas « réessaie ».
--   · `direction_required` — pour accepter et pour figer, au lieu de P0002.
-- Aucune règle de jeu ne change : mêmes gardes, mêmes droits, mêmes écritures.
--
-- POURQUOI PAS D'`ambiguous_crew` : `crew_members_one_active_per_user`
-- (0002:62, index UNIQUE partiel sur `user_id where left_at is null`) rend
-- l'adhésion active unique. `into strict` ne pouvait donc échouer QUE par
-- absence — inventer un second cas serait une garantie écrite au-dessus du code.
--
-- ─── LA TRANCHE DE RÔLES, ÉNONCÉE UNE FOIS POUR TOUTES ─────────────────────
-- Deux définitions de « la direction » cohabitent dans le dépôt et l'audit du
-- lot D les a signalées comme une contradiction. Elles n'en sont pas une :
--   · `challenge_rules_2026.manager_roles` = {co_captain, founder} (0122:94)
--     est exactement `CREW_PERMISSIONS.invite` (game-rules.ts). Proposer un
--     défi, c'est ENGAGER LE CREW ENTIER auprès d'un autre crew : même droit
--     que d'inviter quelqu'un, jamais moins.
--   · `crew_outings_2026` (0124:268) autorise {captain, co_captain, founder},
--     qui est `CREW_PERMISSIONS.createOuting` : organiser une sortie de son
--     propre crew est une action de terrain (§8.3), ouverte au capitaine.
-- Une seule définition gouverne donc les défis : `manager_roles`, lu depuis la
-- table de règles, comparé aux constantes partagées par le test PGlite. Un
-- `captain` ne crée pas de défi — et le test le prouve, pour que personne ne
-- « corrige » un jour cette différence en croyant réparer une incohérence.
-- Le catalogue §13.3 du cahier (Membre/Organisateur/Modérateur/Capitaine) est
-- un vocabulaire produit, pas la liste des sept rôles techniques : aucun rôle
-- n'est ajouté ici (la modération relève d'un autre lot).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.create_crew_challenge_2026(p_client_id uuid,p_opponent_crew_id uuid,p_arena_id text,p_starts_at timestamptz,p_access_confirmed boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); own_crew uuid; a public.challenge_arenas_2026; c public.crew_challenges_2026; r public.challenge_rules_2026; local_start timestamp;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  -- Adhésion ACTIVE unique (index partiel crew_members_one_active_per_user, 0002).
  select m.crew_id into own_crew from public.crew_members m where m.user_id=owner and m.left_at is null;
  if own_crew is null then raise exception 'no_crew'; end if;
  if not public.challenge_manager_2026(owner,own_crew) then raise exception 'direction_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('challenge_invite:'||owner,0));
  select * into c from public.crew_challenges_2026 where created_by=owner and client_id=p_client_id;
  if found then return jsonb_build_object('id',c.id,'status',c.status,'replayed',true); end if;
  select * into a from public.challenge_arenas_2026 where id=p_arena_id and retired_at is null;
  if a.id is null then raise exception 'arena_unavailable'; end if;
  select * into strict r from public.challenge_rules_2026;
  local_start:=p_starts_at at time zone a.time_zone;
  if p_client_id is null or p_access_confirmed is distinct from true or p_starts_at is null or p_starts_at<=now()
    or local_start<>date_trunc('week',local_start) or own_crew=p_opponent_crew_id
    or not exists(select 1 from public.crew_members m where m.crew_id=p_opponent_crew_id and public.challenge_manager_2026(m.user_id,m.crew_id)) then raise exception 'challenge_unavailable'; end if;
  if exists(select 1 from public.crew_members m where m.crew_id=p_opponent_crew_id and m.left_at is null and public.challenge_pair_blocked_2026(owner,m.user_id)) then raise exception 'challenge_unavailable'; end if;
  insert into public.crew_challenges_2026(client_id,created_by,arena_id,title,activity,time_zone,starts_at,ends_at,ranked_week,sectors)
    values(p_client_id,owner,a.id,a.title,a.activity,a.time_zone,p_starts_at,(local_start+make_interval(days=>r.days)) at time zone a.time_zone,local_start::date,a.sectors) returning * into c;
  insert into public.challenge_teams_2026 values(c.id,own_crew,0,now(),now(),null),(c.id,p_opponent_crew_id,1,null,null,null);
  return jsonb_build_object('id',c.id,'status',c.status,'replayed',false);
end $$;

create or replace function public.accept_crew_challenge_2026(p_challenge_id uuid,p_access_confirmed boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; own_crew uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  select crew_id into own_crew from public.challenge_teams_2026 where challenge_id=c.id and side=1 and public.challenge_manager_2026(auth.uid(),crew_id);
  if own_crew is null then raise exception 'direction_required'; end if;
  if c.starts_at<=now() or c.status not in('invited','assembling') or p_access_confirmed is distinct from true or public.challenge_has_block_2026(c.id,auth.uid()) then raise exception 'challenge_unavailable'; end if;
  update public.challenge_teams_2026 set accepted_at=coalesce(accepted_at,now()),access_confirmed_at=coalesce(access_confirmed_at,now()) where challenge_id=c.id and crew_id=own_crew;
  update public.crew_challenges_2026 set status='assembling' where id=c.id;
  return jsonb_build_object('id',c.id,'status','assembling');
end $$;

create or replace function public.lock_crew_challenge_2026(p_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; team uuid; r public.challenge_rules_2026;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  select crew_id into team from public.challenge_teams_2026 where challenge_id=c.id and public.challenge_manager_2026(auth.uid(),crew_id) and accepted_at is not null;
  if team is null then raise exception 'direction_required'; end if;
  select * into strict r from public.challenge_rules_2026;
  if c.starts_at<=now() or c.status not in('assembling','scheduled') or public.challenge_has_block_2026(c.id,auth.uid())
    or exists(select 1 from public.challenge_roster_2026 p where p.challenge_id=c.id and public.challenge_has_block_2026(c.id,p.user_id)) then raise exception 'challenge_unavailable'; end if;
  if (select count(*) from public.challenge_roster_2026 p join public.crew_members m on m.crew_id=p.crew_id and m.user_id=p.user_id and m.left_at is null
      join public.users u on u.id=p.user_id where p.challenge_id=c.id and p.crew_id=team and p.consent and u.deletion_requested_at is null)<>r.players then raise exception 'five_volunteers_required'; end if;
  update public.challenge_teams_2026 set locked_at=coalesce(locked_at,now()) where challenge_id=c.id and crew_id=team;
  if not exists(select 1 from public.challenge_teams_2026 where challenge_id=c.id and locked_at is null) then update public.crew_challenges_2026 set status='scheduled' where id=c.id; end if;
  return (select jsonb_build_object('id',id,'status',status) from public.crew_challenges_2026 where id=c.id);
end $$;

revoke all on function public.create_crew_challenge_2026(uuid,uuid,text,timestamptz,boolean),public.accept_crew_challenge_2026(uuid,boolean),
  public.lock_crew_challenge_2026(uuid) from public,anon;
grant execute on function public.create_crew_challenge_2026(uuid,uuid,text,timestamptz,boolean),public.accept_crew_challenge_2026(uuid,boolean),
  public.lock_crew_challenge_2026(uuid) to authenticated,service_role;
