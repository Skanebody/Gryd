# GRYD — Sécurité physique, vie privée, RGPD et données sensibles

## Objectif

Définir les règles de sécurité et de conformité de GRYD.

GRYD manipule :
- géolocalisation ;
- traces de course ;
- données de mouvement ;
- données santé optionnelles ;
- crews ;
- chat ;
- compétition locale.

Ces données sont sensibles en pratique.

---

# 1. Principes non négociables

1. Jamais de position live d’autrui.
2. Jamais de trace publique détaillée.
3. Zones privées activées dès l’onboarding.
4. Consentement explicite pour GPS.
5. Consentement séparé pour HealthKit / Health Connect.
6. Données santé optionnelles.
7. Pas de pression à courir dans une zone dangereuse.
8. Pas de notification de tension la nuit.
9. Suppression compte en self-service.
10. Export données en self-service.

---

# 2. Sécurité physique

GRYD ne doit jamais encourager :
- courir sur autoroute ;
- entrer en propriété privée ;
- traverser zone interdite ;
- suivre un adversaire ;
- courir la nuit pour une urgence de jeu ;
- rejoindre un raid dans une zone dangereuse ;
- prendre une route non adaptée aux piétons.

---

# 3. Règles itinéraires / objectifs

Si GRYD recommande une zone :
- vérifier accessibilité publique ;
- éviter routes rapides ;
- éviter voies ferrées ;
- éviter zones isolées de nuit ;
- éviter lieux sensibles ;
- ne jamais pointer vers une personne.

Message obligatoire :

```txt
Reste sur les voies accessibles au public.
Ta sécurité passe avant la conquête.
```

---

# 4. Zones privées

Créer jusqu’à 3 zones privées :
- domicile ;
- travail ;
- autre.

Par défaut :
- zone domicile proposée ;
- rayon 300 m ;
- modifiable 200 à 500 m.

Dans une zone privée :
- pas de claim ;
- pas de trace publique ;
- pas d’affichage ;
- pas de partage ;
- stockage précis évité.

---

# 5. Données collectées

Catégories :
- compte ;
- pseudo ;
- email / identifiant auth ;
- ville ;
- crew ;
- GPS ;
- polyline masquée ;
- hex claims ;
- motion scores ;
- pas/cadence ;
- éventuelle fréquence cardiaque ;
- achats ;
- messages crew ;
- signalements ;
- logs anti-triche.

---

# 6. Finalités

Finalités :
- fournir le jeu ;
- valider les courses ;
- calculer territoire ;
- afficher classements ;
- prévenir la triche ;
- sécurité ;
- support ;
- achats ;
- analytics produit.

---

# 7. Durées de conservation

Recommandation :
- polylines brutes : 90 jours ;
- segments motion bruts : court terme ou agrégés rapidement ;
- hex claims : durée saison + archive agrégée ;
- achats : durée légale ;
- support : durée nécessaire ;
- chat : durée limitée ;
- logs sécurité : durée raisonnable.

---

# 8. HealthKit / données santé

Données optionnelles :
- fréquence cardiaque ;
- cadence ;
- calories ;
- type d’activité ;
- route ;
- pas.

Règles :
- consentement clair ;
- permissions granulaires ;
- pas de diagnostic médical ;
- pas d’obligation de montre ;
- suppression possible ;
- ne jamais vendre ou partager ces données à des sponsors.

---

# 9. Données motion

Utiliser :
- accéléromètre ;
- gyroscope ;
- podomètre ;
- activité système.

Objectif :
- anti-triche ;
- validation course ;
- fiabilité.

Règle :
- stocker des agrégats par segment plutôt que données brutes longues ;
- expliquer dans la politique de confidentialité.

---

# 10. Mineurs

Âge recommandé :
- 16+.

Pourquoi :
- géolocalisation ;
- social ;
- compétition ;
- données mouvement.

Prévoir :
- modération ;
- signalement ;
- pas de chat ouvert public ;
- pas de position live.

---

# 11. Modération et harcèlement

Interdire :
- ciblage d’une personne ;
- insultes ;
- menaces ;
- noms de crews haineux ;
- harcèlement territorial ;
- doxxing ;
- partage d’adresse ;
- incitation à suivre quelqu’un.

Fonctions :
- signaler ;
- bloquer ;
- masquer ;
- mute ;
- sanction.

---

# 12. App permissions

Avant permission système, expliquer :
- pourquoi GPS ;
- quand GPS est utilisé ;
- pourquoi motion ;
- pourquoi notifications ;
- pourquoi HealthKit ;
- comment désactiver.

---

# 13. Textes courts UX

## GPS

```txt
GRYD utilise ta position pendant tes courses pour capturer les zones traversées.
```

## Motion

```txt
GRYD utilise le mouvement du téléphone pour vérifier que l’activité ressemble bien à une course.
```

## Health

```txt
Tu peux connecter tes données sportives pour enrichir tes statistiques et fiabiliser tes courses. C’est optionnel.
```

## Zone privée

```txt
GRYD masque automatiquement une zone autour de ton domicile.
```

---

# 14. Documents légaux à produire

- CGU ;
- Politique de confidentialité ;
- Règlement Saison ;
- Règles fair-play ;
- Politique de modération ;
- Page support ;
- Mentions sur achats in-app ;
- Page suppression compte.

---

# 15. MVP Safety/RGPD

À faire avant lancement :
1. Zones privées.
2. Consentement GPS.
3. Consentement Health.
4. Suppression compte.
5. Export données.
6. Pas de position live.
7. Pas de trace publique.
8. Signalement joueur/crew.
9. Politique confidentialité.
10. CGU.
11. Quiet hours notifications.
12. No-capture zones basiques.

---

# 16. Prompt Claude Code

```md
Tu es Privacy Engineer + Mobile Safety Lead.
Implémente les garde-fous sécurité/RGPD de GRYD.

Priorités :
- zones privées
- suppression compte
- export données
- consentements GPS/Health/Motion
- aucun affichage live d’autrui
- aucune trace publique détaillée
- signalement utilisateur/crew
- logs consentement
- no-capture zones
```
