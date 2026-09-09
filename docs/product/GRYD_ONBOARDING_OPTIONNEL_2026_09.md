# Découverte facultative — 9 septembre 2026

La découverte donne maintenant accès à la carte dès le premier écran. La photo originale GRYD est conservée, avec le petit G, une croix et **Explorer la carte**. **Comment jouer** ouvre un parcours pédagogique facultatif. Aucun compte, choix de sport ou accès GPS n'est demandé pour explorer.

## Fondement et choix produit

Apple recommande une découverte courte, agréable et facultative, l'apprentissage par interaction et une aide retrouvable ultérieurement. Les réglages non indispensables peuvent attendre ; une permission peut être demandée au premier usage de la fonction qui en dépend. GRYD traduit ces recommandations par une entrée directe et trois leçons accessibles à la demande. C'est un choix de conception, pas une preuve mesurée d'amélioration de la rétention. [Apple HIG — Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding), [contenu officiel consulté](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json).

Le mouvement doit expliquer une action, rester bref, être désactivable et ne pas imposer d'attente. La boucle interactive conserve donc sa fermeture explicite, y compris en mouvement réduit ; son illustration n'attribue aucun territoire. Les animations existantes s'arrêtent en arrière-plan et lorsque l'écran perd le focus. [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [contenu officiel consulté](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json).

## Parcours réalisé

| État | Action et résultat |
| --- | --- |
| Première photo | Explorer la carte ou la croix ouvre immédiatement `/`. Comment jouer ouvre La boucle. Aucun compteur d'étapes. |
| La boucle | Exemple interactif : tracer, fermer, puis montrer la surface. Mention explicite qu'aucun terrain n'a été gagné. |
| Le crew | Photo originale et présentation de la coopération. Continuer ouvre La carte. |
| La carte | Sonar illustratif, exploration libre et explication du GPS pour enregistrer une sortie. Explorer reste l'action principale. |
| Navigation pédagogique | Trois onglets nommés, tous accessibles : La boucle, Le crew, La carte. Retour et croix disponibles. Explorer permet de quitter les leçons. |
| Me localiser · facultatif | Seul geste de cette découverte pouvant demander la localisation. Un refus ou une position introuvable laisse l'exploration disponible. Quitter invalide la réponse tardive. |
| Revoir depuis Réglages | Recommence à la photo. Les trois leçons restent accessibles. Fermer ou Terminer revient à `/parametres` ; Explorer ouvre `/`. Aucun accès GPS ni écriture des préférences dans cette relecture. |

L'ancien choix Course/Vélo et ses écritures dans la préférence de carte sont retirés. Le changement de sport reste une action de la carte. L'ancienne reprise d'une étape obligatoire ramène à la photo ; seule une leçon explicitement ouverte dans le nouveau parcours facultatif peut être reprise. La découverte n'appelle pas la chaîne historique de création de profil E08–E10.

## Stockage et absence de friction

Un clic rapide avant la première lecture pouvait auparavant sauvegarder des valeurs par défaut par-dessus des préférences existantes. Le correctif sérialise les mises à jour, relit l'état persistant, puis fusionne uniquement les champs explicitement modifiés. Âge confirmé, ville, première capture et futurs champs inconnus sont préservés. Les données corrompues ou illisibles ne sont jamais remplacées par des consentements par défaut.

Explorer met seulement à jour `onboardingDone` et `reachedStep`. La navigation n'attend pas le disque. Un reçu de session empêche la garde d'entrée de renvoyer vers la découverte pendant une lecture bloquée ou après un échec d'écriture. La durabilité n'est pas promise en cas d'échec : le texte indique que la découverte peut revenir au prochain lancement. Le store conserve ses délais bornés de lecture et d'écriture.

## Accessibilité vérifiée et limites

Les quatre paires de couleurs du texte sur surfaces opaques sont testées au seuil de 7:1 pour le texte courant. La légende sur photo du crew dispose d'un fond noir opaque. Ce contrôle ciblé ne constitue pas une certification AAA de l'application entière. [W3C — Contrast Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html).

Les contrôles font au moins 44 px de haut, le bouton principal 48 px. Le focus clavier présente un contour de 2 px. Les onglets exposent leur sélection, la localisation son état occupé et les messages leur région dynamique. Le mode de mouvement réduit maintient une interaction compréhensible sans animation obligatoire. [W3C — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

VoiceOver, TalkBack et les demandes de permission sur appareil natif restent à vérifier sur appareil. Les captures sont celles du rendu Expo web réel ; aucun compte serveur, gain de jeu ou permission réelle n'a été créé pour la recette.

## Recette du lot

- **21 tests ciblés réussis** : parcours et relecture (4), persistance et préservation des préférences (5), mouvement réduit/arrière-plan/reprise/nettoyage (11), contrastes des tokens réellement utilisés (1).
- **Typecheck mobile réussi** et `git diff --check` sans erreur.
- **Navigateur réel, 390 × 844 et 320 × 740**, langue française et mouvement réduit : aucun débordement horizontal, aucune erreur de page ; exemple fermé uniquement par geste ; trois leçons atteignables ; entrée sans radios de sport ni compteur.
- **Zéro appel GPS avant un geste de localisation**, sortie vers la carte réussie ; sport Vélo, âge confirmé, ville et champ de consentement futur conservés. La relecture conserve exactement la chaîne persistée.
- **Stockage indisponible** : message explicite et carte accessible. **Lecture indéfiniment suspendue** : activation d'Explorer par Entrée au clavier, arrivée sur la carte en 214 ms dans ce passage local, sans appel GPS. Cette durée est une observation de recette locale, pas une mesure de performance généralisable.

Captures conservées :

| Vue | 320 px | 390 px |
| --- | --- | --- |
| Entrée directe | [Photo et accès immédiat](../design/review-2026/discovery-direct-320.png) | [Photo et accès immédiat](../design/review-2026/discovery-direct-390.png) |
| Boucle facultative | [Boucle fermée par geste](../design/review-2026/discovery-loop-optional-320.png) | [Boucle fermée par geste](../design/review-2026/discovery-loop-optional-390.png) |
| Crew facultatif | [Photo et coopération](../design/review-2026/discovery-crew-optional-320.png) | [Photo et coopération](../design/review-2026/discovery-crew-optional-390.png) |
| Carte facultative | [Sonar et GPS facultatif](../design/review-2026/discovery-map-optional-320.png) | [Sonar et GPS facultatif](../design/review-2026/discovery-map-optional-390.png) |

[État de stockage indisponible à 320 px](../design/review-2026/discovery-storage-unavailable-320.png).

Aucune migration, modification des règles de jeu ou publication n'est nécessaire pour ce lot.
