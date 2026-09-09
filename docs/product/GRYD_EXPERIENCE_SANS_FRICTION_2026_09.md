# GRYD — entrée directe, communauté et mouvement

État du travail : 9 septembre 2026. Ce document décrit les décisions, leur traduction dans le code et la recette après intégration des travaux parallèles. Il ne certifie ni une supériorité sur les concurrents ni une hausse de rétention sans observation auprès de vrais utilisateurs.

## Ce qui change dans le parcours

La carte devient la première expérience utile. L’accueil conserve la photographie originale ; « Explorer la carte » est l’action principale. « Comment jouer » donne accès à une démonstration facultative : fermer une boucle, retrouver son crew, comprendre la carte. Aucun choix de sport, aucune permission GPS et aucun compte ne sont requis pour explorer. Course et vélo se choisissent dans la carte.

Le groupe d’onglets ne déclenche plus la vieille chaîne profil → activité → permissions après connexion. Un compte sans profil public peut ouvrir la carte et enregistrer une sortie. L’identité publique se complète dans les parcours qui l’utilisent. L’absence de réponse du profil ne doit pas devenir une obligation de recommencer l’inscription.

Pour un invité, le départ indique seulement que la sortie est privée et conservée sur cet appareil. Le commutateur de publication désactivé et l’invitation à se connecter ont été retirés de ce moment. La publication de territoires exige toujours les conditions de compte, de consentement et de validation serveur existantes. Une exploration sans compte ne promet pas de conquête publique rétroactive.

## Carte et communauté : une priorité par contexte

| Contexte | Avant ce lot | Traduction réalisée |
|---|---|---|
| Carte sans compte ni terrain | États vides et demande de connexion superposés au terrain | Départ et recentrage prioritaires ; les détails d’état sont dans Couches |
| Carte avec terrains | Information d’appartenance disponible | Légende affichée seulement lorsqu’il existe des terrains visibles ; détail au toucher conservé |
| Passage course/vélo | Sélection instantanée de deux boutons | Un indicateur se déplace sous deux cibles fixes de 44 px ; aucune question préalable |
| Navigation | Trois destinations avec une sélection fixe | Capsule de sélection mobile ; trois icônes, libellés d’accessibilité et focus clavier conservés |
| Crew membre | Conversation et raccourcis avant le rendez-vous | Prochaine sortie réellement à venir en premier, inscription directe confirmée par le serveur |
| Trouver qui aide dans le crew | Rôles lisibles seulement membre par membre | Filtres Tous / Accueil / Sorties / Parcours, données autorisées et état vide explicite |
| Rendez-vous inscrit | Revenir manuellement chercher les détails | Export calendrier explicite après relecture de la sortie et de l’inscription |
| Crew invité | Multiplication de grands blocs de présentation | Une photo originale, une promesse courte, les actions utiles |

La prochaine sortie est calculée à partir des dates réelles, indépendamment de l’ordre de réponse du serveur. Les sorties annulées, déjà commencées et aux dates invalides sont exclues. Aucun participant ni rendez-vous d’exemple n’est injecté dans l’application. Le fil, les conversations, les rôles volontaires, les invitations et le Studio de partage déjà présents restent accessibles après cette priorité. Les filtres de contribution facilitent la recherche d’une personne dans les membres ; une personne bloquée n’est pas mise en avant par son rôle. La nouvelle migration 0128 protège aussi le nom privé de l’organisateur d’une sortie : seule l’identité autorisée ou son pseudo public est rendue. Ce correctif serveur est testé localement, non déployé.

L’export calendrier est un fichier `.ics`, pas un abonnement synchronisé. Il contient le titre, l’heure réelle, le rendez-vous public et une indication de vérifier les changements dans GRYD. Il ne contient ni liste de membres, ni coordonnées GPS, ni rappel imposé. Aucun horaire de fin n’est inventé. Le message confirme la préparation du fichier, jamais son import dans un calendrier. Le format suit les règles de date UTC, d’échappement et de repli des lignes de la [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html).

## Benchmark du mouvement : sources et choix

### Apple : continuité et couche de contrôle

Les présentations WWDC 2025 décrivent une couche de contrôles en verre située au-dessus du contenu, des commandes regroupées par fonction et des transitions qui gardent un lien entre leur origine et leur destination. Le verre sert la hiérarchie et la lisibilité ; il ne remplace pas l’organisation de l’écran. Source officielle consultée le 9 septembre : [Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/).

**Application GRYD, choix de conception :** véritables fonds translucides sur les commandes flottantes, couches opaques pour le contenu long, indicateur de navigation qui se déplace, courts changements de contenu au sein de la même surface. La carte reste visible et les cibles tactiles ne bougent pas sous le doigt. La réalisation web est un flou CSS avec reflet intérieur ; elle ne prétend pas reproduire le moteur optique natif d’Apple.

### Google : expression lisible et familière

La recherche Material 3 Expressive porte sur 46 études et plus de 18 000 participants. Elle met en avant la direction de l’attention par la forme, la taille et le mouvement, mais rapporte aussi les difficultés créées par des dispositions trop inhabituelles et certains libellés retirés. Les résultats dépendent du contexte. Source officielle : [Expressive Design: Google UX Research](https://design.google/library/expressive-material-design-google-research).

**Application GRYD, choix de conception :** trois destinations stables, un accent chartreuse, une animation brève qui répond à une action. Les mots restent sur les décisions ambiguës — inscription à une sortie, confidentialité, publication, calendrier. Les icônes seules sont réservées aux commandes familières demandées par le propriétaire du produit. Aucun chiffre de cette recherche n’est extrapolé à GRYD.

### Ce que nous écartons

Les rotations décoratives permanentes, effets de distorsion sur les textes, caméras qui se déplacent sans demande et animations de récompense avant confirmation n’améliorent pas l’usage en déplacement. Le mouvement retenu explique une conséquence ou marque un accomplissement. Il ne retarde pas le départ.

## Répertoire implémenté

| Interaction | Mouvement | Garde-fou |
|---|---|---|
| Boucle pédagogique | Tracé progressif, fermeture au toucher, apparition du terrain, rejouer | Illustratif, ne crée aucun territoire ; découverte facultative |
| Carte de découverte | Sonar discret | N’affirme pas avoir trouvé la position ; GPS sur action explicite |
| Menu et sport | Ressort court, sans dépassement | Cibles fixes ; arrêt si arrière-plan ou réduction des animations |
| Détail de terrain | Fondu et déplacement de 6 px sur 220 ms | Seulement quand le contenu change, jamais de blocage du CTA |
| Niveau, badge, objet | Entrée et halo brefs | Seulement sur nouveau fait serveur ; première lecture silencieuse ; dédoublonnage local par compte |
| Verre | Blanc 26 %, flou 7 px, reflet intérieur, bordure discrète | Teinte sombre sur carte pour garder le contraste ; réduction de transparence iOS respectée |

La préférence de réduction du mouvement inconnue commence sans animation. Les transitions s’arrêtent lorsque l’application passe en arrière-plan. Les motions du tutoriel suivent aussi le focus de leur page. Les badges animés utilisent le catalogue original GRYD ; ils ne transforment pas un achat en mérite sportif.

## Où se trouvent les changements

- `apps/mobile/src/features/onboarding/Discovery2026Screen.tsx` : entrée et découverte facultative.
- `apps/mobile/app/(tabs)/_layout.tsx` : suppression du barrage de configuration.
- `apps/mobile/src/features/account/` : refonte de l’authentification, réalisée en parallèle ; sa recette précise les capacités disponibles.
- `apps/mobile/src/features/refonte/MapHome.tsx` : carte épurée et contrôles.
- `apps/mobile/src/features/refonte/CrewHomeScreen.tsx` : prochain rendez-vous et RSVP direct.
- `apps/mobile/src/features/refonte/CrewOutings2026Screen.tsx` : export calendrier après relecture serveur.
- `apps/mobile/src/ui/gryd/Motion2026.tsx` : mouvement partagé, réduction et cycle de vie.
- `apps/mobile/src/ui/gryd/FrostedBackdrop2026.tsx` : matière translucide commune.

## Limites et mesures à suivre

La comparaison concurrentielle complète et ses sources sont consignées dans `GRYD_BENCHMARK_COMMUNAUTE_2026_09.md`. Les enjeux de club au-delà de 50 membres, d’espace marque et de reçus serveur de messages non lus y sont distingués des fonctions livrées. Une page de présentation ne serait pas un portail opérationnel de club.

L’objectif à mesurer est le délai entre première ouverture et départ effectif, puis la proportion de nouveaux utilisateurs qui reviennent courir avec le même groupe. Les inscriptions à une sortie et les présences réelles ont davantage de valeur que des notifications envoyées ou des vues d’écran. Les publications et exports restent choisis par l’utilisateur ; aucun partage automatique n’est introduit.

Une validation navigateur ne remplace pas l’essai sur téléphone : clavier, retour OAuth, GPS en arrière-plan, feuille de partage, flou natif, VoiceOver et autonomie restent à contrôler sur appareil. Les fournisseurs d’identité, modèles d’e-mail et migrations serveur doivent être effectivement configurés pour qualifier les parcours connectés de bout en bout.

## Recette finale du dépôt

- `npm run typecheck` : quatre workspaces validés. Vérification mobile répétée après les derniers ajustements visuels de l’authentification.
- `deno test --allow-read --allow-env apps/mobile/src` : **2 385 tests réussis, 0 échec**. Les sous-suites des agents ne sont pas ajoutées à ce total.
- Suite SQL sociale étendue : **13 scénarios réussis**. Sans la migration 0128, le test de confidentialité reproduit la fuite ; avec elle, profils privés, amis, crew et blocages respectent leur audience.
- Export Expo web et bundle iOS : réussis. Aucun binaire installé ni compte fournisseur réel n’est déduit de ces exports.
- Navigateur Chromium, 390 × 844 et 320 × 640 : entrée immédiate, carte, sport, Couches, Crew, Profil, Réglages, conditions, connexion, e-mail et retour sans paramètres examinés. Aucune erreur JavaScript relevée. Aucun e-mail ni écriture d’authentification dans ces parcours de recette.
- Barre de navigation mesurée **188 × 54 px**, trois destinations sans texte visible, noms accessibles présents. Réglages : **19 icônes distinctes**. Verre web mesuré : blanc 26 %, flou 7 px, parent transparent et reflet intérieur.
- Tutoriel facultatif : tests spécifiques de persistance, clavier, zéro permission implicite et stockage bloqué décrits dans la [recette onboarding](GRYD_ONBOARDING_OPTIONNEL_2026_09.md).
- Auth : entrée/e-mail à 28 px, boutons 48 px, G chartreuse 24 px, photographie originale et retour court sans troncature. Callbacks vérifiés par tests purs et revue de code ; fournisseur réel à recetter séparément.

Preuves : [entrée320](../design/review-2026/frictionless/entree-320.png), [carte320](../design/review-2026/frictionless/carte-320.png), [connexion390](../design/review-2026/frictionless/connexion-390.png), [e-mail320](../design/review-2026/frictionless/email-320.png), [Crew390](../design/review-2026/frictionless/crew-390.png), [Profil390](../design/review-2026/frictionless/profil-390.png). Les journaux de recette navigateur sont conservés dans le même dossier.

**Reste externe au dépôt :** déploiement des migrations et services, activation coordonnée des deux templates OTP et du build, configuration OAuth manquante, sorties GPS/partage/calendrier/accessibilité sur appareils réels. Aucun de ces éléments n’est présenté comme validé en production.
