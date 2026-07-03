# PROMPT — GRYD — ARCHITECTURE DES PAGES, UX ET FRICTION MINIMALE

## Contexte produit

Tu es un **Head of Product Mobile + Lead UX/UI + Game Designer senior** spécialisé dans les applications mobiles virales, les jeux de territoire, les apps de running, les boucles communautaires et les économies freemium.

Je construis **GRYD**, une app mobile de conquête de territoire par la course à pied.

Concept :
- L’utilisateur court dans sa ville.
- Sa trace GPS capture des hexagones sur une carte réelle.
- Les joueurs peuvent rejoindre des **crews**.
- Les crews cumulent leur territoire.
- Les autres crews peuvent reprendre les zones.
- Le jeu fonctionne par saisons.
- L’objectif est de créer une boucle : **courir → capturer → défendre → se faire voler → revenir courir → partager**.

Nom public : **GRYD**  
Baseline : **Cours. Capture. Défends.**  
Positionnement : **Le jeu de conquête de territoire pour run clubs.**

## Références à utiliser

Inspire-toi de :
- **Uber** pour la carte : interface minimale, carte centrale, action principale évidente.
- **Clash of Clans / Supercell** pour la progression, la lisibilité de l’économie, les récompenses, les boucles communautaires et le sentiment d’attachement.
- **Strava** pour la crédibilité running.
- **Risk / jeu de conquête** pour le territoire.
- **Apps sociales modernes** pour le partage 9:16 vers Instagram/TikTok.

Ne copie pas les écrans. Transpose les principes.

## Direction UI

L’app doit être :
- mobile-first ;
- dark-first ;
- très simple en surface ;
- profonde dans la progression ;
- immédiatement compréhensible ;
- utilisable pendant l’effort ;
- pensée pour créer des captures d’écran et des stories virales.

Charte :
- fond noir profond ;
- surfaces carbone ;
- texte blanc/gris ;
- accent unique chartreuse `#B4FF0D` ;
- un seul CTA primaire chartreuse par écran ;
- gros chiffres ;
- carte façon radar de nuit ;
- design premium, sportif, gaming, urbain.

## Objectif de ta mission

Crée l’architecture complète des pages de l’application GRYD.

Tu dois définir :
1. Les onglets principaux.
2. Les pages obligatoires.
3. Les sous-pages.
4. Le contenu exact de chaque page.
5. Les CTA.
6. Les états vides.
7. Les moments de monétisation.
8. Les moments de partage social.
9. Les interactions communautaires.
10. Les règles pour réduire la friction au maximum.
11. Les priorités MVP / V1 / V2.
12. Les éléments à ne surtout pas créer maintenant.

Le résultat doit être directement exploitable par une équipe produit/design/dev.

---

# Contraintes absolues

## Friction minimale

L’utilisateur doit pouvoir faire sa première course avec le minimum d’étapes.

Parcours cible :
1. Ouvrir l’app.
2. Comprendre la promesse.
3. Se connecter avec Apple/Google.
4. Choisir sa ville.
5. Rejoindre ou créer un crew.
6. Activer la zone privée.
7. Activer le GPS.
8. Appuyer sur **COURIR**.

Pas de formulaire long.  
Pas de tuto interminable.  
Pas de complexité avant la première capture.

## Navigation principale

Propose une navigation avec **5 onglets maximum** :

1. Carte
2. Crew
3. Classement
4. Boutique
5. Profil

Le bouton **COURIR** doit être l’action centrale permanente, idéalement flottante au-dessus de la navigation.

## La carte est le produit

La page Carte est la home.

Elle doit afficher :
- la ville ;
- la position de l’utilisateur ;
- son territoire ;
- le territoire de son crew ;
- les territoires adverses ;
- les zones neutres ;
- les zones verrouillées ;
- les zones protégées ;
- les zones contestées ;
- le bouton **COURIR** ;
- un résumé minimal : territoire, rang crew, menace actuelle.

La carte doit être aussi claire qu’Uber : peu de boutons, beaucoup de lisibilité.

## Communauté obligatoire

GRYD doit être crew-first.

La page Crew doit inclure :
- vue d’ensemble ;
- chat crew ;
- membres ;
- objectifs ;
- offensives ;
- zones contestées ;
- invitation en 1 tap ;
- messages automatiques du système.

Le chat ne doit pas être un Discord complet. Il doit servir à coordonner les courses et créer de la vie.

## Progression obligatoire

GRYD doit avoir :
- niveaux joueur ;
- titres ;
- badges ;
- XP ;
- progression saison ;
- récompenses ;
- collection ;
- historique ;
- statut visible sur le profil.

Même si la carte reset à chaque saison, le joueur doit conserver :
- niveau ;
- badges ;
- skins ;
- titres ;
- posters ;
- historique ;
- réputation.

## Partage social obligatoire

Après chaque course, l’app doit générer une carte de partage 9:16 avec :
- carte stylisée ;
- territoire gagné ;
- chiffre héros ;
- crew ;
- ville/quartier ;
- QR/deep link ;
- branding GRYD.

Le partage doit être en 1 tap vers Instagram/TikTok.

## Vie privée obligatoire

Prévoir :
- zones privées activées par défaut ;
- jamais de position live d’autrui ;
- jamais de trace publique détaillée ;
- option de masquer domicile/travail ;
- export/suppression compte ;
- explication claire des permissions GPS/HealthKit.

---

# Pages attendues

Tu dois structurer au minimum les pages suivantes.

## 1. Onboarding

Définis :
- écran promesse ;
- choix ville ;
- connexion Apple/Google ;
- choix crew ;
- création/rejoindre crew ;
- zone privée ;
- permission GPS ;
- arrivée sur la carte.

Pour chaque écran, donne :
- objectif ;
- texte principal ;
- CTA principal ;
- CTA secondaire ;
- friction à éviter ;
- événement analytics.

## 2. Carte / Home

Définis :
- layout complet ;
- composants ;
- états de carte ;
- interactions sur les hexes ;
- bottom sheet zone neutre ;
- bottom sheet zone ennemie ;
- bottom sheet zone à soi ;
- CTA contextuels ;
- affichage des menaces ;
- bouton COURIR ;
- accès aux notifications.

## 3. Course en direct

Définis :
- stats visibles ;
- carte live ;
- feedback haptique/visuel ;
- capture d’hexes en live ;
- état GPS faible ;
- état hors zone ouverte ;
- bouton stop protégé ;
- auto-save ;
- pause/annulation ;
- accessibilité pendant l’effort.

## 4. Résultat de course

Définis :
- animation post-course ;
- chiffre héros ;
- gains ;
- XP ;
- Foulées ;
- hexes gagnés ;
- hexes volés ;
- hexes défendus ;
- artefacts/fragments ;
- streak ;
- CTA partage ;
- CTA retour carte ;
- moment de proposition Starter Pack ou Pass.

## 5. Partage social

Définis :
- formats ;
- templates ;
- textes générés automatiquement ;
- deeplink ;
- QR ;
- variants gratuits/premium ;
- comment créer de la viralité locale.

## 6. Crew

Définis les sous-onglets :
- Vue d’ensemble ;
- Chat ;
- Membres ;
- Guerre / Offensives.

Pour chacun, donne :
- contenu ;
- CTA ;
- messages automatiques ;
- actions leader ;
- actions membre ;
- états vides.

## 7. Classements

Définis :
- classement joueurs ;
- classement crews ;
- classement quartiers ;
- classement saison ;
- classement centré sur l’utilisateur ;
- comparaison avec le rang supérieur ;
- CTA pour courir.

## 8. Boutique

Définis :
- Club ;
- Pass ;
- Artefacts ;
- Skins ;
- Packs ;
- Éclats ;
- Offres contextuelles.

Attention :
- ne pas vendre les hexes ;
- ne pas vendre les points de classement ;
- ne pas créer de pay-to-win.

## 9. Progression / Skills

Définis :
- niveaux joueur ;
- XP ;
- titres ;
- branches de skills ;
- conquête ;
- défense ;
- crew ;
- récompenses ;
- ce qui est gratuit ;
- ce qui peut être premium.

## 10. Profil

Définis :
- header profil ;
- avatar ;
- niveau ;
- crew ;
- badges ;
- stats ;
- collection ;
- historique ;
- posters ;
- titres ;
- paramètres rapides.

## 11. Inbox / Notifications

Définis :
- vol subi ;
- decay ;
- offensive crew ;
- récompense ;
- saison ;
- streak ;
- CTA de reprise ;
- règles anti-spam ;
- quiet hours.

## 12. Réclamer / Import HealthKit

Définis :
- liste des courses détectées ;
- aperçu du territoire réclamable ;
- CTA réclamer ;
- états d’erreur ;
- permissions ;
- import différé ;
- logique Apple Watch.

## 13. Paramètres

Définis :
- compte ;
- ville ;
- privacy zones ;
- notifications ;
- HealthKit ;
- confidentialité ;
- support ;
- suppression/export données ;
- CGU.

## 14. Admin interne

Définis :
- dashboard courses suspectes ;
- utilisateurs flaggés ;
- crews problématiques ;
- achats ;
- signalements ;
- villes waitlist ;
- zones ouvertes ;
- analytics ;
- génération posters.

---

# Format de réponse attendu

Réponds en français avec une structure claire :

1. Résumé de la logique UX.
2. Navigation finale.
3. Tableau des pages avec priorité P0/P1/P2.
4. Détail de chaque page.
5. Parcours utilisateur principaux.
6. Règles de friction minimale.
7. Événements analytics à tracker.
8. Ce qu’il faut couper du MVP.
9. Prompt technique pour Claude Code / Cursor à la fin.

Pour chaque page, utilise ce format :

```md
## Page : [Nom]

### Objectif
...

### Priorité
P0 / P1 / P2

### Contenu visible
...

### CTA principal
...

### CTA secondaires
...

### États vides
...

### Moments de monétisation
...

### Moments de partage
...

### Analytics
...

### Notes dev
...
```

---

# Niveau de détail attendu

Sois très concret.

Évite les généralités du type :
> “Créer une bonne expérience utilisateur.”

Dis plutôt :
> “Le bouton COURIR est un disque chartreuse de 72 px, flottant bas-centre. Il reste visible sur la carte sauf pendant l’affichage d’une bottom sheet critique.”

Je veux pouvoir transmettre ta réponse directement à :
- un designer Figma ;
- un développeur React Native/Expo ;
- Claude Code ;
- un associé produit ;
- un investisseur.

---

# Décision finale à produire

À la fin, donne :
1. Le MVP exact à créer en premier.
2. Les pages à créer dans les 14 premiers jours.
3. Les pages à créer dans la V1 native.
4. Les pages à repousser après validation.
5. La liste des 10 erreurs UX qui tueraient GRYD.
