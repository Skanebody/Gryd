# Rapport vérification éléments planche

Généré par `node scripts/verify-planche-elements.mjs` — **ne pas éditer à la main**.

| Total | PASS | WARN | FAIL |
|------:|-----:|-----:|-----:|
| 25 | 25 | 0 | 0 |

## Légende

| usefulness | Sens |
|---|---|
| requis / utile | Doit être **branché** (code + source réelle ou état vide honnête) |
| maquette seule | Placeholder planche — doit être **absent** du produit |
| différé O1 | Utile mais source manquante — **absent volontaire** OK |
| à retirer | Ancien / démo — doit avoir **disparu** |

| wiring | Sens |
|---|---|
| branché | Preuves `checks` toutes vertes |
| partiel | Certaines preuves manquent |
| non branché | Aucune preuve |
| absent OK | Absence voulue (maquette / O1 / retire) |


## E02

| Verdict | Id | Utile ? | Branché ? | Élément |
|---|---|---|---|---|
| ✅ PASS | `E02.header.avatar` | requis | branché | Header · avatar → Profil |
| ✅ PASS | `E02.header.pill_lieu` | requis | branché | Header · pill lieu (ville réelle, pas inventée) |
| ✅ PASS | `E02.header.quartier` | différé O1 | absent OK | Header · sous-label « · Centre / quartier » |
| ✅ PASS | `E02.header.cloche` | utile | branché | Header · cloche (événements territoriaux réels) |
| ✅ PASS | `E02.fabs.capsule` | requis | branché | Capsule FABs Recentrer + Calques |
| ✅ PASS | `E02.map.ego_pin` | requis | branché | Pin joueur (uniquement si fix GPS réel) |
| ✅ PASS | `E02.map.boucle_pointillee` | requis | branché | Boucle mission pointillée chartreuse |
| ✅ PASS | `E02.map.label_distance` | utile | branché | Label carte distance (ex. « 900 M ») |
| ✅ PASS | `E02.sheet.first_mission` | requis | branché | Sheet · PREMIÈRE MISSION (kicker + titre + ligne) |
| ✅ PASS | `E02.sheet.metriques_game_rules` | requis | branché | Sheet · métriques 900 m / ≈ 6 min depuis game-rules |
| ✅ PASS | `E02.cta.go_morph` | requis | branché | CTA GO / RUN morph pill ↔ rond |
| ✅ PASS | `E02.sheet.pas_de_second_cta` | requis | branché | Sheet première mission sans CTA chartreuse dupliqué |
| ✅ PASS | `E02.etats.location_matrix` | requis | branché | États critiques position (matrice mapPlan) |
| ✅ PASS | `E02.nav.trois_onglets` | requis | branché | Nav Carte · Crew · Profil |
| ✅ PASS | `E02.maquette.placeholders` | maquette seule | absent OK | Placeholders maquette absents (Dieppe, Nina, 1,84 km²…) |
| ✅ PASS | `E02.map.cadrage_44pct` | différé O1 | absent OK | Caméra · position joueur à 44 % hauteur |

### `E02.header.quartier`

> Aucune source secteur réelle fiable pour le sous-label — absente volontairement.

- ✓ absent (OK) _(ne pas peindre un quartier inventé)_

### `E02.sheet.pas_de_second_cta`

> §A.4 — GO porte l’action ; FirstMissionPeek ne doit pas peindre un Button chartreuse.

- ✓ pas de Button dans FirstMissionPeek _(FirstMissionPeek ne doit contenir aucun Button)_

### `E02.map.cadrage_44pct`

> Cadrage planche non encore calé (padding camera MapLibre).

- ✓ absent (OK) _(pas encore branché — deferred OK)_


## E14

| Verdict | Id | Utile ? | Branché ? | Élément |
|---|---|---|---|---|
| ✅ PASS | `E14.switch.run_bike` | utile | branché | Commutateur Run/Bike (flag + lentille) |
| ✅ PASS | `E14.sheet.bike_copy` | utile | branché | Première mission Bike · copie + métriques ×5 |


## E01

| Verdict | Id | Utile ? | Branché ? | Élément |
|---|---|---|---|---|
| ✅ PASS | `E01.promesse.titre` | requis | branché | Onboarding · COURS. PRENDS TA VILLE. |


## E06

| Verdict | Id | Utile ? | Branché ? | Élément |
|---|---|---|---|---|
| ✅ PASS | `E06.preflight.gate` | requis | branché | Préflight avant live (gate course-live) |


## X

| Verdict | Id | Utile ? | Branché ? | Élément |
|---|---|---|---|---|
| ✅ PASS | `X.route.aujourdhui_orpheline` | différé O1 | absent OK | Route /aujourdhui — utile ? non branchée (orpheline connue) |
| ✅ PASS | `X.route.crew_edit` | utile | branché | Écran /crew-edit — utile et écriture serveur (porte nav à surveiller) |
| ✅ PASS | `X.routes.audit` | requis | branché | Audit routes (orphelins / liens morts) disponible |
| ✅ PASS | `X.demo.vitrine_retiree` | à retirer | absent OK | Mode vitrine / fakeHexes hors chemin Carte live |
| ✅ PASS | `X.verify.planches_script` | requis | branché | Ce vérificateur est branché dans npm (verify:planches) |

### `X.route.aujourdhui_orpheline`

> Écran potentiellement utile (hub quotidien) mais sans porte stable — inscrit dans audit-routes KNOWN_ORPHANS. Ne pas peindre de lien mort.

- ✓ présent

### `X.route.crew_edit`

> L’écran écrit via RPC crew_edit (plus un stub). Toujours listé orphelin dans audit-routes si aucune surface ne le pousse — vérifier les portes Crew.

- ✓ présent
- ✓ absent (OK) _(ne doit plus être un redirect stub)_

### `X.demo.vitrine_retiree`

> fakeHexes peut encore exister pour tests ; MapScreen ne doit plus peindre la démo.

- ✓ absent (OK)

