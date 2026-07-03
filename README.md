# KLAIM (nom de code)

Jeu de conquête de territoire par la course à pied — Paris + Lille, Saison 0.
Chaque course revendique des hexagones H3 sur la carte réelle de ta ville. Crews de 2-10. Saisons de 8 semaines.

> ⚠️ Nom de code uniquement — clearance INPI/EUIPO requise avant tout usage public.

## Documents de référence
| Fichier | Rôle |
|---|---|
| `SPEC-MVP-territoire-running-v0.md` | Source de vérité produit + règles de jeu gelées (§3) |
| `ADDENDUM-DESIGN-v0.1.md` | Charte noir/blanc/chartreuse #B4FF0D + carte égocentrée |
| `maquette-ui-klaim.html` | Référence visuelle des 3 écrans clés |
| `CLAUDE.md` | Conventions du monorepo |
| `.claude/orchestration-klaim/` | PRD, décisions (DISCOVERY), phases, avancement |

## Monorepo
```
apps/mobile      Expo (dev builds) — iOS d'abord
apps/web         Next.js — site waitlist
packages/shared  Constantes de jeu, tokens design, types, events
supabase/        Migrations (RLS partout) + Edge Functions Deno
```

## Démarrer
```bash
npm install
npm run typecheck          # tous les workspaces
npm run test:functions     # tests Deno des Edge Functions (deno requis)
npm run sync:rules         # après toute modif de packages/shared/src/game-rules.ts
npx supabase start         # backend local (Docker requis)
```

Secrets : copier les `.env.example` de chaque app. Points ouverts (projet Supabase, OAuth Apple/Google, RevenueCat, PostHog) : voir `DISCOVERY.md` O1-O5.
