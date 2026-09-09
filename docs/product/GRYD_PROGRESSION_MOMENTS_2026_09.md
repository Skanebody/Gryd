# Moments de progression — 9 septembre 2026

## Déclenchement réalisé

Un encart compact est branché dans **Progression** (`SeasonJourneyScreen`), **le résultat d’une sortie validée ou partielle appartenant au compte courant** (`RunResult`) et **Mes badges** (`app/badges.tsx`). Il regroupe les niveaux et objets nouveaux dans une seule présentation par visite. Il n’ouvre aucune modale, n’équipe aucun objet et ne modifie aucun XP.

- Progression : nouvelle réponse parsée de `progression_2026`, hors état `pending`. Le niveau vient de la fonction de progression partagée appliquée aux XP de ce ledger ; les objets viennent exclusivement de `ownedRewards`.
- Résultat : deux nouvelles lectures, progression et `user_badges`, après vérification du propriétaire et d’un résultat serveur valide/partiel, sans activité encore en attente. Un vieux résultat stocké ou ses anciens `newBadges` ne constituent jamais le signal de nouveauté. Le texte ne prétend pas attribuer à cette sortie une progression réalisée ailleurs.
- Album : lecture serveur réussie des badges du compte, onglet personnel ouvert et aucun détail modal ouvert. L’ancien bandeau avec mémoire « best effort » est remplacé. Le composant historique `BadgeUnlockMoment` plein écran reste inutilisé.

## Référence et déduplication

La première lecture vérifiée de chaque domaine fixe une référence silencieuse, même pour une collection vide. Le composant passif `ProgressMomentBaseline2026`, monté directement sous `SessionProvider`, démarre les deux lectures indépendantes une fois par session authentifiée. Il ne rend rien, ne fait aucune requête pour un invité et ne retarde pas le démarrage de l’activité : le chemin Carte → première sortie est ainsi couvert sans visiter Profil. Les lecteurs existants `useProfileProgress` et `useMyBadges` peuvent aussi préparer cette référence. Une lecture échouée ne pose jamais une référence vide inventée ; si aucune référence n’a pu être obtenue avant le résultat, ce premier relevé reste silencieux. Les lectures passives ne consomment pas les nouveautés suivantes avant leur écran dédié.

La mémoire locale est persistée par identifiant de compte sous `gryd.progress-moments.v1:<owner>`. Les deux domaines (parcours/objets et badges) restent séparés. Les niveaux mémorisés ne baissent jamais et les identifiants connus ne sont pas oubliés si une lecture ultérieure est incomplète. Les objets présents au premier relevé sont connus sans célébration. Après cette référence, la nouveauté repose sur la différence des identifiants confirmés par le serveur. Aucune comparaison entre `earned_at` serveur et l’horloge du téléphone : décalage d’horloge et latence de réponse ne doivent pas supprimer un véritable nouveau droit acquis. Un objet ajouté par une correction serveur après la référence peut donc être présenté comme nouveau dans la collection, sans affirmer une date ni une cause sportive précise.

Les observations concurrentes sont sérialisées par compte. Le reçu est écrit **avant** d’autoriser l’affichage. Chaque réponse est marquée par le propriétaire et l’epoch capturés avant sa requête ; les hooks rejettent les réponses tardives, masquent les données hors du scope courant et rechargent lors d’un nouvel epoch. La session et son epoch sont revérifiés après chaque attente et avant de construire un snapshot ou rendre un objet, y compris pour A → B → A. Une erreur de lecture ou d’écriture supprime le moment et désactive les nouveaux essais de ce stockage pour ce compte pendant le processus : aucun cycle de relecture ne fabrique des célébrations répétées. Le compte suivant possède sa propre mémoire. La lecture des badges masque aussi immédiatement tout résultat appartenant à un autre compte.

**Limite exacte :** déduplication locale, au plus une autorisation d’affichage par nouveauté dans une instance de l’application, avec persistance pour les lancements suivants. Un arrêt du processus entre l’écriture du reçu et l’affichage peut omettre le moment. Un stockage local ne permet pas une transaction atomique avec l’écran, ni une garantie « exactement une fois » entre plusieurs appareils ou processus/onglets web indépendants. Réinstallation ou mémoire corrompue : nouvelle référence silencieuse, jamais défilé de l’historique. Aucune migration serveur ni aucun déploiement dans ce lot.

## Mouvement et actions

Anneau chartreuse unique, élévation de 9 px et apparition de l’objet réel : 460 ms pour l’objet, 720 ms pour l’anneau, aucun mouvement bouclé, aucune pluie de confettis. L’objet conserve le même dessin que la collection (poster, cadre, titre, emblème ou badge selon sa vraie nature).

« Continuer » ferme l’encart ; « Voir mes badges » ouvre `/badges` pour un badge seul ; « Voir la collection » ouvre `/arsenal` pour un objet ou un niveau. Les titres sont explicites : « Badge débloqué », « Objet débloqué » ou « Niveau N atteint ». Les deux actions sont présentes dès la première image et restent lisibles à largeur réduite. Le texte porte toute l’information. Préférence système Réduire les animations activée, inconnue ou indisponible : présentation immobile. Passage en arrière-plan : arrêt de l’animation et encart masqué ; retour : aucun rejeu du mouvement. Aucun moment n’est réclamé tant que l’écran n’est pas actif et focalisé. Le logger utilise l’événement existant `celebrationViewed`, surface `progress_moment_2026`, sans contenu privé.

Les plaques du récapitulatif (titre, fermeture, type de sortie) utilisent en outre le matériau commun `FrostedBackdrop2026`, ton sombre ; texte blanc au-dessus du matériau. La carte, les mesures et les rendus de partage ne sont pas modifiés.

## Validation locale

- 15 tests du ledger et de la préparation de session : référence initiale, collection vide, nouveauté groupée, restauration, lectures passives, décalage d’horloge, niveau monotone, cinq consommateurs concurrents, isolation des comptes, changement de compte pendant lecture/écriture, stockage défaillant, corruption, données invalides, provenance A → B → A, connexion invitée inerte et première sortie sans visite du profil.
- 25 tests connexes de l’identité saisonnière et du modèle historique de badges : aucun changement des droits acquis ou des conditions de badge.
- Typecheck mobile : réussi.
- Rendu SSR isolé du vrai `MomentScene` avec le vrai `RewardEmblem`, polices embarquées, aux largeurs320 et390 : cartes280 et350 px sans débordement, deux actions44 px, textes intégraux. Capture temporaire `/tmp/gryd-moment-preview.png` ; aucun écran de démonstration ni donnée fictive ajoutés à la production. Ce contrôle concerne le layout, pas le déroulement natif de l’animation.

Restent à observer sur appareil réel : rendu natif de l’animation, VoiceOver/TalkBack, bascule système de mouvement réduit et arrière-plan au milieu de l’animation. Les tests locaux ne remplacent pas cette recette visuelle. Aucun badge ni aucune activité réelle n’ont été créés pour simuler un succès.
