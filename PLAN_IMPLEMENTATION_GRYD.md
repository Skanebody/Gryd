# PLAN_IMPLEMENTATION_GRYD — de l'état réel au produit de la spec v1.0

**Daté du 26/07/2026.** Entrées : `docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` (source de vérité),
`AUDIT_GRYD.md` (état réel cité fichier:ligne), `ARBITRAGES_SPEC_2026.md` (9 points tranchés).

**Principe de séquencement** : on ne peint aucun écran territorial avant que la géométrie soit polygonale,
parce qu'un écran construit sur des hexagones sera à refaire. On corrige d'abord ce qui **ment**, puis on
pose le **filet** (E2E), puis les **fondations**, puis les écrans par verticales.

**Définition de terminé** (§23 de la spec, appliquée à chaque lot) : migration · API · logique serveur ·
store client · UI · états loading/vide/erreur/hors-ligne · analytics · accessibilité · tests unitaires ·
tests d'intégration · E2E principal · documentation. **Aucun lot n'est « terminé » s'il dépend encore
d'une fixture, d'une simulation ou d'un composant non branché.**

**Gate à chaque lot** (non négociable, déjà en place) :
```bash
npm run typecheck && ~/.deno/bin/deno test --allow-read --allow-env apps/mobile/src && ~/.deno/bin/deno test --allow-read supabase/functions/ && node scripts/sync-game-rules.mjs && git status --short supabase/functions/_shared/
```

---

## Lot 0 — Honnêteté et filet *(bloque tout le reste)*

Rien ne part avant que l'app cesse de mentir et qu'un filet d'intégration existe.

| # | Travail | Pourquoi maintenant | Effort |
|---|---|---|---|
| 0.1 | **Copie anti-triche** : `result.ts:303-309` ne promet plus de revue inexistante | Faute constitutionnelle active (AUDIT §1) | S |
| 0.2 | **`test:mobile` ajouté au gate** | La moitié du filet de la course n'est vérifiée par rien | S |
| 0.3 | **Registre** : inscrire la spec v1.0 comme source de vérité, marquer `GRYD_SPEC_MAITRE_UNIFIEE_2026.md` comme antérieure | Deux specs concurrentes = arbitrages contradictoires (R8) | S |
| 0.4 | **Numérotation** : E00-E79 fait foi ; anciens docs préfixés `V1-` | Sinon un agent corrige le mauvais écran (A4) | S |
| 0.5 | **E2E Maestro** : infrastructure + scénario 1 (premier lancement) | Aucun filet d'intégration aujourd'hui (R6) | M |
| 0.6 | **Tokens §3.2** : palette complète, `--gryd-primary #C2FF23`, rôles bike/defense/rival | Toute UI ultérieure en dérive | S |

**Rollback** : chaque item est un commit isolé et réversible. **Validation** : gate vert + scénario 1 passe.

---

## Lot 1 — Géométrie polygonale *(la fondation ; conditionne les lots 3-6)*

C'est le lot le plus lourd et il ne se découpe pas : tant qu'il n'est pas fini, la propriété reste
hexagonale. **4 étapes, chacune déployable seule et réversible.**

| Étape | Contenu | Réversible en |
|---|---|---|
| 1.1 | Table `territories` : `geometry(Polygon,4326)` + `geom_generalized` + `area_m2` + `owner_type/owner_id` + `state` + `defense_level` + `controlled_since` + `publish_after` + `algorithm_version` (§19.2). Index GiST. **Aucune écriture encore.** | `drop table` |
| 1.2 | **Backfill** : polygone dérivé des cellules existantes par `ST_Union` + simplification. Vérif : aire totale conservée à ±2 %. | table ignorée |
| 1.3 | **Double écriture** : `ingest_run` écrit le polygone (autoritaire) **et** les cellules (index). Lectures inchangées. | drapeau off |
| 1.4 | **Bascule** : rendu et classements lisent le polygone ; `h3index` devient index interne jamais exposé. | drapeau off |

**Ce qui se réutilise sans modification** : `detectLoop` (produit déjà un polygone lat/lng),
`loopShapeVerdict`, `frontierCoverage`, `cleanTrace`/`smoothTrace`/`detectPauses`, `boundary.ts`, le decay.
**Ce qui se réécrit** : `enclosedCells` (conversion polygone→cellules devient dérivation d'index),
`cellsToTerritory` côté client (remplacé par la géométrie serveur), le calcul d'aire (somme de `cellArea`
→ `ST_Area` géodésique), `MIN_POLYGON_AREA` devient enfin représentable (5 000 m²).

**Endpoints** : `GET /map/context` (territoires visibles d'une bbox, géométrie **généralisée** uniquement),
`GET /territories/:id`.
**Tests** : unitaires sur la dérivation, intégration backfill (aire conservée), E2E scénario 2 (capture).
**Risque principal** : la performance des requêtes bbox. **Parade** : index GiST + géométrie généralisée
servie au client, jamais la géométrie fine.

---

## Lot 2 — Cycle d'activité et résilience *(indépendant du lot 1 — peut tourner en parallèle)*

| # | Travail | Écrans |
|---|---|---|
| 2.1 | `ActivityLifecycle` client (DRAFT→…→UPLOADING) remplaçant les 3 vocabulaires disjoints ; `ActivityStatus` serveur (PROCESSING→VALID/PARTIALLY_VALID/REVIEW/REJECTED). **Deux plans distincts, pas une énumération fusionnée.** | E19-E28 |
| 2.2 | **File d'upload FIFO persistée** + écouteur réseau (`netinfo`) + rejeu idempotent | E24, E27 |
| 2.3 | **Reprise après crash proposée au démarrage** (la donnée survit déjà) | E00 → E19 |
| 2.4 | Écrans manquants : **E19** acquisition GPS, **E25** sécurité, **E26** fin d'activité, **E27** analyse | 4 écrans |
| 2.5 | **E23** pause : ajouter « Annuler l'activité » (absent) ; pause auto sur permission révoquée | E23 |
| 2.6 | Session serveur : `POST /activities`, `/points`, `/pause`, `/resume`, `/finish` — **idempotents** | §20 |

**Tests** : E2E scénarios 3 (app tuée) et 4 (hors ligne) — les deux qui prouvent la résilience.
**Rollback** : 2.6 derrière un drapeau ; l'ancien POST unique `ingest_run` reste opérationnel jusqu'à bascule.

---

## Lot 3 — Contestation et défense *(dépend du lot 1)*

Remplace le vol instantané par le modèle temporel §9. **Ne pas empiler les deux modèles.**

- Table `territory_contests` (§19.3) ; `claim_hexes` devient un **écrivain de contestation**, plus de transfert.
- Constantes dans `game-rules.ts` : `CONTEST_INTERSECTION_THRESHOLD` 60 %, `BASE_DEFENSE_WINDOW` 18 h,
  fortification 0→3 = 18/24/30/36 h.
- Lock 24 h / bouclier 48 h / fraîcheur 6 h / nouveau joueur 14 j → **réexprimés en niveaux de fortification**.
- Cron d'échéance : à expiration, défense valide → conservation ; sinon → transfert + notification factuelle.
- **E22 défense active** (absente, XL) : jauge de couverture **étiquetée estimation locale** — le verdict
  reste serveur, exactement le patron déjà rôdé pour `zonesEstimated`.
- **E70** zone attaquée, **E31** résultat défense.

**Tests** : E2E scénario 5 (défense). **Risque** : double modèle transitoire → drapeau global, bascule atomique.

---

## Lot 4 — Confidentialité géospatiale *(dépend du lot 1 ; à ne pas repousser)*

- **Publication différée 60 min** : `publish_after` sur `territories` + **vue `public_territories`** qui
  masque `run_id`, arrondit les horodatages et n'expose que la géométrie généralisée. Remplace la policy
  `hex_claims_select_all` (R3).
- **Masquage 250 m** : `SHARE_TRIM_M` 200 → 250 (§12.1).
- **Zones protégées** (domicile/travail/autre + rayon) : écran E77 + application serveur.
- **Visibilité du profil** : miroir serveur (aujourd'hui 100 % local, donc sans effet).
- Trace GPS : stockage **déjà masqué** (zones floutées appliquées, 250 m coupés) dans un bucket privé à TTL —
  condition nécessaire au replay, à l'appel anti-triche et au rendu serveur.

**Tests** : E2E scénario 8 (confidentialité) — export vérifié sans donnée sensible.

---

## Lot 5 — Carte et boucle jouable *(dépend des lots 1-2)*

E11 carte principale (P0, feuille de recommandation + priorité défense <6 h), E14 détail de territoire
(5 variantes), E16 mission recommandée, E17 préparation, E12 couches, E13 recherche, E18 planificateur.
**Passage à 3 onglets** : Saison sous Profil, Missions sous Carte (A2).

---

## Lot 6 — Résultats et partage
E29-E34 (conquête, reprise, défense, sortie libre, contribution crew, partiellement valide), E35-E37 compositeur.

## Lot 7 — Crews
E38-E52. **Décision structurante à trancher ici** : `hex_claims.owner_user_id NOT NULL` empêche un crew de
posséder. Voie de moindre casse : garder « 1 propriétaire humain » comme invariant DB et exprimer la
propriété crew comme **attribut dérivé** (crew actif au moment du claim) — conforme à §8.4 sans casser la RLS.

## Lot 8 — Classements, saison, rangs, badges
E53-E64. Bascule de la métrique : **surface** pour le classement, **points/XP** pour la progression.
Snapshots `LeaderboardSnapshot` (aujourd'hui : vues live).

## Lot 9 — Anti-triche réel
17 signaux (5 aujourd'hui), 4 décisions PASS/EXCLUSIONS/REVIEW/REJECT, file de revue, **écran d'appel**
(E28) — ce qui referme le mensonge du lot 0.1 par du code.

## Lot 10 — Stats, notifications, réglages
E65-E69, E71, E76-E79. Table de correspondance analytics §18.1 ↔ `events.ts` (**sans renommer**).

## Lot 11 — Monétisation
E72-E75. **Bloqué par O3 (RevenueCat)** : tant qu'il est fermé, aucun prix ne s'affiche — coque honnête,
jamais un prix codé en dur (§E74). Trancher `crew_boost_24` (R9).

## Lot 12 — Durcissement
Charge, sécurité, accessibilité (taille de texte 130 %, résumé textuel des cartes), observabilité,
les 10 scénarios E2E complets.

---

## Dépendances (ce qui bloque quoi)

```
Lot 0 ─→ tout
Lot 1 ─→ Lot 3, Lot 4, Lot 5, Lot 8
Lot 2 ─→ Lot 5, Lot 6        (Lot 2 ∥ Lot 1 : indépendants)
Lot 3 ─→ Lot 6 (résultat défense)
Lot 7, Lot 10, Lot 12 : indépendants après Lot 5
Lot 11 : bloqué par O3, hors de mon contrôle
```

---

## Ce qui ne dépend d'aucune décision et démarre immédiatement

**Lot 0 en entier.** Il ne touche ni la géométrie ni le modèle de jeu : il retire un mensonge, ajoute un
filet, aligne les tokens et fixe les règles de documentation. C'est ce que j'attaque maintenant.

## Ce qui reste hors de mon contrôle

| Point | Nature | Conséquence |
|---|---|---|
| **O2** Apple/Google OAuth | identifiants à créer | E06 garde e-mail seul sur web |
| **O3** RevenueCat | compte à connecter | E72/E74/E75 restent des coques honnêtes |
| **O10** domaine | achat | liens publics et e-mails de support |
| **Connexion preview** | 1 login OTP | preuve *pixel* des écrans authentifiés |
