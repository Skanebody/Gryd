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
 *
 * ─── E14 : LA DISCIPLINE SE LIT ICI, ET NULLE PART AILLEURS (26/07/2026) ─────
 * Depuis que le vélo s'enregistre vraiment, cet écran porte UNE information de
 * plus, et elle est structurelle : CE QUI VA ÊTRE ENREGISTRÉ. Le chemin qui a
 * lancé la sortie l'a déclarée (paramètre d'URL `activity`) ; le préflight
 * l'AFFICHE en toutes lettres pendant que le décompte tourne, et laisse la
 * CORRIGER d'un tap. C'est exactement la différence entre informer et décider
 * en silence — la faute que le correctif du 25/07 a payée (une lentille de
 * carte oubliée transformait une vraie course à pied en sortie vélo).
 *
 * Corriger REDÉMARRE le décompte à 3. Ce n'est pas une politesse : à 1 seconde
 * du GO, une correction qui partirait aussitôt donnerait le sentiment d'un
 * choix volé — et il n'y a rien à perdre à attendre trois secondes de plus,
 * puisque le tracker n'existe pas encore.
 *
 * §A — le contrôle N'EST PAS un CTA : fond carbone, filet gris, aucune
 * chartreuse. La seule chartreuse de l'écran reste le chiffre du décompte.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACTIVITIES,
  type Activity,
  colors,
  fonts,
  fontSizes,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import type { PreflightApi } from './gateTypes';
import { EVENTS, track } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
import { useReveal } from '../../../ui/game/anim';
// Table de LIBELLÉS, pas de préférence : `activityLens` héberge le couple
// invariant RUN / BIKE que le commutateur de la Carte affiche déjà. On le
// réutilise pour que le joueur reconnaisse le même mot ici — rien de ce qui est
// importé ne LIT le réglage de la carte (garde-fou de `runActivity.test.ts`).
import { ACTIVITY_LABELS } from '../../../ui/activityLens';
import { C } from '../../../i18n/catalog/courseLive';
import { ACTIVITY_NAME } from '../../../i18n/catalog/runGps';
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

export function RunPreflight({
  preflight,
  /**
   * Discipline DÉCLARÉE par le chemin qui a lancé la sortie (paramètre d'URL
   * `activity`, lu par `app/course-live.tsx`). Elle n'est qu'un POINT DE
   * DÉPART : ce que le joueur voit et confirme ici fait foi.
   */
  requestedActivity,
}: {
  preflight: PreflightApi;
  requestedActivity: Activity;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();

  // Palier courant : démarre à 0 (auto-avance — le GO a eu lieu à E05). `null`
  // seulement après une annulation (arrête le moteur).
  const [stepIdx, setStepIdx] = useState<number | null>(0);
  /**
   * Compteur de RELANCE du décompte. Sans lui, corriger la discipline pendant
   * le palier 0 appellerait `setStepIdx(0)` sur une valeur inchangée : React
   * couperait le re-rendu et le minuteur déjà en vol continuerait comme si de
   * rien n'était — la correction serait affichée sans que le temps de la lire
   * soit rendu. Il fait partie des dépendances de l'effet, donc chaque
   * correction relance VRAIMENT les trois secondes.
   */
  const [countdownRun, setCountdownRun] = useState(0);
  /** Discipline qui sera DÉCLARÉE au GO — corrigeable tant qu'il n'a pas eu lieu. */
  const [activity, setActivity] = useState<Activity>(requestedActivity);
  // Anti double-feu : haptique une fois par palier (Strict Mode double-invoque).
  const firedRef = useRef<Set<number>>(new Set());
  // confirmStart n'est appelé qu'UNE fois (idempotent aussi côté cœur).
  const startedRef = useRef(false);
  // preflight lu via ref : le moteur ne dépend que du décompte.
  const preflightRef = useRef(preflight);
  preflightRef.current = preflight;
  // Idem pour la discipline : le moteur lit la DERNIÈRE valeur au moment du GO,
  // sans que la corriger ne devienne une dépendance de l'effet (elle relance
  // déjà le décompte par `countdownRun`).
  const activityRef = useRef(activity);
  activityRef.current = activity;

  useEffect(() => {
    track(EVENTS.runPreflightViewed, {
      readiness: preflight.status,
      platform: preflight.platform,
      // Ce que le chemin de départ a DEMANDÉ — à comparer plus tard avec la
      // discipline réellement partie (`run_start`) : l'écart entre les deux
      // mesure le nombre de corrections, donc la justesse des chemins d'entrée.
      requested: requestedActivity,
    });
  }, [preflight.status, preflight.platform, requestedActivity]);

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
        // une sortie (GO de la Carte, planificateur d'itinéraire, ouverture
        // directe de `/course-live`) traversent ce préflight : c'est ici, et
        // nulle part ailleurs, que la nature de l'effort enregistré est dite —
        // et elle vient d'être MONTRÉE au joueur trois secondes durant. Le
        // paramètre est OBLIGATOIRE : aucune sortie ne peut partir sans que
        // quelqu'un l'ait déclarée.
        preflightRef.current.confirmStart(activityRef.current);
      }
      return;
    }
    const id = setTimeout(
      () => setStepIdx((i) => (i === null ? null : i + 1)),
      COUNTDOWN_STEP_MS,
    );
    return () => clearTimeout(id);
  }, [stepIdx, countdownRun]);

  /**
   * Correction de la discipline. Impossible une fois le GO parti (le tracker
   * existe : une sortie ne change JAMAIS de monde en chemin) et impossible
   * après une annulation (plus aucun décompte à relancer).
   */
  const declare = (next: Activity) => {
    if (startedRef.current || stepIdx === null || next === activity) return;
    setActivity(next);
    firedRef.current.clear(); // le crescendo se rejoue depuis le début
    setStepIdx(0);
    setCountdownRun((n) => n + 1);
  };

  const cancel = () => {
    setStepIdx(null); // stoppe le moteur (aucun GO ne partira)
    preflight.cancel();
    router.back(); // retour à E05
  };

  const digit = stepIdx != null ? STEPS[stepIdx] : null;
  /**
   * AVANT le GO. Annuler DISPARAÎT au dernier palier : confirmStart() y est déjà
   * lancé (async) et laisser Annuler ferait fuir un watch GPS + une course
   * fantôme. Un back MATÉRIEL pendant GO est rattrapé côté cœur (mountedRef).
   *
   * La déclaration de discipline suit la MÊME frontière, pour une raison de
   * charte : passé le GO, `declare` refuse (le tracker existe, une sortie ne
   * change pas de monde en chemin) — la laisser tappable peindrait une action
   * qui échoue TOUJOURS, et `confirmStart` peut attendre plusieurs centaines de
   * millisecondes sur certains appareils. Elle reste AFFICHÉE, en revanche :
   * c'est la dernière chose que le joueur lit avant que ça commence.
   */
  const beforeGo = stepIdx != null && stepIdx < STEPS.length - 1;

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

      {/* CE QUI VA ÊTRE ENREGISTRÉ — subordonné au chiffre, jamais un CTA. */}
      <ActivityDeclaration activity={activity} onDeclare={beforeGo ? declare : null} />

      <View style={styles.actions}>
        {beforeGo ? (
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

/**
 * LA DÉCLARATION DE DISCIPLINE — deux segments, les deux VISIBLES.
 *
 * Pourquoi pas une bascule à un seul bouton : un contrôle qui n'affiche que
 * l'état courant n'apprend rien à qui ne l'a jamais vu, et surtout il ne dit
 * pas qu'une AUTRE discipline existe. Ici l'option non retenue est lisible
 * avant le tap — c'est ce qui empêche un cycliste de partir en « RUN » sans
 * comprendre qu'il pouvait dire autre chose.
 *
 * Les libellés sont les INVARIANTS du commutateur de la Carte (RUN / BIKE,
 * `ui/activityLens`) : le même mot au même endroit du cerveau. Le sens, lui,
 * est porté par la ligne au-dessus, traduite dans les cinq langues, et par le
 * libellé d'accessibilité, qui nomme la discipline en toutes lettres.
 */
function ActivityDeclaration({
  activity,
  onDeclare,
}: {
  activity: Activity;
  /** `null` = le GO est parti (ou le décompte annulé) : plus rien n'est tappable. */
  onDeclare: ((next: Activity) => void) | null;
}) {
  const t = useT();
  return (
    <View style={styles.declareWrap}>
      <Text style={styles.declareKicker} numberOfLines={1} adjustsFontSizeToFit>
        {t(C.preflightActivityKicker)}
      </Text>
      <View style={styles.declareCapsule}>
        {ACTIVITIES.map((a) => {
          const selected = a === activity;
          // §A9 : jamais tronqué. Deux mots courts et invariants, et
          // `adjustsFontSizeToFit` pour les tailles système agrandies.
          const label = (
            <Text
              style={[styles.declareLabel, selected && styles.declareLabelOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {ACTIVITY_LABELS[a]}
            </Text>
          );
          const box = [styles.declareSeg, selected && styles.declareSegOn];
          // Après le GO, le même bloc reste AFFICHÉ (c'est la dernière chose que
          // le joueur lit) mais cesse d'être un contrôle : le rendre en `View`
          // évite à la fois le bouton mort (`declare` refuserait) et le saut de
          // mise en page qu'une disparition provoquerait à l'instant du départ.
          return onDeclare === null ? (
            <View key={a} style={box}>
              {label}
            </View>
          ) : (
            <Pressable
              key={a}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t(C.a11yPreflightActivity, { name: t(ACTIVITY_NAME[a]) })}
              onPress={() => {
                haptics.light();
                onDeclare(a);
              }}
              style={({ pressed }) => [...box, pressed && styles.pressed]}
            >
              {label}
            </Pressable>
          );
        })}
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

  // ── Déclaration de discipline : sobre, subordonnée au chiffre ─────────────
  declareWrap: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  declareKicker: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  // Même grammaire que la capsule du commutateur E14 : un contenant arrondi,
  // fond carbone, filet gris. Aucune chartreuse — ce n'est pas le CTA (§A4).
  declareCapsule: {
    flexDirection: 'row',
    backgroundColor: colors.carbone,
    borderRadius: radii.btn,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 3,
  },
  declareSeg: {
    /**
     * PLANCHER TACTILE (§A), pas une valeur d'esthétique. Ce segment a été livré
     * à 40 pt — sous le plancher de 44. Ce n'est pas un contrôle comme un autre :
     * il porte TOUTE la garantie d'honnêteté du départ (« ce qui va être
     * enregistré, corrigeable d'un tap »), il n'est disponible que trois
     * secondes, et il est visé dehors, en mouvement, parfois avec des gants. Le
     * rater, c'est partir dans la mauvaise discipline. On lit donc le token —
     * `sizes.touchTarget` — plutôt que d'écrire 44 : le plancher du projet a une
     * source unique, et un chiffre recopié finit par diverger d'elle.
     */
    minHeight: sizes.touchTarget,
    minWidth: 104,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // L'actif est FRANC (surface surélevée + liseré), l'inactif nettement
  // secondaire — la couleur du texte redouble le fond, jamais elle seule (§C).
  declareSegOn: {
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.blanc22,
  },
  declareLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 1.2 },
  declareLabelOn: { color: colors.blanc },

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
