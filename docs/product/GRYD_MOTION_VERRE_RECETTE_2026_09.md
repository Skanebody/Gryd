# GRYD — découverte, verre et moments de progression

Demande du 9 septembre 2026. Ce lot ajuste l’application existante, ses composants partagés et les animations de progression.

## Changements visibles

| Demande | Réalisation |
| --- | --- |
| Marque sur la découverte | G chartreuse seul, sans pastille ni mot GRYD, placé en haut à gauche. |
| Fermeture plus discrète | Croix de 20 px ; cible tactile de 44 × 44 px. |
| Deuxième étape interactive | Tracé animé jusqu’à une ouverture. Un toucher ferme la boucle puis fait apparaître sa surface ; Rejouer relance la démonstration. Continuer fonctionne aussi sans interaction. Aucun terrain réel n’est attribué par ce dessin. |
| Troisième étape | Photo originale et composition conservées. |
| Dernière étape | Ondes de sonar discrètes ; elles n’indiquent pas une acquisition GPS. La localisation n’est demandée qu’au geste explicite. |
| Navigation | Capsule de 188 × 54 px, trois icônes seules. Noms accessibles Carte, Crew, Profil ; aide au survol sur ordinateur. |
| Photo du Profil | Même fichier original `assets/onboarding/e01-crew.jpg`, affiché avec un cadrage dans le tiers supérieur. Visage central entier à 320 et 390 px. |
| Réglages | 19 glyphes différents, avec un dessin distinct pour chaque contexte : compte, édition, confidentialité, notifications, abonnement, appareils, journal, collection, crew, langue, fonctionnement, découverte, FAQ, support, à propos, conditions, politique, crédits et licences. |
| Défis 5v5 | Deux équipes opposées, avec un signe d’opposition central ; même dessin dans les entrées et la page des défis. |

## Matière translucide

`FrostedBackdrop2026` centralise la matière :

- Clair sur le web : blanc à 26 %, flou de 7 px, reflet intérieur blanc à 60 %, ombre noire à 10 % et bord fin.
- Sombre sur carte/photo : teinte noire à 58 % pour conserver une bonne lisibilité des symboles et textes blancs, même sur un fond clair.
- Le fond des conteneurs est transparent ; texte et icônes restent nets au-dessus du flou.
- Application aux commandes flottantes de la carte, à la navigation, aux groupes Réglages, aux retours, aux segments, aux boutons secondaires, aux plaques sur photo et au rappel de sortie active.
- Le bouton principal chartreuse reste plein. Les longues pages de lecture gardent un fond stable.
- iOS utilise `expo-blur` et respecte « Réduire la transparence ». Android conserve un repli teinté translucide. Le rendu natif sur appareil reste à vérifier ; exporter le bundle iOS ne remplace pas cette vérification.

## Moments de progression

Un encart compact présente un niveau atteint, un objet de collection ou un badge nouvellement confirmé. L’objet entre doucement avec un halo bref ; les actions restent disponibles. L’album, la progression et le résultat de sortie accueillent cet encart selon les données reçues.

- Aucune attribution locale d’XP, de badge ou de terrain.
- Premier relevé d’un compte silencieux pour ne pas célébrer tout son historique ; préparation de ce relevé dès la session.
- Déduplication locale par compte et par domaine, enregistrée avant présentation.
- Données tardives d’un ancien compte rejetées.
- Une panne de stockage supprime la célébration au lieu de la rejouer à chaque ouverture.
- Préférence de réduction des mouvements : présentation fixe. Les animations s’arrêtent hors écran ou en arrière-plan.
- La déduplication est propre à l’appareil. Effacer ses données locales réinitialise cette mémoire ; ce mécanisme ne promet pas une déduplication entre appareils.

## Vérifications

- Découverte : six parcours Chromium — première ouverture et replay, 320 × 640 et 390 × 844, mouvement normal et réduit. Fermeture, rejeu, navigation et conservation des choix vérifiés ; aucun appel GPS avant une action dédiée.
- Surfaces : contrôles à 320 et 390 px, 19 dessins uniques réellement rendus, menu de 188 × 54 px avec noms accessibles, ouverture des conditions puis retour, aucun parent opaque devant le verre.
- Valeurs CSS constatées : `rgba(255, 255, 255, 0.26)`, `blur(7px)`, reflet intérieur et ombre conformes.
- Captures : `docs/design/review-2026/motion-glass/`.

Ce lot ne déploie pas de service distant ni de migration SQL. Les récompenses affichées dépendent toujours des réponses réelles du serveur ; aucun compte ni résultat de démonstration n’a été ajouté à l’application.
