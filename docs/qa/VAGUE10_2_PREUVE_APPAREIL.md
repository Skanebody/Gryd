# GRYD — Vague 10.2 : preuve bout-en-bout sur appareil

Objectif: prouver, sur un vrai téléphone, que la chaîne complète tient sans simulation:
1) course réelle -> verdict serveur dans l'app,
2) file offline -> drain réel,
3) transition AppState réelle (background/foreground).

Ce document ne promet rien au-delà de ce qu'on peut observer.

Extension stress terrain:
- `docs/qa/VAGUE10_4_STRESS_TERRAIN_EXTREME.md`

## 0) Pré-requis

- Compte Expo/EAS connecté (`eas whoami`).
- Build profile `development` prêt (`apps/mobile/eas.json`).
- Variables d'env Supabase valides pour l'app mobile.
- App installée en dev build (pas Expo Go) sur appareil physique.

Commandes utiles:

```bash
npm run mobile:eas:ios:dev
# ou
npm run mobile:eas:ios:preview
```

## 1) Scénario A — course nominale (online)

But: prouver que la sortie part vraiment et arrive au Résultat.

1. Ouvrir l'app avec réseau actif.
2. Lancer une course (RUN ou BIKE), courir >= 2 min.
3. Terminer la course.
4. Vérifier:
   - passage par `/course/analyse`,
   - fin sur `/course-result`,
   - contenu cohérent (distance/durée > 0, résultat non vide).

Preuve minimale à collecter:
- capture écran `course-live` (course en cours),
- capture écran `course/analyse`,
- capture écran `course-result`.

## 2) Scénario B — offline puis drain

But: prouver la file + reprise réelle.

1. Couper le réseau (mode avion) AVANT la fin d'une course.
2. Terminer la course.
3. Vérifier sur Résultat/Analyse:
   - état "envoi différé" (queued) visible,
   - l'app ne perd pas la course.
4. Repasser en réseau.
5. Mettre l'app en arrière-plan puis la rouvrir (déclencheur AppState active).
6. Vérifier que l'état évolue vers envoi réussi (ou verdict serveur explicite).

Preuve minimale:
- capture état offline différé,
- capture après retour réseau + foreground montrant la reprise,
- capture finale (résultat/history cohérent).

## 3) Scénario C — AppState réel

But: prouver qu'un retour foreground déclenche bien la reprise sans faux spinner.

1. Laisser une sortie en file (scénario B).
2. Réseau rétabli.
3. App -> background -> foreground.
4. Vérifier que la synchro progresse sur faits réels (`retry_started`, puis issue).

Preuve minimale:
- enregistrement vidéo court (10-20 s) montrant background -> foreground -> progression.

## 4) Critères d'acceptation (GO/NO-GO)

GO si, sur appareil:
- A) nominal passe de bout en bout sans blocage,
- B) offline ne perd pas la sortie,
- C) foreground relance bien le drain,
- D) aucun écran ne simule une progression non observée.

NO-GO si:
- course perdue après offline,
- progression affichée sans changement de faits,
- blocage "analyse en cours" sans activité réelle.

## 5) Évidence à joindre en PR / release note

- 3 captures du scénario A.
- 2 captures + 1 vidéo courte des scénarios B/C.
- plateforme + build utilisés (iOS/Android, profile EAS).
- date/heure du run de preuve.

## 6) Limites connues (assumées)

- Cet environnement cloud ne peut pas exécuter la preuve appareil lui-même.
- La preuve est donc opérée par exécution réelle sur téléphone, avec artefacts.
