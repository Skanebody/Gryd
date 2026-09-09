# GRYD — INTVL, 14 captures : ce qu'on reprend, ce qu'on adapte, ce qu'on refuse

> **10 septembre 2026.** Réponse à la demande du fondateur : « regarde ce qui est mis en place chez
> INTVL et ce qui est bon à reprendre par rapport aux nouvelles décisions », plus quatre chantiers
> nommés — **classements**, **défis à récompenses gratuites**, **notifications**, **social**.
>
> **Rang de ce document : 3 (analyse).** Il ne décide rien. Les décisions qu'il propose vivent dans
> `docs/product/ADR-013-BROUILLON.md`, à intégrer par le fondateur dans `docs/DECISIONS.md`.
>
> **Deux questions, posées à chaque ligne**, comme demandé :
> **(A) est-ce que ça améliore l'expérience client ? (B) est-ce que ça réduit la friction client ?**
> Une fonctionnalité peut améliorer l'expérience *et* ajouter de la friction (un paywall bien fait),
> ou réduire la friction *et* dégrader l'expérience (un consentement acheté). Les deux colonnes sont
> séparées pour cette raison.

---

## 0. Ce que ce document ajoute — et ce qu'il ne refait pas

Un document d'analyse des mêmes 14 captures existe déjà :
`docs/product/GRYD_ANALYSE_INTVL_CAPTURES_2026_09.md` (9 septembre, 250 lignes, image par image), et sa
livraison `docs/product/GRYD_INTEGRATION_INTVL_2026_09.md`. **Ils sont bons et ils tiennent.** Ils ont
déjà tranché, entre autres :

- pas d'XP pour une permission, une photo de profil ou une invitation (§11 du doc du 09/09) ;
- le parrainage GRYD ne donne pas d'XP (§13) ;
- copier une mécanique de tirage au sort n'est pas nécessaire à la refonte (§12) ;
- garder trois destinations, ne pas ajouter d'onglet ;
- sur l'abonnement : deux formules comparables, total annuel au premier plan, pas d'essai
  reconductible obligatoire au lancement.

**Le document du 09/09 ne parle jamais de classements** — le mot n'y apparaît pas une seule fois.
C'est le trou que le fondateur vient de nommer. Ce document-ci fait donc trois choses que l'autre ne
fait pas :

1. il **rejuge les 14 captures sous la constitution** (CLAUDE.md + ADR + cahier §), avec un verdict
   explicite Reprendre / Adapter / Rejeter et la raison opposable ;
2. il traite les **quatre chantiers nommés** (classements, défis, notifications, social) au niveau du
   modèle de données réellement présent en base au 10/09 ;
3. il produit une **feuille de route ordonnée** et la liste des décisions que seul le fondateur peut
   prendre.

---

## 1. INTVL, fonctionnalité par fonctionnalité

Légende : **A** = améliore l'expérience · **B** = réduit la friction.
Les références « §x » sont celles du cahier de septembre (`GRYD_REFONTE_INTEGRALE_2026_09.md`, rang 0).

### 1.1 Capture 1 — Réglages

| Élément INTVL | A ? | B ? | Verdict | Raison sous la constitution |
|---|---|---|---|---|
| Avatar en cadre bouclier chartreuse + nom + « VIEW PROFILE » | Oui | Oui | **Reprendre** | G22 : portrait, nom, niveau, crew. Le cadre est déjà un objet de récompense chez nous (`profile_frame`, palier 4 de `SEASON_REWARDS_2026`) — donc le cadre *veut dire quelque chose*, alors que chez INTVL il est décoratif. Un accès direct au profil public répond à G27 (« Aperçu *Vu par les autres* directement accessible »). |
| « Refer a friend — **Earn 10xp** for each friend you refer » | Non | Oui | **Rejeter (la partie XP)** | §7.1 : les XP viennent de journées avec ≥10 min de mouvement, plafonnées à 3 journées/semaine. Payer une invitation en XP casse la phrase de dix secondes du §7.1 et rend le niveau non comparable. §15.2 est explicite : « Le parrainage ne donne ni XP ni points ni chance supplémentaire de gagner un prix. » |
| « …and give them a **discount to INTVL Pro** » | Non | Non | **Rejeter** | Une remise d'abonnement obtenue en recrutant transforme l'utilisateur en force de vente non rémunérée et crée une inégalité de prix entre joueurs. Rien dans §16 ne l'autorise. |
| Parrainage **en tant que mécanique** | Oui | Oui | **Adapter** | Garder la boucle « invitation → rendez-vous → sortie réelle » de §15.2 : la récompense est le **Premier rendez-vous** (un objet de partage), disponible **à tous les membres concernés**, pas seulement au parrain. Elle se déclenche sur une *sortie partagée réellement validée*, pas sur une installation. |
| « Add friends », « Enter referral code » | Oui | Oui | **Reprendre** (déjà là) | G19 : affiche + QR + lien avec le même jeton. Existe : `apps/mobile/src/features/refonte/CrewInviteScreen.tsx`. |
| « Edit profile », « App settings », « Privacy » | Oui | Oui | **Reprendre** (déjà là) | G27. `apps/mobile/app/parametres.tsx` + `parametres/[section].tsx`. |
| « Plans & Purchases » | Oui | Oui | **Reprendre** | G28 : prix mensuel/annuel, total facturé, récurrence, restauration. Attention : chez nous cette porte reste **fermée tant qu'ADR-011 n'est pas tranché** (voir §4.5 ci-dessous). |
| « Integrations » | Oui | Oui | **Reprendre** (déjà là) | = G26 « Sources et appareils ». L'écran existe et a été renommé au 09/09. Rappel G26 : ne jamais afficher « connecté » sur la seule présence d'un logo. |
| « FAQs », « Support » | Oui | Oui | **Reprendre** (déjà là) | G29. ⚠️ Voir §6 : `/appel` (recours anti-triche) **n'a plus de porte** d'après `docs/STATUS.md` (10/09). Un support sans recours n'est pas un support. |

**Lecture d'ensemble.** L'écran de réglages d'INTVL est une bonne table des matières, et la nôtre lui
est déjà isomorphe. Il n'y a **pas de gain** à copier davantage ici — sauf une chose : INTVL met le
parrainage **en haut**, avant tout le reste. C'est cohérent avec un produit dont la croissance vient
du recrutement payé. Chez nous la même place doit revenir à **l'invitation à une sortie**, parce que
c'est notre boucle de croissance mesurable (§15.2, ligne « Rendez-vous → membres »).

### 1.2 Capture 2 — Reel Instagram + tableau Sensor Tower

| Élément | A ? | B ? | Verdict | Raison |
|---|---|---|---|---|
| 200 K téléchargements/mois, 200 K $/mois, #53 Health & Fitness US | — | — | **Signal, jamais une cible** | Ce sont des **estimations tierces**, non certifiées par l'éditeur. Le cahier §3.2 pose déjà la règle : « les pages publiques donnent des fonctionnalités et des avis, mais pas une mesure fiable du taux de rétention, du revenu par utilisateur ni de la rentabilité d'INTVL. Aucune de ces métriques n'est inventée ici. » Ces chiffres **ne doivent apparaître dans aucun document de décision ni support d'investissement GRYD** comme s'ils étaient mesurés. |
| Ce qu'ils prouvent quand même | — | — | À retenir | Qu'un jeu de territoire course/vélo trouve un marché anglophone payant, et que **le créateur montre une carte, pas un classement**. La carte de Monaco couverte de territoires est le contenu ; c'est exactement le pari du §12.1 (« reprendre la force visuelle de Strava ») et de §4.3 (« chaque sortie produit une création personnelle »). |

### 1.3 Capture 3 — Onboarding : globe 3D, « TURN ON LOCATION », demande système

| Élément INTVL | A ? | B ? | Verdict | Raison |
|---|---|---|---|---|
| Globe 3D sombre avec territoires colorés (Europe de l'Est) | Oui | Oui | **Adapter, sous condition explicite** | Si ces territoires sont présentés comme réels alors qu'ils ne le sont pas, c'est l'interdit n°1. G01 laisse la porte ouverte et la borne : « Le visuel n'est jamais utilisé comme preuve d'une activité réelle **s'il est illustratif** ». Donc : composition d'ouverture assumée comme illustration graphique (trace + zone), **jamais une carte de joueurs**, et **jamais l'Europe** tant que la Saison 0 est française (ADR-006 + « zéro donnée EU factice »). |
| Amorce « TURN ON LOCATION » avec « SKIP » et « BACK » | Oui | **Oui, fortement** | **Reprendre le motif** | Expliquer avant la boîte système, et laisser une porte de sortie, est exactement §9.2. Un refus n'est alors plus un cul-de-sac. |
| **Le moment** où INTVL le demande (pendant l'onboarding, avant toute valeur) | Non | Non | **Rejeter le moment** | §9.2 : « Au premier départ : expliquer le besoin de localisation **puis** présenter la demande système au moment où elle est nécessaire. » et G03 : sans GPS, ville manuelle et carte explorable. Demander la position pour *regarder* une carte est une friction pure. |
| Le texte « to track your runs using GPS **while in the run mode** » | Non | — | **Adapter** | GRYD enregistre écran éteint (`UIBackgroundModes: [location]`). Un texte qui promet « seulement en mode course » alors qu'on demandera l'autorisation *Toujours* est une fausse déclaration. Le texte doit décrire l'usage réel, et l'écart entre « quand l'app est active » et « toujours » doit être expliqué au moment où il coûte quelque chose au joueur. |

### 1.4 Capture 4 — App Tracking Transparency

| Élément INTVL | A ? | B ? | Verdict | Raison |
|---|---|---|---|---|
| « HELP US IMPROVE INTVL — Allow tracking so we can see **which ads** bring in athletes like you » + boîte système ATT | Non | Non | **Rejeter en bloc** | ATT n'est requis que si l'on suit l'utilisateur pour la publicité. §18.5 l'interdit chez nous : « données de santé absentes des outils publicitaires », « Ne pas transférer des événements révélant l'activité Santé à un SDK marketing ». **Ne pas faire de suivi publicitaire, c'est supprimer un écran entier de l'onboarding** — la plus grosse réduction de friction disponible sur cette planche, et elle est gratuite. |
| Ce qu'il faut en retirer | — | — | À noter | Le libellé d'INTVL avoue sa finalité : l'attribution de campagne. §15.4 prévoit un test Apple Ads « plafonné après validation de la rétention ». Le jour où ce test aura lieu, la mesure devra se faire **sans ATT** (attribution Apple Ads agrégée, ou rien). Le sujet revient donc en décision, plus tard, hors de l'onboarding. |

### 1.5 Capture 5 — Paywall immédiat, essai 7 jours, compte à rebours

| Élément INTVL | A ? | B ? | Verdict | Raison |
|---|---|---|---|---|
| **Paywall juste après l'onboarding**, avant la première sortie | Non | Non | **Rejeter** | G28, mot pour mot : « **Aucun paywall à froid avant d'avoir expérimenté la valeur.** » §16.1 : « le gratuit permet d'évaluer l'application ». |
| Frise **Today (débloqué) / 2 days before (rappel) / In 7 days (facturé)** | **Oui** | Oui | **Reprendre** | C'est la meilleure idée de la planche. Elle rend la mécanique d'essai *lisible* au lieu de la cacher. G28 exige « prix mensuel/annuel, montant total facturé, récurrence » ; cette frise les montre dans le temps. |
| Interrupteur « me rappeler 2 jours avant » | Oui | Oui | **Adapter** | Bon principe, mais chez nous **ce rappel ne peut pas être tenu aujourd'hui** : il n'y a pas de push (voir §4.4). Un interrupteur qui promet un rappel impossible est un **bouton mort** (CLAUDE.md). Donc : soit une notification **locale** programmée (techniquement possible), soit pas d'interrupteur. |
| **Bandeau « LIMITED OFFER ENDS IN 23:57:24 »** | Non | Non | **Rejeter — dark pattern** | Une urgence fabriquée par l'app, qui se réarme à chaque installation. §14.2, ligne « Nouvelle collection » : « Maximum deux offres par mois, **sans urgence fictive** ». G24 : « Pas de pastilles rouges permanentes ni de **faux stocks restants** ». SPEC-UX L17 (dark patterns) l'interdisait déjà. En droit de la consommation français, annoncer une offre limitée qui ne l'est pas relève de la pratique commerciale trompeuse ; ce n'est pas seulement laid, c'est exposé. |
| « **67 % OFF** » avec 131,88 € barré | Non | Non | **Rejeter tel quel / Adapter** | 131,88 € = 12 × 10,99 €, un prix que personne n'a jamais payé, présenté comme un prix de référence barré. §16.1 dit la version honnête : « L'annuel représente environ **30 % d'économie** par rapport à douze paiements de 5,99 €. Afficher le montant annuel au moins aussi clairement que son équivalent mensuel. » C'est la même idée, énoncée comme une **comparaison** et non comme une **remise**. |
| « SEE ALL PLANS » + comparaison Annual / Monthly | Oui | Oui | **Reprendre** | §16.1 et G28. |
| « You won't be charged until Jul 31 » | Oui | Oui | **Reprendre** | Phrase honnête, datée, vérifiable. |
| **La demande de notifications surgit SUR le paywall** | Non | Non | **Rejeter** | §9.2 : « Les notifications arrivent lorsqu'on demande un rappel ou suit un événement, **pas comme une barrière au lancement**. » Empiler deux demandes sur le même écran maximise le taux d'accord et minimise le consentement éclairé. |
| Modale « Subscription information » mentionnant « **$10.99 monthly** » sur un écran en € | Non | Non | **Rejeter** | Un prix codé en dur qui contredit l'écran précédent. §16.1 : « Les prix définitifs viennent du Store et de sa localisation, **pas d'une chaîne codée en dur**. » |
| Bouton « Fermer » | Oui | Oui | **Reprendre** | G28 : « Fermer est immédiatement visible. » |

### 1.6 Capture 6 — Onglet Social

| Élément INTVL | A ? | B ? | Verdict | Raison |
|---|---|---|---|---|
| Filtre de discipline « All ▾ » (icône vélo) | Oui | Oui | **Reprendre** | Course et Vélo ne se mélangent jamais (§5.3, §9.3). Le filtre existe déjà dans `CrewHomeScreen` et `crew-feed` ; il doit être **partout où il y a une liste**. |
| Sélecteur « Explore ▾ » (fil global) | Oui | Non | **Adapter, pas reprendre** | §4.2, premier renoncement : « **Pas de fil général infini à l'ouverture.** » Notre équivalent est G16 « Découvrir un crew » — on explore des **groupes**, pas un flux. |
| Loupe (recherche) | Oui | Oui | **Adapter** | Existe côté serveur : `social_people_2026(text)`, `social_member_by_handle_2026`. §13.5 impose que le blocage s'applique **aussi à la recherche** — donc la recherche doit passer par ces RPC, jamais par une lecture directe de table. |
| Cloche (centre de notifications) | Oui | Oui | **Adapter — et c'est une bonne nouvelle** | Un centre d'activité **in-app** ne demande **aucun APNs**. C'est le seul canal de rappel réellement livrable aujourd'hui (voir §4.4). Interdit : la pastille rouge permanente (G24). |
| **Post ÉPINGLÉ par l'éditeur** : « WIN PRIZES — Bike Mode launch party, vélo carbone, kit, capteur ; il faut INTVL installé, du territoire capturé, et être sur place » | Non | Non | **Rejeter** | Trois problèmes cumulés : (a) c'est un **concours à lots physiques** conditionné à un usage du produit et à une présence physique — en France, une opération promotionnelle de ce type demande un règlement, un organisateur identifié et une analyse juridique propre ; (b) « il faut du territoire capturé » lie une chance de gain à une performance de jeu, ce que l'Annexe B refuse nommément ; (c) un **épinglé éditorial global** transforme le fil communautaire en canal marketing, contraire à §14.1 (les promotions sont un consentement distinct, désactivé par défaut). |
| Le **motif** « épingler » | Oui | Oui | **Adapter au crew** | G21 : « Annonce du capitaine identifiable. » Épingler l'annonce **du capitaine, dans son crew**, oui. Un épinglé de l'éditeur pour tout le monde, non. |
| Post communautaire (plainte sur le chevauchement, 10 likes) | — | — | **Voir §2** | C'est l'information la plus précieuse des 14 captures. |
| Carte « INTVL Community — Posted in — JOIN » | Oui | Oui | **Adapter** | Bon motif : un post porte l'identité du groupe où il est publié et une porte pour le rejoindre. Chez nous : `social_posts_2026.crew_id` existe déjà ; il manque le **chemin post → crew → G16**. |
| Badge de **niveau sur l'avatar** (38, 08, 107) | Oui | Oui | **Reprendre** | §7.2 : un niveau permanent unique. G22 : « **Pas de sept rangs différents au-dessus du nom.** » Un seul chiffre, celui-là, partout : c'est exactement ce que fait INTVL et c'est bien fait. |
| « 17 hours ago » + icône de discipline | Oui | Oui | **Reprendre** | |
| Ville + **drapeau de pays** | Oui | Oui | **Adapter : ville oui, drapeau non (pour l'instant)** | La ville est une donnée réelle chez nous (`fr_communes`, 34 969 communes, `city_zones`). Un drapeau n'a de sens que si le produit est international ; en Saison 0 française il serait décoratif, et il annoncerait une communauté mondiale qui n'existe pas — « zéro donnée factice ». Le drapeau revient **le jour où la deuxième nationalité arrive réellement**, par la même règle d'ouverture par présence que les classements (§3). |
| Titre libre (« Morning Run ») + texte | Oui | Oui | **Reprendre** | `social_posts_2026.body` existe (600 caractères). Le **titre** manque. |
| **Carrousel de 6–7 photos**, dont une vignette de carte avec repères kilométriques | **Oui** | Oui | **Reprendre, avec la protection** | C'est le cœur de « une activité est un objet social » (§3.1) et de §12.4 (modèles Trace, Terrain, Photo, Ensemble). ⚠️ Aujourd'hui `social_posts_2026` ne porte **qu'un seul média** (`media_path`). §5.6 s'applique à la vignette comme au reste : « La protection doit être appliquée aux **miniatures**, médias, liens, cartes de crews et exports ». L'EXIF est déjà retiré à l'upload (bucket `social-2026`). |
| Stats DISTANCE / DURATION / AVG. PACE | Oui | Oui | **Reprendre, masquable** | §12.4 modèle Trace = « trois mesures ». G22 : les statistiques « peuvent être masquées sur le profil public ». L'allure moyenne d'une sortie publiée volontairement est acceptable ; **l'allure comme critère de classement ne l'est pas** (§3.4). |
| **Bandeau « STOLEN 2 » (drapeau violet + avatars des victimes)** | Non | Non | **Rejeter la forme, reprendre le fait** | Le fait — « j'ai repris du terrain » — est déjà calculé chez nous, mieux que chez eux : `capture_result_2026` renvoie `neutralTakenM2` **et** `takenFromOthersM2` séparément (§5.4). La **désignation nominative des victimes** est un pilori : ADR-010 a déjà tranché que les notifications ne nomment ni lieu ni zone, et §13.5 interdit la notification nominative de proximité. Forme GRYD : « **+0,18 km² — dont 0,10 neutre et 0,08 repris** », sans nom, sans avatar, sans drapeau de scalp. |
| 62 likes + commentaires | Oui | Oui | **Adapter** | §13.4 : « Réactions **limitées et humaines** : encouragement, merci, à la prochaine. » Aujourd'hui `social_reactions_2026` est booléen (une réaction, sans type) : c'est un « like » déguisé. Le cahier demande plus riche, pas plus abondant. |

### 1.7 Capture 7 — Onglet Me

| Élément INTVL | A ? | B ? | Verdict | Raison |
|---|---|---|---|---|
| Segments **Progress / Activities** | Oui | Oui | **Reprendre** (déjà là) | G22 + G23. `ProfileHomeScreen` / `SeasonJourneyScreen` ont déjà des segments. |
| Bloc « **Challenges** — Earn experience to level up » + filtre « Run ▾ » | Oui | Oui | **Adapter** | L'**idée** — une liste de défis courts, visible, filtrée par sport — est bonne et nous manque. La **récompense** ne peut pas être l'XP (§7.1). Voir §4. |
| « **Enable notifications — CLAIM 10XP — TAP TO CLAIM** » | Non | Oui | **Rejeter** | Trois raisons, chacune suffisante. (a) §7.1 : les XP viennent des journées actives ; en donner pour une permission rend le niveau incomparable entre deux joueurs. (b) Un consentement **acheté** n'est pas un consentement libre — §18.5 s'appuie sur la doctrine CNIL, qui distingue permission technique et accord éclairé. (c) §14.1 : les notifications servent un événement que l'utilisateur comprend ; les activer pour toucher 10 XP n'est pas cet événement. Le document du 09/09 avait déjà posé ce verdict (§11) : on le confirme. |
| « **Add Profile Picture — 10XP** » | Non | Oui | **Rejeter la récompense, garder la liste** | Une check-list de mise en route est utile et réduit la friction. Elle ne doit **rien** rapporter qui entre dans le jeu. GRYD a déjà l'équivalent honnête : la famille de badges **Départ** (§7.4 — « Première activité ; première boucle valide »), qui récompense une *action sportive*, pas un réglage. |
| Coach-mark « Earn more as you move… » (I'm good / Next, **5 points**) | Oui | Non | **Adapter, borné** | §9.2 : apprentissage **progressif**, contextuel. Une visite guidée en 5 étapes au lancement est l'inverse. Règle : au plus **deux** coach-marks, déclenchés par un contexte réel, toujours ignorables, jamais avant la première sortie. |
| « **Competitions** — Submit entries to win prizes. **More entries = better chances to win** » | Non | — | **Rejeter** | C'est la définition d'une loterie promotionnelle à chances variables. |
| « INTVL Comp 26.6 », « **$1 277 AUD prize pool** » (montres Garmin / WHOOP), « **6D 0H** » | Non | — | **Rejeter** | Lots physiques + compte à rebours + tirage. Hors périmètre produit, et hors périmètre juridique sans règlement et organisateur identifiés. |
| « **Capture territory to earn entries** » | Non | — | **Rejeter, catégoriquement** | Lie une chance de gain à la performance de jeu. Et INTVL Pro annonce « **plus de participations aux concours** » : Annexe B du cahier l'a déjà nommé — « **GRYD ne reprend pas une probabilité de récompense augmentée par le paiement.** » C'est du pay-to-win par la porte de derrière : on n'achète pas la victoire, on achète les tickets. |
| L'**intention** derrière (donner un objectif court, daté, désirable) | Oui | Oui | **Reprendre — par le chemin gratuit** | §7.3 : douze paliers de saison, **gratuits**, à condition **déterministe** (12 journées actives en 6 semaines). Personne ne perd un tirage ; tout le monde qui court obtient. C'est meilleur, et ça existe déjà en base (`season_reward_templates_2026`, 12 lignes semées). |
| Cartes de territoire « **17.3 km²** », « 12.7 km² » | Oui | Oui | **Reprendre** | Fait personnel, vérifiable, dérivé de la géométrie serveur. Chez nous : `get_ownership_2026` / `capture_result_2026`. **Ce n'est pas un classement** — c'est un état. |

### 1.8 Capture 8 — Barre basse Me / Play / Social

| Élément INTVL | A ? | B ? | Verdict | Raison |
|---|---|---|---|---|
| Trois onglets seulement | Oui | Oui | **Reprendre le principe** | §9.1 : « Pas de quatrième destination Boutique, Saison ou Classement. » Appliqué et verrouillé : `apps/mobile/src/features/nav/tabs.ts` (« EXACTEMENT trois — ne JAMAIS en ajouter un 4ᵉ ici, flag ou pas »). |
| **« Play » au centre de la barre** | Oui | Oui | **Rejeter** | §9.1 : « Le bouton de départ appartient à la Carte. Il ne flotte pas sur une page de confidentialité, un achat ou le Profil. » Décision fondateur déjà en vigueur : le bouton d'action central est **GO**, sur la carte. |
| **« Social » comme destination de premier rang** | Oui | Oui | **La vraie leçon de cette capture** | INTVL donne un tiers de sa navigation au social. Nous donnons ce tiers à **Crew**. Ce n'est pas un manque — c'est un pari : un petit groupe qui se reconnaît plutôt qu'un flux d'inconnus (§13.1). Mais le pari n'est tenu que si l'onglet Crew est **au moins aussi vivant** que leur onglet Social. Voir §5. |

---

## 2. L'insight le plus utile des 14 captures : la plainte sur le chevauchement

**La capture 6 contient un post communautaire, signé Samuel Duley (niveau 107), 10 likes :**

> « quand quelqu'un fait une course qui touche juste un coin de ta course, ça retire **TOUTE** ta
> course de la carte. Super agaçant. »

C'est un utilisateur de niveau 107 — donc engagé, donc pas un débutant qui n'aurait pas compris — qui
décrit un modèle où la propriété est **atomique par course** : mordre un coin d'une boucle en efface
la totalité. La conséquence est un jeu où l'effort d'une heure disparaît sur un chevauchement de dix
mètres, et où il n'y a aucune raison de tenir un terrain plutôt que d'en reprendre un autre.

### Ce que GRYD fait, et qui est déjà en base

`supabase/migrations/0118_refonte_2026_polygon_authority.sql` — fonction `rebuild_ownership_2026` :

- elle rejoue les `capture_events_2026` d'une discipline **dans l'ordre `(closed_at, id)`**, c'est-à-dire
  l'ordre des **fermetures physiques** (§5.3), et non l'ordre d'arrivée réseau ;
- pour chaque nouvel événement, elle retire **uniquement la partie qui se recouvre** au propriétaire
  précédent : `ownership_2026.geometry = ST_Difference(geometry, e.geometry)` ;
- elle ne supprime la ligne que si la géométrie restante est **vide** ;
- elle décompose la prise en quatre géométries, écrites sur l'événement : `new_geometry`,
  `neutral_geometry` (neutre pris), `taken_geometry` (repris à d'autres), `already_owned_geometry`.

**Autrement dit : le défaut dont se plaint l'utilisateur d'INTVL est structurellement impossible chez
nous.** Un rival qui mord un coin prend ce coin. C'est la lettre du §5.3 : « Elle prend le terrain
neutre et remplace la possession précédente **dans la seule zone de recouvrement**. Les parties
situées hors de son polygone restent inchangées. »

### Ce qu'il faut garantir, et qui n'est pas garanti aujourd'hui

1. **Le montrer, pas seulement le calculer.** `capture_result_2026` renvoie déjà la décomposition. Le
   résultat de sortie (G12) doit dire « **+0,18 km², dont 0,10 neutre et 0,08 repris** », pas
   « +0,24 km² » (§5.4 le dit avec l'exemple de Léa, chiffres à l'appui).
2. **Le montrer aussi quand on PERD.** Le cahier ne demande pas d'alarme (§14.2 : « Une reprise de
   terrain par un rival alimente le journal du jeu et le résumé choisi, **pas une alarme
   immédiate** »). Mais un joueur qui rouvre la carte et trouve sa forme rétrécie sans explication
   vivra la même frustration que chez INTVL — pour une raison **inverse** et **juste**. Le journal
   doit porter « **0,04 km² repris dans ton terrain** », en m², sans nom de lieu (ADR-010) et sans
   nom de joueur (§13.5).
3. **Le coût.** Le commentaire de `rebuild_ownership_2026` le dit lui-même :
   « Production throughput requires spatial-component replay before a large rollout. » La fonction
   **efface et rejoue toute la discipline** à chaque appel. C'est correct et c'est lent. Tant que
   c'est le mode nominal, tout ce qui lit la possession (carte, classement, défi) hérite de cette
   latence. **À traiter avant l'ouverture large — pas avant la bêta.**
4. **La tension ADR-010 reste ouverte.** ADR-010 (03/08) déclare que la propriété = les cellules H3 ;
   `0118` déclare que la propriété = le polygone. `0118` est appliquée en prod depuis le 10/09 et
   bloque par trigger toute écriture legacy pour une activité `2026.1`. **Le code a tranché ; l'ADR
   ne l'a pas.** ADR-013 doit le constater (voir le brouillon).

---

## 3. Classements

### 3.1 Le point de départ : ce que le cahier a retiré, et pourquoi

`SOURCE_OF_TRUTH_REGISTER.md`, D-20 : parmi les décisions remplacées figure « **le classement
universel aux km²** ». Le cahier le redit trois fois :

- §5.3 : « Cette règle favorise forcément les personnes qui sortent davantage sur la carte libre. Le
  produit l'assume et **ne transforme pas cette carte en classement global de mérite sportif.** »
- Annexe A : « Surface brute comme classement universel → **Surface descriptive** en jeu libre ;
  **points bornés** pour les défis. »
- ligne 36 : « Compétition | Défis de crews facultatifs, budgets de contribution identiques,
  **sans classement universel aux km²**. »

Les trois raisons, dites explicitement : on **compare des géographies inégales** (un km² de Rouen
n'est pas un km² de campagne), on **paie le volume** (celui qui a le plus de temps gagne), et on
**fabrique des rivaux** là où il n'y en a pas (§6.5).

**La demande du fondateur n'est donc pas refusée — elle est une décision nouvelle.** Il faut classer
sans recréer ce que le cahier a écarté. C'est faisable, à trois conditions : **borner la géographie**,
**borner la métrique**, **ne rien afficher quand il n'y a personne**.

### 3.2 Ce qui existe déjà (à ne pas reconstruire)

| Brique | Où | État réel |
|---|---|---|
| Moteur de classement PUR | `packages/engine/src/leaderboard.ts` (+ `leaderboard.test.ts`) | Complet. Ordonne des mesures, 4 critères de départage, rangs de compétition avec ex æquo, **refuse une liste mixte Run/Bike**. Ne lit ni achat, ni bonus, ni multiplicateur. **Réutilisable tel quel.** |
| Tables de snapshots | `leaderboard_snapshots`, `leaderboard_entries` (0082) | Créées, **vides**, **aucun écrivain** hors tests. Le preneur de snapshot n'a jamais été écrit. |
| RPC de mesure ville / département | `city_player_surface_board` (0091 + 0092), `dept_player_surface_board` (0103) | Fonctionnels, avec exclusion du `discreet_mode` et aucune jointure vers une table d'achat. **Mais ils lisent `territories`**. |
| Matview crew | `crew_leaderboard` (0086) + `crew_board()` | Rafraîchie toutes les 15 min par `recompute_sectors` (cron `gryd_recompute_sectors`). **Mais elle dérive de `hex_claims`.** |
| Référentiel géographique | `fr_communes` (0068 — 34 969 communes, INSEE, lat/lng, **sans polygone**), `city_zones` (0002 — `geojson` par ville ouverte), `gryd_dept_of_insee()` (0103) | Réels, Licence Ouverte Etalab. |
| Écran | `apps/mobile/app/(tabs)/classement.tsx` | **Retiré** : trois lignes, redirection vers `/season`. `leagueBoard.ts` et `surfaceBoard.ts` ne sont plus atteignables depuis aucun écran. |

### 3.3 Le fait qui commande tout le reste

**`0118` a débranché les classements existants.** Le trigger `prevent_legacy_capture_2026` interdit
toute insertion dans `territories` et `hex_claims` pour une activité `ruleset_version = '2026.1'`.
Or `city_player_surface_board` et `dept_player_surface_board` lisent **`territories`**, et
`crew_leaderboard` dérive de **`hex_claims`**.

**Conséquence : à partir du 10/09, ces trois classements mesurent une table que le jeu n'alimente
plus.** Ils ne sont pas faux, ils sont **vides pour le jeu réel** — et ils le resteront. Un écran
branché dessus afficherait « personne n'a couru » à des joueurs qui tiennent du terrain. C'est
exactement le mensonge que 0091 s'était interdit dans son propre en-tête.

**Un classement 2026 doit lire `ownership_2026`. Il n'y a rien d'autre.**

### 3.4 Les options, jugées

#### a) Sujet : solo ou crew

| Option | Équité | Risque de faux | Vie privée | Verdict |
|---|---|---|---|---|
| **Solo** | Correcte si la géographie est bornée | Élevé : à 3 joueurs, un « podium » est une farce | Élevé : un rang nomme une personne dans un lieu | **Oui, à l'échelle commune, avec un seuil de population** |
| **Crew** | Bonne : un agrégat lisse les disponibilités individuelles | Moyen : à 2 crews, ce n'est pas un classement, c'est un match | Faible : un agrégat sur ≥3 personnes ne désigne personne (précédent ADR-010 : `notifCrewRank` garde son nom de ville pour cette raison exacte) | **Oui, mais par les résultats de matchs, pas par les km²** |

#### b) Discipline

Non négociable : **Course et Vélo sont deux classements**, jamais un. `rankLeaderboard` refuse déjà
une liste mixte (`foreign_activity`) : la garantie est dans le moteur, pas dans la discipline des
appelants.

#### c) Portée géographique

| Portée | Réalisable ? | Équitable ? | Verdict |
|---|---|---|---|
| **Quartier / secteur** | Oui (H3 res 7 existe) | Non | **Rejeter.** Un rang à l'échelle du quartier localise une personne. §13.5 : « Les cartes ne servent pas à suivre une personne. » |
| **Commune** | Oui — `city_zones.geojson` est un vrai polygone, déjà utilisé par le jeu | **Oui, c'est la maille juste** | **Retenir.** On compare des gens qui courent les mêmes rues. |
| **Département** | Oui — `gryd_dept_of_insee()` déduit la maille du code INSEE, aucune donnée ajoutée | Correcte | **Retenir en second rang.** Argument de 0103 : « Pour un joueur seul dans sa commune, un classement ville est un podium à une place. » |
| **Région** | Non aujourd'hui — exige une table département → région (101 → 18) qui n'existe nulle part | Correcte | **Déclarer, ne pas servir.** Le référentiel est public (Etalab) : c'est une donnée réelle à importer, pas une donnée inventée. Faible priorité. |
| **National (France)** | Techniquement oui | **Non** | **Rejeter sur la surface.** C'est le classement universel aux km² que le cahier a retiré : il compare Rouen à Paris. |
| **Européen / international** | Non | Non | **Rejeter aujourd'hui, sans exception.** Saison 0 = France (ADR-006). Un classement européen serait vide ou peuplé de fantômes. « Zéro donnée EU factice » est constitutionnel — CLAUDE.md le nomme, ADR-006 le confirme. |

**La réponse à « national, international, européen » n'est donc pas « non ». Elle est : la même
échelle s'ouvre toute seule quand la réalité l'autorise.** Le dépôt a déjà ce motif — l'ouverture des
communes par présence (0068 / `open_city`). Un classement suit exactement la même règle : une portée
devient visible quand elle a assez de sujets classés **réels**, et pas avant. Le code est le même ;
seule la population change. Rien n'est promis, rien n'est inventé, et le jour où un crew de Bruxelles
joue vraiment, l'échelon s'allume sans une ligne de code de plus.

#### d) Métrique — le choix décisif

| Métrique | Équité | Risque de faux | Anti-triche | Coût | Verdict |
|---|---|---|---|---|---|
| **Surface actuellement tenue (m²)** | Faible en absolu (stock : celui qui a commencé le premier reste devant) ; correcte en local | Moyen | Bon : dérivée de la géométrie serveur, non gonflable | Moyen (`ST_Area` sur `ownership_2026`) | **Secondaire.** C'est un **état**, à montrer comme tel — « Ton terrain à Rouen », pas « ton rang ». |
| **Nouveau terrain de la semaine (m² pris)** | **Bonne** : c'est un **flux**, il repart à zéro chaque semaine, un arrivant peut être premier dès sa première boucle | Moyen | Bon : `new_geometry` est déjà calculée par événement | Faible (somme sur les événements de la semaine) | **Principal.** C'est le classement que je recommande de lancer. |
| **Boucles fermées (nombre)** | Moyenne : pousse à multiplier les micro-boucles | Faible | Correct (les seuils 800 m / 5 000 m² bornent) | Très faible | **Non.** Redondant avec la précédente, et incite à un comportement que §4.2 refuse. |
| **Journées actives / XP** | Parfaite par construction (3/semaine max, §7.1) — **et c'est le problème** : tout le monde plafonne, le classement dégénère en peloton d'ex æquo | Faible | Bon | Très faible | **Non comme classement.** C'est déjà la saison (§7.3), et en faire une course crée la pression de sortie que §4.2 et §14 interdisent. |
| **Points de défi** | **Excellente** : bornée à 6 par personne, 30 par équipe (§6.2), insensible au temps disponible | Faible | Bon : `challenge_contributions_2026` est verrouillée à validation | Faible | **Principal pour les crews.** C'est la seule compétition que le cahier a conçue comme équitable. |
| **Performance (allure, chrono, PR)** | **Nulle** | — | Mauvais | — | **Rejeter, sans discussion.** §6.2 : « Aucun départage par vitesse, distance, fréquence cardiaque. » §6.5 : « La vitesse individuelle n'est pas un classement de valeur humaine. » §16.1 : « Les outils de comparaison restent **privés** ». Un classement d'allure publique sur des rues réelles incite à courir vite sur la voie publique ; ce n'est pas une position morale, c'est une position de responsabilité. |
| **Volume de messages, parrainages, achats** | — | — | — | — | **Rejeter.** Déjà interdit par `GRYD_COMMUNAUTE_BENCHMARK_2026_09.md` (« aucun classement dérivé du volume de messages ») et par §16.2. |

### 3.5 Recommandation

**Trois objets, dont un seul s'appelle un classement.**

**① « Ta commune, cette semaine » — le classement solo (à lancer en premier).**
Sujet : joueur. Portée : commune (`city_zones`), repli département. Discipline : séparée.
Métrique principale : **nouveau terrain de la semaine** (somme de `capture_events_2026.new_geometry`
des événements `published` de la semaine glissante). Métrique secondaire affichée sur la même ligne :
terrain actuellement tenu. Départage : moteur `rankLeaderboard` (déjà écrit, déjà testé).

**② Les ligues de crews — la seule compétition classée (après les défis).**
Sujet : crew. Portée : la division, pas la géographie. Métrique : **résultats de matchs**
(`crew_challenges_2026` + `challenge_publications_2026.result`), c'est-à-dire des points de match,
jamais des km². Les quatre ligues du §6.6 — Découverte · Quartier · Ville · Horizon — sont déjà
nommées par le cahier, « **après calibration** ». Calibration = un nombre minimum de matchs terminés,
fixé **avant** la saison pilote et **jamais** modifié pour faire monter les gens (§6.6, mot pour mot).

**③ « Où j'en suis » — pas un classement.**
Mon terrain, mes journées actives, mes badges, ma saison. Aucun nom d'autrui. C'est là que vit la
réponse honnête à « et au niveau national ? » : un **effectif**, jamais un rang — « 4 200 personnes
courent sur GRYD en France » est un fait ; « tu es 3 512ᵉ de France » est une comparaison de
géographies.

### 3.6 Les six garde-fous, sans lesquels ça devient un mensonge

1. **Seuil de population.** En dessous de **N sujets classés** dans la portée, **aucun classement
   n'est affiché** — on affiche l'objet « premier ici » à la place. Un podium à trois est une donnée
   factice au sens de CLAUDE.md, même si les trois lignes sont vraies. Valeur proposée : N = 5.
   Elle vit dans `packages/shared/src/game-rules.ts` (ADR-003), jamais dans une requête.
2. **Quatre états, distincts** (CLAUDE.md) : *pas connecté* · *pas assez de monde ici* (≠ vide) ·
   *mesure indisponible* · *mesure en cours*. Jamais un tableau vide, jamais un « 0 » nu.
3. **Fraîcheur affichée.** Le classement est un **snapshot**, pris par un job. Chaque écran porte
   « mesuré à HH:MM ». Si le dernier snapshot est trop vieux, l'écran le **dit** au lieu de servir du
   périmé comme du frais. C'est le piège déjà payé dans ce dépôt : une matview sans job est un
   mensonge d'écran ; un snapshot sans horodatage visible en est un aussi.
4. **Respect du délai de publication.** Le classement ne lit que des `capture_events_2026` en statut
   `published`. Sinon le rang bouge **avant** le polygone et trahit une sortie encore privée — c'est
   nommément la recette n° 36 du cahier (« Pas de fuite indirecte via compteurs, perte de terrain ou
   **classement** »).
5. **Discrétion et consentement.** Sont exclus : le `discreet_mode` (précédent 0092), et quiconque
   n'a pas donné `shared_map_consent_2026`. Une personne en carnet privé (§5.6) ne doit apparaître
   dans **aucun** rang.
6. **Trois décisions séparées** (§18.4) : conserver l'activité / autoriser le jeu libre / **autoriser
   un classement**. Une activité `pending` (« verification_required », « source_or_clock_unconfirmed »)
   compte pour le journal, pas pour le rang.

### 3.7 Modèle de données proposé (réutilise, ne reconstruit pas)

```text
capture_events_2026 (0118)          ← la mesure : new_geometry, closed_at, status='published'
ownership_2026      (0118)          ← l'état  : geometry par (event, owner)
city_zones.geojson  (0002)          ← la portée commune (polygone réel)
gryd_dept_of_insee()(0103)          ← la portée département (déduite de l'INSEE)
        ↓  job de snapshot (nouveau, Edge Function + pg_cron)
leaderboard_snapshots / leaderboard_entries  (0082, déjà créées, vides)
        ↓  lecture
rankLeaderboard()   (packages/engine/src/leaderboard.ts — déjà écrit)
        ↓
un écran DANS Carte ou Profil — jamais un 4ᵉ onglet (§9.1, nav/tabs.ts)
```

Ce qu'il faut écrire, et **uniquement** ça :

- une fonction de **mesure** `board_source_metrics_2026(activity, scope, scope_ref, from, to)` qui
  agrège `ownership_2026` / `capture_events_2026` par propriétaire et par portée ;
- le **preneur de snapshot** qui manque depuis 0082, planifié par `pg_cron` (le dépôt en pose déjà
  deux en 2026 : `publish-capture-events-2026` et `publish-challenges-2026`) ;
- un `LEADERBOARD_RULES_2026` dans `game-rules.ts` : seuil de population, cadence, portées ouvertes,
  fenêtre de la semaine ;
- l'écran, avec ses quatre états.

**Ce qu'il ne faut PAS faire :** brancher un écran sur `city_player_surface_board` /
`dept_player_surface_board` / `crew_leaderboard`. Elles mesurent `territories` et `hex_claims`, que
le trigger de 0118 n'alimente plus pour le jeu 2026 (§3.3).

---

## 4. Défis, récompenses gratuites, notifications

### 4.1 Ce que le cahier a déjà — et qui est en base

| Objet | Cahier | Base (10/09, prod) | Manque |
|---|---|---|---|
| Défi 5v5 hebdomadaire | §6.2 | `0122` : 9 tables, 21 RPC, cron `publish-challenges-2026`, règles semées `(5, 7 j, 3 secteurs, 2 journées, 3 pts, 30 pts/équipe, 400 m / 1 000 m)` | **Aucune arène n'existe.** `challenge_arenas_2026` est vide ; `list_challenge_arenas_2026` renvoie `[]`. **Aucun défi ne peut démarrer.** |
| Saison, 12 paliers gratuits | §7.3 | `0121` : `season_reward_templates_2026` **semée avec les 12 paliers** ; règles semées `(6 semaines, 12 paliers, 100 XP, variantes premium 2/4/6/8/10/12)` | **Aucune saison de production n'est insérée** → `read_progression_2026` renvoie `season: null`. |
| XP par journées actives | §7.1 | `0119` / `0121` : `progress_accounts_2026.ledger`, moteur pur `progression2026.ts` | — |
| Badges de maîtrise | §7.4 | **Rien en 2026.** `badges` / `user_badges` sont legacy | Les 8 familles du §7.4 n'existent pas. |
| Catalogue d'objets | §7.5 | `0121` (saison) + `0125` (Contour / Relief / Clubhouse) | — |
| Notifications | §14 | **Rien en 2026.** `NOTIFICATION_RULES_2026` existe dans `game-rules.ts` et **n'a aucun consommateur** dans tout le dépôt | Tout. |

**Les deux premières lignes sont le vrai sujet.** Le fondateur demande des défis à récompenses
gratuites : le moteur est écrit, testé, déployé en prod — et il ne peut rien produire parce que
**deux jeux de données de configuration manquent** (les secteurs d'une arène, les dates d'une saison).
Ce sont des décisions produit, pas du développement.

### 4.2 Le jeu de défis proposé — trois niveaux, pas quatre

**① Défi personnel de la semaine — le seul ajout réellement nouveau.**
C'est l'équivalent honnête du bloc « Challenges » d'INTVL (capture 7). Règles :

- **Deux défis à la fois**, pas une grille. Filtrés par discipline (motif INTVL, bon).
- **Satisfaisables par une semaine normale.** Ils ne demandent jamais « plus » : ils demandent
  « ailleurs », « avec quelqu'un », « autrement ». Exemples adossés aux familles du §7.4 :
  *Exploration* — « ferme une boucle dans un quartier où tu n'as jamais couru » ;
  *Ensemble* — « fais une sortie avec au moins une autre personne » ;
  *Double pratique* — « une journée course et une journée vélo ».
- **Aucune expiration bruyante.** Un défi non réalisé disparaît en silence. §4.2 : « Pas d'alarme
  *tu perds tout* ni de compte à rebours poussant à sortir immédiatement. »
- **Récompense : un objet, jamais de l'XP.** L'XP reste réservé aux journées actives (§7.1). C'est
  précisément la ligne qu'INTVL franchit et qu'on ne franchit pas.

**② Défi de crew — existe (§6.2).** Rien à inventer. Il faut des arènes.

**③ Saison — existe (§7.3).** Rien à inventer. Il faut des dates.

**Ce qu'on n'ajoute pas :** pas de série quotidienne (§4.2), pas de check-list de mise en route
récompensée (§1.7), pas de concours à lots, pas de tirage, pas de monnaie (§7.5 : « **Pas de monnaie
virtuelle au lancement.** »).

### 4.3 Les récompenses gratuites internes

Le catalogue est déjà écrit (§7.5) et semé en base. Rien à inventer, tout à **relier** :

| Famille | Exemples | Source |
|---|---|---|
| Cadres de profil | `line_frame` (niveau 3), `profile_frame` (palier 4), `ridge_merit` (niveau 20, « réservé à ce mérite ») | `LEVEL_REWARDS_2026`, `SEASON_REWARDS_2026` |
| Motifs de trace, palettes | `trace_pattern` (palier 3), `chalk` (niveau 5) | idem |
| Signatures et titres | `first_trace` (niveau 2), `title` (palier 6), `cartographer` (niveau 30) | idem |
| Compositions de partage | `atlas` (niveau 10), `photo_composition` (palier 7), `final_poster` (palier 11) | idem |
| Emblèmes, stickers, animations | `personal_emblem` (8), `sticker` (5), `short_animation` (9), `contour_animation` (niveau 15) | idem |
| Souvenirs | `recap` (10), `season_memory` (12) | idem |

**La règle qui les tient tous** (§16.2, §7.2, `COMMERCIAL_PROPOSAL_2026` : `paidCaptureMultiplier: 1`,
`paidXpMultiplier: 1`, `paidChallengeMultiplier: 1`) : **aucun objet ne change un calcul de capture,
de match ou d'XP.** Ils changent ce qu'on montre, jamais ce qu'on gagne.

**Le manque réel n'est pas le nombre d'objets, c'est le chemin.** Le document du 09/09 l'avait
identifié : montrer la prochaine récompense **et son usage** — « Équiper », « Créer une affiche »,
« Ajouter à mon profil ». `equip_season_reward_2026` existe ; la boucle « je gagne → je vois → je
mets → ça se voit dans mon partage » est ce qui rend une récompense gratuite désirable. INTVL promet
des « exclusive skins » sans jamais montrer où ils apparaissent : ne pas reproduire ça.

### 4.4 Notifications — le fait qui change tout

**Aujourd'hui, GRYD ne peut émettre aucune notification. Pas « peu ». Aucune.**

- **Push distant : impossible.** `apps/mobile/plugins/withoutPushEntitlement.js` **supprime activement**
  l'entitlement `aps-environment` du build iOS (retrait daté du 09/08/2026 : le profil de
  provisioning ne porte pas la capacité Push, et le build EAS échouait). Sans entitlement, pas de
  token APNs ; `registerPushDevice` retourne `unavailable` et `push_devices` reste vide. La chaîne
  serveur (`_shared/push.ts`, `_shared/expo-push.ts`, `steal_push_job`, `digest_job`) est intacte —
  elle envoie à des destinataires qui n'existent pas.
- **Notification locale : techniquement possible, mais inatteignable.** `scheduleNotificationAsync`
  n'apparaît qu'à un seul endroit du dépôt (`src/features/notifications/localReminder.ts:104`,
  rappel quotidien, identifiant stable `gryd-rendezvous-daily`). Son unique composant appelant,
  `RendezvousOptIn.tsx`, **n'est monté dans aucune route**.
- **`NOTIFICATION_RULES_2026` n'a aucun consommateur** : la politique du §14.1 (3 par semaine,
  1 par jour, 2 offres par mois, plage calme 21 h–9 h, promotion désactivée par défaut,
  `immediateTerritoryLossPush: false`) est écrite et n'est appliquée nulle part.

**Ce que ça change, dit franchement :**

| Ligne de la matrice §14.2 | Local seul ? | Verdict |
|---|---|---|
| Rappel d'une sortie à laquelle je me suis inscrit | **Oui** | Réalisable maintenant : l'appareil connaît la date, il programme, il annule si l'événement change **pendant que l'app est ouverte**. |
| Rappel d'essai « 2 jours avant » (capture 5) | **Oui** | Réalisable. |
| Récap hebdomadaire choisi | Oui, dégradé | Programmable localement ; le contenu ne sera juste qu'après une ouverture. §14.2 : « rien sans contenu réel ». |
| Résultat de sortie prêt | Non | Le calcul est serveur. |
| Score adverse publié à midi (§6.4) · défi terminé | Non | Serveur. |
| Mention, adhésion acceptée, événement modifié ou **annulé** | Non | Serveur. Et c'est le plus grave : la recette n° 29 exige qu'un rappel programmé soit **supprimé** quand l'événement est annulé. Un rappel local ne peut pas être annulé par le serveur. |
| Retour après 14 jours | Non | Serveur. |

**Deux conséquences opposables :**

1. **Aucun bouton mort** (CLAUDE.md : « l'affichage se dérive de la capacité RÉELLE de la
   plateforme »). L'écran G27 ne doit proposer **que** les catégories que la plateforme peut
   réellement délivrer. Un réglage « Résultats de défi » sur un build sans APNs est un interrupteur
   qui ne branche rien.
2. **La cloche in-app (capture 6) devient le canal principal**, pas un lot de confort. Elle ne demande
   aucune permission, aucun entitlement, aucune clé — et elle porte honnêtement tout ce que le push
   ne peut pas porter. Interdit : la pastille rouge permanente (G24).

**Décision fondateur requise** (dans le brouillon d'ADR) : ouvrir une clé APNs et remettre
l'entitlement, ou assumer un lancement sans push. Les deux sont tenables ; ce qui ne l'est pas, c'est
de peindre des réglages de notification en attendant.

### 4.5 Une tension qu'il faut nommer

`docs/STATUS.md` (10/09) le dit : **GRYD+ contredit ADR-011.** Les écrans d'abonnement existent
(`0120`, `0125`, `ProfilePremiumScreen`, `CommercialCollectionsPanel2026`), le cahier §16.1 vend dès
P1, et ADR-011 (« GRYD est 100 % GRATUIT au lancement ») exigeait « un ADR à part » pour ouvrir un
catalogue. **Cette tension n'est pas dans le périmètre de la demande du fondateur du 10/09** — mais
tout ce qui touche au paywall (§1.5) reste suspendu à elle, et ADR-013 ne doit pas la trancher par
ricochet.

---

## 5. Social : sommes-nous « plus poussés » qu'INTVL ?

### 5.1 L'écart, honnêtement

| Fonction | INTVL | GRYD (base 10/09) | Écart |
|---|---|---|---|
| Fil d'activités | Global + filtre discipline | **De crew** (`social_feed_2026`), filtre discipline | Volontaire (§4.2). Pas un manque. |
| Post = activité | Oui, riche | Oui : `social_posts_2026` porte `run_id` | Égalité de principe |
| Texte | Titre + corps | Corps (600 car.) | **Titre manquant** |
| Photos | **Carrousel 6–7** | **Un seul média** (`media_path`) | **Écart réel** |
| Vignette de carte | Oui, avec repères km | Trace disponible (`territories.geometry`, modèles §12.4) | À relier au post |
| Stats sur le post | Distance / durée / allure | Existent côté activité | À relier |
| Impact territorial | « STOLEN 2 » + victimes nommées | `neutralTakenM2` / `takenFromOthersM2` calculés | **On a mieux, on ne l'affiche pas** |
| Niveau sur l'avatar | Oui | Niveau permanent existe | À afficher |
| Réactions | Like (compteur) | Booléen (`social_reactions_2026`) | **Les deux sont pauvres.** §13.4 demande mieux : encouragement / merci / à la prochaine |
| Commentaires | Oui | Oui (`social_comments_2026`) | Égalité |
| Signalement / blocage | Présent | **Complet** : `social_reports_2026`, `social_blocks_2026`, RLS par `social_post_visible_2026`, blocage bilatéral | **Avantage GRYD** |
| Recherche | Loupe | `social_people_2026` existe, sans écran | À brancher |
| Cloche | Oui | Centre d'activité **legacy** (lit `user_badges` + `territory_contests`) | À refaire sur les faits 2026 |
| Communautés + JOIN | Oui | `crew_discovery` + G16 | À relier depuis un post |
| Conversation de groupe | Non observée | **`crew_messages_2026` (0127)**, paginée, modérée | **Avantage GRYD** |
| **Rendez-vous réels** | Non observés | **`crew_outings_2026` (0124/0128)** : liste, RSVP, capacité, modification versionnée, annulation, export ICS | **Avantage GRYD, décisif** |
| Rôles sportifs | Non observés | `crew_sporting_roles_2026` (accueil / hôte de sortie / éclaireur) | **Avantage GRYD** |
| Messages privés ouverts | Non observés | Absents | **Volontaire** (G21 : « Éviter les messages privés ouverts à tous au lancement ») |

### 5.2 Ce que « plus poussé » doit vouloir dire

Pas « plus de flux ». INTVL est plus poussé que nous sur **l'objet social** (une sortie racontée en
photos). Nous sommes plus poussés qu'eux sur **le collectif réel** (un rendez-vous auquel on
s'inscrit, une conversation modérée, des rôles). C'est le pari du §4.3 : « **Le crew organise de
vraies sorties.** »

**Donc l'ordre est : d'abord combler l'écart sur l'objet social — qui est petit et concret — puis
capitaliser sur l'avance collective, qui est notre différence défendable.**

### 5.3 Ce qu'il faut ajouter, par valeur décroissante sur effort croissant

| # | Ajout | Valeur | Effort | Contrainte |
|---|---|---|---|---|
| 1 | **L'impact honnête sur le post** : « +0,18 km² — 0,10 neutre, 0,08 repris » | Élevée : c'est notre « STOLEN », en mieux et sans pilori | Faible : `capture_result_2026` le calcule déjà | Jamais de nom, jamais d'avatar de « victime » (§13.5, ADR-010) |
| 2 | **Niveau sur l'avatar + commune, partout** | Élevée : identité lisible en un coup d'œil | Faible | Un seul rang (G22) ; pas de drapeau (§1.6) |
| 3 | **Réactions nommées** (encouragement / merci / à la prochaine) | Élevée : §13.4 mot pour mot, et ça nous distingue du « like » | Faible : ajouter un type à `social_reactions_2026` | Liste **fermée**, pas d'emoji libre |
| 4 | **Titre du post + vignette de trace** | Élevée | Moyen | Protection départ/arrivée sur la miniature (§5.6) |
| 5 | **Plusieurs photos** | Élevée | Moyen : table de médias, quotas, modération à l'échelle | EXIF déjà retiré ; quota de stockage à mesurer (§16.5) |
| 6 | **Cloche = centre d'activité 2026** | Élevée (seul canal livrable, §4.4) | Moyen | Pas de pastille permanente (G24) |
| 7 | **Chemin post → crew → rejoindre** | Moyenne | Faible | G16 : montrer l'accueil et les horaires **avant** le classement (§13.1) |
| 8 | **Épinglé du capitaine** | Moyenne | Faible | Dans le crew uniquement (G21) |
| 9 | **Recherche de personnes / crews** | Moyenne | Faible : RPC existante | Doit respecter le blocage (§13.5) |
| 10 | **Mises en avant tournantes** (nouveaux, organisateurs, réguliers) | Moyenne | Moyen | §13.4 : « Ne pas réserver toute la visibilité aux plus rapides. » |
| 11 | **Album de sortie de groupe** (§6.7) | Élevée à terme | Élevé | Consentement de chaque contributeur |

**Ce qu'on n'ajoute pas :** fil global infini, messages privés ouverts, classement de messages,
mise en avant achetable, notification nominative de proximité.

---

## 6. Feuille de route

Lots de 1 à 3 jours. « Décision » = ce que seul le fondateur peut trancher.

### Lot 0 — Purger les mensonges connus (1 j) — **avant tout le reste**

`docs/STATUS.md` du 10/09 liste des constats non corrigés qui rendraient tout ajout malhonnête :
`/appel` (recours anti-triche) n'a plus aucune porte ; `/profil` est servi par deux fichiers en
conflit ; le tunnel `/setup/*` n'est dans aucun parcours ; `crew_overview()` reste figé sur
`hex_claims` ; `territory_reigns` restera vide sous le trigger de 0118. Un classement branché sur une
base qui ment déjà propage le mensonge.
*Dépendances : aucune. Décision : aucune.*

### Lot 1 — Les deux jeux de configuration qui débloquent tout (1 j de saisie, **décision fondateur**)

1. **Les secteurs des arènes de Rouen** (`configure_challenge_arena_2026`) : trois secteurs
   accessibles, limites figées pour la semaine (§6.2). Sans ça, aucun défi 5v5 ne peut exister.
2. **Les dates de la Saison 0** (`configure_season_collection_2026`) : 6 semaines, fuseau, début.
   Sans ça, `season: null` et les 12 paliers gratuits ne progressent pour personne.
*Dépendances : aucune, tout est en prod. Décision : les deux — géographie et calendrier.*

### Lot 2 — L'impact honnête, de bout en bout (2 j)

Afficher `neutralTakenM2` / `takenFromOthersM2` sur le résultat (G12), sur le post social et dans le
journal quand on **perd** du terrain. C'est la réponse directe à la plainte de la capture 6, c'est
notre meilleur argument face à INTVL, et c'est du câblage : le calcul existe.
*Dépendances : lot 0. Décision : aucune.*

### Lot 3 — L'objet social (3 j)

Réactions nommées (§13.4), titre, niveau + commune sur l'avatar, chemin post → crew.
*Dépendances : lot 2. Décision : la liste fermée des réactions (trois mots).*

### Lot 4 — La cloche : centre d'activité 2026 (2 j)

Faits 2026 (résultat prêt, réaction, commentaire, RSVP, changement d'événement, défi publié) à la
place des sources legacy. Aucun APNs requis.
*Dépendances : lot 3. Décision : aucune.*

### Lot 5 — Le classement de commune (3 j) — **le cœur de la demande**

`LEADERBOARD_RULES_2026` dans `game-rules.ts` · fonction de mesure sur `ownership_2026` /
`capture_events_2026` · preneur de snapshot planifié (`pg_cron`) écrivant dans `leaderboard_snapshots`
/ `leaderboard_entries` (0082, déjà créées) · lecture par `rankLeaderboard` (déjà écrit) · un écran
dans Carte ou Profil, jamais un 4ᵉ onglet, avec ses **quatre états** et son horodatage de fraîcheur.
*Dépendances : lots 0 et 2 ; PostGIS en prod (fait le 10/09).*
*Décision : le seuil N de sujets classés, et **où** vit l'écran (Carte ou Profil).*

### Lot 6 — Défis personnels de la semaine (2 j)

Deux défis à la fois, conditions vérifiables serveur, récompense = objet du catalogue, jamais d'XP,
expiration silencieuse.
*Dépendances : lot 1 (saison). Décision : la liste de départ des défis.*

### Lot 7 — Notifications, dans les limites réelles (2 j)

Appliquer enfin `NOTIFICATION_RULES_2026` (elle n'a aucun consommateur) : budget, plage calme,
déduplication, moteur de décision §14.3. Ne peindre que les catégories **délivrables**.
*Dépendances : lot 4. Décision : **APNs — oui ou non.** Tout le reste en dépend.*

### Lot 8 — Ligues de crews (3 j, après les premiers matchs)

Découverte · Quartier · Ville · Horizon (§6.6), sur les résultats de matchs. Ne pas ouvrir avant
d'avoir le nombre minimum de matchs, fixé **avant** et non révisé.
*Dépendances : lots 1 et 5. Décision : le nombre minimum de matchs et le taux de promotion.*

### Lot 9 — Photos multiples (3 j)

Table de médias, quotas, modération à l'échelle, protection des miniatures.
*Dépendances : lot 3. Décision : quota par post et coût de stockage accepté (§16.5).*

### Hors feuille de route, définitivement

Concours à lots physiques · tirages au sort · participations achetables · parrainage rémunéré en XP
ou en remise · compte à rebours d'offre · ATT · paywall à froid · classement d'allure · classement
national ou européen à la surface · fil global infini · messages privés ouverts.

---

## 7. En une phrase

INTVL nous apprend **une** chose que nous n'avons pas — *une sortie racontée est un objet social* — et
nous confirme **tout ce que le cahier avait déjà refusé** : l'urgence fabriquée, le consentement
acheté, la chance de gain vendue et le classement qui compare des géographies inégales. Le travail
n'est pas de leur ressembler ; il est de **finir de brancher ce qui est déjà en base**, et d'ouvrir
un classement qui reste vrai quand il n'y a que trois personnes dans la commune.
