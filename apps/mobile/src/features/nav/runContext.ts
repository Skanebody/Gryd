/**
 * GRYD — la règle du jeu en une phrase + la construction des liens de départ.
 *
 * ─── CE QUI A DISPARU LE 21/07/2026 (fin du mode vitrine) ───────────────────
 * Ce module portait le « PLAN AUTO » du départ de course (AMENDEMENT-14 §1-3) :
 * `battleContext()`, `mapDirective()`, `deriveAutoPlan()`, `deriveRunButtonMode()`
 * et `goHref()`. Tous dérivaient d'une bataille FABRIQUÉE — `fakeHexes.battleMapData()`
 * pour les compteurs de zones, `warroom/demo.DEFENSE_MISSION` / `OFFENSIVE` pour
 * les noms de zone, `route/demo.ROUTES_DEMO` pour l'itinéraire. Ils produisaient
 * des phrases affirmatives sur le joueur : « République est à prendre. Cours
 * 4,4 km pour capturer 94 zones. », et un départ pré-chargé sur une boucle
 * République — pour n'importe quel joueur, où qu'il soit. C'était exactement le
 * retour terrain du fondateur (« je suis à Ouville-la-Rivière, l'app me met à
 * République »), et le mode vitrine étant abandonné, la branche est SUPPRIMÉE
 * plutôt que re-gardée : il n'existe aucune source réelle de « plan auto »
 * aujourd'hui, donc l'app n'en propose pas. Le bouton central dit RUN
 * (cf. contextualAction) ; le classement conquis/défendu se fait APRÈS la
 * course, serveur-side, à partir du tracé réel.
 *
 * Ce qui reste ici ne dépend d'aucune donnée : une phrase de règle, et un
 * constructeur d'URL.
 */

/** La règle du jeu en UNE phrase (AMENDEMENT-14 §1) — répétée partout. */
export const RULE_PHRASE =
  "Cours. Tu conquiers ce que tu traverses, tu défends ce que tu possèdes, tu prends l'intérieur de tes boucles. GRYD s'occupe du reste.";

/**
 * Départ avec INTENTION (AMENDEMENT-16 §1) : le param `intention` teinte le live
 * (bandeaux Conquérir/Défendre) mais reste 100 % CLIENT — il ne part JAMAIS au
 * serveur pour l'attribution (le tracé réel seul décide). Le runMode reste
 * `conquete` : capturer/défendre = le moteur de zones, l'intention n'est qu'un
 * guide d'expérience. `route` optionnel (Défendre pointe une zone précise) —
 * il n'est renseigné que par une VRAIE sélection, jamais par un plan fabriqué.
 */
export function intentionHref(intention: 'conquest' | 'defense', routeId?: string): string {
  const base = `/course-live?mode=conquete&intention=${intention}`;
  return routeId ? `${base}&route=${routeId}` : base;
}
