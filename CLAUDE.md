# GRYD

Jeu mobile : courir → fermer une boucle → territoire sur la carte. MVP Saison 0 **Rouen**.

## Constitution (ordre strict — §1 du MASTER)
1. **`GRYD_MASTER_PROMPT.md`** (racine) — la constitution. Ne jamais contredire.
2. **`docs/DECISIONS.md`** — ADR datés. **ADR-001 (hybride)** : UI mobile reconstruite à neuf ;
   `packages/engine` + `packages/shared` + `supabase/` CONSERVÉS mais rien n'est « fait »
   sans re-preuve (`docs/STATUS.md` démarre 100 % ABSENT).
3. `docs/SPEC-CORE / SPEC-UX / SPEC-GEO / SPEC-SHARE .md` — specs par domaine.
4. Tout le reste (AMENDEMENT-*, anciennes specs, REPRISE_SESSION) = **ARCHIVES** : documentation
   du code conservé, jamais une source de décision nouvelle. Branche d'archive complète :
   `archive/pre-master-2026-08`.

## Interdits hérités qui restent constitutionnels (repris par le MASTER §12)
- **L'app ne ment jamais** : données réelles ou VIDES ; 4 états distincts (pas connecté / vide /
  échec / en cours) ; jamais un « 0 » nu, un spinner infini ni un repli inventé (L8, L14, L19).
- **Tout claim est décidé serveur** ; écriture client interdite sur les tables de jeu ; RLS partout.
- **Anti-pay-to-win strict** (règle 10) ; **zéro donnée factice** (aucune ville/classement inventé).
- **Aucun bouton mort** : l'affichage se dérive de la capacité RÉELLE de la plateforme.
- Une doc ne promet jamais au-delà du code ; migration jamais réécrite.

## Structure
```
apps/mobile      Expo RN TS strict (expo-router) — UI en reconstruction (ADR-001) ;
                 écrans legacy = quarantaine logique : ne pas lire/importer hors SALVAGE validé
apps/web         Next.js — landing + pages publiques zones/crews + OG (Phase 3)
packages/shared  game-rules.ts (TOUTES les constantes — ADR-003), design-tokens, events
packages/engine  moteur PUR (pipeline SPEC-GEO), testé sous Deno
supabase/        migrations (RLS partout) + Edge Functions Deno ; _shared/ = copies GÉNÉRÉES
scripts/         sync-game-rules.mjs (shared+engine → _shared/ + copies mobile, drift testé)
```

## Commandes
- **Gate complet (rien ne se commit sans son vert)** : `npm run gate`
  (= typecheck 4/4 · sync sans drift · audit:migrations · test:packages · test:mobile ·
  test:functions · test:sql). CI GitHub Actions = miroir exact.
- Sync constantes : `node scripts/sync-game-rules.mjs` — ne JAMAIS éditer `_shared/` à la main.
- Routes : `node scripts/audit-routes.mjs` · RLS réelle (réseau + secret, hors gate) :
  `set -a && . ./scratchpad-secrets.local && set +a && npm run verify:rls`
- Deno : `~/.deno/bin/deno` (pas dans le PATH par défaut).

## Conventions
- TS strict, pas de `any` · commits conventionnels français · aucun texte en dur (L18).
- Aucun nombre magique : toute constante de jeu vient de `packages/shared/src/game-rules.ts`.
- UI : `docs/SPEC-UX.md` fait loi (20 lois). Tout écran → gate `ux-gate` avant merge.
- Toute tâche → preuve `qa-verify` avant « fait » ; STATUS.md est le tableau de vérité.
- Chartreuse : token `colors.chartreuse` uniquement, jamais un hex en dur (ADR-008 ouvert).
- PGlite ne prouve PAS la RLS (superutilisateur) ; chaque test SQL commence par l'étape 0
  « le défaut existait » — sinon rien ne distingue une migration d'un no-op.

## Pièges monorepo payés cher (ne pas « nettoyer »)
- **Deux React cohabitent** : racine = React 18 (Expo), `apps/web` = React 19 (Next 15).
  `styled-jsx` est épinglé en 5.1.7 dans les deps de `@klaim/web` pour forcer son nesting local
  (sinon hoist racine → résout React 18 → crash `useContext` au prerender). Ne jamais aliaser
  `react` dans la config webpack de Next.
- Preview mobile-web : serveur `mobile-web` port 8081, `preview_list` d'abord (serverId change) ;
  routage par pathname. La carte MapLibre rend NOIRE en capture headless — c'est normal.
- Timestamps : l'égalité ISO ms vs microsecondes Postgres rend un UPDATE no-op silencieux —
  comparer en PLAGE de 1 ms.

## Backend
Projet Supabase `gryd` (`sydwxwwirinjoheeodcg`) — migrations appliquées jusqu'à `0106` en prod,
`0107-0111` committées non appliquées. Cursor pousse sur le même projet : toujours
`supabase migration list` avant un push. Secrets : jamais en dur ; `scratchpad-secrets.local`
(gitignored). Base réelle : 3 comptes, 0 donnée de jeu.

## Compaction
En compactant, préserver : décisions prises, fichiers modifiés, tâches ouvertes, commandes de test.
