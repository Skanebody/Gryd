# AMENDEMENT-17 — Un écran = une action, anti-scroll, boucle crew collaborative (05/07/2026)

**Décision fondateur (05/07/2026, gros brief UX+gameplay).** Trois chantiers **séquencés en 3 workflows** (commit entre chaque). Principe transverse : *« Un écran = une action principale. 1 objectif, 1 CTA, 3 infos max, le reste au tap. L'utilisateur ne scrolle pas pour décider, seulement pour explorer. »* Phrases signature : *« Ouvre une frontière. Ton crew peut la fermer. »* / *« Il manque 620 m pour prendre République. »*

---
## CHANTIER 1 — Simplification UI (priorités fondateur 1-2-3-5-6) → workflow A
### 1.1 Bouton central contextuel, jamais générique
- Le FAB flottant n'apparaît QUE sur les écrans liés à la course : **Carte** (et Course Live, qui a déjà ses contrôles). **Retiré de Profil / League / Crew / War Room** — sur ces écrans, le CTA principal est **inline, dans le contenu**, pas flottant.
- Sur la Carte : un SEUL GO (dans la bottom sheet) — **plus de double GO**. Le gros bouton flottant central est supprimé au profit du CTA de la sheet (`[DÉFENDRE]`/`[CONQUÉRIR]`/`[GO]` selon le plan). Techniquement : `(tabs)/_layout` ne rend le FAB que si `pathname === '/'` ; et sur la Carte, le FAB devient le CTA de la sheet (ou on garde UN bouton, pas deux).
- CTA contextuel par écran (inline) : Carte → DÉFENDRE/CONQUÉRIR ; War Room → REJOINDRE/DÉFENDRE/TERMINER (selon priorité) ; Crew → Voir War Room ; League → Trouver une route ; Profil → Partager/Modifier.

### 1.2 Carte allégée
- **Supprimer les 5 filtres visibles** (Territoire·Route·Défense·Rival·Exploration) → UN bouton **Couches** (icône `calques` déjà créée) ouvrant un petit sélecteur ; par défaut la carte choisit AUTO la bonne couche selon le contexte (Plan Défense → zones à défendre + route + rival + timer, sans clic).
- **Header allégé** : `PARIS EST · Zone contestée` + une phrase (`Canal Crew gagne du terrain. 3 zones à défendre.`). Les % (42/38/20) passent en **détail au tap**.
- **Alerte rival actionnable** : `CANAL CREW attaque République · 14 zones reprises · il y a 12 min` + CTA `[Défendre]`.
- **Bottom sheet directive** : `DÉFENSE RECOMMANDÉE — République est attaqué. Cours 3,2 km pour sauver 3 zones. [DÉFENDRE] · Changer de route`. Basse par défaut, détail au swipe-up.
- **Route-first quand une mission est active** : route très lumineuse domine ; zones à sauver mises en évidence ; le reste en arrière-plan atténué. Hiérarchie : route lumineuse > zone potentielle (remplissage très léger) > zone contrôlée (couleur stable) > rival (orange). La zone n'est qu'une **promesse**, pas un territoire déjà pris.

### 1.3 Anti-scroll : résumé + détail (toutes les pages principales)
- **80 % de la valeur sans scroll.** Cards compactes (importante 90-130 px, secondaire 64-88 px), **max 2 cards visibles par section** (au-delà → « Voir tout »), sections repliées par défaut (une seule ouverte). Une card = 1 titre + 1 chiffre + 1 statut + 1 CTA ; le détail au tap.
- **War Room = dashboard compact 3 blocs** : `URGENT` (défense critique + `[DÉFENDRE]`) / `ACTIF` (conquête `496/800` + `[REJOINDRE]`) / `À TERMINER` (frontières ouvertes — chantier 2) + `COFFRE 66 %`. Challenges/Aujourd'hui/Motivation descendent sous le fold ou dans un onglet Objectifs. Rouge de la défense = plus sobre sauf si vraiment prioritaire (alors en haut).
- **Crew HQ = base forte en haut** : grand blason + `LES FOULÉES 9³ · Niveau 6 · #8 Paris · 7/10 actifs` + CTA `[Voir War Room]` ; puis 4 cards compactes (Territoire / Membres / Coffre / Contribution). La contribution/boost passe **secondaire** (après stats+War Room), jamais en premier.
- **Profil compact** : Player Card (nom, level, crew, **55 zones tenues · Paris+Lille**, rang) + `[Partager]`/`[Modifier]` (pas GO, pas « Ajouter » sur son propre profil) ; puis 3 modules seulement (Progression / Badges (3 équipés + « Voir collection ») / Territoire remonté). Listes longues → pages dédiées.
- **League** : `#8 KORO · 342 pts du #7 · ≈ 35 zones peuvent suffire` + CTA `[Trouver une route]` (pas GO) ; podium + top 10 compact ; rank-up émotionnel juste après le rang (`Tu entres dans le Top 10. Tiens ton rang pour débloquer Badge Paris.`) ; onglets réduits (Joueurs/Crews/Ville + filtre secondaire).

### 1.4 Vocabulaire varié selon contexte
`zones` (générique) · `secteurs` (grandes zones) · `frontières` (traits à défendre/fermer) · `routes` (lignes ouvertes) · `territoires` (possession globale) · `rues` (défense locale). Ex : « 14 zones reprises · 3 secteurs contestés · 620 m de frontière à fermer · 2 routes ouvertes · 55 territoires tenus · 12 rues à défendre ».

---
## CHANTIER 2 — Boucle crew collaborative (priorité 4, signature) → workflow B
**Règle produit** : une frontière ouverte (run non bouclé) peut être **fermée par un membre du MÊME crew** dans une fenêtre limitée → zone crew, contributions réparties.
- **Frontière partielle** : un run non fermé mais « fermable » n'est pas jeté → `partial_boundary` gardée **24 h** (`PARTIAL_BOUNDARY_TTL_H = 24`), stockée avec ses segments (polyline + longueur validée + auteur).
- **Complétion** : un membre du crew court le segment manquant ; si connexion géométrique propre (`PARTIAL_JOIN_TOLERANCE_M = 80` ville) → GRYD ferme la boucle, **zone = crew**.
- **Anti-abus (constantes game-rules, moteur pur testé)** : même crew uniquement (rival qui chevauche → `contested`, pas de complétion — MVP) ; TTL 24 h (expiré → segments = exploration/contribution, pas de zone) ; tous segments **GRYD Verified** (un segment douteux → `boucle incomplète, segment non vérifié`) ; **contribution min du finisher** `FINISHER_MIN_SEGMENT_M = 400` OU `FINISHER_MIN_SHARE = 0.15` ; surface/compacité (règles boucle AMENDEMENT-16 réutilisées) ; jamais de complétion par achat.
- **Répartition** : `crew_zone` + points crew selon zone + points individuels **au prorata de la longueur validée** par chacun ; feed crew ; badge collectif possible.
- **Tables (migration 0015)** : `partial_boundaries` (id, crew_id, opener_user_id, segments jsonb, total_length_m, missing_m, missing_segment geojson, status open|completed|expired|contested, expires_at) + `boundary_contributions` (boundary_id, user_id, validated_length_m, share). RLS : lecture par le crew, écriture service-role. `ingest_run` : détecte l'ouverture (run fermable non fermé → crée partial_boundary), détecte la complétion (run d'un membre qui referme une partial_boundary du crew → zone + contributions), applique l'anti-abus.
- **UX (simple, jamais technique)** : après un run non fermé → `FRONTIÈRE OUVERTE · Tu as tracé 2,4 km autour de République. Il manque 620 m pour fermer la zone. [Terminer maintenant] [Demander au crew]`. War Room section `À TERMINER` (`République · 620 m restants · expire dans 23 h · Ouvert par KORO · [Voir la route] [Terminer]`). Notif crew (`KORO a ouvert une frontière. Il manque 620 m pour capturer République. → Terminer la boucle`). Course Live mode « terminer » (`Terminer République · 420 m restants · Frontière couverte : 68 %`). Résultat : `BOUCLE CREW FERMÉE · République capturée · Benjamin 79 % · Lena 21 % · Crew +420 pts`. **Ne jamais afficher** polylines multiples/scores de géométrie/cellules/% trop précis.
- V1 (hors MVP) : rival complète→contestation résolue (majorité/dernier segment/trust) ; rival « coupe » une boucle en construction ; fenêtres 6-12 h compétitif / 48 h event.

---
## CHANTIER 3 — Pages fonctionnelles (utiles, pas centrales) → workflow C
Toutes en **résumé + détail**, action/essentiel sans scroll, style dark GRYD, texte court.
- **Performance** : Score Forme (KPI /100 + évolution + interprétation) · Cette semaine (runs/km/durée/allure + objectif hebdo) · Progression (distance/allure/régularité, mini-graph unique) · Records (5k/10k/plus longue/série) · **Impact GRYD** (zones tenues/défendues/frontières fermées/routes ouvertes + « +420 pts crew cette semaine ») · GRYD Verify (score fiabilité + GPS/motion/sources). Pas 15 graphiques.
- **Historique** : filtres Tout/Conquêtes/Défenses/Routes/Stats only ; card course compacte (nom · distance/durée/allure · impact territorial · statut Verify) ; détail (carte avant/après, stats, impact, segments, **raison si capture refusée**) ; états explicites (boucle non fermée « il manquait 240 m », zone trop fine, GPS instable → stats only, vitesse incohérente → refusé, capture partielle). CTA Partager/Voir sur la carte/Signaler.
- **Paramètres** : liste de sous-pages courtes — Compte · Profil · Crew · Course · Notifications · Carte · Sources connectées · Abonnement & achats · Aide · Confidentialité · À propos. Réglages techniques (tolérance boucle, etc.) sous « Avancé ».
- **Confidentialité (la plus critique — géoloc)** : **Mode privé** (toggle maître : courses non publiques, départ/arrivée masqués, position live off, données sportives privées, impact crew anonymisé) · Visibilité profil (public/crew/privé) · Visibilité courses (public/crew/masqué — impact crew compté même si masqué) · **Masquage départ/arrivée** (rayon 200/500 m/1 km, domicile/travail) · Position live (jamais / sortie crew only / crew ; **défaut jamais**) · Données sportives (FC privée par défaut) · Données territoire · Crew & social (qui peut ajouter/inviter/message/statut) · Blocage/signalement · **Export / suppression** (RGPD : télécharger, supprimer historique/données sportives/compte ; distinguer suppression affichage vs anonymisation impact saison).

---
## Invariants
Charte dark + chartreuse ; anti pay-to-win ; zéro position live publique (renforcé chantier 3) ; anti-shame ; reduce motion ; haptics ; H3 = moteur invisible ; « juste le tracé » (couloirs = lignes) conservé ; TS strict ; typecheck 4 workspaces + tests Deno + export web verts ; migrations RLS.
