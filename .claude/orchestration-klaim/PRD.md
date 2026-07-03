# PRD — KLAIM v0.1

**Autorité absolue : `SPEC-MVP-territoire-running-v0.md` (racine du repo) + `ADDENDUM-DESIGN-v0.1.md`.**
Ce PRD est un index, pas une réécriture. En cas de divergence, la spec gagne.

## Produit en une phrase
App mobile (iOS d'abord) où chaque course à pied revendique des hexagones H3 res 10 sur la carte réelle de sa ville (Paris + Lille, Saison 0 de 8 semaines), en crews de 2-10, avec monétisation confort/prestige (Club 4,99 €/mois, Starter Pack, Éclats, skins) — jamais de pay-to-win.

## Hypothèses testées (spec §1)
H1 boucle cœur (≥2 courses/sem) · H2 revanche (retour <72 h ≥35 %) · H3 viralité crews (invites ≥0,25/actif) · H4 conversion payante (≥2 % à 60 j).

## Périmètre
- IN : les 6 blocs de la spec §2.1 (carte H3, tracking+capture, crews, Saison 0, import HealthKit, monétisation+croissance).
- OUT : tout le tableau §2.2 (pass de saison, guerres de crews, fort/QG, vélo/marche, coach, feed social, replay 3D, Garmin direct, dotations réelles, web app).

## Règles de jeu
Gelées dans la spec §3 → matérialisées dans `packages/shared/src/game-rules.ts` (source de code unique, aucun nombre magique ailleurs).

## Design
Charte noir/blanc/chartreuse #B4FF0D verrouillée dans l'addendum (tokens §C, typo §E, composants §F, carte égocentrée §D = AMENDEMENT-01). Référence visuelle : `maquette-ui-klaim.html`.

## Architecture
Spec §6 : Expo RN + MapLibre + h3-js + Supabase (Postgres/PostGIS, Auth, Realtime, Edge Functions Deno) + RevenueCat + PostHog + Next.js waitlist.

## Jalons
Plan 14 semaines spec §10. **Milestone 1 (en cours) = Annexe A** : monorepo, migrations RLS, auth + carte MapLibre avec hexes factices, `ingest_run` (validations pures testées, transaction claims, idempotence).
