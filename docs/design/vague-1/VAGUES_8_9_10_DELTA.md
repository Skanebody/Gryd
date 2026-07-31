# Vague 8–10 — audit & delta (28/07/2026, main `5515cf0`)

## Lot A — code mort → BRANCHÉ (pas supprimé)

| Module | Décision | Consommateur |
|---|---|---|
| `mapLayers.ts` | **branché** | `MapScreen*.tsx`, `BattleMapOverlays` (E12) |
| `mapAnalytics.ts` | **branché** | `MapScreen*.tsx` (`map_view`, `map_zone_tap`) |
| `pauseModel.ts` | **branché** | `RealCourseLive.tsx` (E23) |
| `signalHealth.ts` | **branché** | `RealCourseLive.tsx` (E24 telemetry) |

## Lot B — écrans vague 8

| Écran | Verdict | Delta fait |
|---|---|---|
| E11 Carte | **existait** ; analytics manquaient | `mapView` + `mapZoneTap` |
| E12 Couches | **partiel** (lentille exclusive seule) | interrupteurs E12 persistés/activité + urgences |
| E20/E21 Live | **existait** (même shell Run/Bike) | inchangé hors E23/E24 |
| E23 Pause | **partiel** | `describePause`, Annuler, telemetry transition |
| E24 GPS | **partiel** | `describeSignal` + interruption telemetry ; **aucune interpolation** |

## Lot C — vague 9

| Écran | Verdict |
|---|---|
| E29/E31/E32 Résultats | **déjà conformes** (`composeResult` / `course-result.tsx`) — non retouché |
| E76 Profil edit | **existe** |
| E77 Confidentialité | **partiel honnête** (zones protégées « bientôt ») — non inventé |

## Lot D — backfill

- Migration **0100** : refuse `algorithm_version` hex-backfill ; vue `territories_backfill_trace_ready`.
- `polyline_masked` n’est **pas** écrit par `ingest_run` → backfill depuis trace **impossible aujourd’hui** ; inventer depuis H3 est interdit (constitution §6).
- Client : `allowHexFallback: false` déjà sur `main` — captures sans polygone **invisibles** + note d’honnêteté.

## Suspens fondateur

1. Persister une trace/anneau exploitable à l’ingest pour rendre un vrai backfill possible.
2. Porte nav vers `/crew-edit` (écran utile mais orphelin côté audit-routes).
3. E77 zones protégées + délais de publication UI.
