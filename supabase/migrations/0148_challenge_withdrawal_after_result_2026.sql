-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0148 : UN RÉSULTAT PUBLIÉ NE SE RENVERSE PLUS D'UNE SEULE TOUCHE.
--
-- LE DÉFAUT CORRIGÉ (0122:186-206). `join_crew_challenge_2026` refusait bien
-- l'INSCRIPTION sur un défi `final` ou `cancelled` (0122:186) — mais le RETRAIT
-- (`p_consent = false`) n'avait AUCUNE garde de temps. Sur un défi terminé,
-- son unique branche « après le départ » exécutait :
--     update challenge_roster_2026     set consent   = false ...
--     update challenge_contributions_2026 set withdrawn = true  ...  -- TOUTES
--     perform maintain_challenge_2026(...)                           -- republie
-- Conséquence mesurée (étape 0 du test) : un joueur de l'équipe PERDANTE ouvrait
-- le défi clos, touchait « Retirer mon consentement », et les six points de son
-- coéquipier— pardon, SES points — disparaissaient d'un coup, une révision 2
-- était publiée, et le VAINQUEUR CHANGEAIT après la clôture. Le cahier §6.4 ne
-- prévoit une correction qu'« avec historique visible » à la suite d'une
-- contestation : jamais un basculement unilatéral déclenché par un bouton.
--
-- LA LIGNE TRANCHÉE ICI, ET SON REVERS :
--   · REFUSÉ  — le geste d'écran « je retire mon consentement », dont le seul
--     effet après clôture serait d'annuler d'un coup TOUTES ses journées.
--     `challenge_closed` est levé dès que le résultat est arrêté : `final`, ou
--     `now() >= ends_at + sync_hours` (la fenêtre de synchronisation du §6.4 —
--     la publication finale peut n'avoir pas encore tourné, la fenêtre, elle,
--     est close).
--   · CONSERVÉ — le retrait d'UNE activité précise
--     (`withdraw_challenge_activity_2026`) et la suppression de la sortie ou du
--     compte (trigger `remove_challenge_source_2026`). Ce sont des droits sur
--     SES données, pas un levier de score : ils portent sur une preuve nommée,
--     et la révision publiée en garde la trace. Les fermer serait du théâtre
--     (supprimer la course produirait le même effet) et casserait la
--     suppression de compte.
--   · INCHANGÉ — pendant le match, le retrait reste immédiat et total : c'est
--     le consentement du §6.2, et il n'y a alors aucun résultat arrêté.
--   · INCHANGÉ — `cancelled` : aucun résultat n'a été publié, il n'y a rien à
--     renverser ; refuser en plus n'aurait protégé personne.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS : elle ne touche ni au calcul, ni aux
-- publications, ni aux droits. Corps identique à 0122 à la garde près, et
-- `create or replace` conserve l'ACL existante (elle est réécrite par sûreté).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.join_crew_challenge_2026(p_challenge_id uuid,p_consent boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; team uuid; r public.challenge_rules_2026; existing public.challenge_roster_2026;
begin
  if auth.uid() is null or p_consent is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  -- Les règles sont lues AVANT toute décision : la fenêtre de synchronisation
  -- sert désormais aux deux sens du consentement, plus seulement à l'inscription.
  select * into strict r from public.challenge_rules_2026;
  if p_consent and c.status in('cancelled','final') then raise exception 'challenge_closed'; end if;
  -- 0148 : le résultat est arrêté (publié, ou fenêtre de 24 h expirée) — un
  -- retrait global ne peut plus rejouer le match. Le retrait d'une activité
  -- nommée reste ouvert (withdraw_challenge_activity_2026).
  if not p_consent and (c.status='final' or now()>=c.ends_at+make_interval(hours=>r.sync_hours)) then raise exception 'challenge_closed'; end if;
  select * into existing from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid();
  if not p_consent then
    -- A non-participant cannot unlock or cancel someone else's scheduled team.
    if existing.user_id is null then return jsonb_build_object('id',c.id,'joined',false); end if;
    if c.starts_at>now() then
      delete from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid();
      update public.challenge_teams_2026 set locked_at=null where challenge_id=c.id and crew_id=existing.crew_id;
      if c.status='scheduled' then update public.crew_challenges_2026 set status='assembling' where id=c.id; end if;
    else
      update public.challenge_roster_2026 set consent=false where challenge_id=c.id and user_id=auth.uid();
      update public.challenge_contributions_2026 set withdrawn=true where challenge_id=c.id and player_id=existing.player_id;
      perform public.maintain_challenge_2026(c.id);
    end if;
    return jsonb_build_object('id',c.id,'joined',false);
  end if;
  if public.challenge_has_block_2026(c.id,auth.uid()) or not exists(select 1 from public.users where id=auth.uid() and deletion_requested_at is null) then raise exception 'challenge_unavailable'; end if;
  if existing.user_id is not null then
    update public.challenge_roster_2026 set consent=true,consented_at=case when consent then consented_at else now() end where challenge_id=c.id and user_id=auth.uid();
    return jsonb_build_object('id',c.id,'joined',true);
  end if;
  if c.starts_at<=now() or c.status='scheduled' then raise exception 'roster_locked'; end if;
  select t.crew_id into strict team from public.challenge_teams_2026 t join public.crew_members m on m.crew_id=t.crew_id
    where t.challenge_id=c.id and m.user_id=auth.uid() and m.left_at is null and t.accepted_at is not null and t.locked_at is null;
  if (select count(*) from public.challenge_roster_2026 where challenge_id=c.id and crew_id=team)>=r.players then raise exception 'team_full'; end if;
  perform pg_advisory_xact_lock(hashtextextended('challenge_player:'||auth.uid()::text||':'||c.activity,0));
  if exists(select 1 from public.challenge_roster_2026 p join public.crew_challenges_2026 prior on prior.id=p.challenge_id
    where p.user_id=auth.uid() and p.activity=c.activity and p.reserved
      and (p.ranked_week=c.ranked_week or tstzrange(prior.starts_at,prior.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))) then raise exception 'player_already_registered'; end if;
  insert into public.challenge_roster_2026(challenge_id,crew_id,player_id,user_id,activity,ranked_week,consent)
    values(c.id,team,auth.uid(),auth.uid(),c.activity,c.ranked_week,true);
  return jsonb_build_object('id',c.id,'joined',true);
end $$;
revoke all on function public.join_crew_challenge_2026(uuid,boolean) from public,anon;
grant execute on function public.join_crew_challenge_2026(uuid,boolean) to authenticated,service_role;
