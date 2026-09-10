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

## ADR-014 — 2026-09-10 — L'écran « Abonnements et achats » informe avant de vendre

**Retour du fondateur, mot pour mot, après test sur son iPhone :** « La page Abonnements et achats ne montre aucun abonnement, aucun prix, aucun achat, aucun statut. Il faut de l'information. » Et : « Vérifie les CGV. »

### Le fait technique, avant toute décision
Le diagnostic tenait en une ligne de `features/premium/capability.ts` : sans clé RevenueCat de **production** (`appl_` / `goog_`), `purchasesCapability()` rend `available: false`, `usePremium` tombe en `unavailable`, et **tout** l'écran descendait des offres du Store. Pas de Store, pas d'offres ; pas d'offres, pas d'écran. L'application ne mentait pas : elle se taisait. C'était conforme à la lettre d'ADR-011 et inutilisable en pratique. Une page qu'on ouvre exprès et qui ne dit rien laisse croire qu'il n'y a rien à savoir.

Faits de dépôt vérifiés le 10/09/2026 : aucun produit n'existe côté App Store Connect ; aucune clé RevenueCat de production n'est posée dans les environnements EAS ; `flags.paidOffer` reste à `false` ; la ligne « Abonnement & achats » de `app/parametres.tsx`, elle, n'est **pas** derrière ce drapeau et mène bien à `/abonnement`. C'est cette porte que le fondateur a poussée.

### Décision
1. **`/abonnement` devient une page d'information, en quatre blocs qui existent sans la boutique.**
   · **Ton statut** : quatre états distincts, jamais repliés l'un sur l'autre (pas connecté · vérification en cours · gratuit ou GRYD+ actif avec son échéance · impossible de vérifier, avec « Réessayer »). « Impossible de vérifier » n'est jamais réécrit en « aucun abonnement » : on ne sait pas n'est pas une réponse.
   · **GRYD+** : les trois bénéfices P1 du cahier §16.1, le tarif prévu, et la garantie anti-pay-to-win.
   · **Tes achats** : la liste réelle. « Vide » et « illisible » sont deux faits et s'écrivent différemment.
   · **Gérer** : la gestion d'abonnement iOS **seulement si un droit est actif**, puis les CGV et la confidentialité.
2. **La capacité `storeAvailability2026` décide de tout ce qui vend.** Une boutique est OUVERTE si et seulement si elle a été **lue** (`status: 'ready'`) **et** qu'au moins une offre porte un **prix confirmé**. « S'abonner » et « Restaurer mes achats » n'existent que là, sur `/abonnement` comme sur `/premium`. Le défaut réparé est nommé : `/premium` vendait sur `status === 'ready'` seul, alors que `readOffers` accepte un package sans prix ; `/abonnement` ouvrait « Restaurer » sur `empty` et `error`, deux états sans aucun produit derrière. Chaque refus garde son nom (`checking`, `signedOut`, `platform`, `notConfigured`, `nothingOnSale`, `noConfirmedPrice`, `readFailed`) : l'écran n'a pas la même phrase à dire selon la cause.
3. **Deux prix, et un seul gagne à la fois.** `storePrices.ts` et le cahier §16.1 interdisent un prix codé en dur, parce qu'ils protègent d'un mensonge précis : afficher un montant qu'on ne fera pas payer. Règle appliquée : **dès qu'un prix du Store existe, il gagne et le tarif prévu disparaît**. Le tarif prévu (`COMMERCIAL_PROPOSAL_2026`, formaté en euros français) ne s'affiche que lorsqu'aucune vente n'est possible, c'est-à-dire précisément quand aucune facture ne peut le démentir, et il est **annoncé comme prévu**. Les CGV disaient déjà cela : « les tarifs annoncés sur les pages d'offres sont indicatifs tant qu'aucune vente n'est ouverte ».
4. **Aucune date d'ouverture n'est promise.** Le cahier n'en fixe aucune (§16.1 : « Si ces trois bénéfices P1 ne sont pas réellement utilisables, le lancement de l'abonnement est différé ») et ADR-011 interdit le « bientôt disponible ». L'écran dit donc le **fait** (GRYD+ n'est pas encore ouvert à la vente) et sa **conséquence** (tout ce qui est utilisé aujourd'hui reste gratuit), sans mois ni saison. Et « Pas encore en vente » n'est affiché que lorsque c'est vrai : déconnecté, en cours de lecture ou sur le web, on ne sait rien de la vente, donc on ne conclut pas.
5. **Les CGV et les CGU sont corrigées au fond, dans l'application et sur le site, dans le même commit.** Elles vendaient « GRYD Club », un « Founder Pack (à vie) », un « Starter Pack », de la « monnaie de style » et des « Éclats », plaçaient l'« historique complet » (gratuit au §16.2) dans l'abonnement, nommaient le bouclier et le gel de série que §5.3 a supprimés, et promettaient un droit « activé immédiatement après le paiement » là où G28 et le code exigent une **confirmation**. Les CGU promettaient en outre une perte de terrain par inactivité (« tant que tu cours ») que le jeu ne fait plus. Ces documents sont **contractuels** : c'est là que « une doc ne promet jamais au-delà du code » est le plus strict.

### Ce qu'ADR-014 NE fait PAS
Il **n'ouvre aucun catalogue** et ne contredit pas ADR-011. Rien n'est mis en vente, aucun produit n'est déclaré, `flags.paidOffer` n'est pas touché, et le SDK n'est toujours pas configuré (`capability.ts` refuse toute clé non-production ; `noReachableCaller.test.ts` verrouille la liste des appelants). ADR-011 exigeait « un ADR à part » pour ouvrir la vente : **ce n'est pas celui-là**. La tension n° 11 d'ADR-013 (« ADR-011 vs GRYD+ ») reste ouverte et n'est pas tranchée ici.

### Ce qui reste à faire pour qu'un achat soit possible
1. **Produits App Store Connect** : deux abonnements auto-renouvelables (mensuel, annuel) dans un même groupe, et trois produits non consommables pour les collections permanentes. Aucun n'existe.
2. **Tableau de bord RevenueCat** : offerings publiées, identifiant d'entitlement **identique** à `PRO_ENTITLEMENT_ID` (une divergence encaisse le paiement sans ouvrir le droit, cf. `purchase_pending`).
3. **Clé publique de production dans EAS** (`appl_…`), par plateforme. Une clé `test_…` est refusée, délibérément.
4. **Déclarations « App Privacy »** : le jour où la clé est posée, l'identifiant utilisateur et l'historique d'achat partent chez RevenueCat et **doivent** être déclarés. Les déclarer sans vendre serait absurde ; ne pas les déclarer alors que l'appel part serait une fausse déclaration.
5. **Recette sandbox** des sept états de G28 : en attente, annulé, refusé, réussi, déjà détenu, restauration sans droit, résiliation en fin de période. Plus le webhook et `sync_gryd_plus_access_2026` sur un vrai reçu.
6. **Bénéfices P1 réellement utilisables** (§16.1), faute de quoi le lancement de l'abonnement est différé, quelle que soit la qualité de l'écran.

### Points juridiques ouverts, à faire valider par un juriste
1. **Médiateur de la consommation non désigné.** L'adhésion est obligatoire en B2C (art. L612-1). Les CGV le disent honnêtement au lieu d'inventer un nom ; cela ne remplace pas l'adhésion.
2. **Reconduction tacite (art. L215-1).** Les CGV du **site** portent la clause d'information annuelle ; celles de l'**application** ne la portent pas, leur canal étant l'App Store. L'articulation entre l'obligation de l'éditeur et les rappels d'Apple n'est pas tranchée.
3. **Renonciation au délai de rétractation** (art. L221-28, 13°) : la clause existe dans les deux versions, mais le recueil de l'accord exprès **avant** la commande passe par la feuille d'achat d'Apple, que GRYD ne contrôle pas.
4. **Identité de l'éditeur** (NEXUS 1993, SASU, capital, siège 75008 Paris, RCS Paris, SIREN, TVA) : présente et complète dans le document ; ces données n'ont pas été vérifiées auprès d'un registre par ce travail.
5. **Deux canaux, un contrat.** Les CGV du site prévoient un paiement Stripe qui n'existe pas dans l'application. Tant qu'aucune vente n'est ouverte, l'écart est théorique ; il ne doit pas le rester à l'ouverture.

### Écarts constatés et NON corrigés ici
1. **Le site vend encore l'ancienne offre hors de ses pages légales** : `apps/web/app/abonnement/page.tsx`, `components/landing/PricingSection.tsx` et `components/landing/dictionary.ts` affichent « GRYD Club », « Founder Pack », « Starter Pack » et des « Éclats ». Les CGV du site sont désormais justes, la page de prix qui les jouxte ne l'est pas. Surface publique, hors périmètre de ce lot : à traiter comme un chantier propre.
2. **Les CGV ne sont pas listées dans Réglages.** `app/parametres.tsx` propose CGU, confidentialité, crédits et licences, mais pas les conditions de **vente** ; la seule ligne CGV vit dans la section légale de `app/parametres/[section].tsx`, qu'aucun écran n'atteint. Le chemin existe désormais en deux gestes (Réglages → Abonnement et achats → Conditions de vente), mais une ligne directe manque.
3. **Les outils GRYD+ restent murés derrière un droit que personne ne peut obtenir.** `/premium-analytics` et le Studio de partage se ferment sur `access.active`, alors qu'aucune vente n'est ouverte et qu'ADR-011 pose « aucune capacité n'est bridée ». Le bouton mort a été retiré (l'écran dit ce qu'il est et renvoie sans promettre), mais la question de fond n'est pas tranchée : **faut-il ouvrir les comparaisons privées à tout le monde tant que rien n'est en vente ?** Ouvrir puis reprendre heurterait « aucune capacité déjà offerte ne deviendra payante » ; laisser muré maintient un mur sans porte. Seul le fondateur tranche.

## ADR-015 — 2026-09-11 — Anti-triche : les signaux convergent, le serveur suspend, un humain devra trancher

### Le fait technique, avant toute décision
Le fondateur demande si l'application détecte qu'une sortie n'est plus de la course à pied, n'est pas du vélo, ou vient d'un faux GPS, et comment se prémunir du scénario Strava (simuler une course puis importer la trace). L'audit `docs/product/GRYD_ANTITRICHE_2026_09.md` (11/09/2026) établit quatre faits :
1. Le scénario Strava **ne marche pas sur GRYD, et c'était déjà vrai** : le territoire ne se gagne qu'avec une sortie enregistrée en direct par l'application et ancrée par une session serveur (`refonte2026.ts` n'accorde `sourceVerified` qu'à `source === 'gps'` ; `0155_capture_admission_2026.sql` refuse indépendamment). Une trace importée compte comme sport, jamais comme terrain. Personne ne l'avait écrit ; deux tests le verrouillent désormais.
2. Le podomètre était collecté et transmis depuis des mois, mais le pipeline actif ne le passait jamais à `scoreRun` : le seul signal qui dise « ce déplacement n'est pas pédestre » sortait « indisponible » sur chaque course de production.
3. Un moteur au-delà de 60 km/h soutenus est vu ; un scooter à 45 km/h est indiscernable d'un cycliste rapide, et aucune donnée collectée ne le permet (angle mort verrouillé par un test).
4. L'altitude n'est pas collectée, et la régularité d'échantillonnage est détruite par la décimation client (`gps.ts`) : deux signatures de simulateur sont invisibles côté serveur.

### Décision
1. **Quatre signaux entrent dans le moteur pur** (`packages/engine/src/anticheat.ts`, constantes en fin de `game-rules.ts`, section ANTI-TRICHE 2026) : vitesse soutenue sur fenêtre glissante de 5 minutes bornée par l'allure plancher de la discipline, incohérence de discipline (vitesse de vélo déclarée course + zéro pas mesuré), uniformité anormale de la précision GPS (jamais escaladant seul), position simulée Android (`mocked`, trois états). Le podomètre et le drapeau `mocked` sont transmis bout en bout (migration additive `0174_anticheat_mocked_location_2026.sql`).
2. **Un faisceau qui converge suspend, il ne condamne pas** : la sortie passe `flagged`, ne prend ni terrain ni points tant qu'elle n'est pas revue, et le joueur lit un état neutre (« Vérification nécessaire. Ta sortie est enregistrée. »). Les raisons et le score vont dans `anticheat_reviews` (0081), jamais sur une surface publique : une suspicion est une donnée sensible.
3. **Le réglage reste prudent tant que personne ne dépile la file** : un signal n'escalade seul que s'il ne se trompe quasiment jamais. Le jour où un opérateur existe, ce réglage devient trop prudent et devra être revu avec des traces réelles.
4. **Le verrou « territoire = GPS live ancré serveur » devient une règle écrite** et testée. Toute future voie d'import (Apple Santé, Strava, GPX) compte comme sport, jamais comme terrain, sauf ADR contraire.

### Ce qu'ADR-015 NE fait PAS
Il ne construit ni la revue humaine, ni le module natif Core Motion (`CMMotionActivityManager` : walking / running / cycling / automotive), ni App Attest / Play Integrity, ni l'altitude dans `RunPoint`. Il ne remonte pas les seuils locaux d'`anticheat.ts` (`ANTICHEAT_REVIEW_AT`, `ANTICHEAT_REJECT_AT`, poids) dans `game-rules.ts` : déplacement pur, volontairement séparé d'un changement de comportement.

### Ce qui reste à décider (fondateur)
1. **L'opérateur de revue** : qui, sous quelle habilitation, avec quel délai. Sans lui, une vérification est en pratique un refus définitif. Chantier n°1 de la feuille de route (1 à 2 jours : une vue protégée, un rôle, une procédure).
2. **Le pipeline historique** (`validate.ts`, `anticheat_wiring.ts`, moitié d'`index.ts`) décrit un système qui ne tourne plus : le marquer « ARCHIVE, NON ENREGISTRÉ » en tête de fichier ?
3. **Le seuil de tolérance** une fois un opérateur en place.
4. **Le module Core Motion** (3 à 5 jours) avant d'ouvrir la Saison 0 à des inconnus : c'est ce qui ferme l'angle mort vélo / voiture.

## ADR-016 — 2026-09-11 — Les outils GRYD+ sont ouverts tant que personne ne peut payer (décision fondateur)

Intégré dans DECISIONS.md le 11/09/2026 depuis le brouillon rédigé par le lot correspondant ; la décision du fondateur y est citée mot pour mot. Le brouillon est supprimé pour qu’il n’existe qu’une seule version opposable.

### Le fait, avant toute décision

Trois faits de dépôt, vérifiés le 11/09/2026 :

1. **Personne ne peut payer.** Aucun produit n'existe côté App Store Connect, aucune clé
   RevenueCat de production n'est posée dans les environnements EAS, et `capability.ts` refuse
   délibérément toute clé qui n'est pas une clé de production (`appl_` / `goog_`). Conséquence
   mécanique : `purchasesCapability()` rend `available: false`, `usePremium` tombe en
   `unavailable`, et `storeAvailability2026()` rend `{ open: false, reason: 'notConfigured' }`
   (ou `'platform'` sur le web).
2. **Les outils étaient murés derrière un droit que personne ne pouvait obtenir.** Les
   comparaisons privées (`/premium-analytics`) et les compositions du Studio de partage se
   fermaient toutes deux sur `access.active`, c'est-à-dire sur un reçu serveur
   (`get_gryd_plus_access_2026`) qu'aucun achat ne pouvait produire. Le mur valait donc pour
   100 % des comptes, définitivement.
3. **ADR-014 l'avait constaté sans le trancher** (écart n° 3, 10/09/2026) : « Ouvrir puis
   reprendre heurterait "aucune capacité déjà offerte ne deviendra payante" ; laisser muré
   maintient un mur sans porte. Seul le fondateur tranche. »

### La décision du fondateur, mot pour mot

À la question « ouvrir ou non les outils GRYD+ (comparaisons privées, Studio) tant que rien
n'est en vente ? », le 11/09/2026 :

> « ouvre, faut les mettre en place si quelqu'un paie »

### Sa lecture, en deux temps

**Temps 1 — aujourd'hui.** Rien n'est en vente, donc les outils GRYD+ sont **ouverts à tout
compte connecté**, avec une phrase honnête qui nomme le régime : « Inclus gratuitement jusqu'à
l'ouverture de GRYD+. » Aucun bouton d'achat n'apparaît, puisque aucun achat n'est possible.

**Temps 2 — le jour de l'ouverture.** Dès qu'une offre est lue avec un prix confirmé, les
outils **redeviennent réservés aux abonnés**, et c'est le droit serveur
(`sync_gryd_plus_access_2026` puis `get_gryd_plus_access_2026`) qui décide seul, comme
aujourd'hui pour un abonné réel.

### Ce que ça change pour ADR-011

Cette décision **contredit la lettre** d'ADR-011, qui pose : « **Aucune capacité déjà offerte
ne deviendra payante.** Les entrées `freeForever: true` de `GRYD_CAPABILITIES` existent pour
ça — les reprendre serait retirer au joueur ce qu'il avait, ce que la règle anti-pay-to-win
(règle 10) interdit dans l'esprit. »

Trois précisions, pour que la contradiction soit lue exactement pour ce qu'elle est :

- **Elle est une décision fondateur, pas une dérive de code.** ADR-011 exigeait lui-même « un
  ADR à part » pour ouvrir un catalogue ; celui-ci en est un, et il est explicite sur ce qu'il
  reprend.
- **Elle ne touche pas au pay-to-win** (règle 10, constitutionnelle). Les trois outils
  concernés — comparaisons privées, compositions Studio, variantes de saison — sont
  cosmétiques, analytiques et privés. `noPaidGameAdvantage2026()` reste vrai :
  `paidCaptureMultiplier`, `paidXpMultiplier` et `paidChallengeMultiplier` valent 1, et
  `virtualCurrency` vaut `false`. Rien de ce qui se gagne sur le terrain ne change.
- **Elle ne touche pas non plus aux capacités `freeForever`.** Le suivi sportif, le journal,
  les statistiques de base, le jeu, les défis, les crews et les exports simples restent
  gratuits, avant comme après l'ouverture. Ce qui est ouvert puis repris, ce sont les
  **outils GRYD+ eux-mêmes**, annoncés comme tels dès la première ligne de l'écran.

**Ce qui n'est PAS tranché ici** : la tension n° 11 d'ADR-013 (« ADR-011 vs GRYD+ ») reste
ouverte. Ce brouillon ne met rien en vente, ne déclare aucun produit, ne touche pas
`flags.paidOffer`, et ne configure toujours pas le SDK (`noReachableCaller.test.ts` verrouille
la liste des appelants — elle est inchangée).

### La règle de bascule

**Elle est mécanique, pas manuelle.** Aucun drapeau à basculer à la main, aucune date écrite
nulle part :

```
ouverts en pré-vente  ⟺  storeCannotSellYet2026(storeAvailability2026(…)) === true
                          ET l'utilisateur est connecté
                          ET son reçu serveur a été LU (et ne dit pas « actif »)
```

`storeCannotSellYet2026` rend `true` pour quatre motifs, et quatre seulement — ce sont les
seuls qui **affirment** que personne ne peut payer :

| Motif              | Fait |
| ------------------ | ---- |
| `notConfigured`    | aucune clé de production : la boutique n'est pas raccordée |
| `platform`         | ni StoreKit ni Google Play ici (web, module natif absent) |
| `nothingOnSale`    | raccordée, mais aucun produit publié |
| `noConfirmedPrice` | des produits, mais aucun prix confirmé |

Et elle rend `false` pour les trois motifs qui **n'affirment rien** — `checking` (lecture en
cours), `signedOut` (pas de compte), `readFailed` (lecture échouée) : ouvrir sur une
non-réponse serait le même mensonge que fermer sur une non-réponse (L8 / L14 / L19).

**Le jour de l'ouverture, la bascule se fait donc toute seule** : une offre lue avec son prix
rend `storeAvailability2026()` ouverte, `storeCannotSellYet2026()` retombe à `false`, et
`grydPlusAccessState2026` rend `inactive` pour qui n'a pas de droit serveur.

### Le préavis, à définir

Reprendre en silence serait exactement ce que redoutait ADR-014. Deux niveaux existent
aujourd'hui, un troisième reste à décider par le fondateur :

1. **Fait** (fait) — le bandeau dit « Inclus gratuitement jusqu'à l'ouverture de GRYD+. »
2. **Règle** (fait) — `/premium` et `/abonnement` ajoutent : « Le jour où GRYD+ sera mis en
   vente, ces outils redeviendront réservés aux abonnés. Aucune date n'est fixée. » Aucune
   date n'est promise : ni le cahier §16.1 ni ADR-011 n'en fixent une, et ADR-011 interdit le
   « bientôt disponible ».
3. **Préavis daté** (À DÉCIDER) — combien de jours avant l'ouverture l'application prévient-elle,
   et par quelle surface (bandeau, notification, écran dédié) ? Rien n'est écrit dans le code
   tant que le fondateur n'a pas tranché : un préavis inventé serait une promesse de plus.

### Ce que le code fait maintenant

- `apps/mobile/src/features/premium/plan2026.ts` — `storeCannotSellYet2026(availability)`,
  pure, testée sous Deno : les quatre motifs qui ouvrent, les trois qui n'ouvrent pas.
- `apps/mobile/src/features/premium/access2026.ts` — `grydPlusAccessState2026` prend
  `storeCannotSell` et rend un troisième champ `reason`
  (`'server_entitlement'` | `'pre_sale_open'` | `null`) plus un statut `preSaleOpen`. Ordre des
  verdicts : `loading` → `signedOut` → `loading` (reçu non lu) → `unavailable` (reçu illisible)
  → `active` (droit serveur) → `preSaleOpen` → `pending` → `inactive`.
- `apps/mobile/src/features/premium/useGrydPlusAccess.ts` — lit l'offre courante dans le même
  lot de requêtes que le reçu serveur et le CustomerInfo, borné par la même patience
  (`STORE_READ_PATIENCE_MS`), et dérive `storeCannotSell` par les mêmes primitives que
  `usePremium`. Aucun appel réseau supplémentaire aujourd'hui : sans clé, l'offre n'est pas
  demandée.
- Les écrans distinguent `subscribed` (`access.active && !included`) de `included`
  (`access.reason === 'pre_sale_open'`) : « Abonnement actif », l'échéance et « Gérer mon
  abonnement » ne s'affichent que pour un abonnement RÉEL.

### Ce qui reste à faire

1. **Intégrer cet ADR dans `docs/DECISIONS.md`** (le seul acte qui le rend opposable), et y
   fermer l'écart n° 3 d'ADR-014.
2. **Décider le préavis** (point 3 ci-dessus) et l'écrire.
3. **Le Studio de partage** (`src/features/share/**`) s'ouvre déjà par le hook, mais ses mots
   n'ont pas été relus : il écrit encore « Composition incluse avec GRYD+ » quand l'accès est
   ouvert, ce qui nomme un abonnement que le joueur n'a pas. À reprendre dans un lot
   `share/**` (ce lot-ci n'a pas le droit d'y toucher : un autre agent y travaillait).
4. **Vérifier sur appareil** que `get_gryd_plus_access_2026` répond bien pour un compte réel :
   si la RPC échoue, l'état reste `unavailable` (« on ne sait pas ») et les outils NE
   s'ouvrent PAS. C'est voulu, mais cela signifie que l'ouverture dépend d'un backend joignable.
5. **Les six points d'ADR-014 « pour qu'un achat soit possible »** restent entiers : produits
   App Store Connect, offerings RevenueCat, clé de production EAS, déclarations « App Privacy »,
   recette sandbox des sept états de G28, bénéfices P1 réellement utilisables.

## ADR-017 — 2026-09-11 — Le parrainage récompense les deux, avec des objets que personne d’autre ne peut avoir (dérogation fondateur au cahier §15.2)

Intégré dans DECISIONS.md le 11/09/2026 depuis le brouillon rédigé par le lot correspondant ; la décision du fondateur y est citée mot pour mot. Le brouillon est supprimé pour qu’il n’existe qu’une seule version opposable.

### Le fait, avant toute décision

Quatre faits de dépôt, vérifiés le 11/09/2026 :

1. **Le parrainage n'existait pas.** `public.referrals` est dans `0002_schema.sql` depuis le
   premier jour, avec sa policy d'insertion dans `0003_rls.sql`. Elle n'a **jamais été
   écrite** : `grep -rn "from('referrals')" supabase/` ne rend rien, `activated_at` et
   `boost_expires_at` ne sont posés nulle part, et la seule policy d'insertion exige que le
   CLIENT connaisse l'`user_id` du filleul — valeur que l'app n'expose jamais, par règle
   explicite (`features/social/profileLink.ts`). Le chemin était mort à l'écriture.
2. **Le code de 0002 était inutilisable.** `users.referral_code text not null unique default
   encode(gen_random_bytes(4),'hex')` : huit caractères hexadécimaux, alphabet `0-9a-f`. On ne
   le dicte pas, on ne le recopie pas d'une capture d'écran sans se tromper, et il vit sur une
   table que le client lit.
3. **L'écran le disait déjà**, mot pour mot, dans `ProfileHomeScreen.tsx` au 10/09/2026 :
   « PAS DE "ENTRER UN CODE DE PARRAINAGE" […] Peindre le champ serait un bouton mort. »
4. **La récompense prévue était interdite.** `game-rules.ts` §3.7 portait
   `REFERRAL_BOOST_MULTIPLIER = 2` et `REFERRAL_BOOST_DAYS = 7`. Le cahier §15.2 dit l'inverse,
   en toutes lettres. Les deux constantes ont été retirées le 11/09 au matin, et l'audit
   (`GRYD_REGLAGES_PROFIL_AUDIT_2026_09.md` §5.1) a nommé la tension :
   « **Tension à trancher par le fondateur**, hors périmètre d'un lot d'UI. »

### La lettre du rang 0

Cahier de septembre, **§15.2 « Boucles de croissance »**, mot pour mot :

> « Le parrainage ne donne ni XP ni points ni chance supplémentaire de gagner un prix.
> Proposition : une variante "Premier rendez-vous" après une première sortie partagée
> réellement validée, disponible à tous les membres concernés. »

### La décision du fondateur, mot pour mot

À la question de la récompense de parrainage, le **11/09/2026** :

> « ok oui mais offre un boost ou autre au moins pour les deux, il faut faire comme Tesla, il
> faut qu'un mec qui parraine ait quelque chose à gagner que les autres n'ont pas »

Trois exigences y sont lisibles, et aucune n'est facultative :

- **« au moins pour les deux »** — la récompense va au parrain ET au filleul. Une récompense
  qui n'irait qu'au parrain fabriquerait un recruteur, pas un partenaire de sortie.
- **« comme Tesla »** — le programme de parrainage Tesla ne paie pas en avantage produit : il
  donne des objets et des services qu'on n'obtient pas autrement. C'est un statut, pas une
  monnaie.
- **« quelque chose à gagner que les autres n'ont pas »** — l'exclusivité est la substance de
  la décision. Une récompense achetable ailleurs ne la satisferait pas.

### Ce qui est décidé

Le parrainage donne **trois choses**, aux DEUX joueurs, après une sortie validée de chacun :

| Récompense | Ce que c'est | Pourquoi elle est exclusive |
|---|---|---|
| **Collection « Parrainage »** | Cadre d'avatar, style de tracé, titre « Parrain » ou « Filleul » | Aucun palier de niveau (0144), aucune collection de saison (0121), aucun SKU (0014, 0125) ne les délivre. Le seul chemin est `referral_grants_2026`. |
| **Boost d'XP ×1,5 pendant 7 jours** | Multiplie l'XP de **progression** (le niveau) et rien d'autre | Ne s'achète pas, ne s'empile pas, ne classe personne. |
| **30 jours de GRYD+** | Crédit **banqué**, démarré le jour de l'ouverture de la boutique | Ne s'achète pas ; ne peut pas être obtenu par un compte sans parrainage. |

### Les garde-fous qui SURVIVENT à la dérogation

Ce sont eux qui rendent l'écart tenable. Aucun n'est négociable, et chacun est vérifié par
`supabase/tests/referral_2026.pglite.test.mjs`.

1. **Jamais un point de territoire, de performance ni de défi.** Les classements de
   0160-0164 lisent `runs.points_awarded`, les surfaces capturées et les métriques de
   performance. Aucune de ces colonnes n'est écrite par le parrainage. Deux joueurs à effort
   égal finissent au même rang, qu'ils aient parrainé ou non. **C'est la contrepartie exacte
   du §15.2** : il interdisait « ni XP ni points » ; la dérogation ne prend que l'XP, et
   laisse les points intacts.
2. **Jamais une chance supplémentaire de gagner un lot réel.** Le §15.2 visait un tirage. Il
   n'y en a aucun ici, et il ne doit jamais y en avoir.
3. **Jamais achetable** (règle 10, anti-pay-to-win, constitutionnelle). Ni la collection, ni
   le boost, ni le crédit ne portent de prix, et aucun SKU ne les délivre.
   `COMMERCIAL_PROPOSAL_2026` garde ses trois multiplicateurs à 1.
4. **Attribution 100 % serveur, après une action RÉELLE des deux joueurs.** Un déclencheur SQL
   sur l'évidence sportive (`progress_activity_2026`, 0119) ; le client n'a que deux RPC, dont
   une qui noue un lien et n'octroie rien.
5. **Le boost ne touche pas les paliers de collection de saison.** `ledger.collections` reste
   le total pur : un calendrier de saison n'est pas une récompense de recrutement.
6. **Le boost ne s'empile pas.** Deux parrainages dans la même semaine rendent deux lignes
   d'octroi et **une seule** fenêtre à ×1,5.
7. **Le plafond de saison ne prive jamais le filleul.** Au-delà de
   `REFERRAL_MAX_ACTIVE_PER_SEASON`, c'est la part du PARRAIN qui est coupée : le filleul a
   couru, il garde la sienne.

### Ce que ça change dans le code

- `packages/shared/src/game-rules.ts` **§3.7** : le commentaire d'interdiction est remplacé par
  cette dérogation, datée, avec ses bornes. Nouvelles constantes : `REFERRAL_CODE_LENGTH`,
  `REFERRAL_CODE_ALPHABET`, `REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS`,
  `REFERRAL_COMPLETION_WINDOW_DAYS`, `REFERRAL_MIN_VALIDATED_DISTANCE_M`,
  `REFERRAL_XP_BOOST_2026`, `REFERRAL_REWARDS_2026`, `REFERRAL_GRYD_PLUS_CREDIT_DAYS`.
  `REFERRAL_MAX_ACTIVE_PER_SEASON = 5` est CONSERVÉ tel quel.
- Migrations **0184 / 0185 / 0186** : le code, le lien + le crédit, les récompenses. RLS
  partout, `revoke … from public, anon`, et **aucune policy** — les deux seules portes du
  client sont `my_referral_2026()` et `redeem_referral_code_2026(code)`.
- `public.referrals` (0002) et `users.referral_code` (0002) ne sont **ni supprimés ni
  touchés** : rien n'est réécrit, une migration ne se réécrit jamais.
- `has_gryd_plus_access_2026` (0120) est étendue au crédit de parrainage.
  `get_gryd_plus_access_2026` ne l'est **pas** : un crédit n'est pas un abonnement, et l'app ne
  doit jamais dire « Abonnement actif » à quelqu'un qui n'a jamais payé.

### Ce qui reste à trancher

1. **Le nom.** Le cahier proposait « Premier rendez-vous » ; le code dit « Parrainage ». Si le
   fondateur préfère le mot du cahier, seuls le catalogue i18n et les quatre libellés
   d'objets changent — les `reward_id` serveur, eux, sont des clés et ne se renomment pas.
2. **L'art des quatre cosmétiques.** Les `reward_id` `referral_frame`, `referral_trace`,
   `referral_title_parrain`, `referral_title_filleul` doivent être ajoutés au catalogue
   cosmétique (`src/features/arsenal/cosmetics2026.ts`, lot en cours le même jour). Tant
   qu'ils n'y sont pas, `/parrainage` les NOMME sans en peindre d'aperçu.
3. **Le badge `crew/recruiter`** (« Active 5 recrues via ton parrainage »), relevé par l'audit
   §5.1 : il n'est branché sur rien et pose la même question dans l'autre sens. Hors périmètre
   de ce lot.
4. **Le jour d'ouverture de GRYD+.** `start_referral_gryd_plus_credits_2026()` est
   l'interrupteur qui fait démarrer les crédits banqués. Il n'a **aucun appelant aujourd'hui**,
   et c'est écrit plutôt que caché : c'est une action d'opérateur du jour J.

### Si le fondateur refuse cette dérogation

La marche arrière est propre, et elle tient en une migration : `0187+` qui vide
`referral_reward_templates_2026` et rend `referral_try_complete_2026` sans octroi. Le lien, le
code et les états resteraient — c'est-à-dire un parrainage qui MESURE la boucle de croissance
du §15.2 sans rien payer, exactement ce que le cahier décrit.
