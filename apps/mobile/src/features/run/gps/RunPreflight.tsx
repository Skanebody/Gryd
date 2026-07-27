/**
 * GRYD — E19 « ACQUISITION GPS / PRÊT » (`/activity/ready`, spec produit
 * l.1088-1106), qui absorbe l'ancien préflight E06 (compte à rebours 3-2-1).
 * Rendu par course-live quand le gate vaut `kind:'preflight'` : la permission
 * a été accordée et les services sont actifs, la course n'a pas encore démarré.
 * C'est la FIN du décompte qui appelle `preflight.confirmStart()` — le tracker
 * (horloge + capteurs) n'est construit qu'À CE MOMENT. Conséquence STRUCTURELLE :
 * le décompte ne compte aucune seconde de course, et une annulation ne laisse
 * aucune course fantôme (rien n'a été bâti).
 *
 * ─── DEUX PHASES, DEUX DÉCISIONS DISTINCTES (§A1) ───────────────────────────
 *  1. ACQUISITION — l'anneau de précision mesure le signal RÉEL et l'écran
 *     n'offre un départ que lorsqu'il a le droit de le promettre ;
 *  2. DÉCOMPTE — 3-2-1, puis le vrai départ.
 *
 * ─── CE QUI A CHANGÉ LE 27/07/2026, ET POURQUOI ─────────────────────────────
 * L'écran affichait UNIQUEMENT le décompte, et son ancien docblock défendait ce
 * choix ainsi : « pré-course il n'existe AUCUN vrai fix, afficher un signal ici
 * serait inventé ». La prémisse était fausse. Aucun fix n'existait parce que
 * PERSONNE N'EN DEMANDAIT : rien n'ouvrait le capteur entre l'acquisition de la
 * permission et le départ. C'est ce que `preflightProbe` corrige — un flux
 * `expo-location` / `navigator.geolocation` ouvert pendant cette phase, dont on
 * lit `coords.accuracy` BRUT.
 *
 * La conclusion, elle, est conservée mot pour mot et devient une contrainte de
 * ce fichier : tant qu'aucune mesure n'est arrivée, l'anneau est NEUTRE et ne
 * peint aucune bande. Un anneau rouge à l'ouverture affirmerait un mauvais GPS
 * sur un chiffre qui n'existe pas ; un anneau vert affirmerait l'inverse avec la
 * même absence de preuve. Toute la logique de cette frontière est PURE et testée
 * (`preflightSignal.ts` / `.test.ts`), l'écran ne fait que la peindre.
 *
 * Rien n'est lissé : la valeur affichée est celle du DERNIER fix rendu par le
 * capteur. Le lissage (médiane glissante) appartient au moteur de trace, après
 * le départ — pas à une promesse faite avant.
 *
 * ─── FRICTION : POURQUOI UN TAP EST REVENU ──────────────────────────────────
 * AMENDEMENT-14 (GO-first) faisait démarrer le décompte tout seul. La spec
 * produit du 26/07, qui prime sur les amendements antérieurs (CLAUDE.md,
 * autorité 0b), demande explicitement un bouton `DÉMARRER MAINTENANT`
 * « lorsque le seuil est acceptable ». Le tap n'est donc pas une question de
 * plus posée au joueur : c'est le seul instant où l'app peut dire « c'est
 * propre, vas-y » en s'appuyant sur une mesure. Le GO d'E05 reste le GO ; ici on
 * attend le satellite, et l'attente est rendue lisible au lieu d'être subie.
 *
 * « MAINTENANT » n'est pas démenti par le décompte qui suit : il est visible,
 * annulable, et sa fin est le départ réel — c'est le rituel de départ, pas une
 * file d'attente.
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  ACTIVITIES,
  type Activity,
  colors,
  fonts,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import type { PreflightApi } from './gateTypes';
import { subscribePreflightAccuracy } from './preflightProbe';
import {
  type PreflightRing,
  type PreflightSignal,
  accuracyDigits,
  preflightReadiness,
  probeTakingLong,
  signalGrade,
} from './preflightSignal';
import { EVENTS, track } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
import { useReduceMotion, useReveal } from '../../../ui/game/anim';
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

// ─── L'ANNEAU DE PRÉCISION (spec l.1094) ────────────────────────────────────

/** Diamètre et épaisseur du trait — présentation pure. */
const RING_SIZE = 184;
const RING_STROKE = 8;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;
/** Un tour de l'arc de recherche (ms). Animation, aucune règle de jeu. */
const RING_SPIN_MS = 1600;
/** Cadence du compteur d'attente (ms) — sert UNIQUEMENT à `probeTakingLong`. */
const PROBE_TICK_MS = 1000;

/**
 * La couleur d'une bande. Les trois teintes viennent des TOKENS et de leur
 * SENS, jamais d'un feu tricolore recopié :
 *  · vert → `colors.chartreuse`, la couleur « moi / action / gain » de la
 *    charte — c'est elle qui portera aussi le CTA, cohérence voulue ;
 *  · orange → `gameColors.warn`, le token explicite de l'« avertissement NON
 *    bloquant ». Surtout PAS `gameColors.rival` (#FF643C) : les couleurs de
 *    GRYD sont attribuées par RÔLE (§C), et un signal moyen n'est pas un rival ;
 *  · rouge → `gameColors.danger`, le token du blocage.
 * L'état de recherche est GRIS : il n'affirme rien, donc il ne colore rien.
 */
const RING_COLOR: Record<Exclude<PreflightRing, 'none'>, string> = {
  searching: colors.grisLigne,
  ready: colors.chartreuse,
  usable: gameColors.warn,
  poor: gameColors.danger,
};

/**
 * L'anneau. Sa COULEUR est la bande, son CENTRE est le chiffre réel — et il
 * n'existe aucun troisième canal d'information : la longueur de l'arc ne
 * « remplit » PAS l'anneau en proportion de la précision. Une jauge qui se
 * remplit suppose une échelle (de quoi à quoi ?) que la spec ne donne pas ; la
 * fabriquer donnerait un rapport visuel inventé entre 4 m et 12 m.
 *
 * En recherche, l'arc partiel TOURNE — c'est le seul moment où l'anneau bouge,
 * parce que c'est le seul moment où il n'a rien à dire. « Réduire les
 * animations » le fige : l'arc reste visible, immobile, et le texte
 * (« Recherche du signal ») porte alors seul l'information — jamais une couleur
 * ou un mouvement seuls.
 */
function PrecisionRing({
  ring,
  accuracyM,
}: {
  ring: Exclude<PreflightRing, 'none'>;
  accuracyM: number | null;
}) {
  const t = useT();
  const reduce = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;
  const searching = ring === 'searching';

  useEffect(() => {
    if (!searching || reduce) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: RING_SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [searching, reduce, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.ringWrap}>
      <Animated.View style={searching ? { transform: [{ rotate }] } : undefined}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Le sillon : il matérialise l'anneau même quand rien n'est mesuré. */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke={colors.carbone2}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke={searching ? colors.gris : RING_COLOR[ring]}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            // En recherche : un arc PARTIEL (un quart), qui dit « ça travaille »
            // sans jamais ressembler à une mesure. Sinon : le cercle plein.
            strokeDasharray={
              searching
                ? `${RING_CIRCUMFERENCE * 0.22} ${RING_CIRCUMFERENCE}`
                : `${RING_CIRCUMFERENCE}`
            }
          />
        </Svg>
      </Animated.View>
      {/* Le chiffre RÉEL, jamais un « 0 » nu : `accuracyM === null` ⇒ rien. */}
      {accuracyM === null ? null : (
        <View style={styles.ringCenter} pointerEvents="none">
          <Text style={styles.ringValue} numberOfLines={1} adjustsFontSizeToFit>
            {t(C.ringAccuracy, { m: accuracyDigits(accuracyM) })}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Le libellé d'état — c'est LUI qui porte le sens, la couleur ne fait que le
 *  redoubler (§C : jamais une couleur seule). */
const RING_LABEL: Record<PreflightRing, (typeof C)[keyof typeof C]> = {
  searching: C.ringUnknown,
  ready: C.ringReady,
  usable: C.ringUsable,
  poor: C.ringPoor,
  none: C.ringUnmeasurable,
};

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

  /**
   * PHASE. `acquire` = l'anneau mesure, aucun tracker, aucun décompte ;
   * `countdown` = le joueur a demandé le départ (`DÉMARRER MAINTENANT` ou
   * `Démarrer quand même`) et les 3 secondes courent. Le sondage GPS est coupé
   * au passage : jamais deux abonnements de position en vol.
   */
  const [phase, setPhase] = useState<'acquire' | 'countdown'>('acquire');
  /** Ce que le CAPTEUR a dit, et rien d'autre. Jamais écrit par l'UI. */
  const [signal, setSignal] = useState<PreflightSignal>({ kind: 'idle' });
  /** Millisecondes écoulées depuis l'ouverture — ne sert qu'à `probeTakingLong`. */
  const [elapsedMs, setElapsedMs] = useState(0);
  // Palier courant du décompte. `null` seulement après une annulation.
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

  /**
   * LE SONDAGE. Il n'existe QUE pendant la phase d'acquisition et il est coupé
   * par le nettoyage de l'effet — au démarrage du décompte, à l'annulation, au
   * démontage. C'est ce qui garantit qu'aucun watch ne survit à cet écran et
   * que le tracker (construit à la fin du décompte) soit seul sur le capteur.
   *
   * `onAccuracy` écrit la valeur BRUTE du dernier fix. Aucune moyenne, aucun
   * « meilleur des N » : ce que l'anneau montre est ce que le capteur vient de
   * dire, à la seconde où le joueur décide.
   */
  useEffect(() => {
    if (phase !== 'acquire') return;
    setSignal({ kind: 'probing' });
    const stop = subscribePreflightAccuracy({
      onAccuracy: (accuracyM) => setSignal({ kind: 'measured', accuracyM }),
      onUnavailable: () => setSignal({ kind: 'unavailable' }),
    });
    return stop;
  }, [phase]);

  /**
   * Horloge d'ATTENTE — elle ne tourne que tant qu'aucune position n'est
   * arrivée. Elle ne sert qu'à une chose : dire au bout d'un moment que ça
   * traîne, pour qu'un anneau qui cherche dans un parking souterrain ne soit
   * pas un spinner infini muet.
   */
  useEffect(() => {
    if (phase !== 'acquire' || signal.kind !== 'probing') return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), PROBE_TICK_MS);
    return () => clearInterval(id);
  }, [phase, signal.kind]);

  const readiness = useMemo(() => preflightReadiness(signal), [signal]);

  /**
   * §18 — `gps_ready_reached` : la bande VERTE atteinte pour la PREMIÈRE fois
   * sur cet écran, avec le temps qu'il a fallu. Le KPI est « combien de temps
   * on fait attendre avant un départ propre » ; l'envoyer plusieurs fois (le
   * signal oscille autour du seuil) le rendrait faux, d'où le verrou.
   */
  const readySentRef = useRef(false);
  const openedAtRef = useRef(Date.now());
  useEffect(() => {
    if (!readiness.startNow || readySentRef.current) return;
    readySentRef.current = true;
    track(EVENTS.gpsReadyReached, {
      seconds: Math.round((Date.now() - openedAtRef.current) / 1000),
    });
  }, [readiness.startNow]);

  // Moteur du compte à rebours : un palier par seconde, haptique croissante,
  // et sur le DERNIER palier (« GO ») → confirmStart() (le vrai départ).
  useEffect(() => {
    if (phase !== 'countdown' || stepIdx === null) return;
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
  }, [phase, stepIdx, countdownRun]);

  /**
   * Correction de la discipline. Impossible une fois le GO parti (le tracker
   * existe : une sortie ne change JAMAIS de monde en chemin) et impossible
   * après une annulation (plus aucun décompte à relancer). Pendant
   * l'acquisition, elle ne fait que corriger — il n'y a encore aucun décompte
   * à relancer.
   */
  const declare = (next: Activity) => {
    if (startedRef.current || stepIdx === null || next === activity) return;
    setActivity(next);
    if (phase !== 'countdown') return;
    firedRef.current.clear(); // le crescendo se rejoue depuis le début
    setStepIdx(0);
    setCountdownRun((n) => n + 1);
  };

  /**
   * Départ demandé. `degraded` = le lien « Démarrer quand même » (bande orange,
   * ou précision non mesurable) : on journalise le grade RÉEL — c'est le signal
   * qui dira si le seuil de 15 m est trop sévère sur le terrain.
   */
  const requestStart = (degraded: boolean) => {
    if (startedRef.current) return;
    haptics.medium();
    if (degraded) track(EVENTS.runStartDegraded, { grade: signalGrade(signal) });
    setPhase('countdown'); // coupe le sondage (nettoyage de l'effet) puis 3-2-1
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
  const beforeGo = phase === 'countdown' && stepIdx != null && stepIdx < STEPS.length - 1;
  const acquiring = phase === 'acquire';
  // Pendant l'acquisition, la discipline est toujours corrigeable ; pendant le
  // décompte, elle suit la frontière du GO ci-dessus.
  const canDeclare = acquiring || beforeGo;
  const stateLabel = t(RING_LABEL[readiness.ring]);

  return (
    <View
      accessibilityLabel={t(C.a11yPreflight)}
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      {acquiring ? (
        /* PHASE 1 — l'anneau, seul focal. Fond noir plein (pas une 2ᵉ MapLibre). */
        <View
          style={styles.countZone}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t(C.a11yRing, { state: stateLabel })}
        >
          {/* `ring === 'none'` : RIEN à mesurer, donc AUCUN anneau — seule la
              phrase reste. Un cadran qui ne mesure rien est un décor qui
              prétend mesurer. */}
          {readiness.ring === 'none' ? null : (
            <PrecisionRing ring={readiness.ring} accuracyM={readiness.accuracyM} />
          )}
          <Text style={styles.ringState} numberOfLines={2}>
            {stateLabel}
          </Text>
          {probeTakingLong(signal, elapsedMs) ? (
            <Text style={styles.ringHint} numberOfLines={3}>
              {t(C.ringSearchingLong)}
            </Text>
          ) : null}
        </View>
      ) : (
        /* PHASE 2 — le chiffre géant, seul focal. */
        <View style={styles.countZone}>
          {digit != null ? <CountdownDigit key={digit} label={digit} /> : null}
        </View>
      )}

      {/* CE QUI VA ÊTRE ENREGISTRÉ — subordonné au focal, jamais un CTA. */}
      <ActivityDeclaration activity={activity} onDeclare={canDeclare ? declare : null} />

      <View style={styles.actions}>
        {/* L'UNIQUE chartreuse de l'écran (§A4), peinte SEULEMENT en bande verte. */}
        {acquiring && readiness.startNow ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.startNow)}
            onPress={() => requestStart(false)}
            style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
          >
            <Text style={styles.startLabel} numberOfLines={1} adjustsFontSizeToFit>
              {t(C.startNow)}
            </Text>
          </Pressable>
        ) : null}

        {/* Le départ dégradé est un LIEN, jamais un second bouton plein — et il
            dit son coût AVANT le tap, pas après. */}
        {acquiring && readiness.startAnyway ? (
          <View style={styles.anywayWrap}>
            <Text style={styles.anywayNote} numberOfLines={3}>
              {t(C.startAnywayNote)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.startAnyway)}
              onPress={() => requestStart(true)}
              style={({ pressed }) => [styles.anywayBtn, pressed && styles.pressed]}
            >
              <Text style={styles.anywayLabel} numberOfLines={1} adjustsFontSizeToFit>
                {t(C.startAnyway)}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {acquiring || beforeGo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(acquiring ? C.a11yCancelPreflight : C.a11yCancelCountdown)}
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

  countZone: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },

  // ── L'anneau de précision (E19) ──────────────────────────────────────────
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringValue: {
    color: colors.blanc,
    fontFamily: fonts.mono, // chiffres à chasse fixe : la valeur ne « saute » pas
    fontSize: fontSizes.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  /** L'état EN TOUTES LETTRES — jamais une couleur seule (§C). */
  ringState: {
    color: colors.blanc,
    fontFamily: fonts.displaySemi,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  ringHint: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
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

  actions: { minHeight: 52, gap: spacing.sm },

  // ── DÉMARRER MAINTENANT — l'unique chartreuse de l'écran (§A4) ────────────
  startBtn: {
    minHeight: sizes.buttonLg,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Le pressé assombrit la chartreuse (token dédié) : jamais un texte chartreuse
  // sur fond clair, jamais un simple changement d'opacité sur un CTA plein.
  startBtnPressed: { backgroundColor: colors.chartreusePressed },
  startLabel: {
    color: colors.noir, // texte NOIR sur chartreuse — le seul sens autorisé
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // ── Démarrer quand même — un LIEN, et son coût dit avant le tap ───────────
  anywayWrap: { alignItems: 'center', gap: spacing.xxs },
  anywayNote: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  anywayBtn: {
    minHeight: sizes.touchTarget, // plancher tactile RÉEL, même pour un lien
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  anywayLabel: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.md,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

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
