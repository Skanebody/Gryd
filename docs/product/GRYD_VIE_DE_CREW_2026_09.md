# GRYD — La vie de crew : ce qui change vraiment quand on entre

**11/09/2026 · LOT K.** Rang : document de travail, sous le cahier de septembre
(`docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`, rang 0 par ADR-012) et sous
`docs/DECISIONS.md`. Il ne décide rien ; il constate, puis dit ce qui a été fait.

> **Demande du fondateur, mot pour mot :** « Une fois que l'on est dans un crew,
> qu'est-ce qu'il se passe ? Est-ce qu'il y a des modifications qui se font sur
> l'application ? Des écrans supplémentaires ? »

**La réponse honnête d'avant ce lot : peu, et moins que ce que le dépôt savait
déjà faire.** Le monde crew existait presque entièrement — dix écrans, quinze
RPC, une modération, un QR — mais trois de ses faits les plus simples n'étaient
affichés nulle part, une porte sur deux dépendait d'un contenu qui n'existe pas
sur un crew neuf, et le reste de l'app (carte, résultat de sortie, profil) ne
savait presque rien de votre appartenance.

Base de production au 11/09/2026 : **3 comptes, 0 donnée de jeu**. Aucun chiffre
de ce document n'est une mesure d'usage ; ce sont des faits de code.

---

## 1. Avant / après adhésion, surface par surface

Légende : **RÉEL** = câblé sur une source vivante · **MORT** = code présent, non
atteignable · **MENSONGE** = affiché depuis une source figée · **ABSENT**.

### 1.1 Onglet Crew — `app/(tabs)/crew.tsx` → `src/features/refonte/CrewHomeScreen.tsx`

| Fait | Sans crew | Avec un crew, AVANT ce lot | APRÈS ce lot |
|---|---|---|---|
| Blason, nom, effectif | photo générique + deux portes (créer / rejoindre) | **RÉEL** `CrewHomeScreen.tsx:239` (`CrewCrest` sur `crews.color`) | inchangé |
| **Ville et accueil du crew** | — | **ABSENT** — et c'était le défaut le plus étrange : `crew_public_profile` (0152 §3) rend `cityName` et `recruitmentStatus` à qui n'est **pas** dans le crew. On **perdait** deux faits en adhérant. | **RÉEL** `CrewHomeScreen.tsx:163` + `:239`, servi par `crew_overview` (migration **0182**) |
| **Terrain du crew** | — | **ABSENT** — `crew_overview.territory` (0152) était parsé par `features/crew/real.ts:348` et rendu par **aucun écran de septembre**. Une donnée lue et jetée. | **RÉEL** `CrewHomeScreen.tsx:262`, quatre états, en **membres** jamais en surface |
| Prochain rendez-vous + « Je participe » | — | **RÉEL** `CrewHomeScreen.tsx:244` (`crew_outings_2026`, RSVP serveur) | inchangé |
| Conversation du crew | — | **RÉEL** `CrewHomeScreen.tsx:255` → `/crew-conversation` (0127) | inchangé |
| Invitation (QR + lien) | — | **RÉEL** `CrewHomeScreen.tsx:239` → `CrewInviteScreen` (G19) | inchangé |
| Défi de la semaine | — | **RÉEL** `CrewHomeScreen.tsx:281` → `/crew-challenges` (0122, 0148-0151, 0169) | titre aligné sur G20 |
| Fil des sorties partagées | — | **RÉEL** `CrewHomeScreen.tsx:73` (`social_feed_2026`, réactions nommées 0153) | inchangé |
| **Journal du crew** (annonces, captures) | — | **MORT EN PRATIQUE** — la seule porte vers `/crew-activite` vivait **dans** le bloc « Annonce ». Un crew sans annonce épinglée n'y accédait par **aucun geste**. | **RÉEL** `CrewHomeScreen.tsx:290`, porte permanente |
| Membres, rôles, contributions volontaires | — | **RÉEL** `CrewHomeScreen.tsx:296+` (`crew_overview.members`, `crew_set_member_role` 0093) | inchangé |
| Modération d'un membre | — | **RÉEL** `PlayerModerationSheet` (0137-0139) | inchangé |
| **Statistiques du crew** | — | **RIEN À CRAINDRE, ET IL FAUT LE DIRE** : `docs/STATUS.md:31` avertit que « `/crew-stats` peut afficher des zéros VRAIS d'une source MORTE ». **Cet avertissement est périmé** : `app/crew-stats.tsx` est un `<Redirect href="/(tabs)/crew" />` de 3 lignes, et `features/crew/statsData.ts` (seul appelant de `crew_stats()` / `crew_board()`) **n'a aucun importeur**. Le mensonge n'est pas affiché ; il dort. | remplacé sur le fond par « Le terrain du crew », et **verrouillé** par un test de couture qui interdit à tout écran vivant de lire ces deux RPC |

### 1.2 Carte — `src/features/refonte/MapHome.tsx`

| Fait | Avant ce lot | Après |
|---|---|---|
| Terrains des coéquipiers distingués | **RÉEL, et mieux que je ne l'attendais** : `get_ownership_2026` rend un `role ∈ mine \| crew \| others` ; `territoryPaint2026.ts` peint une couche `terr-crew-affiliation` et un **motif** (trait pointillé) — L15 respectée, jamais une couleur seule | inchangé |
| Filtre et légende | **RÉEL** `MapHome.tsx:339` — trois interrupteurs avec ligne-témoin | **le crew est NOMMÉ** `MapHome.tsx:339-340` : « Membres des Quais » au lieu de « Membres de mon crew ». Zéro lecture ajoutée : le nom était déjà chargé et ne servait qu'à une note. |
| Blason du crew sur la carte | **ABSENT** | **TOUJOURS ABSENT, volontairement.** `get_ownership_2026` rend `crew: {id, name}` sans `crews.color`, et `crewEmblemSeed` dérive le blason de cette colonne seule. Dessiner un blason depuis l'`id` afficherait un **autre** emblème que celui de la page du crew. Correctif : une clé dans le contrat `ownership.2026.3` — fichier du lot Carte, pas du mien. |
| « Mode défi de crew » sur la carte libre | **ABSENT** | **NON AJOUTÉ, et c'est le cahier qui le demande.** G20 : « La carte du défi est clairement titrée ; **elle ne remplace pas la carte libre**. » Elle existe déjà, titrée, dans le détail d'un défi (`CrewChallenges2026Screen.tsx:109-111` → `CrewArenaPreview2026`). |

### 1.3 Profil — `src/features/refonte/ProfileHomeScreen.tsx`

| Fait | Avant | Après |
|---|---|---|
| Ligne « mon crew » qui mène au crew | **RÉEL** `ProfileHomeScreen.tsx:218` | inchangé (fichier hors de mon lot) |
| Blason sur les cartes sociales | partiel | Le blason est désormais sur le **résultat de sortie** (voir 1.4) et sur la page du crew. Il reste **absent des posts du fil** : `social_feed_2026` (0124) ne rend pas l'emblème du crew de l'auteur, et le fil est de toute façon **borné à un seul crew** — un blason par post y serait une répétition. Correctif éventuel : une clé dans `social_feed_2026`, lot Social. |

### 1.4 Résultat de sortie — `src/features/refonte/RunResult.tsx`

| Fait | Avant | Après |
|---|---|---|
| « Partager avec mon crew » | **RÉEL** (`SocialPublicationAction2026`) | inchangé (zone éditée par le lot Partage) |
| **Ce que la sortie a apporté au crew** | **ABSENT** — §13.4 demande « Ta sortie compte dans celle du crew » ; **aucune lecture** ne reliait une sortie à un crew | **RÉEL** `RunResult.tsx:165` + `:262`, via `crew_run_impact_2026` (**0182**) : crew actuel, capture publiée ou non, partage déjà fait ou non, journée comptée dans un défi **avec son secteur** |
| Surface gagnée « pour le crew » | — | **JAMAIS, et c'est une règle** : 0126 pose que le titre territorial est **individuel**. Le bloc dit « tu comptes parmi les membres de X qui tiennent du terrain », jamais « +0,18 km² pour ton crew ». Un test le verrouille. |

### 1.5 Journal du crew — `app/crew-activite.tsx` → `src/features/crew/CrewActivityScreen.tsx`

| Section | Avant | Après |
|---|---|---|
| Annonces épinglées | **RÉEL** (0096) | inchangé |
| Sorties proposées | **RÉEL** (0085) | inchangé |
| **Arrivées (adhésions)** | **ABSENT** — `crew_members.joined_at` existe depuis **0002** et n'était lu par **aucune** surface. Quelqu'un rejoignait un crew sans que personne du crew ne l'apprenne nulle part. | **RÉEL**, section `join` (0182 · `crew_joins_2026`), heure **tronquée**, fenêtre 14 j, plafond 5 |
| Départs | absent | **RESTE ABSENT, volontairement** : « Untel a quitté le crew » est une mise en cause publique, jamais une nouvelle (§13.5). Le serveur ne le rend pas. |
| Captures des membres | **RÉEL** depuis 0152 | inchangé |

### 1.6 Notifications — le constat le plus dur de cet audit

**Aucune notification de crew n'existe, et aucune notification tout court.**

Ce n'est pas un manque de règles : les règles sont là, complètes et testées.
`NOTIFICATION_RULES_2026` (game-rules), les sept catégories serveur (**0140**,
dont `crew`), le moteur §14.3 (**0141** : budget 3/semaine, 1/jour, plage calme
21 h-9 h dans le fuseau du compte, déduplication par `unique(user_id,event_id)`)
et son miroir client (`features/notifications/notifications2026.ts`).

Ce qui manque est en amont **et** en aval :

1. **Aucun producteur.** `claim_notification_2026` et `can_notify_2026` n'ont,
   dans tout le dépôt, **que trois occurrences** : leur propre migration, leur
   test PGlite, et un commentaire. Aucune fonction Edge, aucun cron, aucun
   trigger ne les appelle. Les quatre règles demandées — « nouveau membre »,
   « sortie proposée », « défi commencé / terminé », « annonce du capitaine » —
   **n'existent donc à aucun niveau**.
2. **Aucun destinataire.** Il n'y a pas de table `notifications_2026`, et le
   centre d'activité de l'app (`app/activite.tsx`) est un écran **legacy et
   orphelin** (`node scripts/audit-routes.mjs` le classe « porte perdue ») qui
   lit `territory_contests`, table gelée par 0118.
3. **Aucun canal.** Le push distant est impossible : l'entitlement `aps-environment`
   est retiré par `plugins/withoutPushEntitlement.js`. C'est la **tension n° 1
   d'ADR-013** (« APNs : oui ou non ? »), non tranchée par le fondateur.

**Ce que j'ai fait, et pourquoi pas plus.** ADR-013 §5 tranche que « le canal
principal est le centre d'activité **in-app** ». Ce centre, pour un crew, c'est
le journal du crew. J'y ai donc porté les deux événements de crew du cahier
(§14.2) dont le fait était **déjà en base et lu par personne** : l'arrivée d'un
membre, et la sortie proposée (déjà présente). Écrire en plus un producteur
`notify_crew_2026` sans destinataire aurait produit une fonction sans appelant
de plus — exactement ce que cet audit reproche. **La migration `0183` reste
libre**, pour le lot qui tranchera APNs.

### 1.7 Défis — `/crew-challenges`

**RÉEL et complet** : 5v5, rôles de direction opposables (`0149`), retrait
impossible après clôture (`0148`), mesure sur la trace validée (`0150`, `0169`),
arènes publiées **uniquement depuis une vraie géographie** (`0151`, aucun seed).
Aujourd'hui la liste est **honnêtement vide** : aucune arène n'est publiée, parce
qu'aucun joueur réel ne court encore quelque part. Ce n'est pas un défaut.

### 1.8 Classement

Il n'y a **aucun classement de crews**, et c'est une décision, pas un trou :
0126 pose le titre territorial comme individuel, 0152 a retiré `cityRank` et
`crewsInCity` de toutes les lectures, ADR-013 §2 réserve la compétition classée
à des **ligues sur résultats de matchs**, hors de ce lot. La matview
`crew_leaderboard` et `crew_board()` survivent sans lecteur.

---

## 2. Ce que ce lot a implémenté

**Serveur — migration `0182_crew_life_2026.sql`** (additive : aucune table,
colonne, contrainte ni donnée touchée ; deux fonctions remplacées à signature et
grants identiques, deux nouvelles) :

1. `crew_overview()` rend `crew.city_name` et `crew.access`.
2. `crew_joins_2026(uuid)` + `crew_activity_feed()` rend `joins`.
3. `crew_run_impact_2026(uuid)` — ce qu'une sortie a apporté au crew, réservée à
   l'auteur de la sortie.
4. `crew_activity_join_max()` — miroir SQL de `CREW_ACTIVITY_JOIN_MAX`.

**Client :**

- `src/features/crew/crewIdentity2026.ts` (+ test) — ville, accueil, et les
  **quatre états** du terrain de crew. Règle centrale : un statut d'accueil
  inconnu ne devient **jamais** « Ouvert à tous ».
- `src/features/crew/crewRunImpact2026.ts` (+ test) et `crewRunImpactData2026.ts`.
- `src/features/crew/crewActivity.ts` — cinquième section `join`, placée **avant**
  les captures (§13.4 : « ne pas réserver toute la visibilité aux plus rapides »).
- `src/features/refonte/CrewHomeScreen.tsx` — ligne d'identité, carte « Le terrain
  du crew », porte permanente vers le journal, titre G20 du défi.
- `src/features/refonte/MapHome.tsx` — **un** edit : la légende nomme le crew.
- `src/features/refonte/RunResult.tsx` — **un** bloc « Pour ton crew ».

---

## 3. Ce qui reste, avec son effort

| Chantier | Pourquoi ce n'est pas dans ce lot | Effort |
|---|---|---|
| **Un producteur de notifications** (`notify_crew_2026` + job) | Sans destinataire ni canal, une fonction de plus sans appelant. Bloqué par **ADR-013 tension n° 1** (APNs). | 2 à 3 j **après** la décision |
| **Un centre d'activité de septembre** (la cloche) | `app/activite.tsx` est legacy et orphelin ; le reconstruire est un écran entier, hors « lot crew ». | 2 j |
| **Le blason du crew sur la carte** | `get_ownership_2026` ne rend pas `crews.color` ; le fichier est celui du lot Carte. | 0,5 j (une clé + son parseur) |
| **Le blason sur chaque post du fil** | `social_feed_2026` ne rend pas l'emblème de l'auteur ; lot Social. | 0,5 j |
| **`docs/STATUS.md:28-32` à corriger** | L'avertissement sur `/crew-stats` est périmé (la route est une redirection). Fichier de vérité commun, je ne l'écris pas seul. | 10 min |
| **Retirer `features/crew/statsData.ts` + `stats.ts`** | Code mort sans importeur qui appelle deux RPC figées. Une suppression est une décision (SALVAGE). Un test de couture interdit désormais de les rebrancher. | 0,5 j |
| **Ligues de crews** (ADR-013 §2) | Explicitement « pas dans ce lot ». | — |
| **Deux sections Course / Vélo dans un crew** (G17) | Aucune table ne porte la notion ; c'est un chantier de modèle. | 3 à 5 j |
| **Validation d'un événement créé par un nouveau membre** (§13.3) | `crew_outing_create` (0085) tranche déjà sur le rôle ; la modération d'une proposition est une mécanique en plus, à trancher. | 1 j |

---

## 4. Ce que je n'ai pas pu vérifier

- **La RLS réelle.** PGlite tourne en superutilisateur : les 24 vérifications de
  `supabase/tests/crew_life_2026.pglite.test.mjs` lisent les **privilèges au
  catalogue**, pas un refus vécu. `npm run verify:rls` demande le réseau et un
  secret, hors gate.
- **Le rendu à l'écran.** Aucun screenshot : la preview mobile-web du dépôt
  n'était pas montée pendant ce lot, et six agents écrivaient dans le même
  worktree. Le gate `ux-gate` reste à passer sur la page du crew.
- **La migration `0182` en production.** Elle n'a pas été poussée (`supabase
  migration list` d'abord — Codex pousse sur le même projet).
- **Le comportement avec de vraies données.** La base a 3 comptes et 0 donnée de
  jeu : tout ce qui est décrit ici a été prouvé sur fixtures.
