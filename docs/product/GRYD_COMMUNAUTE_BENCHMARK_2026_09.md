# GRYD — communauté, coopération et partage

Audit du 9 septembre 2026. Sources officielles consultées ce jour et code local inspecté. Les fonctionnalités décrites par les éditeurs ne prouvent ni leur efficacité causale ni leur disponibilité pour chaque compte. Aucune donnée de production GRYD, aucun message réel et aucune publication externe n’ont été utilisés pour cette étude.

## Ce que les références attestent

### Strava : un rendez-vous, une activité, puis une conversation

Strava documente des clubs ouverts ou soumis à invitation, des propriétaires et administrateurs, des demandes d’adhésion et un fil d’activités. Les administrateurs peuvent approuver les membres et gérer le club. [Clubs on Strava](https://support.strava.com/en-us/articles/15402172-clubs-on-strava)

Les publications de club peuvent accueillir activités, événements, itinéraires et photos. Le propriétaire du contenu conserve ses règles de confidentialité ; partager un lien ne les remplace pas. Des permissions peuvent réserver la publication aux administrateurs. [Club Posts](https://support.strava.com/en-us/articles/15401655-club-posts)

Le centre d’aide décrit maintenant **Club Messages** : conversation en temps réel organisée en canaux, annonces, réponses, réactions et sondages. Les canaux sont ouverts aux membres du club, avec choix des personnes pouvant publier. Les moins de 18 ans n’y ont pas accès selon cette documentation. GRYD ne doit donc pas considérer « un chat de club » comme une différenciation inexistante chez Strava. [Club Messages](https://support.strava.com/en-us/articles/15401541-club-messages)

Le partage d’activité peut ouvrir Instagram, WhatsApp et les applications compatibles, avec image de carte ou photo et statistiques selon l’activité admissible. [Sharing Your Strava Activities](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities)

### INTVL : une compétition territoriale déjà sociale

Le site officiel distingue les compétitions Course et Vélo. Il présente capture par boucle, duels locaux, jeu individuel, lobbies privés entre amis, contribution au club et partage de progression. Il propose aussi un abonnement optionnel ; son multiplicateur annoncé concerne les participations aux concours de prix, ce qui ne constitue pas une preuve de territoire acheté. Le site ne documente pas suffisamment la hiérarchie des rôles, un chat de club ou des dons entre membres : **non vérifiés dans les sources consultées**, pas déclarés absents. Les chiffres d’audience affichés sont des déclarations commerciales de l’éditeur, non repris comme preuve d’efficacité. [Présentation officielle INTVL](https://www.intvl.com.au/)

### Clash of Clans : responsabilité, entraide et objectif commun

Supercell décrit quatre rangs — membre, aîné, co-chef, chef — associés à des permissions distinctes. Le chef peut transmettre la direction. Le chat permet de mentionner le clan, ses responsables ou une personne. [Clan Roles](https://support.supercell.com/clash-of-clans/en/articles/clan-roles-3.html)

Les dons de troupes et de sorts répondent à des demandes et restent soumis à une capacité et à des limites de niveau. Il s’agit d’un transfert d’aide utile dans l’économie propre à Clash of Clans, pas d’un mécanisme directement transposable à une performance physique. [Clan Castle Troops & Spells](https://support.supercell.com/clash-of-clans/en/articles/clan-castle-troops-and-spells-2.html)

Dans les Jeux de clan, les défis accomplis rapportent des points au collectif, débloquant des paliers communs ; une participation minimale conditionne l’accès aux récompenses. [Défis et points](https://support.supercell.com/clash-of-clans/en/articles/clan-games-challenges-and-points.html), [Récompenses](https://support.supercell.com/clash-of-clans/en/articles/clan-games-rewards.html)

## Traduction GRYD : ce que nous retenons

| Besoin | Décision GRYD | Limite explicite |
|---|---|---|
| Se retrouver avant la première sortie | Une conversation entre membres accessible depuis Crew | Pas de messagerie mondiale ni de notification prétendue reçue |
| Aider sans être le plus rapide | Encourager une sortie, proposer un rendez-vous, participer à un défi volontaire | Aucun don de km, d’XP, de possession ou de protection |
| Répartir les responsabilités | Montrer le rôle réellement attribué et conserver les actions d’administration serveur | Un rôle n’est ni un record sportif ni un achat |
| Jouer seul et ensemble | Carte individuelle, crew et matchs 5 contre 5 déjà présents | Pas de classement nouveau calculé côté client |
| Inviter facilement | QR, code lisible, lien copiable et feuille système existants | Ouverture de la feuille ≠ publication ou adhésion confirmée |
| Faire circuler une sortie | Résultat → Studio ou aperçu de publication crew | Le tracé GPS n’entre pas dans le fil crew ; aucune publication automatique |
| Modérer | Retrait de ses messages, retrait par direction, signalement persistant, blocage existant | Enregistrer un signalement ne prouve pas un traitement humain effectué |

**Hypothèses, à tester :** une conversation accessible sans activité préalable peut faciliter l’accueil ; des encouragements effectués en un tap peuvent faciliter la réciprocité ; rendre les responsabilités visibles peut aider un nouveau membre à savoir à qui s’adresser. Ces phrases sont des intentions produit, pas des résultats mesurés. Copier davantage de mécanismes ne garantit ni rétention ni viralité.

## Écart entre dépôt et livraison de ce lot

| Fonction | État constaté avant ce lot | Ajout ou correction locale |
|---|---|---|
| Invitation | Code serveur, QR et partage présents ; arrivée par lien déjà routée | Accès nommé depuis le crew, lien sélectionnable et collage direct du lien officiel dans Rejoindre ; les URL étrangères sont refusées et le résultat réel du partage est conservé |
| Discussion de groupe | Annonces de direction et commentaires attachés aux sorties ; pas de conversation autonome | Route `/crew-conversation`, lecture paginée/envoi, retrait, signalement ; migration `0127_refonte_2026_crew_conversation.sql` |
| Encouragements | RPC idempotente présente ; dans CrewHome, le bouton ouvrait seulement le détail | Envoi réel de la réaction choisie, relecture après confirmation et erreur visible |
| Rôles | Matrice et RPC d’administration `0093`, feuille d’actions membres | Affichage du rôle serveur sur chaque membre ; aucun rôle dérivé de mesures inventées |
| Contributions volontaires | Pas de rôle de disponibilité distinct de la hiérarchie | Accueil, organisation de sorties et repérage de parcours ; auto-attribution serveur révocable, sans modification du rôle administratif |
| Découverte et follow | Recherche de personnes, profil membre, abonnements, amitiés et découverte de crew déjà présents | Entrées explicites vers amis et découverte, sans réimplémenter les graphes |
| Partage après activité | `RunResult.tsx` ouvre Studio et `SocialPublicationAction2026` ouvre un aperçu volontaire | Conservation du parcours ; ajout d’accès au crew/conversation depuis les surfaces sociales |
| Publications | Cartes sociales sombres réutilisées au milieu du crew clair | Variante claire, états ARIA explicites et actions compactes ; défaut sombre compatible |
| Don d’avantage territorial | Non conforme au cahier GRYD | Non ajouté ; entraide sociale sans modification du sport ou de la possession |

## Contrat de la conversation livrée

- Messages textuels entre membres actifs du même crew ; pages de 60 messages accessibles, curseur composé date + identifiant, accès aux messages plus anciens et retour aux derniers échanges. Les nouveaux messages se lisent d’abord et le champ de saisie reste avant l’historique.
- Actualisation à l’ouverture, manuelle et toutes les 15 secondes **uniquement quand l’écran est au premier plan**. Ce n’est pas du streaming WebSocket et il n’y a pas de notification push dans ce lot.
- Aucun accès sans compte ou après départ du crew, même pour les anciens messages dont on est l’auteur. L’audience attendue est revérifiée à l’envoi ; un brouillon ne peut pas basculer silencieusement vers un autre crew.
- RLS sur les deux tables ; aucune écriture de table accordée au client ; fonctions serveur pour écrire. ID de requête idempotent, limites de longueur et anti-spam, contrôle de modération existant, suppression logique.
- Auteur et direction existante peuvent retirer ; les signalements sont persistants et masquent le message pour leur auteur. Les blocages bilatéraux existants s’appliquent également aux lectures.
- Le nom affiché et le handle respectent la même visibilité que la lecture directe du profil (privé, amis, crew, public). Si le profil est masqué, la discussion utilise uniquement le pseudo public du compte. Le test SQL exécute le helper et la politique réels de la migration sociale, y compris après départ de l’auteur du crew.
- Brouillon préservé quand un envoi ne peut pas être confirmé. Aucune bulle locale présentée comme déjà envoyée.
- Les règles numériques du chat sont des bornes techniques de communication, sans effet de jeu, d’XP, de monnaie ou de capture.

**Déploiement :** migration écrite et testée localement, **non déployée** par ce lot. Sur un serveur ne la connaissant pas, l’écran indique une indisponibilité ; il n’affiche pas de messages de démonstration. Les bases de test utilisent des identités fictives locales. Aucun message, invitation ou partage n’a été envoyé à une personne réelle.

## Mesurer avant d’annoncer un succès

Conserver les événements existants `inviteSent`, `crewJoined`, `shareChannelTapped`, `shareExported` et `shareCompleted` selon leur sémantique réelle. Ne pas interpréter une copie ou une remise au partage système comme un recrutement confirmé. Les nouveaux écrans restent instrumentés par le logger `screen` existant.

Pour un pilote, mesurer les étapes séparément : entrée dans l’invitation → copie/ouverture système → ouverture du lien → adhésion serveur → première activité validée ; résultat → ouverture Studio → export → arrivée attribuable. Les deux dernières conversions nécessitent une attribution de lien et un dénominateur fiables ; elles ne sont pas annoncées disponibles par ce seul lot.

Sur la communauté, comparer des cohortes de nouveaux membres : conversation lue, premier message, première réponse provenant d’une autre personne, première sortie, retour à J7/J28. Analyser aussi les abandons, blocages, signalements et notifications désactivées. Ne jamais enregistrer le texte des messages ou les traces GPS dans les événements analytiques. Un test progressif avec groupe de comparaison est préférable à conclure sur une simple hausse après lancement.

## Reste à valider

Déploiement Supabase et vérification de ses grants, fonctionnement sur appareils réels, clavier et défilement d’une longue conversation, charge et concurrence multi-connexions, procédure humaine de modération, politique d’âge et notifications, installation et universal links des domaines de production, puis conversion mesurée. Canaux multiples, réponses liées, pièces jointes de chat, recherche textuelle historique et objectifs coopératifs à récompenses nouvelles restent hors de ce lot ; ils demandent des règles et validations supplémentaires.

## Rôles, capacités, soutien et boutique : décision complète

**Rôle administratif :** le serveur conserve la matrice existante et les procédures de promotion, exclusion et transfert. **Contribution volontaire :** un membre peut proposer, pour lui-même, l’accueil des nouveaux, l’organisation de sorties ou le repérage de parcours publics ; il peut retirer ce choix. Cette colonne est indépendante de `crew_members.role`. Les tests vérifient qu’elle ne transforme jamais un membre en responsable et qu’un autre crew ne peut pas la consulter ou la modifier. Aucun rôle de meneur d’allure, entraîneur ou secouriste n’est certifié par cette autodéclaration.

**Capacités issues des performances :** les niveaux, journées actives et récompenses sportives existants restent dérivés des écritures validées. Aucune vitesse, ancienneté, autonomie ou capacité d’encadrement n’est inventée à partir d’un badge. Ce lot n’ajoute pas de pouvoir de capture en récompense d’un message ou d’un rôle volontaire.

**Soutien et dons :** GRYD permet d’aider par un encouragement réel, une réponse, une sortie organisée, l’accueil ou une contribution physique aux matchs existants. Le transfert de territoire, de km, d’XP ou de protection n’est pas ajouté : donner sa performance à un autre membre brouillerait l’autorité sportive. Une future coopération à objectifs cumulés et récompenses cosmétiques demanderait un cahier distinct (périmètre, plafonds, fraude, attribution, sortie du crew) ; ce n’est pas annoncé comme livré.

**Compétition :** la possession individuelle et les défis volontaires 5 contre 5 existent ; la carte, l’attribution des territoires et leurs résultats restent du ressort serveur. Le chat et les rôles volontaires sont utilisables sans accepter un match. Aucun classement solo ou collectif ne découle du volume de messages.

**Payant et boutique :** les produits déjà définis concernent Studio, analyses privées et éditions cosmétiques ; ce lot conserve leurs contrôles de droits. Les fonctions de conversation, encouragement, invitation et contribution volontaire ne sont pas réservées à GRYD+. Un objet acheté reste cosmétique et distinct d’un mérite obtenu par activité réelle. Aucune vente d’outil ne peut valider une capture, gonfler le résultat sportif, acheter une protection ou attribuer une qualification. Les nouveaux paliers, trophées et modèles de boutique sont traités séparément dans le lot Collection, pas présentés ici comme déployés.
