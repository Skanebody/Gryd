# GRYD — Direction visuelle, septembre 2026

Recherche du 9 septembre 2026. Ce document traduit la demande de modernisation visuelle noir, blanc et chartreuse. Il complète le cahier produit de septembre ; il ne change ni les règles de capture, ni la progression, ni la confidentialité.

## Décision de direction

GRYD doit se reconnaître par une trace précise, une donnée facile à lire et une marque dessinée. La carte ou la photographie occupe la place principale ; les contrôles s’organisent autour. Le noir apporte le contraste, le blanc apporte de l’espace, le chartreuse `#B4FF0D` signale une action ou la trace personnelle.

La qualité observée chez Rondesignlab vient surtout de la composition : rapports de taille assumés, alignements constants, grande place donnée au sujet, peu de mots et continuité entre interface, marque et affiches. Ces principes servent de référence. Les logos, écrans, photographies et données des projets étudiés ne sont pas repris dans GRYD.

## Complément prioritaire : les sept références du fondateur

Les sept pages envoyées ont été ouvertes dans le navigateur, leurs galeries parcourues et leurs images agrandies le 9 septembre. Les compositions verticales ont été examinées en plusieurs vues. Cette lecture porte sur les images visibles, sans reprendre les arguments commerciaux ni présenter des concepts plus anciens comme des produits sortis en 2026.

| Référence | Motifs observés dans les images | Traduction retenue |
|---|---|---|
| [Activity Tracking — Running Apps](https://dribbble.com/shots/20267075-Activity-Tracking-Running-Apps) | Deux vues, dont le téléphone tenu en main : fond presque noir, calendrier compact, petites mesures superposées au trajet, départ visible. | Calendrier du journal, continuité sombre, commandes courtes. Aucun écran AR inventé. |
| [Fitness App — Running Tracker / RonDesignLab](https://dribbble.com/shots/15872573-Fitness-App-Running-Tracker) | Cinq planches : carte sombre, suivi, photographie, statistiques et palette. La scène sportive conserve l’essentiel de la surface. | Carte dominante et typographie compacte. Les transparences sont retenues seulement là où le contraste reste suffisant. |
| [Run Boost — Running App Concept](https://dribbble.com/shots/27145716-Run-Boost-Running-App-Concept) | Photographie documentaire, interface sombre continue, petits titres, calendrier en pilules, véritable trace centrale, mesures groupées. | Photo originale d’accueil ; journal sobre ; gris de surface légèrement distincts du fond ; chartreuse localisé. |
| [Modern Fitness App UI](https://dribbble.com/shots/26795688-Modern-Fitness-App-UI) | Deux images : surfaces grises légères, en-têtes petits, mesures plus grandes, navigation compacte. | Navigation à trois destinations, indicateur actif court, rythme de 20 points dans les marges. |
| [Running Tracker Fitness Mobile App UI](https://dribbble.com/shots/27226367-Running-Tracker-Fitness-Mobile-App-UI) | Accueil photo, suivi et fil : graisse modérée, espace libre, statistiques limitées. | Pas de masthead surdimensionné ; priorité à la pratique, aux personnes et à la donnée disponible. |
| [Fitify — Onboarding / Glacio](https://dribbble.com/shots/26844556-Fitify-Fitness-App-Onboarding-3D-UI-Animation-Glacio) | Affiche, aperçu vidéo et écran agrandi : grands chiffres fins, arcs précis, contrôles arrondis, matière sombre. | Inter Tight 400/500 pour les mesures et les affiches. Aucun anneau décoratif sans valeur à représenter. |
| [Fitify — Report Screen](https://dribbble.com/shots/26866164-Fitify-Fitness-App-Report-Screen-Gym-App-UI-UX-Design) | Trois planches : jauge fine, barres et petits libellés, chiffres dominants. | Donnée principale isolée, séparateurs fins, titres réduits. Les textes hors contexte des maquettes ne sont pas recopiés. |

Le point commun est une hiérarchie stable : **la scène ou la mesure en premier, les commandes ensuite, les détails à la demande**. La comparaison normalisée précise que les titres ne sont pas systématiquement plus petits : la différence tient aussi à la graisse, à la hauteur des blocs et à la quantité de texte explicatif. Le relevé des 23 images et les écarts mesurés figurent dans [l’audit image par image](../design/GRYD_REFERENCE_IMAGE_AUDIT_2026.md). Le modernisme vient du contraste, du cadrage, de la typographie et de la précision des objets ; il ne nécessite pas de collection de cartes décoratives.

### Système effectivement construit

- Noir continu `#0A0A0A`, surfaces `#171717` / `#292929`, blanc et gris neutres. Accent authentique `#B4FF0D` repris du fichier de marque fourni. Les captures fournies présentent une conversion de profil colorimétrique ; elles ne remplacent pas la couleur du fichier source.
- Logo elliptique et espacement du mot GRYD fidèles aux images fournies. Symboles propres : coureur en mouvement, vélo simplifié, carte en parcelles et cible de recentrage. Une grille vectorielle de 24 unités rassemble les icônes.
- Huit objets ouverts, dessinés à partir de traces, boucles et reliefs. Rubans vectoriels blancs et gris avec matière métallique ; aucun rectangle de badge ni numéro dominant. Les intitulés et conditions restent en texte hors du dessin. Une planche d’aperçu ne vaut pas acquisition.
- Quatre compositions GRYD+ réellement différentes : **Index, Contour, Tempo, Édito**. Elles partagent les faits de sortie et le filtrage de confidentialité, avec des dispositions propres. L’aperçu est libre ; l’export demande un droit actif. Les objets saisonniers déjà acquis restent permanents.
- Replay 2D gratuit de huit secondes, silencieux, en Story / portrait / carré. Le module ne reçoit que des pixels après protection des coordonnées. Un contrôle de compatibilité distingue navigateur, ancienne version native et codec absent.

La [planche graphique](../design/GRYD_GRAPHIC_SYSTEM_2026.png) est générée depuis les composants réels. La [provenance de la photographie](../design/GRYD_EDITORIAL_PHOTO_2026.md) contient le prompt de création et le chemin de l’asset original. Aucun média de Dribbble n’est embarqué dans GRYD.

## Recomposition demandée après la première correction

La première correction de densité conservait trop de la structure précédente. La passe suivante remplace la composition, et devient la référence d’interface :

- **Carte** : vraie scène sur toute la hauteur, aucune hauteur minimale forçant le défilement ; un rang supérieur marque/recherche/couches ; parcours et recentrage au-dessus d’un bandeau de départ compact. Choix Course/Vélo dans ce bandeau ; Courir/Rouler reste sa seule action d’accent. Vue générale sans GPS, quartier après une sélection manuelle. La présence d’une carte ne simule jamais une position.
- **Navigation** : capsule flottante de 54 points, 3 destinations, libellé et surface blanche pour la destination active. Le chartreuse reste disponible pour le départ. Largeur plafonnée ; aucun fond opaque sur toute la largeur de l’écran.
- **Profil** : identité sur une ligne, journal et sport sur une ligne, semaine sans cartes, métriques ouvertes et sorties en lignes. Aucune grande carte d’activité fictive à l’état invité.
- **Crew** : photo originale recadrée sur le mouvement, prochaine sortie et entrées de groupe en lignes ouvertes. Les vrais groupes conservent membres, invitations et rendez-vous.
- **Progression et Collection** : une mesure confirmée, un objet, puis une timeline ou un inventaire. Les règles et archives se déplient ; les aperçus ne sont pas présentés comme obtenus.
- **Activité** : carte dominante au départ et en suivi, trois mesures alignées, pause localisée, fin disponible en pause. Résultat et Studio donnent la place au trajet ou à la création.
- **GRYD+** : outils, tarifs réels du Store et droits présentés en lignes ; pas de prix inventé ni d’équipement attribué pour remplir la page.
- **Objets et icônes** : coureur, vélo, carte et recentrage redessinés ; silhouettes de récompenses ouvertes remplaçant les étiquettes rectangulaires.

Les marges de contenu sont de 20 points, les textes fonctionnels de 12–14, les titres de destination de 23, les sections de 17. Une métrique peut être plus grande selon son rôle. Cette hiérarchie ne consiste pas à tout réduire. Les captures finales et les limites de recette figurent dans `REFONTE_2026_RECETTE.md`.

## Couverture vérifiable de la recherche

Le [sitemap public](https://rondesignlab.com/sitemap) a été parcouru sur toute sa structure. Il répertorie **538 entrées avant le pied de page**, en comptant les liens listés dans chaque rubrique. Ce nombre décrit l’inventaire ; il ne signifie pas que 538 pages ont été lues ou testées.

| Rubrique du sitemap | Entrées |
|---|---:|
| Pages générales | 8 |
| Services | 66 |
| Partenariats | 3 |
| Carrières | 5 |
| Cases | 132 |
| Index de blog | 4 |
| Design News | 81 |
| Work In Progress | 94 |
| Project Stories | 36 |
| Vidéos | 1 |
| Client Reviews | 29 |
| Experts | 20 |
| Industries | 56 |
| Informations légales | 3 |

L’exploration ciblée comprend **7 études de cas, 3 shots Dribbble, 12 planches effectivement ouvertes comme images**, le profil Dribbble et 11 pages d’index, de services ou de méthode. La sélection couvre mobilité, carte, activité sportive, objet connecté, santé, identité et affiches. Les planches verticales ont été ouvertes au-delà de leur vignette ; les observations ci-dessous décrivent ce qu’elles montrent, pas seulement leurs textes alternatifs.

Pages de structure et de méthode consultées : [accueil](https://rondesignlab.com/), [sitemap](https://rondesignlab.com/sitemap), [services](https://rondesignlab.com/services), [cases](https://rondesignlab.com/cases), [About Us](https://rondesignlab.com/about-us), [Mobile App](https://rondesignlab.com/services/mobile-app), [Look and Feel](https://rondesignlab.com/services/look-and-feel), [Industries](https://rondesignlab.com/industries), [Blog](https://rondesignlab.com/blog), [Partnership](https://rondesignlab.com/partnership) et [article sur la composition](https://rondesignlab.com/blog/design-news/the-role-of-composition-in-design).

**Limites :** cette recherche n’est pas une lecture exhaustive de chaque article, profil, page légale ou variante de service. L’index Dribbble fourni par la recherche web porte un cache plus ancien que la consultation en direct ; il ne permet pas d’affirmer que les trois shots choisis sont les derniers publiés. Le navigateur automatisable était indisponible dans cette sous-tâche. Les pages ont été consultées par recherche web et leurs images publiques téléchargées pour examen local. Les interactions, animations et prototypes des références n’ont donc pas été testés ici. Certains liens d’images étaient indisponibles ; une autre planche du même cas a alors été examinée. Les chiffres de conversion, témoignages et affirmations commerciales du site ne sont pas des résultats indépendamment vérifiés.

## Ce que montrent les images

### Mobilité : priorité à la scène et à la commande utile

| Projet et source précise | Observation visuelle | Adaptation GRYD |
|---|---|---|
| [BikeRoute](https://rondesignlab.com/cases/bikeroute-bicycle-mobile-app-ui-ux-design), [planche Mobile App](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_3200/f_auto/q_auto/v1/mobile_app_screens_c272d23575) | Une trace jaune serpente sur une carte sombre de relief. Le titre est court, les avatars petits et regroupés en haut. Un panneau bas rassemble l’objet et sa commande. D’autres écrans utilisent une photographie plein cadre, une grande vitesse et deux valeurs secondaires. | Carte lisible comme scène principale. Trace personnelle nette, peu de contrôles, discipline explicite. Le relief photographique ou cartographique reste une donnée réelle ; aucune montagne décorative n’est ajoutée à une course urbaine. |
| [MyBike](https://rondesignlab.com/cases/mybike-mobile-app-ux-ui-design), [planche Bikes and GPS](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_2400/f_auto/q_auto/v1/12_cca85dbc4e) | Le réglage d’une distance apparaît dans une seule surface basse ; sa valeur est au centre et la confirmation dans un petit disque lumineux. La carte garde sa continuité derrière. La navigation montre un état actif très clair. | Réunir choix du sport et lancement dans un panneau simple. Les couches et préférences détaillées se découvrent à la demande. L’aire d’une zone privée reste clairement distincte d’un territoire possédé. |
| [VanMoof](https://rondesignlab.com/cases/vanmoof-mobile-app-ux-ui-design), [planche vehicle details](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_2400/f_auto/q_auto/v1/vehicle_details_iphone_screenshot_5a2d5065bc) | La planche oppose un écran blanc centré sur le vélo à un écran noir de réglage. Le jaune reste localisé. Les titres ont une grande taille avec une graisse modérée ; un filet sépare les parties de la présentation. | Autoriser une carte claire et un live sombre dans une même famille. Utiliser taille et espace pour hiérarchiser ; réserver les contours, séparateurs et chiffres à des rôles précis. |
| [Bike Spot](https://rondesignlab.com/cases/bike-spot-bicycle-parking-app), [planche affiche et carte](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_2400/f_auto/q_auto/v1/mobile_ui_design_57637a1454) | La marque géométrique existe sur des affiches puis dans l’interface. La carte noire fait ressortir un seul repère vif et une distance. La planche publicitaire emploie un ruban fluorescent et une typographie plus expressive que les commandes. | Donner à GRYD une signature vectorielle propre, réutilisée sur les affiches. Garder les effets graphiques dans les supports appropriés. Aucun ruban, logo de vélo ou repère fictif n’est copié. |
| [RideMate](https://rondesignlab.com/cases/ridemate), [trois écrans mobiles](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_2400/f_auto/q_auto/v1/mobile_phone_ridemate_app_interface_812c5ac397) | Le produit photographié remplit l’onboarding. Le parcours d’appairage possède une action basse stable. L’écran d’activité montre une scène en vue subjective, quelques directions et une grande vitesse ; l’information ne recouvre pas toute l’image. | Onboarding court centré sur le geste. Live : une mesure prioritaire, deux secondaires et un contrôle explicite. Les mises en scène AR de la référence ne deviennent pas des fonctionnalités promises par GRYD. |

### Données, photographie et système de marque

| Projet et source précise | Observation visuelle | Adaptation GRYD |
|---|---|---|
| [Luna](https://rondesignlab.com/cases/luna-mobile-app-smart-ring-health-tracking-ui), [composants](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_1800/f_auto/q_auto/v1/luna_05_1bc86af8df), [interface](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_1800/f_auto/q_auto/v1/luna_07_ac208661ee) | Le signe circulaire se retrouve sur l’icône, la notification et l’écran. Une photographie douce accueille un grand arc fin ; les informations secondaires restent petites. La composition conserve beaucoup de surface libre. | Les emblèmes de progression doivent partager un dessin commun avec la marque. Un arc ou une jauge doit correspondre à une valeur disponible. La brume bleue et les textes très pâles de la planche ne sont pas transposés à GRYD. |
| [Vessel](https://rondesignlab.com/cases/vessel-wellness-mobile-app-design), [processus](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_1800/f_auto/q_auto/v1/hand_holding_mobile_app_1c2d9c7710), [itérations de l’accueil](https://res.cloudinary.com/ducxztw9n/image/upload/c_limit,w_2400/f_auto/q_auto/v1/ui_metrics_highlight_c6bc7349a9) | La planche de méthode aligne les étapes sur de fins filets. Les versions d’accueil superposent courbe et photographie de personne, puis rangent les résultats sous ce sujet principal. Le beige et le vert doux appartiennent à l’identité santé du projet. | Le Studio Photo conserve une vraie photographie choisie et pose les mesures dans une zone contrastée. L’éditeur peut rester noir et blanc. Le modèle de tableau médical et sa palette ne correspondent pas aux usages de course. |
| [Pulsetto — shot 27366523](https://dribbble.com/shots/27366523-Pulsetto-Mobile-Health-Tracking-App-UI) | Le temps est le point focal, au-dessus de deux réglages larges. La graduation est fine et le bouton de lecture simple. Le halo rouge et la perspective du téléphone produisent une impression matérielle dans l’image de présentation. | Agrandir le temps ou la distance au lieu d’ajouter du texte. Conserver de vraies cibles tactiles. Un halo photographique de mockup ne justifie pas un halo permanent pendant la course. |
| [Veri — shot 27355818](https://dribbble.com/shots/27355818-Veri-Mobile-Smart-Health-Tracking-App-UI) | Les cartes arrondies portent chacune une valeur principale et un indicateur. Les espaces entre elles sont réguliers. Le zoom, les gradients et la faible profondeur de champ mettent la matière au premier plan. | Retenir la lisibilité locale d’une donnée et le rythme. Éviter de transformer chaque information GRYD en carte colorée : le résultat doit rester compréhensible en une lecture. |
| [Hypershell — shot 27333818](https://dribbble.com/shots/27333818-Hypershell-Energy-Analytics-UI-Exosuit-Mobile-App) | La grille possède un bloc vertical dominant et deux blocs secondaires. Les graduations restent fines ; le contrôle actif est très visible. Les chiffres en points et les dégradés violets sont des signes expressifs propres à cette proposition. | Construire une hiérarchie entre progression, collection et détails. Garder nos chiffres lisibles et nos emblèmes originaux ; ni police en points ni gradient violet ne sont nécessaires. |

Les fichiers de travail inspectés sont dans `/tmp/gryd-design-research/` : `bikeroute.png`, `mybike.png`, `vanmoof.png`, `bikespot.png`, `ridemate.png`, `luna.png`, `luna-ui.png`, `vessel.png`, `vessel-ui.png`, `pulsetto.png`, `veri.png`, `hypershell.png`. Ils servent à la recherche, ne sont pas des assets GRYD et ne sont pas embarqués dans l’application.

### Complément de la consultation Dribbble en direct

L’agent principal a aussi inspecté les images dans le navigateur le 9 septembre : [SLPX — shot 27712211](https://dribbble.com/shots/27712211-SLPX-Neural-Sleep-Mobile-App) et [Hydroflask — shot 27699907](https://dribbble.com/shots/27699907-Hydroflask-Smart-Water-Bottle-Mobile-App) dans la grille actuelle, puis [Soma — shot 27706847](https://dribbble.com/shots/27706847-Soma-Glucose-Monitoring-Mobile-App) en détail. Les captures ont été vues dans le navigateur, sans fichier persistant. Ce complément est distinct des 12 planches locales comptées ci-dessus.

Ses observations convergent : SLPX associe des commandes compactes à une donnée dominante ; Soma travaille les grands chiffres fins, les gris secondaires et les espacements ; Hydroflask place l’objet matériel au centre avec des contrôles périphériques. Pour GRYD, la matière centrale est la carte, la trace ou la photo personnelle. L’effet de verre fumé reste une référence de présentation, à employer seulement si le contraste de l’interface demeure lisible.

## Lecture de la méthode du studio

Les pages [Services](https://rondesignlab.com/services) et [Look and Feel](https://rondesignlab.com/services/look-and-feel) présentent la direction visuelle comme une étape de proposition et de comparaison, suivie d’un travail plus large sur le produit. Pour GRYD, la direction se juge sur des écrans concrets et leurs états vides, pas seulement sur une planche de marque.

L’[article sur la composition](https://rondesignlab.com/blog/design-news/the-role-of-composition-in-design) articule contraste, groupement, espace et hiérarchie. L’application retenue ici est précise : chaque écran possède un sujet dominant, une action principale et un niveau secondaire accessible. Les proportions restent cohérentes lorsque les données sont absentes ou que le texte s’agrandit.

Le [portfolio](https://rondesignlab.com/cases) réunit de nombreuses catégories. Il ne constitue pas une palette unique à recopier. Les projets de vélo étudiés emploient volontiers noir et jaune ; Vessel et Luna montrent des identités nettement différentes. Notre décision noir, blanc et chartreuse vient de GRYD et de la demande du fondateur.

## Traduction dans GRYD

| Élément | Direction retenue |
|---|---|
| Palette | Fond sombre `#0A0A0A`, surfaces `#171717` et `#292929`, texte clair `#FAFAFA`. Fond clair `#F5F5F5`, blanc `#FFFFFF`, encre `#101010`, gris neutres. Accent unique `#B4FF0D`. Consommer les tokens partagés. |
| Typographie | Inter / Inter Tight déjà chargées. En-têtes 16 points ; titres de section 18 points ; titres courts 20–26 points ; texte courant 13–14 points. Graisses 400–500 pour les grands chiffres, 500–600 pour les commandes. Unités plus petites, alignées à la ligne de base. Pas de nouvelle fonte non livrée. |
| Composition | Marges constantes de 20–24 points. Contrôles tactiles d’au moins 44 points. Surfaces regroupées par fonction ; séparateurs fins pour les listes. Rayons francs mais pas de carte dans une carte dans une carte. |
| Carte | Cartographie claire neutre ou sombre selon le contexte ; fond lisible et peu chargé. La trace réelle garde ses ruptures et ses courbes. Les couches de jeu viennent des données serveur. |
| Navigation | Icônes SVG cohérentes, libellés stables, état sélectionné lisible sans dépendre seulement de la couleur. Même famille de traits dans les menus et les réglages. |
| Profil | Identité, activité et progression dans cet ordre. La donnée disponible prend la place centrale. Un historique vide reste un historique vide. |
| Crew | Membres et sorties consenties comme matière principale. L’action de rejoindre ou créer est facile à trouver. Les grands symboles décoratifs n’imitent pas une carte de possession. |
| Saison / Collection | Objets graphiques originaux et progression explicite. Les états acquis, sélectionnés ou indisponibles restent distincts. Aucun emblème ne suggère un gain encore non confirmé. |
| Résultat | Distance, durée, trace et impact validé. Les détails viennent après le résultat. La présentation ne transforme jamais un état en attente en victoire. |
| Studio | Éditeur sombre, aperçu visible immédiatement, choix Trace / Photo / Sticker / Replay. Panneau Format clair ; une action principale de partage. Affiche composée à partir de la trace protégée et des faits de la sortie. |

Le chartreuse sur fond blanc n’est pas utilisé pour les petits textes ou les pictogrammes d’action. Une trace de l’affiche claire peut être noire pour conserver sa netteté. La photographie personnelle garde ses propres couleurs ; la palette de l’interface demeure neutre.

## Texte d’interface

Employer des noms et des verbes concrets : **Carte, Courir, Vélo, Profil, Crew, Collection, Studio, Format, Fond, Noir, Blanc, Partager**. Les messages d’état décrivent l’état réel : « Tracé masqué », « En attente », « Film indisponible ».

Retirer des commandes et des résultats les slogans génériques tels que « Ça mérite un souvenir », « Le regard qui était le tien » ou « Un peu dehors. Beaucoup pour soi ». Un texte émotionnel ne doit pas remplacer une mesure, une consigne ou l’explication d’un statut. Les états sans donnée demandent une action utile : « Ouvrir le journal », « Choisir une photo ».

## Mise en œuvre du Studio

`ShareStudio2026.tsx` conserve le filtrage de confidentialité, le choix système de photo, les événements de partage et la distinction entre remise du média et publication confirmée. Sa composition évolue : en-tête compact, onglets à icônes originales, aperçu adapté à la hauteur disponible, commande de partage fixe, réglages dans un panneau blanc.

`SharePoster2026.tsx` utilise la marque vectorielle GRYD, une distance dominante avec unité séparée, une trace centrée et les mesures secondaires sous un filet. Les données manquantes n’ajoutent aucun résultat. La version Photo conserve l’image choisie avec un voile SVG progressif pour la lisibilité ; la version Sticker conserve son fond transparent. Les réserves de 250 pixels en haut et en bas des Stories restent prévues. L’aperçu et l’export utilisent le même composant.

Le choix « Fond » concerne les affiches ; « Texte » concerne le sticker transparent. Ce choix n’est pas affiché sur Photo, où le fond est l’image choisie. Le Replay gratuit possède maintenant un encodeur MP4 natif local et un aperçu de la dernière image. Sa disponibilité dépend du module présent dans le binaire et du codec de l’appareil. Sur le web, le bouton indique le partage du résumé texte et ne promet pas un export d’image.

## Recette visuelle attendue

Vérifier les formats Story, portrait et carré en noir et blanc, la photo claire et sombre, le sticker transparent, une trace ouverte, plusieurs segments, une sortie sans GPS et une sortie sans gain. Vérifier aussi petit écran, texte agrandi, unités longues, chargement des protections, erreur de photo et indisponibilité du film.

Résultat historique de la première passe, avant le complément ci-dessous : le typecheck mobile après les modifications du Studio avait réussi. Les **174 tests existants du dossier partage passent** : faits exportés, ratios, confidentialité des traces, cadrage, capacité des destinations et vérité du résultat de partage. Ces tests ne constituent pas une recette des pixels des nouveaux posters. La validation des fichiers image exportés sur iOS et Android reste à effectuer sur appareil ; un rendu web ne prouve pas le comportement du module natif d’export. L’audit visuel du navigateur et les vérifications des autres écrans sont coordonnés séparément par l’agent principal.


## Complément — composition après la note CRM RonDesignLab

La passe du 9 septembre est détaillée dans `docs/design/GRYD_COMPOSITION_INTERFACE_2026.md` : surfaces papier pour Profil, Crew, statistiques, progression, collection, GRYD+ et réglages ; carte sombre avec départ blanc ; typographie Manrope/Inter ; verre limité aux commandes. La palette GRYD reste noir, blanc, gris neutres et chartreuse. La photographie originale et les objets GRYD sont conservés.
