# GRYD — « TU T'ES TROMPÉ DE DISCIPLINE » (lot W, 12/09/2026)

> **Décision fondateur, 12/09/2026, mot pour mot** : « je pense que le mieux
> c'est qu'à la fin, si la personne s'est trompée, on lui mette le message comme
> quoi il y a un problème avec sa course ; s'il ne veut pas basculer, on ne
> comptabilise pas pour certaines choses ».

Ce document dit **le contrôle**, **les seuils**, **les deux issues**, **ce qui
compte et ce qui ne compte pas**, et **la relation exacte avec le signal
anti-triche**. Il ne promet rien au-delà du code : chaque affirmation porte son
`fichier:symbole`.

---

## 1. Le problème, tel qu'il existait

Se tromper de bouton au départ est l'erreur la plus banale du produit. Avant ce
lot, elle n'avait **qu'une seule issue côté serveur**, et c'était la plus dure :

| Ce qui se passait | Où |
|---|---|
| La sortie partait avec `activity: 'run'` déclarée au départ, figée | `apps/mobile/src/features/run/gps/tracker.ts` — `readonly activity` |
| Le moteur voyait « vitesse de vélo + zéro pas » et levait `discipline_mismatch` | `packages/engine/src/anticheat.ts` — signal 11 |
| La sortie était **gelée** et une **revue humaine** convoquée | `supabase/functions/ingest_run/refonte2026.ts` — `requiresReview2026`, `anticheat_reviews` (0187) |
| L'écran n'avait **jamais rien demandé** | `RealCourseLive.finish()` appelait `run.finish()` sans un mot |

Et l'autre sens — vélo déclaré, course mesurée — **n'était calculé nulle part**.

Une sanction pour une erreur de bouton, sans jamais poser la question. C'est ce
que ce lot corrige.

---

## 2. Le contrôle

**Une seule définition**, dans le moteur PUR :
`packages/engine/src/disciplineCheck2026.ts` — `checkDeclaredDiscipline2026(points, stepWindows, declared)`.

Elle est lue par **les deux** consommateurs, et c'est le point important :
l'écran de fin et le signal anti-triche ne peuvent pas dire deux choses
différentes de la même trace.

```
checkDeclaredDiscipline2026(points, stepWindows, declared)
  → { declared, suspected: 'bike' | 'run' | null,
      evidence: { sustainedKmh, stepsPerMin, windowS, reason? } }
```

### 2.1 Deux faits qui tiennent ensemble, sur la MÊME fenêtre

Aucun des deux sens ne se conclut sur une moitié de motif :

| Déclaré | Soupçonné si… | ET si… |
|---|---|---|
| `run` | une fenêtre soutenue **au-dessus de 21,2 km/h** | la cadence y est **quasi nulle** (≤ 10 pas/min) |
| `bike` | une fenêtre soutenue à **cadence de foulée** (≥ 140 pas/min) | la vitesse y est **sous 15 km/h** |

Pourquoi les deux : *vite* tout seul, c'est peut-être un très bon coureur ;
*zéro pas* tout seul, c'est peut-être un téléphone dans une poussette ; *cadence*
toute seule, c'est peut-être un cycliste secoué sur des pavés ; *lent* tout seul,
c'est une côte ou des feux rouges.

### 2.2 Les seuils

`packages/shared/src/game-rules.ts`, section « DISCIPLINE 2026 » —
`DISCIPLINE_CHECK_2026`.

| Constante | Valeur | D'où elle vient |
|---|---|---|
| `windowS` | 300 s | **`ANTICHEAT_SUSTAINED_WINDOW_S`**, la fenêtre du signal anti-triche. Une fenêtre différente produirait deux vérités sur la même trace |
| `runLooksLikeBikeKmh` | **3600 / `RUN_AVG_PACE_MIN_S_KM`** ≈ 21,2 km/h | **DÉRIVÉE**, pas inventée : c'est la borne que le produit appelle lui-même « borne basse anti-vélo » depuis toujours, et que le pipeline historique opposait à l'allure MOYENNE (`pace_too_fast`). L'appliquer à 5 minutes est **plus doux** que la règle d'origine |
| `noStrideMaxSpm` | 10 pas/min | 50 pas sur cinq minutes. Délibérément **très bas** : l'écran accuse un fait mesuré (« aucun pas »), jamais une cadence « trop faible » |
| `runCadenceMinSpm` | 140 pas/min | La cadence d'une foulée, y compris lente. Un pédalage ne la produit pas (un podomètre compte des IMPACTS) ; une marche soutenue plafonne plus bas |
| `bikeLooksLikeRunKmh` | 15 km/h | Sans elle, un cycliste en descente à 35 km/h avec quelques faux pas serait invité à « basculer en course » — une absurdité |
| `stepCoverageMin` | 0,9 | Une fenêtre que le podomètre n'a pas écoutée à 90 % n'est **pas jugée**. Sans ce garde-fou, un capteur démarré en retard ferait lire « zéro pas » sur une portion que personne n'a mesurée : l'accusation serait **fabriquée** |
| `DISCIPLINE_STEP_BUCKET_S` | 60 s | La taille d'une tranche de podomètre côté mobile |

Trois nombres neufs seulement (`noStrideMaxSpm`, `runCadenceMinSpm`,
`bikeLooksLikeRunKmh`), plus la couverture. Tout le reste est dérivé.

### 2.3 Ce qui n'est pas mesuré n'est pas jugé

`suspected: null` avec un **motif** dans `evidence.reason` :

| Motif | Ce qui a manqué |
|---|---|
| `no_window` | aucune portion continue n'atteint 5 minutes |
| `no_steps` | **aucun podomètre n'a tourné** — tout navigateur, tout simulateur, une permission « Mouvement et forme » refusée |
| `steps_not_covering` | un podomètre a tourné, mais pas sur les fenêtres mesurées |

`null` **ne veut pas dire « c'est propre »** : il veut dire « rien ne contredit
la déclaration, **ou** rien n'était mesurable ». C'est `reason` qui distingue les
deux, et c'est ce qui interdit à un écran de féliciter quelqu'un pour une
vérification qui n'a pas eu lieu.

### 2.4 Les tranches de podomètre

`apps/mobile/src/features/run/motionIntegrity.ts` —
`openStepWindows2026` / `addStepSample2026` / `sealStepWindows2026`, PURES.

Le tracker garde déjà des relevés bruts pour la cadence LIVE, **plafonnés** à 240
entrées : sur une sortie d'une heure, les premières minutes ont disparu. Le
contrôle de fin, lui, a besoin de toute la sortie. D'où un second rangement, à
une tranche par minute, **contigu depuis l'instant où le capteur a commencé
d'écouter** :

- une tranche **présente à zéro** est une **mesure** (personne n'a posé un pied) ;
- une tranche **absente** veut dire « personne n'écoutait », et le moteur refuse
  de juger cette portion.

---

## 3. Les deux issues

L'écran : `apps/mobile/src/features/run/gps/DisciplineSheet2026.tsx`, monté par
`RealCourseLive.tsx` **entre le tap sur « Terminer » et `run.finish()`**. À cet
instant, le tracker vit, la trace est en mémoire **et** sur le disque de reprise,
rien n'est parti au serveur, la discipline du payload n'est pas figée.

> **Un problème avec ta sortie**
> Pendant 5 minutes, tu allais à 24 km/h sans aucun pas. Ça ressemble à du vélo.
> *Si tu gardes, la sortie compte pour ton journal, tes kilomètres, tes jours
> actifs et ton XP. Elle ne compte ni pour le terrain, ni pour les classements,
> ni pour les défis, ni pour les quêtes de la semaine.*
> *Dans les deux cas, ta sortie est enregistrée.*
>
> [ C'était du vélo : basculer ]  [ Garder en course ]

**Deux boutons de même rang** : même style, même taille, **aucun accent
chartreuse** — teinter l'un des deux désignerait « la bonne réponse », c'est-à-dire
déciderait à la place de quelqu'un dont on ne sait pas ce qu'il a fait.

**Aucune troisième issue** : ni croix, ni « plus tard », ni tap hors zone, ni
`onRequestClose`. Verrouillé par
`apps/mobile/src/features/run/disciplineChain2026.test.ts`.

**Pas d'alerte pendant la course.** La discipline est figée au départ parce
qu'elle fixe les bornes de nettoyage §3.2 appliquées à chaque relevé : la
rebasculer en pleine sortie produirait une trace filtrée à deux barèmes, un objet
que plus aucune règle ne saurait juger.

### 3.1 Basculer

`payload.activity` devient la discipline mesurée et `payload.disciplineSwitchedFrom`
porte l'ancienne.

**La trace est RE-NETTOYÉE aux bornes de la nouvelle discipline**
(`runPipeline.effectiveActivity`). Sans ça, on enverrait une trace amputée par
les 25 km/h de la course sous une étiquette qui ne l'ampute pas : une distance
fausse, donc un mensonge de l'app au sens le plus littéral.

Basculer **ne dispense de rien**. Le serveur rejuge tout avec les seuils du vélo,
qui exigent **plus** de distance et **plus** de surface minimale.

### 3.2 Garder

`payload.disciplineMismatchKept = true` **avec l'évidence chiffrée** — un « il n'a
pas voulu basculer » sans dossier serait un reproche nu.

Le serveur scelle `runs.sport_only_reason_2026 = 'discipline_mismatch_kept'`
(migration **0197**) à la première écriture, comme les signaux de capteur : un
renvoi du même `clientRunId` ne peut pas changer ce que la sortie vaut.

---

## 4. Ce qui compte, ce qui ne compte pas

Une sortie « sport seulement » reste **`status = 'valid'`**.

| | Compte | Où c'est garanti |
|---|---|---|
| Journal des sorties | ✅ | lecture directe de `runs` par RLS (`features/history/real.ts`) |
| Kilomètres, jours actifs (crew) | ✅ | `crew_member_measures_2026` (0188), `crew_member_activity_2026` (0189) — **non gardées, volontairement** |
| XP de progression | ✅ | `record_progress_evidence_2026` ne lit que `user_id` ; et `disciplineAnswered` **éteint** le signal, donc l'évidence reste `eligible` |
| Série, statistiques sportives | ✅ | mêmes lectures de `runs` |
| **Terrain (capture)** | ❌ | `stage_capture_2026` (0197 §3) — refus **avant** tous les autres motifs |
| **Points de territoire / classements** | ❌ | `board_eligible_events_2026` (0161) exige `status='published'` ; aucun événement ne l'atteint |
| **Défis de crew** | ❌ | `stage_game_activity_2026` (0197 §4) — retour **avant** la première boucle |
| **Quêtes de la semaine** | ❌ | faits de quête joints sur un événement `published` ; `validated_group_outing` gardée (0197 §5) |
| Notification | ⚠️ | fait `run_sport_only` — « Sortie gardée en l'état · Elle compte pour toi, pas pour le terrain. » |

### 4.1 Où la garde est posée, et pourquoi à ces trois endroits

`stage_capture_2026` est le **producteur unique** de `capture_events_2026` : un
refus prononcé là fait tomber en cascade le terrain, les classements, les faits
de quête, la garde de face des défis et `runs.game_status_2026`.

Deux endroits lui échappaient, et ils sont gardés séparément :

- **`stage_game_activity_2026`** — la garde de face de 0169 n'exclut que
  `withdrawn`, `consent_withdrawn` et `source_deleted` : un événement `rejected`
  la **traverse**. Sans le §4, un défi de crew aurait continué de compter les
  mètres d'une sortie sans terrain ;
- **`weekly_quest_satisfied_2026`**, branche `validated_group_outing` — la seule
  condition de quête qui lise `runs` **directement**.

### 4.2 Ce qui reste compté, et c'est voulu

Trois lectures de `runs` ne sont **pas** gardées, et c'est une décision :

- **`weekly_quest_active_days_2026`** (0167) lit le **registre de progression**,
  pas `runs`. Une quête « deux journées actives » reste donc satisfaite. Ce n'est
  pas une fuite : retirer ce jour reviendrait à retirer l'XP, donc à contredire
  la règle d'à côté ;
- **`crew_member_measures_2026`, `crew_member_activity_2026`,
  `sweep_crew_inactivity_2026`** comptent des kilomètres et des jours de
  présence. Exclure la sortie ferait passer pour inactif quelqu'un qui a couru —
  une punition, pas une règle de jeu ;
- **`referral_qualifying_run_2026`** (0186) atteste qu'un filleul a vraiment fait
  une sortie. C'est un fait sportif, pas un gain sur les autres.

### 4.3 Ce que garder N'ACHÈTE PAS, dit franchement

Quelqu'un qui pédale, déclare « course » et répond « garder » **conserve son XP
sportif et ses kilomètres** pour une sortie à vélo. C'est la conséquence directe
de la décision fondateur (« on ne comptabilise pas pour **certaines** choses »),
et elle est assumée : il perd tout ce qui se gagne **contre les autres** —
terrain, classement, défi, quête — c'est-à-dire tout ce qui aurait fait de son
erreur un avantage.

---

## 5. La relation avec le signal anti-triche

Le signal `discipline_mismatch` **appelle la même fonction**
(`packages/engine/src/anticheat.ts`, signal 11). Il en diffère sur **deux points
délibérés**, tous deux écrits dans le code.

### 5.1 Il ne retient qu'UN SENS

Le contrôle regarde les deux sens ; l'anti-triche ne retient que « course
déclarée, vélo mesuré ». Déclarer « vélo » et courir **n'avantage personne** (les
bornes vélo exigent plus de distance et plus de surface), et en faire un soupçon
reviendrait à accuser quelqu'un de marcher (cahier §8.3).

### 5.2 Il est PLUS INDULGENT que l'écran de fin

Le mobile range son podomètre par tranches d'une minute ; `ingest_run` ne reçoit
et ne scelle qu'un **CUMUL** (`runs.step_count`). Il applique donc la même
fonction à **une tranche unique**, c'est-à-dire à une cadence **moyenne**
(`wholeRunStepWindow2026`).

Conséquence, mesurée et testée : quelqu'un qui court 2 km puis pédale 20 garde
une cadence moyenne au-dessus du plancher, et **le serveur ne voit rien** là où
l'écran de fin aurait vu la fenêtre. C'est le partage voulu : **l'écran de fin
PROPOSE** (il a la meilleure mesure), **le serveur RATTRAPE** les cas les plus
nets — ceux où aucun pas n'a été compté de toute la sortie.

### 5.3 Les trois cas, côté serveur

| Cas | Ce que fait le serveur |
|---|---|
| **Le client a basculé** | `run.activity` est déjà la nouvelle discipline (scellée à l'upsert) : `analyzeTrace2026`, les bornes §3.2, `scoreRun` et `TERRITORY_RULES_2026[activity].minAreaM2` la jugent avec **ses** seuils |
| **Le client a gardé** | `disciplineAnswered: true` **ÉTEINT** le seul signal `discipline_mismatch`. Le prix est déjà prélevé par 0197 ; convoquer en plus une revue marquerait l'évidence de progression en `review` et coûterait son **XP** à la sortie — exactement ce que la décision fondateur lui garde. **Tous les autres signaux pèsent toujours** (position simulée, trace dupliquée, vitesse soutenue, horodatages futurs) |
| **Le client n'a rien dit** | **Comportement d'avant ce lot, à la ligne près** : si le serveur voit le motif, la sortie part en revue |

**Pourquoi le troisième cas doit rester.** Le silence du client ne prouve rien :
un appareil **sans podomètre** ne PEUT PAS poser la question (tout navigateur,
tout simulateur, une permission refusée), et une application modifiée pourrait
choisir de ne pas la poser. Le serveur reste donc seul juge, avec la mesure qu'il
possède.

---

## 6. Ce qui a changé, fichier par fichier

| Fichier | Ce qui y entre |
|---|---|
| `packages/shared/src/game-rules.ts` | section « DISCIPLINE 2026 » : `DISCIPLINE_CHECK_2026`, `DISCIPLINE_STEP_BUCKET_S`, `DISCIPLINE_UNAVAILABLE_2026`, `SPORT_ONLY_REASONS_2026`, fait `run_sport_only` |
| `packages/engine/src/disciplineCheck2026.ts` | **neuf** — `checkDeclaredDiscipline2026`, `sustainedWindows2026`, `fastestSustainedWindow2026`, `wholeRunStepWindow2026` |
| `packages/engine/src/anticheat.ts` | signal 11 réécrit sur la fonction partagée ; `sustainedWindowKmh` devient une enveloppe ; `AntiCheatInput.disciplineAnswered` |
| `packages/engine/src/capture2026.ts` | motif `discipline_mismatch_kept` au registre |
| `packages/shared/src/types.ts` | `IngestRunRequest.disciplineSwitchedFrom` / `.disciplineMismatchKept` / `.disciplineEvidence` |
| `apps/mobile/src/features/run/motionIntegrity.ts` | rangement PUR du podomètre par tranches |
| `apps/mobile/src/features/run/gps/tracker.ts` | alimente les tranches, expose `disciplineVerdict()`, `buildPayload(choice)` |
| `apps/mobile/src/features/run/gps/runPipeline.ts` | `runDisciplineVerdict2026`, `DisciplineChoice2026`, re-nettoyage à la discipline effective |
| `apps/mobile/src/features/run/gps/DisciplineSheet2026.tsx` | **neuf** — la feuille bloquante |
| `apps/mobile/src/features/run/gps/RealCourseLive.tsx` | le contrôle avant la clôture |
| `apps/mobile/src/features/journal/JournalSection2026.tsx`, `app/course/[id].tsx` | badge « Sport seulement » + sa raison ; état dédié du bloc Territoire |
| `supabase/functions/ingest_run/{index,refonte2026}.ts` | validation, scellement, recalcul |
| `supabase/migrations/0197_sport_only_runs_2026.sql` | colonne, famille du motif, trois gardes, catalogue et producteur de notification |

**Export RGPD** : `export_account/personalTables.ts` projette `runs` sans liste de
colonnes (`select *`) — la colonne sort automatiquement, et
`personalTables_test.ts` le vérifie.

### 6.1 Dette déclarée — deux champs validés, pas persistés

`disciplineSwitchedFrom` et `disciplineEvidence` sont **contrôlés à la porte**
(`ingest_run/index.ts` — `isActivityShape`, `isDisciplineEvidenceShape`) puis
**ne sont écrits dans aucune colonne**. C'est écrit dans le code, à côté du code,
et testé.

Pourquoi c'est acceptable :

- la **bascule** est déjà entièrement visible dans `runs.activity`, qui porte la
  nouvelle discipline ;
- la **preuve** n'est pas perdue : `runs.trace_points_2026` et `runs.step_count`
  sont **scellés à la première écriture**, et `checkDeclaredDiscipline2026` est
  déterministe — le serveur peut recalculer ce qu'il aurait vu.

Ce qui n'est **pas** rejouable, c'est l'affichage **exact** : le mobile range son
podomètre par tranches d'une minute, le serveur n'a qu'un total (§5.2). Si une
revue en a besoin un jour, c'est une colonne `jsonb` de plus — pas une refonte.

---

## 7. Ordre de déploiement — **contraignant**

`features/history/real.ts` et `features/history/detailRead.ts` demandent
`sport_only_reason_2026` dans leur `select`. Une base qui n'a pas reçu 0197
répond **42703** et **tout le journal** bascule en « échec de lecture ».

1. `supabase db push` (0197) ;
2. redéploiement d'`ingest_run` ;
3. build mobile.

C'est la même règle que pour `trace_points_2026` en 0118.

---

## 8. Preuve

| Vérification | Résultat |
|---|---|
| `packages/engine/src/disciplineCheck2026.test.ts` | 21/21 — course honnête, course en fait vélo, vélo honnête, vélo en fait course, sans podomètre, podomètre en retard, pureté, désordre |
| `apps/mobile/src/features/run/disciplineChain2026.test.ts` | 10/10 — le contrôle AVANT l'envoi, deux boutons de même rang, aucune troisième issue, le choix jusqu'au payload et jusqu'à l'archive |
| `apps/mobile/src/features/run/motionIntegrity.test.ts` | 19/19 — dont 9 sur le rangement par tranches |
| `supabase/tests/sport_only_runs_2026.pglite.test.mjs` | 22/22 — **étape 0 rejouée** : la même quête est satisfaite avant 0197 et ne l'est plus après |
| `supabase/functions/ingest_run/discipline2026_test.ts` | 7/7 — forme acceptée, scellement, les trois cas du recalcul |
| `npm run gate` | vert (typecheck 4/4, sync sans drift, migrations, packages, mobile, functions, SQL) |
| `noDashFr2026`, `node scripts/audit-routes.mjs` | verts |

**Ce qui n'a PAS pu être vérifié** : **aucune sortie réelle n'a été enregistrée**.
Le podomètre n'existe ni en navigateur ni en simulateur — la feuille ne s'affiche
donc jamais hors d'un appareil physique, puisque sans podomètre le contrôle rend
`no_steps` et se tait. Les seuils, les deux sens et tous les silences sont prouvés
sur des traces synthétiques déterministes ; l'effet géométrique du refus de
capture n'est pas exécutable sous PGlite (pas de PostGIS) et est vérifié par
lecture du fichier de migration.
