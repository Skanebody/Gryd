# GRYD — DECISIONS (ADR)

> Rang 2 de la hiérarchie (§1 du MASTER PROMPT). Toute décision postérieure au
> gel du 2026-08-02 vit ici, datée. 6 lignes max par ADR.

## ADR-001 — 2026-08-03 — Phase 0 en mode HYBRIDE (décision Belou)
Contexte : la prémisse §6.1 (« l'existant est une PWA ») est fausse — `apps/mobile` est déjà Expo natif (expo-location + task-manager, `UIBackgroundModes: [location]`, EAS, never-lose-a-run testé).
Décision : UI mobile reconstruite À NEUF contre SPEC-UX ; `packages/engine` + `packages/shared` + `supabase/` CONSERVÉS (3 900 tests encodent les leçons payées : 2 fuites privacy, resetSeason destructeur, file d'upload) ; STATUS.md démarre 100 % ABSENT — chaque ligne re-prouvée par `qa-verify` dans le contexte MVP.
Conséquences : `main` n'est pas vidé ; archive `archive/pre-master-2026-08` poussée ; l'interdit §12.12 s'applique aux ÉCRANS legacy (`apps/mobile/app`, `apps/mobile/src/features/*` UI) — le moteur conservé n'est pas une « archive ».

## ADR-002 — 2026-08-03 — Reset de Saison 0 = TOTAL FESTIF (décision Belou)
La règle 9 du MASTER l'emporte sur la décision du 28/07/2026 (migration 0106 / `SEASON_RESET_KEEPS.territory = true`).
Conséquences (Phase 4) : `SEASON_RESET_KEEPS.territory`/`shields` → `false` par migration ; copie E12/E61 re-basculée ; les gardes (`flags.test.ts`) suivent le fait (conditionnées à `SEASON_CLOSE_SCHEDULED`). Jusqu'à Phase 4, les saisons restent désarmées (0106) — rien ne se clôture tout seul.

## ADR-003 — 2026-08-03 — `game-rules.ts` reste LA source des constantes
Pas de `config/game.ts` séparé : 3 900 tests + `scripts/sync-game-rules.mjs` dépendent de `packages/shared/src/game-rules.ts`, et un 2ᵉ fichier violerait « aucun doublon de constante ». L'intention de l'Annexe A (un fichier, tunable par saison) est satisfaite.
Les VALEURS Annexe A entrent en deltas phasés, chacun avec ses tests : bouclier 48→24 h · crew 50→20 · decay fragile J+7 + neutre J+14 · seuils 1ʳᵉ capture (400 m / 2 000 m²) · cap hebdo 100 pts · quiet hours 21h30–8h · géométrie sociale +30 m.

## ADR-004 — 2026-08-03 — Outillage : npm workspaces conservé
Pas de migration pnpm/turborepo (aucun effet joueur, coût > bénéfice ; révisable). Vitest non introduit : le moteur est testé sous Deno (plus strict, déjà câblé au gate). Maestro adopté en Phase 1 pour l'e2e GPS mocké.

## ADR-005 — 2026-08-03 — Monétisation HORS MVP (§7 OUT confirmé)
Les chantiers A-48 (soutien de crew), trois offres et GRYD+ sont PARQUÉS post-MVP. Déjà inertes par construction (`built`/O3 : aucune surface d'achat peinte). Aucun code retiré ; l'interdit §12.4 est respecté au lancement.

## ADR-006 — 2026-08-03 — Rouen, beachhead unique de la Saison 0
Remplace Paris + Lille. AMENDEMENT-35 (Europe) reste la vision ; la règle « zéro donnée EU factice » reste constitutionnelle.

## ADR-007 — 2026-08-03 — Transcription §9.2
Les contenus des 8 fichiers agents vivent dans `.claude/agents/` (créés en Phase 0) ; le MASTER y renvoie. Adaptations loggées : `geo-engine` → `packages/engine` + `npm run test:packages` (Deno) ; `backend` → `npm run test:sql` (PGlite) + `npm run test:functions`.

## ADR-008 — 2026-08-03 — TRANCHÉ : la palette du dépôt fait foi (`#C2FF23`, fond `#060907`)
Décision déléguée par Belou (« il faut créer un univers spécifique à GRYD, donc choisis »). J'avais mal posé la question : ni `#B4FF0D` ni `#D8FF3E` — le token vaut **`#C2FF23`**, au bout d'une chaîne datée et arbitrée (`#B4FF0D` charte → `#C9FF38` Night Print D-04 → `#C2FF23` spec §3.2 D-19, règle fondateur « prends le dernier »).
**Ce qui tranche n'est pas l'accent mais l'ÉCHELLE NEUTRE** : `#060907`, `#151C17`, `#1D251F`, `#2A342D`, `#9CA59E`, `#F5F7F5` sont TOUS à dominante VERTE (G > B > R). La chartreuse y est native. Le fond du MASTER (`#0B0E11`) est à dominante BLEUE : la même chartreuse y paraîtrait rapportée. L'univers spécifique à GRYD est là — un near-black verdi et une famille de gris qui portent déjà l'accent.
Mesures : `#C2FF23` fait **16,78:1** sur `#060907` (AAA large). `#D8FF3E` est l'écart de la série (H 72° contre 76-79°, le plus clair, donc le plus « surligneur jaune » — le moins distinctif). `grisFaible` reste corrigé à `#707B72` (4,54:1) contre la spec (`#667068`, 3,89:1 — sous AA) : l'accessibilité tranche, et cette mesure serait perdue en adoptant la palette du MASTER.
Conséquences : `docs/SPEC-UX.md` et `.claude/agents/mobile-ui.md` corrigés — je les avais écrits en Phase 0 en recopiant le MASTER sans ouvrir les tokens. Le MASTER n'est PAS réécrit (§12.11) : cet ADR est le mécanisme prévu. Règle inchangée pour l'UI : `colors.*`, jamais un hex en dur.

## ADR-009 — 2026-08-03 — i18n : les catalogues TYPÉS restent, pas de `locales/*.json`
L'Annexe E du MASTER prescrit `locales/fr.json` + `en.json`. Le dépôt a 78 catalogues TypeScript où une `Entry` est un `Record<Locale, string>` COMPLET : ajouter un texte sans ses cinq langues est une erreur de compilation, donc un gate rouge. Un JSON ne peut pas offrir ça — une clé manquante ne se voit qu'à l'exécution, chez le joueur, dans la langue qu'on ne teste jamais.
L18 exige « aucun texte en dur, parité FR/EN, pluriels gérés » : c'est tenu, et plus strictement. Le FORMAT n'était pas la règle ; la garantie l'était.
Conséquences : la microcopy MVP (Annexe C) vit dans `apps/mobile/src/i18n/catalog/mvp.ts`, en cinq langues parce que le type l'impose. Le MVP n'en EXPOSE que deux — restreindre se fait au sélecteur de langue, jamais en amputant un catalogue (une chaîne absente n'affiche pas un repli, elle affiche une clé brute).
