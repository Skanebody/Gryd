# GRYD — surfaces translucides

Passe du 9 septembre 2026. Consigne : supprimer flou, réfraction, reflets et halos des contrôles et surfaces ; conserver des fonds unis, opaques ou à alpha uniforme, avec un contenu net. Les illustrations, photographies et matières des objets ne sont pas transformées arbitrairement.

## Intégration dans toute l'application

Le matériau commun est désormais [TranslucentBackdrop2026](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/ui/gryd/TranslucentBackdrop2026.tsx>) : aplat sombre à 78 % ou clair à 88 %, contenu net au-dessus, couche non interactive. La préférence de réduction de transparence iOS/web remplace cet aplat par un fond opaque. Aucun `BlurView`, flou CSS, reflet supérieur ou ombre positive n'est rendu par cette primitive.

[Surface2026](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/ui/gryd/Surface2026.tsx>) fournit les contrôles et actions circulaires correspondants. Les anciens exports Frosted/Glass ne sont que des alias compatibles vers le rendu plat. Carte, navigation Crew/Profil, Button, StackScreen, connexion, e-mail, callback, réglages, onboarding, primitives Profil, Crew, résultat et reprise utilisent ce matériau. Les dimensions, routes, formulaires, animations fonctionnelles et règles sportives ne changent pas dans cette passe.

**Recette globale exécutée sur localhost:8081 :** [37 passages, aucun échec](../design/review-2026/translucent-global/qa.json), soit 27 routes à 390×844 et les dix parcours principaux également à 320×640. Vérification des styles rendus : aucun flou positif ni reflet interne, aucune ombre visible du matériau, aucun débordement horizontal, erreur de page ou envoi d'authentification. Les valeurs CSS inertes `blur(0px)` et l'ombre transparente de dimensions nulles produite par `shadowOpacity: 0` sont distinguées des effets visibles. Les captures sont prises dans les états invités réels, sans activité, possession ou identité inventée.

[Réduction de transparence](../design/review-2026/translucent-global/reduced-transparency-qa.json) : préférence émulée via le navigateur, fond sombre `rgb(10, 10, 10)` et clair `rgb(255, 255, 255)` vérifiés. [Connexion](../design/review-2026/translucent-global/sign-in-390.png) · [Réglages](../design/review-2026/translucent-global/parametres-390.png) · [Profil](../design/review-2026/translucent-global/profil-320.png) · [Crew](../design/review-2026/translucent-global/crew-390.png).

**Validation technique finale :** 110 tests UI/navigation réussis, typecheck des quatre workspaces et exports Expo web/iOS réussis. Aucun déploiement, achat, compte ou enregistrement sportif effectué. La recette native iOS/Android et les variantes authentifiées qui exigent des données serveur ne sont pas déduites de ces contrôles navigateur.

## Complément : site et anciennes surfaces de jeu

| Surface | Fichiers | Modification |
|---|---|---|
| Header web et menu mobile | [SiteHeader.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/SiteHeader.module.css>), [commentaire du composant](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/SiteHeader.tsx>) | Suppression des deux `backdrop-filter` et de leurs variantes WebKit. Fonds noirs à alpha conservés, ainsi que contours et cibles. |
| Overlays du téléphone illustré | [PhoneMockup.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/PhoneMockup.module.css>) | Badge et alerte utilisent leur aplat alpha existant, sans flouter la carte derrière. |
| Offres et abonnement | [PricingSection.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/PricingSection.module.css>), [abonnement.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/abonnement/abonnement.module.css>) | Halos des cartes supprimés ; contours distinctifs conservés. Aucun prix, droit ou parcours d’achat changé. |
| Galerie et aperçu de crew | [BadgeGallery.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/BadgeGallery.module.css>), [CrewBuilder.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/CrewBuilder.module.css>) | Fonds de cartes unis, halos et transitions d’ombre supprimés. Les dessins d’emblèmes restent séparés du traitement de leur contenant. |
| Attente et toast admin | [WaitlistSection.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/WaitlistSection.module.css>), [ui.module.css](</Users/benjaminbel/KLAIM RUN/apps/web/app/admin/components/ui.module.css>) | Halo du repère et ombre du toast supprimés ; information, contour et lisibilité conservés. |
| Fond web | [BackgroundFx.tsx](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/BackgroundFx.tsx>), [CSS](</Users/benjaminbel/KLAIM RUN/apps/web/app/components/landing/BackgroundFx.module.css>) | Suppression de la lumière suivant le pointeur, de son écouteur et de son animation. Texture fixe sans interaction conservée. |
| Anciennes surfaces de jeu mobile | [ShareCard.tsx](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/ui/game/ShareCard.tsx>), [ContextualRunButton.tsx](</Users/benjaminbel/KLAIM RUN/apps/mobile/src/ui/game/ContextualRunButton.tsx>) | Suppression des ombres/élévations et du halo pulsant du bouton flottant. Fond de la création exportée, appui, haptique, callbacks et contrôles restent en place. |

Treize fichiers applicatifs modifiés dans ce lot. Les changements déjà présents dans `RealMap.web.tsx` et `RealMapNative.tsx` appartiennent aux travaux antérieurs et n’ont pas été modifiés ici. Aucun package, donnée, règle de jeu ou permission changé.

## Audit global en lecture seule

Les recherches `rg` ont couvert `apps/` et `packages/`, puis les fichiers HTML à la racine, le site institutionnel et le template email. Elles ont recherché les propriétés CSS/RN, styles inline, `BlurView`, flous d’image, filtres SVG, reflets WebKit, ombres et dégradés. Les dépendances, caches de build et sorties générées ont été exclus de l’inventaire du code source.

Après les modifications parallèles de l’équipe, la dernière recherche ne trouve plus de `BlurView`, `backdropFilter`, `backdrop-filter: blur(...)`, flou d’image ou reflet actif dans les sources applicatives examinées. Les propriétés mobiles `shadowOpacity: 0` et `elevation: 0` restantes désactivent explicitement les ombres. Les anciennes appellations « Glass » ou « Frosted » peuvent subsister comme alias de compatibilité : leur nom n’est pas la preuve d’un effet de verre.

Les primitives `ui/gryd`, la navigation, `Button`, `StackScreen` et les écrans mobiles sont traités par les autres agents. Ils n’ont pas été modifiés dans ce sous-lot. Cet inventaire ne constitue pas une recette visuelle de toutes leurs variantes.

## Exclusions justifiées

| Occurrence conservée ou hors application | Motif |
|---|---|
| Ombre extérieure du téléphone dans `PhoneMockup.module.css` | Dessin d’un objet physique dans une illustration ; les surfaces de son écran ont bien perdu leur flou. |
| `drop-shadow` du dessin SVG dans `BadgeGallery.tsx`, halo des petits objets dans `RewardSection.module.css` | Matière et représentation d’une récompense. Les cartes qui les contiennent sont plates. |
| Anneaux `box-shadow` de rayon de flou nul dans `FranceMapSection.module.css` | Contours de repères et double trait de légende, sans ombre diffuse ni réfraction. |
| Hachures de cartes/simulateur, triangles CSS du select, masque du fond cartographique du Hero, grain SVG fixe | Motifs, formes ou illustration ; aucune lecture de pixels derrière un contrôle, aucun flou du contenu. |
| [maquette-ui-klaim.html:33](</Users/benjaminbel/KLAIM RUN/maquette-ui-klaim.html:33>) et [ligne 52](</Users/benjaminbel/KLAIM RUN/maquette-ui-klaim.html:52>) | Ancienne référence HTML : flous de chip/navigation encore présents, signalés au parent. Aucun chargement de cette maquette trouvé dans le code applicatif ; ne pas la considérer comme une référence de matériau actuelle. Hors périmètre de modification de ce lot. |
| [maquette-badges-gryd.html:196](</Users/benjaminbel/KLAIM RUN/maquette-badges-gryd.html:196>) | Effet de dessin du badge historique, pas un contrôle de l’application. |
| `sites/nexus1993/index.html` et `supabase/templates/magic_link_otp.html` | Inspectés ; pas d’effet correspondant aux recherches. Aucun changement. |

## Vérifications et recette restante

**Effectué :** typechecks des workspaces **web et mobile réussis** ; analyse syntaxique des **32 feuilles CSS** de `apps/web/app` avec PostCSS, sans erreur ; recherches globales décrites ci-dessus. Le contrôle mobile final a été exécuté après la mise à disposition de la primitive partagée renommée.

**Non effectué dans ce sous-lot :** lancement d’un navigateur pour le site web, captures comparatives, mesure des contrastes rendus et contrôle sur appareils iOS/Android. Les contrôles suivants restent des critères de recette, pas des validations acquises :

1. Header web au repos et après scroll, menu ouvert à 320/390 px, navigation desktop : fond derrière toujours net, texte lisible, aucune cible déplacée.
2. Toast et offres sur fonds clairs/sombres : contours suffisants sans ombre ; focus visible au clavier.
3. Transparence réduite système : fonds opaques lisibles ; aucun flash de verre/flou au montage.
4. ShareCard et bouton contextuel : export et actions inchangés, pas de halo ni ombre autour de la surface.
5. Galerie : objet artistique conservé, contenant plat ; ne pas confondre ombre du dessin et effet de la carte.
6. Carte/nav : vérifier les trois onglets, départ/reprise, Couches et gestes de carte avec les overlays présents. Le changement de matériau ne doit pas modifier l’autorité ou la confidentialité.

La recherche textuelle ne peut pas certifier à elle seule l’absence d’un effet dans un asset raster ou une bibliothèque externe. Elle vérifie les sources de l’application et les exceptions explicitement recensées ; la recette finale doit vérifier le rendu.
