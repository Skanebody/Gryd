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

## ADR-010 — 2026-08-03 — La PROPRIÉTÉ, ce sont les cellules ; `territories` est la MÉMOIRE de la course
**Déclencheur (Belou)** : « un coureur ne prend pas une ville entière, il prend un pâté de rues […] il va prendre une partie et sûrement une autre en même temps ». La prise PARTIELLE n'est pas un cas limite : c'est le cas NORMAL.

### Le défaut, constaté
`ST_Difference` n'apparaît **nulle part** dans le dépôt : un polygone de `territories` n'est JAMAIS découpé quand un rival lui prend des cellules. Or :
- les points, les classements et le decay suivent `hex_claims` (la vérité) ;
- la carte lit `territories` (les polygones de boucle).

Donc, dès qu'une boucle mord sur une autre — c'est-à-dire presque toujours — **les deux joueurs voient chacun leur boucle entière sur un terrain qui n'appartient qu'à l'un d'eux**. La carte affirme une propriété que la base contredit. C'est l'interdit constitutionnel n°1, et il est atteint par le fonctionnement nominal, pas par un bug.

`complementClaims` (legacy) ajoute les cellules qu'aucun polygone ne couvre. Il ne sait pas RETRANCHER d'un polygone dont les cellules sont parties : c'est un pansement sur la divergence, pas une correction.

### Ce qui est écarté, et pourquoi
**Découper les polygones (ST_Difference).** Marcherait une fois, deux fois — puis produirait des multipolygones en échardes, des `area_m2` à recalculer à chaque passage, des règnes qui « continuent en plus petit », et une géométrie qui se dégrade par accumulation. C'est empiler de la réparation sur un modèle faux : tant qu'il y a DEUX sources de vérité, elles ne coïncident que si rien ne se recouvre.

### Décision
1. **Les cellules SONT la propriété.** Une seule source de vérité, celle qui décide déjà les points.
2. **La forme affichée se DÉRIVE des cellules tenues.** Perdre une partie, c'est perdre des cellules : la forme se redessine, sans découpe et sans divergence possible.
3. **`territories` cesse d'être « ce que je possède » et devient « comment je l'ai eu »** — la trace de la boucle courue. C'est exactement ce dont le registre des règnes (0109) et la carte de partage (§5.2) ont besoin ; ni l'un ni l'autre ne demandait une revendication.

C'est la lettre du MASTER §29 : « H3 invisible backend, **polygones organiques frontend** ». La conséquence n'en avait pas été tirée.

### Où le calcul a lieu — tranché par un fait, pas par un goût
**`h3` n'est PAS disponible comme extension sur le projet Supabase** (vérifié le 03/08/2026 : `pg_available_extensions` ne le propose pas ; seul PostGIS 3.3.7 est installé). La base ne peut donc PAS convertir un `h3index` en géométrie, aujourd'hui ni en installant quoi que ce soit.

⚠️ **Le MASTER §6 annonce « Postgres + PostGIS + h3-pg » : sur ce point, la doc promet au-delà du code.** Corrigé ici plutôt que dans le MASTER (§12.11).

`h3-js` est en revanche une dépendance de `apps/mobile` ET du moteur Deno. La dérivation a donc lieu **côté client** (rendu) et **côté Edge Function** (ce qui doit être décidé serveur) — jamais en SQL.

### Ce que ça coûte, dit franchement
Rendre l'union de cellules en forme organique est plus lourd qu'un `select` de polygones, et doit rester fluide au cadrage (L14). Le legacy a de la machinerie à reprendre (`ribbonRing`, `loopRing`, lissage). C'est un vrai chantier, pas un correctif.

### Conséquences immédiates
- `apps/mobile/src/mvp/map/readTerritories.ts` hérite du défaut (il ne lit que `territories`) : à rebrancher sur les cellules tenues.
- Les notifications ne peuvent pas dire « il t'a pris {zone} » — il t'en a pris une PARTIE. Ce qui est perdu s'exprime en m² (voir la note sur la microcopy ci-dessous).
- La Phase 2 du MASTER prévoyait « reprise (ST_Difference) » : cette ligne devient sans objet.

### Premier pas FAIT (03/08/2026)
`mvp/map/heldShape.ts` (10 tests) dérive la forme des cellules via `h3-js`, et `readTerritories.ts` lit désormais `hex_claims` pour la FORME — `territories.area_m2` restant la source unique du chiffre héros (le recalculer donnerait un second chiffre qui contredirait l'écran de résultat). Les deux lectures doivent réussir ENSEMBLE : une forme sans aire décrirait une possession que l'autre moitié dément.
`ownedCount` compte désormais des CELLULES, pas des polygones — sinon quelqu'un qui a tout perdu resterait « possédant » parce que ses traces de course sont encore en base.
Le test qui porte la décision : « perdre la moitié de ses cellules RÉTRÉCIT la forme ». Avec l'ancienne lecture, les deux formes auraient été IDENTIQUES.
**Lissage FAIT (03/08/2026, 7 tests de plus).** Chaikin, 2 passes, sur l'anneau FERMÉ — lisser comme une ligne ouverte laisserait un coin pointu au point de fermeture, c'est-à-dire le seul angle vif de toute la forme, donc exactement celui que l'œil trouve. Tous les anneaux, TROUS COMPRIS : ne lisser que l'extérieur laisserait des trous hexagonaux au milieu d'une forme organique.
⚠️ Le lissage RÉTRÉCIT (Chaikin coupe vers l'intérieur) et c'est le BON sens de l'erreur : dessiner vers l'extérieur peindrait du sol appartenant à quelqu'un d'autre. Il ne touche QUE le dessin — l'aire annoncée vient de `territories.area_m2`, jamais de l'anneau lissé, sinon deux écrans de la même app donneraient deux chiffres.
Une étape 0 mesure d'abord que le contour BRUT est anguleux (~120°) : sans elle, l'assertion « c'est lisse » ne prouverait pas que ça l'est devenu.

RESTE À FAIRE : les zones des AUTRES joueurs (le MVP ne peint que les miennes) et la microcopy des notifications en m² perdus.
