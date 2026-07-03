# AMENDEMENT-10 — Route Planner, Live Run Nike, Today, régimes UI, DA badges (03/07/2026)

**Sources : `docs/product/GRYD_refonte_uiux_2026_route_planner_battle_map.md` + `GRYD_refonte_uiux_rondesignlab_sport_game.md`.** Complète AMENDEMENT-08 (scènes de jeu) et AMENDEMENT-09 (map Uber). Formule : *Battle Map pour comprendre. Route Planner pour courir. Live Run pour ressentir. Post-run Reward pour revenir. Crew HQ pour appartenir. League pour rivaliser.* Et : *Spectaculaire quand il récompense, ultra lisible quand il guide.*

## 0. DA badges — unification bouclier-hexagone (demande fondateur explicite)
La planche `maquette-badges-gryd.html` (silhouette **bouclier-hexagone tactique**, anneau/glow/halo par tier road→legend, icône stroke teintée famille) est LA référence DA badge. TOUS les rendus badge l'adoptent : Collection mobile, Player Card, badge unlock (course-result), ShareCard, galerie landing. Nouveau `packages/shared/src/badge-icons.ts` : icônes des 24 emblèmes de la planche mappées aux slugs + fallback par famille → chaque badge des 200 résout une icône (`badgeIconFor(slug, family)`). Raison historique de l'écart : la Collection a été construite avant la planche ; la planche gagne.

## 1. Deux régimes UI (Rondesignlab §4 — règle transverse)
- **Régime conviction** (donner envie) : onboarding, post-run reward, badge unlock, chest opening, crew level up, rank up, share cards, landing. Style : cinématographique, KPI géants, glass léger autorisé, glow, reveals.
- **Régime usage réel** (agir vite, dehors, en mouvement) : Route Planner, Live Run, Battle Map, War Room, Support, Verify Hub, settings. Style : contraste maximal, fond plein (GLASS INTERDIT), hiérarchie brutale, textes courts, CTA évident, états d'erreur réels (GPS faible, segment exclu, stats only, zone privée, réseau faible, aucun itinéraire sûr…).
- **Un écran = une décision** : Today→démarrer la route recommandée ; Battle Map→trouver un itinéraire ; Route Planner→démarrer cette route ; Live Run→continuer/terminer ; Post-run→partager ; Crew HQ→rejoindre l'objectif ; War Room→défendre/raider ; League→rattraper le rang.
- **KPI géant** par écran clé (4,8 KM / +214 HEXES / 66 % / #8) ; listes longues → bento cards (2-6 max, détail au tap).

## 2. Route Planner — NOUVEL écran `/route-planner` (priorité 1)
GRYD ne montre plus seulement le territoire, il dit **« cours ici pour le prendre »**. Vue RUNNER distincte de la Battle Map. **Règle absolue : la route prime sur les hexes** — hiérarchie : 1 route épaisse chartreuse (flèches de direction, départ/arrivée) ; 2 rues visibles (basemap quartier) ; 3 position ; 4 objectif de capture ; 5 hexes capturables en TRANSPARENCE ; 6 territoires en arrière-plan.
- Header : `ITINÉRAIRE RECOMMANDÉ — 4,8 km · 28 min · +86 hexes · +340 pts · Boucle · retour départ`.
- **3 propositions démo** : Route A Rapide (3,4 km · +52 hexes) / Route B Optimisée (5,1 km · +94 hexes) / Route C Défense (4,8 km · 12 hexes sauvés · 48 h) — chacune : distance, durée, hexes, pts, type, difficulté, retour départ, sécurité. Tracées le long des rues de la basemap (démo scriptée ; vraie génération = V1).
- Options : distance 3/5/10 km/libre · boucle/aller simple · priorité capture/défense/performance/exploration · sécurité (éviter grands axes) · dénivelé.
- Bloc objectif : `Défendre République — 12 hexes à sauver · 48 h restantes`. CTA : `[Modifier] [Démarrer]` → course-live avec la route sélectionnée.
- Entrées : Battle Map (CTA sheet « Trouver un itinéraire »), War Room (« Voir route » d'une offensive/défense), Today (« Route recommandée »), bouton central (mode RUN long-press → planner si pas d'urgence).

## 3. Live Run — 2 modes, Nike d'abord (priorité 2)
- **Mode STATS (défaut)** : écran minimal type Nike — `4,74 KM` géant (fontSizes hero), `+62 HEXES` chartreuse, allure `5'09 /km`, temps, pill `GRYD VERIFIED`. Contrôles : `[Pause] [Carte] [Terminer]`. Zéro décor, zéro glass, contraste max (utilisable au soleil).
- **Mode CARTE** : la navigation type Uber d'AMENDEMENT-09 (route à suivre, virage suivant, hexes qui s'allument, sheet) — on bascule par le contrôle Carte. Ne pas afficher : tout le territoire, tous les rivaux, trop de labels.
- Feedbacks conservés (zone capturée, checkpoint, GPS faible) dans les deux modes.

## 4. Today — porte d'entrée quotidienne (priorité 4)
`app/aujourdhui.tsx` refondu : `BONJOUR KORO` + situation (`Paris Est est contesté.`) + **carte ROUTE RECOMMANDÉE** (4,8 km · +86 hexes · 28 min · Boucle — KPI géant, tap → Route Planner) + CTA `START RUN` + bandeau semaine (`2/3 runs · Score Forme 78 · Coffre crew 66 %`). Règle stricte : 1 objectif principal, 2-3 indicateurs secondaires, 1 CTA, pas de feed. Reste accessible selon play_style (Focus Solo) + entrée War Room.

## 5. Onboarding immersif (Rondesignlab §6)
3 écrans concept AVANT le choix de style existant : « La ville devient une carte. » / « Chaque run capture du territoire. » (mockup route+hexes, compteur) / « Seul tu prends des rues. En crew, tu prends la ville. » (blason) — visuels SVG stylisés (pas de photos en MVP), puis les écrans AMENDEMENT-07 (style + visibilité) inchangés, + écran final « Rejoins un crew ou crée le tien ».

## 6. Retouches ciblées
- **Battle Map** : le CTA de la sheet devient « Trouver un itinéraire » (décision de l'écran) quand pas d'urgence ; hiérarchie battle inchangée (territoire prime sur rues).
- **Crew HQ Base** : bento 6 cartes (Défense urgente / Offensive prête / Coffre 66 % / Recrutement 2 places / Prochain perk / Membres actifs).
- **Verify Hub** : copy trust par source (`GRYD Live GPS — Trust élevé · Capture directe` ; `Apple Health — Trust élevé · Import + vérif` ; `Strava — Trust moyen · Vérification requise` ; `Garmin — Bientôt`).
- **Post-run** : séquence AMENDEMENT-08 conservée, veiller aux KPI géants (`PARIS EST +12 %`, `#8 → #7`).
- **Data-viz** : jamais décorative — chaque chiffre répond à « que faire / que gagner / qu'est-ce qui est urgent / qu'est-ce qui a changé ».

## 7. Hors scope (V1/V2 explicites des docs)
Suggestions automatiques de routes réelles (algorithme), filtres avancés, guidage vocal, AR preview, replay de conquête, recap saison animé, mini-territoire dans Discovery, photos IA in-app (les photos lifestyle restent landing/stores), events publics/sponsors, IA de reco.

## 8. Contraintes
Charte + palette fonctionnelle inchangées (chartreuse signature, autres couleurs = statuts) ; anti pay-to-win ; zéro position live publique ; anti-shame ; reduce motion ; haptics wrapper ; demo déterministe ; TS strict ; typecheck 4 workspaces + expo export + tests Deno + build web VERTS.
