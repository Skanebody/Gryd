# Plan de QA GRYD — MVP soumission

**Objectif :** valider la boucle course réelle + conformité App Store avant TestFlight externe.

---

## 1. Environnements

| Env | Usage |
|-----|-------|
| Démo locale | Sans Supabase — parcours UI |
| Staging Supabase | ingest_run réel, RLS |
| TestFlight | iPhone physique, GPS réel |
| Web preview | Régression UI non-GPS |

---

## 2. Matrice de tests

### 2.1 Onboarding & auth

| ID | Cas | Attendu | Priorité |
|----|-----|---------|----------|
| ONB-01 | Premier lancement | Carte démo visible < 5 s | P0 |
| ONB-02 | Skip compte | Accès tabs sans auth | P0 |
| ONB-03 | Sign in Apple | Session + profil créé | P1 |
| ONB-04 | Refus GPS | Course démo + message | P0 |
| ONB-05 | 8 étapes complètes | Pas crash, analytics | P2 |

### 2.2 Course GPS (natif)

| ID | Cas | Attendu | Priorité |
|----|-----|---------|----------|
| RUN-01 | Démarrer course | Tracking distance > 0 | P0 |
| RUN-02 | Pause / reprise | Chrono correct | P0 |
| RUN-03 | Hold terminer | → course-result | P0 |
| RUN-04 | Kill app mid-run | Reprise proposée | P0 |
| RUN-05 | Background permission | Trace continue ou message honnête | P1 |
| RUN-06 | Offline fin | Queue + message discret | P0 |
| RUN-07 | ingest_run success | Stats serveur affichées | P0 |
| RUN-08 | Idempotence retry | Pas double claim | P1 |

### 2.3 Post-run

| ID | Cas | Attendu | Priorité |
|----|-----|---------|----------|
| RES-01 | Conquête validée | +N zones = serveur | P0 |
| RES-02 | Boucle fermée | enclosedZones affiché | P1 |
| RES-03 | social_run | Pas capture, stats OK | P1 |
| RES-04 | course_privee | Pas partage | P1 |
| RES-05 | Partager | → écran partage | P2 |
| RES-06 | Voir détails | Breakdown expandable | P2 |

### 2.4 Carte

| ID | Cas | Attendu | Priorité |
|----|-----|---------|----------|
| MAP-01 | Zoom LOD | Pas 200k hex | P0 |
| MAP-02 | Couleurs rôle | chartreuse/orange/violet | P0 |
| MAP-03 | FAB contextuel | RUN/DÉFENDRE/CONQUÉRIR | P1 |
| MAP-04 | hex_claims live | Zones post-run visibles | P0 |
| MAP-05 | Couches sheet | Contrôle/Action/Crew | P2 |

### 2.5 Crew & social

| ID | Cas | Attendu | Priorité |
|----|-----|---------|----------|
| CRW-01 | Create crew | Crew créé en DB | P0 |
| CRW-02 | Join code | Membre ajouté | P0 |
| CRW-03 | Chat send | Message persisté | P2 |
| CRW-04 | Report user | Flag enregistré | P1 |

### 2.6 Conformité

| ID | Cas | Attendu | Priorité |
|----|-----|---------|----------|
| CMP-01 | Delete account flow | UI + backend | P0 |
| CMP-02 | Privacy toggles | Persist AsyncStorage | P2 |
| CMP-03 | Pas position live autres | Carte | P0 |
| CMP-04 | Reduce motion | Animations courtes | P2 |

---

## 3. Tests automatisés

| Suite | Commande | Seuil |
|-------|----------|-------|
| Engine Deno | `deno test --allow-read supabase/functions/` | 100 % pass |
| Typecheck | `npm run typecheck` | 0 errors |
| GPX parse | mobile unit tests | pass |
| Drift rules | sync script + drift_test | pass |

---

## 4. Tests device matrix

| Device | OS | GPS | Build |
|--------|-----|-----|-------|
| iPhone 15 Pro | iOS 18 | ✓ | TestFlight |
| iPhone SE | iOS 17 | ✓ | TestFlight |
| Android Pixel | 14 | ✓ | Internal (Play later) |

---

## 5. Performance

| Métrique | Seuil |
|----------|-------|
| Cold start | < 3 s |
| Map FPS | > 30 sustained |
| Battery 30 min run | < 15 % drain |
| ingest_run latency | < 5 s p95 |

---

## 6. Regression checklist (pre-release)

- [ ] `npm run typecheck`
- [ ] Deno tests green
- [ ] Pas chartreuse sur fond clair
- [ ] 1 CTA chartreuse par écran décision
- [ ] Aucun placeholder « Lorem » visible
- [ ] Secrets absents du bundle
- [ ] Analytics events §8 nommés correctement

---

## 7. Bug severity

| Sev | Definition | Block release |
|-----|------------|---------------|
| S0 | Crash loop, data loss run | Yes |
| S1 | ingest_run fail, fausse capture | Yes |
| S2 | UI broken, nav dead end | Yes |
| S3 | Copy wrong, cosmetic | No |
| S4 | Nice-to-have | No |

---

## 8. Sign-off

| Rôle | Critère | Signé |
|------|---------|-------|
| Mobile | RUN-01–07 pass device | |
| Backend | ingest_run staging | |
| Product | ONB + MAP comprehension test 5 users | |
| Legal | URLs live | |
| Release | TestFlight 48 h stable | |
