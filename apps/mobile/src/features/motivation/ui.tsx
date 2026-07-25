/**
 * GRYD — briques UI communes aux écrans motivation (settings, paramètres).
 * Respectent la charte tri-couleur : sélection = bordure/anneau chartreuse
 * (§C.3 (1) : « moi »), jamais de remplissage plein de texte sur chartreuse
 * ailleurs que le disque COURIR. Graisses ≤ 600. Aucun nombre magique de jeu.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 25/07/2026 ──────────────────────────────────────
 * `SelectPills` et `Section` DOUBLAIENT `features/privacy/ui.tsx` — deux
 * composants homonymes, rendus différemment, pour le même objet de réglage :
 * le même concept n'avait pas la même apparence selon la page. Leurs deux
 * appelants ont disparu avec la refonte de `/settings-motivation` (le kicker de
 * section passe au composant canonique `src/ui/SectionLabel`). Ils sont donc
 * supprimés plutôt que gardés « au cas où ».
 *
 * ─── CE QUI SURVIT, ET POURQUOI (dette EXPLICITE, pas un oubli) ─────────────
 * `SwitchRow` et `TogglePill` doublent eux aussi `privacy/ui.tsx` — le premier
 * avec un `Switch` natif iOS là où l'autre dessine un track/knob maison. Ils
 * NE SONT PAS supprimés ici parce que `app/parametres/[section].tsx` les importe
 * encore, et que ce fichier appartient à un autre lot en cours : casser sa
 * compilation depuis ce chantier produirait exactement le conflit que le
 * découpage en lots existe pour éviter. Le jour où ce fichier migre vers
 * `privacy/ui` / `ListRow`, ces deux exports doivent disparaître d'ici.
 */
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontSizes, radii, sizes, spacing, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';

/** Carte-option « radio » pleine largeur (onboarding : un choix par groupe). */
export function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={22} color={selected ? colors.chartreuse : colors.blanc} />
      ) : null}
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
      {/* Anneau de sélection (jamais un texte sur chartreuse). */}
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

/** Pastille multi-sélection (settings : canaux de notif). */
export function TogglePill({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && styles.pressed]}
    >
      <Text style={[styles.pillLabel, on && styles.pillLabelOn]}>{label}</Text>
    </Pressable>
  );
}

/** Ligne interrupteur (settings : mode discret). Piste chartreuse à l'actif. */
export function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  icon,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon?: IconName;
}) {
  return (
    <View style={styles.switchRow}>
      {icon ? <Icon name={icon} size={20} color={colors.blanc} /> : null}
      <View style={styles.switchText}>
        <Text style={styles.switchTitle}>{title}</Text>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.carbone2, true: colors.chartreuse40 }}
        thumbColor={value ? colors.chartreuse : colors.blanc}
        ios_backgroundColor={colors.carbone2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    padding: spacing.cardPadding - 2,
    marginBottom: 12,
  },
  optionSelected: { borderColor: colors.chartreuse },
  optionText: { flex: 1 },
  optionTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  optionTitleSelected: { color: colors.blanc },
  optionSubtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    marginTop: spacing.xxs,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.chartreuse },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
  },
  pillOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  pillLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  pillLabelOn: { color: colors.blanc },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  switchText: { flex: 1 },
  switchTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },
});
