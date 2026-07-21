-- 0053_daily_zone_award_derived.sql
-- GRYD — CORRECTIF BLOQUANT (vérification adversariale 21/07).
--
-- BUG : `daily_zone_inputs` lisait `public.daily_zone_awards` pour dire si la
-- distinction du jour était acquise. Or AUCUN code du repo n'écrit jamais dans
-- cette table (grep exhaustif .ts/.tsx : elle n'apparaît que dans 0052). La
-- clé `award` valait donc `null` À VIE, pour 100 % des joueurs — pendant que
-- l'écran promettait en permanence « Capture ici aujourd'hui : une
-- distinction ». Une récompense annoncée que le serveur n'accorde jamais.
--
-- C'est EXACTEMENT le bug `users.streak_weeks` jamais écrit, réintroduit à
-- l'identique dans un autre lot le même jour.
--
-- FIX : la distinction devient DÉRIVÉE, plus stockée. On regarde s'il existe
-- une capture RÉELLE de l'appelant, aujourd'hui, dans le secteur tiré. Aucune
-- écriture, donc rien à câbler dans ingest_run, et surtout AUCUNE
-- désynchronisation possible entre « ce qui est vrai » et « ce qui est écrit ».
--
-- La table `daily_zone_awards` n'est pas supprimée : elle reste disponible si
-- un jour on veut un historique auditable. Mais plus rien ne la lit, donc plus
-- rien ne peut mentir à cause d'elle.

create or replace function public.daily_zone_inputs(
  p_fragile_window_h integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_city_id    text;
  v_fragile    interval;
  v_candidates jsonb;
  v_award      jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_fragile_window_h is null or p_fragile_window_h < 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_window');
  end if;
  v_fragile := make_interval(hours => p_fragile_window_h);

  -- Ville : celle du joueur, sinon celle de son crew (une seule, déterministe).
  select u.city_id into v_city_id from public.users u where u.id = v_uid;
  if v_city_id is null then
    select c.city_id into v_city_id
    from public.crew_members cm
    join public.crews c on c.id = cm.crew_id
    where cm.user_id = v_uid and cm.left_at is null
    order by cm.joined_at asc
    limit 1;
  end if;
  if v_city_id is null then
    return jsonb_build_object('ok', true, 'cityId', null, 'candidates', '[]'::jsonb, 'award', null);
  end if;

  -- Candidats : secteurs de la ville, libres ou fragiles. Triés par id — le
  -- tirage côté client indexe dessus, il ne doit dépendre d'aucun ORDER BY
  -- implicite (sinon modifier cette requête changerait la zone du jour).
  select coalesce(jsonb_agg(x order by x->>'sectorId'), '[]'::jsonb)
  into v_candidates
  from (
    select jsonb_build_object(
             'sectorId',  s.id,
             'name',      s.name,
             'freeHexes', greatest(0, s.total_hexes - coalesce(live.n, 0)),
             'fragile',   coalesce(frag.n, 0) > 0
           ) as x
    from public.sectors s
    left join lateral (
      select count(*)::integer as n
      from public.hex_claims hc
      where hc.sector_id = s.id and (hc.decay_at is null or hc.decay_at > now())
    ) live on true
    left join lateral (
      select count(*)::integer as n
      from public.hex_claims hc
      where hc.sector_id = s.id
        and hc.decay_at is not null
        and hc.decay_at > now()
        and hc.decay_at <= now() + v_fragile
    ) frag on true
    where s.city_id = v_city_id
  ) t;

  -- ── DISTINCTION : DÉRIVÉE d'une capture réelle, jamais lue d'une table ──
  -- Le client rejoue le tirage du jour et sait quel secteur est tiré ; ici on
  -- expose simplement, pour CHAQUE secteur où l'appelant a capturé AUJOURD'HUI,
  -- de quoi conclure. On renvoie le plus récent : le client compare son
  -- `sectorId` tiré à celui-ci. Aucune écriture, aucune désynchronisation.
  select jsonb_build_object(
           'dayKey',    to_char(hc.claimed_at at time zone 'UTC', 'YYYY-MM-DD'),
           'sectorId',  hc.sector_id,
           'awardedAt', hc.claimed_at
         )
  into v_award
  from public.hex_claims hc
  where hc.owner_user_id = v_uid
    and hc.sector_id is not null
    and hc.claimed_at >= date_trunc('day', now() at time zone 'UTC')
  order by hc.claimed_at desc
  limit 1;

  return jsonb_build_object(
    'ok',         true,
    'cityId',     v_city_id,
    'candidates', coalesce(v_candidates, '[]'::jsonb),
    'award',      v_award
  );
end;
$$;

revoke all on function public.daily_zone_inputs(integer) from public, anon;
grant execute on function public.daily_zone_inputs(integer) to authenticated;

comment on table public.daily_zone_awards is
  'CONSERVÉE mais PLUS LUE (0053) : la distinction du jour est désormais DÉRIVÉE '
  'des captures réelles par daily_zone_inputs(). Rien n''écrivait cette table, '
  'ce qui rendait la distinction impossible à obtenir. Ne pas la relire sans '
  'câbler d''abord une écriture.';
