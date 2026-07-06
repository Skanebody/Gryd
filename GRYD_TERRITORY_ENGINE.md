# GRYD Territory Engine

> **L'artefact à protéger.** Le moteur propriétaire de GRYD — celui qui transforme
> une course réelle en une action de jeu **fiable, lisible et contestable**.
>
> **En une phrase** : le GRYD Territory Engine prend une trace GPS brute et en
> décide, côté serveur et de façon déterministe, quel territoire est capturé,
> défendu ou volé — avec un score et une mission recommandée que le joueur peut
> comprendre et un rival peut contester.

Ce document est **descriptif** (il documente le code existant, il ne le change
pas). Le moteur vit dans `packages/engine/src/` (16 modules **purs**, TS strict,
aucune I/O, aucune horloge, aucun accès réseau/DB). La copie Deno générée
`supabase/functions/_shared/engine/` est **régénérée** par
`node scripts/sync-game-rules.mjs` — **jamais éditée à la main** (drift testé).
Le filet anti-régression : `~/.deno/bin/deno test --allow-read supabase/functions/`.

**Règle constitutionnelle** : aucun nombre magique. Toute constante de jeu vient
de `packages/shared/src/game-rules.ts`. **Tout claim est décidé serveur** — le
client n'attribue jamais un hex.

---

## 1. Le pipeline en un schéma

```
                    ┌─────────────────────────────────────────────────────────┐
   GPS brut  ──────▶│ 1. GPS VERIFY        validation.ts + gps.ts              │
  (RawFix[])        │    filtrage §3.2, trust GPS+motion, trace propre         │
                    └───────────────────────────┬─────────────────────────────┘
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │ 2. NETTOYAGE TRACE   gps.ts (calcul) — jamais l'affichage │
                    │    cleanTrace → segments claimables (validation.ts)       │
                    └───────────────────────────┬─────────────────────────────┘
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │ 3. BOUCLE / ROUTE    hexing.ts (detectLoop) + boundary.ts │
                    │    trace fermée ? partie fermée ? frontière ouverte ?     │
                    └───────────────────────────┬─────────────────────────────┘
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │ 4. ZONES (hexes H3)  hexing.ts                            │
                    │    couloir (hexesForSegments) + intérieur (enclosedCells) │
                    └───────────────────────────┬─────────────────────────────┘
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │ 5. OWNERSHIP         claims.ts (decideClaims) + hex_claims │
                    │    neutre/défense/vol/bloqué, par hex, ordre gelé §3.3/3.4│
                    └───────────────────────────┬─────────────────────────────┘
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │ 6. DÉFENSE / CONTESTATION  coverage.ts + sectors.ts       │
                    │    couverture frontière, pressure_score, 5 statuts        │
                    └───────────────────────────┬─────────────────────────────┘
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │ 7. SCORE             scoring.ts (computeScore)            │
                    │    base §23 × verify × streak × perf → points/Foulées/XP  │
                    └───────────────────────────┬─────────────────────────────┘
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │ 8. MISSION           skills.ts + bonus.ts                 │
                    │    reco skill + bon moment ciblé (jamais random nu)       │
                    └─────────────────────────────────────────────────────────┘
```

Aujourd'hui ces 8 étapes sont câblées **à la main** dans
`supabase/functions/ingest_run/index.ts` (pipeline territorial ~L2023-2161). La
section [§6](#6-point-dentrée-unifié) documente le point d'entrée unique qui
emballe cette composition.

---

## 2. Chaque étape mappée au code réel

Tous les chemins sont relatifs à `packages/engine/src/`. Les fonctions sont
**pures**.

### Étape 1 — GPS Verify (`validation.ts` + `gps.ts`)

Décide si une course **existe** et à quel point on lui fait confiance.

| Fonction | Fichier | Rôle |
| --- | --- | --- |
| `filterPoints(points)` | `validation.ts` | Filtre §3.2 : rejette `acc > POINT_MAX_ACCURACY_M`, coupe un segment sur saut `> POINT_MAX_JUMP_M`, rejette vitesse `> POINT_MAX_SPEED_KMH` et timestamps désordonnés. Retourne des `Segment[]` continus. |
| `computeStats(segments)` | `validation.ts` | Distance / durée / allure moyenne (haversine, hors trous coupés). |
| `validateRun(stats)` | `validation.ts` | Verdict global §3.2 : `too_short` / `too_brief` / `pace_too_fast` / `pace_too_slow` / `no_valid_points`, sinon `valid`. Ordre des raisons **gelé**. |
| `claimableSegments(segments)` | `validation.ts` | Sépare les segments dont l'allure autorise le claim ; `status: 'partial'` dès qu'un segment est exclu (AMENDEMENT-02 §4 — la course reste valide, seuls les segments sûrs claiment). |
| `stepCoherence(distanceM, stepCount?)` | `validation.ts` | Signal GRYD Verify MVP : cohérence pas/distance → `motionTrust` 0-100 (podomètre absent → neutre 100). |
| `gpsTrustScore(cleanTraceResult)` | `gps.ts` | Jauge de confiance GPS 0-100 (accuracy + signal + outliers, pondérée `GPS_TRUST_WEIGHTS`). Un **état honnête**, jamais un jugement. |
| `signalState(nowTs, lastFix?)` | `gps.ts` | État en course : `ok` / `weak` / `lost` (GO-first : informer, jamais bloquer). |
| `verifyFactor(trust)` | `scoring.ts` | Paliers §23 sur `min(gpsTrust, motionTrust)` : ≥80 → ×1,0, ≥60 → ×0,5, <60 → ×0 (stats only). |

### Étape 2 — Nettoyage trace : **calcul ≠ affichage** (`gps.ts`)

Distinction structurante du moteur : la **trace de calcul** (celle qui décide du
territoire) et la **trace d'affichage** (celle qu'on montre) ne sont pas la même.

- **Trace de calcul** — `cleanTrace(fixes)` : rejette outliers (`invalid` /
  `accuracy` / `timestamp` / `speed` / `teleport` / `jitter`), marque les vraies
  discontinuités (`gapBefore` : pas de faux kilomètres en sortie de tunnel),
  collapse les clusters stationnaires (feu rouge). C'est sa sortie qui alimente
  `gpsTrustScore` et, via le contrat `rawFixesToRunPoints`, le filtre serveur.
- **Trace d'affichage** — `smoothTrace(points)` (médiane glissante pondérée
  accuracy) + `decimateForPayload(points)` (Douglas-Peucker léger + plafond
  `GPS_MAX_PAYLOAD_POINTS`). Sert la jauge live, la distance affichée et
  l'envoi réseau — **jamais** le claim.
- Support : `detectPauses`, `totalDistanceM` (haversine hors pauses/hors trous),
  `rawFixesToRunPoints` (pont vers le contrat `IngestRunRequest.points`).

> Le serveur reste **seul juge** : peu importe ce que le client a lissé, `ingest_run`
> ré-applique `filterPoints`/`validateRun` sur les points reçus.

### Étape 3 — Détection boucle / route (`hexing.ts` + `boundary.ts`)

« La boucle fait la zone » (AMENDEMENT-12 §B, AMENDEMENT-16 §2).

| Fonction | Fichier | Rôle |
| --- | --- | --- |
| `loopTracePoints(segments)` | `hexing.ts` | Une boucle n'est détectable que sur **exactement un** segment claimable contigu — sinon `null` (couloir seul). Intégrité : empêche d'enfermer l'aire d'un tronçon non couru (voiture). |
| `detectClosedLoop(points)` | `hexing.ts` | Fermeture par **tolérance** départ/arrivée ≤ `LOOP_CLOSE_TOLERANCE_M`, périmètre ≥ `LOOP_MIN_PERIMETER_M`, aire ≥ 1 zone res 10. |
| `detectLoop(points)` | `hexing.ts` | Détection **unifiée** : tolérance **OU** auto-intersection (le tracé se recroise → la partie fermée fait la boucle ; un « 8 » → la plus grande boucle gagne). Point d'appel canonique. |
| `loopShapeVerdict(loop)` | `hexing.ts` | Anti-abus « boucle trop fine » : compacité `4πA/P²` < `LOOP_MIN_COMPACTNESS` ou largeur `2A/P` < `LOOP_MIN_WIDTH_M` → intérieur refusé (`reason:'narrow'`), course + couloir conservés. |
| `loopMaxAreaM2` / `loopInteriorCellCap(distanceM)` | `hexing.ts` | Anti-abus « boucle trop grande » : plafond d'aire par distance courue (`LOOP_MAX_AREA_BY_DISTANCE_KM2`, capé `LOOP_MAX_AREA_CAP_KM2`). |
| `detectOpenBoundary(trace)` | `boundary.ts` | **Boucle crew collaborative** (AMENDEMENT-17 chantier 2) : un run long non bouclé mais **fermable** ouvre une frontière (« Ouvre une frontière. Ton crew peut la fermer. »). |
| `canComplete(boundary, newTrace, sameCrew)` | `boundary.ts` | Un membre du **même crew** referme la frontière (connexion ≤ `PARTIAL_JOIN_TOLERANCE_M` aux deux bouts, contribution ≥ `FINISHER_MIN_SEGMENT_M` ou part ≥ `FINISHER_MIN_SHARE`). |
| `contributionSplit(segments)` | `boundary.ts` | Répartit la zone fermée au prorata des longueurs validées (somme = 1). |

### Étape 4 — Génération zone : micro-cellules H3 res 10 (`hexing.ts`)

| Fonction | Fichier | Rôle |
| --- | --- | --- |
| `hexesForSegments(segments)` | `hexing.ts` | Le **couloir** : cellules H3 res 10 traversées + tolérance GPS (`TRACE_BUFFER_M`, approximée par 6 échantillons + `gridPathCells`). C'est la rue courue. |
| `enclosedCells(points, corridorCells, res?)` | `hexing.ts` | L'**intérieur** d'une boucle fermée (`polygonToCells` moins le couloir), trié par distance croissante au tracé → l'appelant tronque la fin au plafond. Fallback couloir seul si polygone dégénéré (jamais de crash). |
| `pointInGeoJson(lat, lng, geo)` | `hexing.ts` | Appartenance à un Polygon/MultiPolygon (zones no-capture). |

### Étape 5 — Ownership (`claims.ts` + table `hex_claims`)

Le cœur du moteur. `decideClaims(input)` décide, **par hex** et dans un ordre
**gelé et testé**, l'issue de chaque cellule :

1. `blocked_no_capture_zone` (zone non capturable)
2. `blocked_privacy` (zone privée du coureur)
3. `blocked_daily_cap` (plafond `MAX_CLAIMS_PER_DAY`, §6.4)
4. déjà à moi → `defended` (×1,2 si dernière défense > `DEFEND_COOLDOWN_HOURS`) ou `already_owned_cooldown` (0 pt) — decay repoussé
5. neutre → `claimed_neutral` (action `conquest`/`clean_loop`/`route` × contexte, + bonus **pionnier** par densité si jamais possédé)
6. adverse → `blocked_lock` / `blocked_shield` / `blocked_new_player` (protection < `NEW_PLAYER_PROTECTION_DAYS`) sinon `stolen` (×1,3)

- **Action par hex** : `clean_loop` (×1,1) pour les cellules intérieures d'une
  boucle bien formée (`interiorHexes`), `route` (×0,5) pour un run route-only,
  `conquest` (×1,0) sinon ; `steal` / `defense` pour vol / défense.
- **Contexte par hex** : `deriveContextByHex(input)` produit `contested` (×1,2,
  cellule tenue par un rival crew ≠ le mien) et `crew_mission` (×1,1, offensive
  crew active). Le **plus fort** contexte s'applique — jamais de cumul,
  jamais pay-to-win (`zone_bonus` se gagne par le lieu, jamais acheté).
- **Application** : la sortie `DecideClaimsResult` (résultats + `lockedUntil` +
  `decayAt` + `decayExempt`) est appliquée **atomiquement** par la RPC
  `claim_hexes` sur la table `hex_claims`. Écriture client interdite (RLS,
  service-role via Edge Function).

### Étape 6 — Défense graduée & contestation (`coverage.ts` + `sectors.ts`)

**Défense graduée** (`coverage.ts`, doc §16/§17) :
- `frontierCoverage(frontier, trace)` → fraction 0-1 de la frontière de zone
  couverte au sens du buffer `FRONTIER_COVERAGE_BUFFER_M`.
- `defenseLevel(coverage, closedLoop?)` → `traverse` / `longe` / `cover`.
- `defenseStabilityHours` / `defenseHoursForCoverage` → heures de stabilité
  gagnées (24 / 48 / 72 h) → l'appelant **étend** l'échéance de decay
  (`extendDecay`, `zone.ts`).

**Contestation & pression** (`sectors.ts`, RÈGLES NON NÉGOCIABLES §C — « on ne
colore pas 200 000 utilisateurs, on agrège en secteurs ») :
- `pressureScore(input)` / `pressureBreakdown` → `pressure_score` 0-100
  (activité rival + zones perdues + proximité de bascule + decay,
  `SECTOR_PRESSURE_WEIGHTS`).
- `isContested(input)` → règle « contesté » (`SECTOR_CONTESTED_RULE`).
- `sectorStatus(input)` → 5 niveaux : **stable / pression / contestée / attaque /
  urgence** (bandes `SECTOR_PRESSURE_BANDS` : 0-30 / 31-60 / 61-80 / 81-100).
- `resolveRole` / `deriveSectorView` → **couleur par RÔLE** relatif au joueur
  (`mine` / `ally` / `rival` / `neutral`), jamais par identité de crew.
- Résolution multi-crew d'un hex disputé : `resolveContestedHex` (`social.ts`).

### Étape 7 — Score (`scoring.ts`)

`computeScore(input)` assemble, dans un ordre **gelé** (`Math.floor` partout) :

```
points_finaux = floor( basePoints × verify × streak × perf )
```

1. **base §23** (`decideClaims` → somme de `zoneBasePoints` : `POINTS_BASE_PER_ZONE × action × contexte` + pionnier additif)
2. **verify** `verifyFactor(trust)` — 1,0 / 0,5 / 0
3. **streak** `streakMultiplier(streakWeeks)` — cap `STREAK_MULTIPLIER_CAP` (×1,5)
4. **perf** `performanceModifier(...)` — borné `[0,9 ; 1,15]`

Sorties : `points`, `foulees` (×10 % + `CLUB_FOULEES_MULTIPLIER` si Club), `xp`
(permanent, boosté **ni** par streak **ni** par perf). `distributePointsAdjustment`
répartit le total final par hex sans passer sous 0. Streak/perf sont des
multiplicateurs **externes** à la formule doc ; les bonus payants (`bonus.ts`)
ne touchent **jamais** ce calcul.

### Étape 8 — Mission recommandée (`skills.ts` + mobile `contextualAction`)

- `deriveSkills(stats, SKILLS)` → niveau atteint (0/I/II/III) + progression par
  famille (même source de stats que les badges, `LifetimeStats` de `badges.ts`).
- `rankSkillsForRecommendation(derived)` → classe les skills pour une **reco de
  mission** (niveau le plus haut d'abord, puis progression la plus avancée) →
  War Room « KORO recommandé · Finisher II · 620 m restants ».
- Côté mobile, `contextualAction` traduit cette reco en **une** action à l'écran
  (le bouton flottant contextuel, AMENDEMENT-29) — 1 écran = 1 décision + 1 CTA.

### Modules transverses

| Domaine | Code | Note |
| --- | --- | --- |
| **Boucle collective crew** | `boundary.ts` + `coverage.ts` | Frontière ouverte → complétée par le crew → zone attribuée au crew via `decideClaims`. |
| **Bonus ciblés** | `bonus.ts` | `selectBonus` (le bon moment, jamais random nu), `eligible` (anti-abus complet), `applyBonusReward` (capé +35 %, jamais points/territoire). |
| **Ranking / saison** | `scoring.ts` + `crew.ts` + `challenge.ts` + edge `season_close` | `crewXpForRun`/`cappedCrewXp`, `challengeProgress`/`coopetitionScore`, XP joueur/crew, clôture de saison. |
| **Explicabilité** | AMENDEMENT-23 (couche C2) | Chaque étape expose ses sous-scores (`pressureBreakdown`, `ScoreResult.verifyFactor`, `DerivedSkill.progress`) → page calcul + post-run 2 niveaux. |
| **Anti-triche / collusion** | `social.ts` | `detectGroupRun`, `resolveContestedHex` (runners × trust, égalité jamais volée), `collusionPenalty` (alternances > `COLLUSION_MAX_ALTERNATIONS` → `stats_only`). |
| **Decay 14 j** | `zone.ts` | `zoneStatus` (stable/fragile/à défendre/contestée/protégée/en decay), `initialDecayAt`, `extendDecay` (la défense **étend**, ne reset pas ; cap `ZONE_DECAY_DAYS`). |

### Zones d'exclusion interdites — **déjà câblées serveur**

Les zones **non capturables** (autoroutes, zones militaires…) et les zones
**privées** du coureur sont un input du moteur (`noCaptureHexes` / `privacyHexes`
dans `DecideClaimsContext`), résolu **côté serveur** dans
`supabase/functions/ingest_run/index.ts` :

- `loadPrivacyHexes(userId, hexes)` (~L281) → `privacyHexes`
- `loadNoCaptureHexes(hexes)` (~L304) → `noCaptureHexes`

`decideClaims` les traite en **premier** (`blocked_privacy` /
`blocked_no_capture_zone`, étape 5 ci-dessus). Le moteur reste pur ; la
**source** de ces ensembles est du I/O serveur, à documenter comme tel — pas à
réimplémenter dans le point d'entrée unifié.

---

## 3. Maturité (roadmap fondateur)

| Étape | MVP (fait) | V1.5 | V2 | V3 |
| --- | --- | --- | --- | --- |
| GPS Verify | ☑ filtre §3.2, `gpsTrust`, `motionTrust` (cohérence pas) | ☐ motion intelligence raffinée (podomètre systématique) | ☐ capteurs montre / cadence | ☐ fusion multi-capteurs |
| Nettoyage trace | ☑ `cleanTrace` calcul ≠ `smoothTrace`/`decimate` affichage | ☐ re-ancrage tunnel plus fin | — | — |
| Boucle / route | ☑ tolérance + auto-intersection + anti-abus forme/taille | ☑ frontière crew collaborative | ☐ multi-frontières simultanées | — |
| Zones (H3) | ☑ couloir + intérieur res 10 | ☐ buffer corridor exact (polyline bufferisée) | ☐ LOD multi-résolution | — |
| Ownership | ☑ `decideClaims` ordre gelé + pionnier + lock/shield | ☑ contexte `contested`/`crew_mission` | ☐ `zone_bonus` hotspots de carte | — |
| Défense / contestation | ☑ couverture graduée + `pressure_score` + 5 statuts | ☐ secteurs **pré-calculés serveur** (aujourd'hui dérivés client démo) | ☐ scalabilité 200k (agrégation par zoom industrialisée) | — |
| Score | ☑ base §23 × verify × streak × perf | ☐ perf raffinée (effort réel) | — | — |
| Mission | ☑ `deriveSkills` + `rankSkillsForRecommendation` + reco | ☑ bonus ciblés (`selectBonus`) | ☐ missions génératives par secteur | ☐ IA de recommandation |
| Anti-triche | ☑ `resolveContestedHex`, `collusionPenalty` MVP | ☐ collusion multi-crew (> 2 crews) | ☐ modèle de fraude serveur | — |

> Le socle **pur** des 8 étapes est fait et testé (438 tests Deno verts). Le
> chantier V1.5 dominant est le **pré-calcul serveur des secteurs** (même forme
> d'objet, le client ne fait qu'afficher — §C « backend scalable »).

---

## 4. Le MOAT en 6 points

1. **Ton run n'est jamais perdu** — même `partial` ou `stats_only`, la course
   reste valide et récompensée (couloir/XP) ; le nettoyage sépare calcul et
   affichage pour ne jamais inventer ni jeter de kilomètres.
2. **La boucle fait la zone** — refermer un tracé (tolérance ou auto-intersection)
   capture son intérieur, avec anti-abus intégré (forme trop fine, boucle trop
   grande, GPS douteux).
3. **Le crew défend** — frontière ouverte que le crew complète, défense graduée
   qui **étend** la stabilité, contribution répartie au prorata.
4. **Les règles sont compréhensibles** — un ordre de décision gelé par hex, une
   formule de points multiplicative explicable zone par zone, des statuts nommés.
5. **La carte recommande** — `pressure_score` + 5 statuts + reco de skill
   transforment l'état du territoire en **une** prochaine action lisible.
6. **Le résultat est partageable** — score, tracé héros et carte de conquête
   sortent directement du même pipeline déterministe.

> **Clearance INPI de la marque à faire avant tout usage public** (« GRYD »,
> « Cours. Capture. Défends. »).

---

## 5. Invariants non négociables du moteur

- **Zéro régression.** Tout refactor est une **extraction**, jamais une
  re-conception : aucune valeur de sortie, aucune constante, aucun comportement
  ne change. Les 438 tests Deno restent verts à l'identique.
- **Pur en amont, I/O en aval.** Les 16 modules ne font aucune I/O ; l'appelant
  (`ingest_run`, `digest_job`, `season_close`) lit l'état, appelle le moteur,
  persiste.
- **Aucun nombre magique.** Constantes de `game-rules.ts`, copie Deno générée
  (`sync-game-rules.mjs`, drift testé), jamais éditée à la main.
- **Serveur seul juge.** Le client pré-filtre pour l'affichage ; le claim est
  toujours (re)décidé serveur.

---

## 6. Point d'entrée unifié

`packages/engine/src/engine.ts` **expose désormais DEUX orchestrateurs purs
nommés**, un par algorithme-titre du pipeline territorial. Chacun emballe une
séquence qui était auparavant câblée à la main dans `ingest_run/index.ts` en
**un point d'entrée pur unique**, entrée = trace + état pré-run + contexte,
sortie = décision + score. Toute la logique de jeu se documente et se teste en
un endroit ; l'I/O serveur (chargements, RPC `claim_hexes`, défense graduée
cross-run) reste **dehors**, injecté en argument, jamais ré-implémenté.

### 6.1 `runTerritoryEngine` — #1 conquête solo

- **Séquence** : `filterPoints` → `computeStats` → `validateRun` →
  `claimableSegments` → `loopTracePoints` → `detectLoop` → `loopShapeVerdict` →
  `hexesForSegments` → `enclosedCells` (tronqué à `loopInteriorCellCap`) →
  `deriveContextByHex` → `decideClaims` → `verifyFactor` → `computeScore`.
- **Appelé par** : le handler principal de `ingest_run` (~L2142), à la place de
  la ré-orchestration manuelle des 12 appels.

### 6.2 `runCrewBoundaryClose` — #8 boucle collective crew

- **Rôle** : fermeture de la boucle **collective** d'un crew (l'intérieur d'un
  anneau tracé à plusieurs), symétrique du solo mais **fermée par le crew**, pas
  par un seul runner. Densité de contexte prise **globalement** sur la course.
- **Séquence** : `fullRing` → `enclosedCells` (tronqué à `loopInteriorCellCap`,
  d'où `cappedAt`) → dérivation de contexte globale → décision d'intérieur
  (`claimed_neutral`).
- **Appelé par** : `completeBoundaries` (`ingest_run/index.ts` ~L1474), à la
  place du câblage inline précédent. Mêmes appels, mêmes arguments, mêmes
  sorties qu'avant l'extraction.

### 6.3 Ce qui reste inline — volontairement

Les **flux de soutien** ne sont **pas** des algorithmes-titres et restent câblés
inline dans `ingest_run` par choix :

- **Contestation #6** (défense graduée / pression cross-run) ;
- **Ouverture de route** (couloir hors boucle).

Ce ne sont pas des compositions autonomes candidates à un orchestrateur nommé :
les promouvoir n'apporterait pas de point de test unique et brouillerait la
frontière moteur pur / I/O serveur. On les laisse là où ils sont.

### 6.4 Génération & anti-régression

`engine.ts` est exporté par `index.ts` (`export * from './engine.ts'`) et copié
vers Deno par `scripts/sync-game-rules.mjs` ; le drift test couvre la copie
`_shared/engine/engine.ts`. Les deux extractions sont **bit-à-bit identiques**
aux compositions d'origine (zéro régression) — c'est de l'extraction, pas de la
nouvelle logique. Filet : suite Deno verte à l'identique (446 → 449 avec les 3
tests `runCrewBoundaryClose`).
