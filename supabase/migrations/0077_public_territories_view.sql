-- 0077_public_territories_view.sql
-- GRYD — LA SURFACE PUBLIQUE D'UN TERRITOIRE (spec produit §12.1, §12.3, §1.5).
--
-- ═══ LE PROBLÈME QUE CETTE MIGRATION ATTAQUE ════════════════════════════════
-- §12.3 : « Un territoire public est une géométrie DÉRIVÉE. Il ne doit pas
-- permettre de reconstruire le trajet privé exact. »
-- §12.1 : « … simplifier les contours ; retarder la publication ; supprimer les
-- timestamps détaillés. »
--
-- La table `territories` (0074) porte les DEUX géométries dans la même ligne :
-- `geometry` (la trace réelle, autoritaire) et `geometry_generalized` (la forme
-- dérivée). Sa policy de lecture filtre bien `publish_after`, mais elle rend la
-- LIGNE ENTIÈRE — donc `geometry` exacte, `source_run_id`, et des horodatages à
-- la microseconde. Un client autorisé à voir un territoire publié pouvait donc
-- lire le tracé exact du propriétaire : la publication différée protégeait le
-- QUAND, pas le QUOI. Cette vue est le QUOI.
--
-- Elle ne remplace rien et ne casse rien : `territories` reste lisible telle
-- quelle par son propriétaire (et par le service_role) ; c'est le RENDU PUBLIC
-- qui passe désormais par une surface réduite, et c'est elle que les lectures
-- client devront viser.
--
-- ═══ CE QU'ELLE N'EXPOSE PAS, ET POURQUOI ═══════════════════════════════════
--  · `geometry` (exacte) — c'est le trajet. §12.3 l'interdit, point final.
--  · `source_run_id` — il désigne une ligne de `runs`, donc une course, donc un
--    coureur à un instant. Le corréler avec un polygone publié reconstruirait
--    exactement l'habitude que §1.5 protège.
--  · `publish_after`, `created_at`, `updated_at` — trois horloges à la
--    microseconde. `publish_after = capture + délai` : le publier, c'est publier
--    l'heure de la capture. `updated_at` bouge à chaque défense : le publier,
--    c'est publier un journal d'activité.
--  · `algorithm_version` — détail d'implémentation, aucun usage client.
-- Ce qui reste est ce qu'un rival a le droit de savoir : QUI tient QUOI, OÙ,
-- sous quelle forme approximative, depuis quand À L'HEURE PRÈS.
--
-- ═══ « SUPPRIMER LES TIMESTAMPS DÉTAILLÉS » (§12.1) ═════════════════════════
-- `controlled_since` est TRONQUÉ à l'heure. Une minute exacte, répétée, trahit
-- une habitude (« il capture à 7 h 12 tous les mardis ») ; l'heure situe le
-- territoire dans le temps sans dessiner un emploi du temps. La granularité
-- vient de `PUBLIC_TIMESTAMP_TRUNC` (packages/shared/src/game-rules.ts) — même
-- patron d'annotation que 0002 et 0074 : le SQL cite la constante, il ne la
-- réinvente pas.
--
-- ═══ AUCUN NOMBRE MAGIQUE : LE DÉLAI DE 60 MIN N'EST PAS ICI ════════════════
-- Le filtre est `publish_after <= now()`, jamais `created_at + interval '60
-- minutes'`. L'instant a été DÉCIDÉ par l'écrivain depuis
-- `TERRITORY_PUBLISH_DELAY_MINUTES` (game-rules) et stocké ; la vue le compare,
-- elle ne le recalcule pas. Écrire le délai ici en ferait une seconde source de
-- vérité, et un jour les deux divergeraient.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA VUE
-- ════════════════════════════════════════════════════════════════════════════
-- `security_invoker = true` : la vue s'évalue avec les droits ET la RLS du
-- LECTEUR, pas de son propriétaire. Sans ça, une vue appartenant à `postgres`
-- contournerait `territories_select_published` (0074) et deviendrait un tunnel
-- au-dessus de la RLS. C'est le choix INVERSE de `territories_backfill_gap`
-- (0076) — et c'est cohérent : cette vue-là est un diagnostic d'opérateur fermé
-- à tout client, celle-ci est servie AUX clients. Une vue lue par des clients
-- ne doit jamais valoir plus que son lecteur.
--
-- `security_barrier = true` : sans lui, Postgres peut faire remonter une
-- fonction fournie par l'appelant AVANT les quals de la vue, et cette fonction
-- verrait alors les lignes non publiées avant qu'elles ne soient filtrées.
-- La barrière est exactement faite pour les vues dont le WHERE est la
-- protection.
create view public.public_territories
  with (security_invoker = true, security_barrier = true)
as
select
  t.id,
  t.activity,
  t.owner_type,
  t.owner_id,
  t.city_id,
  t.state,
  t.defense_level,

  -- L'AIRE reste celle du polygone AUTORITAIRE (§19.2) : c'est la grandeur de
  -- jeu, elle ne localise personne. Elle n'est délibérément PAS recalculée sur
  -- l'anneau généralisé — un client qui mesurerait la forme rendue trouverait
  -- une valeur légèrement différente, et c'est la conséquence assumée d'une
  -- géométrie dérivée. La base ne calcule pas de géométrie (0074).
  t.area_m2,

  -- LA SEULE GÉOMÉTRIE PUBLIQUE. Le nom de colonne garde le mot
  -- « generalized » : appeler ça `geometry` laisserait croire à un contour
  -- exact, et un nom qui laisse croire est déjà un mensonge.
  t.geometry_generalized,

  -- game-rules: PUBLIC_TIMESTAMP_TRUNC (§12.1 « supprimer les timestamps
  -- détaillés »). NULL reste NULL : un territoire `unowned` n'a pas de début de
  -- contrôle, et lui en inventer un serait fabriquer de la donnée.
  date_trunc('hour', t.controlled_since) as controlled_since_hour

from public.territories t
where
  -- §1.5 — LA PUBLICATION DIFFÉRÉE. Le cœur de la vue : avant l'échéance, la
  -- ligne n'existe pas pour cette surface, même pour son propriétaire. Le
  -- propriétaire voit son territoire en avance via `territories` directement
  -- (policy 0074) ; il n'a pas besoin de le voir dans le rendu PUBLIC, et l'y
  -- laisser rendrait le filtre intestable et fragile.
  t.publish_after <= now()

  -- Pas de forme dérivée ⇒ RIEN. Le repli sur `geometry` exacte serait la fuite
  -- que toute cette migration existe pour empêcher ; publier une ligne à
  -- géométrie NULL serait un quatrième état inventé côté client. Un territoire
  -- sans contour publiable est simplement ABSENT du rendu public — c'est un
  -- défaut du producteur (moteur), pas quelque chose que la base maquille.
  and t.geometry_generalized is not null;

comment on view public.public_territories is
  'RENDU PUBLIC d''un territoire (§12.1/§12.3). Ne contient QUE ce qui est publiable : géométrie GÉNÉRALISÉE (jamais le tracé exact), aucun source_run_id, controlled_since TRONQUÉ à l''heure, et uniquement les lignes dont publish_after est échu (§1.5, publication différée de 60 min décidée par game-rules et stockée par l''écrivain). security_invoker : la RLS du lecteur s''applique. C''est cette vue que les lectures client doivent viser, jamais public.territories.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. PRIVILÈGES
-- ════════════════════════════════════════════════════════════════════════════
-- `revoke ... from public` n'est pas décoratif : Supabase pose des privilèges
-- par défaut sur le schéma `public`, et sans ce revoke la vue serait lisible par
-- `anon` — donc par un visiteur non connecté. On repart de zéro, puis on
-- n'accorde que `select`, et qu'à `authenticated`.
revoke all on public.public_territories from public, anon, authenticated;
grant select on public.public_territories to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. CE QUI N'EST PAS FAIT — L'ÉTAPE SUIVANTE, NOMMÉE
-- ════════════════════════════════════════════════════════════════════════════
-- 1. ⚠️ `hex_claims` RESTE INTÉGRALEMENT LISIBLE. `hex_claims_select_all`
--    (0003:114) est `for select to authenticated using (true)` : tout joueur
--    connecté lit TOUTE cellule capturée, avec son `claimed_at` exact, SANS
--    aucun délai. C'est le point de vie privée le plus sérieux du backend
--    (AUDIT R3) : les cellules d'une course dessinent son parcours, et leurs
--    horodatages dessinent une habitude. Cette vue ne le corrige PAS.
--    ELLE NE POUVAIT PAS le corriger dans le même lot : la carte de l'app lit
--    encore `hex_claims` (la propriété est toujours hexagonale, cf. 0074 §
--    suspens 1). Restreindre la policy AUJOURD'HUI ferait disparaître les
--    territoires de l'écran — casser l'app pour protéger la vie privée n'est pas
--    un arbitrage, c'est une panne.
--    L'ORDRE OBLIGATOIRE est donc : (a) les lectures client basculent sur
--    `public_territories` ; (b) SEULEMENT ENSUITE `hex_claims_select_all` est
--    restreinte (propriétaire + crew, ou supprimée). Inverser les deux casse la
--    carte ; ne jamais faire (b) laisse R3 ouvert pour toujours.
-- 2. AUCUN CLIENT NE LIT ENCORE CETTE VUE. Elle est posée et testée, mais
--    l'app continue de lire `hex_claims` : à cet instant précis, elle ne protège
--    personne. Elle est l'INFRASTRUCTURE de (a), pas (a).
-- 3. LA GÉNÉRALISATION N'EST PAS VÉRIFIÉE PAR LA BASE. Rien ici ne garantit que
--    `geometry_generalized` soit réellement plus grossière que `geometry` : sur
--    un polygone déjà simple, Douglas-Peucker peut rendre l'anneau IDENTIQUE, et
--    la vue publierait alors le contour exact sans le savoir. La garantie
--    appartient au moteur (`simplifyRing`) et à ses tests ; la base stocke, elle
--    ne calcule pas (0074). À traiter côté producteur, pas par un CHECK ici.
-- 4. L'AGRÉGATION N'EST PAS FAITE. §12.2 (partage crew) et la scalabilité 200k
--    demanderont des rendus agrégés par zoom ; cette vue rend des lignes
--    unitaires. Rien ne l'en empêche, rien ne le fait encore.
-- 5. PGlite NE PROUVE PAS L'EFFET DE LA RLS (il tourne en superutilisateur, où
--    les policies ne s'appliquent pas). Le test associé prouve que le WHERE de
--    la VUE filtre — ça, c'est indépendant du rôle — et que les privilèges sont
--    ceux annoncés. Que `security_invoker` protège réellement un rival ne pourra
--    être constaté que sur un vrai Supabase.
