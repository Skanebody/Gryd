# AMENDEMENT-14 — GO-first : zéro question avant de courir + icônes Arsenal (05/07/2026)

**Décision fondateur (05/07/2026)** : « Le bouton défendre, mets le mot GO. Réduire encore plus la friction et faciliter le jeu sans que l'utilisateur ait à se poser trop de questions — simplifier la défense et conquérir. » Précise AMENDEMENT-12 §A : les 2 objectifs restent la **lecture** du jeu, mais ne sont plus un **choix** demandé au joueur.

## 1. Principe : l'objectif est un RÉSULTAT, pas une question
Le moteur classe déjà chaque zone tout seul (capture neutre / vol / défense / intérieur de boucle — décision serveur, cellule par cellule). Donc :
- **La règle tient en une phrase**, répétée partout (onboarding, états vides, aide) : « **Cours. Tu conquiers ce que tu traverses, tu défends ce que tu possèdes, tu prends l'intérieur de tes boucles. GRYD s'occupe du reste.** »
- Le joueur ne choisit JAMAIS un objectif avant de courir. Il voit ce que GRYD lui **propose** (une phrase), et ce qu'il a **fait** (le résultat : « Tu as défendu 12 zones et conquis 8 »).

## 2. Le bouton central = GO (unique, partout)
- Libellé **GO**, chartreuse, toujours identique — plus jamais CONQUÉRIR/DÉFENDRE sur le bouton (la teinte/le kicker contextuel restent dans la sheet : `DÉFENDS LE CANAL · 3 zones à sauver` ou `CONQUIERS RÉPUBLIQUE · +94 pts`).
- **Tap = départ immédiat** : mode Conquête + itinéraire recommandé du moment (le plan auto). Aucun écran intermédiaire.
- **Long-press = choix avancés** (les « power users ») : RunModeSheet (Conquête / Social Run / Course privée) + « Changer d'itinéraire » (→ Route Planner). Le RunModeSheet ne s'affiche PLUS au tap simple.
- Même logique sur les CTA : Today → GO ; Route Planner → GO (démarre la route sélectionnée) ; sheet Battle Map → GO.

## 3. Le plan auto (smart default)
GRYD pré-choisit en silence : décès imminent/mission défense active → plan défense (itinéraire dans tes zones) ; sinon → plan conquête (itinéraire recommandé). Affiché en UNE phrase au-dessus du GO. Le Route Planner devient un outil OPTIONNEL (jamais obligatoire) accessible par la sheet, Today, War Room et le long-press.

## 4. Coupes de friction complémentaires
- **Onboarding skippable en entier** (défauts sains : Mixte, visibilité crew) — « Commencer à courir » dès l'écran 1.
- **Résultat de course** : UN CTA principal (« Partager la conquête »), le reste en secondaire discret ; retour carte automatique au dismiss.
- **Aucun réglage requis avant le premier run** ; toute question différée au moment où elle a du sens (au premier partage, au premier crew).
- Vocabulaire : le jeu parle en actions (« GO », « Cours »), jamais en configuration.

## 5. Arsenal : icônes personnalisées
Nouveau `packages/shared/src/arsenal-icons.ts` (même style que la planche badges : stroke ~1.5, 24×24, dessin distinctif par objet — pas les icônes génériques) : **shield** (bouclier facetté), **scout** (jumelles), **radar** (arcs + point), **route_boost** (route + éclair), **streak_gel** (flocon/sablier gelé), **skin_carbon_grid / skin_ghost / skin_founder_glow** (variantes de trame), **skin_trace** (trace stylée), **pass_saison** (ticket étoilé), **club** (blason laurier), **pack** (caisse), **eclats** (gemme facettée), **foulees** (double empreinte), **crew_gear** (fanion crew). Rendu teinté par rareté (tier) sur `ArsenalItemCard` ; bannière anti pay-to-win inchangée. Ces icônes restent DATA (registre + `arsenalIconFor(slug)`), consommées mobile (et landing V1).

## 6. Hors scope
Vrai plan auto algorithmique (le plan démo choisit sur les données démo) ; guidage pendant la course ; icônes animées Arsenal (V1).
