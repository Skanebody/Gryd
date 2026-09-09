# Carte et attribution — 9 septembre 2026

La dernière demande du fondateur autorise des nuances par propriétaire afin de distinguer des territoires adverses adjacents. Elle remplace, pour cette carte, l'ancienne interdiction « couleur par identité ». La palette reste exclusivement noire, blanche, grise et chartreuse.

## Lecture visuelle

- **Moi** : aplat chartreuse, contour renforcé. La marque GRYD est chartreuse sur une pastille noire.
- **Autres propriétaires** : six valeurs grises issues des tokens existants. La clé serveur initialise une nuance ; une passe locale déterministe évite les collisions entre voisins proches. Plusieurs faces d'un même propriétaire gardent la même nuance dans la vue. Les filtres ne recolorent pas les autres terrains.
- **Frontière** : un trait blanc sépare les zones voisines, puis un trait noir dessine leur limite. Cette séparation reste présente même lorsque les six nuances ne suffisent plus.
- **Crew** : les pointillés signifient une affiliation actuelle visible, explicitement retournée par le serveur. Un second trait indique les membres de mon crew selon le rôle serveur. La propriété reste individuelle. L'absence d'affiliation visible peut signifier « solo » ou « affiliation masquée » ; les couches expliquent cette limite.
- **Tap** : propriétaire autorisé ou pseudonyme, surface actuelle, propriété individuelle, affiliation visible et surface initialement capturée. Aucun nom n'est deviné. Le planificateur utilise la vraie discipline sélectionnée.

Le nombre de couches est borné : 11, puis 2 supplémentaires pour la sélection. Les opacités/largeurs varient avec le zoom. Le calcul de voisinage parcourt au plus 64 candidats proches par face après tri ; il ne compare pas chaque joueur à tous les autres. La clé est stable, mais la correction locale d'une collision de nuances peut changer lorsqu'une nouvelle vue révèle de nouveaux voisins. La géométrie et le titre de propriété ne changent jamais dans ce calcul.

## Départ et localisation

Le panneau principal contient les deux icônes Course/Vélo, avec noms accessibles et état sélectionné, puis Courir/Rouler. Il conserve l'action de reprise d'une vraie sortie en cours. Les textes et contrôles « sortie privée » ont quitté ce panneau ; le choix réel reste dans **Couches**, toujours partagé avec le préflight et enregistré par compte. Les garde-fous de consentement restent actifs.

Les overlays utilisent le verre léger existant : flou web, support lisible natif. Aucun suivi GPS arrière-plan n'est demandé pour la carte.

À l'ouverture, la carte vérifie la permission avant-plan, puis lit une vraie position uniquement si elle est accordée. Elle n'ouvre pas automatiquement de demande. Le bouton de recentrage peut la demander sur geste explicite si le système l'autorise. Refus permanent : Réglages natifs, ou choix de ville sur le web avec explication du refus. Une position absente, invalide, âgée de plus de deux minutes, ou un capteur silencieux pendant quinze secondes ne devient jamais un point fictif. Une précision approximative réduit le zoom et possède son propre halo accessible.

Une recherche de ville, un geste de carte, une nouvelle demande ou la destruction de l'écran invalide le résultat GPS tardif. Une ville de profil chargée tardivement ne remplace pas un recentrage GPS réussi. Le retour de l'application au premier plan recontrôle l'autorisation ; une exploration volontaire n'est pas écrasée.

Safari peut ne pas exposer l'état de permission : il faut alors toucher Recentrer. Une autorisation ancienne mémorisée n'est pas traitée ici comme une autorisation courante.

## Contrat serveur 0126

`get_ownership_2026` garde ses paramètres et retourne `ownership.2026.3`. Chaque feature ajoute :

```ts
owner: {
  key: string;                 // pseudonyme de 32 caractères, scoped au spectateur
  kind: 'individual';          // seule attribution réellement implémentée
  label: string | null;        // uniquement selon la visibilité réelle du profil
  crew: { key: string; name: string } | null; // affiliation actuelle visible
}
```

La clé dérive de deux UUID par hachage et sert à comparer des faces déjà autorisées. Elle ne constitue pas une promesse d'anonymisation irréversible. Le nom et l'affiliation respectent `profile_visibility`, l'amitié acceptée, le crew courant et `discreet_mode`. L'UUID brut d'un propriétaire étranger reste absent. Le helper d'identité n'est pas exécutable par les clients : il ne devient pas un annuaire arbitraire.

La lecture garde ses filtres de sport, emprise, publication, consentement carte, suppression et blocages. La migration n'écrit aucune capture et ne crée aucune donnée utilisateur. Elle n'ajoute aucune table.

Le client reste compatible avec `ownership.2026.2` : les nuances se fondent alors sur l'identifiant de terrain, et la fiche précise **« identité non fournie par ce serveur · nuance par terrain »**. Ce repli ne prétend pas reconnaître deux terrains appartenant à la même personne.

## Vérifications et limites

- Typecheck mobile : réussi.
- Deno ciblé : 54 tests réussis, dont 14 tests nouveaux de parsing, identité, voisinage/peinture, permission, précision, refus, position périmée, délai et invalidation des réponses tardives. Inclut les régressions de confidentialité, propriétaire et peinture/fond existantes.
- PGlite : 11 vérifications réussies ; migration 0126 appliquée réellement, fonctions d'identité/visibilité exécutées, droits SQL et refus avant opérations spatiales vérifiés. Les prédicats spatiaux sont aussi contrôlés dans le corps SQL, **mais leur exécution PostGIS n'a pas eu lieu**.
- Les réactions réelles iOS/Android, la précision native, le retour Réglages et les gestes MapLibre restent à tester sur téléphone. La recette navigateur appartient au processus QA principal ; cet agent n'a pas piloté son navigateur.
- Le serveur ne possède actuellement ni copropriété crew ni attribution historique de contribution crew : l'interface n'en invente aucune.
- Les lectures restent limitées par l'emprise existante ; ce lot ne démontre pas une agrégation de 200 000 polygones ni leur rendu simultané. Le nombre de couches et le voisinage client sont bornés, mais une garantie de charge nationale exige une validation dédiée.
- Aucun déploiement, aucune mutation distante, aucun territoire ou utilisateur factice injecté dans l'application.
