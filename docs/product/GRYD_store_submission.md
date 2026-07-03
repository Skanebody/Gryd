# GRYD — App Store / Play Store readiness

## Objectif

Préparer GRYD pour soumission App Store et Google Play.

Ce document couvre :
- nom ;
- description ;
- screenshots ;
- privacy labels ;
- permissions ;
- achats intégrés ;
- HealthKit ;
- GPS ;
- support ;
- review notes.

---

# 1. Nom App Store

Nom recommandé :

```txt
GRYD: Run the City
```

Sous-titre :

```txt
Cours. Capture. Défends.
```

À vérifier :
- disponibilité App Store Connect ;
- marque INPI/EUIPO ;
- Google Play ;
- domaines ;
- réseaux sociaux.

---

# 2. Description courte

```txt
Transforme tes courses en conquêtes. Capture des territoires, rejoins un crew et défends ta ville.
```

---

# 3. Description longue

Structure :
1. Promesse.
2. Comment ça marche.
3. Crews.
4. Saisons.
5. Performance.
6. Vie privée.
7. Monétisation non pay-to-win.

Texte :

```txt
GRYD transforme la France en carte de conquête par la course.
Chaque sortie capture les zones que tu traverses.
Rejoins un crew, défends ton territoire et progresse à chaque saison.

GRYD ne montre jamais la position live des autres joueurs et masque tes zones privées.
```

---

# 4. Keywords

À tester :
- running ;
- course ;
- run club ;
- fitness ;
- GPS ;
- territoire ;
- challenge ;
- carte ;
- crew ;
- sport.

---

# 5. Screenshots

## Screenshot 1

Carte noire + territoires chartreuse.

Texte :
```txt
Cours. Capture. Défends.
```

## Screenshot 2

Course en direct.

Texte :
```txt
Chaque run prend du terrain.
```

## Screenshot 3

Résultat animé.

Texte :
```txt
Gagne des hexes, des points et des badges.
```

## Screenshot 4

Crew.

Texte :
```txt
Seul tu prends des rues. En crew tu prends la ville.
```

## Screenshot 5

Performance.

Texte :
```txt
Progresse comme coureur.
```

## Screenshot 6

Vie privée.

Texte :
```txt
Zones privées activées par défaut.
```

---

# 6. Permissions

## GPS

Usage :
- suivi de course ;
- capture territoire.

Texte :
```txt
GRYD utilise ta position pendant tes courses pour capturer les zones traversées.
```

## Motion

Usage :
- validation anti-triche ;
- détection course.

Texte :
```txt
GRYD utilise les données de mouvement pour vérifier la cohérence de l’activité.
```

## HealthKit

Usage :
- importer courses ;
- statistiques ;
- fiabilité.

Texte :
```txt
Connecte tes données sportives pour réclamer tes courses et enrichir tes statistiques.
```

## Notifications

Usage :
- vol majeur ;
- decay ;
- crew ;
- streak.

Texte :
```txt
Reçois uniquement les alertes utiles sur ton territoire et ton crew.
```

---

# 7. Privacy labels Apple

Catégories probables :
- location ;
- health/fitness ;
- identifiers ;
- purchases ;
- user content ;
- usage data ;
- diagnostics.

À confirmer juridiquement.

---

# 8. Achats intégrés

Décrire clairement :
- GRYD Club ;
- GRYD Pass ;
- Éclats ;
- skins ;
- packs.

Règle :
- tracking/capture de base gratuit ;
- pas de pay-to-win ;
- achat via IAP.

---

# 9. Review notes Apple

Préparer un compte test :
- compte avec course simulée ;
- accès zone test ;
- achats sandbox ;
- explication GPS ;
- explication HealthKit ;
- explication anti-triche ;
- pas de dotation réelle.

---

# 10. Âge

Recommandation :
- 16+ côté produit ;
- rating store selon questionnaire.

Motifs :
- géolocalisation ;
- interaction sociale ;
- données fitness.

---

# 11. URLs obligatoires

- support URL ;
- privacy policy URL ;
- terms URL ;
- account deletion URL ;
- marketing site ;
- contact.

---

# 12. MVP Store

À préparer :
1. Nom.
2. Sous-titre.
3. Description.
4. Screenshots.
5. Privacy policy.
6. CGU.
7. Support.
8. Review notes.
9. Compte test.
10. IAP sandbox.
11. Permissions propres.
12. Suppression compte.

---

# 13. Prompt Claude Code

```md
Tu es Mobile Release Manager.
Prépare les assets et textes App Store / Play Store pour GRYD.

Livrables :
- descriptions
- screenshots text overlays
- permission strings
- privacy explanations
- review notes
- IAP list
- account deletion page
```
