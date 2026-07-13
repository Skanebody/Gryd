# AMENDEMENT-38 — Bouton central = « GO » (override fondateur)

**Statut : ACTIF.** Décision FONDATEUR directe (2026-07-13) : le bouton d'action central
de la barre de navigation (le gros bouton chartreuse d'AMENDEMENT-29) devient un **unique
bouton « GO »**, au lieu des verbes contextuels `RUN / DÉFENDRE / CONQUÉRIR / TERMINER /
REJOINDRE`.

## Ce que ça révise

- **`GRYD_REGLES_NON_NEGOCIABLES.md` §4** (« CTA contextuel … Jamais « GO » partout »)
  et **AMENDEMENT-29** (« toujours un VERBE qui dit POURQUOI tu cours ; GO retiré
  définitivement ») sont **révisés** pour ce bouton précis. Un amendement prime sur la
  charte (ordre d'autorité : docs/product > AMENDEMENT-* > charte), le plus récent gagne —
  cet override est donc la règle en vigueur pour le bouton central.
- Le reste de §4 tient : **un seul gros CTA chartreuse plein par écran**, jamais deux qui
  disent la même chose (le bouton passe en CONTOUR quand une autre scène porte déjà un CTA
  plein — /warroom, sheet de zone ouverte ; cf. AMENDEMENT-37 §8 / mapUiStore).

## Portée exacte (ne pas sur-interpréter)

- **Libellé** : le bouton affiche **« GO »** partout (icône course unifiée).
- **Routing conservé** : « GO » LANCE toujours l'action contextuelle de l'écran
  (`deriveContextualAction` reste la source de la CIBLE + de l'intention client + du label
  lecteur d'écran). Sur la Carte, GO lance donc la course de défense/conquête du plan auto ;
  ailleurs, la course libre. On ne perd AUCUN comportement d'AMENDEMENT-29 — seul le mot
  affiché change.
- **Accessibilité** : le nom accessible commence par « GO » puis décrit l'action
  (« GO — lancer la course de défense … ») → le libellé visible est bien contenu dans le
  nom accessible (WCAG 2.5.3), et le lecteur d'écran dit ce que fait le bouton.
- **Épuration** : le lien secondaire « Course libre » sous le bouton est **retiré** —
  « uniquement un bouton GO ». La course libre reste atteignable par le contexte (GO sur les
  écrans sans jeu = course libre) ; les actions défense/conquête restent aussi dans la sheet
  de mission / la sheet de zone (AMENDEMENT-37).

## Note d'implémentation

- `apps/mobile/src/features/nav/GrydNavBar.tsx` : le bouton affiche `GO` + icône course,
  garde `deriveContextualAction(...).targetHref` au tap, retire le lien « Course libre ».
- `apps/mobile/src/features/nav/contextualAction.ts` : le module reste la source du ROUTING
  et de l'a11y (les verbes vivent encore dans le a11yLabel et l'intention client) — il n'est
  pas supprimé. Les commentaires « jamais GO » y sont désormais historiques (voir cet
  amendement).
