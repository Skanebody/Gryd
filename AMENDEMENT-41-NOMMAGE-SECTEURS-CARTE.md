# AMENDEMENT-41 — Nommage des secteurs (partout en Europe) + simplification carte + formes de course

> **Rang documentaire** : amendement le plus récent → prime sur AMENDEMENT-02..40 sur les points traités ici.
> Complète AMENDEMENT-12/-16 (boucle→zone), AMENDEMENT-35 (Europe entière), AMENDEMENT-37 (étude carte)
> et `GRYD_REGLES_NON_NEGOCIABLES.md` §C (couleurs par rôle / LOD) — les précise, ne les contredit pas.
> Source : trois questions fondateur (17/07/2026) sur le nommage hors Paris, la lisibilité moi/rival/crew,
> et le sort du coureur « qui veut juste courir ».
> **Statut : décisions FERMES.** Livré : commit `5cb10b6` (nommage). Schéma des formes : artefact dédié.

---

## Contexte

Trois trous à combler pour tenir « **cours et prends du territoire n'importe où en Europe** » (AMENDEMENT-35) :

1. « République » est un lieu de Paris. **Comment nomme-t-on un pâté de rue à Ouville-la-Rivière ?**
2. Sur la carte, **comment montrer simplement** mes zones, celles des rivaux, les chevauchements — et pareil pour les crews ?
3. **Celui qui veut juste courir** (boucle, presque-boucle, aller-retour, tracé qui ne ferme rien) — que capture-t-il ?

---

## §1 — Nommage des secteurs : reverse-geocode + hiérarchie de repli + cache (LIVRÉ `5cb10b6`)

**Deux échelles H3, une seule nommée.**
- **Secteur = H3 res 7** (`SECTOR_H3_RESOLUTION = 7`, ~5 km²) → l'unité **NOMMÉE** et agrégée (« République », « Le Marais »).
- **Zone/cellule = H3 res 10** (`H3_RESOLUTION = 10`, ~0,015 km²) → l'unité **CAPTURÉE** (une rue, un pâté).

**Le nom vient du monde réel, jamais d'un dur.** On prend le **centre du secteur** → **reverse-geocode Nominatim OSM** (gratuit, sans clé) → on choisit le nom le plus **localement reconnu** via une **hiérarchie de repli** (`packages/shared/src/sectorName.ts`, PURE, testée) :

| Priorité | Champ OSM | Paris | Ouville-la-Rivière |
|---|---|---|---|
| 1 | `neighbourhood` / `quarter` / `city_block` | « République » / « Folie-Méricourt » | — |
| 2 | `suburb` / `city_district` / `borough` | « Le Marais » / « 11e » | — |
| 3 | `hamlet` / `isolated_dwelling` / `locality` | — | « Le Bourg » |
| 4 | `village` / `town` / `city` / `municipality` | « Paris » | **« Ouville-la-Rivière »** |
| 5 | `road` / `pedestrian` (faute de mieux) | « Rue du Temple » | « Rue de l'Église » |
| 6 | **repli de GRILLE** (`gridFallbackLabel`) | « Secteur 48,9N · 2,4E » | « Secteur 49,8N · 1,0E » |

**Règles fermes :**
- **Jamais un faux lieu.** À défaut de tout nom OSM (ou réseau HS) → étiquette de **grille neutre** (coordonnées FR, N/S · E/O), pas une invention. Cohérent « l'app ne ment jamais ».
- **Un secteur ne change pas de nom** → **cache** (mémoire + `AsyncStorage`, clé = id de secteur). Le repli de grille n'est **jamais** caché (on renomme quand le réseau revient).
- **Dégradation douce** : dense = quartier iconique ; rural = hameau/village/commune. La promesse Europe tient sans jamais fabriquer de données (respect « zéro donnée EU factice », `no-fake-europe-data`).
- **V1** : le pré-calcul serveur des secteurs (§C) appellera la **MÊME hiérarchie pure** (`sectorNameFromAddress`) — un seul algorithme client + serveur.

**Preuve live (Nominatim, 17/07/2026)** : République → « Quartier de la Folie-Méricourt » · Ouville-la-Rivière → village réel · Westminster (UK) → « Westminster ». Câblé aujourd'hui dans le Route Planner (nom du départ/secteur).

---

## §2 — Simplification de la carte : UN calque par RÔLE, jamais une pile

Formalise `GRYD_REGLES_NON_NEGOCIABLES.md` §C. **On ne superpose JAMAIS trois calques** (mes zones + zones rivales + chevauchements).

- **Un seul calque de secteurs**, chacun coloré par son **RÔLE relatif à MOI** (palette RELATIVE, jamais l'identité du crew) : **moi/mon crew = chartreuse** · allié = chartreuse secondaire · **rival dominant = orange** · **contesté = violet + double contour** · neutre = gris. **Jamais > 2 crews fortement colorés** sur une zone (moi + rival principal) ; les autres → agrégés **au tap**.
- **Le « chevauchement » n'est pas deux zones translucides** : c'est **l'ÉTAT d'UN secteur**. Chaque `SectorView` (`engine/sectors.ts`) porte `minePercent` / `rivalPercent` / `neutralPercent` + `pressure_score` (0-100) → **5 niveaux** (Stable → Pression → Contesté → Attaque → Urgence). Les **%** ne s'affichent qu'**au tap** (« République · 62 % toi · 30 % Canal »). Contesté = **couleur + forme + animation + icône** (jamais la couleur seule — daltonisme).
- **Solo vs crew = le MÊME rendu, un regroupement différent.** `deriveSectorView(sector, myCrewId, allyCrewIds)` : en solo « moi » = mes captures ; en mode Crew « moi » = mon crew (coéquipiers → alliés). **Une seule logique de couleur** ; le toggle « Crew » ne change QUE ce qui compte comme « à moi ». La carte se lit en < 3 s : pas « qui possède quoi » en absolu, mais **ton rapport de force**.
- **LOD par zoom** (jamais 200 000 runners) : pays → villes/fronts chauds · ville → secteurs contestés · quartier → territoires/frontières/routes · rue → tracé exact · live → toi + objectif. Rival = **halo orange approximatif** (jamais son GPS/nom) ; inconnus = invisibles.
- **Backend** : pré-calcul par secteur (`owner_crew_id`, `owner_percent`, `top_rival_crew_id`, `top_rival_percent`, `neutral_percent`, `status`, `pressure_score`…) → le client reçoit tuiles + secteurs agrégés + statuts, jamais toute la base. **LIVRÉ** : table `sector_snapshot` (0037) + job `recompute_sectors` + moteur pur `engine/sectorSnapshot` (roule `sector_control` → owner/rival/neutre + pression + statut §C, viewer-indépendant). Restes : signaux d'activité (last_attack_at, reprises rivales) et création+nommage des secteurs « wild » à l'ingest (le nommage §1 est prêt à y être rejoué).

---

## §3 — Formes de course → territoire : « personne ne rate une zone »

Consolide AMENDEMENT-12 §B + AMENDEMENT-16 §2 (constantes gelées `game-rules.ts`). **Principe fondateur :**

> **Trace un trait, tu prends la rue. Ferme la boucle, tu prends la zone.**

Toute course valide capture **le couloir de cellules res-10 traversées**. La boucle (l'intérieur du polygone) est un **BONUS**. Quatre cas, quatre issues honnêtes :

| Forme | Ce que tu prends | Garde-fous (interieur) | Message |
|---|---|---|---|
| **Boucle fermée** (retour ≤ `LOOP_CLOSE_TOLERANCE_M` 80 m, ou auto-intersection) | couloir **+ intérieur (zone)** | périmètre ≥ 1 km · largeur ≥ 80 m · compacité ≥ 0,12 · GPS ≥ 80 · aire ≤ 3 km² | « Boucle validée » |
| **Presque bouclée** | couloir seul + aperçu zone fantôme sous `LOOP_PREVIEW_DISTANCE_M` 300 m | — | « Ferme ta boucle » (invite, jamais forcé) |
| **Tout droit / aller-retour** | couloir seul (les rues courues) | — | « tu prends la rue » — aucun échec |
| **Boucle trop étroite** (rues parallèles proches) | couloir seul, **intérieur refusé** | largeur < `LOOP_MIN_WIDTH_M` 80 m | « Zone non capturée : forme trop étroite » |

**Règles fermes :**
- **Toute course valide capture au moins son couloir.** On ne « rate » jamais une zone : au pire on garde les rues courues.
- Les garde-fous (GPS douteux → intérieur non attribué mais course valide ; micro-boucle sous `LOOP_MIN_PERIMETER_M` 1 km ; forme filiforme ; aire plafonnée à `LOOP_MAX_AREA_CAP_KM2` 3 km²) **bloquent la triche, jamais un coureur honnête** — seuls des **messages doux** changent (`capReached`, `loopRejectedReason`).
- La mise en scène (`LOOP_HINT_DISTANCE_M` 600 m pointillé, `LOOP_PREVIEW_DISTANCE_M` 300 m aperçu) rend la boucle **désirable** pour qui la veut, **invisible** pour qui veut juste courir.
- Chaque zone prise porte le **vrai nom** de son secteur (§1).

**Schéma visuel** (FAQ/onboarding) : artefact « Ce que tu captures selon la forme de ta course » — 4 cartes diagramme, charte noir/blanc/chartreuse. À porter dans la couche explicabilité (AMENDEMENT-23 C2) en V1.

---

## Arbitrages figés

- **A1** — Nommage = OSM réel via hiérarchie de repli + cache ; repli de grille neutre, **jamais un faux lieu**. Secteur = res 7 (nommé), zone = res 10 (capturée).
- **A2** — Carte = **un calque par rôle** (relatif à moi), contesté/chevauchement = **état d'un secteur** (%+pressure+5 niveaux au tap), solo/crew = **même rendu, regroupement différent**, LOD strict, jamais 200k runners.
- **A3** — **Personne ne rate une zone** : couloir toujours pris, boucle = bonus, garde-fous anti-triche seulement. Constantes = `game-rules.ts` (aucun nombre magique).
- **A4** — Un **seul algorithme de nommage** (pur, partagé) client + serveur ; le pré-calcul serveur des secteurs est un chantier V1 (O-list infra).
