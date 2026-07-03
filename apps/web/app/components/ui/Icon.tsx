/**
 * GRYD — icône filaire web (charte §F : trait 1,5 px, linecap/join round, 24×24).
 * Rend un `IconName` de @klaim/shared (SOURCE UNIQUE des tracés — même jeu que
 * apps/mobile/src/ui/Icon.tsx). « Des icônes plutôt que du texte » (décision
 * fondateur 03/07/2026) : l'icône renforce la lecture, le libellé court reste.
 * Couleur : `currentColor` — l'icône suit toujours le texte qui l'accompagne.
 * `active` remplit l'icône si le tracé est `fillable` (réservé aux états actifs).
 * Composant pur (aucun hook) : utilisable côté serveur comme client.
 */
import { ICONS, ICON_VIEWBOX, type IconDef, type IconName } from '@klaim/shared';

export interface IconProps {
  name: IconName;
  /** Côté en px (défaut 18 — taille de renfort inline). */
  size?: number;
  className?: string;
  /** true = remplissage plein si l'icône est `fillable` (état actif). */
  active?: boolean;
}

export function Icon({ name, size = 18, className, active = false }: IconProps) {
  const def: IconDef = ICONS[name];
  const fill = active && def.fillable === true ? 'currentColor' : 'none';
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {def.paths.map((d) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fill}
        />
      ))}
    </svg>
  );
}
