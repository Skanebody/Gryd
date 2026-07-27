/**
 * GRYD — E37 « PARTAGE TERMINÉ » : le petit écran de succès (spec l.1463-1472).
 *
 *   Partage terminé                                   ✕
 *   C’est envoyé. Tu peux revenir à ton résultat.
 *   [ Revenir au résultat ]        ← UN SEUL chartreuse (§A)
 *     Copier le lien · Partager ailleurs   ← suites secondaires
 *
 * ═══ CE QUE CE COMPOSANT NE DÉCIDE PAS ═════════════════════════════════════
 * Ni QUAND il s'ouvre, ni CE QU'IL A LE DROIT D'AFFIRMER, ni QUELLES actions
 * existent : tout cela vient de `features/share/shareOutcome.ts` (pur, testé en
 * Deno). Il reçoit une revendication déjà arbitrée et une liste d'actions déjà
 * filtrée par les capacités réelles de l'appareil — il pose des libellés dessus.
 * C'est le même partage des rôles que `ShareDestinations` / `shareTargets.ts`.
 *
 * ═══ LES DEUX TITRES NE SONT PAS UN DÉTAIL DE COPIE ════════════════════════
 * `claim: 'confirmed'` → « Partage terminé » : la plateforme a rapporté un envoi
 * abouti (iOS `Share.share`, Web Share API). `claim: 'handed_off'` → « Média
 * remis au partage » : `expo-sharing` et l'`Intent` Android ne rapportent RIEN,
 * donc l'app dit ce qu'elle a fait et avoue ce qu'elle ignore. Une annulation,
 * elle, n'ouvre pas ce panneau du tout (`shareOutcome` renvoie `none`) : la
 * phrase « Partage terminé » ne peut structurellement pas suivre un « Annuler ».
 *
 * ═══ UN SEUL CTA CHARTREUSE, MÊME AVEC TROIS SUITES ════════════════════════
 * Le panneau monte au-dessus d'un voile plein : la CTA de l'écran est couverte
 * pendant qu'il est visible, donc il n'y a jamais deux chartreuse à la fois. Et
 * à l'intérieur, une seule action est principale (`actions.primary`) — les
 * autres sont des liens texte, sans fond ni accent.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderState, colors, elevation, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { useReduceMotion } from '../../ui/game';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/result';
import type { Entry } from '../../i18n/types';
import { SHARE_COPY } from './copy';
import type { ShareDeliveryClaim, ShareDoneActionId, ShareDoneActions } from './shareOutcome';

export interface ShareDonePanelProps {
  /** `null` = pas de partage abouti à commenter → aucun panneau. */
  claim: Exclude<ShareDeliveryClaim, 'copied'> | null;
  /** Sortie de `shareDoneActions()` — déjà filtrée par les capacités réelles. */
  actions: ShareDoneActions;
  /**
   * Le lien a-t-il RÉELLEMENT atterri dans le presse-papiers ? Le libellé passe
   * alors à « Lien copié ». Un toast serait invisible sous ce `Modal`, et
   * basculer le libellé au tap (avant la réponse du presse-papiers) affirmerait
   * une copie non mesurée.
   */
  linkCopied?: boolean;
  onAction: (id: ShareDoneActionId) => void;
  /** Fermeture sans suite (croix, voile, retour Android). */
  onClose: () => void;
}

/**
 * Libellé par action. `back_to_result` et `share_again` vivent dans `SHARE_COPY`
 * (propres à ce panneau) ; `copyLink` et `seePublicProfile` existaient DÉJÀ dans
 * le catalogue partagé, posés pour E37 — on ne les recrée pas.
 */
const ACTION_LABEL: Record<ShareDoneActionId, Entry> = {
  back_to_result: SHARE_COPY.doneBackToResult,
  copy_link: C.copyLink,
  public_profile: C.seePublicProfile,
  share_again: SHARE_COPY.doneShareAgain,
};

export function ShareDonePanel({
  claim,
  actions,
  linkCopied = false,
  onAction,
  onClose,
}: ShareDonePanelProps) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const reduceMotion = useReduceMotion();

  /** Le libellé d'une action, dans son état COURANT (jamais une intention). */
  const labelOf = (id: ShareDoneActionId): string =>
    t(id === 'copy_link' && linkCopied ? C.linkCopied : ACTION_LABEL[id]);

  const confirmed = claim === 'confirmed';
  const title = confirmed ? SHARE_COPY.doneTitleConfirmed : SHARE_COPY.doneTitleHandedOff;
  const body = confirmed ? SHARE_COPY.doneBodyConfirmed : SHARE_COPY.doneBodyHandedOff;

  return (
    <Modal
      visible={claim !== null}
      transparent
      // Reduce Motion respecté : aucune translation imposée à qui l'a demandé.
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(SHARE_COPY.doneCloseA11y)}
          style={styles.backdrop}
          onPress={onClose}
        />
        <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.head}>
            {/* Aucun `numberOfLines` : un titre passe à la ligne, il ne se coupe
                jamais (§A.9). */}
            <Text style={styles.title}>{t(title)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(SHARE_COPY.doneCloseA11y)}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Icon name="fermer" size={16} color={colors.gris} />
            </Pressable>
          </View>

          {/* La phrase qui distingue « c'est envoyé » de « je ne sais pas ». */}
          <Text style={styles.body}>{t(body)}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labelOf(actions.primary)}
            onPress={() => onAction(actions.primary)}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaLabel}>{labelOf(actions.primary)}</Text>
          </Pressable>

          {/* Suites secondaires : liens texte, jamais un second accent. La rangée
              disparaît quand il n'y a rien à proposer — un conteneur vide qui
              garde sa marge est un trou, pas une information. */}
          {actions.secondary.length > 0 ? (
            <View style={styles.secondaryRow}>
              {actions.secondary.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={labelOf(id)}
                  onPress={() => onAction(id)}
                  style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                >
                  {/* `clip` et non l'ellipse par défaut : §A.9 interdit qu'un
                      texte d'action se termine par « … ». */}
                  <Text style={styles.secondaryLabel} numberOfLines={1} ellipsizeMode="clip">
                    {labelOf(id)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrimStrong },
  // N1 : UNE surface pour tout le panneau (jamais une card dans la card).
  panel: {
    backgroundColor: elevation.base,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  close: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  body: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.xxs,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chartreuse,
    borderRadius: radii.card,
    minHeight: sizes.buttonMd,
    marginTop: spacing.md,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  // Cible tactile RÉELLE de 44 pt (pas un hitSlop qui simule).
  secondary: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  secondaryLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
