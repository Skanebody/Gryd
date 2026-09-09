# Onboarding — contrôle navigateur du 9 septembre 2026

Chromium Playwright isolé sur le serveur existant `localhost:8081`, sans changement de serveur ni donnée distante créée. 24 captures PNG : 20 états en replay + 4 de première ouverture. Les captures aux deux tailles ont été ouvertes et inspectées visuellement.

## Résultats

- 4 parcours replay : 390 × 844 et 320 × 640, chacun avec animation normale et `prefers-reduced-motion: reduce`.
- 2 parcours première ouverture : mêmes dimensions, choix Vélo, progression sans toucher la boucle, puis « Explorer sans localisation ».
- Le G seul est placé en haut à gauche, sans support. La fermeture présente une cible réelle de 44 × 44 CSS px, avec le pictogramme de 20 px.
- L’étape 2 anime le trait et le point. La boucle reste ouverte et sans remplissage jusqu’au tap. Le tap ferme le segment manquant puis remplit l’intérieur. « Rejouer » remet l’exemple ouvert ; « Continuer » fonctionne immédiatement sans fermer la boucle.
- Avec Reduce Motion, la boucle ouverte et le sonar sont fixes après hydratation de la préférence ; le tap ferme et remplit immédiatement. En mode normal, le décalage du trait et les rayons du sonar varient effectivement entre deux lectures du DOM.
- « Terminer » et « Fermer la découverte » reviennent au contenu Paramètres, identifié par « Revoir la découverte », et pas seulement à une URL attendue.
- Les clés persistées `gryd.mapactivity` et `gryd.onboarding.v1` restent inchangées par le replay.
- Zéro appel navigateur `getCurrentPosition`/`watchPosition` sur les six parcours ; zéro erreur JavaScript ; aucun débordement horizontal du document.

## Géométrie du CTA de l’étape 2

| Fenêtre | x | y supérieur | largeur | hauteur | y inférieur |
|---|---:|---:|---:|---:|---:|
| 390 × 844 | 22 | 759 | 346 | 46 | 805 |
| 320 × 640 | 22 | 570 | 276 | 46 | 616 |

Le bouton est entièrement visible aux deux dimensions. Les safe areas du navigateur de bureau sont nulles ; les captures ne valident pas les insets d’un appareil avec encoche. Le contenu reste dans un ScrollView et reçoit les insets natifs du composant existant.

## Preuves et limites

Détails : `onboarding-motion-qa.json`, `onboarding-entry-qa.json`. Scripts reproductibles dans cette session : `/private/tmp/gryd-onboarding-motion-qa.cjs` et `/private/tmp/gryd-onboarding-entry-qa.cjs`.

Les 30 tests Deno ciblés du modèle de mouvement, du cycle de vie et du parcours étaient verts avant cette passe ; le typecheck mobile était également vert. La mise en pause et la destruction du minuteur sont couvertes par ces tests purs. Cette passe navigateur ne prouve pas le cycle de vie ni les performances d’un appareil iOS/Android réel. Aucune permission GPS n’a été accordée et aucune position artificielle n’a été injectée. Aucun défaut de l’onboarding n’a nécessité de modification du code pendant cette passe.
