/**
 * GRYD — briques UI de la page Confidentialité (AMENDEMENT-17 CHANTIER 3).
 * Principe résumé + détail : chaque groupe est une CARD REPLIÉE — titre + valeur
 * courante visibles sans scroll, le détail (options) s'ouvre au tap. Une seule
 * ouverte à la fois (piloté par le parent). Charte tri-couleur : sélection =
 * bordure/anneau chartreuse, jamais de texte sur aplat chartreuse. Reduce motion
 * respecté (LayoutAnimation coupée). Haptique légère à l'ouverture/au choix.
 */
import type { ReactNode } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { haptics } from '../../lib/haptics';
import { useReduceMotion } from '../../ui/game/anim';

/**
 * Card repliable « résumé + détail » : en-tête (icône + titre + valeur courante +
 * chevron) toujours visible ; le contenu apparaît sous l'en-tête quand ouverte.
 * Le parent contrôle `open` (une seule section ouverte). Anime le dépli sauf en
 * reduce motion.
 */
export function DisclosureCard({
  icon,
  title,
  value,
  open,
  onToggle,
  danger = false,
  children,
}: {
  icon: IconName;
  title: string;
  /** Valeur courante montrée à droite (résumé sans ouvrir). */
  value?: string;
  open: boolean;
  onToggle: () => void;
  /** Accent d'alerte discret (export/suppression) — jamais criard. */
  danger?: boolean;
  children: ReactNode;
}) {
  const reduce = useReduceMotion();
  const handle = () => {
    if (!reduce && Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    haptics.light();
    onToggle();
  };
  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={handle}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <Icon name={icon} size={20} color={danger ? gameColors.danger : colors.blanc} />
        <Text style={styles.headTitle} numberOfLines={1}>
          {title}
        </Text>
        {value ? (
          <Text style={styles.headValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        <View style={[styles.chevron, open && styles.chevronOpen]}>
          <Icon name="chevron" size={16} color={colors.gris} />
        </View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

/** Groupe de pastilles à choix unique (le détail d'une DisclosureCard). */
export function SelectPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pills}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptics.light();
              onChange(o.value);
            }}
            style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && styles.pressed]}
          >
            <Text style={[styles.pillLabel, on && styles.pillLabelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Ligne interrupteur légère (dans le détail d'une card). */
export function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptics.light();
        onValueChange(!value);
      }}
      style={styles.switchRow}
    >
      <View style={styles.switchText}>
        <Text style={styles.switchTitle}>{title}</Text>
        {subtitle ? <Text style={styles.note}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

/** Note grise explicative (sous une option ou un groupe). */
export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

/** Sur-titre mono gris de section. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  card: {
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardOpen: { borderColor: colors.chartreuse40 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding - 2,
  },
  headTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500', flexShrink: 1 },
  headValue: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginLeft: 'auto',
    maxWidth: '42%',
    textAlign: 'right',
  },
  chevron: { transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '270deg' }] },
  body: {
    paddingHorizontal: spacing.cardPadding - 2,
    paddingBottom: 16,
    paddingTop: 2,
    gap: 4,
  },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  // Pastille >= 44 px de hauteur tactile (audit zéro-friction / Apple HIG).
  pill: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  pillOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  pillLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  pillLabelOn: { color: colors.blanc },

  // Rangée-interrupteur >= 44 px de hauteur tactile (audit zéro-friction).
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 12,
  },
  switchText: { flex: 1 },
  switchTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  track: {
    width: 44,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.chartreuse40, borderColor: colors.chartreuse },
  knob: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.blanc,
  },
  knobOn: { backgroundColor: colors.chartreuse, alignSelf: 'flex-end' },

  note: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 8,
  },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
});
