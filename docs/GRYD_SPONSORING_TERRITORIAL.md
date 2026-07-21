# GRYD — Sponsoring territorial

**Origine** : AMENDEMENT-45 §4 — le produit à **~99 % de marge**, seul canal qui
dépasse réellement la cible de 90 % et qui soit scalable.

**Contexte de décision (fondateur, 21/07/2026)** : l'application est **gratuite**,
monétisée uniquement par achats intégrés. Le sponsoring territorial est donc le
**seul revenu B2B** du modèle : un partenaire local paie, **aucun joueur ne paie
et aucun joueur ne reçoit d'avantage**. Facturation directe, aucune commission de
plateforme.

Ce document remplace, pour la partie **locale et opérationnelle**, les intentions
de `docs/product/GRYD_sponsors_partners.md` (qui reste valable pour la vision
marques nationales, §2 et §7 de ce document).

---

## §1 — Le prérequis honnête, avant tout le reste

**Ce produit ne se vend pas avant d'avoir de la densité réelle sur un quartier.**
C'est écrit dans l'A-45 §4 et ce n'est pas une précaution de style.

Ce qu'un commerçant achète, ce n'est ni une application ni une audience : c'est
**des coureurs qui passent devant sa porte, de façon répétée, et qui le savent**.
Vendre un défi sur un secteur où courent trois personnes, c'est vendre du vide —
et le vendre une fois suffit à ne plus jamais pouvoir revendre dans le quartier.

### Le seuil, défini avant la première vente

| Condition | Seuil proposé | Pourquoi |
|---|---|---|
| Coureurs distincts actifs sur le secteur | **≥ 12 sur 14 jours glissants** | En dessous, le défi n'a pas assez de participants pour que le partenaire voie quoi que ce soit |
| Récurrence | **≥ 3 des 12 ont couru ≥ 3 fois** dans la période | Distingue un noyau d'un accident |
| Antériorité | **≥ 4 semaines** d'activité continue sur le secteur | Évite de vendre sur un pic ponctuel |
| Contestation | Au moins **quelques zones changent de main** | Un secteur figé ne produit pas de retours |

C'est le même seuil que **K3** du programme ambassadeur
(`GRYD_PROGRAMME_AMBASSADEUR.md` §7) : les deux documents décrivent la même
chose vue des deux bouts — l'ambassadeur produit la densité, le sponsoring
l'encaisse.

### Ce que le code sait mesurer aujourd'hui — et ce qu'il ne sait pas

`sector_activity` (migration 0040) fournit `zones_lost_recent`,
`rival_reclaimed_24h`, `last_attack_at`, `decay_fraction`. C'est de l'activité de
**claims**, pas du **nombre de coureurs distincts**. Le seuil ci-dessus n'est
donc **pas calculable en l'état** : les ingrédients existent (`hex_claims`,
`sector_id`, `claimed_at`, propriétaire), l'agrégat « coureurs distincts par
secteur sur 14 j » n'existe pas. C'est un petit travail, à faire **avant** le
premier rendez-vous commercial, pas après (§9).

Ces seuils sont des **paramètres commerciaux**, pas des règles de jeu : ils n'ont
rien à faire dans `packages/shared/src/game-rules.ts` tant qu'aucun code
applicatif ne les lit. Si un écran ou un calcul devait un jour les consommer,
ils devraient y migrer comme toute constante (CLAUDE.md, « aucun nombre magique »).

---

## §2 — Ce que le partenaire achète EXACTEMENT

Trois choses. Pas quatre. La liste est fermée, et elle doit figurer telle quelle
dans le contrat.

### 2.1 — Un défi financé, sur un secteur réel

Un objectif collectif, borné dans le temps, portant sur un **secteur qui existe
déjà dans le jeu** (`sectors`, migration 0033 — pas un périmètre dessiné pour le
partenaire).

Exemple : *« 50 km cette semaine sur le secteur République »*.

Contraintes :
- Le défi porte sur une **métrique de course** (distance, régularité, nombre de
  sorties), jamais sur un résultat territorial (« capturer telle zone »).
- La participation est **libre et gratuite**. Aucune inscription, aucun achat.
- Le défi **ne modifie aucune règle** : mêmes points, même decay, même portée,
  même calcul de capture pour tout le monde, participants ou non.
- Le secteur est choisi parmi ceux qui **remplissent le §1**. Un partenaire ne
  peut pas acheter un secteur mort au motif qu'il y a sa boutique.

### 2.2 — Une récompense cosmétique

Ce que gagnent les participants : un **badge**, un **skin de trace**, un
**template de partage** — c'est-à-dire de l'identité. Et, hors du jeu, ce que le
partenaire offre de son côté : bon d'achat, dossard, lot physique.

Contraintes :
- Rien de ce qui est gagné n'a d'effet en jeu. Aucun objet fonctionnel
  (bouclier, gel de série, ping) ne peut être une récompense sponsorisée.
- Une dotation physique implique un **règlement écrit**, une participation
  gratuite et sans obligation d'achat (§4).
- Le partenaire finance ; **il ne conçoit pas la récompense en jeu** — la
  cohérence de la charte et du catalogue reste à GRYD.

### 2.3 — Une présence de marque étiquetée

Sur le défi qu'il paie, et nulle part ailleurs :
- son **nom** commercial,
- un **blason discret** (icône filaire des tokens `@klaim/shared`, jamais un
  logo importé — cf. `ChallengeSponsor.blason`),
- une mention **« Offert par … »**,
- un **étiquetage « sponsorisé »** explicite (§4).

La présence s'arrête à la carte du défi. **Pas sur la carte du jeu, pas sur
l'écran d'accueil, pas dans les notifications, pas au démarrage.**

---

## §3 — Ce qu'il n'achète JAMAIS

Reprise directe de la doctrine §22 (A-43 §4), appliquée au sponsor.

| Jamais vendu | Pourquoi |
|---|---|
| **Du territoire** — une zone, un secteur, une « zone de marque » | La carte appartient aux coureurs. Une zone donnée est une zone volée à quelqu'un |
| **Des points, de l'XP, un multiplicateur** | Anti-pay-to-win strict |
| **Un rang, un classement, une position** | Idem |
| **De la visibilité de joueur** — mettre en avant un crew, un runner | Fausse le jeu social |
| **La position d'un rival**, une heatmap d'activité, un flux temps réel | Information tactique. Interdit à l'achat sous toute forme (A-45 §2, C1) |
| **Une notification plus rapide** ou prioritaire | Avantage compétitif déguisé |
| **De la visibilité supérieure sur la carte partagée** | §22, et surface de modération non maîtrisée |
| **Des traces individuelles, des données de santé, une adresse, une zone privée, un comportement identifiable** | RGPD + doctrine `GRYD_sponsors_partners.md` §5. Non négociable, y compris anonymisé « à la demande » |
| **Un parcours imposé passant par son local** | Sécurité. On ne dirige pas des coureurs vers une porte |

**Ce qui peut être communiqué au partenaire** : des **agrégats anonymisés** —
nombre de participants au défi, kilomètres cumulés, nombre de sorties, taux de
complétion. Jamais un individu, jamais une trace, jamais un horaire.

> **La règle qui résume tout : le sponsor achète de l'ATTENTION sur un défi
> qu'il finance. Il n'achète aucun POUVOIR dans le jeu, et aucune INFORMATION
> sur une personne.**

---

## §4 — Étiquetage publicitaire : l'obligation légale

Un défi financé par un commerçant **est une publicité**. Le droit français et
européen impose qu'elle soit **identifiable comme telle, sans ambiguïté, par le
destinataire** — c'est le principe général de la publicité identifiable (LCEN
pour la communication par voie électronique ; interdiction des pratiques
commerciales trompeuses, code de la consommation ; obligations de transparence
publicitaire du règlement européen sur les services numériques).

**Ce que ça impose concrètement :**

1. **Le mot doit être là.** Une mention explicite « Sponsorisé » ou « Contenu
   sponsorisé » sur la carte du défi ET sur son écran de détail. « Offert par X »
   seul ne suffit pas : ça nomme l'annonceur sans qualifier la nature commerciale.
2. **Visible sans interaction.** L'étiquette ne se découvre pas au tap, ne se
   cache pas derrière un « … », n'est pas en gris clair sur fond noir. Elle
   respecte les mêmes planchers de contraste et de lisibilité que le reste
   (§A, `GRYD_REGLES_NON_NEGOCIABLES.md`).
3. **Jamais déguisé en contenu de jeu.** Un défi sponsorisé ne doit pas pouvoir
   être confondu avec un défi officiel GRYD. C'est explicitement ce que l'A-45 §4
   exige : « jamais déguisé en contenu de jeu ».
4. **Dotation = jeu-concours.** Dès qu'il y a un lot, il faut un **règlement
   accessible** : organisateur, dates, conditions de participation, nature des
   lots, modalités d'attribution, gratuité et absence d'obligation d'achat.
   Ce règlement est de la responsabilité de **l'annonceur**, pas de GRYD — à
   écrire dans le contrat (§8).
5. **Apple.** Un lot ou service consommé dans le monde physique (dossard, bon
   d'achat, événement) ne relève pas de l'achat intégré. En revanche, **rien de
   ce qui est débloqué dans l'app ne peut être vendu au joueur par ce canal** —
   et ici, rien n'est vendu au joueur, ce qui referme la question.
6. **Mineurs.** Si des mineurs peuvent participer, la publicité et la dotation
   sont soumises à des règles plus strictes. Point à trancher avec l'âge minimum
   des CGU (§9).

> **À faire valider par un juriste** avant la première signature, au même titre
> que les points listés dans `GRYD_LEGAL_A_COMPLETER.md` §« Points à faire
> valider ». Ce document décrit l'intention de conformité ; il ne constitue pas
> un avis juridique.

---

## §5 — Format opérationnel minimal

### Ce qui existe déjà (en démo)

L'ossature d'affichage est **déjà construite** (AMENDEMENT-32 §3) :

- `ChallengeSponsor` — `apps/mobile/src/features/motivation/demo.ts` : `name`,
  `blason` (icône token, jamais un logo importé), `prizeNote`.
- Rendu du bloc sponsor — `apps/mobile/app/challenges/[id].tsx:112-126` :
  blason discret + nom + note de lot + garde-fou anti-P2W.
- Textes i18n 5 langues — `apps/mobile/src/i18n/catalog/motivation.ts` :
  `sponsorLine`, `sponsorGuard` (« Participation libre et gratuite. Le sponsor
  ne donne ni territoire, ni points, ni victoire — seulement des lots. »).
- Progression — `challenge_progress` (migration 0012).

**C'est de la démo** (`sponsor_store_50k`, « Magasin Pas de Côté »). Aucun
sponsor réel n'existe, et la règle « l'app ne ment jamais » impose que cette
carte de démonstration **disparaisse ou soit remplacée par un vrai partenaire**
avant toute mise en avant publique.

### Cycle de vie d'un défi sponsorisé

| Étape | Ce qui se passe | Où |
|---|---|---|
| **1. Création** | Le défi est créé côté serveur : secteur, métrique, cible, dates, sponsor, récompense. **Jamais par le client.** | Back-office / service-role — **à construire** |
| **2. Éligibilité** | Le secteur est vérifié contre le seuil de densité (§1). Sous le seuil : refus | **À construire** |
| **3. Publication** | Le défi apparaît dans la liste des challenges, **étiqueté « Sponsorisé »**, avec blason + « Offert par … » + garde-fou | Existe (démo) — étiquette à ajouter |
| **4. Participation** | Automatique : courir sur le secteur fait progresser la jauge. Aucune inscription, aucun opt-in, aucune donnée transmise au sponsor | `challenge_progress` (0012) |
| **5. Progression** | Jauge collective. **Aucun classement individuel exposé au sponsor** | Existe |
| **6. Fin** | À la date de fin : jauge figée, résultat affiché (atteint ou non — sans culpabiliser, règle anti-shame), récompense cosmétique attribuée aux participants éligibles côté **serveur** | Attribution — **à construire** |
| **7. Lots physiques** | Remis par l'annonceur selon son règlement. GRYD ne manipule ni lot, ni coordonnée | Hors app |
| **8. Bilan** | Agrégats anonymisés transmis au partenaire (§3) | **À construire** |
| **9. Archivage** | Le défi quitte la liste. Le badge gagné reste. **Le nom du sponsor ne reste sur aucune carte partagée** | — |

### Trois règles de forme, contraignantes

- **Un seul défi sponsorisé visible à la fois** par joueur. Le jour où la liste
  en contient trois, GRYD est devenu un support publicitaire.
- **Aucun défi sponsorisé avant la première capture** du joueur — même logique
  que « pas de paywall avant la première capture » (A-43 §5).
- **Le défi sponsorisé est un défi comme les autres**, moins les avantages : même
  gabarit de carte, même hiérarchie visuelle, un seul CTA chartreuse dans
  l'écran, pas de card-in-card (§A).

---

## §6 — État réel : ce qui existe, ce qui manque

| Brique | État |
|---|---|
| Affichage sponsor sur un défi (blason, « Offert par », garde-fou) | **Existe**, en démo |
| Textes 5 langues du bloc sponsor | **Existe** |
| Système de défis + progression (`challenge_progress`, 0012) | **Existe** |
| Secteurs réels (`sectors`, 0033) et activité (`sector_activity`, 0040) | **Existe** |
| Étiquette « Sponsorisé » explicite | **Manque** — obligation légale (§4) |
| Mesure « coureurs distincts par secteur / 14 j » | **Manque** — bloque la qualification (§1) |
| Table + back-office des défis sponsorisés | **Manque** |
| Attribution serveur des récompenses de défi | **Manque** |
| Rapport agrégé anonymisé au partenaire | **Manque** |
| Contrat type, règlement de jeu-concours | **Manque** — fondateur + juriste |

**Rien de tout cela n'est à construire maintenant.** La séquence honnête est :
densité d'abord (programme ambassadeur), qualification ensuite, construction
seulement quand un partenaire réel est identifié. Construire un back-office
sponsor avant d'avoir un sponsor serait exactement l'erreur que l'A-44 §1
reproche à l'audit : investir sur un revenu supposé.

---

## §7 — Prix et marge

**La marge est structurellement de ~99 %** (A-45 §1) : facturation directe, aucune
commission de store, aucun coût variable — le coût marginal d'un défi
supplémentaire est proche de zéro une fois l'outillage écrit. Le coût réel est le
**temps de vente et de suivi** du fondateur.

**Le grille tarifaire existante est prématurée.** `GRYD_sponsors_partners.md` §6
propose « Starter Local 500-1 500 € ». Ces montants ont été écrits avant tout
utilisateur : **un secteur avec 12 coureurs actifs ne vaut pas 500 €**, et
demander ce prix au premier commerçant, c'est n'obtenir aucun premier client —
donc aucune référence, donc aucun deuxième client.

**Base de prix défendable** : le prix se dérive de la **densité constatée**, et
il s'annonce avec le chiffre. « 34 coureurs distincts sont passés sur votre
secteur ces 14 derniers jours » est un argument vérifiable ; « visibilité
premium » n'en est pas un.

Recommandation opérationnelle : **le premier défi sponsorisé se vend très bas,
voire se donne**, contre deux choses qui valent plus que la facture — le droit
de citer le partenaire comme référence, et un retour écrit sur ce que
l'opération lui a réellement apporté. La grille de `GRYD_sponsors_partners.md` §6
reste la cible pour les marques nationales (Saison 2), pas pour le premier
commerçant de quartier.

**Ce qui ne peut pas encore être facturé, et qu'il ne faut pas promettre** :
un nombre de participants garanti · un nombre d'impressions · un taux de
conversion en visites en boutique · un ciblage · des données individuelles.
Aucun de ces engagements n'est tenable aujourd'hui, et un engagement non tenu sur
le premier contrat coûte le marché local entier.

---

## §8 — Le premier contrat : ce qu'il doit dire

Sept points, en une page. Un contrat plus long qu'une page pour 300 € est un
contrat qui ne se signe pas.

1. **Objet** : le financement d'un défi de course sur un secteur nommé, pour une
   durée nommée. Rien d'autre.
2. **Ce qui est fourni** : les trois éléments du §2, listés explicitement.
3. **Ce qui n'est pas fourni** : la liste du §3, listée explicitement. C'est le
   paragraphe le plus important — il protège le jeu **et** le partenaire, qui
   saura à quoi s'en tenir plutôt que de le découvrir en cours de route.
4. **Étiquetage publicitaire** : GRYD s'engage à afficher la mention
   « Sponsorisé ». Le partenaire l'accepte et ne peut demander son retrait.
5. **Dotation** : nature des lots, **règlement à la charge de l'annonceur**,
   participation gratuite et sans obligation d'achat, remise des lots par
   l'annonceur.
6. **Données** : GRYD ne transmet que des agrégats anonymisés, limitativement
   énumérés. Aucune donnée personnelle, sous aucune forme, y compris sur demande.
7. **Sortie** : durée ferme, pas de tacite reconduction, résiliation possible par
   GRYD si le défi crée un risque de sécurité ou un manquement à l'étiquetage.

---

## §9 — Ce que le fondateur doit décider ou faire lui-même

**Décisions :**

1. **Le seuil de densité** (§1) — valider 12 coureurs distincts / 14 j, ou le
   corriger. C'est le chiffre qui autorise ou interdit la première vente.
2. **La règle « un seul défi sponsorisé à la fois »** (§5) — l'accepter maintenant,
   pendant qu'elle ne coûte rien, plutôt qu'au moment où deux partenaires payent.
3. **Prix du premier contrat** (§7) — bas, gratuit contre référence, ou grille
   existante. Recommandation : bas.
4. **Sort de la carte de démo `sponsor_store_50k`** — la retirer, ou la garder en
   attendant un vrai partenaire. La règle « l'app ne ment jamais » penche pour le
   retrait dès qu'un utilisateur réel peut la voir.
5. **Âge minimum** des participants à un défi doté (§4.6), cohérent avec les CGU.

**Actions qui ne peuvent être faites que par lui :**

6. **Identifier le premier partenaire** — un commerçant du secteur le plus dense,
   choisi parce que ses clients y courent déjà, pas parce qu'il a un budget.
7. **Faire valider par un juriste** l'étiquetage, le règlement de jeu-concours et
   le contrat type (§4, §8) — à ajouter à la liste de `GRYD_LEGAL_A_COMPLETER.md`.
8. **Adhérer à un médiateur de la consommation** (déjà listé dans
   `GRYD_LEGAL_A_COMPLETER.md`) — préalable B2C indépendant de ce document, mais
   qui deviendra visible dès qu'un lot sera distribué.

**Préalables techniques, dans l'ordre :**

9. **Agrégat « coureurs distincts par secteur / 14 j »** — sans lui, §1 est
   invérifiable et aucune vente n'est légitime.
10. **Étiquette « Sponsorisé »** dans le bloc sponsor — obligation légale, petit
    travail (composant + `Entry` ×5 langues).
11. Le reste (table, back-office, attribution serveur, rapport) **seulement quand
    un partenaire réel existe**.

> **Rappel de séquence, contre la tentation** : ce produit a la meilleure marge du
> modèle, ce qui le rend attirant à construire en premier. C'est l'inverse qu'il
> faut faire. La densité précède la vente ; le programme ambassadeur précède le
> sponsoring.
