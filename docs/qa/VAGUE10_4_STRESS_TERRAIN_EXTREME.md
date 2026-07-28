# GRYD — Vague 10.4 : stress test terrain extrême (RUN + BIKE)

Objectif: tester les cas "vraie vie + adversarial" en conditions terrain.

Ce protocole complète:
- `docs/qa/VAGUE10_2_PREUVE_APPAREIL.md`
- `docs/qa/VAGUE10_3_A11Y_E2E_OBSERVABILITE.md`

Il ne simule pas du succès: il cherche les limites, les ambiguïtés, les comportements "sales".

---

## 0) Garde-fous sécurité (obligatoire)

- Ne jamais se mettre en danger (trafic, intersections, nuit, zone risquée).
- Les scénarios "triche" se font en zone sûre et sans infraction.
- Interrompre immédiatement si douleur, malaise, météo dangereuse.

---

## 1) Règles de référence à garder en tête

Constantes observables dans le code:
- RUN min distance: `800 m` (`RUN_MIN_DISTANCE_M`)
- RUN min durée: `5 min` (`RUN_MIN_DURATION_S`)
- BIKE min distance: `2000 m` (`BIKE_MIN_DISTANCE_M`)
- BIKE min durée: `6 min` (`BIKE_MIN_DURATION_S`)
- fermeture boucle: tolérance adaptative bornée (plancher 35 m, plafond 80 m)

États backend possibles côté run:
- `valid`, `partial`, `flagged`, `rejected`

États upload client:
- `sent`, `queued`, `lost`, `rejected`, `none`

---

## 2) Préparation run de test

Pour CHAQUE scénario:
1. Noter discipline: RUN ou BIKE.
2. Noter contexte réseau: online / offline / flaky.
3. Démarrer capture écran (ou vidéo courte).
4. Exécuter scénario.
5. Sauver artefacts + noter verdict observé.

Recommandé:
- 1 iPhone réel (dev build),
- si possible 1 Android réel (preview build),
- 1 parcours urbain + 1 parcours dégagé.

---

## 3) Matrice de stress (terrain réel)

## 3.1 Cas nominaux (contrôle)

### T01 — RUN nominal propre
- 12-20 min, allure stable.
- Boucle propre fermée.
- Attendu: run `valid`, upload `sent` (ou `queued` si offline volontaire).

### T02 — BIKE nominal propre
- 15-25 min, trace continue.
- Boucle fermée.
- Attendu: `valid`.

## 3.2 Pauses / reprise / fatigue réelle

### T03 — pause crampe 2 min (RUN)
- Courir 6-8 min, pause manuelle 2 min, reprise 6-8 min.
- Attendu:
  - temps actif cohérent (pause non comptée comme effort),
  - run pas bloqué; verdict `valid` ou `partial` acceptable, pas de freeze UI.

### T04 — pause auto (RUN ou BIKE)
- Arrêt net sans pause manuelle (feu rouge, attente).
- Attendu:
  - passage en état pause auto observable,
  - reprise propre sans "saut" de distance absurde.

## 3.3 Boucle non fermée -> finalement fermée

### T05 — quasi-boucle puis fermeture tardive (RUN)
- Finir d'abord à > tolérance de fermeture, puis revenir fermer.
- Attendu:
  - avant fermeture: sortie libre/non fermée,
  - après fermeture: boucle reconnue si conditions remplies.

### T06 — non fermée assumée (RUN + BIKE)
- Trajet linéaire sans retour.
- Attendu:
  - pas de faux claim de boucle,
  - résultat cohérent "sortie libre" / non capture.

## 3.4 Variations extrêmes d'allure / vitesse

### T07 — changement brutal de vitesse (RUN)
- Alternance lente -> sprint -> lente.
- Attendu:
  - pas de crash UI,
  - verdict possiblement `partial/flagged` selon qualité trace,
  - jamais de points "fabriqués" si trace incohérente.

### T08 — BIKE accélérations fortes
- Relances franches + freinages.
- Attendu: pas de confusion run/bike; métriques vélo cohérentes.

## 3.5 Marche / mix effort

### T09 — RUN avec marche prolongée
- 5 min course + 5 min marche + 5 min course.
- Attendu:
  - run conservé,
  - verdict potentiellement `partial` mais pas d'état mensonger.

### T10 — BIKE avec portions à pied
- Descendre du vélo 2-3 min (vélo à la main), reprendre.
- Attendu:
  - pipeline ne casse pas,
  - verdict cohérent (valid/partial selon signal).

## 3.6 Conditions GPS dégradées

### T11 — canyon urbain / tunnel court
- Passage zone GPS dégradée.
- Attendu:
  - état GPS faible clair,
  - pas de téléport "lissé" mensonger,
  - si rejet partiel: message honnête.

### T12 — perte puis retour GPS
- Couper/rétablir localisation pendant session (si faisable sans risque).
- Attendu:
  - état permission/GPS explicite,
  - pas de faux "analyse terminée".

## 3.7 Offline / sync / AppState

### T13 — fin offline (RUN)
- Mode avion avant finish.
- Attendu: `queued` visible, course non perdue.

### T14 — drain foreground
- Après T13, rétablir réseau, background -> foreground.
- Attendu: progression sync réelle (pas faux spinner), issue explicite.

### T15 — file saturée (session longue)
- Enchaîner plusieurs sorties offline courtes jusqu'à refus.
- Attendu:
  - refus explicite (pas écrasement silencieux),
  - anciennes entrées préservées.

## 3.8 Cas "triche / anti-abus" (sans danger)

### T16 — RUN "véhicule déguisé"
- Démarrer run puis déplacement motorisé bref (test encadré/sûr).
- Attendu:
  - forte chance de `flagged/rejected/partial`,
  - surtout: pas de validation silencieuse d'un trajet impossible.

### T17 — GPS jump artificiel (si outil de spoof interne QA)
- Injecter saut brut de position.
- Attendu:
  - outliers rejetés,
  - pas d'explosion distance/aire.

### T18 — boucle "triche" ultra fine
- Tracé fermé mais forme non crédible (aller-retour étroit).
- Attendu:
  - refus intérieur de boucle (`partial`/non-capture),
  - jamais "grosse capture" incohérente.

---

## 4) Exécution minimale recommandée

- RUN: T01, T03, T05, T07, T11, T13, T14, T16
- BIKE: T02, T06, T08, T10, T11

Total terrain réaliste en 1 jour:
- RUN bloc 1: 60-90 min
- BIKE bloc 2: 60-90 min
- Sync/offline: 30-45 min

---

## 5) Fiche de relevé (copier-coller)

```md
Date:
Device / OS:
Build (EAS profile + commit):
Ville / zone:

Scenario ID:
Discipline: RUN | BIKE
Réseau: online | offline | flaky
AppState: normal | background/foreground | interruption

Observé:
- Statut run backend (si visible): valid | partial | flagged | rejected | inconnu
- Statut upload: sent | queued | lost | rejected | none
- Ecran résultat: cohérent oui/non
- Anomalie UI: oui/non (décrire)
- Event cohérence (app_open/run_start/run_complete/sync): ok/non

Artefacts:
- capture(s):
- vidéo:

Verdict scénario: PASS | FAIL | INVESTIGATE
Commentaire:
```

---

## 6) Critère final GO / NO-GO

GO si:
- aucun scénario critique ne perd de course,
- pas de progression sync mensongère,
- pas de confusion RUN/BIKE,
- anti-abus ne laisse pas passer trivialement les cas grossiers.

NO-GO si:
- course perdue,
- claim/capture validée sur trace manifestement impossible,
- UI affirme une issue non observée,
- blocage analyse/résultat non récupérable.
