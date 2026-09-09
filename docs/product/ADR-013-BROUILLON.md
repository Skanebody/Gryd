# ADR-013 (BROUILLON) — Classements, défis, récompenses et notifications

> **Brouillon.** À intégrer par le fondateur dans `docs/DECISIONS.md`, à sa date. Ce fichier n'a
> aucune autorité tant qu'il vit ici. Analyse d'appui :
> `docs/product/GRYD_INTVL_ANALYSE_2026_09_10.md`.

## ADR-013 — 2026-09-10 — Classements, défis, récompenses et notifications (demande du fondateur)

**Demande, mot pour mot :** des classements « en fonction de vélo / course, national, international,
européen, que les gens puissent se comparer, en performance ou en points rapportés pour le crew avec
les boucles, ou seul » — « analyse ce qui est le plus pertinent » ; des **défis** avec des
**récompenses gratuites internes** ; les **notifications** qui vont avec ; et un **social plus poussé
qu'INTVL**. Déclencheur : 14 captures de l'app concurrente INTVL (INTVL PTY LTD, Australie).

---

### 1. Contexte

**Le cahier a retiré ce que la demande semble rappeler.** `SOURCE_OF_TRUTH_REGISTER.md` D-20 liste
parmi les décisions remplacées « le classement universel aux km² ». Le cahier le motive trois fois :
§5.3 (« ne transforme pas cette carte en classement global de mérite sportif »), Annexe A (« Surface
brute comme classement universel → surface **descriptive** en jeu libre ; **points bornés** pour les
défis »), ligne 36 (« sans classement universel aux km² »). Les trois griefs : géographies inégales,
volume payant, faux rivaux (§6.5).

**La demande est donc une décision nouvelle, pas un rappel.** Elle se tranche ici.

**Trois faits de dépôt commandent la réponse** (vérifiés le 10/09/2026) :

1. **Les classements existants sont débranchés par 0118.** Le trigger `prevent_legacy_capture_2026`
   interdit toute écriture dans `territories` et `hex_claims` pour une activité `ruleset_version =
   '2026.1'`. Or `city_player_surface_board` (0091/0092) et `dept_player_surface_board` (0103) lisent
   `territories` ; la matview `crew_leaderboard` (0086) dérive de `hex_claims`. Ces trois surfaces
   mesurent désormais une table que le jeu n'alimente plus. **Aucun écran ne doit s'y brancher.**
2. **Le moteur de classement existe et est réutilisable.** `packages/engine/src/leaderboard.ts` est
   pur, testé, refuse une liste mixte Run/Bike (`foreign_activity`) et ne lit ni achat ni bonus. Les
   tables de snapshots `leaderboard_snapshots` / `leaderboard_entries` (0082) sont créées et
   **vides** : le preneur de snapshot n'a jamais été écrit.
3. **Deux configurations manquantes bloquent les défis et la saison.** `challenge_arenas_2026` est
   vide (`list_challenge_arenas_2026` renvoie `[]`) : aucun défi 5v5 ne peut démarrer. Aucune saison
   de production n'est insérée dans `season_collections_2026` : `read_progression_2026` renvoie
   `season: null`, donc les 12 paliers gratuits ne progressent pour personne. Le moteur (`0121`,
   `0122`, crons `publish-capture-events-2026` et `publish-challenges-2026`) est en prod depuis le
   10/09.

**Un quatrième fait commande les notifications :** l'entitlement `aps-environment` est **activement
supprimé** du build iOS par `apps/mobile/plugins/withoutPushEntitlement.js` (retrait du 09/08/2026 —
pas de capacité Push au provisioning). Aucun token APNs n'est obtenable, `push_devices` reste vide, et
la chaîne serveur (`_shared/push.ts`, `steal_push_job`, `digest_job`) envoie à des destinataires
inexistants. Les notifications **locales** fonctionnent (`localReminder.ts:104`) mais leur unique
composant appelant, `RendezvousOptIn.tsx`, n'est monté dans aucune route. `NOTIFICATION_RULES_2026`
existe dans `game-rules.ts` et **n'a aucun consommateur dans le dépôt**.

---

### 2. Décision proposée

#### 2.1 Classements — trois objets, dont un seul porte ce nom

**① « Ta commune, cette semaine » — classement solo. À lancer en premier.**

| Paramètre | Valeur |
|---|---|
| Sujet | joueur |
| Discipline | **séparée** — Course et Vélo ne se mélangent jamais (§5.3, §9.3) |
| Portée | **commune** (`city_zones.geojson`, polygone réel), repli **département** (`gryd_dept_of_insee()`) |
| Métrique principale | **nouveau terrain de la semaine** : somme de `capture_events_2026.new_geometry` sur les événements `published` de la fenêtre |
| Métrique secondaire | terrain actuellement tenu (`ownership_2026`), affiché comme **état**, pas comme rang |
| Départage | `rankLeaderboard()` (déjà écrit et testé) |

Le choix d'un **flux** (ce que j'ai pris cette semaine) plutôt que d'un **stock** (ce que je tiens)
est ce qui empêche le classement de redevenir « celui qui a commencé le premier reste devant ». Un
arrivant peut être premier dès sa première boucle.

**② Ligues de crews — la seule compétition classée.**
Sujet : crew. Portée : la division, **pas** la géographie. Métrique : **résultats de matchs**
(`crew_challenges_2026` + `challenge_publications_2026.result`), jamais des km². Les quatre ligues du
§6.6 (Découverte · Quartier · Ville · Horizon) s'ouvrent « après calibration », c'est-à-dire après un
nombre minimum de matchs terminés fixé **avant** la saison pilote et **jamais** modifié pour faire
monter les utilisateurs (§6.6, mot pour mot).

**③ « Où j'en suis » — pas un classement.**
Mon terrain, mes journées actives, mes badges, ma saison. Aucun nom d'autrui. C'est là que vit la
réponse à « et au niveau national ? » : un **effectif** (« X personnes courent sur GRYD en France »)
est un fait ; « tu es 3 512ᵉ de France » est une comparaison de géographies inégales.

**National, européen, international : ouverture par présence, jamais par promesse.**
Le même code sert commune → département → région → France → Europe. Une portée n'apparaît que
lorsqu'elle contient assez de sujets classés **réels** ; sinon elle n'existe pas dans l'interface.
Aucun classement européen n'est ouvert en Saison 0 (ADR-006, « zéro donnée EU factice »). La région
reste **déclarée et non servie** tant que le référentiel département → région n'est pas importé —
c'est une donnée publique réelle (Etalab), pas une donnée inventée, mais elle n'est pas là.

**Métriques exclues, définitivement :** allure, chrono, records personnels (§6.2 « Aucun départage par
vitesse, distance, fréquence cardiaque » ; §6.5 « La vitesse individuelle n'est pas un classement de
valeur humaine » ; §16.1 « Les outils de comparaison restent privés ») ; XP et journées actives
(plafonnées à 3/semaine, §7.1 : le classement dégénérerait en peloton d'ex æquo et créerait la
pression de sortie que §4.2 et §14 interdisent) ; volume de messages, parrainages, achats.

**Six garde-fous, opposables :**

1. **Seuil de population.** Sous **N** sujets classés dans la portée, **aucun classement** : on
   affiche l'objet « premier ici ». Un podium à trois est une donnée factice même si les trois lignes
   sont vraies. Proposition : **N = 5**, dans `game-rules.ts` (ADR-003), jamais dans une requête.
2. **Quatre états distincts** (CLAUDE.md) : pas connecté · **pas assez de monde ici** (≠ vide) ·
   mesure indisponible · mesure en cours. Jamais un « 0 » nu, jamais un tableau vide.
3. **Fraîcheur affichée.** Chaque écran porte « mesuré à HH:MM ». Un snapshot périmé le **dit** au
   lieu d'être servi comme frais. Piège déjà payé dans ce dépôt : une matview sans job, ou un
   snapshot sans horodatage visible, est un mensonge d'écran.
4. **Délai de publication respecté.** Lecture des seuls `capture_events_2026.status = 'published'`.
   Sinon un rang bouge avant le polygone et trahit une sortie encore privée — recette n° 36 du
   cahier, nommément (« Pas de fuite indirecte via compteurs, perte de terrain ou classement »).
5. **Discrétion et consentement.** Sont exclus : `discreet_mode` (précédent 0092) et toute personne
   sans `shared_map_consent_2026`. Le carnet privé (§5.6) n'apparaît dans aucun rang.
6. **Trois décisions séparées** (§18.4) : conserver l'activité / autoriser le jeu libre / **autoriser
   un rang**. Une activité `pending` compte pour le journal, pas pour le classement.

**Emplacement :** dans **Carte** ou **Profil**. **Aucun quatrième onglet** (§9.1 ;
`apps/mobile/src/features/nav/tabs.ts` : « EXACTEMENT trois — ne JAMAIS en ajouter un 4ᵉ ici, flag ou
pas »). La route legacy `/classement` reste une redirection vers `/season`.

#### 2.2 Défis — trois niveaux, pas quatre

**① Défi personnel de la semaine (seul ajout nouveau).** Deux à la fois, filtrés par discipline.
Satisfaisables par une semaine normale : ils demandent « ailleurs », « avec quelqu'un »,
« autrement » — jamais « plus ». Adossés aux familles du §7.4 (Exploration, Ensemble, Double
pratique). Expiration **silencieuse** (§4.2 : pas d'alarme, pas de compte à rebours poussant à
sortir). **Récompense : un objet du catalogue, jamais de l'XP.**

**② Défi de crew 5v5 :** existe (§6.2, `0122`, règles semées `5 / 7 j / 3 secteurs / 2 journées /
3 pts / 30 pts par équipe / 400 m course / 1 000 m vélo`). Rien à concevoir — il manque des arènes.

**③ Saison :** existe (§7.3, `0121`, 12 paliers semés). Rien à concevoir — il manque des dates.

**N'entrent pas :** série quotidienne, check-list de mise en route récompensée, concours à lots,
tirage au sort, participations achetables, monnaie virtuelle (§7.5 : « Pas de monnaie virtuelle au
lancement »).

#### 2.3 Récompenses gratuites internes

Le catalogue est déjà écrit (§7.5) et semé : `LEVEL_REWARDS_2026` (8 paliers de carrière) et
`SEASON_REWARDS_2026` (12 paliers de saison), plus `season_reward_templates_2026` en base. Cadres,
motifs de trace, palettes, signatures, titres, emblèmes, stickers, compositions de partage,
animations, souvenirs.

**Règle unique et suffisante :** aucun objet ne change un calcul de capture, de match ou d'XP —
`COMMERCIAL_PROPOSAL_2026` porte déjà `paidCaptureMultiplier: 1`, `paidXpMultiplier: 1`,
`paidChallengeMultiplier: 1`. Les objets changent ce qu'on **montre**, jamais ce qu'on **gagne**.

**Le manque n'est pas le nombre d'objets, c'est le chemin.** Il faut montrer la prochaine récompense
**et son usage** (« Équiper », « Créer une affiche », « Ajouter à mon profil ») : `equip_season_reward_2026`
existe, la boucle « je gagne → je vois → je mets → ça se voit dans mon partage » n'est pas fermée.

#### 2.4 Notifications

**Constat opposable : GRYD ne peut émettre aucune notification aujourd'hui** (voir §1).

1. **Aucun bouton mort.** G27 ne peint que les catégories que la plateforme peut **réellement**
   délivrer (CLAUDE.md : « l'affichage se dérive de la capacité RÉELLE de la plateforme »).
2. **Le centre d'activité in-app (la « cloche ») devient le canal principal.** Il ne demande ni
   permission, ni entitlement, ni clé, et porte honnêtement ce que le push ne peut pas porter.
   Interdit : pastille rouge permanente (G24).
3. **Notifications locales** pour ce que l'appareil sait seul : rappel d'une sortie à laquelle je me
   suis inscrit, rappel d'essai, récap hebdomadaire choisi.
4. **Restent impossibles sans APNs** : résultat prêt, score adverse de midi (§6.4), défi terminé,
   mention, adhésion acceptée, événement modifié ou annulé, relance J+14. Cas le plus grave : la
   recette n° 29 exige qu'un rappel programmé soit **supprimé** quand l'événement est annulé — un
   rappel local ne peut pas être annulé par le serveur.
5. **`NOTIFICATION_RULES_2026` devient effective** : budget 3/semaine et 1/jour, 2 offres/mois, plage
   calme 21 h–9 h, promotion désactivée par défaut, `immediateTerritoryLossPush: false`, moteur de
   décision §14.3 (déduplication, annulation d'un message devenu faux, regroupement). Une reprise de
   terrain alimente le journal et le récap choisi, **jamais une alarme** (§14.2). Aucune notification
   n'est jamais un ordre de courir.

⚠️ **Doublon de constante à résoudre** : `PUSH_QUIET_HOURS_START/END` (21 h–8 h, legacy) coexiste avec
`NOTIFICATION_RULES_2026.quietHoursStart/End` (21 h–9 h). Deux valeurs pour la même règle violent
« aucun doublon de constante » (ADR-003). La valeur 2026 prime ; la legacy ne survit que pour lire
l'historique.

#### 2.5 Social

**Le pari est maintenu :** pas de fil général infini (§4.2), le crew comme premier réseau (§13.1), pas
de messages privés ouverts au lancement (G21). INTVL donne un tiers de sa navigation au social ; nous
le donnons à Crew — ce n'est tenable que si Crew est au moins aussi vivant.

**Nous sommes déjà devant** sur le collectif réel : rendez-vous avec RSVP, capacité, modification
versionnée, annulation et export ICS (`crew_outings_2026`) ; conversation paginée et modérée
(`crew_messages_2026`) ; rôles sportifs (`crew_sporting_roles_2026`) ; signalement, blocage bilatéral
et RLS par visibilité (`0124`).

**Nous sommes derrière sur l'objet social.** À ajouter, par valeur décroissante :

1. **l'impact honnête sur le post** — `neutralTakenM2` / `takenFromOthersM2` sont déjà calculés par
   `capture_result_2026` : « +0,18 km² — 0,10 neutre, 0,08 repris », **sans nom ni avatar de
   « victime »** (§13.5 ; ADR-010 avait déjà retiré les noms de lieu des notifications) ;
2. **niveau permanent + commune sur l'avatar**, un seul rang (G22), **sans drapeau de pays** tant que
   le produit est français ;
3. **réactions nommées** — encouragement / merci / à la prochaine (§13.4), liste **fermée**, à la
   place du booléen actuel de `social_reactions_2026` ;
4. titre de post et vignette de trace (protection départ/arrivée appliquée à la **miniature**, §5.6) ;
5. plusieurs photos (aujourd'hui `social_posts_2026` ne porte qu'un `media_path`) ;
6. cloche = centre d'activité sur les faits 2026 ;
7. chemin post → crew → rejoindre (G16 : montrer l'accueil et les horaires **avant** le classement) ;
8. épinglé **du capitaine, dans son crew** (G21) — jamais un épinglé éditorial global ;
9. recherche de personnes et de crews, passant par `social_people_2026` pour que le **blocage
   s'applique aussi à la recherche** (§13.5) ;
10. mises en avant tournantes (§13.4 : « Ne pas réserver toute la visibilité aux plus rapides »).

#### 2.6 Ce qui est refusé, définitivement, d'après les 14 captures

Concours à lots physiques et tirages au sort · participations gagnées par la capture de territoire ·
participations supplémentaires pour les abonnés (Annexe B : « GRYD ne reprend pas une probabilité de
récompense augmentée par le paiement ») · XP contre une permission, une photo de profil ou un
parrainage (§7.1, §15.2) · remise d'abonnement contre recrutement · compte à rebours d'offre et prix
de référence jamais pratiqué (§14.2 « sans urgence fictive », G24 « faux stocks restants ») · demande
de suivi publicitaire ATT (§18.5) · paywall avant la première sortie (G28 : « Aucun paywall à froid
avant d'avoir expérimenté la valeur ») · demande de notifications posée sur un écran d'achat (§9.2) ·
prix codé en dur (§16.1) · désignation nominative des joueurs à qui l'on a repris du terrain ·
bouton de départ dans la barre d'onglets (§9.1).

---

### 3. Ce qui reste conforme au cahier — et ce qui le complète

**Conforme, sans réserve :** disciplines séparées (§5.3) ; points de défi bornés comme seule
compétition équitable (§6.2) ; XP réservés aux journées actives (§7.1) ; 12 paliers gratuits à
condition déterministe (§7.3) ; catalogue sans monnaie virtuelle (§7.5) ; trois destinations (§9.1) ;
réactions limitées et humaines, modération, blocage (§13.4, §13.5) ; budget et plage calme des
notifications (§14.1) ; anti-pay-to-win strict (§16.2) ; zéro donnée factice, quatre états, tout claim
serveur (CLAUDE.md).

**Ce que cet ADR ajoute au cahier — et qui n'y est pas :**

1. **Un classement solo existe**, borné à la commune et mesuré en **flux hebdomadaire**. Le cahier ne
   l'interdisait pas : il interdisait le classement **universel** aux km². La distinction est la
   portée et la métrique, pas le principe.
2. **La règle d'ouverture par présence** d'une portée géographique (commune → … → Europe). Elle
   n'existe nulle part dans le cahier ; elle est le seul moyen d'honorer « national / international /
   européen » sans inventer de données.
3. **Le seuil de population sous lequel aucun classement n'est affiché.** Le cahier dit qu'aucun faux
   adversaire ne comble une carte vide (§6.5) ; il ne disait pas ce qu'on montre à la place.
4. **Les défis personnels hebdomadaires.** Le cahier a les défis de crew et la saison ; il n'a pas ce
   niveau intermédiaire.
5. **La distinction canal local / canal serveur** dans la matrice §14.2, imposée par l'absence
   d'APNs. Le cahier écrit sa matrice comme si le push existait.

**Tensions constatées, non tranchées ici :**

- **ADR-010 contre `0118`.** ADR-010 (03/08) : la propriété, ce sont les cellules H3. `0118`
  (appliquée en prod le 10/09) : la propriété, c'est le polygone, et un trigger interdit l'écriture
  legacy pour une activité `2026.1`. **Le code a tranché, l'ADR ne l'a pas.** Le présent ADR
  s'appuie sur `ownership_2026` et ne peut donc pas rester silencieux : il **constate** que le régime
  polygonal est en vigueur, et laisse au fondateur le soin de clore ADR-010 par un ADR propre.
- **ADR-011 contre §16.1 (GRYD+).** Hors périmètre de cette demande. Tout ce qui touche au paywall
  (frise d'essai, comparaison des formules) reste suspendu à cette décision et **n'est pas ouvert par
  ricochet** ici.
- **ADR-006 (Rouen) contre §15.3 (Paris et Lille).** Le classement de commune est indifférent au
  choix : il s'ouvre là où des gens courent.

---

### 4. Conséquences

**Constantes** (`packages/shared/src/game-rules.ts`, source unique — ADR-003, puis
`node scripts/sync-game-rules.mjs`) :
`LEADERBOARD_RULES_2026` (seuil de sujets classés, portées ouvertes, fenêtre hebdomadaire, cadence de
snapshot) ; `WEEKLY_QUEST_RULES_2026` (nombre de défis simultanés, fenêtre) ; résolution du doublon
de plage calme (§2.4).

**Base :** une fonction de mesure `board_source_metrics_2026(activity, scope, scope_ref, from, to)`
agrégeant `ownership_2026` et `capture_events_2026` par propriétaire et par portée ; un **preneur de
snapshot** écrivant dans `leaderboard_snapshots` / `leaderboard_entries` (0082, déjà créées et vides
depuis le 28/07) ; un `pg_cron` pour ce preneur — le dépôt en pose déjà deux en 2026
(`publish-capture-events-2026`, `publish-challenges-2026`). **Aucune migration existante n'est
réécrite.** RLS partout, lecture par RPC `security definer` comme tout le socle 2026.

**Jobs :** le snapshot de classement ne doit **jamais** déclencher `rebuild_ownership_2026`, qui
efface et rejoue toute une discipline (son propre commentaire : « Production throughput requires
spatial-component replay before a large rollout »). Il lit, il n'ordonne pas de recalcul.

**Écrans :** un écran de classement dans Carte ou Profil (jamais un 4ᵉ onglet) avec ses quatre états
et son horodatage ; l'impact décomposé sur G12, sur le post social et dans le journal de perte ;
réactions nommées, titre, niveau + commune sur les cartes de post ; la cloche ; les défis personnels
dans Profil ; G27 réduit aux catégories délivrables.

**Documents :** `docs/STATUS.md` ne bouge que sur preuve `qa-verify`. Cet ADR ne déclare rien fait.

**Configuration (bloquant, sans code) :** les secteurs des arènes (`configure_challenge_arena_2026`)
et les dates de la Saison 0 (`configure_season_collection_2026`). Sans eux, ni défi 5v5 ni progression
de saison — quel que soit le code écrit par ailleurs.

**Ordre :** la feuille de route détaillée est au §6 de
`docs/product/GRYD_INTVL_ANALYSE_2026_09_10.md` (lots 0 à 9).

---

### 5. Questions ouvertes — seul le fondateur peut trancher

1. **APNs : oui ou non ?** Ouvrir une clé Apple Push et remettre l'entitlement retiré le 09/08, ou
   lancer sans push. Les deux sont tenables. Tout le §2.4 en dépend, et la moitié de la matrice §14.2
   avec.
2. **Le seuil N** de sujets classés sous lequel aucun classement n'est affiché. Proposition : 5.
3. **Où vit l'écran de classement** : Carte (près du terrain qu'il mesure) ou Profil (près de « où
   j'en suis ») ? Pas de troisième réponse — le 4ᵉ onglet est exclu.
4. **Les secteurs des arènes de Rouen** : lesquels, et par qui sont-ils tracés ?
5. **Les dates de la Saison 0** : début, fuseau, 6 semaines.
6. **La liste de départ des défis personnels** et celle des **trois réactions** nommées.
7. **La calibration des ligues** (§6.6) : nombre minimum de matchs terminés et taux de promotion —
   à fixer **avant** la saison pilote, et à ne jamais modifier ensuite.
8. **ADR-010 :** le régime polygonal de `0118` est en prod. Faut-il clore ADR-010 par un ADR dédié ?
9. **Le drapeau de pays et les portées supra-nationales** : confirmer qu'ils n'apparaissent qu'à la
   présence réelle, et non à une date.
10. **La région** comme portée : importe-t-on le référentiel département → région (donnée publique
    Etalab), ou reste-t-elle déclarée et non servie ?
