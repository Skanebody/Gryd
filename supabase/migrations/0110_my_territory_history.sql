-- 0110_my_territory_history.sql
-- GRYD — La lecture de sa propre histoire territoriale.
--
-- ═══ CE QUE ÇA OUVRE ════════════════════════════════════════════════════════
-- `0109` a posé la mémoire ; rien ne la lisait. Tant qu'aucune lecture n'existe,
-- la capacité `ownership_history` reste `built: false` dans le catalogue
-- d'offre — donc ni montrée, ni vendue. Cette migration est ce qui la rend
-- réelle.
--
-- ═══ CETTE FONCTION NE DÉCIDE RIEN, ELLE LIT ════════════════════════════════
-- Elle rend les règnes BRUTS. Aucune durée, aucun total, aucun « plus long
-- règne » n'est calculé ici : ces dérivations vivent dans le moteur PUR
-- (`packages/engine/src/territoryHistory.ts`), où elles sont testables et où
-- elles ne peuvent pas diverger entre le serveur et l'app. Le SQL lit, le
-- moteur décide — c'est la doctrine du dépôt, et elle évite qu'un « 187 jours »
-- calculé en base contredise un « 6 mois » calculé à l'écran.
--
-- ═══ `security invoker` — LA POLICY EST LE GARDE, PAS LA FONCTION ══════════
-- Contrairement à la plupart des RPC du dépôt, celle-ci n'est PAS `security
-- definer` : elle s'exécute avec les droits de l'appelant, donc la RLS de
-- `territory_reigns` (0109) s'applique pleinement. Un `security definer`
-- contournerait la policy et ferait reposer toute la vie privée sur le filtre
-- écrit dans le corps — un seul oubli et l'histoire de quelqu'un d'autre sort.
-- Ici, même un corps fautif ne peut rien laisser fuir.
--
-- Le filtre `auth.uid()` est écrit QUAND MÊME : deux verrous valent mieux qu'un
-- sur une donnée qui dessine les habitudes d'une personne.
--
-- ═══ LES RÈGNES DE CREW NE SONT PAS ICI ════════════════════════════════════
-- Volontairement. « Mon histoire » est celle du JOUEUR. L'histoire d'un crew est
-- une autre lecture, avec d'autres règles d'accès (membres actifs seulement) et
-- une autre copie à l'écran. Les mélanger produirait une liste où « j'ai tenu »
-- et « on a tenu » se confondent.
--
-- ADDITIVE : une fonction. Aucune table, aucune colonne, aucune donnée touchée.

create or replace function public.my_territory_history(
  p_activity text default null,   -- null = toutes disciplines confondues
  p_limit    integer default 200
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_rows jsonb;
  v_lim  integer := least(greatest(coalesce(p_limit, 200), 1), 500);
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Une discipline inconnue est un REFUS, pas un silence : rendre « aucune
  -- histoire » à qui a demandé 'car' lui ferait croire qu'il n'a rien tenu.
  if p_activity is not null and p_activity not in ('run', 'bike') then
    return jsonb_build_object('ok', false, 'reason', 'bad_activity');
  end if;

  -- `t.r` est la ligne JSON, `t.started_at` la colonne qui l'ordonne : l'ordre
  -- doit porter sur la COLONNE de la sous-requête, pas sur une clé du jsonb.
  select coalesce(jsonb_agg(t.r order by t.started_at desc), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
             'territoryId', tr.territory_id,
             'activity',    tr.activity,
             'cityId',      tr.city_id,
             'areaM2',      tr.area_m2,
             'startedAt',   tr.started_at,
             -- `null` = EN COURS. L'appelant doit distinguer « je tiens encore »
             -- de « j'ai tenu » : c'est toute la différence entre les deux
             -- phrases que cet écran doit pouvoir dire.
             'endedAt',     tr.ended_at,
             'endedReason', tr.ended_reason
           ) as r,
           tr.started_at
      from public.territory_reigns tr
     where tr.owner_type = 'user'
       and tr.owner_id = v_uid
       and (p_activity is null or tr.activity = p_activity)
     order by tr.started_at desc
     limit v_lim
  ) t;

  return jsonb_build_object('ok', true, 'reigns', v_rows);
end;
$$;

comment on function public.my_territory_history(text, integer) is
  'Regnes territoriaux du joueur courant, BRUTS (aucune duree ni total calcule ici : le moteur pur decide). security invoker — la RLS de territory_reigns est le garde.';

-- Lecture strictement personnelle : rien à offrir à anon.
revoke all on function public.my_territory_history(text, integer) from public, anon;
grant execute on function public.my_territory_history(text, integer) to authenticated;
