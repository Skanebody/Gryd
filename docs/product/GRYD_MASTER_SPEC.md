# GRYD — MASTER SPEC

## Statut du document

Ce document est la **source de vérité produit** de GRYD.

Il consolide les décisions prises sur :
- vision produit ;
- carte France entière ;
- règles de jeu ;
- pages ;
- monétisation ;
- stratégie ;
- scoring ;
- performance ;
- anti-triche ;
- motion intelligence ;
- animations ;
- badges ;
- objets virtuels ;
- sécurité ;
- RGPD ;
- admin ;
- lancement ;
- roadmap.

Nom public : **GRYD**  
Baseline : **Cours. Capture. Défends.**  
Positionnement : **Le jeu de conquête de territoire pour run clubs.**

---

# 1. Vision

GRYD transforme la France en carte de conquête par la course à pied.

Chaque course permet de :
- capturer des hexagones ;
- défendre son territoire ;
- attaquer des zones adverses ;
- faire progresser son crew ;
- améliorer ses statistiques de performance ;
- débloquer des badges, objets et récompenses ;
- partager ses conquêtes.

Phrase produit :

```txt
Où que tu coures en France, ta course compte.
Plus ta zone devient active, plus elle devient stratégique.
```

---

# 2. Carte officielle

La carte officielle de GRYD couvre **toute la France**.

Règle :

```txt
France entière = capturable.
Densité locale = niveau de guerre.
Zone rurale = exploration + avant-postes.
Zone dense = attaque + défense + PvP.
```

GRYD ne doit pas bloquer un utilisateur parce que sa ville n’est pas officiellement ouverte.

Même en campagne, l’utilisateur doit pouvoir :
- capturer ;
- explorer ;
- créer un avant-poste ;
- contribuer à son crew ;
- ouvrir des routes ;
- débloquer des badges ;
- apparaître dans des classements adaptés.

---

# 3. Modes de zone

## Mode Conquête — partout en France

Disponible partout :
- capture d’hexes ;
- XP ;
- Foulées ;
- badges ;
- performance ;
- routes ;
- avant-postes ;
- contribution crew ;
- partage social.

## Mode Guerre — zones denses

Débloqué selon l’activité locale :
- raids live ;
- offensives ;
- classement local ;
- titres de quartier ;
- zones contestées ;
- alertes de vol ;
- rivalités crew ;
- boucliers stratégiques.

---

# 4. Boucle cœur

```txt
courir → capturer → gagner → partager → se faire voler → revenir → défendre → progresser
```

La boucle doit rester lisible en 3 secondes :
- Où courir ?
- Quoi capturer ?
- Quoi défendre ?
- Qui attaque ?
- Qu’est-ce que mon crew gagne ?
- Qu’est-ce que je débloque ?

---

# 5. Unité de capture

Unité de base : **hex H3**.

Règles :
- une trace GPS capture uniquement les hexes traversés ;
- aucun remplissage automatique de boucle ;
- une ligne droite capture un axe ;
- un maillage contrôle un secteur ;
- les secteurs sont évalués par densité, compacité et activité récente.

Phrase clé :

```txt
Une ligne prend un axe.
Un maillage prend un quartier.
```

---

# 6. Propriété d’un hex

```txt
Un hex appartient au dernier joueur/crew qui l’a traversé avec une course valide,
sauf si :
- lock actif ;
- bouclier actif ;
- protection nouveau joueur ;
- zone privée ;
- course rejetée ou flaggée.
```

---

# 7. Scores

GRYD sépare 4 scores.

## Score territoire

Score principal de saison :
- hexes neutres ;
- hexes volés ;
- hexes défendus ;
- bonus pionnier ;
- objectifs crew.

## Score performance

Score sportif :
- distance ;
- allure ;
- régularité ;
- progression personnelle ;
- fiabilité.

Bonus performance plafonné :

```txt
maximum +15 % sur le score course
```

## Score crew

Score collectif :
- territoires ;
- avant-postes ;
- routes ;
- offensives ;
- participation membres ;
- défense.

## Score réputation

Score permanent :
- badges ;
- saisons ;
- posters ;
- fair-play ;
- niveau ;
- contributions historiques.

---

# 8. Attaques

Types :
- attaque opportuniste ;
- attaque ciblée solo ;
- offensive crew décalée ;
- raid live court ;
- défense ;
- contre-attaque.

Règle :
- les raids live doivent être courts et non obligatoires ;
- les offensives décalées sont le format principal ;
- jamais de position live d’un adversaire ;
- jamais d’incitation à courir dans une zone dangereuse.

---

# 9. Crews

Crew-first, mais solo viable.

Règle produit :

```txt
Seul, tu prends des rues.
En crew, tu prends la ville.
```

Crews :
- 2 à 10 membres au MVP ;
- invitation en 1 tap ;
- chat minimal ;
- objectifs ;
- offensives ;
- rôles ;
- classement crew ;
- avant-postes ;
- routes.

---

# 10. Zones rurales

En zone peu dense :
- le PvP est rare ;
- l’exploration devient centrale ;
- les avant-postes remplacent les attaques fréquentes ;
- les routes relient les secteurs ;
- les classements régionaux évitent l’injustice face aux zones urbaines.

---

# 11. Anti-triche

Principe :

```txt
Le client enregistre.
Le serveur décide.
Le score de confiance arbitre.
Les claims suspects sont gelés.
```

GRYD Verify croise :
- GPS ;
- mouvement téléphone ;
- podomètre ;
- cadence ;
- accéléromètre ;
- gyroscope ;
- source HealthKit / Health Connect ;
- comportement historique.

Une activité peut être enregistrée sans pouvoir capturer du territoire.

---

# 12. Page Performance

GRYD doit montrer :
- progression running ;
- Score Forme ;
- distance ;
- allure ;
- régularité ;
- records ;
- détail de course ;
- performance bonus ;
- GRYD Verified.

Mais Performance reste une page secondaire accessible depuis Profil ou Résultat de course.

---

# 13. Univers visuel

GRYD doit ressembler à :
- une marque running premium ;
- un jeu de territoire ;
- une interface urbaine nocturne ;
- un système de récompenses vivant.

Motif directeur :
- chaussure de running ;
- semelle ;
- lacets ;
- trace ;
- fibre carbone ;
- vitesse ;
- impact au sol.

---

# 14. Monétisation

Interdit :
- vendre des hexes ;
- vendre des kilomètres ;
- vendre des points classement ;
- vendre la victoire.

Autorisé :
- skins ;
- Pass ;
- Club ;
- artefacts capés ;
- boucliers limités ;
- gels de série ;
- radar ;
- scout ;
- objets crew ;
- posters ;
- badges ;
- templates de partage.

---

# 15. Sécurité

GRYD ne doit jamais pousser un joueur à :
- courir sur route dangereuse ;
- aller dans une zone privée ;
- sortir la nuit pour une attaque ;
- suivre quelqu’un ;
- exposer sa trace personnelle.

---

# 16. Priorité MVP

## P0

1. Carte France capturable.
2. Capture hex.
3. Course GPS validée serveur.
4. Zones privées.
5. Crews.
6. Classements simples.
7. Score territoire.
8. Résultat de course animé.
9. Partage social.
10. Anti-triche MVP.
11. Admin courses suspectes.
12. Règlement Saison 0.
13. Safety / Privacy.

## P1

1. Performance page.
2. GRYD Club.
3. Starter / Founder Pack.
4. Missions.
5. Notifications avancées.
6. Avant-postes.
7. Routes simples.
8. Offensives décalées.

## P2

1. Raids live.
2. QG crew.
3. Routes de ravitaillement.
4. Sponsors.
5. Dotations réelles.
6. ML anti-triche.
7. Boutique quotidienne complète.

---

# 17. Documents associés

Ce master spec doit être complété par :
- `GRYD_reglement_saison_0.md`
- `GRYD_admin_dashboard_support.md`
- `GRYD_map_zones_sectors_rules.md`
- `GRYD_safety_privacy_rgpd.md`
- `GRYD_missions_quests.md`
- `GRYD_notifications_logic.md`
- `GRYD_launch_crew_founders.md`
- `GRYD_store_submission.md`
- `GRYD_sponsors_partners.md`

---

# 18. Règle finale

GRYD doit rester simple à comprendre, mais profond à maîtriser.

```txt
Le joueur rapide gagne un bonus.
Le joueur régulier construit un territoire.
Le joueur stratégique choisit les bons moments.
Le crew organisé contrôle la carte.
Le joueur isolé bâtit des avant-postes.
```
