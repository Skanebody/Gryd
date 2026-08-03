# SPEC-UX — Les 20 lois (extraites du MASTER §3, verbatim ; CONTRÔLE BLOQUANT)

Chaque écran, avant merge, passe au gate de l'agent `ux-gate`. **Une loi violée = NON CONFORME = pas de merge.**

**L1 — Les 3 questions.** À l'ouverture, la carte répond en < 1 s à : *Où suis-je ? Qu'est-ce qui est à moi ? Que dois-je faire maintenant ?*
**L2 — Un écran = une action primaire.** Jamais deux CTA de même poids visuel.
**L3 — Deux taps max** entre l'ouverture de l'app et le départ d'une course (ouvrir → GO → décompte).
**L4 — Zone du pouce.** Tout CTA primaire dans les 40 % inférieurs de l'écran ; cibles tactiles ≥ 44 pt.
**L5 — Live Run minimal.** ≤ 5 informations à l'écran, messages ≤ 8 mots (idéal ≤ 4), chiffres géants lisibles en courant.
**L6 — Feedback < 100 ms.** Retour visuel immédiat sur tout tap ; haptique sur chaque événement de jeu : départ, quasi-fermeture, fermeture, capture, zone perdue.
**L7 — Célébration = récompense.** Capture : animation 2–3 s (contour se stabilise → remplissage → gain), skippable, haptique + son. Le pic émotionnel est là (peak-end rule).
**L8 — Aucun écran vide.** Tout empty state contient l'action exacte qui le remplit.
**L9 — Onboarding ≤ 3 écrans avant la carte.** La valeur est montrée AVANT toute permission (priming), jamais de popup système à froid.
**L10 — Progressive disclosure.** Aucune mécanique expliquée avant le moment où elle sert.
**L11 — Une seule cible à la fois.** 1 « Objectif du jour », 1 rival prioritaire max.
**L12 — Un chiffre héros par écran.** Les m² dominent.
**L13 — Partage en 1 tap.** Carte pré-générée pendant l'écran de résultat.
**L14 — Performance perçue.** Carte 60 fps ; skeletons ; jamais de spinner bloquant > 1 s ; carte interactive < 2 s.
**L15 — Accessibilité.** Jamais la couleur seule (motifs) ; AA ; VoiceOver/TalkBack ; Dynamic Type ; Reduce Motion.
**L16 — Notifications événementielles uniquement.** Actionnables, factuelles ; quiet hours 21h30–8h ; max 5/semaine hors défense ; chaque catégorie désactivable.
**L17 — Zéro dark pattern.** Pas de faux compte à rebours ni badge rouge artificiel ; suppression/désinscription en 1 écran.
**L18 — i18n dès le premier commit.** Aucun texte en dur ; FR d'abord, EN ensuite ; pluriels gérés.
**L19 — L'app n'accuse jamais.** Rejet = « Une partie du parcours n'a pas été utilisée pour le territoire. Tes stats restent disponibles. » Stats TOUJOURS préservées.
**L20 — Gate obligatoire.** Chaque écran screenshoté → `ux-gate` → verdict L1–L19 écrit dans la PR.

## Palette — la source est `packages/shared/src/design-tokens.ts`, PAS ce document

⚠️ Ce paragraphe citait la palette du MASTER (`#0B0E11`, `#D8FF3E`) : c'était une
recopie non vérifiée. **ADR-008 tranche : les tokens du dépôt font foi.**

L'univers de GRYD n'est pas son accent, c'est son ÉCHELLE NEUTRE. `noir #060907`,
`carbone #151C17`, `carbone2 #1D251F`, `grisLigne #2A342D`, `gris #9CA59E`,
`blanc #F5F7F5` sont tous à **dominante verte** (G > B > R) : la chartreuse
`#C2FF23` y est native, alors qu'un near-black bleuté la ferait paraître
rapportée. C'est ça, la signature — pas le vert seul.

Rôles (§C, jamais une couleur par crew) : chartreuse = MOI · orange = rival ·
violet = contesté · bleu = protégé · gris = neutre. Motifs + libellés EN PLUS de
la couleur (L15). Chartreuse en quota 8-10 % de l'écran, JAMAIS sur fond clair
(1,19:1). `grisFaible` est `#707B72` et non `#667068` : la spec produit se
contredit sur l'AA, l'accessibilité tranche (4,54:1 contre 3,89:1).

**En pratique : `colors.*` uniquement, jamais un hex en dur dans un écran.**
