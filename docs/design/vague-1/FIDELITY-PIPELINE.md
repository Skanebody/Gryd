# Fidelity Pipeline — refaire les écrans FIDÈLES aux planches, sans intervention

**But.** Une planche PNG entre → l'écran est refait fidèle → une preuve côte-à-côte
(planche vs écran) sort, plus la liste de **ce qui a été retiré d'utile**. En lot,
gate vert à chaque écran, **sans que le fondateur intervienne** (à une exception
nommée : voir « Le seul point humain »).

Ce document EST le système. Il est rejouable : les deux workflows ci-dessous se
relancent tels quels quand de nouvelles planches arrivent.

## Pourquoi ça tournait en rond avant (les 3 causes, corrigées)

1. **« Conforme » sans preuve.** Je déclarais un écran bon sans le comparer au pixel.
   → Correctif dur : **aucun écran n'est marqué fait sans une preuve dans le tableau
   de bord** (capture pour les écrans atteignables, diff planche↔code lu pour les autres).
2. **Vérité-terrain sous-exploitée.** Je croyais n'avoir E01-E09 qu'en PNG et le reste
   « en texte ». FAUX : **14 planches PNG pixel** sont sur disque (`planches-png/`).
   → La passe de diagnostic les EXPLOITE toutes.
3. **Mur d'auth.** Le preview a un backend sans session → les écrans connectés
   redirigent vers `/sign-in`, impossibles à capturer. Je « recalais » donc à l'aveugle.
   → Voir « Le seul point humain ».

## Les tiers de vérification (l'honnêteté du système)

| Type d'écran | Exemples | Vérif | Preuve au tableau de bord |
|---|---|---|---|
| **Non connecté** | onboarding, connexion, légal, waitlist | **capture live** (preview) | screenshot vs planche |
| **Carte (WebGL)** | Carte E02/E03/E04, Live E07 | capture partielle (MapLibre rend noir en headless) + diff code | screenshot UI + diff |
| **Connecté** | Crew, Saison, Profil, Résultat, Boutique, Stats… | **diff planche↔code** (agent qui VOIT la planche + LIT le code) | diff + statut « capture en attente login » |

Un écran connecté passe en **preuve pixel** dès qu'une session existe (voir plus bas).

## Le seul point humain (une fois, pas par écran)

Le garde-fou de sécurité **bloque toute forge de session** (à raison : « fausse session
pour voir un écran protégé » est exactement ce qu'il doit stopper — il ne peut pas
distinguer un harnais QA d'un vrai contournement). Donc, pour la **preuve pixel** des
écrans connectés, il faut **une seule vraie connexion** dans le preview (OTP e-mail),
qui débloque TOUS les écrans connectés pour toute la session de travail. Sans elle, le
système tourne quand même et vérifie ces écrans **planche↔code** (solide, mais pas pixel).
Le tableau de bord dit toujours lequel des deux a servi — jamais de « conforme » gratuit.

## Le pipeline (deux workflows rejouables)

### Workflow 1 — `fidelity-diagnose` (lecture seule, aucun risque)
Un agent par planche : (1) LIT le PNG (le voit), (2) identifie l'écran par l'image +
`PLANCHES.md`/`ANNOTATIONS-E10-E26.md`, (3) LIT le code de l'écran, (4) rend le **diff
de fidélité** (chaque écart classé `blocker/major/minor` × `must_fix`/`constraint_deviation`),
(5) compare les **textes clés mot pour mot** (le piège « COURS » vs « CONQUIERS »),
(6) liste **removed_but_useful**. Sortie = le plan de recalage, planche par planche.

> `constraint_deviation` = écart VOULU imposé par une contrainte (placeholder non
> reproduit = honnêteté, couleur = token, bouton absent = anti-bouton-mort). **À garder**,
> ce n'est pas un défaut. Seuls les `must_fix` sont du travail.

### Workflow 2 — `fidelity-implement` (par écran, gate + commit)
Pour chaque écran à `must_fix` : un agent applique les correctifs FIDÈLEMENT sous
contraintes (tokens, honnêteté, anti-bouton-mort, game-rules), fichiers disjoints pour
éviter les conflits. Puis, depuis la boucle principale : capture (si atteignable) →
gate (`typecheck` + `deno test` + sync sans drift) → **commit sélectif** → ligne au
tableau de bord. Un écran = un commit ; jamais l'arbre à moitié.

## Le tableau de bord (revue asynchrone du fondateur)

Un artefact HTML unique : par écran, **planche | rendu actuel | écarts restants |
retirés-utiles | statut de vérif**. Le fondateur le parcourt d'un coup d'œil quand il
veut, et ne tranche que sur les `demander au fondateur` (rares). Republié à chaque lot.

## Vérification machine : utile ? branché ?

En plus du diagnostic agent / captures, un **inventaire exécutable** répond aux
deux questions pour chaque élément de planche :

```bash
npm run verify:planches
# ou : node scripts/verify-planche-elements.mjs --screen E02
```

- Registre : `scripts/lib/planche-element-registry.mjs` (usefulness + preuves code).
- Rapport : `docs/design/vague-1/VERIFY_ELEMENTS_REPORT.md` (régénéré à chaque run).
- Exit 1 si un élément **requis/utile** n’est pas branché, ou si un placeholder
  maquette / démo retirée est encore présent.

Complète `npm run audit:routes` (portes d’écran) : ici on vérifie les **pièces
d’UI** et leur source (`game-rules`, i18n, hooks), pas seulement la navigation.

## Contraintes qui PRIMENT sur le pixel (rappel)

Autorité : `SOURCE_OF_TRUTH_REGISTER.md` → Spéc Unifiée → `GRYD_REGLES_NON_NEGOCIABLES.md`
§A → planches. **La forme de la planche au pixel, MAIS jamais une case remplie d'une
donnée que le produit ne calcule pas.** La constitution (« l'app ne ment jamais »,
anti-p2w, couleurs par rôle, zéro donnée EU factice) est au-dessus de toute planche.
