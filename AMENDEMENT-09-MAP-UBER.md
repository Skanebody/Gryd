# AMENDEMENT-09 — Map type Uber, version running/gaming (03/07/2026)

**Source : `docs/product/GRYD_map_uber_running_gaming.md`.** Complète AMENDEMENT-08 §4-§5 : la Battle Map et la Course Live adoptent la **structure et la fluidité d'une map Uber** (lecture en 1 s, carte = cœur de l'expérience, bottom sheet, UI flottante, sensation live) + la couche gaming GRYD (territoire, crew, capture). Anti-SaaS : la map montre une **situation en direct**, pas de la donnée.

## 0. Arbitrage charte — carto SOMBRE premium
Le brief cite « fond clair façon carto moderne » mais la référence visuelle n°1 du fondateur (map dark + tracé chartreuse) EST la cible et la charte impose noir/blanc/chartreuse (toute couleur hors tokens = bug, app dark-first). **Décision : carto sombre premium type Uber-night** — fond `#0A0B0A`, îlots urbains en aplats gris très sombre (#101210 carbon), rues nettes en 2 niveaux de gris (secondaires fines, axes plus clairs/épais), eau bleu sombre discret, parcs vert très sombre. La CLARTÉ vient de la hiérarchie (rues lisibles, blocs propres, vide maîtrisé), pas du fond blanc. Un « mode clair carte » éventuel = décision produit séparée (hors scope).

## 1. Ce qu'on reprend d'Uber (les deux écrans carte)
- **Lecture 1 seconde** : où je suis (avatar centré, halo animé, orientation), où je vais (objectif fort + distance), le trajet (route principale très visible), ce qu'il reste, quoi faire (UN bouton principal).
- **Bottom sheet** 3 états (compacte / semi / ouverte, geste de glissement, poignée) — remplace l'empilement de bandeaux HUD.
- **Boutons flottants à droite** : recentrer, couches, stats rapides (3 max — anti-bruit).
- **Sensation live** : tracé qui se dessine, zones qui s'activent, micro-animations discrètes, recentrage fluide.
- **Usage du vide** : jamais plus d'une couche de gameplay « bruyante » à la fois ; chiffres regroupés dans la sheet, pas éparpillés sur la carte.

## 2. Battle Map (onglet Carte) — « avant la course »
- Carte plein écran, moi centré (égocentrée AMENDEMENT-01), échelle coureur (hex ≈ 30 px, réf. travail échelle en cours).
- Header réduit à une pill fine (saison · zone · rank) — le reste descend dans la sheet.
- **Sheet compacte** : objectif crew + pts + CTA contextuel (RUN/DEFEND/RAID/CAPTURE). **Semi** : + prochain défi à proximité, zone bonus, état crew (membres dispo). **Ouverte** : + choix de PARCOURS démo (2-3 : distance, dénivelé, zones à conquérir sur le tracé, difficulté) et runs d'amis à rejoindre.
- **Crew/amis sur la carte** : markers avatars UNIQUEMENT opt-in (`map_sharing`/run groupé AMENDEMENT-07) — jamais de position publique ; démo : 2 membres crew consentants. Écart de distance au tap.
- **POI running légers** (≤ 4 visibles) : parc, fontaine, spot populaire, départ conseillé — icônes shared discrètes.
- **Défis/événements** : 1 marker défi à proximité + 1 zone bonus pulsante max.
- Boutons flottants : recentrer (retour ego, animation fluide), couches (le toggle AMENDEMENT-08), stats.

## 3. Course Live — « pendant » (navigation type Uber)
- **Itinéraire** : route recommandée tracée en avance (gris clair) ; la partie PARCOURUE se peint en chartreuse (la route « conquiert » : hexes traversés s'activent au passage) ; partie restante lisible ; checkpoint suivant + virage simple (flèche + « à 200 m ») ; ETA + % progression.
- **Sheet compacte** (défaut pendant l'effort) : distance / temps / allure / hexes ; **semi** : + objectif, checkpoint suivant, récompense potentielle ; **ouverte** : détail (trusts GPS/Motion, splits).
- **Feedback temps réel** : toast + haptic « Zone capturée » à chaque cluster, « Nouveau record segment » (démo), « Déviation — itinéraire recalculé » (démo : la route restante se redessine), checkpoint atteint.
- Boutons flottants : pause/reprendre, recentrer, partager live (démo). Zéro chiffre hors sheet.
- Fin de course → course-result (inchangé, AMENDEMENT-08 §5).

## 4. Hors scope (V1/V2) — explicitement
Mode 3D ; vrai recalcul d'itinéraire (démo scriptée seulement) ; segments chronométrés réels ; position live publique (JAMAIS — opt-in crew/amis uniquement) ; fond de carte clair ; météo/trafic live.

## 5. Composants
`src/ui/game/` : + `MapBottomSheet` (3 états, geste), `FloatingMapButton`, `MateMarker` (avatar hex mini + halo), `PoiMarker`, `RouteProgress` (parcouru/restant). La basemap devient un vrai plan de quartier : îlots pleins + rues hiérarchisées (partagée Battle Map / Course Live via `basemap.ts`).

## 6. Invariants
Charte stricte (chartreuse = moi/crew/action ; orange rival ; violet contesté ; or victoire) ; anti-bruit (≤ 1 couche bruyante, ≤ 3 boutons flottants, chiffres dans la sheet) ; reduce motion ; haptics via wrapper ; events PostHog par écran ; TS strict ; typecheck + tests verts.
