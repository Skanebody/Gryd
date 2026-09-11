# GRYD — L'ÉCRAN PENDANT LA COURSE (audit comparatif + lot R)

> **Demande fondateur, 11/09/2026** : « Comment s'affiche l'écran quand on est en
> course ? Vérifie qu'on a bien au minimum toutes les informations que Strava et
> INTVL peuvent donner. »

Ce document est l'audit HONNÊTE de l'écran `/course-live` **avant** le lot R,
ligne par ligne avec son `fichier:ligne`, la même chose **après**, et ce qui
reste hors de portée avec la raison exacte.

Écran audité : `apps/mobile/app/course-live.tsx` (aiguillage à 4 états) →
`apps/mobile/src/features/run/gps/RealCourseLive.tsx` (la course réelle).
Le groupe `(mvp)/course`, en quarantaine, n'est PAS l'écran du cahier et n'est
pas audité ici (voir §6 « Ce qui a été réconcilié depuis `(mvp)` »).

---

## 1. Le tableau

Légende : ✅ présent · ⚠️ partiel · ❌ absent · — sans objet.

| # | Mesure / capacité | Strava | INTVL | GRYD **avant** | GRYD **après** |
|---|---|---|---|---|---|
| 1 | Temps écoulé | ✅ | ✅ | ✅ temps **actif** `RealCourseLive.tsx:71` (avant) | ✅ `RealCourseLive.tsx:155` — libellé « Temps actif », parce que le chrono se fige aux pauses |
| 2 | Distance | ✅ | ✅ | ✅ `RealCourseLive.tsx:70` (avant) | ✅ `RealCourseLive.tsx:154` |
| 3 | Allure **moyenne** | ✅ | ✅ | ✅ `RealCourseLive.tsx:72` (avant) — c'était la SEULE allure | ✅ reléguée en 2ᵉ rangée `RealCourseLive.tsx:163` |
| 4 | Allure / vitesse **instantanée** | ✅ | ✅ (cœur du produit) | ❌ **rien** : `snapshot.paceSPerKm = activeS / km`, moyenne depuis le départ, immobile après une heure | ✅ `RealCourseLive.tsx:156`, lissée 15 s (`LIVE_PACE_WINDOW_S`), vitesse à vélo, **disparaît** à l'arrêt |
| 5 | Splits automatiques au km + allure de chaque km | ✅ | ✅ | ❌ `splitsFrom` existait (`journal/metrics.ts:234`) mais n'avait qu'un appelant : le détail de sortie, relu le soir | ✅ liste `RealCourseLive.tsx:188-191`, dernier km complet `:189` |
| 6 | Dénivelé positif | ✅ | ⚠️ | ❌ structurellement impossible : `RunPoint` = `lat/lng/t/acc`, aucune source d'altitude | ✅ `RealCourseLive.tsx:164` — `RunPoint.alt` livré, lissé, `elevationFrom` du journal |
| 7 | Cadence | ✅ (capteur ou podomètre) | ✅ | ❌ le podomètre tournait (`tracker.startPedometer`) mais ne rendait qu'un CUMUL anti-triche | ✅ `RealCourseLive.tsx:165`, pas/min sur 30 s (`LIVE_CADENCE_WINDOW_S`) |
| 8 | Fréquence cardiaque + zones de FC | ✅ (capteur) | ✅ | ❌ | ❌ **toujours impossible** — aucune intégration Watch/BLE. Chiffré en §4 |
| 9 | Carte avec tracé en direct | ✅ | — | ✅ `RealCourseLive.tsx:57-59` (avant), tronçons séparés aux trous | ✅ inchangé `:132-134` |
| 10 | Pause automatique | ✅ (réglable) | ✅ | ⚠️ le MOTEUR l'appliquait (`engine/gps.detectPauses`), la préférence existait (`autoPausePref.ts`) mais ne se réglait QUE pendant le compte à rebours du départ | ✅ réglage à froid, **par discipline** : `app/parametres/[section].tsx:577` et `:588` |
| 11 | Verrouillage de l'écran | ✅ | ✅ | ❌ le geste le plus facile à provoquer dans une poche était « Terminer » | ✅ `RealCourseLive.tsx:230` + `LockOverlay:274`, déverrouillage par GLISSEMENT |
| 12 | Écran qui reste allumé | ✅ | ✅ | ❌ aucune occurrence de `keep-awake` dans le dépôt | ✅ `RealCourseLive.tsx:70` (`expo-keep-awake`, chargement défensif) |
| 13 | Annonces audio | ✅ (km, allure) | ✅ (détaillées) | ⚠️ TROIS phrases (départ, boucle presque fermée, boucle fermée), **aucune au km**, et **aucun réglage** | ✅ annonce du km avec son allure `useRealRunCore.ts:533-536` ; interrupteur `parametres/[section].tsx:600` |
| 14 | Tour manuel (lap) + résumé | ⚠️ | ✅ | ❌ | ✅ bouton `RealCourseLive.tsx:225`, résumé `:198-199`, marques persistées au kill |
| 15 | Choix du sport | ✅ | — | ✅ déclaré au préflight, corrigeable d'un tap (`runActivity.ts`) | ✅ inchangé |
| 16 | Grands chiffres lisibles en mouvement | ✅ | ✅ | ⚠️ 3 chiffres, 34/27 pt | ✅ 3 grands + 3 secondaires, blanc sur carbone (contraste maximal) |
| 17 | Mode sombre | ✅ | ✅ | ✅ l'écran est carbone en permanence | ✅ inchangé |
| 18 | Beacon / position partagée en direct | ✅ | — | ❌ (décision : la trace ne quitte l'appareil qu'au payload de fin) | ❌ **hors périmètre**, voir §5 |
| 19 | Intervalles (répétitions, cible, écart, décompte) | — | ✅ (cœur) | ❌ | ❌ **lot suivant chiffré**, voir §5 |
| 20 | **Boucle GRYD** : distance restante, état | — | — | ❌ `snapshot.loopGapM` existait depuis des mois **sans aucun lecteur** dans l'écran | ✅ `RealCourseLive.tsx:169-178`, autorité `loopClosurePhase` (celle du serveur) |
| 21 | **Signal GPS** : perte dite, précision chiffrée | ⚠️ (pictogramme) | ⚠️ | ⚠️ la PERTE était dite (`RealCourseLive.tsx:86` avant), la précision jamais | ✅ précision en mètres `RealCourseLive.tsx:148-149` |
| 22 | Coéquipiers proches | — | — | ❌ (`features/run/defense/` existe, aucun lecteur ici) | ❌ **hors périmètre**, voir §5 |

**Résumé en une phrase.** Avant le lot R, GRYD donnait **3 des 13 mesures** que
Strava affiche pendant un enregistrement et **1 des 6** d'INTVL. Après, il donne
**11 des 13** (manquent la FC et Beacon) et **3 des 6** (manquent la FC, les
zones et le mode intervalles), plus deux mesures qu'aucun des deux ne donne : la
boucle en cours et la précision GPS chiffrée.

---

## 2. Ce que le lot a changé, fichier par fichier

### La mesure (modules PURS, testés sous Deno)

| Fichier | Rôle |
|---|---|
| `apps/mobile/src/features/run/gps/liveMetrics2026.ts` | allure instantanée, splits, D+, cadence, tours. **Ne recalcule rien** : il relie `splitsFrom`/`elevationFrom` (journal), `recentSpeedMps` (moteur), `GPS_PAUSE_SPEED_MS` (game-rules) |
| `…/liveMetrics2026.test.ts` | 19 tests, tous centrés sur « la mesure DISPARAÎT quand elle n'a pas eu lieu » |
| `…/liveAnnounce2026.ts` | fabrique une `Entry` de catalogue interpolée : la voix dit un nombre sans que le texte quitte l'i18n (L18 reste structurelle) |
| `…/voicePref2026.ts`, `…/keepAwake2026.ts` | préférence de voix ; écran maintenu allumé (chargement défensif) |
| `…/runPipeline.ts:210-229, :422-431` | le snapshot porte les six nouvelles mesures, toutes `| null` |
| `…/tracker.ts` | échantillons horodatés du podomètre (cadence) + marques de tour |
| `packages/engine/src/gps.ts` | `RawFix.alt`, `rawFixesToRunPoints` la recopie, **`smoothTrace` moyenne l'altitude** |
| `packages/shared/src/game-rules.ts` §« ÉCRAN DE COURSE 2026 » | `LIVE_PACE_WINDOW_S`, `LIVE_CADENCE_WINDOW_S`, `LIVE_LAP_MIN_DURATION_S`, `ELEVATION_SMOOTH_WINDOW_S` |

### L'écran

`apps/mobile/src/features/run/gps/RealCourseLive.tsx` — ligne d'état avec la
précision (`:145-150`), trois grands chiffres (`:153-157`), trois secondaires
(`:162-166`), la boucle (`:169-178`), les kilomètres (`:186-192`), les tours
(`:197-200`), le bouton Tour (`:225`), le verrou (`:230`, `:233-237`),
`LockOverlay` (`:274-307`).

### Les réglages

`apps/mobile/app/parametres/[section].tsx` §`course` — « Pendant la sortie »
porte désormais trois interrupteurs au lieu d'un : haptiques (existant), pause
automatique **à pied** (`:570-581`), pause automatique **vélo** (`:582-592`),
annonces vocales (`:592-606`) avec la note d'honnêteté sur ce que la voix ne sait
pas faire.

---

## 3. Les deux constats trouvés en construisant

### a) 596 m de dénivelé sur une sortie parfaitement plate

En branchant `elevationFrom` (écrit par le lot journal, jamais alimenté) sur une
altitude RÉELLE, le test de contrôle a rendu **596 m de D+ sur 900 m plats**.
Cause : l'hystérésis `ELEVATION_NOISE_M` (3 m) protège d'une DÉRIVE lente, pas
d'une OSCILLATION — et l'altitude d'un GPS de téléphone oscille couramment de
±2 m (l'erreur verticale vaut 1,5 à 3 fois l'erreur horizontale). Chaque
oscillation franchissait le seuil.

Corrigé **à la source** (`smoothTrace`, moyenne glissante sur
`ELEVATION_SMOOTH_WINDOW_S` = 20 s) et pas à l'écran : la valeur lissée est celle
qui part dans `RunPoint.alt`, donc dans `runs.trace_points_2026`, donc celle que
le détail de sortie relira. Lisser côté écran seulement aurait donné deux
dénivelés pour une seule sortie. Test : `liveMetrics2026.test.ts`
« le bruit d'altitude à plat ne fabrique AUCUN relief ».

### b) `snapshot.loopGapM` n'avait aucun lecteur

La distance restante pour refermer la boucle — la mesure qui EST le jeu — était
calculée à chaque tick depuis des mois et n'était affichée nulle part sur l'écran
de course. Elle l'est maintenant, avec l'autorité `loopClosurePhase`, la même que
la voix et que le serveur : un écran qui annoncerait « fermée » sur son propre
seuil promettrait une capture que le serveur refuserait.

---

## 4. La fréquence cardiaque : ce qui manque, et ce que ça coûterait

**Aucune intégration n'existe.** Ni `HealthKit`, ni `expo-health`, ni Bluetooth
LE, ni companion app watchOS : `apps/mobile/package.json` n'a aucune dépendance
de capteur hors `expo-location` et `expo-sensors` (podomètre). `IngestRunRequest`
n'a aucun champ de FC, `runs` aucune colonne. Le lot R **n'a rien implémenté** de
ce côté et l'écran ne montre aucune case FC : une case grisée « — » permanente
promettrait un capteur qui n'arrivera pas.

Estimation d'un lot « HealthKit / Apple Watch », **non engagée** :

| Chantier | Charge | Remarque |
|---|---|---|
| Ceinture/montre BLE (`react-native-ble-plx`) : scan, appairage, `Heart Rate Service 0x180D`, reconnexion | 3-4 j | Le plus rentable : marche sur iOS ET Android, aucune app watchOS |
| Contrat + stockage : `RunPoint.hr?`, colonne, migration réservée `0179`, lecture au détail de sortie | 1 j | Même patron exact que `alt` de ce lot |
| Écran : case FC + zones (5 zones dérivées d'une FC max déclarée dans le profil) | 1,5 j | Les zones exigent une FC max : nouveau champ de profil + écran de réglage |
| HealthKit lecture (FC d'une Watch déjà enregistrée) | 2 j | Ne donne PAS le direct : HealthKit ne diffuse pas en flux vers une app tierce |
| Companion app watchOS (FC en direct + contrôles au poignet) | 8-12 j | Cible Xcode séparée, `WatchConnectivity`, cycle de revue App Store propre. **Le vrai coût** |
| Vie privée : la FC est une donnée de santé (RGPD art. 9) — consentement dédié, export, purge | 1,5 j | Non négociable, et il s'ajoute à toutes les lignes ci-dessus |

**Chemin recommandé** si le fondateur veut la FC : le BLE seul (≈ 5,5 j avec la
vie privée), qui couvre ceintures et montres en mode diffusion, **sans** cible
watchOS. La companion Watch est un projet à part entière, pas un lot.

---

## 5. Ce qui reste hors de portée, et pourquoi

| Manque | Raison | Suite |
|---|---|---|
| **Mode intervalles (INTVL)** | Ne tenait pas dans ce lot sans toucher la chaîne de départ (`RunPreflight`, `confirmStart`, le contrat `RunTracker`) : une séance est un PLAN déclaré AVANT le GO, pas un affichage. Les **tours manuels** sont livrés à la place — ils couvrent le fractionné improvisé, pas la séance programmée | Lot chiffré : moteur pur (répétitions × durée ou distance, récupération, cible, écart) **1,5 j** · écran de composition avant le GO **2 j** · bandeau d'intervalle + décompte + voix **2 j** · résumé au résultat **1 j** · tests **1 j** ≈ **7,5 j** |
| **Beacon (position partagée en direct)** | La doctrine actuelle est explicite : « la trace ne quitte l'appareil QUE dans le payload `ingest_run` de fin de course, zéro position live publique » (`useRealRunCore.ts` en-tête). Le livrer, c'est une décision de vie privée, pas une tâche d'écran | Décision fondateur d'abord |
| **Coéquipiers proches** | `features/run/defense/` calcule déjà une couverture, mais aucune position live n'est publiée (même raison que Beacon) | Même décision |
| **FC et zones** | §4 | §4 |
| **Ducking audio / voix écran verrouillé** | `expo-speech@13` ne touche pas l'`AVAudioSession` et `app.json` ne déclare pas le mode d'arrière-plan `audio` (décision fondateur : pas d'`audio` avant un test sur appareil). **C'est dit dans les réglages**, pas caché | Lot natif, ou décision `app.json` |

---

## 6. Ce qui a été réconcilié depuis `(mvp)/course`

`docs/STATUS.md:23-24` affirmait que le flux du cahier (`/map/prepare` →
`/course-live` → `/course/analyse`) ne portait PAS les correctifs du 02/09 faits
dans `(mvp)/course`. **Vérifié ligne à ligne le 11/09/2026 — c'est périmé** :

| Correctif du 02/09 | État réel dans la chaîne vivante |
|---|---|
| Chrono honnête après kill (`deadMs`) | ✅ déjà réconcilié le 10/09 — `runPipeline.resumedDeadTimeMs`, `useRealRunCore.flush` persiste `deadMs`, `computeSnapshot` le retranche. Verrouillé par `liveChain2026.test.ts` |
| Envoi non bloquant | ✅ `uploadOrQueue` (file FIFO idempotente) + `/course/analyse` sur le chemin |
| Voix | ✅ `liveVoice.ts` + `useRealRunCore` tick — et le lot R y ajoute le kilomètre **et l'interrupteur qui manquait** |
| Maintien 1,2 s (appui long pour terminer) | ❌ **NON réconcilié, et volontairement pas repris ici.** La chaîne vivante protège autrement : « Terminer » n'apparaît qu'**en pause** (`RealCourseLive.tsx:221`), donc jamais sous un pouce qui court, et le **verrou** du lot R met le bouton hors de portée. Un appui long en plus serait une seconde barrière sur un bouton déjà à deux gestes de distance |

**La route MVP n'a pas été réveillée** : aucun fichier de `app/(mvp)/**` n'est
touché par ce lot. Deux modules de `src/mvp/` le sont, et ils appartiennent en
fait à la chaîne vivante qui les importe : `src/mvp/run/gpsProvider.ts`
(`toRawFix`, la seule porte par laquelle `coords.altitude` entre dans l'app) et,
en lecture, `src/mvp/run/feedback.ts` (les règles pures de la voix).

---

## 6 bis. **Livré le 12/09/2026 — la fin de sortie pose une question**

Lot W, décision fondateur du 12/09/2026 : « à la fin, si la personne s'est
trompée, on lui met le message comme quoi il y a un problème avec sa course ;
s'il ne veut pas basculer, on ne comptabilise pas pour certaines choses. »

| Ce qui manquait à cet écran | Ce qui est livré |
|---|---|
| `finish()` appelait `run.finish()` **sans un mot** : une sortie faite à vélo et déclarée « Course » prenait du terrain, des points de classement et l'avancement d'un défi, et n'avait pour seul filet qu'une **revue anti-triche** — une sanction pour une erreur de bouton | Le contrôle est lu **avant** la clôture (`RealCourseLive.tsx` — `finish()` → `run.disciplineVerdict()`), et une feuille bloquante pose la question avec **les chiffres mesurés** : `DisciplineSheet2026.tsx` |
| La cadence du podomètre n'existait que sur les **30 dernières secondes** (ligne 7 du tableau, lot R), et le tableau brut est plafonné : les premières minutes d'une sortie d'une heure disparaissaient | Un second rangement, **une tranche par minute sur toute la sortie** (`motionIntegrity.ts` — `openStepWindows2026` / `addStepSample2026` / `sealStepWindows2026`, PURES et testées) |
| Aucun moyen de corriger une discipline après coup | **Deux issues de même rang, aucune troisième.** Basculer **re-nettoie la trace** aux bornes de la nouvelle discipline ; garder marque la sortie « sport seulement » (migration 0197) |

**Pas d'alerte pendant la course, et c'est structurel** : la discipline est figée
au départ (`tracker.ts`, `readonly activity`) parce qu'elle fixe les bornes de
nettoyage §3.2 de chaque relevé. Le contrôle a donc lieu quand la trace est
complète, là où il est mesurable **et réparable**.

Le détail complet — les seuils, les deux issues, ce qui compte et ce qui ne
compte pas, la relation avec le signal anti-triche — vit dans
**`docs/product/GRYD_DISCIPLINE_2026_09.md`**.

---

## 7. Preuve

| Vérification | Résultat |
|---|---|
| `deno test packages/engine/src/altitude.test.ts` | 8/8 — l'altitude traverse le moteur, une trace sans altitude rend le même verdict qu'avant |
| `deno test supabase/functions/ingest_run/altitude_2026_test.ts` | 5/5 — contrat, écriture `jsonb` sans migration, trace publique restée plane |
| `deno test …/liveMetrics2026.test.ts` | 19/19 — allure instantanée, splits, D+, cadence, tours, et surtout tous les `null` |
| `deno test …/liveScreen2026.test.ts` | 11/11 — couture : l'écran lit bien chaque mesure, le verrou, la voix, les tokens |
| `npm run test:mobile` | 3137/3137 |
| `npm run test:packages` | 322/322 |
| `npm run typecheck` | vert sur `@klaim/engine`, `@klaim/shared`, `@klaim/mobile`, `@klaim/web` |

**Ce qui n'a PAS pu être vérifié ici** : aucune course réelle n'a été enregistrée.
La cadence (podomètre), l'altitude (altimètre), l'écran maintenu allumé et la voix
exigent un **appareil physique** — le simulateur n'a ni podomètre ni altimètre, et
`expo-keep-awake` vient d'entrer dans les dépendances : son module natif n'existera
qu'après un **build EAS**. Les calculs, eux, sont testés sur des traces
déterministes.
