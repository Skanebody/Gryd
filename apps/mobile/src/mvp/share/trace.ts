/**
 * GRYD — LE TRACÉ DE LA CARD DE PARTAGE : des points GPS → un chemin SVG. PUR.
 *
 * ─── CE QUE CE MODULE DESSINE, ET CE QU'IL NE DESSINE PAS ───────────────────
 * Il dessine la FORME d'une course, dans un `viewBox` en unités abstraites.
 * Il ne dessine ni fond de carte, ni coordonnée, ni nom de lieu : ce qui sort
 * d'ici est une silhouette sur du noir. C'est la condition pour que la card
 * puisse partir dans un feed sans emporter le domicile de qui l'a courue —
 * et c'est ce que dit le commentaire de `notifTaken` dans le catalogue : « le
 * territoire se partage, le domicile jamais ».
 *
 * ⚠️ CE N'EST PAS `TerritoryMark`. Celui-là est un DESSIN DE MARQUE, un contour
 * inventé qui ne se convertit en rien. Ici, chaque sommet est une position
 * réellement mesurée — c'est justement pour ça que le masquage
 * (`privacy.ts::maskForShare`) est appliqué AVANT, sans condition ni réglage.
 *
 * ─── LES DEUX FAUTES QUE CE MODULE ÉVITE ────────────────────────────────────
 * 1. DÉFORMER LA FORME. Un `viewBox` rempli par étirement indépendant en x et y
 *    ferait d'un aller-retour long un carré, et d'une boucle carrée un
 *    rectangle : la card raconterait une course qui n'a pas eu lieu. On
 *    conserve donc le RAPPORT (une seule échelle pour les deux axes), et on
 *    centre le reste.
 * 2. AFFICHER UN TRAIT POUR UNE COURSE. Sous 3 points survivants — ou quand
 *    tous les points sont confondus — il n'y a pas de forme : on rend `null`,
 *    l'appelant n'a pas de card, et donc pas de bouton « Partager ». C'est la
 *    même doctrine que `heroArea` : « je ne sais pas » ne se peint pas.
 *
 * ─── POURQUOI LA BOUCLE EST REFERMÉE VISUELLEMENT (`Z`) ─────────────────────
 * Le masquage laisse un TROU aux deux bouts, et le moteur ne le referme jamais
 * dans la DONNÉE (`polyline_masked` reste ouverte : le trou EST la protection).
 * Le rendu, lui, referme — et ce n'est pas la même question, pour deux raisons
 * qui doivent rester vraies toutes les deux :
 *   · La corde tracée n'ajoute AUCUNE information localisante : ce chemin n'a
 *     ni coordonnée, ni échelle, ni fond de carte. On ne peut pas la
 *     géoréférencer, donc on ne peut pas en déduire un point de départ.
 *   · Elle ne ment pas non plus sur la course : cette card n'existe QUE sur une
 *     capture, c'est-à-dire sur une boucle que le SERVEUR a jugée fermée. Le
 *     segment manquant a bien été couru ; il est simplement redessiné droit.
 * Laisser le trou visible, à l'inverse, dessinerait une flèche vers l'endroit
 * précis qu'on protège.
 */
import { maskForShare, projectionFor, toXY, type SharePoint } from './privacy';

export type { SharePoint };

/**
 * Côté du `viewBox` carré, en unités abstraites. Aucun rapport avec des pixels :
 * le composant met le SVG à l'échelle qu'il veut. 100 rend les chemins lisibles
 * dans un test (« 12.34 » se lit comme un pourcentage du cadre).
 */
export const TRACE_VIEWBOX = 100;

/**
 * Marge intérieure, en unités du `viewBox`.
 *
 * Elle n'est pas décorative : le trait a une ÉPAISSEUR, et un tracé posé au
 * ras du cadre se ferait raboter d'une demi-épaisseur sur les quatre bords —
 * une boucle amputée, sur le seul objet que le joueur va publier.
 */
export const TRACE_PADDING = 7;

/**
 * Décimales conservées dans le chemin. Deux suffisent : à 100 unités de côté,
 * 0,01 unité est le 1/10 000ᵉ du cadre, très en dessous du pixel d'une card.
 * Borner la précision garde aussi le chemin COMPARABLE d'un test à l'autre.
 */
const DECIMALES = 2;

function arrondi(v: number): string {
  return String(Math.round(v * 10 ** DECIMALES) / 10 ** DECIMALES);
}

/**
 * La trace d'une course → le chemin SVG de la card, ou `null` s'il n'y a rien
 * d'honnête à dessiner.
 *
 * `null` a trois causes, et aucune n'est une erreur :
 *   · moins de 3 points reçus ;
 *   · le masquage n'a rien laissé de publiable (une trace trop courte pour
 *     qu'on puisse en couper 250 m à chaque bout — voir `maskForShare`) ;
 *   · tous les points survivants sont confondus (GPS bloqué sur place).
 *
 * L'appelant ne remplace JAMAIS ce `null` par une forme de repli : sans tracé,
 * il n'y a pas de card, donc pas de bouton de partage.
 */
export function shareTracePath(points: readonly SharePoint[]): string | null {
  const masked = maskForShare(points);
  if (masked.length < 3) return null;

  const proj = projectionFor(masked);
  const xy = masked.map((p) => toXY(p, proj));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const q of xy) {
    if (q.x < minX) minX = q.x;
    if (q.x > maxX) maxX = q.x;
    if (q.y < minY) minY = q.y;
    if (q.y > maxY) maxY = q.y;
  }

  const largeur = maxX - minX;
  const hauteur = maxY - minY;
  const etendue = Math.max(largeur, hauteur);
  // Aucune étendue : la « course » tient dans un point. Rien à dessiner.
  if (!(etendue > 0)) return null;

  const interieur = TRACE_VIEWBOX - 2 * TRACE_PADDING;
  // UNE SEULE échelle pour les deux axes : c'est elle qui garde la forme
  // fidèle (voir la faute n°1 de l'en-tête).
  const echelle = interieur / etendue;
  const margeX = TRACE_PADDING + (interieur - largeur * echelle) / 2;
  const margeY = TRACE_PADDING + (interieur - hauteur * echelle) / 2;

  const segments: string[] = [];
  for (let i = 0; i < xy.length; i++) {
    const q = xy[i];
    if (q === undefined) continue;
    const x = margeX + (q.x - minX) * echelle;
    // ⚠️ L'AXE Y EST INVERSÉ : en projection locale il monte vers le NORD, en
    // SVG il descend. Sans cette inversion, la card publie le miroir horizontal
    // de la course — une forme que son auteur ne reconnaît pas.
    const y = margeY + (maxY - q.y) * echelle;
    segments.push(`${i === 0 ? 'M' : 'L'} ${arrondi(x)} ${arrondi(y)}`);
  }
  // `Z` referme le contour : voir l'en-tête pour pourquoi la DONNÉE, elle, ne
  // se referme jamais.
  return `${segments.join(' ')} Z`;
}

/**
 * L'URI rendue par la capture est-elle un FICHIER LOCAL, seule chose que
 * `Sharing.shareAsync` sache remettre à une feuille de partage ?
 *
 * ─── POURQUOI CETTE QUESTION EXISTE ─────────────────────────────────────────
 * `react-native-view-shot` a une implémentation WEB (html2canvas) qui ne sait
 * PAS écrire de fichier temporaire : elle prévient dans la console et rend une
 * `data:` URI à la place. `Sharing.shareAsync` la passerait alors à
 * `navigator.share({ url })`, qui refuse tout ce qui n'est pas une vraie URL —
 * le tap échouerait après coup. Un bouton qui ne peut pas tenir sa promesse
 * n'est pas un bouton : il ne doit pas être peint (« aucun bouton mort »).
 *
 * On accepte donc `file:` (iOS, et Android qui écrit parfois `file:/…` avec un
 * seul slash) et le chemin absolu ; on refuse `data:`, `blob:` et `http(s):`.
 */
export function estFichierPartageable(uri: string): boolean {
  return uri.startsWith('file:') || uri.startsWith('/');
}
