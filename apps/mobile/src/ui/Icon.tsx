/**
 * GRYD — icône filaire (charte §F : trait 1,5 px, linecap/join round, 24×24).
 * Rend un `IconName` de @klaim/shared (source unique des tracés) via
 * react-native-svg — universel iOS/Android/Web, aucune variante .web.
 * « Des icônes plutôt que du texte » (décision fondateur 03/07/2026).
 * `active` remplit l'icône de sa couleur si le tracé est `fillable`
 * (réservé aux états actifs — onglet sélectionné, rang 1…).
 */
import Svg, { Path } from 'react-native-svg';
import { ICONS, ICON_VIEWBOX, type IconDef, type IconName } from '@klaim/shared';

export interface IconProps {
  name: IconName;
  /** Côté en px (défaut 24 = boîte native des tracés). */
  size?: number;
  /** Couleur du trait — toujours un token (@klaim/shared). */
  color: string;
  /** true = remplissage plein si l'icône est `fillable` (état actif). */
  active?: boolean;
}

export function Icon({ name, size = 24, color, active = false }: IconProps) {
  const def: IconDef = ICONS[name];
  const fill = active && def.fillable === true ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}>
      {def.paths.map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fill}
        />
      ))}
    </Svg>
  );
}
