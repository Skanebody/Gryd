-- 0040_sector_activity.sql
-- GRYD — signaux d'ACTIVITÉ par secteur (§C) pour nourrir pressure_score / statut.
--
-- Le snapshot (0037) calculait la pression sur le seul équilibre owner↔rival. Cette
-- vue ajoute les signaux d'activité RÉELS que `computeSectorSnapshot` sait consommer :
--   • zones_lost_recent  = hexes VOLÉS dans le secteur sur 7 j (contestation récente) ;
--   • rival_reclaimed_24h = hexes volés sur 24 h (règle « contesté ») ;
--   • last_attack_at      = dernier vol (attaque active → statut escalade) ;
--   • decay_fraction      = part des hexes tenus dont le decay est imminent (≤ 3 j).
-- Note honnête : « volé » est direction-agnostique au MVP (on ne distingue pas encore
-- vol PAR l'owner vs vol SUBI) → proxy de contestation, pas de la seule agression subie.
-- Lue par le JOB recompute_sectors (service_role) ; pas de donnée perso exposée.

create or replace view public.sector_activity as
with agg as (
  select
    hc.sector_id,
    count(*) filter (
      where hc.decay_at is not null and hc.decay_at <= now() + interval '3 days'
    ) as decay_imminent,
    count(*) as owned_live, -- hexes non décayés du secteur (dénominateur decay)
    count(*) filter (
      where hc.claim_type = 'stolen' and hc.claimed_at >= now() - interval '7 days'
    ) as stolen_7d,
    count(*) filter (
      where hc.claim_type = 'stolen' and hc.claimed_at >= now() - interval '24 hours'
    ) as stolen_24h,
    max(hc.claimed_at) filter (where hc.claim_type = 'stolen') as last_stolen_at
  from public.hex_claims hc
  where hc.sector_id is not null
    and (hc.decay_at is null or hc.decay_at > now()) -- ignore les hexes déjà décayés
  group by hc.sector_id
)
select
  sector_id,
  stolen_7d       as zones_lost_recent,
  stolen_24h      as rival_reclaimed_24h,
  last_stolen_at  as last_attack_at,
  case when owned_live > 0 then round(decay_imminent::numeric / owned_live, 4) else 0 end as decay_fraction
from agg;

grant select on public.sector_activity to service_role;
