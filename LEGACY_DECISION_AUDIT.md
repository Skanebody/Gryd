# GRYD — LEGACY DECISION AUDIT

> **Artefact mandaté** par `docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md:204-218` et par
> `GRYD_REFONTE_DIRECTEMENT_BRANCHEE_ZERO_DEMO_CLAUDE_CODE.md:1711` / `:2218` (cahier de refonte
> fondateur, **hors dépôt**, `/Users/benjaminbel/Downloads/`). Format imposé, 8 champs par élément :
> Décision historique · Source · Date si connue · Implémentation actuelle · Conflit avec la vision
> présente · Décision finale · Migration requise · Tests requis.
>
> **Produit le 26/07/2026. Phase 0 — audit SANS modification.** Aucun fichier de code n'a été
> touché : ce document est le seul écrit de la passe.

---

## 0. Méthode, et ce qu'elle interdit

### 0.1 Les cinq règles appliquées

1. **L'existant n'est jamais une preuve de conformité.** Aucune ligne ci-dessous ne dit « déjà fait »
   sans la chaîne `EXIGENCE → implémentation (fichier:ligne) → différence → action → test`.
2. **Aucun statut CONFORME sur la lecture d'un nom de fichier, d'un commentaire, d'un TODO, d'un type
   ou d'une interface.** Là où je n'ai que le commentaire, le statut est `NON VÉRIFIABLE` et je le
   dis — pas `CONFORME`.
3. **Interdiction du biais du coût irrécupérable.** Aucune ligne ne conserve un choix « parce qu'il
   est déjà codé ». Quand je conserve, je donne le motif produit, pas le coût.
4. **Best current version wins.** Le code est une OBSERVATION.
5. **Ancien ≠ obsolète.** Une règle de gameplay gelée (SPEC §3) reste EN VIGUEUR tant qu'un document
   plus récent ne la lève pas *explicitement*. Le §9 dit lesquelles je laisse debout, et pourquoi.

### 0.2 Statuts autorisés (un seul par élément)

`CONFORME` · `PARTIELLEMENT CONFORME` · `OBSOLETE` · `REDONDANT` · `SURDIMENSIONNÉ` ·
`SOUS-DIMENSIONNÉ` · `NON VÉRIFIABLE` · `ABSENT` · `BLOQUANT`

### 0.3 Contrainte de la passe, dite franchement

Un autre chantier écrivait dans les `.ts/.tsx` du dépôt **pendant** cet audit (`git worktree list` →
branche `claude/gryd-refonte-audit-d6bf52`, HEAD `84c47fb`). Toute preuve `fichier:ligne` ci-dessous
est datée du **26/07/2026** et vaut pour l'arbre `391a48a` + working tree lu à cet instant. Elle ne
vaut pas certificat de conformité du code — ce n'était pas mon lot, et la règle n°1 l'interdit de
toute façon.

### 0.4 Les gisements réellement ouverts

| # | Gisement | Volume lu | §  |
|---|---|---|---|
| A | `AMENDEMENT-*.md` à la racine | **46 fichiers**, A-02 → A-47 (A-01 et A-03 manquent ; deux fichiers portent le n° 41) | §1 |
| B | `.claude/orchestration-klaim/DISCOVERY.md` | D1-D18, O1-O10 (58 lignes) | §2 |
| C | Constitution + specs racine + `docs/product` + planches Vague 1 | 78 `.md` racine, 42 `docs/`, `docs/design/vague-1/` | §3 |
| D | Historique git | 100 derniers commits (`git log --oneline`) | §4 |
| E | Décisions énoncées DANS le code | `game-rules.ts` (3 296 l.), `flags.ts`, migrations 0070-0072, docblocks normatifs | §5 |
| F | Flags, routes sans porte, i18n, wording, paywalls, permissions | scan `apps/mobile/app` (47 routes), `apps/web`, `packages/` | §6 |
| G | Documents fondateurs **hors dépôt** | 2 fichiers absents + 2 présents (dont 1 vérifié identique au bit près) | §7 |

---

# 1. GISEMENT A — Les 46 amendements

> **Lecture.** « Implémentation actuelle » ne certifie rien sur la qualité : elle dit ce que j'ai vu,
> avec sa preuve. « Conflit » compare à la vision présente = Spéc Maître Unifiée 2026 + cahier de
> refonte du 26/07 + décision VÉLO du 26/07. Une case « — » veut dire : aucun conflit trouvé, pas
> « vérifié conforme ».

## 1.1 Trous de numérotation — deux décisions actives SANS fichier source

| Décision historique | Source | Date | Implémentation actuelle | Conflit avec la vision présente | Décision finale | Migration requise | Tests requis |
|---|---|---|---|---|---|---|---|
| **AMENDEMENT-01 — carte égocentrée monochrome + chartreuse** (remplace le rendu « 12 couleurs de crews ») | Aucun fichier `AMENDEMENT-01-*.md`. Décision citée par `ADDENDUM-DESIGN-v0.1.md:69`, `SPEC-MVP-territoire-running-v0.md:76`, `AGENTS.md:9`, `AMENDEMENT-09-MAP-UBER.md:16` | ~03/07/2026 | Vivante : la règle « couleurs par RÔLE, jamais par identité » est la §C de `GRYD_REGLES_NON_NEGOCIABLES.md`, réaffirmée par A-37 et A-39 §1 | Aucun conflit de FOND. Conflit de FORME : `SOURCE_OF_TRUTH_REGISTER.md:47` écrit « AMENDEMENT-01..46 » comme si les 46 existaient — le registre décrit un corpus qui n'est pas celui du disque | **ABSENT** (le fichier). Ne pas recréer un A-01 rétroactif : la règle a un porteur plus récent et plus fort (§C de la constitution UI). **Corriger le registre** pour qu'il énumère l'existant | Non | Non |
| **AMENDEMENT-03 — typographie « Outcrowd »** : ITC Avant Garde Gothic (fallback Poppins) + Lora + Space Mono | Aucun fichier. Cité par `ADDENDUM-DESIGN-v0.1.md:83`, `TYPOGRAPHY_AUDIT.md:71`, `DESIGN_TOKENS.md:177`, `.claude/orchestration-klaim/PROGRESS.md:5`, **et appliqué en prod web** : `apps/web/app/layout.tsx:3` (`Lora, Poppins, Space_Mono`) + docblock `:8` | 03/07/2026 | **ENCORE APPLIQUÉE sur `apps/web`.** Le mobile a basculé sur Night Print : `packages/shared/src/design-tokens.ts:59-66` = `InterTight_800/700/600`, `Inter_400/500/600/700`, `JetBrainsMono_500` ; chargées par `apps/mobile/src/lib/fonts.ts:19-26` | **CONFLIT ACTIF ET VISIBLE.** Le cahier de refonte §5.1 impose « Dark Athletic Cartography / Direction Night Print ». Deux identités typographiques coexistent dans un même produit : le site public parle Poppins, l'app parle Inter Tight. Un visiteur qui installe l'app change de marque | **OBSOLETE pour la direction, ACTIF dans le code web.** Aligner `apps/web` sur Night Print (Inter Tight / Inter / JetBrains Mono, toutes libres — supprime au passage la dette « licence Avant Garde à acquérir » décrite dans le docblock `layout.tsx:9-21`). **Décision autonome, cf. §9-D1** | Non (fontes web) | Test de non-régression visuel `apps/web` (VISUAL_REGRESSION_PLAN.md) + vérifier qu'aucun `--font-*` de `globals.css` ne reste orphelin |

## 1.2 A-02 → A-19 — fondations produit et gameplay

| Décision historique | Source | Date | Implémentation actuelle | Conflit avec la vision présente | Décision finale | Migration requise | Tests requis |
|---|---|---|---|---|---|---|---|
| **A-02 §1 — nom public GRYD, baseline « Cours. Capture. Défends. »** | `AMENDEMENT-02-GRYD.md:9-13` | 03/07/2026 | Baseline **remplacée** en surface : `apps/web/app/layout.tsx:53` et `apps/web/app/components/landing/dictionary.ts:42-43` portent « Cours pour ton crew. / Conquiers ta ville. ». Aucune occurrence de l'ancienne baseline dans `apps/`/`packages/` (grep 0 résultat) | Le TEXTE d'A-02 §1 dit encore « Baseline inchangée : Cours. Capture. Défends. » — faux depuis A-42 | **OBSOLETE** sur la baseline uniquement (le nom GRYD tient). Marquer A-02 §1 `SUPERSÉDÉ PAR A-42` en tête de fichier | Non | Non |
| **A-02 §2 — « la France entière capturable »** (remplace le city-gating SPEC §3.1) | `AMENDEMENT-02-GRYD.md:14-16` | 03/07/2026 | Le gating est effectivement levé : ouverture par présence, toutes communes FR (`0068_fr_communes_reference.sql`, `0066_open_city.sql`, commits `9547f0b`/`fed44d7`/`db55e56`) | **OBSOLETE quant au CADRE** : A-35 (12/07) porte le plafond à l'Europe. Le corpus n'a PAS été balayé : « France entière » subsiste dans `AMENDEMENT-02-GRYD.md:14,16`, `docs/product/GRYD_MASTER_SPEC.md:9,62`, `GRYD_map_zones_sectors_rules.md:20,324,341`, `GRYD_reglement_saison_0.md:74`, `.claude/orchestration-klaim/DISCOVERY.md:3`, **`CLAUDE.md:9`** (sa propre ligne 3 dit pourtant Europe) et **`AGENTS.md:3,7`** | **OBSOLETE.** Balayage documentaire « France entière » → « Europe entière », avec renvoi A-35. Priorité haute sur `AGENTS.md` et `CLAUDE.md:9` : ce sont les fichiers que les agents lisent en premier | Non | Non (grep de non-régression dans la revue doc) |
| **A-02 §3 — nav 5 onglets** | `AMENDEMENT-02-GRYD.md`, repris `DISCOVERY.md:3` | 03/07/2026 | 5 `Tabs.Screen` déclarés (`apps/mobile/app/(tabs)/_layout.tsx:85-97`), **3 rendus** par la barre custom (`GrydNavBar.tsx:39-47` : Carte · Crew · Profil, `classement` conditionné par `flags.season`) | Conflit **résolu par le code, pas par les docs** : A-39 §4 impose 3 onglets, le cahier de refonte §4.2 impose « exactement trois destinations ». Le code y est. Les docs disent encore 5 | **OBSOLETE.** La cible est 3 (A-39 §4 + refonte §4.2, concordants). Reste une dette : 5 écrans-onglets déclarés pour 3 affichés (cf. §6.1) | Non | Test pur sur la table de nav (aucun test mobile n'existe : `FEATURE_FLAG_ARCHITECTURE.md:0` — un seul test dans `apps/mobile`) |
| **A-04 — 50 badges, 5 familles, polychromie autorisée SUR LES SEULES SURFACES BADGE** | `AMENDEMENT-04-BADGES.md:19-23` | 03/07/2026 | Catalogue `packages/shared/src/badges.ts` ; couleurs en DATA (`familyColor`), pas dans `design-tokens` | Remplacé en catalogue par A-06 §1.1 (raretés → 6 tiers). L'exception polychrome, elle, n'a jamais été levée | **PARTIELLEMENT CONFORME** : §2 (catalogue) OBSOLETE — remplacé par A-06 ; §1 (exception polychrome contrôlée) **reste EN VIGUEUR** | Non | Test existant sur le catalogue badges (à confirmer dans les 67 `*_test.ts`) |
| **A-05 — Landing V2 + 2ᵉ exception palette (`--ennemi` #FF5C33 / `--rival` #8B5CF6)** | `AMENDEMENT-05-LANDING-V2.md:32-39` | 03/07/2026 | Les rôles orange/violet sont devenus la §C de la constitution ; le hero landing a été refait (A-42) puis purgé de ses faux joueurs (A-47 §4) | Le §1 d'A-05 décrit une landing (« LA FRANCE EST OUVERTE. », hero + baseline d'A-02) qui **n'existe plus** | **OBSOLETE** sur la landing ; les tokens de rôle survivent via §C. Marquer A-05 `HISTORIQUE` | Non | Non |
| **A-06 — badges à niveaux (6 tiers), crews Supercell, nav V2, Activity Hub** | `AMENDEMENT-06-BADGES-NIVEAUX-CREWS.md:48-53` | 03/07/2026 | Tiers `road·tempo·race·carbon·elite·legend` ; migration crews `0010_crews_supercell.sql` | Les badges sont **masqués derrière `flags.arsenal`** pour une partie de leur surface premium et la collection reste hors nav MVP | **PARTIELLEMENT CONFORME.** Décision de périmètre assumée (A-39 §6), pas une dette. À réévaluer avec `flags.season` (cf. §8-G2) | Non | — |
| **A-07 — profils motivationnels, modes de course, visibilité** | `AMENDEMENT-07-SOCIAL-MOTIVATION.md:58-65` | 03/07/2026 | `settings-motivation.tsx` existe ; `RunModeSheet.tsx` **supprimé** comme dead-code (commit `65174d7`, Row 1) | Le mode `social_run`/`course_privee` d'A-07 §2 était choisi dans un sheet qui n'existe plus. Le doc décrit une porte fermée | **PARTIELLEMENT CONFORME / SOUS-DIMENSIONNÉ.** Les modes vivent en type mais leur SÉLECTEUR a disparu : soit rebrancher un point d'entrée, soit acter par écrit que le MVP ne connaît qu'un mode. **Ne pas laisser le type promettre un choix que l'UI n'offre pas** | Non | Test pur : `RunMode` non-`conquete` inatteignable ⇒ le type doit le refléter ou l'UI l'offrir |
| **A-08 §0 — ErrorBoundary global brandé, plus jamais d'écran d'erreur brut** | `AMENDEMENT-08-GAME-UI.md:71-72` | 03/07/2026 | Le boundary est **remonté au layout racine** via l'export `ErrorBoundary` d'expo-router : `apps/mobile/app/_layout.tsx:58` ; docblock `:43-57` explique que c'est le seul emplacement qui attrape `useAppFonts` | **CONVERGENT** avec le cahier de refonte §1.5 (« fonts is not defined » = point n°1 de l'ordre d'exécution §8). Une dette annexe : `src/ui/ErrorBoundary.tsx` « n'est plus utilisé par personne » (`_layout.tsx:57`) | **CONFORME** sur le mécanisme (preuve : `_layout.tsx:58` + docblock). **REDONDANT** pour `src/ui/ErrorBoundary.tsx` → à supprimer | Non | Test pur sur `appErrorPolicy.ts` (existe : `src/ui/appErrorPolicy.test.ts`) |
| **A-09 §0 — carto SOMBRE premium (arbitrage contre le « fond clair » du brief)** | `AMENDEMENT-09-MAP-UBER.md:84-85` | 03/07/2026 | Fonds `dark` / `color` / `satellite` (`features/map/mapPref.ts:12,50,87`) | A-28 a ajouté `satellite` (fond CLAIR) — l'arbitrage « sombre » a donc été rouvert par le fondateur lui-même, avec compensations de contraste (`allTerritories.ts:79-81,468-469`) | **PARTIELLEMENT CONFORME** — l'arbitrage tient comme DÉFAUT, plus comme exclusivité. À reformuler dans A-09 | Non | Test existant : `grydBasemapStyle.test.ts:187` (collisions d'identifiants JEU/3D/satellite) |
| **A-10 §0 — DA badge unifiée bouclier-hexagone ; §1 deux régimes UI (conviction / usage réel, GLASS INTERDIT en usage réel)** | `AMENDEMENT-10-ROUTE-PLANNER-UIUX-2026.md:97-103` | 03/07/2026 | `packages/shared/src/badge-icons.ts` prévu par le doc | La règle « 2 régimes » est absorbée et durcie par la Spéc Maître + §A. Le Route Planner d'A-10 a été refondu (E05/E06) | **PARTIELLEMENT CONFORME.** Le §1 (2 régimes) reste une bonne règle transverse ; le §2+ (écrans nommés) est OBSOLETE, remplacé par les planches E01-E21 | Non | — |
| **A-11 — les hexagones ne sont PLUS JAMAIS affichés ; H3 reste couche technique** | `AMENDEMENT-11-TERRITOIRES-ORGANIQUES.md:108-116` | 03/07/2026 | Aucun libellé « hex » dans les catalogues i18n user-facing (grep `fr:`/`en:` sur `src/i18n/catalog/*.ts` → 0). H3 vit côté moteur/DB (`hex_claims`, `h3index`) | Aucun. Renforcé par la Spéc et les planches (« zones », « secteurs ») | **CONFORME** sur le vocabulaire visible (preuve : grep i18n = 0 occurrence). NON VÉRIFIÉ ici : le rendu carte lui-même (pas mon lot, chantier concurrent) | Non | Test pur « aucune Entry i18n ne contient `hex` » — **à écrire**, c'est le seul verrou qui empêche la régression |
| **A-12 A — 2 objectifs CONQUÉRIR / DÉFENDRE sur le bouton central** | `AMENDEMENT-12-BOUCLE-ZONE.md:123-128` | 04/07/2026 | **Périmé 24 h plus tard** par A-14 (« GO », le joueur ne choisit plus), puis A-29 (verbes contextuels), puis A-38 (GO override). Cf. §8-G1 | Chaîne de 5 décisions contradictoires sur UN bouton | **OBSOLETE** pour le bouton. **EN VIGUEUR** pour la LECTURE du jeu (conquérir/défendre restent le modèle mental) | Non | — |
| **A-12 B — « fermer une boucle capture l'intérieur »** (delta moteur sur SPEC §3.1) | `AMENDEMENT-12-BOUCLE-ZONE.md:130+` | 04/07/2026 | Constantes de boucle en `game-rules.ts` (`LOOP_CLOSE_TOLERANCE_M`, `LOOP_MIN_COMPACTNESS`, `BIKE_LOOP_*:2821-2880`) | Aucun. **Règle de gameplay gelée, jamais levée** — la décision vélo l'a au contraire ÉTENDUE au vélo | **CONFORME (règle en vigueur).** Ne pas la rouvrir : §0.1 règle 5 | Non | Tests Deno existants (moteur de boucle) — dans les 67 fichiers `*_test.ts` |
| **A-13 — vraies tuiles cartographiques ; prod = Protomaps → point ouvert O6** | `AMENDEMENT-13-CARTE-REELLE.md:136-140` | 04/07/2026 | Tuiles CARTO en dev ; O6 (clé/PMTiles auto-hébergé) **jamais tranché** | **O6 n'est PAS dans `DISCOVERY.md`.** Il est né dans un amendement et n'a jamais rejoint la liste des points ouverts. Un point ouvert qui n'est pas dans la liste des points ouverts n'est pas suivi | **PARTIELLEMENT CONFORME.** Rapatrier O6 dans `DISCOVERY.md` (§9-D2) | Non | Non |
| **A-14 — « GO » sur le bouton, tap = départ immédiat, zéro question** | `AMENDEMENT-14-GO-FIRST.md:147-156` | 05/07/2026 | GO existe : `apps/mobile/app/(tabs)/index.tsx:387` (`<Text style={styles.runLabel}>GO</Text>`), docblock `:96` cite A-38 | Contredit par A-29 (« GO est retiré définitivement »), rétabli par A-38, reconfirmé par le cahier de refonte §4.3 qui liste `GO` en tête des CTA autorisés | **CONFORME** sur le libellé, via A-38 (pas via A-14 : A-14 a été renversé puis re-renversé). Cf. §8-G1 | Non | Test pur sur le libellé + a11y (`i18n/catalog/nav.ts:100-131` documente l'énoncé VoiceOver « GO — sortie vélo — … ») |
| **A-15 — GPS réel « parfait » + objets connectés ; O7 Strava, O8 dev build, O9a-e montres** | `AMENDEMENT-15-GPS-REEL.md:162-169` + `DISCOVERY.md:41-48` | 05/07/2026 | Moteur GPS pur ; `strava_import` déployée et inerte sans clés (503) ; adaptateurs Apple Health / Health Connect en stubs honnêtes | Aucun conflit de vision. **Dette de sécurité inscrite et non faite** : `DISCOVERY.md:41` exige de migrer le refresh token Strava vers `expo-secure-store` **au branchement des clés** — la condition n'est pas remplie, la dette dort correctement | **PARTIELLEMENT CONFORME**, dette correctement documentée. **Ne pas la fermer avant O7** | Non | Test pur du pipeline GPS (existant) ; test de stockage sécurisé **à écrire avec O7** |
| **A-16 §0 — zéro halo/glow autour des traits** | `AMENDEMENT-16-...md:175-177` | 05/07/2026 | Réaffirmé par §B de la constitution (casing + core, round caps) | Aucun | **CONFORME (règle en vigueur)** au niveau documentaire ; rendu non revérifié ici | Non | — |
| **A-16 §1 — tap GO = run libre ; long-press = intentions** | idem `:179-182` | 05/07/2026 | Le long-press d'intentions **n'a pas de trace** dans le GO actuel : `MapGoButton` (`index.tsx:255+`) ne gère que tap → `withStartActivity`. `nav.ts:51` note que le module d'intentions « n'est plus importé nulle part depuis que le départ est un simple tap sur GO » | **CONFLIT SILENCIEUX** : une mécanique documentée comme active (« long-press = intentions ») n'a plus d'appelant. Un doc qui promet au-delà du code | **OBSOLETE.** Acter le retrait dans A-16 §1 (une ligne datée), ou rebrancher. **Ne pas laisser le doc promettre** | Non | Test pur : si l'intention n'a pas d'appelant, le module doit être supprimé ou son entrée rétablie |
| **A-17 §1.1 — le FAB flottant est SUPPRIMÉ au profit du CTA de la sheet** | `AMENDEMENT-17-...md:190-193` | 05/07/2026 | **Renversé par A-29** (« supersède la suppression du FAB d'A-17 »), puis re-arbitré : aujourd'hui GO est rendu **hors** de la sheet, comme frère de `<MapScreen/>` (`index.tsx:246-249` : `sheetWrap` a `overflow:hidden`, un rond y serait tronqué) | Trois positions successives sur le même bouton. La position actuelle est la 3ᵉ et elle est **motivée techniquement**, pas doctrinalement | **OBSOLETE** (A-17 §1.1). La position en vigueur est celle du code, documentée sur place | Non | Test pur existant : `goButtonBottom()` est décrit comme « fonction PURE, testée en Deno » (`index.tsx:284`) |
| **A-18 — Crew = système social de jeu (chat actionnable, demandes/dons)** | `AMENDEMENT-18-...md:197-209` | 05/07/2026 | Chat crew : **la politique de confidentialité a été réécrite pour dire qu'il n'y a PAS de chat** (`docs/design/vague-1/RESTE-A-RECALER.md` §mise à jour 26/07 : « messages de chat de crew → signaux à **vocabulaire fermé** ») | **CONFLIT MAJEUR NON CONSIGNÉ.** A-18 §A.2 pose le chat comme « le cœur ». Le produit livré est un jeu de signaux fermés. Aucun amendement n'a acté ce recul : il a été acté par une **page légale**, ce qui est l'endroit le moins lisible du dépôt pour une décision produit | **OBSOLETE** (A-18 §A.2 « chat actionnable » au sens texte libre). **Consigner explicitement** : GRYD n'a pas de chat, il a des signaux à vocabulaire fermé — c'est une décision de modération/App Store, elle mérite son paragraphe ailleurs que dans une CGU | Non | Test pur : le vocabulaire de signaux doit être une union fermée typée (verrou anti-texte-libre) |
| **A-19 — bonus aléatoires CIBLÉS, jamais de victoire achetée** | `AMENDEMENT-19-...md:212-220` | 05/07/2026 | `packages/shared/src/bonuses.ts` + sélecteur pur ; discipline vélo ajoutée en base : `active_bonuses.activity` (0071) puis **opposée** par `ingest_run` (0072) | Aucun conflit de vision. Le vélo a rouvert la question et elle a été refermée **dans le bon ordre** (colonne, puis lecture, puis correction de la phrase en base) | **CONFORME** sur l'invariant anti-p2w (preuve : `0072_active_bonuses_activity_is_read.sql` + `ingest_run/bonus_activity_test.ts` cité par la migration) | **Faite** : 0071, 0072 — **écrites, non exécutées** (cf. §5.3) | `ingest_run/bonus_activity_test.ts` (existe d'après 0072) |

## 1.3 A-20 → A-33 — épuration, carte, 3D, onboarding, store

| Décision historique | Source | Date | Implémentation actuelle | Conflit avec la vision présente | Décision finale | Migration requise | Tests requis |
|---|---|---|---|---|---|---|---|
| **A-20 — Live/Résultat/Partage épurés « façon Strava » : 1 mission + 1 toast MAX** | `AMENDEMENT-20-EPURE-STRAVA.md:227-233` | 05/07/2026 | `selectLiveNotice` pur, « une SEULE info temporaire » (commit `4296575`, Row 7 du backlog) | Aucun. Absorbé par la Spéc §10 | **CONFORME** au niveau règle (preuve : Row 7 coché `4296575` + `GRYD_BACKLOG.md`). Rendu non revérifié ici | Non | Test pur existant sur `selectLiveNotice` |
| **A-21 — la Carte = écran MISSION ; card sticky basse + 1 CTA** | `AMENDEMENT-21-...md:240-247` | 05/07/2026 | **Renversé 4 jours plus tard par A-25 §1** (« la card sticky quitte l'écran par défaut → dans Info »), puis renversé encore par les planches E02/E03 (sheet ancrée + tirable, commit `30d7560`) | Trois formes successives pour la même surface | **OBSOLETE.** L'autorité de forme est la planche E02/E03, pas A-21 | Non | — |
| **A-22 — profondeur max 3 niveaux, jamais card-in-card** | `AMENDEMENT-22-...md:253-258` | 05/07/2026 | Devenue §A de `GRYD_REGLES_NON_NEGOCIABLES.md` (constitution UI) ; réaffirmée par le cahier de refonte §5.8 « règle anti-cards » | Aucun — convergence totale des trois sources | **CONFORME (règle en vigueur, la plus stable du corpus)** | Non | Revue §A par écran (procédure existante) |
| **A-23 §0 — la FAQ affiche les VRAIES constantes de `game-rules`, jamais des littéraux du doc** | `AMENDEMENT-23-...md:266-269` | 05/07/2026 | Page `calcul-zones.tsx` existe (2 refs entrantes) | Aucun. C'est la déclinaison UI de « aucun nombre magique » | **CONFORME (règle en vigueur)** | Non | Test pur : aucun littéral de barème dans les écrans d'explicabilité |
| **A-24 — 6 styles de partage, dont « Carte 3D » ; MapLibre PAS Mapbox** | `AMENDEMENT-24-...md:279-285` | 05/07/2026 | **8 templates** en code : `simple · conquete · defense · boucle · crew · classement · avantApres · carte3d` (`features/share/templates.tsx:358-466`) | Le doc dit 6, le code en a 8. Aucun amendement n'a acté `classement` et `avantApres`. **Et le document fondateur hors dépôt en demande 11** (cf. §7) | **PARTIELLEMENT CONFORME / SOUS-DIMENSIONNÉ** vs la cible fondateur. Le delta 6→8→11 doit être arbitré par le doc de partage social, pas par A-24 | Non | Test pur sur `SHARE_TEMPLATES` (existe : `cardModel.test.ts`, `exportedCardCopy.test.ts`) |
| **A-26 / A-27 / A-28 — 3D partout, relief DEM + bâtiments extrudés, fond satellite Esri keyless** | `AMENDEMENT-26/27/28` | 05/07/2026 | Présent : `gryd-3d-buildings`, `gryd-dem-terrarium`, `gryd-satellite*` (`features/map/grydBasemapStyle.test.ts:197-198`) ; cycle de fond `dark → color → satellite` (`mapPref.ts:87`) | **CONFLIT DE CHARGE avec la vision présente.** Le cahier de refonte §6 réduit le système cartographique à : principe, 6 états de territoire, position, tracé, performance. Il ne mentionne **ni 3D, ni satellite, ni DEM**. Trois amendements consécutifs ont empilé des couches que la refonte ne réclame pas — c'est le cas d'école du `SURDIMENSIONNÉ` | **SURDIMENSIONNÉ.** À arbitrer par le fondateur (§10-Q3) : garder en option sous Calques (coût de conservation ≈ 0 en surface, non nul en perf carte), ou retirer. **Je ne tranche pas** : c'est une décision produit visible, pas un détail d'implémentation | Non | Tests de style existants (`grydBasemapStyle.test.ts`) ; **manque** un budget de perf mesuré (refonte §6.5) |
| **A-29 — nav `Carte · Missions · Crew · Saison · Profil` + FAB contextuel ; « GO est retiré définitivement »** | `AMENDEMENT-29-...md:342-352` | 06/07/2026 | Nav réelle : 3 items (`GrydNavBar.tsx:39-47`). FAB central : **il n'y en a plus dans la barre** — `GrydNavBar` ne rend que `tabs.map(renderTab)` (`:78`), alors que `apps/mobile/app/(tabs)/_layout.tsx:99` commente encore « Barre d'onglets persistante (Carte · Crew · Saison · Moi) **+ action centrale** » | **DEUX conflits.** (1) « GO retiré définitivement » est mort le 13/07 (A-38). (2) Un **commentaire de code ment sur son propre fichier** : le layout annonce 4 onglets + une action centrale, la barre en rend 3 sans action centrale | **OBSOLETE.** Corriger `_layout.tsx:99` — un commentaire faux est la même faute qu'une donnée fabriquée, à l'échelle du mainteneur | Non | Test pur sur la table de nav (à écrire avec le §6.1) |
| **A-30 — onboarding sans friction : compte/crew/notifs APRÈS la 1re capture** | `AMENDEMENT-30-...md:355-364` | 06/07/2026 | Onboarding réduit 5 → 4 écrans (`3f37c2b`) ; **mais l'app exige une session dès qu'un backend existe** (`CURRENT_STATE_CONFORMITY_MATRIX.md`, arbitrage §7.2 : « la carte exige une session (Redirect /sign-in), donc pas d'exploration anonyme ») | **CONFLIT ACTIF ET NON RÉSOLU.** A-30 §1 étape 2 promet « le quartier réel en plateau de jeu AVANT tout compte ». Le cahier de refonte §8.1 et la Spéc §7.2 le redemandent. A-47 interdit d'y mettre de la démo. Résultat : la promesse d'activation < 60 s est **structurellement invalidée**, et personne ne l'a écrit dans A-30 | **BLOQUANT (produit).** C'est le conflit le plus coûteux du corpus : il touche l'activation, c'est-à-dire le risque n°1 identifié par A-30 lui-même. Deux issues honnêtes seulement — (a) une lecture anonyme de zones publiques agrégées côté serveur, (b) acter par écrit que GRYD demande un compte d'abord. **Décision fondateur requise (§10-Q1)** | Oui si (a) : RPC publique agrégée + RLS lecture anonyme | Test PGlite de la RPC publique : aucune position, aucun pseudo, aucun code de crew |
| **A-31 §1 — invite crew / seeding densité** | `AMENDEMENT-31-...md:370-371` | 06/07/2026 | `gryd://c/<CODE>` fonctionne ; `pendingInvite.ts` mémorise 24 h. Les **universal links** attendent le domaine (O10) | Aucun conflit ; O10 correctement isolé et **l'arbitrage est bon** : ne rien déclarer dans `app.json` pour un domaine non possédé (`DISCOVERY.md:57`) | **PARTIELLEMENT CONFORME**, blocage externe assumé et documenté | Non | Test pur sur `parseInviteUrl` / `INVITE_HOSTS` |
| **A-32 — events crew, itinéraires populaires, challenges sponsorisés, « câblés démo »** | `AMENDEMENT-32-...md:381-390` | 06/07/2026 | **Les trois supports démo ont été SUPPRIMÉS par A-47** : `crew/eventsDemo.ts`, `route/popularRoutes.ts` listés dans les fichiers supprimés (`AMENDEMENT-47` §4) | **A-32 décrit trois fonctionnalités dont le support a été effacé.** Le document est resté « actif » en apparence | **OBSOLETE en totalité.** Marquer A-32 `ANNULÉ PAR A-47` — sinon un agent le relira comme un backlog vivant | Non | Non |
| **A-33 §1 — modération UGC (signaler / bloquer / filtrer), cause n°1 de rejet App Store** | `AMENDEMENT-33-...md:396-402` | 06/07/2026 | `PlayerModerationSheet.tsx`, `crew/blocklist.ts` + `blocklist.test.ts`, `crew/moderation.ts`, `code-conduite.tsx` (1 ref entrante) ; test PGlite de modération du nom de crew (`d298b5a`) | Le périmètre a rétréci avec la disparition du chat (cf. A-18) : on modère des signaux fermés, plus des messages | **PARTIELLEMENT CONFORME.** `docs/APP_STORE_CONFORMITE.md` §0 recense **10 bloquants**, dont « 2 de code court (blocage et signalement, guideline 1.2) » toujours ouverts | Non | `blocklist.test.ts` (existe) + les 2 bloquants de code à couvrir |

## 1.4 A-34 → A-47 — cadre, monétisation, positionnement, honnêteté

| Décision historique | Source | Date | Implémentation actuelle | Conflit avec la vision présente | Décision finale | Migration requise | Tests requis |
|---|---|---|---|---|---|---|---|
| **A-34 — emprunts Clash, ANTI-P2W STRICT réaffirmé (le multiplicateur de coffre est GRATUIT)** | `AMENDEMENT-34-CLASH-DELTA.md:410` | 06/07/2026 | Invariant anti-p2w verrouillé côté données : migrations `0065_functional_items_never_sold.sql`, `0067_club_never_grants_functional_items.sql` ; `game-rules.ts:300` « Aucun prix en Éclats » | Aucun. Confirmé par la Spéc §3.5 et par le registre (couche 1, non négociable) | **CONFORME (invariant en vigueur, prouvé par migration)** | 0065, 0067 — **appliquées** (antérieures à 0070 qui l'est) | Tests Deno de non-vente d'objets fonctionnels (à confirmer parmi les 67) |
| **A-35 — Europe entière capturable (remplace « France entière ») ; §6 RÉTRACTÉ le 13/07** | `AMENDEMENT-35-EUROPE.md:1-9,72-80` | 12/07/2026 (rétractation 13/07) | Filtre de portée Paris/France retiré du classement ; `e405b34` « choisir N'IMPORTE QUELLE ville d'Europe, sans en inventer une » | **Balayage incomplet** : 8 documents disent encore « France entière » (liste en A-02 §2 ci-dessus), dont `AGENTS.md` et `CLAUDE.md:9` | **CONFORME sur la décision, PARTIELLEMENT CONFORME sur la propagation.** La rétractation du §6 est exemplaire et doit rester lisible : c'est le précédent qui empêche de refabriquer des villes européennes | Non | **Test doc** : grep « France entière » hors A-35 et hors sections historiques datées ⇒ 0 |
| **A-36 — carte JUSTE LE TRACÉ, zéro aplat** | `AMENDEMENT-36-...md:431-443` | 12/07/2026 | **Révisé explicitement par A-37** (« là où -36 et l'étude divergent, l'étude prime ») | Auto-résolu, proprement, dans le document suivant | **OBSOLETE**, et c'est le SEUL amendement du corpus dont la révision est déclarée dans son successeur avec la règle d'arbitrage. Modèle à imiter | Non | — |
| **A-37 — l'étude de marché carte 2026 devient source de vérité Battle Map** | `AMENDEMENT-37-...md:444-455` | 13/07/2026 | Batches 1-4 livrés (tâches 75-78) ; traces dans `allTerritories.ts:79,468` (contraste satellite §9) | La Spéc Maître (24/07) est postérieure et se déclare autorité UI/UX. `SOURCE_OF_TRUTH_REGISTER.md:47` range A-37 dans « À RECLASSER » — donc **l'autorité carte est formellement indéterminée** | **PARTIELLEMENT CONFORME.** Trancher dans le registre : Spéc §9 vs A-37 vs `docs/product/GRYD_ETUDE_MARCHE_CARTE_2026.md`. Trois documents se disent source de vérité de la carte | Non | — |
| **A-38 — le bouton central dit « GO » (override fondateur)** | `AMENDEMENT-38-BOUTON-GO.md:457-469` | 13/07/2026 | **APPLIQUÉ** : `apps/mobile/app/(tabs)/index.tsx:387` rend `GO` ; docblock `:96` « Le libellé reste « GO » (override fondateur AMENDEMENT-38) dans les DEUX [mondes] » | **Révise explicitement** `GRYD_REGLES_NON_NEGOCIABLES.md §4` (« jamais GO partout ») et A-29 (« GO retiré définitivement »). **La constitution §4 n'a jamais été amendée sur place** : elle dit toujours l'inverse du code | **CONFORME (le code suit A-38).** Mais **BLOQUANT documentaire** : la constitution UI contredit le code, sans note de renvoi. Cf. §8-G1 | Non | Test pur du libellé + a11y (l'énoncé VoiceOver est déjà spécifié, `i18n/catalog/nav.ts:100-131`) |
| **A-39 §3 — GO générique + verbes contextuels (REPRENDRE / CONQUÉRIR / TERMINER / DÉFENDRE)** | `AMENDEMENT-39-MVP-VIRAL.md:88-99` | 15/07/2026 | Réalisé par **retrait**, pas par morphing : quand la sheet de décision de zone (E04) est ouverte, son CTA REPRENDRE devient l'unique CTA primaire et **GO se retire** (`index.tsx:251-253`, `:271-273`) | Convergent avec le cahier de refonte §4.3 (liste `GO`, `CONQUÉRIR`, `REPRENDRE`, `DÉFENDRE`, …) | **CONFORME**, avec une implémentation MEILLEURE que la spec (§A.4 « 1 CTA » respecté au lieu d'un libellé qui change sous le pouce) | Non | Test pur : jamais deux CTA primaires simultanés |
| **A-39 §4 — nav 3 onglets, 0 suppression, épuration par flags** | `:100-125` | 15/07/2026 | 3 onglets rendus. Flags : `flags.ts` (season/warRoom/arsenal/bike) | `FEATURE_FLAG_ARCHITECTURE.md` (en-tête) dit « rien ici n'est encore construit » et décrit `packages/shared/src/features.ts` **À CRÉER**. Or `apps/mobile/src/lib/flags.ts` **existe et agit**. Le document d'architecture décrit un futur qui a été court-circuité | **PARTIELLEMENT CONFORME.** `FEATURE_FLAG_ARCHITECTURE.md` est **OBSOLETE dans son état des lieux** (§0 « N'EXISTE PAS » est faux) tout en restant utile pour son §6 (graphe des appelants). À dater et corriger | Non | Le graphe des appelants d'A-39 §7 reste la règle avant toute suppression de route |
| **A-39 §5 — Saison 0 : Paris + Lille en production, Rouen en fixture** | `:127-140` | 15/07/2026 | Ouverture par présence sur **toutes** les communes FR (`0068`, `0066`, commits `9547f0b`/`db55e56`) | **CONFLIT NON CONSIGNÉ.** « Production Saison 0 : Paris + Lille UNIQUEMENT » est contredit par l'auto-ouverture de n'importe quelle commune à la 1re course. Ce n'est pas un bug : c'est une meilleure décision (le pionnier, `96299e9`). Mais A-39 §5 n'a jamais été amendé | **OBSOLETE.** Acter dans A-39 §5 que la Saison 0 s'ouvre PAR PRÉSENCE, avec renvoi à `0066_open_city.sql`. Sinon un lecteur croira à un plafond qui n'existe plus | Non (faite) | Test PGlite d'ouverture par présence (existant côté `0066`/`0068` — à confirmer) |
| **A-40 §2 — VIOLATIONS anti-p2w constatées (Éclats → Bouclier, Streak Gel, Club 2 gels/mois)** | `AMENDEMENT-40-MONETISATION.md:47-63` | 15/07/2026 | **Corrigées** : `game-rules.ts:270-300` (« REMPLACÉ le bouclier en migration 0022 » ; « Aucun prix en Éclats … monnaie ACHETABLE → argent réel → protection ») + migrations 0065/0067 + commits `e6f7b40`, `d001753` | Aucun. C'est le meilleur exemple du corpus : une violation nommée, prouvée, puis fermée en base | **CONFORME (violations closes, preuve en migration).** Les SKUs `eclats_*` subsistent en catalogue (`game-rules.ts:597-601`) : **résiduel à vérifier** — un SKU sans usage n'achète rien, mais il reste vendable si quelqu'un le rebranche | Faites (0022, 0065, 0067) | **À écrire** : test « aucun SKU `eclats_*` n'a de chemin vers un objet fonctionnel » |
| **A-41 (n°1) — nommage des secteurs partout en Europe** | `AMENDEMENT-41-NOMMAGE-SECTEURS-CARTE.md` | 17/07/2026 | Livré : commit `5cb10b6` cité dans le doc | — | **CONFORME au niveau doc** | Non | — |
| **A-41 (n°2) — LE RELAIS : sorties de groupe, 1 propriétaire, récompense 1/rang** | `AMENDEMENT-41-SORTIES-DE-GROUPE.md` | 21/07/2026 | Chantier 0 committé (`packages/engine/src/group.ts`, `game-rules.ts:1413-1470`) | **COLLISION DE NUMÉROTATION.** Deux fichiers portent le n° 41. Le code référence « A-41 » **six fois** (`types.ts:179,207` ; `game-rules.ts:1333,1413,1419,1436,1457` ; `engine/group.ts:2`) — toujours pour LE RELAIS, jamais pour le nommage. Une référence ambiguë dans un corpus d'autorité est une bombe à retardement | **BLOQUANT (documentaire).** Renuméroter le nommage en **A-41a** (ou le second en A-48), et propager. Coût : ~10 références. Coût de conservation : chaque futur lecteur doit deviner. **Décision autonome §9-D3** | Non | Non |
| **A-42 — « Cours pour ton crew. Conquiers ta ville. » sur TOUTES les surfaces publiques** | `AMENDEMENT-42-POSITIONNEMENT.md:522-533` | 20/07/2026 | **Appliqué** : `apps/web/app/layout.tsx:53`, `landing/dictionary.ts:42-43`, `landing/Hero.tsx:5,85` ; ancien slogan absent du code (grep 0) | Résiduel documentaire uniquement : `AGENTS.md:3`, `AMENDEMENT-02:9`, `SPEC-MVP:86`, `GRYD_TERRITORY_ENGINE.md:279`, ~10 `docs/product/*` | **CONFORME dans le code** (preuve : `layout.tsx:53`), **PARTIELLEMENT CONFORME dans les docs**. Priorité : `AGENTS.md` (cf. §3) | Non | Non |
| **A-42 (retour terrain n°1) — « la démo n'a le droit d'exister que sur la vitrine web »** | cité par `AMENDEMENT-47:596-598` | 20/07/2026 | **Doctrine TOMBÉE** le 21/07 | Aucun — A-47 la remplace explicitement | **OBSOLETE**, remplacement déclaré. Modèle correct | Non | — |
| **A-43 — doctrine Crew MVP, « décisions §à trancher OUVERTES tant que le fondateur n'a pas répondu »** | `AMENDEMENT-43-CREW-MVP.md:537-540` | 20/07/2026 | Statut du fichier : **« REÇU, audit en cours »**, depuis 6 jours | Le document se déclare lui-même non arbitré. Ses questions ouvertes ne sont **remontées nulle part** (ni `DISCOVERY.md` §points ouverts, ni `GRYD_BACKLOG.md`) | **BLOQUANT (process).** Un document d'autorité en statut « audit en cours » sans échéance ni porteur est une décision différée qui se fait oublier. **Remonter ses « à trancher » dans les points ouverts** (§9-D2) | Non | Non |
| **A-44 §0 — 4 « manques » de l'audit 85/100 n'en sont pas : ils sont MASQUÉS derrière les flags** | `AMENDEMENT-44-AUDIT-85-100.md:556-559` | 21/07/2026 | Confirmé par `flags.ts` (season/warRoom/arsenal = `FULL_SURFACE`, défaut OFF) | Aucun. Bonne discipline : le doc confronte l'audit au code | **CONFORME (raisonnement).** Illustre pourquoi §8-G2 (`flags.season`) doit être tranché : tant qu'il est OFF, tout audit externe re-signalera les mêmes 4 faux manques | Non | — |
| **A-45 — marge 90 % : IAP plafonne à 85 %, seuls sponsoring B2B (~99 %), événement réel (~95 %), web (93 %) dépassent** | `AMENDEMENT-45-...md:571-600` | 21/07/2026 | Aucun rail IAP (Row 11 du backlog, **BLOQUÉ O3**) ; sponsoring = `docs/GRYD_SPONSORING_TERRITORIAL.md` (doc seul) | Aucun conflit de vision. **Prérequis absolu déclaré dans le doc lui-même** : le contrat Apple « Paid Applications » n'est pas signé | **PARTIELLEMENT CONFORME** — analyse solide, exécution nulle par blocage externe. **Ne pas peindre de boutique tant qu'O3 est ouvert** (règle « aucun bouton mort ») | Non | — |
| **A-46 — parcours personnalisés par les habitudes ; la « route utilisée » n'est PAS apprise (vie privée)** | `AMENDEMENT-46-...md:574-585` | 21/07/2026 | `0055_habits_inputs.sql`, `0054_route_preferences.sql` ; `habits_inputs` listée comme **RPC non disciplinée** (vélo) dans `game-rules.ts` § SUSPENS | L'arbitrage vie privée (ne pas apprendre la route) est **plus strict** que la demande fondateur — il est justifié dans le doc | **CONFORME** sur la doctrine. **SOUS-DIMENSIONNÉ** côté vélo : `habits_inputs` mélangera les deux mondes (cf. §5.2) | Oui, avec l'écran concerné (jamais en aveugle — `game-rules.ts` § SUSPENS) | Test PGlite de `habits_inputs` par discipline |
| **A-47 — fin du mode démo : données RÉELLES ou VIDES, 4 états distincts** | `AMENDEMENT-47-...md` intégral | 21/07/2026 (+ ajouts 25/07) | `isShowcasePlatform` supprimé ; verrou par TYPAGE (`real: readonly RealTerritory[]` requis non-nullable) ; `flags.ts:18-51` porte l'interdiction de réintroduire un flag de ce genre | **Contredit la Spéc §7.2** (« carte démo »). Arbitré dans `SOURCE_OF_TRUTH_REGISTER.md` (contradiction n°1) : **l'honnêteté prime** | **CONFORME — CONTRAIGNANT, couche 0.** À ne jamais rouvrir | Non | Le TYPAGE est le test (« oublier l'argument ne compile plus » — A-47 §4) |
| **A-47 § « Ce qui reste EN SUSPENS » — la seule liste qui fasse foi** | `AMENDEMENT-47-...md` §4 fin | 21 + 25/07/2026 | **Encore juste sur 5 lignes, périmée sur 1** — analyse détaillée en §8-G3 | Voir §8-G3 | **PARTIELLEMENT CONFORME** | — | — |

---

# 2. GISEMENT B — `DISCOVERY.md` : D1-D18 et O1-O10

## 2.1 Décisions produit et techniques (D1-D18)

| Décision historique | Source | Date | Implémentation actuelle | Conflit avec la vision présente | Décision finale | Migration requise | Tests requis |
|---|---|---|---|---|---|---|---|
| **D1 — H3 res 10, buffer 15 m, carte bornée aux `city_zones` ouvertes (Paris, Lille)** | `DISCOVERY.md:9` | ~02/07/2026 | Le bornage a sauté : ouverture par présence, toutes communes (`0066`, `0068`) | **OBSOLETE dans sa 2ᵉ moitié**, et `DISCOVERY.md:3` le dit (« D1 amendée — plus de gating bloquant ») mais garde le texte d'origine plus bas | **PARTIELLEMENT CONFORME.** La résolution H3 tient ; le gating est mort. Réécrire D1 plutôt que l'annoter en tête de fichier | Faites | — |
| **D2 — validité course : ≥1 km, ≥6 min, allure 2:50-10:00, >25 km/h rejeté** | `DISCOVERY.md:10` | ~02/07/2026 | **Paramétré par discipline** : `activityRules(activity)` dans `packages/engine/src/validation.ts:61-63,137-139,176-178` ; bornes vélo `game-rules.ts:2719-2880` (`BIKE_POINT_MAX_SPEED_KMH = 80`, `BIKE_MIN_DISTANCE_M = 2 000`, …) ; `activity` absente ⇒ `'run'`, comportement historique **strictement** inchangé (`validation.ts:53-54`) | **D2 tel qu'écrit ne vaut plus que pour la course à pied.** Ni `DISCOVERY.md` ni `CURRENT_STATE_CONFORMITY_MATRIX.md` ne le savent — la matrice liste encore comme BLOQUANT « validation.ts rejette >25 km/h … invariant anti-vélo » | **PARTIELLEMENT CONFORME.** D2 = les bornes `run`. Ajouter D2-bis « bornes par discipline ». **Le bloquant n°3 de la matrice est LEVÉ** (preuve : `validation.ts:9,61-63`) | Faite (le paramétrage est côté moteur, pas SQL) | Tests Deno de `activityRules` par discipline (existants d'après `runActivity.test.ts:332`) |
| **D3 — propriété : dernier passage valide ; lock 24 h ; protection <14 j ; decay 21 j** | `DISCOVERY.md:11` | ~02/07/2026 | Le decay a été porté à **14 j** par A-23 C1 (tâche 53 : « statuts/decay 14j ») | **Conflit numérique non consigné dans DISCOVERY.** D3 dit 21 j, le moteur dit 14 j | **OBSOLETE (le chiffre).** `game-rules.ts` fait foi (« aucun nombre magique »). Réécrire D3 en renvoyant à la constante, jamais en recopiant un nombre | Non | Test Deno du decay (existant) |
| **D4 — barème +10/+15/+3/+5, streak +10 %/sem cap ×1,5, Éclats n'achètent jamais hexes/points** | `DISCOVERY.md:12` | ~02/07/2026 | Barème gelé ; l'anti-p2w est verrouillé en base (0065/0067) | Aucun. **Règle gelée jamais levée** | **CONFORME (en vigueur).** Ne pas rouvrir | Faites | Tests Deno de scoring (existants) |
| **D5 — crews 2-10, 12 couleurs en DB, code 6 caractères, cooldown 7 j** | `DISCOVERY.md:13` | ~02/07/2026 | `crews.code` (0036) ; modération du nom testée PGlite (`d298b5a`) | La taille max 10 vs la « sortie à 30 » du scénario A-41 LE RELAIS §0 : le RELAIS raisonne sur 30 coureurs sur la même boucle | **PARTIELLEMENT CONFORME.** Vérifier que le cap de 10 est bien un cap de CREW et non un cap de groupe-de-run — sinon LE RELAIS résout un cas que le produit interdit | Non | Test pur : `groupCapture` avec N > taille max de crew |
| **D6 — 9 écrans, pas un de plus ; onboarding < 90 s** | `DISCOVERY.md:14` | ~02/07/2026 | **47 fichiers de route** dans `apps/mobile/app` | **OBSOLETE, de très loin.** Personne ne l'a jamais rétracté. Le cahier de refonte §4.2 rouvre le sujet par le haut (3 destinations, tout le reste accessible depuis elles) | **OBSOLETE.** Remplacer D6 par la règle de refonte §4.2 : ce n'est pas le nombre d'écrans qui compte, c'est le nombre de RACINES | Non | — |
| **D7 — monétisation : jamais de paywall sur tracking/capture/crews/classements ; aucune offre avant J5 ET 1re capture ; pas de loot box** | `DISCOVERY.md:15` | ~02/07/2026 | Confirmé et durci par A-40 §1 ; boutique masquée (`flags.arsenal`) | Aucun | **CONFORME (en vigueur, jamais levé)** | Faites (0065/0067) | — |
| **D8 — vie privée : zones privées ≤3, jamais de position live, centre en H3 res 8, polylines 90 j, 16+** | `DISCOVERY.md:16` | ~02/07/2026 | `privacy_zones` + `blocked_privacy` dans `decideClaims` ; badge « Jamais de position live » spécifié planche E15 | ⚠️ **COLLISION D'IDENTIFIANT** : `MVP_CHANGESET.md:64` appelle « D8 » le **système de feature flags**, et `flags.ts:2` s'y réfère (« GRYD — D8 (MVP_CHANGESET) »). Deux « D8 » vivent dans le corpus, l'un vie privée, l'autre flags | **BLOQUANT (documentaire), même faute qu'A-41.** Renommer le D8 de `MVP_CHANGESET` en `MC-D8` et corriger `flags.ts:2`. Coût : 2 fichiers | Non | Non |
| **D9 — anti-triche 100 % serveur, plafond 1 200 hexes/jour/compte** | `DISCOVERY.md:17` | ~02/07/2026 | `MAX_CLAIMS_PER_DAY` reste **PAR COMPTE**, tous mondes confondus (`game-rules.ts` § SUSPENS n°3) | **Le vélo a changé le sens de la règle sans changer la règle** : un cycliste consomme le quota du coureur. Explicitement **non tranché** dans le code | **SOUS-DIMENSIONNÉ.** Arbitrage fondateur requis : par compte, ou par compte × discipline ? (§10-Q2) | Oui si × discipline | Test PGlite du plafond par discipline |
| **D10 — events PostHog nommés exactement comme §8** | `DISCOVERY.md:18` | ~02/07/2026 | `packages/shared/src/events.ts` ; §26 de la Spéc a ajouté friction/activation/conversion (`c5c0ca1`) | La Spéc §26 et la SPEC §8 ont **deux grammaires**. La matrice de conformité préconise une « table de correspondance §26↔§8 plutôt qu'un renommage brutal » | **PARTIELLEMENT CONFORME.** Table de correspondance à écrire ; ne jamais renommer un event émis (casse l'historique analytics) | Non | Test pur : tout event émis appartient à `events.ts` |
| **D11-D17 — décisions techniques (monorepo, `game-rules` source unique, sync `_shared`, H3 BIGINT, idempotence `client_run_id`, RLS, rendu MapLibre)** | `DISCOVERY.md:21-27` | ~02/07/2026 | D12 est le pilier vivant : `scripts/sync-game-rules.mjs` + test de drift byte-à-byte. D16 (« hexes factices Milestone 1 ») **est mort** avec A-47 | D16 est la seule ligne périmée du bloc : elle autorise des hexes factices, ce qu'A-47 interdit | **CONFORME** pour D11-D15, D17. **OBSOLETE** pour **D16** — à rayer explicitement, c'est une autorisation de fabriquer qui traîne dans un document d'autorité | Non | Test de drift `_shared` (existant, D12) |
| **D18 — XP = points territoire ×1, permanent, jamais acheté** | `DISCOVERY.md:4` | 03/07/2026 | **Confirmé ET étendu par la décision vélo du 26/07** : XP et NIVEAU restent **GLOBAUX** (`ACTIVITY_SCOPE`, `game-rules.ts:3200+`), verrouillé par `supabase/functions/_shared/activity_scope_test.ts` | Aucun. La planche E12 a été **overridée explicitement** par le fondateur (`docs/design/vague-1/PLANCHES.md`, encadré « OVERRIDE FONDATEUR — 26/07/2026 ») | **CONFORME (en vigueur, renforcé).** L'override E12 est **le meilleur exemple de traçabilité du corpus** : décision + raison + emplacement du verrou + interdiction de « recorriger » | Faite (0070) | `_shared/activity_scope_test.ts` (existe) |

## 2.2 Points ouverts (O1-O10)

| Point | Source | Date | État réel au 26/07/2026 | Ce qu'il bloque | Décision finale | Migration | Tests |
|---|---|---|---|---|---|---|---|
| **O1 — projet Supabase réel (URL + clés)** | `DISCOVERY.md:30` | ~02/07 | Ouvert. `GRYD_BACKLOG.md` Étape 2 : « le JWT actuel fait 46 car., pas un JWT » | Fiche publique de crew, annuaire de crews, édition d'identité de crew (A-47 ajout 25/07), première capture réelle | **BLOQUANT, hors code.** Le seul gate qui débloque le plus de surfaces | — | — |
| **O2 — Apple Developer + Google OAuth** | `:31` | ~02/07 | Ouvert. Conséquence appliquée : les boutons Apple/Google sont **MASQUÉS sur web** au lieu d'échouer (A-47, 21/07) | Connexion par fournisseur ; validation localhost ≠ iPhone sur ce point | **BLOQUANT, hors code.** La mitigation est correcte (« aucun bouton mort ») | — | — |
| **O3 — RevenueCat + PostHog** | `:32` | ~02/07 | Ouvert. Rail IAP = Row 11 du backlog, BLOQUÉ | Monétisation opérante, mesure de conversion | **BLOQUANT, hors code** | — | — |
| **O4 — GeoJSON précis Paris/Lille** | `:33` | ~02/07 | **Largement dépassé** par `0068_fr_communes_reference.sql` (34 969 communes, contours réels) | Plus rien | **OBSOLETE.** Fermer O4 avec sa preuve (`0068`) | Faite | — |
| **O5 — clearance INPI/EUIPO « KLAIM »** | `:34` | ~02/07 | Ouvert, et **élargi** : le nom est GRYD (A-02), le périmètre est l'Europe (A-35 §4 : « l'ambition Europe élargit le périmètre de vérification de marque ») | Tout usage public du nom | **BLOQUANT, juridique.** Réécrire O5 : ce n'est plus « KLAIM », c'est **GRYD**, sur **l'EUIPO**, pas seulement l'INPI | — | — |
| **O6 — provider de tuiles prod (Protomaps / PMTiles)** | `AMENDEMENT-13:139` — **PAS dans DISCOVERY** | 04/07 | Ouvert, et **non suivi** : absent de la liste des points ouverts | Passage en production de la carte ; satellite/DEM réels | **ABSENT (du registre des points ouverts).** Rapatrier dans `DISCOVERY.md` (§9-D2) | — | — |
| **O7 — App API Strava** | `:41` | 05/07 | Ouvert. `strava_import` déployée et inerte (503 `configuration_required`) — comportement honnête | Import d'activités ; **et** la dette `expo-secure-store` qui ne se paie qu'au branchement | **BLOQUANT, hors code**, correctement neutralisé | — | Test de stockage sécurisé à écrire AVEC les clés |
| **O8 — dev build EAS/Xcode** | `:42` | 05/07 | Ouvert (quota Expo bloqué jusqu'au 1er août selon `flags.ts`/A-47). Conséquence : partage image, GPS réel, HealthKit non testables | Vérification carte native / GPS / partage image ; `SHARE_TECHNICAL_SPIKE.md` §f | **BLOQUANT, hors code.** Les 5 dépendances de partage sont **déjà installées** (`apps/mobile/package.json:24,28,37,51`) — donc le blocage est bien le device, pas le code | — | — |
| **O9a-e — Garmin / WHOOP / Polar / Coros / Suunto** | `:44-48` | 05/07 | Ouverts, statut « Bientôt » assumé dans le Verify Hub | Rien de critique (les activités arrivent indirectement via Strava/Apple Health) | **PARTIELLEMENT CONFORME** — traitement honnête | — | — |
| **O10 — domaine `gryd.app` / `gryd.run`** | `:53-58` | 21/07 | Ouvert. **Trois conséquences déjà absorbées** : universal links non déclarés (arbitrage explicite `:57`), `mailto:` morts remplacés par le courrier au siège (`apps/web/lib/legal.ts`), URL publique de la politique impossible | Deux des 10 bloquants App Store (B1/B2, `docs/APP_STORE_CONFORMITE.md` §0) | **BLOQUANT, hors code.** L'arbitrage « ne rien déclarer pour un domaine non possédé » est **exemplaire** — le conserver tel quel | — | — |

---

# 3. GISEMENT C — Constitution, specs racine, planches

| Décision historique | Source | Date | Implémentation actuelle | Conflit avec la vision présente | Décision finale | Migration | Tests |
|---|---|---|---|---|---|---|---|
| **`AGENTS.md` — fichier d'autorité pour agents** | `AGENTS.md` (43 lignes) | ~02/07/2026, **jamais mis à jour** | **Il ACTE et il MENT sur 6 points** : `:3` ancienne baseline (A-42) + « France entière » (A-35) + « pour run clubs » (A-42) ; `:6` hiérarchie sans la Spéc Maître, sans A-47, sans le registre ; `:11` pointe `.Codex/orchestration-klaim/` — **répertoire inexistant** (`ls .Codex` → No such file) ; **aucune mention de « l'app ne ment jamais »** ; aucune mention de « zéro donnée EU factice » ; aucune mention de « aucun bouton mort » | **C'est le pire élément de tout l'audit.** Un agent qui lit `AGENTS.md` au lieu de `CLAUDE.md` reçoit une constitution AMPUTÉE de son invariant central (A-47) et un chemin de fichiers faux. Ce n'est pas un doc périmé qui dort : c'est un doc périmé **qui instruit** | **OBSOLETE — priorité 1.** Deux issues : (a) faire d'`AGENTS.md` un pointeur d'une ligne vers `CLAUDE.md` ; (b) le régénérer. **Je recommande (a)** : deux constitutions divergeront toujours. **Décision autonome §9-D4** | Non | **Test doc** : `AGENTS.md` et `CLAUDE.md` ne peuvent pas énoncer deux hiérarchies différentes |
| **`SPEC-MVP-territoire-running-v0.md` §3 — règles de jeu GELÉES** | racine | ~02/07/2026 | Les chiffres vivent dans `game-rules.ts` ; la spec est le récit | Aucun conflit de fond. `:86` porte l'ancienne baseline | **CONFORME (en vigueur).** §0.1 règle 5 : gelé ≠ obsolète. Ne pas la « moderniser » | Non | Tests Deno du moteur |
| **`ADDENDUM-DESIGN-v0.1.md` §D/§E** | racine | ~02-03/07/2026 | §D (égocentré) absorbé par §C de la constitution ; §E (typo Outcrowd) **contredit par Night Print** côté mobile | Cf. A-03 ci-dessus | **PARTIELLEMENT CONFORME.** §D en vigueur, §E OBSOLETE | Non | — |
| **`GRYD_REGLES_NON_NEGOCIABLES.md` §4 — « CTA contextuel … jamais GO partout »** | racine | ~11/07/2026 | **Contredit par le code** (`index.tsx:387`) sur ordre d'A-38 | A-38 dit « §4 est révisé pour ce bouton précis ». **La révision n'est pas inscrite dans §4.** Le lecteur de la constitution lit l'inverse du produit | **BLOQUANT (documentaire).** Ajouter dans §4 une note de renvoi datée vers A-38. Cf. §8-G1 | Non | — |
| **`GRYD_REGLES_NON_NEGOCIABLES.md` §A / §B / §C** | racine | ~11/07/2026 | §A (20 règles) et §C (couleurs par RÔLE) sont **réaffirmés** par la Spéc, par A-39 §1 et par le cahier de refonte §5.8/§6.2 | Aucun | **CONFORME (couche 0, en vigueur).** Le socle le plus stable du corpus | Non | Revue §A par écran |
| **`docs/product/GRYD_MASTER_SPEC.md` + 17 voisins** | `docs/product/` (42 fichiers, pas 18) | 03/07/2026 | Cités comme rang 1 par `AGENTS.md:6`, rang 1 par `CLAUDE.md:12` — mais **derrière la Spéc Maître** | `SOURCE_OF_TRUTH_REGISTER.md:47` les range « À RECLASSER » depuis le 24/07, sans progrès. `MASTER_SPEC:9,62` dit encore « France entière ». Et `CLAUDE.md` dit « les 17 autres » alors qu'il y en a **41** | **PARTIELLEMENT CONFORME.** Le reclassement est le vrai travail restant du registre. Corriger d'abord le compte (17 → 41) : un chiffre faux dans une constitution invite à ne pas la relire | Non | — |
| **`docs/design/vague-1/PLANCHES.md` — E01→E21, référence de forme** | `docs/design/` | 24-25/07/2026 | 20 écrans recalés ; E12 porte l'**override fondateur du 26/07** en encadré | Aucun. C'est la seule source du corpus qui **inscrit son propre override à l'endroit exact de la phrase renversée** | **CONFORME (autorité de forme en vigueur)** | — | `_shared/activity_scope_test.ts` (verrou XP global) |
| **`docs/design/vague-1/RESTE-A-RECALER.md` — plan des 29 écrans** | `docs/design/` | 25/07/2026, **annoté 26/07** | Porte un bloc « MISE À JOUR D'ÉTAT — 26/07 » qui dit précisément ce qui a été fermé depuis, avec preuves | Aucun. Discipline exemplaire (« ne pas re-livrer un travail déjà fait ; ne pas non plus se fier à ce paragraphe sans re-vérifier le code ») | **CONFORME (plan d'exécution en vigueur)** | — | — |
| **`CURRENT_STATE_CONFORMITY_MATRIX.md` — 102 éléments, 4 bloquants** | racine | 24/07/2026 | **2 de ses 4 bloquants sont TOMBÉS depuis** : i18n Arsenal (commits `65174d7`/`9af259b`/`638a3af`) et « invariant anti-vélo dans `validation.ts` » (levé par `activityRules`, `validation.ts:9,61`). Sa Row 14 décrit le Bike comme un programme « post-stabilité Run, tout derrière `FEATURE_BIKE_*` (défaut off, **à créer**) » — or `flags.bike = true` et 0070 est en production | **OBSOLETE sur le vélo et sur 2 bloquants.** La matrice a 2 jours et 6 chantiers de retard, exactement comme annoncé | **PARTIELLEMENT CONFORME.** À reconstruire (ce n'est pas mon lot — livrable séparé du même mandat) | — | — |
| **`SOURCE_OF_TRUTH_REGISTER.md` — arbitrage d'autorité** | racine | 24/07/2026 | Sa contradiction n°4 dit « Mode Bike : net-new complet … à traiter comme un programme derrière `FEATURE_BIKE_*`, séquencé **après stabilité Run** » | **PÉRIMÉ par la décision fondateur du 26/07.** Le vélo n'est plus un programme futur : il est en production (0070) | **PARTIELLEMENT CONFORME.** Le registre doit acter la décision VÉLO comme un **document d'autorité de rang 0/1**, ce qu'il n'a aujourd'hui nulle part (cf. §8-G4) | — | — |
| **`FEATURE_FLAG_ARCHITECTURE.md` — « rien ici n'est encore construit »** | racine | ~16/07/2026 | Faux : `apps/mobile/src/lib/flags.ts` existe et agit sur 4 surfaces | Son §0 (« système de flags : N'EXISTE PAS ») est un état des lieux périmé présenté au présent | **OBSOLETE (état des lieux).** Son §6 (graphe des appelants) reste utile et **la règle A-39 §7 reste en vigueur** : graphe AVANT toute suppression de route | Non | — |
| **`MVP_CHANGESET.md` D8 — feature flags** | racine | ~15/07/2026 | Implémenté dans `flags.ts` | Collision d'identifiant avec le D8 vie privée de `DISCOVERY.md` (cf. §2.1) | **BLOQUANT (documentaire)** — renommer | Non | — |
| **`SHARE_TECHNICAL_SPIKE.md` — 5 dépendances à installer** | racine | ~16/07/2026 | **Les 5 sont installées** : `expo-clipboard:24`, `expo-file-system:28`, `expo-sharing:37`, `react-native-view-shot:51` dans `apps/mobile/package.json` | Le spike se déclare « aucune ligne de code n'est écrite par ce document » — c'est vrai, mais son constat §0 (« aucune image ne peut sortir de l'app ») est **daté** et n'est plus vérifiable depuis ce dépôt (il faut O8) | **PARTIELLEMENT CONFORME / NON VÉRIFIABLE** sur le résultat : le partage image ne se prouve que sur device (O8) | Non | Vérification device après O8 |
| **`docs/APP_STORE_CONFORMITE.md` — 10 bloquants** | `docs/` | 26/07/2026 | 4 levés le jour même (B7-B10), 2 non levables par du code (B1/B2, O10), **2 de code court restants** (blocage + signalement, guideline 1.2) | Aucun. Document le plus récent et le mieux daté du corpus | **CONFORME (constat en vigueur).** Modèle de forme : « le constat ne se réécrit pas, on ajoute un état d'exécution » | Non | Couvrir les 2 bloquants de code |
| **`GRYD_BACKLOG.md` — Rows 1-15 + roadmap satisfaction** | racine | 24-25/07/2026 | Row 5 en `[~]` (moitié serveur déployée, reste `db push` fondateur) ; Rows 8, 11-15 ouverts | Sa ligne « 6 arbitrages fondateur en attente » recoupe mon §10 | **CONFORME (backlog en vigueur)** | — | — |

---

# 4. GISEMENT D — Arbitrages portés par les MESSAGES DE COMMIT, absents de tout `.md`

> Le mandat demandait explicitement ce gisement. Voici ce que l'historique tranche et que les
> documents ne consignent nulle part.

| Décision historique | Source | Date | Implémentation actuelle | Conflit avec la vision présente | Décision finale | Migration | Tests |
|---|---|---|---|---|---|---|---|
| **Le persona fabriqué KORO / LENA est purgé** | commit `ad08e01` « purge du persona fabrique KORO/LENA : code mort supprime, exemples neutralises » | ~19/07/2026 | Complété par A-47 (`intention.ts`, `social/league.ts`) | Aucun. Mais c'est une **doctrine** (« aucun exemple ne porte de nom de personne inventée ») qui ne vit que dans un message de commit | **CONFORME.** À inscrire dans A-47 §5 : c'est une règle réutilisable, pas un nettoyage ponctuel | Non | Test doc/code : aucun identifiant `KORO`/`LENA` |
| **« L'app demandait un code que personne ne recevait »** | commit `7a6ab21` | ~20/07/2026 | Corrigé | Aucun. Illustre « aucun bouton mort » avant que la règle soit écrite | **CONFORME** | Non | — |
| **« On ne vend plus ce qui n'existe pas » / « l'abonnement cesse de DISTRIBUER des objets fonctionnels »** | commits `e6f7b40`, `d001753` | ~20/07/2026 | Verrouillé en base : `0065`, `0067` | Aucun — ces deux commits sont **l'exécution d'A-40 §2** | **CONFORME (prouvé par migration)** | Faites | Tests de non-vente |
| **Plancher de domination + joueur solo sur la carte** | commit `446d045` « la carte lit enfin le vrai monde » | ~20/07/2026 | `0061_sector_owner_solo.sql` | Aucun | **CONFORME** | Faite | — |
| **§38.2b — « un objectif d'offensive doit être LÉGITIME »** | commit `54198e7` + `0064_offensive_lifecycle.sql` | ~20/07/2026 | En base | **Le « §38.2b » cité ne renvoie à aucun document du dépôt** (aucun A-38 §2b : A-38 fait 15 lignes sur le bouton GO). Une règle de gameplay vit en SQL avec une référence morte | **NON VÉRIFIABLE.** Retrouver la source, ou requalifier la référence. Une règle serveur dont l'autorité est introuvable ne peut pas être auditée | Faite (0064) | Test PGlite de légitimité d'offensive |
| **Purge des seeds fabriquées** | `0062_purge_fabricated_seeds.sql` | ~20/07/2026 | En base | Aucun. C'est A-47 **appliqué au SQL**, ce que le texte d'A-47 ne mentionne pas (il ne parle que de fichiers TS) | **CONFORME.** Ajouter la ligne à A-47 §4 : la purge a aussi eu lieu en base | Faite | — |
| **Point de sauvegarde vert avant le chantier VÉLO** | commit `391a48a` (HEAD) | 26/07/2026 | HEAD de `main` | Aucun. **Mais c'est le SEUL endroit du dépôt où la décision vélo du 26/07 est datée dans l'historique** | **PARTIELLEMENT CONFORME** — cf. §8-G4 | — | — |
| **Fondation VÉLO « sous revue adversariale »** | commit `a85189b` | 26/07/2026 | 0070 en production, 0071/0072 écrites | Idem — aucun `AMENDEMENT-48-VELO.md` n'existe | **ABSENT (le document).** Cf. §8-G4 | 0070 appliquée ; 0071/0072 **non exécutées** | `_shared/activity_scope_test.ts`, `ingest_run/bonus_activity_test.ts` |

---

# 5. GISEMENT E — Décisions énoncées DANS LE CODE

## 5.1 `apps/mobile/src/lib/flags.ts` — chaque flag est une décision de périmètre

| Flag | Valeur au 26/07 | Décision d'origine | Ce qu'il masque | Conflit | Décision finale |
|---|---|---|---|---|---|
| `season` | `FULL_SURFACE` → **false** en prod (`flags.ts:53`) | D8 `MVP_CHANGESET:64` + A-39 §4 | Onglet Saison + **tous** les classements (`(tabs)/classement.tsx:679` → `Redirect '/'`), lien Profil (`profil.tsx:284,974`), item de nav (`GrydNavBar.tsx:44`) | **Décision assumée, PAS une dette oubliée** — preuves : `flags.ts:2-9` (docblock D8), `GrydNavBar.tsx:39-41`, bloquant n°4 de la matrice qui la nomme et demande l'arbitrage. **Mais elle enterre 3 chantiers livrés** : spécialités (`de871fe`+`d26f930`), échéance de saison (`1907cac`), rang statutaire | **PARTIELLEMENT CONFORME.** Décision fondateur requise (§10-Q4) — c'est le meilleur rapport valeur/effort du dépôt : un booléen |
| `warRoom` | **false** | idem | Route `(tabs)/warroom` + liens (`profil.tsx:287`, `aujourdhui.tsx:260`, `parametres/[section].tsx:532`) | La route reste **déclarée** comme onglet (`(tabs)/_layout.tsx:87-90`) avec le commentaire « Seule route HORS barre : Missions, atteinte depuis « Moi » » — **or le lien depuis « Moi » est lui-même sous le flag**. Le commentaire décrit une porte qui est fermée | **PARTIELLEMENT CONFORME.** Corriger le commentaire ou rouvrir la porte. Aujourd'hui l'écran n'a **aucune** entrée |
| `arsenal` | **false** | A-39 §6, A-40 | `/arsenal` (`arsenal.tsx:146` → Redirect), ligne premium `performance.tsx:460`, `profil-edit.tsx:713`, `settings/sections.ts:117` | Aucun conflit : cohérent avec O3 ouvert (pas de rail IAP ⇒ une boutique serait un bouton mort) | **CONFORME (décision de périmètre correcte).** Ne pas rouvrir avant O3 |
| `bike` | **`true` en dur** (`flags.ts:127`) | Fondateur 25/07 puis 26/07 | Rien — il OUVRE | **C'est le seul flag qui n'est pas un interrupteur d'env** : `bike: true` est écrit en dur, à côté de trois flags pilotés par `EXPO_PUBLIC_FULL_SURFACE`. Asymétrie non expliquée | **PARTIELLEMENT CONFORME.** Le comportement est voulu (le vélo est réel), mais un `true` littéral dans une table de flags est un flag mort. **Décision autonome §9-D5** : le retirer de `flags` et faire des lectures un appel direct, OU documenter en une ligne pourquoi il reste |

> **Ce que `flags.ts` fait BIEN, et qui doit être protégé** : `:18-51` interdit nommément de
> réintroduire un flag de type vitrine, avec le raisonnement complet (« un flag défaut OFF aurait
> laissé le chemin fabriqué vivant dans le bundle, donc réactivable par accident »). C'est une
> décision d'architecture inscrite à l'endroit où elle agit. **À ne pas déplacer, à ne pas résumer.**

## 5.2 `packages/shared/src/game-rules.ts` — bloc « CE QUI RESTE EN SUSPENS » (`:3207-3296`)

| Suspens | Contenu | Encore juste au 26/07 ? | Décision finale | Migration | Tests |
|---|---|---|---|---|---|
| **n°1 — anti-triche §8 de la Spéc** | Pattern d'accélération, arrêts, altitude/dénivelé, cohérence routière : « n'existent NULLE PART ». « Aucune borne de vitesse ne sépare un cycliste d'une voiture EN VILLE » | **OUI, et c'est le plus grave du bloc.** Le vélo a augmenté l'enjeu : `BIKE_POINT_MAX_SPEED_KMH = 80` accepte désormais des vitesses de voiture urbaine | **SOUS-DIMENSIONNÉ — priorité anti-triche n°1.** Le bloc dit exactement ce que les bornes prétendent faire (« arrêter le véhicule LANCÉ et les payloads forgés ») : cette honnêteté est correcte, le manque reste entier | Non (moteur pur) | Signaux d'altitude/arrêts : moteur pur + tests Deno, **à écrire** |
| **n°2 — territoire et classements par discipline** | 0070 appliquée ; liste datée de ce qui reste : `sector_snapshot` (PK `sector_id` seul), RPC non disciplinées (`crew_overview`, `crew_mission_inputs`, `daily_zone_inputs`, `crew_pings_feed`, `welcome_challenge_facts`, `habits_inputs`, vues `sector_holdings`, `sector_activity`), agrégats personnels | **OUI.** Et le bloc **s'auto-corrige** : il raye `decay_job` et `digest_job` comme refermés, avec la phrase « laisser écrit qu'un défaut corrigé est ouvert use la confiance dans les avertissements de cette liste qui, eux, sont vrais » | **PARTIELLEMENT CONFORME — modèle de tenue.** `sector_snapshot` est le prochain chantier conjoint schéma + `features/map/` | Oui, avec l'écran concerné | PGlite par RPC |
| **n°3 — plafonds partagés** | `MAX_CLAIMS_PER_DAY` (1 200) et `INGEST_MAX_RUNS_PER_HOUR` (30) restent PAR COMPTE ; arbitrage fondateur « non tranché ici, volontairement » | **OUI** | **SOUS-DIMENSIONNÉ.** §10-Q2 | Oui si × discipline | PGlite |
| **n°4 — compteurs « run-shaped »** | `user_stats` (~60 colonnes), `specialty_leaderboard` (0069), badges, XP, Foulées, séries : mono-pot. Défaut SÛR pour les badges (les bornes d'allure course ne se déclenchent jamais à vélo), **pas** pour `specialty_leaderboard` qui est un rang comparatif | **OUI** | **BLOQUANT (gameplay).** Un classement comparatif qui mêle deux disciplines fabrique une hiérarchie fausse — exactement ce que l'override E12 interdit. Prochain à traiter, le bloc le dit | Oui | PGlite `specialty_leaderboard` par discipline |

## 5.3 Migrations 0070 / 0071 / 0072 — état d'exécution

| Migration | Contenu | État | Conflit | Décision finale |
|---|---|---|---|---|
| `0070_activity_dimension.sql` | Clés composites `hex_claims(h3index, activity)` et `season_scores(season_id, user_id, activity)` ; `claim_hexes` à 6 arguments ; colonne portée par 8 tables + 3 agrégats | **APPLIQUÉE EN PRODUCTION** (25/07) — attesté par `game-rules.ts` § SUSPENS n°2 | **Son propre bloc « EN SUSPENS » se décrit comme non appliquée.** Le code résout : « sur l'état d'application, c'est le présent commentaire qui fait foi ; sur le contenu du schéma, c'est le SQL » | **CONFORME**, avec la règle « une migration appliquée ne se réécrit JAMAIS » correctement tenue |
| `0071_activity_reads_discipline.sql` | `crew_overview()` comptait 2× le même joueur ; `active_bonuses` sans discipline | **ÉCRITE, NON EXÉCUTÉE** | Tant qu'elle n'est pas passée, `crew_overview` **gonfle** `hexesHeld`, le total du crew et le rang de ville. La carte Crew affiche une emprise que la carte ne montre pas | **BLOQUANT (donnée fausse à l'écran).** `db push` fondateur requis. **C'est un mensonge d'affichage, donc une violation d'A-47** — la plus urgente du dépôt |
| `0072_active_bonuses_activity_is_read.sql` | Ne change aucune table : corrige **une phrase** en base (un commentaire de colonne qui affirmait une faille refermée) | **ÉCRITE, NON EXÉCUTÉE** | Aucun. Décision remarquable : traiter un commentaire SQL faux comme un défaut à migrer | **CONFORME (doctrine).** À citer comme précédent : « un avertissement faux use la confiance dans les avertissements vrais » |

## 5.4 Autres décisions énoncées en code

| Décision | Preuve | Statut | Action |
|---|---|---|---|
| **La discipline est DÉCLARÉE par le chemin de départ, jamais dérivée d'une préférence d'affichage** | `flags.ts:96-113` (récit du correctif du 25/07 : un joueur en lentille Bike lançant depuis le planificateur voyait sa course à pied nettoyée aux bornes du vélo, déclarée `bike`, écrite dans un univers invisible → « 0 zone » après une VRAIE course) ; `PreflightApi.confirmStart(activity)` obligatoire | **CONFORME** | Ne jamais réintroduire de dérivation. **Test de non-régression obligatoire** avant tout nouveau chemin de départ |
| `UNDECLARED_START_ACTIVITY` (`runActivity.ts:81`) | Valeur d'un chemin qui ne déclare rien ⇒ `run` (comportement historique) | **PARTIELLEMENT CONFORME** | Recenser les chemins non déclarants et les faire déclarer, sinon la valeur par défaut deviendra un piège quand le vélo sera majoritaire |
| **`src/ui/ErrorBoundary.tsx` n'est utilisé par personne** | `apps/mobile/app/_layout.tsx:57` | **REDONDANT** | Supprimer |
| **`hexClaims.ts` : la 2ᵉ lecture omet `.eq('activity')` VOLONTAIREMENT** | `game-rules.ts` § SUSPENS n°2 (`:322` du fichier cité) | **CONFORME** | Ne pas « corriger » : elle compte les deux mondes sans les confondre, et son commentaire le dit sur place |

---

# 6. GISEMENT F — Flags, routes sans porte, i18n, wording, paywalls, permissions

## 6.1 Routes déclarées SANS porte d'entrée

| Route | Preuve | Statut | Décision finale |
|---|---|---|---|
| `/crew-public` | `apps/mobile/app/_layout.tsx:198` la déclare ; **0 lien entrant** (grep) ; le fichier est une `<Redirect href="/crew" />` (`crew-public.tsx:27-29`) et son docblock `:20-24` dit qu'elle est **structurellement incapable** de porter une fiche (pas de segment dynamique) | **OBSOLETE** | Garder la redirection (des deep links `gryd://crew-public` peuvent exister) **et** créer la vraie route `app/crew/[tag].tsx` — bloqué **O1** |
| `/crew-discovery` | `_layout.tsx:193` la déclare ; **0 lien entrant** ; « ROUTE ARCHIVÉE (fin du mode vitrine) » (`crew-discovery.tsx:2`) ; `profil.tsx:689` explique que le lien a été redirigé vers `/crew` | **OBSOLETE** | Idem. **Nota** : A-39 §7 affirmait « 9 références dans 4 fichiers » — **c'était vrai le 15/07, c'est faux aujourd'hui**. Le graphe des appelants doit être RE-mesuré, jamais cité de mémoire |
| `(tabs)/warroom` | Déclarée comme onglet (`_layout.tsx:87-90`) ; tous ses liens sont sous `flags.warRoom = false` ; l'écran lui-même `Redirect '/'` (`warroom.tsx:38`) | **OBSOLETE (en tant qu'onglet)** | La sortir de `<Tabs>` : un onglet qui n'est ni dans la barre ni atteignable est une dette de structure, pas un flag |
| `/aujourdhui` | 1 lien entrant, sous `flags.warRoom` (`aujourdhui.tsx:260` est un lien SORTANT) | **PARTIELLEMENT CONFORME** | `GRYD_BACKLOG.md` le dit : « écran Aujourd'hui (orphelin) … à exposer APRÈS O1 en vérifiant qu'il dégrade honnêtement ». Correctement suivi |

## 6.2 i18n — variantes et zones mortes

| Élément | Preuve | Statut | Action |
|---|---|---|---|
| **Catalogue TS typé au lieu de `locales/*.json` + ICU** (Spéc §23) | `apps/mobile/src/i18n/catalog/` (~20 domaines), parité 5 langues forcée par le type `Entry` | **CONFORME**, arbitré dans `SOURCE_OF_TRUTH_REGISTER.md` contradiction n°3 (« le RÉSULTAT prime sur la forme ») | Ne pas migrer. La matrice le redit (Row 10 : « GARDER le catalogue TS typé ») |
| **Zone morte i18n Arsenal (~78 entrées en français dur)** | Bloquant n°1 de la matrice du 24/07 | **LEVÉ** — commits `65174d7`, `9af259b`, `638a3af` (backlog Row 1 coché) | Retirer de la liste des bloquants |
| **`Intl.PluralRules` / paires `one`/`many` manuelles** | Row 10 : « DIFFÉRÉ » | **PARTIELLEMENT CONFORME** | Reste ouvert, correctement inscrit |
| **Invariants jamais traduits : GRYD, GO, Crew** | déclarés en tête de chaque catalogue (`nav.ts:6`, `crew.ts:6`, `result.ts:7`, …) | **CONFORME** | Le mot « GO » est donc verrouillé par l'i18n **autant** que par A-38 : le changer casse 5 langues |

## 6.3 Anciens paywalls et anciennes permissions

| Élément | Preuve | Statut | Action |
|---|---|---|---|
| **Éclats → Bouclier / Streak Gel (protection achetée)** | A-40 §2, fermé par `game-rules.ts:270-300` + 0022/0065/0067 | **CONFORME (fermé)** | — |
| **SKUs `eclats_s/m/l/xl/xxl` toujours en catalogue** | `game-rules.ts:597-601` | **REDONDANT** | Un SKU sans destination n'achète rien aujourd'hui, mais rien n'empêche un futur branchement. **Test de verrou à écrire** (§1.4, A-40) |
| **`NSHealthShareUsageDescription` sans entitlement** | `docs/design/vague-1/RESTE-A-RECALER.md` (tableau 26/07) | **RETIRÉE** (`apps/mobile/app.json` → `_note_permissions_purpose_strings._retire_NSHealthShareUsageDescription`) | — |
| **Politique de confidentialité déclarant chat / santé / paiement en cours** | idem | **CORRIGÉE** (embarquée 25/07, web 26/07) | — |
| **`/admin` : dashboard sur données PRNG derrière un login** | `apps/web/app/admin/(panel)/page.tsx:2` importe `getDashboardStats` de `../lib/demo-data` ; `:34` l'annonce (« PRNG seedé, pas la production ») ; `(panel)/layout.tsx:29,45` affiche un badge démo | **PARTIELLEMENT CONFORME — le seul générateur de données fabriquées encore appelé du dépôt.** A-47 le classe « à trancher » | **Décision fondateur requise (§10-Q5).** L'étiquette « démo » ne suffit pas (A-47 §2) ; l'atténuation est qu'il est derrière un login admin et ne s'adresse pas à un joueur. Trois issues : le brancher sur Supabase, l'état-vider, ou le retirer du build public |

## 6.4 Duplication de livrable en vol

| Élément | Preuve | Statut | Action |
|---|---|---|---|
| **Un second `LEGACY_DECISION_AUDIT.md` existe déjà**, dans un worktree parallèle | `git worktree list` → `/.claude/worktrees/gryd-refonte-audit-d6bf52` sur `claude/gryd-refonte-audit-d6bf52` (HEAD `84c47fb`), contenant `LEGACY_DECISION_AUDIT.md`, `DATA_WIRING_AUDIT.md`, `IMPLEMENTATION_PLAN.md` datés du 26/07 04:03 | **REDONDANT** | **Je ne l'ai pas lu et ne m'en suis pas servi** (règle n°1 : l'existant n'est pas une preuve ; règle n°4 : best current version wins). **Avant tout merge : comparer les deux et n'en garder qu'un.** Deux audits d'autorité qui divergent valent moins que zéro |

---

# 7. GISEMENT G — Les documents fondateurs hors dépôt

| Document | Présence | Vérification | Conflit | Décision finale |
|---|---|---|---|---|
| **`GRYD_REFONTE_DIRECTEMENT_BRANCHEE_ZERO_DEMO_CLAUDE_CODE.md`** (2 289 l., 26/07 03:58) | **ABSENT du dépôt** | Lu depuis `Downloads/`. C'est le cahier EXÉCUTABLE : diagnostic §1, principes de décision §2, hiérarchie legacy §3, architecture §4, design system §5, carte §6, données §7, parcours §8, écrans E01→E12 §9, livrables §13, plan §14, prompt §25 | **Il est aujourd'hui l'autorité la plus récente du projet et il n'a AUCUNE existence dans le dépôt.** Il n'apparaît ni dans `CLAUDE.md`, ni dans `SOURCE_OF_TRUTH_REGISTER.md`. Sa §3.1 se place elle-même **en rang 1**, au-dessus des règles produit permanentes | **ABSENT — BLOQUANT documentaire.** À verser dans `docs/product/` et à inscrire au registre **avant** d'exécuter quoi que ce soit d'après lui. Un cahier des charges qui vit dans `~/Downloads` n'est pas une source de vérité, c'est un fichier |
| **`GRYD_PARTAGE_SOCIAL_OPTIMISE_STRAVA_2026.md`** (1 246 l., 25/07 00:11) | **ABSENT du dépôt** | Lu depuis `Downloads/`. 11 modes de partage (AUTO, IMPACT, PHOTO, AVANT/APRÈS, CREW, PERFORMANCE, CLASSEMENT, MINIMAL, STICKER TRANSPARENT, REPLAY CONQUÊTE), composer §5, confidentialité §7, deep links §8, monétisation §9, analytics §12, A/B §13. **Aucun document du dépôt ne le couvre** : `grep -rl "Flyover\|Sticker Stats"` → **0 résultat** | Le code a **8 templates** (`share/templates.tsx:358-466`) contre 11 modes demandés ; `SHARE_TECHNICAL_SPIKE.md` ne traite que la plomberie de capture, pas la doctrine de partage ; A-24 en documente 6 | **ABSENT — SOUS-DIMENSIONNÉ.** À verser en `docs/product/` et à confronter template par template. C'est le gisement produit **le plus riche et le moins exploité** du corpus : le partage est le moteur d'acquisition, et sa spécification n'est pas dans le dépôt |
| **`GRYD_SPECIFICATION_MAITRE_UNIFIEE_..._2026.md`** (3 973 l.) | **PRÉSENT** | **Vérifié identique au bit près** : `md5` = `53340493efe085cd7c7b38370fbfead1` des deux côtés, `diff` = 0 ligne, 67 574 octets. Copié dans `docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md` | Aucun — la copie est fidèle | **CONFORME (preuve : md5 identique).** C'est la seule affirmation « identique » de cet audit qui repose sur une mesure et non sur une lecture |
| **`GRYD_Addendum_Psychologie_Cognitive_Neuromarketing.docx`** | **PRÉSENT** | Transcription `docs/product/GRYD_ADDENDUM_PSYCHO_COGNITIVE_NEUROMARKETING.md` (36 l.) confrontée au texte brut extrait : règle fondamentale, 8 principes obligatoires, validation finale — **fond complet, aucune omission détectée** | Sa règle « photos humaines / univers vivant » recoupe le programme #15 de la matrice (humain dans l'onboarding), toujours en attente d'arbitrage fondateur | **CONFORME.** L'arbitrage « photo humaine dans l'onboarding » reste ouvert (§10-Q6) |

> **Deux autres documents fondateurs traînent dans `Downloads/` sans être dans le dépôt** et n'ont
> pas été demandés dans ce mandat, mais je les signale parce qu'ils portent des décisions :
> `GRYD_CAHIER_DES_CHARGES_VISUEL_COMPLET_2026_CLAUDE_DESIGN.md` (24/07 22:56) et
> `GRYD_ETUDE_MARCHE_LOGO_2026_DIRECTION_FINALE.md` (25/07 00:26). **NON VÉRIFIABLE** ici : hors
> périmètre. À verser ou à écarter explicitement.

---

# 8. SYNTHÈSE — Les décisions ACTIVES en conflit avec la vision présente, par gravité

> Critère de tri : **une décision périmée qui AGIT coûte plus cher qu'une décision périmée qui
> dort.** Priorité aux conflits que le code applique ou que la base impose.

## G0 — Le plus grave : une donnée FAUSSE est affichée aujourd'hui

**`0071_activity_reads_discipline.sql` est écrite mais non exécutée.** Tant qu'elle ne l'est pas,
`crew_overview()` compte deux fois le joueur qui tient le même hexagone à pied et à vélo : son
`hexesHeld`, le total du crew et le rang de ville sont gonflés. La carte Crew montre une emprise
que la carte ne montre pas.

Ce n'est pas une dette de conformité : **c'est un mensonge affiché à l'utilisateur**, donc une
violation directe d'`AMENDEMENT-47` / « l'app ne ment jamais ». Action : `npx supabase db push`
(fondateur) pour 0071 **et** 0072. Aucun code à écrire.

## G1 — « GO » : cinq décisions contradictoires sur UN bouton, dont deux toujours écrites

| Date | Source | Ce qu'elle dit |
|---|---|---|
| 04/07 | A-12 §A | Bouton à 2 états `CONQUÉRIR` / `DÉFENDRE` |
| 05/07 | A-14 §2 | **« GO », unique, partout** |
| ~11/07 | `GRYD_REGLES_NON_NEGOCIABLES.md` §4 | « CTA contextuel … **jamais « GO » partout** » |
| 06/07 | A-29 | « **GO est retiré définitivement** — toujours un verbe » |
| 13/07 | **A-38 (override fondateur)** | **Le bouton central dit « GO »** |
| 15/07 | A-39 §3 | GO générique **+** verbes contextuels — les deux se répartissent |
| 24/07 | Spéc §20 | `GO` cité comme bon exemple de CTA |
| 26/07 | Cahier de refonte §4.3 | `GO` en tête des CTA autorisés |

**Qui gagne, et depuis quand :** **A-38, depuis le 13/07/2026.** Preuve dans le code :
`apps/mobile/app/(tabs)/index.tsx:387` rend le texte `GO`, docblock `:96` (« Le libellé reste « GO »
(override fondateur AMENDEMENT-38) »). Les trois autorités postérieures (A-39, Spéc, refonte)
convergent toutes vers GO. Le mot est en outre **invariant i18n** (`i18n/catalog/nav.ts:6`) : le
changer casserait 5 langues.

**Ce qui reste faux, et qui agit :** `GRYD_REGLES_NON_NEGOCIABLES.md` §4 dit toujours « jamais GO
partout », dans la **constitution UI contraignante**, sans note de renvoi. A-29 dit toujours « GO
retiré définitivement ». Un agent qui applique la constitution à la lettre supprimera le bouton.

**Décision finale :** GO tient. Inscrire dans §4 et dans A-29 la note de renvoi datée vers A-38.
**Migration : non. Tests : test pur du libellé + de l'énoncé VoiceOver** (déjà spécifié
`nav.ts:100-131` : « GO — sortie vélo — Lancer une course libre »).

## G2 — Le vélo périme des amendements entiers, et il n'a pas de document

**Réponse à la question du mandat : oui, la décision du 26/07 périme des documents entiers.**

| Document | Ce qu'il affirme | État réel au 26/07 |
|---|---|---|
| **Cahier de refonte §1.2** | « Bike exposé sans proposition de valeur opérationnelle » ; « le mode est masqué du sélecteur principal » si le backend n'est pas prêt ; « aucune carte Bike vide » | **Le diagnostic était EXACT le 25/07 au soir, il est CADUC le 26/07 au matin.** Preuve : `flags.ts:63-90` (docblock « CE QUE CE DRAPEAU VEUT DIRE DEPUIS LE 26/07/2026 »), `0070` en production, `validation.ts:61-63` (bornes par discipline), `runs.activity` / `hex_claims(h3index, activity)` / `season_scores(…, activity)`. **La règle §4.5 du cahier, elle, reste en vigueur et elle est SATISFAITE** : le sélecteur n'est offert que parce que les données existent |
| **`SOURCE_OF_TRUTH_REGISTER.md` contradiction n°4** | « Mode Bike : net-new complet … programme derrière `FEATURE_BIKE_*`, séquencé **après stabilité Run** » | **PÉRIMÉ.** `FEATURE_BIKE_*` n'a jamais été créé ; c'est `flags.bike = true` |
| **`CURRENT_STATE_CONFORMITY_MATRIX.md` bloquant n°3 + Row 14** | « lever un invariant anti-vélo gravé dans le moteur pur … NE PAS supprimer l'invariant globalement » | **LEVÉ ET BIEN LEVÉ** : `validation.ts` ne supprime rien, il PARAMÈTRE (`activityRules(activity)`, défaut `run` ⇒ comportement historique strictement inchangé, `:53-54`). L'avertissement de la matrice a été respecté à la lettre |
| **A-46 (parcours personnalisés)** | habitudes → suggestion | `habits_inputs` est **non disciplinée** : les habitudes vélo et course se mêlent |
| **A-19 / A-34 (bonus, coffre)** | fenêtres de bonus | Refermé dans l'ordre par 0071 puis 0072 |

**Ce qui manque, et c'est le trou le plus visible du corpus :** la décision produit la plus
structurante depuis le nom GRYD — « le vélo est une discipline réelle, territoires/classements/points
SÉPARÉS, XP et niveau GLOBAUX » — **n'a aucun `AMENDEMENT-48-VELO.md`**. Elle vit éparpillée dans :
un encadré de planche (`PLANCHES.md` E12), un docblock de flag (`flags.ts:63-125`), trois en-têtes de
migration, un bloc de `game-rules.ts`, et deux messages de commit (`a85189b`, `391a48a`).

Chacun de ces endroits est **excellent** pris isolément. Aucun n'est trouvable par quelqu'un qui
cherche « la décision vélo ». **Décision finale : ABSENT — créer `AMENDEMENT-48-VELO.md`** qui
n'invente rien, ne recopie aucun chiffre, et se contente de **pointer** les six emplacements qui
font foi, avec leur date. Cf. §9-D6.

## G3 — `AMENDEMENT-47` § « Ce qui reste EN SUSPENS » : encore juste ? Ligne par ligne

Le mandat demande explicitement de re-vérifier cette liste, présentée comme la seule qui fasse foi.

| Ligne | Encore juste au 26/07 ? | Preuve |
|---|---|---|
| `apps/web` fabrique des joueurs — **FERMÉ 21/07** | **JUSTE** (fermé) | `landing/dictionary.ts` n'a plus de podium ; `layout.tsx:53` = tagline A-42 |
| `DemoCourseLive` — **FERMÉ 21/07** | **JUSTE** (fermé) | — |
| Fichiers démo encore appelés — **TRANCHÉS 21/07** | **JUSTE** (fermé) | — |
| Quatre fuites (`intention.ts`, `ShareMap`, `runResult`, `social/league`) — **corrigées** | **JUSTE** (fermé) | `ShareMap.tsx` : prop `trace` obligatoire |
| **Le redéploiement du lien public n'est pas fait** | **JUSTE, TOUJOURS OUVERT** | Action d'hébergement (fondateur). `132a352` a préparé le guide Vercel |
| **« localhost = ce que l'iPhone affichera » a des limites** (carte fork web, GPS navigateur, ni Apple ni Google sur web tant qu'O2) | **JUSTE, TOUJOURS OUVERT** | O2 ouvert |
| **Fichiers démo « encore appelés »** — dernière puce | **PÉRIMÉE.** Elle liste `route/demo.ts`, `crew/demo.ts`, `crew/eventsDemo.ts`, `social/demo.ts`, `map/demo.ts`, `history/demo.ts`, `demoRuns.ts`, `performance/demo.ts`, `motivation/demo.ts`, `share/demo3d.ts` — **or les puces PRÉCÉDENTES du même document déclarent ces mêmes fichiers supprimés ou renommés** (`performance/demo.ts` → `types.ts`, `motivation/demo.ts` → `catalog.ts`, `share/demo3d.ts` → `camera3d.ts`) | **Le document se contredit à 40 lignes d'intervalle.** La dernière puce est un vestige de rédaction |
| **Ajout 25/07 — crew public, annuaire, moitié CREW d'E21** | **JUSTE, TOUJOURS OUVERT**, bloqué O1 | `crew-public.tsx:20-24` (pas de segment dynamique), `crew-discovery.tsx:2` (archivée) |

**Verdict : la liste est juste sur 7 lignes / 8, et la 8ᵉ est une contradiction interne, pas un
mensonge.** C'est la liste la mieux tenue du dépôt. **Décision finale : PARTIELLEMENT CONFORME** —
supprimer la dernière puce, qui a été rendue fausse par les puces au-dessus d'elle. Elle affaiblit
exactement ce qui fait la valeur de cette section : son exactitude.

## G4 — Une autorité de rang 1 qui n'est pas dans le dépôt

Le cahier de refonte du 26/07 se déclare **rang 1** (§3.1), au-dessus des règles produit
permanentes, et il n'est **nulle part** dans le dépôt ni dans le registre. Le document de partage
social, lui, n'a **aucun couvreur** (grep « Flyover » / « Sticker Stats » → 0). Le projet exécute
donc une refonte dont le cahier des charges n'est pas versionné.

**Décision finale : ABSENT — verser les deux dans `docs/product/` et les inscrire au registre avant
la Phase 1.** Sans cela, la Phase 1 sera pilotée par un fichier que personne ne peut relire depuis
le dépôt, et l'audit de conformité suivant ne pourra pas être reproduit.

## G5 — `AGENTS.md` : une constitution amputée qui instruit des agents

Détaillé en §3. Résumé : 6 affirmations fausses, un chemin de répertoire inexistant (`.Codex/`), et
**l'absence totale de l'invariant « l'app ne ment jamais »**. C'est le seul élément de l'audit où
une décision périmée peut produire, à elle seule, une régression de fond.

## G6 — Trois collisions d'identifiants dans le corpus d'autorité

| Collision | Portée |
|---|---|
| **Deux `AMENDEMENT-41`** (nommage secteurs 17/07 · LE RELAIS 21/07) | 6 références « A-41 » dans le code, toutes pour LE RELAIS |
| **Deux `D8`** (vie privée `DISCOVERY.md:16` · feature flags `MVP_CHANGESET.md:64`) | `flags.ts:2` cite « D8 (MVP_CHANGESET) » — l'auteur a dû préciser la source, preuve que l'ambiguïté était déjà sentie |
| **`§38.2b`** cité par le commit `54198e7` et par `0064_offensive_lifecycle.sql` | **Ne renvoie à aucun document** : A-38 ne fait que 15 lignes sur le bouton GO. Une règle serveur avec une autorité introuvable |

## G7 — Europe vs France : le balayage n'est pas fini

A-35 (12/07) remplace « France entière » par « Europe entière ». **8 documents disent encore
France**, dont `AGENTS.md:3,7` et **`CLAUDE.md:9`** — dont la ligne 3 dit pourtant Europe. Une
constitution qui se contredit à 6 lignes d'intervalle.

**Nuance importante, et elle joue en faveur du projet :** le §6 rétracté d'A-35 (« pas de villes
européennes, même sur un board DÉMO ») est la meilleure page d'auto-correction du corpus. Le
balayage restant est purement documentaire — **aucune donnée européenne factice n'a été trouvée**.

## G8 — Deux identités typographiques dans un seul produit

`apps/web` = Poppins / Lora / Space Mono (A-03, « Outcrowd »). `apps/mobile` = Inter Tight / Inter /
JetBrains Mono (Night Print, `design-tokens.ts:59-66`). Le cahier de refonte §5.1 impose Night
Print. Un visiteur qui passe du site à l'app change de marque.

## G9 — Le conflit d'activation le plus coûteux, et personne ne l'a écrit

A-30 promet « la ville en plateau de jeu **avant tout compte** », le cahier §8.1 et la Spéc §7.2
le redemandent, A-47 interdit d'y mettre de la démo, et l'app **exige une session**. Trois
autorités concordantes contre un invariant non négociable. La promesse d'activation < 60 s est
structurellement morte et **aucun document ne le dit**.

---

# 9. DÉCISIONS AUTONOMES PRISES DANS CET AUDIT

> Format imposé : Décision / Alternatives écartées / Motif / Impact. Aucune de ces décisions ne
> touche au produit, au juridique, à la sécurité, à l'infrastructure ni à une migration
> irréversible — c'est pourquoi je les tranche (règle n°7). Aucune n'a été appliquée : Phase 0.

### D1 — Aligner `apps/web` sur Night Print
- **Décision** : remplacer Poppins/Lora/Space Mono par Inter Tight / Inter / JetBrains Mono.
- **Alternatives écartées** : (a) garder Outcrowd sur le web et Night Print sur mobile — écartée : deux marques pour un produit ; (b) acquérir la licence ITC Avant Garde — écartée : le docblock `layout.tsx:9-21` montre que la dette dure depuis le 03/07 et n'a jamais été payée.
- **Motif** : le cahier de refonte §5.1 impose Night Print ; les trois fontes sont libres, déjà utilisées, et supprimeraient une dette de licence commerciale.
- **Impact** : `apps/web/app/layout.tsx`, `globals.css`. Aucun impact moteur. Test de régression visuelle web.
- **Chiffrage (règle n°3)** : coût de correction ≈ 1 fichier + 1 feuille de style. Coût de conservation = une dette de licence indéfinie + une incohérence de marque sur le seul point de contact public.

### D2 — Rapatrier O6 et les « à trancher » d'A-43 dans `DISCOVERY.md`
- **Décision** : `DISCOVERY.md` redevient le registre UNIQUE des points ouverts. O6 (tuiles prod, né dans A-13) et les questions ouvertes d'A-43 y entrent.
- **Alternatives écartées** : créer un `OPEN_POINTS.md` — écartée : un 79ᵉ `.md` racine résout un problème de dispersion par de la dispersion.
- **Motif** : un point ouvert absent de la liste des points ouverts n'est pas suivi. O6 dort depuis le 04/07 ; A-43 est « audit en cours » depuis 6 jours.
- **Impact** : `DISCOVERY.md` uniquement.

### D3 — Renuméroter l'un des deux AMENDEMENT-41
- **Décision** : `AMENDEMENT-41-NOMMAGE-SECTEURS-CARTE.md` → `AMENDEMENT-41a-...`, LE RELAIS garde 41.
- **Alternatives écartées** : renuméroter LE RELAIS en 48 — écartée : **6 références « A-41 » dans le code pointent LE RELAIS** (`types.ts:179,207` ; `game-rules.ts:1333,1413,1419,1436,1457` ; `engine/group.ts:2`). Renuméroter le côté référencé maximise le churn.
- **Motif** : renuméroter le côté NON référencé coûte le minimum et supprime l'ambiguïté définitivement.
- **Impact** : 1 renommage + les renvois documentaires. **Zéro fichier de code.**

### D4 — `AGENTS.md` devient un pointeur vers `CLAUDE.md`
- **Décision** : réduire `AGENTS.md` à un renvoi d'une ligne.
- **Alternatives écartées** : (a) régénérer un `AGENTS.md` complet et synchronisé — écartée : deux constitutions divergeront de nouveau, la preuve est faite en 24 jours ; (b) supprimer le fichier — écartée : des outils le cherchent par convention, son absence produirait un « pas d'instructions » au lieu des bonnes.
- **Motif** : `AGENTS.md` omet aujourd'hui l'invariant central du projet (A-47). Le risque n'est pas qu'il vieillisse, c'est qu'il **instruise faux**.
- **Impact** : 1 fichier, 43 lignes → 1. **Zéro fichier de code.**

### D5 — Sortir `bike` de la table `flags`
- **Décision** : `bike: true` n'est plus un flag ; les lecteurs appellent directement la capacité.
- **Alternatives écartées** : le garder « au cas où » — écartée sans invoquer le coût du refactor : un interrupteur qui ne s'éteint jamais n'est pas un interrupteur, c'est une constante déguisée, et il invite à l'éteindre par erreur alors que 0070 est en production (donnée écrite dans les deux mondes).
- **Motif** : le vélo est une discipline réelle, pas une surface à masquer. La distinction lentille / discipline est déjà correctement portée par `ui/activityLens.ts` et `START_ACTIVITY_PARAM`.
- **Impact** : `flags.ts` + ~8 sites de lecture. **À faire par le chantier propriétaire, pas ici.** Le docblock de 60 lignes qui l'accompagne doit être **conservé intégralement** : il porte le récit du correctif du 25/07.

### D6 — Créer `AMENDEMENT-48-VELO.md` comme document de POINTAGE
- **Décision** : un amendement qui n'énonce aucune règle neuve et **ne recopie aucun chiffre** — il pointe les six emplacements qui font foi (planche E12 override, `flags.ts:63-125`, `game-rules.ts` ACTIVITY_SCOPE + SUSPENS n°2/§4, en-têtes 0070/0071/0072, `validation.ts:61`, `_shared/activity_scope_test.ts`) avec leur date et leur portée.
- **Alternatives écartées** : (a) rédiger un amendement complet qui redit les règles — écartée : violerait « aucun nombre magique » et créerait une 7ᵉ source de vérité à maintenir ; (b) ne rien faire — écartée : la décision la plus structurante du projet est actuellement introuvable par recherche.
- **Motif** : le corpus s'indexe par `AMENDEMENT-*.md`. Une décision de ce poids doit avoir son entrée dans l'index, même si son contenu vit ailleurs.
- **Impact** : 1 fichier documentaire + 1 ligne dans `CLAUDE.md` et dans le registre. **Zéro code.**

### D7 — Ne pas réutiliser les livrables existants du 24/07 ni ceux du worktree parallèle
- **Décision** : cet audit est écrit de zéro depuis les sources primaires.
- **Alternatives écartées** : partir de `CURRENT_STATE_CONFORMITY_MATRIX.md` ou du `LEGACY_DECISION_AUDIT.md` du worktree `d6bf52`.
- **Motif** : règle n°1 (l'existant n'est pas une preuve) et règle n°4 (best current version wins). La matrice du 24/07 a d'ailleurs **2 bloquants tombés sur 4** — s'y adosser aurait propagé deux faux bloquants.
- **Impact** : coût de production plus élevé, résultat auditable. **Conséquence à traiter avant merge** : deux `LEGACY_DECISION_AUDIT.md` existent (§6.4) — il faut n'en garder qu'un.

---

# 10. CE QUI EXIGE UNE DÉCISION DU FONDATEUR

> Strictement limité aux cinq catégories autorisées : blocage produit, juridique, sécurité,
> infrastructure, migration irréversible.

| # | Question | Catégorie | Pourquoi je ne tranche pas | Ce qui est bloqué |
|---|---|---|---|---|
| **Q0** | **Exécuter `db push` pour 0071 et 0072.** | Infrastructure + **correction d'un affichage faux** | Action hors code, sur la base de production | Le comptage double de `crew_overview` (§G0). **Le plus urgent de la liste** |
| **Q1** | **Peut-on explorer la carte SANS compte ?** (A-30 §1 vs session requise) | Blocage produit | Touche l'activation, le risque n°1 du produit, et exigerait une RPC publique = surface d'exposition nouvelle | La promesse « valeur perçue < 60 s » (§G9) |
| **Q2** | **`MAX_CLAIMS_PER_DAY` : par compte, ou par compte × discipline ?** | Migration + équilibrage | Le code le déclare « non tranché ici, volontairement » (`game-rules.ts` SUSPENS n°3) | L'équité entre un joueur mono-discipline et un joueur complet |
| **Q3** | **Garder la 3D / le satellite / le DEM (A-26/27/28) ?** | Blocage produit | Trois amendements fondateur consécutifs ; le cahier de refonte §6 ne les mentionne pas — le silence n'est pas un retrait | La charge de la carte, la perf (refonte §6.5) |
| **Q4** | **Lever `flags.season` ?** | Blocage produit | La matrice pose la question depuis le 24/07 ; 3 chantiers livrés sont enterrés derrière un booléen | Classements, spécialités, échéance de saison, rang statutaire |
| **Q5** | **Que devient `/admin` et ses données PRNG ?** | Blocage produit + honnêteté | Dernier générateur de données fabriquées encore appelé ; A-47 le classe explicitement « à trancher » | La cohérence d'A-47 |
| **Q6** | **Photo humaine dans l'onboarding ?** (Addendum psycho « univers vivant » / Spéc §13.3, jamais de photo stock §13.4) | Blocage produit | Arbitrage esthétique et éthique, pas technique | Programme #15 de la matrice |
| **Q7** | **O5 : clearance de marque « GRYD » à l'EUIPO** (plus « KLAIM » à l'INPI) | **Juridique** | Hors de mon périmètre par nature | Tout usage public du nom, élargi au continent par A-35 §4 |

---

# 11. BILAN CHIFFRÉ (format §10 du cahier de refonte)

```txt
Éléments vérifiés          : 131
Conformes                  :  27
Partiellement conformes    :  33
Obsolètes                  :  21
Redondants                 :   5
Surdimensionnés            :   2
Sous-dimensionnés          :   5
Absents                    :   6
Non vérifiables            :   2
Bloquants                  :  10
Points ouverts externes    :  20  (O1, O2, O3, O5, O6, O7, O8, O9a-e, O10 + Q0-Q7)
```

**Répartition par gisement**

| Gisement | Éléments |
|---|---|
| A — 46 amendements, découpés par section quand elles divergent (+ 2 trous de numérotation A-01/A-03) | 53 |
| B — D1-D18 (regroupés D11-D17) + O1-O10 | 22 |
| C — constitution, specs racine, `docs/product`, planches | 15 |
| D — arbitrages portés uniquement par des commits | 8 |
| E — décisions énoncées en code (flags, SUSPENS, migrations, docblocks) | 15 |
| F — routes sans porte, i18n, paywalls, permissions, duplication | 14 |
| G — documents fondateurs hors dépôt | 4 |
| Synthèse — conflits actifs G0→G9 | 10 (recoupent les précédents, non recomptés) |
| **Total distinct** | **131** |

**Les 10 bloquants, par ordre de coût réel**

| # | Bloquant | Type | Coût de correction |
|---|---|---|---|
| 1 | **0071 non exécutée** → `crew_overview` affiche un compte double (§G0) | Donnée fausse à l'écran | `db push` |
| 2 | **`AGENTS.md`** instruit une constitution amputée d'A-47 (§G5) | Régression de fond | 1 fichier → 1 ligne |
| 3 | **Cahier de refonte hors dépôt** alors qu'il se déclare rang 1 (§G4) | Autorité non versionnée | 1 copie + 1 ligne de registre |
| 4 | **Doc de partage social hors dépôt**, couvert par rien (§7) | Spécification produit absente | 1 copie + confrontation |
| 5 | **Décision VÉLO sans document** (§G2) | Traçabilité | 1 fichier de pointage |
| 6 | **`specialty_leaderboard` mono-pot** classe les deux mondes ensemble (SUSPENS n°4) | Hiérarchie fausse | Migration + écran |
| 7 | **`GRYD_REGLES_NON_NEGOCIABLES.md` §4** contredit le code sur GO (§G1) | Constitution vs produit | 1 note de renvoi |
| 8 | **Collision A-41 ×2** (§G6) | Ambiguïté d'autorité | 1 renommage |
| 9 | **Collision D8 ×2** (§G6) | Ambiguïté d'autorité | 2 fichiers |
| 10 | **A-43 « audit en cours »** sans porteur ni échéance (§1.4) | Décision différée oubliée | Remontée en points ouverts |

**Ce que cet audit NE dit pas.** Il n'a pas mesuré la conformité VISUELLE des écrans (hors périmètre :
lecture seule, chantier concurrent). Il n'a exécuté ni `npm run typecheck`, ni les 67 fichiers de
tests Deno, ni PGlite. Aucun statut ci-dessus ne repose sur l'exécution d'un test — uniquement sur
la lecture de sources, avec sa preuve `fichier:ligne`. Les vérifications d'exécution appartiennent
à la Phase 1.
