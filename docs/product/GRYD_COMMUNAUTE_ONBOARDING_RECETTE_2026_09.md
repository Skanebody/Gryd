# GRYD — onboarding, carte et communauté

Recette du 9 septembre 2026. Ce document décrit les modifications locales de ce lot, distinctes de la refonte déjà présente dans le dépôt. Trois lots experts ont travaillé sur la carte, la communauté et les objets graphiques ; l'intégration a porté sur le parcours de découverte, les matières et la recette navigateur. Aucun message, partage public, achat ou déploiement distant n'a été effectué.

## Découverte : quatre étapes, image d'origine conservée

1. **La ville est ton terrain.** La photo existante `apps/mobile/assets/onboarding/e01-crew.jpg` reste l'image d'accueil. Choix Course/Vélo conservé dès le tap, même si une lecture de préférence se termine ensuite. La photo n'a pas été régénérée ou remplacée.
2. **Trace. Ferme. Capture.** Schéma original d'une boucle fermée ; explication de la validation et de la reprise possible par un autre joueur. Illustration explicitement présentée comme un exemple, pas une capture attribuée.
3. **À plusieurs, le jeu change.** Photo existante `assets/auth/sign-in-crew.jpg`, sorties, conversation et défis 5 contre 5. Le jeu solo reste possible.
4. **Tout commence près de toi.** Demande de localisation facultative et explicite ; possibilité d'explorer sans autorisation. Un capteur sans réponse ne bloque pas la sortie du parcours.

**Accès :** `/onboarding` pour la première découverte. **Réglages → Revoir la découverte** ouvre `/onboarding?replay=1`. La relecture ne redemande pas la localisation, ne modifie pas la discipline et ne réinitialise pas le compte. Retour et fermeture restent disponibles. Une découverte inachevée peut reprendre à son étape enregistrée.

Si le stockage local est interdit, un message l'explique et un second geste permet de continuer pour la session. La garde de navigation reconnaît cette complétion volatile ; elle ne contourne ni l'authentification, ni les conditions d'âge, ni les consentements de sortie. Une réponse GPS tardive après départ de l'écran est ignorée.

## Échelle mobile et matière

- Carte : logo chartreuse sur noir, discipline par icônes accessibles, dock de départ compact ; option privée déplacée dans Couches.
- Navigation : trois destinations, icônes et libellés courts ; surfaces flottantes translucides. Titres et statistiques du Profil réduits, sans désactiver l'agrandissement système du texte.
- Le matériau est derrière le contenu : le flou ne réduit pas l'opacité des textes et icônes. Le contraste du verre sombre a été renforcé après contrôle sur fond clair.
- `expo-blur ~14.0.3` ajouté : module Expo SDK 52 pour le flou iOS demandé. Web : flou CSS ; Android : fond translucide stable. Le réglage iOS Réduire la transparence conserve une matière opaque. L'ajout du module exige une reconstruction du dev build iOS ; l'export JS ne valide pas son rendu sur un téléphone.

## Territoires et propriété

Chartreuse = mes terrains. Six nuances grises et une séparation noire/blanche distinguent les propriétaires adverses voisins. Les pointillés indiquent une affiliation crew actuelle et visible ; une limite complémentaire marque mon crew. Au tap, la fiche décrit le propriétaire autorisé, la surface et l'affiliation. Une affiliation masquée n'est jamais déclarée « solo » par supposition.

**La propriété reste individuelle.** Le serveur n'a pas de copropriété crew ni d'attribution historique de contribution crew ; ce lot ne fabrique pas ces informations. Le [contrat carte](GRYD_MAP_OWNERSHIP_2026_09.md) précise les replis d'un ancien serveur, les nuances et leurs limites, les contrôles de visibilité et le recentrage GPS.

## Communauté, entraide et partage

Le [benchmark officiel](GRYD_COMMUNAUTE_BENCHMARK_2026_09.md) examine Strava, INTVL et Clash of Clans, puis sépare les fonctions documentées des hypothèses à mesurer.

- **Conversation crew autonome** : écrire avant la première sortie, historique paginé, actualisation au premier plan, retrait, signalement et blocage. L'envoi est confirmé par le serveur ; brouillon conservé en cas d'échec. Pas de messages de démonstration en cas d'indisponibilité.
- **Contributions volontaires** : accueil des nouveaux, organisation de sorties, repérage de parcours. Chaque membre propose ou retire son aide, indépendamment de ses permissions administratives.
- **Encouragements** : action réelle depuis le crew, retour après confirmation. Membres, rôles, discussion, amis et invitations ont des entrées explicites.
- **Invitations** : code serveur, QR et partage existants conservés ; lien sélectionnable et collage d'un lien officiel dans Rejoindre.
- **Partage sportif** : résultat → Studio/aperçu de publication crew conservé. Pas de publication automatique ni de trace GPS injectée dans un message crew. L'ouverture du partage système n'est pas comptée comme une publication confirmée.

Les récompenses sportives restent liées à des résultats validés. Studio, analyses privées et éditions cosmétiques composent le catalogue payant existant. Aucun achat n'augmente les XP, ne transfère des kilomètres, ne protège un terrain ou ne donne une qualification sportive. L'entraide proposée est sociale et sportive, pas une monnaie supplémentaire.

## Badges et collections

Insignes GRYD originaux en SVG : métal neutre, émail noir/chartreuse, niveaux lisibles, détails de palier et états obtenu/verrouillé. Les exemples stock fournis servent de références de structure ; leurs images filigranées ne sont pas intégrées.

Les objets gardent leur sémantique : une affiche montre le vrai template Studio, un cadre montre un cadre, seuls les badges/emblèmes montrent un insigne. Aperçus compacts et grille deux colonnes ; le nombre de modèles d'une édition commerciale ne devient jamais un niveau sportif. Les contrôles d'achat, d'inventaire et de progression restent distincts du dessin.

## Validation et état de disponibilité

- Typecheck de tous les workspaces réussi.
- Suite mobile Deno : **2 353 tests réussis, aucun échec**, après les correctifs du catalogue et du rendu partagé des objets.
- SQL local PGlite : **11 contrôles** pour l'identité territoriale (0115), **10 contrôles** pour conversation/contributions (0116). La dernière revue indépendante a reproduit puis vérifié la correction d'une exposition de nom/handle privé dans le chat : la jointure respecte désormais le helper de visibilité et la politique RLS réels de 0113, avec pseudo public en repli. Matrice privé/soi/public/amis/crew/départ couverte. PGlite ne remplace pas une exécution PostGIS des prédicats spatiaux.
- Audit des migrations : 113 fichiers/versions, aucune collision. `git diff --check` réussi.
- Export Expo Web et iOS réussi. Il s'agit d'un bundle, pas d'une certification appareil.
- Chromium isolé, français, 320 × 640 et 390 × 844 : découverte complète, relecture, choix Vélo puis carte, changement de discipline, Couches, Profil, Crew ; aucun `pageerror` sur ces parcours. Stockage indisponible et capteur muet également vérifiés.
- Catalogue : **204 cartes rendues**, détail ouvert/fermé, filtre Secrets et deux colonnes distinctes à 320 px. Le défaut de correspondance de la famille `healthy` est corrigé ; un test parcourt toutes les définitions publiées et le repli d'une famille inconnue. Les objets sans niveau affichent une gravure/monogramme, aucun faux niveau « 01 ».
- Recette répétée sur le **bundle Web exporté**, servi temporairement sur `127.0.0.1:8282` : découverte, relecture, carte, Couches, Profil, Crew, Collection, Catalogue/détail et GRYD+ vérifiés. Aucun `pageerror` sur ces parcours ; aucun écran de repli d'erreur dans le catalogue. Les captures finales de ces écrans proviennent de cet export, sans outils de développement.

Captures de l'application : [`docs/design/review-2026/community`](../design/review-2026/community/). Elles montrent le mode invité, sans faux territoire, score ou conversation. Les scripts de capture étaient des outils temporaires de recette, distincts des tests du dépôt.

**Serveur :** les migrations `0115_refonte_2026_territory_owner_identity.sql` et `0116_refonte_2026_crew_conversation.sql` sont écrites et testées localement, non déployées. L'identité enrichie, la conversation et les contributions volontaires nécessitent leur application au backend. L'interface prévoit leur indisponibilité. La mise en production, les gestes/GPS/clavier sur appareil réel, la concurrence multi-connexions, le traitement humain des signalements et la conversion communautaire mesurée restent à valider.

L'étude ne permet pas d'affirmer une attractivité supérieure à INTVL. Les améliorations livrées créent des chemins plus directs ; leur effet doit être vérifié avec des utilisateurs et des cohortes, notamment première réponse, première sortie et retour J7/J28.
