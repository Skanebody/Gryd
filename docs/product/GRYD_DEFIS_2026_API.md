# Défis de crews 2026 — contrat serveur P1

## Parcours écrit

La migration `0122_refonte_2026_crew_challenges.sql` ajoute les invitations entre deux crews, l’inscription personnelle avec consentement, le verrouillage des équipes de cinq, l’annulation avant départ, les préférences de secteur, les contributions persistées et les publications de résultat. Elle conserve le moteur partagé `challenges2026.ts` comme référence testée pour le calcul des scores. Aucun abonnement n’entre dans le calcul.

Chaque défi utilise une discipline, un fuseau fixe, une semaine du lundi à minuit au lundi suivant et trois secteurs figés. Chaque personne réserve au maximum une équipe par sport et semaine ; des semaines de fuseaux différents ne peuvent pas créer deux réservations qui se chevauchent. Les changements de crew après le début ne réaffectent pas les contributions de l’équipe initiale.

Une personne doit s’inscrire elle-même. Son consentement concerne la participation agrégée aux secteurs et ne rend pas sa trace ou sa boucle publique. Les directions des deux crews confirment que les trois secteurs sont comparablement accessibles. Un secteur choisi uniquement après une sortie n’est pas une préférence admissible.

## Catalogue réel préalable

`configure_challenge_arena_2026(p_id,p_title,p_activity,p_time_zone,p_sectors,p_access_source,p_reviewed_at)` est réservé au service. Les trois secteurs sont un tableau ordonné `{id,title,geometry}`. Le serveur valide leurs polygones avec PostGIS. L’ordre des identifiants dans ce tableau est l’ordre de repli présenté avant inscription. L’arène publiée est immuable ; son retrait utilise `retired_at`, et une modification demande une nouvelle version.

**Aucune arène n’est créée par une migration.** Une absence de catalogue est une indisponibilité réelle, jamais remplacée par des carrés fictifs. La revue d’accès terrain, la fraîcheur des sources et l’accord pratique des deux groupes restent nécessaires. Le calcul ne prétend pas déterminer automatiquement l’accessibilité depuis les kilomètres parcourus.

### D’où vient la géographie d’une arène (0151)

Jusqu’au 10/09/2026, `challenge_arenas_2026` était VIDE en production et la seule voie d’écriture attendait trois polygones GeoJSON écrits à la main : le moteur des défis était complet et inerte, la tuile « Défis de crew » un cul-de-sac. `0151` ajoute la dérivation depuis une géographie **réelle**, et rien d’autre.

| RPC (service_role) | Effet |
|---|---|
| `propose_challenge_arenas_2026(p_arena_id,p_commune_insee,p_activity,p_search_radius_m,p_pad_m,p_min_span_m,p_min_possessions)` | **À blanc, aucune écriture.** Rend `{arenaId,communeInsee,communeName,activity,source,footprintCityId,footprintName,footprintCommunes,possessionsFound,areaRatio,sectors[],warnings[]}`. Chaque secteur porte `id`, `positionKey` (`west`/`centre`/`east`, l’ordre de repli), `geometry`, `areaM2`, `countableAreaM2`, `spanM`, `possessions`, `forbiddenOverlapM2`. |
| `publish_challenge_arena_2026(…,p_time_zone,p_title,p_sector_titles,p_access_source,p_reviewed_at,p_operator,…)` | Publie la MÊME dérivation via `configure_challenge_arena_2026`, puis journalise. Rend `{arenaId,journalId,source,sectors,warnings}`. |
| `retire_challenge_arena_2026(p_arena_id,p_operator,p_reason)` | Retire une arène publiée (immuable) et journalise le motif. Les défis déjà programmés gardent leur copie figée des secteurs. |

Deux sources, dans cet ordre, toutes deux réelles et **déclarées** dans `source` :

1. `ownership_clusters` — les possessions réellement capturées (`ownership_2026`) dans la commune, groupées en trois par `ST_ClusterKMeans`, enveloppe convexe élargie du seuil de trace du cahier, découpée sur l’emprise communale. C’est la source à privilégier : les secteurs sont là où l’on court déjà.
2. `city_zone_split` — à défaut de présence, un contour **administratif** réel de `city_zones` contenant le centre de la commune, coupé en trois bandes d’ouest en est. Les limites extérieures sont réelles ; les deux coupes intérieures sont un choix d’exploitation, et `warnings` contient `no_real_presence_yet`.

Il n’y a pas de troisième source. `fr_communes` ne porte qu’un **centre** (lat/lng) : un disque autour d’un point appelé « secteur » serait exactement le carré fictif que le contrat interdit. Sans possession et sans contour, la fonction refuse `no_real_geography`. Autres refus : `unknown_commune`, `invalid_arena_request`, `invalid_parameters`, `empty_sector`, `sectors_too_small` (un secteur dont la diagonale **jouable** est plus courte que le seuil de trace rendrait le défi impossible), `sector_titles_required`, `operator_required`.

**`city_zones` n’est PAS un contour par commune.** Constat en production le 10/09/2026 (lecture seule) : deux emprises seulement, `paris` (763 km², 629 points) et `lille` (« Métropole de Lille », 674 km², 614 points). Ce sont de vrais contours irréguliers, mais des contours de **métropole** : le centre de 124 communes tombe dans l’emprise `paris`, celui de 93 dans `lille`, et 217 communes sur 34 969 sont couvertes. Découper « la commune » de Roubaix rendrait donc trois bandes de toute la métropole lilloise. La proposition nomme donc le territoire réellement découpé (`footprintName`), compte les communes qu’il contient (`footprintCommunes`) et lève l’avertissement `footprint_wider_than_commune:<n>`. L’opérateur le voit avant de nommer les secteurs, au lieu de le découvrir sur la carte.

**La portée d’un secteur se mesure sur sa part jouable.** `challenge_sector_metres_2026` (0150) soustrait `no_capture_zones` de la trace avant de la couper au secteur : un mètre couru dans une zone interdite ne rapporte rien. La portion interdite d’un secteur n’est donc pas du terrain de jeu. `spanM`, le refus `sectors_too_small` et `areaRatio` (§6.5) sont calculés sur `secteur − zones interdites` ; `areaM2` (brut), `countableAreaM2` (jouable) et `forbiddenOverlapM2` sont tous les trois rapportés. Sans cela, on publierait une arène dont un secteur est en grande partie inerte, sans que personne le voie — mesuré : un secteur taillé dans la zone interdite réelle « La Seine » rendait **1 296 m** de portée brute, donc publiable, pour **0 m²** jouable.

**Ce que la machine ne décide pas** : ni l’accessibilité (§6.2), ni les noms. `publish_challenge_arena_2026` exige de la main d’un humain le fuseau, le titre, **trois** titres de secteurs distincts et non vides, la source de la revue d’accès et sa date. Un « Secteur 1 » fabriqué serait un nom de lieu inventé. Le journal `challenge_arena_publications_2026` conserve, pour chaque publication et chaque retrait : la commune, la source géométrique, la proposition complète (aires, portées, possessions comptées, chevauchements interdits, avertissements) et l’opérateur déclaré — pour qu’on puisse dire dans six mois **pourquoi** ces trois secteurs-là.

### Edge Function d’exploitation `challenges_arena_2026`

Trois actions : `propose` (à blanc), `publish`, `retire`. Porteur admis : la **clé de service** uniquement, comparée en temps constant (`_shared/secret.ts`) ; aucun secret n’est écrit dans le code. L’identifiant est **dérivé**, jamais saisi libre : `fr-<insee>-<discipline>-v<n>`, et les identifiants de secteurs en découlent (`<arenaId>-west|centre|east`), donc deux publications ne se mélangent pas. La marge, la portée minimale et le nombre minimal de possessions viennent des constantes partagées (`CHALLENGE_RULES_2026.minimumTraceInsideSectorM`, `sectorCount`) ; le rayon de recherche est facultatif, plafonné à `CITY_DISC_RADIUS_M`, et ne sert qu’à borner la **recherche** de possessions — jamais à dessiner. Un champ inconnu est refusé (`unexpected_field:…`) plutôt qu’ignoré. Aucun cron ne l’appelle : une arène naît d’une décision humaine.

### Publier la première arène (commande exacte)

Prérequis : `0151` appliquée (`supabase migration list` puis `supabase db push` — en prod, les migrations s’arrêtaient à `0129` le 10/09/2026), et une commune où des gens ont **vraiment** couru. `psql` n’est pas installé sur la machine du fondateur : la voie est `scripts/challenge-arena.mjs`, qui appelle les RPC via `pg` (même dépendance que `verify:rls`) et dérive les paramètres géométriques des constantes partagées. **Par défaut il ne fait qu’une proposition à blanc** — transaction en lecture seule, rien n’est écrit.

```bash
# 0. secrets locaux (jamais en dur) — depuis la racine du dépôt
set -a && . ./scratchpad-secrets.local && set +a

# 1. PROPOSITION À BLANC : n'écrit rien. Relire source / footprintName /
#    footprintCommunes / possessionsFound / areaRatio / countableAreaM2 / warnings.
node scripts/challenge-arena.mjs --commune 76540 --activity run

# 2. PUBLICATION : les trois noms viennent de la revue de terrain, dans l'ordre
#    west|centre|east rendu par la proposition. Rien n'est publié sans eux.
node scripts/challenge-arena.mjs --commune 76540 --activity run --publish \
  --title "Rouen — rive droite" --time-zone Europe/Paris \
  --sectors "Les Quais|Jardin des Plantes|Rive Gauche" \
  --access-source "Revue de terrain du 10/09/2026 (photos + parcours reconnus)" \
  --operator fondateur

# 3. RETRAIT, si la revue d'accès n'est plus vraie
node scripts/challenge-arena.mjs --retire fr-76540-run-v1 \
  --operator fondateur --reason "travaux sur les quais"
```

La même séquence par l’Edge Function, après `supabase functions deploy challenges_arena_2026` (journal d’exploitation en plus, mêmes paramètres dérivés) :

```bash
curl -sS -X POST "https://<projet>.supabase.co/functions/v1/challenges_arena_2026" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H 'content-type: application/json' \
  -d '{"action":"propose","communeInsee":"76540","activity":"run"}'
```

**Ce que cette commande rendra aujourd’hui, et pourquoi.** Constat en production le 10/09/2026 (lecture seule) : `runs` = 0, `ownership_2026` = 0, `challenge_arenas_2026` = 0, `crew_challenges_2026` = 0. Il n’existe donc AUCUNE possession réelle, et la source `ownership_clusters` n’est disponible nulle part. Les seules emprises `city_zones` sont `paris` et `lille` : sur Rouen (`76540`), la commande ci-dessus refusera `no_real_geography`, ce qui est la réponse juste — il n’y a rien de réel à découper là-bas. Sur une commune couverte par une emprise (`75056` Paris, `59350` Lille, `59512` Roubaix…), elle rendra trois bandes `city_zone_split` avec l’avertissement `footprint_wider_than_commune`. **La première arène honnête viendra donc de `ownership_clusters`, après les premières vraies courses** ; c’est la source à privilégier de toute façon.

Tant qu’aucune arène n’est publiée, l’écran dit « Aucun défi disponible dans ta ville pour l’instant » et explique qu’un défi a besoin de trois secteurs vérifiés. Il ne promet pas de date et n’invente rien.

## Défi privé miroir (§6.5) : écart documenté, non implémenté

Le cahier prévoit, quand deux crews n’ont pas un accès comparable aux trois secteurs, un **défi privé miroir** : « trois objectifs personnels comparables en durée déclarée, sans victoire territoriale commune », amical et hors classement local. Il n’est **pas** implémenté, et le minimum n’est pas atteignable proprement avec le modèle existant :

- `crew_challenges_2026.arena_id` est une clé étrangère **obligatoire** vers une arène publiée, et `sectors` est un tableau de trois polygones validés par PostGIS. Un défi sans géographie commune n’a ni l’un ni l’autre ; réutiliser la colonne `sectors` pour ranger des objectifs de durée serait mentir sur le sens d’une colonne.
- le score entier (`challenge_score_2026`, `assign_challenge_loop_2026`, `challenge_sector_metres_2026`) est **géométrique** : points par journée dans un secteur. Un objectif « en durée déclarée » vient d’une autre grandeur, sans preuve de trace ; il faudrait une table de contributions distincte et une règle anti-triche propre.
- la réservation unique `challenge_one_team_per_sport_week_2026` est faite pour un match classé. Un défi amical hors classement ne doit **pas** consommer cette réservation, ce qui suppose une colonne d’état supplémentaire.

Le faire à moitié — un défi territorial déguisé en défi de durée — donnerait exactement ce que le §6.5 refuse : prétendre comparer des géographies identiques. L’écran ne propose donc aucun bouton pour cela ; quand aucun crew adverse n’existe dans la ville, il le dit et s’arrête là.

## RPC de l’application

Toutes les RPC suivantes exigent une session authentifiée. Les identités et dates d’action proviennent du serveur. Les rôles de direction autorisés sont `co_captain` et `founder`, identiques au droit existant d’invitation d’un crew.

| RPC | Arguments | Effet / résultat |
|---|---|---|
| `list_challenge_arenas_2026` | `{p_activity:'run'|'bike'}` | Tableau `{id,title,activity,timeZone,sectors,accessSource,reviewedAt}`. |
| `create_crew_challenge_2026` | `{p_client_id:UUID,p_opponent_crew_id:UUID,p_arena_id,p_starts_at:ISO,p_access_confirmed:true}` | Direction du crew courant ; lundi futur à minuit dans le fuseau de l’arène. Retour `{id,status:'invited',replayed}` ; même identifiant client = même invitation. |
| `accept_crew_challenge_2026` | `{p_challenge_id,p_access_confirmed:true}` | Direction du crew invité ; retour `{id,status:'assembling'}`. |
| `join_crew_challenge_2026` | `{p_challenge_id,p_consent:boolean}` | Inscription/retrait de soi uniquement ; retour `{id,joined}`. Aucun capitaine ne consent à la place d’un membre. |
| `lock_crew_challenge_2026` | `{p_challenge_id}` | La direction verrouille son équipe de cinq volontaires ; `{id,status}` devient `scheduled` quand les deux équipes ont confirmé. |
| `cancel_crew_challenge_2026` | `{p_challenge_id}` | Direction de l’une des équipes, avant le début ; `{id,status:'cancelled'}`. Réservations libérées. |
| `set_challenge_preference_2026` | `{p_challenge_id,p_sector_id}` | Enregistre une préférence datée ; `{sectorId,recordedAt}`. Seule la dernière préférence antérieure au départ de l’activité compte. |
| `withdraw_challenge_activity_2026` | `{p_run_id}` | Retire les contributions d’une activité appartenant à l’appelant, en conservant ses tentatives consommées. |
| `get_crew_challenges_2026` | `{p_activity}` | Tableau de défis accessibles, avec la forme ci-dessous. Reprend aussi la publication en retard. |

La découverte d’un crew adverse utilise le RPC existant `crew_discovery`, limité à une ville. Une invitation n’envoie pas automatiquement un message privé ou une notification externe depuis cette migration.

États : `invited → assembling → scheduled → active → final`, ou `cancelled` avant départ. Une équipe incomplète au début est annulée. Le retrait d’un inscrit avant le début déverrouille son équipe pour permettre un remplacement volontaire. Un non-inscrit ne peut pas déverrouiller une équipe en simulant un retrait. Après le début, une personne déjà dans l’effectif peut retirer son consentement puis le réactiver pour de futures sorties ; aucun nouveau membre n’entre dans l’effectif. La réinscription après la fin n’est pas possible.

**Le retrait global s’arrête avec le résultat (0148).** Dès que le défi est `final`, ou dès que la fenêtre de synchronisation de 24 h est passée, `join_crew_challenge_2026(p_consent:false)` lève `challenge_closed`. Avant 0148, ce geste marquait `withdrawn` **toutes** les contributions de la personne et republiait un résultat corrigé : le test d’étape 0 montre le vainqueur changer après la clôture. Ce qui survit à la clôture est le droit sur ses données, pas un levier de score : `withdraw_challenge_activity_2026` sur **une** sortie nommée, et la suppression d’une sortie ou du compte (trigger `remove_challenge_source_2026`). Chacun produit une révision visible ; aucun ne retire tout d’une touche. Pendant le match, le retrait reste immédiat et total.

Erreurs utiles pour l’écran : `direction_required`, `challenge_unavailable`, `five_volunteers_required`, `team_full`, `roster_locked`, `player_already_registered`, `challenge_started`, `challenge_closed`, `preference_unavailable`, et depuis 0149 `no_crew` et `arena_unavailable`. Un blocage renvoie un motif générique, sans indiquer qui a bloqué qui.

**Refus nommés (0149).** Avant 0149, trois refus réels remontaient en `NO_DATA_FOUND` (« query returned no rows ») : un compte sans crew qui propose un défi, une arène inconnue ou retirée, et un membre qui n’est pas la direction de son équipe pour accepter ou figer. L’écran ne pouvait que dire « L’action n’a pas abouti » ; il dit désormais la raison. `ambiguous_crew` n’existe pas : `crew_members_one_active_per_user` (0002) rend l’adhésion active unique.

**Une seule définition de la direction.** Proposer, accepter, figer ou annuler un défi demande `challenge_rules_2026.manager_roles` = `CREW_PERMISSIONS.invite` = {`co_captain`, `founder`} : un défi engage le crew entier face à un autre crew. `crew_outings_2026` (0124) ouvre la création d’une SORTIE à `CREW_PERMISSIONS.createOuting` = {`captain`, `co_captain`, `founder`} : ce n’est pas la même action, et ce n’est donc pas une contradiction. Le test PGlite compare les deux listes et vérifie qu’un `captain` est refusé sur un défi. Aucun rôle n’est ajouté ici ; le catalogue §13.3 du cahier (Membre/Organisateur/Modérateur/Capitaine) reste un vocabulaire produit, sans `moderator` dans `CREW_ROLES`.

```ts
type ChallengeView2026 = {
  id: string; title: string; activity: 'run' | 'bike';
  status: 'invited' | 'assembling' | 'scheduled' | 'active' | 'final' | 'cancelled';
  reason: string | null; timeZone: string; startsAt: string; endsAt: string;
  sectors: Array<{ id: string; title: string; geometry: object }>;
  myTeamId: string; canManage: boolean; joined: boolean; rostered: boolean;
  myPreference: null | { sectorId: string; recordedAt: string };
  teams: Array<{ id: string; name: string; accepted: boolean; locked: boolean; players: number; side: 0 | 1 }>;
  ownScore: { teamId: string; totalPoints: number; sectors: Record<string, number> };
  publishedResult: null | {
    scores: Array<{ teamId: string; totalPoints: number; sectors: Record<string, number>; matchPoints: number }>;
    winnerTeamId: string | null; isDraw: boolean;
  };
  publishedAt: string | null; resultRevision: number | null;
  myContributions: Array<{
    runId: string | null; day: string; sectorId: string;
    points: number; withdrawn: boolean; usedFallback: boolean;
  }>;
};
```

`ownScore` exclut volontairement les points de match : ils permettraient de déduire le score adverse en direct. Les résultats comparatifs utilisent seulement `publishedResult`, avec sa date et sa révision. Les identifiants d’activités retournés appartiennent uniquement à l’appelant. Aucun polygone d’activité, masque personnel, position en direct ou identifiant de joueur adverse n’apparaît dans cette API.

## Preuve géographique et calcul

`ingest_run` appelle désormais `stage_game_activity_2026` avec les faces admissibles et les segments de trace validés. Cette fonction conserve dans une même transaction la capture libre et les contributions de défi. Une panne conserve l’activité durable et laisse le résultat du jeu en attente ; les XP sportifs restent indépendants.

Pour un défi, le serveur mesure la **trace validée que la boucle admissible contient**, secteur par secteur : `challenge_sector_metres_2026` (0150) intersecte les segments réellement suivis avec le **polygone fermé de la face** — son intérieur et son bord —, retire le raccord synthétique de fermeture et les géométries interdites, puis intersecte avec chaque secteur. Le seuil est de 400 m à pied et 1 000 m à vélo.

Avant 0150, la mesure portait sur `ST_Boundary(face)` : une portion de trace réellement parcourue **à l’intérieur** de la boucle — un huit, un aller-retour, une diagonale — comptait pour zéro, alors que le cahier §6.2 demande « une portion de trace validée à l’intérieur du secteur » et que le moteur partagé nomme déjà cette grandeur `sectorTraceMetres`. Le nouvel ensemble mesuré **contient** l’ancien : rien de déjà acquis ne disparaît. La signature de `stage_game_activity_2026` a changé le même jour (0155, tolérance d’horloge) en recopiant l’ancienne mesure : `0169` la rebranche sur `challenge_sector_metres_2026`, et le test de lignée du gate exige que la **dernière** définition du fichier de migrations délègue la mesure. Ce qui ne compte toujours pas : englober un secteur sans y passer (aucune trace à l’intérieur), un passage inventé entre deux segments GPS (le raccord est soustrait), une trace hors de la boucle du jour, et toute géométrie interdite. Une boucle privée peut contribuer avec le consentement distinct du défi. Une preuve d’horloge insuffisante ou une revue anti-triche en cours empêche l’attribution.

Les deux premières journées physiques attribuées valent au maximum trois points chacune. Une journée et une activité ne peuvent être attribuées deux fois. L’ordre des importations ne crée pas une troisième journée payante ; un jour antérieur reçu plus tard corrige le plafond. Une affectation déjà validée conserve son secteur. Les suppressions et retraits créent des annulations persistées et ne libèrent aucune tentative.

Chaque équipe atteint au maximum trente points. Le score de match compare les trois secteurs, avec un point par victoire et un demi-point par égalité ; aucun départage par allure, distance supplémentaire ou heure de sortie. Les constantes SQL sont comparées aux constantes partagées par un test exécutable, et le résultat SQL est comparé au moteur TypeScript.

Le délai de réception d’un défi est indépendant du délai de capture libre : fermeture physique avant la fin du défi, fin technique et réception avant `endsAt + 24 heures`. Une réception trop tardive pour la carte libre peut donc rester admissible dans la fenêtre explicite du match. Les imports via d’autres fournisseurs ne sont toutefois pas déclarés livrés par cette possibilité de calcul.

## Publication et confidentialité

`publish_due_challenges_2026()` est un job SQL réservé au service, programmé chaque minute si `pg_cron` est installé. Il active les effectifs prêts et publie le dernier instantané autorisé. Une lecture authentifiée reprend ce même traitement si le job a été interrompu.

**Verdict pg_cron en production (constaté le 10/09/2026, lecture seule).** `pg_cron` 1.6.4 est bien installé (schéma `cron` présent) et le job conditionnel de `0122:497-499` **existe et tourne** : `cron.job` jobid 11, `publish-challenges-2026`, planification `* * * * *`, `active = true`, dernière exécution `succeeded` (`cron.job_run_details`). Aucun endpoint de repli n’est donc ajouté : il n’y a rien à remplacer, et un second déclencheur planifié serait une pièce de plus à maintenir pour rien. Le repli qui existe déjà est une lecture — `get_crew_challenges_2026` appelle `maintain_challenge_2026` pour chacun des défis du lecteur — et il suffit à rattraper une interruption du job. Si un jour l’extension disparaissait (restauration, nouveau projet), le symptôme serait une publication qui n’avance qu’à la lecture : le job doit alors être re-planifié, pas contourné.

Le score adverse change au plus une fois par jour à midi dans le fuseau figé. La dernière publication comparative ordinaire est le dimanche midi. Seules les preuves reçues **et validées** avant la coupure entrent dans l’instantané. Le résultat final paraît après les vingt-quatre heures de synchronisation. Un retrait peut réviser immédiatement un instantané existant, à coupure inchangée, sans y incorporer de nouvelles activités ; l’historique des révisions est conservé.

Les tables sont sous RLS et interdites directement aux clients. Les fonctions internes de score, de mesure et de publication sont réservées au service. Les blocages sont vérifiés dans les deux sens ; les identités résolues depuis les anciens blocages par pseudo sont mémorisées pour qu’un changement de nom ne contourne pas le blocage. Les anciens pseudos sans correspondance connue ne sont pas rapprochés arbitrairement.

## Validation et limites de livraison

Le harnais `supabase/tests/crew_challenges_2026.pglite.test.mjs` exécute la migration réelle `0122` sur PostgreSQL/WASM, avec le schéma antérieur minimal en fixtures. Il utilise les rôles authentifiés pour tester les refus effectifs de privilèges et couvre le cycle, les effectifs, les blocages, les chevauchements de fuseaux, les plafonds, les imports tardifs, les préférences, les retraits, les résultats, midi/DST et la comparaison avec le moteur partagé.

Le harnais PostGIS `supabase/tests/crew_challenge_measure_2026.postgis.test.mjs` compare, sur la même fixture, la mesure de 0122 et celle de 0150 : portion de bord parcourue, diagonale intérieure, secteur entouré sans passage, raccord synthétique, zone interdite. Le harnais `supabase/tests/refonte2026.postgis.test.mjs` contient aussi les cas géographiques de défi : vraie portion de frontière, secteur entouré sans passage, rupture GPS, discipline, refus sans consentement/provenance, réception finale et absence de polygone public issu d’une participation privée. **Ces assertions spatiales n’ont pas été exécutées sur ce poste**, qui ne dispose pas d’une base PostgreSQL/PostGIS locale. Le harnais refuse toute cible hébergée et sort en code 2 sans base locale ; ce n’est jamais un test vert.

Le harnais `supabase/tests/crew_challenge_arenas_2026.pglite.test.mjs` (8 assertions) commence par l’étape 0 — `0122` seule : catalogue vide, aucune fonction pour le remplir — puis prouve sur `0151` qu’aucune arène n’est semée, que proposer/publier/retirer sont des droits du service, les refus qui précèdent tout calcul, le journal, le retrait, et par lecture du corps de la fonction que la portée d’un secteur se mesure sur sa part jouable. **PGlite n’a pas PostGIS : le découpage lui-même n’y est pas exécuté.**

Le découpage a en revanche été **rejoué sur PostGIS 3.3.7 réel** (le projet de production, en `default_transaction_read_only = on`, avec des géométries synthétiques passées en argument — aucune écriture) : `ST_ClusterKMeans` sur trois grappes rend bien trois secteurs, le contour réel de Paris (629 points) se coupe bien en trois bandes, les secteurs sont **disjoints** (somme des aires = aire de l’union, au mètre carré près), et la mesure sur la part jouable change le verdict — un secteur taillé dans la zone interdite « La Seine » passait de « accepté » (1 296 m de portée brute) à refusé, et un trio de secteurs dont un est amputé passe d’un `areaRatio` de 1,00 (aires brutes) à 1,28 (aires jouables). Ce rejeu n’est pas un test du gate : il exige réseau et secret.

Pas de déploiement, d’inscription réelle ou de match fictif. Les essais GPS sur appareils, les imports Santé/Watch canoniques, la calibration territoriale, le matchmaking automatique (§6.5) et le défi privé miroir restent à valider ou implémenter séparément. `pg_cron` et son job de publication, eux, ont été **constatés actifs** en production (voir ci-dessus). La table d’adhésion de crew héritée reste globale au compte ; les réservations de défis sont, elles, séparées par discipline. Aucun classement de ligue ou album de fin de saison n’est fabriqué par ces résultats de match.
