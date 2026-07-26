# E2E — ce que ces tests prouvent, et ce qu'ils ne prouvent PAS

**Posé le 27/07/2026** (lot 0.5 du `PLAN_IMPLEMENTATION_GRYD.md`). Avant ça le dépôt n'avait
**aucune** infrastructure d'intégration : ni Playwright, ni Detox, ni Maestro. Les 10 scénarios
obligatoires de la spec §25 avaient **0 % de couverture**, alors qu'une refonte de la taille du
lot 1 (géométrie polygonale) sans filet d'intégration = régressions invisibles (`AUDIT_GRYD.md`, R6).

---

## Le piège que ces tests n'ont PAS le droit de créer

Le produit final est une **app native iOS**. Le bundle **mobile-web** en diverge **par construction**,
et `AMENDEMENT-47` le dit noir sur blanc : le rendu de carte est un fork web (`RealMap.web.tsx`, pas
MapLibre natif), le GPS passe par l'API navigateur et non `expo-location`, et l'auth Apple/Google n'a
aucun chemin utilisable dans un navigateur tant qu'O2 est ouvert.

**Donc : un test vert ici ne prouve RIEN sur le natif.** Un E2E web qui passerait pour une validation
du produit serait exactement la fausse confiance que la constitution du projet combat.

| Surface | Le web EST-il le produit ? | Ce qu'un test vert prouve |
|---|---|---|
| `apps/web` (waitlist, légal) | **OUI** — c'est le site public déployé | Le produit marche |
| `apps/mobile` en bundle web | **NON** — instrument de preview du fondateur | Que l'écran **monte**, que la copie est la bonne, que le parcours **enchaîne**. Rien de plus. |

C'est déjà beaucoup : la moitié des régressions de cette session ont été des écrans qui ne montaient
plus ou de la copie fausse. Mais ça ne remplace pas un harnais natif.

---

## Couverture réelle des 10 scénarios de la spec §25

| # | Scénario | Statut | Pourquoi |
|---|---|---|---|
| 1 | Premier lancement → onboarding → auth | **couvert (web)** | Aucun login requis ; c'est le parcours le plus fragile et le plus modifié |
| 2 | Capture (départ → boucle → résultat) | **non couvert** | Exige GPS réel + moteur serveur → harnais natif |
| 3 | App tuée → récupération | **non couvert** | Exige le cycle de vie natif |
| 4 | Hors ligne → upload idempotent | **non couvert** | Exige la file d'upload (lot 2.2, pas encore bâtie) |
| 5 | Défense | **non couvert** | Exige le modèle de contestation (lot 3, pas encore bâti) |
| 6 | Revue anti-triche | **non couvert** | La revue **n'existe pas** (lot 9) |
| 7 | Crew | **non couvert** | Exige une session authentifiée |
| 8 | Confidentialité | **non couvert** | Exige une activité réelle |
| 9 | Bascule Run/Bike | **non couvert** | Exige une session authentifiée |
| 10 | Achat | **non couvert** | Bloqué par O3 (RevenueCat) |

**1/10 aujourd'hui.** Ce n'est pas satisfaisant et ce n'est pas présenté comme tel — c'est le premier
maillon. Les scénarios 2-9 se débloquent au fur et à mesure des lots ; le 10 dépend d'O3.

---

## Ce qui manque pour couvrir le reste

Un **harnais natif** (Maestro ou Detox) sur simulateur iOS, plus un moyen d'injecter une trace GPS
déterministe. À faire quand le lot 2 (cycle d'activité) est posé — écrire ces flux avant serait écrire
des tests contre une API qui va changer.

**Règle** : on n'écrit pas de flux qu'on ne peut pas exécuter. Un test non exécuté est une promesse
sans preuve, au même titre qu'une doc qui devance le code.

---

## Lancer

```bash
npm run test:e2e
```

Playwright démarre lui-même les serveurs nécessaires (`webServer` dans `playwright.config.ts`).
Le premier lancement compile le bundle Expo web : compter quelques minutes.

**Ces tests ne sont PAS dans `npm run gate`** — ils démarrent des serveurs et prennent des minutes,
là où le gate doit rester une boucle courte. Ils tournent avant un push de lot, et en CI.
