# GRYD — monorepo

Jeu de conquête de territoire par la course à pied. Nom public : **GRYD** (« Cours. Capture. Défends. » — le jeu de conquête de territoire pour run clubs). **Clearance INPI à faire avant usage public.** France entière capturable, Saison 0 focalisée Paris + Lille.

## Autorité documentaire (ordre strict)

> **09/09/2026 — ADR-012.** Décision du fondateur, mot pour mot : « Le cahier de
> septembre remplace le MASTER. » Cet ordre est le MÊME que celui de `CLAUDE.md` :
> Codex et Claude lisent la même constitution. Les arbitrages des contradictions
> vivent dans `docs/DECISIONS.md` — jamais dans une ligne ajoutée ici.

0. **`docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`** — le cahier de septembre :
   produit, règles, parcours G01–G29, design, médias, modèle économique, recette.
   Trois destinations Carte · Crew · Profil ; Course/Vélo ; boucle polygonale
   autoritaire ; aucune monnaie ni protection achetable ; XP par journées actives.
   Sa palette du §10.2 est SURCHARGÉE par la direction visuelle du 09/09
   (`docs/product/GRYD_DIRECTION_VISUELLE_2026.md` : noir, blanc, gris neutres,
   chartreuse `#B4FF0D`). Rappels du 09/09 rattachés à cette direction :
   - **Dernière matière globale du 9 septembre** : uniquement des surfaces translucides uniformes ; aucun effet de verre liquide, flou d'arrière-plan ou reflet spéculaire sur les contrôles dans toute l'application. Cette demande remplace les effets de verre antérieurs sur tous les écrans. Audit : `docs/design/GRYD_TRANSLUCIDE_GLOBAL_2026_09.md`.
   - **Dernière disposition carte du 9 septembre** : départ Courir/Rouler intégré au menu bas à trois destinations, Course/Vélo empilés en haut à droite et outils regroupés en bas à droite. Analyse des sept captures et critères de recette : `docs/design/GRYD_MAP_POUCE_2026_09.md`.
   - **Précisions carte et communauté du 9 septembre** : les territoires adverses adjacents peuvent avoir des nuances grises par propriétaire ; limites et affiliations crew restent explicites, sans inventer de copropriété. Voir `docs/product/GRYD_MAP_OWNERSHIP_2026_09.md`. Onboarding, contributions volontaires et conversation : `docs/product/GRYD_COMMUNAUTE_ONBOARDING_RECETTE_2026_09.md` et benchmark associé. Ces demandes remplacent les interdictions antérieures de nuance par identité ; la palette noir/blanc/gris/chartreuse reste active.
   - **Direction visuelle du 9 septembre, demande la plus récente** : noir, blanc, gris neutres et chartreuse uniquement ; iconographie et récompenses originales GRYD. Cette consigne remplace les teintes beige/forêt du §10.2 du cahier de septembre. Références et traduction produit : `docs/product/GRYD_DIRECTION_VISUELLE_2026.md`.
1. **`docs/DECISIONS.md`** — ADR datés. L'ADR-012 consigne les tensions ouvertes
   entre le cahier et ADR-011 (100 % gratuit) · ADR-010 (cellules H3) · ADR-008
   (palette `#C2FF23`) · ADR-006 (Rouen) · ADR-002 (reset) · ADR-003 (seuils,
   bouclier, decay). Elles se tranchent LÀ, par un nouvel ADR daté.
2. **`GRYD_MASTER_PROMPT.md` + `docs/SPEC-CORE / SPEC-UX / SPEC-GEO / SPEC-SHARE.md`**
   — archives et références techniques de la ligne du 03/08 : conservées, jamais
   supprimées, jamais une source de décision nouvelle.
3. **Tout le reste** = documentation de l'implémentation, jamais une décision :
   les compagnons Codex `docs/product/GRYD_*.md` du 09/09 (`GRYD_MASTER_SPEC.md`,
   API, benchmarks, notes d'implémentation, `REFONTE_2026_RECETTE.md`) et les
   anciens rangs ci-dessous. En cas de contradiction, le cahier prime sur eux, et
   un ADR prime sur eux. Anciens rangs (ex-1 à ex-7, désormais archives) :
   1. `docs/product/GRYD_MASTER_SPEC.md` + les 17 autres `docs/product/GRYD_*.md` — source de vérité produit.
   2. `AMENDEMENT-02-GRYD.md` — réconciliation GRYD ↔ SPEC v0.1 : deltas actifs (France entière, secteurs, `partial`, 5 onglets, pionnier par densité…) et arbitrages A1-A4.
   3. `SPEC-MVP-territoire-running-v0.md` — règles de jeu gelées §3, architecture, périmètre (là où l'amendement ne dit rien).
   4. `ADDENDUM-DESIGN-v0.1.md` — charte noir/blanc/chartreuse #B4FF0D, AMENDEMENT-01 (carte égocentrée). Toute couleur hors tokens = bug.
   5. `GRYD_REGLES_NON_NEGOCIABLES.md` — **constitution UI + carte (CONTRAIGNANT)** : §A 20 règles de simplification (1 écran = 1 action, pas de card-in-card, 1 CTA, textes jamais coupés, filtres dans Couches, live minimal, post-run 2 niveaux…), §B trace GPS héros façon Strava (casing+core, round caps, largeur par zoom, types de segments), §C couleurs par RÔLE (pas par identité) + scalabilité 200k (LOD par zoom, contesté 5 niveaux + pressure_score, jamais 200k runners, rival approximatif). Toute revue d'écran passe la checklist §A.
   6. `.Codex/orchestration-klaim/` — PRD, DISCOVERY (décisions D1-D18), PHASES, PROGRESS.
   7. `maquette-ui-klaim.html` — référence visuelle des 4 écrans clés.

### Interdits qui survivent au déclassement du MASTER (le cahier les reprend)
- **L'app ne ment jamais** (G26, §8.2, §5.2) : données réelles ou VIDES ; quatre
  états distincts ; jamais un « 0 » nu, un spinner infini ni un repli inventé.
- **Tout claim est décidé serveur, RLS partout** (§18.4, §18.2) ; écriture client
  interdite sur les tables de jeu.
- **Aucun bouton mort** (§17.5, §19.1) ; une doc ne promet jamais au-delà du code ;
  **anti-pay-to-win durci** (§16.2).
- Nuance OUVERTE, non tranchée : §17.5 tolère des « fixtures identifiées » pour la
  revue App Store là où `CLAUDE.md` est catégorique (zéro donnée factice).

### Migrations — règle absolue (leçon du 09/09/2026)
Parti d'un `main` arrêté à 0106, Codex a créé 0107-0117 alors que la prod avait
DÉJÀ 0107-0112 appliquées, avec un autre contenu ; elles ont été renumérotées
0118-0128 (`b48fde5`). Donc : une migration ne se réécrit jamais ;
`supabase migration list` AVANT tout push ; nouveau numéro = 1 + le plus haut
numéro CONNU DE LA PROD, jamais le plus haut du dossier local.

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
- **Épuration (voir `GRYD_REGLES_NON_NEGOCIABLES.md`)** : 1 écran = 1 décision + 1 CTA chartreuse max ; jamais de card dans card ; aucun texte d'action coupé par « … » ; filtres cachés derrière Couches ; détails au tap (jamais imposés) ; comprendre l'écran en < 3 s. Carte actuelle : chartreuse pour moi, nuances grises séparées par propriétaire adverse, affiliation crew visible par contour ; les anciens orange/violet sont remplacés. Jamais tous les runners — agrégation par zoom.

## Commandes
- Tests edge functions : `~/.deno/bin/deno test --allow-read supabase/functions/`
- Typecheck : `npm run typecheck` (racine → workspaces)
- Supabase local : `npx supabase start` (Docker requis)
- Sync constantes : `node scripts/sync-game-rules.mjs`

## Pièges monorepo connus
- **Deux React cohabitent** : racine = React 18 (Expo/mobile), `apps/web` = React 19 (Next 15). `styled-jsx` est volontairement épinglé en **5.1.7 dans les deps de `@klaim/web`** pour forcer son nesting sous `apps/web/node_modules` (sinon npm le hoiste à la racine où il résout React 18 → crash `useContext` au prerender des pages d'erreur). Ne pas « nettoyer » cette dépendance, ne jamais aliaser `react` dans la config webpack de Next (ça casse le React vendored des server components).

## Secrets
Jamais en dur. `.env.example` par app ; points ouverts O1-O4 dans DISCOVERY.md (projet Supabase, Apple/Google OAuth, RevenueCat, PostHog).
