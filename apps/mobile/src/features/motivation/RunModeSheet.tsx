/**
 * GRYD — sélecteur de MODE au départ de course (AMENDEMENT-07 §2/§8, social §10).
 * Feuille modale présentée AVANT de lancer la course : Conquête / Social Run /
 * Course privée, avec une explication courte de l'effet (§8). Le mode choisi est
 * remonté à l'appelant (RunButton), qui le passera dans IngestRunRequest.runMode
 * (le serveur décide toujours du territoire). Défaut `conquete`.
 *
 * Anti-shame / clarté : aucun mode n'est « le bon » ; Social Run et Course privée
 * sont présentés comme des choix légitimes (pas des sous-modes dégradés).
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing, type RunMode } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { RUN_MODE_LABELS } from './labels';

/** Modes proposés au départ (MVP actif — race_mode/event_run = V1, exclus). */
const RUN_MODE_ORDER: Extract<RunMode, 'conquete' | 'social_run' | 'course_privee'>[] = [
  'conquete',
  'social_run',
  'course_privee',
];

export function RunModeSheet({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  /** Mode choisi → l'appelant lance la course avec ce runMode. */
  onSelect: (mode: RunMode) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
        {/* Le contenu ne propage pas le tap de fermeture. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={() => {}}
        >
          <View style={styles.grab} />
          <Text style={styles.title}>Comment tu cours ?</Text>
          <Text style={styles.subtitle}>Tu peux changer à chaque sortie.</Text>

          {RUN_MODE_ORDER.map((mode) => {
            const def = RUN_MODE_LABELS[mode];
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={def.title}
                onPress={() => onSelect(mode)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.iconWrap}>
                  <Icon name={def.icon} size={22} color={colors.blanc} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{def.title}</Text>
                  <Text style={styles.rowSubtitle}>{def.subtitle}</Text>
                </View>
                <View style={styles.chevron}>
                  <Icon name="chevron" size={18} color={colors.gris} />
                </View>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card + 8,
    borderTopRightRadius: radii.card + 8,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.grisLigne,
    marginBottom: 16,
  },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  subtitle: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 4, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  rowPressed: { opacity: 0.7 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  rowSubtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    marginTop: 2,
  },
  chevron: { opacity: 0.8 },
});
