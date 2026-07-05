# AMENDEMENT-22 — Règle de profondeur : UI en scènes, pas en boîtes (05/07/2026)

**Décision fondateur (05/07/2026).** GRYD empile *cards dans cards dans containers* → interface lourde, enfermée, « assemblage de composants ». Passer d'une **UI en boîtes** à une **UI en scènes** : le fond sombre est de l'**espace**, pas un remplissage de rectangles. Règle unique, codifiée en tokens, appliquée PARTOUT. *« Moins de containers. Plus d'espace. Un seul CTA. Des chiffres forts. Des icônes propriétaires. Des détails au tap. »*

## 1. Règle de profondeur GRYD (max 3 niveaux visibles)
- **Niveau 0 — Fond** : noir carbone (`colors.noir`, base ~#050706). Sert d'ESPACE.
- **Niveau 1 — Surface** : UNE seule surface par section importante (card principale · bottom sheet · preview story · mission card). Jamais deux surfaces imbriquées.
- **Niveau 2 — Interaction** : bouton · pill · item sélectionné.
- **Niveau 3 — État rare** : glow · contour chartreuse · alerte · bonus · rareté.
- **Interdit** : dépasser 3 niveaux visibles ; card dans card (sauf une VRAIE preview de contenu, ex. la preview story = elle-même le container).

## 2. Contours (bordures)
- **80 % des surfaces SANS contour** ; **20 % avec contour** réservé à : interaction active · statut · alerte · rareté · sélection. Si tout a un contour, plus rien n'a d'importance. Les sections se séparent par **l'espace**, pas par des boîtes.

## 3. CTA
- **UN SEUL gros bouton chartreuse par écran.** Les actions secondaires sont **légères** : icône + label sans gros rectangle (façon Strava : `○ Sauver  ○ Copier  ○ Plus`), pas trois grosses cards.

## 4. Groupes de choix → segmented control
- Un groupe de pills = **UN seul segmented control** (un container pour le groupe), pas N rectangles séparés. Ex. `FORMAT [ Story 9:16 | Carré 1:1 ]` · `Style [ Carte | Conquête | Défense ]`.

## 5. Copy
- `TEMPLATE` (jargon logiciel, froid) → **`Style`**. Éviter les labels techniques espacés en capitales quand un mot humain suffit.
- **Features « bientôt » : ne pas les montrer en grosse card.** Un petit lien (`Replay vidéo bientôt`) ou rien. Trop de « bientôt » = produit non fini.

## 6. Détails au tap
- Les détails s'**ouvrent au tap** (bottom sheet / expand), jamais enfermés dans des sous-cards permanentes.

## 7. Écran PARTAGE — refonte de référence (implémentation témoin)
Avant : page → grande card preview → story card → mini-card zone → badge → pills → gros CTA → 3 grosses cards actions → replay card. Après :
```
← Résultat
Partager ta conquête

   [ Preview story posée directement, ombre/contour très discret ]

Format   [ Story 9:16 | Carré 1:1 ]     ← segmented
Style    [ Carte | Conquête | Défense ] ← segmented

[ Story Instagram ]                     ← seul gros CTA

  ○ Sauver      ○ Copier      ○ Plus    ← actions légères, sans card
```
La preview **flotte** (plus de grosse card noire autour) ; plus de mini-carré autour de la zone dessinée ; « TEMPLATE »→« Style » ; replay card supprimée (ou micro-lien). Ce qui ressort = `+47` · `Zones · République` · `Story Instagram`.

## 8. Application à toute l'app (sweep)
- **Carte** : header texte simple · 1 alerte compacte · 1 bottom sheet · 1 CTA (déjà visé par AMENDEMENT-21 — réconcilier la profondeur si résidus).
- **War Room** : liste de missions compactes, pas de card-à-sous-cards. Ex. `Urgent · Canal · 34 zones · 48 h · [DÉFENDRE]`.
- **Profil** : la Player Card peut être une card, mais **pas** de mini-card autour de chaque élément interne.
- **League** : podium visuel, sans gros container autour de chaque joueur.
- **Crew** : sections posées sur le fond, pas empilement de cards.
- **Arsenal** : cards produit OK (ce sont des produits), mais pas de card produit dans une card section lourde.

## 9. À imposer dans le design system
Codifier dans `packages/shared/src/design-tokens.ts` une **échelle de surfaces** (niveau 0/1/2) + une **règle de bordure** (token de contour réservé aux états), documentée, pour que les écrans consomment la profondeur au lieu de la réinventer. Aucun nombre magique : les niveaux sont des tokens nommés.
> GRYD doit éviter l'empilement de rectangles. Une page ne doit jamais afficher plusieurs niveaux de cards imbriquées. Contours = états actifs/alertes/raretés uniquement. Un seul gros CTA chartreuse par écran. Actions secondaires légères (icône + label). Sections séparées par l'espace. Détails au tap.

## 10. Build
Workflow APRÈS AMENDEMENT-21 : (a) Fondations — tokens de profondeur dans design-tokens.ts + refonte Partage de référence ∥ (b) Sweep — un agent par écran (War Room, Crew, Profil, League, Arsenal) applique la règle ∥ (c) vérif adversariale (règle de profondeur + build) + fix. Charte, anti pay-to-win, reduce motion, typecheck/tests/preview verts.
