# ARBITRAGES — nouvelle spec produit vs dépôt existant

**Daté du 26/07/2026.** La spec `docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` (v1.0) est déclarée
**source de vérité unique** par le fondateur. Ce document liste les points où elle **contredit** le dépôt
ou une décision antérieure, et tranche — parce qu'aucun plan d'implémentation ne tient sans ces réponses.

> **Règle appliquée pour trancher** (§26 de la spec) : réduire la friction, protéger la fiabilité du
> tracking, protéger la confidentialité, garder la logique serveur, minimiser la dette, permettre un
> déploiement progressif.
>
> **Le fondateur a déjà tranché le QUOI** dans son mandat : aucun hexagone, trois onglets, Run/Bike
> séparés, serveur autoritaire, aucun pay-to-win, aucune donnée codée en dur. Ce document ne les remet pas
> en question — il tranche le **COMMENT**, documente le coût, et ne remonte que ce qui change réellement le
> produit. **Aucun point ci-dessous ne bloque le démarrage du chantier.**

---

## A1 — Hexagones H3 → polygones réels *(le QUOI est tranché : aucun hexagone ; je tranche le COMMENT)*

**La spec dit** (§1.4) : « Aucun hexagone. Les territoires suivent des polygones issus des traces réelles
et des rues. » Et §22 refuse un écran qui « utilise de fausses données ».

**Le dépôt dit** : la propriété est stockée en **cellules H3** — `hex_claims` (PK `h3index bigint`, avec
locks anti ping-pong, boucliers, `decay_at`), `h3-js` dans 3 packages, **53 fichiers** touchent H3, et le
rendu carte est une **union de cellules** (`features/map/territoryBuild.ts` → `cellsToTerritory`) : les
bords hexagonaux SONT visibles à l'écran aujourd'hui.

**Nuance importante** : la détection **boucle → polygone existe déjà** (`packages/engine/src/boundary.ts`,
AMENDEMENT-12). Le polygone est calculé, puis **converti en cellules** (`enclosedCells(loop.polygon, hexes)`).
C'est l'étape de conversion, le stockage et le rendu qui sont hexagonaux — pas la détection.

**Trois voies :**

| Voie | Ce que ça donne | Coût | Risque |
|---|---|---|---|
| **1. Rendu seul** — garder H3 en stockage, afficher le polygone lissé | Bords non hexagonaux à l'écran, moteur intact | **S/M** | Le territoire affiché ≠ la surface possédée → l'app **ment** sur ce qu'elle montre. **Rédhibitoire** vu la constitution. |
| **2. Polygone autoritaire + H3 index** — la géométrie PostGIS devient la vérité, H3 reste un index spatial interne jamais exposé | Conforme à la spec, requêtes rapides conservées | **L** | Migration de `hex_claims` + réécriture de l'attribution/intersection ; le decay/lock/bouclier se re-portent sur le polygone. |
| **3. Tout PostGIS, H3 supprimé** | Le plus pur | **XL** | Perte de l'index rapide, réécriture des 53 fichiers d'un coup, gros risque de régression. |

**TRANCHÉ : voie 2.** Elle satisfait la spec (aucun hexagone visible NI dans la propriété), garde la
performance, et se déploie progressivement (double écriture puis bascule). PostGIS est **déjà installé**
(`0001_extensions.sql`). La voie 1 est écartée : elle afficherait un contour lissé sur une propriété
hexagonale — l'app mentirait sur ce qu'elle montre, faute capitale ici. La voie 3 est écartée : réécrire
53 fichiers d'un coup sans index spatial maximise le risque pour un gain nul côté utilisateur.

**Conséquence** : c'est le **lot fondation le plus lourd** du chantier ; il conditionne toute la partie
territoriale (capture, reprise, contestation, défense, classements) et passe donc en premier, avant tout
écran territorial. Séquence de migration en 4 temps, chacune déployable seule et réversible :
`(1)` colonne `geometry(Polygon,4326)` ajoutée + backfill depuis les cellules existantes →
`(2)` double écriture (polygone autoritaire, cellules maintenues comme index) →
`(3)` bascule des lectures/rendu sur le polygone →
`(4)` `h3index` rétrogradé en index interne, jamais exposé. Rollback = revenir à l'étape précédente,
aucune étape ne détruit les cellules avant (4).

---

## A2 — 4 onglets → 3 onglets *(tranché par le mandat ; je tranche la destination des orphelins)*

**La spec dit** (§2.1) : exactement **Carte · Crew · Profil**.
**Le dépôt dit** : `Carte · Crew · Saison · Moi` dans `GrydNavBar`, plus une route `warroom` (Missions)
hors barre. Soit **4 visibles**.

**Ce qu'il faut décider** : où vont **Saison** et **Missions** ?
La spec les garde comme routes (`/season`, `/map/missions`) mais **hors barre** : Saison s'atteint depuis
le Profil (E55 → progression de rang), Missions depuis la Carte (E16, la feuille basse de recommandation).

**TRANCHÉ : on suit la spec.** Saison sous Profil (E55 → progression de rang → `/season`), Missions sous
Carte (E16, depuis la feuille de recommandation). Cohérent avec « maximum deux niveaux de navigation
visibles » ; aucune fonction perdue, seulement un raccourci. **Coût M** (déplacement d'entrées + mise à
jour des deep links de notification, qui doivent continuer d'ouvrir l'écran exact — §13.3).

---

## A3 — Palette : trois chartreuses en circulation → tranché

| Source | Valeur |
|---|---|
| Nouvelle spec §3.2 (`--gryd-primary`) | **#C2FF23** |
| `packages/shared/src/design-tokens.ts` (actuel, appliqué partout) | #C9FF38 |
| `CLAUDE.md` (hérité, périmé) | #B4FF0D |

**Tranché : #C2FF23**, la spec est la source de vérité et le token est **centralisé** — un seul fichier à
changer, tout le reste en dérive. Idem pour l'ensemble de la palette §3.2 (`--gryd-bike #9DDB24`,
`--gryd-defense #8064FF`, `--gryd-rival #FF643C`…), qui introduit des rôles absents aujourd'hui.
**Coût S.** Action annexe : purger la valeur périmée de `CLAUDE.md` pour ne pas laisser trois vérités.

---

## A4 — ⚠ COLLISION DE NUMÉROTATION E01-E26 (piège à régressions)

Le dépôt utilise **déjà** `E01`-`E26` pour les planches « Vague 1 » — et la nouvelle spec réutilise ces
identifiants pour **d'autres écrans** :

| ID | Dépôt (Vague 1, docs/design/vague-1/) | Nouvelle spec |
|---|---|---|
| E01 | Onboarding · promesse | Promesse visuelle *(compatible)* |
| E06 | Connexion | Authentification *(compatible)* |
| E11 | Classement local | **Carte principale** ⚠ |
| E13 | Crew Home | Recherche de lieu ⚠ |
| E22 | Défense · zone attaquée | **Défense active (activité)** ⚠ |
| E23 | Notifications & activité | **Pause** ⚠ |

**Tranché** : la numérotation **E00-E79 de la nouvelle spec fait foi** dans tout code, ticket, test E2E et
event analytics à partir d'aujourd'hui. Les documents `docs/design/vague-1/**` sont **archivés** et leurs
identifiants doivent être préfixés `V1-` quand on les cite. Sans cette règle, un agent « corrigera » l'écran
Classement en croyant travailler sur la Carte.

---

## A5 — Tutoiement vs vouvoiement → tranché (le dépôt gagne)

La spec écrit ses exemples au **vouvoiement** (« Chaque boucle fermée peut devenir **votre** territoire »,
« **Vos** zones restent en jeu »). Le dépôt **tutoie** partout, par décision fondateur explicite, et c'est
verrouillé par des tests (`copyDiscipline.test.ts`).

**Tranché : on garde le tutoiement.** Le vouvoiement des exemples de spec est un artefact de rédaction,
pas une décision de marque ; le changer casserait la cohérence de 5 catalogues i18n et des tests qui le
verrouillent. La spec elle-même (§0) admet la primauté d'une « contrainte démontrée », et §26 dit de
trancher les détails ordinaires. *Un mot suffit à inverser si le ton voulu était vraiment le vouvoiement —
c'est un `sed` sur les catalogues, pas une refonte.*

---

## A6 — Le bouton « GO » (AMENDEMENT-38) vs CTA contextuels

**Le dépôt** : le bouton d'action central s'appelle **« GO »** (override fondateur explicite, AMENDEMENT-38,
consigné en mémoire projet « ne pas le repasser en verbe contextuel »).
**La spec** : les CTA nomment l'action (`DÉMARRER` en E17, `CONQUÉRIR`/`DÉFENDRE`/`REPRENDRE` sur les zones).

**Tranché : les deux coexistent sans se contredire.** Ils ne parlent pas du même bouton — « GO » est le
bouton d'action **central de la barre** (raccourci permanent), les CTA nommés sont ceux **des écrans de
décision** (préparation, zone). La spec ne décrit pas de bouton central de barre. On garde « GO » à la barre
et on applique les CTA nommés partout ailleurs.

---

## A7 — Langues : 5 en place, 3 demandées → tranché

Spec §16 : FR/EN/ES prioritaires. Le dépôt en a **5** (fr/en/es/de/pt), avec parité forcée par le typage.
**Tranché : on garde les 5.** « Prioritaires » n'est pas « exclusives », la parité est déjà tenue par le
type, et retirer deux langues serait une régression gratuite.

---

## A8 — Seuils de jeu : spec vs `game-rules.ts`

La spec §8.2/§9.1 fixe des valeurs (`MIN_ACTIVITY_DISTANCE_RUN 800 m`, `BIKE 2 000 m`,
`MIN_POLYGON_AREA 5 000 m²`, `MAX_CLOSURE_DISTANCE max(35 m, 2,5 × précision médiane)`,
`CONTEST_INTERSECTION_THRESHOLD 60 %`, `BASE_DEFENSE_WINDOW 18 h`, fortification 0→3 = 18/24/30/36 h).

**Tranché** : ces valeurs vont dans **`packages/shared/src/game-rules.ts`** (source unique, règle absolue du
projet — aucun nombre magique ailleurs), puis sont propagées par `scripts/sync-game-rules.mjs` vers les edge
functions. La spec dit « paramètres serveur versionnés » : `game-rules.ts` + `algorithmVersion` sur chaque
activité remplissent ce contrat. Le diff exact des valeurs actuelles est produit par l'audit du moteur.

---

## A9 — Ce que la spec NE dit pas et qui existe déjà

Le dépôt contient des systèmes absents de la spec : **Arsenal/inventaire**, **Skills**, **Relais**
(attribution collective A-41), **challenges sponsorisés**, **QR**, **cartes 3D**, **war room**.
**Tranché** : rien n'est supprimé sur la seule base d'une absence — la spec décrit un socle, pas une
liste d'exclusion. Ces surfaces restent, **sauf** si elles contredisent une règle dure (p. ex. tout ce qui
donnerait un avantage compétitif payant tomberait sous §1.6). L'audit signale les cas litigieux.

---

## Rien n'est bloqué

Les neuf points sont tranchés. Le chantier démarre sans attendre de réponse.

**Trois décisions sont réversibles d'un mot** si le fondateur veut l'inverse — elles sont signalées ici
pour qu'il ne les découvre pas dans le code :

| Décision prise | Inverser coûte |
|---|---|
| A1 — polygone autoritaire + H3 en index interne (voie 2) | Voie 3 (H3 supprimé) = ~2 semaines de plus, gain utilisateur nul |
| A2 — Saison sous Profil, Missions sous Carte | Remettre un 4ᵉ onglet = contredit le mandat « trois onglets » |
| A5 — tutoiement conservé | `sed` sur 5 catalogues i18n + mise à jour de 2 tests |

**Ce qui n'est PAS un arbitrage mais une dépendance externe** (aucune décision ne les débloque, seul un
accès le peut) : O2 identifiants Apple/Google OAuth, O3 RevenueCat (prix Store — E72/E74 restent des
coques honnêtes tant qu'il est fermé), O10 domaine. La spec exige que les prix viennent du Store ou de la
remote config : tant qu'O3 est fermé, **aucun prix ne s'affiche**, plutôt qu'un prix codé en dur.
