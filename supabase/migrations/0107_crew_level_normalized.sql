-- 0107_crew_level_normalized.sql
-- GRYD — Le niveau de crew mesure l'ENGAGEMENT, plus la TAILLE.
--
-- ═══ LE DÉFAUT, TROUVÉ EN APPLIQUANT LA LEÇON TELEGRAM ══════════════════════
-- `CREW_XP_DAILY_CAP_PER_MEMBER` plafonne l'XP PAR MEMBRE. Un crew de 50 peut
-- donc produire dix fois l'XP d'un crew de 5 à engagement par tête IDENTIQUE,
-- et franchissait `CREW_XP_TABLE` dix fois plus vite. Le niveau de crew mesurait
-- la taille autant que l'engagement.
--
-- Telegram a résolu exactement ce problème sur ses boosts de canal : le nombre
-- requis pour monter d'un niveau CROÎT avec la taille du canal. Sans ça, le
-- palier récompense l'audience et pas l'investissement.
--
-- C'était latent hier ; ça devient grave avec AMENDEMENT-48, où un palier
-- COSMÉTIQUE s'accroche au niveau : taille et argent se seraient composés.
--
-- ═══ CE QUE FAIT CETTE MIGRATION ═══════════════════════════════════════════
-- DEUX changements, et AUCUN changement de signature.
--
-- 1. LA NORMALISATION N'EST PAS ICI — elle est dans le moteur pur
--    (`crewXpTableFor(memberCount)`, packages/engine/src/crew.ts), et les
--    appelants passent désormais la table DÉJÀ normalisée dans `p_xp_table`.
--    C'est l'extension exacte de l'idée de `0010` (« passer la table pour
--    éviter de dupliquer CREW_XP_TABLE en SQL ») : le SQL reste bête, il
--    compare. Changer la signature aurait obligé à recréer `finalize_offensive`
--    (0064), ses droits et ses appelants — beaucoup de surface pour une règle
--    qui est testable dans le moteur.
--
-- 2. LE PLANCHER, LUI, EST ICI, parce qu'il porte sur l'ÉTAT ÉCRIT et que le
--    moteur ne connaît pas l'historique : `level = greatest(ancien, nouveau)`.
--
-- ═══ POURQUOI LE PLANCHER EST INDISPENSABLE ════════════════════════════════
-- Le barème dépend maintenant du nombre de membres. Sans plancher, un crew qui
-- RECRUTE verrait son multiplicateur monter et son niveau BAISSER : accueillir
-- un ami coûterait un niveau. Personne ne recruterait plus, et le jeu tout
-- entier repose sur le recrutement.
--
-- Un niveau acquis ne se reprend donc JAMAIS. Ce qui ralentit après une
-- croissance, c'est la marche SUIVANTE — et c'est exactement ce qu'on veut
-- dire : à 50, il faut l'engagement de 50.
--
-- Conséquence assumée : `level_from`/`level_to` ne peuvent plus décrire une
-- descente, donc `crewLevelUp` ne peut pas se déclencher à l'envers.
--
-- ADDITIVE : aucune table, aucune colonne, aucune donnée touchée. La fonction
-- est remplacée, jamais une ligne. Aucun crew n'existe en base au 01/08/2026,
-- donc aucun niveau acquis n'est affecté rétroactivement.
-- Rollback = restaurer la définition de 0010 (et repasser les tables brutes).

create or replace function public.add_crew_xp(
  p_crew_id  uuid,
  p_xp       bigint,
  -- ⚠️ TABLE DÉJÀ NORMALISÉE par la taille du crew — `crewXpTableFor(members)`,
  -- jamais `CREW_XP_TABLE` brute. Passer la table brute rétablirait en silence
  -- le barème qui récompense la taille. Un garde-fou de source côté moteur
  -- (`crewNormalization.test.ts`) vérifie que les appelants ne le font pas.
  p_xp_table bigint[]
)
returns table (level_from int, level_to int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_xp    bigint;
  v_new_xp    bigint;
  v_from      int;
  v_to        int;
  i           int;
begin
  select xp, level into v_old_xp, v_from
  from public.crews where id = p_crew_id for update;
  if not found then
    return; -- crew inconnu : no-op silencieux (course sans crew géré en amont)
  end if;

  v_new_xp := v_old_xp + greatest(0, coalesce(p_xp, 0));

  -- Niveau = plus haut index i tel que xp >= p_xp_table[i] (table croissante).
  v_to := 1;
  for i in 1 .. array_length(p_xp_table, 1) loop
    if v_new_xp >= p_xp_table[i] then
      v_to := i;
    else
      exit;
    end if;
  end loop;

  -- PLANCHER : un niveau acquis ne se reprend jamais. Le barème dépendant
  -- désormais du nombre de membres, sans cette ligne un crew qui RECRUTE
  -- perdrait un niveau — accueillir un ami coûterait cher, et plus personne
  -- ne recruterait.
  v_to := greatest(coalesce(v_from, 1), v_to);

  update public.crews
  set xp = v_new_xp, level = v_to
  where id = p_crew_id;

  level_from := v_from;
  level_to := v_to;
  return next;
end;
$$;

comment on function public.add_crew_xp(uuid, bigint, bigint[]) is
  'Credite l XP crew et recalcule le niveau. `p_xp_table` doit etre la table NORMALISEE par la taille du crew (moteur : crewXpTableFor), jamais CREW_XP_TABLE brute. Le niveau ne redescend JAMAIS : un crew qui recrute ne perd pas un niveau (migration 0107).';

revoke all on function public.add_crew_xp(uuid, bigint, bigint[]) from public, anon, authenticated;
