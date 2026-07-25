/**
 * GRYD — E13 · RANGÉE DE MEMBRES (planche « Crew Home », bas de l'aperçu).
 *
 * La planche montre une rangée d'AVATARS + « +N » + un lien « Membres › ».
 *
 * ⚠ AUCUN AVATAR N'EXISTE. `public_profiles` expose `(id, pseudo, city_id)`
 * (0046:94) — aucune `avatar_url` n'est lisible pour un tiers, et il n'y a ni
 * upload ni bucket. Un avatar générique ressemblerait à une photo absente, donc
 * à une promesse. On rend des PASTILLES D'INITIALES dérivées du pseudo RÉEL,
 * exactement comme `CrewCrest` dérive ses initiales du nom du crew : rien n'est
 * inventé, et la rangée reste identifiable.
 *
 * Le lien « Membres › » bascule le segmented de l'écran (pas de navigation,
 * donc aucune route manquante à peindre).
 *
 * §C — la seule couleur employée lit un RÔLE : le liseré chartreuse marque MA
 * pastille. Aucune couleur par membre, aucune couleur par crew.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, iconSizes, radii, sizes, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/crew';

/** Ce dont la rangée a besoin — un sous-ensemble de `RealCrewMember`. */
export interface CrewMemberChip {
  userId: string;
  pseudo: string;
  isMe: boolean;
}

/**
 * Combien de pastilles avant le « +N ». Ce n'est PAS une règle de jeu (aucune
 * valeur de score) : c'est la largeur tenable d'une rangée sur le plus étroit
 * des téléphones. Au-delà, le reste est compté, jamais coupé.
 */
const MAX_CHIPS = 6;

/** Initiales du pseudo (1 à 2 lettres), même dérivation que `CrewCrest`. */
function initialsOf(pseudo: string): string {
  const words = pseudo.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '?';
  const second = words[1]?.charAt(0) ?? '';
  return (first + second).toUpperCase();
}

export interface CrewMembersStripProps {
  members: readonly CrewMemberChip[];
  /** Bascule l'écran sur la vue Membres. */
  onOpenMembers: () => void;
}

export function CrewMembersStrip({ members, onOpenMembers }: CrewMembersStripProps) {
  // `useT` AVANT toute sortie anticipée : l'ordre des hooks reste inconditionnel.
  const t = useT();
  if (members.length === 0) return null;
  const shown = members.slice(0, MAX_CHIPS);
  const rest = members.length - shown.length;

  return (
    <Pressable
      onPress={onOpenMembers}
      accessibilityRole="button"
      accessibilityLabel={t(C.tabMembers)}
      style={styles.row}
    >
      <View style={styles.chips}>
        {shown.map((m) => (
          <View key={m.userId} style={[styles.chip, m.isMe && styles.chipMe]}>
            <Text style={styles.chipText}>{initialsOf(m.pseudo)}</Text>
          </View>
        ))}
        {rest > 0 ? (
          <View style={styles.chip}>
            <Text style={styles.chipRest}>{t(C.membersMore, { n: rest })}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.link}>
        <Text style={styles.linkText}>{t(C.tabMembers)}</Text>
        <Icon name="chevron" size={iconSizes.sm} color={colors.chartreuse} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    marginTop: spacing.lg,
  },
  // Les pastilles se CHEVAUCHENT légèrement (rangée compacte) ; la marge
  // négative est un décalage de mise en page, pas une valeur de jeu.
  chips: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  chip: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.xxs,
  },
  /** MOI — liseré chartreuse (rôle), jamais un halo (réservé au personnel). */
  chipMe: { borderColor: colors.chartreuse40 },
  chipText: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.xs },
  chipRest: { color: colors.gris, fontFamily: fonts.mono, fontSize: fontSizes.xs },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexShrink: 0 },
  linkText: {
    color: colors.chartreuse,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
});
