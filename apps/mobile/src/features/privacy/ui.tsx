/**
 * GRYD — briques UI des écrans de réglages « résumé + détail » (Confidentialité,
 * Mes parcours). Chaque groupe est une CARD REPLIÉE : titre + valeur courante
 * visibles sans scroll, le détail s'ouvre au tap, une seule ouverte à la fois
 * (piloté par le parent). Reduce motion respecté, haptique légère.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · LE CADRE PERMANENT DE CHAQUE CARD. `borderWidth: 1` était posé sur TOUTES
 *   les cards, et l'état ouvert se contentait d'en changer la couleur. Quand dix
 *   cadres sont peints en permanence, le onzième — celui qui signale un ÉTAT —
 *   ne signale plus rien (règle 80/20, `src/ui/Card.tsx`). La card est
 *   maintenant une surface N1 nue ; le contour chartreuse de l'ouverture
 *   REDEVIENT un état.
 * · LES DEUX `numberOfLines={1}` NUS de l'en-tête. `headTitle` et surtout
 *   `headValue` (sous `maxWidth: '42%'`) coupaient en « … » dès l'allemand :
 *   « Sichtbarkeit des Profils » et « Nur ich » ne tiennent pas dans 42 % d'un
 *   écran de 375 px. Les deux s'enroulent désormais (règle 9).
 * · `SectionLabel`, qui vivait ICI. Un composant de kicker importé depuis un
 *   dossier « confidentialité » par quatre écrans de réglages qui n'ont rien à
 *   voir avec la vie privée — et qui y recodait le rôle typo R1 à la main. La
 *   version canonique est `src/ui/SectionLabel`. On la RÉ-EXPORTE le temps que
 *   les derniers appelants basculent, sans rien recoder.
 * · Les `fontWeight` posés par-dessus une famille à graisse nommée (sans effet
 *   en RN, `design-tokens.ts` §fonts) : remplacés par les rôles `typography.*`.
 *
 * ─── ÉCARTS ASSUMÉS ───────────────────────────────────────────────────────────
 * · `SelectPills` N'EST PAS le `Segmented` du système, et c'est délibéré :
 *   `Segmented` répartit ses segments sur une seule ligne (ou défile), ce qui
 *   suppose un petit nombre d'options de largeur comparable. Ici les groupes
 *   vont jusqu'à SIX pastilles de longueurs très inégales (les distances de
 *   « Mes parcours »), qui doivent pouvoir passer à la ligne. Un `Segmented`
 *   scrollable cacherait la moitié des choix hors écran, ce qui est pire qu'un
 *   retour à la ligne. `tone` reste neutre : jamais d'aplat chartreuse sur un
 *   filtre — seule la BORDURE marque la sélection, doublée par la couleur du
 *   texte (§C : la couleur ne porte jamais le sens seule).
 * · L'interrupteur de `SwitchRow` est dessiné à la main plutôt que d'utiliser le
 *   `Switch` de React Native : celui-ci n'accepte pas les tokens de la charte
 *   sur toutes les plateformes (piste/pouce imposés par l'OS sur Android).
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
import {
  borderState,
  colors,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  typography,
  type IconName,
} from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { haptics } from '../../lib/haptics';
import { useReduceMotion } from '../../ui/game/anim';

/**
 * Ré-export du kicker canonique. `features/privacy/ui` n'est plus sa maison :
 * il vit dans `src/ui/SectionLabel`, avec le rôle typo R1 consommé et non
 * recodé. Ce ré-export existe pour ne pas casser les appelants restants.
 */
export { SectionLabel } from '../../ui/SectionLabel';

/** Géométrie de l'interrupteur (mesures de composition, pas des règles de jeu). */
const TRACK_W = 44;
const TRACK_H = 26;
const KNOB = 20;

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
        <Icon name={icon} size={iconSizes.md} color={danger ? gameColors.danger : colors.blanc} />
        {/* Aucun `numberOfLines` : un titre de réglage s'enroule plutôt que
            d'être coupé par « … » (§A « textes jamais coupés »). */}
        <Text style={styles.headTitle}>{title}</Text>
        {value ? <Text style={styles.headValue}>{value}</Text> : null}
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
    <View accessibilityRole="radiogroup" style={styles.pills}>
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

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // Surface N1 SANS contour : les blocs se séparent par l'espace (règle 80/20).
  card: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    marginBottom: 10,
    overflow: 'hidden',
  },
  // Le contour d'OUVERTURE est le seul de cet écran — donc il se voit.
  cardOpen: { borderWidth: 1, borderColor: borderState.activeSoft },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: sizes.touchTarget,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding - 2,
  },
  headTitle: { ...typography.cardTitle, color: colors.blanc, flex: 1 },
  // Plus de `maxWidth: '42%'` : la valeur se contracte (flexShrink) et s'enroule
  // au lieu d'être tronquée. Tabulaire pour aligner les distances entre elles.
  headValue: {
    ...typography.meta,
    color: colors.gris,
    fontSize: fontSizes.sm,
    textAlign: 'right',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
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
  pill: {
    borderWidth: 1,
    borderColor: borderState.hairline,
    borderRadius: radii.pill,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  pillOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  pillLabel: { ...typography.meta, color: colors.gris, fontSize: fontSizes.sm },
  pillLabelOn: { color: colors.blanc },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: sizes.touchTarget,
    paddingVertical: 12,
  },
  switchText: { flex: 1 },
  switchTitle: { ...typography.meta, color: colors.blanc, fontSize: fontSizes.sm },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    borderWidth: 1,
    borderColor: borderState.hairline,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.chartreuse40, borderColor: colors.chartreuse },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: radii.pill,
    backgroundColor: colors.blanc,
  },
  knobOn: { backgroundColor: colors.chartreuse, alignSelf: 'flex-end' },

  note: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 8,
  },
});
