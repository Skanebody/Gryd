# PHASES — KLAIM (aligné sur le plan 14 semaines, spec §10)

Autorité : SPEC (racine) > DISCOVERY.md > ce fichier. Constantes : `packages/shared/src/game-rules.ts` uniquement.

| Phase | Semaines spec | Contenu | Statut |
|---|---|---|---|
| **P1 — Fondations (Milestone 1)** | 1-2 | Monorepo, shared, migrations RLS, ingest_run testé, carte MapLibre hexes factices, waitlist | **en cours** |
| P2 — Boucle cœur | 3-5 | Tracking GPS foreground, ingest_run branché bout-en-bout, résumé/célébration, points/streaks, auto-save | pending |
| P3 — Social | 6-7 | Crews, classements, notifications (vol/decay/digest), inbox, quiet hours | pending |
| P4 — Monétisation | 8 | RevenueCat (Club/Starter/Éclats/skins), triggers §5, rc_webhook | pending |
| P5 — Confiance | 9 | Import HealthKit, zones privées, export/suppression compte | pending |
| P6 — Croissance | 10 | Carte de partage 9:16, parrainage, waitlist reliée | pending |
| P7 — Durcissement | 11-14 | Perf carte, TestFlight, Android foreground service, stores | pending |
| P8 — Tests e2e finaux | pré-S0 | Régression complète multi-angles sur build livrable | pending |

## P1 — Tâches (détail)
| # | Tâche | Acceptation |
|---|---|---|
| 1.1 | Artefacts d'orchestration + CLAUDE.md | fichiers présents, conventions décrites |
| 1.2 | `packages/shared` : game-rules.ts (§3 complet), design-tokens.ts (addendum C/E), types.ts (contrats ingest/claim), events.ts (§8) | `tsc --noEmit` vert ; toute constante §3 présente et nommée |
| 1.3 | `supabase/migrations` : tables §6.2 + RLS (D15) + seed city_zones/seasons | `supabase db lint`/SQL valide ; RLS activé sur 100 % des tables |
| 1.4 | `supabase/functions/ingest_run` : validations §3.2 pures + tests Deno, transaction claims (locks/boucliers/protection/privacy/cap 1200), idempotence D14 | `deno test` vert ; cas limites §3.2 couverts |
| 1.5 | `apps/mobile` : Expo TS strict, auth Apple/Google (Supabase), carte MapLibre Paris + hexes H3 factices rendu addendum §D, nav 3 onglets, events PostHog | `tsc` vert ; `expo export` build sans erreur |
| 1.6 | `apps/web` : Next.js waitlist code postal, dark-first | `next build` vert |
| 1.7 | **Régression P1** : tests + typechecks + lint sur tout, commit | tout vert, rapport |

Dépendances : 1.2 bloque 1.4 et 1.5 ; 1.3 bloque 1.4 (schéma). 1.5, 1.6 parallèles.

## Definition of Done d'un milestone (spec Annexe A)
Build iOS OK sur device réel (**nécessite le Mac de l'utilisateur + compte Apple — hors périmètre session autonome, remplacé par `expo export` + typecheck**), tests des fonctions pures verts, lint zéro erreur, events analytics câblés (visibles dans PostHog dès qu'une clé est fournie — O3).
