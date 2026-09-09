# GRYD — Refonte intégrale 2026

**Cahier de conception produit, jeu, running, vélo, UI/UX, communauté et modèle économique**  
Version 1.0 · 8 septembre 2026 · Marché de lancement : France · Langues : français et anglais

> **Cours. Roule. Fais grandir ton terrain.**  
> Une sortie qui te fait du bien, une trace dont tu es fier, une aventure à partager.

Ce document reconstruit GRYD à partir de son intention fondatrice et de l'état du marché vérifié à cette date. Il livre des décisions de conception et des spécifications à réaliser. Il ne décrit pas une application déjà reconstruite ou validée sur l'App Store. La direction artistique est une proposition originale inspirée de l'exigence de Rondesignlab et des principes d'Apple ; elle n'est ni réalisée ni approuvée par ces entreprises.

**Lecture rapide :** §§1–4 pour la vision ; §§5–8 pour le jeu ; §§9–12 pour les écrans et les partages ; §§13–16 pour la communauté et les revenus ; §§17–20 pour la réalisation et la recette. Les faits externes portent des liens directs. Les tarifs GRYD, seuils de jeu, budgets et objectifs chiffrés sont des propositions à tester.

---

## 1. La décision de refonte

GRYD devient **l'application de course et de vélo qui transforme les sorties ordinaires en une aventure territoriale collective**. La qualité sportive fait rester ; la carte donne une identité ; le crew donne une raison de revenir ; le partage donne envie aux autres de participer.

Le produit doit réussir quatre moments :

1. **Avant :** comprendre immédiatement où l'on est et pouvoir partir.
2. **Pendant :** enregistrer et guider avec fiabilité, sans devoir jouer sur son téléphone.
3. **Après :** comprendre sa sortie, voir son impact et obtenir une belle création partageable.
4. **Entre deux sorties :** retrouver ses proches, ses souvenirs et un prochain rendez-vous adapté à sa vie.

Le nouveau GRYD repose sur ces choix :

| Sujet | Décision cible |
|---|---|
| Navigation | Trois destinations : **Carte · Crew · Profil**. |
| Départ | Une action clairement nommée : **Courir** ou **Rouler**. Pas de briefing obligatoire. |
| Géométrie | La trace montre le déplacement ; une vraie boucle admissible produit une zone. |
| Identité | Carte expressive, grands chiffres, surfaces sobres, chartreuse maîtrisée. |
| Running et vélo | Deux cartes de possession et deux compétitions ; un compte et une progression personnelle. |
| Jeu libre | Capturer, retrouver son terrain, explorer ; aucun abonnement nécessaire pour gagner une zone. |
| Compétition | Défis de crews facultatifs, budgets de contribution identiques, sans classement universel aux km². |
| Progression | XP permanents, niveaux, collection ; une saison de six semaines avec un parcours accessible. |
| Récompenses | Déblocages connus, souvenirs, identité et reconnaissance. Aucun pouvoir vendu. |
| Gratuit | Le sport, le jeu et les outils sociaux essentiels forment une expérience complète. |
| Payant | Un abonnement GRYD+ et quelques collections cosmétiques permanentes. |
| Partage | Carte, photo, sticker et film, avec une création prête avant toute personnalisation. |
| Notifications | Des événements utiles, un budget d'interruptions, aucun harcèlement territorial. |
| Connexions | GRYD fonctionne sans Strava ; chaque source conserve ses droits et ses limites. |
| Réussite | Des semaines actives et des relations réelles, avec peu de temps nécessaire dans l'interface. |

**Différence à construire : la qualité de l'aventure en petit groupe, accessible avec deux sorties par semaine, et la beauté du souvenir de chaque sortie.** Le dessin d'une carte territoriale ne suffit plus à différencier GRYD en 2026.

## 2. Comprendre ce que GRYD voulait être

### 2.1 Ce qui a été retrouvé

L'analyse s'appuie sur le dépôt local GRYD, anciennement KLAIM RUN, les documents fondateurs, les arbitrages de juillet et l'historique de la conversation « GRYD RUNNING ». Le code a été inspecté sur des fonctions ciblées ; aucun serveur de production ni achat réel n'a été testé dans ce travail.

| Source locale examinée | Ce qu'elle permet d'établir |
|---|---|
| `SPEC-MVP-territoire-running-v0.md` et `GRYD_MASTER_SPEC.md` | Intention : transformer la course en conquête, avec une forte place donnée aux crews. |
| `GRYD_synthese_complete_conversation.md` | Recherche d'une combinaison sport réel, fierté locale et progression de jeu. |
| `SOURCE_OF_TRUTH_REGISTER.md`, décision D-19 | Le document produit du 26 juillet remplace celui du 24 juillet ; l'ancienne grille H3 ne doit pas dicter toute la refonte. |
| `GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` | Boucles et polygones, carte dominante, séparation Run/Bike, simplification de navigation. |
| Documents de monétisation et constantes partagées | Accumulation de monnaies, objets, protections et avantages dont les conséquences se recouvrent. |
| Moteur d'ingestion, fonctions territoriales, migration 0091 | Coexistence encore visible de décisions par cellules et d'un modèle de polygones ; certaines vues utilisent déjà les surfaces. |
| Navigation, sources d'activité et paiement mobile | Des briques Run/Bike, trois onglets et achat/restauration sont présentes. Cela ne prouve pas leur bon fonctionnement en production. |

Les références précises sont regroupées en annexe A. Elles servent à comprendre l'existant, pas à maintenir tous ses anciens choix.

### 2.2 L'idée à sauver

La valeur d'origine n'est pas « gagner des points avec son GPS ». C'est **laisser une marque dans un lieu réel et compter pour une équipe**. Une course de quartier devient une histoire : notre boucle, notre zone, notre rendez-vous, notre réussite.

Trois motivations se complètent :

- **Compétence :** je progresse à mon rythme et je comprends mes résultats.
- **Autonomie :** je garde mon sport, mes parcours et mon calendrier.
- **Appartenance :** mes sorties comptent pour des personnes que j'aime retrouver.

Ce sont des principes de conception retenus pour GRYD, pas une preuve scientifique que les mécaniques proposées amélioreront la rétention. Cette hypothèse sera testée sur le terrain.

### 2.3 Ce qui a affaibli cette idée

La documentation superpose plusieurs jeux : capture au passage, capture par boucle, score, surface, protection, contestation différée, niveaux, rangs, skills, monnaies et coffres. L'utilisateur ne doit pas payer le coût de ces contradictions.

L'inspection du code révèle un risque plus concret : l'ingestion peut encore appliquer une logique de cellules avant d'enregistrer le polygone et sa contestation. Une carte, un classement et un résultat peuvent alors raconter des états différents. **La refonte exige une seule vérité territoriale, du calcul jusqu'au partage.**

Les captures historiques montrent également une carte éloignée du contexte local, des panneaux explicatifs lourds et des états techniques visibles. Ce sont des observations historiques, pas une affirmation sur chaque écran actuel.

### 2.4 Ce que « repartir de zéro » signifie ici

Repartir de zéro concerne la vision, les règles, la hiérarchie et les parcours. Cela ne justifie pas de détruire les comptes, les sorties ou les achats existants, ni de réécrire aveuglément les briques fiables.

Le présent cahier devient **la proposition de référence de la refonte de septembre**, avec les écarts explicitement tranchés. Lors de la réalisation, une seule spécification active devra remplacer les instructions contradictoires. Aucun fichier ancien ne doit réintroduire implicitement un bouclier, une monnaie ou un écran supprimé.

## 3. Ce que les références de 2026 nous apprennent

### 3.1 Strava : une activité devient un objet social

Strava combine journal sportif, identité, interactions, clubs et créations partageables. Ses intégrations facilitent la continuité avec les habitudes d'enregistrement. Son rapport Year in Sport 2025 annonce une multiplication par 3,5 des clubs de running et par 1,5 des événements de clubs sur un an. Ces chiffres sont publiés par Strava sur son propre écosystème : ils ne mesurent ni tout le marché ni une causalité de rétention. [Rapport officiel Strava](https://press.strava.com/fr/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025)

**Interprétation pour GRYD :** l'objet partagé doit donner envie de parler à quelqu'un et de sortir ensemble. Notre hypothèse est qu'un classement seul crée moins d'occasions de rencontre qu'une activité bien racontée, un rendez-vous concret et une invitation facile.

### 3.2 INTVL : le concurrent direct à prendre au sérieux

INTVL propose déjà conquête territoriale, running et vélo, fonctions sociales et préparation d'itinéraires. Les fonctions et limites attestées sont détaillées en annexe B. **« Strava avec des territoires », « disponible en français » ou « aussi pour le vélo » ne peuvent pas constituer, à eux seuls, une promesse unique.** [INTVL, présentation officielle](https://www.intvl.com.au/) · [Versions App Store](https://apps.apple.com/fr/app/intvl/id6472631698)

Il faut distinguer attrait apparent et succès démontré : les pages publiques donnent des fonctionnalités et des avis, mais pas une mesure fiable du taux de rétention, du revenu par utilisateur ni de la rentabilité d'INTVL. Aucune de ces métriques n'est inventée ici.

### 3.3 Rondesignlab : donner une présence au produit

Le cas BikeRoute publié par Rondesignlab met en avant les cartes, la préparation des sorties et une expérience cycliste accessible. C'est une référence pertinente de hiérarchie et de composition. Les prescriptions graphiques ci-dessous sont créées pour GRYD ; elles ne prétendent pas reproduire un système de design interne de l'agence. [BikeRoute, cas officiel](https://rondesignlab.com/cases/bikeroute-bicycle-mobile-app-ui-ux-design)

**Application :** une carte qui tient le rôle d'image principale, un résultat qui ressemble à une affiche sportive, un crew qui ressemble à un groupe vivant. Les effets de matière se concentrent sur quelques moments de fierté.

### 3.4 Apple : la marque dans le contenu, des commandes familières

Apple distingue la couche de navigation de celle du contenu, où l'identité d'une application peut s'exprimer fortement. Liquid Glass se prête surtout aux commandes et à la navigation. [Apple, identité de marque sur iOS, WWDC26](https://developer.apple.com/videos/play/wwdc2026/251/) · [Apple, Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)

**Application :** GRYD exprime sa singularité dans ses traces, ses zones, ses portraits et ses récompenses. Les retours, feuilles, sélections, confirmations et contrôles sportifs restent immédiatement reconnaissables.

### 3.5 Ce que nous devons vérifier auprès des sportifs

Recruter 24 testeurs : 6 débutants ou personnes en reprise, 6 coureurs réguliers, 6 cyclistes dont au moins 2 pratiquant le vélo utilitaire, 6 capitaines de groupes. Les profils peuvent se recouper, mais conserver 24 personnes distinctes. Ajouter des utilisateurs de VoiceOver et de grandes tailles de texte dans les tests d'accessibilité.

Observer une sortie réelle, puis demander : « Qu'aurais-tu fait sans GRYD ? », « Quel moment t'a donné envie de revenir ? », « Qu'as-tu cru perdre ? », « Ce partage te ressemble-t-il ? ». Faire expliquer les règles à voix haute, sans aide.

Les hypothèses prioritaires sont : comprendre la boucle sans tutoriel long ; accepter une zone perdue sans se sentir obligé de ressortir ; sentir qu'une petite contribution aide le crew ; partager une création sans retouche ; envisager de payer pour la personnalisation et les analyses privées.

## 4. Positionnement, publics et décisions fermes

### 4.1 Pour qui construire d'abord

| Public | Attente principale | Réponse GRYD |
|---|---|---|
| Personne qui court 1–3 fois/semaine | Une bonne raison de sortir, sans culpabilisation | Départ simple, progression régulière, petit crew accueillant. |
| Coureur préparant une course | Préserver son plan et retrouver ses amis | Séance libre, statistiques utiles, objectifs territoriaux facultatifs. |
| Cycliste loisir, route ou gravel | Fiabilité, distance, relief, sécurité et souvenirs | Vrai mode vélo, trace lisible, itinéraires adaptés et récapitulatif spécifique. |
| Capitaine de run club | Organiser et maintenir la participation | Sorties, inscriptions, annonces et objectifs collectifs faciles. |
| Joueur compétitif | Des décisions intéressantes et des règles équitables | Défis bornés, choix de secteur, coopération et classement explicable. |
| Joueur isolé ou rural | Pouvoir s'amuser sans foule locale | Collection personnelle, progression complète et défis privés à distance. |

### 4.2 Les renoncements qui rendent le produit meilleur

- Pas de fil général infini à l'ouverture.
- Pas de kilométrage minimum élevé pour « mériter » d'exister dans le jeu.
- Pas de capture multipliée par l'abonnement, de protection achetable ou de boost XP.
- Pas de série quotidienne cassée après un jour de repos.
- Pas d'alarme « tu perds tout » ni de compte à rebours poussant à sortir immédiatement.
- Pas de recrutement imposé avant la première activité.
- Pas de tableau de bord rempli de statistiques qu'on ne sait pas interpréter.
- Pas de génération d'itinéraires par un modèle de langage sans graphe routable et contrôles métier.
- Pas de promesse de sécurité absolue, d'exactitude médicale ou d'antitriche infaillible.

### 4.3 Trois différences défendables

**La contribution compte davantage que la quantité dans les défis.** Un groupe coordonné peut battre un groupe de gros rouleurs. Cela se démontre dans les règles, pas dans un slogan.

**Le crew organise de vraies sorties.** Disponibilités, allure de groupe, point de rendez-vous, politique « on attend tout le monde », rappel utile et souvenir collectif forment un parcours continu.

**Chaque sortie produit une création personnelle.** La trace, la photo et l'impact réel deviennent un objet que l'utilisateur a envie de conserver même s'il ne joue plus au classement.

## 5. Le jeu de base, entièrement clarifié

### 5.1 Six notions, chacune avec un seul sens

| Notion | Signification | Persistance |
|---|---|---|
| **Trace** | Chemin effectivement enregistré. | Historique personnel, selon suppression choisie. |
| **Boucle** | Partie continue de trace qui revient près de son point de passage initial selon les critères de validation. | Fait associé à une activité. |
| **Empreinte** | Souvenir des zones déjà réalisées personnellement. | Ne disparaît pas lorsqu'un rival reprend une zone. |
| **Terrain** | Zone actuellement possédée sur la carte partagée d'une discipline. | Peut être reprise par une boucle ultérieure. |
| **XP** | Progression personnelle permanente, commune aux deux sports. | Ne se dépense pas et ne diminue pas avec le repos. |
| **Points de défi** | Contributions à un match de crews donné. | Remis à zéro pour le match suivant. |

L'interface ordinaire n'affiche jamais ces six notions à la fois. La Carte montre le terrain actuel. Le résultat montre la trace et le changement de terrain. Le Profil conserve l'empreinte et les XP. Les points n'apparaissent que dans un défi auquel on a choisi de participer.

### 5.2 La boucle principale

```text
Ouvrir la carte
      ↓
Courir / Rouler
      ↓
Enregistrer sa sortie habituelle
      ↓
Sauvegarder → analyser → confirmer
      ↓
Voir sa trace + son impact réel
      ↓
Conserver / partager / retrouver son crew
```

Une sortie ouverte reste une vraie réussite sportive : journal, statistiques, XP et souvenir partageable. **Elle n'obtient pas une surface en fermant artificiellement une ligne droite sur la carte.** Une sortie sans boucle doit être présentée comme « 5,2 km enregistrés », jamais comme un échec.

### 5.3 Règle de capture libre

Décision de refonte : une boucle valide revendique son polygone admissible dans **sa discipline**. Elle prend le terrain neutre et remplace la possession précédente dans la seule zone de recouvrement. Les parties situées hors de son polygone restent inchangées.

Le propriétaire est un joueur. La carte peut regrouper visuellement les terrains de son crew ; ce regroupement ne crée pas un deuxième titre de propriété. Un départ du crew enlève ce joueur du regroupement courant, sans réattribuer ses anciennes activités ni les résultats de matchs terminés.

La reprise suit l'ordre des **instants de fermeture physique validés de chaque boucle**, puis un identifiant serveur stable en cas d'égalité exacte. Le bouton Terminer, une pause prolongée et l'arrivée du réseau ne déplacent pas cet instant. Une activité comportant plusieurs faces produit des événements datés séparément ; leur union sert à présenter la surface de la sortie, sans attribuer artificiellement à toutes les faces l'heure de la dernière. Un import ancien ne reprend jamais un terrain à une boucle plus récente. Une horloge ou une provenance insuffisamment fiable conserve le souvenir mais suspend la capture. Les transactions et les recalculs locaux rendent l'ordre reproductible.

**Il n'y a ni bouclier, ni contestation de 18 heures, ni défense achetable, ni dette de connexion.** Repasser une boucle est la seule façon de reprendre sa zone. Le propriétaire précédent conserve intégralement son souvenir de sortie.

Cette règle favorise forcément les personnes qui sortent davantage sur la carte libre. Le produit l'assume et ne transforme pas cette carte en classement global de mérite sportif. L'équité compétitive se traite séparément dans les défis du §6.

### 5.4 Un seul calcul de surface

Pour une boucle admissible P et un terrain possédé avant la sortie O :

```text
surface de la boucle = aire(P)
nouveau terrain personnel = aire(P moins O)
terrain déjà possédé = aire(P intersection O)
terrain total après = aire(O union P), corrigé des captures concurrentes
```

Le nouveau terrain se décompose en **neutre pris** et **repris à d'autres joueurs**. L'application ne somme pas les aires de polygones qui se recouvrent comme s'il s'agissait de surfaces nouvelles.

Exemple : Léa boucle 0,24 km². Elle possédait déjà 0,06 km² dans ce périmètre. Elle gagne **0,18 km²**, dont 0,10 neutre et 0,08 repris. Sa carte de partage ne doit pas annoncer « +0,24 km² ».

Si deux amis font la même boucle ensemble, chacun conserve sa sortie et son empreinte. Sur le terrain partagé, la propriété suit la règle d'ordre ci-dessus ; l'aire du crew n'est comptée qu'une fois. Une reconnaissance « sortie ensemble » ne multiplie pas la géométrie.

### 5.5 Contrat géographique à réaliser

Les valeurs suivantes sont des paramètres de bêta, non des seuils scientifiques :

| Paramètre | Course | Vélo | Raison |
|---|---:|---:|---|
| Écart maximal de fermeture | 25 m | 40 m | Tolérer le bruit GPS sans fermer un quartier à distance. |
| Longueur minimale du sous-parcours fermé | 800 m | 2 km | Écarter les micro-boucles opportunistes. |
| Surface minimale admissible | 5 000 m² | 20 000 m² | Écarter les artefacts minuscules ; calibrer en ville. |
| Incertitude horizontale attendue aux extrémités | ≤15 m | ≤15 m | Ne pas déclarer une fermeture sur des points très incertains. |
| Réception pour capture courante | Dans les 24 h suivant la fermeture physique | Identique | Permettre le hors ligne et limiter les réécritures tardives. |

Si une condition de capture n'est pas remplie, l'enregistrement sportif reste conservé. Choisir le motif exact : « La trace ne forme pas de boucle complète », « Cette boucle est trop petite pour le terrain partagé » ou « La précision GPS ne permet pas de confirmer cette zone ». Ajouter : « Ta sortie est enregistrée. »

Règles du moteur :

1. Découper aux interruptions, pauses comportant un déplacement non enregistré et ruptures de qualité. Aucun segment imaginé ne peut servir de frontière.
2. Détecter les retours à un point antérieur dans **un même segment continu**. Une fermeture dans la tolérance doit être compatible avec les points voisins ; aucun raccord ne traverse une barrière connue.
3. Extraire les faces valides des auto-intersections. Une trace en huit peut donner deux boucles, jamais une enveloppe convexe englobant tout l'extérieur.
4. Réunir les faces d'une activité avant calcul pour supprimer les doubles comptes. Un aller-retour sur la même rue ne produit pas un terrain large par épaississement esthétique.
5. Calculer les aires en géométrie adaptée à la surface terrestre ; ne pas mesurer en pixels ni dans une projection d'affichage déformante.
6. Retirer les zones exclues du jeu et appliquer la politique de confidentialité **avant** publication. Un secteur inaccessible n'est pas rendu accessible par le fait de pouvoir l'entourer.
7. Conserver la géométrie métier séparément de la simplification visuelle. Aucun style de carte ne change la propriété ou la surface.
8. Sauvegarder d'abord l'activité durablement, indépendamment du jeu. Attribuer les XP de journée admissible par un registre idempotent distinct : un échec géographique ne bloque pas les XP sportifs. Puis valider dans une transaction atomique les effets territoriaux, surfaces, contributions de défi admissibles et événements associés. Une correction annule ou recalcule chaque effet concerné de façon traçable, sans supprimer la séance. H3 peut subsister comme index spatial interne ; il ne décide plus des captures en parallèle.

Exclusions : emprises militaires, infrastructures dangereuses et espaces explicitement fermés au jeu selon les données disponibles. Les parcelles privées d'un îlot ne doivent pas être transformées en destinations à visiter : les entourer sur des voies autorisées ne donne aucun droit d'accès. Le moteur doit fixer une politique d'intérieur cohérente par catégorie avant P1. Pour le pilote, exclure les surfaces explicitement interdites ; une donnée d'accès inconnue interdit de recommander une voie comme praticable, sans effacer une activité déjà enregistrée. Les masques de confidentialité personnels ne sont jamais montrés comme des exclusions publiques nominatives.

Une boucle exceptionnellement grande, une vitesse incohérente ou un signal douteux déclenchent une vérification contextualisée. Aucun seuil de vitesse unique ne doit bannir automatiquement un cycliste en descente ou un coureur rapide. La taille des boucles nécessite des simulations urbaines et rurales avant ouverture large.

### 5.6 Confidentialité et possession

Au départ, deux choix indépendants : **audience de l'activité** et **participation à la carte partagée**. Le premier vaut « Moi » par défaut. Le second est expliqué au moment de la première capture potentielle ; une personne peut rester en carnet privé.

Dire clairement : « Une zone publiée peut révéler une partie de ton parcours, même si ta trace reste privée. » Ne pas promettre qu'un pseudonyme rend la géométrie anonyme.

Protection de départ et d'arrivée activée pour les médias ; zones sensibles personnelles possibles. Pour la carte publique, **une boucle dont la publication exposerait une zone protégée reste privée par défaut**, au lieu d'afficher un trou circulaire qui localiserait précisément cette zone. L'utilisateur conserve ses XP et son empreinte. Une boucle privée ne retire aucun terrain à un autre joueur et ne modifie aucun compteur public. Une contribution agrégée à un défi est possible uniquement avec consentement distinct, sans polygone public ; elle révèle néanmoins une participation au secteur, ce qui doit être expliqué.

Publication après la fin, jamais position publique en direct. Un délai de publication configurable limite les indices temporels ; sa valeur initiale est 30 minutes après la fin de l'activité et sa validation. L'ordre métier reste fondé sur la fermeture physique. Publier atomiquement les nouvelles zones, les pertes des anciens propriétaires, leurs compteurs et les événements publics : cacher seulement le nouveau tracé ne suffit pas. Montrer à l'auteur « Acquisition validée · publication différée ». L'aperçu distingue le résultat historique de sa sortie de la possession publique à venir, qui peut déjà être modifiée par une boucle ultérieure.

Si l'utilisateur retire ensuite une capture publique, retirer immédiatement ses médias et son identité publique, puis neutraliser les seules portions encore possédées grâce à cet événement. Ne pas ressusciter un ancien propriétaire ; les captures ultérieures restent inchangées. Le retrait ne rend aucun point de défi réutilisable : annuler les contributions concernées sans libérer de nouvelles tentatives, et corriger le résultat si nécessaire.

La protection doit être appliquée aux miniatures, médias, liens, cartes de crews et exports, pas seulement à l'écran principal. Un aperçu obligatoire montre exactement ce qui sera publié.

## 6. La profondeur de jeu : coopération et défis équitables

### 6.1 Deux usages, sans deux accueils

La carte libre donne la découverte et le plaisir immédiat. Les **défis de crews**, accessibles depuis Crew, ajoutent une compétition choisie. Un nouveau joueur n'a pas à comprendre les défis pour faire sa première sortie.

Ce découplage est volontaire : on ne peut pas garantir à la fois une propriété issue de toutes les vraies boucles et une égalité de chances fondée sur le temps disponible en utilisant uniquement les km².

### 6.2 Défi standard : cinq contre cinq

Règle initiale pour la bêta :

- Deux équipes de **5 joueurs**, d'une même discipline ; inscription volontaire.
- Durée de **7 jours**, du lundi 00 h au dimanche 23 h 59, fuseau fixé et affiché au début du match.
- Effectif verrouillé avant le début. Un compte ne participe qu'à une équipe classée par discipline cette semaine.
- Trois secteurs accessibles proposés aux deux équipes. Limites et objectifs figés pour toute la semaine.
- Par personne : les **2 premières journées contributives dans l'ordre physique validé**, au maximum **3 points par journée**, dans un seul secteur par journée. Un import tardif admissible corrige cet ordre sans ajouter une troisième journée. Les points ne s'achètent pas. Une personne peut atteindre tout son budget avec ses deux sorties habituelles.
- Une boucle admissible doit contenir une portion de trace validée à l'intérieur du secteur : 400 m à pied ou 1 km à vélo, valeurs de bêta. Englober un secteur distant sans y passer ne suffit pas.
- Dès que cette condition est remplie, la journée vaut 3 points. Courir plus vite, plus loin ou répéter la boucle ne rapporte rien de plus dans ce défi.
- Avant le départ, une préférence de secteur peut être choisie ; elle est enregistrée avant la sortie. Sinon, le serveur affecte immédiatement la première boucle admissible au secteur éligible dont l'identifiant stable est le premier dans l'ordre annoncé. Aucun choix après lecture des scores adverses. Si la préférence ne correspond pas au parcours réellement accompli, appliquer cette même règle de repli, expliquée dans le résultat. Pour les imports différés, utiliser la préférence enregistrée avant l'activité ou le repli, jamais une préférence ajoutée après coup.
- La journée de contribution est celle de la fermeture physique de la première boucle admissible, dans le fuseau du défi. Une activité ne contribue qu'à une journée et à un secteur, même si elle traverse minuit. Deux activités le même jour ne doublent pas les points. Affectation verrouillée dès validation ; la suppression ne rend pas la tentative réutilisable.
- Pour chaque secteur, l'équipe ayant le plus de points gagne 1 point de match. Égalité : 0,5 chacune. Plus de 1,5 point remporte le match ; 1,5–1,5 donne un nul.
- Aucun départage par vitesse, distance, fréquence cardiaque ou heure de dernière sortie.

Budget maximal : **30 points par équipe**, à répartir entre trois secteurs. Les distances constituent des critères géographiques du défi, pas une prescription d'entraînement.

### 6.3 Exemple stratégique

| Secteur | Crew A | Crew B | Résultat |
|---|---:|---:|---|
| Canal | 12 | 6 | A gagne. |
| Parc | 9 | 12 | B gagne. |
| Centre | 9 | 12 | B gagne. |
| Total | 30 | 30 | B remporte 2 secteurs sur 3. |

La décision intéressante est **où répartir l'effort**, en tenant compte des parcours habituels de chacun. Une personne ayant déjà apporté ses six points peut encore organiser, encourager et courir pour elle-même. L'interface la remercie au lieu de lui suggérer d'en faire davantage.

### 6.4 Empêcher la course de dernière minute

Les scores adverses détaillés sont publiés une fois par jour à midi, sur les activités reçues et validées avant ce point de calcul. L'équipe voit ses propres contributions. La dernière publication comparative intervient le dimanche midi ; le score final est publié après une fenêtre de synchronisation de 24 h. Les règles et cette fenêtre sont visibles avant inscription.

Cette visibilité partielle ne supprime pas toute optimisation tardive ; elle réduit l'intérêt de surveiller un écran et d'accélérer pour dépasser quelqu'un à la dernière seconde. Aucun push ne demande de sortir avant la fin du match.

Seules les boucles physiquement fermées avant la fin du défi peuvent compter. La clôture technique de la séance et sa réception doivent intervenir dans la fenêtre de 24 h, avec le même contrôle d'horodatage et d'éligibilité. Une contestation ultérieure peut corriger un résultat avec historique visible.

### 6.5 Matchmaking et territoires peu denses

Matcher d'abord selon discipline, zone de pratique suffisamment proche, disponibilité déclarée, résultats récents et niveau de participation antérieur. La vitesse individuelle n'est pas un classement de valeur humaine. Ne pas utiliser des données de santé pour fabriquer un profil public de recrutement.

Si les deux groupes n'ont pas un accès comparable aux trois secteurs, ne pas créer ce match local. Proposer un **défi privé miroir** : trois objectifs personnels comparables en durée déclarée, sans victoire territoriale commune. Il reste amical et hors classement local, pour ne pas prétendre comparer des géographies identiques.

Une personne seule a immédiatement accès à son empreinte, aux collections et à toute la progression. Aucun faux crew, faux adversaire, fausse activité ou faux nombre de membres ne doit combler une carte vide.

### 6.6 Saison de six semaines

La saison est un thème collectif et un parcours de récompenses, pas une destruction du patrimoine. Six défis hebdomadaires peuvent avoir lieu ; ils sont facultatifs.

- Les XP permanents, les sorties et les objets obtenus restent acquis.
- La possession libre continue ; son état à la clôture est archivé comme souvenir de saison, sans reset forcé de toute la carte.
- Les points et résultats classés repartent pour la nouvelle saison.
- La collection de saison comporte 12 paliers ; voir §7.
- Aucun bonus compétitif n'est accordé pour terminer toute la saison.

Les ligues arrivent après calibration : **Découverte · Quartier · Ville · Horizon**. Les noms désignent un niveau de compétition, pas une taille de territoire réellement maîtrisée. Promotions selon matchs terminés et résultats, à effectif comparable ; nombre minimum de matchs et taux de promotion fixés avant la saison pilote, jamais modifiés pour faire artificiellement monter les utilisateurs.

### 6.7 Innovations à prototyper ensuite

**Boucle relais.** Plusieurs membres composent une boucle avec leurs segments réels sur une période de sept jours. C'est une extension de coopération à tester après le moteur individuel. Conditions : continuité démontrable entre extrémités, aucun raccord inventé, consentement de chaque contributeur, un seul résultat géographique, règle de propriété explicite et validation collective. Si la continuité ne peut être prouvée, le résultat reste une mosaïque de souvenirs sans capture.

**Album du crew.** Une création assemble des traces consenties, des photos et des messages d'une sortie de groupe. Sa valeur reste intacte sans score compétitif. Priorité supérieure à une boutique volumineuse.

**Saison personnelle flexible.** À tester : démarrer son parcours de collection quand on rejoint GRYD, avec une durée propre et un thème partagé. Vérifier que cette flexibilité ne rende pas l'interface de saison incompréhensible.

**Carte de souvenirs.** Rejouer les lieux découverts ensemble sur un mois ou une année, avec des médias lisibles hors ligne et des réglages de confidentialité préservés.

## 7. XP, niveaux et récompenses

### 7.1 Un système que l'on peut expliquer en dix secondes

> « Une journée active fait progresser ton niveau. Tes boucles agrandissent ton terrain. Les défis font avancer ton crew. »

Les XP sont attribués sur des journées contenant au moins **10 minutes de mouvement admissible**, cumulées sans chevauchement entre les deux sports. Une journée vaut 100 XP ; les **trois premières journées admissibles par semaine** rapportent des XP. Les autres sorties restent intégralement enregistrées et peuvent capturer en jeu libre.

Ce plafond évite de payer la progression en volume d'entraînement. Il n'est pas une limite de sorties ni une jauge d'énergie. Sa semaine utilise le fuseau de progression enregistré sur le compte, avec changement effectif au début de la semaine suivante pour empêcher les doubles journées pendant un voyage. Répartir les minutes d'une activité traversant minuit entre leurs journées réelles ; ne jamais compter une minute deux fois. Les imports reçus sous sept jours peuvent corriger les journées et la limite hebdomadaire ; au-delà, ils enrichissent le journal sans nouveau crédit XP. Les activités antérieures à la création du compte n'attribuent pas d'XP, hors conversion de migration explicitement définie. Une activité dupliquée ne crée pas une deuxième journée.

Marche intégrée à une sortie de reprise admise. Une activité indoor vérifiée peut contribuer aux XP de régularité, mais ne produit jamais de terrain GPS. Une saisie manuelle enrichit le journal et les objectifs personnels ; elle ne donne pas de points classés ni de récompenses automatiquement exploitables.

### 7.2 Niveaux permanents

Seuil cumulé pour atteindre le niveau N :

```text
XP(N) = 100 × (N − 1) + 10 × (N − 1) × (N − 2)
```

| Niveau | XP cumulés | Récompense proposée |
|---|---:|---|
| 1 | 0 | Enregistrement complet, crew, carte, partage et collection de base. |
| 2 | 100 | Signature typographique « Première trace ». |
| 3 | 220 | Cadre de profil Ligne. |
| 5 | 520 | Palette d'affiche Craie. |
| 10 | 1 620 | Collection Atlas : trois compositions de partage. |
| 15 | 3 220 | Animation de résultat Contour. |
| 20 | 5 320 | Cadre Ligne de crête, réservé à ce mérite. |
| 30 | 11 020 | Titre Cartographe. |
| 50 | 28 420 | Ensemble Horizon et nouvelle série de maîtrise. |

Le niveau 2 arrive après la première journée admissible ; le niveau 3 après la troisième. À deux journées par semaine, le niveau 10 demande environ huit à neuf semaines. **Le niveau ne change aucun calcul de capture ou de match.** Au-delà de 50, poursuivre la même formule ; préparer de nouveaux objets avant que les premiers joueurs atteignent le plafond éditorial.

### 7.3 Saison accessible

Douze paliers de 100 XP saisonniers, calculés à partir des mêmes journées que les XP permanents. Une saison complète demande **12 journées actives en six semaines**, soit deux par semaine en moyenne. Les personnes qui commencent tard reçoivent une durée restante clairement affichée ; elles peuvent poursuivre la collection en archive après la saison, sans effet rétroactif sur les matchs.

Les douze récompenses gratuites : première affiche de saison, badge de participation, motif de trace, cadre, sticker, titre, composition photo, emblème personnel, animation courte, récap collectif ou personnel, affiche de fin et souvenir complet de saison. Ce sont des modèles ou objets débloqués, pas des activités fictives déjà générées. Chaque modèle photo a une alternative typographique ; chaque récompense collective a une variante solo. Aucune publication, photo ou adhésion ne conditionne l'achèvement de la saison. La diversité visuelle doit être réelle ; éviter douze recolorations présentées comme douze objets majeurs.

Une seule collection saisonnière progresse à la fois : saison actuelle ou archive choisie. Les mêmes XP font avancer la carrière et cette unique collection, sans multiplication entre archives. Changement de collection effectif pour les prochaines journées seulement. Les XP au-delà du palier 12 continuent la carrière, sans crédit automatique à une autre saison. Le choix par défaut est la saison actuelle ; un arrivant tardif peut conserver cette collection en archive jusqu'à son terme.

GRYD+ ajoute six variantes artistiques aux paliers 2, 4, 6, 8, 10 et 12, avec **les mêmes exigences de progression**. Aucun palier payant ne contient un insigne de performance. Le détail des droits après abonnement figure au §16.

### 7.4 Badges de maîtrise

| Famille | Exemples de conditions | Ce que cela valorise |
|---|---|---|
| Départ | Première activité ; première boucle valide | Oser commencer. |
| Régularité | 8 journées sur 6 semaines ; 24 sur 16 semaines | Continuer sans exiger une série quotidienne. |
| Exploration | 5 puis 15 boucles personnellement distinctes | Découvrir ; dédupliquer les traces presque identiques. |
| Ensemble | 3 puis 10 sorties de groupe consenties et validées | Appartenance, sans obligation de publier. |
| Accueil | Animer 3 sorties ouvertes ayant eu de vrais participants | Travail communautaire, avec validation et antispam. |
| Course | Premiers 5 km, 10 km, semi ou marathon enregistrés | Jalons facultatifs ; aucun avantage territorial. |
| Vélo | Premiers 20, 50 ou 100 km enregistrés | Jalons adaptés au sport ; ne jamais les pousser à un débutant. |
| Double pratique | 4 journées course et 4 vélo sur 12 semaines | Variété, sans bonus de score contre un pratiquant mono-sport. |

Les performances historiques importées peuvent compléter le souvenir et les badges non compétitifs si leur provenance est admissible. Elles ne doivent pas générer une prise de terrain actuelle ni une inflation de XP rétroactive illimitée.

### 7.5 Catalogue de lancement

**Pas de monnaie virtuelle au lancement.** Les objets sont gratuits, gagnés selon une condition visible, inclus dans GRYD+ ou vendus en euros. Cela remplace Foulées, Éclats, coffres aléatoires et conversions opaques.

| Collection | Contenu | Obtention | Permanence |
|---|---|---|---|
| Essentiels | Carte claire/sombre, photo, sticker transparent, film 2D simple, typographie standard | Gratuit dès le départ | Permanente. |
| Première trace | Signature et affiche dédiée | Première journée active | Permanente. |
| Craie | Palette claire, deux compositions | Niveau 5 | Permanente. |
| Atlas | Trois mises en page, cadre fin | Niveau 10 | Permanente. |
| Album collectif standard | Composition de souvenir à partir des données consenties | Gratuit dès la première sortie collective | Permanente. |
| Badge Ensemble | Badge et variante de composition distincte | Trois sorties de groupe validées | Permanente. |
| Saison | Douze objets décrits ci-dessus | Jouer gratuitement | Permanente une fois gagnée. |
| Studio | Quatre compositions premium, polices sous licence et placement guidé ; films 3D exclus de P1 | Abonnement GRYD+ | Outils accessibles pendant l'abonnement. |
| Éditions | Six variantes d'objets saisonniers | GRYD+ actif lors du déblocage ou rattrapage d'une saison déjà acquise | Objets débloqués conservés. |
| Affiche Contour | Un ensemble de compositions originales | 1,99 € TTC, achat unique proposé | Permanente. |
| Collection Relief | Quatre compositions statiques et cadre Relief Studio, distinct du mérite Ligne de crête | 3,99 € TTC, achat unique proposé | Permanente. |
| Collection Clubhouse | Six compositions + un motif de blason personnel | 7,99 € TTC, achat unique proposé | Permanente. |

Les collections à achat unique ne sont pas les mêmes produits que Studio : l'écran précise le contenu exact et évite de facturer deux fois un objet détenu. Aucun objet vendu ne porte un titre tel que « Champion » s'il suggère une performance non accomplie.

## 8. Une vraie application de running et de vélo

### 8.1 Avant la sortie

Le mode précédent est mémorisé et son nom reste visible. Une invitation vélo ouvre le contexte vélo sans effacer celui de la course. Le changement de sport pendant l'enregistrement est interdit ; terminer puis démarrer une autre activité.

L'action principale démarre une séance libre. Une action secondaire « Choisir un parcours » permet : boucle ou aller simple, durée ou distance souhaitée, point de départ, préférence de relief et type de surface disponible. Deux ou trois propositions maximum, avec provenance cartographique et limites de fraîcheur. Aucune promesse « itinéraire sûr » sans réserve ; écrire « privilégie les voies adaptées » lorsque le moteur le permet.

Les objectifs territoriaux sont une préférence facultative. **GRYD n'allonge pas automatiquement un footing prévu de 30 minutes pour capturer davantage.** Le parcours doit respecter le budget indiqué ; sinon, signaler qu'aucune proposition ne correspond.

### 8.2 Matrice sportive

| Besoin | Course à pied | Vélo |
|---|---|---|
| Trois mesures principales | Distance, durée, allure moyenne | Distance, durée, vitesse moyenne |
| Mesure instantanée | Allure lissée, avec état GPS | Vitesse, adaptée à l'arrêt et à la descente |
| Détails utiles | Splits, dénivelé, fréquence cardiaque si disponible | Dénivelé, vitesse par portion, puissance/cadence si réellement disponibles |
| Pause automatique | Désactivée par défaut, réglage personnel | Proposée pour arrêts, sans combler les trous GPS |
| Séance structurée | Intervalles simples facultatifs, accès libre | Segments d'effort facultatifs, sans écran tactique en mouvement |
| Parcours | Chemins autorisés à pied, traversées, accessibilité | Réseau cyclable, sens de circulation, revêtement et restrictions |
| Équipement | Chaussures, kilométrage indicatif | Vélo, type route/gravel/VTT, kilométrage indicatif |
| Affichage en mouvement | Grands chiffres, retour audio optionnel | Contrôles surdimensionnés, lecture rapide, aucune interaction de jeu requise |
| Fin | Résumé course et impact Course | Résumé vélo et impact Vélo |

Les splits doivent annoncer le mode de temps utilisé. Le temps écoulé et le temps en mouvement restent distinguables. Aucun champ vide n'est remplacé par une fréquence cardiaque, une puissance ou des calories inventées.

### 8.3 Pratiques particulières

- **VAE :** activité et souvenir disponibles avec étiquette claire ; pas de territoire ou défi vélo non assisté. Une catégorie dédiée peut être ouverte lorsque son moteur et sa communauté sont prêts.
- **Home trainer/tapis :** journal et progression de régularité admissible ; aucune capture géographique.
- **Trail/VTT :** conservation des traces, relief et activité ; adapter les parcours aux données réellement disponibles. Ne pas extrapoler les règles d'accès de la route aux sentiers.
- **Marche/course alternée :** acceptée en reprise. Ne pas classer un utilisateur comme tricheur parce qu'il marche.
- **Compétition sportive réelle :** l'utilisateur peut enregistrer en mode sport, sans alertes territoriales.
- **Blessure ou pause :** action « Mettre le jeu en pause » qui coupe les sollicitations, sans réclamer de diagnostic ni retirer les objets.

### 8.4 Fiabilité attendue

L'enregistrement doit survivre à un changement de page et conserver les points déjà persistés en cas de crash. Une fermeture forcée ou une limitation système peut interrompre la collecte : au retour, GRYD reprend les données disponibles et montre la portion manquante au lieu de la reconstituer.

L'Apple Watch doit devenir un vrai moyen de partir sans téléphone dans la cible produit. La première livraison peut s'appuyer sur un import Santé réellement fonctionnel ; elle ne doit pas annoncer une application Watch native si elle n'existe pas. Le suivi sur écran verrouillé et les contrôles de séance doivent être testés sur appareils réels, avec les API permises.

HealthKit distingue l'activité et sa route, qui peut arriver après l'activité. Un import sans géométrie reste « trace en attente » avant de devenir « statistiques uniquement » selon un délai maîtrisé. L'origine d'un échantillon fournit un indice de provenance, pas une certification antitriche. [Apple, lecture des routes](https://developer.apple.com/documentation/healthkit/reading-route-data) · [Apple, sourceRevision](https://developer.apple.com/documentation/healthkit/hkobject/sourcerevision)

## 9. Architecture de l'expérience

### 9.1 Trois destinations stables

```text
CARTE                         CREW                         PROFIL
├─ Course / Vélo              ├─ Mon crew par sport       ├─ Journal et activités
├─ Terrain actuel             ├─ Sorties et inscriptions  ├─ Statistiques privées
├─ Zone sélectionnée          ├─ Annonces et échanges     ├─ Niveau et badges
├─ Choisir un parcours        ├─ Défi de la semaine        ├─ Collection et saison
└─ Courir / Rouler            └─ Trouver / créer un crew   └─ Réglages et GRYD+
       ↓
Enregistrement → Résultat → Studio de partage
```

Le bouton de départ appartient à la Carte. Il ne flotte pas sur une page de confidentialité, un achat ou le Profil. Pendant une activité, une barre discrète « Sortie en cours » permet de revenir au suivi depuis une autre page, sans mettre l'enregistrement en danger.

Pas de quatrième destination Boutique, Saison ou Classement. La collection est accessible depuis le Profil et le résultat ; le défi depuis Crew. La page d'accueil reste la carte, même si aucun crew n'a encore été choisi.

### 9.2 Onboarding court, apprentissage progressif

**Premier lancement :** une composition qui montre une trace et une zone, une phrase de promesse et « Découvrir GRYD ». L'utilisateur choisit Course ou Vélo ; il peut explorer une carte locale avec ville saisie manuellement, sans donner sa position.

**Au premier départ :** expliquer le besoin de localisation puis présenter la demande système au moment où elle est nécessaire. Compte requis pour sauvegarder sur le serveur et participer au jeu partagé ; proposer Apple et email, en conservant l'action ou l'invitation en cours. Un essai local sans compte est possible si la sauvegarde et sa migration sont réellement maîtrisées.

**Après la première sortie :** résultat d'abord. Une explication contextuelle montre la différence trace/boucle ; une seule proposition secondaire, par exemple rejoindre un crew. Les notifications arrivent lorsqu'on demande un rappel ou suit un événement, pas comme une barrière au lancement.

Aucun questionnaire sur poids, âge exact, fréquence cardiaque ou niveau sportif n'est nécessaire pour regarder la carte. Les informations utiles à une séance ou à un groupe se demandent plus tard, avec un bénéfice compréhensible.

### 9.3 Contrats entre pages

| Transition | Comportement attendu |
|---|---|
| Invitation → installation → connexion | Conserver le crew et la sortie visés ; proposer une adhésion explicite. |
| Carte → zone → retour | Retrouver le centre, le zoom et le sport précédents. |
| Course → Vélo | Charger les bonnes données sans afficher transitoirement celles de l'autre sport. |
| Résultat → partage → annulation | Revenir au même résultat ; brouillon conservé localement. |
| Achat → fermeture | Revenir à l'objet consulté, avec les droits réellement obtenus. |
| Import pendant un enregistrement | Ne pas interrompre le suivi ; traiter l'import à part. |
| Changement de compte | Aucun cache privé ni export en attente visible pour le compte suivant. |
| Suppression d'une activité | Expliquer les effets sur journal, médias hébergés et jeu ; recalcul autoritaire. |
| Suppression de compte | Révoquer les droits et bloquer les imports tardifs qui pourraient recréer des données. |

## 10. Direction artistique et système UI

### 10.1 Le langage visuel de GRYD

La carte est le centre visuel. Les pages sportives ressemblent à un instrument lisible ; les pages sociales à un album vivant ; les récompenses à des objets éditoriaux de qualité.

Le style cible est précis : **carbone, craie, trace chartreuse, photographie réelle, typographie nette et beaucoup d'espace**. Une récompense peut avoir du relief ; une commande doit rester évidente. Aucun HUD militaire, nuage de confettis permanent, texture métallique derrière les chiffres ou carte visuelle emboîtée dans une autre.

### 10.2 Tokens de référence

| Usage | Mode sombre | Mode clair |
|---|---|---|
| Fond | `#0A0D0C` | `#F6F7F2` |
| Surface principale | `#171C19` | `#FFFFFF` |
| Surface secondaire | `#242B26` | `#E9EDE6` |
| Texte principal | `#F5F7F2` | `#121713` |
| Texte secondaire | `#B7C0B9` | `#4C594F` |
| Action majeure | `#C9FF38`, texte carbone | `#C9FF38`, texte carbone |
| Trace personnelle | Chartreuse avec contour sombre | Chartreuse avec contour sombre épais |
| Autre terrain | Ambre désaturé | Ambre foncé sur remplissage léger |
| Sélection | Contour renforcé + libellé | Même principe |
| Erreur | Rouge accessible + icône + texte | Même principe, teinte adaptée |

La chartreuse claire ne sert pas de petit texte sur fond blanc. Les valeurs sont des tokens proposés : mesurer le contraste de **chaque paire effectivement utilisée**, y compris les labels sur la carte, avant validation. Les couleurs de territoire expriment un rôle relatif à l'utilisateur, jamais une palette aléatoire pour des milliers de crews.

La carte collective peut distinguer « moi », « mon crew » et « autres » avec l'intensité du contour, un motif discret et un nom au toucher. La couleur ne porte jamais seule une information de possession.

### 10.3 Typographie, rythme et composants

- iOS : police système pour commandes et texte ; titres éditoriaux Inter Tight si licence et rendu validés. Une seule famille de marque supplémentaire.
- Corps 17 pt, légendes usuelles 13–15 pt, titres 28–34 pt, chiffre principal 48–64 pt selon largeur disponible. Chiffres tabulaires pour les valeurs en mouvement.
- Espacements 4/8/12/16/24/32/48 ; marges latérales de référence 20 pt, adaptées aux tailles d'écran.
- Boutons principaux 56 pt de haut ; zones tactiles usuelles au moins 44 × 44 pt ; contrôles sportifs visés à 56–64 pt.
- Rayons : 12 pour petits contrôles, 20 pour médias, 28 pour grandes feuilles ; utiliser des rayons concentriques cohérents.
- Les listes emploient alignements et séparateurs discrets. Les cartes visuelles représentent des objets autonomes : sortie, crew, événement, création.
- Trois mesures maximum au premier niveau d'un résultat ; les détails sont à une action.
- Barre d'onglets et feuilles adaptées à iOS, respect des zones sûres et des gestes de retour. Les mêmes principes sont adaptés à Android lors de son lancement.

Ces tailles sont des choix GRYD. Apple recommande notamment des contrôles suffisamment grands, une hiérarchie accessible et des informations qui ne reposent pas uniquement sur la couleur. [Apple, accessibilité](https://developer.apple.com/design/human-interface-guidelines/accessibility/)

### 10.4 Mouvement et son

| Moment | Animation cible | Variante accessibilité |
|---|---|---|
| Sélection d'une zone | Atténuation du contexte et apparition du panneau, 180–240 ms | Fondu simple. |
| Résultat confirmé | Trace dessinée puis remplissage réel, 900–1 200 ms | Résultat statique immédiat. |
| Objet gagné | Apparition courte, 300–500 ms | Image + texte, sans rotation. |
| Navigation | Transition système ou équivalent prévisible | Respect « Réduire les animations ». |
| GPS faible | Indicateur stable, retour audio optionnel | Texte accessible ; aucun clignotement. |

Un seul retour haptique léger peut accompagner une confirmation. Pas d'effet de capture en permanence pendant la sortie. Le son est optionnel et ne masque pas les signaux utiles du monde réel.

### 10.5 Accessibilité et extérieur

Dynamic Type doit préserver les actions sans tronquer les libellés. Tester VoiceOver sur la carte via une liste alternative de zones ; annoncer sport, propriétaire, état et action. Prévoir « Augmenter le contraste », « Réduire la transparence », « Réduire les animations », clavier externe et saisie vocale pour les formulaires utiles.

Le mode clair est pleinement conçu, pas une inversion tardive du sombre. Pendant une sortie en plein soleil, les mesures restent lisibles et les boutons atteignables d'une main. Pluie, gants de vélo, écran humide, faible batterie et connexion absente font partie de la recette.

## 11. Les écrans à reconstruire

Les identifiants ci-dessous appartiennent à cette refonte. Ils ne reprennent pas les numéros contradictoires des anciennes planches. Chaque écran doit être dessiné avec un vrai état de données, un état vide et son principal cas d'erreur.

### G01 — Entrée dans GRYD

**Composition :** une photo authentique de sortie, une trace originale superposée avec parcimonie, promesse sur deux lignes, bouton « Découvrir GRYD », accès « J'ai déjà un compte ». Aucun carrousel imposé. Le visuel n'est jamais utilisé comme preuve d'une activité réelle s'il est illustratif.

**Réussite :** une personne explique en moins de dix secondes que ses sorties peuvent créer des zones et qu'elle peut jouer avec ses proches.

### G02 — Connexion et création de compte

**Composition :** titre contextualisé « Retrouve ton crew » ou « Garde tes sorties », Apple et email, informations légales discrètes. Pseudonyme et avatar facultatif au strict nécessaire. L'invitation reste visible.

**États :** lien expiré, connexion annulée, compte existant, réseau absent ; conserver les champs sûrs et proposer une reprise claire. Pas de message serveur brut.

### G03 — Carte au repos

**Composition :** carte sur environ les deux tiers supérieurs de l'écran, ville et sélecteur Course/Vélo en haut, recentrage et couches à portée du pouce. En bas, une phrase contextuelle et le bouton « Courir » ou « Rouler », puis les trois onglets. Les proportions s'adaptent aux textes et aux tailles d'écran.

```text
Paris                         Course ▾

              CARTE
       rues lisibles, zones calmes
       aucune position de rival en direct

Ta prochaine boucle commence ici.
Choisir un parcours →

              [ Courir ]

     Carte        Crew        Profil
```

**Données :** position consentie ou ville choisie, terrain de la discipline, état de fraîcheur, éventuel parcours sélectionné. Sans territoire : « Le quartier est à découvrir. » Sans GPS : ville manuelle et départ accessible après permission. Pas de grande capitale affichée par défaut comme si l'utilisateur s'y trouvait.

### G04 — Zone sélectionnée

La géométrie reste visible au-dessus d'une feuille. Montrer nom de lieu disponible, possession actuelle, surface et dernière mise à jour arrondie. Action principale : « Voir un parcours » ; « Comment fonctionne la reprise ? » en lien secondaire.

Pas de promesse de gain garanti : d'autres activités peuvent intervenir. Si le lieu ne permet pas de parcours admissible, afficher la raison et revenir à l'exploration. Nom privé : « Terrain d'un membre », sans fuite d'identité via avatar ou URL.

### G05 — Couches et affichage

Feuille courte : Standard/Satellite, Clair/Sombre/Système, « Atténuer les autres terrains », « Mes traces », « Limites du jeu ». Les variantes de partage ne sont pas des couches de la carte de jeu. Les réglages de confort sont gratuits et mémorisés par sport.

### G06 — Choisir un parcours

Une carte, un réglage durée/distance, préférence boucle/aller simple, deux ou trois propositions. Chaque ligne montre distance, dénivelé disponible et type de voie connu. L'objectif du crew peut être ajouté volontairement.

Action : « Utiliser ce parcours ». « Modifier » reste secondaire. Si le moteur ne trouve rien, l'utilisateur peut partir librement ; GRYD ne fabrique pas de route.

### G07 — Préparation au départ

Écran bref ou feuille selon les permissions restantes : sport, source d'enregistrement, statut GPS, confidentialité. Si tout est prêt, le départ se fait directement depuis la carte avec un décompte annulable de trois secondes. Une demande système de permission ne doit jamais perdre l'état de préparation.

Le seuil de qualité GPS requis pour démarrer le chronomètre peut différer de celui requis pour capturer. Expliquer ce choix simplement : « Tu peux partir. La précision GPS s'améliore. »

### G08 — Course en cours

**Composition :** distance dominante, durée et allure, une petite vue de trace disponible ; grand contrôle Pause. Balayage ou bouton nommé pour alterner Mesures/Carte. Statut « Enregistrement » stable.

**Contenu masqué :** boutique, récompenses, chat, adversaires, classement, compte à rebours de saison. Aucun gain territorial n'est présenté comme définitif avant validation serveur.

### G09 — Vélo en cours

Même logique, mais vitesse et distance adaptées au cyclisme ; lisibilité renforcée, orientation stable et réglage de verrouillage tactile. La carte privilégie les voies utiles. Les annonces audio sont facultatives et configurées à l'arrêt.

Pause et fin sont accessibles sans geste fin. Aucun écran ne demande de choisir un secteur ou de répondre à un crew en roulant.

### G10 — Pause, fin et récupération

Deux actions clairement séparées : « Reprendre » et « Terminer ». Un toucher accidentel sur Terminer ne détruit rien ; la sauvegarde précède le résultat. Après une interruption, montrer durée et distance réellement retrouvées, puis « Reprendre » ou « Garder cette sortie ».

Une suppression volontaire est une action distincte, avec confirmation appropriée. Pas d'appui long obligatoire comme unique moyen accessible de terminer.

### G11 — Sauvegarde et analyse

Le premier message est factuel : « Sortie enregistrée sur cet appareil » uniquement après écriture durable. Puis synchronisation et validation. La trace et les statistiques locales restent consultables.

Trois résultats possibles : impact confirmé, analyse en attente, activité conservée sans capture. Une lenteur du moteur n'empêche pas de quitter cet écran ; le résultat arrive dans le journal. Aucun paywall ne s'intercale.

### G12 — Résultat d'une sortie

La trace devient l'image principale. Sous elle : distance, durée, allure/vitesse. Une phrase explique le terrain : « +0,18 km² pour ton terrain », « Ta boucle retrouve 0,08 km² » ou « Ta sortie est enregistrée » lorsqu'il n'y a pas de capture.

Un seul événement de progression est mis en avant : niveau ou objet gagné, selon priorité. Les autres sont regroupés derrière « Voir les détails ». Action principale : « Partager » ; accès secondaire au journal.

```text
Ta boucle du canal

      TRACE RÉELLE / ZONE CONFIRMÉE

  5,20 km          31:42          6:06/km

  +0,18 km² de nouveau terrain
  Niveau 5 atteint · Palette Craie

                [ Partager ]
                Voir les détails
```

Les trois valeurs de cet exemple sont cohérentes entre elles à l'arrondi. Une capture non confirmée ne produit pas une affiche de victoire.

### G13 — Détail d'activité

Titre, date, sport, source, audience, carte, statistiques puis splits et graphiques disponibles. Un onglet ou segment « Sport / Terrain » sépare l'analyse sportive de l'explication géographique.

Menu : modifier titre/photo/audience, exporter, signaler un résultat, supprimer. L'explication de capture affiche surface de boucle, exclusions, nouveau terrain et chevauchement ; elle n'expose pas des identifiants internes.

### G14 — Studio de partage

Une création déjà prête occupe l'essentiel de l'écran. Quatre familles visibles : **Carte · Photo · Sticker · Film**. L'ancienne limite à trois familles est remplacée pour rendre les nouveaux formats animés trouvables ; les variantes restent dans une bibliothèque secondaire.

Sous la création : style, mesures et données incluses dans le fichier ; la visibilité du lien GRYD est réglée séparément. GRYD ne contrôle pas l'audience d'une image après export vers un réseau. Action « Partager » ouvre la feuille système. La personnalisation avancée se déploie seulement au besoin. Une option payante montre un aperçu clairement marqué et son prix avant achat ; aucune création gratuite n'est remplacée silencieusement.

### G15 — Crew, vue principale

Photo de groupe ou blason, nom, discipline, ambiance et prochaine sortie. Ensuite un objectif collectif et trois contributions récentes maximum, puis le fil chronologique complet au besoin. L'action principale dépend du contexte : « Participer à la sortie » ou « Inviter un ami ».

Un crew ne ressemble pas à une grille de coffres et de bonus. Son identité vient de ses membres, de son rendez-vous et de son histoire. Le classement reste secondaire.

### G16 — Découvrir un crew

Liste courte avec ville, sport, rythme annoncé, niveau d'accueil, prochaine sortie et nombre de membres actifs selon définition transparente. Filtres : débutants bienvenus, sans abandon, horaires et type de pratique.

Pas de profilage automatique par allure importée. Sans résultat : créer un groupe privé ou explorer seul. Une demande d'adhésion en attente reste visible, sans faux bouton « Rejoint ».

### G17 — Créer et administrer un crew

Création en trois étapes : nom et sport ; public/sur demande/privé ; invitation. Le blason standard suffit. Les règles de base sont préremplies et éditables.

Administration secondaire : rôles, demandes, modération, événements, annonces, transfert de propriété et fermeture. Un crew peut avoir deux sections Course/Vélo ; le joueur choisit un crew actif par discipline. Un grand club peut accueillir de nombreux membres mais inscrit des équipes distinctes de cinq dans les matchs.

### G18 — Sortie de groupe

Titre humain, sport, date, point de rendez-vous, durée/distance, allure annoncée, responsable, règles « on attend tout le monde », matériel utile et météo seulement si source fraîche. La liste d'inscrits et la capacité sont lisibles.

Action : « Je participe », puis « Ajouter au calendrier ». L'adresse exacte d'un rendez-vous privé n'est visible qu'aux inscrits autorisés. Annulation et modification demandent une notification utile aux inscrits, sans message à tout le réseau.

### G19 — Invitation et QR

Une affiche du crew ou de l'événement, son nom exact, un QR et un lien partageant le même jeton. Actions : partager ou copier. La page d'arrivée montre la même discipline et le même rendez-vous.

Un lien expiré explique son état. Le jeton peut être révoqué par un responsable. La personne choisit de rejoindre ; l'ouverture seule ne crée pas une adhésion.

### G20 — Défi de la semaine

En tête : deux crews, durée et règles accessibles. Trois lignes montrent les secteurs et le score connu. La carte du défi est clairement titrée ; elle ne remplace pas la carte libre. Afficher « Contributions : 1 journée sur 2 » et la prochaine occasion possible, sans convertir cela en injonction.

Action : « Voir les secteurs ». À la fin, un résultat explicable et un objet souvenir. Un nul est un vrai résultat, pas une invitation à acheter une revanche.

### G21 — Échanges et annonces

Fil chronologique du crew, messages liés à une sortie ou un défi, réactions sobres. Annonce du capitaine identifiable. Publication manuelle par l'utilisateur, pas de message inventé en son nom.

Signaler, bloquer et masquer restent accessibles sur chaque contenu. Éviter les messages privés ouverts à tous au lancement ; les échanges contextualisés limitent le spam et rendent la modération praticable.

### G22 — Profil et journal

Portrait, nom, ville facultative, niveau permanent et crew. Le journal arrive juste après, avec filtre sport et calendrier léger. Les statistiques montrent la période choisie et peuvent être masquées sur le profil public.

Pas de sept rangs différents au-dessus du nom. La collection et les badges sont accessibles dans un même ensemble. Les réglages se trouvent dans un bouton standard.

### G23 — Progression et saison

Une seule prochaine récompense domine la vue initiale. Un sélecteur « Saison / Parcours » donne accès soit à la collection à 12 étapes, soit au niveau permanent. Trois étapes proches sont visibles, sans galerie interminable de cadenas ; les maîtrises restent dans la collection. Les objets gagnés s'équipent depuis leur fiche. Le résultat d'activité explique une fois les XP communs, sans deux célébrations redondantes.

État de repos : « Ton histoire reste ici. » État de fin de saison : album et suite possible. Aucune jauge ne régresse parce qu'un rival a pris un terrain.

### G24 — Collection et boutique

Deux segments : « Mes objets » et « Collections ». Chaque objet montre son rendu, son statut, son obtention et sa permanence. Les objets déjà détenus portent « Équiper » ; les objets gagnables indiquent une condition vérifiable.

Trois collections commerciales au lancement suffisent. Aucun prix masqué derrière des gemmes. Pas de pastilles rouges permanentes ni de faux stocks restants.

### G25 — Statistiques sportives

Période puis sport. Distance, temps et fréquence de sortie ; sous ce résumé, évolution lisible, splits et relief. Les données de puissance ou de fréquence cardiaque n'existent que si la source les fournit.

Les analyses avancées GRYD+ répondent à une question : « Comment évoluent mes sorties ? », « Quelles séances ai-je répétées ? ». Une synthèse automatique décrit les faits et ne prescrit pas un entraînement médical. Aucun score de forme propriétaire inexpliqué au lancement.

### G26 — Sources et appareils

Liste avec état réel : connecté, synchronisation en attente, action nécessaire, indisponible. Pour chaque source, expliquer ce qui est récupéré, ce qui peut capturer et ce qui reste privé. Afficher dernière synchronisation réussie et possibilité de déconnexion.

Ne pas montrer Garmin ou Strava comme « connecté » sur la seule présence d'un logo. Une autorisation Santé refusée en lecture peut être indiscernable de données absentes : employer « Aucune donnée disponible » plutôt qu'un diagnostic faux.

### G27 — Confidentialité et notifications

Audiences, carte partagée, départ/arrivée, zones protégées, médias publics, notifications, export et suppression. Aperçu « Vu par les autres » directement accessible. Consentements distincts pour messages utiles et promotion.

Une permission système et un consentement à un usage ne sont pas confondus. Ouvrir les réglages du système lorsque le changement s'effectue là-bas ; ne pas afficher un interrupteur local qui prétend modifier HealthKit.

### G28 — GRYD+ et gestion d'abonnement

Trois bénéfices concrets, aperçu réel, prix mensuel/annuel, montant total facturé, récurrence, conditions et restauration. Fermer est immédiatement visible. Aucun paywall à froid avant d'avoir expérimenté la valeur.

États : achat en attente, annulé, refusé, réussi, déjà détenu, restauration sans droit, résiliation en fin de période. « Premium activé » n'apparaît qu'après confirmation des droits.

### G29 — Aide, litige de sortie et sécurité

Une aide liée à l'activité récupère son identifiant et son statut sans demander à l'utilisateur de recopier des erreurs. Motifs simples : trace manquante, capture incohérente, doublon, mauvaise discipline, achat, contenu problématique.

La personne voit le statut du dossier. Un agent autorisé accède au strict nécessaire avec journal d'accès. Pas de publication de coordonnées précises dans un espace communautaire de support.

## 12. Traces de carte et tous les partages : cahier complet

### 12.1 Reprendre la force visuelle de Strava

La référence à reprendre est la **trace nette, reconnaissable et prioritaire**. Le moteur, le dessin de marque et les compositions GRYD restent propres au produit. Il faut distinguer fond cartographique, coloration de trace, couche de données et format exporté.

Sur la carte : un contour sombre continu sous un cœur chartreuse, extrémités arrondies, intersections propres. Largeur proposée en points d'interface : cœur 3/4/5 et contour 5/7/9 selon zoom éloigné/normal/proche. Ajuster au facteur d'échelle sans rendre la ligne énorme au zoom rue.

Pendant le sport, la trace enregistrée domine ; le parcours prévu est secondaire et différencié par motif. Une lacune GPS reste une lacune. Le lissage de rendu ne coupe pas les virages et ne change pas le calcul d'aire.

Dans le résultat, un cadrage automatique donne une marge suffisante à la trace sans la cacher sous des données. Départ et arrivée ne sont visibles qu'après application des règles de confidentialité. Sur une activité en boucle, éviter des marqueurs empilés illisibles.

### 12.2 Référence Strava vérifiée : cartes et données

Strava documente les cartes standard/saisonnières, des traces colorées par allure ou vitesse, fréquence cardiaque, altitude, pente, surface, puissance mesurée, temps et température, ainsi que des vues 3D. Les variantes statistiques et 3D sont associées à l'abonnement dans l'aide consultée ; certaines anciennes cartes de causes ne sont plus proposées aux nouvelles activités. [Types de cartes Strava](https://support.strava.com/en-us/articles/15401748-map-types) · [Évolution des styles de causes](https://support.strava.com/en-us/articles/15401562-promoting-causes-on-strava)

Pour GRYD, les styles statistiques suivent les **données réellement disponibles** : allure/vitesse et altitude en priorité ; FC/puissance uniquement avec données admissibles et accord de partage. Ajouter une légende compréhensible. La teinte d'un effort ne modifie jamais la couleur de possession de la carte de jeu.

### 12.3 Inventaire documenté des partages Strava

Ce tableau couvre toutes les familles trouvées dans les sources officielles consultées. Il ne certifie pas chaque variante d'un carrousel iOS français : certaines dépendent du compte, du sport, des données ou d'un déploiement progressif. La couverture des formats et leurs conditions d'accès doivent être vérifiées sur comptes gratuit et abonné avant réalisation finale.

| Famille attestée | Accès ou limite vérifiée | Réponse GRYD prévue |
|---|---|---|
| Carte statique avec statistiques | Partage de base, trace GPS pour la carte. [Aide](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities) | Affiche Carte, gratuite. |
| Photo avec statistiques | Photo associée à l'activité ; pas de paywall indiqué dans cette aide. [Aide](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities) | Photo plein cadre, gratuite ; compositions Studio en supplément. |
| Sticker de statistiques à superposer | iOS/Android attestés ; paywall exact de toutes les variantes non établi. [Annonce](https://communityhub.strava.com/what-s-new-10/use-strava-stats-stickers-on-ig-stories-ios-android-9344) | PNG transparent, trace seule, chiffres seuls ou combinaison, gratuitement. |
| Activity Replay | Bêta abonnés, nouvelles activités et versions compatibles. [Aide](https://support.strava.com/en-us/articles/15401546-activity-replay) | Film 2D gratuit avec trace et résultat réel. |
| Flyover | Survol 3D abonnés, génération éventuellement différée. [Aide](https://support.strava.com/en-us/articles/15401641-flyover) | Film Relief GRYD+, avec repli 2D. |
| Weekly Streak Stickers | Quatre nouveaux designs annoncés en avril 2026 ; Streaks accessible à tous. [Annonce](https://stories.strava.com/es/articles/whats-new-on-strava-new-languages-annual-best-efforts-and-weekly-streak-stickers) · [Accès Streaks](https://support.strava.com/en-us/articles/15401580-streaks-on-strava) | Carte de régularité hebdomadaire, sans série quotidienne punitive. |
| Best Efforts | Créations de records annoncées pour abonnés. [Annonce](https://stories.strava.com/articles/whats-new-on-strava-muscle-maps-new-sports-and-expanded-training-tools) | Affiches de jalons sportifs gagnées gratuitement ; variantes Studio. |
| Month in Sport | Bilan généré sous conditions, dont au moins trois activités ; récap mensuel payant indiqué par l'aide annuelle. [Mensuel](https://support.strava.com/en-us/articles/15401741-month-in-sport) · [Annuel](https://support.strava.com/en-us/articles/15401959-your-year-in-sport) | Bilan mensuel statique gratuit, film avancé GRYD+. |
| Year in Sport | Campagne abonnés documentée du 8 décembre 2025 au 23 janvier 2026 ; ne pas présumer la prochaine campagne. [Aide](https://support.strava.com/en-us/articles/15401959-your-year-in-sport) | Album annuel personnel gratuit ; montage avancé GRYD+. |
| Liens activité, route, segment, profil, club | L'accès suit la visibilité de l'objet. [Aide](https://support.strava.com/en-us/articles/15401717-how-to-get-and-share-links-from-strava) | Liens activité, parcours, profil, crew et événement avec audience contrôlée. Pas de segments compétitifs GRYD au lancement. |
| Intégration dans une page web | Activités/itinéraires publics sous conditions. [Aide](https://support.strava.com/en-us/articles/15402053-sharing-your-activities-and-routes-with-a-strava-embed) | Carte web publique consentie ; widget embarqué en phase 2. |
| Snapchat Lens | Connexion Snapchat, sélection d'activités admissibles ; activités réglées sur « Only You » exclues. [Aide](https://support.strava.com/en-us/articles/15401686-snapchat-and-strava) | Export média compatible d'abord ; Lens spécifique uniquement après validation partenaire. |
| Médias de lunettes Meta | Matériel et intégration spécifiques. [Aide](https://support.strava.com/en-us/articles/15401555-meta-glasses-and-strava) | Import de photo/vidéo personnelle standard ; intégration dédiée hors lancement. |
| Flyer d'événement de club | Affiche et lien depuis un événement mobile. [Aide](https://support.strava.com/en-us/articles/15401898-group-events-for-clubs) | Affiche de sortie et QR gratuits. |
| Export de données sportives | Fichiers originaux, GPX/TCX selon possibilités ; distinct des médias. [Aide](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export) | Export personnel gratuit avec choix trace privée complète ou version protégée. |

Deux familles supplémentaires doivent être reconnues sans les confondre avec des affiches de course : **Beacon**, partage de position à des proches, et **les cinq compositions de cartes musculaires, avec ou sans statistiques**. La première relève d'une fonction de sécurité séparée ; les secondes restent hors du périmètre running/vélo initial. Une éventuelle extension renforcement devra être conçue avec de vraies données, pas un modèle de corps décoratif. [Abonnement et Beacon](https://support.strava.com/en-us/articles/15402044-what-features-are-included-in-a-strava-subscription) · [Musculation](https://support.strava.com/en-us/articles/15401547-strength-training)

### 12.4 Bibliothèque originale GRYD

| Modèle | Composition et contenu | Accès | Livraison |
|---|---|---|---|
| Trace | Parcours plein cadre, trois mesures | Gratuit | P1 |
| Terrain | Trace et zone ; nouveau terrain net | Gratuit | P1 |
| Photo | Photo personnelle, chiffres contrastés, petite signature | Gratuit | P1 |
| Sticker | Fond transparent, trace/chiffres/ensemble au choix | Gratuit | P1 |
| Ensemble | Photo du crew, activité collective consentie, date | Gratuit | P1 |
| Première | Première activité ou première boucle | Gagné | P1 |
| Record | Jalon réellement atteint, distance et temps | Gagné | P1 |
| Semaine | Jours actifs, sorties et trace composée | Gratuit | P1 |
| Avant/après | Deux états de possession datés, sans double compte | Gratuit | P1 |
| Saison | Souvenir, collection et contributions | Gratuit | P1 |
| Invitation | Rendez-vous, sport, distance annoncée, QR | Gratuit | P1 |
| Replay | Animation 2D, mesures et éventuel impact confirmé | Gratuit | P1 |
| Relief | Caméra 3D et relief avec attribution | GRYD+ | P2 |
| Éditorial | Grille libre encadrée, styles typo et composition | GRYD+ ou collections identifiées | P1/P2 selon modèle |
| Film de crew | Traces consenties et photos en récit collectif | GRYD+ pour les outils avancés ; résultat consultable par le crew | P2 |
| Année | Album statique, film optionnel | Statique gratuit, film avancé GRYD+ | P2 |

**P1 = première version publique complète ; P2 = extension après validation de P1.** Le tableau est la couverture cible. Les fonctions P2 ne doivent pas figurer comme disponibles sur la fiche App Store de P1. L'accès à une famille gratuite n'impose pas un abonnement ; les variantes payantes sont reconnaissables avant sélection.

### 12.5 Spécifications d'export

- Story : 1 080 × 1 920 ; portrait de fil : 1 080 × 1 350 ; carré : 1 080 × 1 080. PNG pour stickers transparents, image compressée proprement pour photos, MP4 H.264 compatible pour les films.
- Prévoir des zones de réserve pour les interfaces des réseaux ; valeur de départ 250 px haut/bas en Story, à vérifier dans les versions courantes de chaque destination.
- Film court de 6–12 secondes, lisible sans son, écran final suffisamment long pour comprendre les chiffres. Audio original/licencié ou silence ; aucune musique protégée ajoutée automatiquement.
- Une courte activité, une activité sans GPS ou sans capture reçoit une composition appropriée, jamais une carte vide ou un faux résultat.
- Les métriques sont arrondies après calcul, avec unités et discipline. Ne pas additionner km de course et km de vélo sous une seule valeur suggérant un sport unique.
- Suppression des métadonnées de localisation du fichier photo/vidéo final. Les coordonnées du parcours font l'objet d'un contrôle distinct.
- Attribution du fournisseur cartographique conservée selon ses licences, dans les images et films. Les droits d'export et de rendu 3D doivent être validés avant choix du fournisseur.
- Signature GRYD discrète ; pas de grand filigrane imposé à l'utilisateur gratuit. QR optionnel sur une affiche de résultat, présent par défaut sur une invitation.
- Création locale si possible ; file de génération explicite pour rendu lourd. Repli gratuit vers image/film 2D si le rendu avancé échoue, sans nouveau paiement.

### 12.6 Destinations et vérité du partage

Le partage système iOS, l'enregistrement dans Photos, la copie de lien et l'export de fichier forment le socle. Les ponts Instagram Stories ou autres destinations sont ajoutés seulement après test réel. L'absence de l'application cible propose la feuille système.

« Média transmis » ne prouve pas que la personne l'a publié. L'analytics distingue création générée, feuille ouverte, remise du fichier et visite de lien ; il ne déclare pas une publication Instagram réussie sans preuve de la plateforme.

Un lien public peut être révoqué. Les médias hébergés par GRYD sont retirés ou régénérés lors d'un changement de visibilité. Une copie déjà téléchargée par un tiers ne peut pas être rappelée ; cette limite apparaît au premier partage public.

### 12.7 La connexion Strava : un projet conditionnel

Les conditions API Strava en vigueur depuis le 1er juin 2026 comportent des restrictions d'affichage à d'autres utilisateurs, de concurrence, de cache, de données dérivées et d'usage IA. Le statut public d'une activité ne donne pas à GRYD une autorisation générale de la réutiliser. La politique contient des nuances de capacité qui ne constituent pas un feu vert à un jeu social concurrent. [API Agreement](https://www.strava.com/legal/api) · [API Policy](https://www.strava.com/legal/api_policy)

**Décision :** aucun territoire public, classement, feed ou service créatif payant GRYD ne dépend de données récupérées par l'API Strava sans validation contractuelle explicite. L'intégration éventuelle est isolée et désactivée tant que son périmètre n'est pas autorisé. Ne pas contourner une restriction en renommant des données Strava « données Santé » après réimportation.

Le chemin principal repose sur l'enregistrement GRYD et des sources directes autorisées. Même ces dernières nécessitent consentement, qualité et droits appropriés. Un export vers Strava n'est pas présenté comme disponible avant son propre test et sa validation. Les logos de partenaires ne remplacent jamais un fonctionnement confirmé.

## 13. Construire la communauté dans l'application

### 13.1 Le crew comme unité sociale principale

Le bon premier réseau est un petit groupe qui se reconnaît. Un crew peut être un groupe d'amis, une section de club ou un groupe ouvert de quartier. La découverte doit montrer son accueil, ses horaires et ses sorties, avant son classement.

Une personne peut fréquenter plusieurs événements, mais représente un seul crew actif par sport pour la carte regroupée et la saison. Les adhésions sociales complémentaires ne donnent pas de doubles contributions. Les règles de changement de crew doivent être visibles : départ immédiat possible ; nouveau match classé à la prochaine semaine ; passé conservé sous les couleurs de l'époque.

### 13.2 La semaine d'un crew

| Moment | Expérience proposée | Valeur |
|---|---|---|
| Lundi | Récap court et proposition de sortie par le capitaine | Se projeter ensemble. |
| Milieu de semaine | Disponibilités et inscriptions | Passer du souhait au rendez-vous. |
| Jour de sortie | Point de rendez-vous et liste d'inscrits | Se retrouver sans messages dispersés. |
| Après | Résultats personnels + album consentant | Reconnaître chaque participant. |
| Fin de semaine | Résumé du groupe, prochain rendez-vous | Garder une continuité sans présence quotidienne. |

Le capitaine n'a pas à alimenter cinq canaux. Une annonce peut devenir un événement, puis recevoir inscriptions, informations et album dans le même fil.

### 13.3 Rôles utiles

**Membre :** participer, proposer une sortie, publier dans les espaces permis. **Organisateur :** gérer ses événements. **Modérateur :** traiter signalements et accès. **Capitaine :** gérer identité, rôles et équipes. La modération et la sécurité ne sont jamais un avantage payant.

La création d'un événement par un nouveau membre peut nécessiter une validation du capitaine. Les permissions sont adaptées à la taille du groupe ; elles n'imposent pas une hiérarchie militaire aux petits crews privés.

### 13.4 Reconnaissance sociale

Réactions limitées et humaines : encouragement, merci, à la prochaine. Les mises en avant tournent entre nouveaux membres, organisateurs, réguliers et réussites personnelles. Ne pas réserver toute la visibilité aux plus rapides.

Après une première contribution : « Ta sortie compte dans celle du crew. » Après un rendez-vous : inviter à remercier l'organisateur, sans message automatique publié au nom du membre. Les surnoms, classements individuels internes et photos restent sous contrôle des personnes concernées.

### 13.5 Modération dès le départ

Prévoir filtrage initial, signalement de contenu ou utilisateur, blocage, contact de support, actions modérateurs et recours. Ces fonctions sont nécessaires aux espaces de contenu utilisateur selon les règles de revue d'Apple. [App Review Guidelines, 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content)

Organisation proposée : priorité immédiate aux menaces et divulgations d'adresses ; objectif interne de première prise en charge sous 24 h pour les signalements courants, à adapter aux effectifs réellement disponibles. Ne pas promettre une modération humaine permanente sans l'organiser.

Les cartes ne servent pas à suivre une personne. Une capture répétée ne génère pas une notification nominative « Paul est près de chez toi ». Les restrictions de blocage s'appliquent au fil, aux invitations, aux recherches et aux données contextuelles ; l'information territoriale résiduelle doit être évaluée pour éviter la reconstitution de déplacements.

Le lancement communautaire cible les adultes. L'âge de disponibilité réel et la classification App Store sont évalués séparément ; l'ouverture aux mineurs nécessitera un parcours, des audiences et une modération adaptés. Ne pas prétendre qu'une simple mention « 18+ » suffit à gérer tous les cas.

## 14. Notifications, messages et rétention

### 14.1 Politique générale

Les notifications servent un événement que l'utilisateur comprend. Apple demande le consentement et distingue les promotions des alertes utiles ; les promotions ne doivent pas franchir Focus par un niveau d'urgence artificiel. [Apple, gestion des notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)

Réglages GRYD : sport, crew, événements suivis, résultats, résumé hebdomadaire, nouveautés/offres. Promotion désactivée par défaut, avec consentement distinct. Le réglage « Pause du jeu » coupe les sollicitations de rétention tout en conservant les messages indispensables au compte ou aux événements déjà suivis.

Budget initial : **3 sollicitations non transactionnelles par semaine au total**, push et email confondus, au maximum 1 par jour ; offres au plus 2 par mois et incluses dans ce budget. Plage calme par défaut 21 h–9 h locale. L'utilisateur peut choisir d'autres horaires ou tout couper.

Les informations transactionnelles demandées, par exemple un événement annulé, peuvent sortir de ce budget, mais sont regroupées et dédupliquées. Elles ne contiennent pas de promotion. GRYD n'utilise pas le niveau d'interruption critique pour son jeu territorial.

### 14.2 Matrice opérationnelle

| Déclencheur | Destinataire et canal | Message type | Fréquence / exclusion | Destination |
|---|---|---|---|---|
| Résultat terminé après attente | Auteur, centre d'activité ; push si demandé | « Ta sortie est analysée. Ton résultat est prêt. » | Une fois ; rien si résultat déjà ouvert | Activité concernée. |
| Sortie suivie demain | Inscrit, rappel choisi | « Sortie du canal demain à 9 h. Les infos sont prêtes. » | Un rappel choisi ; exclure annulé/désinscrit | Événement. |
| Modification ou annulation | Inscrits concernés | « Le rendez-vous de dimanche a changé. » | Chaque changement matériel, regroupement des corrections | Différence visible dans l'événement. |
| Demande d'adhésion acceptée | Nouveau membre | « Tu as rejoint Les Foulées du Canal. » | Une fois | Accueil du crew. |
| Mention utile | Membre mentionné | « Une réponse t'attend dans la sortie de samedi. » | Regroupée ; jamais si auteur bloqué | Fil exact. |
| Défi terminé | Participants | « Le résultat de votre défi est prêt. » | Une fois après clôture effective | Résultat et calcul. |
| Récap hebdomadaire choisi | Membre abonné au récap | « Deux sorties, un nouveau souvenir. Ta semaine est prête. » | Une fois ; rien sans contenu réel | Récap. |
| Retour après 14 jours | Inactif ayant accepté ces messages | « Ton carnet t'attend. Reprends quand tu veux. » | Une fois ; exclure pause/blessure déclarée/opt-out | Carte ou carnet. |
| Nouvelle collection | Consentement promotionnel | « La collection Relief est disponible. » | Maximum deux offres par mois, sans urgence fictive | Aperçu avec prix. |
| Incident compte/paiement | Compte concerné | Message précis lié à l'incident | Transactionnel, sans vente ajoutée | Gestion concernée. |

Une reprise de terrain par un rival alimente le journal du jeu et le résumé choisi, pas une alarme immédiate. Ne jamais transformer la notification en ordre de courir ou rouler.

### 14.3 Moteur de décision

Avant chaque envoi : événement toujours valide, audience autorisée, préférence de canal, budget, heure locale, activité en cours, blocages, message déjà vu, dernier envoi et fraîcheur du lien. Annuler un message devenu faux, par exemple un événement annulé après programmation d'un rappel.

Un identifiant d'événement empêche les doublons. Grouper les réactions et mentions proches. Un appui sur une notification expirée ouvre une explication de l'état actuel, pas une page cassée. Les contenus sensibles n'apparaissent pas dans l'aperçu verrouillé sans choix de l'utilisateur.

### 14.4 Lifecycle sans pression

**J0 :** comprendre, partir, conserver. **J1–J3 :** suggérer une prochaine sortie seulement si le contexte s'y prête. **Première semaine :** proposer un crew ou une invitation. **Deuxième semaine :** premier récap et découverte d'une récompense réellement proche. **Après un mois :** album et évolution personnelle.

Après plusieurs absences, espacer puis arrêter les relances. Un retour commence par retrouver ses souvenirs, pas par afficher un retard. Tester l'utilité perçue des messages et les désactivations ; un bon taux de clic ne justifie pas une hausse de culpabilité ou de désabonnement.

## 15. Communication, acquisition et lancement

### 15.1 Plateforme de communication

Promesse courte : **« Cours. Roule. Fais grandir ton terrain. »**

Explication : « GRYD transforme tes sorties en une carte vivante. Ferme une boucle, découvre ton terrain et partage l'aventure avec ton crew. »

Pour débutants : « Ta prochaine sortie peut devenir une belle histoire. » Pour crews : « Un rendez-vous, une boucle, une histoire commune. » Pour cyclistes : « Tes kilomètres dessinent ton terrain. » Chaque création montre le sport concerné ; une publicité vélo arrive sur une page vélo.

La marque parle français naturellement et garde « crew » pour l'identité sociale, défini une fois comme groupe. Les commandes emploient « courir », « rouler », « partager », « participer ». Remplacer War Room, Arsenal, raid et threat par des mots compréhensibles quand ils n'apportent aucune information utile.

### 15.2 Boucles de croissance

| Boucle | Parcours | Mesure utile |
|---|---|---|
| Sortie → création | Activité → partage volontaire → lien → expérience GRYD | Nouveaux utilisateurs ayant une première activité, par création consultée. |
| Rendez-vous → membres | Événement → invitation/QR → inscription → sortie réelle | Inscrits présents et seconde sortie, pas seuls clics. |
| Crew → crew | Rencontre amicale → souvenir commun → nouvelles équipes | Crews encore actifs quatre semaines après. |
| Souvenir → retour | Album choisi → réouverture → prochaine activité | Reprise réelle sans hausse de notifications coupées. |

Le parrainage ne donne ni XP ni points ni chance supplémentaire de gagner un prix. Proposition : une variante « Premier rendez-vous » après une première sortie partagée réellement validée, disponible à tous les membres concernés. Le souvenir collectif standard est déjà gratuit sans parrainage. Aucune récompense pour publier une note App Store.

### 15.3 Programme de lancement sur 90 jours

**Jours 1–30 : terrain pilote.** Choisir une première ville selon les groupes effectivement recrutés. Paris et Lille sont les villes historiques du projet, à confirmer par la présence de capitaines engagés. Recruter 8–12 crews et environ 100–150 testeurs, avec consentement pour les observations. Organiser deux rendez-vous de test par semaine, dont course accessible et vélo. Objectif : fiabilité, compréhension et envie d'une seconde sortie.

**Jours 31–60 : lancement local.** Ouvrir une première saison, publier des témoignages autorisés, afficher les rendez-vous accessibles, équiper les capitaines de QR et d'affiches. Les créateurs montrent une vraie sortie et une création exportée depuis l'application. Une publicité ne montre jamais une fonction P2 non livrée.

**Jours 61–90 : deuxième bassin.** Étendre seulement si le premier groupe revient, si l'enregistrement est fiable et si la modération tient. Reproduire les rendez-vous et l'accompagnement des capitaines. La disponibilité du carnet solo peut être nationale dès P1, indépendamment de l'animation locale.

### 15.4 Canaux et contenu

| Canal | Cadence de départ proposée | Format | Objectif |
|---|---|---|---|
| Instagram/TikTok | 3 publications par semaine | Sortie réelle, avant/après, portrait de crew | Compréhension et désir. |
| Créateurs locaux | 4–6 collaborations pilotes | Test documenté, sortie ouverte | Premiers utilisateurs proches. |
| Clubs/boutiques sport | 2–4 partenariats par ville | QR au rendez-vous, atelier de prise en main | Densité locale. |
| Apple Ads | Petit test plafonné après validation de la rétention | Mots-clés d'intention, pages par sport | Acquisition mesurable. |
| Site public | Une page par bénéfice et événement utile | Démonstration, liens, règles et confidentialité | Conversion et confiance. |
| Email | Récap choisi, nouvelles utiles | Court, centré sur un événement réel | Continuité. |

Les collaborations rémunérées et cadeaux doivent être identifiés de façon conforme. Demander les droits d'utilisation de l'image et des témoignages ; aucun sportif inventé comme client réel. Le contenu de marque peut être produit sans exposer des traces Santé ni des lieux privés.

### 15.5 Budget pilote et critères d'arrêt

Enveloppe de test proposée **6 000 €**, hors développement : 2 000 € événements et captation, 1 500 € collaborations locales, 1 500 € acquisition payante, 1 000 € supports et réserve. Ce montant n'est ni un devis ni une prédiction de performance.

L'investissement payant augmente seulement après lecture des cohortes. Arrêter une campagne si les installations ne deviennent pas des sorties, même si le coût par clic est séduisant. Comparer coût par première activité et coût par membre encore actif à quatre semaines.

### 15.6 Sponsors et communautés internes

Les partenaires peuvent financer un rendez-vous, un thème créatif ou une action locale clairement identifiée. Ils n'achètent ni une victoire, ni l'exclusivité d'un quartier, ni l'accès aux traces de membres. Les statistiques de santé et de localisation ne servent pas au ciblage publicitaire.

La vente de services numériques pour clubs et l'administration avancée restent en phase 2, après mesure d'un besoin réel. Proposition à tester : 19,99 €/mois ou 199,99 €/an pour outils administratifs supplémentaires. Les équipes classées, les événements de base et la modération restent gratuits. Les règles de paiement applicables aux clubs doivent être vérifiées ; un intitulé « B2B » ne suffit pas à exempter une vente numérique des exigences de l'App Store.

## 16. Prix, offres et économie

### 16.1 Grille recommandée

| Offre | Prix proposé France TTC | Ce qu'on achète |
|---|---:|---|
| **GRYD** | Gratuit | Sport, jeu territorial, crew, événements de base, défis, niveaux et partages essentiels. |
| **GRYD+ mensuel** | **5,99 €/mois** | Analyses privées avancées, Studio et variantes de collection. |
| **GRYD+ annuel** | **49,99 €/an** | Les mêmes droits ; environ 4,17 €/mois, facturés 49,99 € une fois par an. |
| Collections permanentes | **1,99 / 3,99 / 7,99 €** | Contenu exact indiqué dans la fiche ; aucun effet de jeu. |

L'annuel représente environ **30 % d'économie** par rapport à douze paiements de 5,99 €. Afficher le montant annuel au moins aussi clairement que son équivalent mensuel. Les prix définitifs viennent du Store et de sa localisation, pas d'une chaîne codée en dur.

Pas de pass de saison facturé en plus, pas de monnaie premium, pas de publicité imposée, pas d'offre « à vie » avant compréhension des coûts. Commencer sans essai reconductible obligatoire : le gratuit permet d'évaluer l'application. Un essai GRYD+ de sept jours peut être testé ensuite, avec renouvellement et prix clairement annoncés.

**Contenu commercial P1 exact :** comparaison côte à côte de deux activités ou périodes avec mêmes mesures et unités, au-delà du résumé temporel gratuit ; quatre compositions Studio originales avec édition guidée des placements et typographies ; six variantes artistiques de saison aux paliers prévus. Les outils de comparaison restent privés et n'apportent aucune information tactique supplémentaire. Le survol 3D n'est pas vendu comme disponible avant P2. Si ces trois bénéfices P1 ne sont pas réellement utilisables, le lancement de l'abonnement est différé.

### 16.2 Frontière gratuit/payant

| Fonction | Gratuit | GRYD+ |
|---|---|---|
| Enregistrement course/vélo et journal complet | Oui | Identique. |
| Capture, reprise, défis et chances de victoire | Oui | Strictement identiques. |
| Sources autorisées, export personnel, correction de doublons | Oui | Identique. |
| Confidentialité, zones protégées, blocage et support de base | Oui | Identique. |
| Parcours essentiels et information tactique du défi | Oui | Aucun renseignement compétitif exclusif. |
| Crew, invitation, événements et coordination de base | Oui | Identique. |
| Statistiques de base et splits | Oui | Comparaisons privées et vues avancées supplémentaires. |
| Historique d'activités et souvenirs déjà acquis | Complet | Identique. |
| Carte/photo/sticker/replay 2D standard | Oui | Identique + personnalisation Studio. |
| Résolution standard et sauvegarde des fichiers | Oui | Pas de basse qualité punitive pour le gratuit. |
| Survol 3D et montage avancé | Non | Oui lorsque P2 est réellement disponible. |
| XP, niveaux, badges de mérite | Oui | Aucun accélérateur. |
| Objets de saison | 12 gratuits | Six variantes artistiques additionnelles aux mêmes paliers. |

**Question critique de viabilité :** ces bénéfices payants seront-ils assez désirables ? La réponse n'est pas acquise. Tester l'intention d'achat avec un aperçu fonctionnel, puis le paiement et le renouvellement réels. Si l'offre ne convertit pas, améliorer les outils et le contenu ; ne pas dégrader l'équité pour forcer l'abonnement.

### 16.3 Droits, résiliation et restauration

- Tous les objets gagnés gratuitement restent acquis.
- Tous les achats uniques restent restaurables selon les droits Store ; un remboursement retire seulement le droit correspondant, avec information claire.
- Les outils Studio et analyses avancées cessent à la fin de l'abonnement ; les activités et exports déjà créés restent disponibles.
- Les objets de saison premium déjà débloqués restent acquis. S'abonner plus tard dans la même saison permet de recevoir ses variantes déjà méritées, sans recalculer de points de jeu.
- Un objet permanent reste équipable et permet de nouveaux exports standards avec son rendu de base, même si son apparence emploie une police ou une composition initialement Studio. Les contrôles avancés peuvent expirer ; l'usage de l'objet détenu ne disparaît pas. Les trois collections à achat unique portent « Achat unique, non inclus dans GRYD+ » et ont des identifiants distincts des objets inclus.
- Une collection de saison commencée peut être poursuivie en archive selon le §7, indépendamment des matchs. Les règles de rattrapage sont les mêmes pour tous et affichées.
- Une interruption de paiement n'efface jamais un terrain ni une progression. Les états de grâce, remboursement et restauration suivent les droits confirmés par la plateforme.
- Gestion de l'abonnement et suppression de compte sont deux opérations distinctes ; prévenir clairement qu'une suppression ne résilie pas automatiquement la facturation Apple, et offrir le lien de gestion. [Apple, suppression et abonnements](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

### 16.4 Repères concurrentiels, avec leurs limites

Les fiches françaises consultées listent plusieurs références d'achat Strava et INTVL. On y observe notamment des montants Strava à 9,99 € et 59,99 €, et une référence annuelle INTVL à 69,99 €. Elles mêlent aussi d'autres prix et libellés ; elles ne suffisent pas à certifier le paywall d'un nouveau compte français. **GRYD ne doit donc pas communiquer « X % moins cher » sur cette seule base.** [Strava, App Store France](https://apps.apple.com/fr/app/strava-course-v%C3%A9lo-rando/id426826309) · [INTVL, App Store France](https://apps.apple.com/fr/app/intvl/id6472631698)

Le prix GRYD proposé est un point de départ cohérent avec une application complémentaire, encore jeune, dont le cœur social doit pouvoir croître gratuitement. Tester ensuite 39,99 / 49,99 / 59,99 € annuels sur des cohortes appropriées, sans promettre le même tarif à vie et sans modifier les règles de jeu selon les prix.

### 16.5 Simulation économique transparente

Hypothèses simplificatrices : prix français TTC, TVA supposée de 20 %, commission de 15 % si l'éditeur est effectivement éligible et inscrit au Small Business Program sous les conditions standard applicables. Apple documente ce taux réduit et les règles des abonnements ; les termes alternatifs UE nécessitent une analyse séparée. [Small Business Program](https://developer.apple.com/app-store/small-business-program/) · [Abonnements Apple](https://developer.apple.com/app-store/subscriptions/)

```text
Annuel 49,99 € : 49,99 / 1,20 × 0,85 ≈ 35,41 € nets de TVA/commission
Équivalent mensuel reconnu : 35,41 / 12 ≈ 2,95 €
Mensuel 5,99 € : 5,99 / 1,20 × 0,85 ≈ 4,24 € nets de TVA/commission
```

Ces montants ne sont pas un bénéfice : ils excluent infrastructure, support, remboursements, acquisition, salaires et autres charges. Si la commission applicable est 30 %, l'annuel devient environ 29,16 € nets de TVA/commission, soit 2,43 €/mois.

| Simulation pour 10 000 utilisateurs actifs mensuels | 2 % payants annuels | 5 % | 8 % |
|---|---:|---:|---:|
| Abonnés | 200 | 500 | 800 |
| Recettes mensuelles équivalentes après hypothèses TVA/commission 15 % | 590 € | 1 475 € | 2 361 € |
| Infrastructure variable hypothétique à 0,08 €/actif/mois | 800 € | 800 € | 800 € |
| Solde avant tous les autres coûts | −210 € | 675 € | 1 561 € |

Le coût de 0,08 € est une hypothèse à mesurer, pas un coût fournisseur observé. À 0,20 €/actif, l'infrastructure seule atteint 2 000 € : même le scénario à 5 % devient négatif avant les autres charges. Il faudrait environ 2,71 % de payants annuels pour couvrir seulement l'infrastructure à 0,08 €, et 6,78 % à 0,20 €, sous les mêmes hypothèses. **La gratuité généreuse exige une application efficace et une croissance disciplinée.**

Avant expansion payante : marge contributive mesurée sur plusieurs cohortes, coût de contenu récurrent connu et premiers renouvellements observés. Ne pas ajouter de futures ventes de cosmétiques ou de services clubs aux recettes comme si elles étaient déjà acquises.

Mesurer séparément stockage GPS, requêtes de carte, calcul spatial, rendu vidéo, messages, modération et support. Favoriser cache autorisé, rendu local, traitement différé et sobriété des médias. Le coût d'acquisition maximal d'un abonné doit se fonder sur sa marge et son renouvellement constatés, pas sur le montant annuel encaissé brut.

## 17. Préparer une présence App Store de qualité

### 17.1 Positionnement de la fiche

Catégorie principale proposée : **Forme et santé** ; secondaire : **Sports**, à confirmer selon le produit effectivement soumis. L'enregistrement et l'expérience sportive sont de vraies fonctions centrales, pas un prétexte pour accéder à Santé.

Apple impose d'utiliser HealthKit pour un usage de santé/forme explicite, avec contrôle utilisateur et restrictions fortes sur le partage et la publicité. Les données Santé ne sont jamais transmises à des partenaires publicitaires ni utilisées pour des audiences marketing. Le consentement ne transforme pas un usage publicitaire interdit en usage permis. [Apple, protection des données HealthKit](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)

### 17.2 Métadonnées françaises proposées

| Champ | Proposition |
|---|---|
| Nom | **GRYD : course, vélo & crews** |
| Sous-titre | **Ta ville devient ton terrain** |
| Texte promotionnel | **Cours ou roule, dessine ton terrain et retrouve ton crew. Chaque sortie devient une trace à garder et une aventure à partager.** |
| Mots-clés | `running,territoire,club,trace,gps,parcours,défi,carte,sport,communauté,sortie` |

Ces textes sont destinés à la version où leurs fonctions sont réellement disponibles. Vérifier disponibilité de la marque, nom et éléments graphiques avant publication ; le dossier historique ne prouve pas une autorisation de marque acquise.

**Description proposée :**

> Transforme tes sorties en une carte vivante.
>
> GRYD accompagne tes courses et tes sorties à vélo. Enregistre ton parcours, retrouve tes statistiques et découvre le terrain dessiné par tes boucles.
>
> Avec ton crew, organise une sortie, explore le quartier et participe à des défis accessibles. Chacun contribue à son rythme.
>
> Après l'effort, crée une carte, une photo, un sticker ou un replay de ta sortie. Choisis les informations visibles et garde tes lieux sensibles privés.
>
> Le suivi sportif, le jeu territorial et les fonctions essentielles du crew sont gratuits. GRYD+ ajoute des outils créatifs et des analyses personnelles avancées, sans avantage dans les défis.
>
> Tes sorties, ton rythme, ton terrain.
>
> Si tu choisis GRYD+, le paiement et le renouvellement sont gérés par ton compte Apple. Tu peux gérer ton abonnement dans les réglages de l'App Store. Les conditions d'utilisation et la politique de confidentialité sont accessibles dans l'application et sur sa fiche.

Avant soumission, ajouter les URL réelles des conditions, de confidentialité et de support dans les champs et emplacements requis ; aucun lien fictif ne doit être publié. Ne pas inclure de montant local dans la description universelle.

Les limites de métadonnées et les règles sur mots-clés doivent être respectées : notamment pas de marques concurrentes dans les mots-clés, texte promotionnel au plus 170 caractères et mots-clés au plus 100 caractères. [Apple, fiche produit](https://developer.apple.com/app-store/product-page/)

### 17.3 Séquence de captures

| Ordre | Message principal | Écran montré |
|---|---|---|
| 1 | **Ta ville devient ton terrain.** | Carte lisible avec vraie géométrie. |
| 2 | **Pars. GRYD suit ta sortie.** | Enregistrement course simple. |
| 3 | **Le vélo a son propre terrain.** | Vélo et résultat propres à cette discipline. |
| 4 | **Chaque boucle laisse une trace.** | Résultat avec nouveau terrain calculé correctement. |
| 5 | **Retrouve ton crew dehors.** | Événement, accueil et inscription. |
| 6 | **Joue à ton rythme.** | Progression et défi aux contributions bornées. |
| 7 | **Partage quelque chose qui te ressemble.** | Carte/photo/sticker/replay gratuits réellement générés. |
| 8 | **Choisis ce que les autres voient.** | Aperçu de confidentialité compréhensible. |

Utiliser des captures de la version soumise et des données de démonstration clairement préparées pour ce contexte, sans faire passer des utilisateurs fictifs pour une communauté installée. L'écran peut être composé dans un cadre graphique de marketing, mais il doit représenter le produit. Montrer au moins un écran clair et un sombre.

Vidéo de présentation proposée, environ 20 secondes : 0–4 s carte et promesse ; 4–8 s départ/course ; 8–12 s trace et résultat ; 12–16 s crew ; 16–20 s partage. Ajuster aux spécifications d'App Store Connect au moment de produire les médias. Aucun rendu 3D non livré dans la vidéo P1.

### 17.4 Conversion et découverte

Préparer trois pages personnalisées : **Course**, **Vélo**, **Crews**. Adapter les captures et le premier bénéfice au lien d'acquisition. Apple propose les Custom Product Pages avec URL propre et, selon les versions, lien profond vers le contenu de l'application. [Apple, pages personnalisées](https://developer.apple.com/app-store/custom-product-pages/)

Tester sur la page produit principale une variation à la fois : première capture, ordre des bénéfices ou icône. Apple permet des variantes de fiche ; ces tests ne s'appliquent pas de la même façon aux pages personnalisées. Ne pas confondre taux d'installation et première sortie réelle. [Product Page Optimization](https://developer.apple.com/app-store/product-page-optimization/) · [Portée des tests](https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization)

Utiliser les événements intégrés à l'App Store pour une saison ou un événement réel si l'application remplit les critères courants. Vérifier ces critères au moment du dépôt ; aucun badge éditorial Apple ni mise en avant ne peut être promis.

Demander un avis par le mécanisme système à un moment approprié du parcours, selon une règle appliquée à tous les utilisateurs éligibles. Ne pas filtrer les personnes sur leur satisfaction, ne pas pré-questionner « Tu nous aimes ? » avant l'avis et ne pas offrir de récompense. [Apple, avis et réponses](https://developer.apple.com/app-store/ratings-and-reviews/)

### 17.5 Conditions de soumission

Les règles de revue couvrent notamment achats numériques, contenu utilisateur, confidentialité et accès du reviewer. Le choix recommandé pour P1 est l'achat intégré standard ; les exceptions de paiement selon pays et contrats doivent être vérifiées, sans supposer une règle identique partout. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

Checklist de livraison proposée :

| Domaine | Preuve nécessaire |
|---|---|
| Application complète | Tous les boutons de P1 mènent à un résultat réel ; aucune page « bientôt » dans le parcours principal. |
| Achat | Produits Store configurés, droits serveur, achat/restauration/annulation/remboursement testés. |
| Compte | Connexion, récupération, suppression depuis l'application et absence de recréation par import tardif. |
| Données personnelles | Politique exacte, finalités, audiences, durées, export et droits opérationnels. |
| Confidentialité App Store | Déclarations correspondant au code et aux SDK, y compris données collectées par des tiers. [Détails App Privacy](https://developer.apple.com/app-store/app-privacy-details/) |
| Permissions | Textes de localisation/Santé/photos/micro uniquement pour les fonctions concernées ; refus gérable. |
| SDK et manifestes | Inventaire des SDK, raisons d'API et manifestes applicables vérifiés sur l'archive de livraison. |
| Géolocalisation | Justification de l'arrière-plan sportif, comportement batterie et reprise testés. |
| Communauté | Filtrage, signalement, blocage, contact, responsables et procédure documentés. |
| Âge | Questionnaire actuel rempli selon messagerie, géolocalisation, contenu et public réels. |
| Distribution UE | Statut professionnel, coordonnées et informations requises correctement renseignés. |
| Support | URL fonctionnelle, email exploité, règles du jeu et possibilité de contester un résultat. |
| Marques et contenus | Droits logo, polices, photos, cartes, musiques et exports documentés. |
| Revue | Compte de revue, parcours Course/Vélo, activité préparée, scénario d'achat, explication des captures et des limites. |

Au 8 septembre 2026, Apple indique que les uploads depuis le 28 avril 2026 doivent utiliser Xcode 26 ou ultérieur avec les SDK de génération 26 requis. Cela ne signifie pas que l'application doit nécessairement exiger iOS 26 comme version minimale d'installation. Recontrôler les exigences le jour de la soumission. [Exigences Apple en cours](https://developer.apple.com/news/upcoming-requirements/)

Le mode de revue peut utiliser des fixtures identifiées et isolées pour rendre le jeu testable sans imposer un déplacement réel au reviewer. Il ne doit pas falsifier les écrans publics, contourner la revue ou activer une fonction cachée après approbation.

## 18. Le logiciel qui rend cette simplicité possible

### 18.1 Architecture raisonnable

Le dépôt dispose déjà d'une base mobile Expo/React Native, d'un moteur partagé et de services de données. Conserver les modules dont la fiabilité est prouvée ; remplacer les responsabilités contradictoires. Aucune réécriture complète en Swift n'est décidée seulement pour évoquer Apple.

Séparer six responsabilités :

1. **Enregistrement sportif :** collecte, persistance locale et récupération.
2. **Ingestion :** import, déduplication, provenance et normalisation.
3. **Jeu :** géométrie, possession, défis et XP autoritaires.
4. **Communauté :** adhésions, événements, échanges et modération.
5. **Création :** rendu des médias à partir de données autorisées.
6. **Droits :** achats, objets, consentements, visibilité et suppression.

Ces responsabilités peuvent vivre dans un ensemble modulaire simple. Elles n'exigent pas six microservices. Les calculs géographiques et rendus lourds ne doivent pas bloquer le thread d'interface.

### 18.2 Modèle de données minimal

| Entité | Informations essentielles | Invariant |
|---|---|---|
| Activity | Sport réel, source, début/fin, temps, mesures, statut et auteur | Une seule activité canonique malgré plusieurs imports. |
| TraceSegment | Points ordonnés, horodatage, précision, ruptures | Aucune liaison fictive à travers une coupure. |
| CaptureEvent | Face valide, horodatage physique, règle et provenance | Événement reproductible ; aucune décision du client seul. |
| Ownership | Géométrie possédée, discipline, propriétaire, version | Pas de recouvrement exclusif entre propriétaires pour le même sport. |
| ProgressLedger | Journée admissible, XP, correction, saison affectée | Une attribution unique, corrections traçables. |
| CrewMembership | Personne, crew, sport, rôle et dates | Contributions historiques attachées à l'équipe de l'époque. |
| Challenge | Règles, secteurs, effectifs, calendrier, résultat | Paramètres figés au lancement. |
| ChallengeContribution | Activité, secteur, journée, points | Plafond identique, aucune duplication. |
| Entitlement | Produit, source d'achat/déblocage, durée et statut | Un écran n'accorde jamais un droit en local à lui seul. |
| ShareArtifact | Version de données, modèle, audience, expiration | Invalidation lors d'un changement de confidentialité. |
| Consent | Finalité, version, choix et date | Révocation respectée par toutes les sorties de données. |

### 18.3 États visibles et vrais

```text
Enregistrement local
  → sauvegarde durable
  → synchronisation
  → validation de l'activité
  → calcul du jeu
  → résultat confirmé
  → publication autorisée
```

L'échec d'un calcul territorial n'efface pas la séance. Une activité peut être enregistrée et valide sportivement alors que sa capture est en attente ou exclue. Chaque changement serveur possède un identifiant stable ; rejouer une requête ne redonne ni surface ni XP.

Une source d'import peut avoir la même sortie que le téléphone. Le rapprochement utilise provenance, heure, sport et ressemblance de trace, avec seuils testés. Une fusion incertaine propose une vérification ; elle ne supprime pas silencieusement une vraie deuxième activité.

### 18.4 Antitriche proportionnée

Contrôles : chronologie, sauts, précision, trajectoire, mouvement, source, chevauchements de séances, duplication de fichiers et déclarations de discipline. Les données de capteurs disponibles apportent des signaux ; leur absence n'est pas une preuve de fraude.

Décisions séparées : **conserver l'activité**, **autoriser le jeu libre**, **autoriser un défi classé**. Les cas douteux passent en vérification avec explication et recours. Ne pas punir une sortie lente, un fauteuil, une descente rapide ou un ultra sur la seule base des anciens seuils génériques.

RLS et droits d'écriture interdisent au client de s'attribuer propriété, XP ou achats. Requêtes répétées, accès entre comptes, callbacks tardifs et changements de source sont testés. Les paramètres complets d'antifraude opérationnelle ne sont pas publiés comme une recette de contournement ; les règles de jeu et motifs de décision restent intelligibles.

### 18.5 Données, confidentialité et mesure

La CNIL rappelle en 2026 l'importance de finalités justifiées pour la géolocalisation et d'un consentement adéquat pour les usages qui ne sont pas nécessaires au service. Une permission technique ne doit pas être traitée comme un accord général à toutes les réutilisations. [CNIL, géolocalisation et règles](https://www.cnil.fr/fr/geolocalisation-applications-mobiles-quelles-regles) · [CNIL, permissions mobiles](https://www.cnil.fr/fr/permissions-applications-mobiles-recommandations-de-la-cnil-pour-respecter-la-vie-privee)

Proposition de gestion : coordonnées brutes privées chiffrées et accès limité ; géométries publiques dérivées seulement si autorisées ; données de santé absentes des outils publicitaires ; pseudonymes et GPS absents des logs usuels. Les événements d'interface peuvent être mesurés sans exporter les routes, FC ou puissances.

Les analyses de fonctionnement sportif réalisées côté GRYD doivent respecter la finalité de service et les permissions de source. Ne pas transférer des événements révélant l'activité Santé à un SDK marketing sous prétexte qu'ils ne contiennent plus le tracé. Les tableaux de pilotage utilisent des agrégats minimisés avec accès restreint, sans audiences de ciblage dérivées de la santé.

Durées proposées à confirmer dans la politique et l'architecture : trace canonique conservée tant que l'activité est conservée ; télémétrie fine de diagnostic 30 jours maximum ; données opérationnelles de requêtes 30 jours ; médias temporaires de génération 24 h ; suppression de l'accès public immédiate, effacement opérationnel sous 30 jours, rotation des sauvegardes jusqu'à 90 jours. Les obligations particulières de conservation de facturation sont traitées séparément.

Ces durées sont des choix proposés, pas des durées légales universelles. Les sources externes plus strictes priment ; les données API Strava ne peuvent pas entrer dans cette conservation générique sans appliquer leurs obligations propres. Une analyse de protection des données et les documents applicables sont finalisés avant ouverture publique.

### 18.6 Objectifs de qualité mesurables

| Domaine | Cible de recette proposée | Méthode |
|---|---|---|
| Départ | Au plus deux actions usuelles après ouverture, permissions déjà accordées | Test de parcours. |
| Réaction d'une commande | Retour visuel p95 <100 ms hors appel système | Mesure sur build de production. |
| Carte en cache | Utilisable p95 <2 s | Même zone, appareils de référence. |
| Résultat sportif | Consultable localement <2 s après sauvegarde | Test hors ligne et réseau normal. |
| Jeu en réseau normal | Confirmation p95 <30 s à charge nominale | Trace synthétique contrôlée et vraies traces consenties. |
| Sessions sans crash | >99,8 % comme cible de bêta | Télémétrie minimisée et périmètre annoncé. |
| Activité récupérable | ≥99,5 % des sessions démarrées conservées hors effacement volontaire | Définition exacte des interruptions incluse. |
| Confidentialité | Zéro fuite connue dans la matrice d'exports | Cas canaris automatisés + examen des médias. |
| Batterie | Budget cible ≤8 points de batterie/heure pour un scénario défini écran majoritairement éteint | Mesurer par appareil et comparer au comportement de référence ; aucun engagement universel. |
| Fluidité carte | Défilement et zoom sans blocage perceptible sur l'appareil minimum supporté | Traces de performance et tests dehors. |

Ces valeurs sont des critères d'ingénierie proposés. Aucune n'a été mesurée sur l'application par ce document. Si un objectif est manqué, réduire la complexité de rendu avant de multiplier les écrans explicatifs.

## 19. Plan de reconstruction et indicateurs

### 19.1 Ordre de travail

| Phase | Livrables | Condition de passage |
|---|---|---|
| **P0 — Décisions et preuve du cœur** | Une règle de possession, simulations, prototype cliquable Carte/Live/Résultat, inventaire des droits sources | La capture est explicable et reproductible ; utilisateurs comprennent la boucle. |
| **P1a — Sport et terrain** | Enregistrement fiable Course/Vélo, import Santé admissible, moteur unique, journal et confidentialité | Une vraie sortie bout en bout, y compris hors ligne et import en double. |
| **P1b — Crew et créations** | Événements, invitations, modération, partages Carte/Photo/Sticker/Replay 2D | Un crew réalise une sortie, retrouve ses résultats et partage réellement. |
| **P1c — Progression et offre** | XP, 12 paliers, collections, GRYD+, achats/restauration, défis 5v5 calibrés | Tous les droits et calculs sont vérifiés ; pas de différence de puissance payante. |
| **P1 — Première version publique** | Ensemble P1a–c, médias Store exacts, support et contrôles | Portes de qualité §20 franchies. |
| **P2 — Enrichissement** | Survol 3D, album avancé, Watch native, relais territorial pilote, outils clubs | Rétention, coûts et demande mesurés ; source et faisabilité validées. |

P1a et P1b peuvent être testés en bêta fermée avant P1 complète. Le projet cible inclut dès P1 la course **et** le vélo. Si une discipline échoue à la recette, retarder la promesse publique correspondante ; ne pas mettre un onglet décoratif pour faire croire qu'elle fonctionne.

Estimation de planification à confirmer après P0 : 12–16 semaines pour une équipe dédiée de 4–6 personnes couvrant produit/design, mobile, données/jeu et QA, avec appui communauté/juridique ponctuel. Ce n'est pas un engagement de date : la migration géographique, l'enregistrement mobile et les accords sources peuvent modifier fortement la durée.

### 19.2 Migration de l'existant

1. Inventorier comptes, activités, territoires, achats et objets réellement persistés. Sauvegarder et préparer un essai de migration réversible.
2. Versionner les règles : `legacy` pour les faits historiques, `2026.1` pour la nouvelle capture. Les anciennes activités restent lisibles avec le résultat attribué à l'époque.
3. Recalculer les géométries admissibles uniquement à partir de traces disponibles et autorisées. Les anciens hexagones sans preuve suffisante restent une archive, pas un polygone inventé.
4. Exécuter le moteur neuf en observation, sans double écriture de possession. Comparer aire, chevauchements, public/privé, disciplines et conflits sur des traces de test.
5. Définir une date de bascule. Les captures nouvelles passent par un seul moteur ; la migration historique ne reprend pas du terrain comme si l'utilisateur venait de sortir.
6. Préserver les droits payés. Mapper chaque ancien achat vers un droit équivalent ou une solution explicite ; les monnaies achetées non consommées nécessitent un traitement documenté, pas un effacement silencieux.
7. Donner un niveau d'accueil compréhensible aux joueurs existants selon une règle de conversion publiée. Conserver leur historique de XP initial en archive ; ne pas promettre le même numéro de niveau si la courbe change.
8. Prévoir un retour arrière des nouvelles fonctionnalités sans perdre les sorties enregistrées pendant la période. Tester la compatibilité des anciennes versions encore installées et les files de synchronisation.

La suppression des documents obsolètes du chemin d'implémentation intervient lors de cette migration documentaire. Le code historique utile peut être conservé en archive ; aucun ancien moteur ne reste autorisé à modifier la propriété par un autre chemin.

### 19.3 Indicateur principal

**Semaines sportives utiles : nombre de personnes ayant enregistré au moins deux journées actives distinctes dans la semaine, avec activité conservée et résultat accessible.** Mesurer séparément les personnes n'ayant qu'une sortie ; elles restent des utilisateurs légitimes, pas des échecs.

Cet indicateur n'est pas un objectif quotidien présenté au sportif. Il sert à évaluer si l'application accompagne une pratique récurrente, sans chercher à augmenter artificiellement le temps d'écran.

### 19.4 Tableau de pilotage

| Dimension | Indicateur | Objectif initial de test, non benchmark acquis |
|---|---|---|
| Compréhension | Testeurs expliquant trace/boucle/terrain sans aide | ≥80 % après première sortie. |
| Activation | Nouveaux comptes avec première activité conservée sous 7 jours | ≥50 % sur cohorte pilote recrutée. |
| Retour | Activés enregistrant une autre activité entre J22 et J28 | ≥30 %, à lire selon recrutement et météo. |
| Communauté | Crews avec ≥3 membres actifs et un rendez-vous réalisé en 28 jours | ≥60 % des crews pilotes. |
| Satisfaction | Partages jugés utilisables sans retouche | ≥80 % des tests utilisateurs. |
| Viral | Visiteurs d'une invitation devenant participants réels | Mesurer la base avant fixer un objectif. |
| Équité | Écart de victoire gratuit/payant à engagement comparable | Investiguer tout écart persistant ; aucun paramètre payé dans le score. |
| Santé d'usage | Désactivation push, ressentis de pression, sorties rallongées pour le jeu | Ne pas optimiser l'engagement au prix de ces dégradations. |
| Monétisation | Conversion, maintien à 2/3 mois, remboursements, marge par cohorte | Construire une observation, pas un taux annoncé. |
| Fiabilité | Activités perdues, duplications, litiges géographiques, consommation | Seuils de la recette et suivi par version. |

Les seuils pilotes servent de décisions internes. Un petit échantillon ne prouve pas une performance sur le marché ; lire les effectifs, périodes et incertitudes. Le taux d'ouverture d'un push n'est pas une mesure de santé communautaire.

### 19.5 Expériences prioritaires

1. Carte au repos : action de départ simple contre parcours recommandé secondaire, sans changer les règles du jeu.
2. Résultat : trace seule en premier contre trace + nouveau terrain ; vérifier compréhension et fierté, pas uniquement partage.
3. Crew : événement comme premier contenu contre défi comme premier contenu ; mesurer participation réelle à quatre semaines.
4. Offre : créativité et analyses privées ; mesurer volonté de payer et usage avant multiplier les collections.
5. Défi : deux journées contributives, répartition des secteurs et publication quotidienne ; simuler domination, égalités et attente de dernière minute.

Chaque test possède un résultat attendu, un garde-fou de confidentialité et une durée définie. Ne pas modifier simultanément règles, prix, onboarding et notifications, au risque de ne rien apprendre.

## 20. Recette : ce qui permet de déclarer la refonte terminée

Les scénarios ci-dessous sont des critères à exécuter lors de la réalisation. Ce travail documentaire n'a pas exécuté une recette de l'application.

### 20.1 Sport et géométrie

| N° | Scénario | Résultat attendu |
|---|---|---|
| 01 | Sortie ouverte de 5 km | Journal et trace ; XP si admissible ; aucune surface inventée. |
| 02 | Boucle simple admissible | Polygone exact, exclusions appliquées, résultat explicable. |
| 03 | Parcours en huit | Faces réunies sans enveloppe extérieure fictive. |
| 04 | Aller-retour dans la même rue | Pas de territoire large créé par le style de trace. |
| 05 | Boucle répétée au même endroit | Souvenir conservé ; nouveau terrain net correct. |
| 06 | Chevauchement de deux joueurs | Transfert partiel uniquement ; conservation du reste. |
| 07 | Boucle fermée puis longue pause | Aucun avantage d'horodatage par le bouton Terminer. |
| 08 | Upload dans un ordre inversé | Même possession finale que l'ordre physique validé. |
| 09 | Coupure GPS près de la fermeture | Pas de frontière reconstruite pour capturer. |
| 10 | Activité sportive atypique ou lente | Conservation ; éligibilité au jeu évaluée séparément. |
| 11 | Même trace Course et Vélo | Aucun transfert entre cartes ni points croisés. |
| 12 | VAE ou indoor | Étiquette et traitement appropriés, pas de capture non admissible. |
| 13 | GPS faible et permission retirée | Message utile, données déjà écrites conservées. |
| 14 | Hors ligne puis reprise réseau | Une seule activité et un seul crédit malgré les tentatives. |
| 15 | Application interrompue | Récupération des données persistées, lacune honnête. |
| 16 | Double import téléphone/montre | Déduplication sans supprimer une vraie autre sortie. |
| 17 | Santé reçoit la route après l'activité | Mise à jour contrôlée, pas de faux rejet immédiat. |
| 18 | Calcul territorial indisponible | Activité conservée ; résultat jeu en attente. |

### 20.2 Jeu, communauté et économie

| N° | Scénario | Résultat attendu |
|---|---|---|
| 19 | Deux séances le même jour | Une seule attribution quotidienne de XP. |
| 20 | Journée active dans les deux sports | XP global dédupliqué, aucune double récompense du même temps. |
| 21 | Deux journées/semaine pendant six semaines | Douze paliers de saison accessibles. |
| 22 | Joueur payant et gratuit, mêmes activités | Même capture, même XP, mêmes points de défi. |
| 23 | Plafond de contribution atteint | Sport et jeu libre continuent ; zéro point supplémentaire de match. |
| 24 | Activité éligible à plusieurs secteurs | Affectation déterministe et verrouillée selon la règle publiée. |
| 25 | Égalité de secteurs/match | Résultat nul possible, aucun départage par vitesse. |
| 26 | Changement de crew en semaine | Historique préservé, pas de changement d'effectif classé rétroactif. |
| 27 | Saison archivée puis reprise | Aucune multiplication de XP entre collections. |
| 28 | Invitation après installation/connexion | Retour au bon événement, adhésion volontaire. |
| 29 | Événement annulé après rappel programmé | Ancien rappel supprimé, inscrits informés une fois utilement. |
| 30 | Personne bloquée et lien partagé | Respect du blocage et de l'audience, aucune fuite par recherche. |
| 31 | Achat annulé ou en attente | Aucun droit accordé avant confirmation. |
| 32 | Achat/restauration sur autre appareil | Droits identiques et restaurables, sans doublon de facturation. |
| 33 | Résiliation ou remboursement | Règles de permanence respectées, jeu inchangé. |
| 34 | Ancienne monnaie achetée | Migration ou résolution explicite, pas de disparition silencieuse. |

### 20.3 Confidentialité, médias et usage

| N° | Scénario | Résultat attendu |
|---|---|---|
| 35 | Capture personnelle privée | Aucun changement de possession, score public ou notification adversaire non autorisé. |
| 36 | Délai de publication | Pas de fuite indirecte via compteurs, perte de terrain ou classement. |
| 37 | Zone de départ protégée | Aucune exposition dans trace, polygone, image, film, miniature ou lien. |
| 38 | Média sans GPS/FC/photo | Variante honnête, pas de données de remplissage. |
| 39 | Export Story/carré/portrait/sticker | Dimensions, alpha, lisibilité et attributions corrects. |
| 40 | Destination sociale absente ou partage annulé | Repli système et brouillon conservé ; pas de faux succès. |
| 41 | Changement d'audience après partage | Liens et médias hébergés mis à jour/révoqués. |
| 42 | Suppression compte puis webhook/import tardif | Aucune recréation du compte ou du média. |
| 43 | Texte très agrandi et VoiceOver | Actions accessibles, ordre logique, alternative à la carte. |
| 44 | Soleil, pluie, gant et batterie faible | Départ, pause et lecture possibles ; limitations mesurées. |
| 45 | Revue App Store | Parcours complet accessible, produits testables, données de démo isolées. |

### 20.4 Portes de validation

**Porte produit :** compréhension de la première sortie, intérêt du crew, acceptation des règles et absence de pression ressentie disproportionnée. **Porte sportive :** activité conservée, enregistrement et reprise fiables. **Porte jeu :** résultat déterministe, égalité des droits gratuits/payants et contestations traitables. **Porte visuelle :** toutes les surfaces critiques évaluées sur téléphone, clair/sombre, texte agrandi et données difficiles. **Porte commerciale :** offre exacte, achats/restauration, coût d'exploitation mesuré. **Porte publication :** permissions, documents, support, modération, droits et médias Store conformes au produit livré.

Un écran très beau ne compense pas une sortie perdue. Une capture spectaculaire ne compense pas une règle incompréhensible. La refonte est terminée lorsque ces portes sont franchies ensemble.

---

## Annexe A — Références locales et décisions de remplacement

Les chemins ci-dessous identifient le corpus consulté dans `/Users/benjaminbel/KLAIM RUN`. Il s'agit d'un audit ciblé au 8 septembre 2026. Le dépôt d'origine n'a pas été modifié pour produire ce document.

| Référence | Passage utile |
|---|---|
| [SPEC-MVP-territoire-running-v0.md](</Users/benjaminbel/KLAIM RUN/SPEC-MVP-territoire-running-v0.md>) | Introduction, §§0–3 et 14 : premières hypothèses de jeu et capture au passage. |
| [docs/product/GRYD_MASTER_SPEC.md](</Users/benjaminbel/KLAIM RUN/docs/product/GRYD_MASTER_SPEC.md>) | §§1–9 : conquête, zones, crews et progression. |
| [docs/product/GRYD_synthese_complete_conversation.md](</Users/benjaminbel/KLAIM RUN/docs/product/GRYD_synthese_complete_conversation.md>) | §§1–4, 9, 17 : ligne, boucle et frontière collective. |
| [docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md](</Users/benjaminbel/KLAIM RUN/docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md>) | §§1–2, 8–10 : décisions de juillet, séparation des sports et polygones. |
| [SOURCE_OF_TRUTH_REGISTER.md](</Users/benjaminbel/KLAIM RUN/SOURCE_OF_TRUTH_REGISTER.md>) | D-04, D-08, D-09, D-19 : palette, crews, vélo et priorité documentaire. |
| [GRYD_REGLES_NON_NEGOCIABLES.md](</Users/benjaminbel/KLAIM RUN/GRYD_REGLES_NON_NEGOCIABLES.md>) | Simplification des écrans et priorité de la trace. |
| [packages/engine/src/engine.ts](</Users/benjaminbel/KLAIM RUN/packages/engine/src/engine.ts>) | Autour de 269–320 : cellules intérieures, attribution et score. |
| [supabase/functions/ingest_run/index.ts](</Users/benjaminbel/KLAIM RUN/supabase/functions/ingest_run/index.ts>) | Autour de 3364–3470 : ajout polygonal après le pipeline de cellules et contestation distincte. |
| [supabase/migrations/0091_city_player_surface_board.sql](</Users/benjaminbel/KLAIM RUN/supabase/migrations/0091_city_player_surface_board.sql>) | Classement de surface déjà présent ; union géométrique à vérifier. |
| [apps/mobile/src/features/map/territoriesSource.ts](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/map/territoriesSource.ts>) | Rendu de géométrie territoriale. |
| [packages/shared/src/game-rules.ts](</Users/benjaminbel/KLAIM RUN/packages/shared/src/game-rules.ts>) | Niveaux, économie, seuils et séparation des activités. |
| [apps/mobile/src/features/arsenal/catalog.ts](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/arsenal/catalog.ts>) | Grand catalogue historique, plus large que la seule offre Premium. |
| [apps/mobile/src/features/premium/client.ts](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/premium/client.ts>) | Intégration d'achat et restauration réellement présente. |
| [apps/mobile/src/features/share/templates.tsx](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/share/templates.tsx>) | Modèles existants à réconcilier avec la couverture cible. |
| [apps/mobile/src/features/share/composerModel.ts](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/features/share/composerModel.ts>) | Brouillon, formats et confidentialité. |

Les numéros de ligne sont des repères de la lecture, susceptibles d'évoluer. Aucun de ces éléments ne certifie le déploiement d'une migration ni l'état d'une configuration Store.

| Ancienne logique | Décision de septembre qui la remplace |
|---|---|
| Cellules et polygones décidant en parallèle | Un seul moteur géographique autoritaire. |
| Surface brute comme classement universel | Surface descriptive en jeu libre ; points bornés pour les défis. |
| Délai de défense, protections, boucliers, gel | Reprise déterministe par vraie boucle ; aucun pouvoir achetable. |
| Plusieurs monnaies et boosts | XP non dépensables, déblocages directs et achats en euros. |
| Rangs personnels superposés | Un niveau permanent ; badges de maîtrise ; résultats de matchs séparés. |
| Long onboarding et mission avant chaque départ | Apprentissage contextuel, sortie libre en premier. |
| Arsenal / War Room comme pages majeures | Collection dans Profil, défi dans Crew. |
| Trois familles de partage strictes | Quatre familles claires ; variantes dans la bibliothèque. |
| Palette historique variable | Tokens de cette refonte, testés avant réalisation. |
| Strava supposé disponible comme source sociale | Connecteur conditionnel, jeu autonome. |

## Annexe B — Benchmark complémentaire et limites de recherche

### INTVL

Le site officiel décrit capture par boucles, mondes course et vélo, clubs, lobbies privés et planification. Il précise que sa connexion Strava exporte vers Strava sans importer dans l'autre sens. Son offre Pro annonce notamment davantage de fonctions de planification et de classement, ainsi que plus de participations à des concours. Ce sont des déclarations de l'éditeur, pas des recommandations GRYD : **GRYD ne reprend pas une probabilité de récompense augmentée par le paiement**. [INTVL, site et FAQ](https://www.intvl.com.au/)

La fiche App Store FR consultée documente des évolutions 2026 : planificateur, replay 3D, vélo et affichage atténué des territoires adverses ; les notes de version 4.0.7 annoncent le français, alors que certaines métadonnées de langues restent différentes. Cela impose un contrôle dans l'application avant toute comparaison marketing précise. [INTVL, fiche et versions](https://apps.apple.com/fr/app/intvl/id6472631698)

### Autres références utiles

| Produit | Fait documenté | Enseignement pour GRYD |
|---|---|---|
| Zwift | Classements de capacité pour organiser des courses, avec catégories selon événement. [FAQ](https://www.zwift.com/eu-fr/racing/racing-faq) | Mettre en face des groupes comparables et annoncer les règles. |
| The Conqueror | Cartes postales conservées ; défis en équipe et récompense individuelle. [Souvenirs](https://help.theconqueror.events/en/articles/4321037-viewing-your-conqueror-challenge-postcards) · [Équipes](https://help.theconqueror.events/en/articles/4757658-create-or-join-a-team) | Faire durer l'histoire et reconnaître chaque contribution. |
| Run An Empire | Conquête à pied avec grille et constructions selon FAQ. [Règles](https://www.runanempire.com/faq/) | L'empire sportif existe déjà ; différencier l'expérience et l'équité. |
| CityStrides | Complétion de rues et, en 2026, fonctions Territories et Route Builder Quick. [Territories](https://community.citystrides.com/t/add-territory-to-leaderboard-drop-down/30050) · [Mise à jour du 22 août 2026](https://community.citystrides.com/t/updates-on-august-22-2026-release-1514/30089) | L'exploration personnelle et la route optimisée ne sont pas des nouveautés inédites. |
| Squadrats | Collection de zones visitées à plusieurs échelles. [Explication](https://squadrats.com/explain) | Préserver le plaisir d'explorer même sans adversaire. |

### Ce qui reste à valider avant implémentation commerciale

1. Carrousel exact des partages Strava, sur les versions iOS françaises disponibles, avec comptes gratuit/abonné et activités variées. Les sources publiques établissent les familles, pas une parité pixel par pixel ni tous les paywalls.
2. Prix réellement proposés à un nouveau compte français chez les concurrents ; les listes d'achats ne suffisent pas.
3. Accords et conditions applicables aux sources et fournisseurs de cartes, y compris usage communautaire, calcul dérivé et médias exportés.
4. Demande réelle de GRYD+, rétention des crews, coût de traitement et tolérance à la reprise de terrain.
5. Seuils GPS et géométriques dans des environnements variés, équité des secteurs et résistance aux comportements opportunistes.
6. Tests physiques iPhone/Watch, achat sandbox et restauration, conformité de l'archive soumise.

Ces validations font partie de la réalisation du produit. Elles ne remettent pas la conception à plus tard : les choix proposés, leurs paramètres de départ et leurs critères d'acceptation sont définis dans ce cahier.
