-- 0104_publish_requires_density.sql
-- GRYD — Un territoire ne devient PUBLIC que s'il y a du monde autour (k-anonymat).
--
-- ═══ LA LEÇON STRAVA, ET POURQUOI ELLE NOUS CONCERNE PLUS QU'EUX ════════════
-- En 2018, la carte de chaleur mondiale de Strava a révélé des bases militaires :
-- les soldats déployés y couraient des boucles, et le tracé agrégé en dessinait
-- le périmètre. La donnée était pourtant présentée comme anonymisée. La leçon,
-- c'est que L'AGRÉGATION N'EST PAS UNE ANONYMISATION QUAND LA DENSITÉ EST
-- FAIBLE : à un seul coureur, un parcours EST une identité et un lieu.
--
-- GRYD est structurellement PLUS exposé qu'une carte de chaleur, et il faut le
-- dire franchement : un territoire n'est pas un halo anonyme, il porte un
-- PROPRIÉTAIRE NOMMÉ et une date. Publier la zone d'un unique joueur dans une
-- région déserte revient à écrire « cette personne court ici, seule, et voici
-- son périmètre ». Un militaire déployé, une personne isolée en zone rurale, un
-- coureur dans un pays où courir n'est pas anodin : ce sont les mêmes octets.
--
-- ═══ CE QUE FAIT CETTE MIGRATION ═══════════════════════════════════════════
-- Elle ajoute UNE condition à `public_territories` : la commune du territoire
-- doit compter au moins `TERRITORY_PUBLISH_MIN_DISTINCT_OWNERS` (3) propriétaires
-- DISTINCTS. Sinon la ligne ne sort pas de la vue.
--
-- ⚠️ ELLE NE BLOQUE AUCUNE CAPTURE, et c'est essentiel : le monde entier reste
-- jouable. Un Français en vacances au Cambodge ferme sa boucle, prend son
-- territoire, le voit sur SA carte, le garde, marque des points. Seule sa
-- PUBLICATION — sa visibilité par les AUTRES — attend qu'il y ait du monde
-- autour. `public_territories` ne sert que la lecture d'AUTRUI ; la lecture de
-- ses propres zones passe ailleurs et n'est pas touchée.
--
-- ═══ UNE COMMUNE INCONNUE N'ATTEINT JAMAIS LE SEUIL ═══════════════════════
-- `city_id is null` — hors du référentiel européen, zone non cartographiée —
-- ne peut pas satisfaire la condition. C'est VOULU : dans le doute sur le lieu,
-- on ne publie pas. C'est précisément le cas de la base militaire à l'étranger.
-- Ce n'est pas un manque de couverture, c'est la position par défaut.
--
-- ═══ 3, ET PAS 2 ══════════════════════════════════════════════════════════
-- À deux propriétaires, chacun sait que la zone qui n'est pas la sienne est
-- celle de l'autre : le k-anonymat est nul. 3 est le plus petit nombre qui rend
-- une déduction non triviale. La valeur vit dans
-- `packages/shared/src/game-rules.ts` (source unique) ; elle est RECOPIÉE ici
-- parce que le SQL ne lit pas un module TypeScript — si elle change là-bas,
-- une migration SUIVANTE doit reprendre cette vue.
--
-- ADDITIVE : aucune table, aucune colonne, aucune donnée touchée. La vue est
-- remplacée, jamais une ligne. Rollback = restaurer la définition de 0087.

create or replace view public.public_territories as
select
  t.id,
  t.activity,
  t.owner_type,
  t.owner_id,
  t.city_id,
  t.state,
  t.defense_level,
  t.area_m2,
  t.geometry_generalized,
  date_trunc('hour'::text, t.controlled_since) as controlled_since_hour
from public.territories t
where t.publish_after <= now()
  and t.geometry_generalized is not null
  and public.territory_owner_shares_map(t.owner_type, t.owner_id)
  -- k-ANONYMAT : au moins 3 propriétaires DISTINCTS dans la commune. Une
  -- commune inconnue (`city_id is null`) ne peut jamais satisfaire l'égalité,
  -- donc ne publie rien — c'est la position par défaut, pas un oubli.
  and (
    select count(distinct o.owner_id)
    from public.territories o
    where o.city_id = t.city_id
      and o.activity = t.activity
      and o.geometry_generalized is not null
      and o.publish_after <= now()
  ) >= 3;

comment on view public.public_territories is
  'Territoires visibles par AUTRUI. Trois conditions cumulées : publication différée (publish_after), réglage de partage du propriétaire (territory_owner_shares_map), et k-anonymat — au moins 3 propriétaires distincts dans la commune (TERRITORY_PUBLISH_MIN_DISTINCT_OWNERS, game-rules.ts). Leçon Strava 2018 : à faible densité, une zone nommée révèle une personne et un lieu. Ne bloque AUCUNE capture : le monde entier reste jouable, seule la visibilité par les autres attend la densité.';
