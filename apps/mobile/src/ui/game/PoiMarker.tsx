/**
 * GRYD — PoiMarker : POI running discret sur la carte (AMENDEMENT-09 §2).
 * Un pictogramme GRIS dans une pastille sombre de 24 px — il ne crie pas :
 * aucune couleur d'état de jeu, ≤ 4 visibles par écran (anti-bruit).
 * Kinds : parc / fontaine / spot (populaire) / depart (départ conseillé).
 * Positionné en absolu par l'écran parent (centre de la pastille = le point).
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, type IconName } from '@klaim/shared';
import { Icon } from '../Icon';

/** Diamètre gelé de la pastille POI. */
export const POI_MARKER_SIZE = 24;
/** Taille du pictogramme dans la pastille. */
const ICON_SIZE = 13;

export type PoiKind = 'parc' | 'fontaine' | 'spot' | 'depart';

/** Kind → icône shared + libellé a11y (vocabulaire de jeu court). */
const POI_META: Record<PoiKind, { icon: IconName; label: string }> = {
  parc: { icon: 'parc', label: 'Parc' },
  fontaine: { icon: 'fontaine', label: 'Fontaine' },
  spot: { icon: 'spot', label: 'Spot populaire' },
  depart: { icon: 'foulees', label: 'Départ conseillé' },
};

export interface PoiMarkerProps {
  kind: PoiKind;
  /** Libellé optionnel sous la pastille (très discret, gris 9 px). */
  label?: string;
}

export function PoiMarker({ kind, label }: PoiMarkerProps) {
  const meta = POI_META[kind];
  return (
    <View style={styles.wrap} accessibilityLabel={label ?? meta.label} pointerEvents="none">
      <View style={styles.disc}>
        <Icon name={meta.icon} size={ICON_SIZE} color={colors.gris} />
      </View>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  disc: {
    width: POI_MARKER_SIZE,
    height: POI_MARKER_SIZE,
    borderRadius: POI_MARKER_SIZE / 2,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  label: { color: colors.gris, fontSize: 9, marginTop: 2, maxWidth: 72 },
});
