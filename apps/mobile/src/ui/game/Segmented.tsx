/**
 * GRYD — Segmented (AMENDEMENT-22 §4). Primitive « UI en scènes » : un GROUPE de
 * choix = UN SEUL container (N1), pas N rectangles séparés. Remplace les groupes
 * de pills. Respecte la règle de profondeur :
 *   - Container = 1 surface N1 (`elevation.surface`) + filet discret.
 *   - Item      = transparent ; item ACTIF = N2 / accent selon `tone`.
 *   - N3        = l'état sélectionné est le seul contraste fort (jamais un cadre
 *                 permanent sur chaque item).
 *
 * `tone` :
 *   - `accent`  (défaut) : actif = chartreuse pleine + label NOIR (jamais de
 *                          chartreuse sur clair — le label passe en noir lisible).
 *   - `surface` : actif = surface N2 relevée + label blanc + filet chartreuse
 *                 discret. À utiliser quand un `accent` chartreuse existe déjà à
 *                 l'écran (un seul focus chartreuse fort par scène).
 *
 * Deux dispositions :
 *   - défaut (`scrollable` faux) : segments à largeur ÉGALE qui remplissent la
 *     rangée (idéal 2-4 choix courts). Labels COURTS, jamais tronqués.
 *   - `scrollable` : segments à largeur de leur CONTENU dans un strip horizontal
 *     (idéal quand il y a plus de choix que la largeur ne tient — « +scroll si
 *     besoin » §7). AUCUN label n'est jamais coupé : on fait défiler, on ne
 *     tronque pas (pet peeve #1).
 *
 * Générique : `options` porte un `id` (string) libre, `value`/`onChange` typés
 * dessus. Icône optionnelle par segment. haptics.light au change ; bascule
 * instantanée (rien à neutraliser sous reduce motion, l'API reste cohérente DS).
 */
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { borderState, colors, elevation, fontSizes, radii } from '@klaim/shared';
import { Icon } from '../Icon';
import type { IconName } from '@klaim/shared';
import { haptics } from '../../lib/haptics';

/** Un segment : identifiant libre, label court (jamais tronqué), icône option. */
export interface SegmentedOption<Id extends string> {
  id: Id;
  label: string;
  icon?: IconName;
}

export type SegmentedTone = 'accent' | 'surface';

export interface SegmentedProps<Id extends string> {
  /** Segments (2 à 4 idéalement à largeur égale ; plus → passer `scrollable`). */
  options: readonly SegmentedOption<Id>[];
  /** Segment actuellement sélectionné. */
  value: Id;
  /** Appelé au tap d'un autre segment (jamais si déjà actif). */
  onChange: (id: Id) => void;
  /** Rendu de l'état actif (cf. doctrine chartreuse). Défaut `accent`. */
  tone?: SegmentedTone;
  /** Strip défilant à largeur de contenu (au lieu de colonnes égales). */
  scrollable?: boolean;
  /** Libellé d'accessibilité du GROUPE (ex. « Format de partage »). */
  accessibilityLabel: string;
  style?: ViewStyle;
}

export function Segmented<Id extends string>({
  options,
  value,
  onChange,
  tone = 'accent',
  scrollable = false,
  accessibilityLabel,
  style,
}: SegmentedProps<Id>) {
  const pick = (id: Id) => {
    if (id === value) return;
    haptics.light();
    onChange(id);
  };

  const items = options.map((opt) => {
    const on = opt.id === value;
    const activeStyle =
      tone === 'accent' ? on && styles.itemOnAccent : on && styles.itemOnSurface;
    const labelColor = on
      ? tone === 'accent'
        ? colors.noir
        : colors.blanc
      : colors.gris;
    return (
      <Pressable
        key={opt.id}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={opt.label}
        onPress={() => pick(opt.id)}
        style={({ pressed }) => [
          styles.item,
          scrollable ? styles.itemAuto : styles.itemFlex,
          activeStyle,
          pressed && !on && styles.pressed,
        ]}
      >
        {opt.icon ? <Icon name={opt.icon} size={15} color={labelColor} /> : null}
        {/* numberOfLines=1 SANS ellipsize : en `scrollable` le segment fait la
            taille du texte (jamais coupé) ; en largeur égale les labels sont
            calibrés courts. */}
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {opt.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        style={[styles.group, style]}
        contentContainerStyle={styles.scrollContent}
      >
        {items}
      </ScrollView>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.group, styles.groupRow, style]}
    >
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container = LA surface N1 du groupe (une seule pour tous les segments).
  group: {
    alignSelf: 'stretch',
    backgroundColor: elevation.surface,
    borderRadius: radii.pill,
    padding: 4,
  },
  groupRow: { flexDirection: 'row', gap: 4 },
  scrollContent: { gap: 4, alignItems: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  // Colonnes égales (défaut) vs largeur de contenu (scrollable).
  itemFlex: { flex: 1, paddingHorizontal: 12 },
  itemAuto: { paddingHorizontal: 18 },
  // Actif « accent » : chartreuse pleine, label noir (contraste AAA).
  itemOnAccent: { backgroundColor: colors.chartreuse },
  // Actif « surface » : N2 relevé + filet chartreuse discret (focus léger).
  itemOnSurface: {
    backgroundColor: elevation.raised,
    borderWidth: 1,
    borderColor: borderState.activeSoft,
  },
  label: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.2 },
  pressed: { opacity: 0.6 },
});
