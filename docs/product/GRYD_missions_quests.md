# GRYD — Missions, quêtes, objectifs et guidage joueur

## Objectif

Créer un système de missions pour guider l’utilisateur.

GRYD ne doit jamais laisser le joueur penser :

```txt
Je ne sais pas quoi faire.
```

Les missions donnent un but immédiat :
- courir ;
- capturer ;
- défendre ;
- rejoindre un crew ;
- explorer ;
- attaquer ;
- partager ;
- progresser.

---

# 1. Philosophie

Les missions doivent :
- guider sans infantiliser ;
- favoriser la boucle cœur ;
- s’adapter à la densité locale ;
- éviter le pay-to-win ;
- pousser la régularité ;
- créer des objectifs crew.

---

# 2. Types de missions

## Missions quotidiennes

Simples :
- courir 1 km ;
- capturer 20 hexes ;
- défendre 10 hexes ;
- partager une conquête ;
- ouvrir l’app et consulter la carte.

## Missions hebdomadaires

Plus engageantes :
- faire 2 courses ;
- capturer 200 hexes ;
- défendre 50 hexes ;
- participer à une offensive ;
- créer/rejoindre un crew ;
- maintenir sa streak.

## Missions crew

Collectives :
- capturer 1 000 hexes ;
- défendre 300 hexes ;
- ouvrir une route ;
- reprendre une zone ;
- 5 membres actifs dans la semaine ;
- atteindre coffre crew niveau 2.

## Missions rurales

Adaptées aux zones peu denses :
- créer un avant-poste ;
- relier deux communes ;
- capturer 300 hexes pionniers ;
- explorer 5 nouvelles routes ;
- maintenir un secteur 7 jours.

## Missions performance

Sportives :
- courir 5 km ;
- améliorer son allure ;
- faire 3 sorties régulières ;
- battre un record personnel ;
- maintenir Score Forme 75+.

---

# 3. Missions onboarding progressif

## Mission 1 — Première capture

```txt
Cours 1 km et capture tes premiers hexes.
```

## Mission 2 — Rejoindre un crew

```txt
Rejoins ou crée un crew pour cumuler votre territoire.
```

## Mission 3 — Défendre

```txt
Repasse sur 10 hexes à toi pour les défendre.
```

## Mission 4 — Partager

```txt
Partage ta première conquête en story.
```

## Mission 5 — Découvrir la carte

```txt
Appuie sur une zone ennemie ou neutre pour voir le gain potentiel.
```

---

# 4. Récompenses

Récompenses possibles :
- XP ;
- Foulées ;
- fragments ;
- badges ;
- progression Pass ;
- coffre ;
- skin basique ;
- titre ;
- carte de partage.

Interdit :
- points de classement achetés ;
- hexes gratuits ;
- vol automatique ;
- victoire directe.

---

# 5. Mission adaptative selon zone

Si zone active :
- attaquer ;
- défendre ;
- offensive ;
- classement.

Si zone pionnière :
- explorer ;
- avant-poste ;
- route ;
- inviter.

Si zone sauvage :
- hexes pionniers ;
- longue route ;
- badge exploration.

---

# 6. UI missions

Emplacement :
- carte home ;
- crew ;
- profil ;
- résultat de course.

Format :
- 1 mission principale visible ;
- 2 missions secondaires max ;
- progression claire ;
- récompense visible ;
- CTA direct.

Exemple :

```txt
Objectif du jour
Défends 25 hexes
18 / 25
Récompense : +80 Foulées
```

---

# 7. Jauges de mission

Chaque mission a :
- objectif ;
- progression ;
- récompense ;
- deadline ;
- CTA.

Jauge style :
- capsule ;
- semelle ;
- chartreuse ;
- effet completion.

---

# 8. Coffres de mission

## Coffre quotidien

Obtenu si 1-2 missions réalisées.

## Coffre hebdo

Obtenu avec 5 missions hebdo.

## Coffre crew

Obtenu si objectif collectif atteint.

## Coffre pionnier

Obtenu en zone peu dense.

---

# 9. MVP missions

À créer :
1. Première capture.
2. 2 courses semaine.
3. Capturer 100 hexes.
4. Défendre 25 hexes.
5. Rejoindre crew.
6. Partager conquête.
7. Créer avant-poste en zone pionnière.
8. Objectif crew simple.
9. Coffre hebdo simple.
10. Missions performance basiques.

---

# 10. V1 missions

Ajouter :
- missions offensives ;
- missions routes ;
- missions crew avancées ;
- missions saison ;
- missions personnalisées ;
- missions performance avancées ;
- missions boutique non agressives.

---

# 11. Prompt Claude Code

```md
Tu es Game Designer.
Implémente le système de missions GRYD.

Contraintes :
- missions quotidiennes, hebdomadaires, crew, rurales, performance
- adaptées à la densité locale
- récompenses non pay-to-win
- UI simple avec jauge et CTA
- tracking analytics
- progression Pass compatible
```
