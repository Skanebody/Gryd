# GRYD — Gestion des longues courses, lignes droites, maillage et contrôle de secteur

## Objectif du document

Ce document complète les documents gameplay de GRYD.

Il répond à un cas important :

> Comment gérer un joueur qui fait une course de 20 km en ligne droite, sans former de boucle ni mailler entièrement une zone ?

Le but est de récompenser correctement les longues courses sans permettre à une simple ligne droite de donner le contrôle stratégique d’un quartier entier.

Nom public : **GRYD**  
Baseline : **Cours. Capture. Défends.**  
Positionnement : **Le jeu de conquête de territoire pour run clubs.**

---

# 1. Principe central

Une course ne doit pas forcément former un cercle.

Beaucoup de vraies sorties running sont :
- aller-retour ;
- ligne droite ;
- run commute ;
- sortie longue ;
- chemin côtier ;
- voie verte ;
- bord de Seine ;
- route de campagne ;
- liaison entre deux communes.

Donc une course de 20 km en ligne droite est **valide**.

Mais elle ne doit pas donner le même pouvoir stratégique qu’un joueur qui maille réellement un quartier.

Règle centrale :

```txt
Une ligne capture une route.
Un maillage contrôle une zone.
```

---

# 2. Capture brute : seulement les hexes traversés

Techniquement, GRYD doit capturer uniquement les hexes réellement traversés par la trace.

Pipeline recommandé :

```txt
Trace GPS
→ nettoyage / validation serveur
→ buffer autour de la polyline
→ intersection avec les hexes H3
→ capture des hexes traversés
```

Exemple :

```txt
Course de 20 km en ligne droite
→ 280 hexes traversés
→ 280 hexes capturables
→ pas de remplissage automatique autour
→ pas de territoire intérieur
```

Le joueur est récompensé pour ce qu’il a réellement parcouru.  
Il ne gagne pas une surface qu’il n’a pas couverte.

---

# 3. Ne jamais remplir automatiquement l’intérieur d’une boucle

Même si le joueur fait une boucle, il ne faut pas remplir automatiquement tout l’intérieur.

Exemple :
- un joueur court autour d’un parc de 4 km ;
- il ne doit pas capturer tout le parc s’il ne l’a pas traversé.

Règle :

```txt
Tu ne captures que les hexes réellement traversés.
```

En revanche, une boucle peut donner un **bonus stratégique**.

Exemple :

```txt
Boucle fermée détectée
+ bonus maillage
+ badge
+ score de contrôle renforcé
mais pas de capture automatique de l’intérieur
```

Pourquoi :
- plus juste ;
- moins exploitable ;
- plus défendable sportivement ;
- évite les abus sur grands pâtés de maisons, parcs, champs ou zones interdites.

---

# 4. Différence entre capturer et contrôler

Il faut distinguer deux notions.

## 4.1 Hex capturé

Un hex capturé signifie :

```txt
Le joueur ou son crew est passé physiquement sur cet hex avec une course valide.
```

Effet :
- l’hex appartient au joueur/crew ;
- il compte dans les points bruts ;
- il peut être défendu ;
- il peut être volé après lock ;
- il apparaît sur la carte.

## 4.2 Secteur contrôlé

Un secteur contrôlé signifie :

```txt
Le joueur ou son crew possède assez d’hexes dans une zone pour revendiquer un contrôle territorial.
```

Le contrôle n’est donc pas basé uniquement sur le nombre brut d’hexes capturés, mais aussi sur :
- la densité ;
- la compacité ;
- l’activité récente ;
- la couverture réelle du secteur.

C’est ce qui empêche une longue ligne droite de contrôler artificiellement un quartier.

---

# 5. Statuts de contrôle d’un secteur

Chaque secteur peut avoir un statut selon le pourcentage d’hexes possédés.

Exemple :

```txt
Secteur République
Total : 1 000 hexes
Crew A possède : 420 hexes
Densité : 42 %
```

Statuts recommandés :

| Possession du secteur | Statut |
|---:|---|
| 0-10 % | Présence |
| 10-30 % | Implantation |
| 30-50 % | Contesté |
| 50-70 % | Contrôlé |
| 70 %+ | Dominé |

Une ligne droite de 20 km peut créer une forte présence sur plusieurs secteurs, mais rarement un contrôle réel.

---

# 6. Coefficient de compacité

Pour gérer proprement les traces longues et linéaires, il faut ajouter un score de forme.

Une capture peut être :
- compacte ;
- étendue ;
- linéaire ;
- dispersée.

Une ligne droite a une faible compacité.  
Un quartier maillé a une forte compacité.

Formule conceptuelle :

```txt
Compacité = surface réellement capturée / surface englobante
```

Ou plus simplement :

```txt
Compacité = densité des hexes capturés dans le périmètre couvert
```

## Exemple A — Course de 20 km en ligne droite

Caractéristiques :
- beaucoup d’hexes ;
- forme très allongée ;
- faible compacité ;
- excellent score exploration ;
- faible score de contrôle secteur.

## Exemple B — Course de 6 km dans un quartier

Caractéristiques :
- moins d’hexes ;
- forme compacte ;
- forte compacité ;
- meilleur score de contrôle ;
- meilleure valeur stratégique locale.

Conclusion :

```txt
La ligne droite est forte pour explorer et relier.
La boucle ou le maillage est fort pour contrôler.
```

---

# 7. Gestion des longues lignes droites

Une longue ligne droite ne doit pas être pénalisée brutalement.

Elle doit être transformée en ressource stratégique différente :

## 7.1 Route d’exploration

Le joueur découvre une longue bande de nouveaux hexes.

Récompenses :
- XP ;
- Foulées ;
- bonus pionnier ;
- badge explorateur ;
- progression personnelle ;
- contribution crew.

## 7.2 Route de liaison

La course relie deux zones du crew.

Exemple :

```txt
Offranville → Dieppe
```

Si la trace connecte deux avant-postes :

```txt
Route ouverte entre Offranville et Dieppe
```

Récompenses :
- bonus crew ;
- badge ;
- progression QG ;
- mission complétée ;
- titre “Route ouverte”.

## 7.3 Route de ravitaillement

Post-MVP.

Si une route reste possédée par le crew, elle devient une route stratégique.

Effets :
- bonus Foulées ;
- contribution crew ;
- objectif de défense ;
- possibilité pour un adversaire de couper la route ;
- lien entre deux avant-postes ;
- progression du QG crew.

La ligne droite devient donc utile, mais elle ne devient pas un contrôle de quartier.

---

# 8. Scoring recommandé

Il faut séparer deux scores.

## 8.1 Score hex brut

Chaque hex traversé donne ses points normaux.

Exemple :

```txt
+10 pts par hex neutre
+15 pts par hex volé
+3 pts par hex défendu
+bonus pionnier si hex jamais capturé
```

Donc une course de 20 km est bien récompensée.

## 8.2 Score stratégique

Le score stratégique mesure le contrôle réel d’un secteur.

Formule conceptuelle :

```txt
Score stratégique =
hexes possédés dans le secteur
× densité de possession
× compacité
× activité récente
```

Conséquence :
- une ligne droite a un bon score brut ;
- une ligne droite a un bon score exploration ;
- une ligne droite a un faible score de contrôle ;
- un maillage compact a un meilleur score de contrôle.

---

# 9. Exemple concret

## 9.1 Joueur A — 20 km en ligne droite

Le joueur traverse 300 hexes.

Résultat :
- beaucoup de points bruts ;
- beaucoup d’XP ;
- bonus exploration ;
- bonus pionnier si zone nouvelle ;
- possibilité de route de liaison ;
- faible contrôle de secteur.

Statut affiché :

```txt
Présence forte sur un axe.
Contrôle faible des quartiers traversés.
```

Message produit :

```txt
Belle sortie longue.
Tu as ouvert un axe pour ton crew.
Pour contrôler les secteurs traversés, couvre davantage la zone.
```

---

## 9.2 Joueur B — 6 km dans un quartier

Le joueur traverse 90 hexes, mais dans un périmètre compact.

Résultat :
- moins de points bruts ;
- meilleure densité ;
- meilleur contrôle local ;
- plus utile pour tenir un quartier ;
- meilleure défense ;
- meilleur impact sur la carte locale.

Statut affiché :

```txt
Contrôle réel d’un secteur.
```

Message produit :

```txt
Quartier renforcé.
Ton crew augmente son contrôle local.
```

Les deux styles sont utiles, mais ils ne servent pas au même objectif.

---

# 10. Application en ville dense

En ville dense, une ligne droite traverse souvent plusieurs secteurs.

Exemple :
- République → Bastille → Nation.

La ligne droite peut :
- voler des hexes ennemis ;
- créer une présence sur plusieurs quartiers ;
- ouvrir un axe ;
- contribuer au score brut ;
- déclencher une alerte sur un secteur contesté.

Mais elle ne doit pas :
- donner le contrôle de République ;
- donner le contrôle de Bastille ;
- donner le contrôle de Nation ;
- remplir les rues parallèles ;
- capturer les blocs non traversés.

Pour contrôler un quartier, il faut une couverture plus dense.

---

# 11. Application en campagne

En campagne, la ligne droite est très précieuse.

Elle peut :
- relier deux communes ;
- ouvrir une route ;
- connecter deux avant-postes ;
- créer une présence régionale ;
- capturer des hexes pionniers ;
- construire une route de ravitaillement ;
- contribuer fortement au crew.

Exemple :

```txt
Offranville → Sainte-Foy
```

Résultat possible :

```txt
Route ouverte : Offranville — Sainte-Foy
+ bonus exploration
+ contribution crew
+ progression avant-poste
```

Donc en campagne, la ligne droite ne doit pas être vue comme faible.  
Elle doit être vue comme une mécanique de liaison.

---

# 12. Messages UX à afficher

L’app doit expliquer clairement la différence.

## Après une longue ligne droite

```txt
Tu as ouvert une route.
Pour contrôler le secteur, couvre davantage la zone.
```

## Après une boucle compacte

```txt
Zone renforcée.
Ton crew augmente son contrôle local.
```

## Après une liaison entre deux avant-postes

```txt
Route ouverte.
Ton crew relie Offranville à Dieppe.
```

## Après une course linéaire dans une zone ennemie

```txt
Axe percé.
Tu as pris 42 hexes ennemis, mais le secteur reste contesté.
```

## Après un maillage dense

```txt
Contrôle renforcé.
Ton crew passe à 54 % du secteur.
```

---

# 13. Mécaniques MVP

À créer dès le MVP :

1. Capture uniquement des hexes traversés.
2. Pas de remplissage automatique des boucles.
3. Score brut normal sur les hexes.
4. Détection simple des traces linéaires.
5. Bonus exploration pour longues traces.
6. Secteurs contrôlés par pourcentage d’hexes possédés.
7. Message UX différenciant route vs contrôle.
8. Badge “Route ouverte” simple.
9. Statut de secteur : présence / implantation / contesté / contrôlé / dominé.
10. Affichage du pourcentage de contrôle dans une bottom sheet secteur.

---

# 14. Mécaniques V1

À ajouter en V1 :

1. Coefficient de compacité.
2. Bonus maillage.
3. Routes de liaison entre avant-postes.
4. Avant-postes connectés.
5. Score contrôle secteur.
6. Score exploration séparé.
7. Missions de liaison.
8. Badges de route.
9. Classements “routes ouvertes”.
10. Visualisation des axes crew.

---

# 15. Mécaniques V2

À ajouter plus tard :

1. Routes de ravitaillement.
2. Coupure de route par un crew adverse.
3. Défense d’axe.
4. QG crew lié aux routes.
5. Guerre de secteurs avancée.
6. Bonus logistique crew.
7. Missions de supply line.
8. Carte stratégique crew.
9. Itinéraires recommandés pour renforcer un axe.
10. Événements saisonniers autour des routes.

---

# 16. Anti-abus

## 16.1 Abus possible : très grande boucle

Un joueur pourrait faire une énorme boucle autour d’un secteur pour essayer de capturer l’intérieur.

Parade :

```txt
Aucun remplissage automatique de l’intérieur.
```

La boucle donne un bonus, pas une capture gratuite.

## 16.2 Abus possible : ligne droite optimisée en voiture/vélo

Parades :
- vitesse instantanée max ;
- allure moyenne bornée ;
- précision GPS ;
- segments incohérents exclus ;
- validation serveur ;
- course flaggée si suspicion.

## 16.3 Abus possible : aller-retour répété sur la même ligne

Parades :
- défense limitée à 1 fois / 24 h / hex ;
- points réduits sur répétition courte ;
- score exploration seulement sur nouveaux hexes ;
- anti-farming par fenêtre temporelle.

## 16.4 Abus possible : micro-maillage artificiel

Parades :
- distance minimale ;
- durée minimale ;
- allure valide ;
- points plafonnés par secteur/jour ;
- détection de tracés absurdes.

---

# 17. Règles de design produit

## Règle 1

```txt
On récompense tout effort réel.
```

## Règle 2

```txt
On ne donne jamais de territoire non parcouru.
```

## Règle 3

```txt
On distingue score brut et contrôle stratégique.
```

## Règle 4

```txt
La ligne droite sert à relier.
```

## Règle 5

```txt
Le maillage sert à contrôler.
```

## Règle 6

```txt
La campagne valorise les routes.
```

## Règle 7

```txt
La ville valorise la densité.
```

---

# 18. Modèle de données recommandé

## 18.1 Hex claims

Chaque hex capturé reste l’unité de base.

Champs utiles :
- `h3index`
- `owner_user_id`
- `owner_crew_id`
- `claimed_at`
- `run_id`
- `source`
- `locked_until`
- `decay_at`
- `sector_id`
- `claim_type`

`claim_type` possible :
- `neutral`
- `stolen`
- `defended`
- `pioneer`

## 18.2 Sectors

Un secteur regroupe des hexes.

Champs utiles :
- `id`
- `city_id`
- `name`
- `type`
- `geojson`
- `h3_indexes`
- `density_class`
- `total_hexes`

`type` possible :
- `urban`
- `suburban`
- `rural`
- `wild`

## 18.3 Sector control

Table ou vue matérialisée.

Champs utiles :
- `sector_id`
- `crew_id`
- `owned_hexes`
- `control_percent`
- `compactness_score`
- `activity_score`
- `control_status`
- `updated_at`

`control_status` possible :
- `presence`
- `implantation`
- `contested`
- `controlled`
- `dominated`

## 18.4 Routes

Post-MVP ou V1.

Champs utiles :
- `id`
- `crew_id`
- `from_outpost_id`
- `to_outpost_id`
- `created_by_run_id`
- `polyline`
- `h3_chain`
- `status`
- `created_at`
- `last_defended_at`

`status` possible :
- `open`
- `contested`
- `cut`
- `expired`

---

# 19. Algorithme simplifié

## 19.1 Pendant l’ingestion d’une course

```txt
1. Valider la course.
2. Nettoyer les points GPS.
3. Générer la polyline.
4. Appliquer un buffer.
5. Trouver les hexes H3 intersectés.
6. Déterminer pour chaque hex :
   - neutre ;
   - volé ;
   - défendu ;
   - pionnier ;
   - bloqué par lock/bouclier.
7. Attribuer les points bruts.
8. Mettre à jour les claims.
9. Mettre à jour les secteurs touchés.
10. Calculer présence / contrôle.
11. Détecter si la trace est linéaire ou compacte.
12. Donner bonus exploration ou maillage.
13. Générer le résumé de course.
```

## 19.2 Détection simple ligne vs maillage

MVP :

```txt
Si longueur de la trace élevée
et largeur moyenne du bounding box faible
et peu de recroisements
→ trace linéaire.
```

V1 :

```txt
Utiliser :
- ratio longueur / surface englobante ;
- nombre de cellules voisines capturées ;
- densité des hexes dans le secteur ;
- compacité du cluster ;
- recouvrement de la zone.
```

---

# 20. Résumé final

Règle finale :

```txt
Une trace longue et droite capture les hexes traversés.
Elle rapporte beaucoup en exploration et contribution crew.
Elle peut ouvrir une route ou relier des avant-postes.
Mais elle ne contrôle pas un secteur tant que la zone n’est pas assez couverte.
```

Phrase à retenir :

```txt
Une ligne prend un axe.
Un maillage prend un quartier.
```

Cette règle permet à GRYD de récompenser :
- les sorties longues ;
- les runs en ligne droite ;
- les run commutes ;
- les explorateurs ruraux ;
- les liaisons entre communes ;
- les crews dispersés ;

sans casser :
- le contrôle de quartier ;
- la stratégie locale ;
- l’équité ;
- le PvP ;
- la lisibilité de la carte.
