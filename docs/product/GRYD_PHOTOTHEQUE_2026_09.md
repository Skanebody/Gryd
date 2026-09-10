# GRYD, la photothèque : douze photographies nommées, une seule embarquée

**Date** : 10/09/2026 · **Périmètre** : `apps/mobile/assets/photos/**`,
`apps/mobile/src/ui/gryd/photoLibrary2026.ts`, `apps/mobile/src/ui/gryd/brandImagery.ts`,
le bloc héros de `apps/mobile/src/features/refonte/ProfileHomeScreen.tsx`.
**Demande du fondateur (10/09/2026)** : « Pour la photo dans le Profil, celle au milieu dans
"Tout commence dehors", on a déjà utilisé cette photo pour l'onboarding : utilise la numéro 18 et
cadre-la parfaitement pour qu'on voie les visages devant. Tu dois renommer de manière SEO toutes
les images ; les autres, tu les utiliseras quand il y aura d'autres endroits pour mettre des photos
si besoin, mais tu les gardes en stock. »

---

## 1. Le doublon, et pourquoi il ne se corrigeait pas en une ligne

`brandImagery.movement` servait **trois** écrans à la fois :

| Écran | Fichier | Ce qu'il affichait |
|---|---|---|
| Découverte, premier écran | `src/features/onboarding/Discovery2026Screen.tsx` | `movement`, en plein cadre |
| Porte de compte | `src/features/account/AuthEntry2026.tsx` | `movement`, en fond |
| Profil, bloc « Tout commence dehors » | `src/features/refonte/ProfileHomeScreen.tsx` | `movement`, recadré en bandeau |

Repointer `movement` vers la photo 18 aurait donc changé **aussi** l'accueil de la découverte, que
la consigne demandait expressément de ne pas toucher. La correction retenue est l'inverse :
`movement` ne bouge pas (la découverte et la porte de compte gardent `e01-crew.jpg`, leur paire),
et une entrée **`profileMovement`** est créée pour le Profil, avec son propre recadrage. Deux
lignes de `ProfileHomeScreen.tsx` changent, toutes deux dans le bloc héros.

---

## 2. Les douze photographies, nommées

Toutes en **1080 px de large**, JPEG, dans `apps/mobile/assets/photos/`. Le nom porte le sujet :
minuscules, sans accent, séparé par des tirets, préfixe `gryd-`. C'est aussi ce que liront les
moteurs le jour où l'une d'elles partira sur `apps/web` (une image nommée `18.PNG` n'est indexée
sur rien).

| Fichier | Origine | Scène | Poids | Emplacements suggérés |
|---|---|---|---|---|
| `gryd-crew-course-montee-ville-foule-heros-profil.jpg` | 18, recadrée | Le premier rang de la foule, recadré pour le bloc de 148 pt du Profil | 383 Ko | **Héros Profil (peinte aujourd'hui)** |
| `gryd-crew-course-montee-ville-foule.jpg` | 18 | Le crew au complet remonte une rue en pente, ville en fond, visages hurlants de joie au premier rang, débardeur GRYD CREW | 354 Ko | Héros Profil, Crew vide, accueil web, App Store |
| `gryd-crew-femmes-cercle-selfie-ciel.jpg` | 1 | Vue depuis le sol : neuf coureuses en cercle, têtes vers l'objectif, signes de victoire | 411 Ko | Crew vide, écran de partage, accueil web |
| `gryd-coureurs-vue-plongeante-paves.jpg` | 7 | Plongée verticale sur huit coureurs dispersés, ombres longues, chaussures chartreuse | 389 Ko | Partage, accueil web, App Store |
| `gryd-duo-sprint-ville-lunettes-chartreuse.jpg` | 8 | Duo en plein sprint, lunettes chartreuse, gratte-ciel filés par la vitesse | 378 Ko | Accueil web, App Store |
| `gryd-coureuse-lunettes-chartreuse-portrait-groupe.jpg` | 9 | Avant le départ, vue de haut : une coureuse au centre, le groupe serré autour d'elle | 342 Ko | Héros Profil, partage, App Store |
| `gryd-coureurs-vitesse-file-rue.jpg` | 10 | Filé latéral sur quatre coureurs lancés, décor réduit à des traînées grises | 366 Ko | Partage, accueil web |
| `gryd-coureur-nuit-pluie-eclairs.jpg` | 12 | Rue étroite de nuit, pavés luisants, un coureur seul, éclats de lumière blanche | 369 Ko | Partage, App Store |
| `gryd-duo-traversee-passage-pieton-pluie.jpg` | 13 | Chaussée mouillée, circulation à l'arrêt, un homme et une femme traversent au pas de course | 365 Ko | Accueil web, App Store |
| `gryd-groupe-hommes-course-pluie-brique.jpg` | 14 | Six coureurs de profil sous une pluie visible, mur de brique, semelles chartreuse | 350 Ko | Crew vide, accueil web |
| `gryd-crew-pause-cafe-terrasse.jpg` | 15 | Après la sortie : deux hommes debout, trois coureuses au comptoir, gobelets à la main | 353 Ko | Crew vide, partage |
| `gryd-foule-place-depart-collectif.jpg` | 16 | Densité maximale : des dizaines de coureurs en noir sur une allée arborée | 395 Ko | Crew vide, accueil web, App Store |
| `gryd-materiel-sol-apres-course-medailles.jpg` | 17 | Plancher de bois vu de haut, cercle de jambes assises, deux médailles à ruban, chaussures usées | 399 Ko | Partage, App Store |

Conversion : `sips -s format jpeg -s formatOptions <q>`, qualité descendue par paliers jusqu'à
passer sous **450 Ko** (plafond tenu par un test). La photo 7 est la plus coûteuse (grain et
texture de pavés) : elle a demandé `formatOptions 60`, les autres tiennent entre 72 et 84.

---

## 3. Ce que le binaire paie, et pourquoi le stock est gratuit

Metro n'embarque que ce qu'un `require()` atteint. **Mesuré**, pas supposé : l'IPA du 10/09/2026
(`gryd-0a07b73c.ipa`) contient dans `Payload/GRYD.app/assets/assets/`
exactement deux photographies, `auth/sign-in-crew.jpg` et `onboarding/e01-crew.jpg`, les deux
seules photographies requises par le code. `assets/editorial/urban-running-2026.png` (2,6 Mo, un duo de dos sur
les quais, en noir et blanc) n'y est **pas** : aucune ligne du dépôt ne le require. `app.json` ne
déclare aucun `assetBundlePatterns`, donc aucune glob ne rattrape le reste.

Conséquence tenue par `photoLibrary2026.test.ts` :

* le registre ne contient **qu'un seul** `require()`, celui du héros du Profil ;
* aucun autre fichier de `assets/photos/` n'est requis ailleurs dans `src/` ou `app/` ;
* le fichier requis existe sur le disque et pèse moins de 450 Ko.

**Poids ajouté au binaire : 383 Ko.** Les 4,3 Mo restants vivent dans le dépôt, prêts, sans
voyager sur le réseau de qui que ce soit.

---

## 4. Cadrage du héros du Profil

Le bloc mesure **148 pt de haut** sur toute la largeur de la carte (largeur d'écran moins les
20 pt de marge de `ProfilePage` de chaque côté). `MovementPhoto2026` ne peint pas l'image à cette
hauteur : il la place dans un cadre de `largeur × 1,5 largeur`, en `cover`, remonté de 24 % du
débordement, et ne laisse voir que les 148 pt du haut. Deux conséquences, toutes deux vérifiées :

* une image au ratio **2:3** entre dans ce cadre **sans recoupe latérale** (`cover` tombe juste) ;
* la fenêtre réellement visible couvre **17 % à 46 %** de la hauteur de l'image, selon la largeur.

React Native ne sait pas viser un point focal. Le recadrage est donc fait **à la source** :

```
sips -s format jpeg -s formatOptions 84 --cropToHeightWidth 1620 1080 --cropOffset 255 0 18.PNG
```

soit un 1080 × 1620 pris à partir de la ligne **255** de l'original 1080 × 1920. Ce qui est
réellement vu, exprimé en lignes de l'original :

| Largeur d'écran | Largeur du bloc | Lignes vues | Premier rang de visages (584 … 900) |
|---|---|---|---|
| 375 pt | 335 pt | 529 … 1007 | entier, large marge |
| 390 pt | 350 pt | 534 … 991 | entier |
| 428 pt | 388 pt | 545 … 957 | entier |
| 430 pt | 390 pt | 545 … 955 | entier, cas le plus serré |

Six visages du premier rang tiennent entiers dans le cas le plus serré : le coureur torse nu qui
rit à gauche, l'homme au débardeur GRYD CREW et lunettes chartreuse, le coureur central qui hurle
sous sa casquette, le coureur bouclé qui hurle en filmant, la coureuse aux lunettes chartreuse à
droite, la casquette chartreuse au premier plan.

**Preuve visuelle** (aperçu web du worktree, serveur Expo sur 8081, `deviceScaleFactor: 2`) :

* `…/scratchpad/lotp/profil-390x844.png` et `…/scratchpad/lotp/heros-390x844.png` ;
* `…/scratchpad/lotp/profil-428x926.png` et `…/scratchpad/lotp/heros-428x926.png` ;
* racine du scratchpad : `/private/tmp/claude-501/-Users-benjaminbel-KLAIM-RUN--claude-worktrees-reprise-session-5a1692/eac6a200-c3d5-46ca-9674-62b2535284c3/scratchpad`.

Les mesures relevées à l'écran confirment le calcul : bloc de 350 × 148 à 390 pt, 388 × 148 à
428 pt, `img` servi depuis `assets/photos/gryd-crew-course-montee-ville-foule-heros-profil.jpg`.

> ⚠️ **Si `MovementPhoto2026` change** (hauteur 148, ratio 1,5 ou décalage 0,24), ce cadrage
> bouge. Le contrat est écrit dans `photoLibrary2026.ts`, au-dessus de l'entrée du héros, et
> nulle part ailleurs.

---

## 5. `apps/web` : ce qu'il utilise, et ce qu'on lui propose

**État réel au 10/09/2026** : `apps/web` n'affiche **aucune photographie**. Les deux seuls
fichiers image du projet sont `apps/web/app/icon.png` et `apps/web/app/apple-icon.png` (les
favicons). Il n'y a pas de dossier `public/`, pas d'`opengraph-image`, et `Hero.tsx` ne contient
ni `<img>`, ni `background-image` : la page d'accueil est entièrement composée de texte, de
dégradés et du `HexMap.tsx`.

**Proposition, non appliquée** (aucun fichier de `apps/web` n'a été touché par ce lot) :

| Emplacement web | Photo proposée | Pourquoi |
|---|---|---|
| Bandeau du `Hero` de l'accueil | `gryd-crew-course-montee-ville-foule.jpg` | La seule qui dit « collectif » et « ville » dans la même image, et la seule où la marque est lisible sur un vêtement |
| Section « communauté » / liste d'attente | `gryd-foule-place-depart-collectif.jpg` | La densité rend le nombre crédible sans avancer un chiffre que le dépôt ne peut pas prouver |
| `opengraph-image` (partage sur les réseaux) | `gryd-duo-sprint-ville-lunettes-chartreuse.jpg`, recadrée en 1200 × 630 | Deux visages nets, chartreuse au centre, lisible en vignette |
| Pages légales et abonnement | aucune | Une photo y serait décorative, et alourdirait une page qu'on lit pour se renseigner |

Trois précautions à prendre le jour où on le fait, et qui ne se voient pas depuis le mobile :
Next sert depuis `public/` (les fichiers devront y être **copiés**, pas importés depuis
`apps/mobile`) ; il faudra une variante `webp` et un `sizes` correct, sinon 400 Ko partent sur
chaque visite mobile ; et le `alt` doit être écrit en français **et** en anglais si la page l'est.

---

## 6. Ce que ce lot n'a pas fait

* Aucun écran autre que le Profil n'a reçu de photo : le stock reste du stock, tant qu'un
  emplacement n'est pas décidé. Un `require()` de plus se voit dans le test, et se discute.
* `assets/editorial/urban-running-2026.png` (2,6 Mo, requis par personne) n'a pas été supprimé :
  il est cité par `docs/design/GRYD_EDITORIAL_PHOTO_2026.md` et sa suppression est une décision
  de direction artistique, pas un effet de bord de ce lot.
* La photo 7 a été compressée à `formatOptions 60` pour tenir sous le plafond ; si un écran
  l'affiche un jour en grand, il faudra la reprendre depuis l'original (le PNG source vit hors du
  dépôt, chez le fondateur).
