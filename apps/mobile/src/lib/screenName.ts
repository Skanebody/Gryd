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
  // E16 — le segment est un digest de mission (`missionKey`). Il ne porte AUCUNE
  // coordonnée par construction (§12), mais il reste un identifiant STABLE lié à
  // une zone précise : laissé en clair dans `$screen`, il permettrait de suivre
  // un même joueur d'une session à l'autre par sa mission. On le rédige.
  { prefix: '/map/missions/', pattern: '/map/missions/[missionId]' },
  // ─── LES DEUX ROUTES « RIVAL » (ajoutées le 27/07/2026) ────────────────────
  // Elles portent le HANDLE PUBLIC D'UN TIERS. C'est le pire segment possible
  // dans `$screen` : attaché au `distinct_id` de l'OBSERVATEUR, il dit « qui
  // regarde qui » — une donnée relationnelle que GRYD ne mesure nulle part
  // ailleurs et qui n'a aucun usage produit. La règle avait été ÉNONCÉE pour
  // E16 (commentaire ci-dessus) et pas appliquée à E15 / au profil rival : le
  // trou était de patron, pas d'accident, donc les deux entrent ensemble.
  { prefix: '/zones-rival/', pattern: '/zones-rival/[handle]' }, // E15
  { prefix: '/profil-rival/', pattern: '/profil-rival/[handle]' },
  // E70 — le segment est l'identifiant d'une CONTESTATION
  // (`territory_contests.id`). Il ne porte aucune coordonnée, mais il désigne
  // sans ambiguïté UNE zone du joueur : laissé en clair dans `$screen`, il
  // permettrait de recouper « ce joueur défend toujours la même zone » et donc
  // de le situer (§18.2 interdit les coordonnées précises ; un identifiant
  // stable de territoire en est l'équivalent par recoupement). On le rédige.
  { prefix: '/zone-attaquee/', pattern: '/zone-attaquee/[contestId]' },
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
