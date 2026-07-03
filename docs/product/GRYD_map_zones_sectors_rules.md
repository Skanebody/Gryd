# GRYD — Carte France, zones, secteurs, ligues et règles cartographiques

## Objectif

Définir la logique cartographique de GRYD.

Décision majeure :

```txt
La carte officielle de GRYD couvre toute la France.
```

Mais le niveau de gameplay dépend de la densité locale.

---

# 1. Règle produit

```txt
France entière = capturable.
Densité locale = niveau de guerre.
Zone rurale = exploration + avant-postes.
Zone dense = attaque + défense + PvP.
```

Promesse publique :

```txt
Où que tu coures en France, ta course compte.
Plus ta zone devient active, plus elle devient stratégique.
```

---

# 2. Niveaux cartographiques

## Niveau 1 — Hex

Unité de capture.

Usage :
- claim ;
- vol ;
- défense ;
- decay ;
- lock.

## Niveau 2 — Cluster

Groupe d’hexes proches.

Usage :
- bouclier ;
- résumé de course ;
- zone à défendre ;
- objectif local.

## Niveau 3 — Secteur

Unité stratégique.

Usage :
- quartier ;
- commune ;
- parc ;
- avant-poste ;
- titre local ;
- contrôle.

## Niveau 4 — Zone / Ligue

Unité compétitive.

Usage :
- classement ;
- saison ;
- activation mode Guerre ;
- ligues régionales.

---

# 3. Statuts de zones

## Zone active

Exemples :
- Paris ;
- Lille ;
- Rouen ;
- Lyon ;
- Bordeaux ;
- villes avec densité forte.

Gameplay :
- PvP complet ;
- raids ;
- offensives ;
- classements locaux ;
- zones contestées ;
- titres de quartier.

## Zone émergente

Exemples :
- Dieppe ;
- villes moyennes ;
- bassins semi-actifs.

Gameplay :
- capture ;
- crews ;
- avant-postes ;
- missions ;
- classements régionaux.

## Zone pionnière

Exemples :
- Offranville ;
- Sainte-Foy ;
- Aubermesnil-Beaumais.

Gameplay :
- exploration ;
- routes ;
- avant-postes ;
- badges pionnier ;
- contribution crew.

## Zone sauvage

Exemples :
- forêts ;
- campagne isolée ;
- chemins côtiers ;
- zones très peu actives.

Gameplay :
- capture ;
- exploration ;
- routes longues ;
- aucun PvP obligatoire.

---

# 4. Activation du mode Guerre

Mode Guerre activé quand une zone atteint un seuil.

MVP simple :

```txt
20 coureurs actifs sur 30 jours dans un rayon de 5 km
```

Version plus complète :

```txt
Mode Guerre si :
- 25 coureurs actifs / 30 jours
- 5 crews actifs
- 500 km cumulés
- 10 000 hexes capturés
```

Quand activé :
- classement local ;
- raids ;
- offensives ;
- alertes de vol ;
- titres de secteur ;
- zones contestées.

---

# 5. Taille des secteurs

## Ville dense

Secteur :
- 0,5 à 2 km².

Exemples :
- République ;
- Bastille ;
- Canal Saint-Martin ;
- Lille Centre.

## Ville moyenne

Secteur :
- 2 à 5 km².

Exemples :
- Dieppe centre ;
- Rouen rive droite ;
- quartier gare.

## Campagne

Secteur :
- 5 à 20 km².

Exemples :
- Offranville Nord ;
- Aubermesnil boucle ;
- vallée ;
- axe communal.

---

# 6. Statut de contrôle secteur

| Possession du secteur | Statut |
|---:|---|
| 0-10 % | Présence |
| 10-30 % | Implantation |
| 30-50 % | Contesté |
| 50-70 % | Contrôlé |
| 70 %+ | Dominé |

Le contrôle doit prendre en compte :
- nombre d’hexes possédés ;
- densité ;
- compacité ;
- activité récente ;
- decay.

---

# 7. Zones non capturables

Certaines zones doivent être exclues :
- routes dangereuses ;
- autoroutes ;
- propriétés privées connues ;
- zones militaires ;
- voies ferrées ;
- zones interdites ;
- terrains privés sensibles ;
- zones signalées dangereuses.

Règle :
- une zone non capturable peut être traversée dans la trace ;
- elle ne donne pas de claim ;
- elle ne doit pas être recommandée comme objectif.

---

# 8. Zones privées utilisateur

Chaque utilisateur peut créer :
- domicile ;
- travail ;
- autre zone privée.

Effet :
- aucune trace stockée précisément ;
- aucun hex capturé dans la zone ;
- pas d’affichage public ;
- pas de partage.

---

# 9. Lignes droites et routes

Règle :

```txt
Une ligne capture un axe.
Un maillage contrôle un secteur.
```

Une course longue :
- capture les hexes traversés ;
- peut ouvrir une route ;
- peut relier deux avant-postes ;
- ne contrôle pas automatiquement les secteurs traversés.

---

# 10. Avant-postes

Un avant-poste se crée quand un joueur/crew construit une présence dans une zone peu dense.

Conditions possibles :
- 100 hexes dans un rayon de 2 km ;
- 3 courses dans la même zone ;
- 10 km cumulés ;
- 7 jours d’activité.

Effets :
- visibilité crew ;
- titre local ;
- objectif à défendre ;
- contribution régionale ;
- point de départ pour routes.

---

# 11. Classements géographiques

Créer plusieurs niveaux :
- secteur ;
- commune ;
- bassin ;
- département ;
- région ;
- national.

Classements spécialisés :
- territoire ;
- exploration ;
- pionnier ;
- crew ;
- performance ;
- avant-postes.

---

# 12. MVP cartographique

À faire :
1. France entière capturable.
2. Découpage hex H3.
3. Secteurs auto-générés simples.
4. Statuts de zones.
5. Contrôle secteur par %.
6. Zones privées.
7. Zones non capturables basiques.
8. Avant-poste simple.
9. Bonus pionnier selon densité.
10. Classement local / régional.

---

# 13. Prompt Claude Code

```md
Tu es Lead Geo Engineer pour GRYD.
Implémente la carte France entière avec H3, secteurs, zones et statuts.

Règles :
- toute la France est capturable
- les hexes sont l’unité de claim
- les secteurs servent au contrôle
- les zones denses débloquent le mode Guerre
- les zones rurales valorisent exploration et avant-postes
- aucune zone privée ne doit produire de claim
- aucune zone dangereuse ne doit être recommandée

Livrables :
- tables city_zones / sectors / sector_control / outposts / no_capture_zones
- fonctions de calcul de secteur
- statuts active/emerging/pioneer/wild
- contrôle secteur
- bonus pionnier par densité
```
