# GRYD — Programme Ambassadeur

**Origine** : AMENDEMENT-44 §2 action **A7** — « l'audit a raison : *créateurs,
run clubs, étudiants* n'est pas un programme ». AMENDEMENT-45 §3 action **6**.

**Contexte de décision (fondateur, 21/07/2026)** : l'application est **gratuite**,
monétisée uniquement par achats intégrés. Ce programme n'est donc **pas** un
canal de vente : c'est un canal d'**acquisition organique** et de **densité
locale**. Il ne doit rien coûter tant qu'il n'a rien prouvé.

**Ce document est le programme, pas le recrutement.** Sélectionner et contacter
des personnes réelles relève du fondateur (§9).

---

## §0 — Pourquoi ce programme existe (le chiffre qui le justifie)

L'A-44 §1 a établi que **GRYD ne peut pas acheter sa croissance** : LTV ≈ 0,89 €
sur 12 mois contre un CPI running de 2 à 5 €. Chaque utilisateur acheté coûte
1 à 4 € net. Le programme ambassadeur n'est pas une opération de communication :
c'est le **seul canal d'acquisition dont l'économie fonctionne**, parce que son
coût marginal est du temps, pas de l'argent.

Second point, plus important : GRYD n'a pas besoin d'**utilisateurs**, il a
besoin de **densité sur un quartier**. Dix coureurs dispersés dans dix villes ne
produisent aucun jeu — aucun rival, aucune zone contestée, aucune raison de
revenir. Dix coureurs sur le même arrondissement produisent le jeu entier.

> **Le mandat d'un ambassadeur n'est donc pas « faire télécharger l'app ».
> C'est « faire courir plusieurs personnes sur le même quartier ».** Tout le
> reste du document découle de cette phrase.

C'est aussi le prérequis du seul produit à ~99 % de marge (`GRYD_SPONSORING_TERRITORIAL.md`) :
sans densité réelle, il n'y a rien à vendre à un commerçant.

---

## §1 — Ce que le programme n'est PAS

À poser d'abord, parce que la moitié des erreurs de ce type de programme vient
de là.

- **Ce n'est pas du sponsoring d'influenceurs.** Aucune rémunération, aucune
  commission, aucun paiement au recrutement, aucun cadeau matériel.
- **Ce n'est pas un avantage de jeu.** Un ambassadeur ne reçoit ni territoire,
  ni points, ni protection, ni notification plus rapide, ni information sur un
  rival (doctrine §22, cf. A-43 §4). Il joue exactement au même jeu que les
  autres. *Un ambassadeur qui gagnerait mieux parce qu'il est ambassadeur
  détruirait la crédibilité de la carte, c'est-à-dire le produit.*
- **Ce n'est pas un contrat de travail ni une prestation.** Pas de facturation,
  pas d'obligation de résultat, pas d'exclusivité. Un engagement moral, révocable
  des deux côtés.
- **Ce n'est pas une affaire d'audience.** 40 000 abonnés Instagram qui courent
  dans 40 villes valent moins, pour GRYD, qu'un capitaine de run club dont
  12 membres courent le mardi soir au même endroit.

---

## §2 — Profil recherché

Trois profils, par ordre de valeur décroissante pour GRYD.

### P1 — Le capitaine de collectif local (profil prioritaire)

Anime déjà un groupe qui court **ensemble**, au même endroit, à horaire récurrent :
run club de quartier, section running d'une salle, groupe WhatsApp de 8-20
coureurs, association étudiante. **C'est le profil qui produit de la densité**,
parce que la densité est un effet de groupe, pas d'audience.

### P2 — L'organisateur de sorties récurrentes

Pas de « club » constitué, mais organise de fait la sortie du dimanche depuis des
mois. Souvent invisible sur les réseaux. Valeur : la régularité et la fidélité du
noyau. Plus difficile à identifier — passe par recommandation.

### P3 — Le créateur running **local**

Compte running dont l'audience est **géographiquement concentrée** (une ville,
un arrondissement). Utile pour amorcer une ville nouvelle, pas pour la tenir.
**Le critère est la concentration géographique de l'audience, jamais sa taille.**
Un créateur national est explicitement hors cible à ce stade.

### Hors cible, assumé

Comptes fitness généralistes ; audiences nationales ou internationales ; profils
qui demandent une rémunération ou un tarif (le programme n'en a pas, et le dire
sans détour économise du temps aux deux parties) ; profils dont l'activité est
individuelle et non collective.

---

## §3 — Critères de sélection mesurables

Deux portes. La première est **déclarative** (il n'existe encore aucune donnée
d'usage : l'app n'a pas de base). La seconde est **mesurée dans l'app** 30 jours
plus tard. Cette structure en deux temps est la seule honnête au démarrage.

### Porte 1 — Entrée (déclaratif + entretien de 15 min)

| Critère | Seuil proposé | Comment on le vérifie |
|---|---|---|
| Groupe existant qui court ensemble | ≥ 6 personnes identifiées | Capture du groupe / liste des membres, montrée en entretien |
| Récurrence des sorties | ≥ 2 sorties collectives / mois, depuis ≥ 3 mois | Déclaratif + historique Strava du club ou du fil de discussion |
| Concentration géographique | ≥ 70 % des sorties dans le même secteur urbain | Déclaratif + carte montrée en entretien |
| Ville prioritaire | Paris ou Lille (Saison 0) | Adresse de départ habituelle |
| Antécédents de modération | Aucun | Recherche publique basique ; jugement du fondateur |
| Compréhension de la règle anti-P2W | L'accepte explicitement | Formulée à l'oral pendant l'entretien, actée par écrit |

**Un seul critère non rempli ne disqualifie pas mécaniquement** — sauf les deux
derniers, qui sont éliminatoires.

### Porte 2 — Confirmation à J+30 (mesurée, dans l'app)

Le statut d'entrée est **provisoire**. Il devient effectif si, 30 jours après
l'activation de l'ambassadeur :

| Critère | Seuil proposé | Source de mesure |
|---|---|---|
| Recrues activées | ≥ 5 comptes ayant terminé ≥ 1 course | `signup_completed` + `run_complete`, périmètre crew (§7) |
| Recrues encore actives | ≥ 3 des 5 ont couru dans les 14 derniers jours | `run_complete`, périmètre crew |
| Sortie collective réelle | ≥ 1 course de ≥ 3 membres du crew le même jour, même secteur | `run_complete` + secteur (voir §7 sur la limite actuelle) |

Les seuils ci-dessus sont des **paramètres de programme**, pas des règles de jeu :
ils n'ont donc rien à faire dans `packages/shared/src/game-rules.ts`. **Si un jour
ils sont lus par du code applicatif** (un écran, un calcul de statut), ils devront
y être déplacés comme toute constante de jeu — cf. CLAUDE.md, « aucun nombre magique ».

---

## §4 — Contreparties

**Règle absolue : cosmétique et accès anticipé. Rien d'autre.** Un ambassadeur
n'obtient jamais un meilleur POUVOIR, seulement une meilleure IDENTITÉ (A-43 §4).

### Ce qui est donné

| Contrepartie | Nature | Existe déjà ? |
|---|---|---|
| Badge et cadre de fondateur | Cosmétique | Oui — `founder_badge`, `frame_founder` (`SKU_GRANTED_ITEM_KEYS.founder_pack`) |
| Skin de trace + skin de territoire | Cosmétique | Oui — `skin_trace_founder_line`, `skin_territory_founder_glow` |
| Titre affiché sur le profil | Cosmétique | Oui — `title_founder_runner` |
| Template de partage réservé | Cosmétique | Oui — `template_founder` |
| Accès anticipé aux builds (TestFlight) | Accès | Oui — canal TestFlight, coût 0 |
| Ligne directe avec le fondateur | Accès | Oui — messagerie existante, coût 0 |
| Influence sur les priorités (écoutée, non contraignante) | Accès | À organiser (§5) |

**Mécanisme d'octroi** : la table `feature_entitlements` (migration 0026) accepte
déjà `source in ('pass','founder','promo','admin','eclats')` — les valeurs
`promo` et `admin` sont exactement faites pour ça. Les objets d'inventaire
passent par `grant_user_items` (service-role). **Aucun code de jeu nouveau n'est
nécessaire** ; ce qui manque est un chemin d'administration pour déclencher
l'octroi sans passer par un achat (aujourd'hui : `rc_webhook`). Voir §9.

### Ce qui n'est JAMAIS donné (§22, contraignant)

Territoire · points · XP · protection ou bouclier · portée de capture · bonus de
fermeture ou de surface · rang ou classement · visibilité supérieure sur la carte ·
notification plus rapide · position d'un rival · annulation d'une perte ·
statistiques d'activité des autres joueurs.

> Le **boost de parrainage** (`REFERRAL_BOOST_MULTIPLIER`, §3.7 des règles gelées)
> n'est **pas** une contrepartie du programme : c'est une règle de jeu ouverte à
> tous les joueurs. Un ambassadeur en bénéficie comme n'importe qui, ni plus ni
> moins. Ne jamais le présenter comme un avantage d'ambassadeur.

### Le point de vigilance réel

Les cosmétiques de fondateur sont aussi **vendus** dans le `founder_pack` (9,99 €).
Les offrir aux ambassadeurs est cohérent (identité, pas pouvoir), mais deux
décisions en découlent, à trancher (§9) : (a) le lot ambassadeur doit-il contenir
un item **exclusif, jamais vendu** — plus fort symboliquement, mais irrattrapable
si le programme est un échec ; (b) que dit-on aux joueurs qui l'ont acheté ? La
réponse honnête, à assumer publiquement : *« ces cosmétiques sont donnés aux
personnes qui ont fait exister le jeu localement ; ils sont aussi achetables. »*

---

## §5 — Engagement attendu

Volontairement bas, et **quantifié** — un engagement flou n'est pas un engagement.

**Par mois :**

1. **Une sortie collective** annoncée à son groupe, courue sur son secteur.
2. **Un retour terrain écrit** — ce qui a cassé, ce qui a plu, ce qui manque.
   Trois lignes suffisent. C'est la contrepartie la plus utile pour GRYD.
3. **Une invitation active** de son groupe (QR affiché en fin de sortie, lien
   partagé). Le QR et le lien existent (`CrewInviteQRScreen`, `/c/[code]`).

**Ce qui n'est PAS demandé** : publier sur les réseaux ; produire du contenu ;
défendre l'app en cas de bug ; recruter au-delà de son propre groupe ; atteindre
un quota de téléchargements.

**Règle anti-shame (contraignante).** Un ambassadeur qui manque un mois n'est
jamais mis en cause publiquement, ni classé, ni comparé aux autres. Aucun
« classement des ambassadeurs » ne sera publié — ni dans l'app, ni ailleurs.
Le suivi est privé et bilatéral. Une relance se formule comme une question
(« est-ce que le programme te convient toujours ? »), jamais comme un rappel à
l'ordre.

---

## §6 — Durée, renouvellement, sortie

**Durée** : une saison — 8 semaines (`SEASON_DURATION_WEEKS`), alignée sur le
cycle de jeu plutôt que sur un calendrier arbitraire.

**Renouvellement** : tacite si les critères de la Porte 2 (§3) restent tenus sur
la saison écoulée. Pas de nouvelle candidature, pas de nouvel entretien.

**Motifs de sortie**, limitativement :

| Motif | Effet | Délai |
|---|---|---|
| Demande de l'ambassadeur | Sortie immédiate, sans justification | Immédiat |
| Inactivité totale sur 2 saisons consécutives | Statut non renouvelé, après un message privé | 16 semaines |
| Triche avérée (GRYD Verify : cohérence pas/distance) | Exclusion du programme + traitement anti-triche normal | Immédiat |
| Harcèlement, contenu haineux, mise en danger d'un membre | Exclusion + modération du compte | Immédiat |
| Demande de rémunération ou tentative de monétiser le statut | Sortie du programme | Après échange |

**Les cosmétiques déjà accordés ne sont pas repris** en cas de sortie ordinaire.
Retirer un badge gagné est une punition rétroactive : ça coûte plus en confiance
que ça ne rapporte en discipline. **Seule exception : la fraude** (triche,
harcèlement), où le compte est de toute façon traité par la modération.

---

## §7 — Comment on mesure que ça marche

**Contrainte de départ, à énoncer clairement : aucun événement existant ne relie
une recrue à un ambassadeur.** `invite_sent` porte `{ channel }` (qr / share /
copy — `CrewInviteQRScreen.tsx`), `invite_accepted` porte `{ via }` (link /
deferred_signup — `c/[code].tsx`, `pendingInvite.ts`). Les deux disent *comment*,
jamais *par qui*. Il n'existe pas de code de parrainage personnel.

### La mesure retenue : l'attribution par CREW, pas par personne

L'ambassadeur est le fondateur de son crew. On mesure donc **son crew**, pas
lui : les données existent déjà (`crews`, membres, `0044_crew_overview`,
`0040_sector_activity`), aucune donnée personnelle nouvelle n'est collectée,
aucun système de parrainage n'est à construire. **À 10-20 ambassadeurs, c'est
suffisant, et un tableur tenu à la main est un outil légitime.**

### Événements utilisés — état réel du câblage

| Événement | Ce qu'il mesure ici | État |
|---|---|---|
| `invite_sent` `{ channel }` | Effort de recrutement de l'ambassadeur | **Câblé** |
| `invite_accepted` `{ via }` | Invitations qui aboutissent | **Câblé** |
| `signup_completed` `{ method }` | Recrues réellement inscrites | **Câblé** |
| `run_complete` `{ distance, duration, source }` | Activation (la seule qui compte) | **Câblé** |
| `claim_result`, `loop_closed` | Première capture = moment d'accroche | **Câblé, serveur** |
| `share_exported` `{ ratio, channel }` | Viralité produite en aval | **Câblé** |
| `crew_created` | Création du crew de l'ambassadeur | **Câblé** |
| `crew_joined` `{ via }` | Rattachement d'une recrue au crew | **NON câblé** — `TODO(O1)` dans `app/(tabs)/crew.tsx:228` et `app/crew-discovery.tsx:129` |

> **`crew_joined` est le maillon manquant de la chaîne d'attribution.** Sans lui,
> on voit des inscriptions et des courses, mais pas leur rattachement au crew de
> l'ambassadeur. C'est le seul travail technique préalable au programme, et il
> est déjà identifié dans le code — pas un chantier nouveau.

### Les 4 indicateurs du programme

| # | Indicateur | Définition | Seuil de réussite proposé |
|---|---|---|---|
| K1 | **Recrues activées** | Comptes rejoignant le crew et terminant ≥ 1 course | ≥ 5 par ambassadeur à J+30 |
| K2 | **Rétention D30 des recrues** | Part des recrues ayant couru dans les 14 derniers jours | ≥ 40 % |
| K3 | **Densité produite** | Coureurs distincts actifs sur le secteur principal du crew, sur 14 jours glissants | ≥ 12 (seuil repris par le sponsoring, cf. doc dédié §1) |
| K4 | **Sorties collectives réelles** | Jours où ≥ 3 membres du crew courent le même secteur | ≥ 2 par mois |

K3 est le seul qui compte vraiment : c'est le seul qui produise du jeu, et le
seul qui rende un quartier vendable à un partenaire local.

### Critère d'arrêt (à fixer avant de commencer, pas après)

Si après **deux saisons** (16 semaines) avec **au moins 5 ambassadeurs actifs**,
la médiane de K1 est < 3 et K3 n'est atteint sur **aucun** secteur, le programme
ne fonctionne pas et doit être arrêté ou refondu. Écrire ce critère à l'avance
est la seule protection contre un programme qu'on maintient par attachement.

---

## §8 — Budget

### Le principe

**L'application est gratuite et ne génère aucun revenu.** Un programme
d'ambassadeurs qui coûte de l'argent avant d'avoir des utilisateurs est un piège :
il transforme une incertitude produit en dépense certaine. La version amorçable
ci-dessous est donc dimensionnée à **coût monétaire quasi nul**, par construction
et non par pingrerie.

### Version amorçable — 10 ambassadeurs, 2 saisons

| Poste | Coût réel | Pourquoi |
|---|---|---|
| Cosmétiques offerts | **0 €** | Bits. Coût marginal nul, aucune perte de revenu tant qu'il n'y a pas de base acheteuse |
| Accès anticipé TestFlight | **0 €** | Compris dans le compte développeur déjà payé ; large marge de testeurs externes |
| Octroi des contreparties | **0 €** | `feature_entitlements` source `promo` / `admin` (0026) — infrastructure existante |
| Suivi et animation | **0 €** dépensé, **~5 h/mois** de fondateur | 10 ambassadeurs × ~30 min/mois. C'est le vrai coût, et il est en temps |
| Recrutement initial | **0 €** dépensé, **~6 h** en une fois | ~20 entretiens de 15 min pour retenir 10 |
| Rencontres terrain (café, transport) | **≤ 50 €/mois**, optionnel | Plafond dur. Aller courir avec un club vaut plus que n'importe quelle campagne |
| **Total monétaire** | **0 à 100 € par saison** | |

**Le poste dominant est le temps du fondateur, pas l'argent.** C'est aussi la
vraie limite de scalabilité : au-delà de ~15 ambassadeurs, le suivi individuel ne
tient plus. **Mieux vaut 10 ambassadeurs suivis que 40 abandonnés** — 40
ambassadeurs inactifs, c'est 40 personnes qui racontent que GRYD les a lâchés.

### Ce qui est explicitement refusé à ce stade

Rémunération ou défraiement forfaitaire · commission au recrutement · dotation
matérielle (textile, chaussures) · achat de contenu ou de publication · lots
financés par GRYD (les lots viennent des **sponsors**, cf. doc dédié) ·
production graphique payante.

### Quand le programme peut commencer à coûter

Une seule condition, et elle est vérifiable : **quand K3 (densité) est atteint sur
au moins un secteur et qu'un partenaire local a payé un défi sponsorisé.** Le
sponsoring territorial finance alors les lots et les rencontres. Tant que cette
condition n'est pas remplie, tout euro dépensé ici est une avance sur un revenu
qui n'existe pas.

---

## §9 — Ce que le fondateur doit décider ou faire lui-même

**Décisions (rien n'est appliqué sans réponse) :**

1. **Lot ambassadeur exclusif ou pack fondateur existant ?** (§4) — un item jamais
   vendu est plus fort, mais irréversible.
2. **Seuils des Portes 1 et 2** (§3) — proposés, pas gravés. Les valider ou les
   corriger avant le premier entretien.
3. **Nombre d'ambassadeurs de la première vague** — la recommandation est 8 à 10,
   pas plus, pour rester sous la limite de suivi (§8).
4. **Villes** — Saison 0 est Paris + Lille. Confirmer ou restreindre à une seule
   ville pour concentrer la densité (recommandé : **une seule**, K3 étant un seuil
   local, pas un total).
5. **Critère d'arrêt** (§7) — l'accepter formellement maintenant, pendant qu'il
   n'engage encore personne.

**Actions qui ne peuvent être faites que par lui :**

6. **Identifier et contacter** les candidats P1/P2/P3. Aucun agent ne peut le
   faire : cela suppose des relations réelles et un jugement humain.
7. **Mener les entretiens** de 15 minutes.
8. **Rédiger le message d'invitation** au programme — il engage sa parole, pas
   celle du produit.

**Préalables techniques (petits, déjà identifiés) :**

9. **Câbler `crew_joined`** — `TODO(O1)`, `app/(tabs)/crew.tsx:228` et
   `app/crew-discovery.tsx:129`. Sans lui, aucun indicateur du §7 n'est mesurable.
10. **Ouvrir un chemin d'octroi hors achat** pour `feature_entitlements`
    (source `promo`/`admin`) et `grant_user_items` — aujourd'hui, tout passe par
    `rc_webhook`.

**Rappel de dépendance** : le contrat Apple « Paid Applications » n'est pas signé
(A-45 §1). Il ne bloque pas ce programme (rien n'y est payant), mais il bloque
tout achat intégré — donc toute mesure de conversion.
