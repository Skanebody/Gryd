# Audit GRYD

**Date :** 8 juillet 2026  
**Périmètre :** monorepo GRYD (`apps/mobile`, `packages/*`, `supabase/`, `apps/web`)  
**Objectif :** diagnostic avant soumission Apple Store et fermeture de la boucle « course réelle → capture → célébration → carte ».

---

## Ce qui fonctionne

### Moteur de jeu et backend
- **`@klaim/engine`** : pipeline GPS → validation → H3 → claims → scoring → badges → crew complet, testé (29 fichiers Deno, ~480 tests).
- **`ingest_run`** : orchestrateur production (~2,6k lignes), idempotent par `clientRunId`, décide seul des hex (conforme SPEC).
- **Schéma PostgreSQL** : 17 migrations, RLS partout, tables crews/saisons/challenges/bonuses/inventory.
- **Jobs cron** : `decay_job`, `digest_job`, `season_close` implémentés (push Expo = TODO).
- **Constantes** : `game-rules.ts` source unique, sync vers Edge Functions testée.

### Mobile — UX et shell
- **Navigation** : 5 onglets (Carte · Missions · Crew · Saison · Profil) + ~30 écrans stack, barre flottante custom.
- **Battle Map** : MapLibre, couleurs par rôle (chartreuse/orange/violet), LOD zoom, 2D/3D, pas de grille H3 visible.
- **Live Run (démo)** : mode Stats Nike + mode Carte Uber, hold-to-stop, intentions, toasts territoire, boucle détectée côté client.
- **GPS réel (natif)** : `useRealRun`, background task, autosave, reprise après kill, file offline `pendingUpload`.
- **Post-run (démo)** : écran 2 niveaux conforme AMENDEMENT-20, share card, schémas explicatifs.
- **Crew HQ** : 6 sous-onglets, chat, coffre, perks, raids (démo riche).
- **Onboarding** : 8 étapes, capture démo avant compte, permission GPS progressive.
- **Conformité UI** : `GRYD_REGLES_NON_NEGOCIABLES.md` largement respecté (1 CTA, pas card-in-card, textes courts).
- **App Store prep** : `GRYD_APPSTORE_CHECKLIST.md`, modération UGC, suppression compte UI, Sign in with Apple codé.

### Web
- Waitlist Next.js, pages légales, admin simulateur moteur réel.

---

## Ce qui bloque

| Blocage | Impact | Dépendance |
|---------|--------|------------|
| **Carte ≠ données réelles** | Le joueur ne voit pas ses vraies captures | O1 Supabase + lecture `hex_claims` |
| **Post-run ignore `ingest_run`** | Course GPS réelle → célébration démo fausse | Câblage client (en cours) |
| **Crew create/join stub** | Impossible de former un vrai crew | O1 + Edge Functions |
| **Push notifications** | Alertes attaque/renfort non livrées | Expo push dans `digest_job` |
| **Geo seed placeholder** | Paris/Lille = bounding boxes, pas de `no_capture_zones` | O4 données geo |
| **Secteurs non seedés** | `sector_control` vide | Migration seed + cron |
| **Secrets O1–O4** | Auth, RevenueCat, PostHog, Strava | Config fondateur |
| **Build TestFlight** | Pas de build EAS production documenté comme livré | O8 + EAS |

---

## Ce qui est confus

1. **Navigation vs prompt maître** : le prompt recommande `Carte | Crew | RUN | Moi` ; l'app a `Carte | Missions | Crew | Saison | Profil` (AMENDEMENT-29). Missions et Saison ne sont pas dans la nav cible du prompt — risque de surcharge cognitive pour un nouvel utilisateur.
2. **RUN absent de la barre** : l'action principale est un FAB contextuel sur Carte/Missions seulement — pas toujours visible.
3. **War Room vs Missions** : label « Missions » mais CTA crew dit encore « VOIR WAR ROOM ».
4. **Simulation vs réel** : même écran post-run pour les deux ; le joueur ne sait pas si ses zones sont réelles.
5. **8 étapes onboarding** vs « 3 écrans max » du prompt maître — friction avant première course.
6. **Couches carte** : Contrôle/Action/Crew (prompt) vs calques internes plus nombreux — filtres partiellement exposés.

---

## Ce qui est inutile (ou secondaire au MVP soumission)

- **Arsenal / 57 items** : riche pour Season 0, mais pas requis pour valider la boucle course→capture.
- **Performance page, challenges détaillés, sources multiples (Garmin/WHOOP)** : stubs ou démo, pollution si mis en avant.
- **France map territoire page** : agrégat démo, pas branché serveur.
- **Calcul-zones explainer** : utile FAQ, pas flow principal.
- **Double React monorepo** : contrainte technique, pas un problème UX mais complexifie la maintenance web.

---

## Ce qui manque

### Produit / UX
- Algorithme de **recommandation de course** (ranking multi-critères) — absent, routes 100 % démo statiques.
- **Écran Conquérir** simplifié selon structure prompt (1 reco + 2 alternatives max).
- **Calques carte** unifiés : Contrôle / Action / Crew.
- **Première course en 2 taps** post-onboarding (aujourd'hui 8 étapes).
- **Live Run réel + mode Carte** (AMENDEMENT-13 follow-up).

### Technique
- Lecture `hex_claims` / `sector_control` pour la carte live.
- `course-result` branché sur `IngestRunResponse`.
- Retry `pendingUpload` → refresh UI post-sync.
- Expo push end-to-end.
- Seed secteurs + `no_capture_zones` Paris/Lille.
- Run recommendation API (Edge Function ou RPC) pour routes dynamiques V1.

### App Store
- Icône 1024×1024 finalisée et vérifiée dans `app.json`.
- Screenshots device réels (6,9").
- URLs `gryd.run/*` vivantes en production.
- Privacy manifest iOS (PrivacyInfo.xcprivacy) si requis par SDK.
- TestFlight build crash-free validé sur iPhone physique.

---

## Ce qui risque de casser

- **`crew.tsx` (~3600 lignes)** : régression facile, violations futures des règles §A.
- **Deux chemins run** (simulation / GPS) divergents — maintenance double.
- **styled-jsx pinning** : ne pas « nettoyer » la dep web (crash React 18/19).
- **Sync game-rules drift** : éditer `_shared/game-rules.ts` à la main casse les tests drift.
- **RLS** : toute écriture client directe sur `runs`/`hex_claims` = fail sécurité.

---

## Ce qui risque d'être rejeté par Apple

| Risque | Guideline | Statut actuel |
|--------|-----------|---------------|
| Background location sans justification claire | 5.1.1 | Textes présents ; vérifier `Info.plist` strings |
| Sign in with Apple manquant si Google OAuth | 4.8 | Apple Sign-In codé ✓ |
| Suppression de compte absente | 5.1.1(v) | UI présente, backend TODO(O2) |
| UGC non modéré (chat crew, noms) | 1.2 | Modération locale, reporting partiel |
| IAP non fonctionnels en review | 3.1.1 | Démo sans RevenueCat (O3) — **désactiver boutique en review ou fournir sandbox** |
| Métadonnées ≠ app (promesses non livrées) | 2.3.1 | Attention « France entière » vs Season 0 Paris/Lille |
| HealthKit sans usage réel | 2.5.1 | Adapters stub — ne pas déclarer HealthKit si inactif |
| Tracking ATT | 5.1.2 | PostHog — vérifier si ATT requis |
| Enfants / 12+ | Age rating | UGC → 12+ documenté ✓ |

---

## Priorités critiques

### P0 — Boucle jouable réelle (bloque TestFlight meaningful)
1. Brancher `course-result` sur `IngestRunResponse` (GPS réel).
2. Lire territoires réels sur la carte (viewport query `hex_claims` ou tuiles secteurs).
3. Crew create/join minimal via Supabase.
4. Build EAS production + TestFlight interne.

### P1 — Compréhension < 30 s
5. Réduire onboarding à 3 écrans + permission + GO.
6. RUN visible (FAB permanent ou onglet central).
7. Route planner : 1 recommandation + 2 alternatives (moteur ranking).
8. Calques carte → Contrôle / Action / Crew.

### P2 — Soumission Apple
9. Screenshots + icône + URLs légales live.
10. Désactiver/masquer IAP démo en build review.
11. Push attaque territoire (minimum viable).
12. Privacy manifest + notes review finalisées.

### P3 — Profondeur Season 0
13. Seed geo + secteurs + decay notifications.
14. Post-run badges depuis serveur.
15. Refactor `crew.tsx` en modules.

---

## Synthèse

GRYD est un **produit démo-first visuellement mature** avec un **backend de jeu exceptionnellement complet** pour un MVP. Le gap principal n'est pas algorithmique — il est **d'intégration client ↔ serveur** : la carte, la célébration et le crew ne reflètent pas encore les décisions de `ingest_run`. Fermer cette boucle + simplifier l'entrée (onboarding, nav, recommandation) est le chemin le plus court vers une soumission Apple crédible.
