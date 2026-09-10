# GRYD pour les marques : benchmark, produit et préparation

**Date : 11/09/2026 · Lot M (marques) · Écrit pour le fondateur.**

**Statut : PRÉPARATION SEULE.** Aucune ligne de code, aucune migration, aucun écran, aucune marque partenaire,
aucun nom de marque dans le code. Ce document ne décide rien : il constate, il propose, et il laisse les
décisions à `docs/DECISIONS.md`.

Rang 0 applicable : `docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`, §13 (crews), §14.1 (budget de
sollicitations), §15.2 (croissance), §15.6 (sponsors), §16 (prix et frontière gratuit/payant), §7.5
(catalogue). ADR opposables : ADR-011, ADR-012, ADR-014, ADR-015. `CLAUDE.md` : anti-pay-to-win, règle 10.

---

## 0. La réponse courte, en un tableau

| Ce que demande le fondateur | Verdict | Ce qui le remplace, sans rien perdre |
|---|---|---|
| Crews de marque avec badge vérifié | **Possible** | Un crew de marque est un **canal suivi**, pas une équipe classée (§2.1). |
| Abonnement premium pour les marques | **Possible** | Vente B2B hors App Store, facturée, jamais un achat intégré (§3). |
| Chaussures virtuelles **achetées** qui rapportent des points | **INTERDIT tel quel** | Le même objet, **gagné** en courant, purement cosmétique (§2.4). |
| Un bonus de points financé par une marque | **Possible, sous six verrous** | Le sponsor paie le bonus **pour tout le monde**, jamais pour un acheteur (§2.5). |
| Un quartier aux couleurs d'une marque | **Possible, borné dans le temps** | Teinte d'affichage datée, jamais une possession (§2.8). |
| Gagner une vraie paire de chaussures | **Possible, encadré** | Loterie publicitaire, règlement en application (§3.5). |

La phrase qui tient tout le document : **on ne vend jamais un avantage à un joueur, on vend une visibilité à
une marque.** Le joueur paie en kilomètres, la marque paie en euros, et les deux monnaies ne se croisent jamais.

---

## 1. Benchmark

### 1.1 Méthode, et ce qu'elle ne prouve pas

Recherche web menée le 11/09/2026, sources citées au bas du document. Deux limites. Une page commerciale décrit
ce qu'un éditeur **vend**, pas ce qu'il **livre** : portées et taux de reconnaissance sont des déclarations
d'annonceur. Et un tarif relayé par un tiers n'est pas une grille officielle.

### 1.2 Le tableau principal

| Produit | Ce qu'obtient la marque | Ce qu'elle paie | Ce que vit le joueur | Transposable | Non transposable, et pourquoi |
|---|---|---|---|---|---|
| **Strava, défis sponsorisés** | Défi à son nom, placement en galerie, notification de participation dans le fil des abonnés, ciblage sport, genre, âge, géographie jusqu'à la ville | À partir d'environ 20 000 $ selon une source, 30 000 $ selon une autre ; prix fonction de la portée, de la saison et de la durée | Il rejoint un défi, court, récupère une remise ou un lot sur une page externe de la marque | **Oui** : le défi daté à périmètre géographique, la récompense livrée par la marque, la mesure agrégée | Le volume. Strava annonce des dizaines de millions d'athlètes. Une grille calquée sur la sienne vendrait du vide en Saison 0. |
| **Strava, clubs et badge vérifié** | Page de club, badge de vérification, communauté organique | Rien pour le club, la vérification est un dossier | Il suit un club, voit ses sorties et ses publications | **Oui** : le badge vérifié comme dossier humain, jamais comme achat | Les critères Strava (100 membres, 1 publication par semaine) supposent une antériorité qu'une marque qui arrive n'a pas. |
| **Strava, règles publicitaires** | Reporting agrégé : impressions, participations, complétions | Inclus | Rien de visible | **Oui, intégralement** : ni cookie tiers, ni pixel, ni achat programmatique, ni reciblage, aucune donnée personnelle transmise | Rien. C'est le modèle à copier. |
| **Nike Run Club, adidas Running** | La marque **est** l'application : défis, jalons, programmes, campagnes maison | Le coût de son propre produit | Il court dans un univers de marque assumé | Le défi collectif à cause commune (adidas, Run For The Oceans) | Le modèle entier. GRYD n'est la marque de personne. Une application mono-marque n'a pas d'anti-pay-to-win à tenir, GRYD si. |
| **Zwift, équipement virtuel** | Ses vélos et ses roues existent en jeu, avec notes d'aérodynamisme et de poids | Partenariat produit | Il choisit un matériel qui **change sa vitesse en jeu** | **Rien** | Contre-exemple central, §1.3. |
| **Pokémon Go et Niantic** | Ses magasins deviennent des points d'intérêt du jeu, mesurés à la visite | Coût par visite, jusqu'à environ 0,50 $ par visiteur unique et par jour | Il se déplace, il reçoit quelque chose sur place | **Oui, l'idée** : la marque paie la **présence réelle validée**, pas l'impression | Le ciblage par lieu de vie. §15.6 interdit d'utiliser la localisation pour le ciblage. GRYD ne rend qu'un compte agrégé. |
| **Fortnite et Roblox** | Skins, îles de marque, événements ; 88 % des activations de marque sur ces deux plateformes selon le rapport GEEIQ 2026 | Production lourde côté Fortnite, construction communautaire continue et moins chère côté Roblox | Il achète un skin (environ 1 500 à 2 000 V-Bucks, soit 17 à 22 $) ou visite une île | **Oui** : l'objet de marque désirable et cosmétique, et la tâche jouée récompensée par un objet réel | La **vente** du skin au joueur. Chez GRYD un objet de marque ne se vend pas, il se gagne. |
| **Runna** | Ambassadeurs, affiliation, parrainage (deux semaines d'essai offertes) | Commission d'affiliation | Il parraine, il obtient un **essai**, pas un avantage de jeu | **Oui** : la récompense de parrainage est commerciale, jamais ludique. Conforme à §15.2. | Rien à écarter, le format est déjà compatible. |
| **Garmin Connect, komoot** | Défis mensuels à badges, collections d'itinéraires | Produits maison | Il s'inscrit à un défi et gagne un badge | Le badge de défi daté comme récompense non marchande | Aucun badge vendu à une marque trouvé dans les sources consultées. À ne pas présenter comme un précédent. |
| **Peloton** | Partenariat de contenu lululemon sur cinq ans, accessoires de marque en studio, week-end membres les 12 et 13/06/2026 | Accord commercial de long terme | Il voit la marque **dans** le contenu qu'il aime | **Oui** : la marque dans l'expérience plutôt qu'à côté | Le refus de la publicité classique est aussi un enseignement : le PDG l'a écartée aux résultats du deuxième trimestre 2026. |

### 1.3 Le contre-exemple à nommer : Zwift

Chez Zwift, le matériel virtuel de marque **a un effet de jeu**. Chaque cadre et chaque roue du Drop Shop porte
une note d'aérodynamisme et une note de poids : un ensemble léger grimpe plus vite, un ensemble profilé va plus
vite à haute vitesse. Environ 60 roues au catalogue, dont quatre Shimano DURA-ACE ajoutées en août 2026 avec la
version 1.120. Deux nuances : le matériel se débloque avec des Drops gagnés en roulant, pas avec de l'argent (de
mémoire, à vérifier), mais Zwift est un abonnement, donc toute la mécanique est derrière un paiement.

**Pourquoi GRYD ne peut pas le copier.** Chez Zwift, l'adversaire est une courbe de puissance dans un monde
fermé. Chez GRYD, c'est un voisin, sur une vraie rue, et le territoire est unique. Un objet qui change la
performance ferait de la carte d'une ville le résultat d'un catalogue. §16.2 le dit déjà : « Capture, reprise,
défis et chances de victoire : strictement identiques ».

### 1.4 Ce que le benchmark enseigne, en cinq lignes

1. Le format qui marche est le **défi daté**, pas la bannière. Strava, Garmin et Roblox convergent.
2. La récompense efficace est **réelle** (remise, lot, produit), et elle est livrée **par la marque**.
3. Les plateformes sérieuses ne vendent **aucune donnée personnelle** et refusent le reciblage.
4. L'objet de marque désirable est **cosmétique** partout, sauf chez Zwift, seul sans territoire à protéger.
5. Ce que la marque achète vraiment, c'est une **présence dans un moment que le joueur aime**.

---

## 2. Le produit « GRYD pour les marques »

### 2.1 Le crew de marque est un canal, pas une équipe classée

C'est la décision structurante, et elle vient d'une contrainte, pas d'une préférence. §13.1 : « une personne
représente un seul crew actif par sport pour la carte regroupée et la saison ». Si un crew de marque était
classé, rejoindre la marque **coûterait** au joueur son club de quartier, et une marque à budget viderait les
crews locaux. Le classement d'une ville cesserait de dire quelque chose.

**Proposition.** Un crew de marque est un **canal** : on le suit, on ne le rejoint pas. Il a une page, une
identité, des annonces, des sorties, des défis. Il n'a ni classement, ni saison, ni territoire, ni contribution.
Le suivre ne consomme pas l'unique adhésion active du joueur et n'apporte aucun point.

| Attribut | Crew de communauté | Crew de marque |
|---|---|---|
| Adhésion | Membre, une seule active par sport | Abonné, sans limite, sans effet |
| Classement de saison | Oui | **Non** |
| Défi classé cinq contre cinq | Oui | **Non** |
| Territoire | Oui | **Non** |
| Badge vérifié | Non | **Oui**, après revue de modération, jamais à l'achat |
| Membres | Bornes du cahier | Abonnés illimités |
| Modération | Capitaine et modérateurs | La marque modère son canal, **GRYD garde le dernier mot** |

§13.3 dit « la modération et la sécurité ne sont jamais un avantage payant ». Une marque peut masquer un message
sur son canal. Elle ne peut ni bloquer un compte, ni faire retirer un signalement, ni voir qui a signalé.

### 2.2 Le défi de marque

**Périmètre.** Une commune, un ensemble de quartiers, ou un secteur déjà tracé par la géographie réelle
(migration `0151`). Un sport. Une période datée, de un jour à quatre semaines.

**Objectif.** Exprimé dans le vocabulaire du jeu : fermer une boucle dans le périmètre, cumuler une distance,
revenir trois jours différents. Le calcul reste celui du moteur, et aucun défi de marque ne crée sa propre règle.

**Récompense, deux étages dont un seul est garanti.** Garanti pour tous les finissants : un objet cosmétique de
marque (§2.4), gratuit, gagné. Aléatoire : un lot réel tiré au sort parmi les finissants, encadré au §3.5.

**Ce qu'un défi de marque ne fait jamais.** Il ne donne pas de territoire, pas de points de classement, ne
modifie pas le calcul de capture, et n'apparaît comme une obligation pour personne.

### 2.3 La sortie de marque

Un rendez-vous réel publié par le canal : départ, horaire, allure annoncée, liste d'inscrits. C'est l'objet
« sortie de groupe » du §13.2, avec un organisateur différent.

Deux règles. La marque ne voit **jamais** la liste nominative des inscrits : elle voit un nombre. Et une sortie
de marque suit le budget du §14.1 : trois messages non transactionnels par semaine au total, offres au plus deux
par mois, consentement promotionnel désactivé par défaut.

### 2.4 Les objets cosmétiques de marque

Un objet de marque est un cosmétique, et rien d'autre. Il se **gagne**. Il ne se **vend** pas.

| Emplacement | Ce que la marque peut y mettre | Effet de jeu |
|---|---|---|
| Avatar et pin de carte | Une paire de chaussures, un maillot, un motif | Aucun |
| Tracé de la sortie | Une couleur ou un motif de trait | Aucun |
| Carte de partage | Une composition co-brandée, choisie par le joueur | Aucun |
| Écran de résultat | Une signature discrète, sur la sortie concernée | Aucun |
| Collection | Une ligne datée, conservée après la campagne | Aucun |

**L'exemple du fondateur, corrigé.** Une paire de chaussures d'une marque connue, portée par l'avatar et visible
sur le pin de carte. Le joueur ne l'achète pas : il ferme trois boucles dans son quartier pendant la quinzaine du
défi, et il l'a. Elle ne rapporte aucun point. Elle reste dans sa collection après la campagne, comme les objets
de saison du §16.3 (« tous les objets gagnés gratuitement restent acquis »). Aucune marque n'est partenaire, et
aucun nom de marque n'entre dans le code sans contrat signé.

**Pourquoi c'est plus fort que l'achat.** Un skin acheté dit « j'ai payé ». Un objet gagné dit « j'y étais, et
j'ai couru ». La deuxième phrase se partage. La première non.

### 2.5 Le bonus payé par une marque, et ses six verrous

Le fondateur veut qu'une marque puisse offrir des points bonus. C'est tenable à une seule condition : **personne
ne peut l'acheter, et tout le monde l'a**. Le modèle est le week-end à double XP offert par un sponsor. La marque
paie la fenêtre, la fenêtre s'ouvre pour tous les comptes du périmètre. Ni code, ni achat, ni adhésion, ni
parrainage. Personne ne gagne **contre** quelqu'un : c'est ce qui le distingue du pay-to-win. Les six verrous, à
graver dans la migration le jour venu.

1. **Non rival.** Tous les comptes éligibles du périmètre l'ont. Aucun achat, aucun code, aucune adhésion au
   canal ne le conditionne, sinon l'attention devient une monnaie de jeu.
2. **Non classant.** Ni territoire, ni capture, ni score de défi classé, ni classement. Seule cible autorisée :
   l'XP de progression et de saison, déjà généreuse et rattrapable.
3. **Annoncé avant.** Période et périmètre publiés avant l'ouverture, jamais rétroactifs, jamais prolongés sans
   annonce. §16.1 interdit déjà l'urgence fictive.
4. **Journalisé.** Chaque octroi porte l'identifiant du sponsor et de la fenêtre. Le calcul de saison reste
   rejouable sans le bonus, sinon plus personne ne peut auditer une saison.
5. **Plafonné.** Au plus une fenêtre par saison et par ville, et **jamais** pendant une semaine de défi classé :
   un multiplicateur pendant un cinq contre cinq déplacerait la ligne d'arrivée.
6. **Réversible sans dette.** Sponsor qui se retire : la fenêtre est annulée **avant** sa date, jamais après.
   Rien n'est jamais repris à un joueur.

Si un seul verrou saute, la mécanique redevient du pay-to-win indirect et doit être abandonnée entière. Ce n'est
pas un paramètre : c'est sa condition d'existence.

### 2.6 La visibilité : ce qui est permis, ce qui ne l'est pas

| Permis | Interdit |
|---|---|
| Une carte de défi dans la liste, marquée « Sponsorisé par » | Une bannière permanente sur la carte |
| Une page de canal que l'on ouvre exprès | Un interstitiel avant une course |
| Une teinte de quartier datée (§2.8) | Une pastille rouge permanente |
| Une annonce dans le budget du §14.1 | Un décompte d'urgence ou un faux stock |
| Un modèle de partage co-brandé proposé | Un partage pré-coché ou récompensé |
| Une mention sur le résultat de la sortie concernée | Une mention sur des sorties sans rapport |

Deux règles ajoutées. Toute surface sponsorisée est **identifiable comme publicité**, sans euphémisme. Et un
joueur peut couper l'affichage des campagnes sans perdre une seule fonction du jeu.

### 2.7 Mesure et tableau de bord

Ce que la marque voit, et rien de plus : participants, boucles fermées valides, distance cumulée, taux de
complétion, présents à une sortie, objets attribués, partages exportés depuis un modèle co-brandé.

Trois garde-fous. **Aucune donnée nominative**, jamais. **Aucune trace, aucune donnée de santé, aucune
coordonnée.** Et un **seuil d'agrégation** : sous 20 participants, aucune métrique n'est rendue, pas même un
total, parce qu'un petit nombre dans un petit périmètre redevient identifiant. Le tableau de bord est **web**,
dans `apps/web`, jamais dans l'application mobile.

### 2.8 Les trois innovations propres à GRYD

**Le territoire comme média.** Pendant un défi, le quartier concerné s'affiche aux couleurs de la marque, sur la
carte que tout le monde regarde déjà. Ni Strava ni Roblox n'ont cela : une surface géographique réelle, partagée,
temporaire. Bornes : **teinte d'affichage**, jamais possession ; propriétaire réel affiché et inchangé ; teinte qui
disparaît à la fin ; §15.6 interdit « l'exclusivité d'un quartier », donc jamais de réservation hors campagne.

**Le souvenir de marque après une sortie réelle.** Qui était au rendez-vous du jeudi reçoit une composition datée,
avec le lieu et les participants consentants. C'est le coût par visite de Niantic retourné du bon côté : la marque
paie la présence réelle validée et n'apprend rien sur les personnes.

**La carte de partage co-brandée, choisie.** Le modèle s'ajoute à la bibliothèque gratuite du joueur. Il ne
remplace rien, n'est jamais pré-sélectionné, et **partager ne rapporte rien**. §15.2 est catégorique : aucune
récompense pour un acte de promotion.

---

## 3. Le paiement

### 3.1 Hors App Store, et la règle exacte

Une marque n'est pas un joueur. Elle achète un service de visibilité, exécuté par GRYD, consommé hors de
l'application. Le paiement se fait donc **par facture ou par Stripe sur le web**, jamais par achat intégré.

- **3.1.1** : l'achat intégré est requis pour débloquer des fonctionnalités **dans** l'application. Une campagne
  ne débloque rien pour la personne qui court.
- **3.1.3(e), Goods and Services Outside of the App** : « If your app enables people to purchase physical goods
  or services that will be consumed outside of the app, you must use purchase methods other than in-app
  purchase ». C'est la base du montage.
- **3.1.3(b) et 3.1.3(c)** : à ne pas invoquer. (b) suppose que la chose soit **aussi** vendue en achat intégré ;
  (c) vise ce qui est « sold directly by you to organizations or groups for their employees or students », ce
  qu'une régie publicitaire n'est pas.

**L'avertissement du cahier, répété tel quel** (§15.6) : « un intitulé B2B ne suffit pas à exempter une vente
numérique des exigences de l'App Store ». La sécurité vient du montage, pas de l'étiquette. Trois conditions
cumulatives : le portail marque est un **produit web distinct** ; l'application iOS ne contient **aucun appel à
l'achat** vers lui ; le paiement d'une marque ne débloque **aucune fonctionnalité** pour un utilisateur.

### 3.2 Grille indicative à trois paliers

**Hypothèses, à lire avant les chiffres.** Prix HT France. La grille est ancrée sur le **coût de revient** (revue
humaine, dessin de l'objet, animation de la campagne, hébergement, support), pas sur une portée que GRYD n'a pas
encore. Strava vend à partir d'environ 20 000 $ avec des dizaines de millions d'athlètes : toute transposition
proportionnelle serait de la fiction. Ces montants sont un point de départ à tester, pas un tarif.

| Palier | Prix indicatif | Inclus | Revue humaine exigée |
|---|---:|---|---|
| **À la campagne** | 900 € par défi de commune ; 2 500 € en multi-communes ; 4 semaines maximum | 1 défi daté, 1 objet cosmétique dédié, page de campagne, tableau de bord, 1 annonce dans le budget du §14.1 | Vérification de la marque, validation de l'objectif, relecture des textes et du visuel |
| **Présence mensuelle** | 390 € par mois, 3 mois d'engagement | Canal permanent, page publique, 1 sortie par mois, tableau de bord continu, 1 défi par trimestre. **Le badge vérifié n'est pas dans le prix** (§3.3) | Idem, plus une revue de modération du canal |
| **Saison** | 6 900 € pour les 6 semaines d'une saison | Palier Présence, 3 défis, 1 quartier aux couleurs, 1 modèle de partage co-brandé, 1 lot réel, 1 fenêtre de bonus offerte à tous | Idem, plus validation du règlement de loterie et de la fenêtre de bonus |

**Le plancher qui protège l'honnêteté.** Aucune campagne n'est vendue là où la portée réelle ne permet pas de la
livrer. « L'app ne ment jamais » vaut aussi envers le client : vendre un défi de commune à 40 comptes actifs,
c'est vendre du vide. Le seuil est une décision du fondateur (§5, question 5).

**Le vrai plafond d'inventaire n'est pas commercial.** §14.1 fixe trois sollicitations non transactionnelles par
semaine, offres comprises, et **au plus deux offres par mois**. Cela borne mécaniquement le nombre de campagnes
vendables par mois et par ville, quel que soit le carnet de commandes. La limite est écrite avant la 1re vente.

### 3.3 La vérification de la marque

Revue humaine, jamais un formulaire automatique. Pièces : extrait Kbis ou équivalent européen, adresse de courriel
sur le domaine de la marque, justificatif du mandat du signataire, contrat signé, CGV B2B acceptées, DPA signé. Le
badge est attribué à l'issue de la revue, il est **révocable**, et sa révocation est immédiate en cas de manquement.

**Le badge n'est jamais une ligne de facture.** La migration `0176`, déjà écrite pour les profils, le dit ainsi :
le badge « devra être une décision de MODÉRATION, jamais une ligne de facture, sans quoi GRYD vendrait de la
crédibilité ». Conséquence commerciale à assumer : une marque peut payer un palier et se voir **refuser** le
badge. Elle est alors remboursée de cette part, et le reste de la prestation peut continuer sans badge.

### 3.4 Ce que la marque n'achète jamais

Le classement. Les points. Le territoire hors de la teinte datée d'un défi. L'exclusivité d'un quartier. Une
victoire. La priorité dans un appariement. Le retrait d'un signalement ou d'un avis. Une notification hors budget.
Un badge de mérite. Le silence de la modération.

Et surtout : **aucune donnée personnelle**. Ni identité, ni pseudonyme, ni trace, ni position, ni donnée de santé,
ni liste d'inscrits, ni segment reconstituable. Seules sortent des statistiques agrégées au-dessus du seuil de 20.
§15.6 est explicite : « Les statistiques de santé et de localisation ne servent pas au ciblage publicitaire ». Le
RGPD ajoute la mécanique : finalité écrite, base légale documentée, DPA de sous-traitance, conservation bornée, et
aucune responsabilité conjointe de la marque sur les traces des joueurs.

### 3.5 Les lots réels : loterie publicitaire et règle Apple

**Droit français.** Une opération qui fait espérer un gain est une **loterie publicitaire**, régie par l'article
L121-20 du code de la consommation, avec les articles L320-1 à L324-16 du code de la sécurité intérieure en
arrière-plan. En pratique : **aucune obligation d'achat** ne peut conditionner la participation ; l'opération doit
être loyale et transparente sur la gratuité, sur les chances de gagner et sur la nature des lots ; le caractère
aléatoire doit être annoncé clairement ; l'organisateur doit être une société ou une association. Depuis la loi du
20 décembre 2014, le dépôt du règlement chez un commissaire de justice n'est plus obligatoire, mais recommandé.

**Règle Apple.** 5.3.1 : « Sweepstakes and contests must be sponsored by the developer of the app ». 5.3.2 : le
règlement officiel doit être présenté **dans l'application** et indiquer qu'Apple n'en est ni le sponsor ni une
partie prenante.

| Montage | Qui organise | Avantage | Coût |
|---|---|---|---|
| **A. GRYD organise** | GRYD organisateur, la marque fournit le lot | Le joueur ne quitte jamais l'application, conforme à 5.3.1 | GRYD porte la responsabilité, rédige le règlement, gère réclamations et remise du lot |
| **B. La marque organise** | La marque sur son site, comme le fait Strava | Responsabilité chez la marque, montage plus léger | Le joueur sort de l'application, la conversion chute, et il faut vérifier que 5.3 ne s'applique plus |

Recommandation : **B pour la première campagne**, puis A quand le règlement type et l'assurance sont en place.

---

## 4. Préparation technique, à ne pas implémenter

### 4.1 Schéma proposé

Rien de ce qui suit n'est écrit. Ce sont des intentions, à relire le jour venu.

| Table | Rôle | Point d'attention |
|---|---|---|
| `brand_accounts` | Le client B2B : raison sociale, identifiant légal, domaine, statut (`draft`, `verified`, `suspended`), auteur et date de vérification, référence de contrat, date du DPA | Jamais lisible par un client mobile. Un compte non `verified` ne publie rien. |
| `crews.kind` | Colonne sur `crews` : `'community'` par défaut, `'brand'` pour un canal | Valeur par défaut obligatoire, sinon la migration casse les crews existants. |
| `crew_verifications` | Le badge au niveau du **crew** : décideur, date, motif, révocation | `0176` a posé `user_profiles.verified_kind` (`none`, `athlete`, `brand`) pour les **profils**, avec `check (verified_kind = 'none' or verified)` et aucun droit d'écriture client. Un crew n'a pas d'équivalent : table à créer, jamais colonne achetable. |
| `brand_followers` | Les abonnés d'un canal | **Ne pas réutiliser `crew_members`** : l'index unique partiel `crew_members_one_active_per_user` de `0002` impose un seul crew actif. Suivre n'est pas adhérer. |
| `sponsored_challenges` | Marque, périmètre (`city_id` ou secteurs de `0151`), sport, dates, objectif, objet cosmétique, description du lot, lien du règlement, statut, champs de revue | Le calcul reste celui du moteur. Aucune règle de mesure propre. |
| `brand_cosmetics` | Le lien entre un `items.item_key` et une marque | Le verrou anti-pay-to-win vit ici, §4.2. |
| `sponsored_bonus_windows` | Marque, périmètre, dates, multiplicateur, cible | Cible verrouillée en base, §4.2. |
| `brand_subscriptions` | Palier, période, référence de facture, référence Stripe, statut | Aucune référence RevenueCat, aucun produit App Store. |
| `brand_metrics_daily` | Compteurs agrégés servis au portail | Seuil k appliqué **en base**, dans la fonction de lecture, pas dans l'interface web. |

### 4.2 Les trois invariants qui rendent l'anti-pay-to-win vérifiable

Une promesse dans un document ne prouve rien. Ces invariants sont testables, deux sont exprimables en DDL.

1. **Le moteur ne lit jamais l'inventaire.** `packages/engine` est pur : ses entrées sont la trace, la géométrie
   et `game-rules`. Un test doit refuser toute entrée portant un identifiant d'objet ou de marque. Tant qu'il
   tient, aucun cosmétique ne **peut** modifier un résultat, même par erreur.
2. **Un objet de marque n'a pas de prix.** Sur l'item référencé, `check (price_eur is null and price_shards is
   null)`, plus une restriction des types de `0014` aux seuls types cosmétiques (`skin_trace`, `skin_territory`,
   `frame_profile`, `template_share`, `badge`, `emblem_crew`, `banner_crew`). Exclus par construction :
   `shield`, `streak_gel`, `scout_ping`, `crew_boost`, `season_pass`, `eclats`, `pack`. L'en-tête de `0014`
   énonce déjà la règle ; il faut la rendre impossible à contourner.
3. **Le bonus n'a qu'une cible.** Sur `sponsored_bonus_windows`, `check (applies_to = 'season_xp')`, et aucune
   fonction accessible à un rôle marque n'écrit sur territoire, capture ou défi classé.

Quatrième contrôle, calqué sur `0165` : **l'étanchéité des catalogues**. Un identifiant de récompense de marque ne
doit jamais entrer en collision avec un palier de saison, un mérite de niveau ou un défi hebdomadaire. `0165` fait
déjà cette vérification en SQL dynamique : reprendre le bloc.

### 4.3 Rôles et RLS

- **Le joueur** lit les défis **publiés**, les cosmétiques et les canaux vérifiés. Il n'écrit rien, comme
  partout : tout claim est décidé serveur.
- **La marque** lit **ses** lignes seulement, filtrées sur une revendication `brand_id` portée par son jeton.
  Aucun accès à `runs`, `users`, `activities`, `crew_members`, ni à aucune table de trace. Sa seule lecture de
  données de jeu passe par les vues agrégées à seuil.
- **Le service** écrit tout le reste.

Trois réflexes hérités du dépôt : `revoke ... from public` sur chaque table ; RLS activée partout ; chaque test
SQL commence par l'étape 0, « le défaut existait », sinon rien ne distingue une migration d'un no-op.

### 4.4 Liens avec l'existant

| Existant | Lien | Risque |
|---|---|---|
| `crews` (`0002`) | Colonne `kind`, badge dans une table à part | L'index `crew_members_one_active_per_user` interdit de traiter un canal comme un crew |
| `user_profiles.verified_kind` (`0047`, `0176`) | Le genre `brand` existe déjà, pour un **profil** | Ne pas le détourner vers un crew, et ne jamais l'écrire depuis un circuit de facturation |
| `crew_challenges_2026` (`0122`, `0148` à `0151`, `0169`) | Un défi sponsorisé est un objet **distinct** du défi classé | Ne jamais laisser un défi de marque écrire dans `challenge_contributions_2026` |
| `items`, `user_inventory` (`0014`) | Les cosmétiques de marque sont des `items` sans prix | Le catalogue accepte aujourd'hui des types à effet : la restriction doit être explicite |
| Catalogues de récompenses (`0121`, `0144`, `0165`) | Même patron : catalogue versionné, récompense par emplacement, étanchéité vérifiée | Reprendre le contrôle de collision de `0165` |
| `anticheat_reviews` (`0081`, `0174`) | Une sortie suspendue ne valide **pas** un défi de marque | Un lot attribué à une sortie invalidée est un incident client autant qu'un incident de jeu |
| `game-rules.ts` (ADR-003) | Seuil k, plafonds, durée maximale : ce sont des constantes | Aucun nombre magique dans une migration ni dans le portail |

### 4.5 Les écrans

**Mobile, trois écrans seulement.** Le badge vérifié sur une page de canal. La page d'un défi sponsorisé, avec sa
mention « Sponsorisé par » et le lien du règlement. L'objet cosmétique dans la collection, avec sa date
d'obtention et son origine. Aucun écran d'achat, aucune marque ailleurs.

**Web, un portail.** Connexion, dossier de vérification, création de campagne, aperçu avant publication, tableau
de bord, factures. Piège du dépôt : deux React cohabitent, `apps/web` est en React 19 avec Next 15 et
`styled-jsx` épinglé. Ne jamais aliaser `react` dans la configuration webpack de Next.

### 4.6 Effort estimé

Jours-personne, hors design graphique, hors juridique, hors vente. À relire, pas à engager.

| Lot | Contenu | Effort |
|---|---|---|
| Socle | `brand_accounts`, vérification, rôles, RLS, portail de connexion | 6 à 9 j |
| À la campagne | `sponsored_challenges`, `brand_cosmetics`, écran mobile du défi, mesure agrégée | 10 à 15 j |
| Présence | Canal, `brand_followers`, page publique, sorties de marque, tableau de bord continu | 8 à 12 j |
| Saison | Teinte de quartier, modèle de partage co-brandé, fenêtre de bonus et ses six verrous | 10 à 14 j |
| Facturation | Stripe web, factures, CGV, cycle d'abonnement | 5 à 8 j |
| Preuves | Tests SQL des invariants, étanchéité, seuil k, gate complet | 5 à 7 j |

Total indicatif : 44 à 65 jours-personne. Le palier « À la campagne » seul, socle et preuves compris, tient en 21
à 31 jours et suffit à une première marque.

### 4.7 Prérequis avant la première ligne de code

1. **Au moins une marque signée.** Construire une régie sans client, c'est construire la mauvaise régie.
2. **CGV B2B rédigées** : livrables, portée non garantie, annulation, responsabilité sur les lots.
3. **DPA signé**, avec la liste exacte des statistiques transmises et le seuil d'agrégation.
4. **Règlement de loterie type**, si le montage A est retenu.
5. **Une décision sur ADR-011.** Vendre à une **marque** n'est pas vendre à un **joueur**, et ADR-011 porte sur le
   joueur. Un ADR propre devra le dire, sinon la première facture ressemblera à une contradiction.
6. **Un ADR « marques »** consignant les six verrous du §2.5 et les trois invariants du §4.2. Sans lui, ces règles
   ne sont que des paragraphes.

---

## 5. Décisions pour le fondateur

1. **Le crew de marque : canal ou équipe ?** Recommandation : **canal non classé**, sans territoire ni classement,
   qui ne consomme pas l'unique adhésion active du joueur (§2.1). Une équipe classée déformerait la ville. OK ?
2. **Le bonus offert par un sponsor : autorisé ou non ?** Recommandation : **autorisé sur l'XP seulement**, sous
   les six verrous du §2.5, jamais sur le territoire ni pendant une semaine de défi classé. Un non simple est
   parfaitement tenable.
3. **Le territoire aux couleurs d'une marque : accepté, et à quelle dose ?** Recommandation : accepté comme
   **teinte datée** pendant un défi, plafonné par saison et par ville. Quel plafond : 7 jours, 14 jours, aucun ?
4. **Qui organise la loterie ?** Montage A (GRYD organise, le joueur reste dans l'application, GRYD porte la
   responsabilité) ou montage B (la marque organise sur son site, comme Strava). Recommandation : **B** d'abord.
5. **Quel seuil de portée en dessous duquel on refuse de vendre ?** 200, 500 ou 1 000 comptes actifs dans la
   commune ? En dessous, on refuse la vente et on le dit au client.

---

## Sources consultées le 11/09/2026

| Sujet | Source |
|---|---|
| Défis sponsorisés Strava : contenu, mesure, restrictions publicitaires | [Ultimate Guide to Sponsored Challenges](https://business.strava.com/resources/ultimate-guide-sponsored-challenges) · [Strava Business FAQ](https://business.strava.com/why-strava/faqs) |
| Tarifs et exemples de campagnes Strava | [The Lead Out](https://theleadout.cc/cycling-sponsorship/strava-sponsored-challenges-cycling-sponsorship/) · [Startup Spells](https://startupspells.com/p/strava-sponsored-challenges-mobilize-50m-athletes-with-native-ads) · [Modern Retail](https://www.modernretail.co/marketing/brands-like-chipotle-duer-hoka-are-partnering-with-strava-to-make-branded-workouts/) |
| Badge vérifié de club, clubs de marque | [Strava Help Center](https://support.strava.com/en-us/articles/15401828-verified-badge-for-clubs-on-strava) · [Strava Business, Clubs](https://business.strava.com/resources/grow-your-brand-strava-clubs) |
| Équipement virtuel Zwift et effet en jeu | [Zwift Insider](https://zwiftinsider.com/does-bike-choice-matter/) · [Drop Shop, août 2026](https://forums.zwift.com/t/drop-shop-update-game-v1-120-august-2026/670434) |
| Lieux sponsorisés, coût par visite | [Ad Age](https://adage.com/article/digital/pokemon-s-ad-model-a-cost-visit-basis/304952/) · [PocketGamer.biz](https://www.pocketgamer.biz/niantic-pokemon-go-partnership/) · [Sponsored Locations](https://explore.scopely.com/en/sponsoredlocations) |
| Marques sur Roblox et Fortnite | [inStreamly](https://instreamly.com/posts/fortnite-or-roblox-whats-better-for-your-brand-and-why/) · [Future Commerce](https://www.futurecommerce.com/posts/roblox-brand-activation-tracker) |
| Nike Run Club, adidas, Runna, Garmin, komoot | [Défis NRC](https://www.nike.com/at/help/a/nrc-challenges) · [Gamification adidas](https://www.strivecloud.io/blog/gamification-examples-adidas) · [Runna, partenariats](https://www.runna.com/partnerships) · [Garmin Connect Challenges](https://www.garmin.com/en-US/blog/general/garmin-connect-challenges/) |
| Peloton et lululemon | [Communiqué Peloton](https://investor.onepeloton.com/news-releases/news-release-details/lululemon-and-peloton-announce-five-year-strategic-global/) · [The Clip Out](https://theclipout.com/sponsored-peloton-classes/) |
| Règles Apple 3.1.1, 3.1.3, 5.3 | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) |
| Loteries publicitaires en France | [Haas Avocats](https://www.haas-avocats.com/concurrence/loterie-publicitaire-et-jeu-concours-les-pieges-a-eviter/) · [Gouache Avocats](https://www.gouache.fr/ressources/articles-avocats-la-reglementation-des-loteries-publicitaires-et-jeux-concours/) |

Les points marqués « de mémoire, à vérifier » n'ont pas de source confirmée et ne doivent pas être cités hors de
ce document.
