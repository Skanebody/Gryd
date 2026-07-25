/**
 * GRYD — E06 PRÉFLIGHT : compte à rebours 3-2-1 SOBRE (planche Vague 1, affiné).
 * Rendu par course-live quand le gate vaut `kind:'preflight'` : l'acquisition
 * GPS a RÉUSSI (permission + services), la course n'a pas encore démarré. C'est
 * la FIN du décompte qui appelle `preflight.confirmStart()` — le tracker
 * (horloge + capteurs) n'est construit qu'À CE MOMENT. Conséquence STRUCTURELLE :
 * le décompte ne compte aucune seconde de course, et une annulation ne laisse
 * aucune course fantôme (rien n'a été bâti).
 *
 * ─── POURQUOI PAS DE CARTE DE STATUT (retour fondateur) ──────────────────────
 * Le préflight ne s'affiche QUE si l'acquisition a réussi : le décompte EST donc
 * l'affirmation « prêt », inutile de le redire. Surtout, on n'affiche PAS ici de
 * « signal GPS faible / reste dehors » : un signal faible en intérieur est NORMAL
 * et universel à tous les appareils — l'annoncer comme un échec est anxiogène et
 * faux. Et pré-course il n'existe AUCUN vrai fix : afficher des « barres » de
 * réseau ici serait inventé. La FORCE du signal (antenne à barres, réelle) vit en
 * E07, là où des fixes continus la rendent honnête. Les états BLOQUANTS (refus,
 * services coupés) n'atteignent pas le préflight : RunUnavailable les porte.
 *
 * ─── FRICTION ────────────────────────────────────────────────────────────────
 * Le GO a déjà eu lieu à E05 (glisser-pour-courir). Le décompte démarre donc TOUT
 * SEUL (zéro tap de plus, GO-first AMENDEMENT-14) ; seul « Annuler » l'interrompt.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';
import type { PreflightApi } from './gateTypes';
import { DECLARED_START_ACTIVITY } from './runActivity';
import { EVENTS, track } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
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

  // Palier courant : démarre à 0 (auto-avance — le GO a eu lieu à E05). `null`
  // seulement après une annulation (arrête le moteur).
  const [stepIdx, setStepIdx] = useState<number | null>(0);
  // Anti double-feu : haptique une fois par palier (Strict Mode double-invoque).
  const firedRef = useRef<Set<number>>(new Set());
  // confirmStart n'est appelé qu'UNE fois (idempotent aussi côté cœur).
  const startedRef = useRef(false);
  // preflight lu via ref : le moteur ne dépend que de `stepIdx`.
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
        // E14 — LE DÉPART DÉCLARE SA DISCIPLINE. Tous les chemins qui lancent
        // une course (GO de la Carte, planificateur d'itinéraire, ouverture
        // directe de `/course-live`) traversent ce préflight : c'est ici, et
        // nulle part ailleurs, que la nature de l'effort enregistré est dite.
        // Elle vaut `run` pour tout le monde tant que le vélo n'existe pas sous
        // l'écran — voir `runActivity.ts` pour l'arbitrage, et `lib/flags.ts`
        // pour les quatre chantiers qui manquent. Le paramètre est OBLIGATOIRE :
        // aucune course ne peut plus partir sans que quelqu'un l'ait déclarée.
        preflightRef.current.confirmStart(DECLARED_START_ACTIVITY);
      }
      return;
    }
    const id = setTimeout(
      () => setStepIdx((i) => (i === null ? null : i + 1)),
      COUNTDOWN_STEP_MS,
    );
    return () => clearTimeout(id);
  }, [stepIdx]);

  const cancel = () => {
    setStepIdx(null); // stoppe le moteur (aucun GO ne partira)
    preflight.cancel();
    router.back(); // retour à E05
  };

  const digit = stepIdx != null ? STEPS[stepIdx] : null;
  // Annuler DISPARAÎT sur le dernier palier (« GO ») : au GO, confirmStart() est
  // déjà lancé (async) et laisser Annuler ferait fuir un watch GPS + une course
  // fantôme. Un back MATÉRIEL pendant GO est rattrapé côté cœur (mountedRef).
  const canCancel = stepIdx != null && stepIdx < STEPS.length - 1;

  return (
    <View
      accessibilityLabel={t(C.a11yPreflight)}
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      {/* Le chiffre géant, seul focal. Fond noir plein (pas une 2ᵉ MapLibre). */}
      <View style={styles.countZone}>
        {digit != null ? <CountdownDigit key={digit} label={digit} /> : null}
      </View>

      <View style={styles.actions}>
        {canCancel ? (
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
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.75 },

  countZone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  digit: {
    color: colors.chartreuse,
    fontFamily: fonts.display,
    fontSize: 140,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },

  actions: { minHeight: 52 },
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
