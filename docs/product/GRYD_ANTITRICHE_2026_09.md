# GRYD — Anti-triche : ce que l'application sait détecter, et ce qu'elle ne sait pas

**Date : 10/09/2026 · Lot A (capteurs et anti-triche) · Écrit pour le fondateur.**

Rang 0 applicable : `docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md` §18.4 « Antitriche
proportionnée ». Ce document ne décide rien : il constate, avec le fichier et la ligne, puis
propose. Les décisions restent à consigner dans `docs/DECISIONS.md`.

---

## 0. La réponse courte, en quatre lignes

| Question du fondateur | Réponse | Preuve |
|---|---|---|
| Détecter que ce n'est plus de la course à pied ? | **Oui, depuis ce lot.** Ce ne l'était PAS avant : le podomètre n'atteignait pas le moteur. | `supabase/functions/ingest_run/refonte2026.ts:237` |
| Détecter que ce n'est pas du vélo ? | **Partiellement.** Un moteur rapide, oui. Un scooter à 45 km/h, **non**, et aucune donnée collectée ne le permet. | `packages/engine/src/anticheat.ts:832` · angle mort testé dans `packages/engine/src/anticheat2026.test.ts` |
| Détecter un faux GPS / un simulateur ? | **Partiellement.** Trois signaux le visent ; aucun n'est une preuve. Le seul verrou solide est ailleurs (§4). | `packages/engine/src/anticheat.ts:936` et `:957` |
| Se prémunir du scénario Strava (simuler puis importer) ? | **Oui, totalement, et c'était déjà vrai.** Aucune trace importée ne peut prendre un mètre de territoire. | `supabase/functions/ingest_run/refonte2026.ts:220` + `supabase/migrations/0155_capture_admission_2026.sql:152` |

La quatrième ligne est la plus importante, et c'est la bonne nouvelle : **le scénario exact que
tu décris — installer une application qui simule une course, exporter, importer — ne marche pas
sur GRYD.** Pas parce qu'on détecterait la simulation, mais parce que **le territoire ne se gagne
qu'avec une sortie enregistrée en direct par l'application, ancrée par le serveur**. Une trace
importée compte comme sport ; elle ne prend jamais de terrain. Détail au §4.

---

## 1. Ce qui existe vraiment — et un avertissement de lecture

Le dépôt contient **deux** pipelines d'ingestion. Un seul tourne.

* `supabase/functions/ingest_run/index.ts:1-4` le dit lui-même : *« The sole registered handler
  dispatches to refonte2026.ts. The former handler below is unregistered historical code. »*
* Conséquence à retenir : **tout ce qui vit dans `validate.ts` et `anticheat_wiring.ts`
  (`validateOrStatus`, `planAntiCheat`, `MOTION_TRUST_FLAGGED_BELOW`, `VERIFY_PARTIAL_MIN`,
  les statuts `flagged`/`rejected`) n'est plus exécuté en production.** C'est du code historique
  conservé pour ses tests. Toute lecture de l'anti-triche qui part de ces fichiers décrit un
  système qui ne tourne pas.

Le pipeline actif, `refonte2026.ts`, enchaîne : sauvegarde durable de l'activité → dédup →
adoption de la session d'enregistrement → vérification d'origine et d'horloge → **`scoreRun`**
(le moteur anti-triche pur) → progression sportive → mise en scène de la capture.

Le moteur anti-triche lui-même, `packages/engine/src/anticheat.ts`, est **pur, déterministe,
sans horloge et sans base**. Il rend un avis en quatre décisions (§11.3 de la spec) :
`PASS`, `PASS_WITH_EXCLUSIONS`, `MANUAL_REVIEW`, `REJECT`. Le score est une **moyenne pondérée
des signaux disponibles** — un signal indisponible sort du dénominateur, il n'accuse ni ne
blanchit. C'est la traduction directe de la phrase du cahier : *« Les données de capteurs
disponibles apportent des signaux ; leur absence n'est pas une preuve de fraude. »*

---

## 2. (a) « Ce n'est plus de la course à pied »

### Ce que le moteur fait AUJOURD'HUI

| Contrôle | Où | Effet |
|---|---|---|
| Précision hors borne (> 25 m) | `packages/engine/src/validation.ts:95` | **le point est jeté** |
| Silence > 3 min | idem | **le segment est coupé** (le temps mort quitte le chrono) |
| Saut > 100 m (course) / 300 m (vélo) | idem | **le segment est coupé** |
| Vitesse instantanée > 25 km/h (course) / 80 km/h (vélo) | idem | **le point est jeté** |
| Part de la durée passée au-dessus du plafond | `anticheat.ts` signal `sustained_speed` | signal **décisif** : au maximum, refus |
| Accélération impossible (> 3 m/s², max à 10) | signal `acceleration` | signal bruité, non escaladant seul |
| Trace trop régulière (dispersion de vitesse sous le plancher humain) | signal `trace_regularity` | escalade seule → **vérification** |
| Cohérence pas/distance | `validation.ts:292` + signal `step_coherence` | escalade seule → **vérification** |
| **Vitesse soutenue sur 5 min au-dessus de la borne de la discipline** | `anticheat.ts:832` — **ajouté ce lot** | escalade seule au-delà du plafond |
| **Discipline déclarée contredite** | `anticheat.ts:886` — **ajouté ce lot** | escalade seule → **vérification** |

### Le défaut qui existait, et il était grave

`step_coherence` est le seul signal capable de dire « ce déplacement n'est pas pédestre ». Le
mobile collecte les pas depuis des mois (`Pedometer.watchStepCount`,
`apps/mobile/src/features/run/gps/tracker.ts:187`), les transmet
(`IngestRunRequest.stepCount`), et le pipeline historique les stockait.

**Le pipeline actif ne les passait jamais à `scoreRun`.** Le signal sortait donc
« indisponible » sur **chaque course de production**. La donnée existait, la règle existait, le
fil entre les deux était coupé.

Mesure, sur une trace synthétique de vélo à 23 km/h déclarée « course » (30 min, 11,5 km,
téléphone sur le guidon) :

* sans le podomètre → **créditée**, territoire pris ;
* avec le podomètre → **vérification requise**, aucun territoire.

Test : `supabase/functions/ingest_run/anticheat2026_test.ts`, « un vélo déclaré "course" est
signalé — et il ne l'était pas sans podomètre ».

Un second défaut, plus discret, allait avec : le payload n'envoyait `stepCount` **que s'il était
strictement positif**. « Aucun podomètre sur cet appareil » et « un podomètre a tourné pendant
12 km sans compter un seul pas » arrivaient au serveur sous la même forme — un champ absent.
Le second cas est pourtant l'observation la plus parlante qu'un téléphone sache produire. Il
est désormais transmis (`apps/mobile/src/features/run/motionIntegrity.ts`).

### Ce que le joueur voit

Rien d'accusatoire, et c'est volontaire. `apps/mobile/src/features/refonte/captureReceipt2026.ts:112` :

> **« Vérification nécessaire — Cette activité nécessite une vérification avant de modifier le
> terrain partagé. »**

L'activité reste enregistrée, les statistiques et les XP sportifs sont attribués indépendamment
(cahier §5.5 règle 8). Aucun score, aucune sévérité, aucun seuil n'est montré — §11.2 :
« paramètres serveur, non exposés comme règles de contournement ».

> **Une phrase à corriger, hors de ce lot.** Tous les autres motifs finissent par « Ta sortie
> est enregistrée. » ; celui-ci non. C'est la seule ligne du parcours qui laisse le joueur sans
> la réassurance que ses données sont conservées. Fichier :
> `apps/mobile/src/features/refonte/captureReceipt2026.ts:112` (lot UI).

### Les limites, dites franchement

* Le podomètre est **désactivable par le tricheur** : refuser la permission « Mouvements et
  forme » supprime le signal, et l'absence n'accuse jamais. C'est un choix constitutionnel
  (§18.4) qu'il ne faut pas défaire — mais il faut le savoir.
* Un téléphone dans une poussette ou un sac à dos produit peu de pas sur une vraie course. Le
  motif `discipline_mismatch` exige donc **deux faits simultanés** (vitesse soutenue de vélo
  **et** absence de foulée) précisément pour ne pas transformer ce cas en accusation.
* Le seuil « pédestre / non pédestre » (0,5 pas/m) n'a **jamais été calibré sur des données
  réelles**. La base compte 3 comptes et 0 donnée de jeu.

---

## 3. (b) « Ce n'est pas du vélo » — la réponse la plus faible

Elle est faible, et il vaut mieux l'entendre maintenant.

* Un **moteur rapide** est vu : au-delà de 60 km/h soutenus (la borne basse déclarée du vélo,
  `BIKE_AVG_PACE_MIN_S_KM`), la sévérité monte, et au ras de 80 km/h elle escalade seule.
  Une voiture d'autoroute est refusée par le signal décisif `sustained_speed`.
* Un **scooter à 45 km/h**, un cyclomoteur, une voiture en ville : **rien ne les distingue d'un
  cycliste rapide.** Les bornes du vélo sont larges **par choix** — le cahier §18.4 interdit de
  « punir une descente rapide », et une descente alpine tient 60 km/h plusieurs minutes. Le
  podomètre ne départage pas non plus : un cycliste et un scootériste produisent tous deux zéro
  foulée.

Cet angle mort est **verrouillé par un test vert exprès**
(`packages/engine/src/anticheat2026.test.ts`, « ANGLE MORT ASSUMÉ — un scooter à 45 km/h
déclaré "vélo" passe encore »), pour qu'il soit lisible dans la suite de tests plutôt que
découvert en production.

**Ce qui le fermerait**, et rien d'autre :

1. la **cadence de pédalage** (capteur externe ANT+/BLE — non collectée, et exige un appairage) ;
2. le **type de mouvement rendu par l'OS** : `CMMotionActivityManager` côté iOS distingue
   `walking` / `running` / `cycling` / `automotive`, sur des données déjà calculées par le
   coprocesseur. C'est la piste la plus rentable du document ; elle est chiffrée au §8.

---

## 4. (c) et (d) Le faux GPS et l'import de traces

### Ce qu'iOS et Android permettent réellement

| Plateforme | Simuler une position sans jailbreak ? | GRYD peut-il le savoir ? |
|---|---|---|
| iOS, appareil nu | **Non.** Pas d'API de mock. | Sans objet |
| iOS + Mac branché (Xcode / simulateur de localisation) | **Oui**, appareil déverrouillé pour le développement, câble requis | **Non.** iOS n'expose aucun drapeau |
| iOS jailbreaké | Oui | **Non** |
| Android + options développeur (« application de position fictive ») | **Oui, en trois taps, sans root** | **Oui** : `LocationObject.mocked` |

Le drapeau Android est désormais lu, transporté et persisté :
`apps/mobile/src/mvp/run/gpsProvider.ts` (`toRawFix`) →
`apps/mobile/src/features/run/motionIntegrity.ts` → `IngestRunRequest.mockedLocation` →
`runs.mocked_location_2026` (**migration `0174`**) → signal `mocked_location`
(`packages/engine/src/anticheat.ts:957`).

Trois états, et la différence est le sujet même du champ : **absent** (la plateforme n'a rien
dit — tout iOS, tout l'historique), **`false`** (l'appareil a répondu « non », c'est une mesure),
**`true`**. Un `default false` en base aurait fait affirmer à toutes les courses iOS « aucune
simulation détectée » là où personne n'a regardé ; la migration l'interdit explicitement et le
test le prouve.

**Ce n'est pas une preuve** : un binaire recompilé omettrait le champ. Ce drapeau attrape
l'usage d'une application de simulation par quelqu'un qui n'a pas recompilé GRYD — c'est-à-dire
le scénario réel, celui des tutoriels de triche.

### Les signatures statistiques d'une trace fabriquée

| Signature | Détectée ? | Où |
|---|---|---|
| Vitesse trop lisse (interpolation) | **Oui**, et depuis avant ce lot | signal `trace_regularity` |
| Précision constante | **Oui**, ajouté ce lot | `anticheat.ts:936` |
| Cadence d'échantillonnage parfaite | **Non — et c'est structurel** | voir ci-dessous |
| Altitude plate | **Non** — la donnée n'existe pas | `RunPoint` ne porte que lat/lng/t/acc |
| Aucune variation barométrique | **Non** — non collectée | idem |
| Aucun pas | **Oui**, depuis ce lot | §2 |

> **Pourquoi la cadence d'échantillonnage ne peut pas servir de signal serveur.** Le client
> décime la trace avant de l'envoyer (Douglas-Peucker, `packages/engine/src/gps.ts:475`) : il
> conserve les points géométriquement significatifs, ce qui rend les intervalles de temps de
> **toute** trace GRYD très irréguliers, honnête ou non. Le serveur ne voit jamais la cadence
> d'origine. Mesurer la régularité des horodatages après décimation ne mesurerait que la
> décimation. C'est écrit dans le moteur plutôt que tenté.

Le signal de précision constante est **volontairement non escaladant seul**. Une précision
rigoureusement figée veut dire « cette série ne porte aucune information » — ce qui est vrai
d'un simulateur **et** d'un appareil qui ne mesure pas vraiment sa précision. La trace ne
permet pas de les distinguer ; trancher seul condamnerait un jour un vieil Android honnête. Il
converge avec `trace_regularity` : ensemble, ils décrivent une trace que rien de vivant ne
produit. Un carve-out explicite écarte le cas où toutes les valeurs égalent la borne substituée
par le client quand l'appareil n'en fournit aucune.

### (d) L'import de traces : le verrou qui rend la question secondaire

GRYD **a** des voies d'import : `apps/mobile/src/features/sources/adapters/` contient GPX
(réel et utilisable), Strava, Apple Health, Health Connect. La question est donc légitime :
quel est leur poids dans le territoire ?

**Réponse : zéro. Deux verrous indépendants.**

1. **Applicatif.** `sourceClockVerdict2026` (`refonte2026.ts:220`) n'accorde `sourceVerified`
   qu'à `source === 'gps'`, **avec** une session d'enregistrement émise par le serveur
   (`recording_sessions_2026`), **avec** des horodatages croissants et une dérive d'horloge sous
   tolérance. Toute autre origine rend `source_or_clock_unconfirmed`.
2. **Base.** `supabase/migrations/0155_capture_admission_2026.sql:152` refuse indépendamment :
   `if r.source is distinct from 'gps' then return ... 'source_or_clock_unconfirmed'`. Et sans
   session : `no_recording_session`.

Autrement dit : **le territoire ne se gagne qu'avec une sortie enregistrée EN DIRECT par
l'application, ancrée par une session serveur.** C'est exactement la parade totale au scénario
que tu décris, et elle existait déjà — mais elle n'était écrite nulle part en clair, et deux
tests la verrouillent désormais (`anticheat2026_test.ts`, « aucune source autre que le GPS live
ne peut être vérifiée » et « la SQL exige elle aussi le GPS — deux verrous, pas un »).

Un import GPX ou Strava reste utile : il alimente le journal, les statistiques, la progression
sportive. Il ne prend pas un mètre de terrain, et il ne le prétend pas.

> **À surveiller.** Ce verrou est aussi ce qui rend la fonctionnalité Apple Watch et les
> intégrations montres inoffensives — et ce qui les rendra frustrantes le jour où un joueur
> voudra capturer avec sa montre. Ce sera une décision produit, pas un bug ; elle devra passer
> par un chemin de vérification équivalent, pas par une exception.

---

## 5. (e) Attestation d'appareil (App Attest / Play Integrity)

**Non fait. Rien dans le dépôt ne s'en approche.**

| | Apple App Attest / DeviceCheck | Google Play Integrity |
|---|---|---|
| Ce que ça couvre | l'app est bien la nôtre, non modifiée, sur un appareil Apple non compromis | l'app est bien la nôtre, installée par le Play Store, sur un appareil certifié |
| Ce que ça ne couvre pas | **une position simulée sur un appareil sain** (Mac branché), et tout ce qui se passe en amont du capteur | idem |
| Coût technique | module natif + endpoint de challenge côté serveur + stockage des clés d'attestation | SDK + endpoint de vérification |
| Coût juridique | traitement à part entière : base légale, information, durée de conservation, mention en politique de confidentialité | idem |

Estimation honnête : **5 à 8 jours** pour l'un ou l'autre, dont au moins un jour de travail
juridique. Ce que ça achète : il devient impossible de parler à `ingest_run` depuis un script,
un émulateur ou un binaire modifié. Ce que ça n'achète pas : la détection d'un faux GPS.

**Recommandation : pas maintenant.** Ce n'est pas la meilleure dépense tant que la base compte
3 comptes. Le jour où le classement d'une saison vaut quelque chose, App Attest devient le
verrou qui empêche l'automatisation industrielle — c'est-à-dire le seul scénario où quelqu'un
prend la peine de recompiler.

---

## 6. (f) La revue humaine — le maillon manquant

### Le circuit réel

`supabase/migrations/0081_anticheat_review.sql` crée deux tables :

* `anticheat_reviews` — une ligne par sortie non créditée : décision système
  (`MANUAL_REVIEW` | `REJECT`), score 0-100, **et les signaux avec leurs preuves chiffrées**.
  Un statut (`open` / `in_progress` / `closed`), une décision finale (`upheld` /
  `overturned` / `partially_overturned`), un opérateur, une note.
* `anticheat_appeals` — le droit de réponse du joueur : un appel par revue, sur sa course.

**RLS strictement personnelle**, sans exception « membres du crew » : un joueur voit **ses**
revues et **ses** appels, jamais ceux d'un autre. L'écriture client est réduite à l'INSERT d'un
appel, **sur trois colonnes** (`review_id`, `user_id`, `message`) — il ne peut pas se rendre
justice tout seul. C'est prouvé, ligne à ligne, par
`supabase/tests/anticheat_review.pglite.test.mjs`.

L'écran du joueur existe : `apps/mobile/app/appel.tsx` (E28).

### Le défaut que ce lot ferme, et celui qu'il ne ferme pas

**Fermé :** jusqu'à aujourd'hui, `anticheat_reviews` était **vide par construction**. Le
pipeline actif calculait bien une décision et refusait la capture — mais n'écrivait ni le
score, ni les signaux, nulle part. Une sortie repartait sans terrain et le dépôt entier était
incapable de dire pourquoi : ni pour un opérateur, ni pour le joueur qui fait appel. La ligne
est désormais écrite (`refonte2026.ts:261`), en *best-effort* (la capture est déjà refusée : un
échec d'écriture d'audit ne doit pas coûter au joueur son résultat sportif) et idempotente par
la contrainte unique.

**Pas fermé, et c'est le point le plus important de ce document :**

> **Personne ne dépile la file.** Il n'existe aucun rôle d'opérateur, aucune habilitation,
> aucune interface d'administration, aucun endpoint qui passe une revue en `closed`. Vérifié :
> les seuls consommateurs de `anticheat_reviews` dans le dépôt sont l'écran d'appel du joueur,
> l'export de compte, et l'ingestion.

Conséquence à assumer : **une sortie envoyée en vérification est, en pratique, définitivement
non créditée.** Tant que c'est vrai, aucun texte ne doit promettre un examen ni un délai — et
aucun ne le fait aujourd'hui. Le docblock de `apps/mobile/app/appel.tsx:30-35` affirme en
revanche *« aucune ligne n'entre dans anticheat_reviews »* : **cette phrase est devenue fausse
avec ce lot** et doit être corrigée par le lot UI (fichier hors de mon périmètre).

C'est aussi ce qui fixe le réglage de l'anti-triche : tant qu'il n'y a pas d'opérateur, **une
vérification coûte cher au joueur**, donc les signaux qui escaladent seuls doivent être ceux
qui ne se trompent quasiment jamais. C'est le critère qui a été appliqué signal par signal.

---

## 7. (g) Ce que font les autres — court, et sans flatterie

**Strava.** Trois choses, et elles sont instructives :

1. un contrôle automatique de plausibilité qui **marque** l'activité (« suspicious activity »)
   au lieu de la supprimer ;
2. un **signalement communautaire** sur les classements de segment : ce sont les autres coureurs
   qui repèrent l'anomalie, et un modérateur tranche ;
3. la sanction porte **sur le classement du segment**, pas sur le compte.

La leçon utile pour GRYD n'est pas la liste de signaux : c'est que **la revue humaine et le
signalement par les pairs font le gros du travail**, l'automatique ne servant qu'à trier. GRYD
n'a ni l'un ni l'autre. C'est là que se situe le vrai retard, pas dans les seuils.

**Zwift.** Sur home trainer, tout est simulé par nature : la parade est matérielle (capteurs
certifiés, doubles mesures poids/puissance) et **contractuelle** pour les compétitions
(vérification vidéo, double enregistrement). Rien de transposable à GRYD, sauf le principe :
les enjeux élevés se protègent par des procédures, pas par des seuils.

**Runkeeper et compagnie.** Détection minimale, parce que l'enjeu est minimal — on triche peu
sur un journal personnel. **GRYD n'est pas dans ce cas** : le territoire est un bien rival, pris
à quelqu'un. C'est ce qui justifie l'effort, et c'est aussi ce qui rend un faux positif plus
coûteux qu'ailleurs : refuser une course honnête, c'est laisser un rival garder un quartier.

---

## 8. Feuille de route

### Maintenant (fait dans ce lot)

| Chantier | État |
|---|---|
| Podomètre transmis au moteur dans le pipeline actif | **fait** |
| Un zéro pas MESURÉ transmis (au lieu d'être jeté avec l'absence de capteur) | **fait** |
| Vitesse soutenue sur fenêtre glissante de 5 min | **fait** |
| Motif « discipline » explicite pour un vélo déclaré « course » | **fait** |
| Uniformité de précision (signature de simulateur) | **fait** |
| Drapeau de position simulée Android, bout en bout + migration `0174` | **fait** |
| Écriture de la revue avec score et preuves chiffrées | **fait** |
| Verrou « territoire = GPS live ancré serveur » verrouillé par des tests | **fait** |

### Saison 0 — avant d'ouvrir à des inconnus

| Chantier | Effort | Ce que ça achète |
|---|---|---|
| **Un opérateur, même seul.** Une vue SQL protégée + un rôle + une procédure écrite. Rien d'autre : pas d'interface. | **1-2 j** | Rend la vérification réversible. Sans ça, tout le reste est un refus déguisé. C'est le chantier n° 1, loin devant. |
| **Altitude dans `RunPoint`** (champ + payload + persistance) et deux signaux : altitude figée, dénivelé incohérent avec le relief. `expo-location` fournit déjà `coords.altitude`. | **2-3 j** | La signature la plus franche d'une trace fabriquée, aujourd'hui invisible. |
| **Module natif Core Motion** (esquisse ci-dessous) | **3-5 j** | Ferme l'angle mort du §3 : l'OS dit `cycling` ou `automotive`. |
| **Corriger la copie** « Vérification nécessaire » (+ « Ta sortie est enregistrée ») et le docblock de `appel.tsx` | **< 1 h** | Cohérence de la parole produit. |
| **Calibrer les seuils sur des traces réelles** (une dizaine de sorties honnêtes : course, vélo, marche/course alternée, poussette, sac à dos) | **1-2 j** | Le seuil pédestre de 0,5 pas/m n'a jamais vu une donnée réelle. |

### Plus tard — quand le classement vaudra quelque chose

| Chantier | Effort | Ce que ça achète |
|---|---|---|
| **Signalement par les pairs** sur un territoire contesté, avec file de revue | **5-8 j** | Le vrai levier de Strava. Passe à l'échelle, contrairement aux seuils. |
| **App Attest / Play Integrity** | **5-8 j** (dont juridique) | Ferme l'automatisation industrielle. Inutile avant. |
| **Empreintes de traces antérieures** (`priorTraceFingerprints`, déjà prévu par le moteur, jamais alimenté) | **2 j** | Détecte le rejeu d'une même boucle par un même compte. |
| **Cadence de pédalage** (capteur BLE) | **8-13 j** | Ferme définitivement le vélo. Exige un appairage : réservé au vélo sérieux. |

### Esquisse du module natif Core Motion (à ne PAS construire ici)

Patron : `apps/mobile/modules/gryd-run-film` (module natif local, sources commitées, build EAS).

* **iOS.** `CMMotionActivityManager.startActivityUpdates` rend, sans coût énergétique notable,
  une suite d'activités déjà calculées par le coprocesseur de mouvement :
  `stationary` / `walking` / `running` / `cycling` / `automotive`, chacune avec un niveau de
  confiance. Échantillonner **par fenêtre** (une entrée par minute suffit), envoyer la
  répartition en pourcentage avec la trace.
* **Android.** Équivalent via `ActivityRecognitionClient` (Play Services), permission
  `ACTIVITY_RECOGNITION` — déjà déclarée par `expo-sensors`.
* **Contrat serveur.** Un champ `motionBreakdown?: Record<string, number>` sur
  `IngestRunRequest`, une colonne jsonb, et un signal `os_activity_mismatch` : « course
  déclarée, 80 % `automotive` selon l'OS ». C'est le seul signal du document qui distinguerait
  un scooter d'un cycliste.
* **Permission.** Elle est déjà demandée pour le podomètre : aucun nouveau consentement.
* **⚠️ À écrire dans la politique de confidentialité** avant de livrer : la répartition
  d'activité est une donnée de santé au sens du RGPD. Elle ne doit jamais sortir vers un SDK
  marketing (cahier §18.5), ni entrer dans un profil public.

---

## 9. Ce que je n'ai pas pu vérifier

* **Aucune donnée réelle.** La base de production compte 3 comptes et 0 donnée de jeu
  (`CLAUDE.md`). Tous les chiffres de ce document viennent de traces **synthétiques de test**.
  Aucun seuil n'a été confronté à un vrai coureur, à un vrai cycliste, ni à un vrai simulateur.
* **Le comportement réel d'`expo-location` sur Android** : que `LocationObject.mocked` remonte
  bien `true` avec une application de position fictive n'a pas pu être vérifié sur appareil
  (build EAS requis, pas de build local possible ici).
* **La RLS réelle** de `anticheat_reviews` : PGlite tourne en superutilisateur. On prouve que
  les policies existent et ce qu'elles nomment, jamais qu'un tiers se fasse refuser.
  `npm run verify:rls` (réseau + secret) reste à passer après le push de `0174`.
* **La fréquence des faux positifs.** Le signal d'uniformité de précision suppose qu'aucun
  téléphone courant ne rend une précision rigoureusement constante sur plus de 60 relevés. C'est
  une hypothèse raisonnable, ce n'est pas une mesure.

---

## 10. Ce qu'il reste à décider (pour `docs/DECISIONS.md`)

1. **Le pipeline historique.** `validate.ts` / `anticheat_wiring.ts` / la moitié d'`index.ts`
   décrivent un système qui ne tourne plus. Les conserver comme archives est légitime ; laisser
   croire qu'ils décident quelque chose ne l'est pas. Faut-il les marquer explicitement
   « ARCHIVE — NON ENREGISTRÉ » en tête de fichier ?
2. **L'opérateur de revue.** Qui ? Sous quelle habilitation ? Avec quel délai annoncé — ou
   assumé comme non annoncé ?
3. **Le seuil de tolérance produit.** Aujourd'hui le réglage est prudent : un signal n'escalade
   seul que s'il ne se trompe quasiment jamais. C'est le bon réglage **tant que personne ne
   dépile la file**. Le jour où un opérateur existe, il devient trop prudent.
4. **La dette de constantes.** `packages/engine/src/anticheat.ts` porte encore ses seuils de
   décision en local (`ANTICHEAT_REVIEW_AT`, `ANTICHEAT_REJECT_AT`, les poids). Les remonter dans
   `game-rules.ts` est un déplacement pur ; il n'a volontairement pas été fait dans le même lot
   qu'un changement de comportement.
