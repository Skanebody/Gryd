-- 0089_public_hex_claims_respects_map_sharing.sql
-- GRYD — LE CHEMIN GRILLE RESPECTE À SON TOUR `map_sharing`
-- (constitution §7 « confidentialité géospatiale » ; spec produit §12.1).
--
-- ═══ COMMENT CE TROU A ÉTÉ TROUVÉ, ET POURQUOI IL AVAIT ÉTÉ MANQUÉ ══════════
-- Le §3 de `0087_public_territories_respects_map_sharing.sql` affirmait :
-- « `hex_claims_select_all` (0003:114) RESTE `using (true)` ». C'ÉTAIT FAUX à la
-- date où c'était écrit — 0079, ANTÉRIEURE, avait déjà remplacé cette policy par
-- `hex_claims_select_own` (0079:78-86) et retiré le SELECT à `anon` (0079:98).
-- En rectifiant cette phrase (27-28/07/2026), on est tombé sur le VRAI trou,
-- que la phrase fausse cachait : 0079 n'a pas fermé la grille, elle a déplacé sa
-- surface publique dans la vue `public.public_hex_claims` (0079:152) —
-- et CETTE vue ne consulte pas `map_sharing`.
--
-- Autrement dit : un joueur qui a coché « ne pas partager ma carte » voyait ses
-- territoires disparaître de `public_territories` (0087) et rester lisibles,
-- cellule par cellule, dans `public_hex_claims` : `h3index`, `owner_user_id`,
-- `claim_type`, et l'heure de capture. C'est la même carte, à la maille
-- inférieure. Une protection contournable par un autre chemin n'est pas une
-- protection ; c'est une case à cocher.
--
-- LA LEÇON, ÉCRITE PLUTÔT QU'OUBLIÉE : une doc fausse dans une migration est un
-- document permanent que les agents suivants tiennent pour vrai. Celle-ci a
-- coûté une vague : elle a fait croire le trou déjà nommé (« la grille fuit de
-- toute façon »), donc pas à refermer.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET RIEN DE PLUS ══════════════════════════
-- Elle ajoute UN prédicat au `where` de `public_hex_claims` : le propriétaire
-- de la cellule doit accepter le rendu public de sa carte. La fonction est celle
-- de 0087 (`territory_owner_shares_map`), pas une variante — deux implémentations
-- du même consentement divergeraient au premier réglage ajouté.
--
-- CE QU'ELLE NE FAIT PAS :
--  · elle ne touche NI les colonnes, NI leur ordre, NI leurs types : un
--    `create or replace view` qui les changerait échouerait, et les privilèges
--    posés par 0079 (revoke public/anon, grant authenticated) survivent tels
--    quels — ils ne sont donc pas redonnés ici ;
--  · elle ne change RIEN pour le propriétaire : la vue exclut déjà ses propres
--    cellules (`owner_user_id is distinct from auth.uid()`), qu'il lit dans la
--    table à leur précision réelle (policy `hex_claims_select_own`). Un réglage
--    de PARTAGE ne s'applique jamais à soi-même ;
--  · elle ne rend PAS `hex_claims` plus fermée : 0079 l'a déjà fait, et le
--    répéter donnerait à croire que ça restait à faire.
--
-- ═══ LA CONSÉQUENCE, DITE PLUTÔT QUE DÉCOUVERTE ════════════════════════════
-- `territory_owner_shares_map` répond FAUX en l'absence de ligne
-- `user_profiles` (repli prudent, 0087). Les cellules d'un compte SANS profil
-- cessent donc d'apparaître aux autres. C'est la MÊME dette d'onboarding que
-- 0087 §3.2 a nommée pour la vue polygonale, et elle vaut désormais aussi pour
-- la grille : le jour où l'inscription cesse de garantir une ligne de profil,
-- deux surfaces se videront, pas une. Aucun écran ne régresse aujourd'hui.
--
-- ⚠ NON SECURITY_INVOKER, ET C'EST VOULU (inchangé depuis 0079) : cette vue est
-- l'ouverture ÉTROITE au-dessus d'une table fermée ; sa liste de colonnes est la
-- frontière de sécurité. La re-déclarer `security_invoker` la viderait pour tout
-- le monde (la policy `hex_claims_select_own` ne rend que ses propres cellules,
-- que la vue exclut justement). `security_barrier` est RE-DÉCLARÉ : l'omettre
-- pourrait le laisser tomber, et un prédicat de vie privée qu'un `where`
-- d'appelant peut court-circuiter n'en est plus un.

create or replace view public.public_hex_claims
  with (security_barrier = true)
as
select
  hc.h3index,
  hc.activity,
  hc.owner_user_id,
  hc.claim_type,
  date_trunc('hour', hc.claimed_at) as claimed_at_hour,
  date_trunc('hour', hc.decay_at)   as decay_at_hour

from public.hex_claims hc

left join public.territories tr
  on tr.source_run_id = hc.run_id
 and tr.activity      = hc.activity

where
  -- Le lecteur ne se voit pas ici (0079, inchangé).
  hc.owner_user_id is distinct from (select auth.uid())

  -- §1.5 — publication différée, LUE et jamais recalculée (0079, inchangé).
  and coalesce(tr.publish_after, hc.claimed_at) <= now()

  -- §12.1 — LE RÉGLAGE DU PROPRIÉTAIRE, désormais opposable ici aussi.
  -- `'user'` en dur et non `tr.owner_type` : la ligne source est une CELLULE,
  -- dont le propriétaire est toujours une personne (`hex_claims.owner_user_id`,
  -- `not null`, 0002:131). Passer par le territoire joint serait faux deux fois
  -- — la jointure est `left` (une cellule peut n'en avoir aucun), et un
  -- `owner_type` de territoire ne gouverne pas le consentement d'une personne.
  and public.territory_owner_shares_map('user', hc.owner_user_id);

comment on view public.public_hex_claims is
  'AUDIT R3 — surface PUBLIQUE des cellules D''AUTRUI (§12.1/§12.3/§1.5). Ne contient QUE ce qu''un rival a le droit de savoir : quelle cellule, tenue par qui, prise comment, et depuis quand À L''HEURE PRÈS (game-rules PUBLIC_TIMESTAMP_TRUNC). Jamais run_id (il regrouperait les cellules en TRAJET), jamais un horodatage à la minute, jamais locked_until/shielded_until. Depuis 0089, uniquement les cellules dont le propriétaire n''a pas refusé le partage de carte (map_sharing <> ''none'') — le refus est opposable par le chemin GRILLE comme il l''est par la vue polygonale (0087), sinon la protection se contournait d''une maille. Les cellules du lecteur en sont ABSENTES : il les lit dans public.hex_claims, à leur précision réelle (policy hex_claims_select_own). Vue NON security_invoker À DESSEIN : c''est l''ouverture étroite au-dessus d''une table fermée — sa liste de colonnes est la frontière de sécurité.';

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI N'EST PAS FAIT — NOMMÉ, PAS MAQUILLÉ
-- ════════════════════════════════════════════════════════════════════════════
-- 1. `activity_sharing` et `discreet_mode` (0011) ne sont TOUJOURS PAS lus.
--    Même arbitrage qu'en 0087 §3.4 : ils gouvernent l'activité et la présence,
--    pas le rendu d'un territoire. Les empiler dans ce prédicat mélangerait
--    trois réglages que le joueur a réglés séparément.
-- 2. PGlite NE PROUVE PAS L'EFFET DE LA RLS (superutilisateur), et n'a pas
--    PostGIS. Le test associé prouve ce qui est role-indépendant : le `where` de
--    la vue filtre bien selon `map_sharing`, pour tout appelant. Qu'un rival soit
--    RÉELLEMENT aveugle ne se constate que sur un vrai Supabase.
-- 3. LE CLIENT NE LIT PAS ENCORE CETTE VUE POUR SA CARTE PRINCIPALE. Ce fichier
--    ferme une fuite de l'API ; il ne bascule aucune lecture d'écran. Dire
--    l'inverse serait une garantie écrite au-dessus du code.
