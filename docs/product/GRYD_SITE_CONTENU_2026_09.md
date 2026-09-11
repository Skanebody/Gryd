# Gryd, le site public : plan du site et textes (12/09/2026)

Livrable du **LOT W1**. Décision du fondateur, 12/09/2026, en regardant `gryd.run` : « il faut
entièrement remettre tout à jour avec toutes les nouvelles informations de l’application, et un
UI/UX design cohérent avec ce qu’est l’application ; il faut tout refaire de zéro. »

Il est la **source de contenu** de la refonte. Deux autres agents l’implémentent (design system,
pages) ; ni l’un ni l’autre n’invente une phrase, un chiffre ou une promesse qui ne soit pas ici.

**Lu pour l’écrire** : `GRYD_REFONTE_INTEGRALE_2026_09.md` (rang 0), `docs/DECISIONS.md`
(ADR-011 à ADR-019), `docs/STATUS.md` (encarts du 10 au 12/09), `GRYD_DIRECTION_VISUELLE_2026.md`,
`GRYD_PHOTOTHEQUE_2026_09.md`, `GRYD_SITE_GRYD_RUN_2026_09.md`, `apps/mobile/src/features/help/**`
(le guide et sa FAQ), `packages/shared/src/game-rules.ts`, et le site actuel (`apps/web/**`).

**Ce que le site actuel vend et qui n’existe plus** : « GRYD Club », « Founder Pack à vie »,
« monnaie de style », un seuil de 500 inscrits par quartier, un compteur de crews, une liste de
villes d’ouverture. Rien de tout cela ne survit. Les CGU, CGV, la confidentialité et les mentions
légales ont été corrigées au fond le 11/09 (ADR-014) : leurs **textes se gardent au mot près**,
seule leur mise en page change.

---

## 1. Positionnement et promesse

**En une phrase** : Gryd transforme tes sorties en une carte qui t’appartient.

### 1.1 L’accroche retenue, et pourquoi

| Candidate | Origine | Verdict |
|---|---|---|
| « Cours. Ferme ta boucle. Prends le terrain. » | accroche de travail transmise avec le lot | rejetée telle quelle |
| « Cours. Roule. Fais grandir ton terrain. » | cahier §15.1, rang 0 | opposable, mais molle |
| **« Cours ou roule. Ferme ta boucle. Le terrain est à toi. »** | synthèse | **retenue** |

1. **La première efface le vélo.** Le vélo n’est pas une variante de la course : c’est une seconde
   carte, un second jeu de seuils (`TERRITORY_RULES_2026.bike`), une seconde discipline dans les
   défis. Une accroche qui ne dit que « Cours » fait mentir la page dès sa deuxième ligne, et
   ADR-019 vient de passer un lot entier à rendre la discipline honnête à l’arrivée.
2. **La formule du cahier n’explique rien.** « Fais grandir ton terrain » ne dit pas comment. Or
   le geste que Gryd possède en propre, c’est **fermer une boucle** : le taire, c’est jeter le
   seul mot qui n’appartienne à personne d’autre.
3. **La retenue garde le rythme ternaire et le sens** : les deux sports, le geste, la récompense,
   dans l’ordre où ils arrivent. Elle tient sur une ligne à 375 pt.

**Écart assumé** : elle n’est pas mot pour mot celle du cahier, qui est rang 0. Divergence portée
au fondateur (décision n° 3). Tant qu’il n’a pas tranché, la retenue est celle du site.

**Sous-titre du héros** : « Ferme une boucle en courant ou en roulant. La surface à l’intérieur
devient ton terrain sur la carte de ce sport. Ta sortie, elle, reste à toi dans tous les cas. »

---

## 2. Plan du site

### 2.1 Arborescence

| URL | Page | Objectif unique | Indexée |
|---|---|---|---|
| `/` | Accueil | Comprendre en 30 secondes, savoir quoi faire ensuite | oui |
| `/comment-ca-marche/` | Comment ça marche | Les 8 chapitres du guide, ancres par chapitre | oui |
| `/crews/` | Les crews | Rejoindre, créer, gérer, QR, défis | oui |
| `/saison/` | Saison et classements | Saison 0, communes, points, fair-play | oui |
| `/gryd-plus/` | Gryd+ | Contenu de l’offre, prix prévu, non vendable | oui |
| `/securite-et-vie-privee/` | Sécurité et vie privée | Masquage, conservation, anti-triche | oui |
| `/faq/` | Questions fréquentes | Les 13 questions du guide | oui |
| `/telecharger/` | Télécharger | L’état réel, la liste d’attente | oui |
| `/confidentialite/` `/conditions/` `/cgv/` `/mentions-legales/` | Pages légales | Textes du 11/09, inchangés | oui |
| `/callback/` | Retour de connexion | Existante, **ne pas toucher** | non |
| `/c/<code>/` | Rejoindre un crew | Arrivée du lien d’invitation | non |
| `/r/<code>/` | Parrainage | Arrivée du lien de parrainage | non |
| `/u/<pseudo>/` | Profil | Arrivée d’un lien de profil | non |

Les URL portent un **slash final** : `trailingSlash: true` est la seule forme que GitHub Pages
sait servir depuis un dossier.

### 2.2 Les trois pages d’arrivée, et leur contrainte technique

`/c/*`, `/r/*` et `/u/*` sont déclarées dans `apple-app-site-association` : **sur un iPhone où
Gryd est installé, iOS remet ces adresses à l’app et la page web n’est jamais chargée.** Elle
n’existe que pour qui n’a pas l’app. Aujourd’hui ces trois adresses tombent sur le 404 du site.

Un export statique ne pré-génère pas une page par code inconnu. Seule voie sur GitHub Pages :
**`404.html` fait le routage**, lit `location.pathname`, reconnaît les trois préfixes et peint le
contenu ; tout autre chemin garde la vraie 404. Deux conséquences à écrire dans le code : ces pages
répondent en **HTTP 404** (donc `noindex`, zéro SEO), et sans JavaScript elles ne se résolvent pas
(un `<noscript>` dit la vérité et renvoie vers `/telecharger/`).

### 2.3 Navigation et pied de page

**En-tête** : le **logo** (le G chartreuse seul, sans socle, comme sur la carte de l’app depuis
`e9b7d70`), puis **Comment ça marche · Crews · Saison · Gryd+ · Sécurité**, puis l’action
**Télécharger** à droite. Cinq liens plus une action ; au delà, la barre se plie mal. Sur mobile
les cinq liens passent dans un panneau, **Télécharger reste visible**.

**Pied de page**, trois colonnes plus une ligne de bas :
- *marque* : le G chartreuse, « Gryd », puis « Cours ou roule. Ferme ta boucle. Le terrain est à toi. » ;
- *produit* : Comment ça marche · Crews · Saison et classements · Gryd+ · Sécurité et vie privée · Questions fréquentes · Télécharger ;
- *légal et contact* : Confidentialité · Conditions · CGV · Mentions légales · `hey@gryd.run` (`apps/web/lib/legal.ts`, `CONTACT_EMAIL`) · SASU Nexus 1993, 66 avenue des Champs-Élysées, 75008 Paris ;
- *ligne de bas* : « Gryd est réservé aux 16 ans et plus. » (`MIN_AGE_YEARS`, jamais tapé) et « © Nexus 1993 ».

**Retiré du pied actuel** : les ancres `#pricing`, `#warroom`, `#badges`, et « Run the Map.
Première carte officielle : France. » (une carte n’est pas « officielle », et la formule laisse
croire qu’une seconde existe ailleurs).

---

## 3. Les textes, page par page

Convention : `H1` / `H2` sont les titres, `>` le texte à composer, `[ ]` un libellé de bouton.
Les photos sont désignées par leur nom dans `apps/mobile/assets/photos/` ; elles sont **copiées**
dans `apps/web/public/photos/` en gardant leur nom (déjà écrit pour le référencement).

### 3.1 Accueil, `/`

**SEO** · titre `Gryd, cours ou roule et prends du terrain` (41) · description `Ferme une boucle en courant ou à vélo : la surface à l’intérieur devient ton terrain sur la carte. Gratuit, sans achat qui fait gagner.` (135)
**Photo héros** `gryd-duo-sprint-ville-lunettes-chartreuse.jpg` · *alt* « Deux coureurs en plein sprint dans une rue de ville, lunettes chartreuse, les immeubles filés par la vitesse. »

**H1** · Cours ou roule. Ferme ta boucle. Le terrain est à toi.
> Ferme une boucle en courant ou en roulant. La surface à l’intérieur devient ton terrain sur la
> carte de ce sport. Ta sortie, elle, reste à toi dans tous les cas.

[ Comment ça marche ] (primaire → `/comment-ca-marche/`) · [ Télécharger ] (secondaire → `/telecharger/`)
Sous les boutons, une ligne d’état sans emphase : « Gryd n’est pas encore sur l’App Store. »

**H2** · Le geste tient en trois temps (trois blocs, un schéma chacun, pas de photo)
1. **Tu bouges.** Choisis ton sport, course ou vélo, puis appuie sur GO. Le GPS suit ton trajet. À la fin, ta trace rejoint ton journal avec sa distance et sa durée.
2. **Tu fermes.** Reviens près d’un endroit où tu es déjà passé. Il y a une tolérance, parce que le GPS bouge un peu : 25 m à pied, 40 m à vélo.
3. **Tu prends.** L’intérieur de ta boucle devient ton terrain. Tu gagnes seulement la part que tu n’avais pas déjà. Une boucle plus récente peut te la reprendre.

[ Lire le guide complet ] → `/comment-ca-marche/`

**H2** · Deux sports, deux cartes
> Course et vélo ne se mélangent pas sur la carte. Un compte, un journal, un niveau, mais chaque
> sport garde son terrain et ses défis. Tu choisis ta discipline avant de partir, et si tu te
> trompes, Gryd te le dit à l’arrivée et te laisse basculer. *(ADR-019, migration 0197 en prod.)*

**H2** · Un crew, si tu veux
**Photo** `gryd-crew-course-montee-ville-foule.jpg` · *alt* « Un crew entier remonte une rue en pente, la ville derrière, les visages du premier rang hurlant de joie. »
> Un crew, c’est un petit groupe : des amis, un club, un quartier. Tu peux en rejoindre un, en
> créer un, ou jouer seul. Rien n’est obligatoire. Un crew sert à retrouver des gens et à
> organiser de vraies sorties.

[ Voir les crews ] → `/crews/`

**H2** · Rien ne s’achète qui fait gagner
> Le sport, la capture, le crew et la progression sont gratuits. Aucun achat n’augmente le
> terrain, les XP ou les points de défi (`COMMERCIAL_PROPOSAL_2026`, les trois multiplicateurs
> valent 1). Gryd+ vendra un jour des outils d’analyse et de création. Jamais un avantage.

[ Ce que contient Gryd+ ] → `/gryd-plus/`

**H2** · Ta sortie t’appartient
> Les extrémités de ta trace sont coupées avant tout partage public, sur 250 m de chaque côté
> (`SHARE_TRIM_M`). Tu choisis combien de temps Gryd garde tes tracés : pour toujours, un an, ou
> 90 jours. Une boucle qui montrerait une zone que tu as protégée reste privée.

[ Sécurité et vie privée ] → `/securite-et-vie-privee/`

**Bloc de fin** : reprise courte de `/telecharger/` (accroche, état réel, formulaire).
**Données structurées** : `Organization` (§3.10).

### 3.2 Comment ça marche, `/comment-ca-marche/`

**SEO** · titre `Comment marche Gryd : la boucle et le terrain` (45) · description `Le guide complet : la boucle, le terrain, les XP, le crew, la saison et le fair-play. Les mêmes chiffres que dans l’application, lus à la source.` (145)
**Photo d’ouverture** `gryd-coureurs-vue-plongeante-paves.jpg` · *alt* « Vue en plongée verticale sur huit coureurs dispersés sur des pavés, leurs ombres allongées, semelles chartreuse. »

Une page, sept sections ancrées, un renvoi vers la FAQ. Les ancres reprennent les identifiants du
guide de l’app (`HELP_CHAPTER_IDS`), français **parce qu’ils sont publics** : `#bouger`, `#boucle`,
`#terrain`, `#points`, `#crew`, `#saison`, `#fair-play`. Sommaire cliquable en tête, `01` à `07`.

**H1** · Comment ça marche
> Sept chapitres, dans l’ordre. Les chiffres sont ceux que l’application applique vraiment.

**01 · Tu cours ou tu roules** `#bouger`
> Choisis ton sport : course à pied ou vélo. Puis appuie sur GO. Le GPS suit ton trajet pendant
> toute la sortie. Ce trajet, c’est ta trace. À la fin, ta trace rejoint ton journal avec sa
> distance et sa durée.
*Note* : Une sortie sans boucle compte quand même. Tu ne perds rien.

**02 · Tu fermes une boucle** `#boucle`
> Fermer une boucle, c’est revenir près d’un endroit où tu es déjà passé. Pas besoin de viser
> juste : une tolérance existe, parce que le GPS bouge un peu. La boucle doit aussi être assez
> longue. Sinon, tourner autour d’un rond-point suffirait.
*Faits* : écart de fermeture 25 m à pied et 40 m à vélo · longueur minimale 800 m à pied et 2 km à vélo · précision GPS attendue aux deux bouts 15 m.
*Note* : Une pause ou un trou de signal ne sont jamais rebouchés par une ligne inventée.

**03 · La boucle devient ton terrain** `#terrain`
> L’intérieur de ta boucle devient ton terrain sur la carte de ce sport. Tu gagnes seulement la
> part que tu n’avais pas déjà : deux boucles au même endroit ne comptent pas double. Une boucle
> plus récente peut reprendre ce terrain ; ta sortie, elle, reste dans ton journal. Course et
> vélo ont deux cartes séparées.
*Faits* : surface minimale 5 000 m² à pied et 20 000 m² à vélo · publication 30 min après la fin de la sortie · 24 h pour envoyer une sortie.
*Note* : Une boucle qui montrerait une zone protégée reste privée. Elle ne change alors rien sur la carte publique.

**04 · Les points** `#points`
> Deux choses avancent en même temps, et elles ne se mélangent pas. Le terrain se mesure en
> surface : il change de mains quand quelqu’un repasse. Les XP mesurent ta régularité : ils ne
> baissent jamais, même si tu te reposes. Le classement de ta commune regarde le terrain nouveau
> de la semaine, pas le terrain gardé.
*Faits* : 10 min de mouvement pour valider une journée · une journée validée vaut 100 XP · 3 journées rapportent par semaine · sans 5 joueurs classés, pas de classement.
*Note* : Aucun achat n’augmente le terrain, les XP ou les points de défi.

**05 · Le crew** `#crew`
> Un crew, c’est un petit groupe : des amis, un club, un quartier. Tu peux en rejoindre un, en
> créer un, ou jouer seul. Rien n’est obligatoire. Chacun a un rôle : membre, organisateur,
> modérateur ou capitaine. Un défi oppose deux équipes sur des secteurs annoncés à l’avance.
*Faits* : 5 joueurs par équipe · 2 équipes par défi · 7 jours · 3 secteurs · 2 journées comptées par joueur · 6 points au plus par joueur · 30 par équipe.
*Note* : Courir plus vite ou plus loin ne rapporte rien de plus dans un défi.

**06 · La saison** `#saison`
> Une saison est un thème commun et une série de récompenses. Elle ne détruit rien : tes XP, tes
> sorties et tes objets restent à toi. Les paliers avancent avec les mêmes journées actives que
> ton niveau.
*Faits* : 6 semaines · 12 paliers de collection · 100 XP par palier.
[ La Saison 0 ] → `/saison/`

**07 · Fair-play et sécurité** `#fair-play`
> C’est le serveur qui décide d’une capture, jamais ton téléphone. Une trace impossible est
> refusée : un saut brutal, une horloge fausse, un signal trop flou. Un refus n’efface jamais ta
> sortie : distance, durée et souvenir restent. Sur la route, la sécurité passe avant le jeu.
> Regarde devant toi, pas ton écran.
*Faits* : écart d’horloge toléré 5 min · fenêtre d’envoi après un défi 24 h.
*Note* : Aucune vitesse seule ne condamne une sortie. Un cycliste rapide en descente reste un cycliste.

[ Les questions fréquentes ] → `/faq/`

### 3.3 Les crews, `/crews/`

**SEO** · titre `Les crews Gryd : courir à plusieurs pour de vrai` (48) · description `Rejoins un crew par QR ou par code, crée le tien, organise des sorties et lance un défi de 7 jours à 5 contre 5. Aucun kilométrage imposé.` (138)
**Photo héros** `gryd-crew-femmes-cercle-selfie-ciel.jpg` · *alt* « Neuf coureuses en cercle vues depuis le sol, têtes tournées vers l’objectif, signes de victoire. »

**H1** · Un crew, c’est un petit groupe qui court vraiment ensemble
> Des amis, un club, un quartier. Tu peux en rejoindre un, en créer un, ou jouer seul. Rien n’est
> obligatoire, et aucun crew ne te demande un kilométrage pour exister.

**H2** · Rejoindre
> Trois chemins, tous en un geste : tu scannes le QR d’un membre, tu entres son code, ou tu ouvres
> son lien. Avant de rejoindre, tu vois le nom du crew, sa ville, ses conditions d’entrée et sa
> charte. Si une condition n’est pas remplie, Gryd te dit laquelle et combien il te manque.

**H2** · Créer
> Un nom, un blason parmi douze emblèmes, une ville, et tu choisis si l’entrée est libre ou sur
> candidature. Tu es capitaine de ce que tu crées.

**H2** · Gérer
**Photo** `gryd-crew-pause-cafe-terrasse.jpg` · *alt* « Après la sortie : deux hommes debout et trois coureuses au comptoir d’un café, gobelets à la main. »
> Le tableau de bord montre qui est actif, qui ne l’est plus, qui a candidaté. Tu peux avertir,
> exclure avec un motif, inviter par pseudo, poser une charte que chacun accepte en entrant, et
> tenir un journal des décisions. Quatre rôles : membre, organisateur, modérateur, capitaine.
> Dissoudre un crew se fait en deux temps, et se refuse pendant un défi.

**H2** · Se retrouver
> Un rendez-vous se pose avec son point de départ, son heure et son allure. Les membres
> s’inscrivent. Une conversation de crew existe, avec trois réactions. Le journal du crew garde
> les arrivées et les sorties.

**H2** · Le défi
> Un défi oppose deux équipes de 5 pendant 7 jours, sur 3 secteurs annoncés à l’avance. Chaque
> joueur peut faire compter 2 journées au maximum, pour 6 points au plus ; une équipe plafonne à
> 30. Un groupe coordonné bat un groupe de gros rouleurs : c’est une règle, pas un slogan.
> Pour qu’une journée compte dans un secteur, il faut qu’une part de ta trace y passe : 400 m à
> pied, 1 km à vélo.

*Ce que la page ne dit pas* : aucun nombre de crews, aucun nom de crew, aucun classement de crew.
Aucun crew réel n’existe en base à ce jour.

### 3.4 Saison et classements, `/saison/`

**SEO** · titre `Saison 0 de Gryd : six semaines, ta commune` (43) · description `La Saison 0 dure six semaines et s’ouvre à toutes les communes de France. Classement hebdomadaire sur le terrain nouveau, jamais sur le terrain gardé.` (150)
**Photo héros** `gryd-foule-place-depart-collectif.jpg` · *alt* « Des dizaines de coureurs en noir massés sur une allée arborée, à l’instant du départ. »

**H1** · La Saison 0
> Du **lundi 14 septembre 2026** au **dimanche 25 octobre 2026**, heure de Paris. Six semaines,
> douze paliers, douze objets à débloquer.

**Contrainte d’implémentation** : ces deux dates ne se retapent nulle part ailleurs. Une seule
copie, `apps/web/lib/season2026.ts`, avec en commentaire la ligne de production dont elles sont le
miroir (`season_collections_2026`, configurée le 11/09/2026) : si la saison change en base, ce
fichier change ou la page ment.

**H2** · Elle s’ouvre partout en France
> Il n’y a pas de ville pilote et pas de liste d’attente par quartier. Ta commune s’ouvre quand
> quelqu’un y court. La première boucle fermée chez toi suffit.

*Interdit formel : ne nommer aucune ville, ne citer aucun pays voisin, ne promettre aucune
ouverture européenne (ADR-006, « zéro donnée EU factice »).*

**H2** · Deux compteurs qui ne se mélangent pas
> **Le terrain** se mesure en surface. Il change de mains : une boucle plus récente reprend la
> part qu’elle recouvre.
> **Les XP** mesurent ta régularité. Une journée avec au moins 10 minutes de mouvement vaut
> 100 XP, et les 3 premières journées de la semaine rapportent, les deux sports confondus. Ils ne
> baissent jamais. Il n’y a aucune série quotidienne à tenir.

**H2** · Le classement de ta commune
> Chaque semaine, du lundi au dimanche, Gryd classe le **terrain nouveau** publié dans ta commune.
> Pas le terrain que tu gardes : sinon celui qui a commencé le premier resterait premier pour
> toujours. Le terrain tenu s’affiche à côté, comme un état.
> Tant qu’il y a moins de 5 classés dans ta zone, il n’y a pas de classement du tout : l’écran dit
> « Premier ici ». Un podium à trois serait un chiffre inventé.

**H2** · Les défis de la semaine
> Deux défis personnels à la fois par discipline, renouvelés chaque semaine. Ils ne donnent jamais
> d’XP : la récompense est un objet. Leur expiration est silencieuse, sans compte à rebours et
> sans relance.

**H2** · Le fair-play
> Aucun achat n’augmente le terrain, les XP ou les points. Aucun bouclier ne s’achète. Aucune
> protection ne se loue. Les trois multiplicateurs commerciaux valent 1, et c’est écrit dans le
> code (`COMMERCIAL_PROPOSAL_2026`).

*Ce que la page ne dit pas* : aucun nombre d’inscrits, aucun nombre de communes ouvertes, aucun
classement d’exemple. La base compte 3 comptes et 0 sortie au 12/09/2026.

### 3.5 Gryd+, `/gryd-plus/`

**SEO** · titre `Gryd+ : des outils, jamais un avantage de jeu` (45) · description `Gryd+ vendra des analyses privées, le Studio et des variantes de collection. Prix prévu : 5,99 € par mois. Rien n’est en vente aujourd’hui.` (139)
**Photo** `gryd-materiel-sol-apres-course-medailles.jpg` · *alt* « Vue de haut sur un plancher de bois, un cercle de jambes assises, deux médailles à ruban et des chaussures usées. »

**H1** · Gryd+

**Encart d’état, en haut, impossible à manquer** :
> **Gryd+ n’est pas en vente.** Aucun produit n’existe côté App Store, et rien ne peut être
> facturé aujourd’hui. Le prix ci-dessous est un prix **prévu**, pas un prix pratiqué. En
> attendant, les outils sont **ouverts à tout compte connecté** (ADR-016).

**H2** · Ce que Gryd+ contiendra
> Les comparaisons privées : deux sorties ou deux périodes côte à côte, mêmes mesures, mêmes
> unités, au delà du résumé gratuit. Le Studio : quatre compositions originales, avec placement et
> typographie réglables. Six variantes artistiques de saison, aux mêmes paliers que les douze
> objets gratuits.

**H2** · Ce que Gryd+ ne contiendra jamais
> Aucun terrain en plus. Aucun XP en plus. Aucun point de défi en plus. Aucune protection
> achetable. Aucune information tactique que les autres n’ont pas. Aucune monnaie interne.

**H2** · Le prix prévu

| Offre | Prix prévu | Constante |
|---|---|---|
| Gryd | Gratuit | aucune |
| GRYD+ mensuel | 5,99 € par mois | `COMMERCIAL_PROPOSAL_2026.monthlyEurCents` |
| GRYD+ annuel | 49,99 € par an | `COMMERCIAL_PROPOSAL_2026.annualEurCents` |
| Collections permanentes | 1,99 / 3,99 / 7,99 € | `COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents` |

> Le prix définitif viendra du Store et de sa localisation. Tant qu’aucun prix Store n’existe, la
> page affiche le prix prévu et le dit.

**H2** · Ce qui se passe si tu arrêtes
> Tes objets gagnés gratuitement restent acquis. Tes sorties, tes terrains et tes XP ne bougent
> pas. Les outils avancés s’arrêtent ; les fichiers déjà créés restent à toi. Résilier un
> abonnement et supprimer un compte sont deux opérations distinctes : supprimer ton compte ne
> résilie pas la facturation Apple.

**Aucun bouton d’achat sur cette page.** Ni « S’abonner », ni « Choisir ce plan », ni formulaire.
Un bouton qui ne peut rien faire est un bouton mort.
[ Les règles du jeu ] → `/comment-ca-marche/#points`

### 3.6 Sécurité et vie privée, `/securite-et-vie-privee/`

**SEO** · titre `Gryd : sécurité et vie privée, ce qu’on cache` (45) · description `Les extrémités de ta trace sont coupées sur 250 m avant tout partage. Tu choisis la durée de conservation. Le serveur décide chaque capture.` (140)
**Photo** `gryd-coureur-nuit-pluie-eclairs.jpg` · *alt* « Une rue étroite de nuit, les pavés luisants de pluie, un coureur seul dans des éclats de lumière blanche. »

**H1** · Ce que Gryd montre, et ce qu’il cache

**H2** · Tes extrémités sont coupées
> Avant tout partage public, Gryd retire les 250 premiers et les 250 derniers mètres de ta trace
> (`SHARE_TRIM_M`). Le point où tu pars et celui où tu rentres ne voyagent pas.

**H2** · Tu choisis la durée de conservation
> Par défaut, Gryd garde tes tracés **tant que tu n’as rien demandé** : rien ne s’efface dans ton
> dos. Tu peux choisir 1 an, ou 90 jours, dans Confidentialité et données. Tu peux aussi supprimer
> le tracé d’une sortie précise, sans supprimer la sortie.
> Un tracé ne s’efface pas tant qu’une vérification ou un recours te concernant est ouvert. C’est
> la seule exception, et elle protège ton droit de contester.

**H2** · Tes zones protégées
> Une boucle qui montrerait une zone que tu as protégée reste privée : elle ne change rien sur la
> carte publique, et ta sortie compte quand même pour toi.

**H2** · Le serveur décide, pas ton téléphone
> Aucune capture n’est décidée par l’application. Le serveur relit la trace, vérifie la fermeture,
> la longueur, la surface, la précision aux extrémités et l’heure. Il accorde, ou il refuse avec
> un motif nommé.

**H2** · Comment l’anti-triche fonctionne, en clair
> Gryd cherche quatre choses : une vitesse de véhicule tenue trop longtemps, une cadence qui ne
> correspond pas au sport annoncé, une précision GPS trop régulière pour être vraie, et un signal
> de position simulée quand le téléphone le déclare.
> Une sortie suspecte est **mise de côté** : elle ne prend pas de terrain, ne donne pas de points,
> et une personne la relit. Elle n’est jamais effacée.
> Aucune vitesse seule ne condamne une sortie. Un cycliste rapide en descente reste un cycliste.

*Ce qui ne se dit pas* : « Gryd détecte toute triche », « tes données sont parfaitement en
sécurité », ou tout absolu de ce genre. Le cahier §4.2 interdit la promesse de sécurité absolue et
d’anti-triche infaillible.

**H2** · Tes droits
> Tu peux exporter tout ce que Gryd sait de toi, et supprimer ton compte depuis l’application.
> Gryd est réservé aux 16 ans et plus.

[ La politique de confidentialité ] → `/confidentialite/`

### 3.7 Questions fréquentes, `/faq/`

**SEO** · titre `Questions fréquentes sur Gryd` (29) · description `Treize réponses courtes : sorties sans boucle, terrain repris, XP, repos, classement, crew, points de défi, vie privée et argent.` (129)
**Photo** `gryd-coureuse-lunettes-chartreuse-portrait-groupe.jpg` · *alt* « Vue de haut avant le départ : une coureuse aux lunettes chartreuse au centre, le groupe serré autour d’elle. »

**H1** · Questions fréquentes

Cinq groupes, treize questions, **reprises mot pour mot** de `helpFaq2026.ts` (version `fr`). Les
chiffres cités viennent des constantes, jamais d’une saisie.

**Tes sorties**
1. *Une sortie sans boucle compte-t-elle ?* Oui. Son tracé, sa distance et sa durée restent dans ton journal. Elle peut rapporter des XP sans prendre de terrain.
2. *La course et le vélo se mélangent-ils ?* Un compte, un journal, un niveau. Chaque sport garde sa carte et ses défis. Choisis ta discipline avant de partir.
3. *Que veut dire « synchronisation en attente » ?* Ta sortie est gardée sur ce téléphone et attend d’être envoyée. Rien n’est annoncé avant la confirmation du serveur. Reconnecte-toi pour finir.

**Le terrain**
4. *Comment gagner du terrain ?* Ferme une boucle qui respecte les règles. Le serveur vérifie la trace et te donne la surface à l’intérieur, dans ce sport.
5. *Et si quelqu’un reprend ma zone ?* La boucle la plus récente prend la part qu’elle recouvre. Tu gardes ta sortie, ton empreinte et tes XP. Une nouvelle boucle est la seule façon de la reprendre.
6. *Pourquoi ma boucle a-t-elle été refusée ?* L’app te donne la raison exacte : pas de boucle complète, surface trop petite, ou précision GPS insuffisante. Ta sortie est gardée dans tous les cas.

**La progression**
7. *Comment marchent les XP ?* Une journée avec au moins 10 min de mouvement vaut 100 XP. Les 3 premières journées de la semaine rapportent, les deux sports confondus.
8. *Est-ce que le repos me coûte quelque chose ?* Non. Le repos ne retire ni XP, ni niveau, ni souvenir, ni objet. Il n’y a aucune série quotidienne à tenir.
9. *Pourquoi n’y a-t-il pas de classement chez moi ?* Un classement n’apparaît qu’à partir de 5 joueurs classés dans la zone. En dessous, un podium serait un chiffre inventé.

**Le crew**
10. *Faut-il rejoindre un crew ?* Non. Tu peux explorer, enregistrer et progresser seul. Un crew sert à retrouver des gens et à organiser de vraies sorties.
11. *Comment gagner des points de défi ?* Ferme une boucle avec une part de trace dans le secteur : 400 m à pied, 1 km à vélo. Chaque journée comptée vaut 3 points.

**Vie privée et argent**
12. *Mes lieux privés sont-ils publics ?* Tes réglages de confidentialité décident de ce qui est partagé. Une boucle qui montrerait une zone protégée reste privée par défaut. Vérifie l’aperçu avant de partager.
13. *Faut-il payer pour jouer ?* Non. Le sport, la capture, le crew et la progression sont gratuits. Aucun achat n’augmente le terrain, les XP ou les points de défi.

**Données structurées** : `FAQPage` (§3.10).

### 3.8 Télécharger, `/telecharger/`

**SEO** · titre `Télécharger Gryd : où en est la sortie` (38) · description `Gryd n’est pas encore sur l’App Store. Laisse ton e-mail pour être prévenu le jour de l’ouverture. Réservé aux 16 ans et plus.` (126)
**Photo** `gryd-duo-traversee-passage-pieton-pluie.jpg` · *alt* « Chaussée mouillée, circulation à l’arrêt, un homme et une femme traversent au pas de course. »

**H1** · Gryd n’est pas encore sur l’App Store
> C’est l’état réel, au 12 septembre 2026. L’application tourne, elle est testée tous les jours
> sur iPhone, et elle n’a pas encore de fiche publique. Laisse ton e-mail : tu seras prévenu le
> jour où elle en aura une.

**Aucun bouton App Store, aucun badge Apple, aucun lien `apps.apple.com`.** Il n’existe aucune
adresse de fiche dans le dépôt : un bouton serait mort.

**H2** · Être prévenu
Formulaire réel : il appelle la RPC `waitlist_join(email, postal_code)` (migration 0034,
`SECURITY DEFINER`, accordée à `anon`) via `apps/web/lib/waitlistJoin.ts`. Deux champs.
- **E-mail** · « Ton adresse e-mail » · erreur « Entre une adresse e-mail valide. »
- **Code postal** · « Ton code postal » · aide « Il nous dit où le produit est attendu. Il ne débloque rien et il n’ouvre aucune commune. » · erreur « Entre un code postal français à 5 chiffres. »

[ Me prévenir ] · succès « C’est noté. On t’écrit quand Gryd ouvre. » · indisponible
« L’inscription est momentanément indisponible. Réessaie dans quelques minutes. »

**À supprimer du formulaire actuel** : le seuil `WAITLIST_UNLOCK_THRESHOLD` (« ton quartier ouvre
à 500 inscrits ») et toute mention de quartier débloqué. Les communes s’ouvrent par présence
réelle, pas par un compteur d’inscrits. La constante peut rester dans le code ; elle ne doit plus
apparaître à l’écran.

**H2** · Ce qu’il faut savoir avant
> Gryd est réservé aux 16 ans et plus. Il fonctionne sur iPhone. Il te demande ta position pendant
> tes sorties, et te dit pourquoi avant de la demander. Tout le jeu est gratuit.

**Données structurées** : `SoftwareApplication` (§3.10).

### 3.9 Pages légales, `/callback/`, et les trois pages d’arrivée

**Les quatre pages légales** (`/confidentialite/`, `/conditions/`, `/cgv/`, `/mentions-legales/`) :
**le texte ne change pas d’un mot.** Corrigé au fond le 11/09 (ADR-014) et relu par un juriste :
retrait de « GRYD Club », du « Founder Pack à vie » et de la « monnaie de style », activation
« après confirmation », suppression de compte distincte de la résiliation, médiateur, L215-1,
L221-28, registre NEXUS 1993, Stripe côté site. Ce qui change : la **mise en page seulement**. Les
numéros de section, les ancres et les titres exacts restent ; `CONTACT_EMAIL` et `POSTAL_CONTACT`
restent lus depuis `apps/web/lib/legal.ts`. Aucune donnée structurée sur ces pages.

**`/callback/` ne se refait pas.** Neuve le 12/09, couverte par 14 tests dans le gate
(`apps/web/lib/authCallbackLink2026.ts`), cinq verdicts documentés. Elle reçoit l’en-tête et le
pied nouveaux, **rien d’autre**, et reste `noindex, nofollow` : le fragment porte des jetons.

Les trois pages d’arrivée sont `noindex`, servies par `404.html` (§2.2), sans appel réseau, en un
écran.

**`/c/<code>/` · Rejoindre un crew** · photo `gryd-groupe-hommes-course-pluie-brique.jpg`
(*alt* « Six coureurs de profil sous une pluie visible, le long d’un mur de brique, semelles chartreuse. »)
**H1** · On t’invite dans un crew
> Ce lien porte une invitation. Ouvre Gryd pour voir le crew, sa ville et ses conditions avant de
> décider.
[ Ouvrir Gryd ] (`gryd://c/<code>`) · [ Gryd n’est pas installé ? ] → `/telecharger/`
Sous les boutons : « Le code de cette invitation : `<code>`. Garde-le : tu pourras l’entrer à la
main dans l’application. »
*Interdit* : afficher un nom de crew, un blason, un nombre de membres ou une ville. La page ne lit
rien du serveur, et ces informations ne sont pas dans l’URL.

**`/r/<code>/` · Parrainage** · photo `gryd-coureurs-vitesse-file-rue.jpg`
(*alt* « Filé latéral sur quatre coureurs lancés, le décor réduit à des traînées grises. »)
**H1** · Quelqu’un t’a passé le relais
> Ce lien porte un code de parrainage. Ouvre Gryd, crée ton compte, fais une sortie validée : vous
> recevez tous les deux les objets du Relais, toi et la personne qui t’a invité.
> Le parrainage ne donne aucun terrain, aucun point de défi et aucune chance supplémentaire de
> gagner quoi que ce soit. Il donne des objets, et un peu d’XP de progression pendant sept jours.
[ Ouvrir Gryd ] (`gryd://r/<code>`) · [ Gryd n’est pas installé ? ] → `/telecharger/`

**`/u/<pseudo>/` · Profil** · pas de photo, une carte sobre, le G chartreuse, rien d’autre.
**H1** · Ce lien mène à un profil Gryd
> `@<pseudo>`
> Ouvre Gryd pour voir ce profil. Le web n’en montre rien : ni terrain, ni sorties, ni crew, ni
> photo.
[ Ouvrir Gryd ] (`gryd://u/<pseudo>`) · [ Gryd n’est pas installé ? ] → `/telecharger/`

*Pourquoi cette page est vide.* Rien ne prouve qu’un visiteur anonyme puisse lire un profil
public : l’audit du 11/09 a relevé que `public_profiles` et `player_leaderboard` n’ont pas
`security_invoker`, et le point reste ouvert. Affirmer « @x est sur Gryd » reviendrait à certifier
qu’un compte existe alors que la page ne connaît qu’un morceau d’URL. La formulation retenue ne
l’affirme pas : elle dit où mène le lien. Le jour où une lecture publique est **prouvée**, la page
pourra montrer le pseudo confirmé.

### 3.10 Données structurées

Trois blocs `application/ld+json`, pas un de plus.
- **`Organization`, sur `/`** : `name: "Gryd"`, `legalName: "SASU Nexus 1993"`, `url`, `logo` (le G chartreuse en PNG), `email: "hey@gryd.run"`, `address`. `sameAs` reste **absent** tant que le fondateur n’a pas donné de comptes réels (décision n° 5).
- **`FAQPage`, sur `/faq/`** : les 13 `Question` / `Answer`, texte identique à celui affiché. Un `FAQPage` dont les réponses diffèrent de la page est une pénalité, pas un bonus.
- **`SoftwareApplication`, sur `/telecharger/`** : `name: "GRYD"`, `applicationCategory: "HealthApplication"`, `operatingSystem: "iOS"`, `offers: { price: "0", priceCurrency: "EUR" }`. **Absents à raison** : `aggregateRating` (aucune note n’existe), `downloadUrl` et `installUrl` (aucune fiche App Store), `softwareVersion` (aucune version publiée).

**Interdits partout** : `Review`, `AggregateRating`, `Event` sans événement réel, `Place` sans
lieu réel. Une donnée structurée inventée est une donnée factice qui, en plus, est déclarée à
Google.

---

## 4. Règles d’écriture

### 4.1 La voix

- **Tutoiement, toujours** : « tu cours », « ton terrain », « ta commune ». Jamais « vous », jamais « l’utilisateur », jamais « les runners ».
- **Phrases courtes.** Une idée par phrase, niveau collège : le site doit se lire à quinze ans comme à soixante.
- **Aucun tiret long.** Ni `—` ni `–`. Une virgule, un deux-points ou un point font le travail. Le verrou `apps/mobile/src/i18n/noDashFr2026.test.ts` l’impose côté app ; le lot pages peut poser le même test sur `apps/web`.
- **Des noms et des verbes concrets** : Carte, Courir, Rouler, Profil, Crew, Collection, Studio, Partager. Pas de slogan à la place d’une mesure.
- **Français seul en v1.** Les quatre pages légales n’existent qu’en français, la Saison 0 est française, et un site à moitié traduit ment à moitié. Le dictionnaire anglais actuel (`components/landing/dictionary.ts`) peut resservir : c’est un lot à part.

### 4.2 « Gryd » ou « GRYD » : la règle

| Forme | Où | Exemple |
|---|---|---|
| **Gryd** | Partout dans la prose, les titres de page, les CTA, les alt, les méta-descriptions | « Ouvrir Gryd », « Gryd transforme tes sorties » |
| **GRYD** | Dans le logo dessiné, et là seulement, si le design pose le mot comme un graphisme | le lettrage du héros, le pied de page |
| **GRYD+** | Le nom exact de l’offre, tel que la source de vérité l’écrit (`COMMERCIAL_PROPOSAL_2026.subscriptionName`) | « GRYD+ mensuel, 5,99 € par mois » |
| **GRYD** | Dans les pages légales et les données structurées, où c’est un identifiant | `SoftwareApplication.name: "GRYD"` |
| `gryd` | Seulement dans les URL, les schémas et les identifiants techniques | `gryd.run`, `gryd://callback` |

**Pourquoi.** Un mot en capitales dans une phrase courte se lit comme un cri et casse le rythme
qu’impose §4.1 ; un lettrage, lui, est un dessin, qui n’obéit pas à la typographie du texte
courant. D’où la coupe : **capitales pour l’objet dessiné et pour les identifiants, capitale
initiale pour le mot.** **Écart à signaler** : l’application écrit « GRYD » dans ses propres
chaînes (« Félicitations, ton compte GRYD est créé »), donc le site et l’app ne diront pas la
marque de la même façon tant qu’un lot ne les aligne pas. Connu et assumé ici, pas découvert plus
tard. Le nom de l’offre est porté au fondateur (décision n° 2).

### 4.3 Les chiffres

**Aucun chiffre de jeu ne se tape à la main.** Chaque valeur vient de
`packages/shared/src/game-rules.ts` et doit être importée, comme le fait déjà
`apps/web/lib/pricing.ts`. La règle a une histoire : le site a un jour affiché un Founder Pack à
149 € contre 9,99 € dans la source, un facteur 15 entre le lien public et la vérité.

| Valeur affichée | Constante |
|---|---|
| 25 m / 40 m (écart de fermeture) | `TERRITORY_RULES_2026.run.closureMaxGapM` / `.bike.closureMaxGapM` |
| 800 m / 2 km (longueur minimale) | `TERRITORY_RULES_2026.run.minLoopDistanceM` / `.bike.minLoopDistanceM` |
| 5 000 m² / 20 000 m² (surface minimale) | `TERRITORY_RULES_2026.run.minAreaM2` / `.bike.minAreaM2` |
| 15 m (précision aux extrémités) | `TERRITORY_RULES_2026.endpointMaxAccuracyM` |
| 30 min (publication) · 24 h (envoi) | `.publicationDelayMinutes` · `.captureReceiptMaxAgeHours` |
| 5 min (écart d’horloge toléré) | `TERRITORY_RULES_2026.clockToleranceSeconds` |
| 10 min · 100 XP · 3 journées | `PROGRESSION_RULES_2026.minimumMovementSecondsPerDay` · `.xpPerActiveDay` · `.maximumCreditedDaysPerWeek` |
| 6 semaines · 12 paliers · 100 XP par palier | `PROGRESSION_RULES_2026.seasonWeeks` · `.seasonTierCount` · `.seasonXpPerTier` |
| 5 joueurs classés minimum | `LEADERBOARD_RULES_2026.minRankedSubjects` |
| 5 · 2 · 7 jours · 3 secteurs | `CHALLENGE_RULES_2026.playersPerTeam` · `.teamCount` · `.durationDays` · `.sectorCount` |
| 2 journées · 6 points · 30 points | `.maximumContributiveDaysPerPlayer` · `.maximumPointsPerPlayer` · `.maximumPointsPerTeam` |
| 400 m / 1 km (trace dans le secteur) · 3 points | `.minimumTraceInsideSectorM` · `.pointsPerDay` |
| 24 h (fenêtre d’envoi après un défi) | `CHALLENGE_RULES_2026.finalSyncWindowHours` |
| 250 m (extrémités coupées) | `SHARE_TRIM_M` |
| 16 ans | `MIN_AGE_YEARS` |
| 5,99 € · 49,99 € · 1,99 / 3,99 / 7,99 € | `COMMERCIAL_PROPOSAL_2026` |

Trois valeurs échappent à `game-rules.ts`. **Les dates de la Saison 0** viennent d’une ligne de
base, pas d’une constante de jeu : une seule copie, dans `apps/web/lib/season2026.ts` (§3.4). **Le
seuil de 500 inscrits** (`WAITLIST_UNLOCK_THRESHOLD`) ne s’affiche plus : il décrit une mécanique
abandonnée. **Les prix** se lisent dans `COMMERCIAL_PROPOSAL_2026`, jamais dans
`apps/web/lib/pricing.ts`, qui pointe encore sur les SKU Club et Founder Pack et n’a plus de
raison d’être sur une page publique.

### 4.4 Le vocabulaire officiel

| Mot | Sens | Ce qu’on n’écrit pas |
|---|---|---|
| **boucle** | La trace refermée sur elle-même | « loop », « circuit » |
| **terrain** | La surface possédée sur la carte d’un sport | « zone », « territoire », « hexagone » |
| **commune** | La maille administrative du classement | « ville », « quartier », « secteur » |
| **crew** | Le groupe social, défini une fois puis employé tel quel | « club », « équipe », « team » |
| **saison** | Les six semaines et leurs douze paliers | « season pass », « battle pass » |
| **défi de la semaine** | Le défi personnel hebdomadaire | « quête quotidienne », « mission » |
| **quête** | Réservé au défi personnel, jamais au défi de crew | aucune autre acception |
| **souvenir** | L’objet créé à partir d’une sortie | « trophée », « badge » |
| **sortie** | Une session enregistrée, avec ou sans boucle | « run », « activité », « session » |

**Mots bannis, hérités de l’ancien site** : War Room, Arsenal, raid, threat, GRYD Club, Founder
Pack, monnaie de style, bouclier, gel, quartier débloqué, pass de saison.

### 4.5 Ce qu’on ne dit JAMAIS

1. **Aucun nombre d’utilisateurs, d’inscrits, de crews ou de sorties.** La base réelle compte 3 comptes et 0 donnée de jeu au 12/09/2026. « Rejoins les milliers de », « déjà N runners », un compteur qui monte : interdits, y compris « en démonstration ».
2. **Aucune ville nommée comme ouverte, pilote ou prioritaire.** La Saison 0 s’ouvre à toutes les communes de France, par présence. Aucune ville européenne, aucun classement européen, aucun rival inventé (ADR-006).
3. **Aucune garantie absolue** : ni « tes données sont totalement sécurisées », ni « aucune triche ne passe », ni « exactitude garantie ». Le cahier §4.2 les interdit une par une.
4. **Aucune date non décidée** : pas de date App Store, pas de « bientôt », pas de « dans les prochaines semaines », pas de compte à rebours. La seule date écrite est celle de la Saison 0, parce qu’elle est configurée en production.
5. **Aucun bouton qui ne fait rien** : pas de badge App Store, pas de « S’abonner », pas de lien vers une page inexistante, pas de réseau social sans compte réel derrière.
6. **Aucun prix présenté comme pratiqué.** Les prix de §3.5 sont « prévus », et la page le dit avant de les montrer.
7. **Aucune fonction de phase 2 montrée comme disponible** : survol 3D, montage vidéo avancé, outils d’administration de club.
8. **Aucune donnée structurée inventée** (§3.10).

### 4.6 Les photos

Onze des douze photographies partent sur le site. La douzième
(`gryd-crew-course-montee-ville-foule-heros-profil.jpg`) est le recadrage du héros du Profil et
reste à l’application.

| Photo | Page et section |
|---|---|
| `gryd-duo-sprint-ville-lunettes-chartreuse.jpg` | Accueil, héros |
| `gryd-crew-course-montee-ville-foule.jpg` | Accueil, « Un crew, si tu veux » |
| `gryd-coureurs-vue-plongeante-paves.jpg` | Comment ça marche, ouverture |
| `gryd-crew-femmes-cercle-selfie-ciel.jpg` | Crews, héros |
| `gryd-crew-pause-cafe-terrasse.jpg` | Crews, « Gérer » |
| `gryd-foule-place-depart-collectif.jpg` | Saison, héros |
| `gryd-materiel-sol-apres-course-medailles.jpg` | Gryd+ |
| `gryd-coureur-nuit-pluie-eclairs.jpg` | Sécurité et vie privée |
| `gryd-coureuse-lunettes-chartreuse-portrait-groupe.jpg` | FAQ |
| `gryd-duo-traversee-passage-pieton-pluie.jpg` | Télécharger |
| `gryd-groupe-hommes-course-pluie-brique.jpg` | `/c/<code>/` |
| `gryd-coureurs-vitesse-file-rue.jpg` | `/r/<code>/` |

**Règles d’alt** : décrire la scène, pas la marque. Jamais « photo Gryd », jamais « coureurs
heureux ». Les alt de §3 se reprennent tels quels. Les sources pèsent moins de 450 Ko en JPEG
1080 px ; produire en plus une variante 1920 px et servir en `srcset`, sans jamais dépasser la
qualité de la source.

**Une photo ne remplace jamais une capture d’écran.** Tant qu’aucune capture iOS native n’est
recettée, le site ne montre **pas** de faux écran, de maquette de téléphone remplie de chiffres
inventés, ni de carte peuplée de territoires fictifs. C’est la faute la plus facile à commettre sur
une page d’accueil, et la plus grave ici.

### 4.7 Couleur et logo

Le chartreuse passe par le token partagé (`colors.chartreuse`), jamais par un hex tapé. Il ne se
pose **jamais** en petit texte ni en pictogramme sur fond clair : le contraste y tombe à 1,2:1. Le
logo est le **G chartreuse seul, sans socle**, comme sur la carte de l’application. La palette
reste noir, blanc, gris neutres et chartreuse.

---

## 5. Ce qui manque au fondateur

Cinq décisions. Aucune n’empêche de construire : chacune a une valeur par défaut que les deux
autres agents appliquent tant que rien n’est tranché.

1. **La date App Store.** Le site n’écrit aucune date de sortie. Existe-t-il une cible, même
   approximative, et doit-elle être publiée ? *Par défaut* : rien n’est écrit, et `/telecharger/`
   dit l’état réel.
2. **Le nom exact de l’offre.** La source de vérité écrit `GRYD+`
   (`COMMERCIAL_PROPOSAL_2026.subscriptionName`), la consigne du lot écrit « Gryd+ ». Ce nom
   apparaîtra dans App Store Connect et dans les CGV : il ne peut pas exister sous deux graphies.
   *Par défaut* : `GRYD+` partout, parce que c’est ce que le code dit et que les CGV corrigées le
   11/09 en dépendent. En changer impose de toucher `game-rules.ts` et les textes légaux, donc un
   lot à part.
3. **L’accroche.** « Cours ou roule. Ferme ta boucle. Le terrain est à toi. » s’écarte du cahier
   §15.1 (« Cours. Roule. Fais grandir ton terrain. »), qui est rang 0. *Par défaut* : la formule
   retenue, pour les raisons de §1.1. Un mot du fondateur suffit à la remplacer par celle du
   cahier, et alors le cahier reprend la main sans ADR.
4. **La liste d’attente.** Le formulaire fonctionne et enregistre vraiment. Mais une liste
   d’attente n’a de sens que si quelqu’un écrit aux inscrits le jour venu : un envoi est-il prévu
   depuis `no-reply@gryd.run` ? *Par défaut* : le formulaire est gardé, avec la promesse minimale
   « On t’écrit quand Gryd ouvre ». Si personne n’écrira, la page doit le remplacer par un simple
   état, sans champ : collecter des adresses qu’on n’utilisera pas est une promesse en l’air.
5. **Les réseaux sociaux.** Le pied n’affiche aucune icône sociale et `Organization.sameAs` reste
   vide. Existe-t-il un compte Instagram, TikTok ou autre au nom de Gryd, en ligne aujourd’hui ?
   *Par défaut* : rien n’est affiché. Une icône vers un compte vide est un bouton mort, et
   `sameAs` pointant sur une page absente est une donnée structurée fausse.

---

## 6. Hors périmètre de ce document

Le **système de design** (grille, typographie, composants, jetons) : lot design system, à partir
de `GRYD_DIRECTION_VISUELLE_2026.md`. L’**implémentation** (routes Next, export statique,
`404.html` routeur, `srcset`, déploiement) : lot pages, à partir de
`GRYD_SITE_GRYD_RUN_2026_09.md` §5 et §6. Les **textes légaux** ne se réécrivent pas (§3.9).
**`/callback/`, `apple-app-site-association` et le `CNAME`** ne se touchent pas : le script de
déploiement refuse de publier sans eux. L’**anglais** est un lot à part (§4.1).
