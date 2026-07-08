# Plan produit GRYD — Soumission Apple Store

**Horizon :** MVP soumission TestFlight → App Store Review  
**Principe directeur :** fermer la boucle « je cours → je vois ce que j'ai gagné → je reviens demain », pas ajouter des features.

---

## Vision produit (rappel)

> **Seul, tu cours et tu progresses. Avec ton crew, tu conquiers la ville.**

Promesse mesurable : un nouvel utilisateur comprend en **< 30 s** où il est, qui contrôle quoi, et peut lancer une course en **≤ 2 taps** après onboarding minimal.

---

## Écart navigation (arbitrage requis)

| Source | Nav principale |
|--------|----------------|
| Prompt maître | Carte · Crew · **RUN** · Moi |
| AMENDEMENT-29 (actuel) | Carte · Missions · Crew · Saison · Profil |
| Recommandation produit | **Phase 1** : garder 5 onglets, RUN = FAB chartreuse permanent au centre · **Phase 2** : fusionner Missions→Carte (sheet) + Saison→Profil, nav 4 onglets |

**Décision proposée :** ne pas casser les routes internes (`warroom`, `classement`) ; relabel + regrouper l'accès secondaire sous Profil/Carte avant soumission publique.

---

## Phases d'implémentation

### Phase 0 — Fondations (en cours)
**Objectif :** documents + moteur reco + câblage post-run réel.

| # | Livrable | Critère done |
|---|----------|--------------|
| 0.1 | Audit + plans (8 docs) | Fichiers racine livrés |
| 0.2 | Moteur `recommendRun` | Tests Deno verts |
| 0.3 | `lastRunResult` + course-result | GPS réel affiche stats serveur |
| 0.4 | Sync game-rules | `node scripts/sync-game-rules.mjs` |

### Phase 1 — Boucle réelle (P0)
**Objectif :** joueur connecté voit ses captures.

| # | Feature | Composants |
|---|---------|------------|
| 1.1 | Carte live | `MapScreen` ← Supabase `hex_claims` bbox + cache |
| 1.2 | Post-run serveur | Badges, bonus, breakdown depuis `IngestRunResponse` |
| 1.3 | Crew minimal | Create/join crew Edge Function ou RPC existante |
| 1.4 | Pending upload UX | Toast sync + refresh carte après retry |
| 1.5 | Config O1 | Supabase staging + env EAS |

### Phase 2 — Friction zéro (P1)
**Objectif :** onboarding + reco + RUN visible.

| # | Feature | Détail |
|---|---------|--------|
| 2.1 | Onboarding 3+2 | 3 écrans concept + GPS + profil optionnel |
| 2.2 | RUN central | FAB permanent ou 5e→RUN au centre (chartreuse) |
| 2.3 | Route planner reco | 1 principale + 2 alt via `recommendRun` |
| 2.4 | Calques Contrôle/Action/Crew | Remplacer filtres SIG |
| 2.5 | Live Run réel + carte | Brancher `LiveNavMap` sur trace GPS (AMENDEMENT-13) |

### Phase 3 — App Store (P2)
**Objectif :** passage review.

| # | Item |
|---|------|
| 3.1 | Build EAS production iOS |
| 3.2 | TestFlight 5+ testeurs internes, 0 crash |
| 3.3 | Screenshots 6,9" (5 écrans checklist) |
| 3.4 | Icône 1024, splash, PrivacyInfo |
| 3.5 | Masquer IAP/boutique si O3 non prêt |
| 3.6 | URLs légales `gryd.run` en prod |
| 3.7 | Notes review + démo account |

### Phase 4 — Rétention (P3, post-launch)
Push attaque, seed secteurs, decay warnings, season poster, refactor crew.

---

## Métriques de succès

| Métrique | Cible MVP |
|----------|-----------|
| Time-to-first-run (post-install) | < 90 s |
| Compréhension carte (test 5 users) | 4/5 en < 30 s |
| Crash-free sessions TestFlight | > 99,5 % |
| `ingest_run` success rate | > 95 % (hors offline queue) |
| Post-run NPS interne | « Je comprends ce que j'ai gagné » ≥ 4/5 |

---

## Risques produit

1. **Complexité visible** : trop d'onglets/features avant la boucle réelle → retarder Arsenal/Challenges en nav.
2. **Promesse geo** : « France » vs Paris/Lille Season 0 → copy App Store explicite.
3. **Pay-to-win perception** : garder bannière « territoire ne s'achète pas » en review.
4. **GPS review** : reviewer sans compte doit pouvoir jouer (onboarding démo ✓).

---

## Dépendances fondateur (O-items)

| ID | Bloque |
|----|--------|
| O1 | Supabase projet + clés |
| O2 | OAuth Apple/Google prod, delete account backend |
| O3 | RevenueCat (IAP review) |
| O4 | GeoJSON réels, no_capture_zones |
| O7 | Strava (optionnel MVP) |
| O8 | EAS dev/prod builds, HealthKit |
| INPI | Nom public GRYD |

---

## Prochaine action immédiate

1. Merger Phase 0 (docs + reco + post-run wiring).  
2. Configurer Supabase staging (O1).  
3. Implémenter Phase 1.1–1.2 en parallèle.  
4. Lancer build TestFlight dès Phase 1.4 validée.
