/**
 * GRYD — LE LOGO, EN SVG INLINE (lot W2).
 *
 * Le cahier §4.7 : « Le logo est le G chartreuse seul, sans socle, comme sur la
 * carte de l'application. » Il est dessiné ici, pas chargé en image : un SVG
 * inline prend sa couleur du jeton courant, reste net à toutes les densités,
 * et ne coûte pas une requête réseau de plus dans l'en-tête de chaque page.
 *
 * Deux variantes, et une seule règle d'emploi :
 *  · `symbol`   — le G seul. C'est le logo.
 *  · `wordmark` — le lettrage GRYD. C'est un DESSIN, donc le seul endroit du
 *    site où la marque s'écrit en capitales (§4.2). Il ne se met jamais au
 *    milieu d'une phrase : dans la prose, on écrit « Gryd ».
 */
import { GRYD_BRAND_2026 } from './brandPaths2026';

export interface GrydMarkProps {
  /** Hauteur en pixels. La largeur suit le rapport d'origine de l'identité. */
  readonly size?: number;
  /** Couleur du tracé. Par défaut le chartreuse de la charte. */
  readonly color?: string;
  readonly variant?: 'symbol' | 'wordmark';
  /**
   * Nom accessible. `null` rend le dessin DÉCORATIF (`aria-hidden`) : à employer
   * quand un texte voisin porte déjà le nom, sinon un lecteur d'écran l'annonce
   * deux fois.
   */
  readonly title?: string | null;
  readonly className?: string;
}

export function GrydMark({
  size = 28,
  color = 'var(--gryd-accent)',
  variant = 'symbol',
  title = 'Gryd',
  className,
}: GrydMarkProps) {
  const art = GRYD_BRAND_2026[variant];
  const width = Math.round((size * art.width) / art.height);
  const decorative = title === null;
  return (
    <svg
      className={className}
      width={width}
      height={size}
      viewBox={`0 0 ${art.width} ${art.height}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      focusable="false"
    >
      <path d={art.paths.join(' ')} fill={color} fillRule="evenodd" />
    </svg>
  );
}
