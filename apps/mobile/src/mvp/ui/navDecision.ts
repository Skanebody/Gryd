/**
 * GRYD — LA DÉCISION DE RETOUR À LA CARTE, SEULE ET PURE.
 *
 * Isolée dans SON PROPRE fichier — et non dans `nav.ts`, qui l'exécute — pour
 * une raison d'infrastructure, pas de goût. `nav.ts` importe `expo-router`
 * pour agir (`router.dismissTo` / `router.replace`), et charger ce paquet
 * sous Deno (`deno test`, sans Metro/webpack pour le transformer) fait
 * échouer le chargement sur du JSX non transpilé plus bas dans son arbre de
 * dépendances (`expo-router/build/layouts/StackClient.js` : « Unexpected
 * token '<' »). Vérifié en écrivant `nav.test.ts` directement contre `nav.ts`
 * d'abord : le test entier plantait avant même sa première assertion — pas un
 * échec de logique, un échec de CHARGEMENT.
 *
 * La décision elle-même n'a besoin de rien de tout ça : un booléen entre, un
 * mot ressort. Elle vit donc ici, seule, pour rester TESTABLE sous Deno sans
 * jamais faire charger `expo-router` — le même principe que `homeState.ts`
 * (pur, zéro import React ni Supabase) séparé de `carte.tsx` (la colle).
 */

/**
 * `true` (une pile existe en dessous) → remonter à la carte EXISTANTE
 * (`dismissTo`). `false` (lien profond, arrivée par un `replace` depuis
 * l'onboarding) → aucune pile à fouiller, la carte est la seule sortie
 * possible : on REMPLACE l'écran courant par elle (`replace`).
 */
export function decisionRetourCarte(canGoBack: boolean): 'dismissTo' | 'replace' {
  return canGoBack ? 'dismissTo' : 'replace';
}
