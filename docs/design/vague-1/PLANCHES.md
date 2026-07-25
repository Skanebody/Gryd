# Planches Vague 1 — transcription de référence (E01 → E21)

**Pourquoi ce fichier.** Les planches Claude Design sont des IMAGES, et la copie locale
`planches.html` est tronquée à 256 KiB (E01-E07 seulement). Cette transcription fige la
**composition, l'ordre, la copie exacte et les règles** de chaque écran pour que le recalage
soit possible sans re-fournir les captures.

## Loi de lecture (rappel, au-dessus de la planche)

Les planches sont des **maquettes**. Toutes leurs VALEURS sont des placeholders :
« Nina M. », « Léa R. », « NIGHT OWLS », « Dieppe », « Saint-Rémy », « 1,84 km² »,
« 6,2 km² », « 14 membres », « Niveau 12 », « 2 340/3 000 XP », « #4 », « 24,6 km »,
« +18 % », « 8/24 », « 42 courses », « 900 m · 6 min ».
→ On reproduit **composition + hiérarchie + DA**. On remplit avec le **réel câblé**, sinon
**état vide honnête** (4 états distincts : pas connecté / vide / échec / lecture en cours).
Aucun bouton mort. 1 CTA chartreuse max. Couleurs par RÔLE.

---

## E01 — Onboarding · Promesse de conquête (P0)
Photo plein écran (60-68 % hauteur) + calque carto. « Passer » en haut à droite.
Territoire chartreuse ≈ 8 % de la surface, label « VOTRE RUE ».
Bas : titre display 40 « **COURS.** / **PRENDS TA VILLE.** » (capitales, ≤ 4 mots, 2 lignes max) ·
sous-titre 16/22 « Chaque boucle fermée peut devenir votre territoire. » (≤ 90 car.) ·
CTA 56 pt « CONTINUER » · indicateur 5 étapes discret SOUS le CTA.
**Motion** : entrée fondu 320 ms, la ligne chartreuse du logo devient le contour du territoire ;
sortie = le tracé « continue » vers l'écran Boucle. Reduce Motion : fondus simples, territoire statique.
Haptique : aucune (écran calme).
**Interdits** : carrousel de cards, téléphone flottant, pavé de texte, gradient décoratif.
**Longueurs** : EN « RUN. TAKE YOUR CITY. » · ES « CORRE. TOMA TU CIUDAD. » (≤ 24 car.).

## E02 — Home Map · Nouveau joueur (P0, racine)
Header : avatar 40 + pill lieu (point chartreuse + « ville · quartier ») + cloche notifs ·
3 cibles ≥ 44 pt séparées · capsule carte ≤ 3 actions à 35 % hauteur (recentrer, calques).
Carte : position joueur à 44 % · **boucle de mission en trait POINTILLÉ chartreuse** + label « 900 M ».
Sheet compacte **29 %** (drag → 52 % / 90 %), poignée visible : kicker « PREMIÈRE MISSION » ·
titre « Votre première zone vous attend » · « Fermez une boucle autour de votre rue. » ·
métriques « 900 m » / « ≈ 6 min » (24 pt tabulaires).
**CTA RUN à deux états** : pill 60 pt (sneaker + « RUN ») au-dessus de la nav quand la sheet est
FERMÉE ; replié en **bouton rond 60 pt sneaker seule, ancré à droite du bloc mission** quand la
sheet est DÉPLOYÉE (le pouce retrouve toujours le rond à droite). Jamais de CTA dupliqué dans la sheet.
Nav : Carte · Crew · Profil.
**États critiques** (les 4, distincts) : position indisponible (barre ambre non bloquante, CTA
indisponible + explication, actions RÉESSAYER / OUVRIR LES RÉGLAGES / VOIR LA CARTE) · hors ligne
(carte cache + pill « Hors ligne ») · permission refusée (carte lecture seule centrée ville déclarée,
sheet pédagogique + CTA AUTORISER LA LOCALISATION) · chargement (fond de carte d'abord, territoires
ensuite, skeleton dans la sheet — **aucun spinner plein écran**).

## E03 — Home Map · Joueur actif (P0)
Mon territoire : **chartreuse 15 % + halo interne + label** (ex. PORT OUEST). Crew voisin : **bleu
désaturé sans halo**. Rival prioritaire : **orange, UN SEUL**, label court au zoom pertinent.
Pill de contexte UNIQUE « 1 zone à reprendre » (point orange) — **disparaît après 5 s**, tap → cadre
la zone. Aucun carrousel.
Sheet : « VOTRE TERRITOIRE » + **1,84 km²** (48 pt) + « ▲ +8 % cette semaine · #4 dans votre quartier »
+ bouton rond RUN à droite.
Badge notifications 6 pt orange = événement territorial.
**Zone contestée** : violet + hachures + mouvement lent.

## E04 — Territoire rival · Zone à reprendre (P0, tap sur zone)
La zone tapée passe en contour orange 100 %, la caméra la cadre **au-dessus** du sheet (spring 300 ms),
sheet à **52 %**. Un sheet = UNE décision.
Contenu : kicker « REPRISE » + « Quartier Saint-Rémy » + ✕ ·
propriétaire = avatar + « Nina M. » + « NIGHT RUNNERS » + « Tenu depuis 6 jours » (fait neutre) ·
**3 métriques à séparateurs** (jamais 6) : « 0,42 km² surface » | « ≈ 3,1 km effort estimé » |
« 2 h dernière activité » · historique en **1 ligne** : « Zone reprise 2 fois ce mois · la défense a
expiré. » · CTA « REPRENDRE » + action tertiaire « Planifier pour plus tard ».
La pill RUN **disparaît** tant qu'un sheet de décision est ouvert (un seul CTA primaire).
**Variantes** : zone protégée (liseré bleu, CTA indisponible + échéance) · contestée (violet, CTA
« VOIR LA MISSION ») · propriétaire privé (identité masquée « Un coureur de NIGHT RUNNERS »).
**Jamais de position live.** Ton compétitif, jamais humiliant.

## E05 — Briefing de mission (P0)
Sheet **58 %**, carte visible derrière. Kicker « REPRISE » + « Reprenez Saint-Rémy » + ✕.
Mini-carte du **tracé recommandé dessiné en ≤ 450 ms** + bouton « Ajuster » (→ planificateur, sheet 90 %).
**4 métriques MAX dans UN SEUL bloc à séparateurs** (jamais 4 cards) : « 4,2 km distance estimée » |
« ≈ 26 min durée estimée » | « +0,42 km² gain potentiel » | « Modérée difficulté ».
Une phrase de valeur tactique, langage neutre : « Cette boucle relie vos deux zones du centre. »
CTA « COMMENCER LA MISSION » + microtexte « Le GPS démarre après le compte à rebours. »
Option « Sans itinéraire » en tertiaire dans le planificateur. Bike absent (feature flag).

## E06 — Préflight + décompte (P0) — ✅ FAIT
Décompte 3-2-1 chartreuse, « Annuler » masqué sur la dernière marche, haptique crescendo.

## E07 — Live Run · Conquête (P0)
**Courir sans manipuler le téléphone.** Hiérarchie : 1 tracé · 2 fermeture · 3 distance restante ·
4 temps/allure · 5 pause.
Header : **3 métriques ≥ 24 pt tabulaires** « 12:38 TEMPS | 2,6 km DISTANCE | 6:05 ALLURE » +
pill d'état « ● Boucle ouverte · 320 m à fermer » (→ « Plus que 180 m » à l'approche).
Carte **dominante 100 %**, position à 62 % (espace devant), tracé plein **4 px**, rues secondaires
réduites, navigation masquée. La **fermeture est représentée SUR LA CARTE** (segment pointillé) +
barre de progression + « 72 % ».
Contrôles bas : verrou · **Pause au centre (cercle 60 chartreuse)** · son. « Terminer » vit DANS la Pause.
**L'itinéraire conseillé est purement indicatif** : la capture est calculée sur la boucle réellement
fermée, jamais sur le respect du tracé. En course libre, aucun pointillé n'est affiché.
Alertes : hors tracé (contraste réduit + flèche + « Rejoignez le tracé », jamais rouge) · rival
(secteur orange + libellé, aucune position exacte) · GPS faible (pill ambre + tracé incertain pointillé).
Texte ≤ 45 caractères, zéro carrousel, aucune animation complexe pendant la course.

## E08 — Fermeture & capture (P0, NOUVEAU) — séquence 900-1100 ms
**Pas de modale, pas de confettis** : la carte réelle s'assombrit, la zone se remplit comme une **encre
cartographique**, le contrôle revient.
0-150 ms le contour se ferme + impulsion lumineuse au point de fermeture · 150-550 ms la surface se
remplit depuis ce point (texture topo brève à 28 %) · 550-700 ms le NOM apparaît (« SAINT-RÉMY REPRIS »)
+ haptique ferme + son court · 700-900 ms le gain « +0,42 km² » s'affiche · 900-1100 ms tout se réduit
en **badge persistant 6 s** et retour au live. **Skippable au tap.**
**Variantes** : première capture → « Votre premier territoire. » · reprise → mouvement orange →
chartreuse sur le contour · capture crew → contour couleur crew + « Capturé pour NIGHT RUNNERS » ·
zone trop petite / chevauchement invalide → **pill explicative calme, pas de victoire** ·
capture partielle → seule la surface valide se remplit, le reste en pointillé.
**Échec** (boucle non fermée) : pill ambre factuelle « Boucle non fermée · 84 m manquants », segment
manquant en pointillé ambre, **la course continue**. Jamais l'animation de victoire, jamais de rouge.
Sécurité : si vitesse élevée, la séquence se réduit à une pill. Reduce Motion = fondu ≤ 400 ms sans remplissage.

## E09 — Résultat de course (P0)
**L'impact territorial AVANT les métriques sportives.** Ordre IMMUABLE : territoire → progression →
statistiques → partage.
Hero carte **44 %** avec bascule « Avant ⇄ Après » (glissement horizontal ou press-and-hold, caméra et
zoom strictement identiques).
Kicker « ZONE REPRISE » + « Vous avez repris Saint-Rémy » + **« +0,42 km² »** (chiffre héros) +
« 3 zones reliées · #3 du quartier ».
**4 stats en UN bloc** : « 4,3 km distance | 27:12 durée | 6:19 allure /km | 48 m dénivelé ».
Ligne « Rang local » + barre + « +120 XP » · « Contribution crew : NIGHT OWLS +0,42 km² ».
CTA « PARTAGER » + secondaire « DÉFIER UN RIVAL » + tertiaire « Terminer ».
Motion narrative < 1,8 s, **skippable au tap** : hero → zone finale → chiffre → rang/XP → PARTAGER actif.
**Variante sans capture** : hero centré sur l'EFFORT + raison factuelle (« Il manquait 84 m pour
capturer Saint-Rémy. La boucle reste disponible dans vos Missions. ») + « +45 XP · l'effort compte,
même sans capture. » CTA contextuel « RETOUR À LA CARTE » + « RÉESSAYER LA BOUCLE ». **Jamais un hero
territorial vide ni un ton d'échec.**

## E10 — Story · Partage territorial (P0)
Compositeur : preview du média **exporté** (= ce qui sera publié) + rangée de modes narratifs
**Auto · Impact · Photo · Avant/Après · Plus** (Plus ouvre Crew, Performance, Classement, Minimal,
Sticker, Replay). Le moteur CHOISIT le récit selon l'événement dominant
(capture > reprise > défense > boucle > crew > classement > record) ; l'utilisateur change le STYLE,
jamais l'histoire. « Pourquoi ce style ? Tu as repris une zone contestée. » + « Personnaliser ».
UN CTA « PARTAGER LA STORY » + rangée Instagram · TikTok · WhatsApp · Plus.
Formats 9:16, 4:5, 1:1, **sticker PNG transparent** (« Copier le sticker » / PNG) — la carte est
recalculée par ratio, le territoire n'est **jamais coupé**.
**Replay conquête 6-8 s** : 0-0,8 contexte · 0,8-3,5 tracé · 3,5-4,5 fermeture · 4,5-5,8 remplissage ·
5,8-7,5 résultat + CTA · frame finale partageable sans son.
**Confidentialité AVANT rendu** : trace brute → masques départ/arrivée (≥ 200 m) → zones privées
exclues → heure exacte supprimée → simplification → rendu. Badge « Protégé » permanent.
**Le handle du rival n'apparaît QU'AVEC consentement.** Activité privée : partage non traçable ou photo
uniquement. Règle : 1 tap = partager la version recommandée.

## E11 — Classement local (P1)
Ordre imposé : **autour de moi → quartier → ville → amis → crew**. Le MONDE est caché dans un niveau
secondaire. **L'objectif affiché est toujours le joueur juste au-dessus.**
Barre « ‹ Classement » + sélecteur de période « Semaine ▾ ». Chips 36 pt scrollables.
**Podium 3** (photos rondes) : #2 gauche · **#1 centre et plus grand** (or) · #3 droite. Fond carto local 35 %.
**Ma ligne STICKY et surlignée** : « #4 [avatar] Vous · 1,84 km² » + barre + « 0,12 km² pour passer #3 ».
Liste : rang · avatar · prénom · crew · km² · variation « ▲2 / — 0 / ▼1 » (icône + texte, jamais la
couleur seule). Chartreuse = MA ligne uniquement ; or = #1 uniquement.
Onglet **Crews** : ligne de mon crew sticky « #2 NIGHT OWLS · votre crew · 14 membres · 6,2 km² » +
« 1,7 km² pour passer #1 ».
**Psychologie** : jamais de comparaison impossible ; un nouveau joueur ne voit JAMAIS « 22 000 km² /
Vous : 0 km² ». Célébrer la progression, jamais de différence caricaturale.
États : nouveau joueur (ligue de départ, pas de podium géant) · égalité · hors ligne (dernier snapshot
+ horodatage) · fin de semaine (gel + décompte).

## E12 — Saison & rang (P1)
« ‹ Saison 3 » + « Se termine dans 18 j ».
Card rang : **bouclier** + « Argent II » + « Rang local · Run » + barre + « 2 340 / 3 000 XP » +
« Prochain jalon : Argent I · cadre de profil chrome ».
« RÉCOMPENSES DE SAISON » = frise verticale de 4 paliers (icône + libellé + statut) :
Bronze · badge de saison acier (✓ Obtenu) · Argent · trail chartreuse sur la carte (✓ Obtenu) ·
Titane · emblème animé de capture (« Atteignez Or III ») · Or · cadre or limité S3 (« Top 3 du quartier
en fin de saison »). **La rareté vient du MATÉRIAU** (acier → chrome → titane → or), jamais du clinquant.
Règles du reset AFFICHÉES : « vos territoires et badges restent acquis ; le rang repart en ligne de
départ. Les récompenses sont **cosmétiques — jamais un avantage de capture**. »
**Moment « passage de rang »** (≤ 1,4 s, skippable) : anneau qui se complète + « NOUVEAU RANG » +
« ARGENT I » + « Débloqué : cadre de profil chrome » + CONTINUER + « Voir la saison ».
Run et Bike ont des rangs SÉPARÉS. Thème de saison discret (pas de recoloration de l'interface).

## E13 — Crew Home (P0/P1)
**Un quartier général visuel, pas un chat avec une bannière.**
Hero photo 240 pt + emblème 72 + « NIGHT OWLS » + « @nightowls » + « ville · #2 local · 6,2 km² ·
14 membres ». Segmented **Aperçu | Carte | Membres** (le chat est un bouton séparé en P2,
**jamais un 4e onglet**).
« OBJECTIF DU JOUR » (point focal) : mini-carte + « Relier le port aux falaises » + barre **64 %** +
« Votre part : 0,42 km² » + « VOIR LA MISSION › ».
« TERRITOIRE » + « Ouvrir la carte crew › » : aperçu horizontal + « ▲ +0,8 km² cette semaine » +
marquage « 1 zone vulnérable ».
« ACTIVITÉ » : **3 événements MAX, agrégés** (« Awa a capturé Quai Sud · 08:12 » · « 3 zones défendues
ce matin · 07:40 » · « Jules a rejoint le crew · hier ») + rangée d'avatars + « Membres › ».
**État vide (nouveau crew)** = **plan d'action en 3 étapes, jamais un dashboard vide** :
« Votre premier territoire crew » / « Trois boucles fermées dans le même quartier créent votre zone
commune. » / CTA « LANCER LA PREMIÈRE MISSION » / « POUR BIEN DÉMARRER » : 1 Invitez 2 coureurs
(Inviter ›) · 2 Choisissez votre emblème et couleur (Éditer ›) · 3 Fermez 3 boucles (0/3).
Identité crew = accent + emblème + photo ; **le fond reste GRYD**. Sur la carte la couleur crew reste
DÉSATURÉE face à la chartreuse du joueur. Membres inactifs **jamais humiliés**.

## E14 — Commutateur Run / Bike (P1/P2, composant global) — NOUVEAU
**Pas d'écran de choix** : un petit commutateur (40 pt) en haut à droite, présent sur Carte (E02/E03),
Classement (E11), Historique, Profil-stats (E18). **Visible seulement si Bike est activé** ; masqué
sinon (jamais grisé). **Verrouillé pendant une course.**
Un tap = bascule immédiate de TOUT le contexte (territoires, missions, classements, CTA), 180 ms,
haptique légère, aucune confirmation — sauf mission en préparation (E05/E06 ouverts) :
« Changer d'activité abandonne cette mission ». Choix mémorisé par onglet.
Première bascule : « Votre carte Bike commence ici », jamais un écran vide.
**Séparation stricte** : jamais Run + Bike dans une même lecture compétitive ; crews hybrides =
deux métriques côte à côte, **jamais sommées**.

## E15 — Profil joueur (P0)
**La carte de visite territoriale, pas un tableau de statistiques.**
Hero photo 210 pt + « Modifier » en haut à droite. Avatar avec anneau + pastille « NIV. 12 » +
« Léa R. » + « @lea.runs » + « NIGHT OWLS · Dieppe · #4 » + **badge de visibilité** (bouclier + « Crew »,
lié à Confidentialité).
**4 métriques MAX** en un bloc : « 1,84 km² surface contrôlée » (la mise en avant) | « 6 zones » |
« 3 défenses » | « 128 km saison ».
« CARTE SIGNATURE » 164 pt + « Voir ma carte › ». Progression : bouclier + « Niveau 12 · Argent II » +
« 2 340 / 3 000 XP » + « Saison › ».
Previews en lignes scannables : « Hier · reprise de Saint-Rémy +0,42 km² › » · « Badges · 8 › » ·
« Historique des courses · 42 › ». **Les collections complètes vivent dans leurs pages.**
**Profil public (vu par un rival)** : même squelette, contenus filtrés — « … » (signaler/bloquer),
**DÉFIER** + **Suivre** remplacent « Modifier », « surface publique | zones | vos confrontations 2 – 3 »,
« TERRITOIRE PUBLIC · CONTOURS GÉNÉRALISÉS », badge « **Jamais de position live** », « Badges publics · 12 ».
États : sans crew (→ « Trouver un crew ») · sans photo (avatar généré) · profil privé (page réduite +
explication) · **nouveau joueur : métriques remplacées par la première mission, jamais des zéros**.

## E16 — QR codes (P1) — NOUVEAU
**Connecter deux joueurs qui se croisent dans la vraie ville en 2 secondes.**
« ‹ Mon code » + partage. Segmented **Mon code | Scanner**.
La **carte QR est le seul élément CLAIR de l'écran** (fond blanc) : avatar + nom + « @handle · ville » +
QR **noir sur blanc** (quiet zone 4 modules, contraste ≥ 4,5:1, lisible à bout de bras) avec le **module
central** en chartreuse (ou couleur crew) = signature discrète + l'URL « gryd.app/lea.runs ».
Sous la carte : « Scannez pour suivre ou défier. » + « Le code n'expose jamais votre position ni vos
zones privées. » CTA « PARTAGER LE LIEN » + « Enregistrer l'image ».
**Variante crew** : emblème + nom + « ville · #rang · N membres » + URL **copiable**
« gryd.app/c/NIGHTOWLS » + « Expire dans 7 jours · 3 places restantes » + « Chaque demande est validée
par un officier. » + « Nouveau code » (invalide l'ancien) + « Contacts ».
**Scanner** : caméra plein écran, viseur carré, torche 44 pt, détection automatique, résultat = sheet
compacte selon le type. **Jamais d'action irréversible au scan.**
Le QR encode un **deep link public** (/profil, /c/, /challenge) — jamais un identifiant interne, jamais
de position. Fonctionne **hors ligne** (généré localement).
⚠️ **Dépendance** : `react-native-qrcode-svg` est présent (Mon code OK) ; **aucune lib caméra** →
le Scanner exige `expo-camera` + permission caméra (impact App Store). À arbitrer.

## E17 — Boutique & Premium (P1/P2)
**Vendre du STATUT, jamais de la capacité.** Cosmétiques uniquement (avatars, emblèmes, trails, cadres,
templates) + un premium d'ANALYSE.
Boutique : hero saisonnier « SAISON 3 · HIVER — Collection Night Print · Disponible jusqu'à la fin de
saison · 18 j » + chips (Trails, Cadres, Emblèmes, Avatars, Templates) + grille 2 colonnes
(aperçu réel dans le contexte GRYD, prix en euros, propriété claire : Permanent / Saison / Possédé).
Note permanente : « **Cosmétique uniquement. Aucun achat ne donne un avantage de capture, de défense
ou de classement.** »
Paywall Premium : **hero = vraie heatmap territoriale du joueur** (90 jours) + titre « GRYD Premium » +
« Comprenez votre territoire. Jamais un avantage de capture. » + **3 bénéfices MAX** (tendances
territoriales et temps de contrôle · comparaison de saisons et zones vulnérables · planification avancée
de boucles + Replay 2.5D) + 2 prix visibles (Annuel 39,99 €/an « soit 3,33 € par mois » · Mensuel
4,99 €/mois sans engagement) + CTA « ESSAYER 7 JOURS » + « Restaurer les achats » · « Conditions ».
**Interdits absolus** : vendre capture, distance, défense, position live d'un rival, rang ou victoire ;
loot box ; faux rabais ; confidentialité payante. **Free = publiable. Premium = statutaire.**
Aucun achat accessible pendant une course.

## E18 — Statistiques & data (P1)
**Un écran d'analyse, pas un dashboard SaaS.** 3 blocs, grammaire identique :
**chiffre → graphique → conclusion en langage naturel**.
« ‹ Statistiques » + commutateur Run/Bike. Chips « Semaine | Mois | Saison ».
1. « VOLUME D'ACTIVITÉ » : « 24,6 km » + « ▲ +18 % vs semaine dernière » + 7 barres (une seule en
   chartreuse) + « Samedi est votre meilleur jour — 3 de vos 4 captures y ont eu lieu. »
2. « PROGRESSION TERRITORIALE » : « 1,84 km² » + « ▲ +0,42 cette semaine » + courbe + « Aucune perte de
   zone depuis 12 jours — votre plus longue série de contrôle. »
3. « RÉGULARITÉ » : « 3 courses / sem. en moyenne » + rangée de carrés + « 4 semaines consécutives avec
   au moins 2 sorties. »
Pied : « Analytics territoriales détaillées (heatmap, temps de contrôle) — Premium › ».
**Règles graphiques** : 2 couleurs max (chartreuse = ma série, gris = contexte) ; gridlines quasi
invisibles ; labels directs ; barres/aires/heatmap SEULEMENT — **pas de radar, pas de donut décoratif** ;
tooltips au tap accessibles VoiceOver.
États : données insuffisantes → « Courez 2 fois pour vos premières tendances » (**jamais un graphique
vide**) · semaine sans course (jours gris, ton neutre) · hors ligne (dernier calcul + horodatage).
Premium (écran séparé) : heatmap « temps de contrôle par zone » + « 31 j contrôle moyen | +0,9 km²
gain 90 j | −0,3 km² pertes 90 j | Port O. plus défendue » + « À SURVEILLER » (frontière nord →
Défendre › · défense qui expire → Planifier ›). **N'expose aucune donnée privée d'un rival et ne donne
jamais un avantage de capture.**

## E19 — Collection de badges (P1) — ✅ grille 3 colonnes faite
**Des objets premium, pas des autocollants.** Familles reconnaissables par **silhouette** (Conquête,
Défense, Exploration, Crew, Saison) ; **rareté exprimée par le MATÉRIAU** (acier → chrome → titane → or) ;
verrouillés = **silhouette pointillée + condition en clair** (« Reliez 5 zones voisines »), opacité 60 %,
**jamais de cadenas massif**. Tailles 24/48/96 pt + hero. Compteur « 8 / 24 » par famille, jamais de %
global culpabilisant.
Tap → détail : animation légère, description, date, rareté (« 2 % des joueurs de Dieppe »), partage vers
E10 (le badge devient un template story). Le saisonnier est daté (S2) et **jamais réédité**.
**Déverrouillage rare** (écran dédié, ≤ 1,4 s, skippable) : badge en grand + « BADGE RARE DÉBLOQUÉ » +
« Invaincu 30 jours » + « Aucune zone perdue entre le 25 juin et le 25 juillet. » + « Titane · possédé
par 2 % des joueurs de Dieppe » + « AJOUTER AU PROFIL » + Partager · Continuer.
Les badges COURANTS apparaissent en carte intégrée au résultat de course, **jamais en écran bloquant**.

## E21 — Édition · Profil & identité de crew (P0/P1) — ✅ moitié PROFIL faite
**Aperçu-first** : on voit ce qu'on devient AVANT d'enregistrer. Champs 56 pt, labels persistants,
validation inline, **la visibilité renvoie à Confidentialité** (au lieu de 5 toggles dupliqués).
Profil : Aperçu · Nom d'affichage · Handle (✓ disponible) · Ville de jeu · Bio facultative (34/120) ·
« Afficher mon crew » · « Visibilité du profil → Crew › » + « Les réglages de visibilité vivent dans
Confidentialité — un seul endroit. » **6 contrôles.**
**Identité de crew (chef/officiers, NON FAIT)** : bannière (« Changer la bannière ») · emblème
(bibliothèque modulaire 12 silhouettes × 24 symboles, lisible à 24 pt) · **couleur = palette validée
uniquement** (pas de roue libre qui dégraderait la carte) · Accès **Public / Sur demande / Privé** ·
prévisualisations (carte, profil, leaderboard, story) · modification du tag = confirmation (les liens @
existants sont redirigés 30 j).
⚠️ `app/crew-edit.tsx` est un **stub redirect** : l'édition réelle exige une RPC serveur rôle-gated
qui n'existe pas (O1).
