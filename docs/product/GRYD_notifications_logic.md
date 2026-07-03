# GRYD — Notifications, Inbox, priorités et règles anti-spam

## Objectif

Définir le système de notifications de GRYD.

Les notifications doivent créer du retour sans anxiété.

Règle :

```txt
Rares, utiles, actionnables.
```

---

# 1. Canaux

## Push

Pour :
- vol majeur ;
- offensive ;
- decay ;
- streak ;
- récompense importante.

## Inbox

Pour :
- historique complet ;
- micro-vols ;
- digest ;
- récompenses ;
- infos crew.

## Chat crew

Pour :
- messages sociaux ;
- offensives ;
- réactions.

---

# 2. Priorités

| Priorité | Type |
|---:|---|
| P0 | sécurité / course active |
| P1 | vol majeur / offensive crew |
| P2 | decay / streak |
| P3 | récompense / coffre |
| P4 | performance / record |
| P5 | boutique / offre |
| P6 | digest |

---

# 3. Limites

Règle MVP :

```txt
Maximum 2 push par jour.
```

Exceptions :
- course active ;
- alerte sécurité ;
- événement explicitement suivi.

Quiet hours :
- 21h-8h par défaut ;
- pas de push de tension ;
- digest autorisé seulement si opt-in.

---

# 4. Types de notifications

## Vol subi

```txt
Ton territoire à République vient de tomber.
Crew Bastille a repris 18 hexes.
```

CTA :

```txt
Reprendre
```

Condition :
- zone importante ;
- perte significative ;
- pas chaque hex.

## Offensive crew

```txt
Ton crew lance une offensive sur Canal.
Objectif : 600 hexes avant 20h.
```

CTA :

```txt
Rejoindre
```

## Raid live

```txt
Raid en cours : Bastille est contestée.
31 min restantes.
```

Utiliser avec parcimonie.

## Decay

```txt
Ton quartier s’efface dans 3 jours.
Repasse dessus pour le défendre.
```

## Streak

```txt
Il te manque 1 course pour garder ta série.
```

## Récompense

```txt
Coffre crew débloqué.
```

## Performance

```txt
Nouveau record 5 km.
```

---

# 5. Notifications interdites

Ne jamais envoyer :
- “Untel est près de toi”
- “Cours maintenant sinon tu perds tout”
- “Tu as été attaqué 47 fois”
- push de tension la nuit
- localisation d’un adversaire
- incitation à suivre quelqu’un

---

# 6. Grouping

Si plusieurs petits événements :
- les grouper en digest.

Exemple :

```txt
Résumé GRYD
3 zones défendues, 1 zone perdue, 1 badge débloqué.
```

---

# 7. Inbox

La page Inbox doit contenir :
- vol ;
- decay ;
- offensive ;
- récompense ;
- record ;
- anti-triche ;
- système ;
- saison.

Chaque item :
- titre ;
- texte ;
- heure ;
- CTA ;
- statut lu/non lu.

---

# 8. Personnalisation

L’utilisateur peut choisir :
- vols importants ;
- offensives crew ;
- decay ;
- streak ;
- performance ;
- boutique ;
- digest.

Par défaut :
- boutique off ou très limitée ;
- crew/territoire on ;
- quiet hours on.

---

# 9. Paywall notifications

Ne jamais vendre trop agressivement via notification.

Offres possibles :
- après premier vol ;
- après streak menacée ;
- après récompense ;
- début saison.

Pas de push direct :

```txt
Achète maintenant.
```

Préférer :

```txt
Ton bouclier hebdo est disponible avec Club.
```

---

# 10. Analytics

Events :
- `push_sent`
- `push_opened`
- `push_suppressed`
- `inbox_item_created`
- `inbox_item_opened`
- `notification_settings_changed`
- `quiet_hours_hit`
- `digest_sent`
- `cta_from_notification_clicked`

---

# 11. MVP notifications

À créer :
1. Vol majeur.
2. Decay.
3. Streak.
4. Offensive crew simple.
5. Récompense.
6. Inbox.
7. Quiet hours.
8. Max 2 push/jour.
9. Settings notifications.
10. Analytics.

---

# 12. Prompt Claude Code

```md
Tu es Mobile Engagement Lead.
Crée le système de notifications GRYD.

Contraintes :
- max 2 push/jour
- quiet hours
- inbox complète
- notifications groupées
- aucun push de localisation humaine
- CTA actionnable
- opt-in granulaire
```
