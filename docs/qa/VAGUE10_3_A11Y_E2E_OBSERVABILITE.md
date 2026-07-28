# GRYD — Vague 10.3 : a11y, E2E, observabilité (exécution)

Objectif: fermer la dette de démontrabilité sans inventer de preuve.

Ce document définit **quoi vérifier**, **comment le vérifier**, et **quelles
preuves conserver**.

Protocole terrain extrême complémentaire:
- `docs/qa/VAGUE10_4_STRESS_TERRAIN_EXTREME.md`

---

## 1) Accessibilité — balayage exécutable

### 1.1 Cibles tactiles 44x44 (réelles)

Règle:
- une action visible doit avoir une cible réelle >= 44x44;
- `hitSlop` peut compléter, mais ne doit pas cacher une cible visuelle trop petite.

Contrôle rapide (statique):

```bash
rg -n "hitSlop" apps/mobile/app apps/mobile/src
```

Contrôle manuel (appareil):
1. Parcourir les CTA principaux (Carte, Course live, Résultat, Crew, Profil).
2. Vérifier qu'aucune action critique n'exige un tap pixel-perfect.

Preuve:
- capture vidéo courte montrant 5 taps critiques réussis du premier coup.

### 1.2 Reduce Motion

Règle:
- si Reduce Motion est actif, aucune animation décorative ne doit imposer un mouvement.

Contrôle:
- activer Reduce Motion sur l'appareil;
- ouvrir: carte, onboarding E02, partage, badge unlock;
- vérifier absence de pulse/translation non essentielle.

Preuve:
- capture vidéo (Reduce Motion ON) sur les 4 écrans.

### 1.3 Contrastes

Règle:
- texte informatif lisible sur fonds carbone/noir;
- chartreuse réservée à l'action, jamais utilisée illisible sur fond clair.

Contrôle:
- revue visuelle des écrans clés: E11, E20/E21, E29, E38+, E76/E77.

Preuve:
- 1 capture par écran avec annotation "ok contraste".

---

## 2) E2E — couverture réelle vs spec §25

Référence état actuel: `e2e/README.md`.

### 2.1 Déjà couvert
- scénario 1 (premier lancement) côté web preview.

### 2.2 À couvrir prioritairement en preuve exécutable
- scénario 2: capture nominale (appareil réel),
- scénario 3: app kill/reprise,
- scénario 4: offline -> drain,
- scénario 9: bascule Run/Bike avec lecture honnête des mondes.

Pour 2/3/4, exécuter le protocole:
- `docs/qa/VAGUE10_2_PREUVE_APPAREIL.md`

Sortie attendue:
- artefacts horodatés (captures/vidéos) joints à la PR release.

---

## 3) Observabilité minimale (sans PII)

Vérifier que la chaîne instrumentée raconte le vrai:
- ouverture app (`app_open`),
- départ course (`run_start`),
- fin course (`run_complete`),
- issue sync/queue selon faits observés (pas de faux progrès).

Contrôle:
1. Exécuter scénario nominal.
2. Exécuter scénario offline + drain.
3. Vérifier cohérence temporelle des events côté dashboard.

Règle:
- ne jamais déclarer "synchro terminée" sans fait observé correspondant.

---

## 4) Statut de `AUDIT_GRYD.md`

`AUDIT_GRYD.md` est conservé comme **archive figée**.

Usage:
- historique des écarts au 26/07/2026 uniquement.

Non-usage:
- ne pas l'utiliser comme état temps réel de conformité après les vagues 7-10.

---

## 5) Critère de sortie V10.3 (GO)

GO si:
- protocole V10.2 exécuté sur appareil avec artefacts,
- balayage a11y 44x44 + Reduce Motion + contraste effectué,
- cohérence des events observée sur un run nominal et un run offline/drain,
- aucune affirmation dans la doc QA au-delà d'une preuve collectée.
