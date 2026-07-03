# GRYD — Social, communauté, recrutement crew et runs groupés

## Objectif

Ce document consolide deux sujets essentiels pour GRYD :

1. **Gérer les gens qui courent ensemble sans être du même crew**
2. **Renforcer le côté social et communautaire**
   - ajout d’amis ;
   - photo de profil ;
   - @handle ;
   - recrutement crew ;
   - candidatures ;
   - crew feed ;
   - chat crew ;
   - sorties collectives ;
   - pages publiques ;
   - privacy ;
   - anti-spam.

Principe central :

```txt
GRYD ne doit pas devenir un réseau social généraliste.
GRYD doit devenir une communauté de crews qui recrutent, courent, attaquent, défendent et progressent ensemble.
```

---

# PARTIE A — RUNS GROUPÉS ENTRE CREWS DIFFÉRENTS

## 1. Problème

Des gens de crews différents vont courir ensemble :
- amis ;
- couple ;
- collègues ;
- run clubs ;
- événements publics ;
- courses officielles.

Il ne faut pas l’interdire. Ce serait antisocial.  
Mais il ne faut pas permettre de farmer artificiellement le territoire.

Règle :

```txt
Courir ensemble est autorisé.
Multiplier artificiellement la capture ne l’est pas.
```

---

## 2. Principe de base

Chaque coureur garde :
- sa course ;
- ses stats ;
- son Score Forme ;
- ses badges ;
- son historique ;
- sa progression ;
- sa contribution personnelle.

Mais pour le territoire :

```txt
Un même passage groupé ne doit pas créer plusieurs captures artificielles.
```

GRYD doit donc détecter les **runs groupés**.

---

## 3. Cas simple : deux crews différents

Exemple :

```txt
Benjamin — Night Pacers
Lucas — Canal Crew
Ils courent 8 km ensemble sur la même trace.
```

Les deux reçoivent :
- distance ;
- allure ;
- GRYD Verified ;
- XP personnelle ;
- badges performance ;
- progression de niveau.

Mais les hexes communs passent en état :

```txt
PASSAGE CONTESTÉ
```

Cela signifie :

```txt
Plusieurs crews ont traversé la même zone quasiment en même temps.
```

---

## 4. Règles de capture

### Hexes neutres

Si deux crews passent ensemble sur un hex neutre :

```txt
Le hex devient contesté pendant une courte fenêtre.
```

Puis résolution :

```txt
Le crew avec la plus forte contribution pondérée gagne le hex.
```

Contribution pondérée :
- nombre de coureurs du crew ;
- trust score ;
- run validé ;
- distance utile ;
- participation réelle ;
- anti-doublon.

Exemple :

```txt
Night Pacers : 3 coureurs validés
Canal Crew : 1 coureur validé
→ Night Pacers capture le hex
```

Si égalité parfaite :

```txt
Le hex reste neutre / contesté jusqu’au prochain passage solo ou crew dominant.
```

### Hexes déjà possédés

Un passage mixte ne doit pas voler automatiquement un territoire possédé.

Exemple :

```txt
Hex détenu par Night Pacers
1 Night Pacers + 1 Canal Crew passent ensemble
→ hex défendu / contesté, mais pas volé
```

Autre exemple :

```txt
Hex détenu par Night Pacers
1 Night Pacers + 4 Canal Crew passent ensemble
→ Canal Crew peut contester ou reprendre
```

Règle :

```txt
Un passage mixte ne peut pas voler un hex contrôlé si les crews sont en égalité de présence.
```

---

## 5. Détection d’un run groupé

Signaux :
- même zone ;
- même trajectoire ;
- même horaire ;
- même allure ;
- distance faible entre coureurs ;
- chevauchement GPS élevé.

Critères possibles :

```txt
départ à moins de 3 minutes
traces similaires à plus de 70 %
écart moyen inférieur à 80 mètres
allure proche
hexes traversés quasi identiques
```

Si ces conditions sont réunies :

```txt
Group Run Detected
```

Puis GRYD regarde :
- même crew ;
- crew différent ;
- sans crew ;
- événement public ;
- course officielle.

---

## 6. Même crew

Si les coureurs sont dans le même crew :

```txt
bonus collectif autorisé
capture plafonnée
```

Exemple :

```txt
1er coureur : capture normale
2e coureur : +30 % contribution crew
3e coureur : +20 %
4e coureur et + : +10 %
```

Objectif : éviter le multiplicateur x10 parce que 10 membres courent ensemble.

---

## 7. Crews différents

Si crews différents :

```txt
mode contesté
pas de capture multiple
pas de farm croisé
pas de vol automatique en égalité
```

Chaque crew gagne les stats personnelles et la progression, mais la propriété du territoire est résolue avec règles anti-abus.

---

## 8. Run club public

Exemple :

```txt
Sortie Adidas Runners
20 personnes
6 crews différents
```

Créer un mode :

```txt
Social Run
```

ou :

```txt
Event Run
```

Dans ce mode :
- stats validées ;
- badges possibles ;
- performance comptabilisée ;
- partage social possible ;
- capture territoriale limitée ou désactivée.

Règle :

```txt
Event Run = stats + badges + contribution sociale.
Capture territoire limitée ou désactivée selon l’événement.
```

---

## 9. Course officielle

Pour un 10 km, semi, marathon :

```txt
Race Mode
```

Effets :
- course validée ;
- badges distance ;
- Score Forme ;
- records ;
- partage ;
- capture territoriale limitée ou désactivée.

Recommandation :

```txt
Les courses officielles ne capturent pas les hexes classiques.
Elles débloquent des badges, routes ou cartes événementielles.
```

---

## 10. Choix au départ d’une course

L’utilisateur doit pouvoir choisir :

```txt
Conquête
Social Run
Course privée
```

### Conquête

Peut capturer, avec règles contestées si run mixte.

### Social Run

Stats + badges, territoire limité.

### Course privée

Stats personnelles uniquement. Pas de territoire, pas de partage public.

---

## 11. Anti-collusion

Risque :

```txt
Crew A prend une zone.
Crew B la reprend.
Crew A la reprend.
Crew B la reprend.
```

Détection :
- mêmes crews qui échangent les mêmes hexes trop souvent ;
- mêmes runners ensemble mais crews opposés ;
- reprises anormalement régulières ;
- traces quasi identiques répétées ;
- alternance ownership artificielle ;
- volume de points disproportionné.

Sanctions douces :
- points réduits ;
- hexes valides mais sans bonus vol ;
- badge non attribué ;
- activité “stats only” ;
- review admin si abus massif.

Message UX :

```txt
Activité validée.
Bonus territoire réduit : reprise répétée entre mêmes crews.
```

---

## 12. Statuts d’un hex après run groupé

```txt
Captured
Defended
Reclaimed
Contested
Neutralized
Stats Only
Locked
Review
```

Pour runs mixtes :
- **Contested** : plusieurs crews ont un claim crédible ;
- **Defended** : le propriétaire actuel était présent et empêche la reprise ;
- **Neutralized** : personne ne gagne le territoire, mais les stats comptent.

---

## 13. Explication utilisateur

Après course :

```txt
Run groupé détecté.
2 crews présents sur cette trace.

Tes stats sont validées.
+72 hexes traversés
+18 hexes capturés
34 hexes contestés
20 hexes défendus par le crew actuel
```

Version courte :

```txt
Sortie mixte détectée.
Les hexes communs ont été traités en mode contesté.
```

Règle officielle :

```txt
Tu peux courir avec qui tu veux.
La carte, elle, récompense le crew qui contribue vraiment.
```

---

# PARTIE B — SOCIAL ET COMMUNAUTÉ

## 14. Vision sociale

Sans social :

```txt
GRYD = app de running avec carte.
```

Avec social :

```txt
GRYD = jeu communautaire de conquête réelle.
```

Le social doit servir trois choses :

```txt
1. Recruter
2. Courir ensemble
3. Gagner du territoire ensemble
```

---

## 15. Profil joueur renforcé

Le profil doit devenir une carte d’identité compétitive.

À afficher :

```txt
Photo de profil
Pseudo / @handle
Crew actuel
Ville principale
Rang saison
Niveau joueur
Titre affiché
Badges rares
Médailles saison
Score Forme
Territoire capturé
Contribution crew
```

Exemple :

```txt
Benjamin
@benjaminbel
Night Pacers · Paris Est

Level 18 · Carbon Runner
#42 Paris Est
12 480 hexes capturés
Badge rare : Founder
```

---

## 16. Photo de profil

Options :
- importer photo ;
- prendre photo ;
- choisir avatar GRYD ;
- choisir initiales.

Format recommandé :

```txt
Avatar hexagonal
Bordure selon niveau
Mini badge crew en bas à droite
```

Exemple :

```txt
Photo profil
+ frame Carbon
+ mini badge Night Pacers
```

Modération :
- signaler photo ;
- supprimer photo ;
- fallback initiales ;
- refus contenu inapproprié ;
- photo non obligatoire.

---

## 17. @handle unique

Chaque joueur doit avoir un identifiant :

```txt
@benjaminbel
@lucasrun
@nightdefender
```

Usage :
- recherche ;
- ajout ami ;
- mentions ;
- partage profil ;
- QR code ;
- lien public.

Lien :

```txt
gryd.run/u/benjaminbel
```

---

## 18. Ajouter facilement des gens

Méthodes :

```txt
Recherche par @handle
QR code profil
Lien d’invitation
Contacts téléphone optionnels
Après une course groupée
Depuis une share card
Depuis un crew
Depuis un classement
Depuis une zone contestée
```

Exemple :

```txt
Tu as couru près de Lucas pendant 6,2 km.
Ajouter Lucas ?
```

Attention privacy :
- pas de suggestion creepy ;
- pas de position précise ;
- suggestion seulement après interaction pertinente.

---

## 19. Système d’amis

MVP :

```txt
Ami
Demande en attente
Bloqué
Membre de mon crew
```

V1 :

```txt
Follow
Mutuals
Close friends
Crew allies
```

Recommandation : éviter un système followers complexe au MVP.

---

## 20. Page Amis

Sections :

```txt
Mes amis
Demandes reçues
Demandes envoyées
Suggestions
QR code
Recherche
```

Actions :

```txt
Ajouter
Accepter
Refuser
Bloquer
Inviter dans mon crew
Partager mon profil
```

---

## 21. Crew Recruitment

Le recrutement crew est un levier viral majeur.

Chaque crew doit avoir une page de recrutement.

Exemple :

```txt
Night Pacers
Paris Est
Level 8 · Carbon League
8 / 10 membres
War Active
Recherche : Defenders + Raiders
```

Boutons :

```txt
Demander à rejoindre
Partager le crew
Copier lien d’invitation
Inviter un ami
```

---

## 22. Statut de recrutement

Chaque crew choisit :

```txt
Ouvert
Sur demande
Fermé
Invitation seulement
```

Types de crew :

```txt
Casual
Compétitif
Pionnier
Run club réel
Défense
Raid
Performance
Social
```

---

## 23. Inviter dans un crew en 1 tap

Depuis le crew :

```txt
Inviter
→ QR code
→ lien
→ contacts
→ Instagram story
→ WhatsApp
→ copier lien
```

Lien :

```txt
gryd.run/c/night-pacers/join
```

Share card :

```txt
NIGHT PACERS RECRUTE
Paris Est
8 / 10 membres
Objectif : Top 10 Saison 0

Rejoins le crew
```

---

## 24. Recrutement intelligent

GRYD doit suggérer des joueurs aux crews :

```txt
3 runners actifs près de Paris Est
2 joueurs sans crew ont capturé dans ta zone
1 ami de membre cherche un crew
Lucas court souvent sur vos routes
```

Sans révéler de position exacte.

Correct :

```txt
Lucas est actif dans votre secteur.
```

Interdit :

```txt
Lucas court tous les soirs rue X.
```

---

## 25. Candidature crew

Si le crew est “sur demande”, créer une mini-candidature.

Champs joueur :

```txt
Pourquoi tu veux rejoindre ?
Ville / zone principale
Nombre de courses par semaine
Style : défense / attaque / exploration / social
```

Vue Captain :

```txt
Lucas
Level 12
3 courses cette semaine
Score fiabilité : 94 %
Actif sur Paris Est
Badges : First Defense, Hex Hunter II
```

Actions :

```txt
Accepter
Refuser
Inviter en période d’essai
Message
```

---

## 26. Période d’essai

```txt
Trial Member — 7 jours
```

Pendant 7 jours :
- contribution autorisée ;
- activation ressources crew interdite ;
- accès limité aux infos stratégiques ;
- mission d’entrée obligatoire.

Exemple :

```txt
Mission d’entrée
Capture 30 hexes ou défends 10 hexes cette semaine.
```

---

## 27. Crew Discovery

Page pour trouver un crew.

Filtres :

```txt
Ville
Pays
Langue
Niveau
Casual / compétitif
War Active
Pioneer
Beginner Friendly
Open / request
```

Cards crew :

```txt
Nom
Blason
Level
League
Membres actifs
Ville principale
War Active
Defense Active
Weekly Runs
Open spots
```

---

## 28. Crew Feed

Le feed prioritaire doit être le Crew Feed.

Affiche :

```txt
Benjamin a capturé 72 hexes
Lucas a défendu République
Night Pacers passe #3
Badge débloqué : Hex Hunter III
Offensive terminée
Coffre crew à 82 %
```

Interactions :

```txt
Réagir
Commenter
Partager
Demander renfort
```

---

## 29. Friends Feed

Secondaire.  
Affiche uniquement :
- courses importantes ;
- badges ;
- records ;
- rank up ;
- partages volontaires.

Ne pas afficher chaque micro-course par défaut.

---

## 30. Réactions sociales GRYD

Au lieu de simples likes :

```txt
Raid
Défense
Clean run
Fast
Rank up
Hold
Respect
Legend
```

Dans l’UI finale, utiliser des icônes custom GRYD plutôt que des emojis bruts.

---

## 31. Group Runs / sorties de crew

Créer une sortie :

```txt
Créer une sortie crew
Nom : Défense Paris Est
Date / heure
Zone
Objectif
Mode : Social / Conquête / Défense / Raid
Participants max
```

RSVP :

```txt
Je participe
Peut-être
Indisponible
```

Après la sortie :

```txt
Résultat collectif
Contribution par membre
Hexes capturés
Badges débloqués
Share card
```

Très important pour les run clubs réels.

---

## 32. Chat crew

Oui, mais simple.

MVP :
- chat crew ;
- réactions ;
- messages système ;
- liens de missions ;
- ping zone ;
- modération basique.

À éviter au MVP :
- DM complet ;
- groupes privés multiples ;
- vocal ;
- live location.

Pourquoi :
- modération plus lourde ;
- harcèlement ;
- spam ;
- complexité.

---

## 33. Public profiles

Créer une page publique légère :

```txt
gryd.run/u/benjaminbel
```

Affiche :
- pseudo ;
- photo / avatar ;
- crew ;
- niveau ;
- badges publics ;
- rang saison ;
- ville approximative ;
- CTA rejoindre GRYD.

Ne pas afficher :
- trace GPS précise ;
- historique complet ;
- horaires ;
- zone privée ;
- données santé.

---

## 34. Social privacy

Chaque joueur choisit :

```txt
Profil public
Profil visible amis
Profil visible crew
Profil privé
```

Pour les activités :

```txt
Partager automatiquement dans le crew
Partager aux amis
Privé
Stats only
```

Pour les cartes :

```txt
Trace précise
Trace simplifiée
Territoire seulement
Pas de carte
```

Par défaut :
- profil visible dans le jeu ;
- activités visibles crew ;
- pas de position live ;
- traces simplifiées.

---

## 35. Anti-spam recrutement

Limites :

```txt
max invitations / jour
max demandes crew / jour
cooldown après refus
bloquer utilisateur
signaler crew
masquer invitations
```

Sinon les meilleurs joueurs seront harcelés.

---

## 36. Social onboarding

Dès l’onboarding :

```txt
Rejoins un crew près de toi
ou crée ton crew fondateur
```

Puis :

```txt
Invite 3 coureurs pour débloquer le badge Crew Founder.
```

---

## 37. Boucle virale

```txt
Je cours
→ Je capture
→ GRYD génère une share card
→ Je la poste
→ Quelqu’un clique
→ Il rejoint mon crew
→ On court ensemble
→ Le crew monte
→ On partage une victoire crew
```

---

# PARTIE C — PAGES À AJOUTER

## 38. Page Profil joueur

Avec :
- photo ;
- niveau ;
- crew ;
- badges ;
- stats ;
- bouton ajouter ;
- bouton inviter crew ;
- bouton partager profil.

## 39. Page Amis

Avec :
- amis ;
- demandes ;
- suggestions ;
- QR code ;
- recherche @handle.

## 40. Page Crew Discovery

Avec :
- crews proches ;
- crews actifs ;
- crews ouverts ;
- filtres ;
- recommandations.

## 41. Page Candidatures crew

Pour Captains / Leaders.

## 42. Page Sorties crew

Pour créer et rejoindre des runs collectifs.

## 43. Page Public Profile Web

Pour acquisition externe.

---

# PARTIE D — MODÈLE DE DONNÉES

## 44. user_profiles

```sql
user_profiles (
  id uuid primary key,
  user_id uuid references auth.users(id),
  handle text unique,
  display_name text,
  avatar_url text,
  avatar_shape text default 'hex',
  bio text,
  main_city text,
  main_country text,
  privacy_level text,
  created_at timestamptz,
  updated_at timestamptz
)
```

## 45. friendships

```sql
friendships (
  id uuid primary key,
  requester_id uuid,
  addressee_id uuid,
  status text, -- pending | accepted | blocked | rejected
  created_at timestamptz,
  updated_at timestamptz
)
```

## 46. crews

```sql
crews (
  id uuid primary key,
  name text,
  slug text unique,
  tag text,
  description text,
  avatar_url text,
  badge_frame text,
  city text,
  country text,
  recruitment_status text, -- open | request | closed | invite_only
  crew_type text,
  level int,
  xp int,
  league text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
```

## 47. crew_members

```sql
crew_members (
  id uuid primary key,
  crew_id uuid,
  user_id uuid,
  role text,
  status text, -- active | trial | inactive | removed
  availability text,
  joined_at timestamptz,
  trial_ends_at timestamptz
)
```

## 48. crew_applications

```sql
crew_applications (
  id uuid primary key,
  crew_id uuid,
  user_id uuid,
  message text,
  preferred_zone text,
  weekly_runs_estimate int,
  style text,
  status text, -- pending | accepted | rejected | trial
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid
)
```

## 49. group_runs

```sql
group_runs (
  id uuid primary key,
  crew_id uuid,
  title text,
  mode text, -- social | conquest | defense | raid | event
  target_zone_id uuid,
  start_time timestamptz,
  max_participants int,
  created_by uuid,
  status text, -- planned | active | completed | cancelled
  created_at timestamptz
)
```

## 50. crew_feed_events

```sql
crew_feed_events (
  id uuid primary key,
  crew_id uuid,
  actor_user_id uuid,
  event_type text,
  title text,
  body text,
  metadata jsonb,
  visibility text,
  created_at timestamptz
)
```

## 51. contested_group_runs

```sql
contested_group_runs (
  id uuid primary key,
  run_ids uuid[],
  detected_at timestamptz,
  overlap_score numeric,
  crews_involved uuid[],
  status text, -- contested | neutralized | resolved | review
  resolution_summary jsonb
)
```

---

# PARTIE E — PRIORITÉS

## 52. MVP

```txt
1. Photo de profil / avatar hexagonal
2. @handle unique
3. Ajouter ami par handle
4. QR code profil
5. Lien invitation crew
6. Page crew publique
7. Statut crew : ouvert / demande / fermé
8. Demande pour rejoindre crew
9. Crew feed
10. Chat crew simple
11. Suggestions de crews proches
12. Share card de recrutement crew
13. Privacy profil
14. Blocage / signalement
15. Détection run groupé
16. Mode run contesté
17. Social Run
18. Course privée
```

## 53. V1

```txt
1. Contacts téléphone optionnels
2. Suggestions d’amis
3. Candidature crew enrichie
4. Trial member
5. Group runs / sorties crew
6. Reactions custom
7. Public player profile
8. Friend feed
9. Crew recruitment analytics
10. Recrutement intelligent
11. Race Mode
12. Event Run
13. Anti-collusion avancé
```

## 54. V2

```txt
1. DM contrôlés
2. Run clubs officiels
3. Events publics
4. Ambassadeurs
5. Pages clubs vérifiés
6. Parrainage avancé
7. Tournois inter-crews
8. Matchmaking social
9. Rivalités automatiques
10. Share cards sorties contestées
```

---

# PARTIE F — PROMPT CLAUDE CODE

```md
Tu es Lead Product Designer + Game Designer + Mobile Architect.

Implémente la couche sociale et communautaire de GRYD.

## Objectifs
- Permettre aux utilisateurs d’ajouter facilement des amis.
- Créer des profils joueurs forts avec photo, @handle, niveau, crew, badges et rang.
- Créer une vraie couche de recrutement crew.
- Permettre aux crews de recruter, accepter, refuser, inviter et gérer des membres.
- Ajouter Crew Discovery, crew feed, chat crew simple et sorties collectives.
- Gérer les runs groupés entre personnes de crews différents sans bloquer le social et sans permettre le farm.
- Créer les modes Conquête, Social Run, Course privée, Race Mode et Event Run.
- Ajouter privacy, anti-spam et blocage/signalement.

## Pages à créer
- Profil joueur
- Amis
- Crew Discovery
- Candidatures crew
- Sorties crew
- Public Profile Web
- Public Crew Page
- Crew Feed
- Chat Crew

## Règles de runs groupés
- Même crew : capture collective plafonnée.
- Crews différents : mode contesté.
- Égalité : pas de vol automatique.
- Run club public : Social Run / Event Run.
- Course officielle : Race Mode, capture limitée ou désactivée.
- Collusion : bonus réduit, review possible.
- Vie privée : option course privée / sans territoire.

## Contraintes
- Pas de position live publique.
- Pas de trace précise par défaut.
- Pas de données santé publiques.
- Pas de suggestion sociale creepy.
- Pas de spam recrutement.
- Respecter blocage et signalement.
- Le social doit servir la conquête, pas devenir un feed généraliste.
```

---

# Conclusion

GRYD doit renforcer fortement la couche sociale.

Mais le bon angle n’est pas :

```txt
GRYD devient un réseau social de running.
```

Le bon angle est :

```txt
GRYD devient une communauté de crews qui recrutent, courent, attaquent, défendent et progressent ensemble.
```

Règle finale :

```txt
Chaque runner a un profil.
Chaque crew a une identité.
Chaque sortie peut devenir une action collective.
Chaque conquête peut devenir un contenu viral.
```
