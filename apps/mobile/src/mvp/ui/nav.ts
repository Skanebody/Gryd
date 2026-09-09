/**
 * GRYD — LE RETOUR À LA CARTE, UN SEUL POINT DE VÉRITÉ (lot NAV).
 *
 * ─── LE DÉFAUT QUE CE MODULE CORRIGE ─────────────────────────────────────────
 * `/carte` est la RACINE de toute la pile MVP : `carte → push('/prete') →
 * replace('/course') → replace('/resultat')`, `carte → push('/profil-mvp')`,
 * `carte → push('/connexion')`. Cinq écrans y REVENAIENT par
 * `router.replace('/carte')` — un `replace` qui, depuis une pile où la carte
 * est DÉJÀ en dessous, EMPILE une seconde carte au lieu d'y remonter :
 * `[carte, carte]`. Deux instances de MapLibre en mémoire, et l'ancienne
 * atteignable au geste retour, avec un état périmé.
 *
 * ─── LA DÉCISION, ET POURQUOI ELLE N'EST PAS TOUJOURS LA MÊME ───────────────
 * Remonter suppose qu'il y ait une pile EN DESSOUS. Ce n'est pas toujours vrai :
 * un lien profond, ou l'arrivée depuis l'onboarding par un `replace`, peut
 * laisser la pile réduite à UN SEUL écran (`connexion` seule, par exemple).
 * Il n'y a alors rien à « remonter » : la seule sortie honnête est de
 * REMPLACER cet écran par la carte — exactement ce que chaque appel faisait
 * déjà avant ce module, et le seul cas où `replace` reste correct.
 *
 * La décision elle-même (`decisionRetourCarte`) est PURE et vit dans
 * `navDecision.ts` — voir son en-tête pour la raison (Deno + `expo-router` ne
 * font pas bon ménage). Ce fichier-ci est la partie qui AGIT.
 *
 * `router.canGoBack()` (`expo-router` 4.0.22, `imperative-api.d.ts`) est la
 * capacité RÉELLE de la pile à cet instant précis — pas une supposition sur la
 * route d'où l'on vient.
 *
 * ─── `dismissTo`, TEL QUE LE `.d.ts` LE DÉCRIT ───────────────────────────────
 * « Dismisses screens until the provided href is reached. If the href is not
 * found, it will instead replace the current screen with the provided href. »
 * `dismissTo` porte donc déjà un repli — mais un repli qui suppose une pile
 * EXISTANTE à fouiller. La garde explicite sur `canGoBack()` reste nécessaire :
 * sans elle, appeler `dismissTo` sur une pile à un seul écran irait chercher
 * une carte à démonter alors qu'il n'y a personne en dessous à révéler.
 *
 * ─── VÉRIFIÉ SOURCE EN MAIN, PAS SUPPOSÉ ─────────────────────────────────────
 * `node_modules/expo-router/build/global-state/routing.js` : `dismissTo` et
 * `canGoBack` n'ont AUCUNE branche `Platform.OS` — la seule bifurcation de tout
 * le fichier concerne un lien EXTERNE (`Linking.openURL`, http(s) ou schéma
 * personnalisé). `dismissTo` délègue à la même fonction interne `linkTo` que
 * `push`/`replace`/`navigate`, avec l'événement `'POP_TO'` ; `canGoBack` lit
 * `navigationRef.current.canGoBack()`, la même réf pour toutes les plateformes.
 * L'implémentation web (react-native-web) et native partagent donc EXACTEMENT
 * le même chemin de code ; `canGoBack` distingue seulement un mode « composant
 * DOM » (`IS_DOM`, les composants DOM d'Expo Router — sans rapport avec le web
 * d'Expo Router lui-même) qu'aucun écran MVP n'utilise.
 */
import { router, type Href } from 'expo-router';
import { decisionRetourCarte } from './navDecision';

/**
 * LE SEUL APPEL QUE LES ÉCRANS DOIVENT FAIRE POUR « REVENIR À LA CARTE ».
 *
 * Remplace les cinq `router.replace('/carte')` de `resultat.tsx`, `profil.tsx`
 * (après `signOut`, et au retour) et `connexion.tsx` (les deux sorties) :
 * aucun d'eux ne doit plus décider seul s'il y a une pile en dessous.
 *
 * ⚠️ `cible` EST UN PARAMÈTRE, ET NON `/carte` EN DUR ICI — pas pour la
 * flexibilité, mais pour rester VISIBLE à `scripts/audit-routes.mjs`. Cet
 * audit lit le texte de CHAQUE écran, fichier par fichier (`LINK_RE`, une
 * regex sur les littéraux `'/…'` du CODE, commentaires retirés) : il ne suit
 * AUCUN import. Un `retourCarte()` sans argument aurait caché `/carte` dans
 * CE fichier-ci, et chaque écran appelant serait redevenu, à ses yeux, un
 * cul-de-sac SANS AUCUN chemin écrit vers la carte — `node
 * scripts/audit-routes.mjs` l'a effectivement détecté sur `resultat.tsx` à
 * l'écriture de ce module (son unique lien sortant disparaissait derrière cet
 * import). Le paramètre garde donc `'/carte'` LISIBLE dans le texte de
 * CHAQUE appelant, tout en laissant la DÉCISION (`dismissTo` vs `replace`) au
 * seul endroit qui compte : ici.
 */
export function retourCarte(cible: Href): void {
  if (decisionRetourCarte(router.canGoBack()) === 'dismissTo') {
    router.dismissTo(cible);
    return;
  }
  router.replace(cible);
}
