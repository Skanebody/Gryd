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

## Deux cibles web, à ne jamais confondre

Le **mode vitrine a été abandonné le 21/07/2026** (décision fondateur « aligner la
vitrine sur le vrai produit », `AMENDEMENT-47-FIN-DU-MODE-DEMO.md`). La règle est
**« l'app ne ment jamais »** — données réelles ou vides, jamais inventées.

Ce qui est **vérifié** à ce jour : `EXPO_PUBLIC_SHOWCASE` et `isShowcasePlatform`
n'existent plus (l'export est supprimé de `src/lib/flags.ts` ; les occurrences
restantes sont des commentaires d'historique), et le typage de la carte rend le
repli « pas de vraies données ⇒ peins la démo » non compilable.

Ce que ce README **n'affirme pas** : que plus aucune surface ne peut afficher de
donnée fabriquée. Des modules `demo.ts` sont encore importés par des écrans vivants
(challenges, détail de course, événements de crew…), et `DemoCourseLive` est
toujours présent dans `app/course-live.tsx` même s'il n'a plus d'appelant. La liste
à jour de ce qui reste ouvert vit dans la section « Ce qui reste EN SUSPENS » de
`AMENDEMENT-47-FIN-DU-MODE-DEMO.md` — **c'est elle qui fait foi, pas ce README.**

### Le lien PUBLIC → `apps/web` (site Next.js)

C'est `apps/web` qui doit être déployé à l'adresse publique : waitlist par code
postal, page abonnement, mentions légales, CGV. Son rôle est d'**expliquer GRYD et
de recueillir des inscriptions**, sans qu'un visiteur ait besoin d'un compte.

> ⚠️ **Deux actions restent à faire, aucune n'est acquise :**
> 1. **Le redéploiement** — le lien public a longtemps servi le bundle
>    **mobile-web**, qui montrait la démo. Tant que l'hébergement n'est pas
>    rebasculé sur `apps/web`, c'est l'ancien bundle qui reste en ligne.
> 2. ~~Le nettoyage d'`apps/web` lui-même~~ — **FAIT le 21/07/2026.**
>    `lib/landing.ts` est passé de 307 à 77 lignes : `SEASON0`, `DEMO_LEADERBOARD`
>    et `FAKE_WAITLIST_COUNTS` ont disparu, avec les composants qui les
>    servaient (`HeroAlerts`, `LiveTerritoryFeed`, `CrewLeaderboard`,
>    `CityActivation`, `SeasonCountdown`). Le plateau France ne peint plus aucun
>    territoire : le code couleur est enseigné par une LÉGENDE hors carte, pas en
>    coloriant Paris en « à moi » et Lyon en « rival ». Les seuls nombres publiés
>    viennent de `@klaim/shared` (règles de jeu) ou de l'IGN (551 695 km²).

### `apps/mobile` sur le web → l'instrument de PREVIEW du fondateur (localhost)

```bash
npx expo start --web        # → http://localhost:8081
```

Avec les clés Supabase dans `apps/mobile/.env`, `localhost:8081` lit la **vraie**
session Supabase (persistée en `localStorage`) et applique la **vraie** garde
d'auth : c'est l'instrument de contrôle quand aucun build Expo n'est disponible —
et, les builds EAS étant bloqués par le quota Expo jusqu'au 1er août, le seul.

**Ce qu'il montre fidèlement** : l'état de session, les gardes de navigation, les
états vides / d'échec, la copie, la mise en page.
**Ce qu'il ne montre PAS à l'identique** — la « plateforme près » n'est pas un
détail : le rendu de carte est un fork web (`RealMap.web.tsx`, pas MapLibre
natif) ; le GPS passe par l'API navigateur, pas par `expo-location` ; et l'écran
de compte n'y propose **ni Apple ni Google** (aucun chemin utilisable dans un
navigateur — O2 et URL de redirection), seulement le code OTP par e-mail. Une
validation sur localhost ne remplace donc pas un passage sur l'iPhone pour tout
ce qui touche carte, GPS ou connexion par fournisseur.

Ce bundle **ne démontre rien à un visiteur sans compte**, et c'est voulu : il n'est
pas fait pour être publié.

Les **quatre** états restent distincts, ici comme sur iPhone : pas connecté →
invite à se connecter ; connecté sans données → invite à courir ; échec de
chargement → le dit et propose de réessayer ; **lecture en cours → n'affirme
rien** sur le joueur (un chargement n'est pas un état vide). Jamais d'écran blanc,
jamais de donnée inventée en repli.
