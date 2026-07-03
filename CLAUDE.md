# GRYD — monorepo

Jeu de conquête de territoire par la course à pied. Nom public : **GRYD** (« Cours. Capture. Défends. » — le jeu de conquête de territoire pour run clubs). **Clearance INPI à faire avant usage public.** France entière capturable, Saison 0 focalisée Paris + Lille.

## Autorité documentaire (ordre strict)
1. `docs/product/GRYD_MASTER_SPEC.md` + les 17 autres `docs/product/GRYD_*.md` — source de vérité produit.
2. `AMENDEMENT-02-GRYD.md` — réconciliation GRYD ↔ SPEC v0.1 : deltas actifs (France entière, secteurs, `partial`, 5 onglets, pionnier par densité…) et arbitrages A1-A4.
3. `SPEC-MVP-territoire-running-v0.md` — règles de jeu gelées §3, architecture, périmètre (là où l'amendement ne dit rien).
4. `ADDENDUM-DESIGN-v0.1.md` — charte noir/blanc/chartreuse #B4FF0D, AMENDEMENT-01 (carte égocentrée). Toute couleur hors tokens = bug.
5. `.claude/orchestration-klaim/` — PRD, DISCOVERY (décisions D1-D18), PHASES, PROGRESS.
6. `maquette-ui-klaim.html` — référence visuelle des 4 écrans clés.

## Structure
```
apps/mobile      Expo (dev builds) TS strict — expo-location, @maplibre/maplibre-react-native, h3-js
apps/web         Next.js — site waitlist par code postal
packages/shared  game-rules.ts (TOUTES les constantes §3), design-tokens.ts, types.ts, events.ts
supabase/        migrations SQL (RLS partout) + Edge Functions Deno (ingest_run, …)
scripts/         sync-game-rules.mjs (copie shared → functions/_shared, drift testé)
```

## Règles non négociables
- **Aucun nombre magique** : toute constante de jeu vient de `packages/shared/src/game-rules.ts`. Les Edge Functions consomment la copie générée `supabase/functions/_shared/game-rules.ts` — regénérer avec `node scripts/sync-game-rules.mjs`, ne jamais l'éditer à la main.
- **Tout claim est décidé serveur** — le client n'attribue jamais un hex.
- Chaque écran logge ses events PostHog du §8 (noms exacts, définis dans `packages/shared/src/events.ts`).
- Pas de lib hors stack imposée sans justification en une ligne.
- RLS activé sur toutes les tables ; écriture client interdite sur `runs`/`hex_claims` (service-role via Edge Functions).
- Jamais de texte/icône chartreuse sur fond clair (contraste 1,2:1).

## Commandes
- Tests edge functions : `~/.deno/bin/deno test --allow-read supabase/functions/`
- Typecheck : `npm run typecheck` (racine → workspaces)
- Supabase local : `npx supabase start` (Docker requis)
- Sync constantes : `node scripts/sync-game-rules.mjs`

## Pièges monorepo connus
- **Deux React cohabitent** : racine = React 18 (Expo/mobile), `apps/web` = React 19 (Next 15). `styled-jsx` est volontairement épinglé en **5.1.7 dans les deps de `@klaim/web`** pour forcer son nesting sous `apps/web/node_modules` (sinon npm le hoiste à la racine où il résout React 18 → crash `useContext` au prerender des pages d'erreur). Ne pas « nettoyer » cette dépendance, ne jamais aliaser `react` dans la config webpack de Next (ça casse le React vendored des server components).

## Secrets
Jamais en dur. `.env.example` par app ; points ouverts O1-O4 dans DISCOVERY.md (projet Supabase, Apple/Google OAuth, RevenueCat, PostHog).
