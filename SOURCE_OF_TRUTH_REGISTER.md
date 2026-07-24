# GRYD — SOURCE OF TRUTH REGISTER

> Artefact mandaté par la **Spécification Maître Unifiée 2026** (§ « PROTOCOLE DE
> FUSION ET SOURCE DE VÉRITÉ »). Il arbitre l'autorité entre documents et rend la
> hiérarchie EXPLICITE. Établi le 24/07/2026.

## Principe d'arbitrage

> La spécification la plus récente, la plus explicite et la plus cohérente avec la
> vision actuelle de GRYD prévaut.

**Nuance importante — deux couches d'autorité qui ne se recouvrent pas :**

1. **Constitution NON NÉGOCIABLE (inchangée, au-dessus de tout).** La Spéc Maître
   Unifiée 2026 est une refonte **UI/UX / produit / design / Run-Bike / i18n**.
   Elle ne contredit PAS — et ne peut pas lever — les invariants de fond du
   projet, avec lesquels elle est d'ailleurs cohérente :
   - **L'app ne ment jamais** (données réelles ou vides, jamais fabriquées ;
     quatre états distincts) — `CLAUDE.md`, `AMENDEMENT-47`.
   - **Anti pay-to-win STRICT** (aucun achat ne donne territoire/points/avantage)
     — la Spéc le réaffirme elle-même (§3.5).
   - **Tout claim décidé serveur**, RLS partout, écriture client interdite sur
     `runs`/`hex_claims`.
   - **Aucun nombre magique** hors `packages/shared/src/game-rules.ts` (source
     unique des constantes de jeu) ; `_shared/` généré, jamais édité à la main.
   - **Zéro donnée européenne factice** (`no-fake-europe-data`).
   - **Une migration appliquée n'est jamais réécrite.**
   Ces règles gouvernent le MOTEUR et l'HONNÊTETÉ ; la Spéc gouverne la SURFACE.

2. **Autorité PRODUIT / UI-UX (c'est ici que la Spéc s'installe en tête).** Pour
   la hiérarchie d'écran, le wording, le design system, la carte, l'onboarding,
   Run+Bike, l'i18n et l'accessibilité, la Spéc Maître Unifiée 2026 devient la
   référence active et prime sur les amendements UI antérieurs en cas de conflit.

## Registre des documents

| Document | Statut | Autorité | Remplace | Remplacé par | Conflits connus |
|---|---|---|---|---|---|
| `docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md` | **ACTIF — source de vérité PRODUIT/UI-UX** | 1 (surface) | fusionne les 2 docs UI/UX antérieurs qu'elle cite | — | voir « Contradictions » ci-dessous |
| `docs/product/GRYD_ADDENDUM_PSYCHO_COGNITIVE_NEUROMARKETING.md` | **ACTIF — couche transversale** | 1 (surface) | — | — | aucun (cohérent avec §19 de la Spéc) |
| `CLAUDE.md` | **ACTIF — constitution monorepo + invariants** | 0 (au-dessus) | — | — | la Spéc s'y ajoute, ne la lève pas |
| `AMENDEMENT-47-FIN-DU-MODE-DEMO.md` | **ACTIF — CONTRAIGNANT** | 0 (honnêteté) | — | — | ⚠️ vs Spéc §7.2 « carte démo » — voir arbitrage |
| `GRYD_REGLES_NON_NEGOCIABLES.md` | **ACTIF — constitution UI/carte** | 0 | — | — | cohérent avec l'épuration de la Spéc |
| `ADDENDUM-DESIGN-v0.1.md` (charte chartreuse) | **ACTIF** | 2 | — | complété par Spéc §10-§12 (palette maîtrisée) | la Spéc raffine, ne casse pas |
| `packages/shared/src/game-rules.ts` | **ACTIF — source unique constantes** | 0 (moteur) | — | — | — |
| `GRYD_TERRITORY_ENGINE.md` | **ACTIF — moteur** | 0 (moteur) | — | — | — |
| Autres `docs/product/GRYD_*.md` (≈30) et `AMENDEMENT-01..46` | **À RECLASSER** | 2-3 | — | partiellement par la Spéc | à trancher au fil de l'audit de conformité |

> Le reclassement fin des ~30 docs produit et des 46 amendements se fait via
> `CURRENT_STATE_CONFORMITY_MATRIX.md` (produit par l'audit de conformité mandaté,
> Étape 1). Un doc antérieur contredit par la Spéc sera marqué
> `DEPRECATED — DO NOT IMPLEMENT` au fil de l'arbitrage, jamais en bloc sans preuve.

## Contradictions détectées (arbitrage initial)

Ces conflits sont relevés dès la mise en place ; l'arbitrage définitif et les
autres conflits sortent de l'audit de conformité.

1. **Carte démo en onboarding.** Spéc §7.2 « Arrivée directe sur carte démo …
   données de démonstration ou zones publiques agrégées ». `AMENDEMENT-47`
   (CONTRAIGNANT) a SUPPRIMÉ tout mode démo : l'app ne montre jamais de donnée
   fabriquée. **Arbitrage : l'honnêteté (A-47) prime.** On honore l'INTENTION de
   la Spéc (arriver dans l'app sans friction, explorer avant de courir) avec des
   données RÉELLES ou VIDES — jamais de « démo » fabriquée. La lettre « carte
   démo » de la Spéc est donc lue comme « carte explorable honnête ».

2. **Microcopy « GO ».** Spéc §20 liste `GO` comme exemple de bon CTA. C'est
   cohérent avec l'override fondateur `AMENDEMENT-38` (le bouton d'action central
   EST « GO »). **Aucun conflit** — les deux convergent.

3. **i18n : `locales/*.json` + ICU MessageFormat (Spéc §23) vs catalogue
   TypeScript typé (existant).** Le repo n'a pas de dossier `locales/` : l'i18n
   est un **catalogue TS** (`Entry × 5 langues`, parité forcée par le typage).
   **Arbitrage : le RÉSULTAT prime sur la forme.** Les objectifs de la Spéc
   (aucun texte en dur, parité, pluriels, changement sans redémarrage) sont ce
   qui compte ; la forme technique (catalogue typé) est un choix d'implémentation
   valide, à évaluer par l'audit (pluriels/ICU réellement couverts ?).

4. **Mode Bike (Spéc Partie II).** Net-new complet (Run World / Bike World). À
   traiter comme un **programme** derrière `FEATURE_BIKE_*`, pas un delta —
   séquencé après stabilité Run (la Spéc §5.3 l'exige elle-même).

## Procédure mandatée (Spéc §30 / Partie II §22)

La Spéc impose : **auditer d'abord, ne pas coder aveuglément.** Ordre :
1. Audit de conformité du code actuel (→ `CURRENT_STATE_CONFORMITY_MATRIX.md`).
2. Arbitrer les contradictions (ce registre + la matrice).
3. Refonte par chantiers gatés (méthode LOOP + gate GRYD), P0 d'abord.

L'audit de conformité (Étape 1) est **produit** :
[`CURRENT_STATE_CONFORMITY_MATRIX.md`](CURRENT_STATE_CONFORMITY_MATRIX.md) —
102 exigences vérifiées (40 conformes, 31 partielles, 23 absentes, 4 bloquantes,
1 obsolète), chaque ligne avec preuve `fichier:ligne`. Il porte aussi la
**roadmap priorisée** (10 deltas de conformité rapides + 6 programmes net-new :
mode Bike, photo profil publique, rail IAP, carte agrégée, humain onboarding,
design-system premium).

Les livrables lourds de la Spéc (`GRYD_MARKET_DESIGN_STUDY`,
`GRYD_BIKE_MODE_PRODUCT_SPEC`, `RONDESIGNLAB_STYLE_AUDIT`, etc.) sont des
**programmes** à séquencer, pas des prérequis à la mise en place documentaire.
