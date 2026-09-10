# GRYD · Une feature façon BeReal : benchmark, verdict, variante

> **11/09/2026 · LOT B2.** Rang : document d'analyse, subordonné au cahier de septembre
> (`docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`, rang 0 par ADR-012) et à
> `docs/DECISIONS.md`. **Il ne décide rien.** Aucune ligne de code, aucune migration.
>
> **Demande du fondateur, mot pour mot (11/09/2026) :** « Crée un benchmark pour savoir si une
> feature comme BeReal peut être intéressante, et comment faire une variante si c'est
> intéressant. »

**Base de production au 11/09/2026 : 3 comptes, 0 donnée de jeu.** Aucun chiffre de GRYD ici n'est
une mesure d'usage : ce sont des faits de code, ou des chiffres publics sur BeReal avec leur source.

---

## 0. Réponse courte

**Copier BeReal : non.** Sa mécanique récompense d'être sur son téléphone au bon moment ; GRYD
récompense d'être dehors. Les deux ne cohabitent pas sans que l'une mente sur ce qu'elle demande. Et
le budget de §14.1 (3 sollicitations non transactionnelles par semaine, 1 par jour) interdit
arithmétiquement une notification quotidienne.

**Adapter le ressort : oui, sous une condition dure.** Le ressort réutilisable n'est pas la photo,
c'est **l'invitation synchrone** : tout le monde reçoit la même chose au même instant, et l'instant
n'est pas choisi. Transposé à GRYD : **« La Sortie Spontanée »**, une fois par semaine, le crew
invité ensemble à sortir dans les 90 minutes. **La condition :** elle repose entièrement sur une
notification synchrone, et **GRYD n'a aujourd'hui aucun producteur de notification**. Tant
qu'ADR-013 tension n° 1 (« APNs : oui ou non ? ») n'est pas tranchée, ce document est une étude, pas
un chantier.

---

## 1. BeReal, mécanique par mécanique

### 1.1 Chiffres publics, avec leurs contradictions

Les statistiques tierces se contredisent : elles sont données **avec leur écart**, jamais réduites à
un chiffre confortable.

| Fait | Chiffre | Source | Réserve |
|---|---|---|---|
| Pic d'utilisateurs mensuels | ~73,5 M (août 2022) | agrégateurs (Charle, Search Logistics) | estimation tierce, jamais publiée par BeReal |
| Chute après le pic | -61 % du total d'utilisateurs (2023) | Apptopia, via New York Times | BeReal a contesté et annoncé 25 M d'utilisateurs quotidiens (TechCrunch, 29/09/2023) |
| Rachat par Voodoo | annoncé le 11/06/2024, ~500 M€ | TechCrunch, communiqué BeReal | **1/3 en numéraire (~166 M$)**, le reste indexé sur la performance future |
| Utilisateurs au rachat | 40 M quotidiens | analyses du deal (Quartermast) | soit ~13,7 $ de valeur par utilisateur, très bas face à Snapchat (~38 $) |
| Utilisateurs fin 2024 | 16 M mensuels | agrégateur | **contredit** par des sources 2026 qui annoncent 40 M mensuels, 85 % Gen Z |
| Revenus | « plus de 30 M$ fin 2025 » | agrégateur | **contredit** par « 5 à 10 M$ en 2026 » sur un autre agrégateur |

**Affirmable sans se tromper :** un pic très rapide en 2022, une chute d'engagement documentée en
2023, une sortie par le rachat plutôt que par la croissance, une monétisation publicitaire ouverte
après. **Non affirmable :** son niveau d'usage réel aujourd'hui.

### 1.2 Les mécaniques, leur ressort, et leur usure

| Mécanique | Ressort psychologique | Ce qui a marché | Ce qui a lassé |
|---|---|---|---|
| **Notification quotidienne à heure aléatoire** | rareté + synchronie : tout le monde vit le même instant | l'app entière tenait dans un seul événement partagé ; aucune raison d'ouvrir en dehors | une injonction par jour devient une corvée ; c'est le premier motif de désinstallation cité |
| **Fenêtre de 2 minutes** | urgence, coût d'entrée quasi nul | la contrainte fabriquait l'authenticité mieux qu'une consigne | punit la vraie vie : en réunion, au volant, en course, on est « en retard » sans faute |
| **Double caméra avant/arrière** | on publie un lieu ET un visage, impossible à mettre en scène | signature visuelle immédiatement reconnaissable | publie une position en clair, ce que personne ne relit avant d'appuyer |
| **Retard affiché (« en retard de 2 h »)** | pression sociale douce, honnêteté forcée | dit la vérité sur le geste | devient une étiquette de honte quand il est permanent et comparé |
| **Obligation de poster pour voir** | réciprocité stricte | tue le voyeurisme passif, force la symétrie | transforme un plaisir en péage ; on poste sans envie pour accéder |
| **RealMojis** (réaction = selfie imitant un emoji) | présence, pas performance | une réaction coûte un geste réel, donc elle vaut quelque chose | friction élevée pour un signal faible |
| **Pas de filtre, pas de compteur de likes** | anti-Instagram assumé | le positionnement entier tenait là | rien à optimiser, donc rien à revenir chercher |
| **Memories (calendrier de ses posts)** | possession, continuité | la seule mécanique de rétention non punitive du produit | arrive trop tard : il faut des mois d'usage avant qu'elle vaille |
| **Amis seulement, puis Discovery** | intimité d'abord | l'intimité était le produit | Discovery a été remplacé par « Friends of Friends » (août 2023), aveu que l'ouverture n'a pas pris |

### 1.3 Les copies, et pourquoi elles ont échoué

| Copie | Lancement | Fin | Raison |
|---|---|---|---|
| **TikTok Now** | septembre 2022 | juin 2023 (moins de 9 mois) | la mécanique a été copiée, pas la raison d'y aller. Sur TikTok, l'attention était déjà captée ailleurs |
| **Instagram Candid Stories** | fin 2022, en test | développement ralenti, jamais généralisé | Instagram a attendu, vu la tendance s'effondrer, et s'est arrêté |
| **Snapchat (double caméra)** | 2022 | absorbé dans l'appareil photo | Snapchat avait déjà la spontanéité ; la copie n'ajoutait rien |

**La leçon, la plus importante de ce document :** ces trois copies avaient plus d'utilisateurs, plus
d'argent et plus d'ingénieurs que BeReal. Elles ont échoué quand même, parce qu'une mécanique
synchrone ne se greffe pas sur un produit qui a déjà une raison d'être ouvert : **elle doit être la
raison d'être elle-même, ou elle n'est rien.** Une copie littérale dans GRYD serait la quatrième de
cette liste.

### 1.4 Ce que BeReal est devenu (2024-2026)

Publicité in-app en juillet 2024 ; plateforme publicitaire américaine en avril 2025 ; plus de 200
annonceurs (Nike, Netflix, Amazon) ; **RealBrands**, qui laisse une marque publier dans la même
fenêtre de 2 minutes qu'un ami ; puis Bonus BeReal, BeReal Audio, RealPeople, Friends of Friends et
une découverte « Nearby ».

**Lecture :** le produit qui interdisait la mise en scène vend désormais l'emplacement de la mise en
scène. Conséquence d'une mécanique sans monétisation native. **À retenir : ne jamais placer une
marque dans la fenêtre.** C'est le seul endroit où l'attention est garantie, donc le seul endroit où
la vendre détruirait la confiance d'un coup.

---

## 2. Verdict pour GRYD

### 2.1 Les cinq faits de dépôt qui contraignent la réponse (vérifiés le 11/09/2026)

| Fait | Preuve | Conséquence |
|---|---|---|
| **Aucun producteur de notification n'existe** | `claim_notification_2026` (0141) a exactement **deux appelants** dans tout le dépôt, tous deux dans `0186_referral_rewards_2026.sql`. Les 10 lignes de la matrice §14.2 n'existent à aucun niveau | une feature synchrone n'a rien pour se déclencher |
| **Aucun canal distant** | l'entitlement `aps-environment` est retiré par `apps/mobile/plugins/withoutPushEntitlement.js` | même écrite, la sollicitation ne partirait pas |
| **Aucune boîte de réception consultable** | `public.notifications` (0006) a **un seul** écrivain (`0188`, dissolution de crew) et aucun écran de septembre ne la lit ; `app/activite.tsx` est legacy et orphelin (`audit-routes.mjs` : « porte perdue ») | le repli in-app n'existe pas non plus |
| **Le stockage photo existe déjà** | bucket `social-2026` (0124), chemin `<uid>/post/<uuid>.(jpg\|png\|webp)`, 5 Mo max, RLS d'insertion sur `split_part(name,'/',1)=auth.uid()`, purge de compte (0136) | la photo est le morceau **le moins cher** de la feature |
| **La caméra double n'existe pas** | `expo-camera` est **absent** de `apps/mobile/package.json` ; seul `expo-image-picker` est là, et il ne sait faire qu'**une** prise par la caméra système | la signature de BeReal demande un module natif et un build EAS |

### 2.2 La grille, notée sur 5 (deux colonnes, parce que la question en contient deux)

| # | Critère | BeReal copié tel quel | Variante « Sortie Spontanée » | Ce qui décide la note |
|---|---|:---:|:---:|---|
| 1 | Cohérence avec « le jeu se joue dehors » | **1** | **5** | BeReal paie le fait d'avoir son téléphone en main. La variante ne paie que le fait de démarrer une sortie |
| 2 | Coût d'attention face au budget §14.1 | **0** | **3** | 7 sollicitations par semaine contre 3 autorisées : arithmétiquement impossible. La variante en consomme 1, et prend la place d'une autre |
| 3 | Vie privée et mineurs | **1** | **4** | la double capture publie un visage et un lieu au même instant, contre §5.6 (extrémités masquées, publication différée de 30 min). La variante publie après la fin, sur consentement, une seule photo choisie |
| 4 | Modération UGC (App Review 1.2) | **2** | **4** | 7 photos par membre et par semaine contre **zéro modérateur humain organisé**. La variante plafonne à 1 photo hebdomadaire, dans un crew fermé, sur l'outillage 0124/0137-0139 déjà en place |
| 5 | Différenciation face à Strava et INTVL | **2** | **4** | copier une mécanique morte ne différencie rien. Une invitation de groupe synchrone n'existe ni chez Strava ni chez INTVL |
| 6 | Effet sur la rétention et sur les sorties RÉELLES | **1** | **3** | BeReal augmente l'ouverture d'app, pas l'activité physique. La variante vise la sortie, mais l'effet reste **non prouvé** et le restera jusqu'au premier crew réel |
| 7 | Dépendance à la push | **0** | **1** | c'est le point faible des deux colonnes. BeReal EST une notification. La variante dégrade mieux (fenêtre de 90 min, visible à l'ouverture de l'app), mais ne se lance pas sans canal |
| 8 | Coût | **1** | **2** | module natif + App ID + build EAS pour la double capture ; 6 à 9 jours de socle notification dans les deux cas |
| | **Total** | **8 / 40** | **26 / 40** | |

### 2.3 Conclusion

**Non à la copie. Oui sous condition à la variante.** La condition n'est pas une préférence, c'est un
blocage mécanique en trois points, dont aucun ne se lève par du code de cette feature :
**(1) APNs tranché** (ADR-013 tension n° 1, fondateur seul) ; **(2) un producteur de notifications et
une boîte de réception**, soit les 6 à 9 jours de socle déjà chiffrés par
`GRYD_VIE_DE_CREW_2026_09.md` §3, qui servent aussi aux 10 lignes de §14.2 aujourd'hui absentes ;
**(3) au moins un crew réel qui court** (avec 3 comptes et 0 donnée de jeu, un tirage hebdomadaire
n'invite personne).

Le critère n° 7 note **1 sur 5** dans la colonne retenue. C'est volontaire : c'est la faiblesse
honnête de cette proposition, et elle doit rester lisible.

---

## 3. Si oui : la variante GRYD

### 3.1 Trois candidates, une retenue

| Variante | Mécanique | Verdict |
|---|---|---|
| **V1 · La Sortie Spontanée** | une fois par semaine, à une heure tirée au sort, tout le crew reçoit la même invitation : 90 minutes pour **démarrer** une sortie | **RETENUE** |
| **V2 · Le Moment du Crew** | une photo synchrone, sans sortie, dans le fil du crew | **REJETÉE.** C'est BeReal avec un logo GRYD : elle paie le téléphone, ajoute du volume UGC et ne produit aucune sortie. Elle échoue au critère n° 1 |
| **V3 · La Fenêtre de la Commune** | même mécanique, mais à l'échelle de la commune | **REJETÉE au lancement, gardée en P2.** `LEADERBOARD_RULES_2026` exige déjà N = 5 sujets réels pour qu'une portée existe ; aucune commune ne les a. Et inviter des inconnus au même endroit à la même heure crée un problème de sécurité que le crew n'a pas |

### 3.2 La mécanique de V1, en cinq lignes

Une fois par semaine, à une heure tirée au sort dans une plage sûre, tous les membres d'un crew qui
l'a activée reçoivent **la même invitation, au même instant** : « Sortie spontanée : tu as 90 minutes
pour démarrer. » Celui qui démarre dans la fenêtre et valide ensuite sa sortie reçoit **un souvenir
cosmétique exclusif**, jamais de points ni d'XP. Sa photo (optionnelle, une seule) et le délai réel
de son départ vont dans le journal du crew. Le crew voit **qui a répondu**, jamais qui n'a pas.

### 3.3 Déclenchement (serveur, jamais client)

| Règle | Valeur | Pourquoi |
|---|---|---|
| Sujet du tirage | **le crew**, pas le joueur, pas la commune | une invitation qui n'est pas commune n'est pas une sortie de groupe |
| Fréquence | 1 par semaine et par crew | §14.1 : la feature consomme **1 des 3** sollicitations non transactionnelles |
| Catégorie | `crew` (0140), **non transactionnelle** | un laissez-passer transactionnel sauterait la plage calme : ce serait de la rétention déguisée en reçu, exactement ce que `NOTIFICATION_RULES_2026` §3.7 refuse déjà pour le parrainage |
| Plage horaire | tirage entre **09:00 et 19:30** locales | la fenêtre de 90 min se ferme au plus tard à 21:00, borne exacte de `quietHoursStart` |
| Garde lumière | tirage borné à `[lever + 1 h, coucher - 90 min]` | 19:30 ne suffit pas : à Rouen en décembre, la nuit tombe à 17:00 |
| Source lumière et météo | Open-Meteo (`api.open-meteo.com/v1/forecast`), **déjà appelée** par `supabase/functions/ingest_run` | aucune dépendance nouvelle, aucune clé |
| **Inversion du fail-open** | si la météo est illisible, **on ne tire pas** | `fetchWeather` est fail-open aujourd'hui, et c'est juste : la météo ne doit jamais bloquer une course. Ici c'est l'inverse : un tirage à l'aveugle peut envoyer quelqu'un dehors dans le noir ou sous la neige. **Fail-closed, et c'est nommé** |
| Météo bloquante | `weatherFlags` (`packages/engine/src/badges.ts`) rend `rain`, `snow`, `heat` : l'un des trois annule le tirage de la semaine | et l'app **ne dit jamais l'inverse** : « il fait beau, sors » serait un ordre de courir, interdit par §14.2 |
| Jour de semaine | jamais le même deux semaines de suite | sinon ce n'est plus spontané, c'est un rendez-vous, et `crew_outings_2026` (0124) le fait déjà mieux |
| Crew dormant | aucun tirage sans **une** activité validée dans le crew sur 28 jours | une invitation hebdomadaire que personne ne relève est une pastille rouge permanente déguisée |
| Activité en cours | aucun envoi | `can_notify_2026` (0141) reçoit déjà ce contexte en paramètre |
| Opt-in | **par crew**, coupable par le capitaine à tout moment | et par joueur via la catégorie `crew` de 0140, qui existe déjà |
| Plage calme individuelle | un membre dont l'heure locale est en plage calme **ne reçoit rien** | `can_notify_2026` le refuse tout seul. Il verra la fenêtre en ouvrant l'app, et c'est le comportement voulu |
| Déduplication | un seul `event_id` par tirage | `notification_log_2026` porte `unique(user_id, event_id)` : c'est une **contrainte**, pas une politique |

### 3.4 La fenêtre : 90 minutes, et ce qui compte

**Pourquoi pas 2 minutes.** La réponse attendue n'est pas un geste de pouce, c'est de sortir.
90 minutes, c'est le temps de finir ce qu'on fait, se changer et partir ; 2 minutes puniraient la vie
réelle, exactement le défaut qui a usé BeReal. **Ce qui compte : DÉMARRER dans la fenêtre.** Pas
finir, pas une distance, pas une allure : la sortie peut durer trois heures. Un critère de fin
réintroduirait la performance, que §6.2 et §16.1 excluent des classements pour de bonnes raisons.

### 3.5 La récompense

Un **souvenir cosmétique exclusif**, sur le patron d'ADR-017 : un `reward_id` délivré par un seul
chemin serveur, hors des paliers de niveau (0144) et des collections de saison (0121). Trois
différences volontaires avec ADR-017 : **aucun boost d'XP** (le parrainage l'a obtenu par dérogation
fondateur explicite ; rien ne justifie de l'étendre par ricochet), **aucun crédit GRYD+** (même
raison), et un **octroi sur l'évidence sportive** plutôt que sur l'appui d'un bouton : la sortie doit
être **validée**, comme dans `0186`. Récompenser un démarrage serait récompenser un tap.

`noPaidGameAdvantage2026()` reste vrai : `paidCaptureMultiplier`, `paidXpMultiplier` et
`paidChallengeMultiplier` valent 1. **Rien de ce qui se gagne sur le terrain ne change.**

### 3.6 Le joueur sans crew

**Il ne reçoit rien** : aucune notification, aucune fenêtre, aucun compte à rebours. L'inviter à une
chose à laquelle il ne peut pas participer serait une sollicitation de recrutement déguisée, et elle
consommerait son budget. L'écran de crew, lui, **dit le fait** quand il l'ouvre : « Les sorties
spontanées se jouent en crew », avec une porte vers la découverte. Un fait affiché sur demande n'est
pas une sollicitation.

### 3.7 La photo

| Point | Décision | Appui |
|---|---|---|
| Obligatoire ? | **Non, jamais.** La sortie compte sans photo | §5.6 et G21 : publication manuelle, jamais un message inventé au nom du joueur |
| Double capture avant/arrière | **REFUSÉE**, pour deux raisons cumulées | (1) technique : `expo-camera` est absent, `expo-image-picker` ne fait qu'une prise, et la capture simultanée demande `AVCaptureMultiCamSession` (iPhone XS et plus) ou son équivalent Android, donc un module natif sur le patron de `gryd-run-film` **et** un nouveau build EAS. (2) vie privée : elle publie un visage et un lieu au même instant, ce que §5.6 protège par ailleurs |
| Combien | **Une**, choisie | le composeur existant (`app/crew-publish.tsx`) le fait déjà |
| Quand publiée | **après la fin de l'activité**, sur consentement, avec l'aperçu obligatoire de §5.6 | jamais pendant : une photo publiée en direct est une position publique en direct |
| Stockage | bucket `social-2026`, chemin `<uid>/post/<uuid>.(jpg\|png\|webp)` (0124) | **rien à construire** |
| Métadonnées | retirées (`exif:false`) | déjà le cas dans `crew-publish.tsx` |
| Audience | **membres du crew seuls** | `social_media_readable_2026` (0124) le décide déjà |
| Modération | signaler (0124), traiter par le capitaine ou co-capitaine (`social_moderate_2026`, 0138), bloquer (0124 et 0139), masquer | **rien à construire** |
| Visages de tiers | un rappel écrit **une fois**, avant la première capture, et le motif « vie privée » dans la fiche de signalement | aucune détection automatique : GRYD n'en a pas, et prétendre en avoir une serait un mensonge |
| Âge | `MIN_AGE_YEARS = 16` est **déclaratif** (pages légales), il n'existe **aucun contrôle à l'inscription** | ADR-013 tension n° 12, non tranchée. Une photo de groupe synchrone ne peut pas s'appuyer sur une règle qui n'est écrite que dans un texte |

### 3.8 Ce qui est refusé, nommément

| Refus | Raison |
|---|---|
| L'obligation de poster pour voir | transforme un plaisir en péage. Le fil du crew reste lisible sans rien publier |
| La fenêtre de 2 minutes | punit la vie réelle |
| « En retard de 2 h » | le fait est publié, **la honte ne l'est pas**. La copie dit « Partie 12 min après l'invitation », jamais « en retard » ; aucun tri par ce délai, aucun classement |
| La liste des absents | le crew voit **qui a répondu** (« 3 membres sont partis »), jamais qui n'a pas répondu. Celui qui travaille de 9 h à 19 h ne doit pas lire six semaines de son propre nom manquant |
| La sélection algorithmique | aucun ordre autre que chronologique |
| La publicité dans la fenêtre | le seul endroit où l'attention est garantie est le seul endroit où la vendre détruirait la confiance. C'est ce que BeReal a fait après le rachat |
| La pastille rouge permanente et le compte à rebours anxiogène | §14.1 et G24, interdits constitutionnels |
| Toute relance | une invitation non relevée s'éteint en silence. §4.2 : expiration silencieuse |
| La nuit et l'alerte météo | §3.3, garde lumière et `weatherFlags`, fail-closed |

### 3.9 Les écrans et leurs quatre états (aucune destination nouvelle : §9.1 en garde trois)

| Surface | Pas connecté | Vide | Échec | En cours |
|---|---|---|---|---|
| **Invitation** (carte sur l'accueil du crew) | rien, et la carte n'est pas peinte | « Aucune sortie spontanée cette semaine. » | « Impossible de lire la fenêtre. » + « Réessayer » | « Fenêtre ouverte · il reste 47 min » |
| **Écran de la fenêtre** | « Connecte-toi pour voir la fenêtre de ton crew. » | « Personne n'est encore parti. » (jamais « 0 ») | « Les réponses n'ont pas pu être lues. » + « Réessayer » | liste chronologique des membres partis, avec leur délai réel |
| **Journal du crew** (section spontanée) | rien | « Rien encore dans cette section. » | « Cette section n'a pas pu être chargée. » | photos consenties, texte, délai, réactions nommées (0153) |

Deux cas hors grille, nommés distinctement : **sans crew** et **fenêtre fermée**. Une fenêtre passée
n'est pas un échec et ne s'écrit pas comme tel (copie en §3.10).

### 3.10 La copie FR

| Contexte | Texte |
|---|---|
| Notification | « Sortie spontanée : tu as 90 minutes pour démarrer. » |
| Carte d'invitation | « Fenêtre ouverte · il reste 47 min » puis « Personne n'est encore parti. » |
| Après un départ dans la fenêtre | « Tu es parti 12 min après l'invitation. » |
| Dans le journal du crew | « Camille est partie 12 min après l'invitation. » |
| Réponses du crew | « 3 membres sont partis dans la fenêtre. » |
| Fenêtre fermée | « La fenêtre de cette semaine est passée. La prochaine sera tirée au sort. » |
| Souvenir octroyé | « Souvenir spontané obtenu. Il s'équipe depuis ta collection. » |
| Sans crew | « Les sorties spontanées se jouent en crew. » |
| Réglage de crew (capitaine) | « Proposer une sortie spontanée par semaine » |
| Avant la première photo | « Ta photo sera visible par les membres du crew, après la fin de ta sortie. Évite les visages de personnes qui ne t'ont rien demandé. » |

Aucun impératif au-delà de l'invitation, aucune urgence fabriquée, aucun « ton crew t'attend ».

### 3.11 La mesure du succès

| Mesure | Comment | Ce qu'elle vaut |
|---|---|---|
| **Part du crew qui démarre dans la fenêtre** | membres avec une activité démarrée dans la fenêtre ÷ membres ayant reçu ou ouvert l'invitation | la mesure principale |
| **Sorties réelles supplémentaires par semaine** | comparer les semaines **avec** tirage aux semaines **sans**, sur le **même** crew | sans alternance, on mesure le crew, pas la feature |
| **Désinscriptions de la catégorie `crew`** (0140) dans les 48 h suivant un tirage | compteur direct | **c'est le critère d'arrêt** |
| **Signalements de photos** rapportés au nombre de photos | file `social_reports_queue_2026` (0138) | mesure le coût de modération réel |

**Critère d'arrêt, écrit avant de commencer :** si les désinscriptions de la catégorie `crew`
dépassent la part de membres qui démarrent, la feature coûte plus qu'elle ne rapporte et s'arrête
(§14.4 : « un bon taux de clic ne justifie pas une hausse de culpabilité ou de désabonnement »).
**Et l'honnêteté du jour :** aucune de ces mesures n'existe avant qu'un crew réel ne coure ; toute
cible chiffrée posée maintenant serait inventée.

### 3.12 Les risques

| Risque | Gravité | Garde |
|---|---|---|
| **Fatigue** : la spontanéité devient une corvée | élevée, **c'est exactement ce qui a tué BeReal** | 1 par semaine et non 7 ; expiration silencieuse ; aucune relance ; coupable par le crew et par le joueur |
| **Sécurité routière** : courir de nuit ou sous alerte | élevée | garde lumière (`[lever + 1 h, coucher - 90 min]`) et `weatherFlags` ; **fail-closed** |
| **Exclusion** de qui travaille aux heures ouvrées | moyenne | jamais de liste d'absents ; l'heure tirée change chaque semaine et jamais le même jour deux fois de suite |
| **La feature devient un rendez-vous** | moyenne | jamais le même jour de semaine deux fois de suite. Un vrai rendez-vous existe déjà (`crew_outings_2026`) et fait mieux ce travail |
| **Photo publiant une adresse** | moyenne | publication après la fin, consentement explicite, aperçu obligatoire, une seule photo, jamais la double capture |
| **Crew dormant sollicité chaque semaine** | faible | pas de tirage sans une activité validée sur 28 jours |
| **Le budget mangé par une feature non demandée** | moyenne | elle consomme 1 des 3 : la décision n° 5 ci-dessous la met en concurrence explicite avec le récap hebdomadaire et le rappel de rendez-vous |

### 3.13 L'effort

**La feature elle-même**, socle en place :

| Chantier | Jours |
|---|---:|
| Serveur : table de fenêtre, tirage `pg_cron` hebdomadaire par crew, gardes lumière et météo, appel de `claim_notification_2026`, octroi du souvenir sur évidence sportive | 3 à 4 |
| Mobile : carte d'invitation sur l'accueil du crew, écran de fenêtre avec ses 4 états, section du journal, réglage de crew | 2 à 3 |
| Catalogue cosmétique (branchement, hors création artistique) | 0,5 |
| Tests : PGlite avec étape 0, purs Deno, couture, drift `_shared` | 1 |
| **Sous-total** | **6,5 à 8,5** |

**Les prérequis, qui ne sont PAS cette feature :**

| Prérequis | État au 11/09/2026 | Effort |
|---|---|---:|
| **Décision APNs** (ADR-013 tension n° 1) | ouverte, fondateur seul | bloquant, 0 j de dev |
| Entitlement `aps-environment`, clé APNs, build EAS | retiré par `plugins/withoutPushEntitlement.js` | 1 à 2 j + un build |
| **Un producteur de notifications** et son canal | 2 appelants en tout, tous deux dans 0186 | 2 à 3 j (chiffre de `GRYD_VIE_DE_CREW_2026_09.md` §3) |
| **Un centre d'activité de septembre** (la cloche) | `app/activite.tsx` legacy et orphelin | 2 j (même source) |
| **Un crew actif réel** | 3 comptes, 0 donnée de jeu | non chiffrable en jours |
| **Décision d'âge** (ADR-013 tension n° 12) | ouverte | bloquant pour la photo, 0 j de dev |

**Total honnête : 12 à 16 jours**, dont 6 à 9 qui construisent le socle de toutes les notifications
de §14.2, pas seulement celle-ci.

---

## 4. Décisions pour le fondateur (cinq, dont aucune ne peut être prise par un lot)

1. **APNs : oui ou non ?** (ADR-013 tension n° 1, ouverte depuis le 10/09). Tout le reste en dépend :
   sans canal, ni la Sortie Spontanée ni les 10 lignes de la matrice §14.2 n'existent.

2. **Le socle d'abord, ou la feature en même temps ?** *Recommandation : le socle d'abord.* Trois des
   cinq prérequis (producteur, cloche, canal) servent à toutes les notifications du cahier ; les
   financer sous le nom d'une feature nouvelle masquerait leur vraie portée.

3. **La double capture avant/arrière : abandonnée ou financée ?** *Recommandation : abandonnée.* Elle
   coûte un module natif, un build EAS et une exposition de vie privée que §5.6 protège ailleurs,
   pour reproduire la signature d'un produit dont la mécanique s'est usée. Une seule photo choisie
   fait le même travail social sans la même dette.

4. **L'âge** (ADR-013 tension n° 12). `MIN_AGE_YEARS = 16` n'est écrit que dans les textes légaux,
   aucun contrôle n'existe à l'inscription, et §13.5 vise les adultes pour le lancement
   communautaire. Une photo de groupe demande une réponse **avant** dépôt sur l'App Store.

5. **La place dans le budget des 3 sollicitations hebdomadaires.** Ses concurrentes sont le récap
   hebdomadaire choisi, le rappel d'un rendez-vous auquel on s'est inscrit, et le résultat d'un défi.
   *Recommandation : elle ne se lance qu'après le rappel de rendez-vous*, parce qu'un rappel demandé
   bat toujours une invitation non demandée.

---

## 5. Ce que ce document n'a pas pu vérifier

- **Les chiffres d'usage de BeReal aujourd'hui** : facteur 2,5 d'écart entre agrégateurs sur les
  utilisateurs mensuels, facteur 3 sur les revenus (§1.1 le dit au lieu de choisir).
- **L'effet réel sur les sorties** : aucune donnée. Le critère n° 6 est noté 3 sur 5 par argument.
- **Le coût du module natif de double capture** : non prototypé ; estimé depuis `gryd-run-film`.
- **Le lever et le coucher du soleil chez Open-Meteo** : `ingest_run` ne demande aujourd'hui que
  `temperature_2m`, `precipitation` et `snowfall` en horaire ; le champ journalier de lumière n'a
  jamais été appelé depuis ce dépôt.

**Sources externes consultées le 11/09/2026 :** TechCrunch (rachat Voodoo du 11/06/2024 ; réponse de
BeReal du 29/09/2023 ; arrêt de TikTok Now en 06/2023), Social Media Today et Engadget (TikTok Now,
Instagram Candid), le centre d'aide BeReal (Friends of Friends), Marketing Dive et Social Discovery
Insights (plateforme publicitaire, avril 2025), et les agrégateurs Charle, Search Logistics,
ElectroIQ et Quartermast pour les chiffres d'usage, avec la réserve du §1.1.
