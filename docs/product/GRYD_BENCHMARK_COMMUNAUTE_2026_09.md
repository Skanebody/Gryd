# GRYD — benchmark communauté, progression et fidélisation

Recherche arrêtée au **9 septembre 2026**. Périmètre : INTVL, Strava, Clash of Clans ; communautés, rôles, sorties, partage, progression, monétisation et premiers usages. Cette note combine documentation officielle actuelle, historiques de versions accessibles, témoignages publics directs et lecture du code GRYD. Elle remplace les conclusions devenues obsolètes du [premier benchmark](</Users/benjaminbel/KLAIM RUN/docs/product/GRYD_COMMUNAUTE_BENCHMARK_2026_09.md>), sans effacer son historique d’implémentation.

## 1. Décision produit

La meilleure direction pour GRYD est une **carte qui donne envie de sortir, un crew qui permet de se retrouver et un résultat que l’on comprend et conserve**. Les trois concurrents donnent des raisons différentes de revenir : explorer un terrain chez INTVL, retrouver des personnes et des activités chez Strava, contribuer à un groupe et acquérir des objets chez Clash. Ce sont des lectures de leurs mécanismes, pas une preuve mesurée de leur rétention.

La différenciation ne peut plus être « INTVL ne fait pas de vélo », « Strava n’a pas de chat de club » ou « Clash n’a plus de chat mondial ». Les mises à jour officielles contredisent ces trois affirmations. INTVL annonce également le français et cite Polar parmi ses appareils compatibles. Ces demandes anciennes, visibles dans les avis, doivent être datées avant d’être utilisées comme argument concurrentiel. [Historique INTVL](https://apps.apple.com/au/app/intvl/id6472631698), [Club Messages](https://support.strava.com/en-us/articles/15401541-club-messages), [retour du Global Chat](https://supercell.com/en/news/clashofclans-henry-kaka-schweinsteiger/).

Trois choix concrets en découlent :

1. **Faire de la prochaine sortie le centre du crew.** La discussion et le partage servent ce rendez-vous. Le changement est maintenant présent dans le code de ce lot : sortie réelle prioritaire, inscription directe, calendrier depuis une inscription confirmée.
2. **Terminer la boucle de confiance avant de multiplier les récompenses.** Une activité doit survivre à une pause, une perte de réseau et une reprise ; le résultat distingue mesures sportives, validation territoriale et terrain encore possédé. Le socle existe. Sa recette sur appareils physiques reste déterminante.
3. **Construire le retour au groupe à partir de faits serveur.** Le prochain manque communautaire est la reprise au premier message non lu et le contexte des sorties, puis des notifications choisies. Ni un compteur local inventé ni dix canaux vides ne répondent à ce besoin.

GRYD+ doit rester disponible avec son prix réel, sa restauration et ses objets concrets. Les retours étudiés ne justifient ni sa suspension ni un avantage payant sur les captures, les journées actives ou les défis.

## 2. Méthode et niveau de preuve

Les recherches ont croisé les noms des produits avec les fonctions de club, les nouveautés, les problèmes de suivi, les abonnements, les permissions et les avis. Les stores Apple France, Australie et États-Unis ont été distingués ; les pages Google Play consultées portent une langue anglaise mais ne fixent pas de pays dans leur URL. Une langue de page ne prouve pas le pays du lecteur. Les aides officielles anglaises et françaises ont été comparées lorsque leurs dates ou formulations différaient.

Trois catégories sont utilisées : **documenté** désigne une règle ou une fonction décrite par son éditeur ; **rapporté** désigne l’expérience de l’auteur d’un avis ; **proposé** désigne une décision GRYD à tester. Une note de version prouve une annonce, pas le bon fonctionnement de la fonction sur chaque appareil. Les notes globales des stores ne sont pas des taux de satisfaction mesurés sur une population comparable.

Les témoignages sont un échantillon raisonné de retours accessibles, favorables et défavorables, sans tirage aléatoire. Les pages peuvent privilégier les avis populaires, récents ou traduits. Aucun pourcentage de plaintes, classement statistique des produits, revenu réel, taux de conversion ou effet causal sur la rétention n’est déduit de ce corpus. Les chiffres promotionnels et publications sociales ne démontrent pas le chiffre d’affaires des applications.

Les [captures INTVL fournies et leur analyse](</Users/benjaminbel/KLAIM RUN/docs/product/GRYD_ANALYSE_INTVL_CAPTURES_2026_09.md>) restent un contexte visuel précieux, de version et de date de capture non garanties. Elles ne prouvent ni le moteur géométrique concurrent ni ses droits de localisation en arrière-plan. Cette passe ne constitue pas un nouveau test natif des trois applications.

Pour GRYD, « présent » signifie **lu dans le dépôt au cours de cette recherche**. Aucun déploiement, donnée de production, achat réel, notification distante ou comportement GPS natif n’a été vérifié dans ce lot. Les fichiers évoluent en parallèle ; les références correspondent à cet état de travail.

## 3. Ce qui a réellement changé récemment

| Produit et surface | Dernier état accessible | Changements utiles pour GRYD | Précaution |
|---|---|---|---|
| INTVL, App Store AU | 4.0.7 affichée « il y a 5 jours » | Traductions ; 4.0.6 du 18 août : mode sombre et découpage d’activité ; 4.0.3 du 21 juillet : atténuation des terrains adverses et annuaire ; 4.0.0 du 6 juillet : vélo. [Historique](https://apps.apple.com/au/app/intvl/id6472631698) | Dates 2026 ; la fiche FR indique « −3 j » pour 4.0.7. Ne pas fabriquer une date mondiale unique. |
| INTVL, Google Play EN | Mise à jour du 4 septembre 2026 | Neuf langues annoncées, dont le français. [Fiche Android](https://play.google.com/store/apps/details?hl=en&id=com.intvl.app) | Numéro de version Android non restitué ; région de diffusion non prouvée. |
| Strava, App Store FR | 479.0.0 affichée « −6 j » | 477.0.0 du 19 août : nouvelle Progression ; 468.0.0 du 17 juin : Messages de Club. [Historique FR](https://apps.apple.com/fr/app/strava-course-v%C3%A9lo-rando/id426826309) | Le dernier correctif est générique ; ne pas lui attribuer les fonctions de versions précédentes. |
| Strava, Google Play EN | Mise à jour du 31 août 2026 | Option permettant de désactiver les Activity Replays comme carte par défaut. [Fiche Android](https://play.google.com/store/apps/details?hl=en&id=com.strava) | Une animation désactivable est un choix d’usage, distinct de Reduce Motion système. |
| Clash, App Store FR / Google Play EN | iOS 18.600.1 du 31 août ; Android mis à jour le 8 septembre | Correctifs après la mise à jour d’août. [Apple](https://apps.apple.com/fr/app/clash-of-clans/id529479190), [Google](https://play.google.com/store/apps/details?hl=en&id=com.supercell.clashofclans) | Les deux stores ne décrivent pas nécessairement le même correctif. |
| Clash, actualités officielles | Mise à jour du 30 août ; événement publié le 9 septembre | Écran de fin de bataille revu ; progression initiale adaptée ; Equipment Blast du 9 au 22 septembre. [Août](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/), [événement](https://supercell.com/en/games/clashofclans/blog/news/equipment-blast-medal-event/) | Certains parcours débutants sont un test à partir de septembre ; l’événement n’est pas une nouvelle version binaire. |

INTVL annonçait déjà en juillet la conservation de la trace malgré un mauvais GPS et des crédits hors ligne. Cela montre que la fiabilité est un sujet de maintenance continu, sans permettre de déclarer tous les problèmes résolus. [Version 4.0.2](https://apps.apple.com/au/app/intvl/id6472631698).

Strava a présenté en juillet les échanges de clubs et la découverte d’événements ; son partenariat de récompenses adiClub est annoncé pour les **États-Unis et le Canada**, pas comme un bénéfice français universel. [Nouveautés du 16 juillet](https://stories.strava.com/articles/whats-new-on-strava-strava-connects-to-claude-new-running-events-and-races-and-club-messaging).

## 4. INTVL : le territoire est un motif de sortie, pas une explication suffisante

### Ce qui fonctionne dans la proposition

Le site officiel relie une action physique à un résultat géographique : fermer une boucle, prendre du terrain, affronter d’autres joueurs. Il distingue Course et Vélo, décrit des lobbies entre amis et une contribution au club. Cette chaîne est courte et mémorisable. Les avis favorables citent surtout l’exploration, le choix d’une prochaine route et l’envie de sortir davantage ; ce sont des motivations déclarées, pas des minutes supplémentaires mesurées. [INTVL officiel](https://www.intvl.com.au/), [avis américains](https://apps.apple.com/us/app/intvl/id6472631698?platform=iphone&see-all=reviews).

L’atténuation des terrains des autres et l’annuaire de membres, ajoutés en juillet, répondent à deux tâches distinctes : lire son propre jeu et retrouver une personne. **GRYD possède déjà ces deux intentions** : filtres de carte et identité au toucher ; membres du crew et profils. La bonne adaptation est de rendre ces tâches immédiatement trouvables, pas de multiplier les niveaux de classement.

### Ce que les plaintes permettent, et ne permettent pas, de conclure

Plusieurs auteurs rapportent une activité conservée sans capture, une sortie perdue, une pause insuffisante ou une faible densité de joueurs. Il serait abusif d’en déduire l’algorithme d’INTVL, une absence de persistance universelle ou un taux d’échec. En revanche, chaque plainte donne un scénario de recette : boucle incomprise, heure de fermeture, reprise, route partiellement reçue, ville vide. [Avis FR](https://apps.apple.com/fr/app/intvl/id6472631698?platform=iphone&see-all=reviews), [avis Android](https://play.google.com/store/apps/details?hl=en&id=com.intvl.app).

Pour GRYD, le résultat doit répondre séparément à « ma sortie est-elle enregistrée ? », « a-t-elle produit un terrain partagé ? » et « qu’en reste-t-il maintenant ? ». Le code le fait déjà ; l’effort prioritaire porte sur les transitions réelles et leur lisibilité. Un refus territorial n’efface pas l’activité. Une marche intégrée ne doit pas devenir une raison arbitraire de priver une journée admissible d’XP pour satisfaire un avis favorable aux plus rapides.

### Connexions, abonnement et points non établis

INTVL annonce un ensemble étendu de montres et compteurs. Sa FAQ précise **export vers Strava, pas import depuis Strava**. Certains avis décrivent autrement leur synchronisation : la direction officielle actuelle prévaut pour le benchmark. Pro annonce notamment planification complète, classements et participations accrues à des concours ; cela ne prouve pas un multiplicateur de possession. Hiérarchie détaillée de club, chat natif et procédures de modération : **non établis par les sources consultées**, pas déclarés absents. [FAQ et offre](https://www.intvl.com.au/).

La fiche française expose plusieurs références d’achats et montants. Elle n’identifie pas une offre unique applicable à tous. Sa métadonnée de langue reste anglaise alors que la dernière note annonce le français : il faut vérifier le build installé avant toute affirmation plus précise. [Fiche FR](https://apps.apple.com/fr/app/intvl/id6472631698).

## 5. Strava : le club devient une infrastructure de rendez-vous

### Communauté, permissions et organisation

Strava documente des clubs ouverts ou sur invitation, une recherche par lieu et pratique, et des rôles propriétaire/administrateur. Un club privé peut être découvrable sans rendre ses contenus internes publics. Les Publications de Club peuvent contenir des activités, photos, routes ou événements ; le partage ne rend pas automatiquement visible une activité privée. [Clubs](https://support.strava.com/en-us/articles/15402172-clubs-on-strava), [publications](https://support.strava.com/en-us/articles/15401655-club-posts).

La messagerie actuelle ajoute canaux, réponses, réactions, mentions, sondages, éléments épinglés et partage d’événements. Les administrateurs règlent qui peut écrire et l’adhésion automatique ou volontaire ; les membres peuvent couper les notifications. Les canaux ne sont pas des espaces privés entre administrateurs. Les moins de 18 ans sont exclus de cette fonction selon l’aide. [Documentation anglaise actuelle](https://support.strava.com/en-us/articles/15401541-club-messages).

La traduction française, plus ancienne, conserve une phrase réservant les publications aux administrateurs tout en décrivant ensuite des permissions plus larges. La documentation anglaise indique également deux seuils contradictoires pour les très petits clubs. Ces écarts empêchent d’affirmer une règle exacte au membre près ou un déploiement français différent. [Aide française](https://support.strava.com/fr/articles/15401541-messages-de-club).

L’enseignement utile n’est pas « copier cent canaux ». C’est **rattacher les échanges à une action et donner le contrôle du bruit**. GRYD dispose d’une conversation de crew ; sa prochaine étape raisonnable est la continuité de lecture et un accès contextualisé au rendez-vous.

### Sorties et partage

Le guide organisateur de juillet insiste sur la recherche de rendez-vous, leurs informations pratiques et les outils d’organisation gratuits. Il évoque également des statistiques après événement. Pour GRYD, une inscription n’est pas une présence constatée : ne pas afficher un bilan de participants réels à partir des seuls RSVP. [Guide organisateur](https://stories.strava.com/articles/how-to-organize-your-strava-club-like-a-pro).

Le partage d’une activité GPS permet de choisir carte ou photo avec des mesures. Le contrôle de visibilité de la carte reste distinct de l’audience de l’activité ; les masques Strava ne sont pas transmis automatiquement aux autres services. Ce sont des raisons concrètes de conserver un aperçu d’audience et des exports qui appliquent leur propre protection dans GRYD. [Partage](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities), [visibilité cartographique](https://support.strava.com/en-us/articles/15402012-edit-map-visibility).

### Monétisation et portée commerciale

Les Group Challenges privés exigent actuellement abonnement ou essai pour créer **et rejoindre**. Ils incluent des objectifs communs sans classement individuel. Cela ne veut pas dire que tous les challenges Strava sont payants : la galerie générale a ses propres règles d’éligibilité. [Défis de groupe](https://support.strava.com/en-us/articles/15401736-group-challenges), [challenges généraux](https://support.strava.com/en-us/articles/15401916-strava-challenges).

Strava présente aussi une offre explicite pour les marques : club identifié, contenus, ambassadeurs, événements et défis sponsorisés avec récompense ou redirection. Ce sont des produits commerciaux documentés. Les études de cas de l’éditeur ne permettent pas de prédire le revenu d’un portail GRYD. [Clubs de marque](https://partners.strava.com/resources/grow-your-brand-strava-clubs), [défis sponsorisés](https://business.strava.com/challenges).

La page de prix consultée a renvoyé l’Indonésie. Les références françaises Apple comprennent différents abonnements et anciens montants. **Aucun tarif annuel français universel n’est affirmé ici.** GRYD a déjà la bonne base technique : prix localisé fourni par le store, refus de vendre si l’offre manque, restauration et statut serveur. [Tarification géolocalisée](https://www.strava.com/pricing), [achats français](https://apps.apple.com/fr/app/strava-course-v%C3%A9lo-rando/id426826309).

Le rapport Year in Sport de l’éditeur annonce une forte croissance des clubs et événements en 2025, à partir de ses activités et d’une enquête de plus de 30 000 personnes. Ce signal appuie l’intérêt du sujet communautaire ; il ne démontre ni la représentativité française ni que créer un club fait revenir un utilisateur. [Méthode et résultats déclarés](https://press.strava.com/ea/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025).

## 6. Clash of Clans : une contribution visible, avec une économie à ne pas transposer

### Responsabilités et entraide

Les rôles membre, aîné, adjoint et chef donnent des droits distincts. Les promotions ont des conséquences sur invitations, exclusions et direction ; le clan est limité à 50 personnes. L’entrée combine recherche, invitations et préférences de clan après une étape de progression du jeu. [Rôles](https://support.supercell.com/clash-of-clans/en/articles/clan-roles-3.html), [rejoindre un clan](https://support.supercell.com/clash-of-clans/en/articles/joining-a-clan-3.html).

Les demandes de troupes et sorts rendent l’aide concrète et bornée par une capacité. Les Jeux de Clan agrègent les points de défis choisis, avec un plafond individuel et des paliers collectifs. L’intérêt transposable est la lisibilité de sa contribution et du résultat commun. **GRYD ne doit pas transférer des kilomètres, de l’XP ou de la possession entre personnes.** Accueillir, organiser, répondre et contribuer volontairement à un match sont déjà des formes d’aide réelles. [Dons](https://support.supercell.com/clash-of-clans/en/articles/clan-castle-troops-and-spells-2.html), [défis et points](https://support.supercell.com/clash-of-clans/en/articles/clan-games-challenges-and-points.html).

### Retour au groupe et nouveaux joueurs

Le Global Chat a été relancé le 17 juin 2026. Les réactions accessibles montrent des usages d’échange et de recrutement, mais aussi des attentes incompatibles : certains veulent recruter partout, d’autres veulent un espace sans sollicitations. Un groupe universel supplémentaire n’est donc pas une solution démontrée au recrutement. [Annonce officielle](https://supercell.com/en/news/clashofclans-henry-kaka-schweinsteiger/), [retours au lancement](https://www.reddit.com/r/ClashOfClans/comments/1u83wgq/join_us_in_global_chat_and_share_which_chats_you/), [discussion récente](https://www.reddit.com/r/ClashOfClans/comments/1w8wc0c/global_chat_rant/).

La mise à jour d’août teste un parcours de saison plus tôt dans le jeu et adapte les récompenses à l’avancement. Elle prévoit aussi des objectifs de remplacement lorsqu’un équipement manque. GRYD peut en retenir qu’un débutant doit toujours avoir une prochaine action réalisable : explorer, enregistrer librement ou rejoindre une sortie. L’accès au groupe ne doit pas attendre un badge. [Mise à jour d’août](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/).

### Récompenses et achat

Le Gold Pass revu en mars présente mieux ses récompenses et cumule des tâches manquées. Il comprend aussi des accélérateurs et bénéfices économiques achetés ; les coffres remplacent une partie des récompenses fixes. Ces mécanismes concernent un jeu de stratégie, pas une autorisation de vendre de la supériorité dans une activité physique. [Présentation officielle](https://supercell.com/en/games/clashofclans/blog/news/big-changes-are-coming-to-gold-pass/).

Les Chief’s Chronicles d’août proposaient un bilan personnel partageable et une reconnaissance des profils de jeu, y compris les retours. L’événement s’est terminé le 31 août. Pour GRYD, un bilan peut montrer de vrais jours actifs, sorties, objets et contributions ; il ne doit pas inventer une personnalité sportive ou attribuer un objet non acquis. [Chronicles](https://supercell.com/en/games/clashofclans/blog/news/chiefs-chronicles-are-here/).

## 7. Témoignages directs : ce qu’ils disent exactement

Les signaux ci-dessous sont paraphrasés. Une date sans année dans le store est laissée comme telle. Les réactions opposées sont conservées ; les demandes satisfaites ultérieurement ne deviennent pas des défauts actuels.

| Produit, pays/source, auteur et date affichée | Retour rapporté | Utilisation raisonnable pour GRYD |
|---|---|---|
| INTVL, Apple FR, zserbe, 3 janvier 2025 | Attiré par le terrain ; raconte une sortie annulée sans sauvegarde. | Recetter sortie interrompue et récupération. [Avis FR](https://apps.apple.com/fr/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| INTVL, Apple FR, Lee haki, 1 septembre 2025 | Le jeu lui donne envie de cardio ; demande le français. | Motivation déclarée ; langue désormais annoncée. [Avis FR](https://apps.apple.com/fr/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| INTVL, Apple FR, Lélé10383, 28 septembre 2025 | Certaines sorties créditent distance et durée, mais aucun terrain. | Expliquer les statuts ; moteur concurrent inconnu. [Avis FR](https://apps.apple.com/fr/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| INTVL, Apple FR, Ethan.vltr, 13 novembre 2025 | Souhaite une pratique vélo. | Demande satisfaite par l’annonce de juillet 2026. [Avis FR](https://apps.apple.com/fr/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| INTVL, Google EN, Kyle Hoffmann, 1 septembre 2026 | Roule davantage ; veut mieux mettre en pause et trouve l’abonnement peu convaincant. | Reprise fiable et valeur concrète. [Avis Android](https://play.google.com/store/apps/details?hl=en&id=com.intvl.app) |
| INTVL, Google EN, Daniel Fieldhouse, 29 août 2026 | Aime l’idée ; défense répétitive et impression qu’il faut s’abonner. | Tester compréhension du gratuit, sans conclure à un abonnement obligatoire. [Avis Android](https://play.google.com/store/apps/details?hl=en&id=com.intvl.app) |
| INTVL, Apple US, Zoot531, 26 août, année non affichée | Aime choisir sa route sur la carte et la connexion Garmin ; hésite à payer. | Renforcer usage immédiat, pas upsell au départ. [Avis US](https://apps.apple.com/us/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| INTVL, Apple US, Glizzy2356, 30 août, année non affichée | S’amuse, mais manque de joueurs près de lui. | Ville vide utile, sans fausse activité locale. [Avis US](https://apps.apple.com/us/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| INTVL, Apple US, Griffin Stagg, 29 avril, année non affichée | Apprécie la motivation et le fait de jouer gratuitement. | Contre-exemple à la perception de paywall obligatoire. [Avis US](https://apps.apple.com/us/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| INTVL, Apple US, B-Welk, 9 juillet, année non affichée | Apprécie la nouvelle interface ; demande chat et gestion des membres. | Annuaire annoncé ensuite ; chat non établi. [Avis US](https://apps.apple.com/us/app/intvl/id6472631698?platform=iphone&see-all=reviews) |
| Strava, Apple FR, STRAVAaccount_Raphael, 15 novembre 2025 | Apprécie activités, clubs, challenges et outils d’analyse. | La profondeur peut coexister avec une entrée simple. [Avis FR](https://apps.apple.com/fr/app/strava-course-v%C3%A9lo-rando/id426826309) |
| Strava, Apple FR, JoshuaSIFI, 11 août 2025 | Motivation et régularité ; souhaite une synthèse multisport. | Bilan réel transversal, sans confondre Course et Vélo dans le jeu. [Avis FR](https://apps.apple.com/fr/app/strava-course-v%C3%A9lo-rando/id426826309) |
| Strava, Google EN, Ahmed Atia, 26 août 2026 | Ancien utilisateur satisfait ; rapporte des crashs au retour dans l’app et à la fin. | Recette d’arrière-plan et de finalisation. [Avis Android](https://play.google.com/store/apps/details?hl=en&id=com.strava) |
| Strava, Reddit, mtnmuscle, 31 juillet 2026 | Se plaint de spam dans de grands clubs. | Prioriser contexte local et modération. [Discussion](https://www.reddit.com/r/Strava/comments/1vbxqv2/strava_clubs_and_activity_feed_becoming_unusable/) |
| Strava, même discussion, DrewguyDC et berniethecar | L’un constate des retraits après signalement ; l’autre préfère les petits groupes locaux. | Ne pas déclarer la modération inexistante ; distinguer les tailles de groupe. [Discussion](https://www.reddit.com/r/Strava/comments/1vbxqv2/strava_clubs_and_activity_feed_becoming_unusable/) |
| Strava, Reddit, Plexer704 et PurposefulGrimace, 24 mars 2026 | Aiment le cœur gratuit ou payant mais critiquent les sollicitations répétées. | Montrer le prix au bon endroit ; respecter la fermeture. [Discussion](https://www.reddit.com/r/Strava/comments/1s2q23f/is_strava_pushing_subscriptions_too_hard/) |
| Clash, Google EN, Luke Lawson, 18 mai 2026 | Aime le jeu ; connexion et rechargements auraient empêché une attaque. | Une échéance collective amplifie le coût d’une panne. [Avis Android](https://play.google.com/store/apps/details?hl=en&id=com.supercell.clashofclans) |
| Clash, Google EN, Amoré Cronje, 25 février 2026 | Apprécie le jeu ; souhaite davantage d’interactions positives. | Faire exister encouragements et réponses utiles. [Avis Android](https://play.google.com/store/apps/details?hl=en&id=com.supercell.clashofclans) |
| Clash, Google EN, Chris Zani, 21 septembre 2025 | Raconte un recrutement difficile et suppose un problème d’annonce. | Tester découverte et invitation ; causalité technique non établie. [Avis Android](https://play.google.com/store/apps/details?hl=en&id=com.supercell.clashofclans) |
| Clash, Reddit, SnipeAndKill, page affichant « 1 jour », consultée le 9 septembre | Critique découverte des groupes et obstacles au recrutement. | Clarifier si un espace sert à recruter ou discuter. [Discussion](https://www.reddit.com/r/ClashOfClans/comments/1w8wc0c/global_chat_rant/) |
| Clash, même discussion, ASimple_ | Défend les groupes pour échanger sans sollicitations et sans app tierce. | Avis opposé conservé ; ne pas généraliser le rejet du chat. [Discussion](https://www.reddit.com/r/ClashOfClans/comments/1w8wc0c/global_chat_rant/) |
| Clash, Reddit, Boudi04 / GingerbreadRecon, 27 mars 2026 | Le premier apprécie des ajustements du Pass ; le second critique la valeur d’une récompense tardive. | Lisibilité et utilité de chaque palier. [Discussion](https://www.reddit.com/r/ClashOfClans/comments/1s53orl/gold_pass_changes_built_from_your_feedback/) |

Le post Reddit sur les modifications du Pass relaie une annonce extérieure : il est utilisé pour les **réactions de ses auteurs**, pas comme preuve primaire du détail d’une mise à jour. Les dates relatives des pages mises en cache ne sont pas converties artificiellement en dates de publication exactes.

## 8. Comparaison utile au produit

| Travail de l’utilisateur | INTVL documenté | Strava documenté | Clash documenté | GRYD lu dans le dépôt |
|---|---|---|---|---|
| Trouver une raison de sortir/revenir | Carte, boucle, lobbies. [Officiel](https://www.intvl.com.au/) | Activités, clubs, rendez-vous. [Guide](https://stories.strava.com/articles/how-to-organize-your-strava-club-like-a-pro) | Saison, clan, événements. [Actualités](https://supercell.com/en/games/clashofclans/blog/) | Carte, journée active, prochaine sortie, collection suivie. |
| Comprendre qui gère et qui aide | Hiérarchie non vérifiée | Propriétaire et administrateurs. [Aide](https://support.strava.com/en-us/articles/15402172-clubs-on-strava) | Quatre rôles administratifs. [Aide](https://support.supercell.com/clash-of-clans/en/articles/clan-roles-3.html) | Permissions existantes + contributions volontaires indépendantes. |
| Préparer une activité ensemble | Fonctions précises de rendez-vous non vérifiées | Événements et échanges liés. [Guide](https://stories.strava.com/articles/how-to-organize-your-strava-club-like-a-pro) | Coordination du clan ; activité virtuelle | Sorties, capacité, inscription, modification/annulation ; export calendrier ajouté dans ce lot. |
| Reprendre une conversation | Non établi | Canaux et outils de lecture. [Aide](https://support.strava.com/en-us/articles/15401541-club-messages) | Chat clan et nouveaux groupes. [Annonce](https://supercell.com/en/news/clashofclans-henry-kaka-schweinsteiger/) | Conversation paginée ; pas de curseur de non-lu serveur. |
| Contribuer sans être le meilleur | Contribution au club annoncée | Objectif commun possible. [Défis](https://support.strava.com/en-us/articles/15401736-group-challenges) | Dons et Jeux de Clan. [Points](https://support.supercell.com/clash-of-clans/en/articles/clan-games-challenges-and-points.html) | Accueil, organisation, repérage ; encouragement ; roster volontaire 5v5. |
| Montrer une réussite | Résumés et feed annoncés | Carte/photo et mesures. [Partage](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities) | Bilan personnel temporaire. [Chronicles](https://supercell.com/en/games/clashofclans/blog/news/chiefs-chronicles-are-here/) | Résultat, moment d’acquisition, Galerie, Studio ; publication crew volontaire. |
| Comprendre l’achat | Pro facultatif ; offres multiples | Abonnement et produits de marque | Pass et économie du jeu | GRYD+ visuel, droits serveur et prix du store ; aucun effet capture/XP. |

Ces fonctions ne sont pas interchangeables : un clan de stratégie, un grand club d’audience et une équipe sportive locale ont des besoins de taille, de confidentialité et de modération différents.

## 9. État GRYD : ne pas proposer une seconde implémentation

| Domaine | Preuve locale et statut | Limite réelle |
|---|---|---|
| Résultat et conservation | [RunResult:84](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/RunResult.tsx:84>), [raisons serveur](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/captureReceipt2026.ts:7>) : gain historique, terrain restant, attente et indisponibilité distincts. | Ne prouve pas une finalisation sans panne sur iOS/Android physiques ni l’exécution distante PostGIS. |
| Compte, audience et publication | [RunResult:89](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/RunResult.tsx:89>), [social SQL:143](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0113_refonte_2026_social.sql:143>) : résultat confirmé et propriétaire courant avant publication volontaire. | Pas de publication automatique ; une remise au partage système n’est pas une publication constatée. |
| Priorité du crew — **modifié dans ce lot** | [CrewHome:190](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/CrewHomeScreen.tsx:190>), [sélection de sortie](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/crewNextOuting2026.ts>) : prochaine sortie avant conversation et feed, inscription serveur directe. | État complet/annulé/changement de compte à conserver dans la recette finale. Aucun RSVP ne prouve une présence. |
| Calendrier — **ajouté dans ce lot** | [CrewOutings:89](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/CrewOutings2026Screen.tsx:89>), [construction ICS](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/crewOutingCalendar2026.ts:23>) : relecture avant export d’une inscription actuelle. | Export de fichier, pas synchronisation continue des modifications/annulations dans le calendrier externe. |
| Conversation — déjà implémentée | [écran:25](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/crew/CrewConversationScreen2026.tsx:25>), [SQL:36](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0116_refonte_2026_crew_conversation.sql:36>) : pagination, envoi idempotent, retrait, signalement, contrôle du crew. | Pas de non-lu serveur, fils, sondages, message épinglé ou push communautaire confirmé. Rafraîchissement périodique de l’écran, pas preuve de messagerie temps réel en arrière-plan. |
| Rôles — déjà implémentés | [contributions:45](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/crew/crewConversation2026.ts:45>), [SQL:112](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0116_refonte_2026_crew_conversation.sql:112>) : accueil, organisation, repérage autodéclarés, indépendants des droits. | Ce n’est ni une certification ni un pouvoir de créer/modérer accordé par un libellé. |
| Matchs — déjà implémentés | [SQL 5v5:141](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0111_refonte_2026_crew_challenges.sql:141>) : invitation, volontariat, roster, sport, échéance, contribution et publication contrôlés serveur. | Dépend d’arènes réellement configurées et de maintenance serveur ; aucune arène fictive ne doit masquer leur absence. |
| Progression — déjà implémentée | [collections SQL:142](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0110_refonte_2026_season_collections.sql:142>), [lecture:294](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0110_refonte_2026_season_collections.sql:294>), [moments acquis](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/progressMomentLedger2026.ts>). | Acquisition annoncée seulement après baseline et données confirmées ; pas de mesure de rétention réelle. |
| GRYD+ — déjà implémenté | [offre réelle:46](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/ProfilePremiumScreen.tsx:46>), [restauration:64](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/ProfilePremiumScreen.tsx:64>). | La présence du code ne remplace pas une recette d’achat/restauration sur stores ; les droits ne viennent pas du seul client. |
| Sources sportives — périmètre limité | [registre:18](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/sources/adapters/registry.ts:18>) : seul GPX enregistré comme adaptateur ; GPS GRYD séparé. | Fichiers Strava/Health existants mais non branchés ; ne pas annoncer ces connexions. GPX web indisponible ; import privé, pas capture automatique. |
| Taille des crews | [constante:442](</Users/benjaminbel/KLAIM RUN/packages/shared/src/game-rules.ts:442>), [contrôle SQL:585](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0093_crew_member_roles.sql:585>) : maximum 50. | Grand club et portail de marque non livrés. Augmenter une limite UI ne suffit pas. |
| Entrée et carte — **allégées dans ce lot** | [découverte:82](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/onboarding/Discovery2026Screen.tsx:82>), [Couches:228](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/refonte/MapHome.tsx:228>) : exploration directe, explication facultative, états informatifs dans Couches. | Permission de localisation au geste ; pas de preuve de permission arrière-plan par l’onboarding. |

Les anciens événements de notifications ne constituent pas un système de non-lus de la nouvelle conversation. Leur [lecteur historique](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/notifications/useActivityEvents.ts:87>) doit être audité avant tout réemploi pour cette promesse.

## 10. Matrice décisionnelle : observation → existant → changement

P0 désigne une condition de confiance avant élargissement ; P1 une amélioration directement utile ; P2 un chantier produit supplémentaire. Ce ne sont pas des délais estimés.

| Priorité et observation sourcée | GRYD existant | Changement concret ou travail restant | Critère de recette |
|---|---|---|---|
| **P0 — sorties perdues ou interrompues** rapportées chez INTVL et Strava. [INTVL FR](https://apps.apple.com/fr/app/intvl/id6472631698?platform=iphone&see-all=reviews), [Strava Android](https://play.google.com/store/apps/details?hl=en&id=com.strava) | Tracker persistant, ruptures après pause, journal et statuts serveur. | Conserver le modèle ; exécuter la recette physique : écran verrouillé, perte réseau, arrêt processus, reprise, fin, compte A→B→A. Corriger uniquement les défauts reproduits. | Une sortie retrouvée, aucun segment de pause relié, aucun résultat d’un autre compte ; attente distincte de rejet. |
| **P0 — ambiguïté trace/capture** dans les retours INTVL. [Avis](https://apps.apple.com/us/app/intvl/id6472631698?platform=iphone&see-all=reviews) | Démo de boucle, raisons serveur, gain/possession séparés. | Tester compréhension par personnes nouvelles avec des résultats réels ou fixtures isolées identifiées. Pas de promesse de capture issue d’un dessin client. | L’utilisateur explique pourquoi sa sortie est conservée même si le terrain attend ou manque. |
| **P0 — connexion sportive attendue** dans les comparaisons d’apps. [FAQ INTVL](https://www.intvl.com.au/) | GPS natif et GPX ; autres adaptateurs désactivés. | Afficher uniquement les sources réellement activables. Planifier séparément une intégration native ou serveur documentée, déduplication et révocation comprises. | Aucun bouton « connecté » sans autorisation et retour serveur ; aucun import requalifié en capture certifiée. |
| **P1 — préparer un rendez-vous** est une fonction centrale du club Strava. [Guide](https://stories.strava.com/articles/how-to-organize-your-strava-club-like-a-pro) | Sorties et RSVP. | **Implémenté dans ce lot :** priorité dans Crew, inscription directe, export ICS. Finaliser recette capacité, annulation et fuseaux. | Un tap inscrit réellement ; calendrier seulement pour une inscription relue et valide. |
| **P1 — retrouver la discussion** sans bruit. [Messages Strava](https://support.strava.com/en-us/articles/15401541-club-messages) | Conversation et pagination. | **Non livré :** reçu de lecture serveur par utilisateur/crew avec curseur composé, reprise sur premier élément visible non lu ; lecture marquée seulement quand les messages ont été vus. | Deux appareils convergent ; pagination ancienne ne marque pas des messages récents comme lus ; changement de crew retire l’accès. |
| **P1 — relier le message à la sortie** plutôt que dupliquer l’information. [Partage de contenu Strava](https://support.strava.com/en-us/articles/15401541-club-messages) | Rendez-vous et conversation séparés. | **Non livré :** référence typée vers une sortie du même crew, résolue serveur ; annulation et changement d’horaire visibles à la lecture. | Lien d’un autre crew refusé ; pas de copie périmée du lieu ; aucun transfert de GPS privé. |
| **P1 — maîtriser le bruit** demandé dans les retours. [Discussion Strava](https://www.reddit.com/r/Strava/comments/1vbxqv2/strava_clubs_and_activity_feed_becoming_unusable/) | Préférences historiques et lecture à l’écran. | **Non livré :** préférences du nouveau domaine liées au compte, muet/rappel choisi, file serveur idempotente avant push. Ne pas annoncer des notifications déjà actives. | Aucune notification au mauvais compte ; déconnexion/révocation/mute effectifs ; suppression/annulation invalident le lien. |
| **P1 — aider sans devenir administrateur.** [Rôles et entraide Clash](https://support.supercell.com/clash-of-clans/en/articles/clan-roles-3.html) | Trois contributions volontaires et permissions réelles. | **Implémenté dans ce lot :** filtres Tous / Accueil / Sorties / Parcours dans les membres, à partir des contributions autorisées. Aucune qualification ou permission supplémentaire. Recette multi-comptes sur serveur connecté restant à exécuter. | Le rôle volontaire ne change aucun droit ; l’absence de volontaire ne produit pas de personne fictive. |
| **P1 — comprendre ce que l’on achète.** [Retours Strava](https://www.reddit.com/r/Strava/comments/1s2q23f/is_strava_pushing_subscriptions_too_hard/) | Aperçus, prix réel, abonnement, restauration. | **Déjà présent :** continuer la recette et rendre l’accès depuis l’objet pertinent. Fermeture respectée ; aucun upsell au lancement de séance. | Prix/période réels ; pas d’essai inventé ; remboursement/expiration répercutés ; mérite inchangé. |
| **P2 — objectif collectif sans adversaire.** [Group Goal Strava](https://support.strava.com/en-us/articles/15401736-group-challenges), [Jeux de Clan](https://support.supercell.com/clash-of-clans/en/articles/clan-games-challenges-and-points.html) | Matchs 5v5 seulement pour cette logique collective. | **Non livré :** définir un objectif volontaire de période, mesure plafonnée validée et résultat collectif. D’abord règles et correction après suppression, ensuite serveur, enfin UI. Aucun bonus physique acheté. | Ni double compte, ni nouvelle XP par simple somme client ; membre retiré et activité invalidée recalculés. |
| **P2 — grand club ou marque.** [Offre Strava](https://partners.strava.com/resources/grow-your-brand-strava-clubs) | Crew limité à 50 et matchs à 5. | **Non livré :** communauté de grande audience distincte des petits crews sportifs, gestionnaires vérifiés, adhésion/abonnement au contenu, annuaire paginé, modération et équipes locales. | Tests à grand volume, droits délégués, pas d’accès automatique aux traces/membres privés ; aucun rang ou terrain vendu à la marque. |
| **P2 — bilan personnel partageable.** [Chronicles](https://supercell.com/en/games/clashofclans/blog/news/chiefs-chronicles-are-here/) | Journal, progression confirmée, Studio et objets possédés. | **Extension non livrée :** synthèse de période à partir de données serveur confirmées, avec aperçu et partage volontaire. Réutiliser Studio. | Retrait d’une activité corrige la synthèse ; pas de diagnostic ou de profil sportif inventé. |

## 11. Parcours recommandés, avec mots et états réels

### Arrivée sans compte

Carte exploitable immédiatement ; choix Course/Vélo ; action Courir/Rouler. « Comment jouer » reste disponible mais ne bloque pas. La démonstration dit clairement « Exemple ». Se localiser est une action facultative pour explorer ; enregistrer une sortie demande les permissions nécessaires au moment utile. Le refus ne déclenche ni nouvelle position fictive ni réouverture répétée de la demande système. Le lot actuel va dans cette direction ; ce n’est pas un nouveau tutoriel obligatoire à construire.

### Première entrée dans un crew

Après une adhésion réellement confirmée : identité du crew, prochaine sortie s’il en existe une, puis conversation. « Je participe » doit inscrire ; « Complet » ouvre les détails sans promettre une place. Sans rendez-vous, le gestionnaire autorisé voit « Proposer une sortie » ; un membre voit un accès pour échanger. Aucun compteur d’actifs ou de présence n’est déduit d’un effectif. Les contributions volontaires apparaissent comme des personnes joignables dans le contexte du crew, pas comme des grades gagnés.

### Retour après plusieurs jours

Priorité au rendez-vous à venir et à l’état de sa propre inscription. Avec un futur reçu de lecture, « Reprendre la conversation » conduit au premier message non lu encore accessible. Sans reçu, afficher simplement « Conversation » : « 12 nouveaux messages » serait une fausse donnée. Un message de sortie lié à un objet annulé doit afficher son état actuel, pas permettre une inscription à un événement fermé.

### Retour d’activité

Les mesures et leur conservation arrivent avant l’offre sociale. Le terrain affiche le verdict réel ; l’XP n’est pas assimilée à la surface. Une acquisition confirmée peut ouvrir son objet, une seule fois, sans spectacle imposé en Reduce Motion. Le partage présente son audience avant l’écriture. Une sortie privée ou encore locale ne doit pas devenir publique pour alimenter le crew. Le partage et l’abonnement restent des choix secondaires au résultat.

### Gestionnaire d’un grand club

Ce parcours **n’est pas disponible aujourd’hui**. Avant un portail, définir à qui appartient la communauté, qui invite, qui modère, quelles personnes voient les profils et si des sous-groupes sont autonomes. La taille d’un public ne doit jamais augmenter le pouvoir de capture d’un joueur. Une grande communauté peut accueillir plusieurs petites équipes ; cette proposition nécessite un modèle nouveau, et non une simple duplication de `crew_members` dans un écran.

## 12. Mesurer la fidélisation sans fabriquer la réussite

Le critère principal proposé est le **retour à une activité réelle ou à une rencontre choisie**, pas le temps passé dans un feed. La recherche ne fournit aucun objectif chiffré justifié pour GRYD. Les seuils seront décidés après une mesure initiale sur de vrais utilisateurs consentants.

| Question | Mesure proposée | Faux raccourci à éviter |
|---|---|---|
| Le démarrage est-il compréhensible ? | Première exploration puis première activité finalisée ; motifs d’abandon par étape. | App ouverte = activation. |
| Une invitation est-elle utile ? | Lien accepté → adhésion confirmée → première action réelle dans le crew. | Lien copié = nouveau membre. |
| Le groupe aide-t-il à se retrouver ? | RSVP confirmé, retrait et maintien jusqu’au départ ; présence seulement si une preuve dédiée existe. | Inscrit = présent. |
| La conversation sert-elle ? | Personnes ayant obtenu une réponse, délai de première réponse, retours volontaires ; segmenter par taille de crew. | Nombre de messages = qualité. |
| Le résultat inspire-t-il confiance ? | Échecs de finalisation, reprises réussies, délai de confirmation, compréhension des statuts. | Réduire artificiellement les états en attente. |
| Les objets sont-ils appréciés ? | Objet réellement acquis puis consulté/équipé/exporté, sans double annonce. | Animation vue = récompense gagnée. |
| GRYD+ a-t-il une valeur claire ? | Offre chargée, achat confirmé, restauration réussie, résiliation et motifs recueillis volontairement. | Clic payer = revenu ; redirection store = achat. |
| Le retour reste-t-il choisi ? | Retours par cohortes, mute/désactivation, désinscriptions, plaintes ; évolution après un changement précis. | Corrélation entre club et rétention = effet causal du club. |

Réutiliser les événements existants lorsque leur sens correspond exactement à l’action ; ajouter un événement seulement pour une donnée réellement observable. Aucun nouvel événement ni suivi n’est livré par ce document. Ne pas envoyer au produit analytique le corps des messages, les positions de domicile ou des détails de profils masqués.

## 13. Ordre de réalisation proposé

**Maintenant :** conserver les simplifications de l’entrée, la sortie prioritaire et le calendrier déjà ajoutés. Terminer leur recette et celle de conservation/résultat. Garder GRYD+ actif et honnête. Ne pas remplacer les fonctionnalités existantes par des cartes de démonstration ou des promesses de connexion.

**Prochain lot communautaire borné :** reçu serveur de lecture, reprise de conversation, contexte de sortie. Une fois ce modèle éprouvé, préférences de notifications et livraison distante. Les droits de lecture, blocages, départ de crew et changement de compte doivent être testés au même niveau que l’envoi.

**Lot produit séparé :** communautés de grande taille et marques, puis objectif collectif et bilan de période. Il faut définir l’autorité, les coûts de modération, les règles et les données disponibles avant de dessiner un portail rempli de chiffres. Aucun chiffre de revenu ou de rétention concurrent ne permet de sauter cette étape.

## 14. Inventaire des sources et réserves

Toutes les sources ci-dessous ont été consultées ou lues dans leur restitution publique pendant cette passe. Les pages sans date éditoriale sont marquées « actuelle » : cela signifie accessibles le 9 septembre, pas datées de ce jour. Les pages d’aide Supercell parfois vides à l’ouverture ont été lues dans leur restitution indexée ; c’est une limite d’accès explicite.

### INTVL

| Référence | Type / marché / date | Usage |
|---|---|---|
| [Site et FAQ](https://www.intvl.com.au/) | Éditeur, international, actuelle | Jeu, offre, appareils, direction de synchronisation. |
| [App Store AU](https://apps.apple.com/au/app/intvl/id6472631698) | Store officiel, Australie, historique 2026 | Versions et fonctions annoncées. |
| [App Store FR](https://apps.apple.com/fr/app/intvl/id6472631698) | Store officiel, France, actuelle | Version, offres multiples, langues. |
| [Avis Apple FR](https://apps.apple.com/fr/app/intvl/id6472631698?platform=iphone&see-all=reviews) | Auteurs directs, France, 2025–2026 | Motivation, enregistrement, demandes devenues historiques. |
| [Avis Apple US](https://apps.apple.com/us/app/intvl/id6472631698?platform=iphone&see-all=reviews) | Auteurs directs, États-Unis, années parfois absentes | Exploration, densité, valeur, fonctions souhaitées. |
| [Google Play EN](https://play.google.com/store/apps/details?hl=en&id=com.intvl.app) | Store officiel et avis directs, pays non établi, 4 septembre 2026 | Dernière note et retours Android récents. |

### Strava

| Référence | Type / date | Usage |
|---|---|---|
| [Clubs on Strava](https://support.strava.com/en-us/articles/15402172-clubs-on-strava) | Aide officielle actuelle | Accès et gestion. |
| [Club Messages EN](https://support.strava.com/en-us/articles/15401541-club-messages) | Aide officielle, « cette semaine » | Permissions et outils. |
| [Messages FR](https://support.strava.com/fr/articles/15401541-messages-de-club) | Aide officielle, « plus de trois semaines » | Divergence de traduction. |
| [Club Posts](https://support.strava.com/en-us/articles/15401655-club-posts) | Aide officielle actuelle | Contenu et audience. |
| [Nouveautés juillet](https://stories.strava.com/articles/whats-new-on-strava-strava-connects-to-claude-new-running-events-and-races-and-club-messaging) | Éditeur, 16 juillet 2026 | Lancement et limite géographique. |
| [Guide organisateur](https://stories.strava.com/articles/how-to-organize-your-strava-club-like-a-pro) | Éditeur, 9 juillet 2026 | Rendez-vous. |
| [Partage](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities) | Aide officielle actuelle | Exports. |
| [Map Visibility](https://support.strava.com/en-us/articles/15402012-edit-map-visibility) | Aide officielle actuelle | Masque et audience. |
| [Group Challenges](https://support.strava.com/en-us/articles/15401736-group-challenges) | Aide officielle actuelle | Abonnement et coopération. |
| [Strava Challenges](https://support.strava.com/en-us/articles/15401916-strava-challenges) | Aide officielle, « cette semaine » | Éligibilité variable et récompenses géographiques. |
| [App Store FR](https://apps.apple.com/fr/app/strava-course-v%C3%A9lo-rando/id426826309) | Store officiel, France, versions et avis datés | Historique, offres, retours. |
| [Google Play EN](https://play.google.com/store/apps/details?hl=en&id=com.strava) | Store officiel, pays non établi, 31 août 2026 | Dernière note, retour Android. |
| [Prix](https://www.strava.com/pricing) | Éditeur, région renvoyée : Indonésie | Limite de vérification française. |
| [Clubs de marque](https://partners.strava.com/resources/grow-your-brand-strava-clubs) | Éditeur, date non affichée | Produit commercial documenté. |
| [Défis sponsorisés](https://business.strava.com/challenges) | Éditeur, actuelle | Modèle d’offre, sans prévision de revenu. |
| [Year in Sport 2025](https://press.strava.com/ea/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025) | Éditeur, page datée 2 décembre, communiqué 3 décembre 2025 | Tendance et méthode déclarées. |
| [Clubs et spam](https://www.reddit.com/r/Strava/comments/1vbxqv2/strava_clubs_and_activity_feed_becoming_unusable/) | Témoignages directs, 31 juillet 2026 | Frictions et contre-exemples. |
| [Sollicitations commerciales](https://www.reddit.com/r/Strava/comments/1s2q23f/is_strava_pushing_subscriptions_too_hard/) | Témoignages directs, 24 mars 2026 | Perception d’achat. |

### Clash of Clans

| Référence | Type / date | Usage |
|---|---|---|
| [Actualités](https://supercell.com/en/games/clashofclans/blog/) | Éditeur, actuelle | Vérification de la fraîcheur. |
| [Equipment Blast](https://supercell.com/en/games/clashofclans/blog/news/equipment-blast-medal-event/) | Éditeur, 9 septembre 2026 | Événement courant. |
| [Mise à jour d’août](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/) | Éditeur, 30 août 2026 | Résultat, parcours initial et tests. |
| [Chief’s Chronicles](https://supercell.com/en/games/clashofclans/blog/news/chiefs-chronicles-are-here/) | Éditeur, 5 août 2026 | Bilan temporaire terminé. |
| [Retour Global Chat](https://supercell.com/en/news/clashofclans-henry-kaka-schweinsteiger/) | Éditeur, 17 juin 2026 | Lancement, correction de l’ancienne analyse. |
| [Clan Roles](https://support.supercell.com/clash-of-clans/en/articles/clan-roles-3.html) | Aide officielle indexée, actuelle | Autorité et capacité. |
| [Creating/Joining a Clan](https://support.supercell.com/clash-of-clans/en/articles/joining-a-clan-3.html) | Aide officielle indexée, actuelle | Entrée et découverte. |
| [Clan Castle Troops & Spells](https://support.supercell.com/clash-of-clans/en/articles/clan-castle-troops-and-spells-2.html) | Aide officielle indexée, actuelle | Entraide bornée. |
| [Clan Games Challenges and Points](https://support.supercell.com/clash-of-clans/en/articles/clan-games-challenges-and-points.html) | Aide officielle indexée, actuelle | Choix et contribution. |
| [Gold Pass](https://supercell.com/en/games/clashofclans/blog/news/big-changes-are-coming-to-gold-pass/) | Éditeur, 16 février 2026, lancement mars | Architecture de récompenses. |
| [App Store FR](https://apps.apple.com/fr/app/clash-of-clans/id529479190) | Store officiel, France, 31 août 2026 | Version et prudence sur les références d’achat. |
| [Google Play EN](https://play.google.com/store/apps/details?hl=en&id=com.supercell.clashofclans) | Store officiel, pays non établi, 8 septembre 2026 | Mise à jour et témoignages. |
| [Échanges au lancement du chat](https://www.reddit.com/r/ClashOfClans/comments/1u83wgq/join_us_in_global_chat_and_share_which_chats_you/) | Témoignages directs, 17 juin 2026 | Usages et premières frictions. |
| [Discussion récente sur le chat](https://www.reddit.com/r/ClashOfClans/comments/1w8wc0c/global_chat_rant/) | Témoignages directs, date relative | Opinions divergentes. |
| [Réactions aux ajustements du Pass](https://www.reddit.com/r/ClashOfClans/comments/1s53orl/gold_pass_changes_built_from_your_feedback/) | Témoignages directs, 27 mars 2026 | Valeur perçue, pas preuve primaire de patch. |

### Ce qui reste hors preuve

Pas de parcours natif exécuté sur les trois concurrents dans cette passe ; pas d’analyse exhaustive de tous les avis, de toutes les langues ou de chaque variante A/B ; pas de connexion à un compte concurrent payant ; pas de prix français vérifié en caisse ; pas de géométrie INTVL reconstituée ; pas de revenus ou d’efficacité marketing estimés à partir des posts. La page d’avis INTVL britannique, partiellement inaccessible, n’est pas utilisée pour établir un résultat. Les plaintes anciennes sur langue, vélo ou appareils ne sont pas traitées comme une photographie du produit actuel.

Cette recherche livre des décisions et un ordre de travail. **Elle ne prétend pas avoir livré les non-lus serveur, les notifications communautaires, les communautés de plus de 50 personnes ou le portail de marque.** Les modifications effectivement intégrées dans le lot sont identifiées séparément dans les sections 9 et 10.
