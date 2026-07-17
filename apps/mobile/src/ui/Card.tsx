/**
 * GRYD — CARD & ICONPLATE (audit UI 2026, COMPONENT_INVENTORY §2-3).
 *
 * `Card` : LA surface N1 (elevation.surface + radii.card + padding), SANS
 * contour par défaut. L'audit a mesuré 79 % des 129 cards N1 avec un cadre
 * grisLigne permanent — l'INVERSE de la règle 80/20 (AMENDEMENT-22) : 80 % des
 * surfaces se séparent par l'ESPACE, pas par des boîtes. Le contour redevient
 * réservé aux ÉTATS via la prop `state` (sélection/alerte/rareté), jamais une
 * simple séparation. Retirer le cadre externe dissout aussi la plupart des
 * bordure-dans-bordure (une card sans cadre + une pill bordée = 1 seul niveau).
 *
 * `IconPlate` : le carré d'icône (fond N2 + radii.control) recodé 12+ fois avec
 * 7 rayons de fait — une seule source.
 */
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { borderState, colors, elevation, gameColors, iconSizes, radii, spacing } from '@klaim/shared';
import { Icon } from './Icon';
import type { IconName } from '@klaim/shared';

/** État visuel d'une card — un contour n'apparaît QUE pour un état (règle 80/20). */
export type CardState = 'none' | 'active' | 'alert' | 'gold' | 'contested';

export interface CardProps {
  children: React.ReactNode;
  /** Contour d'ÉTAT (défaut none = aucun cadre, la card se lit par l'espace). */
  state?: CardState;
  /** Padding compact (listes denses) au lieu du padding standard. */
  compact?: boolean;
  style?: ViewStyle;
}

const STATE_BORDER: Record<Exclude<CardState, 'none'>, string> = {
  active: borderState.active, // chartreuse plein — sélection / interaction
  alert: gameColors.danger, // decay / urgent
  gold: gameColors.gold, // récompense / rareté
  contested: gameColors.contested, // zone contestée
};

export function Card({ children, state = 'none', compact = false, style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding: compact ? spacing.md : spacing.cardPadding },
        state !== 'none' && { borderWidth: 1, borderColor: STATE_BORDER[state] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type IconPlateSize = 'sm' | 'md' | 'lg';

export interface IconPlateProps {
  icon: IconName;
  /** sm 32 · md 40 · lg 48 — le carré ; l'icône occupe ~50 %. */
  size?: IconPlateSize;
  color?: string;
  /** Fond du carré (défaut surface élevée N2). */
  background?: string;
}

const PLATE_BOX: Record<IconPlateSize, number> = { sm: 32, md: 40, lg: 48 };
const PLATE_ICON: Record<IconPlateSize, number> = {
  sm: iconSizes.sm, // 16
  md: iconSizes.md, // 20
  lg: iconSizes.lg, // 24
};

export function IconPlate({ icon, size = 'md', color = colors.blanc, background }: IconPlateProps) {
  return (
    <View
      style={[
        styles.plate,
        { width: PLATE_BOX[size], height: PLATE_BOX[size], backgroundColor: background ?? elevation.raised },
      ]}
    >
      <Icon name={icon} size={PLATE_ICON[size]} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
  },
  plate: {
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
