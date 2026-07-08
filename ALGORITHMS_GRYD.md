# Spécification algorithmes GRYD

**Source de vérité code :** `packages/engine/src/` + `supabase/functions/ingest_run/`  
**Constantes :** `packages/shared/src/game-rules.ts` (sync → `_shared/`)

---

## 1. Pipeline course → capture

```
Points GPS client
  → filterPoints / cleanTrace / smoothTrace (gps.ts)
  → validateRun (validation.ts)
  → hexesForSegments + detectLoop + enclosedCells (hexing.ts)
  → decideClaims (claims.ts) — ordre gelé, testé
  → computeScore + streakMultiplier (scoring.ts)
  → runTerritoryEngine (engine.ts)
  → claim_hexes RPC (DB)
  → badges, crew XP, challenges, bonuses
  → IngestRunResponse
```

**Règle absolue :** le client n'attribue jamais un hex.

---

## 2. Algorithmes implémentés

### 2.1 Tracking GPS (client)
| Fonction | Fichier | Statut |
|----------|---------|--------|
| Collecte fixes | `useRealRun.ts`, `tracker.ts` | ✓ natif |
| Filtrage aberrants | `RunTracker`, `gps.ts` | ✓ |
| Distance / allure | `tracker.ts` | ✓ |
| Pause / reprise | `tracker.ts` | ✓ |
| Background | `registerBackgroundTask.ts` | ✓ |
| Autosave kill | `runStore.ts` | ✓ |
| Offline queue | `pendingUpload.ts` | ✓ |

### 2.2 Détection de boucle
| Critère | Constante | Fichier |
|---------|-----------|---------|
| Tolérance fermeture | `LOOP_CLOSE_TOLERANCE_M` (80 m) | hexing.ts |
| Périmètre min | `LOOP_MIN_PERIMETER_M` | hexing.ts |
| Compacité min | `LOOP_MIN_COMPACTNESS` | hexing.ts |
| Largeur min | `LOOP_MIN_WIDTH_M` | hexing.ts |
| Plafond aire | `LOOP_MAX_AREA_BY_DISTANCE_KM2` | hexing.ts |

**Sortie :** `loopClosed`, `enclosedZones`, `capReached`, `loopRejectedReason`

### 2.3 Capture territoire
Ordre décision par hex (`claims.ts`) :
1. no_capture_zone → blocked
2. privacy → blocked
3. daily cap → blocked
4. already mine → defended / cooldown
5. neutral → claimed_neutral
6. adverse → steal / fresh protection / shield / lock

### 2.4 Défense
- `frontierCoverage` → heures extension decay (+24/48/72 h)
- `defenseHoursForCoverage`
- Shields : cluster 300 hex, 48 h, 2/semaine

### 2.5 Anti-triche GPS
| Signal | Action |
|--------|--------|
| Vitesse > 25 km/h | Rejet segment |
| Saut > 100 m | Rejet point |
| Précision > 25 m | Rejet |
| GPS trust < 80 | Verify partiel (0,5×) |
| Trust < 60 | Stats only |

Escalade : accept → limit_rewards → review → reject

### 2.6 Decay territorial
- Base 14 j sans activité (`extendDecay`, `zone.ts`)
- Rival proche accélère (sector pressure)
- Shield gèle
- Contrôle → 0 = neutre (`decay_job`)

### 2.7 XP, badges, saisons
- Multiplicateur scoring §23 (action × context × verify × streak)
- Badges : `evaluateBadges` post-run
- Crew XP cap quotidien §34
- Saisons 8 semaines, reset territoire

### 2.8 Courses de groupe
- `social.ts` : contested resolution, collusion penalty
- Bonus crew +10–20 % XP individuel, +25–50 % crew (plafonnés)
- Proximité, trajectoires connectées, fenêtre temps

---

## 3. Recommandation de course (NOUVEAU)

**Fichier :** `packages/engine/src/recommendation.ts`

### Entrées
- **Joueur :** distance habituelle, durée préférée, boucle/aller, fatigue, historique
- **Crew :** zones attaquées, urgence défense, objectifs, raids
- **Carte :** zones capturables, pression rival, qualité GPS

### Scores (0–1 chacun)
- Personal Fit
- Crew Impact
- Territory Value
- Friction (pénalité)
- Reward
- Novelty
- Safety

### Formule (constantes `game-rules.ts`)

```
FinalScore =
  RECO_W_PERSONAL   × personalFit
+ RECO_W_CREW       × crewImpact
+ RECO_W_TERRITORY  × territoryValue
+ RECO_W_REWARD     × reward
+ RECO_W_NOVELTY    × novelty
- RECO_W_FRICTION   × friction
```

### Sortie

```json
{
  "recommended_run": {
    "type": "conquest|defense|exploration|crew_support",
    "title": "Défendre République",
    "distance_km": 3.4,
    "estimated_duration_min": 20,
    "player_benefit": "+520 XP",
    "crew_benefit": "+258 pts crew",
    "why_this": ["adaptée à ta distance habituelle", "zone crew attaquée"],
    "friction_score": 0.18,
    "crew_impact_score": 0.91,
    "personal_fit_score": 0.86,
    "territory_value_score": 0.78
  }
}
```

**V1 client :** candidats démo (`route/demo.ts`) rankés par moteur.  
**V1 serveur :** Edge Function `recommend_run` avec bbox + profil (Phase 2).

---

## 4. Tests

| Suite | Commande |
|-------|----------|
| Engine Deno | `~/.deno/bin/deno test --allow-read supabase/functions/` |
| GPX parse | `npm test` (mobile) |
| Drift game-rules | `node scripts/sync-game-rules.mjs` + drift_test |

---

## 5. Gaps algorithmiques

| Algo | Gap |
|------|-----|
| Route géo réelle | Pas de routing OSRM/Mapbox — démo polylines |
| Danger routier | Non implémenté |
| Fatigue ML | Heuristique simple |
| Pré-calcul secteurs 200k | V1 backend, démo client |
