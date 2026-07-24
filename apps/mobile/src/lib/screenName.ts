/**
 * GRYD — nom d'écran ANALYTIQUE : un nom de ROUTE, jamais un pathname concret.
 *
 * §26 veut `screen` / `previous_screen` en super-propriétés. Un pathname brut
 * ferait FUIR des données : `/c/AB12CD` porte un code d'invitation, `/course/<id>`
 * un identifiant. On normalise donc chaque famille de route dynamique vers son
 * PATRON (`/c/[code]`, `/course/[id]`…). Déterministe (liste explicite, aucun
 * heuristique qui sur-rédige), pur, testable — c'est le seul endroit qui sait
 * quelles routes portent un segment dynamique.
 */

/** Familles de routes dynamiques : préfixe (slash final) → patron rédigé. */
const DYNAMIC_ROUTES: ReadonlyArray<{ readonly prefix: string; readonly pattern: string }> = [
  { prefix: '/c/', pattern: '/c/[code]' }, // invitation crew (code)
  { prefix: '/parametres/', pattern: '/parametres/[section]' },
  { prefix: '/course/', pattern: '/course/[id]' }, // détail d'une course (id)
  { prefix: '/challenges/', pattern: '/challenges/[id]' }, // détail défi (l'index reste /challenges)
];

/**
 * Rend le nom de route normalisé d'un pathname. Les routes statiques passent
 * telles quelles (`/`, `/arsenal`, `/(tabs)`…) ; les dynamiques sont rédigées.
 */
export function normalizeScreenPath(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  // défensif : jamais de query/fragment (split[0] toujours défini, ?? pour le typage strict)
  const path = (pathname.split('?')[0] ?? '').split('#')[0] ?? '';
  for (const { prefix, pattern } of DYNAMIC_ROUTES) {
    // Un segment dynamique existe seulement s'il y a QUELQUE CHOSE après le préfixe
    // (`/challenges/x` → patron ; `/challenges` seul = index statique, inchangé).
    if (path.startsWith(prefix) && path.length > prefix.length) return pattern;
  }
  return path || '/';
}
