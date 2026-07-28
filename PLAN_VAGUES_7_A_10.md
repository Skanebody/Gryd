# GRYD — Les 4 vagues restantes, sous forme de prompts

*Établi le 28/07/2026, après la vague 6. Chiffres vérifiés, pas estimés :*
*sur les 80 écrans E00–E79 de la spec, **59 ont eu une passe dédiée**. Il en reste **21**.*
*Les 21 routes **existent déjà** — ce qui manque est la passe de conformité, pas la construction.*

---

## §0 — LA LOI COMMUNE (à mettre en tête de CHAQUE agent des 4 vagues)

Ce bloc ne change pas d'une vague à l'autre. Il est la raison pour laquelle les
audits adversariaux trouvent des bloquants au lieu de valider poliment.

```
REPO : /Users/benjaminbel/KLAIM RUN (monorepo GRYD, Expo RN 0.76 + Next 15 + Supabase).

AUTORITE : docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md est la source de verite produit.
AU-DESSUS d elle : la constitution de CLAUDE.md et GRYD_REGLES_NON_NEGOCIABLES.md.

CONSTITUTION — non negociable, elle prime sur toute planche :
1. L APP NE MENT JAMAIS. Donnees REELLES ou VIDES, jamais fabriquees. Quatre etats
   DISTINCTS et jamais confondus : pas connecte / connecte mais vide / echec de
   chargement / lecture EN COURS. Jamais d ecran blanc, de spinner infini, de zero nu,
   ni de repli invente. Un chargement n affirme rien sur le joueur.
2. AUCUN BOUTON MORT. L affichage se derive de la capacite REELLE, pas de l apparence.
3. ANTI PAY-TO-WIN STRICT : aucun achat ne donne territoire, points, vitesse ni
   protection. Verrou : supabase/functions/ingest_run/anti_pay_to_win_test.ts.
4. Tout claim est decide SERVEUR. Le client n attribue jamais un territoire.
5. UNE DOC NE PROMET JAMAIS AU-DELA DU CODE.
6. AUCUN HEXAGONE visible : le territoire est POLYGONAL. H3 est un index interne.
7. CONFIDENTIALITE GEOSPATIALE : aucune position exacte en direct visible par les
   autres ; depart/arrivee masques ; zones privees exclues ; publication differee.
8. ZERO DONNEE EUROPEENNE FACTICE.
9. LES PRIX VIENNENT DU STORE OU D UNE REMOTE CONFIG, jamais du code.

REGLES DE FABRICATION :
- AUCUN NOMBRE MAGIQUE hors packages/shared/src/game-rules.ts.
- Ne JAMAIS editer supabase/functions/_shared/ a la main (scripts/sync-game-rules.mjs).
- i18n 5 langues (fr/en/es/de/pt). FR TUTOIE ; PT est BRESILIEN (voce), jamais teu/tua.
  DEUX TESTS VERROUILLENT CES REGLES (apps/mobile/src/i18n/catalog/registre.test.ts).
- Events PostHog depuis packages/shared/src/events.ts, AUCUN PII. Toute route a segment
  dynamique doit etre inscrite dans apps/mobile/src/lib/screenName.ts — un test enumere
  le dossier app/ et casse sinon.
- Toute logique de regle = fonction PURE + tests Deno (zero import React).
- Couleurs depuis design-tokens, par ROLE (chartreuse=moi, orange=rival, violet=conteste),
  JAMAIS par identite de crew.
- Toute route neuve doit avoir une PORTE : node scripts/audit-routes.mjs doit sortir en 0.

⚠️ LE BACKEND EST APPLIQUE EN PRODUCTION DEPUIS LE 28/07/2026 (migrations 0001-0089) ET
LA BASE CONTIENT DE VRAIS COMPTES (3 dans auth.users, 35 397 lignes publiques). TOUTE
MIGRATION NEUVE DOIT ETRE ADDITIVE. Elle se teste en PGlite (`npm run test:sql`) ; PGlite
ne supporte NI PostGIS NI les roles, donc il ne prouve JAMAIS l effet d une RLS —
`npm run verify:rls` le fait sur le vrai projet, hors du gate.

EPURATION §A : 1 ecran = 1 decision + 1 CTA chartreuse max ; jamais de card dans une
card ; aucun texte d action coupe ; comprendre l ecran en moins de 3 s ; details au tap.
ACCESSIBILITE : cible tactile 44x44 REELLE (pas simulee par un hitSlop) ; Reduce Motion.

METHODE OBLIGATOIRE — AUDITE AVANT DE CONSTRUIRE. Le depot est bati a ~85 % et
AUDIT_GRYD.md est PERIME. Etablis TOI-MEME par grep et lecture « ce qui existe deja vs le
vrai delta », fichier:ligne. Ne reconstruis JAMAIS ce qui marche. Si ton ecran est deja
conforme, DIS-LE et n y touche pas — c est un resultat valide, pas un echec.

HONNETETE DU RENDU-COMPTE : ne dis JAMAIS qu une chose est faite si elle depend encore
d une fixture, d une simulation ou d un composant non branche. Cite fichier:ligne pour
chaque affirmation. Ce que tu n as pas pu faire va dans not_done, sans embellissement.
```

**Structure de chaque vague** — fondation (1 agent qui possède SEUL `game-rules.ts` et
`events.ts`), puis les écrans en parallèle partitionnés **par propriétaire de fichier**,
puis 3 auditeurs adversariaux à lentilles distinctes, puis correction + gate.
Le partitionnement par fichier n'est pas cosmétique : deux agents sur le même fichier
ont déjà provoqué la suppression d'un fichier dans ce projet.

---

## VAGUE 7 — LE CREW (9 écrans)

`E38` l.1479 · `E41` l.1547 · `E42` l.1569 · `E43` l.1591 · `E44` l.1611 · `E45` l.1628 · `E46` l.1652 · `E47` l.1679 · `E48` l.1698

### Le piège de cette vague
La base n'a **aucun crew**. Neuf écrans construits pour lire une base vide, c'est
l'invitation parfaite à fabriquer un crew de démonstration. **Deux écrans de frontière
crew ont déjà été supprimés le 21/07/2026 pour exactement ça.**

Et le bloc crew est le **plus bâti du dépôt** : `RealCrewScreen`, `CrewHero`, `CrewFrame`,
`CrewMembersStrip`, `CrewTerritoryStrip`, `CrewJoinRequests`, `CrewStarterPlan`,
`PlayerModerationSheet`, `ReactionBar`, `blocklist`, `conquestReactions`, `crewEdit`,
`crewOuting`, `discovery` + migrations 0010, 0019, 0044, 0083–0086. Le delta est petit.

### Partition (4 agents)
| Agent | Écrans | Possède |
|---|---|---|
| entrée | E38, E41, E42 | branche sans-crew de `(tabs)/crew.tsx` + `RealCrewScreen.tsx`, `CrewStarterPlan.tsx` |
| territoire | E43, E44, E45 | branche crew-actif, `CrewHero`, `CrewFrame`, `CrewTerritoryStrip` |
| membres | E46, E47 | `CrewMembersStrip`, `PlayerModerationSheet`, `CrewJoinRequests`, `blocklist` |
| annonces | E48 | `ReactionBar`, `conquestReactions` |

### Exigences spécifiques
- **E41** : nom et tag de crew = UGC. La modération existe (`blocked_name_terms`, 67 lignes
  en base, `features/crew/blocklist.ts`) — s'y brancher, pas la réécrire.
- **E42** est un écran d'**attente honnête** : un crew neuf n'a aucun territoire, c'est
  normal. Dire quoi faire, sans fabriquer de progression ni promettre un délai.
- **E44** : c'est là que la tentation d'**une couleur par crew** est maximale. Interdit.
- **E45** : la RAISON de la mission doit être dérivée de faits réels. Base vide ⇒ l'écran
  ne recommande **rien** et le dit ; il ne tire pas une mission au hasard.
- **E46/E47** donnent du **pouvoir sur d'autres personnes**. Chaque RPC doit vérifier le
  rôle de l'appelant : un membre simple ne doit pas pouvoir s'auto-promouvoir ni exclure
  le propriétaire. Et **le dernier propriétaire ne peut pas partir sans transmettre** —
  un crew orphelin est un état cassé.
- **E48** : UGC ⇒ signalement, blocage et retrait sont exigés par Apple. Ne pas créer un
  **second** flux qui divergerait de `features/notifications/activityFeed.ts` (vague 5).

### Lentilles d'audit
1. **Crew fabriqué** — un crew, un membre, une annonce, un rang inventés ; une mission dont
   la raison n'est dérivée d'aucun fait ; l'état vide confondu avec un chargement.
2. **Pouvoir sur autrui et vie privée** — un RPC qui ne vérifie pas le rôle ; une écriture
   client directe ; un crew orphelin possible ; de l'UGC sans chemin de retrait ; un event
   qui transporte un nom de crew.
3. **Carte, bouton mort, fondations** — contour hexagonal visible ; couleur par crew ; tous
   les runners sans agrégation par zoom (LOD) ; le reste des fondations.

---

## VAGUE 8 — LA CARTE ET LA BOUCLE D'ACTIVITÉ (7 écrans)

`E11` l.829 · `E12` l.902 · `E18` l.1063 · `E20` l.1110 · `E21` l.1150 · `E23` l.1185 · `E24` l.1201

### Le piège de cette vague
Ce sont les écrans **les plus retouchés du dépôt** (AMENDEMENT-09, -13, -16, -20, -21,
-26, -37, quatre batchs carte). Le risque n'est pas le manque, c'est la **régression** :
défaire un arbitrage antérieur sans le savoir. Chaque agent doit lire les amendements
concernés AVANT d'écrire, et l'audit doit chercher les régressions, pas les absences.

Second piège, propre à E20/E21 : ce sont des écrans qui tournent **pendant une course**,
avec le GPS actif, l'écran allumé et la batterie qui compte. Une animation permanente ou
un re-render à chaque fix est un défaut produit, pas un détail.

### Partition (4 agents)
| Agent | Écrans | Possède |
|---|---|---|
| carte | E11, E12 | `(tabs)/index.tsx`, `features/map/MapScreen*.tsx`, `BattleMapOverlays.tsx` |
| planificateur | E18 | `route-planner.tsx` |
| course active | E20, E21 | `course-live.tsx`, `features/run/gps/RealCourseLive.tsx` |
| dégradé | E23, E24 | pause et GPS faible — modules `features/run/` dédiés |

### Exigences spécifiques
- **E11** est l'écran d'accueil réel du produit : il doit se comprendre en **moins de 3 s**
  et ne jamais afficher un territoire que le serveur n'a pas donné. ⚠️ **Suspens connu** :
  là où `territories.geometry` manque, le repli dérive encore de la grille de capture —
  donc des hexagones. Ne pas aggraver ; le correctif de fond est le backfill (vague 10).
- **E12** : les filtres vivent **derrière Couches**, jamais en permanence à l'écran (§A).
- **E20 vs E21** : Run et Bike sont **strictement séparés**. Vérifier qu'aucune métrique,
  aucun seuil et aucune zone ne fuit d'une discipline à l'autre.
- **E23 pause** : distinguer la pause **manuelle** de la pause **automatique** — elles ne
  disent pas la même chose au joueur, et le dépôt a déjà une copie pour ça.
- **E24 GPS faible** : c'est un état **honnête**, pas un échec. La course continue, la
  précision est dite. Ne jamais inventer une position pour « lisser » le tracé.
- **CONFIDENTIALITÉ** : aucun écran de course ne diffuse la position live à autrui.

### Lentilles d'audit
1. **Régression** — un arbitrage d'amendement défait ; une métrique Run qui apparaît en
   Bike ; un filtre remonté hors de Couches ; un halo ou une couleur réintroduits.
2. **Honnêteté de la mesure** — une position lissée ou inventée ; une distance estimée
   présentée comme mesurée ; une pause auto présentée comme manuelle ; un « GPS faible »
   confondu avec un « GPS perdu ».
3. **Carte, bouton mort, fondations** — hexagone visible, couleur par identité, LOD absent,
   plus d'un CTA chartreuse, cible sous 44×44, batterie (animation permanente pendant la
   course), le reste des fondations.

---

## VAGUE 9 — RÉSULTATS ET RÉGLAGES (5 écrans)

`E29` l.1290 · `E31` l.1329 · `E32` l.1344 · `E76` l.2320 · `E77` l.2338

### Le piège de cette vague
`course-result.tsx` a été modifié **trois fois cette semaine** (garde `interiorPartial`,
variantes E30/E33/E34, retrait de la garde locale `capReached`). Un agent qui n'aurait pas
lu ces docblocks défera la garde qui empêche l'app de surestimer une surface gagnée.
**Un seul agent doit posséder ce fichier.**

### Partition (2 agents)
| Agent | Écrans | Possède |
|---|---|---|
| résultats | E29, E31, E32 | `course-result.tsx`, `features/run/resultVariant.ts` |
| réglages | E76, E77 | `profil-edit.tsx`, `confidentialite.tsx`, `features/settings/` |

### Exigences spécifiques
- **E29/E31/E32** sont les **trois dernières variantes** de résultat. Les six existent déjà
  dans `resultVariant.ts` (`variantOf` / `composeResult`) — le travail est le delta vers la
  spec écran, pas un nouveau moteur. **Ne pas défaire la garde `interiorPartial`** : quand
  l'intérieur capturé est partiel, la surface **disparaît** au lieu d'être fausse.
- **E32 sortie libre** : une course sans capture n'est **pas un échec**. La copie ne
  culpabilise pas et ne promet pas une revue qui n'existe pas (piège déjà documenté dans
  `i18n/catalog/result.ts` à propos de `flagged`).
- **E76** : `profil-edit.tsx` doit écrire la ville **là où `MapScreen` la lit** — vérifié en
  vague 4, à ne pas casser.
- **E77** est l'écran où le joueur **exerce** ses droits. Chaque réglage doit avoir un effet
  **serveur** réel : un `map_sharing` appliqué seulement côté client ne protège personne
  (faute constatée en vague 4). La suppression de compte doit rester fonctionnelle de bout
  en bout — Apple l'exige.
- **La politique embarquée a changé deux fois cette semaine** (Nominatim, puis OSRM) :
  vérifier que `i18n/catalog/legal.ts`, la liste des sous-traitants et `LEGAL_LAST_UPDATED`
  correspondent aux appels réseau **réels** du binaire.

### Lentilles d'audit
1. **Régression sur les gardes de résultat** — `interiorPartial` défaite ; une surface
   affichée quand elle surestime ; `partial` refondu avec `valid`.
2. **Droits réellement exercés** — un réglage de vie privée appliqué côté client seulement ;
   une suppression de compte cassée ; une politique en retard sur le code.
3. **Bouton mort et fondations** — le bloc habituel.

---

## VAGUE 10 — DURCISSEMENT (aucun écran)

Cette vague ne construit pas d'écran. Elle solde la dette accumulée et rend le produit
**démontrable**. Trois chantiers, dans cet ordre.

### 10.1 — Le backfill des territoires *(le plus important)*
C'est le seul moyen de tenir la constitution §6 « aucun hexagone ». Aujourd'hui, là où
`territories.geometry` est absent, la carte retombe sur la grille de capture : des
hexagones, visibles, en contradiction avec la règle.

⚠️ **Un agent a déjà refusé d'écrire ce backfill, et il avait raison** : reconstruire un
polygone depuis des cellules H3 injecterait des contours hexagonaux dans la colonne
polygonale, **indistinguables des vrais**. Le backfill n'est donc légitime que s'il part de
la **trace GPS** de la course source (`runs`), pas des cellules. Les courses sans trace
exploitable restent **sans géométrie**, et la carte doit le dire au lieu de replier sur la
grille. Migration ADDITIVE, testée en PGlite, appliquée avec `supabase db push`, puis
`npm run verify:rls`.

### 10.2 — La preuve de bout en bout sur appareil
**Rien de ce qui a été livré n'a tourné sur un vrai téléphone.** Tout est prouvé par tests
purs, lecture de code, et RLS au niveau Postgres. Il manque : une vraie course envoyée
depuis un appareil, un verdict serveur observé dans l'app, un drain de file hors-ligne
réel, une bascule d'AppState réelle. C'est un build EAS + une sortie de 10 minutes.

### 10.3 — Accessibilité, observabilité, E2E
- Balayage a11y : cibles 44×44 **réelles**, Reduce Motion, contrastes mesurés (pas estimés).
- Les scénarios E2E de la spec §25 non couverts.
- `AUDIT_GRYD.md` est **périmé depuis six vagues** : le régénérer ou le retirer, parce
  qu'une doc fausse est la même faute qu'une donnée fabriquée.

### Ce qui n'avancera pas sans une décision du fondateur
| Sujet | Ce qui bloque | Effet aujourd'hui |
|---|---|---|
| Instagram / TikTok | `app.json` ne déclare aucun `LSApplicationQueriesSchemes` | aucune pastille réseau sur natif ; le CTA chartreuse **est** la feuille système |
| Mode Photo du partage | `NSPhotoLibraryUsageDescription` déclare « photo de profil » **uniquement** | pas de geste Strava (ses stats sur sa propre photo) |
| Appel de routage OSRM | déclenché **à l'ouverture** d'E16/E17, sans geste | position arrondie à ~110 m et sous-traitant déclaré, mais l'appel automatique demeure |
| Notifications | credentials APNs/FCM absents d'EAS | E10 et E71 disent honnêtement qu'elles ne sont pas livrées |
| Territoires au reset de saison | la spec E59 dit qu'ils survivent, **le code les efface** (`season_close/index.ts:286`) | le code fait foi, aucun écran ne promet le contraire |
