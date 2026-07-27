/**
 * GRYD — E25 « SÉCURITÉ », panneau ouvert PENDANT l'activité.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1219-1232.)
 *
 * Quatre fonctions et pas une de plus : prévenir un proche, appeler les secours
 * selon pays, arrêter l'activité, afficher les consignes. « Aucune fonction
 * sociale compétitive dans ce panneau » (l.1232) — on n'y parle donc ni de
 * territoire, ni de points, ni de crew, ni de rival.
 *
 * ═══ POURQUOI CE FICHIER SONDE AU LIEU DE SUPPOSER ══════════════════════════
 * Deux des quatre fonctions dépendent de capacités qui n'existent pas partout.
 * Elles sont MESURÉES à l'ouverture, jamais déduites d'un `Platform.OS` qui
 * parierait sur le comportement d'un appareil :
 *  · TÉLÉPHONER — `Linking.canOpenURL('tel:…')`. Deux sondes distinctes (numéro
 *    pré-rempli et composeur nu) parce que les plateformes ne traitent pas les
 *    deux pareil, et qu'un bouton qui ouvre un composeur vide sur un appareil
 *    qui n'en a pas serait mort ;
 *  · PARTAGER — la feuille système. Sur l'appareil, `Share.share` existe ; dans
 *    un navigateur, elle n'existe que si `navigator.share` est implémenté.
 *
 * ⚠ LA SEULE EXCEPTION AU « SONDER PLUTÔT QUE SUPPOSER », ET ELLE EST DANS LE
 *   BON SENS : sur le web, `Linking.canOpenURL` de React Native Web répond
 *   `true` à peu près à tout — c'est une APPARENCE, pas une capacité. On la
 *   ignore et on considère qu'un navigateur ne téléphone pas. Se fier à cette
 *   sonde-là peindrait précisément le bouton mort qu'on cherche à éviter.
 *
 * ═══ LE NUMÉRO NE SE DEVINE PAS ════════════════════════════════════════════
 * Le pays est résolu depuis la POSITION RÉELLE de la sortie (`country.ts`), une
 * seule fois, à l'ouverture. Inconnu ⇒ aucun numéro pré-rempli (`emergency.ts`).
 * Voir la note de `country.ts` sur le cas hors ligne.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EVENTS,
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { C } from '../../../i18n/catalog/securite';
import { useT } from '../../../i18n/store';
import { track } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
import { Icon } from '../../../ui/Icon';
import type { CoveragePoint } from '../defense/coverage';
import { countryIsoAt } from './country';
import { emergencyPlan, emergencyUrl, type DialCapabilities } from './emergency';

/** Aucune capacité prouvée tant que les sondes n'ont pas répondu. */
const NO_DIAL: DialCapabilities = { canDialNumber: false, canOpenDialer: false };

/** La feuille système existe-t-elle VRAIMENT sur cette plateforme ? */
function shareIsAvailable(): boolean {
  if (Platform.OS !== 'web') return true;
  const nav = (globalThis as { navigator?: { share?: unknown } }).navigator;
  return typeof nav?.share === 'function';
}

export interface SafetyPanelProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  /**
   * « Arrêter l'activité » — ouvre la feuille de fin E26 (temps, distance,
   * objectif, `TERMINER ET ANALYSER` / `REPRENDRE`). On ne termine PAS d'ici en
   * un tap : `stopNote` promet que rien n'est perdu, et c'est E26 qui le tient.
   */
  readonly onStop: () => void;
  /**
   * Position mesurée de la sortie — sert UNIQUEMENT à résoudre le pays du
   * numéro de secours. Aucune coordonnée ne quitte l'app par ailleurs.
   */
  readonly here: CoveragePoint | null;
}

export function SafetyPanel({ visible, onClose, onStop, here }: SafetyPanelProps) {
  const t = useT();
  const [dial, setDial] = useState<DialCapabilities>(NO_DIAL);
  const [countryIso, setCountryIso] = useState<string | null>(null);
  const canShare = shareIsAvailable();

  // ── Sondes de capacité + pays : à l'OUVERTURE, une seule fois ─────────────
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    track(EVENTS.safetyPanelOpened);
    void (async () => {
      if (Platform.OS === 'web') {
        // Voir l'en-tête : la sonde ment sur le web, on ne la croit pas.
        if (alive) setDial(NO_DIAL);
      } else {
        const [withNumber, bare] = await Promise.all([
          Linking.canOpenURL('tel:112').catch(() => false),
          Linking.canOpenURL('tel:').catch(() => false),
        ]);
        if (alive) setDial({ canDialNumber: withNumber, canOpenDialer: bare });
      }
      if (here !== null) {
        const iso = await countryIsoAt(here);
        if (alive) setCountryIso(iso);
      }
    })();
    return () => {
      alive = false;
    };
    // `here` bouge à chaque fix ; la sonde n'a besoin que de la position au
    // moment de l'ouverture — la relancer à chaque seconde serait une requête
    // réseau par seconde, en pleine course.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const plan = emergencyPlan(countryIso, dial);

  const onEmergency = useCallback(() => {
    const url = emergencyUrl(plan);
    if (url === null) return;
    haptics.light();
    // 'emergency' mesure L'OUVERTURE DU COMPOSEUR, jamais un appel : l'app n'a
    // aucun moyen de savoir si quelqu'un a décroché, et prétendre le contraire
    // serait la pire statistique du produit.
    track(EVENTS.safetyActionTapped, { action: 'emergency' });
    void Linking.openURL(url);
  }, [plan]);

  const onNotify = useCallback(() => {
    if (!canShare) return;
    haptics.light();
    track(EVENTS.safetyActionTapped, { action: 'share' });
    const message = t(C.notifyBody);
    if (Platform.OS === 'web') {
      const nav = (globalThis as { navigator?: { share?: (d: { text: string }) => Promise<void> } })
        .navigator;
      void nav?.share?.({ text: message }).catch(() => undefined);
      return;
    }
    // Le message ne contient AUCUNE position (cf. `notifyNoTracking`) : c'est
    // le texte que l'utilisateur voit, envoyé par lui, à qui il veut.
    void Share.share({ message }).catch(() => undefined);
  }, [canShare, t]);

  const onStopPress = useCallback(() => {
    haptics.light();
    track(EVENTS.safetyActionTapped, { action: 'stop' });
    onClose();
    onStop();
  }, [onClose, onStop]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Icon name="bouclier" size={iconSizes.md} color={colors.blanc} />
            <Text style={styles.title}>{t(C.title)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.closeA11y)}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Icon name="fermer" size={iconSizes.sm} color={colors.gris} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
            {/* ── 1. Appeler les secours — en PREMIER : c'est ce qu'on vient
                    chercher ici, et l'ordre de lecture doit le refléter. ──── */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>{t(C.emergencyTitle)}</Text>
              {plan.kind === 'unavailable' ? (
                <Text style={styles.blockBody}>{t(C.emergencyUnavailable)}</Text>
              ) : (
                <>
                  <Text style={styles.blockBody}>
                    {plan.kind === 'dial' ? t(C.emergencyNote) : t(C.emergencyNoNumber)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      plan.kind === 'dial'
                        ? t(C.emergencyDial, { number: plan.number })
                        : t(C.emergencyTitle)
                    }
                    onPress={onEmergency}
                    style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.callBtnText} numberOfLines={1}>
                      {plan.kind === 'dial'
                        ? t(C.emergencyDial, { number: plan.number })
                        : t(C.emergencyTitle)}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* ── 2. Prévenir un proche ──────────────────────────────────── */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>{t(C.notifyTitle)}</Text>
              {canShare ? (
                <>
                  <Text style={styles.blockBody}>{t(C.notifyNoTracking)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(C.notifyTitle)}
                    onPress={onNotify}
                    style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                  >
                    <Icon name="partage" size={iconSizes.sm} color={colors.blanc} />
                    <Text style={styles.ghostBtnText} numberOfLines={1}>
                      {t(C.notifyTitle)}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.blockBody}>{t(C.notifyUnavailable)}</Text>
              )}
            </View>

            {/* ── 3. Arrêter l'activité — toujours disponible ─────────────── */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>{t(C.stopTitle)}</Text>
              <Text style={styles.blockBody}>{t(C.stopNote)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.stopTitle)}
                onPress={onStopPress}
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              >
                <View style={styles.stopSquare} />
                <Text style={styles.ghostBtnText} numberOfLines={1}>
                  {t(C.stopTitle)}
                </Text>
              </Pressable>
            </View>

            {/* ── 4. Consignes — texte statique, toujours disponible ──────── */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>{t(C.guidelinesTitle)}</Text>
              <Text style={styles.blockBody}>{t(C.guidelineStay)}</Text>
              <Text style={styles.blockBody}>{t(C.guidelineCall)}</Text>
              <Text style={styles.blockBody}>{t(C.guidelineBattery)}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  backdrop: { flex: 1, backgroundColor: withAlpha(colors.noir, 0.85), justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.sm,
    maxHeight: '85%',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1, color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800' },
  close: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 0 },
  scrollInner: { gap: spacing.md, paddingBottom: spacing.xs },

  // Blocs À PLAT : jamais de card dans une card (§A). Un titre, une phrase, au
  // plus une action — c'est tout ce qu'on lit dans ce contexte.
  block: { gap: 6 },
  blockTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  blockBody: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },

  /**
   * L'appel aux secours est la seule action MISE EN AVANT du panneau. Elle
   * n'est PAS chartreuse : la chartreuse est la couleur du gain et de l'action
   * de jeu (§C), et appeler les secours n'est ni l'un ni l'autre. Contour
   * blanc franc, plein contraste, cible ≥ 44 px.
   */
  callBtn: {
    minHeight: sizes.buttonMd,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.blanc,
    backgroundColor: withAlpha(colors.blanc, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  callBtnText: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '900' },

  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.md,
  },
  ghostBtnText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  stopSquare: { width: 12, height: 12, borderRadius: 2, backgroundColor: gameColors.danger },
});
