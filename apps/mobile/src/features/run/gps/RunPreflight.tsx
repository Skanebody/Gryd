/**
 * GRYD — E06 PRÉFLIGHT + compte à rebours (planche Vague 1). Rendu par
 * course-live quand le gate vaut `kind:'preflight'` : l'acquisition GPS a
 * RÉUSSI (permission + services), mais la course n'a pas encore démarré. On
 * confirme les conditions puis on lance un 3-2-1 annulable ; c'est SA fin qui
 * appelle `preflight.confirmStart()` — le tracker (horloge + capteurs) n'est
 * construit qu'À CE MOMENT. Conséquence STRUCTURELLE : le décompte ne compte
 * aucune seconde de course, et une annulation ne laisse aucune course fantôme.
 *
 * ─── HONNÊTETÉ (constitution) ────────────────────────────────────────────────
 * Aucune ligne d'état fabriquée. On n'affiche QUE ce que la plateforme sait :
 *   • GPS — accordé + services on = « Prêt » (chartreuse) ; position grossière
 *     ANDROID (permission « coarse », connue dès l'octroi) = « approximative »
 *     (ambre, jamais rouge) + « Ouvrir les Réglages » là où ils existent. iOS :
 *     la précision réduite n'est PAS lisible au préflight — elle est signalée
 *     pendant la course (bannière approxLocation) ; iOS reste donc « Prêt » ici.
 * DÉLIBÉRÉMENT ABSENTS (aucune source réelle → jamais faux) : la « Batterie
 * 82 % » de la planche (expo-battery non installé) et « Détection d'activité »
 * (aucun signal de classification pré-course câblé). Ils reviendront le jour où
 * un vrai capteur les alimente. Le vrai signal FAIBLE (pas encore de fix) se dit
 * honnêtement une étape plus loin, en E07 (« Recherche GPS… »).
 *
 * ─── FRICTION (arbitrage fondateur) ──────────────────────────────────────────
 * Le GO a déjà eu lieu à E05 (glisser-pour-courir). Donc, tout vert, le compte à
 * rebours démarre TOUT SEUL (zéro tap de plus — GO-first, AMENDEMENT-14) ; le tap
 * explicite « Commencer quand même » ne survit QUE si la position est
 * approximative — un avertissement réel n'est jamais auto-sauté. Les états
 * BLOQUANTS (refus, services coupés, pas de capteur) n'atteignent pas le
 * préflight : le gate renvoie `unavailable` et l'écran RunUnavailable les porte.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, gameColors, iconSizes, radii, spacing } from '@klaim/shared';
import type { PreflightApi } from './gateTypes';
import { EVENTS, track } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
import { Icon } from '../../../ui/Icon';
import { useReveal } from '../../../ui/game/anim';
import { C } from '../../../i18n/catalog/courseLive';
import { useT } from '../../../i18n/store';

/** Durée d'un palier du compte à rebours (présentation, PAS une règle de jeu). */
const COUNTDOWN_STEP_MS = 1000;
/** Les paliers affichés : 3 → 2 → 1 → GO (« GO » invariant, jamais traduit). */
const STEPS = ['3', '2', '1', 'GO'] as const;
/** Haptique CROISSANTE par palier (crescendo), puis confirmation à « GO ». */
const STEP_HAPTIC = [haptics.light, haptics.medium, haptics.heavy, haptics.success];

/** Un chiffre du décompte, ré-animé à chaque palier (re-key). `useReveal`
 *  bascule tout seul en fondu sans zoom quand « Réduire les animations ». */
function CountdownDigit({ label }: { label: string }) {
  const { opacity, scale } = useReveal(true);
  return (
    <Animated.Text style={[styles.digit, { opacity, transform: [{ scale }] }]}>
      {label}
    </Animated.Text>
  );
}

export function RunPreflight({ preflight }: { preflight: PreflightApi }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const ready = preflight.status === 'ready';

  // Palier courant du décompte : `null` = pas (encore) lancé. Tout vert → 0 dès
  // le montage (auto-avance) ; approximatif → `null` jusqu'au tap explicite.
  const [stepIdx, setStepIdx] = useState<number | null>(ready ? 0 : null);
  // Anti double-feu : haptique une fois par palier (Strict Mode double-invoque).
  const firedRef = useRef<Set<number>>(new Set());
  // confirmStart n'est appelé qu'UNE fois (idempotent aussi côté cœur).
  const startedRef = useRef(false);
  // preflight lu via ref : le moteur du décompte ne dépend que de `stepIdx`,
  // jamais de l'identité de l'objet preflight (aucun re-déclenchement parasite).
  const preflightRef = useRef(preflight);
  preflightRef.current = preflight;

  useEffect(() => {
    track(EVENTS.runPreflightViewed, {
      readiness: preflight.status,
      platform: preflight.platform,
    });
  }, [preflight.status, preflight.platform]);

  // Moteur du compte à rebours : un palier par seconde, haptique croissante,
  // et sur le DERNIER palier (« GO ») → confirmStart() (le vrai départ).
  useEffect(() => {
    if (stepIdx === null) return;
    if (!firedRef.current.has(stepIdx)) {
      firedRef.current.add(stepIdx);
      STEP_HAPTIC[stepIdx]?.();
    }
    if (stepIdx >= STEPS.length - 1) {
      if (!startedRef.current) {
        startedRef.current = true;
        preflightRef.current.confirmStart();
      }
      return;
    }
    const id = setTimeout(
      () => setStepIdx((i) => (i === null ? null : i + 1)),
      COUNTDOWN_STEP_MS,
    );
    return () => clearTimeout(id);
  }, [stepIdx]);

  const startCountdown = () => {
    haptics.medium();
    setStepIdx(0);
  };
  const cancel = () => {
    setStepIdx(null); // stoppe le moteur (aucun GO ne partira)
    preflight.cancel();
    router.back(); // retour à E05
  };
  const openSettings = () => {
    haptics.light();
    preflight.openSettings?.();
  };

  const counting = stepIdx !== null;
  const digit = stepIdx != null ? STEPS[stepIdx] : null;
  // Annuler DISPARAÎT sur le dernier palier (« GO ») : au GO, confirmStart() est
  // déjà lancé (async) et laisser Annuler pendant cette fenêtre ferait fuir un
  // watch GPS + écrire une course fantôme. Un back MATÉRIEL pendant GO est, lui,
  // rattrapé côté cœur (garde mountedRef dans confirmStart).
  const canCancel = stepIdx != null && stepIdx < STEPS.length - 1;
  // Prêt = CHARTREUSE (préférence fondateur + planche « chartreuse = statut + CTA ») ;
  // dégradé = ambre. Sur fond noir, contraste chartreuse largement suffisant.
  const accent = ready ? colors.chartreuse : gameColors.warn;

  return (
    <View
      accessibilityLabel={t(C.a11yPreflight)}
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      {/* Statut GLOBAL focal, lu avant les lignes (le CTA/décompte confirme, il
          n'informe pas). Le texte diffère selon l'état (jamais la couleur seule). */}
      <View style={styles.head}>
        <Text style={[styles.headline, { color: accent }]}>
          {t(ready ? C.preflightReadyTitle : C.preflightApproxTitle)}
        </Text>

        {/* Ligne GPS — icône + libellé + couleur (jamais couleur seule, §C). */}
        <View style={styles.statusLine}>
          <Icon name="gps" size={iconSizes.md} color={accent} />
          <Text
            style={[styles.statusLabel, { color: ready ? colors.blanc : gameColors.warn }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {t(ready ? C.gpsReady : C.gpsApproxLine)}
          </Text>
        </View>

        {/* Réglages : uniquement là où ils existent (openSettings non-null) —
            jamais un bouton mort (navigateur : pas de réglages système). */}
        {!ready && preflight.openSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.noGpsSettingsCta)}
            onPress={openSettings}
            style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}
          >
            <Text style={styles.settingsLabel}>{t(C.noGpsSettingsCta)}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Zone centrale : le chiffre géant du décompte (quand il tourne). */}
      <View style={styles.countZone}>
        {digit != null ? <CountdownDigit key={digit} label={digit} /> : null}
      </View>

      {/* Bas : Annuler (pendant le décompte) OU « Commencer quand même »
          (approximatif, tap explicite = l'unique CTA chartreuse). */}
      <View style={styles.actions}>
        {!counting ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.ctaStartAnyway)}
            onPress={startCountdown}
            style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
          >
            <Text style={styles.startLabel} numberOfLines={1} adjustsFontSizeToFit>
              {t(C.ctaStartAnyway)}
            </Text>
          </Pressable>
        ) : canCancel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.a11yCancelCountdown)}
            onPress={cancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          >
            <Text style={styles.cancelLabel} numberOfLines={1} adjustsFontSizeToFit>
              {t(C.countdownCancel)}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond carbone plein (pas une 2ᵉ instance MapLibre — l'élan n'est pas rompu,
  // et on évite le piège « carte noire en capture headless »).
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.75 },

  head: { alignItems: 'center', gap: spacing.md },
  headline: {
    fontFamily: fonts.display,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  statusLabel: {
    flexShrink: 1,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  settingsLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  settingsLabel: {
    color: colors.gris,
    fontFamily: fonts.textMedium,
    fontSize: fontSizes.sm,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  countZone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  digit: {
    color: colors.chartreuse,
    fontFamily: fonts.display,
    fontSize: 120,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },

  actions: { gap: spacing.sm },
  // CTA chartreuse (approximatif) — 56 pt, libellé NOIR (jamais chartreuse sur clair).
  startBtn: {
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  startLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '800' },
  // Annuler — secondaire sobre (aucune chartreuse pendant le décompte).
  cancelBtn: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
});
