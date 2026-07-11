# Prompt — Analyse ultra-développée de la structure de paiement in-app de Clash of Clans et adaptation à GRYD

## Objectif du prompt

Utilise ce prompt pour demander à Claude, ChatGPT, Grok, Perplexity ou un agent de recherche produit d’analyser en profondeur la monétisation de **Clash of Clans** et de transformer les apprentissages en une structure de paiement réaliste, saine et adaptée à **GRYD**, une app mobile de running territorial gamifié.

Ce prompt doit produire :
- une analyse de la structure de paiement de Clash of Clans ;
- une analyse des Season Pass / Gold Pass / Event Pass ;
- une lecture UX/UI de la façon dont les offres sont mises en scène ;
- une analyse des récompenses, bonus, accélérateurs, cosmétiques, progression ;
- une compréhension des mécaniques psychologiques ;
- une adaptation concrète à GRYD ;
- une proposition MVP monétisation ;
- une roadmap de monétisation progressive ;
- une liste de risques App Store / légaux / pay-to-win ;
- des recommandations de design UI pour GRYD.

---

# Prompt principal

```md
Tu es expert en mobile gaming monetization, free-to-play economy design, game UX, App Store compliance, live ops, season pass design et économie de jeu mobile.

Je veux que tu analyses en profondeur la structure de paiement in-app de Clash of Clans, puis que tu adaptes réellement les enseignements à GRYD.

## Contexte GRYD

GRYD est un jeu mobile de running territorial.

Les joueurs courent dans le monde réel pour :
- capturer des zones ;
- fermer des boucles ;
- ouvrir des routes ;
- défendre des territoires ;
- reprendre des zones rival ;
- contribuer à leur crew ;
- participer à des saisons locales ;
- partager leurs conquêtes.

Le cœur du jeu :
Une ligne ouvre une route.
Une boucle crée une zone.
Une frontière défendue protège une zone.
Une boucle collective crée un territoire crew.

## Contraintes essentielles

- GRYD touche au sport réel : une action de jeu coûte un effort physique.
- GRYD ne doit jamais devenir pay-to-win.
- On ne doit jamais vendre du territoire directement.
- On ne doit jamais vendre des kilomètres, des zones, des victoires ou du classement brut.
- Les achats doivent financer le style, le statut, la progression cosmétique, le confort capé, l’organisation crew, le partage et les objets sociaux.
- L’app doit être acceptable par l’App Store.
- La monétisation doit renforcer la rétention sans détruire la confiance.
- L’économie doit être compréhensible, visuelle et non agressive.

## Mission

Analyse Clash of Clans comme référence de monétisation mobile premium / free-to-play.

Ne te contente pas de lister les produits payants.
Analyse :
1. ce qu’ils font payer ;
2. pourquoi les joueurs acceptent de payer ;
3. comment les offres sont mises en scène ;
4. comment la progression du pass est visualisée ;
5. comment les récompenses gratuites et payantes cohabitent ;
6. comment les bonus de progression sont structurés ;
7. comment les ressources, accélérateurs, skins et événements créent de la valeur ;
8. comment la boutique donne envie sans trop bloquer le free-to-play ;
9. comment adapter cela à GRYD sans pay-to-win.

Important :
ne copie pas Clash.
Extrais les principes, puis adapte-les à GRYD.
```

---

# Sources à consulter en priorité

```md
Avant de répondre, vérifie les sources les plus récentes et privilégie les sources officielles.

## Sources officielles Supercell / Clash
- Supercell Clash of Clans blog
- Supercell Support Clash of Clans
- Supercell Store Clash of Clans
- App Store / Google Play listing si nécessaire

## Points à vérifier
- Gold Pass actuel
- Silver / free track si présent
- Event Pass
- Event Hub
- Season Challenges
- Magic Items
- Hero Skins / cosmetics
- Gems
- Supercell Store
- Supercell ID Rewards
- Store bonuses / points
- progression du pass
- refontes récentes de l’interface Gold Pass
- offres limitées
- bundles
- piggy bank / bank / bonus bank si existant
- interaction entre free rewards et paid rewards
```

---

# Partie 1 — Analyse de la structure de paiement de Clash of Clans

```md
Analyse d’abord tous les objets ou systèmes que Clash of Clans monétise.

Pour chaque élément, donne :
- nom du système ;
- type de paiement ;
- usage ;
- valeur perçue ;
- fréquence d’achat ;
- degré d’urgence ;
- impact gameplay ;
- impact cosmétique ;
- risque pay-to-win ;
- rôle dans la rétention ;
- rôle dans la conversion ;
- rôle dans la dépense des gros joueurs ;
- rôle dans le retour des joueurs inactifs ;
- comment c’est présenté visuellement.

À analyser impérativement :

## 1. Gems
Analyse :
- rôle de monnaie premium ;
- usages principaux ;
- achat direct ;
- accélération ;
- économie de temps ;
- conversion temps → argent ;
- valeur psychologique ;
- pourquoi ça fonctionne ;
- où ça peut devenir frustrant.

Questions :
- Les gems servent-elles surtout à accélérer ?
- Servent-elles à acheter des ressources ?
- Servent-elles à contourner l’attente ?
- Quelles limites ou garde-fous existent ?
- Comment les prix sont-ils étagés ?

## 2. Gold Pass / Season Pass
Analyse :
- structure free track vs paid track ;
- récompenses premium ;
- progression par points / objectifs ;
- valeur immédiate vs valeur long terme ;
- effet de “j’ai déjà progressé donc j’achète” ;
- récompense finale ;
- skins exclusifs ;
- boosts ;
- accélérateurs ;
- ressources ;
- interface de progression ;
- renouvellement mensuel ;
- FOMO ;
- sentiment de valeur ;
- lisibilité de l’avancement.

Questions :
- Qu’est-ce qui donne envie d’acheter dès le début ?
- Qu’est-ce qui donne envie d’acheter en milieu de saison ?
- Qu’est-ce qui donne envie d’aller au bout ?
- Comment le pass évite de sembler obligatoire ?
- Comment le pass présente le premium sans humilier le free user ?

## 3. Event Pass
Analyse :
- différence avec Gold Pass ;
- événement limité ;
- récompenses spécifiques ;
- progression événementielle ;
- monnaie événementielle ;
- produits exclusifs ;
- pression temporelle ;
- valeur du pass si achat tardif ;
- risques de frustration.

Questions :
- Pourquoi un Event Pass peut convertir même les non-abonnés ?
- Quelle différence psychologique avec le pass mensuel ?
- Quelles récompenses sont trop puissantes ?
- Quelles récompenses sont acceptables ?

## 4. Magic Items
Analyse :
- livres ;
- potions ;
- runes ;
- marteaux si pertinents ;
- accélérateurs ;
- suppression d’attente ;
- valeur perçue très forte ;
- rareté ;
- stockage ;
- conversion en gems si excédent ;
- place dans pass / events / boutique.

Questions :
- Pourquoi les Magic Items sont-ils plus désirables que de simples ressources ?
- Est-ce la suppression de friction qui fait payer ?
- Comment éviter l’inflation de valeur ?

## 5. Hero Skins / Cosmetics
Analyse :
- skins de héros ;
- exclusivité ;
- saisonnalité ;
- collection ;
- statut ;
- identité joueur ;
- rareté ;
- retour boutique éventuel ;
- impact non gameplay ;
- valeur sociale.

Questions :
- Pourquoi un joueur paie pour un skin ?
- Quelle part vient du statut ?
- Quelle part vient de la collection ?
- Quelle part vient du thème saisonnier ?

## 6. Bundles / Offers / Shop
Analyse :
- offres limitées ;
- packs de ressources ;
- packs de progression ;
- packs de retour ;
- prix d’appel ;
- ancrage de valeur ;
- rareté temporelle ;
- personnalisation des offres ;
- segmentation des joueurs.

Questions :
- Comment les offres sont-elles hiérarchisées ?
- Comment créent-elles la perception de “bonne affaire” ?
- Quels produits sont pour les petits payeurs ?
- Quels produits sont pour les gros payeurs ?
- Quels produits sont pour les revenants ?

## 7. Supercell Store / Web Store
Analyse :
- pourquoi Supercell pousse un store externe ;
- bonus de points ;
- fidélité ;
- rewards ;
- relation avec Supercell ID ;
- incitation à acheter hors app ;
- différences selon règles Apple/Google ;
- implications pour GRYD.

Attention :
pour GRYD iOS, vérifier strictement ce qui est autorisé ou non par Apple.
Ne propose rien qui contourne illégalement l’IAP dans l’app.
```

---

# Partie 2 — Analyse UX/UI de la monétisation Clash

```md
Analyse maintenant COMMENT Clash met visuellement en place les paiements.

Ne donne pas seulement la liste des achats.
Décris l’interface.

## À analyser

### 1. Placement des entrées payantes
- Où apparaît le pass ?
- Où apparaît la boutique ?
- Où apparaissent les offres limitées ?
- Où apparaît l’événement ?
- Est-ce visible depuis l’écran principal ?
- Est-ce intrusif ou intégré ?
- Est-ce contextualisé selon l’action du joueur ?

### 2. Présentation du pass
Analyse :
- full-screen layout ;
- route de progression ;
- paliers ;
- récompenses gratuites et payantes ;
- icônes de récompenses ;
- récompense finale ;
- animations ;
- claims ;
- boutons ;
- prix ;
- unlock state ;
- locked premium rewards ;
- timing de saison ;
- sentiment de progression.

### 3. Visualisation de l’avancement
Analyse :
- barre de progression ;
- points ;
- paliers ;
- seuils ;
- récompenses visibles à l’avance ;
- récompenses déjà obtenues ;
- récompenses premium verrouillées ;
- feedback lors du claim.

### 4. Mise en scène de la valeur
Analyse :
- total value affiché ou implicite ;
- rareté ;
- bonus ;
- exclusivité ;
- icônes plus grosses ;
- couleurs premium ;
- gold / glow / frame ;
- animations ;
- comparaison free vs paid.

### 5. Claim des récompenses
Analyse :
- fréquence de claim ;
- dopamine ;
- claim manuel vs auto ;
- récompenses groupées ;
- feedback visuel ;
- son / animation si pertinent ;
- sentiment d’accumulation.

### 6. FOMO
Analyse :
- timer ;
- saison limitée ;
- événement limité ;
- récompense exclusive ;
- achat tardif ;
- progression non réclamée ;
- retour des items.

### 7. Shop design
Analyse :
- hiérarchie des offres ;
- prix d’appel ;
- packs moyens ;
- packs premium ;
- mise en avant visuelle ;
- tags “best value” ;
- rareté ;
- countdown ;
- limitations ;
- clarté du contenu.
```

---

# Partie 3 — Psychologie de paiement

```md
Analyse les leviers psychologiques utilisés par Clash.

Pour chaque levier :
- explique le mécanisme ;
- donne un exemple Clash ;
- explique si c’est sain ou risqué ;
- propose une adaptation GRYD.

Leviers à analyser :
1. Progression visible
2. Aversion à la perte
3. Sunk cost / achat après progression
4. FOMO saisonnier
5. Collection
6. Statut social
7. Gain de temps
8. Réduction de friction
9. Récompenses fréquentes
10. Récompense finale désirable
11. Social proof
12. Clan contribution
13. Retour des joueurs inactifs
14. Sentiment de valeur énorme
15. Prix d’appel
16. Segmentation petits payeurs / gros payeurs
17. Rareté contrôlée
18. Rituel mensuel
19. Événements temporaires
20. “Je soutiens mon clan / mon crew”
```

---

# Partie 4 — Ce qui est transférable à GRYD

```md
Après l’analyse Clash, extrais les principes transférables à GRYD.

Classe-les en 3 catégories :

## A. À copier dans l’esprit
Exemples :
- pass de saison ;
- double track free / premium ;
- récompenses visibles à l’avance ;
- progression de saison ;
- cosmétiques exclusifs ;
- coffre crew ;
- challenges événementiels ;
- récompenses de contribution ;
- boosts capés ;
- statut social.

## B. À adapter fortement
Exemples :
- accélérateurs ;
- Magic Items ;
- bouclier ;
- event pass ;
- bundles ;
- clan contribution ;
- shop ;
- offres limitées.

## C. À ne pas copier
Exemples :
- pay-to-win territorial ;
- accélération trop forte ;
- achat de territoire ;
- loterie opaque ;
- pression quotidienne trop intense ;
- achat qui remplace l’effort physique ;
- récompense aléatoire payante sans probabilités.
```

---

# Partie 5 — Adaptation concrète à GRYD

```md
Propose maintenant une vraie structure de paiement pour GRYD.

GRYD doit monétiser :
- identité joueur ;
- identité crew ;
- traces ;
- cartes ;
- badges ;
- frames ;
- templates de partage ;
- progression cosmétique ;
- confort ;
- analytics ;
- outils de crew ;
- contributions volontaires ;
- événements locaux.

GRYD ne doit pas monétiser :
- zones directes ;
- territoire direct ;
- kilomètres ;
- victoires ;
- classements ;
- reprises ;
- défense invincible ;
- live rival précis ;
- avantages injustes.
```

---

# Partie 6 — Pass de saison GRYD

```md
Conçois un pass de saison GRYD inspiré de Clash, mais adapté.

Nom possible :
- GRYD Pass
- Season Pass
- Crew Season Pass
- City Pass
- Founding Pass
- Run Pass

Recommande le meilleur nom.

## Structure demandée
Créer :
- une version gratuite ;
- une version premium ;
- une progression par points ;
- des paliers ;
- des récompenses visibles à l’avance ;
- une récompense finale désirable ;
- des missions quotidiennes low-friction ;
- des missions hebdomadaires sportives ;
- des missions crew ;
- des récompenses cosmétiques ;
- des boosts capés ;
- des templates de partage ;
- des badges ;
- des skins de trace ;
- des frames profil ;
- des éléments crew ;
- des objets non pay-to-win.

## Questions à traiter
1. Combien de temps dure une saison GRYD ?
2. Comment gagne-t-on des points de pass ?
3. Quelles récompenses sont gratuites ?
4. Quelles récompenses sont premium ?
5. Quelle récompense finale justifie l’achat ?
6. Comment éviter que les joueurs aient l’impression de devoir payer ?
7. Comment rendre le pass utile même aux joueurs qui courent peu ?
8. Comment éviter d’encourager le surentraînement ?
9. Comment gérer l’achat tardif du pass ?
10. Est-ce que les récompenses premium se débloquent rétroactivement ?
```

---

# Partie 7 — Exemple complet de GRYD Pass

```md
Propose un exemple détaillé de pass GRYD sur 30 niveaux.

Pour chaque niveau, indique :
- niveau ;
- reward free ;
- reward premium ;
- valeur perçue ;
- type : cosmetic / status / comfort / crew / share / badge / boost ;
- impact gameplay ;
- risque ;
- justification.

Contraintes :
- aucune récompense ne doit donner des zones gratuites ;
- aucun boost ne doit donner une victoire automatique ;
- les boosts doivent être capés ;
- les récompenses doivent être désirables visuellement ;
- les free users doivent recevoir assez de valeur ;
- les premium users doivent sentir une vraie valeur sans écraser les autres.

Exemples de rewards possibles :
- skin de trace ;
- frame profil ;
- badge saison ;
- template story ;
- blason crew ;
- bannière crew ;
- animation capture ;
- highlight post-run ;
- replay vidéo premium ;
- style map dark / 3D ;
- title ;
- emote crew ;
- boost coffre capé ;
- streak freeze ;
- scout ping capé ;
- route planner avancé ;
- stats avancées ;
- badge rare ;
- Founder cosmetic.
```

---

# Partie 8 — Event Pass GRYD

```md
Conçois un Event Pass GRYD inspiré des Event Pass Clash.

Mais adapte à des événements locaux et sportifs.

Exemples :
- Take Rouen Weekend
- Paris East Raid
- Rive Gauche vs Rive Droite
- Founding Season
- Night Run Event
- Defender Weekend
- Loop Week
- Crew Raid Weekend

Pour l’Event Pass, donne :
- durée ;
- mission principale ;
- monnaie événementielle éventuelle ;
- free track ;
- premium track ;
- récompense finale ;
- récompenses cosmétiques ;
- contribution crew ;
- règle anti-pay-to-win ;
- prix recommandé ;
- UI ;
- notifications ;
- risques.

Question critique :
Est-ce que l’Event Pass est nécessaire au MVP ou doit venir plus tard ?
```

---

# Partie 9 — Magic Items GRYD

```md
Inspire-toi des Magic Items Clash, mais crée une version GRYD.

Attention : ne pas vendre la victoire.

Propose des objets utilisables, capés et sains.

Exemples potentiels :
- Streak Freeze : protège une série personnelle, sans impact territoire.
- Replay Token : génère un replay vidéo premium.
- Route Reroll : propose une autre route recommandée.
- Scout Ping : révèle une opportunité proche, sans capture automatique.
- Crew Boost : améliore la progression coffre, pas les zones.
- Shield Token : protège temporairement une zone fraîche, mais avec limites strictes.
- Recovery Token : permet de récupérer un run si sync échoue.
- Story Pack : débloque templates de partage.
- Map Style Token : débloque style visuel temporaire ou permanent.
- Badge Slot : affiche plus de badges sur profil.
- Crew Banner Token : personnalisation crew.

Pour chaque item, donne :
- nom ;
- icône ;
- usage ;
- fréquence ;
- limite ;
- prix éventuel ;
- obtention free ;
- obtention premium ;
- risque pay-to-win ;
- garde-fou ;
- wording UI.
```

---

# Partie 10 — Boutique GRYD

```md
Conçois la boutique GRYD.

Sections proposées :
1. Pass
2. Éclats / monnaie premium
3. Skins de trace
4. Templates story
5. Frames profil
6. Badges / titles
7. Crew cosmetics
8. Packs événementiels
9. Offers limitées
10. Free daily claim
11. Founder Pack

Pour chaque section :
- objectif ;
- produits ;
- prix ;
- fréquence de renouvellement ;
- UI ;
- ordre d’affichage ;
- risques ;
- pertinence MVP.

Crée aussi une hiérarchie des packs :
- pack d’appel ;
- pack standard ;
- pack premium ;
- pack crew ;
- pack event ;
- pack founder.

Attention :
ne pas créer une boutique casino.
ne pas créer une boutique qui écrase le gameplay.
ne pas mettre trop d’offres au MVP.
```

---

# Partie 11 — Monnaie premium GRYD

```md
Analyse s’il faut une monnaie premium pour GRYD.

Nom possible :
- Éclats
- Shards
- Sparks
- G-Coins
- Tokens
- Cells
- Credits

Recommande le meilleur nom.

Si tu proposes une monnaie premium :
- explique pourquoi ;
- indique ce qu’elle peut acheter ;
- indique ce qu’elle ne peut jamais acheter ;
- propose des packs de prix ;
- propose un système de bonus ;
- propose un free earning limité ;
- propose une protection contre la frustration ;
- indique les risques App Store / perception.

Règle :
La monnaie premium ne doit jamais acheter directement :
- zones ;
- kilomètres ;
- victoires ;
- captures ;
- rang ;
- défense invincible.
```

---

# Partie 12 — Visuel et UX des paiements dans GRYD

```md
Propose une UI de monétisation GRYD très claire.

À designer :
1. Entrée Pass depuis l’accueil ou Saison.
2. Card Pass sur la page Saison.
3. Track free/premium.
4. Reward claim.
5. Boutique minimaliste.
6. Pack detail.
7. Confirmation achat.
8. Inventaire.
9. Utilisation d’un item.
10. Crew contribution.
11. Event Pass.

Règles UI :
- 1 CTA principal par écran ;
- pas de card dans card ;
- pas de surcharge ;
- pas de manipulation ;
- prix clair ;
- récompense claire ;
- durée claire ;
- contenu visible ;
- aucune promesse floue ;
- pas de loot box cachée ;
- pas de bouton payant proche d’un bouton gratuit par erreur ;
- possibilité de fermer facilement ;
- pas de dark pattern.

À analyser :
- comment Clash met en valeur la progression ;
- comment GRYD peut faire plus premium, plus sobre, plus sportif ;
- comment visualiser un pass sans ressembler à un casino mobile ;
- comment afficher les récompenses en grand ;
- comment utiliser les couleurs chartreuse/gold/black.
```

---

# Partie 13 — Intégration dans les écrans GRYD

```md
Explique où placer la monétisation dans GRYD.

Écrans GRYD :
- Carte
- Missions
- Crew
- Saison
- Profil
- Résultat post-run
- Partage
- Historique
- Boutique
- Paramètres

Pour chaque écran, indique :
- faut-il montrer une offre ?
- sous quelle forme ?
- fréquence maximale ;
- degré d’intrusion acceptable ;
- quel produit est contextuel.

Exemples :
- Après une course : proposer un template story premium, pas un pack de monnaie agressif.
- Dans Crew : proposer contribution coffre, pas achat de victoire.
- Dans Saison : proposer pass.
- Dans Profil : proposer frame / badge slot.
- Dans Carte : ne pas afficher de boutique pendant le run.
- Dans Post-run : afficher partage / replay premium si pertinent.
```

---

# Partie 14 — Modèle économique recommandé pour GRYD MVP

```md
Propose une structure MVP réaliste.

Je veux une recommandation nette :
- faut-il monétiser dès le premier lancement ?
- faut-il attendre la densité ?
- quels produits inclure au MVP ?
- quels produits exclure ?
- quels prix tester ?
- quels produits mettre en App Store review ?
- quels produits garder pour V1.5 ?

Donne 3 scénarios :

## Scénario prudent
Peu ou pas de paiement au lancement.

## Scénario équilibré
Founder Pack + cosmétiques + pass plus tard.

## Scénario agressif
Pass dès le lancement + boutique + events.

Pour chaque scénario :
- avantages ;
- risques ;
- impact App Store ;
- impact conversion ;
- impact image ;
- impact rétention ;
- recommandation finale.
```

---

# Partie 15 — Recommandation finale GRYD

```md
À la fin, propose une recommandation finale claire.

Je veux une réponse tranchée :

1. Quel modèle de paiement choisir pour GRYD ?
2. Quoi vendre au MVP ?
3. Quoi ne surtout pas vendre ?
4. Quand lancer le pass ?
5. À quel prix ?
6. Comment structurer le pass ?
7. Comment structurer les events ?
8. Quelle monnaie premium utiliser ?
9. Quelle boutique mettre en place ?
10. Comment garder le jeu fair ?
11. Comment ne pas se faire rejeter par Apple ?
12. Comment ne pas perdre la confiance des runners ?
13. Comment faire en sorte que les joueurs aient envie de payer sans se sentir forcés ?

Termine par :
- une roadmap V0 / V1 / V1.5 / V2 ;
- un tableau des produits ;
- un tableau des risques ;
- un schéma de l’économie ;
- une liste des écrans à créer.
```

---

# Format attendu de la réponse

```md
# Analyse de la monétisation Clash of Clans → Adaptation GRYD

## 1. Executive summary
Résumé net en 10 lignes maximum.

## 2. Ce que Clash fait payer
Tableau complet.

## 3. Gold Pass / Season Pass
Analyse détaillée.

## 4. Event Pass
Analyse détaillée.

## 5. Magic Items
Analyse détaillée.

## 6. Skins / Cosmetics
Analyse détaillée.

## 7. Shop / Bundles
Analyse détaillée.

## 8. Supercell Store / external store
Analyse et prudence App Store.

## 9. UX/UI de la monétisation
Analyse visuelle.

## 10. Psychologie de paiement
Leviers principaux.

## 11. Ce qu’on peut transférer à GRYD
À copier / adapter / éviter.

## 12. GRYD Pass proposé
Structure complète.

## 13. Event Pass GRYD proposé
Structure complète.

## 14. Magic Items GRYD
Liste complète.

## 15. Boutique GRYD
Structure complète.

## 16. Monnaie premium GRYD
Analyse et recommandation.

## 17. UI GRYD à créer
Écrans précis.

## 18. MVP recommandé
Ce qu’on met maintenant.

## 19. Roadmap monétisation
V0 / V1 / V1.5 / V2.

## 20. Risques
Pay-to-win, Apple, légal, sport, perception.

## 21. Verdict final
Recommandation nette.
```

---

# Contraintes absolues GRYD

```md
## Contraintes non négociables

- Ne jamais vendre de zones.
- Ne jamais vendre de kilomètres.
- Ne jamais vendre de capture automatique.
- Ne jamais vendre de victoire.
- Ne jamais vendre de classement direct.
- Ne jamais vendre de défense invincible.
- Ne jamais mettre une loterie payante opaque.
- Ne jamais cacher les probabilités si récompense aléatoire.
- Ne jamais pousser au surentraînement.
- Ne jamais faire croire que payer remplace l’effort.
- Ne jamais créer une obligation de payer pour être utile à son crew.
- Ne jamais polluer l’écran Carte ou Live Run avec des offres.
- Ne jamais afficher une boutique pendant une course.
- Ne jamais faire de dark pattern.
```

---

# Hypothèse de modèle GRYD à tester

```md
## Modèle recommandé à tester

### V0 / Beta locale
Pas de monétisation agressive.
Objectif : densité, rétention, confiance.

Produits possibles :
- Founder Badge gratuit ou premium léger ;
- Founder Pack optionnel ;
- templates story premium ;
- skins de trace ;
- frames profil.

### V1
Lancer :
- Founder Pack ;
- boutique cosmétique simple ;
- crew cosmetics ;
- replay / share premium ;
- aucun pass obligatoire.

### V1.5
Lancer :
- GRYD Pass mensuel ou saison locale 4 semaines ;
- free track + premium track ;
- récompenses cosmétiques ;
- boosts coffre capés ;
- streak freeze ;
- scout ping capé ;
- story templates.

### V2
Lancer :
- Event Pass local ;
- Crew Raid Pass uniquement cosmétique / contribution ;
- marketplace de skins ;
- sponsor events ;
- drops physiques GRYD Athletics.
```

---

# Produits GRYD à analyser dans la réponse

```md
## Produits potentiels GRYD

1. Founder Pack
2. GRYD Pass
3. Event Pass
4. Éclats / monnaie premium
5. Skins de trace
6. Skins de territoire
7. Map styles
8. Profile frames
9. Badge slots
10. Titles
11. Crew banners
12. Crew blasons
13. Crew HQ themes
14. Story templates
15. Replay vidéo premium
16. Capture animation
17. Streak Freeze
18. Scout Ping
19. Route Reroll
20. Crew Boost coffre
21. Free daily claim
22. Season badge
23. Rare badge
24. Founder cosmetic
25. Sponsor event reward
26. Physical merch unlock
```

---

# Questions spécifiques à résoudre

```md
Réponds explicitement à ces questions :

1. Est-ce que GRYD doit avoir un pass dès le MVP ?
2. Si oui, lequel : Season Pass, City Pass, Crew Pass, Run Pass ?
3. Quelle durée idéale : 2 semaines, 4 semaines, 1 mois ?
4. Quel prix acceptable ?
5. Quelle récompense finale ?
6. Les premium rewards doivent-elles être rétroactives si achat tardif ?
7. Quels boosts sont acceptables sans pay-to-win ?
8. Quels objets doivent être gratuits parfois pour ne pas frustrer ?
9. Comment monétiser les crews sans créer une hiérarchie payer/non-payer ?
10. Comment afficher les offres sans polluer l’app ?
11. Quelle place pour les sponsors locaux ?
12. Quelle place pour la future marque GRYD Athletics ?
13. Quelle différence entre boutique joueur et boutique crew ?
14. Comment rendre la boutique désirable mais sobre ?
15. Comment éviter que GRYD ressemble à un casino mobile ?
16. Comment faire payer le statut plutôt que l’avantage ?
```

---

# Style de réponse attendu

```md
Sois précis, direct et critique.
Ne sois pas vague.
Ne donne pas une réponse théorique.
Fais des tableaux.
Donne des exemples d’écrans.
Donne des noms de produits.
Donne des prix.
Donne des règles de garde-fou.
Donne des recommandations MVP.
Explique ce qu’il faut supprimer.
Explique ce qu’il faut attendre pour plus tard.
```

---

# Résultat final attendu

```md
À la fin, je veux pouvoir donner le document à un développeur et un designer pour créer :

1. La page GRYD Pass.
2. La boutique.
3. Les produits in-app.
4. L’inventaire.
5. Le claim des récompenses.
6. Les templates story premium.
7. Les skins de trace.
8. Les objets capés.
9. La contribution crew.
10. La roadmap de monétisation.
11. Les règles anti-pay-to-win.
12. Les guidelines App Store.
```
