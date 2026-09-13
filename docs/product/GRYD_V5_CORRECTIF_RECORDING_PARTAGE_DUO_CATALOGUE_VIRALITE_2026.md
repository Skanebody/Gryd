# GRYD V5 — Fiabiliser les sorties. Transformer chaque activité en souvenir partageable.
## Cahier de correction et d’implémentation : enregistrement, traces, double caméra, partage, personnalisation, classements et croissance

**Date de recherche et de rédaction : 13 septembre 2026**  
**Destinataire : Claude Code, dans le dépôt réel de GRYD**  
**Marque : GRYD — CLAIM THE CITY.**  
**Statut : spécification exécutable et benchmark public ; pas un correctif déjà appliqué ni des tests déjà réussis.**

> Priorité absolue : une activité reste la même lorsque la personne s’arrête, verrouille son téléphone, reçoit un appel et revient dans l’application. Un résultat devient ensuite une trace lisible et un média désirable. La boutique et la croissance ne doivent jamais précéder la réparation de ce parcours.

---

# 0. Ordre de mission — à lire avant tout le reste

Tu interviens sur un produit dont le fondateur vient de signaler des incidents réels. Ne repars pas dans une refonte générale du site, une recherche de logo ou un inventaire théorique sans corrections. Audite, reproduis, corrige puis prouve.

## 0.1 Les symptômes rapportés

| ID | Retour utilisateur, non encore instrumenté | Comportement attendu |
|---|---|---|
| U01 | S’arrêter physiquement coupe la sortie. | Un arrêt physique n’est jamais une commande Terminer. |
| U02 | Repartir semble démarrer une nouvelle course. | Même identifiant d’activité avant et après l’arrêt. |
| U03 | Verrouiller le téléphone à vélo interrompt le suivi. | Collecte supportée en arrière-plan dans un build natif correctement configuré. |
| U04 | Rouvrir GRYD lance une nouvelle activité, puis affiche une pause. | Réconciliation et affichage de la session existante, sans nouveau départ implicite. |
| U05 | Le parcours est mal suivi ou mal dessiné. | Trace issue des points réellement reçus, avec les lacunes explicitement conservées. |
| U06 | Le partage final ressemble mal au résultat sportif attendu. | Média propre, données exactes, trace visible, photo facultative, export réel. |
| U07 | Les objets de personnalisation actuels ne donnent pas envie d’acheter. | Créations cohérentes, prévisualisées sur ses données, droits et prix compréhensibles. |

**Diagnostic non acquis :** U01–U04 suggèrent une confusion entre session, mouvement, cycle de vie et réhydratation. Ils ne prouvent ni une faute particulière de Core Location, ni un bug de serveur, ni une erreur précise dans un fichier que nous n’avons pas inspecté.

## 0.2 Ordre de réalisation impératif

1. **P0 — Session et sauvegarde :** arrêt/reprise, arrière-plan, verrouillage, restauration, réseau, appels, absence de doublon.
2. **P1 — Trace et export :** résultat sportif fidèle, carte/photo/sticker, confidentialité, signature GRYD.
3. **P1 — Photo Duo :** recto/verso après la sortie, avec repli séquentiel fonctionnel.
4. **P2 — Désirabilité et communauté :** catalogue, droits, classements utiles, invitations et notification choisie.
5. **P3 — Extensions :** double caméra simultanée sur configurations prouvées, vidéo élaborée, survol 3D, intégrations sociales supplémentaires.

Une exploration design ou commerciale peut se faire en parallèle. Elle n’autorise pas à fusionner ses changements dans les fichiers critiques du recorder pendant sa réparation.

## 0.3 Documents repris et hiérarchie

Base interne consultée :

- `GRYD_V4_REFONDATION_COMPLETE_2026.md` : en particulier progression, crews, traces, partages, destinations, catalogue, notifications et architecture.
- `GRYD_REFONTE_INTEGRALE_DESIGN_ENGINEERING_2026.md` et les extraits disponibles de la V3 : persistance, états, synchronisation, privacy, contrats de qualité.
- `GRYD_EXPERIENCE_CLIENT_RECADRAGE_2026.md` : démarrage court, contribution asynchrone, journal personnel, refus des péages d’usage.
- Les nouveaux incidents décrits par Benjamin dans la conversation.

Ces documents expriment des exigences et des propositions. Ils ne prouvent pas ce qui fonctionne dans le build testé. La V5 précise/remplace seulement les décisions explicitement listées au chapitre 1. Les règles territoriales, les droits achetés et les historiques ne sont pas réinitialisés par cette mission.

## 0.4 Preuves et limites

- **[U]** : signalement du fondateur ; à reproduire.
- **[I]** : contenu des spécifications internes ; pas une mesure du produit.
- **[Sxx]** : source publique primaire consultée, référencée au chapitre 32.
- **[H]** : hypothèse diagnostique ; à confirmer par traces d’exécution.
- **[D]** : décision de conception GRYD ; à implémenter et tester.
- **[T]** : scénario à exécuter ; résultat initial `NOT_RUN`.

Le code interne et les seuils propriétaires de Strava ne sont pas publics dans les sources consultées. Nous reprenons des comportements documentés et concevons un système GRYD propre. Aucun algorithme présenté ici n’est attribué à tort à Strava.

Aucun dépôt ni téléphone de test n’a été exécuté pour produire ce document. Les rôles d’experts du chapitre 30 constituent une organisation **à faire exécuter dans Claude Code**. Cette rédaction ne prétend pas résulter de sous-agents indépendants effectivement lancés.

## 0.5 Définition du succès

Le scénario suivant doit être prouvé sur le build natif distribué aux testeurs :

```text
GO → déplacer → s’arrêter → verrouiller → repartir → recevoir un appel
→ perdre Internet → rouvrir → terminer → retrouver la sortie
→ afficher le vrai tracé → exporter un média → ouvrir le bon contexte partagé
```

Il reste **une activité logique**, avec des états et des segments explicites. Une interruption système insurmontable peut produire une lacune ; elle ne produit ni une nouvelle course cachée, ni une ligne inventée, ni une perte silencieuse des points déjà sauvegardés.

---

## Guide de lecture par priorité

| Besoin | Sections à charger |
|---|---|
| Corriger maintenant l’activité qui se recrée | Chapitres 0 à 8, tests T-A01–T-A40, lots 0–1 du chapitre 29. |
| Refaire le parcours et le partage | Chapitres 9 à 16, pages UI04–UI07, tests T-B/T-C. |
| Rendre la personnalisation désirable | Chapitres 17 à 20, pages Collection et droits. |
| Construire classements, communautés et viralité | Chapitres 21 à 25. |
| Exécuter et livrer avec preuves | Chapitres 26 à 31. |
| Vérifier ce qui vient des sources | Chapitre 32. |

Le prompt prêt à coller est au **chapitre 31**. Le document entier peut être joint ; chaque sous-agent lit ensuite les seules sections utiles à son lot, plus les invariants.

---

# 1. Arbitrages V5 : ce qui change et ce qui reste

| ID | Décision | Effet sur les anciens documents |
|---|---|---|
| D01 | Corriger le recorder avant d’augmenter les systèmes de jeu. | Suspend les refontes transverses non indispensables au correctif. |
| D02 | Une session sportive n’est pas un état d’interface ni un booléen de mouvement. | Précise la machine à états V3/V4. |
| D03 | Auto-pause désactivée dans le correctif initial tant que sa reprise n’est pas démontrée. | Pas suppression définitive de la fonction ; réintroduction facultative après tests. |
| D04 | Pause manuelle et auto-pause restent distinctes. | Une pause manuelle ne se termine pas automatiquement en bougeant. |
| D05 | Réouverture = réconciliation, jamais démarrage implicite. | Toute initialisation `startNewActivity` au montage est interdite. |
| D06 | Le résultat sportif et son partage ne dépendent pas d’une victoire territoriale. | Si le moteur du jeu attend, partager le sport exact reste possible. |
| D07 | Trace sportive simple, terminaisons arrondies, métriques réelles. | Reprend la fonction utile de Strava, pas ses assets. |
| D08 | Carte · Photo · Sticker · Vidéo restent les quatre familles de partage. | Duo est une composition Photo, pas un cinquième éditeur concurrent. |
| D09 | Double photo de base gratuite, après sauvegarde, sans minuteur social coercitif. | Nouvelle capacité, différente d’une obligation BeReal quotidienne. |
| D10 | Watermark GRYD chartreuse discret dans les sorties compatibles. | Exception explicite pour les destinations qui interdisent la promotion incrustée, notamment l’intégration TikTok. |
| D11 | Vendre des collections conçues, pas des petits réglages indispensables. | Réorganise le catalogue V4 en trois offres de départ ; conserve les droits existants. |
| D12 | Pas de nouveau calcul d’XP dans le hotfix recorder. | Les nombres V4 restent des propositions tant que leur déploiement n’est pas identifié. |
| D13 | Classements gratuits, contexte local d’abord, pays/monde consultables ensuite. | Aucun découpage des cartes par ligue dans le correctif. |
| D14 | Aucune activité/photo n’est une preuve absolue d’absence de fraude. | Pas de badge « certifié sportif » créé par le filtre. |
| D15 | Les effets de réseau sont mesurés après fiabilité. | Pas de promesse de croissance virale par ajout d’un bouton Partager. |

**Conserver :** Carte · Crew · Profil, GO stable, missions facultatives, Run/Bike séparés, un crew par discipline, absence de pay-to-win, vie privée et récupération gratuites, journal indépendant du territoire actuel, moteur serveur déterministe, fixtures uniquement dans les tests isolés.

---

# 2. Diagnostic : où chercher avant de modifier le code

## 2.1 Identifier le produit réellement utilisé

Consigner dans un seul rapport : commit, version de l’application, canal de distribution, OS/appareil, architecture réelle, version de chaque SDK natif, mode de compilation et configuration effective. Chercher ces informations dans le dépôt et les builds avant de demander au fondateur de les retaper.

Distinguer absolument :

- PWA Safari ou Chrome, y compris installée sur l’écran d’accueil ;
- WebView dans une enveloppe native ;
- Expo Go ;
- development build natif Expo ;
- build de distribution/TestFlight ;
- application native iOS/Android indépendante.

Un succès dans un navigateur, dans un simulateur ou dans Expo Go ne valide pas la promesse « je roule téléphone verrouillé ». La spécification Geolocation du Web lie la fourniture des mises à jour aux documents actifs et visibles. Une PWA ne devient pas un recorder natif fiable en ajoutant un timer ou un service worker. [S09]

## 2.2 Hypothèses hiérarchisées par symptômes, pas probabilités inventées

| Hypothèse | Symptôme compatible | Preuve à chercher | Correction seulement après vérification |
|---|---|---|---|
| H01 : vitesse nulle déclenche `finish` | L’arrêt coupe la sortie | Tous appelants de fin ; `speed===0`, timeout d’immobilité | Arrêt = état de mouvement ; jamais clôture. |
| H02 : observation de position limitée au premier plan | Verrouillage coupe la trace | API réellement appelée, configuration du binaire | Tâche/service natif approprié. |
| H03 : cleanup de composant arrête le service | Navigation/app inactive coupe | Effets et handlers de démontage, focus, AppState | Désabonner l’affichage, pas détruire le recorder. |
| H04 : session seulement en mémoire | Relance crée une autre activité | Store sans réhydratation ; UUID créé à l’ouverture | En-tête durable, réconciliation avant GO. |
| H05 : course de chargement | Nouvelle activité puis état pause | Ordre des réponses, valeurs par défaut avant stockage | État `hydrating`, génération et révision des commandes. |
| H06 : deux contrôleurs concurrents | Start/Pause oscillent | Multiples listeners, tâches, widgets, double montage | Un seul propriétaire de la session et file de commandes. |
| H07 : pause automatique du système confondue avec pause sportive | Arrêt prolongé puis aucune reprise | Valeur effective des options natives, callbacks OS | Configuration explicite et reprise du service existant. |
| H08 : réseau requis pour écrire chaque point | Plus de trace sans Internet | Écriture uniquement API, exceptions réseau propagées | Journal local avant réseau. |
| H09 : mode Run/Bike remonte le recorder | Changement ou réouverture recrée | Clés React, stores indexés par sport, route initiale | Sport immuable pour la session ; changement uniquement au repos. |
| H10 : stockage inaccessible au verrouillage | Collecte reçoit, écriture échoue | Erreurs disque/protection, file de lots non commitée | Protection au repos compatible avec la collecte autorisée. |
| H11 : renouvellement d’auth purge le store | Reconnexion fait disparaître la sortie | Logout/reset automatique, cache intercomptes | File locale conservée et isolée ; reconnexion explicite. |
| H12 : premier fix ancien/filtrage excessif | Position figée, départ au mauvais endroit | Timestamps capteur, accuracy, points rejetés | Distinguer donnée reçue et recevable sans inventer la suite. |

L’ordre de recherche peut changer avec les preuves. Ne pas annoncer « c’est l’algorithme GPS » sans avoir identifié le point de rupture.

## 2.3 Audit de code minimal et utile

Trouver les routes et consommateurs réels avant d’écrire les noms de fichiers dans le rapport. Rechercher les créations d’identifiants, les commandes démarrer/pause/reprise/fin, les handlers de cycle de vie et les écritures locales. Examiner également les imports de mocks dans le runtime.

Exemples de chaînes à rechercher avec les outils du dépôt :

```text
startActivity / startRun / createRun / randomUUID / uuid
pause / resume / finish / stop / reset / clear
AppState / background / inactive / useFocusEffect / unmount
watchPosition / watchPositionAsync / startLocationUpdatesAsync
stopLocationUpdatesAsync / TaskManager.defineTask
pausesUpdatesAutomatically / pausesLocationUpdatesAutomatically
allowsBackgroundLocationUpdates / UIBackgroundModes
isRunning / activeActivity / currentRun / hydrate / persist
```

Ces mots sont des pistes, pas la preuve que de telles fonctions existent. Un `stop` dans le rendu caméra n’est pas forcément le `stop` de la course. Cartographier les liens et les effets.

## 2.4 Instrumentation de diagnostic

Ajouter un journal structuré local/exportable avec :

```text
sessionRef pseudonymisée, eventId, eventType, revision,
wallTime, monotonicTime si disponible, bootEpoch,
source de commande, état avant/après,
état de permission et précision, état natif/task,
lastReceivedSequence, lastCommittedSequence, lastAckSequence,
qualité agrégée, réseau, build, plateforme, code d’erreur
```

Événements indispensables : création, démarrage confirmé, pause manuelle, reprise manuelle, stationnaire, mobile, app inactive, app active, verrouillage observable, collecte suspendue, collecte reprise, écriture confirmée/échouée, réhydratation, conflit de session et clôture.

**Ne pas mettre** coordonnées brutes, photos, identifiants publicitaires, tokens, adresses ou détails de santé dans les logs généraux. Pour analyser la précision du parcours, demander un paquet diagnostic séparé et consentant, limité au besoin, avec durée de conservation.

L’instrumentation doit distinguer **point reçu**, **point persisté**, **point retenu pour métriques**, **point dessiné**. Sans cela, on ne sait pas si la perte vient du capteur, du disque, du filtre ou de la carte.

## 2.5 Reproduction initiale

Avec un compte de test réel autorisé et une sortie courte dans un lieu sûr : démarrer, avancer, s’arrêter au moins 30 secondes, repartir, verrouiller, avancer plusieurs minutes, s’arrêter téléphone verrouillé, repartir, déverrouiller. Vérifier l’identifiant à chaque étape.

Répéter séparément avec appel, Internet désactivé et retour d’auth. Tester ensuite les combinaisons. L’absence de données cellulaires se teste sans désactiver arbitrairement toutes les radios ; le mode avion est un autre scénario dont le comportement GNSS dépend de l’appareil.

Conserver les premières preuves d’échec avant correction. Ne pas lancer une montée de version de tous les SDK comme première action : elle effacerait la comparaison et introduirait d’autres variables.

---

# 3. Strava : ce qui est documenté et ce qu’on peut en reprendre

| Sujet | Observation publique | Décision GRYD |
|---|---|---|
| Auto-pause course | Strava décrit une détection de mouvement utilisant l’accéléromètre. [S01] | Exploiter le mouvement uniquement lorsqu’un adaptateur natif le fournit de façon fiable. |
| Auto-pause vélo | Strava décrit une pause/reprise fondée sur le mouvement GPS ; les mauvaises conditions GPS peuvent gêner. [S01] | Hystérésis et qualité explicites ; vitesse absente n’est pas vitesse nulle. |
| Pause manuelle | Une pause demandée par l’utilisateur exige une reprise manuelle dans le comportement documenté. [S01] | Ne jamais annuler silencieusement une pause volontaire. |
| Temps de déplacement | Strava distingue temps écoulé et temps en mouvement, avec des traitements dépendant de la source et du contexte sportif. [S02] | Afficher une sémantique explicite et calculer toutes les vues sur le même contrat. |
| Enregistrement | Démarrer, mettre en pause et enregistrer constituent des actions distinctes. [S03] | Aucun arrêt automatique de session parce que la personne s’immobilise. |
| Partage standard | Carte ou photo et métriques adaptées au sport dans le flux décrit. [S10] | Un rendu immédiatement prêt, personnalisable sans obligation. |
| Vidéo | Activity Replay et Flyover sont deux fonctions documentées différentes. [S12, S13] | Séparer replay 2D et survol 3D ; ne pas faire dépendre le partage simple du 3D. |

La documentation ne révèle pas leurs seuils exacts, code de filtrage, stockage local, système de reprise ou protocole d’upload. Les chapitres suivants sont **une architecture GRYD proposée**, pas une rétro-ingénierie de code privé.

Le succès public ou les notes d’une application ne prouvent pas que chaque sortie est parfaite. Notre objectif n’est pas « copier un algorithme secret », mais satisfaire et démontrer un contrat d’usage au moins aussi clair.

---

# 4. Contrat de session : le correctif central

## 4.1 Les six axes qui ne doivent plus être confondus

```ts
// Contrats conceptuels : adapter aux types existants, ne pas créer un second store.
type SessionPhase = 'none' | 'preparing' | 'open' | 'finalizing' | 'saved' | 'discarded';
type UserControl = 'recording' | 'manual_paused';
type MotionState = 'moving' | 'stationary' | 'unknown';
type SensorState = 'collecting' | 'degraded' | 'unavailable' | 'system_suspended';
type HydrationState = 'loading' | 'ready' | 'needs_reconciliation';
type SyncState = 'local_only' | 'queued' | 'uploading' | 'uploaded' | 'needs_auth' | 'retryable_error';
```

La validation sportive/territoriale reste un autre état serveur : pending, accepted, partial, stats_only, review, rejected. Un statut de validation ne détruit pas le journal local.

**Exemple correct :** session open, contrôle recording, mouvement stationary, capteur collecting, synchronisation local_only. La personne attend à un feu. Il ne faut ni clôturer, ni effacer, ni créer une deuxième session.

## 4.2 Invariants bloquants

1. Seule une action explicite GO, en l’absence de session ouverte réconciliée, peut créer un nouvel identifiant.
2. Pause, arrêt physique, verrouillage, appel, changement d’écran et retour réseau conservent cet identifiant.
3. `resume` attend un identifiant existant ; il n’utilise jamais « create si absent » comme repli silencieux.
4. Une activité terminée durablement n’est pas remise en recording par un callback ancien.
5. La session existe avant son premier point ; zéro point au démarrage ne signifie pas zéro session.
6. Le capteur et la persistance ne dépendent pas du montage de l’écran.
7. Une perte de réseau n’est pas une raison de mettre en pause la pratique.
8. Une mesure de vitesse manquante ou invalide ne devient pas `0` par défaut.
9. L’auto-pause n’appelle ni `finish`, ni une purge du journal, ni un redémarrage de session.
10. Une pause manuelle n’est levée que par une action Reprendre.
11. L’activité peut être enregistrée sans conquête ni photo.
12. La photo, le rendu vidéo ou une panne de carte ne doivent pas affecter les points sauvegardés.

## 4.3 Table de transitions

| Événement | Préconditions | Effet autorisé | Effet interdit |
|---|---|---|---|
| GO | Hydratation prête, pas de session ouverte, permissions minimales | Créer en-tête durable puis démarrer collecte | Créer avant recherche d’une session existante |
| Double GO | Commande initiale en vol | Retourner la même opération/session | Deux UUID ou deux tâches |
| Arrêt physique | Session ouverte | Mouvement stationary si confiance suffisante | Clôture, suppression, nouvelle activité |
| GPS absent | Session ouverte | Qualité inconnue/dégradée, segment interrompu si nécessaire | Déduire pause volontaire ou immobilité certaine |
| Pause manuelle | Session ouverte | Enregistrer pause, arrêter la contribution spatiale volontaire | Garder secrètement le parcours de pause |
| Reprise manuelle | Session existante pausée | Même ID, nouveau segment si collecte interrompue | Réutiliser le bouton démarrer une nouvelle course |
| Background/inactive | Session ouverte | Laisser service autorisé et stockage fonctionner | Finish/reset dans le handler UI |
| Retour foreground | Tout état | Recharger état durable et session native | Appeler automatiquement GO |
| Terminer | Session ouverte | Sérialiser fin, flush, clôturer durablement | Attendre Internet pour sauvegarder |
| Requête fin répétée | Finalizing ou saved | Retourner même état/résultat | Créer une activité distincte |
| Changement de sport | Session ouverte | Différer ou refuser avec explication | Modifier le sport du journal en cours |
| Discard explicite | Confirmation obtenue | Marquer puis purger selon politique | Déclencher sur arrêt physique ou timeout |

## 4.4 Réconciliation à la réouverture

L’interface commence par `loading`. Elle ne montre pas GO comme disponible avant de savoir si une session existe. Un état visuel neutre court vaut mieux qu’une commande incorrecte.

Ordre :

1. Lire l’en-tête durable et les derniers événements commités.
2. Interroger l’état natif réellement observable : tâche/service/session et identifiant lié.
3. Comparer identité, sport, révision, statut de clôture, dernier segment et horodatages.
4. Réconcilier avant d’abonner la vue aux mises à jour.
5. Publier un snapshot unique à l’interface.

| État durable | État natif | Réponse |
|---|---|---|
| Session ouverte A | Collecte A active | Réattacher l’affichage à A sans redémarrer. |
| Session ouverte A | Collecte absente | Marquer interruption ; proposer Reprendre A ou Terminer A. |
| Pause manuelle A | Service présent | Conserver pause ; aucune contribution de points pausés. |
| Saved A | Ancien service A encore présent | Stopper cette collecte orpheline ; ne pas rouvrir A. |
| Aucun journal | Service A annoncé actif | Procédure de récupération explicite ; ne pas inventer B. |
| Session A | Service B | Quarantaine des écritures concurrentes, rapport ; préserver les deux journaux connus. |
| Lecture disque échouée | État natif indéterminé | Action de récupération ; pas création automatique pour cacher l’erreur. |

Si le système relance un processus au titre d’un service autorisé, sa tâche récupère le journal existant. Un utilisateur qui revient après avoir explicitement forcé la fermeture ne doit pas découvrir une course nouvelle démarrée sans lui.

## 4.5 Sérialisation et idempotence des commandes

Un contrôleur unique traite `start`, `pause`, `resume`, `finish` et `discard`. Chaque commande porte un ID stable, l’ID de session et la révision attendue. Les effets sont sérialisés ; une réponse obsolète est rejetée.

Le changement d’onglet supprime seulement l’abonnement de la vue. Les widgets, notifications et raccourcis passent par ce même contrôleur ; ils ne manipulent pas le store directement.

Contrat de test, à relier au framework réel :

```text
Étant donné une session A ouverte et sauvegardée,
quand arrivent background, stationary, foreground et resume,
alors le nombre de sessions reste 1,
l’identifiant reste A,
et aucune commande create n’est exécutée.
```

Ne pas copier ce pseudo-contrat en prétendant qu’il remplace un test d’intégration du service natif.

---

# 5. Configuration de collecte : choisir la bonne branche technique

## 5.1 Si GRYD est seulement web/PWA

Ne pas promettre le suivi sportif continu écran verrouillé avec l’API du navigateur. Wake Lock, `setInterval`, service worker, polling HTTP ou activité audio factice ne constituent pas une solution native légitime. [S09]

Le web continue de servir carte publique, invitations, résultats et partages. Pour la promesse mobile, mettre en place un recorder natif supporté, intégré au même compte et au même backend. Un simple wrapper WebView n’est pas suffisant sans composant natif de collecte/persistance.

Ne pas répondre au fondateur « laisse ton écran allumé » comme résolution définitive. Cela peut être une limite temporaire explicitement signalée à un testeur, pas la définition du produit final.

## 5.2 Si React Native/Expo est présent

Lire la documentation de la **version réellement installée**, le lockfile, les plugins et le binaire généré. Les pages `latest` constituent un repère, pas une autorisation de mettre à jour tout le projet pendant le hotfix.

Vérifications techniques :

- `watchPositionAsync` seul ne couvre pas l’arrière-plan ; il faut une stratégie background supportée.
- La tâche TaskManager est déclarée au niveau module, chargée hors de la vie d’un écran.
- Elle résout la session durable à traiter ; pas de closure React contenant un ancien `runId`.
- Vérifier le background mode `location` dans **Info.plist du binaire**, les déclarations Android et les permissions effectives.
- Une modification de configuration native exige un nouveau binaire ; une mise à jour JS seule ne suffit pas.
- Expo Go n’est pas l’environnement de validation du tracking background.
- Inspecter la valeur effective des options de pause et de service, pas leur simple présence dans un fichier source. [S06, S07]

**Nuance de permissions importante :** le chemin background documenté par Expo demande notamment l’autorisation Always sur iOS et les permissions prévues par son wrapper sur Android. Des implémentations natives différentes peuvent fonctionner avec un autre parcours autorisé. On ne transpose donc pas une règle générale « When In Use suffit » à un wrapper qui exige autre chose. Demander seulement le nécessaire à l’adaptateur choisi et expliquer pourquoi. [S04–S08]

**Nuance des valeurs par défaut :** la propriété native historique de pause automatique iOS et l’option Expo n’ont pas forcément le même défaut. La documentation native annonce une pause automatique possible ; Expo documente sa propre option. Mesurer la valeur réellement utilisée au lieu d’affirmer que le défaut système explique nécessairement l’incident. [S04, S06]

Une API de mouvement présente dans Expo n’est pas automatiquement disponible en arrière-plan. Ne pas utiliser une observation foreground-only pour promettre l’auto-pause running écran verrouillé.

## 5.3 Si le recorder iOS est natif

Deux familles d’API peuvent exister : le gestionnaire historique `CLLocationManager` et les APIs/sessions asynchrones récentes. Choisir selon OS ciblés et intégration ; ne pas assembler des réglages incompatibles en copiant deux exemples différents.

Pour le chemin historique : vérifier `allowsBackgroundLocationUpdates`, capacité `location`, autorisations et réglage explicite de `pausesLocationUpdatesAutomatically`. Pour une sortie précise active, ne pas laisser une pause système opaque décider de la fin de collecte. Gérer les callbacks de suspension/reprise et le rattachement à la session métier. [S04, S05]

Pour les sessions récentes : vérifier la durée de vie de la session d’activité et, lorsque nécessaire, la session de service et leur recréation dans les situations de relance supportées. Les autorisations et les indicateurs système restent visibles. [S05]

Aucun mode audio silencieux, aucune géofence artificielle ou faux usage santé ne sert à contourner les restrictions système. Une Live Activity présente des données ; elle ne maintient pas à elle seule le recorder en fonctionnement.

## 5.4 Si le recorder Android est natif

Un service de localisation au premier plan est démarré depuis une action utilisateur autorisée, avec type, permissions et notification conformes à la version cible. Les restrictions de démarrage en arrière-plan et les permissions « pendant l’utilisation » se vérifient selon le scénario réel. [S08]

La notification de service n’est pas un push marketing. Elle montre le sport et l’état utile, sans coordonnées privées. Ses actions passent par le même contrôleur de session.

WorkManager ou une tâche périodique n’est pas le recorder continu. Ils peuvent aider la synchronisation, pas remplacer la collecte de la sortie. Tester les politiques de batterie des appareils réellement supportés. Ne pas promettre de survivre à `force stop` ou à toutes les politiques constructeur.

## 5.5 Limites physiques à afficher honnêtement

Verrouillage ordinaire et passage en arrière-plan doivent être supportés et testés. Batterie vide, désinstallation, stockage illisible, autorisation retirée ou arrêt forcé peuvent interrompre la collecte. L’exigence est de préserver les données commitées, de reconnaître l’interruption et de reprendre sans fiction lorsque cela est possible.

L’absence d’Internet n’est pas l’absence de GNSS. Elle peut toutefois affecter cartes, assistance au premier positionnement et synchronisation. Une bonne UX distingue ces trois dépendances.

---

# 6. Journal local, reprise et synchronisation

## 6.1 Écrire avant d’annoncer

Créer un en-tête transactionnel avant la collecte : ID, utilisateur, sport, source, date de création, date de départ, version du schéma et version de règles. Un lancement échoué reste identifiable, sans sortie fantôme publiée.

Persister progressivement les points reçus et les événements. Ne pas attendre `Terminer`, un événement de fermeture de l’app ou une réussite réseau : ces callbacks peuvent ne pas arriver.

**Budget proposé, à mesurer :** lots commités au plus toutes les cinq secondes en exécution normale, plus tôt aux transitions Pause/Reprendre/Terminer. Ce budget limite la perte de points *déjà reçus mais non persistés* ; il ne garantit pas la réception lorsque l’OS suspend le processus. Une contrainte plus stricte peut être choisie si son coût batterie/stockage est mesuré.

Stockage recommandé : base locale transactionnelle ou équivalent robuste existant. Ne pas réécrire un énorme tableau JSON complet à chaque nouveau point. Ne pas utiliser Keychain/SecureStore pour stocker des milliers de coordonnées : ces outils protègent principalement les secrets nécessaires à l’accès.

## 6.2 Modèle logique minimal

Les noms suivants sont des responsabilités, pas des tables supposées présentes :

| Objet | Contenu indispensable |
|---|---|
| ActivityHeader | ID stable, compte, sport/sous-type, source, début, phase, révision. |
| TrackSegment | ID, activité, cause de début/fin, continuité connue/inconnue. |
| TrackPoint | Segment, séquence source, timestamp, coordonnées, précision disponible, valeurs capteur utiles. |
| ActivityEvent | Pause, reprise, interruption, commande et source, temps monotone/mural, ordre durable. |
| UploadChunk | Plage, empreinte, tentative, statut, dernier acquittement. |
| FinalizationManifest | Liste des segments/plages attendues, statut de complétude, versions. |
| ActivityOutcome | Métriques canoniques, validation sportive, impact territorial, révisions. |
| ShareDraft | Référence d’activité, médias locaux choisis, style, confidentialité, destination. |

Une clé unique locale empêche deux sessions actives du même compte sur le même appareil. Deux appareils peuvent produire des fichiers : le serveur détecte les doublons/chevauchements, sans fusionner arbitrairement leur parcours ni compter deux activités identiques.

## 6.3 Gestion des points

Conserver l’ordre source lorsqu’il est disponible, dédupliquer les livraisons répétées et distinguer ordre de réception et temps de mesure. Traiter les lots tardifs de manière déterministe. L’arrivée tardive d’un lot n’autorise pas l’écran à redémarrer la course.

Valider les bornes numériques et la précision, mais garder la raison d’exclusion. `NaN`, timestamp impossible ou vitesse négative de type « indisponible » ne deviennent pas des mesures valides.

Le temps et la distance ne sont jamais reconstruits à partir du nombre de frames UI ou de ticks d’un `setInterval`.

## 6.4 Pause volontaire : respect de l’intention privée

Une pause manuelle signifie que la personne ne souhaite plus enregistrer sa progression sportive pendant cet intervalle. La session reste ouverte. L’implémentation peut suspendre la précision fine ou désactiver la collecte pendant la pause si la reprise native est maîtrisée ; elle ne conserve pas secrètement ses déplacements.

Les points émis tardivement sont affectés à leur intervalle réel. Les points d’un intervalle manuellement pausé ne créent ni distance sportive, ni fermeture territoriale. À la reprise, créer un nouveau segment lorsque la continuité enregistrée a été interrompue.

Ne pas relier le dernier point avant pause au premier après reprise par un trait plein ou un segment de capture : la personne a pu se déplacer en voiture pendant la pause.

## 6.5 Protection du stockage

Les données doivent rester protégées au repos tout en étant accessibles à la collecte autorisée pendant le verrouillage. Vérifier le mode de protection effectivement utilisé sur appareil, y compris après redémarrage avant le premier déverrouillage.

Une erreur d’écriture interrompt la promesse de sauvegarde : signaler l’état, conserver ce qui est déjà durable et éviter de prétendre que la sortie est entièrement protégée. Ne jamais purger une ancienne activité non synchronisée pour gagner automatiquement de l’espace.

## 6.6 Upload reprenable

Chaque lot possède une identité stable et une empreinte. L’acquittement signifie persistance serveur effective. Un timeout après commit peut être suivi du même envoi : l’effet métier reste unique.

La finalisation vérifie le manifeste de points avant validation. Le résultat de fin locale peut être présenté avant synchronisation ; la conquête officielle attend le résultat du moteur.

Retenter avec backoff borné, variation aléatoire et respect de l’état réseau. L’expiration d’auth demande une reconnexion sans supprimer le journal. Une relance ou mise à jour ne remet pas les compteurs à zéro.

## 6.7 Réparer les activités déjà fragmentées

Ne pas fusionner automatiquement les sorties existantes uniquement parce qu’elles sont proches dans le temps.

Construire un outil de réparation qui :

1. détecte des candidates à partir d’un même compte, appareil, source, sport et provenance de session ;
2. examine événements, segments, trous, overlaps et doublons ;
3. propose une reconstruction de journal sportif, visible avant confirmation ;
4. conserve les fichiers et leur filiation pour audit ;
5. recalcule les métriques de façon versionnée ;
6. n’accorde pas rétroactivement du territoire supplémentaire sans règle explicite de réparation ;
7. déduplique les récompenses déjà accordées.

Sans provenance suffisante, proposer seulement l’export ou le réexamen des activités séparées. Il vaut mieux une réparation honnête partielle qu’un beau parcours falsifié.

---

# 7. Auto-pause et calcul sportif : une seule sortie, plusieurs temps

## 7.1 Décision de hotfix

Désactiver l’auto-pause automatique défaillante pour les nouvelles sorties du correctif initial, en conservant une pause manuelle fiable. Informer une fois les testeurs concernés : « Pause automatique temporairement désactivée pendant sa fiabilisation. » Ne pas appliquer un changement distant ambigu au milieu d’une sortie.

Calculer ensuite un temps en mouvement à partir des données de qualité suffisante. Ce calcul ne remplace pas la sauvegarde et ne justifie pas une nouvelle activité.

Réintroduire l’auto-pause comme préférence **par sport**, initialement facultative, seulement après les scénarios de reprise verrouillée. Un résultat de test course n’autorise pas le vélo, et inversement.

## 7.2 Trois horloges

| Mesure GRYD | Définition |
|---|---|
| **Temps écoulé** | De début à fin, pauses comprises. |
| **Durée enregistrée** | Intervalles hors pause manuelle ; auto-arrêt ne change pas l’identité de session. |
| **Temps en mouvement** | Sous-ensemble estimé des intervalles enregistrés jugés en mouvement selon règle versionnée. |

L’interface peut employer « Durée » pour la mesure principale mais doit en expliquer le sens dans le détail. Proposition : durée enregistrée pendant le live ; temps en mouvement et écoulé accessibles après validation. Une préférence peut choisir l’affichage live sans modifier les données.

Allure moyenne mouvement = temps en mouvement / distance recevable correspondante. Vitesse moyenne = distance / temps exprimée dans les bonnes unités. Un dénominateur nul donne « — », jamais une valeur infinie ou un faux zéro.

Les meilleurs efforts chronométrés utilisent une fenêtre cohérente de temps écoulé et de distance, non un chronomètre que des pauses peuvent améliorer artificiellement. Une activité importée conserve aussi la définition des métriques de sa source. Le contrat GRYD ne prétend pas reproduire tous les calculs propriétaires de Strava. [S02]

## 7.3 Mouvement inconnu n’est pas immobilité

Classer la qualité avant le mouvement. Un GPS absent dans un tunnel, une mesure trop imprécise ou des mises à jour différées conduisent à `unknown`, pas `stationary`.

L’auto-pause ne doit pas déclencher parce qu’aucun point n’est reçu pendant cinq secondes. La donnée peut être livrée par lot. À l’inverse, le bruit GPS d’une personne immobile ne doit pas ajouter une distance fictive.

## 7.4 Détecteur proposé pour le vélo

**Proposition à calibrer ; ces valeurs ne viennent pas de Strava.**

- Fenêtre de mouvement glissante sur plusieurs secondes, pas un seul point.
- Mesures GPS horodatées et suffisamment précises ; disponibilité et incertitude prises en compte.
- Valeurs initiales de laboratoire : considérer un candidat arrêt sous environ 0,5 m/s pendant 8 secondes ; candidat reprise au-dessus d’environ 0,9 m/s pendant 3 secondes, avec déplacement spatial cohérent.
- Rejeter l’hypothèse arrêt si la qualité est mauvaise ou si les données se contredisent.
- Utiliser une hystérésis pour éviter la vibration pause/reprise au feu ou lors d’un départ lent.
- Conserver les observations nécessaires pendant l’auto-arrêt : ne pas désactiver le mécanisme dont dépend la reprise.
- Ne pas transformer la vitesse à pied en invalidation d’une sortie vélo ; la personne peut pousser son vélo.

Une précision horizontale de 25 m peut servir de seuil initial de qualité pour *ce détecteur*, mais ne suffit pas à définir un déplacement réel de quelques mètres. Tester les fenêtres de déplacement et leur incertitude ; ne pas déduire 4 m parcourus à partir de deux fixes incertains de 25 m.

Si la confiance est insuffisante, laisser l’enregistrement continuer et estimer les arrêts après la sortie. La conservation de données valides prime sur un compteur en mouvement élégant.

## 7.5 Détecteur proposé pour la course

Exploiter un signal de mouvement natif disponible et autorisé, éventuellement complété par GPS. L’absence d’accéléromètre exploitable, une permission refusée ou un téléphone transporté différemment ne doit pas interdire une course normale.

L’alternance course/marche reste une activité valide ; la marche n’est pas une pause. Ne pas fixer une allure minimale de jogger qui arrêterait les débutants, côtes, marches ou séances de récupération.

Quand la détection native n’est pas fiabilisée en arrière-plan, utiliser une estimation GPS conservatrice après sortie plutôt qu’une fausse promesse d’auto-pause live.

## 7.6 Priorités de décision

```text
Fin explicite durable > pause manuelle explicite > interruption système observée
> qualité inconnue > mouvement estimé
```

La pause automatique ne lève jamais la pause manuelle. Un changement de qualité ne clôture jamais la session. Le rétablissement des capteurs ne crée jamais un autre ID.

## 7.7 Distance, filtres et précision

Maintenir trois jeux de données : observations privées, série canonique recevable, géométrie de rendu simplifiée. Le filtrage élimine ou étiquette les anomalies ; il ne fabrique pas le parcours attendu.

Un filtre de Kalman ou autre lissage n’est pas ajouté « pour faire expert » sans amélioration mesurée sur données représentatives. Un map-matching peut être utile à la lecture, mais ne doit ni inventer un chemin ni arbitrer une conquête en cas de doute.

Tester notamment les virages serrés, immeubles, voies parallèles, tunnel, demi-tour, marche lente, poussage de vélo, ponts et trajets sur plusieurs niveaux. Une autre app enregistrée en parallèle est un comparateur, pas une vérité géodésique absolue.

---

# 8. Matrice des interruptions : préserver l’activité plutôt que la recréer

| Situation | Comportement attendu | Limite/solution de repli |
|---|---|---|
| Écran verrouillé normalement | Collecte native autorisée, même session | Test réel, pas simple simulation d’AppState. |
| L’application passe au fond | UI suspendable ; recorder indépendant | Certaines livraisons peuvent être groupées. |
| Appel entrant puis conversation | Pas de pause métier automatique | L’audio peut être interrompu ; il ne pilote pas le GPS. |
| Changement de musique/Bluetooth | Collecte intacte | Une alerte audio manquée n’est pas une activité perdue. |
| Arrêt au feu | Stationnaire, session ouverte | Auto-pause facultative et reprise même ID. |
| Pause manuelle | Pas de déplacement capturé secrètement | Reprendre explicite, nouveau segment si nécessaire. |
| Perte Internet | Journal local continu | Carte ancienne et sync en attente clairement distinguées. |
| Pas de tuiles cartographiques | Métriques et enregistrement disponibles | Trace sur fond neutre si nécessaire. |
| Tunnel/GPS imprécis | Segment interrompu/qualité inconnue | Aucun pont droit utilisé pour une capture. |
| Permission retirée | Signaler collecte impossible, conserver acquis | Reprise après autorisation avec lacune explicite. |
| Position approximative | Expliquer limite pour capture | Journal éventuellement disponible ; aucune précision fictive. |
| Économie d’énergie | Fonctionnement mesuré sur appareils supportés | Instructions constructeur seulement si pertinentes. |
| Chauffe/mémoire | Priorité au recorder, réduire carte/animation | Reporter vidéo et caméra, pas purger les points. |
| Processus tué par le système | Données durablement écrites récupérables | Collecte pendant absence selon capacités, jamais garantie universelle. |
| Fermeture forcée utilisateur | Ne pas contourner la décision OS/utilisateur | À la relance : reprendre l’ancienne session ou terminer. |
| Batterie vide/redémarrage | Retrouver les segments commités | Période sans données conservée comme lacune. |
| Stockage plein | Échec visible de persistance | Pas de faux « enregistré » ; préserver les données existantes. |
| Auth expirée | Continuer le journal autorisé local, protéger le compte | Reconnexion nécessaire à l’upload, pas nouvel utilisateur fantôme. |
| Double tap pause/reprendre | Commande sérialisée, révision contrôlée | Réponse ancienne ignorée. |
| Notification de crew ouverte | Ne pas changer la session ou le sport | Contexte mémorisé pour plus tard. |
| Mise à jour/déploiement | Pas de rechargement destructeur en activité | Report d’activation du nouveau code, migrations compatibles. |
| API de jeu indisponible | Fin locale et partage sportif autorisé | Territoire « analyse en attente », pas fausse victoire. |
| Appareil photo occupé | Résultat reste consultable et enregistré | Photo simple/galerie ou réessayer plus tard. |
| Achat ou boutique indisponible | GO, journal et partage gratuit inchangés | Erreur limitée à l’achat. |

**Ne pas afficher « fonctionne en permanence quoi qu’il arrive ».** Le contrat doit être solide dans les usages ordinaires et explicite lorsque le système ne permet plus la collecte.

---

# 9. Refaire les traces et le détail sportif

## 9.1 Objectif d’usage

En ouvrant une activité, la personne reconnaît immédiatement **le trajet qu’elle a réellement effectué**. Elle peut lire sa distance, son temps et son allure/vitesse, revoir le parcours, puis le partager. L’absence de conquête ne réduit pas la qualité de cet écran.

Le territoire n’est qu’une couche optionnelle du détail de sortie. Par défaut, une activité sans capture montre le sport, pas un grand panneau « échec ».

## 9.2 Pipeline unique

```text
Observations reçues et événements de session
→ segments enregistrés et qualité
→ métriques canoniques versionnées
→ trace privée de l’activité
→ projection publique autorisée pour partage
→ géométrie adaptée à l’échelle
→ rendu carte, graphique, sticker et vidéo
```

Une capture d’écran de la carte live n’est pas un système de partage. Tous les rendus doivent pouvoir être reconstruits à partir du même manifeste et du même résultat canonique.

## 9.3 Contrat du trait

| Contexte | Style initial proposé | Règle |
|---|---|---|
| Course/vélo en cours | Chartreuse 5–6 unités logiques, caps/joints arrondis | Contraste de fond discret ; pas de feu ou particules. |
| Détail d’activité | 4–5 unités | Trace dominante ; territoires atténués ou masqués. |
| Export 1080 px | 12–18 px selon emprise et complexité | Lisible à 25 % de la taille finale. |
| Route proposée | 3 unités, pointillée | Libellé Proposition ; jamais confondue avec le réalisé. |
| Segment absent | Rupture | Repères d’interruption facultatifs, pas de ligne pleine. |
| Frontière territoriale | 2 unités au repos | Ne concurrence pas le parcours sportif. |

Couleur signature : chartreuse. Proposer gratuitement blanc et orange chaud `#FF7A45` pour ceux qui préfèrent une lecture sportive proche des usages familiers. Ce choix de couleur est GRYD ; ne pas utiliser le logo Strava ni une présentation laissant croire à un export officiel Strava.

Le watermark GRYD reste chartreuse quelle que soit la couleur du parcours, sauf règle de destination contraire au chapitre 15. Un thème ne peut pas dégrader le contraste des commandes ou modifier les codes de propriété compétitive.

## 9.4 Points de contrôle techniques

- GeoJSON utilise longitude puis latitude ; les SDK de caméra peuvent attendre l’inverse : convertir explicitement.
- Tous les calculs internes utilisent des unités définies ; conversion à l’affichage seulement.
- Ne pas produire `LineString` avec un point ; montrer un point ou une absence de parcours utilisable.
- Utiliser une géométrie multisegment pour pauses/lacunes ; pas d’aplatissement aveugle.
- Gérer l’antiméridien et les limites de projection ; éviter une carte du monde pour un petit parcours traversant ±180°.
- Vérifier bounding box, padding, données finies et éventuel ancien fix de démarrage.
- Une faible valeur de longitude/latitude n’est pas en soi invalide : ne pas supprimer arbitrairement toutes les coordonnées proches de zéro.
- Simplifier pour le rendu avec tolérance liée au zoom ; métriques et fermeture utilisent le contrat canonique, pas le dessin simplifié.
- Conserver les trous des territoires ; ne pas remplir les zones exclues par erreur.
- Tester très petit parcours, grande sortie, aller-retour superposé, plusieurs boucles et trace partielle.

## 9.5 Métriques de la page

**Course :** distance ; durée et sa définition ; allure moyenne ; temps écoulé disponible ; dénivelé si fiable ; splits ; données cardio uniquement si réellement reçues et autorisées.

**Vélo :** distance ; durée ; vitesse moyenne ; temps écoulé ; dénivelé fiable ; puissance/cadence si capteur disponible. Pas de watts ou de calories inventés pour remplir une ligne.

Les meilleurs efforts restent personnels au lancement ; ne pas créer un classement de descentes rapides ou une récompense incitant à regarder son téléphone en roulant.

Les graphiques et la trace partagent les mêmes timestamps. Toucher un graphique peut positionner un repère sur sa trace. Sans mesure, l’option est absente ou explique l’indisponibilité, pas un graphe généré artificiellement.

## 9.6 Styles de données : couverture utile de Strava

La documentation Strava recense notamment allure/vitesse, fréquence cardiaque, altitude, pente, surface, puissance mesurée, temps, température et présentations 3D/saisonnières. Ce ne sont pas tous des filtres photographiques. [S11]

GRYD reprend ces **familles fonctionnelles**, une à la fois :

| Style | Source nécessaire | Repli |
|---|---|---|
| Allure/vitesse | Temps + distance recevables | Signature si qualité insuffisante. |
| Fréquence cardiaque | Mesure horodatée autorisée | Aucune estimation ; non partagée par défaut. |
| Altitude | Capteur ou modèle identifié | Indiquer la source ou masquer. |
| Pente | Altitude et distance filtrées correctement | Pas de calcul explosant à distance presque nulle. |
| Surface | Données de réseau cartographique autorisées | Inconnu n’est pas route sûre. |
| Puissance | Capteur compatible | Pas de style puissance à partir d’une valeur fantaisiste. |
| Temps | Chronologie enregistrée | Ruptures conservées. |
| Température | Source horodatée identifiée | Option différée si source non financée. |
| Relief 3D | Terrain/licences et moteur prêts | Repli 2D. |
| Style saisonnier | Actif GRYD publié | Signature toujours disponible. |

Les couches utiles à la lecture des données personnelles ne deviennent pas un prétexte pour les cacher après expiration d’un abonnement. Le premium peut proposer des **présentations supplémentaires**, sans retirer l’accès de base aux mesures.

---

# 10. Benchmark du partage : ce qu’il faut reprendre, transformer ou refuser

## 10.1 Strava : rendre une activité reconnaissable

Le flux standard documenté permet de choisir une carte ou une photo avec des statistiques adaptées au sport. Dans ce flux précis, les statistiques ne sont pas librement composables. Cela n’autorise pas à affirmer que toute autre expérience de partage Strava est aussi limitée. [S10]

Les familles publiques comprennent aussi les styles de cartes, Sticker Stats, Activity Replay, Flyover, partages de liens et embeds. Les bilans agrégés sont une autre famille qu’un résultat de course. Leur disponibilité varie selon compte, abonnement, déploiement et plateforme. [S11–S15]

**Transfert GRYD :** une trace nette et un résultat lisible constituent la base. Le choix Sport/Territoire reste accessible ; le jeu ne force pas la personne à partager une conquête si elle préfère montrer sa sortie ou sa photo.

## 10.2 BeReal : une personne et son contexte

La présentation publique de BeReal met en avant les deux caméras et un moment de vie. Elle ne dévoile pas son implémentation matérielle exacte. [S17]

**Transfert GRYD :** réunir visage, lieu choisi et activité dans un souvenir après l’effort. **Ne pas reprendre** le rendez-vous aléatoire urgent, la fenêtre de deux minutes ou l’obligation de publier pour voir les autres. En sport, cela pourrait distraire ou culpabiliser.

## 10.3 Autres catégories et marchés, notamment américains

| Référence | Offre ou mécanique observable | Ce que GRYD en retient | Ce qu’on ne transpose pas |
|---|---|---|---|
| Discord Shop | Décorations, effets et éléments de profil avec aperçus et achats. [S21] | Un objet vaut davantage s’il modifie visiblement son identité dans plusieurs surfaces cohérentes. | Dix micro-achats pour des caractères ordinaires ; effets permanents dans la carte live. |
| Snapchat+ | Personnalisation de l’apparence et de l’icône de l’app selon disponibilité. [S22] | Essayer immédiatement un style et voir où il s’applique. | Privilèges de visibilité ou métriques sociales envahissantes. |
| VSCO | Bibliothèque de presets, outils et recettes de création. [S23] | Vendre une collection cohérente et mémoriser une recette, pas une couleur isolée peu désirable. | Des centaines de presets indifférenciés dans le premier écran. |
| Relive | Souvenirs d’activité enrichis : vidéo, rythme de lecture, thèmes et personnalisation. [S24] | Réutiliser la sortie comme matière d’un souvenir audiovisuel. | Survol coûteux obligatoire avant de pouvoir partager. |
| Duolingo | Progression et ligues hebdomadaires, dans un contexte d’apprentissage. [S25] | Prochaine étape claire et pairs proches ; possibilité de ne pas participer. | Exigence quotidienne sportive et peur de perdre une série. |
| INTVL | Territoires, clubs et classements locaux/mondiaux présentés par l’éditeur. [S26] | Situation locale compréhensible, appartenance et rivalité contextualisée. | Conclure que ces éléments expliquent à eux seuls son succès. |

Ce tableau élargit le benchmark au-delà du running. Il ne prétend pas que chaque référence vient des États-Unis ni qu’un modèle efficace dans une catégorie donnera la même conversion chez GRYD.

## 10.4 Pourquoi une personne partage : hypothèses à valider

- **Montrer un accomplissement :** rendre visible un effort qu’on ne peut pas voir depuis son canapé.
- **Garder un souvenir :** lieu, visage, météo vécue et personnes présentes, sans obligation de performance.
- **Affirmer une identité :** je cours, je roule, j’explore, je fais partie de ce groupe.
- **Recevoir une reconnaissance :** quelques interactions significatives plutôt qu’un score universel de popularité.
- **Inviter :** proposer à des proches de rejoindre une expérience intelligible.
- **Raconter une transformation :** avant/après, première boucle, retour à la pratique ou évolution collective.

Les travaux de Jonah Berger offrent un cadre de réflexion sur la valeur sociale, les déclencheurs, l’émotion, la visibilité, l’utilité et le récit. Cela ne donne pas une formule garantie de viralité. [S27]

GRYD doit satisfaire ces motivations sans présenter le sport comme une obligation de se prouver aux autres. Photo, partage, classement et notifications restent facultatifs.

---

# 11. Système de partage : grand catalogue, petit nombre de décisions

## 11.1 Architecture de l’éditeur

Entrée depuis une activité : **Partager**. Une preview vraie s’ouvre, déjà composée.

Quatre familles visibles : **Carte · Photo · Sticker · Vidéo**. Sous Photo, une action **Duo** ouvre la capture avant/arrière. Les contrôles secondaires sont **Style**, **Informations** et **Confidentialité**, pas vingt boutons au même niveau.

Ordre de sélection automatique :

1. Dernier style compatible réellement choisi par la personne.
2. Photo/Duo déjà lié à l’activité, si elle l’a choisi comme préférence.
3. Conséquence territoriale confirmée et significative.
4. Résultat sportif simple.

Le choix automatique est réversible. Il ne publie rien. Un partage précédent n’est pas un consentement permanent à montrer sa fréquence cardiaque, ses partenaires ou sa carte précise.

## 11.2 Catalogue fonctionnel cible

**B0** : rendu de base, après P0. **B1** : enrichissement suivant, sans bloquer B0. **B2** : extension après validation de capacité/coûts/droits. Une cible B2 n’est jamais vendue comme déjà livrée.

| ID | Composition | Contenu et bénéfice | Accès | Lot |
|---|---|---|---|---|
| SH01 | Carte Sport | Trace, distance, durée, allure/vitesse | Gratuit HD | B0 |
| SH02 | Carte Terrain | Trace + gain confirmé, distinction repris/déjà possédé | Gratuit HD | B0 |
| SH03 | Carte claire | Présentation lumineuse et lisible, sans thème sportif imposé | Gratuit HD | B0 |
| SH04 | Photo Statistiques | Photo dominante, trois métriques maximum | Gratuit HD | B0 |
| SH05 | Photo Trace | Photo dominante, route vectorielle autorisée et ligne sportive | Gratuit HD | B0 |
| SH06 | Duo Fenêtre | Photo arrière + selfie incrusté + statistiques | Gratuit HD | B0 Duo |
| SH07 | Duo Split | Deux photos en panneaux égaux et données compactes | Gratuit HD | B0 Duo |
| SH08 | Sticker Trace | Route seule sur alpha, signature compatible | Gratuit | B0 |
| SH09 | Sticker Chiffres | Métriques seules, utilisable sans GPS | Gratuit | B0 |
| SH10 | Sticker Combiné | Trace + distance/durée + signature | Gratuit | B0 |
| SH11 | Avant/Après | Même emprise, différence de possession confirmée | Gratuit statique | B1 |
| SH12 | Record personnel | Accomplissement réellement calculé, sport et contexte | Gratuit | B1 |
| SH13 | Souvenir sans capture | Sortie sportive sans faux échec territorial | Gratuit | B0 |
| SH14 | Objectif crew | Contribution/objectif collectif, noms autorisés seulement | Gratuit standard | B1 |
| SH15 | Invitation crew | Identité, sport, lieu général, lien/QR optionnel | Gratuit | B0 social |
| SH16 | Classement local | Place, population, période, sport et révision | Gratuit | B1 |
| SH17 | Semaine/Saison | Bilan vérifié ; aucune semaine manquée affichée en rouge | Gratuit standard | B1 |
| SH18 | Carte de données | Une valeur colorant le tracé avec légende | Gratuit données de base | B1 |
| SH19 | Replay 2D | Parcours accéléré puis conséquence, 7–10 s | Gratuit standard local | B1 |
| SH20 | Duo animé | Photos fixes animées sobrement, trace, résultat | Base gratuite quand livrée ; variantes graphiques payantes | B1 |
| SH21 | Album crew | Plusieurs photos autorisées, contributions distinctes | Gratuit standard ; mise en page avancée facultative | B1 |
| SH22 | Survol 3D | Terrain et caméra animée | Plus uniquement si capacité vendable | B2 |
| SH23 | Relief statique | Vue inclinée/terrain, sans confusion avec vidéo | Selon licence et produit livré | B2 |
| SH24 | Bilan annuel | Souvenir agrégé lorsque données suffisantes | Standard gratuit | B2/calendrier |
| SH25 | Page web/Embed | Résultat public révocable et partageable | Page gratuite ; embed ensuite | B0/B2 |
| SH26 | Lens Snapchat / Green Screen | Intégration plateforme spécifique | À définir après accord ; pas prérequis export | B2 |

Les ensembles payants du chapitre 19 proposent des variantes de composition, pas la confiscation de familles essentielles. Duo, la trace lisible et le partage standard restent réellement utilisables gratuitement.

## 11.3 Le résultat précède l’éditeur

Une activité sportive recevable peut produire SH01/04/09 même si le jeu est encore en cours de vérification. Le média ne comporte alors ni gain territorial provisoire présenté comme définitif, ni faux classement.

Une activité manuelle ou sans trace peut avoir une composition de statistiques clairement identifiée. Elle ne reçoit pas une fausse trace, un badge de GPS certifié ou un rang compétitif automatique.

L’écran résultat ne doit pas obliger à attendre une vidéo, un niveau, un achat ou un formulaire pour retrouver la sortie.

---

# 12. Photo Duo : le visage, le contexte et la preuve sportive

## 12.1 Proposition produit

Nom de travail : **Duo** ou **Photo Duo**. Ce nom descriptif n’est pas une validation de disponibilité de marque. Ne pas présenter la fonction comme une intégration officielle BeReal.

Depuis le résultat sauvegardé : **Ajouter une photo** → **Duo**. Une personne déjà familière peut retrouver Duo directement selon sa préférence, mais aucun appareil photo ne s’ouvre seul à la fin d’une sortie.

Une phrase suffit : « Ton regard et le lieu de ta sortie. » La photo ne prouve pas la totalité du parcours ; elle raconte le moment.

## 12.2 Trois capacités distinctes

| Capacité | Condition | Expérience |
|---|---|---|
| Photo simple | Une caméra ou galerie disponible | Une image avec trace/statistiques. |
| Duo séquentiel | Caméras avant/arrière disponibles séparément | Arrière puis selfie, réunis ensuite. |
| Duo simultané | Appareil, OS, format et implémentation réellement compatibles | Deux vues capturées dans une session supportée. |

Apple expose des sessions multi-caméras avec contrôles de support et de coût matériel/pression. Android expose la caméra concurrente mais le support dépend du matériel et des use cases. Une configuration de preview/vidéo ne prouve pas que la capture photo double fonctionne. [S18, S19]

Expo Camera documente une seule preview active à la fois. Monter deux `CameraView` n’est donc pas la recette d’un BeReal simultané. Le repli séquentiel est une première capacité raisonnable ; la simultanéité exige un adaptateur natif testé si le stack l’impose. [S20]

## 12.3 Flux séquentiel de référence

1. Vérifier que l’activité est finalisée localement (`sessionPhase=saved`), qu’aucune collecte n’est active sur cet appareil et que l’utilisateur demande volontairement la caméra.
2. Informer de se mettre à l’arrêt dans un endroit sûr. Aucun défi de capture photo en roulant.
3. Demander la permission caméra si nécessaire, sans microphone pour de simples photos.
4. Montrer la caméra arrière et le repère de composition.
5. Une pression capture la première image ; stocker immédiatement un brouillon privé.
6. Passer à la caméra avant après disponibilité effective ; retour visuel court et déclenchement avec choix clair, pas photo invisible surprise.
7. Une preview montre les deux images ; boutons reprendre une seule photo, inverser les vues, continuer.
8. Retour au même éditeur de partage et à la même activité.

Deux pressions de capture explicites sont acceptables si elles rendent le processus fiable et compréhensible. Ne pas sacrifier contrôle et cadrage à un slogan « un tap ». On peut proposer une capture séquentielle guidée avec un petit compte à rebours choisi, mais elle ne se prétend jamais simultanée.

## 12.4 Flux simultané

Détecter les capacités une fois par contexte matériel pertinent et les revérifier avant allocation. Choisir résolution, fréquence et configuration que le téléphone peut tenir. Si pression thermique ou erreur, libérer proprement les ressources et proposer le séquentiel sans perdre la première photo.

Mesurer les timestamps effectifs des deux captures. « Simultané » ne signifie pas une égalité au milliseconde garantie. Ne pas publier une mention d’authenticité temporelle plus précise que les données ne le permettent.

Pas de boucle infinie de réallocation des caméras, ni de blocage complet si l’appel ou une autre application occupe une caméra.

## 12.5 Composition visuelle

**Duo Fenêtre :** arrière-plan photo arrière ; selfie environ 24 % de la largeur du canvas, dans le tiers supérieur droit ; rayon 24–32 px au rendu 1080 ; bord neutre fin. Texte et logo vivent dans d’autres zones. Le visage n’est pas placé sous des métriques.

**Duo Split :** deux cadres de largeur identique ; séparation franche fine ; bande de données sous les photos. Pas de miniatures minuscules. La personne peut inverser les images.

**Duo Éditorial :** extension graphique : date générale choisie, typographie et bords plus travaillés, sans fausse datation ni falsification de distance.

Le cadrage automatique peut éviter une zone de visage détectée localement si cette capacité est disponible. Il ne fait aucune identification de la personne. Un réglage manuel simple reste disponible ; pas de retouche corporelle automatique.

## 12.6 Détails techniques à ne pas oublier

Orientation EXIF, rotation, mirroring de preview selfie, rendu final, recadrage, profil colorimétrique et redimensionnement doivent être cohérents. Proposer un choix explicite pour miroir si nécessaire ; ne pas laisser un texte sur un tee-shirt devenir illisible par erreur.

Les originaux sont conservés dans le brouillon selon la politique locale ; les exports enlèvent les métadonnées sensibles. Les photographies ne sont téléversées que lorsqu’une fonction l’exige et après action explicite.

Politique de départ proposée : brouillon privé local jusqu’à suppression ou nettoyage annoncé après sept jours ; proposer Enregistrer si la personne souhaite le conserver indépendamment. Ne pas détruire silencieusement les seules photos encore attendues dans un export en cours. Respecter le choix de suppression du compte.

Caméra refusée, avant indisponible, arrière indisponible, appel entrant, stockage plein, app interrompue, mode paysage, téléphone chaud et permission révoquée ont tous un repli photo simple/galerie. La sortie sportive demeure intacte.

---

# 13. Spécification des médias et du renderer

## 13.1 Formats de référence

| Destination graphique | Résolution cible | Usage |
|---|---:|---|
| Story / vidéo verticale | 1080 × 1920 | Carte, Photo, Duo, Replay. |
| Publication portrait | 1080 × 1350 | Résultat et photo. |
| Carré | 1080 × 1080 | Messagerie, aperçu et publication. |
| Sticker | Canvas jusqu’à 1080 px utile, alpha conservé | Trace/chiffres sans fond. |
| Preview dans l’app | Résolution adaptée à l’écran | Même mise en page, mêmes données. |

Ce sont des sorties GRYD proposées, pas une liste exhaustive des formats imposés par les plateformes. Revalider les dimensions acceptées par chaque intégration et version.

Médias statiques : PNG pour alpha/graphisme, JPEG de bonne qualité pour photo opaque si cela réduit utilement le poids. Vidéo de base : conteneur et encodage natif compatibles testés, par exemple MP4/H.264, sans musique requise. Aucune bibliothèque à licence inconnue ajoutée pour rendre un faux GIF.

## 13.2 Hiérarchie visuelle

En mode Sport : photo ou carte, distance, durée/allure ou vitesse, identité. En mode Terrain : conséquence vérifiée, forme du territoire, ligne sportive. Une seule métrique domine.

Pour 1080 × 1920 : réserves initiales 80 px latéraux, 180 px en haut, 300 px en bas pour les informations essentielles. Tester ces réserves dans les apps destinataires ; ne pas les présenter comme safe zones garanties universellement.

Titre court 56–76 px ; métrique majeure 112–144 px ; texte secondaire 34–42 px. La mise en page recompose les textes longs ; elle ne réduit pas le corps jusqu’à l’illisibilité.

Les dates, unités, noms et pluriels suivent la langue de la personne. Un nombre français « 5,2 km » ne devient pas « 5.200 km » par parsing ambigu.

## 13.3 Le rendu ne dépend pas de la capture de l’interface

Le renderer prend un manifeste et génère le média hors des composants visibles. Il ne photographie pas la page complète avec barre iOS, erreurs, onglets, permission et boutons.

Une capture générique de vue peut retourner une carte noire ou incomplète si le fournisseur utilise une surface native/GL non capturée. Auditer le moteur réel et son API de snapshot. Attendre explicitement ressources, fontes et tuiles ou utiliser un rendu vectoriel autonome supporté.

Repli : **trace sur fond graphique sans carte**, pleinement utilisable et identifié, lorsque les tuiles ou leur licence d’export ne sont pas disponibles. Ne pas télécharger des captures propriétaires de Strava ni réutiliser des tuiles sans droits.

Les crédits cartographiques obligatoires restent présents, séparés de la signature GRYD. Si une règle de destination ne permet pas le type d’incrustation nécessaire, choisir un rendu sans basemap sous licence concernée plutôt que retirer son attribution obligatoire.

## 13.4 Contrat du ShareManifest

```ts
// Contrat à adapter au dépôt ; exemple de champs, pas fichier compilable complet.
interface ShareManifest {
  activityId: string;
  metricRevision: string;
  outcomeRevision?: string;
  privacyRevision: string;
  templateId: string;
  templateVersion: string;
  locale: string;
  unitSystem: 'metric' | 'imperial';
  output: 'story' | 'portrait' | 'square' | 'sticker';
  narrative: 'sport' | 'territory' | 'crew' | 'memory';
  destinationPolicyId: string;
  safeGeometryRef?: string;
  selectedMetrics: string[];
  mediaRefs: string[]; // références autorisées, pas URLs arbitraires non contrôlées
  watermarkPolicy: 'brand_signature' | 'destination_clean';
}
```

La preview et le fichier final utilisent le même manifeste résolu. Une modification de confidentialité, de résultat ou de source invalide le cache correspondant. La clé de cache inclut aussi style/version, média, langue, unités, ratio et politique de destination.

Le renderer n’appelle pas arbitrairement l’API des traces privées depuis une URL publique. Le résultat partagé possède son propre contrat d’autorisation.

## 13.5 Vidéo

Replay de départ 7–10 secondes : contexte bref, progression de la trace, conséquence éventuelle puis frame finale stable. Une sortie aller-retour n’est pas animée comme une boucle fermée. Un parcours lacunaire conserve les ruptures.

La vitesse du dessin est une lecture accélérée, pas une fausse vitesse du cycliste. Ne pas afficher 80 km/h parce que l’animation traverse l’écran rapidement.

Le rendu 2D local vient avant le survol 3D. Commencer une nouvelle sortie reporte ou annule une génération lourde ; la collecte a priorité. Les photos du Duo restent fixes dans la première variante vidéo ; ajouter du zoom léger suffit, pas besoin de générer un visage animé par IA.

Pas de musique tiers intégrée sans licence. L’utilisateur peut en ajouter dans son réseau social. Réduire les traitements si l’appareil chauffe ; garder le statique disponible.

---

# 14. Watermark : petit, chartreuse, constant et lisible

## 14.1 Signature retenue

Utiliser **l’asset officiel GRYD fourni dans le dépôt**, idéalement SVG/vectoriel, avec un rendu PNG de secours. Ne pas inventer un nouveau logo pour terminer cette mission. Le nom est GRYD, pas GRID.

La signature est chartreuse `#C9FF38`, petite, opaque ou presque opaque, avec proportions conservées. Sa lisibilité prime sur un effet de transparence qui la ferait disparaître.

La couleur du parcours, une LUT photo et un style payant ne recolorent pas le logo. Il se compose après le traitement de la photographie.

## 14.2 Placement de référence

| Composition | Position initiale, canvas 1080 | Protection |
|---|---|---|
| Story Carte/Photo/Duo | Haut gauche : x = 80, y = 216 ; largeur 140–160 px | Zone claire autour d’au moins 16 px ; selfie en haut droite. |
| Publication 4:5 ou carré | Haut gauche : x = 64, y = 64 ; largeur 130–150 px | Ne couvre ni visage ni chiffre. |
| Variante avec sujet en haut gauche | Bas centré dans la zone sûre, avant la réserve basse | Variante définie par template, pas position aléatoire à chaque export. |
| Sticker transparent | Signature intégrée sous la composition | Pas de grand pavé de marque ; variante de contraste maîtrisée. |
| Replay | Même ancrage que le template statique | Pas de seconde animation publicitaire ni de carton final obligatoire. |

Ces coordonnées sont des valeurs de départ GRYD ; vérifier sur les exports finaux et les interfaces des destinations. Le logo doit être reconnaissable à la taille d’une Story sur téléphone, pas uniquement sur l’image 1080 ouverte en plein écran.

## 14.3 Contraste

Chartreuse sur une photo très claire peut devenir illisible. Employer un petit fond carbone local ou une ombre de contraste très sobre, pas une grande étiquette opaque couvrant la scène. Tester la luminance autour du logo ; choisir un ancrage alternatif prédéfini si nécessaire.

Ne pas déplacer automatiquement le watermark à un endroit imprévisible à chaque modification : une signature répétée construit une reconnaissance plus cohérente.

## 14.4 Ce que le watermark ne fait pas

Il n’est ni un lien, ni une preuve d’authenticité sportive, ni un mécanisme d’attribution complet. Les personnes peuvent recadrer une image. Ne pas créer des pénalités contre le recadrage ou un filigrane qui gâche leur souvenir.

L’accès payant ne vend pas la suppression d’un énorme watermark créé artificiellement. Gratuit et payant reçoivent tous deux une signature discrète dans les destinations compatibles.

---

# 15. Destinations sociales : une intégration réaliste, pas une promesse magique

## 15.1 Contrat par destination

| Destination | Première implémentation raisonnable | Vérification indispensable |
|---|---|---|
| Instagram Story | Média préparé, mécanisme natif autorisé ou feuille système ; sauvegarde en repli | Acceptation image/vidéo/alpha, contexte, version de l’app ; lien cliquable non présumé. |
| Instagram post/Reel | Ratio adapté, fichier réel, publication confirmée dans Instagram | Pas de publication personnelle en tâche de fond supposée. |
| TikTok | Rendu compatible avec ses règles ; transfert seulement via mécanisme autorisé | Pas de logo/promotion incrustée dans l’intégration ; consentement et audit si Direct Post. |
| Snapchat | Partage de média standard | Une Lens est une intégration distincte, pas un PNG renommé. |
| WhatsApp/Messages | Image et lien lorsque transmis ensemble par le destinataire | Ordre, texte, lien réellement conservés. |
| Enregistrement local | Image ou vidéo, statut de sauvegarde réel | Photos autorisées, disque, format, album. |
| Crew interne | Carte d’activité et médias consentis | Droits de lecture, blocage, suppression, modération. |

Les pages détaillées de l’intégration Meta Story n’ont pas été accessibles lors de cette recherche. Aucun nom d’endpoint ou transfert automatique de sticker de lien n’est donc garanti ici. L’agent doit consulter la documentation accessible au moment d’implémenter et tester le comportement sur appareil.

## 15.2 Exception indispensable : TikTok

Les règles TikTok consultées, mises à jour le 4 août 2026, interdisent aux applications/intégrations de superposer ou inclure un nom de marque, logo, watermark, lien ou texte promotionnel dans le contenu partagé vers TikTok. Les flux Direct Post exigent aussi le contrôle de l’utilisateur et peuvent être limités avant audit. [S28]

**Arbitrage V5 :** conserver un master GRYD signé pour les destinations compatibles et produire une variante TikTok sans signature promotionnelle incrustée. Le label de l’éditeur peut dire : « Version adaptée à TikTok ». L’identité graphique reste reconnaissable par sa composition, sans publicité ajoutée.

Ne pas contourner cette règle en appelant le même transfert « export manuel », en cachant le logo dans un coin ou en forçant un hashtag dans le texte. Si les conditions empêchent l’expérience demandée, modifier le rendu ou différer l’intégration concernée.

Lorsque la destination d’une feuille système générique ne peut pas être connue avant l’export, proposer une version sans promotion compatible avec le périmètre testé, et un export signé explicitement destiné aux usages autorisés. Ne pas utiliser l’inconnu comme exemption de conformité.

## 15.3 Contrôle utilisateur

La dernière preview est exactement le fichier envoyé. L’utilisateur choisit/valide la destination et les informations. Copier un lien nécessite une action compréhensible ; ne pas écraser discrètement le presse-papiers à chaque aperçu.

Événements distincts : aperçu prêt, fichier créé, feuille ouverte, transfert confirmé si observable, lien consulté, publication effectivement confirmée uniquement si l’API en fournit la preuve. Un retour dans GRYD après Instagram ne démontre pas la publication d’une Story.

## 15.4 Liens et QR

Un lien opaque et révocable mène à l’activité, au crew ou au défi autorisés. Le destinataire installé ouvre le contexte ; sans app il voit une page web courte et la bonne invitation.

Après connexion, retrouver l’intention. Après installation, utiliser les mécanismes autorisés et un code de secours ; ne pas promettre un deferred deep link universel ou employer du fingerprinting caché.

Un QR est utile pour un organisateur, un événement ou deux personnes côte à côte. Il n’est pas obligatoirement collé sur chaque selfie. Le QR et le lien partagent la même politique de révocation et de droits.

---

# 16. Confidentialité du souvenir et du parcours

Le masquage d’un départ ne garantit pas qu’un domicile soit impossible à déduire. Strava distingue d’ailleurs visibilité de carte, accès à l’activité et transfert des paramètres à d’autres services. [S16]

GRYD traite donc séparément :

1. trace privée brute et segments ;
2. propriété compétitive autorisée ;
3. média public minimisé.

Avant rendu public, retirer les portions privées, horaires précis non nécessaires, labels sensibles, photos non choisies, métadonnées EXIF et données de santé non autorisées. Une silhouette territoriale peut aussi révéler une zone privée : proposer une généralisation clairement qualifiée ou **Résultat sans carte**.

Les photos Duo ne sont pas automatiquement publiées dans le crew. Une photo d’un partenaire ou d’un groupe n’autorise pas à afficher tous leurs noms ou leurs statistiques ; consentement et signalement restent nécessaires.

Les médias hébergés et liens peuvent être révoqués. Une image déjà téléchargée ou publiée sur un autre réseau n’est pas supprimable à distance par GRYD. Expliquer cette limite, sans promesse « effacement partout ».

Les données de santé et les traces privées ne servent pas au ciblage publicitaire. Refuser un suivi publicitaire ne réduit ni la qualité de sauvegarde ni les récompenses.

Le renderer public ne doit jamais filtrer seulement côté client une réponse API contenant toute la trace privée. Tester les accès avec l’ID d’un autre utilisateur, les caches, URLs signées, brouillons et ancienne révision de confidentialité.

Enfin, s’inspirer de Strava ne suppose pas d’utiliser son API. La politique consultée restreint notamment l’affichage des données à autrui et les usages concurrents des API Materials. Le benchmark public de comportement ne nécessite pas de récupérer des données personnelles via cette API. [S30]

---

# 17. Repenser la personnalisation : vendre une identité visible, pas une collection de cadenas

## 17.1 Ce qui peut donner envie d’acheter

Le test n’est pas « est-ce techniquement facile à produire ? ». C’est : **est-ce que la personne préfère réellement se montrer avec cette création ?**

Une collection réussie modifie une présentation complète : photographie, rythme typographique, place de la trace, signature et éventuellement apparence du profil. Elle fonctionne sur plusieurs activités et reste reconnaissable sans être surchargée.

Les exemples Discord, VSCO et Snapchat montrent différentes manières de valoriser l’expression personnelle et les bibliothèques créatives. Ils ne prouvent pas le montant que les utilisateurs de GRYD accepteront de payer. [S21–S23]

### Retenir

Aperçu sur ses propres photos/données, avant/après immédiat, création cohérente, propriété des objets clairement expliquée, styles gratuits réellement publiables.

### Refuser

Payer pour une emoji ordinaire, une sauvegarde, un signalement, la lisibilité, la confidentialité, la suppression d’une erreur ou l’accès à ses données. Ne pas vendre dix nuances très proches comme dix créations différentes. Ne pas multiplier les raretés « légendaires » arbitraires.

## 17.2 Les surfaces personnalisables

- **Partage :** composition, cadre, traitement photo, motif de trace d’export et animation de résultat.
- **Profil :** cadre d’avatar, bannière sobre et accent choisi.
- **Crew :** emblème/bannière quand le contrat de licence collective existe, pas accès à des droits de modération.
- **Application personnelle :** thème de lecture et éventuelle icône alternative après prise en charge native.

La carte compétitive conserve ses codes. Un skin rouge ne peut pas faire passer sa zone pour une erreur, ni un contour spécial pour une protection réelle. Les effets sont désactivés dans les métriques live si la lisibilité se dégrade.

## 17.3 Architecture économique légère

Créer des recettes déclaratives validées : palette, grille, fontes licenciées, texture, rayon, traitement photo et placements. Un renderer les interprète. Pas une nouvelle page ou un composant entier par skin.

Ne pas télécharger de code exécutable pour changer un style. Le schéma d’asset limite explicitement ce qui est autorisé ; une configuration distante ne peut pas injecter HTML, script ou URL arbitraire dans le renderer.

Les traitements locaux réduisent les coûts de calcul serveur. Ils n’annulent pas design, QA, support, bande passante, licences, frais du Store, modération ou maintenance.

---

# 18. Catalogue concret : gratuit, gagné et acheté

## 18.1 Base gratuite permanente

| ID | Actif/capacité | Contenu |
|---|---|---|
| F01 | Signature Sport | Carte sombre, trace chartreuse, chiffres sobres. |
| F02 | Papier Clair | Carte/graphisme clair à fort contraste. |
| F03 | Couleurs essentielles | Chartreuse, blanc, orange chaud ; aucun achat pour la lisibilité. |
| F04 | Photo Sport | Photo + données ; Original, Noir et blanc, Contraste doux. |
| F05 | Duo Fenêtre | Deux photos, données lisibles, mise en page principale. |
| F06 | Duo Split | Deux images de même importance. |
| F07 | Stickers essentiels | Trace seule, chiffres seuls, trace+chiffres ; alpha et contraste. |
| F08 | Souvenirs de base | Avant/après statique, invitation, bilan et replay 2D standard quand livrés. |

Les fonctions peuvent être livrées en plusieurs lots, mais restent gratuites lorsqu’elles arrivent. Aucun cadenas « acheter » sur une fonction encore inexistante.

## 18.2 Objets gagnés : proposition visuelle à relier à la progression existante

| ID | Objet | Différence visible et rôle |
|---|---|---|
| G01 | Cadre Premier pas | Anneau fin avec petit repère de départ, distinct d’un badge certifié. |
| G02 | Sticker Ligne | Composition horizontale trace + métriques compactes. |
| G03 | Texture Papier | Fond léger pour souvenirs cartographiques, pas artefacts sur la carte live. |
| G04 | Emblèmes Ligne/Boucle | Choix réversible d’identité ; pas compétence de capture. |
| G05 | Animation Contour | Apparition courte du résultat, Reduce Motion prévu. |
| G06 | Accents de profil | Palette additionnelle contrôlée, sans changer les couleurs du jeu. |
| G07 | Photo Éditorial gratuit | Photo dominante et légende basse simple. |
| G08 | Cadre Quartier | Contour géométrique avec coin propriétaire discret. |
| G09 | Trace Ruban/Repères | Variantes d’export seulement ; pas précision différente. |
| G10 | Réaction Coéquipier | Illustration licenciée pour le crew, sans rang de popularité. |
| G11 | Affiche Atlas gagnée | Bilan de sorties avec une composition gratuite spécifique. |
| G12 | Collection Monochrome | Variante sobre des actifs gagnés. |
| G13 | Typographie d’export | Police supplémentaire licenciée, pas texte système. |
| G14 | Blason personnel | Emblème de collection ; ne ressemble pas au rôle responsable. |
| G15 | Transition Trait | Lecture vidéo locale simple. |
| G16 | Texture Terrain | Texture discrète de souvenir. |
| G17 | Souvenir à deux | Mise en page de deux participants consentants ; ne débloque pas le Duo caméra de base déjà gratuit. |
| G18 | Cadre Continu | Cadre permanent lié à l’expérience. |
| G19 | Cartographe GRYD | Emblème de niveau, sans bonus territorial. |

Les badges **Première sortie**, **Première boucle**, **Première conquête** et les records ne sont pas des produits cosmétiques en vente. Ils décrivent des événements prouvés, et ne sont pas dessinés comme une simple offre de boutique.

## 18.3 Packs payants de lancement

Trois offres maximum visibles dans la première boutique. Prix France **proposés**, à tester ; pas des tarifs de marché prétendument optimaux.

| Offre | Prix proposé | Actifs inclus sans doublon | Droit |
|---|---:|---|---|
| **Éditorial** | **2,99 €** | P01 composition Cover ; P02 composition Grand Chiffre ; P03 cadre Filet ; P04 cadre Index ; P05 traitement photo Mat ; P06 traitement photo Lumière douce | Achat unique personnel, permanent. |
| **Duo Studio** | **4,99 €** | D01 composition Diptyque ; D02 composition Fenêtre XL ; D03 cadre Angle ; D04 cadre Film ; D05 traitement Grain léger ; D06 animation Duo Reveal | Achat unique ; le fonctionnement double caméra n’est pas payant. |
| **Collection Atlas** | **6,99 €** | A01 affiche Panorama ; A02 bilan Cartouche ; A03 fond Minéral ; A04 fond Encre ; A05 trace Fil technique ; A06 animation Atlas | Achat unique ; distinct de G11 gagné. |

**Précisions de création :** Grain léger doit rester désactivable et ne pas rendre les visages artificiels. Aucun filtre ne modifie les chiffres. Animation Duo Reveal travaille les photos consenties par recadrage/fondu ; elle ne génère pas une vidéo faussement prise pendant l’effort.

Ces noms et IDs sont des propositions de catalogue, pas des fichiers existants. Le gate de livraison vérifie que chaque actif est réellement dessiné, licencié, testé, référencé et exportable avant création du produit public.

Les anciennes collections/Founders achetées ne disparaissent pas. Construire une matrice ancienne référence → droits conservés → nouvelle présentation, sans retirer ce qui a été vendu. Ne pas revendre sous un nouveau nom exactement le même asset sans le signaler.

## 18.4 Abonnement : seulement après valeur récurrente

Conserver comme **hypothèse différée** GRYD Plus à **5,99 €/mois ou 39,99 €/an**. Ne pas le mettre en vente dans le correctif si seuls deux filtres statiques sont disponibles.

Valeur éventuelle : bibliothèque créative alimentée, comparaison avancée d’activités, recettes enregistrées supplémentaires et rendu avancé réellement livré. La bibliothèque Plus peut contenir des styles temporaires d’usage ; cela doit être distinct des packs permanents.

Ne pas promettre douze survols 3D par mois sans modèle de coût vérifié, ni « tout le catalogue à vie » si l’abonnement cesse. Les collections achetées/gagnées restent acquises ; les exports déjà créés restent accessibles ; l’activité personnelle reste consultable.

Les règles Apple insistent sur une valeur continue et une présentation claire de l’abonnement. [S32]

## 18.5 Personnalisation crew : différer l’ambiguïté de licence

Le fondateur a besoin d’invitations et d’une identité gratuite fonctionnelle. La vente d’une décoration pour toute une division soulève qui achète, qui possède, quel crew garde le droit, ce qui arrive au départ du payeur et au remboursement.

Ne pas résoudre cela avec `crew.isPremium = true`. Conserver l’offre collective hors vente tant que les cas de licence, suppression, transfert de responsabilité, remboursement et restauration ne sont pas testés. Les packs personnels peuvent s’afficher sur le profil du membre sans modifier les droits du groupe.

---

# 19. Niveaux et récompenses : conserver la progression, améliorer ce qui est reçu

## 19.1 Ne pas dérégler l’économie pendant le correctif

La V4 propose 125 XP pour une journée recevable, 25 XP additionnels pour une intention, trois meilleures journées et 450 XP maximum hebdomadaires. Ce sont des **choix de jeu**, pas un plan d’entraînement. Leur statut réel doit être audité avant application.

La V5 n’impose pas une migration d’XP dans le hotfix. Elle remplace la présentation peu désirable des récompenses par les créations définies ci-dessus, tout en conservant les droits déjà acquis. Les seuils ci-dessous rappellent la V4 pour éviter une quatrième grille contradictoire.

## 19.2 Table unifiée de référence

| Niveau | XP cumulée V4 | Récompense visuelle V5, sous réserve de migration |
|---|---:|---|
| 1 | 0 | F01–F08 selon capacités réellement livrées. |
| 2 | 100 | G01 Premier pas. |
| 3 | 300 | G02 Sticker Ligne. |
| 4 | 550 | G03 Papier. |
| 5 | 850 | G04 Emblème Ligne/Boucle. |
| 6 | 1 200 | G05 Contour. |
| 7 | 1 600 | G06 Accents. |
| 8 | 2 050 | G07 Photo Éditorial gratuit. |
| 9 | 2 550 | G08 Quartier. |
| 10 | 3 100 | G09 Ruban/Repères. |
| 11 | 3 700 | G10 Coéquipier. |
| 12 | 4 300 | G11 Affiche Atlas gagnée. |
| 13 | 4 900 | G12 Monochrome. |
| 14 | 5 500 | G13 Typographie d’export. |
| 15 | 6 100 | G14 Blason. |
| 16 | 6 700 | G15 Transition Trait. |
| 17 | 7 300 | G16 Terrain. |
| 18 | 7 900 | G17 Souvenir à deux, partenaires consentants. |
| 19 | 8 500 | G18 Continu. |
| 20 | 9 100 | G19 Cartographe. |

Ne pas annoncer une récompense au prochain niveau tant que son asset n’existe pas. Si un ancien objet est remplacé, ajouter le nouveau droit sans effacer le précédent vendu/gagné, ou appliquer une migration acceptée et documentée.

## 19.3 Attribution automatique, plaisir de l’essai

Un niveau atteint crédite l’objet automatiquement. Le résultat montre au plus une carte courte : **« Nouveau style obtenu — Essayer »**. Toucher Essayer affiche ce style sur la sortie, sans imposer un export.

Pas de pop-up pour chaque palier, pas de cinq boutons Réclamer, pas de réclame boutique mêlée à une récompense gagnée. Le passage de niveau et le palier saison se regroupent.

La collection classe **Possédés**, **À gagner** et **À découvrir**. Les objets payants indiquent le prix ; les objets gagnables indiquent le vrai déclencheur. « Équipé » et « Possédé » ne sont pas le même statut.

## 19.4 Aucun achat de légitimité

Payer n’ajoute pas une sortie validée, une fréquence cardiaque, une première conquête, une photo « authentique » ou un rang. Pas d’XP pour autoriser le tracking publicitaire, poster une Story, noter l’application ou acheter.

L’XP commune n’augmente pas la puissance territoriale Run/Bike. Les différences de vitesse et de distance entre sports n’enrichissent pas artificiellement le catalogue d’une seule discipline.

Les récompenses ne doivent pas favoriser sorties nocturnes risquées, forte chaleur, vitesse en descente ou séries quotidiennes punitives. Le repos ne détruit pas les objets acquis.

---

# 20. Prix, coûts et droits : rendre la vente propre

## 20.1 D’où vient le coût réel

Un PNG déjà créé et un traitement exécuté sur téléphone peuvent avoir un faible coût marginal de calcul serveur. Ils ne sont pas gratuits à concevoir ni à exploiter.

Compter : création graphique, licences, QA multi-appareils, téléchargement d’assets, stockage des médias choisis, bande passante, support, modération, taxes et frais de distribution. Un rendu 3D avec tuiles terrain et calcul cloud appartient à une autre économie.

**Décision :** vendre d’abord des créations locales réutilisables, sans générer une image IA côté serveur à chaque partage. Les grands masters utilisateurs ne sont pas stockés en permanence sans besoin.

## 20.2 Illustration de marge, pas prévision financière

Hypothèse arithmétique : prix TTC France, taxe 20 %, commission hypothétique de 15 % ou 30 %. Les contrats et relevés du Store font foi ; le taux réduit Small Business est conditionnel, pas automatique. [S33]

```text
Recette simplifiée avant autres coûts = TTC / 1,20 × (1 − commission)
```

| Prix | Hypothèse 15 % | Hypothèse 30 % |
|---|---:|---:|
| 2,99 € | 2,12 € | 1,74 € |
| 4,99 € | 3,53 € | 2,91 € |
| 6,99 € | 4,95 € | 4,08 € |

Ces sommes ne sont ni un bénéfice, ni le montant garanti versé. Les coûts réels sont mesurés avant promesse de vidéo illimitée.

## 20.3 Architecture des achats

Utiliser le catalogue StoreKit/applicable à la distribution réelle pour les biens numériques, avec prix localisé retourné par le Store. Les règles et exceptions varient selon pays et programme ; le document ne prescrit pas un contournement Stripe. [S31]

Les packs personnels sont des droits non consommables restaurables. Chaque produit a une version de contenu, des IDs d’actifs, un bénéficiaire, des plateformes, et des règles d’export. Les remboursements et révocations sont traités par le service de droits, pas seulement par un flag UI.

Ne jamais dire « achat réussi » avant confirmation. États à couvrir : pending, annulé, erreur, reconnu, restauré, remboursé, produit indisponible. Une annulation d’achat ne devient pas une alerte rouge anxiogène.

## 20.4 Même autorisation dans l’éditeur et le renderer

Le renderer vérifie les droits du style choisi. Un cadenas dans la galerie seul n’empêche pas un export payant obtenu en changeant un paramètre.

Mode hors ligne : droits connus et politique de cache explicite. Ne pas retirer immédiatement un droit permanent valide à cause d’un serveur indisponible. À l’inverse, ne pas stocker éternellement `isPremium=true` sur le client.

Après expiration Plus, les fichiers déjà exportés restent visibles. Une nouvelle création utilisant un asset exclusivement sous abonnement nécessite le droit actuel, avec repli gratuit sans perte du brouillon.

## 20.5 UX commerciale

Découverte depuis **Personnaliser** ou Style dans le partage. Aperçu vrai sur sa photo, sans achat ni publication. Bouton **Débloquer — prix localisé** ; texte explicite **Achat unique** ou **Abonnement**.

Après achat : retour au même brouillon, même données, même destination. Aucun retour à l’accueil. Restauration et gestion des abonnements disponibles dans Compte.

Pas de promotion pendant l’enregistrement, la récupération d’un incident, le refus de permission ou la première confirmation de sauvegarde. Ne pas exploiter une activité perdue pour vendre une « assurance sortie ».

---

# 21. Classements : faire naître une rivalité utile, pas une liste inaccessible

## 21.1 Ce que les références montrent réellement

INTVL présente des classements à différentes échelles. Strava propose aussi une reconnaissance locale qui ne se limite pas à la vitesse avec Local Legends. Duolingo montre une approche de ligues hebdomadaires dans un autre domaine. Ces descriptions ne démontrent pas la meilleure règle de classement pour GRYD. [S25, S26, S29]

Une expérimentation de l’équipe de l’Annenberg School a étudié des conditions sociales comparatives dans un programme d’exercice. Son contexte de participants et de séances ne permet pas de promettre la même hausse d’activité pour GRYD. Elle justifie surtout de **tester** l’effet de comparaisons sociales cadrées plutôt que d’affirmer que tout leaderboard motive tout le monde. [S34]

## 21.2 Décision d’interface

Dans le détail de carte ou de crew, ouvrir **Classement**. Il ne devient pas un quatrième onglet principal.

En-tête : discipline explicite. Première vue : **Autour de moi** si localisation autorisée ou **Ville choisie**. Une commande de périmètre propose Ville, Pays, Monde, Amis, Crew. « Autour de moi » ne révèle pas les personnes en train de se déplacer.

Afficher le joueur et quelques positions voisines avant un podium décoratif. Le haut du classement reste accessible. Ligne : rang, identité publique autorisée, valeur avec unité, contexte de période. Pas d’immense drapeau répété, de police minuscule ou d’avatars qui masquent les scores.

Une population de quatre personnes peut donner « 2 sur 4 participants ». Ne pas transformer cela en « Top 1 % de la ville ». Sans participants, dire qu’il n’existe pas encore de classement significatif ; ne pas créer un podium de robots.

## 21.3 Unité géographique et métier

Pour le classement territorial d’une ville, compter la surface autoritative **située dans cette ville**, pas toute la surface mondiale d’un joueur dont le profil indique Paris. Pour un pays, agréger les cellules/portions éligibles dans ce pays. La localisation du profil, l’adresse IP, la langue et le drapeau ne servent pas de preuve de nationalité.

Les découpages géographiques possèdent des IDs et versions. Les limites peuvent être chevauchantes : définir la relation administrative et éviter le double compte lors d’un agrégat national. Une vue « autour de moi » explique son périmètre ou rayon ; elle n’est pas confondue avec un classement administratif.

Pas de mélange course, vélo musculaire, VAE ou activité intérieure dans un rang territorial commun. Les règles V4 sur l’admissibilité des sous-types sont auditées et conservées pendant P0 ; une extension n’est pas décidée par le composant de classement.

## 21.4 Deux classements maximum au départ

1. **Terrain actuel** : surface actuellement détenue dans le périmètre, avec révision et date de mise à jour.
2. **Participation du crew** : progression d’un objectif volontaire, comptée en participants/journées recevables, pas mélangée aux mètres carrés.

Un classement **Progression de la semaine** peut venir ensuite avec définition publiée : par exemple surface nouvellement attribuée pendant la période, dédupliquée par unité/joueur pour éviter le va-et-vient artificiel. Il doit distinguer gain brut, gain net et état actuel. Ne pas ajouter cette nouvelle règle au correctif recorder sans tests.

## 21.5 Tri, égalités, délais

Le rang repose sur une précision canonique, pas sur une valeur déjà arrondie dans l’UI. Deux valeurs réellement égales ont le même rang ; l’ordre stable d’affichage secondaire n’invente pas un vainqueur.

Distinguer classement provisoire, recalcul et clôture. Une activité synchronisée en retard peut être admissible selon la fenêtre publiée, pas selon une date fournie librement par le client. Une correction après clôture reste tracée et expliquée.

Une capture d’un classement pour partage embarque la période, la population et la révision. Le fichier ancien reste un souvenir à cette date ; il ne prétend pas afficher le rang actuel.

## 21.6 Préserver les moins compétitifs

La personne peut masquer sa présence publique au classement selon les règles de confidentialité retenues, consulter ses propres progrès et garder son crew. Ne pas conditionner l’accès aux créations gratuites à un podium public.

Récompenser aussi un accomplissement personnel ou collectif sans victoire. Un débutant peut partager un joli Duo après une sortie modeste ; il n’a pas besoin de battre un cycliste entraîné pour appartenir à GRYD.

---

# 22. Mécaniques de croissance : des boucles complètes, pas des astuces isolées

## 22.1 Principe

La viralité n’est pas le nombre de stickers, de hashtags ou de boutons. C’est le fait qu’un usage procure une valeur visible, qu’une personne choisisse de la partager, que le destinataire comprenne et qu’il puisse obtenir cette même valeur sans obstacle.

```text
Sortie fiable → souvenir désirable → partage volontaire
→ contexte d’arrivée conservé → adhésion/compte → première sortie recevable
→ propre souvenir partageable
```

Si le recorder coupe, la première boucle échoue. Si le média est joli mais l’invitation se perd, la boucle échoue aussi.

## 22.2 Huit boucles à mettre en place

| Boucle | Déclencheur réel | Objet partageable | Entrée du destinataire | Mesure finale |
|---|---|---|---|---|
| Souvenir sportif | Sortie sauvegardée | Carte/photo + données | Activité autorisée et explication courte | Première sortie du nouveau joueur. |
| Duo humain | Photo après l’effort | Visage + lieu + trace | Même activité, pas landing abstraite | Activation issue de ce type de média. |
| Fierté territoriale | Gain confirmé | Avant/après ou silhouette + delta | Zone publique généralisée | Première boucle recevable, pas simple clic. |
| Crew réel | Organisateur invite | Fiche + lien/QR | Division et groupe exacts | Adhésion puis contribution distincte. |
| Progrès personnel | Étape accomplie | Record ou niveau réellement gagné | Profil/résultat autorisé | Répétition d’usage, sans achat requis. |
| Objectif collectif | Plusieurs membres ont contribué | Bilan crew | Invitation/contextualisation | Nouveaux membres actifs du groupe. |
| Rendez-vous | Sortie volontaire organisée | Fiche événement et lieu public | Réponse explicite, rappel choisi | Participation consentie, pas GPS espion. |
| Bilan périodique | Données suffisantes | Semaine/saison/année | Souvenir et accès au jeu | Retour puis activité, pas seulement session. |

Chaque objet existe en format gratuit suffisamment beau. Le premium enrichit le style, pas la possibilité d’inviter.

## 22.3 Rendre le résultat compréhensible hors de l’application

Une Story doit répondre : qu’a-t-il fait, où approximativement, pourquoi cela compte, comment le rejoindre ? Elle ne peut pas supposer que le destinataire connaît « 47 hexes », un badge interne ou une monnaie inventée.

Formulations possibles, choisies sur des données réelles :

- « Ma sortie du jour. »
- « Première boucle. »
- « Un peu plus de terrain. »
- « Le crew avance. »
- « Cette semaine, chacun à son rythme. »

Le CTA textuel peut inviter, mais ne simule pas un bouton cliquable incrusté. Le deep link ou sticker de lien réellement disponible porte l’action. Ne pas écrire « Paris est à nous » pour 0,03 km² pris dans une rue.

## 22.4 Pourquoi lancer par communautés proches

Les modèles de diffusion sociale distinguent la simple circulation d’une information de l’adoption d’un comportement qui peut nécessiter plusieurs confirmations sociales. Ils ne prédisent pas le taux de conversion de GRYD, mais soutiennent une hypothèse utile : voir plusieurs personnes de son groupe utiliser le produit peut compter davantage qu’une impression isolée. [S35]

Choix proposé : tester avec quelques communautés existantes de 5–15 personnes, course et vélo séparément, avant un lancement public massif. Ce nombre organise l’observation ; il n’est pas une taille « optimale scientifiquement ».

L’organisateur reçoit un lien/QR, une fiche simple et une aide. Pas un CRM complexe. Le groupe fixe un objectif volontaire, crée quelques sorties et partage ce qu’il veut. Les inconnus éloignés ne sont pas affichés comme voisins pour donner une impression de densité.

## 22.5 Stratégie de contenu externe

Trois séries initiales suffisent :

1. **L’activité réelle :** lieu, sortie, trace et résultat. Une idée par vidéo.
2. **Le collectif :** trois personnes, jours différents, un objectif. Montrer la contribution sans prétendre qu’elles couraient ensemble.
3. **Le souvenir :** Duo/photo + ce que la personne raconte. Pas de script de faux témoignage.

Formats verticaux compréhensibles sans son, sous-titres courts, droits des personnes et du lieu, mentions commerciales quand nécessaires. Le même média ne se republie pas automatiquement partout sans adaptation de politique.

Ne pas lancer une campagne de dizaines de créateurs pendant que la collecte perd des sorties. Les contenus d’acquisition correspondent au build réellement disponible, pas à une maquette.

## 22.6 Mesurer le bouche-à-oreille honnêtement

Indicateur principal proposé : **nouveaux comptes ayant effectué une première activité recevable dans les 14 jours suivant une invitation attribuable**, rapportés au nombre d’utilisateurs actifs source.

Mesurer séparément : export, ouverture du lien, inscription, adhésion, première sortie, retour à 28 jours. Une installation ne vaut pas un joueur actif ; une ouverture de feuille de partage ne vaut pas une publication.

Un modèle exploratoire peut écrire :

```text
Nouveaux activés attribuables = destinataires uniques arrivés
× taux d’inscription observé × taux de première sortie observé
```

Ne pas multiplier des impressions sociales inconnues comme si elles étaient mesurées. Dédupliquer personnes, liens, campagnes et auto-invitations. Les conversions non attribuables existent ; les estimer séparément avec méthode et incertitude plutôt que les inventer.

## 22.7 Expériences à réaliser dans l’ordre

Après fiabilité :

- Résultat sportif dominant contre résultat territorial dominant lorsque les deux sont vrais.
- Photo simple contre Duo recommandé parmi les utilisateurs qui ont choisi une photo.
- Première Story automatique contre galerie initiale : comparer actions et annulations.
- Invitation vers le crew exact contre arrivée générique — priorité à la conservation de contexte, pas besoin de maintenir un parcours cassé pour tester longtemps.
- Rang proche de soi contre podium national ; surveiller retour et désactivation des classements.
- Pack cohérent contre objets à l’unité ; mesurer achat net de remboursement et usage du style.

Une petite session de test révèle des hésitations, pas une hausse statistiquement démontrée de rétention. Pour les crews, tenir compte des interactions entre membres et randomiser au bon niveau.

---

# 23. Communautés internes et notifications

## 23.1 Un espace social utile et limité

Conserver **Aperçu · Discussion · Membres** à l’intérieur du crew, sans nouveaux onglets principaux. L’aperçu montre identité, territoire actuel, objectif facultatif et dernières contributions.

Une activité et ses récompenses constituent une seule entrée. Les photos ne sont ajoutées que sur choix. Les réactions expriment une reconnaissance, pas un concours d’apparence. Pas de DM ouverts entre inconnus dans cette livraison.

Un membre peut partager une carte d’activité autorisée, un Duo choisi ou une invitation à une sortie. Le responsable ne reçoit aucun accès spécial aux traces privées, aux habitudes de déplacement ou aux données cardio.

## 23.2 Modération avant médias publics

Avant ouverture d’un fil UGC : signalement, blocage, retrait, voie de contact, droits de modération et traitement réel des alertes. Un bouton qui n’aboutit à aucun traitement ne suffit pas. Les règles App Store couvrent les risques des contenus utilisateurs. [S31]

Le blocage s’applique aux réactions, mentions, notifications, vues publiques et invitations pertinentes. Les signalements n’attribuent ni XP ni badge automatique. Une file de modération interne affiche des données minimisées et un historique d’action.

Version adulte selon la politique V4, sans prétendre qu’un label d’âge résout tous les risques. Si aucune capacité humaine de traitement n’existe, limiter temporairement discussion libre et médias publics ; les invitations et contributions structurées peuvent continuer.

## 23.3 Politique de notification

Ne pas demander la permission au premier lancement sans valeur. Proposer des catégories claires lorsque pertinentes. Les notifications marketing sont un consentement distinct, pas un effet automatique de l’autorisation OS.

Conserver le budget V4 proposé : au plus deux relances de jeu non indispensables par semaine et une par jour, silence 21 h–9 h local par défaut ; marketing désactivé par défaut. Les confirmations demandées et messages de sécurité/compte se traitent selon leur nécessité, sans servir d’alibi publicitaire.

| Événement | Surface initiale | Texte/action | Garde-fou |
|---|---|---|---|
| GPS dégradé pendant collecte | État live, haptique facultative | « Signal GPS faible. Certaines portions peuvent manquer. » | Pas de garantie de push si le processus est suspendu. |
| Sortie locale non envoyée | Journal/résultat | « Sortie conservée sur cet appareil. Envoi en attente. » | Ne pas répéter à chaque ouverture. |
| Analyse longue terminée | Push si demandé | « Ton résultat est prêt. » | Une fois par résultat ; supprimer si déjà vu. |
| Photo Duo disponible | Bouton dans le résultat | « Ajouter une photo Duo » | Pas de pop-up caméra ni push urgent. |
| Objectif crew atteint | Fil et digest | « Objectif commun terminé. » | Regrouper les contributions, respecter droits. |
| Invitation acceptée | Fil/inbox | « Un nouveau membre rejoint le crew. » | Pas de push à tout le groupe pour chaque arrivée. |
| Mention consentie | Push choisi | Message minimisé | Blocages, silence, anti-spam. |
| Territoire repris | Digest optionnel | « Une partie de ton terrain a changé. » | Ni harcèlement du rival ni injonction immédiate. |
| Nouveau style gagné | Résultat/collection | « Nouveau style obtenu. Essayer. » | Pas d’obligation de le publier. |
| Collection payante | Boutique ; marketing opt-in seulement | Aperçu honnête | Jamais durant incident, course ou sauvegarde. |
| Événement choisi | Rappel choisi | Lieu public et horaire | Annulation invalide le rappel ancien. |

Le mode repos coupe les relances sans vendre une protection invisible. Aucun « ton crew t’attend, tu le déçois » ; aucune déduction de blessure ou santé à partir d’une absence.

## 23.4 Scheduler et cohérence

Chaque job possède une clé de déduplication, un objet, une révision, une audience autorisée, une catégorie, un délai et une expiration. Avant envoi, vérifier existence, droits, consentement, silence, session sportive, blocage et statut lu.

Les notifications ne démarrent ni activité ni caméra à l’ouverture. Elles restaurent le contexte après la sortie si une session est déjà ouverte. Le badge d’inbox ne compte pas de promotions déguisées en actions nécessaires.

---

# 24. Les pages à modifier maintenant

Toutes les dimensions ci-dessous sont des valeurs GRYD de départ, à tester en unités logiques. Base de référence 390 × 844 iOS et 412 × 915 Android, safe areas natives, texte agrandi et reflow. Pas de capture décorative intégrée à la place d’une vraie carte.

## UI01 — Carte / session disponible

Carte bord à bord. Lieu et discipline lisibles en haut. Navigation Carte/Crew/Profil en bas. GO de hauteur minimale 60 au-dessus de la navigation. Un panneau compact raconte la situation pertinente, sans imposer un pourcentage de hauteur.

Si une session existe : remplacer la proposition de départ par **« Sortie en cours — Retrouver »**. Ne pas proposer une nouvelle course au premier rendu pendant la réhydratation. Aucune cloche/notification commerciale prioritaire sur cette session.

Lors de consultation manuelle, la caméra ne recentre pas continuellement. La commande Recentrer est accessible, avec une cible tactile d’au moins 48 × 48 et un pictogramme clair.

## UI02 — Sortie en cours

En-tête compact : sport et état vrai. Carte/trace centrale. Bas opaque : distance principale, durée, allure/vitesse. Commande Pause de 64 de haut, accessible au pouce. Pas de tab bar, boutique, partage ni changement de sport.

Afficher **« Arrêt détecté »** si l’auto-pause est active et certaine ; **« En pause »** si manuelle ; **« GPS indisponible »** si capteur absent. Ce ne sont pas trois orthographes de la même information.

Le compteur ne repart pas à zéro à la réouverture. Animation du point limitée et fidèle aux nouvelles positions reçues. Le mode contraste renforcé est gratuit.

## UI03 — Pause / reprise / interruption

Même contexte, mêmes métriques. Action primaire **Reprendre**. Action secondaire **Terminer la sortie**, séparée spatialement. Abandonner/effacer est dans un menu avec confirmation claire.

Après interruption : « Une sortie a été conservée sur cet appareil. » Présenter les segments acquis et les actions reprendre/terminer. Ne pas dire « récupérée intégralement » si une lacune existe.

## UI04 — Résultat

En haut, état de sauvegarde non anxiogène. Trace propre de 240–300 unités selon écran. Une statistique majeure, puis deux secondaires. L’impact territorial est confirmé ou présenté comme analyse en attente.

Action principale **Partager** ; action secondaire **Ajouter une photo** si utile ; détail sportif accessible. Une récompense auto-créditée se présente dans une ligne secondaire. Aucun paywall sur la confirmation d’activité enregistrée.

## UI05 — Détail sportif

Carte et métriques avec définition de durée ; choix d’une seule donnée pour colorer la trace ; splits et graphiques lisibles plus bas. Source et qualité dans le détail, pas un mur de diagnostics au-dessus des chiffres.

Un problème mène à une aide contextuelle sur cette activité : sauvegarde, envoi, analyse, référence minimisée. Ne pas demander au client de décrire toute sa session à partir de rien.

## UI06 — Composer

En-tête Partager, fermer, confidentialité. Aperçu au vrai ratio. Une ligne Carte/Photo/Sticker/Vidéo. Les options Style/Informations sont secondaires. Le bouton inférieur indique l’action exacte : Continuer, Ouvrir la destination ou Enregistrer.

Changer de style conserve données, photos et recadrage compatible. Changer de destination recalcule politique de marque/ratio, avec preview actualisée avant envoi. Ne jamais exporter l’ancien master silencieusement.

## UI07 — Capture Duo

Caméra dominante, explication d’une ligne, sortie discrète et bouton de capture évident. Pas de carte sous une preview transparente. Étape Arrière puis Selfie clairement visible sur le mode séquentiel.

Après capture : deux images, inverser, refaire l’une, confirmer. Pas de retouche physique, de timer imposé de deux minutes ou de classement d’apparence.

## UI08 — Collection / boutique

Titre **Personnaliser**. Vue Possédés en premier ; aperçu sur son avatar ou son dernier média. À gagner et Collections en sous-vues. Les achats uniques et abonnement sont visuellement distincts.

Trois collections commerciales maximum dans la première mise en vente. Pas une grille infinie de cadenas. Chaque fiche explique contenu exact, surfaces d’usage, permanent/temporaire et prix Store.

## UI09 — Classement

Lieu, période et sport toujours visibles. Sa position et ses voisins avant le podium. Pays/Monde via périmètre. Une phrase explique la mesure. Liste accessible et paginée, identité publique seulement.

Un état calcul en cours montre l’ancienne révision datée ou une indisponibilité, pas un rang 0. Partager son rang est volontaire et contextualisé.

## UI10 — Crew

Identité compacte, bouton Inviter, objectif facultatif, activité regroupée. Discussion et Membres accessibles sans multiplier les destinations. Un QR s’ouvre depuis Inviter, jamais plein écran au premier accès.

Si aucun crew : découvrir ou créer dans le sport actuel. Un groupe privé n’affiche pas ses photos de membres dans la page publique.

## UI11 — Réglages de sortie

Course et Vélo possèdent des préférences séparées : auto-pause si fiable, audio facultatif, unités, affichage des métriques. Les réglages de confidentialité restent communs avec exceptions explicites, pas dupliqués en trois pages contradictoires.

Une modification d’un paramètre qui change les métriques s’applique à la prochaine activité ou se journalise explicitement ; jamais de réécriture silencieuse du début de la sortie.

## UI12 — Diagnostic client

Depuis une activité : « Stockée sur cet appareil », « Envoyée », « Analyse », « Résultat ». Montrer ce qui manque et ce que peut faire l’utilisateur. Le rapport technique en un tap demande consentement avant d’inclure un parcours sensible.

Support, récupération et signalement restent gratuits. Une réponse de support ne promet pas de recréer les coordonnées jamais collectées.

---

# 25. Contrats transversaux et événements

## 25.1 Résultat canonique

Carte, détail sportif, crew, classement, récompense et partage lisent le même objet versionné. Distinguer au minimum :

```text
activityId, source, mode, recordingSegmentsRevision,
metricsRevision, metricDefinitionsVersion,
elapsedSeconds, recordedSeconds, movingSeconds,
recordedDistanceM, confidence/quality, validationStatus,
outcomeRevision, newlyAttributedAreaM2, takenFromOthersM2,
alreadyOwnedAreaM2, ownedAreaAtOutcomeM2,
creditedCrewId, rulesetVersion, computedAt
```

`null` signifie non connu/pas calculé ; zéro signifie calcul effectué avec résultat nul. Les unités et arrondis sont identiques partout. La surface actuelle peut différer de celle au moment du résultat, et cette temporalité est visible.

## 25.2 Séparation des états

Les caches sont isolés par compte, discipline, révision de données, visibilité et politiques. Une réponse Course tardive ne remplace pas la carte Vélo. Une déconnexion ne remet pas un autre compte en possession des brouillons privés.

Un échec de rendu n’entraîne pas une erreur de capture. Un échec de capture ne supprime pas le journal sportif. Une erreur de paiement ne bloque pas un export gratuit. Un blocage d’utilisateur s’applique à la page partagée comme à la discussion.

## 25.3 Analytics minimisée

Événements à relier aux objets réels, sans coordonnées/photo dans les propriétés :

```text
recording_start_requested / recording_started / recording_start_failed
recording_manual_paused / recording_manual_resumed
recording_sensor_interrupted / recording_sensor_recovered
recording_restored / recording_saved_local / recording_finalize_failed
sync_completed / sync_needs_auth / validation_completed
route_render_ready / route_render_failed
share_composer_opened / share_template_selected / share_preview_ready
share_render_started / share_render_succeeded / share_render_failed
share_handoff_started / share_handoff_result / share_link_opened
duo_requested / duo_capture_mode_selected / duo_capture_completed / duo_cancelled
cosmetic_previewed / purchase_started / entitlement_granted / purchase_refunded
crew_invite_opened / crew_joined / first_contribution_confirmed
leaderboard_viewed / leaderboard_scope_changed / leaderboard_optout
referred_first_activity_validated
```

`share_handoff_result` peut être `unknown`. Une API ne fournissant pas de confirmation n’autorise pas le nom `story_published`. Les statistiques de clics d’un lien ne sont pas des statistiques de vues d’une image.

## 25.4 Tableau de bord prioritaire du fondateur

1. **Fiabilité :** interruptions, nouveaux IDs inattendus, points reçus/commit, sessions restaurées, doublons, pertes confirmées.
2. **Résultat :** délai jusqu’à trace, analyse et export ; activités sans rendu, causes.
3. **Partage :** ouverture, rendu, export, erreurs par appareil/destination/style.
4. **Communauté :** invitations, adhésions, premières contributions, groupes actifs, modération.
5. **Économie :** aperçu→achat, droits accordés, usage des styles, remboursements et coûts par média.
6. **Croissance :** nouveaux activés attribuables et retour à 14/28 jours, par source/ville/crew.

Avant diffusion payante massive, résoudre les pertes de session connues. Le taux d’ouverture de partage ne doit pas masquer un recorder défaillant.

---

# 26. Qualité, performances et critères de lancement

## 26.1 Budgets proposés, à mesurer

| Fonction | Objectif de recette initial | Limite |
|---|---|---|
| Pression GO/Pause/Reprendre | Premier feedback visuel p95 ≤ 100 ms | Confirmation métier après état réel. |
| Double commande | Zéro création de deuxième session dans les tests | Mesurer aussi en instrumentation réelle. |
| Persistance | Lots reçus commités au plus toutes les 5 s en conditions normales | Pas garantie de réception après arrêt OS. |
| Tracé après réouverture | Même activité, dernière séquence durable retrouvée | Aucune nouvelle activité implicite. |
| Export statique | p95 ≤ 2 s si assets et données locales prêts | Téléchargement/tuiles mesurés séparément. |
| Duo | Repli fonctionnel sans pertes si caméra concurrente indisponible | Pas de simultanéité annoncée sans mesure. |
| Batterie | Pas de régression >10 % relative non expliquée sur scénario apparié | Budget interne, pas taux universel de décharge. |
| Carte dense | Commandes réactives, frame budget mesuré sur appareils ciblés | Dégrader détail/effets plutôt que la collecte. |
| Confidentialité | Aucun accès intercompte/trace privée via export public dans la suite | Audit complémentaire et vigilance continue. |

Apple recommande de mesurer et traiter le travail qui bloque l’interface. Ces budgets sont des choix de recette GRYD, non une certification Apple ni des résultats déjà obtenus. [S36]

## 26.2 Test terrain reproductible

Exécuter sur au moins un iPhone et un Android physiques parmi les appareils supportés, et sur l’appareil qui reproduit l’incident du fondateur si disponible. Tester un build release/de distribution, pas seulement un débogueur qui maintient le processus actif.

Séquences à vitesse confortable, jamais manipuler le téléphone en roulant. Un second opérateur ou un arrêt sûr permet les actions de test. Les durées de test ne sont pas des prescriptions d’entraînement.

Parcours dégagé puis urbain, avec arrêt, pause manuelle distincte, verrouillage, appel et réseau absent. Répéter après relance. Consigner lieu général, OS, batterie, permissions, mode et appareil sans publier une adresse sensible.

Une comparaison avec Strava peut servir de repère fonctionnel et visuel sur les propres données consenties du testeur. Elle n’utilise pas l’API Strava pour un usage de benchmark interdit, ni les parcours d’autres utilisateurs. Un second appareil ou une référence géographique indépendante aide à comprendre les écarts, sans déclarer un tracker absolu.

## 26.3 Gate P0

Pas de release publique présentée comme corrigée tant qu’un arrêt, une pause, un verrouillage ou une relance ordinaire produit une nouvelle session inattendue dans les scénarios supportés. Pas de campagne promettant « continue écran verrouillé » si seuls les tests Web sont passés.

Tout test non exécuté est `NOT_RUN` ; une dépendance manquante est `BLOCKED`. Pour une extension différée, documenter explicitement son hors-périmètre plutôt que cocher PASS.


---

# 27. Recette : 100 scénarios à exécuter, aucun succès présumé

Pour chaque ligne, joindre build/commit, appareil, OS, préconditions, résultat, preuve et statut `PASS / FAIL / BLOCKED / NOT_RUN`. Les mocks conviennent aux tests déterministes isolés ; ils ne prouvent pas une collecte en extérieur. Les fonctions B2 différées restent identifiées comme non livrées et ne sont pas vendues.

## Session, interruptions et collecte — tests natifs critiques

| ID | Scénario | Attendu |
|---|---|---|
| T-A01 | GO une fois, permissions prêtes | Un en-tête durable, un identifiant, un service ; aucun succès avant confirmation. |
| T-A02 | GO tapé deux fois rapidement | Une seule activité ; la seconde commande retrouve la première. |
| T-A03 | App encore en réhydratation | GO ne crée pas une activité avant recherche du journal ouvert. |
| T-A04 | Arrêt physique 30 secondes puis reprise, auto-pause OFF | Même ID, même début, points continués ; pas de finish. |
| T-A05 | Arrêt vélo, auto-pause ON validée | État stationary puis moving, même ID, hystérésis sans oscillation. |
| T-A06 | Arrêt course, auto-pause ON validée | Reprise selon signaux supportés ; aucune nouvelle activité. |
| T-A07 | Marche lente au milieu de la course | Pas de fin ni rejet automatique ; alternance admise selon règles publiées. |
| T-A08 | Cycliste qui pousse son vélo | Session conservée ; aucune pause forcée fondée sur une simple vitesse basse. |
| T-A09 | Pause manuelle puis déplacement | Pas de reprise automatique, pas de trajet privé de pause crédité. |
| T-A10 | Reprise manuelle | Même activité, nouveau segment si continuité interrompue. |
| T-A11 | Verrouillage pendant déplacement | Collecte/persistance mesurées en arrière-plan sur build natif. |
| T-A12 | Arrêt pendant verrouillage puis reprise | Même session ; reprise détectée sans déverrouillage si auto-pause activée. |
| T-A13 | Déverrouillages répétés | Affichage réattaché ; pas de création, listener ou tâche en double. |
| T-A14 | Carte vers Profil pendant la sortie | La vue change ; le recorder ne se démonte pas. |
| T-A15 | Retour depuis sélecteur système ou notification | État rechargé correctement ; aucun reset sur inactive. |
| T-A16 | Appel entrant refusé | Pas de pause métier ni de nouvelle activité. |
| T-A17 | Appel accepté pendant plusieurs minutes | Collecte supportée conservée ; audio indépendant ; lacunes mesurées si présentes. |
| T-A18 | Musique et changement de périphérique Bluetooth | Pas de modification de session, commandes audio sans effet sur le recorder. |
| T-A19 | Internet coupé sans couper volontairement le GNSS | Écriture locale continue, upload en attente. |
| T-A20 | Réseau intermittent et reconnexions répétées | Uploads repris sans doublons ni remise à zéro. |
| T-A21 | Mode avion sur appareil cible | Comportement capteur réellement observé, limite expliquée, aucune promesse générique. |
| T-A22 | GPS absent dans tunnel | Unknown/interruption ; ni immobilité certaine ni trajet inventé. |
| T-A23 | GPS dégradé entre bâtiments | Qualité et filtres traçables ; pas de suppression silencieuse de toute la sortie. |
| T-A24 | GPS rétabli avec lot tardif | Ordre canonique cohérent ; même session ; trou non masqué abusivement. |
| T-A25 | Autorisation précise retirée | État de précision actualisé, aucune fausse précision ni recréation. |
| T-A26 | Permission localisation entièrement retirée | Collecte impossible annoncée, données déjà écrites conservées. |
| T-A27 | Mode économie de batterie | Résultat mesuré sur appareils ciblés ; limites documentées. |
| T-A28 | Application sous pression mémoire | Journal durable récupérable ; aucune dépendance au store mémoire seul. |
| T-A29 | Processus arrêté par le système puis relancé | Session durable retrouvée ; trous distingués des portions collectées. |
| T-A30 | Fermeture forcée utilisateur | Aucune collecte/recréation clandestine ; reprise de la session connue proposée. |
| T-A31 | Redémarrage du téléphone | Données commitées disponibles selon protection ; période absente non inventée. |
| T-A32 | Stockage plein pendant collecte | Échec signalé, pas de faux état enregistré ; anciennes données non purgées sans choix. |
| T-A33 | Stockage protégé pendant verrouillage | Writes autorisées au recorder fonctionnent ou échec explicite ; aucune disparition silencieuse. |
| T-A34 | Heure ou fuseau modifié | Durée cohérente avec événements/horloge monotone ; pas de durée négative. |
| T-A35 | Auth expirée hors ligne | Journal conservé, reconnexion puis upload sans changer de propriétaire. |
| T-A36 | Tentative de changer de sport en session ouverte | Sport courant immuable ; action différée ou refus expliquée. |
| T-A37 | Deux callbacks start/pause concurrents | Révisions et ordre sérialisé ; aucun état incohérent stable. |
| T-A38 | Double Terminer et timeout après commit serveur | Une seule clôture et un seul résultat métier. |
| T-A39 | Mise à jour JS/native pendant session | Activation/migration sûre ; session et journal compatibles. |
| T-A40 | Réparation d’anciennes activités fragmentées | Provenance et preview requises ; pas de conquête ou XP doublés. |

## Traces, métriques et rendus

| ID | Scénario | Attendu |
|---|---|---|
| T-B01 | Parcours synthétique connu, coordonnées valides | Ordre lon/lat correct, distance et emprise conformes à la référence de test. |
| T-B02 | Zéro puis un point reçu | Pas de LineString invalide ; état de donnée insuffisante. |
| T-B03 | Fix de départ ancien | Ne téléporte pas la course depuis une position périmée. |
| T-B04 | Point aberrant, NaN ou valeur capteur indisponible | Exclusion/qualification justifiée ; pas de vitesse nulle inventée. |
| T-B05 | Deux segments séparés par pause manuelle | Pas de trait plein ni capture entre les segments. |
| T-B06 | Lacune GPS sans pause utilisateur | Rupture ou indication qualifiée ; pas de fermeture certaine artificielle. |
| T-B07 | Aller-retour sur le même chemin | Route lisible ; pas de faux polygone ou de vidéo de fermeture forcée. |
| T-B08 | Plusieurs boucles et auto-intersections | Rendu fidèle ; validation selon moteur actif, sans mutation visuelle du score. |
| T-B09 | Parcours traversant l’antiméridien | Emprise courte correcte ; pas de ligne traversant toute la planète. |
| T-B10 | Changement unités métriques/impériales | Conversion cohérente sur graphique, carte, partage et légende. |
| T-B11 | Temps écoulé, enregistré et mouvement différents | Libellés et calculs corrects ; pauses ne fabriquent pas un record. |
| T-B12 | Source importée en doublon | Une activité logique selon règles de déduplication ; aucune récompense répétée. |
| T-B13 | Carte native/GL non capturable par screenshot générique | Snapshot compatible ou fallback vectoriel ; pas de fichier noir déclaré réussi. |
| T-B14 | Tuiles indisponibles ou non exportables | Trace sur fond graphique autorisé ; aucune attribution retirée illégalement. |
| T-B15 | Très longue trace | Simplification visuelle contrôlée, métriques inchangées, interface réactive. |
| T-B16 | Données cardio/puissance absentes | Option indisponible honnête ; aucun graphe généré. |
| T-B17 | Même manifeste affiché et exporté | Données, recadrage, confidentialité et éléments identiques. |
| T-B18 | Export PNG transparent | Alpha réel ; pas de fond noir/blanc involontaire. |
| T-B19 | Export 9:16, 4:5, 1:1 | Recomposition complète ; aucune portion importante coupée par simple recadrage. |
| T-B20 | Rendu vidéo annulé/interrompu | Brouillon conservé, sortie intacte, statique disponible. |

## Double caméra, watermark et confidentialité

| ID | Scénario | Attendu |
|---|---|---|
| T-C01 | Duo séquentiel normal | Deux photos correctement associées à la même activité ; preview avant export. |
| T-C02 | Deux caméras simultanées non supportées | Repli séquentiel, aucune fausse mention simultané. |
| T-C03 | Configuration multi-camera supporte preview mais pas photo | Capacité photo non supposée ; repli avant action trompeuse. |
| T-C04 | Deux previews Expo Camera tentées | Architecture interdit le montage concurrent non supporté ; test du fallback. |
| T-C05 | Permission caméra refusée | Photo galerie/partage carte possibles, aucun blocage résultat. |
| T-C06 | Appel/occupation caméra entre les deux prises | Première photo conservée, reprise ciblée de la seconde. |
| T-C07 | Rendu selfie miroir, orientation et texte visible | Preview et export cohérents ; inversion contrôlée. |
| T-C08 | Fermeture après première photo | Brouillon retrouvé selon politique, pas de nouvelle activité sportive. |
| T-C09 | Appareil chaud/pression système | Libération ressources, report vidéo ; recorder et journal protégés. |
| T-C10 | Export sur photo très claire | Logo chartreuse lisible sans grand pavé ; chiffres lisibles. |
| T-C11 | Photo avec sujet sous ancrage initial du logo | Ancrage alternatif prédéfini, pas visage recouvert. |
| T-C12 | Destination TikTok intégrée | Pas de watermark/logo/CTA promotionnel ; preview de destination correcte. |
| T-C13 | Destination inconnue dans feuille système | Politique prudente ; aucun prétexte pour envoyer une version interdite connue. |
| T-C14 | Zone de départ masquée mais lieu reconnaissable via labels | Projection supplémentaire ou résultat sans carte proposé. |
| T-C15 | Photo de groupe/activité privée non autorisée au crew | Aucun upload/publication automatique ; permissions revérifiées. |
| T-C16 | Confidentialité changée après génération du média | Cache hébergé invalidé ; anciens exports externes non prétendument effacés. |

## Catalogue, progression, prix et classements

| ID | Scénario | Attendu |
|---|---|---|
| T-D01 | Aperçu gratuit d’un pack payant | Essai sur ses données, pas d’achat implicite ni export payant non autorisé. |
| T-D02 | Achat annulé ou différé | Brouillon intact, état exact, pas de faux entitlement. |
| T-D03 | Achat confirmé puis restauration sur autre appareil | Droit permanent retrouvé selon contrat et compte. |
| T-D04 | Remboursement/revocation après achat | Droit mis à jour, aucune suppression abusive du journal sportif. |
| T-D05 | Abonnement expiré hors ligne | Politique explicite ; fichiers existants accessibles ; styles possédés conservés. |
| T-D06 | Ancien pack V4 remplacé | Migration de droits contrôlée ; pas de double vente masquée. |
| T-D07 | Plusieurs activités/doublons le même jour | XP selon ledger et plafond actif, pas par nombre de fichiers ou reprises. |
| T-D08 | Badge sportif et cadre payant | Aucun achat de record/validation/XP ; apparences distinctes. |
| T-D09 | Classement de ville avec joueur actif dans plusieurs régions | Surface de la région seule ; pas totalité mondiale selon adresse de profil. |
| T-D10 | Classement Run/Bike/VAE | Aucun mélange compétitif ; sous-types et mode visibles. |
| T-D11 | Égalité réelle et arrondis identiques | Rang cohérent, tri stable, pas de fausse supériorité. |
| T-D12 | Population faible/résultats recalculés | Population et révision visibles ; pas Top 1 % inventé ou rang 0 de chargement. |

## Communauté, accès, notifications et distribution

| ID | Scénario | Attendu |
|---|---|---|
| T-E01 | Deux adhésions concurrentes même sport | Contrainte serveur : une adhésion active, retour compréhensible. |
| T-E02 | Crew Run X et Bike Y | Bon contexte partout, caches et notifications isolés. |
| T-E03 | Changement de crew durant activité | Attribution historique selon règle publiée, pas au nouveau groupe arbitrairement. |
| T-E04 | Invitation puis connexion interrompue | Même groupe/division retrouvés ; confirmation d’adhésion explicite. |
| T-E05 | QR/lien expiré ou révoqué | État réel avant inscription, aucune donnée privée révélée. |
| T-E06 | Blocage membre/mention/photo | Blocage effectif sur fil, notifications et pages publiques pertinentes. |
| T-E07 | Relances pendant repos/silence/activité | Suppression ou report selon catégorie ; pas urgence commerciale. |
| T-E08 | Résultat reçu deux fois par worker | Une notification et un effet récompense, pas de spam. |
| T-E09 | Suppression compte avec uploads/renders en vol | Accès révoqué, tâches annulées ; données non ressuscitées par callback tardif. |
| T-E10 | Changement de compte sur appareil | Aucun cache, photo, brouillon ou parcours privé du compte précédent. |
| T-E11 | VoiceOver/TalkBack, grand texte, Reduce Motion, FR/EN/ES | Départ, pause, fin, photo, partage et confidentialité utilisables sans troncature critique. |
| T-E12 | Parcours externe complet à deux utilisateurs | Média vrai → lien → bonne invitation → première activité ; attribution sans publication fictive. |


---

# 28. App Store : correction réelle et présentation loyale

## 28.1 Dossier de version

Cette version est d’abord un correctif de fiabilité. Les notes doivent décrire ce qui est effectivement corrigé et testé, pas annoncer « tracking parfait » ou « aucune course ne sera jamais perdue ».

Le compte de revue permet de voir les mêmes écrans et contrats que le produit. Une activité de test isolée et clairement indiquée est acceptable pour exercer le résultat sans obliger l’évaluateur à sortir courir ; elle ne doit pas alimenter de faux rangs dans les vraies villes.

Le binaire de revue possède les bonnes capacités natives. Ne pas tenter de compenser un manque de permission du binaire par une jolie vidéo de démonstration.

## 28.2 Liste de contrôle

- Enregistrement et usage background expliqués ; pas de collecte passive après fin de sortie.
- Déclarations de confidentialité cohérentes avec SDK, photos, santé, analytics et stockage réellement employés.
- Suppression de compte initiable dans l’application, avec traitement des données et tâches en vol.
- Contenus utilisateurs modérés et voie de contact effective.
- Achats numériques conformes au cadre choisi, restauration et prix explicites.
- Marketing push sur consentement adapté, séparé de l’autorisation technique OS.
- Pas de récompense pour avis, suivi publicitaire ou accès carnet d’adresses.
- Captures App Store issues de l’interface réellement livrée ; Duo simultané annoncé seulement sur configurations supportées.
- Appareil photo non lancé en roulant, aucune récompense pour prise de risque.

Ces contrôles appliquent au projet les exigences publiques pertinentes ; ils ne garantissent pas une approbation Apple. [S31]

## 28.3 Acquisition Store après correction

Première promesse : **« Ta sortie. Ta trace. Ton souvenir. »** Puis le jeu et le crew. Montrer une vraie trace propre, le résultat et le Duo gratuit. Ne pas commencer la galerie par un paywall ou un tableau de récompenses.

Exemples de captures à produire après implémentation :

1. GO et activité enregistrée.
2. Parcours lisible et métriques.
3. Photo Duo et preview.
4. Territoire / crew réellement mis à jour.
5. Personnalisation : gratuit, gagné, acheté clairement distincts.
6. Choix de confidentialité.

Conserver FR/EN/ES, nombres et unités localisés. Les slogans des captures sont des propositions originales, pas des preuves de performance. L’optimisation de la fiche ne compense pas une panne P0 connue.

---

# 29. Plan d’implémentation et sécurité de migration

## Lot 0 — Établir les faits

Lire le dépôt, identifier le build testé, reproduire U01–U06, ajouter les logs minimisés, tracer le cycle de vie réel. Produire un rapport court avec fonctions/fichiers véritables et arbre de causes. Ne pas passer plusieurs journées à écrire vingt nouveaux documents d’audit sans exécuter l’application.

**Livrable :** reproduction, cause démontrée ou hypotheses encore ouvertes, baseline native, tests de non-régression initialement en échec.

## Lot 1 — Session unique et collecte durable

Implémenter contrôle sérialisé, réhydratation, persistance, service natif approprié et pause manuelle. Désactiver l’auto-pause non fiable pour les nouveaux enregistrements. Corriger les handlers UI/OS responsables si identifiés.

**Gate :** mêmes ID et données à travers arrêt, verrouillage, appel, absence réseau et réouverture. Le rapport distingue ce qui reste limité par OS et ce qui relève d’un bug GRYD.

## Lot 2 — Trace canonique et export gratuit

Nettoyer pipeline de données, fixer métriques/segments, rendre le détail sportif, SH01–SH10 essentiels et politique de watermark. Créer ShareManifest et projections de confidentialité ; implémenter les transferts réellement disponibles.

**Gate :** la même activité donne une trace fidèle dans détail, preview et export ; aucun faux gain ; fichier lisible dans les destinations testées.

## Lot 3 — Photo Duo

Livrer d’abord séquentiel robuste et deux compositions gratuites. Captures simultanées seulement si le matériel et l’intégration sont démontrés. Brancher les brouillons, les erreurs et les permissions.

**Gate :** caméra en échec = sortie toujours sauvegardée ; photo simple toujours possible ; aucune ouverture ou publication automatique.

## Lot 4 — Catalogue et droits

Produire les assets, raccorder leurs IDs, migrer droits existants, tester les produits non consommables, aperçu avant achat, restauration et remboursement. Ne pas activer Plus sans bénéfices récurrents réellement prêts.

**Gate :** chaque référence commerciale correspond à un asset exportable et à un droit testable. Pas de mock catalogue en production.

## Lot 5 — Classements, crew et growth loops

Corriger mesures et portées, lier aux résultats canoniques, rendre liens/QR et parcours d’invitation cohérents. Ouvrir les contenus libres uniquement avec modération opérationnelle. Activer notifications choisies et instrumentation.

**Gate :** deux utilisateurs distincts exécutent sortie → partage/lien → adhésion → première activité, sans contournement ni attribution fictive.

## Lot 6 — Extensions après stabilité

Auto-pause optimisée par sport, vidéo plus riche, simultané natif étendu, survol 3D et SDK sociaux supplémentaires. Chaque extension garde un repli gratuit et ne ralentit pas le recorder.

## Règles de migration

- Branche de travail et changements traçables ; pas de reset destructif de l’historique.
- Snapshot des contrats/règles et conservation des formats locaux actifs.
- Un seul moteur d’écriture de session/territoire à la fois. Un éventuel calcul candidat en shadow ne crédite aucun joueur.
- Déploiement progressif selon outils existants, pas route `/demo` comme preuve.
- Les feature flags ne suppriment pas les sessions ouvertes. Un kill switch de nouvelles captures peut laisser sauvegarde sportive et lecture fonctionner.
- Rollback testé avec schéma compatible ; retour arrière impossible documenté avant migration.
- Aucun objet acheté supprimé arbitrairement ; aucune régénération d’XP pour remplir les nouvelles collections.

Le délai se déduit des causes trouvées et des capacités natives disponibles. Ne pas annoncer « une après-midi » pour un incident non encore reproduit.

---

# 30. Organisation en sous-agents pour Claude Code

La documentation officielle permet des sous-agents spécialisés avec contexte et outils propres. La configuration dépend de la version et des capacités réellement installées. Utiliser ces mécanismes s’ils sont disponibles ; ne pas écrire « huit agents ont validé » si aucun lancement n’a eu lieu. [S37]

## 30.1 Orchestrateur

L’orchestrateur maintient priorités, invariants, registre d’autorité et frontières de fichiers. Il répartit les travaux, confronte les conclusions contradictoires aux traces d’exécution et fusionne progressivement. Il est responsable de ne pas déclarer un test réussi sur la seule parole d’un autre agent.

## 30.2 Huit missions spécialisées

| Agent proposé | Mission et preuves | Périmètre d’écriture |
|---|---|---|
| E01 — Session et persistance | Reproduire création/reprise, journal, hydratation et idempotence ; tests T-A | Contrôleur métier et persistance, propriétaire unique des fichiers centraux. |
| E02 — iOS natif | Capacités, permissions, Core Location/Expo, verrouillage/appels/relance | Adaptateur iOS/configuration, après accord sur contrat E01. |
| E03 — Android natif | Service foreground, permissions, OEM, batterie et relance | Adaptateur Android/configuration, même contrat E01. |
| E04 — Géospatial et métriques | Points, segments, horloges, rendu et métriques canoniques | Transformations et tests déterministes, pas règles de conquête modifiées sans mandat. |
| E05 — Média et double caméra | Snapshot, composer, Duo, exports et destination policies | Renderer et adaptateurs médias ; jamais recorder. |
| E06 — Design et économie | Mise en page, catalogue réel, assets, achats/droits | Styles et commerce, sans changement XP/jeu implicite. |
| E07 — Communauté et croissance | Classements, invitations, notifications, métriques d’activation | Fonctions sociales, après contracts de privacy et résultats. |
| E08 — QA, sécurité et revue indépendante | Rejouer preuves, injections d’erreurs, RLS/cache/privacy, accès | Tests et rapports ; corrections critiques discutées avec propriétaire du module. |

L’analyse iOS/Android peut avancer en parallèle. Les mêmes fichiers ne sont pas édités par plusieurs agents simultanément. Une lecture indépendante n’est pas une deuxième validation terrain si les deux agents relisent la même capture.

## 30.3 Contrat remis à chaque agent

```text
Contexte produit et symptômes pertinents.
Commit/base réellement inspectée.
Sections du présent document à lire.
Fichiers dont tu es responsable et fichiers en lecture seule.
Hypothèses à vérifier, contrats à préserver.
Tests et preuves attendus.
Interdiction de données fictives en runtime.
Statut de chaque conclusion : observé, proposé, testé, bloqué.
```

Ne pas donner automatiquement l’intégralité de toutes les bibles historiques à chaque agent. Fournir les invariants et sections utiles. Si une nouvelle dépendance apparaît, l’agent la signale avant d’éditer un module détenu par un autre.

## 30.4 Absence de capacité multi-agent

Si la session Claude Code ne dispose pas des outils nécessaires, appliquer les mêmes revues séquentiellement et le dire. Ne pas bloquer un correctif urgent parce qu’une configuration multi-agent n’est pas disponible ; ne pas inventer des agents dans le compte rendu.

## 30.5 Méthode LOOP

- **Locate :** route réelle, appelants, state, source de données, droits et configuration native.
- **Observe :** reproduire, capturer, mesurer, identifier la transition qui échoue.
- **Optimize :** modifier la cause minimale suffisante et les dépendances nécessaires.
- **Prove :** tests ciblés, appareil réel quand requis, rendu final et données contrôlées.

Après trois itérations sans progrès sur un même blocage : produire le diagnostic et la preuve, poursuivre les travaux indépendants. Pas de boucle infinie ni de conformité déclarée pour arrêter la tâche.

---

# 31. Prompt maître à copier-coller dans Claude Code

> Joindre ce fichier complet dans le dépôt ou la session, puis utiliser le bloc ci-dessous. Ce bloc n’est pas un substitut aux exigences détaillées.

```text
MISSION GRYD V5 — CORRIGER LES SORTIES, PUIS LIVRER LE PARTAGE ET LA PERSONNALISATION

Lis GRYD_V5_CORRECTIF_RECORDING_PARTAGE_DUO_CATALOGUE_VIRALITE_2026.md.
Il s’agit d’un cahier à implémenter, pas de la preuve qu’une fonction existe.

Le fondateur observe : arrêt physique qui coupe la sortie ; reprise qui crée une
nouvelle course ; téléphone verrouillé à vélo qui arrête le suivi ; réouverture
qui démarre une autre activité puis affiche une pause ; trace et partage défaillants.

PRIORITÉ P0
Ne commence pas par la boutique ou une nouvelle palette. Identifie le build exact,
la plateforme réelle (PWA/Expo Go/dev build/natif), les SDK, le recorder, les handlers
AppState, les créations d’ID, les appels pause/reprise/fin, la persistance et les tâches.
Reproduis les incidents. Ajoute une instrumentation minimisée et un test qui échoue.

ORCHESTRATION
Utilise, si la session les supporte réellement, huit sous-agents spécialisés :
E01 session/persistance, E02 iOS, E03 Android, E04 géospatial/métriques,
E05 médias/Duo, E06 design/économie, E07 communauté/growth, E08 QA/sécurité.
L’orchestrateur conserve les invariants et attribue un propriétaire à chaque fichier.
Pas d’écritures concurrentes dans les mêmes modules. Sans sous-agents disponibles,
procède séquentiellement et signale la limite ; ne prétends pas avoir délégué.

RÈGLES BLOQUANTES
- Une session conserve le même ID à l’arrêt, au verrouillage, à la pause et au retour.
- Réouverture = réconciliation du journal/service, jamais GO implicite.
- Pause manuelle, stationnaire, GPS inconnu, synchronisation et fin sont distincts.
- Le recorder ne dépend pas du montage d’un écran ou d’une boucle JS foreground.
- Désactive l’auto-pause défaillante pour le correctif initial ; réintroduis-la
  facultativement, par sport, seulement après preuve de reprise verrouillée.
- Persiste avant de déclarer enregistré ; reprise après interruption sans pont fictif.
- Une requête répétée n’accorde pas une seconde activité, capture, XP ou notification.
- Les paramètres natifs doivent exister dans le binaire testé ; rebuild si requis.
- Aucun contournement système par faux audio, faux GPS ou bricolage de service worker.
- Ne certifie pas l’arrière-plan depuis un navigateur ou Expo Go.

APRÈS P0
1. Fiabilise la trace canonique, les trois horloges, les métriques et les segments.
2. Recrée le rendu sportif clair dans le détail et les exports, indépendamment du jeu.
3. Implémente le composer Carte/Photo/Sticker/Vidéo avec preview vraie, ShareManifest,
   confidentialité avant rendu, destinations testées et repli sans tuiles autorisé.
4. Ajoute Photo Duo gratuit : arrière puis selfie si nécessaire ; simultané uniquement
   sur configurations photo réellement supportées. Aucune caméra automatique en Live.
5. Ajoute la petite signature GRYD chartreuse selon les placements spécifiés.
   Respecte les exclusions de destination, en particulier TikTok ; pas de contournement.
6. Réorganise les récompenses/collections avec vrais assets ; conserve les anciens droits.
   Les packs payants ne vendent ni recording, ni vie privée, ni XP, ni victoire.
7. Branche les classements réels, invitations, QR, communautés et notifications choisies.

MIGRATION ET LIMITES
Préserve les données, achats, contrats et activités ouvertes. Ne change pas les règles
territoriales ou les valeurs d’XP au milieu de ce hotfix. N’invente pas les fichiers,
les API, les photos, les routes, les concurrents ou les données manquantes.
Les fixtures restent dans les tests isolés. Aucun mode démo distribué comme résultat.
Les décisions réversibles ordinaires sont exécutées sans demander validation à chaque
marge. Arrête uniquement ce qui implique une migration destructive, une nouvelle
collecte sensible, une dépense non autorisée ou un changement public de règle.

PREUVES
Applique LOOP : Locate, Observe, Optimize, Prove. Rejoue les 100 scénarios concernés,
avec PASS/FAIL/BLOCKED/NOT_RUN, build, appareil et preuve. Les fonctions différées ne
sont pas déclarées livrées. Un changement JSX compilé ne prouve pas le tracking natif.

LIVRABLES
- cause démontrée et diff réel du correctif ;
- tests avant/après et journaux minimisés ;
- captures des vraies routes ;
- exports image/vidéo réellement ouverts dans les destinations testées ;
- assets et catalogue effectifs, achats/restaurations testés ;
- registre des limites, commandes exécutées, commit et prochain lot.

Commence par l’audit factuel de P0, puis implémente les corrections réversibles.
Ne t’arrête pas après avoir livré une nouvelle bible ou un plan sans toucher le dépôt.
```

## Format de retour obligatoire après chaque lot

```text
Lot et commit :
Build / appareils inspectés :
Symptômes reproduits :
Cause démontrée (ou hypothèses restantes) :
Fichiers réels modifiés et consommateurs vérifiés :
Tests PASS / FAIL / BLOCKED / NOT_RUN :
Identité de session avant/après les interruptions :
Données sauvegardées, trous et limites :
Captures / exports / mesures :
Droits et contrats préservés :
Risques restants et prochaine action :
```

---

# 32. Sources primaires et limites d’attribution

Consultation pour cette rédaction : **13 septembre 2026**. Les valeurs, seuils, prix, designs, classements et politiques GRYD proposés ne sont pas attribués à ces éditeurs. Les pages `latest` et règles de plateforme doivent être revérifiées contre la version réellement installée au moment d’implémenter. Une source marketing décrit une offre, pas son taux de rétention ni sa fiabilité terrain.

## Enregistrement et système

**[S01] Strava — Auto-Pause.** Différence course/vélo, pause manuelle et reprise ; aucun seuil propriétaire revendiqué.  
https://support.strava.com/en-us/articles/15402141-auto-pause

**[S02] Strava — Moving Time, Speed, and Pace Calculations.** Différences entre durées et contextes, pas un accès au code de calcul.  
https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations

**[S03] Strava — How do I record an activity on Strava?** Séquence d’enregistrement, pause, fin et options publiques.  
https://support.strava.com/en-us/articles/15402137-how-do-i-record-an-activity-on-strava

**[S04] Apple — pausesLocationUpdatesAutomatically ; allowsBackgroundLocationUpdates.** Propriétés natives et configuration de collecte ; pas une preuve de la configuration GRYD.  
https://developer.apple.com/documentation/corelocation/cllocationmanager/pauseslocationupdatesautomatically  
https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates

**[S05] Apple — Handling location updates in the background.** Cycle de vie des sessions et capacités de fond selon APIs supportées.  
https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background  
https://developer.apple.com/documentation/corelocation/clbackgroundactivitysession-3mzv3

**[S06] Expo — Location.** API foreground/background, build natif, permissions et limites de terminaison. La page présente un exemple de chemin plist incohérent avec sa règle principale : contrôler Info.plist effectif du binaire, pas copier aveuglément un extrait.  
https://docs.expo.dev/versions/latest/sdk/location/

**[S07] Expo — TaskManager.** Déclaration de tâche hors cycle de vie d’un écran.  
https://docs.expo.dev/versions/latest/sdk/task-manager/

**[S08] Android — Foreground service types, restrictions et permissions de localisation.** Adapter au SDK cible et au scénario réel.  
https://developer.android.com/develop/background-work/services/fgs/service-types  
https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start  
https://developer.android.com/develop/sensors-and-location/location/permissions

**[S09] W3C — Geolocation.** Contraintes d’activité/visibilité du document Web ; ne démontre pas une continuité sportive native.  
https://www.w3.org/TR/geolocation/

## Traces, partage et caméra

**[S10] Strava — Sharing Your Strava Activities.** Partage standard carte/photo et statistiques du flux décrit.  
https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities

**[S11] Strava — Map Types.** Familles de styles, données nécessaires, disponibilité variable.  
https://support.strava.com/en-us/articles/15401748-map-types

**[S12] Strava — Activity Replay.** Replay, accomplissements et conditions publiques.  
https://support.strava.com/en-us/articles/15401546-activity-replay

**[S13] Strava — Flyover.** Survol et contrôles de partage.  
https://support.strava.com/en-us/articles/15401641-flyover

**[S14] Strava Stories — article 2026 sur les communautés de randonnée et les outils de navigation.** Mention officielle des outils de partage dont Sticker Stats ; pas inventaire exhaustif de toutes les variantes d’interface.  
https://stories.strava.com/ru/articles/how-inclusive-hiking-communities-and-new-trail-navigation-tools-are-getting-more-people-onto-the-trail-in-2026

**[S15] Strava — Sharing your Activities and Routes with a Strava Embed.** Objet web distinct d’une Story.  
https://support.strava.com/en-us/articles/15402053-sharing-your-activities-and-routes-with-a-strava-embed

**[S16] Strava — Edit Map Visibility.** Masques, limites de déduction et différence avec visibilité d’activité.  
https://support.strava.com/en-us/articles/15402012-edit-map-visibility

**[S17] BeReal — présentation de l’éditeur sur l’App Store français.** Concept des deux caméras ; aucun accès à l’implémentation interne.  
https://apps.apple.com/fr/app/bereal-tes-amis-pour-de-vrai/id1459645446

**[S18] Apple — AVCaptureMultiCamSession.** Support, coûts matériel et pression ; capacité à vérifier.  
https://developer.apple.com/documentation/avfoundation/avcapturemulticamsession

**[S19] Android CameraX — ProcessCameraProvider et ConcurrentCamera.** Liste des configurations disponibles et restrictions de use cases.  
https://developer.android.com/reference/kotlin/androidx/camera/lifecycle/ProcessCameraProvider  
https://developer.android.com/reference/androidx/camera/core/ConcurrentCamera

**[S20] Expo — Camera.** Une seule preview active ; vérifier le package exact avant toute implémentation double.  
https://docs.expo.dev/versions/latest/sdk/camera/

## Personnalisation, communauté et motivations

**[S21] Discord — Shop FAQ et Profile Frames FAQ.** Catégories de personnalisation et aperçu ; pas benchmark de revenus transférable.  
https://support.discord.com/hc/en-us/articles/17162747936663-Shop-FAQ  
https://support.discord.com/hc/en-us/articles/40775065582615-Profile-Frames-FAQ

**[S22] Snapchat — personnalisation de l’app avec Snapchat+.** Thèmes/icônes et disponibilité ; pas engagement GRYD.  
https://help.snapchat.com/hc/en-us/articles/9482232701972-How-do-I-customize-my-Snapchat-app-with-Snapchat  
https://help.snapchat.com/hc/en-us/articles/8098274218644-How-do-I-customize-my-Snapchat-app-icon

**[S23] VSCO — Plus Membership et VSCO for Free.** Bibliothèque créative et distinction gratuit/avancé.  
https://support.vsco.co/en/articles/15351286-vsco-plus-membership  
https://www.vsco.co/learn/vsco-for-free

**[S24] Relive — Plus.** Personnalisation des souvenirs d’activité et vidéo ; prix étranger non pris pour prix France.  
https://www.relive.com/plus

**[S25] Duolingo — Duolingo 101.** Mécaniques de progression et ligues dans l’apprentissage.  
https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/

**[S26] INTVL — site officiel et fiche App Store.** Territoires, communautés et échelles de classement présentés par l’éditeur ; pas audit interne.  
https://www.intvl.com.au/  
https://apps.apple.com/fr/app/intvl/id6472631698

**[S27] Knowledge at Wharton — entretien avec Jonah Berger, Contagious.** Cadre de partage et diffusion exposé par le chercheur ; pas garantie de viralité.  
https://knowledge.wharton.upenn.edu/article/contagious-jonah-berger-on-why-things-catch-on/

## Plateformes, achats et études

**[S28] TikTok — Content Sharing Guidelines, date affichée 4 août 2026.** Watermark/promotion, consentement et limites Direct Post.  
https://developers.tiktok.com/docs/en/content-sharing-guidelines

**[S29] Strava — Local Legends.** Reconnaissance locale indépendante de la vitesse, participation et retrait.  
https://support.strava.com/en-us/articles/15401751-local-legends

**[S30] Strava — API Policy.** Limites d’affichage des données et d’utilisation concurrente des API Materials ; ne pas confondre cela avec une interdiction de lire la documentation publique.  
https://www.strava.com/legal/api_policy

**[S31] Apple — App Review Guidelines.** Conformité numérique, contenus utilisateurs, compte et confidentialité ; revue finale décidée par Apple.  
https://developer.apple.com/app-store/review/guidelines/

**[S32] Apple — Auto-renewable subscriptions.** Valeur et présentation des abonnements.  
https://developer.apple.com/app-store/subscriptions/

**[S33] Apple — App Store Small Business Program.** Conditions du taux réduit, non présumé pour le compte du fondateur.  
https://developer.apple.com/app-store/small-business-program/

**[S34] Network Dynamics Group, University of Pennsylvania — Support or Competition?** Résumé de l’étude randomisée menée auprès d’étudiants et séances d’exercice ; pas un test GRYD.  
https://ndg.asc.upenn.edu/experiments/support-or-competition/

**[S35] Network Dynamics Group — Complex Contagions.** Diffusion et renforcement social ; modèle, pas prédiction chiffrée pour cette application.  
https://ndg.asc.upenn.edu/models/complex-contagions/

**[S36] Apple — Improving app responsiveness.** Réactivité, main thread et instrumentation.  
https://developer.apple.com/documentation/xcode/improving-app-responsiveness

**[S37] Claude Code — Create custom subagents.** Possibilité de rôles spécialisés et contextes séparés ; vérifier les outils et versions effectivement disponibles.  
https://code.claude.com/docs/en/sub-agents

## Limitations à conserver dans toute transmission

- Aucun code privé de Strava, BeReal ou INTVL n’a été examiné.
- Aucun accès au repository GRYD, à ses logs ou à son binaire n’est présumé dans cette rédaction.
- Les sources commerciales ne démontrent ni causalité de succès ni performance mesurée.
- Les seuils d’auto-pause, budgets, prix, templates et règles de UX sont des propositions GRYD.
- Les pages d’intégration Meta Story n’ont pas pu être lues : mécanismes spécifiques à revérifier, repli standard à tester.
- La conformité technique/Store et les performances ne sont pas certifiées par la longueur du document.
- Les 100 tests sont une recette à exécuter ; leur présence dans ce fichier n’équivaut pas à un résultat PASS.

---

# 33. Décision finale

**La première fonctionnalité virale de GRYD doit être une sortie qui se conserve et un résultat que la personne est fière de montrer.**

Le correctif ne consiste pas à acheter un meilleur modèle, ajouter une animation ou changer la couleur de la carte. Il faut réparer la session, fiabiliser les capteurs et le journal, reconstruire une trace exacte, puis rendre sa présentation simple et désirable.

Le système cible est : **même sortie malgré les interruptions ordinaires → trace claire → photo/Duo facultatif → média signé et compatible → invitation conservée → communauté réelle**.

Le catalogue vend l’expression personnelle. Les classements rendent le jeu lisible. Les notifications rendent service. Aucun de ces éléments ne doit demander au joueur de payer ou de se montrer pour que son effort existe.
