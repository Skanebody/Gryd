# GRYD — Gameplay, crews, contribution groupée, personnalisation et monétisation

## Objectif du document

Ce document regroupe les décisions produit des derniers échanges pour mettre en place :

- une logique de course fluide : **RUN par défaut** ;
- deux objectifs simples : **Conquérir** et **Défendre** ;
- des zones créées à partir des **traits de parcours** ;
- une gestion de crew inspirée des clans de jeux type Clash ;
- une monétisation in-app non pay-to-win ;
- des contributions volontaires au crew ;
- une forte personnalisation joueur / crew ;
- les objets, assets et écrans à créer réellement avant de vendre.

Formule centrale :

```txt
Le territoire se gagne avec les jambes.
Le style, le statut, l’organisation et la contribution peuvent être premium.
La victoire ne s’achète jamais.
```

---

# 1. Logique d’usage : ne pas forcer le choix avant chaque run

## Décision produit

GRYD ne doit pas obliger l’utilisateur à choisir entre **Conquérir** et **Défendre** avant chaque course.

Le meilleur modèle est hybride :

```txt
Par défaut, l’utilisateur appuie sur RUN et part courir librement.
GRYD analyse ensuite la course et détermine ce qui a été conquis, défendu, repris ou ouvert.

Mais l’utilisateur peut choisir Conquérir ou Défendre avant de partir s’il veut jouer stratégique.
```

---

## Pourquoi ne pas forcer le choix

Forcer un choix avant chaque course ajoute de la friction.

Risques :
- l’utilisateur veut simplement courir ;
- l’app semble trop complexe ;
- les débutants ne savent pas quoi choisir ;
- le produit devient trop “jeu” avant d’être running ;
- la rétention sportive peut baisser.

Règle :

```txt
Courir d’abord.
Jouer ensuite.
```

---

## Structure recommandée

Écran principal :

```txt
[ RUN ]
Courir librement

[ Conquérir ]
Créer une nouvelle zone

[ Défendre ]
Renforcer une zone existante
```

Mais visuellement, **RUN** reste le CTA principal.

---

# 2. Principe fondamental : l’intention guide, le tracé décide

## Règle produit

```txt
L’intention guide l’expérience live.
Le tracé réel détermine le résultat final.
```

Exemple :

Si l’utilisateur choisit **Conquérir**, mais traverse aussi des zones de son crew :

```txt
Résultat :
+1 zone conquise
+2 zones défendues au passage
+1 route ouverte
```

Si l’utilisateur choisit **Défendre**, mais ferme une boucle sur une zone neutre :

```txt
Résultat :
2 zones défendues
1 petite zone conquise
```

Le mode choisi ne doit donc pas être une prison.  
Il sert à orienter la course, l’interface live et les recommandations.

---

# 3. Les trois modes de run

## 3.1 Run libre

Mode par défaut.

L’utilisateur appuie sur :

```txt
RUN
```

Il court normalement.

À la fin, GRYD analyse :

```txt
As-tu fermé une boucle ?
As-tu traversé une zone à toi ?
As-tu longé une frontière ?
As-tu traversé une zone adverse ?
As-tu ouvert une route ?
```

Résultat possible :

```txt
Course validée

+1 zone conquise
2 zones défendues
1 route ouverte
Paris Est +3 %
```

---

## 3.2 Mode Conquérir

L’utilisateur choisit ce mode s’il veut créer une nouvelle zone.

Avant la course :

```txt
CONQUÉRIR

Trace une boucle pour créer une zone.
Distance conseillée : 2 à 5 km.

[Planifier une boucle]
[Courir librement]
```

Pendant la course :

```txt
Boucle en cours
Fermeture : 72 %
Il reste environ 280 m pour fermer la zone
```

Après la course :

```txt
Boucle fermée
Zone conquise
+420 pts
Paris Est +3 %
```

---

## 3.3 Mode Défendre

L’utilisateur choisit ce mode pour protéger une zone existante.

Avant la course :

```txt
3 zones à défendre

République
Expire dans 18 h
Boucle défense : 3,1 km

Canal
Contesté
Boucle défense : 4,6 km
```

Pendant la course :

```txt
Défense République
Frontière couverte : 64 %
```

Après la course :

```txt
Zone défendue
République +48 h
Crew +180 pts
```

---

# 4. Définir les zones uniquement avec les traits de parcours

## Principe

Le runner ne capture pas des points.  
Il dessine une frontière.

```txt
Le tracé GPS = une frontière potentielle.
Quand cette frontière se ferme, GRYD crée une zone.
```

---

## Ligne ouverte vs boucle fermée

### Ligne ouverte

Une ligne ouverte ne crée pas de zone.

Exemple :

```txt
Départ → rue A → rue B → rue C
```

Résultat :

```txt
Route ouverte
Pas de zone capturée
```

### Boucle fermée

Une boucle crée une zone.

Exemple :

```txt
Départ → tour du parc → retour proche du départ
```

Résultat :

```txt
Zone capturée
```

---

## Trois façons de fermer une zone

### 1. Retour proche du point de départ

Condition recommandée :

```txt
Distance entre départ et arrivée < 50 à 100 mètres
```

Cas typiques :
- tour d’un parc ;
- tour d’un quartier ;
- boucle autour d’un pâté de maisons.

### 2. Le tracé se recroise

Le parcours forme une boucle partielle ou un huit.

GRYD détecte une intersection avec un segment précédent et crée une zone à partir de la partie fermée.

### 3. Fermeture assistée limitée

Si le tracé est presque fermé, GRYD peut proposer :

```txt
Il te reste 180 m pour fermer la zone.
```

Limite recommandée :

```txt
50 à 100 m maximum
150 m maximum en zone rurale
```

---

# 5. Pipeline technique de création de zone

## Étape 1 — Nettoyer le tracé GPS

Le GPS brut doit être nettoyé :

```txt
suppression des points aberrants
lissage des segments
retrait des sauts GPS
correction des pauses
réduction des micro-tremblements
```

## Étape 2 — Détecter la boucle

GRYD vérifie :

```txt
départ proche arrivée
ou intersection avec le tracé
ou fermeture courte possible
```

Critères MVP recommandés :

```txt
distance minimum : 1 km
durée minimum : 6 min
fermeture : < 80 m
GPS trust : suffisant
vitesse cohérente
```

## Étape 3 — Transformer le tracé en polygone

Si la boucle est valide :

```txt
ligne GPS fermée → polygone
```

Le polygone devient la zone candidate.

## Étape 4 — Valider le polygone

GRYD vérifie :

```txt
surface minimale
surface maximale
compacité
largeur minimale
pas de forme trop fine
pas de capture énorme
pas de zones interdites
```

## Étape 5 — Exclure les zones interdites

Même si l’utilisateur entoure une zone non capturable, GRYD doit exclure :
- eau ;
- autoroutes ;
- voies ferrées ;
- zones militaires ;
- zones privées sensibles ;
- écoles ;
- hôpitaux ;
- zones dangereuses signalées.

Formule :

```txt
zone candidate - zones interdites = zone capturable
```

## Étape 6 — Déterminer le résultat

La zone finale devient selon le contexte :

```txt
zone conquise
zone reprise
zone défendue
zone contestée
route ouverte
```

---

# 6. Règles anti-abus des zones

## Boucle trop grande

Problème :

```txt
Un utilisateur court ou roule 25 km autour d’une ville.
```

Solution :

```txt
surface maximale selon distance courue
```

Exemple :

```txt
3 km → max 0,25 km²
5 km → max 0,8 km²
10 km → max 1,8 km²
```

Message :

```txt
Boucle validée.
Capture plafonnée : seuls les secteurs proches du tracé sont capturés.
```

---

## Boucle trop fine

Problème :

```txt
aller-retour sur deux rues parallèles très proches
```

Solution :
- largeur minimale ;
- score de compacité ;
- surface minimale.

Message :

```txt
Boucle valide pour la course.
Zone non capturée : forme trop étroite.
```

---

## GPS douteux

Utiliser :
- GRYD Verify ;
- GPS trust ;
- motion trust ;
- vitesse cohérente ;
- absence de sauts GPS.

Message :

```txt
Course validée en stats.
Capture partielle ou refusée.
```

---

# 7. Défendre avec des traits

Défendre ne veut pas forcément dire refaire toute la boucle.

## Défense 1 — Refaire le tour

La défense la plus forte.

```txt
Tu cours autour de la frontière.
La zone gagne +48 h.
```

## Défense 2 — Traverser la zone

Moins fort, mais utile.

```txt
Tu traverses une zone contrôlée.
Elle gagne +12 h ou +24 h.
```

## Défense 3 — Couvrir les points faibles

GRYD montre des segments de frontière fragiles :

```txt
Défends cette frontière : 1,8 km
```

Résultat :

```txt
Frontière renforcée
Zone stabilisée
```

---

# 8. Crew : gestion façon clan

GRYD doit reprendre la logique des clans de jeux mobiles :
- hiérarchie ;
- permissions ;
- rôles ;
- recrutement ;
- guerre / objectifs ;
- responsabilité ;
- statut social.

Mais en l’adaptant au running territorial.

---

## Rôles recommandés

```txt
Founder
Co-Captain
Captain
Strategist
Scout
Runner
Rookie
```

---

## 8.1 Founder

Propriétaire du crew.

Pouvoirs :
- changer nom, blason, description ;
- gérer le recrutement ;
- accepter / refuser les candidatures ;
- promouvoir / rétrograder ;
- exclure ;
- lancer une offensive ;
- définir les zones prioritaires ;
- gérer les perks crew ;
- activer le coffre crew ;
- transférer le leadership ;
- archiver le crew.

Limite :
- ne peut pas quitter sans transférer le rôle Founder.

---

## 8.2 Co-Captain

Équivalent co-leader.

Pouvoirs :
- accepter / refuser les candidatures ;
- inviter des runners ;
- promouvoir jusqu’à Strategist ;
- exclure Rookie / Runner / Scout ;
- lancer une offensive ;
- assigner des objectifs ;
- épingler un message crew ;
- créer une sortie crew ;
- gérer la War Room.

Ne peut pas :
- supprimer le crew ;
- changer le Founder ;
- exclure un autre Co-Captain.

---

## 8.3 Captain

Rôle de terrain.

Pouvoirs :
- créer des sorties ;
- assigner des zones à défendre ;
- ping une zone ;
- proposer une offensive ;
- accepter des rookies si le crew l’autorise ;
- gérer les missions de la semaine.

---

## 8.4 Strategist

Rôle tactique.

Pouvoirs :
- créer des routes recommandées ;
- utiliser Scout Ping si disponible ;
- proposer des cibles ;
- lire les stats War Room ;
- marquer des zones faibles ;
- proposer des plans.

---

## 8.5 Scout

Rôle exploration.

Pouvoirs :
- ouvrir des routes ;
- signaler zones faibles ;
- créer des scout reports ;
- proposer des avant-postes ;
- marquer des zones à conquérir.

---

## 8.6 Runner

Rôle standard.

Pouvoirs :
- courir ;
- contribuer ;
- défendre ;
- conquérir ;
- participer au chat ;
- réagir ;
- rejoindre une sortie ;
- inviter via lien si autorisé.

---

## 8.7 Rookie

Période d’essai.

Durée recommandée :

```txt
7 jours
```

Restrictions :
- pas d’accès complet War Room ;
- pas de ping massif ;
- pas d’utilisation des objets crew ;
- contribution comptée mais droits limités.

---

# 9. Statuts de recrutement

```txt
Ouvert
Sur demande
Invitation uniquement
Fermé
```

## Ouvert

Tout runner peut rejoindre.

## Sur demande

Le joueur postule, Captain+ accepte.  
Mode recommandé par défaut.

## Invitation uniquement

Crew compétitif ou privé.

## Fermé

Aucune demande entrante. Invitations manuelles uniquement.

---

# 10. Types de crew

Chaque crew peut afficher des tags :

```txt
Casual
Compétitif
Défense
Raid
Exploration
Performance
Run Club réel
Débutants acceptés
Pionnier
```

Ces tags servent à :
- discovery ;
- matchmaking ;
- recommandations ;
- recrutement ;
- identité sociale.

---

# 11. War Room crew

La War Room est l’écran opérationnel du crew.

Elle doit permettre :
- lancer une offensive ;
- assigner une défense ;
- créer une route ;
- organiser une sortie ;
- choisir les participants ;
- suivre les contributions ;
- afficher les récompenses.

Exemple :

```txt
OFFENSIVE ACTIVE
République

62 %
498 / 800 pts

Temps restant : 04:21
Participants : 6/10
Récompense : Crew Chest Gold

[Rejoindre] [Voir route]
```

---

# 12. Monétisation : règle absolue

GRYD peut vendre :
- statut ;
- esthétique ;
- personnalisation ;
- confort ;
- organisation ;
- analytics ;
- partage ;
- contribution groupée volontaire ;
- outils crew capés.

GRYD ne doit jamais vendre :
- territoire direct ;
- kilomètres ;
- zones capturées ;
- victoire ;
- points leaderboard directs ;
- attaque illimitée ;
- défense illimitée.

Règle :

```txt
On ne vend pas la victoire.
On vend l’expression, l’organisation et la contribution.
```

---

# 13. Contribution volontaire au crew

## Principe

Il faut permettre aux membres motivés de contribuer au crew en achetant ou offrant des bonus groupés.

Mais :
- aucune obligation ;
- aucune pression sociale abusive ;
- aucune victoire achetée ;
- contribution visible mais non obligatoire ;
- plafonds stricts.

Formule :

```txt
Celui qui veut contribuer contribue.
Celui qui ne paye pas reste utile par ses courses.
```

---

## 13.1 Crew Boost

Produit principal de contribution groupée.

### Ce que c’est

Un membre achète un boost temporaire pour tout le crew.

Effet possible :
- accélère le remplissage du coffre crew ;
- améliore les récompenses cosmétiques ;
- débloque temporairement des outils d’organisation ;
- donne plus de visibilité aux routes crew ;
- ajoute une animation premium sur les captures crew.

Ne doit pas :
- donner des zones ;
- capturer automatiquement ;
- augmenter directement la propriété ;
- donner des points leaderboard directs.

---

## Prix recommandés

```txt
Crew Boost 24 h — 1,99 €
Crew Boost 72 h — 4,99 €
Crew Boost Weekend — 6,99 €
Crew Boost Saison — 14,99 €
```

---

## Effets recommandés

### Crew Boost 24 h

```txt
+25 % progression coffre crew
1 template share crew premium pendant 24 h
badge "Boost actif"
```

### Crew Boost 72 h

```txt
+25 % progression coffre crew
2 Scout Reports crew
animations de capture crew
template recrutement premium
```

### Crew Boost Weekend

```txt
boost actif vendredi → dimanche
événement crew visible
bannière spéciale
coffre cosmétique amélioré
```

### Crew Boost Saison

```txt
cadre crew saisonnier
statut "Crew Boosted"
templates crew premium
historique War Room enrichi
```

---

## Limites anti-abus

```txt
1 boost actif à la fois
pas de cumul multiplicatif
bonus plafonné
aucun point leaderboard direct
pas d’effet sur les dernières heures critiques d’une saison
transparence dans les règles
```

---

# 14. Gifting : offrir au crew

## Principe

Un joueur peut offrir :
- un boost ;
- un skin crew ;
- un template ;
- un coffre cosmétique ;
- une bannière ;
- un événement crew.

L’achat est présenté comme :

```txt
Offrir au crew
```

Pas comme :

```txt
Acheter la victoire
```

---

## Produits de gifting

```txt
Offrir Crew Boost 24 h — 1,99 €
Offrir Scout Report crew — 1,49 €
Offrir Template recrutement — 0,99 €
Offrir Coffre cosmétique crew — 2,99 €
Offrir Bannière crew — 3,99 €
Offrir Pack événement crew — 6,99 €
```

---

## UX de gifting

Après achat :

```txt
Benjamin a offert un Crew Boost au crew.
Boost actif pendant 24 h.
Tous les runs alimentent le coffre plus vite.
```

Dans le Crew Feed :

```txt
Benjamin a boosté le crew pendant 24 h.
```

Mais éviter la pression :
- ne pas afficher de classement des payeurs ;
- ne pas culpabiliser les non-payeurs ;
- ne pas bloquer de fonctionnalités essentielles ;
- permettre l’offrande anonyme.

---

# 15. Contribution visible mais saine

Il est possible d’afficher une contribution sans créer de pression.

## Badge contributeur

Exemples :
- Supporter ;
- Crew Patron ;
- Founder Support ;
- Boost Giver ;
- Season Backer.

Mais attention :
- rester cosmétique ;
- ne pas donner autorité ;
- ne pas créer de hiérarchie payante à la place des rôles sportifs.

---

## Crew Wall

Un mur optionnel :

```txt
Supporters de la saison
Benjamin — Crew Boost Weekend
Lena — Template recrutement
Koro — Coffre cosmétique
```

Paramètres :
- opt-in ;
- possibilité d’offrir anonymement ;
- pas de montant affiché ;
- pas de classement par dépense.

---

# 16. Personnalisation vendable

La personnalisation est une source de revenus majeure.

Elle doit être visible dans :
- carte ;
- profil ;
- crew ;
- post-run ;
- share cards ;
- league ;
- War Room ;
- chat.

---

## 16.1 Personnalisation joueur

### À vendre

```txt
frames profil
badges showcase
titres
avatar borders
backgrounds de Player Card
skins de trace
animations post-run
templates share
replay premium
```

### Exemples

```txt
Frame Carbon — 250 Éclats
Titre "Zone Maker" — 150 Éclats
Player Card Night — 300 Éclats
Trace Electric Route — 220 Éclats
Replay Premium — 100 Éclats
```

---

## 16.2 Personnalisation crew

### À vendre

```txt
blasons
bannières
fonds Crew HQ
frames crew
skins de territoire crew
couleurs secondaires
icônes de rôle
emotes crew
templates recrutement
pages crew premium
animations de capture crew
```

### Exemples

```txt
Blason Carbon — 500 Éclats
Bannière War Ready — 350 Éclats
Skin territoire Founder Glow — 700 Éclats
Template recrutement premium — 150 Éclats
Emote "Hold" — 80 Éclats
```

---

## 16.3 Personnalisation de carte

### À vendre

```txt
skin de territoire
skin de frontière
skin de trace
effet de capture
effet de défense
marqueur de départ
marqueur d’arrivée
```

### Exemples

```txt
Gold Border — 400 Éclats
Ghost Territory — 300 Éclats
Chartreuse Pulse — 150 Éclats
Defense Shield FX — 250 Éclats
```

---

# 17. Produits in-app à créer réellement

Tout produit vendu doit exister dans l’univers GRYD.

Chaque item doit avoir :

```txt
1. Nom
2. Icône
3. Rareté
4. Animation d’obtention
5. Règle d’usage
6. Limite anti-abus
7. Écran où l’objet est visible
```

Si un produit n’a pas ces 7 éléments, il ne doit pas être vendu.

---

# 18. Catalogue MVP recommandé

Ne pas vendre 50 choses au lancement.

## MVP payant propre

```txt
1. Starter Pack
2. Founder Pack
3. Éclats
4. Skins territoire
5. Skins trace
6. Frames profil
7. Templates share
8. Shield
9. Streak Gel
10. Scout Ping
11. Crew Boost 24 h
12. Crew Boost Weekend
13. Blasons crew premium
14. Bannières crew
```

---

# 19. Produits individuels

## 19.1 Starter Pack — 2,99 €

Contenu :

```txt
120 Éclats
1 skin trace
1 frame Road
1 template share
1 Streak Gel
```

À créer :
- visuel pack ;
- animation ouverture ;
- cards récompenses ;
- écran confirmation.

---

## 19.2 Founder Pack — 9,99 €

Contenu :

```txt
300 Éclats
Badge Founder
Frame Founder
Skin territoire Founder Glow
Skin trace Founder Line
Titre Founder Runner
Template share Founder
```

À créer :
- badge ;
- frame ;
- skin territoire ;
- skin trace ;
- titre ;
- template ;
- animation pack opening.

---

## 19.3 Éclats

Monnaie premium.

Prix :

```txt
100 Éclats — 0,99 €
320 Éclats — 2,99 €
720 Éclats — 5,99 €
1 500 Éclats — 11,99 €
3 200 Éclats — 24,99 €
```

Usage :
- skins ;
- frames ;
- templates ;
- blasons ;
- emotes ;
- objets capés ;
- share cards ;
- personnalisation.

---

# 20. Produits fonctionnels capés

## 20.1 Shield

```txt
Protège un secteur pendant 48 h.
```

Prix :

```txt
90 Éclats
```

Limites :
- 1 à 2 par semaine ;
- pas d’effet en toute fin de saison ;
- ne rend pas invincible.

À créer :
- icône bouclier ;
- animation membrane sur carte ;
- badge sur zone ;
- card Arsenal.

---

## 20.2 Streak Gel

```txt
Protège une série personnelle.
```

Prix :

```txt
60 Éclats
```

Limites :
- max 2 par mois ;
- aucun effet territoire ;
- protège uniquement la régularité.

À créer :
- icône gel ;
- animation jauge gelée ;
- notification “Série protégée”.

---

## 20.3 Scout Ping

```txt
Révèle une zone rentable ou fragile.
```

Prix :

```txt
120 Éclats
```

Limites :
- 1 par semaine ;
- info temporaire ;
- aucune capture automatique.

À créer :
- icône radar ;
- animation scan ;
- pin “zone faible” ;
- scout report.

---

# 21. Produits crew et contribution groupée

## 21.1 Crew Boost 24 h — 1,99 €

Effet :

```txt
+25 % progression coffre crew
badge boost actif
1 template share crew pendant 24 h
```

À créer :
- icône boost ;
- animation activation ;
- état Crew HQ “Boost actif” ;
- message Crew Feed ;
- timer.

---

## 21.2 Crew Boost Weekend — 6,99 €

Effet :

```txt
boost vendredi → dimanche
bannière spéciale
progression coffre accélérée
animations de capture crew
```

À créer :
- bannière weekend ;
- FX capture crew ;
- card événement ;
- timer crew.

---

## 21.3 Coffre cosmétique crew — 2,99 €

Effet :

```txt
débloque des récompenses cosmétiques aléatoires pour le crew
```

Contenu possible :
- emote ;
- bannière ;
- template ;
- fragment de blason ;
- frame crew.

Attention :
- uniquement cosmétique ;
- pas de zone ;
- pas de points directs.

---

## 21.4 Template recrutement crew — 0,99 € à 1,99 €

Effet :
- génère une story / card de recrutement premium.

À créer :
- formats 9:16, 1:1, 16:9 ;
- variante avec blason ;
- variante avec territoire ;
- variante avec membres.

---

## 21.5 Bannière crew — 3,99 € ou 350 Éclats

Effet :
- change l’apparence du Crew HQ et de la page publique crew.

À créer :
- 6 à 10 bannières MVP ;
- preview ;
- équipement ;
- rendu dans Crew HQ.

---

# 22. GRYD Club

Prix recommandé :

```txt
4,99 €/mois
34,99 €/an
```

À lancer après avoir créé les bénéfices réels.

Contenu :
- stats avancées ;
- heatmap personnelle ;
- historique complet ;
- templates premium mensuels ;
- badges showcase élargi ;
- personnalisation profil avancée ;
- export share HD ;
- Radar Route mensuel ;
- Streak Gel mensuel.

Écrans à créer :
- paywall Club ;
- dashboard Club ;
- benefits ;
- settings ;
- gestion abonnement.

---

# 23. GRYD Pass

Prix recommandé :

```txt
7,99 € / saison
```

À ne pas lancer trop tôt si le contenu n’est pas prêt.

Minimum viable Pass :

```txt
30 niveaux
10 récompenses premium fortes
10 récompenses gratuites
10 petites récompenses
```

Récompenses possibles :
- skins saison ;
- badges ;
- frames ;
- templates ;
- coffres cosmétiques ;
- titres ;
- emotes ;
- éclats ;
- Foulées.

---

# 24. Personnalisation à produire pour le MVP

## Asset library MVP

```txt
10 badges joueur
10 badges crew
8 skins territoire
8 skins trace
6 frames profil
6 frames crew
8 emotes
6 templates share
6 bannières crew
10 formes de blason
10 symboles de blason
10 fonds de blason
3 objets fonctionnels
2 Crew Boosts
3 packs
1 Arsenal complet
1 animation pack opening
1 animation purchase reveal
```

---

# 25. Arsenal

La boutique doit être un vrai écran de jeu.

Structure :

```txt
ARSENAL

Featured
Packs
Objets
Skins Territoire
Skins Trace
Frames
Blasons Crew
Bannières Crew
Templates Share
Crew Boosts
```

Chaque item doit afficher :
- nom ;
- type ;
- rareté ;
- prix ;
- preview ;
- possédé / non possédé ;
- équipé / non équipé ;
- description ;
- limite si objet fonctionnel.

---

# 26. Modèle de données minimal

## items

```sql
items (
  id uuid primary key,
  name text,
  type text,
  rarity text,
  price_shards int,
  price_eur numeric,
  is_consumable boolean,
  usage_limit text,
  target_scope text,
  asset_url text,
  animation_key text,
  description text,
  created_at timestamptz
)
```

`target_scope` :

```txt
user
crew
zone
route
share
profile
```

---

## user_inventory

```sql
user_inventory (
  id uuid primary key,
  user_id uuid,
  item_id uuid,
  quantity int,
  equipped boolean,
  acquired_at timestamptz
)
```

---

## crew_inventory

```sql
crew_inventory (
  id uuid primary key,
  crew_id uuid,
  item_id uuid,
  quantity int,
  equipped boolean,
  acquired_by_user_id uuid,
  acquired_at timestamptz
)
```

---

## purchases

```sql
purchases (
  id uuid primary key,
  user_id uuid,
  crew_id uuid null,
  item_id uuid null,
  product_id text,
  price_eur numeric,
  currency text,
  platform text,
  status text,
  purchased_at timestamptz
)
```

---

## item_usage_logs

```sql
item_usage_logs (
  id uuid primary key,
  user_id uuid,
  crew_id uuid null,
  item_id uuid,
  target_type text,
  target_id uuid,
  used_at timestamptz
)
```

---

## crew_boosts

```sql
crew_boosts (
  id uuid primary key,
  crew_id uuid,
  boost_type text,
  activated_by_user_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  multiplier numeric,
  status text,
  created_at timestamptz
)
```

---

# 27. Priorités de mise en place

## Phase 1 — Core gameplay

Créer :
- Run libre ;
- analyse post-run automatique ;
- conquête par boucle ;
- défense par passage / frontière ;
- zones organiques ;
- résultats post-run.

## Phase 2 — Crew structure

Créer :
- crew ;
- rôles ;
- permissions ;
- recrutement ;
- War Room ;
- Crew Feed ;
- Crew HQ.

## Phase 3 — Personnalisation gratuite + inventaire

Créer :
- inventaire ;
- skins équipables ;
- frames ;
- blasons ;
- templates ;
- système de rareté.

## Phase 4 — Premiers achats

Créer :
- Starter Pack ;
- Founder Pack ;
- Éclats ;
- Arsenal ;
- purchase reveal ;
- achat / équipement.

## Phase 5 — Contribution crew

Créer :
- Crew Boost 24 h ;
- Crew Boost Weekend ;
- gifting au crew ;
- Crew Feed message ;
- timer boost ;
- plafonds anti-abus.

## Phase 6 — Abonnement et saison

Créer :
- GRYD Club ;
- GRYD Pass ;
- récompenses saison ;
- stats avancées ;
- cosmetics saison.

---

# 28. Copy produit

## Conquête

```txt
Trace une boucle. Ferme-la. La zone est à toi.
```

## Défense

```txt
Reviens sur tes frontières avant qu’elles tombent.
```

## Run libre

```txt
Cours librement. GRYD calcule ce que tu as pris, défendu ou ouvert.
```

## Contribution crew

```txt
Offre un boost à ton crew.
Tous les runs comptent plus fort pour le coffre.
Aucune obligation. La victoire reste sur la route.
```

## Monétisation

```txt
Le territoire ne s’achète pas.
Le style, le statut et l’organisation, oui.
```

---

# 29. Prompt Claude / Cursor

```md
Tu es Lead Product Designer, Game Economy Designer et Product Manager mobile game.

Je veux mettre en place dans GRYD les mécaniques suivantes :

## 1. Run libre + modes intentionnels
L’utilisateur ne doit pas être obligé de choisir avant chaque course.
Le bouton principal est RUN.
Après la course, GRYD analyse automatiquement le tracé et attribue :
- zones conquises ;
- zones défendues ;
- zones reprises ;
- routes ouvertes ;
- contribution crew.

Mais l’utilisateur peut aussi choisir :
- Conquérir ;
- Défendre.

Le mode choisi guide l’expérience live, mais le tracé réel décide du résultat final.

## 2. Zones créées par traits de parcours
Une ligne ouverte crée une route.
Une boucle fermée crée une zone.
Le tracé GPS devient la frontière.
Quand la boucle se ferme, l’intérieur devient un territoire.

Règles :
- départ proche arrivée ou auto-intersection ;
- surface min/max ;
- compacité ;
- largeur minimale ;
- GPS trust ;
- exclusion zones interdites ;
- anti-abus.

## 3. Crews façon clan
Créer une gestion de crew avec rôles :
- Founder ;
- Co-Captain ;
- Captain ;
- Strategist ;
- Scout ;
- Runner ;
- Rookie.

Chaque rôle doit avoir des permissions spécifiques :
- recrutement ;
- exclusion ;
- promotion ;
- War Room ;
- routes ;
- offensives ;
- défenses ;
- messages ;
- objets crew.

## 4. Contribution volontaire au crew
Les utilisateurs doivent pouvoir offrir des bonus groupés au crew, sans obligation.

Créer :
- Crew Boost 24 h ;
- Crew Boost Weekend ;
- Coffre cosmétique crew ;
- Template recrutement ;
- Bannière crew ;
- gifting au crew.

Règles :
- aucun achat ne donne de territoire direct ;
- aucun point leaderboard direct ;
- boost plafonné ;
- pas de cumul multiplicatif ;
- pas de pression sociale abusive ;
- possibilité d’offrir anonymement ;
- contribution visible mais saine.

## 5. Personnalisation
Créer une économie de personnalisation :
- skins territoire ;
- skins trace ;
- frames profil ;
- blasons crew ;
- bannières crew ;
- emotes crew ;
- templates share ;
- player card backgrounds ;
- animations post-run.

Chaque item doit avoir :
- nom ;
- icône ;
- rareté ;
- animation ;
- règle d’usage ;
- limite si nécessaire ;
- écran de visibilité.

## 6. Monétisation
Créer l’Arsenal avec :
- Starter Pack ;
- Founder Pack ;
- Éclats ;
- objets fonctionnels capés ;
- skins ;
- frames ;
- blasons ;
- bannières ;
- templates ;
- Crew Boosts.

Prix recommandés :
- Starter Pack : 2,99 €
- Founder Pack : 9,99 €
- 100 Éclats : 0,99 €
- 320 Éclats : 2,99 €
- 720 Éclats : 5,99 €
- Crew Boost 24 h : 1,99 €
- Crew Boost Weekend : 6,99 €
- Template recrutement : 0,99 €
- Coffre cosmétique crew : 2,99 €
- Bannière crew : 3,99 €

## 7. Règle anti-pay-to-win
Le territoire se gagne uniquement en courant.
Les achats servent au style, au statut, à l’organisation et à la contribution groupée.
La victoire ne s’achète jamais.

## 8. Écrans à produire
Créer les wireframes et composants pour :
- Home RUN ;
- écran Conquérir ;
- écran Défendre ;
- Live Run ;
- Post-run Result ;
- Crew HQ ;
- War Room ;
- Crew Roles ;
- Arsenal ;
- Item Detail ;
- Purchase Reveal ;
- Crew Boost Active ;
- Crew Feed ;
- Personalization Editor ;
- Blason Editor ;
- Share Template Editor.

Objectif :
faire de GRYD un vrai jeu mobile de running territorial, simple à comprendre, monétisable proprement, socialement sain et non pay-to-win.
```

---

# 30. Conclusion

La bonne direction est :

```txt
RUN par défaut.
Conquérir / Défendre en objectifs optionnels.
Zones créées par boucles.
Crews structurés comme des clans.
Monétisation par style, statut, organisation et contribution volontaire.
```

La contribution crew est importante, car elle permet à un membre motivé d’aider son groupe sans forcer les autres à payer.

Mais la règle reste non négociable :

```txt
Aucun achat ne doit remplacer une course.
Aucun achat ne doit capturer un territoire.
Aucun achat ne doit acheter une victoire.
```

Le modèle économique de GRYD doit vendre :

```txt
personnalisation
boost collectif plafonné
statut
replay
templates
blasons
bannières
organisation
```

Et le gameplay doit rester :

```txt
tu cours,
tu traces,
tu fermes,
tu prends,
tu défends,
ton crew progresse.
```
