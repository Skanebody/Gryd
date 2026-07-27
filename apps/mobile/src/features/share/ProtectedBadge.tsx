/**
 * GRYD — BADGE « PROTÉGÉ » PERMANENT, DÉTAIL AU TAP (planche E10, non
 * négociable : « Badge 🛡 Protégé permanent, détail au tap »).
 *
 * ═══ POURQUOI IL EST PERMANENT, ET POURQUOI ÇA N'EN FAIT PAS UN MENSONGE ════
 * L'ancien badge n'apparaissait que si une trace tronquée était réellement
 * visible, et il portait sa promesse EN DUR (« départ et arrivée masqués »). La
 * planche le veut permanent — ce qui, avec une phrase figée, aurait été une
 * promesse fausse la moitié du temps.
 * La sortie est de séparer les deux : le badge ne dit QUE le mot « Protégé »
 * (l'état de confiance), et le DÉTAIL — dérivé de `protectionLines()`
 * (composerModel.ts, pur et testé) — dit ce qui est protégé DANS CETTE
 * SITUATION : aucun tracé publié / extrémités coupées de SHARE_TRIM_M / trace
 * simplifiée à SHARE_SIMPLIFY_EPSILON_M / zones privées / aucune heure.
 * Aucune ligne n'existe sans une ligne de code qui la tienne, et la liste avoue
 * ce qui manque (« aucune zone privée déclarée : l'app ne permet pas encore
 * d'en créer »).
 *
 * ═══ LES DISTANCES VIENNENT DES CONSTANTES RÉELLEMENT APPLIQUÉES ════════════
 * `trimM` / `simplifyM` sont passés par l'appelant depuis
 * `features/share/sharePrivacy.ts`, qui les ré-exporte de
 * `packages/shared/src/game-rules.ts` — la valeur affichée est CELLE que le
 * pipeline applique, pas un chiffre de copie (aucun nombre magique).
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderState, colors, elevation, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { useReduceMotion } from '../../ui/game';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/result';
import { SHARE_COPY } from './copy';
import { haptics } from '../../lib/haptics';
import type { ProtectionId } from './composerModel';

export interface ProtectedBadgeProps {
  /** Ce qui est RÉELLEMENT protégé ici — sortie de `protectionLines()`. */
  lines: readonly ProtectionId[];
  /** SHARE_TRIM_M (m) réellement appliqué à la coupe des extrémités. */
  trimM: number;
  /** SHARE_SIMPLIFY_EPSILON_M (m) réellement appliqué à la simplification. */
  simplifyM: number;
  /** Zones privées RÉELLEMENT lues pour ce joueur (0 aujourd'hui, cf. copy). */
  zoneCount: number;
}

export function ProtectedBadge({ lines, trimM, simplifyM, zoneCount }: ProtectedBadgeProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);

  const lineText = (id: ProtectionId): string => {
    switch (id) {
      case 'noRoute':
        return t(SHARE_COPY.protectionNoRoute);
      case 'endpoints':
        return t(SHARE_COPY.protectionEndpoints, { m: trimM });
      case 'simplify':
        return t(SHARE_COPY.protectionSimplify, { m: simplifyM });
      case 'zonesApplied':
        return t(SHARE_COPY.protectionZonesApplied, { n: zoneCount });
      case 'zonesNone':
        return t(SHARE_COPY.protectionZonesNone);
      case 'noClock':
        return t(SHARE_COPY.protectionNoClock);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(SHARE_COPY.protectedDetailA11y)}
        onPress={() => {
          haptics.light();
          setOpen(true);
        }}
        style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
      >
        <Icon name="verrou" size={12} color={colors.gris} />
        {/* Un seul mot, jamais tronqué. Ce qu'il couvre est DANS le détail. */}
        <Text style={styles.badgeLabel} numberOfLines={1} ellipsizeMode="clip">
          {t(C.protectedBadge)}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(SHARE_COPY.protectedDetailClose)}
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.head}>
              <Icon name="verrou" size={16} color={colors.chartreuse} />
              <Text style={styles.title}>{t(SHARE_COPY.protectedDetailTitle)}</Text>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {lines.map((id) => (
                <View key={id} style={styles.line}>
                  <View style={styles.dot} />
                  {/* Aucun `numberOfLines` : ces phrases DOIVENT être lisibles
                      en entier — une protection à moitié lue ne protège rien. */}
                  <Text style={styles.lineText}>{lineText(id)}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(SHARE_COPY.protectedDetailClose)}
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={styles.closeLabel}>{t(SHARE_COPY.protectedDetailClose)}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Pastille discrète (N2), cible tactile RÉELLE ≥ 44 pt — pas un hitSlop.
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
  },
  badgeLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrimStrong },
  sheet: {
    backgroundColor: elevation.base,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '80%',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.3 },
  scroll: { marginTop: spacing.md },
  scrollContent: { paddingBottom: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.chartreuse,
    marginTop: 7,
  },
  lineText: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    flex: 1,
  },
  // Fermeture : action NEUTRE (N2), jamais un second CTA chartreuse (§A).
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sizes.buttonMd,
    borderRadius: radii.card,
    backgroundColor: elevation.raised,
    marginTop: spacing.xs,
  },
  closeLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
