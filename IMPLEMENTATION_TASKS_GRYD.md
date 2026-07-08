# Liste des tâches techniques GRYD

**Format :** `[Phase] ID — Titre — Effort — Dépendances`  
**Effort :** S (< 1 session) · M (1–2 sessions) · L (multi-composants)

---

## Phase 0 — Documentation & fondations (EN COURS)

- [x] P0-DOC-01 — Audit complet `AUDIT_GRYD.md` — S
- [x] P0-DOC-02 — Plan produit `PRODUCT_PLAN_GRYD.md` — S
- [x] P0-DOC-03 — Spec UX/UI `UX_UI_SPEC_GRYD.md` — S
- [x] P0-DOC-04 — Spec algorithmes `ALGORITHMS_GRYD.md` — S
- [x] P0-DOC-05 — Schema DB `DATABASE_SCHEMA_GRYD.md` — S
- [x] P0-DOC-06 — Checklist Apple `APPLE_STORE_CHECKLIST_GRYD.md` — S
- [x] P0-DOC-07 — Plan QA `QA_TEST_PLAN_GRYD.md` — S
- [x] P0-DOC-08 — Tasks list (ce fichier) — S
- [x] P0-ENG-01 — Moteur `recommendation.ts` + tests — M
- [x] P0-ENG-02 — Constantes reco dans `game-rules.ts` + sync — S
- [x] P0-MOB-01 — `lastRunResult.ts` store AsyncStorage — S
- [x] P0-MOB-02 — `useRealRun` capture `IngestRunResponse` — S
- [x] P0-MOB-03 — `course-result` branchement réponse serveur — M
- [x] P0-MOB-04 — `statsFromIngest()` mapper — S
- [x] P0-MOB-05 — `route/recommend.ts` wrapper client — S

---

## Phase 1 — Boucle réelle (P0)

- [x] P1-BE-01 — RPC `hex_claims_for_city` — M — migration 0018
- [ ] P1-BE-02 — Seed sectors Paris/Lille — M — O4
- [ ] P1-BE-03 — Seed no_capture_zones minimum — M — O4
- [ ] P1-BE-04 — Cron refresh sector_control post-ingest — S
- [x] P1-MOB-05 — `MapScreen` fetch hex_claims via RPC — L
- [ ] P1-MOB-06 — Cache tuiles hex local — M
- [x] P1-MOB-07 — Post-run badges from `newBadges` — M (Phase 0)
- [x] P1-MOB-08 — Post-run bonus from `bonusApplied` — S (Phase 0)
- [x] P1-MOB-09 — Crew create/join via `crew_membership` — L
- [x] P1-MOB-10 — `pendingUpload` → map refresh on sync — S
- [ ] P1-OPS-01 — Supabase staging project — S — O1 (script `scripts/deploy-staging.mjs`)
- [x] P1-OPS-02 — EAS secrets (URL, anon key) — S — O1 (`npm run setup:eas`)
- [x] P1-OPS-03 — TestFlight internal build — M — O8 (workflow + `npm run testflight:ios`)

---

## Phase 2 — Friction & reco (P1)

- [x] P2-MOB-01 — Onboarding 3 écrans — M
- [x] P2-MOB-02 — RUN bouton central nav — S
- [x] P2-MOB-03 — Route planner `recommendRun` integration — M
- [x] P2-MOB-04 — Calques Contrôle/Action/Crew — M
- [x] P2-MOB-05 — Live Run réel + LiveNavMap GPS trace — L
- [x] P2-MOB-06 — Fix label « VOIR WAR ROOM » → Missions — S
- [ ] P2-BE-01 — Edge Function `recommend_run` — L
- [x] P2-MOB-07 — Fusion Saison → Profil entry — S

---

## Phase 3 — App Store (P2)

- [ ] P3-DES-01 — Icône 1024×1024 final — S
- [ ] P3-DES-02 — 5 screenshots device — M
- [ ] P3-WEB-01 — URLs gryd.run production — M
- [ ] P3-MOB-01 — Masquer boutique si !O3 — S
- [ ] P3-MOB-02 — PrivacyInfo.xcprivacy — S
- [ ] P3-MOB-03 — Notes review finalisées — S
- [ ] P3-QA-01 — TestFlight 5 testeurs 48 h — M
- [ ] P3-BE-01 — Delete account backend — M — O2
- [ ] P3-BE-02 — Expo push in digest_job — M

---

## Phase 4 — Post-launch (P3)

- [ ] P4-MOB-01 — Refactor `crew.tsx` modules — L
- [ ] P4-BE-01 — GeoJSON réels Paris/Lille — L — O4
- [ ] P4-BE-02 — Season poster generation — M
- [ ] P4-MOB-02 — Strava import (O7) — M
- [ ] P4-MOB-03 — HealthKit pipeline (O8) — L
- [ ] P4-OPS-01 — PostHog production keys — S — O4
- [ ] P4-OPS-02 — RevenueCat production (O3) — M

---

## Dette technique connue

| Item | Fichier | Action |
|------|---------|--------|
| crew.tsx monolith | `app/(tabs)/crew.tsx` | Split features |
| Fonts Space Grotesk | `TabScreen.tsx` | Load expo-font |
| Stack screens incomplete | `_layout.tsx` | Register all |
| Fake waitlist counts | `apps/web/lib/waitlist.ts` | DB counts |

---

## Ordre d'exécution recommandé (sprint actuel)

1. P0-ENG-01 → P0-ENG-02 → sync game-rules
2. P0-MOB-01 → P0-MOB-02 → P0-MOB-04 → P0-MOB-03
3. P1-OPS-01 → P1-OPS-02
4. P1-BE-01 → P1-MOB-05
5. P1-OPS-03 → P3-QA-01

---

## Definition of Done (MVP soumission)

- [ ] Course GPS réelle → ingest_run → post-run serveur → carte mise à jour
- [ ] Crew create/join fonctionnel
- [ ] TestFlight crash-free 48 h
- [ ] Checklist Apple §A–D complète
- [ ] 5 utilisateurs comprennent la carte en < 30 s
