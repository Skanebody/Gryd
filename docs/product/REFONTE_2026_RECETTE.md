# GRYD — réalisation et recette de septembre 2026

État du dépôt au 9 septembre 2026. Le [cahier intégral](GRYD_REFONTE_INTEGRALE_2026_09.md) et la [direction visuelle corrigée](GRYD_DIRECTION_VISUELLE_2026.md) restent les références actives.

**La refonte est implémentée dans le dépôt sur les parcours décrits ci-dessous. Elle n’est pas déclarée prête au lancement : aucun déploiement distant, achat réel ou test GPS sur appareil n’a été réalisé.** Les assertions géographiques PostGIS, la configuration réelle des saisons/arènes et la recette native restent nécessaires. Les limites fonctionnelles encore présentes sont explicitées, sans les remplacer par des données de démonstration.

## Dernière passe — translucide global

La demande la plus récente supprime les effets de verre sur **tous les écrans**, et remplace les mentions précédentes de flou/reflets communs ou de matière différente hors carte. [Audit global et preuve de rendu](../design/GRYD_TRANSLUCIDE_GLOBAL_2026_09.md).

Matériau partagé plat à alpha uniforme, sans blur, réfraction, reflet ou ombre de surface. Connexion/e-mail/callback, découverte, carte, Crew/Profil, réglages, résultats, reprise et contrôles des pages secondaires sont migrés. Les tailles et la disposition des commandes ne changent pas. Photographies et dessins de récompenses conservés ; préférence de réduction de transparence prise en charge par un fond opaque.

**Validation :** 37 passages navigateur sur 27 routes (390 px et dix parcours supplémentaires à 320 px), sans effet de verre visible, débordement ou erreur de page ; repli opaque vérifié par préférence émulée. 110 tests UI/navigation, typecheck des quatre workspaces et exports Expo web/iOS réussis. Aucun appareil natif, achat, création de compte ou enregistrement réel utilisé dans cette recette.

## Passe précédente — carte et accès au pouce

Les [sept nouvelles captures INTVL](../design/GRYD_MAP_POUCE_2026_09.md) ont été examinées individuellement. Cette demande remplace sur la carte les anciens effets de verre et le panneau de départ séparé.

- Menu bas unique : Carte, Crew, Profil et bouton Courir/Rouler ; Reprendre conserve l'accès à une séance réelle en cours. Le départ reste une action, pas un quatrième onglet.
- Course et Vélo en haut à droite, empilés ; Couches, préparation du parcours et recentrage en bas à droite. Cibles tactiles de 44 px ; départ de 48 px. Menu carte de 60 px, marge basse de 16 px plus safe area. Les autres destinations conservent leur menu de 54 px et sa marge de 22 px.
- Translucide uniforme, sans flou, reflet ou ombre de verre sur la carte ; préférence de réduction de transparence respectée. Autres écrans indépendants.
- Légende et filtres dans Couches. Fiche d'un terrain et états de refus/erreur dans une pile défilable de 200 px maximum à gauche, sans recouvrir le rail ni le menu. Les règles de propriété et de capture n'ont pas changé.

Validation : **49 tests ciblés carte/navigation/propriété/consentement réussis**, typecheck des quatre workspaces et exports Expo web/iOS réussis. [Recette navigateur sur localhost:8081](../design/review-2026/map-thumb/qa.json) à 320×640 et 390×844 : sports verticaux, une seule barre, trois destinations, départ intégré, navigation aller-retour, couches, cibles ≥44 px, absence de collision ou débordement et aucun flou/reflet calculé. Refus GPS injecté dans le navigateur de test, sans coordonnées ni requête de position avant geste. Aucune erreur de page ni envoi d'authentification. [Carte 320](../design/review-2026/map-thumb/carte-320.png) · [Carte 390](../design/review-2026/map-thumb/carte-390.png).

Recherche réelle de Paris et retour à la carte contrôlés ; les accès au planificateur et au départ transmettent bien `activity=bike` après sélection du vélo ([preuve de navigation](../design/review-2026/map-thumb/routes-qa.json), [carte de Paris](../design/review-2026/map-thumb/paris-390.png)). Le refus de localisation du test empêche tout enregistrement sportif.

Les exports ne remplacent pas une recette sur téléphone : safe areas natives, grands caractères et reprise après arrêt du processus restent à vérifier sur appareil. Aucun enregistrement sportif, compte, achat ou changement serveur n'a été effectué.

## Passe précédente — entrée directe, connexion et communauté

Cette passe du 9 septembre remplace les mentions historiques ci-dessous d’un onboarding obligatoire, d’une navigation toujours nommée et d’une légende permanente. [Décisions et motion](GRYD_EXPERIENCE_SANS_FRICTION_2026_09.md) · [benchmark à jour](GRYD_BENCHMARK_COMMUNAUTE_2026_09.md) · [authentification](GRYD_AUTH_2026_IMPLEMENTATION.md) · [découverte facultative](GRYD_ONBOARDING_OPTIONNEL_2026_09.md).

- Entrée directe sur la carte depuis la photo originale, petit G chartreuse, tutoriel interactif facultatif. Aucune question Course/Vélo, aucun compte ni GPS exigé pour explorer.
- Connexion/e-mail/retour modernisés ; continuation invitée et rattachement ultérieur explicite ; ancienne chaîne de setup supprimée comme barrage. Callbacks natifs à chaud, retours tardifs et double consommation PKCE corrigés.
- Carte : départ, recentrage et lieu prioritaires ; états secondaires dans Couches ; légende seulement si des terrains sont affichés. Navigation à trois icônes accessibles, sélection animée, cibles fixes de 44 px.
- Crew : prochain rendez-vous réel avant la conversation, RSVP serveur direct, export `.ics` d’une inscription relue, filtres de contributions des membres. Changement de crew et navigation invalident les réponses périmées.
- Matière translucide commune, recadrage de la photo du Profil, 19 icônes distinctes dans les réglages, nouvelle icône 5v5, moments de niveau/badge/objet confirmés serveur et réduction du mouvement respectée.
- Migration **0128** : le nom privé de l’organisateur n’est plus exposé par la RPC des rendez-vous ; pseudo public utilisé lorsque le profil n’est pas visible. **Correctif non déployé**.

Validation finale du code : **2 385 tests mobiles réussis**, **13 tests SQL sociaux réussis** (dont régression de visibilité reproduite sans 0128), typecheck des quatre workspaces et exports Expo web/iOS réussis. Ces nombres n’additionnent pas les sous-suites d’agents aux suites complètes. La recette navigateur finale est consignée dans [la note d’expérience](GRYD_EXPERIENCE_SANS_FRICTION_2026_09.md).

L’e-mail reste actuellement un **lien réel** : le code OTP est implémenté mais exige la configuration conjointe des templates Supabase `confirmation` et `magic_link` et du build. Les identifiants Google sont absents. Aucun accès d’administration Supabase n’est disponible sur ce poste ; aucun paramètre distant, achat, envoi d’e-mail ou compte réel n’a été créé. Le serveur, les retours OAuth/e-mail de bout en bout et les appareils natifs restent à recetter.

## Passe suivante — intégration après comparaison INTVL

[État détaillé et captures des modifications](GRYD_INTEGRATION_INTVL_2026_09.md). Les preuves des sections suivantes décrivent les passes précédentes ; cette passe ajoute :

- Carte : rôles **Moi / Crew / Autres** calculés serveur, légende permanente, appartenance réelle, détail initial/restant, choix de partage commun Carte/Prévol. Le crew regroupe des possessions individuelles.
- Navigation : trois destinations toujours nommées, cibles tactiles de 44 points. Photographies d’origine running/cyclisme réutilisées à l’entrée, à l’authentification et dans Crew.
- Social : identité synchronisée par compte, photos privées, publications volontaires avec audience liée au crew annoncé, réactions/commentaires, signalement/blocage effectif sur profils, carte et défis. Rendez-vous : liste, inscription/retrait, édition versionnée et annulation.
- Sources : GPS GRYD, import GPX privé Course/Vélo, ruptures de segments conservées et statut téléphone explicite sur le Web.
- Studio : douze catégories saisonnières reliées à leur rendu exact ; trois collections permanentes Contour/Relief/Clubhouse, prix et possession issus des services réels, usage revérifié avant remise du fichier. Aperçu direct des six modèles GRYD+.

**Validation de cette passe : 2 322 tests mobiles, 1 495 tests Edge, 179 tests packages, sans échec ; 38 fichiers SQL PGlite réussis, puis revalidation des 11 scénarios sociaux après la revue croisée.** Typecheck de tous les workspaces, exports des bundles web et iOS et contrôle du diff réussis. Les derniers ajustements de copie ont leur suite ciblée verte. Les exports de bundles ne constituent pas une recette d’application native installée.

Recette visuelle : profils à 320×639 et 390×844 points CSS réels, menu nommé sans débordement horizontal ; Crew, carte, panneau Couches, Sources et aperçus GRYD+ contrôlés dans le navigateur. L’état invité ne contient aucune activité factice. Les planches isolées de modèles utilisent des fixtures QA explicitement étiquetées.

**Aucun déploiement distant.** Migrations 0123–0125 préparées ; PostGIS, GPS terrain, Storage HTTP, achats Store, partage natif et notifications collectives restent à valider ou compléter selon leur périmètre. [Territoires](../qa/GRYD_TERRITORY_2026_0123_VALIDATION.md) · [Social](GRYD_SOCIAL_2026_API.md) · [Objets et ventes](GRYD_OBJECT_EXPORT_2026_IMPLEMENTATION.md).

## Direction visuelle et comparaison

Les sept galeries du fondateur ont été examinées image par image : 23 images fixes, ainsi que la vignette et plusieurs états animés de Fitify. [Audit détaillé](../design/GRYD_REFERENCE_IMAGE_AUDIT_2026.md), [planche comparative](../design/GRYD_COMPARAISON_2026.png).

Noir, blanc, gris neutres et chartreuse #B4FF0D ; marque elliptique authentique ; icônes et huit familles d’emblèmes propres au projet ; photographie originale. Aucune image des références n’est embarquée dans l’application. Les médias de référence du rapport restent des supports d’étude.

La correction de densité réduit les blocs et la graisse, sans diminuer uniformément la taille du texte. Profil : état vide mesuré de 224 à 135 points de haut. Saison : récompense en ligne mesurée à 97 points, détails des XP repliables, étapes compactes sans répétition de la récompense principale. Les en-têtes, sections, liens et boutons partagent les proportions corrigées.

## Dernière passe : composition UI reconstruite

Cette passe remplace les proportions incrémentales décrites ci-dessus : carte plein écran sans défilement forcé, navigation flottante 54 points, départ compact, journal ouvert, Crew recadré, timeline de saison, inventaire, GRYD+, statistiques et comparaison, préparation/suivi/résultat/Studio, recherche, réglages et planificateur harmonisés. Les icônes course/vélo/carte/recentrage et les objets SVG ont été redessinés.

Typecheck de tous les workspaces réussi. Premier lot de non-régression UI : 142 tests existants réussis (nav, recherche, carte, propriétaire, handoff, partage, identité et adoption) ; les suites d’agents de 113, 97, 63 et 61 sont des sous-ensembles avec recoupements, pas un total à additionner. Aucun test GPS terrain ni achat n’est déduit de cette revue visuelle.

Les objets métalliques sont des dessins originaux de l’interface ; leurs états obtenus/verrouillés et leurs libellés viennent toujours du registre réel. Aucune activité ou possession n’a été injectée pour produire les captures.

Résultat final : **2 290 tests mobiles réussis, 0 échec** ; typecheck de tous les workspaces et contrôle des espaces du diff réussis. Dernier typecheck mobile après harmonisation des interrupteurs et ordre de chargement de la caméra réussi. La recherche manuelle a été rejouée après chargement du sport mémorisé : Paris reste cadré à l’échelle des rues au lieu de revenir à la vue générale.

[Captures finales de Carte, Profil et Crew](../design/GRYD_UI_RECOMPOSEE_2026.png), 320 × 640, prises dans le navigateur de l’application. Profil, Crew, Saison, Collection, GRYD+ et planificateur ont aussi été examinés à une largeur de 390 points ; les outils flottants ont été contrôlés dans l’aperçu étroit. Course/Vélo, panneau Couches et sélection d’une ville ont été actionnés. Aucun enregistrement sportif ou achat n’a été déclenché par cette recette visuelle. Les validations natives et de production ci-dessous restent nécessaires.

## Parcours livrés dans le code

| Domaine | Ce qui fonctionne dans l’implémentation | Limites de validation ou de portée |
|---|---|---|
| Carte et navigation | Carte · Crew · Profil ; Course/Vélo ; lieu, départ, couches et lecture de possession par emprise ; états vides explicites. | Lecture territoriale exige les migrations et fonctions correspondantes. Aucun test de charge 200k ni sortie GPS terrain. |
| Capture | Boucles polygonales, ruptures de segments, intersections, discipline, capture autoritaire, gain net distinct de la surface parcourue. | Migration0118 et assertions géographiques non exécutées dans PostGIS sur ce poste. Recomposition de référence par discipline, pas une architecture de charge certifiée. |
| Sortie et journal | Enregistrement conservé au-dessus de la navigation, pause/fin, archive locale, file persistante, fusion dédupliquée et statuts de synchronisation. | GPS arrière-plan, permission retirée, téléphone verrouillé et reprise après arrêt OS à recetter sur iOS/Android. Historique serveur chargé limité aux 200 dernières sorties. |
| Adoption des activités invitées | Rattachement explicite au compte avec consentement ; propriétaire persisté avant mise en file ; reprise, déduplication et confidentialité conservées. | Une activité sans données d’ingestion suffisantes reste locale ; aucun GPS ou droit territorial n’est inventé. Recette après installation/connexion sur appareil à compléter. |
| Résultat et partage | Résultat fondé sur archive ou vrai relevé de fin ; aucun résultat créé depuis les seules valeurs d’URL ; données de résultat, trace et partage rattachées au propriétaire. Vérification du compte avant remise au système. | Vérification native des fichiers, destinations et interruptions nécessaire. |
| Progression | Registre 2026 séparé, journées actives, plafond hebdomadaire partagé Course/Vélo, recalcul idempotent et lecture via progression_2026. Fuseau et changement différé pris en charge. | Aucun ancien total XP converti silencieusement. Politique de migration historique à arrêter et valider. |
| Saisons | Calendrier serveur, collection unique, choix différé, archive/reprise, douze paliers, six variantes premium, propriété permanente et équipement de cadre/titre/emblème dans le profil. | Aucun calendrier de production inventé. Sans calendrier publié, saison absente ; l’XP de carrière continue. |
| Crew et défis | Services existants de crew, invitation et prochain rendez-vous ; route Défis 5v5 avec arènes réelles, accord volontaire, équipes figées, préférences de secteur, scores publiés, retrait et gestion selon rôle. | Aucun seed d’arène réelle. Matchmaking automatique/miroir et calibration physique de l’accessibilité ne sont pas livrés. Chronologie et publication réelle à recetter avec comptes et arènes configurés. |
| GRYD+ | Comparaison privée de deux sorties ou périodes ; compositions Index/Contour/Tempo/Édito ; variantes saisonnières ; offres mensuelles/annuelles issues du Store, achat, restauration et gestion. Droit propriétaire vérifié côté client et serveur. | Configuration Store/RevenueCat et transactions sandbox/réelles non testées ici. Aucun nouveau produit à vie vendu ; anciens droits conservés. |
| Studio image | Trace, Photo, Sticker ; formats Story/portrait/carré ; quatre compositions originales ; même filtrage de confidentialité ; choix de photo système ; aperçu accessible et export premium conditionné au droit réel. | Export image natif à recetter. Le web remet un résumé textuel et l’indique. Les douze catégories saisonnières et les collections permanentes ont leurs compositions. Les récapitulatifs restent sur une seule activité ; bilans multi-activités, avant/après territorial et invitations spécialisés restent à compléter. |
| Replay | Encodeurs Swift et Kotlin locaux, vidéo 2D de 8 secondes sans son, formats Story/portrait/carré, annulation/nettoyage et détection de compatibilité. | Encodeur Swift vérifié sur macOS ; wrapper Expo iOS et encodeur Android non exécutés dans un build appareil. Disponible uniquement dans un build natif contenant le module et un codec compatible. |
| Sources et réglages | GPS GRYD, import GPX privé Course/Vélo, confidentialité, compte, notifications, aide et gestion d’abonnement. | Les connexions automatiques Santé/montres ne sont pas livrées. Import GPX réservé au téléphone dans cet aperçu. |

Contrats détaillés : [progression et saisons](GRYD_PROGRESSION_2026_API.md), [GRYD+](GRYD_PLUS_2026_IMPLEMENTATION.md), [défis](GRYD_DEFIS_2026_API.md), [Replay natif](../../apps/mobile/src/features/share/film/README.md).

## Serveur : ordre de livraison et limites

Les migrations 0118–0125 et les fonctions associées forment un ensemble. Appliquer 0123 pour la lecture territoriale, 0124 pour le social et les rendez-vous, 0125 avant les fonctions RevenueCat mises à jour. Le nouvel ingest appelle **stage_game_activity_2026** défini dans 0122 : ne pas déployer ce point d’entrée avant les migrations requises. Les copies partagées sont générées par scripts/sync-game-rules.mjs.

Les harnais PGlite exécutent du vrai SQL PostgreSQL/WASM avec les rôles et fixtures nécessaires. Ils valident notamment les règles de calendrier, d’accès, de consentement et de score. Ils **n’exécutent pas PostGIS**. Le harnais géographique refuse les bases distantes et retourne explicitement un état non exécuté quand aucune base locale PostGIS n’est disponible. Ce poste ne possède pas cette base ; les assertions spatiales ne sont pas présentées comme réussies.

Aucun calendrier saisonnier, territoire public, participant ou match de production n’a été créé pour embellir les écrans. Aucune base distante n’a été modifiée.

## Preuves exécutées

- Typecheck de tous les workspaces : réussi après les modifications de densité et de structure.
- Fonctions Deno : 1 486 tests réussis, 0 échec, après intégration des défis.
- Packages partagés/moteur : 179 tests réussis, 0 échec.
- Défis SQL : 26 scénarios réussis ; suite SQL globale 35 fichiers réussis ; audit 108 versions sans collision.
- Saisons SQL : 19 scénarios réussis ; droits premium SQL : 9 scénarios réussis. Sous-ensembles de la couverture SQL, pas à additionner aveuglément.
- Suite mobile complète finale : **2 290 tests réussis, 0 échec**, après les protections de propriétaire et de récupération des anciens buffers. Les 72 tests Crew/saison/adoption/file et les tests de partage en sont des sous-ensembles.
- Replay : trois véritables MP4 H.264, 1080×1920, 1080×1350 et1080×1080 ; 8 secondes, 240 images décodées, 0 piste audio, 0 métadonnée d’asset ; annulation et suppression du temporaire vérifiées avec le moteur Swift sur macOS. Ce résultat ne vaut pas recette du wrapper iOS ou d’Android.
- Navigateur : proportions contrôlées dans un viewport CSS réel 390×844 ; mesures DOM du bloc de Saison et de l’état vide du profil ; ouverture des règles vérifiée. Absence de débordement horizontal à 320 points sur Saison, Profil, Crew, GRYD+ et Collection. Les PNG CUA de comparaison montrent les 702 premiers points ; ils ne prétendent pas être des captures complètes de 844 points.

Les scénarios invités n’utilisent aucune activité factice, aucune position réelle ni aucun achat. La recette native d’accessibilité, d’extérieur et de batterie n’est pas exécutée.

## Ce qui reste avant ouverture au public

1. Exécuter le harnais géographique sur une base PostGIS locale et corriger toute divergence avant déploiement.
2. Configurer le calendrier réel, les arènes validées et les publications planifiées ; recetter les défis multi-comptes et le partage volontaire.
3. Recetter sur appareils les sorties GPS, reprises, sources, export PNG/MP4, texte agrandi, VoiceOver/TalkBack et les transactions Store.
4. Compléter les supports de partage spécialisés, le matchmaking et les intégrations encore absents du périmètre livré ; définir la migration des anciens XP et achats incompatibles sans supprimer les droits existants.
5. Mesurer la charge, le rejeu spatial, la confidentialité des liens/médias hébergés et les critères d’acceptation du cahier. Aucune capacité 200k ou conformité des 45 scénarios n’est déduite des tests unitaires.
