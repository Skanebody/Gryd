-- GRYD — 0065 : un objet FONCTIONNEL ne se vend dans AUCUNE monnaie.
--
-- Source de vérité : packages/shared/src/game-rules.ts
--   (FUNCTIONAL_ITEM_KEYS, FUNCTIONAL_ITEM_ACQUISITION, SKU_GRANTED_ITEM_KEYS).
--
-- POURQUOI (décisions déjà prises, jamais codées jusqu'ici) :
--   · CLAUDE.md — anti pay-to-win STRICT : aucun achat, abonnement, sponsor ou
--     perk ne donne territoire, points, vitesse, avantage de jeu NI PROTECTION.
--   · AMENDEMENT-40 §2 (15/07/2026), correctif imposé : « Le Bouclier et le
--     Streak Gel ne sont plus achetables contre de l'argent (ni directement, ni
--     via une monnaie achetable). »
--   · AMENDEMENT-45 §2 « Bonus » (21/07/2026) : « Bouclier et scout_ping
--     deviennent gagnables en jouant, jamais achetables en argent réel. »
--   · AMENDEMENT-45 §2 C1 : « Être prévenu plus tôt d'une attaque, c'est
--     défendre en premier — un avantage compétitif payant, interdit. » →
--     couvre `attack_alert` (0022), vendu 50 Éclats, qui a REMPLACÉ le bouclier.
--
-- CE QUE FAIT CETTE MIGRATION — que de la SUPPRESSION de chemin d'achat :
--   1. price_shards / price_eur → NULL sur les 4 types fonctionnels du seed
--      0014/0022 (shield, streak_gel, scout_ping, attack_alert).
--   2. Une CONTRAINTE qui rend la faute impossible à réintroduire par un futur
--      seed ou un UPDATE : un item fonctionnel ne peut PAS porter de prix.
--   3. Deux mensonges de copie corrigés dans le catalogue serveur :
--        · streak_gel : « Aucun effet territoire » alors que la série multiplie
--          les POINTS de territoire (STREAK_MULTIPLIER_CAP = 1,5) ;
--        · « 1 inclus Club » alors que SHIELD_CLUB_INCLUDED_PER_WEEK = 0 et que
--          l'abonnement ne donne plus aucune protection.
--
-- CE QU'ELLE NE FAIT PAS, et qui reste EN SUSPENS (aucune promesse écrite) :
--   aucune voie d'obtention « en jouant » n'est créée ici. Il n'existe à ce jour
--   ni `spend_foulees`, ni `spend_eclats`, ni RPC créditant `user_inventory`
--   pour ces clés. Ces objets ne sont donc, à cette date, NI achetables NI
--   gagnables — et le catalogue ne prétend pas le contraire.
--
-- Aucune migration appliquée n'est réécrite (0005/0014/0017/0018/0022/0031/0041
-- restent telles quelles) : on corrige par-dessus, jamais en arrière.

-- ═══ 1. Retrait du prix (les 4 types fonctionnels) ═══════════════════════════
update public.items
set price_shards = null,
    price_eur    = null
where type in ('shield', 'streak_gel', 'scout_ping', 'attack_alert');

-- ═══ 2. Copie honnête (le catalogue serveur ne ment pas non plus) ════════════
update public.items
set description = 'Protège ta série hebdo une semaine. La série multiplie tes points de territoire — cet objet ne s''achète pas.',
    usage_limit = '2/mois max — jamais achetable, ni en Éclats ni en euros'
where item_key = 'streak_gel';

update public.items
set usage_limit = '2/semaine max — jamais achetable, jamais inclus dans l''abonnement'
where item_key = 'shield';

update public.items
set usage_limit = '1/semaine — jamais achetable, ni en Éclats ni en euros'
where item_key = 'scout_ping';

update public.items
set usage_limit = 'n''empêche pas la capture — jamais achetable, jamais inclus dans l''abonnement'
where item_key = 'attack_alert';

-- ═══ 3. La porte reste fermée : contrainte anti pay-to-win ═══════════════════
-- Un item de type fonctionnel ne peut porter NI prix Éclats NI prix EUR.
-- Toute tentative future (seed, UPDATE, import de catalogue) échoue ici.
alter table public.items
  drop constraint if exists items_functional_never_priced_check;

alter table public.items
  add constraint items_functional_never_priced_check check (
    type not in ('shield', 'streak_gel', 'scout_ping', 'attack_alert')
    or (price_shards is null and price_eur is null)
  );

comment on constraint items_functional_never_priced_check on public.items is
  'ANTI PAY-TO-WIN (CLAUDE.md, AMENDEMENT-40 §2, AMENDEMENT-45 §2) : un objet '
  'FONCTIONNEL (protection de secteur, protection de série, information '
  'tactique, alerte anticipée) ne se vend dans AUCUNE monnaie. Miroir de '
  'FUNCTIONAL_ITEM_ACQUISITION dans packages/shared/src/game-rules.ts.';
