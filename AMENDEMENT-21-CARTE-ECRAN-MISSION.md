# AMENDEMENT-21 — La Carte = écran MISSION, pas dashboard de guerre (05/07/2026)

**Décision fondateur (05/07/2026).** L'onglet Carte est surchargé (header + alerte rival + bonus actif + boutons flottants + défense recommandée + situation + sélecteur de calques = trop d'objets en compétition). Règle : **1 écran = 1 décision principale.** Pour la Carte : *« Est-ce que je pars défendre/conquérir maintenant, oui ou non ? »* Formule cible : **carte épurée + 1 mission prioritaire + 1 bouton principal + détails dans un bottom sheet.** Passer de « dashboard de guerre » à « écran mission ».

## 1. Ce qui reste EN PERMANENCE (4 éléments seulement)
- **A. Header compact — UNE ligne** : `République attaquée · 3 zones à sauver` (fini l'empilement `PARIS EST · Zone contestée · #8` + `Canal Crew gagne du terrain…` + alerte rival + bonus). Le message unique = « va défendre République maintenant ».
- **B. Carte** : 70-75 % de l'écran utile. N'affiche que : ma position · la zone ciblée · la route/trait recommandé · point d'arrivée. Rien d'autre.
- **C. Card sticky basse (fermée) + 1 CTA** : `Défendre République` · `4,4 km · 3 zones · bonus actif` + bouton **[Défendre]** + lien discret **[Voir les options]**.
- **D. Bottom nav** : conservée.

## 2. Ce qui SORT de l'écran par défaut (→ bottom sheet / secondaire)
Contrôle du secteur (%), « Conquiers 10 zones aujourd'hui », zone bonus détaillée, LENA_RUN / runs d'amis, liste des parcours, détails du bonus, filtres multiples exposés, la double card « défense recommandée ». Tout ça au TAP.

## 3. Hiérarchie
- **Niveau 1 (immédiat)** : statut zone · objectif recommandé · distance · CTA.
- **Niveau 2 (au tap, bottom sheet)** : détail zone · bonus · contrôle crew · alliés proches · parcours alternatifs.
- **Niveau 3 (drawer/fiche)** : missions · historique · contrôle détaillé · social avancé.

## 4. Bottom sheet à 2 états (remplace les blocs empilés)
- **Fermé** : `Défendre République · 4,4 km · 3 zones à sauver` + [Défendre] + [Voir les options].
- **Ouvert** (≤ 4 blocs) : **Résumé** (zone · crew 42 % vs rival 38 % · bonus · temps restant) · **Parcours** (2-3 max : Boucle du Canal / Diagonale Bastille / Traversée Est) · **Équipe** (2 alliés opt-in proches + « Courir ensemble ») · **Détails** (missions liées · historique local). Pas plus.

## 5. Traitements ciblés
- **Bonus actif** : plus de gros bandeau horizontal permanent → **micro-ligne dans la card mission** (`bonus actif · +120 pts`) ou petit badge.
- **Alerte rival** : compacte, INFORMATIVE seulement (`Canal Crew reprend du terrain · 14 zones perdues`), **sans CTA** — c'est la card mission qui porte le seul CTA [Défendre] (l'alerte informe, la card convertit ; pas deux CTA).
- **Boutons flottants droite** : **2 MAX** (Recentrer/ma position · Couches). Le reste (Info situation, etc.) dans un menu secondaire. Fini l'effet « cockpit ».
- **Filtres Territoire/Route/Défense/Rival/Exploration** : plus jamais 5 exposés. Soit un switch léger 3 modes (Conquérir/Défendre/Explorer), soit derrière le bouton Couches. Défaut = mode auto selon contexte.
- **Carte plus lisible** : moins de labels de rues, moins de lignes secondaires, moins de texte sur le fond, moins de superpositions vertes. Fort : zone ciblée · route · point joueur · frontière à défendre · rival seulement si utile. Réponse visuelle en 1 s.

## 6. Copy (radicalement court)
Remplace `PARIS EST · Zone contestée · #8` + `Canal Crew gagne du terrain. 3 zones à défendre.` + `CANAL CREW attaque Rép…` + `Défense recommandée…` + `République est attaquée…` par :
`République attaquée` / `3 zones à sauver`, et la card : `Défendre République · 4,4 km · 3 zones · bonus actif`. C'est tout.

## 7. Règle des 3 secondes
L'utilisateur doit : (1) ouvrir la carte · (2) comprendre la situation · (3) appuyer sur [Défendre] — en moins de 3 s, sans lire 4 blocs ni scroller avant d'agir.

## 8. Build
Workflow (APRÈS AMENDEMENT-20, mêmes fichiers de rendu carte) : refonte de BattleMapOverlays (header 1 ligne, alerte rival compacte sans CTA, bonus en micro-ligne, 2 FABs max, filtres cachés, card sticky + [Défendre] + Voir les options) + bottom sheet 2 états (Résumé/Parcours/Équipe/Détails) + MapScreen/mapStyle (carte silencieuse : labels réduits). Puis vérif (règle 3 s) + fix. Charte, anti pay-to-win, reduce motion, typecheck/tests/preview verts. Cohérent avec le bouton Info (AMENDEMENT-17 option A) : à réconcilier — le Info peut devenir « Voir les options » de la card, ou rester le 2ᵉ FAB ; arbitrage : **la card sticky porte « Voir les options » (= le bottom sheet) ; l'Info FAB fusionne dedans** pour tenir la limite de 2 FABs.
