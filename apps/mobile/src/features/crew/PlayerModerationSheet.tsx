/**
 * GRYD — SIGNALER / BLOQUER AU CONTACT DU JOUEUR (App Store Guideline 1.2).
 *
 * Apple exige « a mechanism for users to flag objectionable content » et « the
 * ability to block abusive users from the service ». Le seul chemin existant
 * était : Profil → Confidentialité → dépli « Blocage & signalement » → RETAPER À
 * LA MAIN un pseudo qui est un identifiant machine (`runner_` + 12 hexadécimaux)
 * et qui n'est affiché nulle part en entier. Un mécanisme qu'on ne peut pas
 * atteindre depuis le contenu ne satisfait pas la puce (audit App Store, B4).
 *
 * Ce fichier pose l'affordance MANQUANTE, sur les deux seules surfaces qui
 * affichent le pseudo d'un tiers (roster de crew, classement de saison) :
 *   · `PlayerActionsButton` — un « … » DISCRET en bout de ligne. Gris, jamais
 *     chartreuse : §A4 (« 1 seul CTA chartreuse par écran ») n'est pas entamé,
 *     et le CTA de l'écran reste le seul point focal ;
 *   · `PlayerModerationSheet` — la feuille { Signaler · Bloquer }, PRÉ-REMPLIE
 *     avec le joueur de la ligne. Elle appelle `reportContent` / `blockMember`
 *     de `moderation.ts`, déjà branchés sur `content_reports` / `user_blocks` —
 *     rien n'est réimplémenté, la charge utile vient de `blocklist.ts` (pur).
 *
 * ─── DEUX PAS MAXIMUM, ET AUCUN ALERT ────────────────────────────────────────
 * §A1 « 1 écran = 1 décision » : la feuille pose UNE question (que faire de ce
 * joueur), et le motif n'apparaît QUE si l'on a choisi de signaler. La
 * confirmation d'envoi est un 3ᵉ état DE LA FEUILLE, pas un `Alert` : sur Expo
 * Web `Alert.alert` ne rend rien, et un accusé de réception invisible sur une
 * plateforme est un accusé de réception qui ment. Le blocage, lui, n'a besoin
 * d'aucun accusé : la ligne devient « Joueur bloqué » sous le doigt.
 *
 * ─── CE QUI N'EST PAS PEINT, ET POURQUOI ─────────────────────────────────────
 * « Signaler » n'existe QUE sous session : hors session `reportContent` reste
 * local et n'atteint personne (`moderation.ts`) — le peindre serait un bouton
 * mort et l'accusé « examiné sous {h} h » un mensonge. C'est la règle déjà
 * appliquée par l'écran Confidentialité, dérivée ici par `moderationActionsFor`
 * (fonction pure, testée) plutôt que réécrite à la main.
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, sizes, spacing, typography, withAlpha } from '@klaim/shared';
import { C } from '../../i18n/catalog/crew';
import { C as CReg } from '../../i18n/catalog/reglages';
import { useT } from '../../i18n/store';
import { useSession } from '../../lib/session';
import { Button } from '../../ui/Button';
import {
  REPORT_REASONS,
  REPORT_REVIEW_HOURS,
  blockMember,
  reportContent,
  unblockMember,
  useModeration,
  type ReportReason,
} from './moderation';
import {
  blockTargetFor,
  blockedPseudoSet,
  memberReportInput,
  moderationActionsFor,
} from './blocklist';

/**
 * Pseudos bloqués sous leur forme de COMPARAISON, mémoïsée. C'est le pont entre
 * le store de modération (React) et le prédicat pur `isPseudoBlocked` que les
 * surfaces consomment ligne par ligne.
 */
export function useBlockedPseudos(): ReadonlySet<string> {
  const { blocked } = useModeration();
  return useMemo(() => blockedPseudoSet(blocked), [blocked]);
}

/**
 * L'affordance « … » d'une ligne. Discrète par construction : glyphe gris, pas
 * de fond, pas de bordure — mais avec un `hitSlop` qui lui donne une cible
 * tactile réelle, et un nom accessible qui DIT de qui il s'agit (« Actions pour
 * K.Runner75 »), sans quoi VoiceOver n'annoncerait que « points de suspension ».
 */
export function PlayerActionsButton({ name, onPress }: { name: string; onPress: () => void }) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.playerActionsA11y, { name })}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.more, pressed && styles.pressed]}
    >
      <Text style={styles.moreGlyph}>···</Text>
    </Pressable>
  );
}

/** Les trois états de la feuille — jamais deux questions à la fois. */
type SheetStep = 'choice' | 'reason' | 'sent';

export interface PlayerModerationSheetProps {
  /** Joueur de la ligne tapée, ou `null` : la feuille est fermée. */
  pseudo: string | null;
  onClose: () => void;
}

export function PlayerModerationSheet({ pseudo, onClose }: PlayerModerationSheetProps) {
  const t = useT();
  const { session, configured } = useSession();
  const blocked = useBlockedPseudos();
  const [step, setStep] = useState<SheetStep>('choice');
  const [reason, setReason] = useState<ReportReason>('spam');

  // Chaque ouverture repart de la question 1 : sans ça, rouvrir la feuille sur
  // un AUTRE joueur la rouvrirait sur l'accusé de réception du précédent.
  useEffect(() => {
    if (pseudo !== null) {
      setStep('choice');
      setReason('spam');
    }
  }, [pseudo]);

  const target = pseudo === null ? null : blockTargetFor(pseudo);
  const actions = moderationActionsFor({
    pseudo: pseudo ?? '',
    isMe: false, // MA ligne ne peint pas l'affordance (cf. les deux surfaces).
    canReport: configured && session !== null,
    blocked,
  });

  const send = () => {
    const input = pseudo === null ? null : memberReportInput(pseudo, reason);
    if (input === null) return;
    reportContent(input);
    setStep('sent');
  };

  const doBlock = () => {
    if (target === null) return;
    blockMember(target);
    // Aucun accusé : la ligne d'où l'on vient devient « Joueur bloqué ».
    onClose();
  };

  const doUnblock = () => {
    if (target === null) return;
    unblockMember(target);
    onClose();
  };

  return (
    <Modal
      visible={pseudo !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Taper À CÔTÉ annule : une feuille de modération ne doit jamais piéger
            quelqu'un qui l'a ouverte par erreur. La zone de fermeture est un
            calque DERRIÈRE la feuille (et non un parent), sinon les taps dans
            la feuille remonteraient jusqu'à lui sur le web — react-native-web
            ne connaît pas le système de « responder » natif. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.sheetCloseA11y)}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.kicker}>{t(C.playerSheetTitle)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.sheetCloseA11y)}
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>
          {/* Le pseudo est le SUJET de la feuille : il s'enroule plutôt que
              d'être coupé (§A.9) — c'est justement sa troncature ailleurs qui
              rendait le formulaire de Confidentialité inutilisable.
              Il est montré EN CLAIR même pour un joueur déjà bloqué : on ne
              peut pas décider de débloquer quelqu'un dont on ne voit pas le
              nom. Même raison que la liste « Joueurs bloqués » de
              Confidentialité, qui l'affiche aussi. */}
          <Text style={styles.target}>{pseudo ?? ''}</Text>

          {step === 'choice' ? (
            <>
              {actions.includes('report') ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="alerte"
                  label={t(C.reportMemberLabel)}
                  accessibilityLabel={t(C.reportUserA11y, { name: pseudo ?? '' })}
                  onPress={() => setStep('reason')}
                />
              ) : null}
              {actions.includes('block') ? (
                <>
                  <Button
                    variant="ghost"
                    size="md"
                    icon="bouclier"
                    label={t(C.blockMemberLabel)}
                    accessibilityLabel={t(C.blockUserA11y, { name: pseudo ?? '' })}
                    onPress={doBlock}
                  />
                  {/* Ce que bloquer fait EXACTEMENT — dit AVANT le geste. */}
                  <Text style={styles.note}>{t(C.blockSheetNote)}</Text>
                </>
              ) : null}
              {actions.includes('unblock') ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="bouclier"
                  label={t(C.unblockMemberLabel)}
                  accessibilityLabel={t(C.unblockUserA11y, { name: pseudo ?? '' })}
                  onPress={doUnblock}
                />
              ) : null}
              {/* Hors session, « Signaler » n'est pas peint : on DIT pourquoi
                  plutôt que de laisser un manque inexpliqué. */}
              {actions.includes('report') ? null : (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>{t(CReg.reportSignedOutTitle)}</Text>
                  <Text style={styles.stateBody}>{t(CReg.reportSignedOutBody)}</Text>
                </View>
              )}
            </>
          ) : null}

          {step === 'reason' ? (
            <>
              <Text style={styles.miniLabel}>{t(C.reportReasonStep)}</Text>
              <ScrollView style={styles.reasons} contentContainerStyle={styles.reasonsInner}>
                {REPORT_REASONS.map((r) => {
                  const on = r.key === reason;
                  return (
                    <Pressable
                      key={r.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => setReason(r.key)}
                      style={({ pressed }) => [
                        styles.reason,
                        on && styles.reasonOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      {/* Le motif choisi porte SON aide sous lui : le joueur sait
                          ce qu'il déclare avant d'envoyer. */}
                      <Text style={[styles.reasonLabel, on && styles.reasonLabelOn]}>
                        {t(r.label)}
                      </Text>
                      {on ? <Text style={styles.reasonHint}>{t(r.hint)}</Text> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Button
                variant="ghost"
                size="md"
                icon="alerte"
                label={t(C.reportSendCta)}
                onPress={send}
              />
            </>
          ) : null}

          {step === 'sent' ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>{t(CReg.reportSentTitle)}</Text>
              <Text style={styles.stateBody}>
                {t(CReg.reportSentBody, { h: REPORT_REVIEW_HOURS })}
              </Text>
            </View>
          ) : null}

          <Button
            variant="ghost"
            size="md"
            label={t(step === 'sent' ? C.sheetCloseA11y : C.sheetCancel)}
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // ── L'affordance « … » de la ligne : grise, sans fond, cible tactile pleine ──
  more: {
    minWidth: sizes.touchTarget / 2,
    minHeight: sizes.touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `lineHeight` FIXE : le podium réserve une hauteur constante pour ce glyphe
  // (voir `podiumActions`), et une hauteur de ligne laissée à la plateforme
  // décalerait les marches entre une colonne qui porte l'action et une qui n'en
  // porte pas (ma propre ligne).
  moreGlyph: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 18, letterSpacing: 1 },

  // ── La feuille ──
  backdrop: {
    flex: 1,
    backgroundColor: withAlpha(colors.noir, 0.85),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.sm,
    maxHeight: '80%',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kicker: { ...typography.kicker, color: colors.gris, flex: 1 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  closeGlyph: { color: colors.gris, fontSize: 14 },
  // R3 (titre d'item) : le pseudo est le sujet de la feuille, pas un titre
  // d'écran — et il s'enroule, jamais de « … » sur une identité (§A.9).
  target: { ...typography.cardTitle, color: colors.blanc },
  note: { ...typography.meta, color: colors.gris },
  miniLabel: { ...typography.kicker, color: colors.gris },

  // ── Motifs : une colonne (les libellés ne sont jamais coupés, §A.9) ──
  reasons: { maxHeight: 260 },
  reasonsInner: { gap: spacing.xs },
  reason: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  // §C — la sélection est portée par la BORDURE **et** la couleur du texte :
  // jamais par la couleur seule, jamais par un aplat chartreuse sur un filtre.
  reasonOn: { borderColor: colors.chartreuse40 },
  reasonLabel: { ...typography.body, color: colors.gris },
  reasonLabelOn: { color: colors.blanc },
  reasonHint: { ...typography.meta, color: colors.gris },

  // ── État nommé (pas de compte / signalement envoyé) ──
  stateCard: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  stateTitle: { ...typography.itemTitle, color: colors.blanc },
  stateBody: { ...typography.meta, color: colors.gris },
});
