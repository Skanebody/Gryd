# GRYD - Gestion de crew : entrer, tenir, exclure (LOT Q1)

> **Rang** : document produit, subordonné au cahier de septembre (`GRYD_REFONTE_INTEGRALE_2026_09.md`,
> rang 0, ADR-012) et à `docs/DECISIONS.md`. Il ne tranche rien que le cahier tranche déjà.
> **Statut** : spécification. Aucune ligne de code, aucune migration n'est écrite ici.
> **Suites** : Lot Q2 (serveur, migrations 0188-0190), Lot Q3 (mobile).
> **Date** : 11/09/2026. Faits de dépôt vérifiés le même jour par lecture directe.

**Demande du fondateur (11/09/2026), mot pour mot :** « C'est pareil pour entrer dans le crew et
pour le fonctionnement du crew : permets au gestionnaire du crew d'avoir un tableau de suivi de ses
équipes, des performances, de pouvoir virer et ajouter, de mettre des règles strictes uniques au
crew ; analyse ce que fait Clash of Clans pour la gestion des clans et comment les gens rejoignent
les clans, et adapte à GRYD. »

## 0. Ce que le dépôt sait déjà faire, et les six trous

Rien de ce qui suit n'est de mémoire. Chaque ligne vient d'un fichier ouvert le 11/09/2026.

| Ce qui EXISTE | Où | Ce qui MANQUE |
|---|---|---|
| 7 rôles, matrice de permissions complète | `game-rules.ts` `CREW_PERMISSIONS`, `CREW_ROLE_DUTY` | rien : la matrice est complète et traduite au cahier §13.3 |
| Promouvoir, rétrograder, exclure, transférer | 0093 `crew_set_member_role` / `crew_remove_member` / `crew_transfer_lead` | l'exclusion n'a **aucun motif** et n'écrit **aucune trace** lisible |
| Candidature avec message (lecture) | 0083 `crew_join_requests` lit `ca.message` | **personne n'écrit ce message.** `crew_join_intent` (0093:550) insère `(crew_id, user_id)` et rien d'autre : le capitaine voit toujours `null` |
| Statut de recrutement | `crews.recruitment_status` : open / on_request / invite_only / closed | **aucune exigence d'entrée mesurée.** Il n'existe pas d'équivalent des trophées requis |
| Description de crew | 0084 `crew_edit(p_description)` | **aucune charte**, aucune acceptation horodatée, aucune version |
| Roster avec rôles | 0182 `crew_overview` | **aucune mesure par membre** : ni km, ni dernière sortie, ni contribution, ni ancienneté |
| Découverte | 0152 `crew_discovery(p_city_id, p_query)` | **deux paramètres seulement.** Ni discipline, ni taille, ni exigences, ni activité |
| Invitations à jeton, QR, TTL, révocation | 0090 `create_crew_invite` / `redeem_crew_invite` | rien : ce bloc est complet |
| Défi de crew hebdomadaire et contributions | 0122, 0148-0151, 0169 `challenge_contributions_2026` | la contribution n'est **jamais rendue au capitaine** membre par membre |
| Un seul crew actif par personne | index partiel `crew_members_one_active_per_user` (0002:62) | rien : la garantie est en base |

**Les six trous, nommés :** ① le message de candidature n'a pas de chemin d'écriture ;
② aucune exigence d'entrée ; ③ aucune charte ; ④ aucun tableau de suivi ; ⑤ aucune règle appliquée
par le serveur, donc aucun avertissement ; ⑥ la découverte ne filtre presque rien.

---

## 1. Clash of Clans, mécanique par mécanique

Sources : recherche web du 11/09/2026 (pages Supercell et wiki à jour) pour tout ce qui est marqué
**(vérifié)** ; le reste est de mémoire et marqué **(mémoire)**, à revérifier avant de s'en servir
comme argument.

### 1.1 Entrer dans un clan

| Mécanique | Ce que c'est | Ce que ça produit chez le joueur | Le risque |
|---|---|---|---|
| Trois types de clan **(vérifié)** | Ouvert à tous / sur invitation / fermé | Le clan annonce son degré d'ouverture avant qu'on frappe. Zéro ambiguïté | « Fermé » sans explication ressemble à un mur ; le joueur ne sait pas s'il reviendra |
| Trophées requis **(vérifié)** | Seuil 0 à 5 500, par paliers de 200 puis de 100. Le joueur sous le seuil ne peut pas candidater, mais **peut entrer s'il est invité** | Le seuil est un filtre honnête : il dit le niveau du groupe sans qu'on ait à écrire « pas de débutants ». L'exception par invitation garde une porte humaine | Le seuil devient une monnaie de statut. Les clans surenchérissent, les débutants ne trouvent plus de place |
| Hôtel de ville minimum, langue, localisation, fréquence de guerre, jusqu'à 3 étiquettes **(vérifié)** | Réglages du chef, tous visibles sur la fiche publique | Le joueur choisit sur des faits, pas sur un nom | Beaucoup de réglages : la fiche devient une grille administrative |
| Description écrite par le chef **(vérifié)** | Texte libre où vivent les règles du clan et les attentes de dons | C'est **là** que se joue la culture du groupe. Le texte fait autorité sociale | Le texte n'est **appliqué par rien**. Il promet une règle que le jeu ne tient pas |
| Demande d'adhésion avec message **(mémoire)** | Le candidat écrit un mot ; un Aîné ou plus tranche | Le candidat existe comme personne avant d'exister comme statistique | La file s'engorge ; le silence après une demande blesse |
| Recherche de clan avec filtres **(vérifié)** | Trophées, membres, type, localisation, langue, niveau, fréquence de guerre, étiquettes | La recherche est le vrai onboarding social du jeu | Les filtres favorisent les gros clans déjà pleins |

### 1.2 Vivre dans un clan

| Mécanique | Ce que c'est | Ce que ça produit | Le risque |
|---|---|---|---|
| Quatre rôles **(vérifié)** | Membre, Aîné, Adjoint, Chef | Une échelle courte que tout le monde retient | Rien au-dessus de Membre n'est mérité par une mesure : la promotion est un cadeau du chef |
| Pouvoirs du Chef **(vérifié)** | Tout : réglages, blason, seuil de trophées, fréquence de guerre, promouvoir, rétrograder, exclure, lancer une guerre, dissoudre | Le clan a un propriétaire clairement désigné | Un chef qui décroche gèle le clan entier |
| Pouvoirs de l'Adjoint **(vérifié)** | Gestion large. **Ne peut ni rétrograder le Chef, ni dissoudre** | La relève existe sans coup d'État possible | Un adjoint peut exclure presque tout le monde |
| Pouvoirs de l'Aîné **(vérifié)** | Inviter, accepter les demandes, exclure des Membres | Un rôle de service, atteignable vite | Un aîné peut exclure ; c'est le premier abus observé dans la vraie vie des clans |
| Chat de clan **(mémoire)** | Fil permanent | Le liant quotidien | Modération manuelle, portée par le chef seul |
| Dons de troupes, « donated / received » **(vérifié en partie)** | On donne les troupes qu'un autre demande. Deux compteurs publics, remis à zéro chaque saison **(mémoire)** | **La mesure d'entraide la plus efficace du jeu.** Un ratio bas se voit de tous et devient le premier motif d'exclusion réel | Le ratio devient une note morale. Il mesure la disponibilité et le temps libre autant que la générosité |
| Guerres de clans **(vérifié en partie)** | Le clan s'inscrit ; le joueur choisit d'être « prêt » ; chaque attaque et son résultat sont visibles de tous ; le journal peut être public ou privé | Pression sociale maximale : une attaque ratée est publique | Le joueur qui a peur de rater n'attaque pas, ou quitte |
| Ligues de guerre **(vérifié)** | Une fois par mois, inscription de 15 à 50 membres, une semaine contre des clans de niveau comparable | Rythme mensuel, appariement équitable | Sept jours de disponibilité obligatoire : les vies réelles ne suivent pas |
| Jeux de clan **(mémoire)** | Objectifs collectifs à paliers, chacun choisit ses défis | Coopération sans confrontation. La meilleure mécanique du lot | Le dernier palier exige que presque tout le monde joue |
| Capitale du clan **(mémoire)** | Un lieu partagé construit ensemble avec une monnaie gagnée en raids | Un objet commun visible : la preuve que le groupe existe | Chantier long ; un clan neuf ne verra jamais le bout |
| Niveau de clan et avantages **(mémoire)** | Gagné à l'activité, jamais acheté. Ouvre des bonus d'entraînement et de dons | Progression collective non monétisable | Les avantages sont des bonus de jeu : GRYD ne peut pas les copier |
| Blason composable **(vérifié)** | Identité visuelle | Fierté, reconnaissance | Aucun |
| Exclusion **(mémoire)** | Manuelle, immédiate, par un Aîné ou plus. Pas d'exclusion automatique. L'inactivité est **visible** (dernière connexion) mais n'exclut personne | La décision reste humaine et assumée | L'exclu n'apprend jamais pourquoi. C'est le point le plus dur du jeu |
| Après un départ **(mémoire)** | Pas de délai de re-adhésion documenté. La vraie sanction est ailleurs : quitter en pleine guerre fait perdre ses attaques et interdit la guerre en cours dans le clan suivant | La punition frappe la **compétition**, pas l'appartenance | Peu lisible tant qu'on ne l'a pas subie |

### 1.3 Les six leçons à retenir

① **Le seuil d'entrée doit être une mesure, pas une phrase** : un chiffre vérifié par le serveur
fait plus pour la culture d'un groupe que trois paragraphes de description. ② **Il faut une porte
humaine à côté du seuil** : l'invitation qui outrepasse l'exigence empêche le seuil de devenir un
mur. ③ **La description du clan porte les règles et rien ne les applique** : c'est le trou de Clash,
et exactement ce que le fondateur demande de combler. ④ **L'entraide se mesure, et sa mesure
gouverne le groupe.** ⑤ **L'exclusion sans motif est la blessure du modèle** : manuelle, immédiate,
muette. ⑥ **Rien de ce qui donne un avantage de jeu ne s'achète** : sur ce point Clash est déjà
conforme à la règle 10 de GRYD.

---

## 2. Adaptation à GRYD : verdict mécanique par mécanique

### 2.1 Le tableau des verdicts

| Mécanique Clash | Verdict | Forme GRYD | Pourquoi |
|---|---|---|---|
| Trois types de clan | **DÉJÀ FAIT** | `crews.recruitment_status` : open / on_request / invite_only / closed, honoré par `crew_join_intent` | Aucune des quatre valeurs n'est décorative (0083 §, 0093) |
| Trophées requis | **ADAPTÉ** | Exigences d'entrée réglables, sur des mesures RÉELLES du serveur (§2.2) | Un trophée est un classement ; GRYD n'a pas de classement individuel opposable (ADR-013 §1). Il a des faits : distance, journées, niveau, commune |
| Invitation qui outrepasse le seuil | **À FAIRE** | Une invitation à jeton (0090) et un ajout direct par le capitaine **ignorent** les exigences | Sans cette porte, l'exigence devient un mur. C'est la leçon 2 |
| Description = règles | **ADAPTÉ ET SCINDÉ EN DEUX** | **Charte** (texte du capitaine, acceptée à l'entrée, horodatée, versionnée) + **règles paramétrées** appliquées par le serveur (§2.3) | Le trou de Clash. Séparer ce qui se lit de ce qui s'applique est la décision centrale de ce document |
| Demande avec message | **À FAIRE (le trou ①)** | `crew_apply_2026` écrit enfin `crew_applications.message` | La lecture existe depuis 0083, l'écriture jamais |
| Recherche à filtres | **À FAIRE** | `crew_discovery_2026` : commune, discipline, taille, exigences, accueil, activité (§2.7) | Deux paramètres aujourd'hui |
| Quatre rôles | **DÉJÀ FAIT, MIEUX** | 7 rôles en base, 4 devoirs au cahier (`CREW_ROLE_DUTY`), 3 groupes à l'écran (`CREW_ROLE_GROUPS`) | La traduction existe déjà et est testée |
| L'Aîné peut exclure | **REFUSÉ** | Chez GRYD, exclure reste `CREW_PERMISSIONS.kick` : co_captain et founder seulement, le co_captain borné à `CO_CAPTAIN_KICKABLE_ROLES` | Le premier abus observé chez Clash. On ne l'importe pas |
| Chat de clan | **DÉJÀ FAIT** | `crew_messages_2026` (0127), signalements (`crew_message_reports_2026`), blocages (0139) | Conforme au cahier §13.5 et à la Guideline 1.2 |
| Dons « donated / received » | **REFUSÉ SOUS CETTE FORME, REMPLACÉ** | Deux compteurs d'entraide honnêtes : **sorties de crew rejointes** et **sorties proposées** (§2.6) | Un don transfère une ressource. Chez GRYD rien ne se transfère : mes kilomètres ne deviennent pas les tiens, et un transfert d'avantage violerait la règle 10 |
| Guerre avec performance individuelle publique | **ADAPTÉ, ADOUCI** | Le défi de crew (0122) existe. La contribution individuelle est rendue **au capitaine** et **au joueur lui-même**, pas au fil public | Le cahier §14.2 refuse de convertir une mesure en injonction, et §13.4 refuse de réserver la visibilité aux plus rapides |
| Ligues de guerre | **HORS PÉRIMÈTRE** | ADR-013 §2 : « ouvertes après calibration fixée avant la saison pilote » | Pas dans ce lot |
| Jeux de clan à paliers | **DÉJÀ FAIT AILLEURS** | Défis hebdomadaires personnels (0165-0168) + défi de crew (0122) | Ne pas ouvrir un troisième niveau |
| Capitale du clan | **REFUSÉ** | Aucun | GRYD a déjà un objet commun et il est réel : le territoire de la carte. En ajouter un virtuel diluerait le seul qui compte |
| Niveau de clan et avantages | **REFUSÉ POUR CE LOT** | `CREW_XP_TABLE` reste en place, non alimentée. L'activité du crew reste ce que `crew_facts_2026` mesure déjà (§2.8) | Ses sources d'XP (`hexCaptured`, `routeOpened`, `outpostMaintained`) portent sur `hex_claims`, table **gelée** par 0118 pour toute activité 2026. La rallumer est un chantier d'ADR, pas un effet de bord |
| Blason | **DÉJÀ FAIT** | Emblèmes (`crewEmblem.ts`), couleur, tag | Rien à ajouter |
| Exclusion sans motif | **REFUSÉ** | Exclure exige un motif dans un catalogue fermé (§2.5). L'exclu reçoit une notification neutre qui dit le motif | Corrige la blessure du modèle Clash |
| Exclusion automatique | **ADAPTÉ, ÉTEINT PAR DÉFAUT** | Le serveur peut avertir puis retirer, **seulement** si le capitaine active explicitement la règle (§2.3) | Clash ne le fait pas ; GRYD ne le fera pas dans le dos du capitaine |
| Délai après un départ | **DÉJÀ FAIT, ET COMPLÉTÉ** | `CREW_SWITCH_COOLDOWN_DAYS` = 7 après un départ **volontaire** (0093). Nouveau : délai de re-adhésion **au même crew** après exclusion (§2.9) | 0093 exempte volontairement l'exclu du délai global, pour que l'exclusion ne soit pas une arme de blocage. On garde cette doctrine et on protège quand même le capitaine |

### 2.2 Les exigences d'entrée : le trophée devient une mesure

Cinq critères, tous nuls par défaut, tous mesurés serveur, tous lisibles sur la fiche publique.
Aucun n'est un classement : ce sont des faits sur une personne, pas un rang contre les autres.

| Critère | Clé | Source serveur | Unité | Fenêtre |
|---|---|---|---|---|
| Niveau permanent minimal | `min_level` | `progress_accounts_2026.ledger.totalXp` | niveau | état |
| Distance minimale | `min_distance_km_28d` | `runs.distance_m`, `status in ('valid','partial')` | km | 28 jours glissants |
| Journées actives minimales | `min_active_days_28d` | jours distincts de `runs.started_at` (Europe/Paris) | jours | 28 jours glissants |
| Commune | `city_id` | `users.city_id` | égalité | état |
| Discipline pratiquée | `activity` | `capture_events_2026.activity` sur 28 jours | run / bike | 28 jours glissants |

**Trois critères sont refusés, et il faut le dire.** L'allure et le chrono : le cahier les exclut de
toute comparaison (§6.2, §6.5, §16.1). La **série** : elle multiplie les points de territoire
(`STREAK_MULTIPLIER_CAP`), donc l'exiger reviendrait à filtrer sur un multiplicateur de jeu, ce que
le fondateur a pourtant cité ; c'est un refus assumé. La **surface tenue** : 0126 pose que le titre
territorial est individuel et 0152 a retiré toute part de crew ; y réintroduire des mètres carrés
ferait revenir le titre collectif que trois migrations refusent.

**La porte humaine (leçon ②) et la vérification avant l'envoi.** Les exigences filtrent la
candidature spontanée, jamais une invitation à jeton (0090) ni un ajout direct par le capitaine ;
la fiche publique le dit. `crew_eligibility_2026` rend au candidat, et à lui seul, ce qui lui manque
en clair (« Il te manque 2 km cette semaine ») : le capitaine n'en reçoit jamais le détail, car on
décide d'une entrée, on n'audite pas une personne (doctrine déjà écrite dans 0083).

### 2.3 Charte et règles : ce qui se lit, ce qui s'applique

La demande « mettre des règles strictes uniques au crew » se scinde en deux objets qui n'ont ni la
même nature ni le même risque.

**① La charte.** Texte du capitaine, 600 caractères, versionné. Acceptée obligatoirement à l'entrée,
l'acceptation horodatée avec le numéro de version. Le serveur ne l'applique pas : il prouve qu'elle
a été lue et acceptée. Une modification de la charte incrémente la version ; les membres déjà là ne
sont pas expulsés, ils voient un bandeau « La charte a changé » et acceptent la nouvelle version.
Un membre qui refuse la nouvelle version reste membre : la charte n'est pas un contrat opposable, et
transformer un refus en exclusion serait une pression punitive automatique.

**② Les règles paramétrées.** Quatre réglages, tous à zéro par défaut, tous appliqués par un job
quotidien. Zéro veut dire « règle éteinte », jamais « seuil de zéro ».

| Règle | Clé | Effet quand elle est active | Défaut |
|---|---|---|---|
| Sortie minimale par semaine | `min_weekly_outings` | Avertissement le lundi si moins de N sorties la semaine écoulée | 0 |
| Participation minimale au défi hebdo | `min_challenge_days` | Avertissement à la clôture du défi si moins de N journées contribuées | 0 |
| Inactivité maximale | `max_inactivity_days` | Avertissement quand la dernière sortie remonte à plus de N jours | 0 |
| Retrait automatique | `auto_remove_after_days` | Retrait N jours **après** un avertissement d'inactivité non levé | 0 |

**Trois garde-fous non négociables.** ① `auto_remove_after_days` ne peut dépasser zéro que si
`max_inactivity_days` le dépasse aussi : un retrait sans avertissement préalable n'existe pas.
② Le retrait automatique ne peut jamais viser un `founder` ni un `co_captain` : un crew ne se
décapite pas tout seul (même doctrine que `canLeaveCrew`, 0093 §5). ③ Un avertissement se **lève**
dès que le fait qui l'a produit cesse (une sortie enregistrée annule celui d'inactivité) et
l'horloge du retrait repart de zéro.

**Le canal.** §14.1 plafonne les sollicitations à 3 par semaine, 1 par jour, plage calme 21 h - 9 h.
Un avertissement n'est pas une sollicitation de rétention : il concerne l'appartenance au groupe,
comme un événement annulé concerne une inscription. Il part donc dans le **centre d'activité in-app**
(`crew_activity_feed`, 0182), une fois, jamais en push (entitlement APNs retiré, ADR-013 tension
n° 1). Le classement transactionnel est la **décision 4** du §5.4.

### 2.4 Le tableau de suivi du capitaine

Une ligne par membre actif. Au plus 50 lignes (`CREW_MAX_MEMBERS`). Colonnes :

| Colonne | Source | Visible de qui |
|---|---|---|
| Pseudo, rôle, devoir (`CREW_ROLE_DUTY`) | `crew_members`, `users` | tout membre |
| Ancienneté | `crew_members.joined_at` | tout membre |
| Dernière sortie | `max(runs.started_at)` | officiers, sous condition de vie privée |
| Distance 7 jours et 28 jours | `runs.distance_m` | officiers, sous condition de vie privée |
| Nombre de sorties 28 jours | `count(runs)` | officiers, sous condition de vie privée |
| Boucles fermées 28 jours | `capture_events_2026` `status = 'published'` | officiers, sous condition de vie privée |
| Terrain apporté | **absent, et il le restera** | personne |
| Contribution au défi en cours | `challenge_contributions_2026` (journées, `withdrawn = false`) | officiers et le membre lui-même |
| Présence aux sorties 28 jours | `crew_event_rsvps` honorés | officiers |
| Sorties proposées 28 jours | `crew_events.created_by` | officiers |
| Avertissements en cours | `crew_warnings_2026` | officiers et le membre lui-même |
| État de la règle | dérivé : `conforme` / `averti` / `à risque de retrait` / `règle éteinte` | officiers et le membre lui-même |

**« Terrain apporté au crew » est refusé, et c'est important.** 0118 gèle `hex_claims`, 0126 pose
que le titre de capture est **individuel**, et 0152 a retiré `hexesHeld` / `cityRank` /
`contributionPct` de `crew_overview` pour cette raison. Additionner les possessions des membres
fabriquerait le titre collectif que ces trois migrations refusent. Le tableau dit donc combien de
**boucles** un membre a fermées, jamais combien de mètres carrés il « apporte ».

**La vie privée, et sa résolution.** 0135 donne à chacun `profile_visibility`
(private / friends / crew / public) et `map_sharing` : un membre peut légitimement fermer ses
mesures. Règle en trois temps. ① `profile_visibility` vaut `crew` ou `public` : les mesures sont
rendues. ② Sinon, et si une **règle active** du crew utilise cette mesure, elle est rendue quand
même : accepter la charte d'un crew dont les règles sont affichées vaut consentement à ce que ces
règles-là soient vérifiables, et la fiche publique l'écrit avant l'entrée. ③ Sinon, la cellule
affiche **« non partagé »** : jamais un tiret, jamais un zéro, qui affirmerait que la personne n'a
pas couru.

**Tri :** dernière sortie (défaut), distance 28 jours, ancienneté, rôle. **Filtres :** à risque,
averti, jamais sorti, officiers. **Export : refusé** : un fichier de mesures nominatives quitte
l'application et échappe à `profile_visibility` ; il n'y a pas de moyen honnête de le reprendre.

### 2.5 Exclure, avertir, ajouter

**Exclure.** `crew_remove_member` (0093) reste le noyau : bornes de rôle, propriétaire intouchable,
périmètre du co_captain. Ce qui s'ajoute est un **motif obligatoire**, choisi dans un catalogue
fermé, plus une note facultative de 200 caractères. Catalogue :
`inactivity` · `rules` · `challenge` · `behaviour` · `fit` · `other`. Le champ `other` exige la note.

Le message reçu par l'exclu est **neutre et factuel** : « Tu ne fais plus partie de [crew].
Motif indiqué : inactivité. » Jamais un jugement, jamais un score, jamais le nom de qui a décidé
(le journal interne, lui, le garde).

**Avertir.** Un avertissement manuel existe à côté des avertissements automatiques : même table,
même forme, `issued_by` renseigné au lieu d'être nul. Il ne déclenche jamais un retrait automatique
(seul l'avertissement d'inactivité le fait, et seulement si la règle est active).

**Ajouter.** Quatre portes, toutes existantes ou spécifiées ici :
invitation directe par pseudo (nouveau : `crew_invite_by_handle_2026`), lien à jeton (0090), QR
(même jeton, `CrewInviteQRScreen`), acceptation d'une candidature avec message (0083, complété
par `crew_apply_2026`). Les deux premières **outrepassent** les exigences d'entrée.

### 2.6 L'entraide : ce que GRYD peut mesurer sans mentir

Le compteur don/reçu de Clash mesure un **transfert**. GRYD n'a rien à transférer, et la règle 10
interdit qu'il ait un jour quelque chose à transférer. Deux mesures sont écartées : **les réactions**
(0153) et **les encouragements envoyés**, pour la même raison : ils ne coûtent rien, donc leur
compteur mesure la disponibilité du pouce et devient une ferme ; le cahier §13.4 veut des réactions
« limitées et humaines », pas une monnaie, et §14 plafonne déjà l'envoi.

**Ce qui est retenu**, parce que les deux faits sont déjà en base et qu'aucun ne transfère un
avantage : **les sorties de crew rejointes** (`crew_event_rsvps` honorés) et **les sorties
proposées** (`crew_events.created_by`, non annulées, avec au moins un inscrit). Venir et organiser
sont les deux formes réelles d'entraide dans un groupe de sport : elles se voient, elles se
reconnaissent, et elles ne s'achètent pas.

### 2.7 Recherche de crew

`crew_discovery_2026` étend les deux paramètres actuels. Tous les filtres portent sur des faits que
`crews` ou `crew_facts_2026` rendent déjà.

| Filtre | Source | Valeurs |
|---|---|---|
| Commune | `crews.city_id` | identifiant INSEE, défaut = celle du joueur |
| Discipline | `crew_facts_2026.holds_run` / `holds_bike` | run / bike / les deux |
| Accueil | `crews.recruitment_status` | open / on_request / invite_only |
| Taille | `crew_facts_2026.member_count` | intervalle |
| Exigences | `crew_rules_2026.requirements` | sans exigence / avec exigences / **je suis éligible** |
| Activité | `crew_facts_2026.next_outing_at`, `last_capture` | sortie à venir / actif ces 14 jours |
| Étiquettes | `crews.tags` (`CREW_TAGS`) | jusqu'à 3 |

« Je suis éligible » est le filtre le plus utile et le plus délicat : il compare les mesures du
joueur aux exigences de chaque crew, côté serveur, et ne rend jamais le détail d'un crew qu'il
écarte. Le cahier §G16 exige par ailleurs qu'une demande en attente reste visible « sans faux bouton
Rejoint » : `crew_join_intent` rend déjà `pending`.

### 2.8 Niveau de crew et profil public

**Niveau de crew : refusé pour ce lot** (§2.1). Ce que le profil public montre à la place est ce que
le règlement 2026 sait mesurer honnêtement : effectif actif, combien de membres tiennent du terrain
publié, dans quelles disciplines, dernière prise de contrôle, sorties à venir. Tout cela existe déjà
dans `crew_facts_2026`. S'y ajoutent, nouveaux : la **charte** et les **exigences**.

Ordre de la fiche publique, repris de §13.1 (« la découverte doit montrer son accueil, ses horaires
et ses sorties, avant son classement ») : blason et nom · commune · accueil · prochaine sortie ·
effectif · exigences · charte · activité · bouton.

### 2.9 Anti-abus

| Abus | Garde | Constante |
|---|---|---|
| Nomadisme de crew | Délai après un départ **volontaire** | `CREW_SWITCH_COOLDOWN_DAYS` = 7 (existant) |
| Harcèlement par re-candidature après exclusion | Délai de re-adhésion **au même crew** | `CREW_REJOIN_AFTER_KICK_DAYS` = 30 (nouveau) |
| Candidature en rafale | Plafond de demandes par jour et par personne | `CREW_JOIN_REQUESTS_PER_DAY_MAX` = 5 (nouveau) |
| Double appartenance | Index partiel en base | `crew_members_one_active_per_user` (0002:62, existant) |
| Exclusion comme arme de blocage | L'exclusion n'arme pas le délai global | `removed_by is null` dans le calcul du délai (0093, existant) |
| Charte-piège modifiée après l'entrée | Versionnage ; un refus n'exclut personne | `crew_rules_2026.charter_version` |

### 2.10 Ce que GRYD refuse explicitement de Clash

① **La pression punitive automatique sans réglage explicite du capitaine** : toute règle est éteinte
par défaut, le retrait exige un avertissement préalable et ne peut viser la direction du crew.
② **La performance individuelle publiée à tous** : la contribution au défi va au capitaine et au
joueur concerné, jamais au fil (§13.4, §14.2). ③ **Tout avantage de jeu acheté, et le niveau de clan
à avantages** : aucun réglage, aucune exigence, aucun rôle ne s'obtient par un achat, et il n'existe
aucun SKU de rôle dans `IAP_SKUS`. S'y ajoutent deux refus de forme : les pushs répétés (le canal est
le centre d'activité) et l'export de mesures nominatives (§2.4).

---

## 3. Contrats serveur (Lot Q2)

### 3.1 Tables

Migrations réservées : **0188**, **0189**, **0190**. Dernière migration du dépôt : `0187`. Toutes
additives : aucune table, colonne, contrainte ni donnée existante n'est modifiée, sauf l'ajout de
colonne nommé ci-dessous. RLS activée partout, `revoke all ... from anon, authenticated`, lecture et
écriture par RPC `security definer` uniquement, conformément à la doctrine de 0083 §7.

| Table | Migration | Colonnes | Clé |
|---|---|---|---|
| `crew_rules_2026` | 0188 | `crew_id uuid pk`, `charter text check (char_length <= 600)`, `charter_version integer not null default 1`, `requirements jsonb not null default '{}'`, `enforcement jsonb not null default '{}'`, `updated_by uuid`, `updated_at timestamptz` | `crew_id` |
| `crew_rule_acceptances_2026` | 0188 | `crew_id`, `user_id`, `charter_version integer`, `accepted_at timestamptz not null default now()` | `(crew_id, user_id, charter_version)` |
| `crew_applications` **(étendue)** | 0188 | ajout de `charter_version integer` (nullable : tout l'historique existant vaut `null`) | inchangée |
| `crew_warnings_2026` | 0189 | `id uuid pk`, `crew_id`, `user_id`, `kind text check (kind in ('inactivity','weekly_outings','challenge','manual'))`, `note text check (char_length <= 200)`, `issued_by uuid` (`null` = serveur), `issued_at`, `resolved_at timestamptz`, `week_key text` | unique partielle `(crew_id, user_id, kind, week_key) where resolved_at is null` |
| `crew_kicks_2026` | 0189 | `id uuid pk`, `crew_id`, `user_id`, `reason text check (reason in ('inactivity','rules','challenge','behaviour','fit','other'))`, `note text`, `decided_by uuid` (`null` = serveur), `decided_at`, `rejoin_allowed_at timestamptz not null` | `id` |
| `crew_member_activity_2026` | 0189 | **vue**, pas table, pas vue matérialisée (§5.3) | n/a |

L'unique partielle de `crew_warnings_2026` est ce qui rend le job **idempotent** : rejoué dix fois
dans la même semaine, il écrit un seul avertissement par membre et par règle.

`crew_invites` (0090) et `crew_applications` (0011) existent : on les étend, on n'en crée pas de
seconds. `crew_requests` (0019) reste sans chemin d'écriture et **n'est pas** réveillé ici : c'est
une table de demandes d'aide, pas de demandes d'adhésion, et la confondre créerait un doublon.

### 3.2 RPC

Toutes en `security definer`, `set search_path = public, pg_temp`, `revoke all from public, anon`
avant tout `grant`, et retour `jsonb` de forme `{ok: boolean, ...}` ou `{ok: false, reason: '...'}`.
Le vocabulaire d'erreur est celui du dépôt : `signed_out` · `no_crew` · `forbidden` · `not_found` ·
`not_member` · `self` · `out_of_scope` · `cannot_target_lead` · `full` · `cooldown` ·
`already_in_crew` · `pending` · `dead_crew`. S'y ajoutent quatre noms nouveaux : `not_eligible` ·
`charter_stale` · `rate_limited` · `bad_rules`.

| RPC | Migration | Paramètres | Retour | Rôle minimal |
|---|---|---|---|---|
| `crew_rules_get_2026` | 0188 | `p_crew_id uuid` | `{ok, charter, charterVersion, requirements, enforcement, updatedAt, myAcceptedVersion}` | authentifié, membre ou non |
| `crew_rules_set_2026` | 0188 | `p_charter text`, `p_requirements jsonb`, `p_enforcement jsonb` | `{ok, charterVersion, bumped}` | `CREW_PERMISSIONS.changeSettings` (founder) |
| `crew_eligibility_2026` | 0188 | `p_crew_id uuid` | `{ok, eligible, missing: [{key, need, have, unit}], charterVersion}` | authentifié ; ne rend **que** ses propres mesures |
| `crew_apply_2026` | 0188 | `p_crew_id uuid`, `p_message text` (≤ 280), `p_charter_version integer` | `{ok, effect: 'applied'\|'joined'}` | authentifié |
| `crew_accept_charter_2026` | 0188 | `p_charter_version integer` | `{ok}` | membre |
| `crew_member_board_2026` | 0189 | `p_sort text default 'last_run'`, `p_filter text default null` | `{ok, rows: [...], rulesActive, generatedAt}` | `CREW_PERMISSIONS.kick` (co_captain, founder) |
| `crew_my_standing_2026` | 0189 | aucun | `{ok, rules, my: {...}, warnings: [...], atRisk, removalAt}` | membre |
| `crew_warn_member_2026` | 0189 | `p_user_id uuid`, `p_note text` | `{ok, warningId}` | `CREW_PERMISSIONS.kick` |
| `crew_remove_member_2026` | 0189 | `p_user_id uuid`, `p_reason text`, `p_note text` | `{ok, effect: 'removed', previousRole, rejoinAllowedAt}` | `CREW_PERMISSIONS.kick`, périmètre `CO_CAPTAIN_KICKABLE_ROLES` |
| `crew_decisions_log_2026` | 0189 | `p_limit integer default 50` | `{ok, entries: [{at, kind, actor, target, reason}]}` | `CREW_PERMISSIONS.kick` |
| `crew_invite_by_handle_2026` | 0190 | `p_handle text` | `{ok, effect: 'invited'}` | `CREW_PERMISSIONS.invite` |
| `crew_discovery_2026` | 0190 | `p_city_id`, `p_query`, `p_activity`, `p_recruitment`, `p_min_members`, `p_max_members`, `p_requirements text`, `p_active_only boolean`, `p_tags text[]` | `{ok, rows: [...]}` | authentifié |
| `sweep_crew_inactivity_2026` | 0190 | `p_at timestamptz default now()` | `{ok, warned, removed, crews}` | `service_role` seulement |

**Trois contrats méritent leur détail.**

`crew_apply_2026` fait ce que `crew_join_intent` n'a jamais fait : il écrit le message. Séquence
serveur, dans cet ordre, chacune avec son refus nommé : signé (`signed_out`) · crew existant
(`not_found`) · crew vivant (`dead_crew`) · pas déjà membre ailleurs (`already_in_crew`) · pas de
délai en cours (`cooldown`, avec `daysLeft`) · pas de délai de re-adhésion à **ce** crew
(`cooldown`, avec `rejoinAllowedAt`) · pas déjà en attente (`pending`) · plafond quotidien
(`rate_limited`) · crew non plein (`full`) · exigences satisfaites (`not_eligible`, avec la liste
`missing`) · version de charte à jour (`charter_stale`). Si `recruitment_status = 'open'`, l'entrée
est immédiate et l'acceptation de charte est écrite dans la même transaction ; sinon la candidature
est créée avec son message et sa version de charte.

`crew_rules_set_2026` refuse (`bad_rules`) : une charte de plus de 600 caractères ; un
`auto_remove_after_days > 0` avec `max_inactivity_days = 0` ; une exigence négative ; un
`min_challenge_days` supérieur à 7 ; une commune inconnue de `city_zones`. Il incrémente
`charter_version` si et seulement si le texte de la charte a changé, jamais pour un changement de
seuil.

`crew_member_board_2026` applique la règle de vie privée du §2.4 colonne par colonne, et rend pour
chaque mesure soit une valeur, soit le littéral `'not_shared'`. **Jamais `null` et jamais `0` pour
une mesure non partagée** : le client doit pouvoir distinguer les trois cas sans deviner, et un `0`
serait le mensonge que la constitution interdit (L8).

### 3.3 Le job d'inactivité

| Élément | Valeur |
|---|---|
| Nom du job | `crew-inactivity-sweep-2026` |
| Planification | `'10 3 * * *'` (quotidien) |
| Appel | `select public.sweep_crew_inactivity_2026()` |
| Pose | `do $$ ... $$` conditionnel au schéma `cron`, patron exact de 0163 §, pour rester rejouable en PGlite |

`pg_cron` 1.6.4 est installé en production, vérifié le 09/09/2026 (0163). Jobs déjà en place et
appelant du SQL sans passer par le réseau : `publish-capture-events-2026`, `publish-challenges-2026`
(`'* * * * *'`), `leaderboard-snapshots-2026` (`'0 * * * *'`, 0163), `expire-weekly-quests-2026`
(`'7 * * * *'`, 0168), `gryd-resolve-due-contests` (0080). Aucune Edge Function n'est nécessaire.

**Le fuseau, dit franchement.** `pg_cron` planifie en UTC : `'10 3 * * *'` tombe à 4 h 10 ou 5 h 10
heure de Paris selon la saison. C'est acceptable **parce que le job est idempotent** (unique
partielle de `crew_warnings_2026`), et la fenêtre de mesure est calculée en `Europe/Paris` dans la
fonction, comme `leaderboard_week_bounds_2026`.

**Ce que le job fait, par crew ayant au moins une règle active :** ① lever les avertissements dont le
fait a cessé (`resolved_at = now()`) ; ② écrire les avertissements dus, un par membre et par règle ;
③ retirer les membres dont un avertissement d'inactivité non levé dépasse `auto_remove_after_days`,
en écrivant une ligne `crew_kicks_2026` (`decided_by = null`, `reason = 'inactivity'`) ; ④ n'écrire
aucun retrait visant un `founder` ou un `co_captain` ; ⑤ journaliser le passage (crews vus, avertis,
retirés), pour que « le job a-t-il tourné ? » ait une réponse autre qu'un silence.

### 3.4 Notifications

Le canal est le centre d'activité in-app. `can_notify_2026` et `claim_notification_2026` (0141)
n'ont, au 11/09/2026, aucun appelant dans le dépôt et le push distant est impossible ; ces
événements alimentent `crew_activity_feed` (0182), qui existe et qui est lu.

Aucune valeur de `NOTIFICATION_RULES_2026` n'est modifiée. On ajoute, à côté d'elle et dans le même
fichier, un catalogue fermé `CREW_NOTIFICATION_EVENTS_2026` qui rattache chaque événement à la
catégorie `crew` (déjà présente dans `categories`) et dit s'il est transactionnel.

| Événement | Destinataire | Transactionnel | Message type |
|---|---|---|---|
| `application_received` | officiers | non | « Une demande attend une réponse. » |
| `application_accepted` | candidat | oui | « Tu as rejoint [crew]. » (déjà au cahier §14.2) |
| `application_declined` | candidat | oui | « Ta demande pour [crew] n'a pas été retenue. » |
| `charter_updated` | membres | non | « La charte de [crew] a changé. » |
| `warning_issued` | membre visé | **à trancher (§5.4 décision 4)** | « [crew] : il te manque une sortie cette semaine. » |
| `removal_imminent` | membre visé | **à trancher** | « Sans sortie avant le [date], tu quitteras [crew]. » |
| `removed` | membre visé | oui | « Tu ne fais plus partie de [crew]. Motif indiqué : [motif]. » |
| `member_joined` | membres | non | « [pseudo] a rejoint le crew. » (déjà servi par 0182) |

Aucun de ces messages ne nomme un tiers dans un contexte négatif, aucun ne contient de promotion,
aucun n'utilise un niveau d'interruption critique (§14.1).

---

## 4. Écrans (Lot Q3)

Copie française, sans texte en dur (catalogues typés, ADR-009), tokens `colors.*` uniquement.
Chaque écran passe le gate `ux-gate`. Les quatre états sont, partout : **pas connecté** · **vide** ·
**échec** · **en cours**. Aucun n'est replié sur un autre.

### 4.1 Côté gestionnaire

**A. « Gérer mon crew » (`/crew-gestion`)**, visible pour `CREW_PERMISSIONS.kick`.
```
[En-tête]      Nom du crew · effectif X/50 · règles actives : 2
[Alertes]      3 membres à risque  ·  1 demande en attente        (masqué si vide)
[Barre]        Tri : dernière sortie ▾    Filtres : à risque · averti · officiers
[Liste]        Pseudo            Rôle       Dernière sortie   28 j      État
               Camille           Officier   il y a 2 jours    48 km     Conforme
               Sam               Membre     il y a 19 jours   non partagé  Averti
[Pied]         Journal des décisions  ·  Règles et exigences  ·  Charte
```
États : pas connecté (« Connecte-toi pour gérer ton crew. ») · vide (« Tu es seul dans ce crew pour
l'instant. Invite quelqu'un. ») · échec (« Le tableau n'a pas pu être lu. Réessayer. ») · en cours
(squelette de trois lignes, jamais un spinner seul).
Un tap sur une ligne ouvre la feuille d'actions existante (`PlayerModerationSheet`,
`CREW_MEMBER_ACTIONS`), enrichie de « Avertir » et de « Exclure avec un motif ».

**B. « Règles et exigences » (`/crew-regles`)**, founder seul.
```
[Bloc 1] Qui peut entrer        Accueil : ouvert / sur demande / sur invitation
[Bloc 2] Conditions d'entrée    Niveau minimal        [ aucune ▾ ]
                                Distance sur 28 jours [ aucune ▾ ]
                                Journées actives      [ aucune ▾ ]
                                Même commune          [ non ]
                                Discipline            [ toutes ▾ ]
         « Ces conditions valent pour une demande. Un membre peut inviter directement. »
[Bloc 3] Règles du crew         Sorties par semaine   [ éteint ▾ ]
                                Journées de défi      [ éteint ▾ ]
                                Inactivité maximale   [ éteint ▾ ]
                                Retrait automatique   [ éteint ▾ ]  (grisé tant que ci-dessus = éteint)
         « Une règle éteinte n'avertit personne. Un retrait automatique prévient toujours avant. »
[Pied]   Enregistrer
```
Le bloc 3 affiche, sous chaque réglage actif, le nombre de membres qui ne le respecteraient pas
aujourd'hui. Un capitaine doit voir la conséquence avant de l'armer, pas après.

**C. « Charte » (`/crew-charte`)**, founder seul. Éditeur de 600 caractères, compteur visible,
version affichée (« version 3, modifiée le 4 septembre »). Enregistrer prévient : « Les membres
verront que la charte a changé. Personne n'est exclu pour autant. »

**D. « Demandes » (`/crew-demandes`)**, officiers. Une carte par candidature : pseudo non tronqué,
message intégral, ancienneté de la demande, « Accepter » et « Refuser ». Vide : l'écran n'est pas
atteignable (le point d'entrée disparaît), fidèle à la doctrine de `CrewJoinRequests`.

**E. Feuilles « Avertir » et « Exclure ».** Exclure : motif obligatoire dans une liste de six, note
facultative, et l'aperçu exact du message que la personne recevra. Confirmation en deux temps pour
l'exclusion, en un temps pour l'avertissement.

**F. « Journal des décisions » (`/crew-journal`)**, officiers. Liste antéchronologique :
entrées, départs, exclusions avec motif, avertissements, changements de rôle, changements de charte.
Chaque ligne dit qui a décidé, ou « automatique » quand c'est le job.

### 4.2 Côté joueur

**G. Fiche publique de crew (`/crew-public`, existante, étendue).** Ordre du §2.8. Deux blocs
nouveaux : « Ce que ce crew demande » (les exigences en clair, ou « Ce crew n'a pas de condition
d'entrée ») et « La charte » (texte, repliable). Le bouton d'action est celui que
`crew_join_intent` rend, jamais un autre.

**H. « Demander à rejoindre » (`/crew-rejoindre`).**
```
[Éligibilité]  Vérifiée avant l'envoi.
               ✓ Niveau 4 requis, tu es niveau 7
               ✗ 30 km sur 28 jours requis, il t'en manque 2
[Charte]       [texte]   ☐ J'ai lu et j'accepte la charte de ce crew
[Message]      [ champ 280 caractères, facultatif ]
[Action]       Envoyer ma demande      (inactif tant qu'un ✗ ou la case restent)
```
Quand un critère manque, l'écran dit **ce qui manque et de combien**, jamais « tu n'es pas
éligible » seul. C'est la phrase du fondateur : « il te manque 2 km cette semaine ». Le bouton n'est
pas peint actif puis refusé : il est explicitement inactif avec sa raison à côté.
États : pas connecté · éligible · non éligible (avec la liste) · vérification impossible
(« Impossible de vérifier tes conditions. Réessayer. » et non « tu n'es pas éligible » : on ne sait
pas n'est pas une réponse).

**I. « Ma situation dans le crew » (`/crew-ma-situation`).** Accessible depuis la vue crew, et
poussée dans le centre d'activité dès qu'un avertissement existe.
```
[Règles]       Ce crew demande 1 sortie par semaine.
[Ma semaine]   1 sortie sur 1. Conforme.
[Avertissement] Reçu le 8 septembre : inactivité.
                Une sortie enregistrée lève cet avertissement.
[À risque]      Sans sortie avant le 15 septembre, tu quitteras ce crew.
```
Le bloc « à risque » n'existe que si `auto_remove_after_days` est actif : sinon il n'y a pas de
retrait, donc pas de risque, donc rien à dire. Ton neutre, aucune injonction à courir (§14.2 :
« ne jamais transformer la notification en ordre de courir »).

---

## 5. Découpage, effort, risques et décisions

### 5.1 Lot Q2, serveur

| Migration | Contenu | Tests | Jours |
|---|---|---|---|
| 0188 | `crew_rules_2026`, `crew_rule_acceptances_2026`, colonne `charter_version`, 5 RPC de charte, exigences et candidature | PGlite : étape 0 « le défaut existait » (le message n'était pas écrit), 5 refus nommés, la porte d'invitation qui outrepasse | 1,5 |
| 0189 | `crew_warnings_2026`, `crew_kicks_2026`, vue `crew_member_activity_2026`, 5 RPC de suivi et de sanction | PGlite : bornes de rôle rejouées, vie privée colonne par colonne, `'not_shared'` jamais confondu avec `0` | 2 |
| 0190 | Job `crew-inactivity-sweep-2026`, découverte filtrée, invitation par pseudo | PGlite : job rejoué dix fois = un seul avertissement ; direction jamais retirée ; filtre « je suis éligible » | 1,5 |
| Constantes | `CREW_REJOIN_AFTER_KICK_DAYS`, `CREW_JOIN_REQUESTS_PER_DAY_MAX`, `CREW_CHARTER_MAX_CHARS`, `CREW_REQUIREMENT_WINDOW_DAYS`, `CREW_NOTIFICATION_EVENTS_2026` dans `game-rules.ts` puis `sync-game-rules.mjs` | drift testé par le gate | 0,5 |

**Total Q2 : 5,5 jours.**

### 5.2 Lot Q3, mobile

| Écran | Jours |
|---|---|
| Tableau de bord (tri, filtres, alertes, quatre états) | 1,5 |
| Règles et exigences (formulaire, conséquence avant l'armement) | 1 |
| Charte (éditeur, version, bandeau de changement) | 0,5 |
| Demandes avec message, invitation par pseudo | 0,5 |
| Feuilles avertir et exclure, journal des décisions | 1 |
| Fiche publique étendue, « Demander à rejoindre », « Ma situation » | 1,5 |
| Copie FR et EN (catalogues typés, cinq langues imposées par le type) | 0,5 |

**Total Q3 : 6,5 jours.** Q3 ne peut pas commencer avant que 0188 soit appliquée : sans exigences en
base, l'écran d'éligibilité serait un bouton mort.

### 5.3 Risques

1. **La vue matérialisée jamais rafraîchie.** Le dépôt a déjà payé ce piège : `crew_leaderboard`
   (0002) n'a **aucun** `refresh materialized view` nulle part (constat écrit dans 0044:20), et
   `stats.ts` a dû inventer un état `never_refreshed` pour ne pas mentir. Décision :
   `crew_member_activity_2026` est une **vue simple**, calculée à la lecture (au plus 50 membres,
   28 jours de `runs`, index existants). Pas de matview, donc pas de job, donc pas de mensonge.
2. **`crew_stats()` (0086) est figée** : elle agrège des tables gelées par 0118, comme
   `crew_overview` l'était avant 0152. Ce lot ne la répare pas et ne la lit pas ; la signaler évite
   qu'un écran de Q3 s'y branche par réflexe.
3. **La vie privée contre le tableau de suivi**, la vraie tension du lot : la résolution du §2.4
   tient si et seulement si la fiche publique affiche exigences **et** règles avant l'entrée. Écran
   de charte bâclé = consentement fictif.
4. **Le fuseau du job quotidien** : résolu par l'idempotence (§3.3), pas par la planification. Si
   quelqu'un retire l'unique partielle, le risque revient intact.
5. **Le budget de sollicitations** : avertissements classés non transactionnels, un crew à trois
   règles actives consomme les 3 par semaine de §14.1 et fait taire le reste (décision 4).
6. **La collision de migrations avec Codex** (ADR-012, collision 0107-0112) : toujours
   `supabase migration list` avant un push. 0188-0190 sont réservées ici, pas dans le dépôt distant.

### 5.4 Cinq décisions pour le fondateur

1. **Le retrait automatique existe-t-il ?** La spécification le construit éteint par défaut, avec
   avertissement obligatoire et direction protégée. Le refuser entièrement reste défendable : Clash
   ne le fait pas, et un crew qui exclut tout seul peut vider une communauté fragile en une semaine.
   *Proposition : le garder, éteint, avec les trois garde-fous.*
2. **Le capitaine voit-il les kilomètres d'un membre qui a fermé son profil ?** La spécification dit
   oui, mais uniquement pour les mesures qu'une règle active utilise, et après acceptation d'une
   charte qui l'annonce. L'alternative stricte (« non, jamais ») rend les règles invérifiables pour
   ces membres. *Proposition : oui, borné aux règles actives.*
3. **Le délai de re-adhésion après exclusion : 30 jours au même crew, et rien ailleurs.** C'est un
   écart assumé avec 0093, qui exempte l'exclu de tout délai. *Proposition : 30 jours, au même crew
   seulement.*
4. **Un avertissement est-il transactionnel ?** S'il l'est, il sort du budget de §14.1 et arrive
   toujours ; sinon il peut être écrasé par le plafond hebdomadaire, et un membre peut être retiré
   sans jamais avoir vu son avertissement. *Proposition : transactionnel, in-app uniquement, jamais
   en push.*
5. **L'entraide se mesure-t-elle ?** La spécification retient deux compteurs (sorties rejointes,
   sorties proposées) et refuse le compteur de réactions. Ne rien mesurer du tout reste une option
   cohérente avec §13.4. *Proposition : les deux compteurs, affichés au capitaine, jamais classés.*

### 5.5 Ce que ce document ne fait pas

Il n'ouvre aucun catalogue payant, ne touche ni `flags.paidOffer` ni `IAP_SKUS`, ne rallume ni
`CREW_XP_TABLE` ni `crew_leaderboard`, ne crée aucune surface de crew, aucun rang de crew, aucune
donnée fictive, et ne tranche ni les ligues de crews (ADR-013 §2) ni la question APNs (ADR-013
tension n° 1). Rien n'est « fait » tant que `qa-verify` ne l'a pas prouvé et que `docs/STATUS.md`
ne l'a pas enregistré.

**Sources Clash of Clans consultées le 11/09/2026 :**
[Clans, Clash of Clans Wiki](https://clashofclans.fandom.com/wiki/Clans) ·
[Clan Roles, Supercell Support](https://support.clashroyale.com/hc/en-us/articles/49484954095771-Clan-Roles) ·
[Everything about Clan Roles](https://play.google.com/store/apps/editorial?id=mc_editorialmd_post_install_clash_of_clans_clan_roles_explained_fcp) ·
[Clan War Leagues](https://clashofclans.fandom.com/wiki/Clan_War_Leagues) ·
[Clans Guide: Ranks, Donations & Perks](https://skycoach.gg/blog/clash-of-clans/articles/clans-guide)

---

## 6. Contrats livrés (Q2) — écrit après la migration, pas avant

> **Statut** : ce chapitre décrit du code APPLIQUÉ en migration et prouvé en
> PGlite. Il est écrit le 11/09/2026, après coup, et ne promet rien au-delà de ce
> que `npm run test:sql` rejoue. Les signatures viennent du catalogue Postgres
> (`pg_get_function_identity_arguments`), les exemples de JSON sont copiés d'une
> exécution réelle sur les trois migrations.
>
> **Migrations livrées** : `0188_crew_rules_2026.sql` · `0189_crew_board_2026.sql`
> · `0190_crew_inactivity_2026.sql`. **Non poussées en production.**
> **Tests** : `supabase/tests/crew_rules_2026.pglite.test.mjs` ·
> `crew_board_2026.pglite.test.mjs` · `crew_inactivity_2026.pglite.test.mjs`.

### 6.1 Ce qui a été livré, et les écarts avec §3

| §3 annonçait | Livré | Écart |
|---|---|---|
| 13 RPC | **15** | +`crew_resolve_warning_2026` (un officier doit pouvoir lever un avertissement `manual`, que le job ne peut pas lever faute de fait mesurable) ; +`crew_dissolve_2026` (décision du fondateur du 11/09) |
| 5 tables | **6 + 1 vue** | `crew_rules_2026`, `crew_rule_acceptances_2026`, `crew_warnings_2026`, `crew_kicks_2026`, **`crew_decisions_2026`** (le journal que 0093 réclamait), **`crew_sweep_log_2026`** (§3.3 ⑤ : « le job a-t-il tourné ? » doit avoir une réponse même à vide) ; vue simple `crew_member_activity_2026` |
| `crew_applications` étendue | fait | + `charter_version integer` nullable |
| — | **`crew_members.removed_by_server boolean`** | Un retrait AUTOMATIQUE n'a pas d'auteur humain. Laisser `removed_by` à `null` l'aurait fait passer pour un départ volontaire, donc lui aurait infligé le cooldown de 7 jours que 0093 refuse d'infliger à quelqu'un qu'on met dehors |
| — | **`crews.archived_at / archived_by / archived_reason / name_available_at`** | Dissolution |
| — | **`notifications.event_id` + unique partielle**, `type` élargi à `'crew'` | La déduplication de §14.3 appliquée à la boîte de réception |
| `crew_discovery_2026` | fait | `crew_discovery` (0152) N'EST PAS remplacée : deux découvertes coexistent jusqu'à ce que Q3 bascule l'appel |

**Trois fonctions existantes sont remplacées** (`create or replace`, signature et
grants conservés) : `create_crew` (le nom d'un crew archivé est tenu),
`join_crew_by_code` et `crew_join_intent` (un retrait automatique n'est pas un
départ volontaire, un crew archivé ne recrute pas). **`crew_remove_member`
(0093) n'est PAS remplacée** : la remplacer par un refus casserait le bouton
d'exclusion du client actuel. Deux chemins d'exclusion coexistent donc jusqu'à
Q3, dont un sans motif ni journal.

### 6.2 Vocabulaire d'erreur, au complet

Toutes les RPC rendent `jsonb`. Succès : `{ok: true, …}`. Refus :
`{ok: false, reason: '<mot>', …}` — jamais une exception, jamais un message
libre. Un client peut donc traduire chaque refus sans lire de prose.

| Mot | Sens | Rendu par |
|---|---|---|
| `signed_out` | aucune session | toutes |
| `no_crew` | l'appelant n'a aucun crew actif | toutes celles qui agissent sur SON crew |
| `forbidden` | rôle insuffisant (matrice `CREW_PERMISSIONS`) | `crew_rules_set_2026`, `crew_member_board_2026`, `crew_warn_member_2026`, `crew_remove_member_2026`, `crew_decisions_log_2026`, `crew_resolve_warning_2026`, `crew_invite_by_handle_2026` |
| `not_founder` | dissoudre exige le fondateur, ce n'est pas une question de niveau | `crew_dissolve_2026` |
| `not_found` | objet inexistant, OU compte en suppression (zéro énumération) | `crew_rules_get_2026`, `crew_eligibility_2026`, `crew_apply_2026`, `crew_accept_charter_2026`, `crew_resolve_warning_2026`, `crew_invite_by_handle_2026` |
| `not_member` | la cible n'est pas membre actif du crew | `crew_warn_member_2026`, `crew_remove_member_2026` |
| `self` | jamais sur soi-même | `crew_warn_member_2026`, `crew_remove_member_2026`, `crew_invite_by_handle_2026` |
| `cannot_target_lead` | le fondateur est intouchable | `crew_warn_member_2026`, `crew_remove_member_2026` |
| `out_of_scope` | hors périmètre de rang (`CO_CAPTAIN_KICKABLE_ROLES`) | idem |
| `full` | `CREW_MAX_MEMBERS` atteint | `crew_apply_2026`, `crew_invite_by_handle_2026` |
| `cooldown` | délai en cours. `daysLeft` toujours ; `rejoinAllowedAt` en plus quand c'est le délai de re-adhésion au MÊME crew | `crew_apply_2026` |
| `already_in_crew` | l'appelant (ou la cible) est déjà dans un crew | `crew_apply_2026`, `crew_invite_by_handle_2026` |
| `pending` | une candidature est déjà en attente | `crew_apply_2026` |
| `closed` | accueil `closed` ou `invite_only` (+ `recruitmentStatus`) | `crew_apply_2026` |
| `dead_crew` | aucun membre actif, ou crew ARCHIVÉ | `crew_apply_2026`, `join_crew_by_code` |
| `not_eligible` | exigences non satisfaites, **+ `missing`** | `crew_apply_2026` |
| `charter_stale` | la version de charte présentée n'est plus la courante (+ `charterVersion`) | `crew_apply_2026`, `crew_accept_charter_2026` |
| `rate_limited` | plafond quotidien de candidatures (+ `max`) | `crew_apply_2026` |
| `bad_rules` | réglage refusé, **+ `detail`** (voir §6.4) | `crew_rules_set_2026` |
| `bad_message` / `bad_note` | texte trop long (+ `max`) | `crew_apply_2026` / `crew_warn_member_2026`, `crew_remove_member_2026` |
| `bad_reason` / `note_required` | motif hors catalogue / note obligatoire pour `other` | `crew_remove_member_2026` |
| `bad_sort` / `bad_filter` | tri ou filtre hors catalogue | `crew_member_board_2026` |
| `bad_activity` / `bad_recruitment` / `bad_requirements` | filtre de découverte hors catalogue | `crew_discovery_2026` |
| `active_challenge` | un défi de crew est en cours (**+ `challengeId`, `endsAt`**) | `crew_dissolve_2026` |
| `already_archived` | crew déjà dissous (+ `archivedAt`) | `crew_dissolve_2026` |

### 6.3 Les quinze RPC

Toutes en `security definer`, `set search_path = public, pg_temp`, avec
`revoke all … from public, anon` AVANT tout `grant` (patron 0042/0083 §7 :
`anon` hérite d'EXECUTE par `public`, un `revoke from anon` seul ne ferme rien).

#### `crew_rules_get_2026(p_crew_id uuid) -> jsonb`
Tout compte connecté, membre ou non. La fiche publique DOIT montrer exigences et
charte avant l'entrée, sinon l'acceptation serait un consentement fictif.
```json
{ "ok": true,
  "charter": "On court le mardi soir, et on attend tout le monde.",
  "charterVersion": 1, "myAcceptedVersion": 1,
  "requirements": { "min_level": 4, "min_distance_km_28d": 30 },
  "enforcement": { "max_inactivity_days": 14, "auto_remove_after_days": 7 },
  "updatedAt": "2026-09-10T18:47:00.78+00:00" }
```
`charter: null`, `requirements: {}`, `enforcement: {}` = un crew sans charte ni
exigence ni règle. C'est l'état de TOUS les crews existants : aucun rétro-fit.

#### `crew_rules_set_2026(p_charter text, p_requirements jsonb, p_enforcement jsonb) -> jsonb`
`CREW_PERMISSIONS.changeSettings` = **founder seul**.
```json
{ "ok": true, "charterVersion": 1, "bumped": true }
```
`bumped` = le TEXTE a changé. Un changement de seuil ne fait jamais monter la
version : sinon régler 20 → 21 jours redemanderait à cinquante personnes
d'accepter un texte identique.

#### `crew_eligibility_2026(p_crew_id uuid) -> jsonb`
Mesure TOUJOURS l'appelant. Le capitaine n'en reçoit jamais le détail.
```json
{ "ok": true, "eligible": false,
  "missing": [ { "key": "min_level", "need": 4, "have": 1, "unit": "level" },
               { "key": "min_distance_km_28d", "need": 30, "have": 0, "unit": "km" } ],
  "charterVersion": 1, "charterRequired": true, "invitesBypass": true }
```
`unit` ∈ `level` · `km` · `days` · `city` · `activity`. Pour `city` et
`activity`, `need`/`have` sont des chaînes (ou un tableau de disciplines
pratiquées). `invitesBypass: true` est le texte de la porte humaine :
l'écran l'écrit sous la liste des conditions.

#### `crew_apply_2026(p_crew_id uuid, p_message text, p_charter_version integer) -> jsonb`
Succès : `{"ok": true, "effect": "applied"}` (accueil `on_request`) ou
`{"ok": true, "effect": "joined"}` (accueil `open`, entrée immédiate, charte
acceptée dans la MÊME transaction). Refus, dans cet ordre : `not_found` ·
`bad_message` · `dead_crew` · `already_in_crew` · `closed` · `cooldown` (départ
volontaire) · `cooldown` + `rejoinAllowedAt` (re-adhésion au même crew) ·
`pending` · `rate_limited` · `full` · `not_eligible` · `charter_stale`.
```json
{ "ok": false, "reason": "not_eligible",
  "missing": [ { "key": "min_level", "need": 4, "have": 1, "unit": "level" },
               { "key": "min_distance_km_28d", "need": 30, "have": 0, "unit": "km" } ] }
```

#### `crew_accept_charter_2026(p_charter_version integer) -> jsonb`
```json
{ "ok": true, "charterVersion": 1 }
```
Il n'existe AUCUNE RPC de refus : ne pas appeler celle-ci EST le refus, et il
n'a aucune conséquence.

#### `crew_member_board_2026(p_sort text, p_filter text) -> jsonb`
`CREW_PERMISSIONS.kick` = **co_captain et founder**. `p_sort` ∈ `last_run`
(défaut) · `distance_28d` · `seniority` · `role`. `p_filter` ∈ `null` ·
`at_risk` · `warned` · `never_ran` · `officers`.
```json
{ "ok": true, "sort": "last_run", "filter": null,
  "generatedAt": "2026-09-10T18:47:00.793+00:00",
  "rulesActive": { "max_inactivity_days": 14, "auto_remove_after_days": 7 },
  "rows": [
    { "userId": "44444444-…", "pseudo": "Dee", "role": "runner", "duty": "member",
      "joinedAt": "2026-06-02T18:47:00.777+00:00", "seniorityDays": 100,
      "lastRunAt": "2026-09-09T18:47:00.777+00:00",
      "runs7d": 2, "runs28d": 2, "distance7dKm": 22, "distance28dKm": 22,
      "loops28d": 1, "challengeDays": 0,
      "outingsJoined28d": 0, "outingsCreated28d": 0,
      "warnings": [], "standing": "compliant", "removalAt": null },
    { "userId": "55555555-…", "pseudo": "Sam", "role": "runner", "duty": "member",
      "joinedAt": "2026-06-22T18:47:00.777+00:00", "seniorityDays": 80,
      "lastRunAt": "2026-08-11T18:47:00.777+00:00",
      "runs7d": "not_shared", "runs28d": "not_shared",
      "distance7dKm": "not_shared", "distance28dKm": "not_shared",
      "loops28d": "not_shared", "challengeDays": "not_shared",
      "outingsJoined28d": "not_shared", "outingsCreated28d": "not_shared",
      "warnings": [], "standing": "compliant", "removalAt": null } ] }
```
**Trois lectures obligatoires pour Q3.**
① Une mesure vaut soit une valeur, soit la chaîne `"not_shared"`. **Jamais
`null` et jamais `0`** pour une donnée non partagée : `lastRunAt: null` veut
dire « cette personne n'a jamais couru », ce qui est un fait, pas un masquage.
② Sam a fermé son profil : SEULE `lastRunAt` lui est déverrouillée, parce que
`max_inactivity_days` est active et lit cette mesure. La DISTANCE n'est
déverrouillée par aucune règle — aucun des quatre réglages ne la lit.
③ Les lignes masquées sont TOUJOURS reléguées en fin de tri, quel que soit leur
chiffre : leur rang trahirait la mesure qu'on vient de masquer.
`standing` ∈ `rule_off` · `compliant` · `warned` · `at_risk`. `rule_off` n'est
pas « conforme » : sans règle active il n'y a rien à respecter.
`warnings[].issuedBy` vaut `"server"` ou `"officer"` — **jamais un pseudo**.

#### `crew_my_standing_2026() -> jsonb`
Membre. **Cette lecture ÉCRIT** : elle acquitte les avertissements ouverts de
l'appelant (`acknowledged_at`), ce qui rend vraie la garantie « jamais retiré
sans avertissement lu ou vieux de N jours ».
```json
{ "ok": true, "crewId": "aaaaaaaa-…", "role": "runner", "duty": "member",
  "rules": { "max_inactivity_days": 14, "auto_remove_after_days": 7 },
  "my": { "lastRunAt": "2026-08-11T18:47:00.777+00:00", "runs7d": 0, "runs28d": 0,
          "distance28dKm": 0, "loops28d": 0, "challengeDays": 0 },
  "warnings": [], "atRisk": false, "removalAt": null }
```
`atRisk` et `removalAt` n'existent que si `auto_remove_after_days` est actif :
sans retrait il n'y a pas de risque, donc rien à afficher.

#### `crew_warn_member_2026(p_user_id uuid, p_note text) -> jsonb`
`CREW_PERMISSIONS.kick`, périmètre `CO_CAPTAIN_KICKABLE_ROLES`, jamais soi-même,
jamais le fondateur. Un avertissement manuel par membre et par JOUR.
```json
{ "ok": true, "effect": "warned", "warningId": "8a76fd86-…" }
```
Second appel le même jour : `{"ok": true, "effect": "unchanged", "warningId": "…"}`.

#### `crew_remove_member_2026(p_user_id uuid, p_reason text, p_note text) -> jsonb`
`p_reason` ∈ `inactivity` · `rules` · `challenge` · `behaviour` · `fit` ·
`other` (note obligatoire). Note ≤ 200.
```json
{ "ok": true, "effect": "removed", "previousRole": "rookie",
  "reason": "inactivity", "rejoinAllowedAt": "2026-10-10T18:47:00.804+00:00" }
```
Idempotente : `{"ok": true, "effect": "already_removed"}`.

#### `crew_decisions_log_2026(p_limit integer) -> jsonb`
`CREW_PERMISSIONS.kick`. `p_limit` borné à 200. `kind` ∈ `charter` · `rules` ·
`application` · `warning` · `removal` · `dissolution` · `joined` · `left`.
```json
{ "ok": true, "entries": [
  { "at": "2026-09-10T18:47:00.804+00:00", "kind": "removal",
    "actor": "Ada", "target": "Gil", "reason": "inactivity", "automatic": false,
    "detail": { "kickId": "f3d9535a-…", "previousRole": "rookie",
                "hasNote": true, "rejoinAllowedAt": "2026-10-10T18:47:00.804+00:00" } },
  { "at": "2026-09-10T18:47:00.78+00:00", "kind": "charter",
    "actor": "Ada", "target": null, "reason": null, "automatic": false,
    "detail": { "charterVersion": 1,
                "requirements": { "min_level": 4, "min_distance_km_28d": 30 },
                "enforcement": { "max_inactivity_days": 14, "auto_remove_after_days": 7 } } } ] }
```
Le journal, LUI, nomme le décideur. La notification reçue par l'exclu ne le
nomme jamais : c'est exactement pourquoi les deux existent. `automatic: true` et
`actor: null` = le job.

#### `crew_resolve_warning_2026(p_warning_id uuid) -> jsonb`
`CREW_PERMISSIONS.kick`. `{"ok": true, "effect": "resolved"}`, ou
`"already_resolved"` (idempotente). La trace reste : levé n'est pas effacé.

#### `crew_invite_by_handle_2026(p_handle text) -> jsonb`
`CREW_PERMISSIONS.invite`. **OUTREPASSE les exigences et la charte.**
```json
{ "ok": true, "effect": "invited", "expiresAt": "2026-09-17T18:47:20.714+00:00" }
```
⚠ **Le jeton NE revient PAS à l'inviteur.** Il est posé dans
`notifications` chez la personne visée (RLS propriétaire seul), sous
`payload.token`. L'acceptation reste `redeem_crew_invite(token)` (0090), déjà
écrite et testée : aucune porte neuve, aucun bouton mort. Autres retours :
`{"ok": true, "effect": "already_member"}`, `not_found` (pseudo inconnu, mal
formé ou compte en suppression : le même mot, zéro énumération), `self`,
`already_in_crew`, `full`.

#### `crew_discovery_2026(p_city_id text, p_query text, p_activity text, p_recruitment text, p_min_members integer, p_max_members integer, p_requirements text, p_active_only boolean, p_tags text[]) -> jsonb`
`p_requirements` ∈ `none` · `any` · `eligible`. `p_active_only` : sortie à venir
OU prise de contrôle dans les 14 jours.
```json
{ "ok": true, "cityId": "insee-76540", "cityName": "Rouen", "rows": [
  { "id": "aaaaaaaa-…", "name": "Les Quais", "tag": "QUAI", "color": 0,
    "cityId": "insee-76540", "tags": ["run_club"], "recruitmentStatus": "on_request",
    "memberCount": 4, "upcomingOutings": 0, "nextOutingAt": null,
    "membersHolding": 0, "holdsRun": false, "holdsBike": false, "lastCaptureAt": null,
    "myRequestPending": false,
    "hasRequirements": true, "hasCharter": true, "iAmEligible": false } ] }
```
`iAmEligible` est un booléen, **jamais la liste `missing`** : le détail
n'appartient qu'à la fiche du crew. Les crews ARCHIVÉS et `closed`
n'apparaissent jamais. Aucun code de crew (0036), aucune identité de membre,
aucun lieu de rendez-vous (0085), aucune surface (0126).

#### `crew_dissolve_2026(p_reason text) -> jsonb`
**Fondateur seul** (`CREW_PERMISSIONS.archiveCrew`). Confirmation en deux temps
côté client ; le serveur, lui, vérifie.
```json
{ "ok": true, "effect": "archived", "crewId": "aaaaaaaa-…",
  "membersRemoved": 3, "nameAvailableAt": "2026-10-10T18:47:00.825+00:00" }
```
Refus : `not_founder` · `already_archived` (+ `archivedAt`) ·
`active_challenge` (+ `challengeId`, `endsAt`).
**Ce que la dissolution fait, exactement** : le crew passe `archived_at`,
`recruitment_status = 'closed'`, tous les membres sortent (`removed_by` = le
fondateur, donc ils échappent au cooldown de 7 jours ; le fondateur, lui, garde
son cooldown car il a choisi), les avertissements ouverts sont résolus, les
candidatures en attente passent `withdrawn`, les liens d'invitation vivants sont
révoqués, une ligne `crew_decisions_2026` de type `dissolution` est écrite, et
chaque ancien membre reçoit une notification `dissolved`.
**Ce qu'elle ne fait PAS** : rien n'est supprimé. Ni la ligne du crew, ni son
nom, ni l'historique des adhésions, ni les `capture_events_2026` de ses membres,
ni les défis joués. Le titre territorial est individuel (0126) : personne ne perd
un mètre carré. **Aucune RPC ne désarchive** : rendre un crew à la vie
demanderait de décider qui en reprend la direction, ce qui est une décision de
produit.
**`active_challenge` REFUSE, il ne diffère pas.** §G20 pose qu'un défi a un
résultat et qu'un nul est un vrai résultat. Dissoudre en cours de défi priverait
de leur résultat les joueurs des DEUX crews, dont un crew tiers sans recours.
L'option `archived_after_challenge` (armer la dissolution pour la clôture) est
écartée : elle aurait créé une bombe à retardement invisible, des membres
continuant à courir pour un crew déjà condamné.
**Le nom** : `crews.name` n'a AUCUNE contrainte d'unicité dans ce schéma (0002).
`name_available_at` est donc la SEULE réservation de nom qui existe, et elle ne
vaut que pour les crews archivés. Avant cette date, `create_crew` refuse
`name_unavailable` — le même mot que la modération, parce qu'on ne raconte pas
l'histoire d'un groupe à quelqu'un qui n'en était pas.

#### `sweep_crew_inactivity_2026(p_at timestamptz) -> jsonb`
**`service_role` SEUL.** `p_at` est le mode accéléré des tests : l'horloge se
passe en paramètre, jamais par une variable d'environnement cachée.
```json
{ "ok": true, "crews": 1, "warned": 3, "resolved": 0, "removed": 0,
  "at": "2026-09-10T18:47:00.816+00:00" }
```
Job `pg_cron` : `crew-inactivity-sweep-2026`, `'10 3 * * *'` (UTC), posé par un
`do $$ … $$` conditionnel au schéma `cron` — la migration reste rejouable là où
`pg_cron` n'existe pas. Ordre d'exécution : ① lever les avertissements dont le
fait a cessé ; ② écrire ceux qui sont dus ; ③ retirer. Lever en dernier
retirerait quelqu'un dont l'avertissement venait d'être levé.

### 6.4 Réglages : catalogues et refus

`requirements` (toutes les clés facultatives, absentes = aucune exigence) :
`min_level` · `min_distance_km_28d` · `min_active_days_28d` · `city_id` ·
`activity`. `enforcement` : `min_weekly_outings` · `min_challenge_days` ·
`max_inactivity_days` · `auto_remove_after_days`. **Zéro et absence veulent dire
« règle éteinte »**, jamais « seuil de zéro ».

`bad_rules` porte toujours un `detail` : `charter_too_long` · `not_an_object` ·
`unknown_requirement` (+ `key`) · `unknown_enforcement` (+ `key`) ·
`negative_requirement` (+ `key`) · `negative_enforcement` (+ `key`) ·
`challenge_days_over_max` · `unknown_city` · `unknown_activity` ·
`removal_without_warning`.

**Ce que le job mesure, exactement.** `min_weekly_outings` compte des COURSES
(`runs`, `status in ('valid','partial')`) sur la semaine lundi → dimanche
Europe/Paris ÉCOULÉE, pas des présences à une sortie de crew : faire dépendre
l'appartenance de la disponibilité d'un soir est refusé par §14.2.
`max_inactivity_days` lit `max(runs.started_at)`. `min_challenge_days` lit
`challenge_contributions_2026` (`withdrawn = false`) et **ne vise que les joueurs
inscrits au roster** du défi. Un membre arrivé depuis moins de
`max_inactivity_days`, ou en cours de semaine mesurée, n'est jamais averti.

**Les trois garde-fous du retrait automatique, tous appliqués serveur :**
① `auto_remove_after_days > 0` exige `max_inactivity_days > 0` (refus
`bad_rules` / `removal_without_warning`) ; ② jamais un `founder` ni un
`co_captain` ; ③ jamais sans que l'avertissement soit acquitté
(`crew_my_standing_2026`) ou vieux de `CREW_WARNING_GRACE_DAYS` (3 jours).

### 6.5 Constantes ajoutées à `game-rules.ts`

`CREW_CHARTER_MAX_CHARS` 600 · `CREW_APPLICATION_MESSAGE_MAX` 280 ·
`CREW_KICK_NOTE_MAX` 200 · `CREW_REQUIREMENT_WINDOW_DAYS` 28 ·
`CREW_REJOIN_AFTER_KICK_DAYS` 30 · `CREW_JOIN_REQUESTS_PER_DAY_MAX` 5 ·
`CREW_WARNING_GRACE_DAYS` 3 · `CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS` 30 ·
`CREW_MIN_CHALLENGE_DAYS_MAX` (= `CHALLENGE_RULES_2026.durationDays`) ·
`CREW_REQUIREMENT_KEYS` / `_DEFAULTS` · `CREW_ENFORCEMENT_KEYS` / `_DEFAULTS` ·
`CREW_KICK_REASONS` · `CREW_WARNING_KINDS` · `CREW_BOARD_SORTS` / `_FILTERS` ·
`CREW_MEASURE_NOT_SHARED` · `CREW_STANDING_STATES` · `CREW_MUTUAL_AID_MEASURES` ·
`CREW_NOTIFICATION_EVENTS_2026` · `CREW_DISSOLVE_REFUSALS`.

Chacune a un miroir SQL nommé (`crew_charter_max_chars()`, …) et un test de
dérive qui lit `game-rules.ts` à la source. **Aucune valeur de
`NOTIFICATION_RULES_2026` n'est modifiée.**

### 6.6 Notifications : ce que le serveur écrit, ce que Q3 doit peindre

Le serveur écrit une ligne dans `public.notifications` (`type = 'crew'`, RLS
propriétaire seul depuis 0006, publiée en temps réel depuis 0020), dédupliquée
par `event_id`. **Il n'écrit AUCUNE phrase** : le payload porte l'événement et
ses paramètres, la copie vit dans le catalogue typé du mobile où
`Entry = Record<Locale, string>` impose les cinq langues.

| `payload.event` | Destinataire | Transactionnel | P | Payload | Copie FR de référence (tutoiement, sans tiret long) |
|---|---|---|---|---|---|
| `application_received` | officiers | non | 3 | — | « Une demande attend une réponse. » |
| `invited` | la personne invitée | non | 2 | `token`, `prefix`, `expiresAt`, `invitedBy` | « {crewName} t'invite à le rejoindre. » |
| `charter_updated` | membres | non | 4 | `charterVersion` | « La charte de {crewName} a changé. Personne n'est exclu pour autant. » |
| `warning_issued` | le membre visé seul | **oui** | 2 | `kind`, `note`, `removalAt` | inactivité : « {crewName} : ta dernière sortie remonte à plus de {n} jours. » · semaine : « {crewName} : il te manque une sortie cette semaine. » · si `removalAt` : « Sans sortie avant le {date}, tu quitteras {crewName}. » |
| `removed` | le membre visé | **oui** | 1 | `reason`, `note`, `automatic`, `rejoinAllowedAt` | « Tu ne fais plus partie de {crewName}. Motif indiqué : {motif}. » |
| `dissolved` | chaque ancien membre | **oui** | 1 | `archivedAt` | « Le crew {crewName} a été dissous par son capitaine. » |

Tout payload porte aussi `event`, `crewId`, `crewName`, `transactional`.
**`removal_imminent` (§3.4) N'EXISTE PAS**, et c'est un écart assumé : il
n'aurait eu aucun producteur, et un second message pour le MÊME fait aurait
doublé la sollicitation d'une personne déjà avertie — exactement ce que §14.3
demande de regrouper. La date de retrait voyage donc dans `warning_issued`
(`removalAt`, non nul si et seulement si `auto_remove_after_days` est armé), et
l'écran « Ma situation » la lit de `crew_my_standing_2026`.
`application_accepted`, `application_declined` et `member_joined` (§3.4) ne sont
PAS déclarés : leur producteur serait `crew_decide_join_request` (0083), que ce
lot ne remplace pas. Les arrivées restent servies par `crew_joins_2026` (0182).
Aucun message ne nomme un tiers dans un contexte négatif, aucun ne contient de
promotion, aucun n'utilise un niveau d'interruption critique.

**Le budget de §14.1 n'est PAS consommé** par ces écritures, et c'est un choix
explicite : `claim_notification_2026` (0141) arbitre les SOLLICITATIONS (push,
e-mail), pas l'état de l'application. Soumettre la boîte de réception au budget
hebdomadaire ferait qu'un membre puisse être exclu sans que l'app ait jamais
gardé trace de son avertissement — le mensonge que L8 interdit, et le risque que
la décision 4 nomme. Aucun canal distant n'existe (entitlement APNs retiré,
ADR-013 tension n° 1).

### 6.7 Ce que Q2 ne prouve pas, et qui reste à faire

1. **PGlite ne prouve PAS la RLS** : il tourne en superutilisateur. Les tests
   vérifient les privilèges au catalogue (`has_function_privilege`,
   `has_table_privilege`, `relrowsecurity`), jamais un refus vécu par un rôle
   restreint. Preuve réelle : `npm run verify:rls` APRÈS le push.
2. **PGlite ne prouve PAS `pg_cron`** : le schéma `cron` n'existe pas, le bloc de
   pose est sauté. Après push : `select * from cron.job where jobname =
   'crew-inactivity-sweep-2026'`.
3. **Aucune géométrie n'est lue** (pas de PostGIS sous PGlite) — et 0188-0190
   n'en lisent aucune : les boucles sont COMPTÉES, jamais mesurées.
4. **`crew_remove_member` (0093) reste sans motif** tant que Q3 n'a pas basculé
   l'appel vers `crew_remove_member_2026`. C'est le seul endroit du lot où la
   garantie « toute exclusion dit son motif » n'est pas encore tenue.
5. **`redeem_crew_invite` (0090) applique encore le cooldown à TOUS les départs**,
   exclusions comprises (divergence héritée de 0043). Une personne exclue ailleurs
   il y a moins de 7 jours ne peut donc pas encore accepter une invitation.
6. **`crew_stats()` (0086) reste figée** : elle agrège des tables gelées par
   0118. Ne pas y brancher un écran de Q3 par réflexe.
7. **Migrations NON POUSSÉES.** Codex pousse sur le même projet : `supabase
   migration list` avant tout `db push`, et 0188-0190 ne sont réservées que dans
   ce dépôt.

---

## 7. Livré (Q3, mobile) — écrit après les écrans, pas avant

> **Statut** : ce chapitre décrit du code MOBILE écrit, typé et testé. Il est
> écrit le 11/09/2026, après coup, et ne promet rien au-delà de ce que
> `npm run gate` rejoue. **Aucun de ces écrans n'a jamais parlé à la base
> réelle** : 0188-0190 ne sont pas poussées, et la prod a 3 comptes et 0 donnée
> de jeu. Ce qui est prouvé est dit au §7.5 ; ce qui ne l'est pas aussi.

### 7.1 Les neuf écrans, et ce que chacun appelle

| Écran | Route | RPC | Les quatre états |
|---|---|---|---|
| Gérer mon crew | `/crew-gestion` | `crew_member_board_2026` · `crew_resolve_warning_2026` · `crew_invite_by_handle_2026` | pas connecté · squelette 3 lignes · échec + Réessayer · vide (« tu es seul ») **+ `forbidden`, qui n'est PAS un échec** |
| Règles, exigences et charte | `/crew-regles` | `crew_rules_get_2026` · `crew_rules_set_2026` (+ `crew_member_board_2026` pour la conséquence) | pas connecté · en cours · échec · sans crew |
| Journal des décisions | `/crew-journal` | `crew_decisions_log_2026` | pas connecté · en cours · échec · vide (« rien décidé ») |
| Demander à rejoindre | `/crew-rejoindre?crewId=` | `crew_eligibility_2026` · `crew_rules_get_2026` · `crew_apply_2026` | pas connecté · éligible · non éligible **avec la liste chiffrée** · vérification impossible |
| Ma situation | `/crew-ma-situation` | `crew_my_standing_2026` | pas connecté · en cours · échec · sans crew |
| Fiche publique (étendue) | `/crew-public?crewId=` | + `crew_rules_get_2026` | inchangés, plus « conditions non lues » |
| Découverte (étendue) | `/crew-discovery` | + `crew_discovery_2026` (annotation) | inchangés, plus « conditions non lues » |
| Édition (étendue) | `/crew-edit` | + `crew_dissolve_2026` | + zone dangereuse : repos · confirmation · dissous |
| Feuille d'actions (étendue) | composant | `crew_warn_member_2026` · `crew_remove_member_2026` | choix · motif · confirmation · résultat |

`sweep_crew_inactivity_2026` n'a **aucun appelant mobile**, et c'est correct :
elle est `service_role` seule et tourne en `pg_cron`.

### 7.2 Les trois écarts avec §4, tous assumés

| §4 annonçait | Livré | Pourquoi |
|---|---|---|
| `/crew-regles` **et** `/crew-charte` | **un seul écran** | `crew_rules_set_2026` fait `coalesce(p_requirements, '{}')`. Un écran de charte qui n'enverrait que son texte remettrait exigences ET règles à zéro EN SILENCE : un capitaine perdrait ses seuils en corrigeant une faute d'orthographe. Un seul brouillon, un seul appel |
| `/crew-demandes` | **dans `/crew-gestion`** | Le point d'entrée devait disparaître quand la file est vide (§4.1 D). Une route dont la porte s'efface est une route orpheline pour l'audit ; le bloc, lui, se masque tout seul et vit là où l'on décide |
| Découverte basculée sur `crew_discovery_2026` | **0152 pour la liste, 0190 en annotation** | 0190 ne rend ni `friendsInside` ni `viewerInCrew`. Basculer entièrement aurait supprimé « deux de tes amis sont dedans » pour gagner « je suis éligible ». Les deux réponses se recollent par identifiant, et si l'annotation échoue le filtre n'est pas peint |

### 7.3 Les cinq garanties que le code TIENT, et où elles vivent

1. **Une mesure masquée n'est ni un zéro ni un tiret.** Le type `CrewMeasure`
   (`crewBoard2026.ts`) n'a que deux formes, et `measureText` est le seul chemin
   vers un texte. `row.distance28dKm ?? 0` ne compile pas en silence.
   `lastRunAt` garde ses TROIS cas, dont `null` = « n'a jamais couru ».
2. **« Il te manque 2 km », jamais « tu n'es pas éligible » tout seul.**
   `missingLine` (`crewManagementCopy.ts`), testée dans les cinq langues. Sans
   `have`, la phrase dit l'exigence et n'invente aucun écart.
3. **Un crew sans charte n'est jamais « périmé ».** `charterStale` le garantit :
   sans ce garde, tous les crews existants porteraient à vie un bandeau
   accusant leurs membres de ne pas avoir lu un texte qui n'existe pas.
4. **Un seul chemin d'exclusion, journalisé.** `removeMember` (0093) n'a plus
   aucun appelant ; la feuille passe par `crew_remove_member_2026`, avec motif
   du catalogue fermé, note, et l'aperçu EXACT du message reçu. Le §6.7 ④ est
   levé côté client.
5. **Un seul chemin d'entrée.** `requestCrewJoin` est retiré du client : deux
   façons d'entrer avec des garanties différentes auraient été une porte
   dérobée sur les exigences que le capitaine venait de régler.

### 7.4 Constantes et copie

Aucune constante n'a été ajoutée : les dix-huit du §6.5 suffisaient. Toutes les
bornes de l'écran des règles les LISENT (`CREW_MIN_CHALLENGE_DAYS_MAX`,
`CREW_CHARTER_MAX_CHARS`, `CREW_KICK_NOTE_MAX`, `CREW_REJOIN_AFTER_KICK_DAYS`,
`CREW_WARNING_GRACE_DAYS`, `CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS`,
`CREW_BOARD_SORTS` / `_FILTERS`, `CREW_KICK_REASONS` +
`CREW_KICK_REASON_REQUIRING_NOTE`, `CREW_DISSOLVE_REFUSALS`).

La copie vit dans `apps/mobile/src/i18n/catalog/crewGestion.ts`, `Entry =
Record<Locale, string>` : les cinq langues sont imposées par le type (ADR-009).
Français au tutoiement, sans tiret long (`noDashFr2026.test.ts`, global).
« Crew » reste invariant. Aucun hex en dur, aucun texte en dur.

### 7.5 Ce que Q3 prouve, et ce qu'il ne prouve PAS

**Prouvé.** `npm run gate` vert. 3 252 tests mobile, dont 56 purs neufs
(lecture défensive, bornes, formulation dans les cinq langues) et 28 de couture
(chaque RPC a un appelant, aucune table de crew lue en direct, chaque écran
neuf atteignable). `node scripts/audit-routes.mjs` vert : 65 routes
atteignables sur 94, aucune orpheline nouvelle, aucun lien mort. Bundle web
exporté et les huit routes ouvertes en headless (390 × 844, `fr-FR`) : aucune
erreur de page, état « pas connecté » honnête partout.

**NON prouvé, et il faut le dire.**
1. **Aucun écran n'a jamais reçu une réponse `ok:true`.** 0188-0190 ne sont pas
   poussées, et la base réelle a 3 comptes et 0 donnée de jeu. Tout ce qui a été
   vu à l'écran est l'état « pas connecté ». Les branches « lu », « vide » et
   « refusé » sont testées par des JSON copiés du §6.3, pas vécues.
2. **Aucun rendu authentifié**, donc aucune preuve de mise en page réelle :
   ni un tableau de 50 lignes, ni une charte de 600 caractères, ni un pseudo
   long. Le gate `ux-gate` reste à passer.
3. **Le filtre « je suis éligible » n'a jamais filtré**, faute de crew avec
   exigences.
4. **La levée d'avertissement ne vise que le plus récent** d'un membre. Avec
   plusieurs avertissements ouverts, il faut relire entre deux gestes.
5. **`redeem_crew_invite` (0090) applique encore le cooldown à tous les départs**
   (§6.7 ⑤) : une invitation par pseudo peut donc arriver chez quelqu'un qui ne
   pourra pas l'accepter. Le mobile ne peut rien y faire.
6. **La commune d'une exigence est celle DU CREW, ou rien** : aucun sélecteur
   de commune arbitraire n'est offert, alors que le serveur en accepterait une
   autre. C'est un choix, pas un manque.

### 7.6 Ce qui reste, chiffré

| Reste | Effort |
|---|---|
| Pousser 0188-0190 puis `npm run verify:rls` et vérifier `cron.job` | 0,5 j |
| Recette authentifiée des neuf écrans (4 états chacun) + gate `ux-gate` | 1 j |
| Filtres §2.7 non peints : discipline, taille, étiquettes, activité récente | 0,5 j |
| Lever un avertissement PRÉCIS quand un membre en a plusieurs | 0,25 j |
| Notifications : peindre `warning_issued` / `removed` / `dissolved` dans le centre d'activité (§6.6) | 1 j |

---

## 8. Livré (Q4, mobile) — écrit après les écrans, pas avant

**Date : 11/09/2026.** Deux des six restes du §7.6 sont levés, et le QR de crew
demandé par le fondateur le même soir est enfin lisible par un appareil.

### 8.1 Le QR de crew a une adresse, et un œil pour le lire

L'affiche d'invitation était un **mode** de la page Crew (`mode === 'invite'`) :
aucune adresse à ouvrir, aucun retour système, invisible pour
`scripts/audit-routes.mjs`. Elle devient la route **`/crew-invitation`**
(`src/features/crew/CrewInvitationScreen2026.tsx`) : blason, nom exact,
effectif, QR, lien, « Partager le lien », « Copier », quatre états distincts
(hors ligne · lecture · aucun crew · échec). Les **quatre** affordances
« Inviter » de la page du crew poussent la MÊME route.

Le QR encode `gryd://c/<CODE>`, comme le lien partagé et par la même
expression : `app.json` ne déclare aucun domaine universel (décision d'infra,
O10) et `apps/web` n'a pas de route `/c/[code]`, donc un `https://` ouvrirait
une 404. Garde : `crew/crewInviteLink2026.test.ts` (5 tests, il devient rouge le
jour où le domaine existe et dit quoi rebrancher).

**Personne ne pouvait LIRE ce QR.** iOS n'ouvre pas un schéma privé depuis l'app
Appareil photo, et le domaine des universal links n'est pas acheté : le carton
était imprimable, pas scannable. `expo-camera@~16.0.18` entre au build, et
`/qr` gagne son onglet **Scanner** (`src/features/scan/`) :

- `scanCapability2026` (pur, 9 tests) lit le **binaire** — config embarquée
  (`Constants.expoConfig.plugins`) **et** module natif requis paresseusement.
  Web : aucun onglet. Build antérieur au plugin : l'onglet dit qu'un nouveau
  build est nécessaire. Jamais un bouton mort ;
- `parseScannedCode2026` (pur, 16 tests) : QR de crew → `/c/<CODE>`, QR de
  profil → `/profil-rival/<handle>`, jeton 0090 → « cette version ne sait pas
  encore le lire » (c'est un lien GRYD, pas un code étranger), tout le reste →
  « ce code n'est pas un code GRYD ». Une chaîne **nue** n'est jamais un code de
  crew : le QR d'un ticket de parking n'est pas une invitation ;
- permission demandée **au geste**, jamais au montage ; refus définitif →
  `Linking.openSettings()` ; `barcodeTypes: ['qr']` et rien d'autre ; aucune
  image écrite, aucun octet envoyé (le manifeste de confidentialité n'a donc
  pas une ligne de plus).

`NSCameraUsageDescription` devient **une seule phrase**, écrite à l'identique
aux deux plugins qui la déclarent (`expo-image-picker` et `expo-camera`) : le
dernier gagne à la génération, et deux formulations auraient rendu la chaîne
installée dépendante de l'ordre du tableau `plugins`.

**Aucun bouton « Révoquer et regénérer » n'est peint**, et c'est le seul point
où ce lot dit non à sa propre commande. `crews.code` (0002) est **permanent** :
aucune migration ne le fait tourner. L'objet révocable existe bien — le jeton
daté de 0090 — mais **aucun écran ne le consomme** : ni route `/i/[token]`, ni
appel à `redeem_crew_invite` dans tout `apps/mobile`. Le peindre reviendrait
soit à ne rien révoquer, soit à émettre un lien que l'app ne sait pas ouvrir.
L'affiche dit donc ce qui est vrai avant qu'on donne le code : il est celui de
tout le crew, il ne change pas et ne s'annule pas. **Question ouverte pour le
fondateur en §8.4.**

### 8.2 Les filtres de §2.7 (reste n°3 du §7.6) — levé

`crew_discovery_2026` accepte neuf paramètres depuis Q2 ; l'écran en envoyait
deux et laissait `p_activity`, `p_min_members`, `p_max_members`, `p_tags` et
`p_active_only` à `null` **en dur**. La migration était déployée et à moitié
morte. `crewDiscoveryFilters2026.ts` (pur, 12 tests) construit la charge utile ;
`/crew-discovery` peint un panneau **replié par défaut** (la décision de l'écran
reste la liste) portant le compte des filtres actifs :

| Filtre | Source | Choix |
|---|---|---|
| Discipline | `holds_run` / `holds_bike` | peu importe · course · vélo |
| Taille | `member_count` | peu importe · trois tranches **dérivées de `CREW_MAX_MEMBERS`** (1/5, 1/2) |
| Conditions | `crew_rules_2026.requirements` | inchangé, dont « je suis éligible » |
| Activité | `next_outing_at` / `last_capture` | peu importe · actifs récemment |
| Étiquettes | `crews.tags` (`CREW_TAGS`) | jusqu'à 3, plafond **dit avant d'être heurté** |

Les bornes de taille ne sont **pas** dans `game-rules.ts` : aucune mécanique ne
les lit, ce sont des tranches d'affichage (même arbitrage que
`INVITE_EXPIRING_SOON_HOURS`). Elles se dérivent de la seule constante réelle,
donc elles suivront si un crew peut compter 100 personnes.

Deux garanties : un filtre actif fait retirer des lignes de la liste de 0152, un
filtre **inactif** n'en retire aucune (une panne de 0190 ne vide pas une
recherche qui ne lui demandait rien) ; et « rien ne coche tout ça » est une
phrase **distincte** de « aucun crew ici ».

### 8.3 Lever un avertissement PRÉCIS (reste n°4 du §7.6) — levé

L'écran affichait « 3 avertissements en cours » sous **un** bouton qui levait
toujours le plus récent : deux des trois étaient inatteignables, et le libellé
promettait « Lever cet avertissement » sans jamais dire lequel. Chaque
avertissement a maintenant sa ligne (nature, date, auteur `automatique` ou
`officier`, note non tronquée) et **son** bouton, dont le nom accessible porte
le QUOI et le QUI. La trace reste dans le journal : levé n'est pas effacé.

**Bonus, même famille.** La porte « Gérer mon crew » de la page du crew porte
désormais le nombre d'alertes — candidatures en attente + membres à risque,
comptés depuis `crew_join_requests` et `crew_member_board_2026`. Le compteur
**disparaît à zéro** (jamais une pastille permanente), et une lecture qui n'a
pas abouti ne compte pour rien : `crewAlerts2026.ts` sépare « zéro » de « je ne
sais pas ». Les deux lectures vivent dans un composant monté **seulement** pour
qui a la permission, donc aucun membre simple n'envoie ces RPC.

### 8.4 Ce que Q4 prouve, et ce qu'il ne prouve PAS

**Prouvé.** `npm run gate` vert. `node scripts/audit-routes.mjs` vert :
`/crew-invitation` entre, `/profil-rival/[handle]` **sort de `KNOWN_ORPHANS`**
(le QR de profil lui donne enfin une porte réelle, et une exemption fausse est
pire qu'une orpheline). 49 tests neufs : 37 purs (parsing de QR, capacité du
binaire, charge utile des filtres, compte d'alertes) et 12 de couture
(invitation à un tap, scanner gardé par capacité, QR et lien portant le même
jeton, un bouton par avertissement).

**NON prouvé, et il faut le dire.**
1. **La caméra n'a jamais été ouverte.** `expo-camera` est un module natif : le
   build installé sur l'iPhone du fondateur (31cdde4e) ne l'embarque pas. Tant
   qu'un nouveau build EAS n'est pas fait, l'onglet Scanner rend l'état
   « nouveau build nécessaire » — l'état est juste, mais le viseur, le décodage
   d'un vrai QR et la feuille de permission iOS n'ont été vus par personne.
2. **Aucun QR de crew n'a été scanné de bout en bout** : il faudrait deux
   appareils, un crew réel et un code réel. La base a 3 comptes et 0 donnée de
   jeu.
3. **Les filtres §2.7 n'ont jamais filtré** quoi que ce soit, faute de crews.
4. **Le compteur d'alertes n'a jamais compté** : aucune candidature n'existe.
5. **Le gate `ux-gate` reste à passer** sur `/crew-invitation` et sur l'onglet
   Scanner, en rendu authentifié.

**Question ouverte, une seule (§8.1).** Faut-il câbler le jeton d'invitation de
0090 — route `/i/[token]`, `peek_crew_invite` (qui montrerait enfin le NOM du
crew avant l'adhésion), `redeem_crew_invite`, création/révocation gatées sur
`CREW_PERMISSIONS.invite` ? C'est le seul chemin par lequel « Révoquer et
regénérer » peut exister sans mentir, et il ouvrirait aussi une invitation
**datée**. C'est un lot à part entière, pas une finition.

### 8.5 Ce qui reste du §7.6

| Reste | État |
|---|---|
| Pousser 0188-0190 puis `npm run verify:rls` et vérifier `cron.job` | inchangé |
| Recette authentifiée des neuf écrans + gate `ux-gate` | inchangé, + `/crew-invitation` et l'onglet Scanner |
| Filtres §2.7 non peints | **levé (§8.2)** |
| Lever un avertissement PRÉCIS | **levé (§8.3)** |
| Notifications `warning_issued` / `removed` / `dissolved` | inchangé (lot notifications) |
