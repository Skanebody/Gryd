# GRYD — Teardown COMPLET de Strava & ce qu'il y a à prendre (06/07/2026)

Analyse des surfaces clés de `strava.com` (compte connecté, observation seule) : onboarding, cartes/heatmap, abonnement, clubs, + segments/challenges/feed (connaissance produit). Objectif : **prendre ce qui est bon, éviter ce qui est faible, noter ce que GRYD fait déjà mieux.**

## 1. Surfaces analysées (ce que fait Strava)
| Surface | Ce que Strava fait | Pertinence GRYD |
|---|---|---|
| **Onboarding** (`/onboarding`) | Checklist froide : ① enregistre 1re activité (« connecte un GPS ») ② trouve/invite des amis ③ confidentialité ④ télécharge l'app. Rail Clubs + Amis. | GRYD déjà MOINS friction. À prendre : le **seeding social**. |
| **Cartes** (`/maps`) | **Heatmap mondiale** : densité d'activité publique, zoom rue réservé aux inscrits, opt-out privacy, masquage adresse/départ/arrivée. Contrôles : 3D, terrain, POI, couleur, opacité. | GRYD a déjà 3D/satellite/terrain. À prendre : le **modèle de confidentialité** (déjà matché) + l'idée d'une **couche « heat » d'intel**. |
| **Abonnement** (`/subscribe`) | Essai 30 j → **5 €/mois facturé ANNUEL**. Timeline transparente (aujourd'hui → rappel 2 j avant → débit). Paywall : itinéraires, classements de segments, analyse avancée. | GRYD paywall JAMAIS le jeu (§A.19). À prendre : la **transparence d'essai + l'annuel** (SI un jour abo sur la couche statut). |
| **Clubs** (`/clubs`) | Recherche par **nom + lieu + sport** ; création libre ; groupes sociaux (feed, events, classement de club). | = l'analogue LÂCHE du crew. GRYD le fait compétitif+territorial. À prendre : **events de crew**, **découverte par lieu**, **classement de club**. |
| **Segments** (connu) | Tronçons chronométrés + **classements KOM/QOM** = le moat network-effect de Strava (compétition micro-locale répétable). | GRYD : la conquête EST la compétition. À prendre : **leaderboard PAR zone/secteur** (top conquérants/défenseurs d'un lieu). |
| **Challenges** (`/challenges`) | Défis mensuels à badge, souvent **sponsorisés** (marques). | GRYD a des challenges. À prendre : **challenges sponsorisés** (branche la monétisation sponsors locaux du doc stratégie). |
| **Feed / Activité** (connu) | Boucle sociale : **kudos** (pouce) + commentaires + photos sur chaque activité ; segments et splits sur le détail. | GRYD a le crew feed + réactions chat. À prendre : **kudos/réactions sur les CONQUÊTES**. |
| **Gifting** (`Envoyer un cadeau`) | Offrir un abonnement. | GRYD a le don crew (A-18). À prendre : **offrir un Founder Pack**. |

## 2. À PRENDRE (backlog priorisé)
- **[P0] Seeding social / densité — inviter le crew** (dès la 1re capture) : lien de partage, « invitez-vous, prenez le quartier ensemble ». C'est le lever n°1 de Strava (invite friends) ET le moat densité de GRYD (crew = rétention + clustering géo). **Le seul emprunt vraiment urgent.**
- **[P1] Kudos / réactions sur les conquêtes** : réagir (Respect / Feu / Défends-la) à la capture d'un coéquipier — la boucle sociale légère de Strava (dopamine + colle sociale), version GRYD. Le store `reactions` existe déjà (A-18) → l'étendre aux captures partagées.
- **[P1] Leaderboard par zone/secteur** (analogue segment) : chaque zone a ses « top défenseurs / conquérants » → hook compétitif + raison de revenir sur un lieu précis. Le moteur `sectors` (§C) fournit déjà le contrôle par secteur.
- **[P1] Challenges sponsorisés** : brancher un sponsor local sur un challenge (« Défi du magasin X : 50 km cette semaine, lots offerts ») → monétisation sponsors (doc stratégie §3.5) sur le système de challenges existant (A-07).
- **[P2] Events de crew / sorties groupées** (comme les club events Strava) : planifier un run de crew (heure + lieu + zone cible).
- **[P2] Itinéraires populaires** : suggérer des boucles de conquête crowd-sourcées (les tracés que les crews réussissent le mieux).
- **[P2] Classement de crew hebdo** (activity score existe déjà — le surfacer comme un « club leaderboard »).
- **[P3] Transparence d'essai + annuel** : UNIQUEMENT si abo un jour, et sur la couche statut/social, jamais sur le jeu.
- **[P3] Companion web** « voir ma ville » (portée + partage ; le site waitlist existe).

## 3. Ce que GRYD fait DÉJÀ MIEUX (à assumer, ne pas régresser)
- **Anti-friction onboarding** : Strava met « connecte un GPS » en étape 1 ; GRYD capture depuis un run d'hier / 1-tap (AMENDEMENT-30).
- **Carte 3D / satellite / relief** : GRYD keyless (A-26/27/28) ; Strava garde ça en abo.
- **Confidentialité par défaut** : position live jamais publique, masquage départ/arrivée — argument de vente ; Strava le propose mais en opt-in.
- **Crew = équipe compétitive + territoriale** : Strava traite le club en secondaire (« pourquoi sortir seul ? » en rail). GRYD en fait le cœur.
- **Transparence des règles** : page « Comment GRYD calcule tes zones » + FAQ (A-23) ; Strava a un scoring segment opaque.
- **Anti pay-to-win** : GRYD ne vend jamais le territoire ; Strava paywall des features cœur (routes, classements).

## 4. La conclusion nette
Strava a un moat (segments + graphe social + heatmap) bâti sur **10+ ans de réseau**, pas sur une idée. Impossible de le battre sur son terrain (training/segments). **Ce qu'on lui prend** tient en une ligne : **sa machine de seeding social** (invite friends/clubs) — que GRYD doit rendre CENTRALE dès la 1re capture (P0), plus quelques boucles sociales légères (kudos → réactions sur conquêtes, leaderboard par zone). Le reste (heatmap, segments, abo) confirme surtout que **la stratégie GRYD — crew central + anti-friction + territoire jouable — attaque un flanc que Strava a laissé ouvert.**
