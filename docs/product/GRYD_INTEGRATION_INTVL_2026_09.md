# GRYD — modifications après l’étude des captures INTVL

Passe du 9 septembre 2026. Ce document décrit les modifications du dépôt et leur vérification locale. Les captures de l’application sont prises sur `localhost:8081`, sans compte de test, activité fabriquée ni attribution de récompense.

## Ce qui change pour le joueur

| Parcours | Changement livré |
|---|---|
| Navigation | Trois destinations toujours nommées : Carte, Crew, Profil. Sélection visible, cibles tactiles de 44 points, proportions contrôlées à 320 et 390 points de largeur. |
| Carte | Légende permanente Moi / Crew / Autres. Lecture personnelle en chartreuse, crew en contour clair discontinu, autres en gris. Filtres dans Couches, autres territoires atténuables, détail au toucher. |
| Comprendre une capture | Le résultat distingue la surface initialement publiée de celle encore détenue. Les motifs de non-publication sont explicites. Reprise partielle et recapture par soi-même ont des cas de contrôle dédiés. |
| Départ | Choix privé/partagé commun à la carte et à la préparation, sauvegardé par compte avant le départ. Correction du provider web qui laissait le départ invité bloqué. |
| Crew | Photographie d’origine, rendez-vous réels et fil des sorties volontairement publiées. Filtres Course/Vélo, profils des membres et accès aux amis depuis Profil. |
| Rendez-vous | Liste, création selon rôle, inscription/retrait, capacité réelle, modification avec contrôle de version et annulation. Le prochain rendez-vous exclut les sorties annulées. |
| Publication | Une sortie confirmée peut être publiée au crew après aperçu et consentement. Texte, photo choisie, réactions, commentaires, suppression, signalement et blocage ; audience liée au crew explicitement annoncé. |
| Identité | Profil sauvegardé côté serveur, avatar choisi et visibilité explicite. Les changements de compte invalident lectures, photos et actions en cours. |
| Sources | Écran Sources et appareils : GPS GRYD et import GPX privé avec discipline choisie. Aucun faux état de connexion à une montre. Les ruptures de trace GPX restent des ruptures. |
| Objets et Studio | Douze catégories saisonnières reliées à leur modèle exact ; propriété vérifiée avant préparation et avant remise du fichier. Les aperçus ne valent pas attribution. |
| Collections permanentes | Contour, Relief, Clubhouse : compositions propres, restauration et droits serveur. Prix uniquement depuis le Store ; vente inactive tant que les produits réels ne sont pas configurés. |
| GRYD+ | Les six modèles saisonniers se déplient directement depuis Éditions de saison. Comparaison et Studio restent accessibles depuis les bénéfices correspondants. |

## Lire les territoires seul ou en crew

Le titre de propriété reste individuel. « Crew » regroupe les terrains détenus par les membres actuels de ton crew ; rejoindre un groupe ne crée pas une seconde propriété du même terrain. Le serveur attribue le rôle de chaque polygone pour la discipline affichée, en tenant compte du partage et des blocages.

- **Moi** : aplat chartreuse et trait continu.
- **Crew** : contour clair discontinu, distinct aussi par sa forme de trait.
- **Autres** : gris, avec possibilité d’atténuation.

Le territoire partagé et la trace GPS sont deux objets différents. La trace reste privée par défaut ; une zone publiée peut révéler une partie du parcours. Les zones personnelles protégées restent opposables au calcul serveur. Le détail géographique et les limites de validation figurent dans [la recette 0112](../qa/GRYD_TERRITORY_2026_0112_VALIDATION.md).

## Photographies réutilisées

Les deux photographies retrouvées sont `assets/onboarding/e01-crew.jpg` (groupe et cycliste urbains) et `assets/auth/sign-in-crew.jpg` (groupe après la sortie). Elles alimentent l’entrée, l’authentification et Crew. Leur registre est `src/ui/gryd/brandImagery.ts` ; les anciennes images éditoriales ne sont plus référencées par les écrans actifs. [Provenance et règles d’imagerie](../design/GRYD_IMAGERIE_RESTAUREE_2026.md).

## Preuves visuelles

- [Carte complète, 320 points](../design/review-2026/intvl-integration/carte-320.png) et [détail à 390 points](../design/review-2026/intvl-integration/carte-390.png)
- [Couches, 390 points](../design/review-2026/intvl-integration/couches-390.png)
- [Crew, 390 points](../design/review-2026/intvl-integration/crew-390.png)
- [Profil, 390 points](../design/review-2026/intvl-integration/profil-390.png) et [320 points](../design/review-2026/intvl-integration/profil-320.png)
- [Sources, 390 points](../design/review-2026/intvl-integration/sources-390.png)
- [24 modèles en carré](../design/review-2026/intvl-integration/objects-24.png) et [Story](../design/review-2026/intvl-integration/objects-story.png) : rendus du composant réel, **données synthétiques de recette isolées**, jamais injectées dans l’application.

Les captures Carte/Sources à 390 points montrent les 702 premiers points visibles du viewport ; la capture Carte à 320×639 inclut le menu complet. Le cadrage de Paris est conservé lors du parcours Carte → Profil → Carte.

Les contrôles navigateur couvrent navigation, cadrage de Paris, filtres de carte, états invités, Sources, accès aux amis et aperçu des objets. Les contrôles multi-comptes et de publication sont exercés par les harnais locaux, pas par des publications dans un crew réel.

## Frontières de cette livraison

Les changements d’interface sont disponibles sur le serveur de développement. **Les nouvelles fonctions serveur exigent les migrations 0112–0114 et les fonctions associées ; aucune base distante n’a été modifiée.** L’ordre et la configuration de vente sont décrits dans [la note des objets](GRYD_OBJECT_EXPORT_2026_IMPLEMENTATION.md).

PostGIS, GPS sur appareil, achats Store et partage natif restent à recetter dans leurs environnements réels. Les tests SQL PGlite exécutent le SQL de droits et de contrôle, sans remplacer PostGIS. Les rappels push aux inscrits, le calendrier de production, les intégrations directes aux montres et les compositions récapitulatives multi-activités ne sont pas présentés comme livrés. Le jeu utilise l’appartenance de crew réellement disponible dans le schéma, un crew actif par compte.

Ces améliorations rendent les parcours plus cohérents et plus lisibles. Une préférence supérieure à INTVL doit encore être mesurée avec des coureurs et cyclistes ; les captures et tests techniques ne la démontrent pas.

## Vérifications exécutées

- 2 322 tests mobiles et 1 495 tests Edge : aucun échec.
- 179 tests packages ; 38 fichiers SQL PGlite, puis 11 scénarios sociaux revalidés après correction finale.
- Typecheck des workspaces et contrôle du diff réussis.
- Bundles web et iOS exportés ; pas de build natif installé ni de test GPS terrain.
- Derniers ajustements de présentation des objets couverts par 13 tests objets/Film ; aucune mutation de données distantes.
