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
