# GRYD — composition de l’interface, 9 septembre 2026

Mise en œuvre de la note utilisateur « Ce rendu vient surtout d’une hiérarchie très maîtrisée… ». Le document de référence décrit un dashboard CRM ; GRYD en reprend la hiérarchie, les proportions et les familles de formes pour un usage mobile de course et de vélo.

## Traduction dans GRYD

| Principe | Mise en œuvre |
| --- | --- |
| Hiérarchie avant effets | Fond gris neutre, modules blancs, synthèse ou photo sur noir. Modules voisins, sans enveloppes décoratives imbriquées. |
| Composition par importance | Profil : identité, mouvement, journal, collection. Crew : photo, rendez-vous, membres, terrains. GRYD+ : outils, éditions, abonnement. |
| Typographie géométrique | Manrope pour les titres et chiffres ; Inter pour la lecture. Titres courants 18–25 px, textes 12–14 px, chiffre principal Statistiques 40 px. Les valeurs longues peuvent s’ajuster. |
| Formes cohérentes | Modules de rayon 24 px ; filtres en capsules ; commandes locales circulaires de 44 px ; bordures discrètes. |
| Verre local | Couches, parcours et recentrage : surface sombre translucide à 88 %, flou 7 px sur web. Navigation claire à 94 % pour conserver le contraste sur les photos. Repli opaque sur iOS/Android. Aucun voile d’opacité sur les icônes. |
| Palette GRYD | Noir, blanc, gris neutres, chartreuse #B4FF0D. La palette lavande/cyan du CRM n’est pas importée. |
| Données sportives | Distance et durée réelles. Histogramme quotidien à échelle visible, barres arrondies, zéro sans barre, journée consultable avec commandes précédent/suivant. Comparaison A/B sur les activités ou périodes réellement disponibles. |
| Navigation | Trois destinations nommées : Carte, Crew, Profil. Libellés persistants, sélection visuelle et ARIA, focus visible. |
| Accessibilité | États ARIA explicites ajoutés pour react-native-web ; états natifs conservés. Actions circulaires nommées avec aide au survol/focus. Contraste renforcé du menu sur les photos. |
| Petits écrans | Identité adaptable, libellés d’action non tronqués, galerie en rangées de deux modules flexibles, illustrations ajustées à la largeur mesurée. Contrôles principaux de 44 px ; sept jours du calendrier visibles à 320 px avec des cases de 40 px. |
| Images et objets | Photographies originales GRYD : coureurs/cycliste et groupe, vêtements noirs et accents chartreuse. Œuvres GRYD existantes, présentées comme aperçus quand elles ne sont pas possédées. |
| États produit | Chargement, indisponibilité, compte invité, absence d’activité et droits d’achat restent explicites. Aucun faux chiffre, prix, graphique ou objet gagné ajouté. |

## Territoires

La carte conserve ses données autoritaires et trois rôles : moi = chartreuse, crew = trait clair discontinu, autres = gris. La légende est toujours visible ; les filtres restent dans Couches. Le panneau de départ blanc rassemble la discipline, le statut de confidentialité et l’action Courir/Rouler. Les commandes locales disposent de noms accessibles. La sélection d’un territoire distingue surface actuelle et capture initiale ; la propriété individuelle reste inchangée.

## Fichiers concernés

- `apps/mobile/src/features/refonte/ProfilePrimitives.tsx` : mode clair optatif des composants, mode sombre conservé pour les écrans existants.
- `apps/mobile/src/ui/gryd/Surface2026.tsx` : surfaces, commandes circulaires et verre avec repli natif.
- `apps/mobile/src/features/nav/GrydNavBar.tsx` : menu et états d’accessibilité.
- `apps/mobile/src/features/refonte/{ProfileHomeScreen,ProfileStatsScreen,ProfileComparisonScreen,CrewHomeScreen,MapHome,SeasonJourneyScreen,ProfilePremiumScreen,PremiumObjectsPreview2026,CollectionScreen,SeasonCollections2026,CommercialCollectionsPanel2026}.tsx`.
- `apps/mobile/app/parametres.tsx` et `app/_layout.tsx` : réglages clairs et barre d’état adaptée aux fonds.
- `packages/shared/src/design-tokens.ts`, `apps/mobile/src/lib/fonts.ts` : familles typographiques embarquées.
- `apps/mobile/src/features/legal/{licenses,fontLicense,networkHosts}.ts`, catalogue légal : mention et texte OFL de Manrope. Les URLs de la licence sont des citations, sans appels réseau.

## Sources et choix de fonte

La [référence RonDesignLab / Jack R.](https://dribbble.com/shots/23251816-Salesforce-CRM-Sales-Analytics-Platform) et ses vues de grille, cartes de synthèse et graphique ont été inspectées dans le navigateur pendant cette passe. Aucun visuel du CRM n’est livré dans GRYD.

La fonte Lufga citée dans la note n’est pas disponible dans le dépôt. [Manrope via Expo Google Fonts](https://github.com/expo/google-fonts/tree/main/font-packages/manrope) fournit une géométrie adaptée ; le paquet est ajouté uniquement pour embarquer les fontes dans la pile Expo existante. Sa [licence SIL OFL](https://github.com/expo/google-fonts/blob/main/font-packages/manrope/LICENSE_FONT) accompagne l’application. Aucune requête vers Google Fonts au démarrage.

## Validation

Les contrôles et captures sont consignés dans `docs/design/review-2026/composition/`. La revue navigateur couvre les états accessibles avec le compte invité, en 320 × 639 et 390 × 844 CSS. Les états alimentés par un compte possédant des sorties et droits sont conservés par les composants et leurs modèles ; cette passe ne prétend pas les avoir vérifiés visuellement avec un compte réel.

Les surfaces natives sont typées et disposent d’un repli opaque ; la transparence native et VoiceOver sur appareil physique restent à valider. Cette livraison concerne l’interface locale ; elle ne déploie pas les migrations ni le catalogue Store.

### Contrôles finaux

- TypeScript sur tous les workspaces : réussi.
- Suite mobile Deno : **2 322 réussis, 0 échec**.
- Export Expo web et bundle iOS Hermes : réussis, Manrope incluse. Il s’agit de bundles, pas d’une validation sur appareil physique.
- `git diff --check` : réussi.
- Revue réelle : Profil, Crew, carte, Couches, Progression, GRYD+, Collection, Statistiques et Réglages. Filtres Course/Vélo et 7/28 jours, onglets Saison/Parcours, explications de progression et aperçus d’éditions contrôlés.
- Régression galerie détectée à 320 px : l’arrondi web de `onLayout` peut annoncer 280 px pour 279,888 px réellement disponibles. Résolution par rangées de paires flexibles ; deux colonnes confirmées dans le DOM et en capture.

Orchestration : GPT-6 Astra pour la composition Profil/Stats/Comparaisons, GPT-5.6 Sol pour les composants et la navigation, expert Crew/Collection réutilisé. Intégration, contrôles de contraste et revue navigateur assurés par l’agent principal.
