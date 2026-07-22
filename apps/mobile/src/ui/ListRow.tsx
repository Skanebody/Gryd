/**
 * GRYD — LIGNE DE LISTE (la primitive qui manquait).
 *
 * POURQUOI ELLE EXISTE : chaque écran de réglages/légal réimplémentait SA propre
 * ligne (Confidentialité, Paramètres §[section] avec `ActionRow` + `ValueRow`,
 * À propos…). Trois géométries de fait pour un même objet → « pourquoi ce n'est
 * pas le même UI ». `ListRow` unifie les trois usages observés en UNE source :
 *
 *   1. réglage À VALEUR      — icône + libellé + valeur à droite
 *                              (« Profil visible par · Public », onPress ouvre le choix) ;
 *   2. navigation            — icône + libellé + chevron
 *                              (« CGV › », onPress route) ;
 *   3. info en LECTURE       — libellé + valeur, sans icône, non tappable
 *                              (« Version · 0.1.0 »).
 *
 * Les trois se composent des mêmes props : `value` (texte à droite) et `chevron`
 * cohabitent (réglage tappable avec valeur ET chevron, comme les réglages iOS).
 *
 * CHARTE (§A + design-tokens) : surface N1 `elevation.surface`, `radii.card` ;
 * cible tactile ≥ `sizes.touchTarget` (44) ; TOKENS uniquement ; l'icône de tête
 * porte le RÔLE (chartreuse par défaut sur fond sombre, rouge si `tone:'danger'`)
 * — jamais de chartreuse sur fond clair. TEXTE JAMAIS TRONQUÉ : aucun
 * `numberOfLines` sur le libellé/sous-libellé (ils s'enroulent), aucune « … ».
 *
 * Ce composant reçoit des CHAÎNES DÉJÀ TRADUITES (l'écran appelant fait le `t()`)
 * — il n'embarque aucune copie, donc aucune entrée i18n propre.
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, elevation, fontSizes, gameColors, radii, sizes, spacing, type IconName } from '@klaim/shared';
import { Icon } from './Icon';
import { IconPlate } from './Card';

/** Rôle visuel de la ligne : neutre, ou destructif (libellé + icône en rouge). */
export type ListRowTone = 'default' | 'danger';

export interface ListRowProps {
  /** Libellé principal (obligatoire) — jamais tronqué. */
  label: string;
  /** Icône de tête, rendue dans un `IconPlate`. Absente = pas de plaque. */
  icon?: IconName;
  /**
   * Surcharge la teinte de l'icône (défaut : chartreuse ; `tone:'danger'` la
   * passe en rouge). Utile pour une icône NEUTRE (ex. `colors.gris`) sur une
   * ligne d'info, afin de ne pas saturer l'écran de chartreuse.
   */
  iconColor?: string;
  /** Sous-libellé optionnel, sous le libellé (contexte) — jamais tronqué. */
  sublabel?: string;
  /** Valeur en lecture à droite (« Public », « 0.1.0 »). */
  value?: string;
  /** Chevron de navigation à droite (ligne qui route/ouvre un écran). */
  chevron?: boolean;
  /** Rôle destructif (« Supprimer mon compte ») : libellé + icône en rouge. */
  tone?: ListRowTone;
  /** Rend la ligne tappable ; sans `onPress`, la ligne est en lecture seule. */
  onPress?: () => void;
  /** Nom accessible si différent du libellé (ex. inclure la valeur). */
  accessibilityLabel?: string;
  /** Surcharge de style du conteneur (marges de groupe, etc.). */
  style?: ViewStyle;
}

export function ListRow({
  label,
  icon,
  iconColor,
  sublabel,
  value,
  chevron = false,
  tone = 'default',
  onPress,
  accessibilityLabel,
  style,
}: ListRowProps) {
  const danger = tone === 'danger';
  const headColor = iconColor ?? (danger ? gameColors.danger : colors.chartreuse);
  const pressable = onPress !== undefined;

  const content = (
    <>
      {icon ? <IconPlate icon={icon} size="md" color={headColor} /> : null}
      <View style={styles.info}>
        {/* §A « textes jamais coupés » : pas de numberOfLines → le libellé
            s'enroule au lieu d'être tronqué par « … ». */}
        <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
        {sublabel !== undefined ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
      {value !== undefined ? (
        <Text style={[styles.value, danger && styles.valueDanger]}>{value}</Text>
      ) : null}
      {chevron ? (
        <Icon name="chevron" size={16} color={danger ? gameColors.danger : colors.gris} />
      ) : null}
    </>
  );

  if (!pressable) {
    return <View style={[styles.row, style]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Surface N1 (elevation.surface) + radii.card, séparée par l'ESPACE
  // (marginBottom), pas par un cadre — règle 80/20 (AMENDEMENT-22). Géométrie
  // alignée sur les lignes de Paramètres/Confidentialité (la meilleure du repo).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  pressed: { opacity: 0.7 },
  info: { flex: 1 },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  labelDanger: { color: gameColors.danger },
  sublabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xxs,
  },
  // Valeur à droite : blanche, tabulaire (aligne « 0.1.0 » et les nombres).
  // flexShrink pour s'enrouler plutôt que déborder si elle est longue.
  value: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  valueDanger: { color: gameColors.danger },
});
