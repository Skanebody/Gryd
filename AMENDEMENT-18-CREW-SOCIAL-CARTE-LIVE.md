# AMENDEMENT-18 — Crew = système social de jeu, carte action-first, Live Run guidé (05/07/2026)

**Décision fondateur (05/07/2026, gros brief Clash-like + carte/live + épuration).** Formule : *« Ton crew ne parle pas seulement. Il agit. »* + *« Vois le territoire. Suis la route. Ferme la boucle. Prends la zone. »* Portée = **le MVP explicitement listé par le fondateur** ; V1/V2 catalogués et différés. Séquencé en **workflows successifs** (commit entre chaque), APRÈS le workflow chat/édition en cours (qui pose la brique « composer »).

Mécanique clé transverse : **Demander → quelqu'un aide → le crew progresse → tout le monde le voit.**

---
## PARTIE A — Crew, système social (Clash adapté) → workflows A1-A2
### A.1 Cinq piliers
1. Rôles & permissions (déjà en base AMENDEMENT-16 : founder/co_captain/captain/strategist/scout/runner/rookie 7 j + matrice). **MVP = permissions simples appliquées à l'UI** (qui peut lancer/assigner/inviter/promouvoir/exclure/épingler).
2. **Chat actionnable** (le cœur) — pas un chat texte : le centre d'action du crew.
3. Demandes / dons / entraide.
4. Missions collectives (War Room — déjà en place, à relier au chat/requêtes).
5. Progression sociale (Crew XP existant AMENDEMENT-06 + réputation interne légère).

### A.2 Crew Chat actionnable (remplace/étend le composer du workflow en cours)
3 sections dans l'onglet Chat (anti-scroll : la 1ʳᵉ ouverte, résumé+détail) :
- **À FAIRE** (3 actions prioritaires en haut) : cartes actionnables — Terminer une frontière (`République · 620 m · [Terminer]`), Défense urgente (`Canal · 48 h · [Défendre]`), Sortie crew (`19:00 · 4 participants · [Rejoindre]`), Scout report, Boost offert, Requête crew.
- **MESSAGES** : le fil humain (composer texte + réactions + mentions) — secondaire.
- **LOG** : historique auto compressé (zone capturée/défendue, rival, coffre, promo, boost, boucle fermée, rank).
- Filtres : Tout / Demandes / Missions / Dons / Résultats.
Les **cartes d'action** ont : type · zone · distance · expiration · demandeur · récompense · 1 CTA. Jamais un chat infini.

### A.3 Requêtes & dons (façon donations Clash, sain)
- **Bouton « Demander »** (dans chat/War Room) : Défense · Terminer une boucle · Route · Scout · Sortie · (Proposer un boost — jamais « demander de payer »).
- **Dons GRATUITS (MVP prioritaire)** : donner une **route**, donner un **segment** (terminer la boucle d'un autre — le don le plus fort, chantier 2 déjà en place), donner un **scout report**, prendre une **défense**, inviter un membre.
- **Dons PREMIUM (MVP simple)** : Crew Boost 24 h + Coffre cosmétique crew (déjà seedés 0014). Cadeau → message dans le chat, **1 récompense/membre, expiration 24 h, don anonyme possible, ZÉRO classement des payeurs, jamais de territoire/points**.
- **Réactions « Merci / Respect / Bien joué »** (MVP) sur tout don (boost/route/segment/défense/coffre) → statut social cosmétique, `12 membres ont remercié Benjamin.` — pas de récompense pay-to-win.

### A.4 Progression sociale + membres
- **Réputation interne** (MVP léger, non monétaire, basée comportement) : Finisher / Defender / Scout / Supporter… (`KORO · Finisher · 8 boucles terminées`).
- **Contribution crew de la semaine** (déjà partiellement) : zones, frontières terminées, routes proposées — présenté proprement, pas de classement de payeurs.
- **Membres** : filtres Actifs/Rookies/Rôles/Inactifs/Invitations ; card membre (rôle · contribution · dernier run · [Promouvoir][Message][…]).
- **Inactivité** (V1 léger MVP) : statuts actif/calme/inactif (7/14/15+ j) + **Mode absence** (7/14/30 j : pas d'assignation auto, territoire perso protégé partiellement, visible au crew, ne compte pas inactif). Jamais d'humiliation publique.

### A.5 Solo (l'app ne doit jamais sembler vide)
- **Territoire personnel** (MVP) : même sans crew, base perso (zones/routes/frontières/historique/badges) — voir Partie B.
- **Suggestions de crew** (MVP) : après quelques runs, `3 crews actifs près de toi` (ville/niveau/activité/style) → Postuler / Courir avec eux / Suivre.
- Social solo (V1) : amis/défis privés/partage de route/duel amical.

### A.6 Modération (MVP minimal)
Mute · Signaler message · Bloquer joueur · Masquer crew ; droits par rôle (Captain+ épingle, Co-Captain+ supprime, Founder bannit, Runner signale). Anti-spam/cooldown = V1.

**Hors MVP (V1/V2)** : DM ouvert, Event Chat complexe, économie de dons avancée, réputation détaillée, modération sophistiquée, pass donnable, permissions ultra-fines.

---
## PARTIE B — Carte « Mon territoire » = statut + raccourci action → workflow A3
Transformer la card du Profil de décorative en **résumé stratégique personnel** : *voici ce que je contrôle · ce qui est menacé · ma prochaine action.*
- **Adaptative** : 1 ville → quartier (`Paris Est · 55 zones · 3 frontières contestées`) ; multi-ville → mini-France (`Paris 42 · Lille 13`) ; débutant → `Aucune zone · Trace ta première boucle · [Créer une zone]`.
- **Statut** : Stable / Contesté / Fragile / En expansion / Sous attaque.
- **Prochaine action + CTA contextuel** : `1 zone à défendre [Défendre]` / `35 zones → #7 [Trouver une route]` / `Il manque 620 m [Terminer]`. Fini le CTA vague « Explorer la carte ».
- **Proportion 60 % stats / 40 % carte**, hauteur ≤ 260 px, ≤ 3 micro-badges territoire (Multi-ville/Defender/Route Maker).
- **Perso vs public** : sur mon profil = actionnable ; profil d'autrui = statutaire (ville/zones agrégées/rang), **jamais de tracé précis** (confidentialité, cf. AMENDEMENT-17 ch3).
- **Tap → page /territoire** détaillée (déjà existante, à enrichir : zones par ville, à défendre, routes ouvertes, records territoire).

---
## PARTIE C — Carte action-first & Live Run guidé → workflow A4
### C.1 Carte principale = 3 états (le reste déjà fait en ch1 + bouton Info)
- **A — Carte libre** : position + territoire crew/rival + contesté + 1-2 opportunités max + sheet « Recommandé · [DÉFENDRE] ». Toujours proposer UNE prochaine action.
- **B — Mission recommandée** : route-first (route lumineuse domine, cible légère, reste atténué).
- **C — Frontière/boucle à terminer** : segments tracés chartreuse + segment manquant pointillé + point de connexion + `Il manque 620 m · [TERMINER] [Demander au crew]`.

### C.2 Live Run = 2 vues (Stats / Carte), défaut selon mode
- **Stats** (défaut course libre, déjà Nike) : distance géante, temps, allure, impact GRYD, Verify — 3 contrôles bas (Pause/Carte/Terminer). Rien d'autre.
- **Carte** (défaut mission/défense/terminer) : tracé couru + route restante + point de fermeture + zone potentielle transparente + flèche ; card live selon mode (Boucle 78 %/280 m ; Défense 64 %/2 sauvées ; Terminer 420 m).

### C.3 Indications live (3 niveaux, jamais de modale bloquante)
- **N1 info douce** (toast + vibration légère) : « Boucle possible » · « Route ouverte ».
- **N2 action** (card courte + vibration moyenne) : « Presque fermé · 180 m » · « Il reste 300 m ».
- **N3 événement** (mini-anim 2 s + haptique forte courte) : « ZONE CONQUISE +18 » · « Canal repoussé » · « Zone défendue +48 h » · « Boucle fermée ». Ne masque jamais la route longtemps. Décisions complexes = avant/après, jamais pendant.

### C.4 Live alliés/ennemis (MVP contrôlé — sécurité d'abord)
- **Alliés** : position live **opt-in, UNIQUEMENT pendant une mission crew rejointe** ; on ne voit que les personnes UTILES à la course en cours (segments couverts, qui ferme la boucle). Points chartreuse + prénom + statut. `Lena · nord · Koro termine 420 m · Boucle 82 %`.
- **Ennemis** : **JAMAIS de position exacte/live** — activité par SECTEUR, retardée 1-3 min : halo orange pulsé, `Activité Canal détectée · pression élevée · 14 zones reprises il y a 12 min`. Anti-stalking/harcèlement/App Store.
- **Quick pings** (pas de clavier en courant) : Je prends le nord / Je termine / Besoin d'aide / Zone couverte / Je suis out.
- Réglage (déjà Confidentialité ch3) : position live = Jamais / Missions rejointes (**défaut**) / Sorties crew / Toujours crew.
**Hors MVP** : sorties groupées live, mission chat live, rival heatmap, spectateur War Room (V1) ; events Raid live, live battle map, replay multi-run (V2).

---
## PARTIE D — Épuration visuelle & icônes → transverse (fold dans chaque workflow)
- **Un écran = 1 action ; 1 card = 3 infos max ; détail au tap ; scroll réduit** (déjà ch1, à généraliser).
- **Typo** : titre écran 20-24 / titre card 15-17 / secondaire 12-14 / KPI 32-48 / bouton 14-16 / label carte 10-12. **Aucun texte d'ACTION coupé par « … »** (ellipse tolérée seulement pour pseudos/crews longs/historique). Inverser : statut en petit, nom en clair (`CONQUÊTE` / `République`).
- **Boutons standardisés** : 1 CTA principal plein chartreuse/écran (DÉFENDRE/CONQUÉRIR/TERMINER/REJOINDRE/VOIR ROUTE) ; secondaires en contour (≤ 2) ; actions-icônes en cercle sombre. **Icône seule** = nav/actions évidentes ; **icône + texte obligatoire** = CTA principal, achat, confidentialité, suppression, lancement de course.
- **Icônes propriétaires GRYD** (compléter le set) : conquête=drapeau, défense=bouclier, boucle-à-terminer=cercle ouvert, route=ligne courbe, rival=cible, crew=blason, league=trophée, perf=jauge, historique=horloge, réglages=engrenage, privacy=cadenas, couches=layers, don/boost=cadeau.

---
## Séquence de build
1. **(en cours)** chat composer + boutons Modifier profil/crew + cosmétiques équipés → brique de base.
2. **A1 — Crew Chat actionnable** (3 sections À faire/Messages/Log + cartes d'action + filtres) + réactions Merci/Respect.
3. **A2 — Requêtes & dons** (bouton Demander, dons gratuits route/scout/défense, gifting premium en cadeau chat + Merci) + réputation légère + membres/inactivité/absence.
4. **A3 — « Mon territoire » adaptative + page /territoire enrichie** + solo (territoire perso + suggestions crew).
5. **A4 — Live Run 2 vues + indications 3 niveaux + live alliés opt-in/rival secteur + quick pings.**
6. Épuration/icônes : intégrée à chaque workflow (pas un workflow séparé).
Chaque étape : MVP du fondateur, anti pay-to-win, zéro position live publique, anti-shame, typecheck + tests + preview verts, commit.
