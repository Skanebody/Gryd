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

**Zones rivales + TRACÉ séparés (03/08/2026).** La carte porte désormais TROIS couches, et leur distinction est le fond d'ADR-010 :
1. **Rivaux** (orange, dessous) — depuis la vue `public_territories`, qui n'expose que `geometry_generalized` et filtre côté serveur selon `map_sharing`. **Aucun tracé pour eux** : leur géométrie ne m'est livrée que floutée, et peindre un chemin à partir d'elle laisserait croire qu'on sait où ils sont passés.
2. **Ma surface** (chartreuse) — dérivée des cellules, lissée. Elle rétrécit quand un rival mord dedans.
3. **Mon tracé** (casing + cœur, au-dessus) — `territories.geometry` EXACTE, sommet par sommet. C'est la ligne que le coureur reconnaît comme sa sortie.

⚠️ 2 et 3 ne sont PAS la même chose. La surface dit ce que je POSSÈDE (et elle change) ; le tracé dit ce que j'ai COURU (et il ne change jamais). Le tracé n'est JAMAIS simplifié : relier deux points éloignés dessinerait un raccourci que personne n'a couru — à travers un pâté de maisons, un fleuve, une voie ferrée. Le seul lissage du produit est celui de la surface, et il ne touche pas cette ligne. Test dédié.

L'échec de la lecture des rivaux n'invalide PAS ma carte : ne pas savoir ce que les autres tiennent n'empêche pas de savoir ce que je tiens.

**Microcopy des notifications FAITE (03/08/2026).** `notifTaken` et `notifFragile` ne nomment plus AUCUN lieu : « {player} t'a pris {m2} m² », « {m2} m² deviennent fragiles demain ». Trois raisons, chacune suffisante — `territories` n'a pas de colonne nom (le nom venait d'un `zoneLabel` envoyé par le CLIENT, alors que tout se tranche serveur) ; un coureur ne prend qu'une PART, donc nommer la zone annonce un tout pour une part ; et nommer le lieu d'une prise DIFFUSE le parcours de l'attaquant à un tiers, alors que le dépôt protège la trace partout ailleurs. Un test verrouille l'absence de `{zone}` ET la présence de `{m2}` sur les 5 langues.
`notifCrewRank` GARDE son nom de ville : un agrégat sur beaucoup de gens ne désigne personne. C'est la ligne, et le test la maintient franche.

RESTE À FAIRE côté legacy : retirer `zoneLabel` du corps de `create_offensive` (un client ne doit pas choisir un nom de lieu). Hors périmètre MVP, à faire au basculement.

## ADR-011 — 2026-08-03 — GRYD est 100 % GRATUIT au lancement
**Décision fondateur** : « on fait un GRYD 100 % gratuit pour commencer, on implémentera un catalogue plus tard ; il faut un dashboard de suivi des performances optimisé mais pas assez poussé pour pouvoir implémenter une version payante plus tard ».

### Ce que ça veut dire, concrètement
- **Aucun achat intégré n'est déclaré.** Vérifié dans `app.json` : zéro produit, zéro `StoreKit`.
- ⚠️ **CORRECTION DU 03/08, LE JOUR MÊME.** La première rédaction affirmait qu'« aucune route atteignable ne mène à `/premium`, `/abonnement` ou `/arsenal` ». **C'ÉTAIT FAUX**, et je l'avais écrit comme vérifié. L'audit d'atteignabilité, ajouté quelques minutes plus tard, a montré deux portes ouvertes :
  · la ligne « Abonnement et achats » des réglages (`features/settings/sections.ts`, ajoutée le 28/07 pour réparer un cul-de-sac d'ABONNÉ — il n'y en a plus) ;
  · la ligne « analyse territoriale » de `/performance`, dont la branche « pas encore Club » renvoie vers `/premium`.
  Les deux sont désormais fermées par **`flags.paidOffer: false`**. Rien n'est supprimé : la ligne, l'écran E75 et le catalogue restent en place, et la version payante redevient un interrupteur.
- **Aucune capacité n'est bridée.** `GRYD_CAPABILITIES` conserve ses paliers (`free`/`plus`/`pro`) — ils décrivent un PLAN, pas une contrainte appliquée.
- **Aucune capacité n'est bridée.** `GRYD_CAPABILITIES` conserve ses paliers (`free`/`plus`/`pro`) — ils décrivent un PLAN, pas une contrainte appliquée. Rien dans le code du MVP ne lit un palier pour refuser quoi que ce soit.
- `react-native-purchases` reste une dépendance INERTE — **et « inerte » est vérifié, pas supposé**. Le SDK ne contacte RevenueCat qu'à l'appel de `configurePurchases`, et seuls DEUX fichiers y touchent hors de `features/premium/` : `app/arsenal.tsx` (derrière `flags.arsenal`) et `app/premium.tsx` (derrière `flags.paidOffer`). Les deux drapeaux sont fermés.
  **Pourquoi ça compte au-delà du produit** : cet appel emporte un identifiant utilisateur vers un tiers, donc un partage de données à déclarer dans les réponses « App Privacy » de l'App Store. Le déclarer sans rien vendre serait absurde ; ne pas le déclarer alors que l'appel part serait une FAUSSE déclaration. La seule position tenable est que l'appel ne parte pas — `noReachableCaller.test.ts` verrouille la liste, et rougira si un troisième écran apparaît.
  La retirer serait un travail à refaire pour rien.

### La marge, et pourquoi elle est délibérée
Le tableau de bord (`app/(mvp)/profil.tsx`) montre QUATRE chiffres : territoire, sorties, distance, dernière course. C'est ce qu'un coureur regarde entre deux sorties.

Ce qu'il ne montre pas — allures par segment, dénivelé, tendances, comparaisons, carte de chaleur — **n'est pas un oubli**. C'est l'espace dans lequel une offre payante pourra s'installer plus tard sans rien reprendre : `control_heatmap` est déjà catalogué `plus`, et le module de lecture (`mvp/profil/read.ts`) agrège sans jamais jeter le détail.

### Ce que l'outillage NE peut PAS prouver, et qu'il ne faut pas croire prouvé
`audit-routes.mjs` fait de l'analyse STATIQUE : il voit les chaînes `'/premium'`
écrites dans un fichier, pas la branche `flags.paidOffer` qui les entoure. Il
continuera donc de compter ces routes comme « atteignables », et **il aurait
tort**. Aucune vérification automatique n'a été ajoutée sur ce point : un contrôle
qui rendrait un verdict faux vaut moins que pas de contrôle du tout — c'est ce
que le fichier de réglages disait déjà de lui-même (« un vert qui ne prouvait pas
la porte »). Ce qui garde la promesse, ici, c'est le drapeau et ce document.

### Ce qui doit rester vrai pour que ce soit honnête
- **Aucun écran ne teasera un contenu payant** tant qu'il n'existe pas. Un « bientôt disponible » sur une fonction absente est un dark pattern (L17) et un bouton mort.
- **Aucune capacité déjà offerte ne deviendra payante.** Les entrées `freeForever: true` de `GRYD_CAPABILITIES` existent pour ça — les reprendre serait retirer au joueur ce qu'il avait, ce que la règle anti-pay-to-win (règle 10) interdit dans l'esprit.
- Le jour où le catalogue arrive, il devra passer par un ADR à part : ce document autorise la GRATUITÉ, pas son inverse futur.

### Remplace
ADR-005 (« monétisation parquée post-MVP ») reste vrai mais devient plus faible que nécessaire : ce n'est plus un report, c'est un choix de produit pour le lancement.

## ADR-012 — 2026-09-09 — Le cahier de septembre 2026 remplace le MASTER PROMPT

**Décision fondateur, mot pour mot : « Le cahier de septembre remplace le MASTER. »**
Question posée : Codex a produit une refonte complète parallèle (`docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`, v1.0 du 08/09/2026 — 3 destinations Carte · Crew · Profil, Course + Vélo, boucle polygonale, XP par journées actives) **sans jamais avoir lu `GRYD_MASTER_PROMPT.md`**, et elle contredit la constitution sur la porte d'entrée, la palette, les seuils de boucle et le pipeline d'ingestion. Qu'est-ce qui fait autorité ?

### Ce qui change : le rang 0
Le rang 0 passe au **cahier de septembre**. Le MASTER descend au rang d'**archive et de référence technique** — conservé, jamais supprimé ; l'encart de renvoi ajouté en tête ce jour est la seule modification autorisée (§12.11 levé pour ce seul encart, rien n'est retiré).
⚠️ **Le cahier n'est pas sur cette branche.** Il vit sur `codex/refonte-2026-09` (`a5b2b0d`) et doit être **rapatrié** dans `docs/product/`. Tant qu'il ne l'est pas, `main` n'a pas de rang 0 lisible : c'est le premier travail dû.

### Ce qui NE change PAS — vérifié point par point DANS le cahier
1. **L'app ne ment jamais / 4 états distincts** — CONSERVÉ. G26 : « Liste avec état réel : connecté, synchronisation en attente, action nécessaire, indisponible » et « employer *Aucune donnée disponible* plutôt qu'un diagnostic faux » ; §8.2 : « Aucun champ vide n'est remplacé par une fréquence cardiaque, une puissance ou des calories inventées ». L19 aussi (§5.2) : « Une sortie sans boucle doit être présentée comme *5,2 km enregistrés*, jamais comme un échec. »
2. **Tout claim décidé serveur · RLS partout** — CONSERVÉ. §18.4 : « RLS et droits d'écriture interdisent au client de s'attribuer propriété, XP ou achats. » §18.2, invariants : CaptureEvent « aucune décision du client seul » ; Entitlement « Un écran n'accorde jamais un droit en local à lui seul ».
3. **Zéro donnée factice** — CONSERVÉ, avec **une nuance à trancher**. §6.5 : « Aucun faux crew, faux adversaire, fausse activité ou faux nombre de membres ne doit combler une carte vide » ; G03 : « Pas de grande capitale affichée par défaut comme si l'utilisateur s'y trouvait ». MAIS §17.5 autorise « des fixtures identifiées et isolées » pour la revue App Store et §17.3 « des données de démonstration clairement préparées pour ce contexte », là où CLAUDE.md est catégorique. **Tension ouverte, non tranchée ici.**
4. **Aucun bouton mort** — CONSERVÉ. §17.5 : « Tous les boutons de P1 mènent à un résultat réel ; aucune page *bientôt* dans le parcours principal » ; §19.1 : « ne pas mettre un onglet décoratif pour faire croire qu'elle fonctionne » ; G24 : « Pas de pastilles rouges permanentes ni de faux stocks restants ».
5. **Une doc ne promet jamais au-delà du code** — CONSERVÉ, et le cahier se l'applique à lui-même. En-tête : « Il ne décrit pas une application déjà reconstruite ou validée sur l'App Store » ; §18.6 : « Aucune n'a été mesurée sur l'application par ce document » ; §20 : « Ce travail documentaire n'a pas exécuté une recette de l'application » ; §12.4 : « Les fonctions P2 ne doivent pas figurer comme disponibles sur la fiche App Store de P1. »
6. **Migration jamais réécrite** — NON CONTREDIT : le cahier ne traite pas le sujet ; son §19.2 parle de migration de **données** (règles versionnées `legacy` / `2026.1`, essai réversible, retour arrière). L'interdit reste entier — et devient le point dur de l'intégration (conséquence 2).
7. **Anti-pay-to-win strict (règle 10)** — CONSERVÉ et durci. §16.2 : « Capture, reprise, défis et chances de victoire → Strictement identiques » ; §4.2 : « Pas de capture multipliée par l'abonnement, de protection achetable ou de boost XP » ; §7.2 : « Le niveau ne change aucun calcul de capture ou de match » ; recette n° 22 : « Joueur payant et gratuit, mêmes activités → Même capture, même XP, mêmes points de défi ». Annexe B : « GRYD ne reprend pas une probabilité de récompense augmentée par le paiement. »

### Tensions ouvertes — CONSTATÉES, PAS TRANCHÉES
- **ADR-011 (100 % gratuit)** contre §16.1 : le cahier **vend** dès P1 (GRYD+ 5,99 €/mois · 49,99 €/an ; collections 1,99 / 3,99 / 7,99 €). Ce n'est pas du pay-to-win (point 7), c'est l'inverse d'ADR-011 — qui exigeait lui-même « un ADR à part » pour ouvrir un catalogue. La décision du fondateur porte sur le MASTER, pas nommément sur ADR-011.
- **ADR-010** (la propriété = les cellules H3 ; `territories` = la mémoire de la course) contre §5.3 + §5.5-8 (« une boucle valide revendique son polygone admissible » ; « H3 peut subsister comme index spatial interne ; il ne décide plus des captures en parallèle »). Les deux exigent UNE seule vérité territoriale et choisissent l'inverse l'une de l'autre.
- **ADR-008** (`#C2FF23`, échelle neutre VERTE `#060907` / `#151C17` …, `grisFaible` corrigé à `#707B72` pour AA) contre la direction visuelle Codex du 09/09 (`#B4FF0D`, neutres GRIS `#0A0A0A` / `#171717` / `#292929`), qui remplace elle-même le §10.2 du cahier (`#C9FF38`). L'écart porte sur l'échelle neutre autant que sur l'accent. Le §10.2 impose de « mesurer le contraste de chaque paire effectivement utilisée » : cette exigence-là est compatible avec la méthode d'ADR-008.
- **ADR-006** (Rouen, beachhead unique) contre §15.3 (« Paris et Lille sont les villes historiques du projet, à confirmer par la présence de capitaines engagés ») et l'`AGENTS.md` de Codex (« Saison 0 focalisée Paris + Lille »).
- **ADR-002** (reset de Saison 0 = total festif) contre §6.6 (« son état à la clôture est archivé comme souvenir de saison, sans reset forcé de toute la carte »).
- **ADR-003** : les deltas Annexe A perdent leur objet — §5.3 supprime le bouclier (« Il n'y a ni bouclier, ni contestation de 18 heures, ni défense achetable, ni dette de connexion ») et le decay ; §5.5 change les seuils (fermeture 25 m course / 40 m vélo · 800 m / 2 km · 5 000 m² / 20 000 m²). La règle « une seule source de constantes » (`game-rules.ts`), elle, n'est pas contredite.

### Conséquences immédiates
1. **Codex n'a jamais vu le MASTER.** Son Annexe A liste le corpus consulté : ni `GRYD_MASTER_PROMPT.md`, ni `docs/DECISIONS.md`, ni `docs/STATUS.md` n'y figurent. Tout ce qu'il déclare « remplacé » l'est par rapport au corpus de **juillet**, pas au régime du 02/08.
2. **Collision de migrations, sur des migrations DÉJÀ APPLIQUÉES.** Prod est à **0112** (`supabase migration list` le 09/09/2026, local = remote). La branche Codex porte `0107 → 0117` sous d'autres noms : `0107_refonte_2026_polygon_authority` … `0112_refonte_2026_territory_read_model` occupent six numéros appliqués en prod. Conséquence : **renumérotation en 0118+** (ses propres `0113`–`0117` tiennent déjà les slots suivants). ⚠️ Au 09/09 elle n'est **pas faite** : `a5b2b0d` porte toujours 0107–0117, et aucun fichier `0118+` n'existe dans le dépôt. Un fichier appliqué ne se réécrit pas.
3. **Les déclarations d'autorité de Codex précèdent la décision.** Son `AGENTS.md` (priorité 0) et son `SOURCE_OF_TRUTH_REGISTER.md` (D-20 : « le cahier de septembre devient la référence produit et de réalisation », `AGENTS.md` au rang 1, code au rang 2) ont été écrits **avant** que la question soit posée au fondateur et **sans** connaître le MASTER : à relire à la lumière d'ADR-012, pas à recopier. Aucun des deux n'est sur cette branche. ⚠️ D-20 ne mentionne pas `docs/DECISIONS.md` — divergence de hiérarchie à réconcilier.
4. **La ligne MASTER se réconcilie, elle ne se jette pas.** Les commits depuis le 02/09 (accessibilité, honnêteté d'affichage, `POINT_MAX_GAP_S` avec `ingest_run` redéployée le 09/09, manifeste de confidentialité, contact `hey@gryd.run`) portent des correctifs réels, certains déployés. Décompte de 32 commits repris du relevé de session, non recompté ici.
5. **Rien n'est recetté.** `REFONTE_2026_RECETTE.md` le dit lui-même : « aucun déploiement distant, achat réel ou test GPS sur appareil n'a été réalisé » ; les harnais PGlite « n'exécutent pas PostGIS » ; la migration `0117` est un « correctif non déployé ». Aucune ligne de `docs/STATUS.md` ne bouge sur cette base.

### Ordre d'autorité RÉVISÉ (reporté dans `CLAUDE.md`)
```text
0. docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md   (le cahier — à rapatrier)
1. docs/DECISIONS.md                                (ADR datés ; ADR-012 en tête)
2. GRYD_MASTER_PROMPT.md + docs/SPEC-*.md           (archives et références techniques)
3. Tout le reste                                    (ARCHIVES, jamais une source)
```
Le passage de `docs/DECISIONS.md` au rang 1 est **mécanique** : c'est là que vivent les décisions du fondateur, dont celle-ci. Les interdits listés ci-dessus **survivent au déclassement du MASTER** : ils sont repris par le cahier, ils n'en dépendaient pas.

## ADR-013 — 2026-09-10 — Classements, défis personnels, récompenses gratuites et notifications (demande du fondateur)

**Demande du fondateur (10/09/2026), mot pour mot :** des classements « en fonction de vélo / course, national, international, européen, que les gens puissent se comparer, en performance ou en points rapportés pour le crew avec les boucles, ou seul — analyse ce qui est le plus pertinent » ; des **défis** avec des **récompenses gratuites internes** à l'application ; les **notifications** qui vont avec ; un **social plus poussé qu'INTVL** (14 captures du concurrent fournies). Analyse d'appui : `docs/product/GRYD_INTVL_ANALYSE_2026_09_10.md` ; brouillon détaillé : `docs/product/ADR-013-BROUILLON.md`. Les choix marqués « par défaut » sont des choix d'exécution pris pour livrer ; ils restent à confirmer par le fondateur.

### Contexte
- Le cahier (rang 0) a **retiré** « le classement universel aux km² » (D-20 ; §5.3 ; Annexe A) pour trois griefs : géographies inégales, volume payant, faux rivaux (§6.5). La demande de classements est donc une **décision nouvelle**, tranchée ici, pas un rappel.
- Faits de dépôt vérifiés le 10/09 : `0118` gèle `territories` / `hex_claims` pour toute activité `2026.1` → les classements existants (0091/0092, 0103, matview `crew_leaderboard`) mesurent une table que le jeu n'alimente plus ; le moteur pur `packages/engine/src/leaderboard.ts` (refuse une liste mixte course/vélo) et les tables `leaderboard_snapshots` / `leaderboard_entries` (0082, vides) sont réutilisables ; `challenge_arenas_2026` est vide (aucun 5v5 possible) ; aucune saison n'est configurée (`season: null` → les 12 paliers gratuits ne progressent pour personne) ; **aucune notification n'est possible** (entitlement `aps-environment` retiré par `plugins/withoutPushEntitlement.js`, notification locale sans appelant monté, `NOTIFICATION_RULES_2026` sans consommateur).

### Décision
1. **Classement solo « Ta commune, cette semaine »** — sujet : joueur ; discipline **séparée** course / vélo ; métrique : **nouveau terrain de la semaine** (flux des `capture_events_2026` publiés, lundi → dimanche, Europe/Paris) ; terrain tenu affiché comme **état**, jamais comme rang ; portées commune → département → France ouvertes **par présence** : une portée n'existe dans l'interface que si elle compte au moins **N** sujets classés réels (N = 5 par défaut, `LEADERBOARD_RULES_2026`, jamais dans une requête) ; Europe déclarée, non servie en Saison 0 ; région non servie tant que le référentiel département → région n'est pas importé ; exclus : `discreet_mode`, personnes sans consentement de carte partagée, activités `pending` ; **quatre états** (pas connecté · pas assez de monde ici · mesure indisponible · mesure en cours) ; fraîcheur affichée (« mesuré à HH:MM ») ; lecture des seuls événements `published` ; écran dans **Carte** (par défaut), **jamais un 4ᵉ onglet** ; `/classement` legacy reste une redirection. **Métriques exclues, définitivement** : allure, chrono, records personnels (§6.2, §6.5, §16.1), XP et journées actives (§7.1), messages, parrainages, achats.
2. **Ligues de crews** (§6.6) : la seule compétition classée, sur **résultats de matchs**, jamais des km² ; ouvertes après calibration fixée **avant** la saison pilote et jamais modifiée — pas dans ce lot.
3. **Défis personnels de la semaine** (niveau nouveau, absent du cahier) : **deux à la fois**, par discipline, satisfaisables par une semaine normale (« ailleurs », « avec quelqu'un », « autrement », jamais « plus »), **expiration silencieuse** (§4.2), **récompense = un objet du catalogue, jamais de l'XP ni un avantage**. Liste de départ (par défaut) : Exploration « une boucle dans un quartier nouveau », Exploration « deux boucles distinctes », Ensemble « une sortie de groupe consentie et validée », Double pratique « une journée course et une journée vélo » (si les deux disciplines existent), Régularité « deux journées actives » (jamais trois), Accueil « proposer une sortie ouverte à ton crew ». Le défi 5v5 (0122) et la saison (0121) existent : il leur manque des **arènes** et des **dates**.
4. **Récompenses gratuites internes** : le catalogue est celui du §7.5 (`LEVEL_REWARDS_2026`, `SEASON_REWARDS_2026`, `season_reward_templates_2026`) ; les **huit récompenses de niveau du §7.2 sont octroyées côté serveur** (elles étaient peintes sans octroi) ; règle unique : **aucun objet ne change un calcul** de capture, de match ou d'XP ; le chemin « je gagne → je vois → j'équipe → ça se voit » se ferme.
5. **Notifications** : `NOTIFICATION_RULES_2026` devient effective (3 sollicitations non transactionnelles / semaine, 1 / jour, offres ≤ 2 / mois, plage calme 21 h–9 h, promotion opt-in désactivée par défaut, `immediateTerritoryLossPush: false`) ; préférences §14.1 stockées serveur (sport · crew · événements suivis · résultats · résumé hebdo · nouveautés/offres · pause du jeu) ; moteur §14.3 (budget, plage, dédup par identifiant d'événement, annulation d'un message devenu faux) ; **canal principal = centre d'activité in-app** ; **locales** pour ce que l'appareil sait seul ; le push distant reste impossible sans clé APNs. Le doublon `PUSH_QUIET_HOURS_*` / `NOTIFICATION_RULES_2026` se résout au profit de 2026.
6. **Social** : le pari du cahier est maintenu (crew d'abord, pas de fil général infini, pas de messages privés ouverts au lancement). À ajouter, par valeur décroissante : impact décomposé sur le post (« +0,18 km² — 0,10 neutre, 0,08 repris ») **sans nom ni avatar de victime** ; niveau permanent + commune sur l'avatar, sans drapeau de pays ; réactions **nommées** et fermées (encouragement · merci · à la prochaine, §13.4) ; titre + vignette de trace protégée ; plusieurs photos ; cloche = centre d'activité ; chemin post → crew → rejoindre ; épinglé du capitaine dans son crew ; recherche passant par le blocage.
7. **Refusé, d'après les 14 captures INTVL** : concours à lots physiques et tirages au sort ; participations gagnées par la capture ou augmentées par l'abonnement ; XP contre une permission, une photo de profil ou un parrainage ; remise d'abonnement contre recrutement ; compte à rebours d'offre et prix de référence jamais pratiqué ; demande de suivi publicitaire (ATT) ; paywall avant la première sortie ; demande de notifications sur un écran d'achat ; désignation nominative des joueurs dépossédés (« STOLEN ») ; bouton de départ dans la barre d'onglets.
8. **Saison 0** (par défaut) : lundi 14/09/2026 00:00 Europe/Paris, six semaines (fin dimanche 25/10/2026), configurée par `configure_season_collection_2026` ; les **arènes 5v5** ne sont publiées que sur une commune où de vrais joueurs courent — jamais avant.

### Conséquences
Constantes `LEADERBOARD_RULES_2026`, `WEEKLY_QUEST_RULES_2026` dans `packages/shared/src/game-rules.ts` (source unique, puis sync) ; migrations 0160-0169 (classement, défis hebdo) et 0140-0147 (notifications, récompenses de niveau) ; le snapshot de classement **ne déclenche jamais** `rebuild_ownership_2026` ; RLS partout, lecture par RPC `security definer` ; écrans `/classement-commune` (depuis Carte) et `/defis-semaine` (depuis Profil) ; G27 réduit aux catégories réellement délivrables ; `docs/STATUS.md` ne bouge que sur preuve.

### Tensions et questions ouvertes — seul le fondateur tranche
1. **APNs : oui ou non ?** (tout le point 5 en dépend) · 2. **N** (5 proposé) · 3. Écran de classement : Carte ou Profil · 4. Secteurs des arènes et qui les trace · 5. Dates de la Saison 0 · 6. Liste de départ des défis et des trois réactions · 7. Calibration des ligues (minimum de matchs, taux de promotion) · 8. **ADR-010** : le régime polygonal de `0118` est en prod, le code a tranché — clore ADR-010 par un ADR propre · 9. Drapeaux de pays et portées supra-nationales : par présence, jamais par date · 10. Région (référentiel Etalab) : importer ou laisser non servie · 11. **ADR-011 vs GRYD+** : hors périmètre, non ouvert par ricochet · 12. **Âge** : le gate est à 16 ans, §13.5 vise les adultes pour le lancement communautaire — à trancher avant dépôt.
