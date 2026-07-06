# AMENDEMENT-29 — Bouton d'action flottant contextuel + nav Missions/Saison (06/07/2026)

**Décision fondateur (06/07/2026).** *« Navigation = où je vais. Bouton principal = ce que je fais maintenant. »* Il faut un bouton DIRECT pour courir, mais **contextuel et flottant**, PAS un onglet de nav (courir est une ACTION, pas une section). Implémente concrètement la constitution §A.4/§A.5 (le gros bouton central n'apparaît que dans les flows de course, libellé contextuel). **Supersède** la suppression du FAB d'AMENDEMENT-17 par une version plus intelligente (contextuelle + gatée). **« GO » est retiré définitivement** — toujours un verbe qui dit POURQUOI tu cours.

## 1. Bottom nav (5 onglets) — relabel
`Carte · Missions · Crew · Saison · Profil` (remplace `Carte · War Room · Crew · League · Profil`).
- **Missions** = l'ancienne War Room (liste de missions : Urgent / À terminer / Actif + Coffre) — recadrée « choisir une mission ». La coordination crew (« war room ») reste accessible depuis **Crew**.
- **Saison** = l'ancienne League (classement + récompenses + objectifs de saison).
- Carte / Crew / Profil : inchangés d'intention.

## 2. Bouton d'action flottant CONTEXTUEL (au-dessus de la nav)
Un SEUL bouton chartreuse flottant, centré au-dessus de la barre de nav, dont le libellé + l'action changent selon le contexte :
- **Aucune mission sélectionnée** → **RUN** : lance une course LIBRE ; GRYD détecte après coup (conquis / défendu / route). (Jamais « GO ».)
- **Zone attaquée sélectionnée** → **DÉFENDRE** : course mission défense + route recommandée.
- **Zone neutre / rivale sélectionnée** → **CONQUÉRIR** : course de conquête.
- **Boucle presque fermée** → **TERMINER** : course pour fermer la boucle.
- **Mission crew ouverte** → **REJOINDRE** : rejoint la mission du crew.
Le libellé est un VERBE (icône + texte, action sensible §A.10). Un seul gros bouton chartreuse par écran (§A.4) : sur la Carte, ce bouton flottant EST le CTA de mission → l'Info panel garde situation + « Voir les options » mais **ne duplique PAS un 2ᵉ [Défendre]** (anti double-CTA).

## 3. Où le bouton APPARAÎT (gating strict, §A.5)
Visible sur : **Carte · Missions · War Room · détail de zone · détail de route · boucle à terminer** (+ le flux Live est son propre écran). 
JAMAIS visible sur : **Profil · Saison · Crew · Paramètres · Confidentialité · Historique · Partage · Arsenal/Boutique · FAQ · pages calcul**. (Sur ces écrans, l'action utile est un CTA inline dans le contenu : Profil→Partager, Saison→Trouver une route, Crew→Voir War Room.)

## 4. Discipline
- Contextuel = dérivé de l'état (mission/zone/boucle/crew sélectionnés) via un store/contexte léger ; défaut RUN. Le bouton porte l'intention CLIENT (conquest/defense/complete) vers /course-live — le tracé décide, le serveur tranche (jamais d'attribution client).
- Charte (chartreuse, jamais sur clair), reduce motion, haptics, texte non tronqué (verbe court). Ne casse pas la sheet Carte / Info (AMENDEMENT-25), le quitter-live, la boucle crew.
- Le bouton ne doit pas masquer d'info utile ni créer un 2ᵉ CTA principal sur un écran (§A.4).

## 5. Build
Workflow : (a) nav-fab — `app/(tabs)/_layout.tsx` (relabel Missions/Saison + bouton flottant contextuel gaté par route + contexte), composant `ContextualRunButton`/`RunButton` (libellé+intention+target), store/contexte de l'action contextuelle, metrics nav, réconciliation Carte (BattleMapOverlays : le flottant est le CTA, pas de doublon) ∥ (b) relabel — `warroom.tsx` (recadrage « Missions ») + `classement.tsx` (recadrage « Saison »). Puis vérif (bouton contextuel correct par écran, gating strict, zéro « GO », zéro double-CTA, non-régression) + build + fix. Charte, §A.
