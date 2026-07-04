/**
 * GRYD — Onboarding IMMERSIF (AMENDEMENT-10 §5 + AMENDEMENT-11) : 3 écrans
 * concept en régime CONVICTION (reveals, glow, compteur) AVANT les écrans
 * motivationnels existants (style + visibilité, AMENDEMENT-07 §8 — inchangés),
 * puis un écran final « Rejoins un crew ou crée le tien ».
 *
 * PAS UNE GRILLE, UNE VILLE À PRENDRE (AMENDEMENT-11) : les visuels concept
 * montrent des TERRITOIRES ORGANIQUES (blobs lissés, couleurs = statut de jeu,
 * styles partagés avec la carte via territoryStyle) — jamais d'hexagones.
 *
 * NON BLOQUANT : « Passer » à tout moment garde les défauts §1 et marque
 * l'onboarding vu. AMENDEMENT-14 §4 : SKIPPABLE EN ENTIER — « Commencer à
 * courir » visible dès l'écran 1 (défauts sains : style Mixte, visibilité
 * crew = DEFAULT_PREFS), le flux complet reste intact pour ceux qui le
 * suivent ; la phrase-règle (§1) est posée sous le visuel boucle (écran 2).
 * Reduce motion : les animations deviennent des états finaux (fade court ou
 * rien), la lisibilité n'en dépend jamais. Les choix pilotent le FILTRAGE
 * UI/notifs (§1), jamais le gameplay.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  colors,
  fontSizes,
  gameColors,
  motion,
  radii,
  spacing,
  type MapSharing,
  type PlayStyle,
  type ProfileVisibility,
} from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { Icon } from '../../src/ui/Icon';
import { CrewCrest, useReduceMotion } from '../../src/ui/game';
import { territoryStyle, withAlpha } from '../../src/features/map/mapStyle';
import { RULE_PHRASE } from '../../src/features/nav/runContext';
import { OptionCard } from '../../src/features/motivation/ui';
import {
  MAP_SHARING_LABELS,
  PLAY_STYLE_LABELS,
  PROFILE_VISIBILITY_LABELS,
} from '../../src/features/motivation/labels';
import { DEFAULT_PREFS, useMotivationPrefs } from '../../src/features/motivation/store';
import { TODAY_HERO } from '../../src/features/motivation/demo';

// ─── Étapes ──────────────────────────────────────────────────────────────────

/** Ordre du flux : 3 concepts (conviction) → style → visibilité → crew. */
const STEP_ORDER = ['concept_city', 'concept_run', 'concept_crew', 'style', 'visibility', 'crew'] as const;
type Step = (typeof STEP_ORDER)[number];

/**
 * n de l'event onboarding_step §8 : la promesse = 1-3 (concepts), motiv ≥ 10
 * (10/11 conservés de l'existant — funnel comparable), crew final = 12.
 */
const STEP_EVENT_N: Record<Step, number> = {
  concept_city: 1,
  concept_run: 2,
  concept_crew: 3,
  style: 10,
  visibility: 11,
  crew: 12,
};

const STYLE_ORDER: PlayStyle[] = ['focus_solo', 'mixte', 'crew_war'];
const VISIBILITY_ORDER: ProfileVisibility[] = ['private', 'friends', 'crew', 'public'];
const STYLE_ICON: Record<PlayStyle, 'aujourdhui' | 'crew' | 'cible'> = {
  focus_solo: 'aujourdhui',
  mixte: 'crew',
  crew_war: 'cible',
};
/** Trace par défaut selon le style (jamais de position live) — proposition douce. */
const MAP_ORDER: MapSharing[] = ['simplified', 'precise', 'territory_only', 'none'];

/** Crew démo du blason de l'écran 3 (cohérent crew/demo — LES FOULÉES 9³). */
const CONCEPT_CREW = { seed: 'les-foulees-93', name: 'LES FOULÉES 9³' } as const;

// ─── Progress 0→1 piloté par état (cross-platform web/natif) ────────────────

/**
 * Progression 0..1 state-driven (listener JS, comme useCountUp) : pilote des
 * props SVG (dashoffset, opacité, chemins recalculés) que le driver natif ne
 * sait pas animer. Reduce motion → saute à 1 (état final lisible).
 */
function useTimedProgress(durationMs: number, delayMs = 0): number {
  const reduce = useReduceMotion();
  const [p, setP] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      setP(1);
      return;
    }
    const id = anim.addListener(({ value }) => setP(value));
    Animated.timing(anim, {
      toValue: 1,
      duration: durationMs,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // listener JS : pilote des props SVG
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [reduce, durationMs, delayMs, anim]);
  return reduce ? 1 : p;
}

/** Rampe locale : 0 avant `from`, 1 après `to` (reveals décalés dans un même p). */
function ramp(p: number, from: number, to: number): number {
  if (p <= from) return 0;
  if (p >= to) return 1;
  return (p - from) / (to - from);
}

// ─── Écran concept 1 — « La ville devient une carte. » ──────────────────────

const CITY_W = 320;
const CITY_H = 250;

/** Silhouette de skyline (bas du cadre) — décor, volontairement sombre. */
const SKYLINE: readonly { x: number; w: number; h: number }[] = [
  { x: 0, w: 34, h: 52 },
  { x: 38, w: 26, h: 84 },
  { x: 68, w: 40, h: 64 },
  { x: 112, w: 22, h: 100 },
  { x: 138, w: 36, h: 72 },
  { x: 178, w: 30, h: 112 },
  { x: 212, w: 42, h: 58 },
  { x: 258, w: 26, h: 88 },
  { x: 288, w: 32, h: 66 },
];

/** Rues stylisées du plan (au-dessus de la skyline) — traits fins neutres. */
const CITY_STREETS: readonly string[] = [
  'M0,64 C70,58 210,74 320,60',
  'M0,116 C90,108 240,124 320,112',
  'M56,10 C60,70 50,130 62,170',
  'M150,4 C146,60 156,120 148,172',
  'M244,8 C250,64 240,126 252,168',
];

/** Territoires ORGANIQUES : contours irréguliers (baies, caps — jamais une grille). */
const CITY_CREW_BLOB =
  'M38,96 C30,72 54,52 88,50 C114,48 138,58 146,78 C152,92 142,100 130,104 C144,112 148,126 134,136 C112,150 66,146 48,126 C40,116 42,108 38,96 Z';
const CITY_RIVAL_BLOB =
  'M196,60 C210,40 250,36 276,50 C298,62 306,88 292,106 C282,118 264,124 250,118 C240,126 224,128 210,120 C192,110 186,92 190,76 C192,68 192,66 196,60 Z';
const CITY_CONTESTED_BLOB =
  'M148,126 C158,112 186,108 204,120 C220,130 222,150 206,162 C188,174 158,170 146,154 C138,144 140,134 148,126 Z';

function ConceptCityVisual() {
  const p = useTimedProgress(motion.celebrationCountMs * 2);
  const crewOp = ramp(p, 0.1, 0.45);
  const rivalOp = ramp(p, 0.35, 0.7);
  const contestedOp = ramp(p, 0.6, 0.95);
  return (
    <View style={styles.visualCard}>
      <Svg width="100%" height={CITY_H} viewBox={`0 0 ${CITY_W} ${CITY_H}`}>
        {/* Skyline stylisée — la ville réelle, en silhouette. */}
        {SKYLINE.map((b) => (
          <Rect
            key={`b-${b.x}`}
            x={b.x}
            y={CITY_H - b.h}
            width={b.w}
            height={b.h}
            fill={colors.carbone2}
            stroke={colors.grisLigne}
            strokeWidth={1}
          />
        ))}
        {/* Rues du plan. */}
        {CITY_STREETS.map((d) => (
          <Path key={d} d={d} stroke={withAlpha(colors.blanc, 0.08)} strokeWidth={2} fill="none" />
        ))}
        {/* Territoires organiques qui APPARAISSENT (max 3 aplats — anti-patchwork). */}
        <Path
          d={CITY_CREW_BLOB}
          fill={territoryStyle.crewFill}
          stroke={territoryStyle.crewStroke}
          strokeWidth={1.8}
          opacity={crewOp}
        />
        <Path
          d={CITY_RIVAL_BLOB}
          fill={territoryStyle.rivalFill}
          stroke={territoryStyle.rivalStroke}
          strokeWidth={2.6}
          opacity={rivalOp}
        />
        {/* Contesté : DOUBLE contour chartreuse + orange (AMENDEMENT-11 §2). */}
        <Path
          d={CITY_CONTESTED_BLOB}
          fill={territoryStyle.contestedFill}
          stroke={territoryStyle.contestedOuterStroke}
          strokeWidth={3}
          opacity={contestedOp}
        />
        <Path
          d={CITY_CONTESTED_BLOB}
          fill="none"
          stroke={territoryStyle.contestedInnerStroke}
          strokeWidth={1.6}
          opacity={contestedOp}
        />
      </Svg>
    </View>
  );
}

// ─── Écran concept 2 — « Chaque run capture du territoire. » ────────────────
// AMENDEMENT-12 §C : LE geste signature. La trace chartreuse se dessine (le
// trait → la rue), REVIENT à son départ, la boucle se ferme et l'intérieur se
// remplit organiquement (la zone) — compteur qui saute à la fermeture.

const RUN_W = 320;
const RUN_H = 230;
/** Itinéraire chartreuse qui SE DESSINE — une BOUCLE : il revient au départ. */
const RUN_ROUTE =
  'M70,180 C60,140 76,104 110,88 C144,72 196,64 232,84 C262,100 268,140 244,162 C216,186 150,192 110,186 C94,183 76,184 70,180';
/** Longueur ≥ réelle du tracé (dasharray/dashoffset — marge pour le lissé). */
const RUN_ROUTE_LEN = 610;
/** L'INTÉRIEUR de la boucle (blob organique) — se remplit à la fermeture. */
const RUN_ZONE_BLOB =
  'M84,150 C66,110 92,76 136,64 C182,52 234,62 254,92 C272,120 262,156 224,172 C180,190 108,188 84,150 Z';

/** Part du temps où la boucle SE FERME (la trace touche son départ). */
const RUN_CLOSE_AT = 0.68;
/** Mise en scène AMENDEMENT-12 (« ≈ +86 zones dont 52 en boucle ») : le
 * couloir du trait vaut 34 rues, la fermeture ajoute 52 zones intérieures —
 * total = TODAY_HERO.route.zones (86). Données démo, pas des règles. */
const RUN_LOOP_ZONES = 52;
const RUN_CORRIDOR_ZONES = TODAY_HERO.route.zones - RUN_LOOP_ZONES;

const RUN_STREETS: readonly string[] = [
  'M0,52 C90,44 230,60 320,48',
  'M0,120 C110,110 220,128 320,118',
  'M0,186 C100,178 226,192 320,182',
  'M96,0 C92,80 100,160 94,230',
  'M226,0 C232,76 222,158 230,230',
];

function ConceptRunVisual() {
  const p = useTimedProgress(motion.celebrationCountMs * 3);
  const drawP = ramp(p, 0, RUN_CLOSE_AT);
  const closed = p >= RUN_CLOSE_AT + 0.04;
  /** Aperçu fantôme de la zone juste avant la fermeture (pointillé). */
  const ghostOp = Math.max(0, ramp(p, 0.5, 0.64) - ramp(p, RUN_CLOSE_AT + 0.04, RUN_CLOSE_AT + 0.08));
  /** Remplissage organique de l'intérieur à la fermeture. */
  const fillOp = ramp(p, RUN_CLOSE_AT + 0.04, 0.88);
  /** Compteur : le trait cumule les rues, la fermeture fait SAUTER + zones. */
  const zones =
    Math.round(RUN_CORRIDOR_ZONES * ramp(p, 0.06, RUN_CLOSE_AT)) +
    Math.round(RUN_LOOP_ZONES * ramp(p, RUN_CLOSE_AT + 0.04, 0.8));
  return (
    <View style={styles.visualCard}>
      <Svg width="100%" height={RUN_H} viewBox={`0 0 ${RUN_W} ${RUN_H}`}>
        {RUN_STREETS.map((d) => (
          <Path key={d} d={d} stroke={withAlpha(colors.blanc, 0.08)} strokeWidth={2} fill="none" />
        ))}
        {/* Aperçu fantôme : ce que la boucle va prendre (translucide, pointillé). */}
        {ghostOp > 0 ? (
          <Path
            d={RUN_ZONE_BLOB}
            fill={territoryStyle.objectiveSoft}
            stroke={colors.chartreuse40}
            strokeWidth={1.6}
            strokeDasharray="5 5"
            opacity={ghostOp}
          />
        ) : null}
        {/* BOUCLE FERMÉE : l'intérieur se remplit organiquement. */}
        <Path
          d={RUN_ZONE_BLOB}
          fill={territoryStyle.crewFill}
          stroke={territoryStyle.crewStroke}
          strokeWidth={1.8}
          opacity={fillOp}
        />
        {/* Route épaisse chartreuse — le trait se dessine puis SE FERME. */}
        <Path
          d={RUN_ROUTE}
          stroke={territoryStyle.routeStroke}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${RUN_ROUTE_LEN}`}
          strokeDashoffset={RUN_ROUTE_LEN * (1 - drawP)}
        />
        {/* Départ (toujours visible) ; le coureur REVIENT dessus à la fermeture. */}
        <Circle cx={70} cy={180} r={5} fill={colors.noir} stroke={territoryStyle.routeDot} strokeWidth={2.5} />
        {closed ? <Circle cx={70} cy={180} r={6.5} fill={territoryStyle.routeDot} /> : null}
      </Svg>
      {/* Compteur de zones capturées — saute à la fermeture de la boucle. */}
      <View style={styles.zoneCounter}>
        <Text style={styles.zoneCounterValue}>+{zones}</Text>
        <Text style={styles.zoneCounterLabel}>
          {closed ? `dont ${RUN_LOOP_ZONES} en boucle` : 'zones capturées'}
        </Text>
      </View>
      {closed ? (
        <Text style={styles.frontierLabel}>Boucle fermée — la zone est à toi</Text>
      ) : null}
    </View>
  );
}

// ─── Écran concept 3 — « Seul… en crew, tu prends la ville. » ───────────────

const CREW_W = 320;
const CREW_H = 190;
/** Amplitude du recul de frontière (px viewBox) — narration, pas une règle. */
const FRONTIER_PUSH = 46;

/** Frontière verticale ondulée à l'abscisse x (deux bosses organiques). */
function frontierEdge(x: number): string {
  return `C${x + 14},46 ${x - 12},86 ${x},112 C${x + 10},134 ${x - 8},158 ${x - 2},176`;
}

/** Territoire crew : du bord gauche jusqu'à la frontière ondulée à x. */
function crewTerritoryPath(x: number): string {
  return `M0,14 L${x - 4},14 ${frontierEdge(x)} L0,176 Z`;
}

function ConceptCrewVisual() {
  const p = useTimedProgress(motion.celebrationCountMs * 2, motion.transitionMs);
  const x = 132 + FRONTIER_PUSH * p; // la frontière se REPOUSSE vers le rival
  return (
    <View style={styles.visualCard}>
      <View style={styles.crestWrap}>
        <CrewCrest seed={CONCEPT_CREW.seed} name={CONCEPT_CREW.name} size="l" />
      </View>
      <Svg width="100%" height={CREW_H} viewBox={`0 0 ${CREW_W} ${CREW_H}`}>
        {/* Territoire rival (statique) — l'état se lit à la frontière. */}
        <Path
          d={`M${CREW_W},14 L118,14 ${frontierEdge(118)} L${CREW_W},176 Z`}
          fill={territoryStyle.rivalFill}
          stroke="none"
        />
        {/* Territoire crew qui AVANCE et repousse la frontière. */}
        <Path d={crewTerritoryPath(x)} fill={territoryStyle.crewFill} stroke="none" />
        {/* La frontière elle-même : double lecture crew/rival. */}
        <Path
          d={`M${x - 4},14 ${frontierEdge(x)}`}
          stroke={territoryStyle.rivalStroke}
          strokeWidth={2.6}
          fill="none"
        />
        <Path
          d={`M${x - 4},14 ${frontierEdge(x)}`}
          stroke={territoryStyle.crewStroke}
          strokeWidth={1.4}
          fill="none"
        />
      </Svg>
      {p >= 1 ? <Text style={styles.frontierLabel}>Frontière repoussée</Text> : null}
    </View>
  );
}

// ─── Gabarit d'un écran concept (titre géant + visuel + accroche) ───────────

function ConceptSlide({
  title,
  tagline,
  children,
}: {
  title: string;
  tagline: string;
  children: React.ReactNode;
}) {
  // Reveal doux du bloc (régime conviction) — fade seul si reduce motion.
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reduce ? 0 : 14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.transitionMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.transitionMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);
  return (
    <Animated.View style={[styles.conceptBody, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.conceptTitle}>{title}</Text>
      {children}
      <Text style={styles.conceptTagline}>{tagline}</Text>
    </Animated.View>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { prefs, update } = useMotivationPrefs();
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEP_ORDER[stepIndex] ?? 'concept_city';
  const [playStyle, setPlayStyle] = useState<PlayStyle>(DEFAULT_PREFS.playStyle);
  const [visibility, setVisibility] = useState<ProfileVisibility>(DEFAULT_PREFS.profileVisibility);
  const [mapSharing, setMapSharing] = useState<MapSharing>(DEFAULT_PREFS.mapSharing);

  // Pré-remplir avec les prefs déjà stockées (retour dans le flux).
  useEffect(() => {
    setPlayStyle(prefs.playStyle);
    setVisibility(prefs.profileVisibility);
    setMapSharing(prefs.mapSharing);
  }, [prefs.playStyle, prefs.profileVisibility, prefs.mapSharing]);

  useEffect(() => {
    track(EVENTS.onboardingStep, { n: STEP_EVENT_N[step] });
  }, [step]);

  /** Persiste les choix + marque vu. `persistChoices=false` = « Passer » (§1). */
  const persist = async (persistChoices: boolean) => {
    if (persistChoices) {
      await update({
        playStyle,
        profileVisibility: visibility,
        mapSharing,
        onboardingSeen: true,
      });
    } else {
      await update({ onboardingSeen: true }); // défauts §1 conservés
    }
  };

  /** Sortie standard : persiste puis retourne à la carte. */
  const finish = async (persistChoices: boolean) => {
    await persist(persistChoices);
    router.replace('/');
  };

  /** Sortie de l'écran crew : persiste TOUT puis route vers la destination. */
  const finishTo = async (href: '/crew-discovery' | '/crew') => {
    haptics.light();
    await persist(true);
    router.replace(href);
  };

  const next = () => {
    haptics.light();
    if (stepIndex < STEP_ORDER.length - 1) setStepIndex(stepIndex + 1);
  };
  const back = () => setStepIndex(Math.max(0, stepIndex - 1));

  /**
   * AMENDEMENT-14 §4 : « Commencer à courir » dès l'écran 1 — sortie totale
   * avec les défauts sains (DEFAULT_PREFS : style Mixte, visibilité crew),
   * retour carte où le GO attend. Le flux complet reste disponible.
   */
  const startRunning = () => {
    haptics.medium();
    void finish(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.head}>
        <Text style={styles.kicker}>
          ÉTAPE {stepIndex + 1} / {STEP_ORDER.length}
        </Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => void finish(false)}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      {step === 'concept_city' ? (
        <ConceptSlide
          title="La ville devient une carte."
          tagline="Pas une grille. Une ville à prendre : des territoires, des frontières, des rues."
        >
          <ConceptCityVisual />
        </ConceptSlide>
      ) : null}

      {step === 'concept_run' ? (
        /* La phrase-règle (AMENDEMENT-14 §1) sous le visuel boucle : l'objectif
           est un RÉSULTAT, pas une question — GO s'occupe du reste. */
        <ConceptSlide title="Chaque run capture du territoire." tagline={RULE_PHRASE}>
          <ConceptRunVisual />
        </ConceptSlide>
      ) : null}

      {step === 'concept_crew' ? (
        <ConceptSlide
          title="Seul tu prends des rues. En crew, tu prends la ville."
          tagline="Chaque frontière repoussée compte pour tout le crew."
        >
          <ConceptCrewVisual />
        </ConceptSlide>
      ) : null}

      {step === 'style' ? (
        <View style={styles.body}>
          <Text style={styles.title}>Ton style GRYD</Text>
          <Text style={styles.subtitle}>
            Ça règle ce qu'on te met en avant — pas comment tu joues. Tu peux changer à tout moment.
          </Text>
          <View style={styles.options}>
            {STYLE_ORDER.map((s) => (
              <OptionCard
                key={s}
                title={PLAY_STYLE_LABELS[s].title}
                subtitle={PLAY_STYLE_LABELS[s].subtitle}
                icon={STYLE_ICON[s]}
                selected={playStyle === s}
                onPress={() => setPlayStyle(s)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 'visibility' ? (
        <View style={styles.body}>
          <Text style={styles.title}>Ta visibilité</Text>
          <Text style={styles.subtitle}>
            Qui voit ton profil. Ta position en direct n'est jamais partagée, quel que soit ton choix.
          </Text>
          <View style={styles.options}>
            {VISIBILITY_ORDER.map((v) => (
              <OptionCard
                key={v}
                title={PROFILE_VISIBILITY_LABELS[v]}
                selected={visibility === v}
                onPress={() => setVisibility(v)}
              />
            ))}
          </View>
          <Text style={styles.groupLabel}>TA TRACE SUR LA CARTE</Text>
          <View style={styles.options}>
            {MAP_ORDER.map((m) => (
              <OptionCard
                key={m}
                title={MAP_SHARING_LABELS[m]}
                selected={mapSharing === m}
                onPress={() => setMapSharing(m)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 'crew' ? (
        <View style={styles.body}>
          <Text style={styles.title}>Rejoins un crew ou crée le tien</Text>
          <Text style={styles.subtitle}>
            La ville se prend à plusieurs. Tu peux aussi décider plus tard — rien n'est bloqué.
          </Text>
          <View style={styles.crewCrestWrap}>
            <CrewCrest seed={CONCEPT_CREW.seed} name={CONCEPT_CREW.name} size="xl" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rejoindre un crew proche"
            onPress={() => void finishTo('/crew-discovery')}
            style={({ pressed }) => [styles.crewPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.crewPrimaryLabel}>Rejoindre un crew proche</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Créer mon crew"
            onPress={() => void finishTo('/crew')}
            style={({ pressed }) => [styles.crewSecondary, pressed && styles.pressed]}
          >
            <Text style={styles.crewSecondaryLabel}>Créer mon crew</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plus tard"
            onPress={() => void finish(true)}
            style={({ pressed }) => [styles.crewLater, pressed && styles.pressed]}
          >
            <Text style={styles.crewLaterLabel}>Plus tard</Text>
          </Pressable>
        </View>
      ) : null}

      {step !== 'crew' ? (
        <>
          <View style={styles.footer}>
            {stepIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour"
                onPress={back}
                style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
              >
                <View style={styles.mirror}>
                  <Icon name="chevron" size={18} color={colors.blanc} />
                </View>
                <Text style={styles.ghostLabel}>Retour</Text>
              </Pressable>
            ) : (
              <View style={styles.ghostSpacer} />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={next}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text style={styles.ctaLabel}>Continuer</Text>
            </Pressable>
          </View>
          {/* Skip TOTAL dès l'écran 1 (A-14 §4) — défauts sains, GO t'attend. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Commencer à courir maintenant — garder les réglages par défaut"
            onPress={startRunning}
            style={({ pressed }) => [styles.startNow, pressed && styles.pressed]}
          >
            <Text style={styles.startNowLabel}>Commencer à courir</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.cardPadding,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  skip: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },

  // ── Écrans concept (régime conviction) ──
  conceptBody: { flex: 1, marginTop: 26, justifyContent: 'center' },
  conceptTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: fontSizes.xl * 1.15,
    marginBottom: 20,
  },
  conceptTagline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 18,
  },
  // Glass LÉGER autorisé ici (conviction) : surface sombre + liseré lumineux.
  visualCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: withAlpha(colors.blanc, 0.14),
    overflow: 'hidden',
    paddingVertical: 8,
  },
  zoneCounter: {
    position: 'absolute',
    top: 14,
    right: 16,
    alignItems: 'flex-end',
  },
  zoneCounterValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  zoneCounterLabel: { color: colors.gris, fontSize: fontSizes.xs },
  crestWrap: { alignItems: 'center', paddingTop: 14 },
  frontierLabel: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Écrans motivationnels existants (inchangés) ──
  body: { flex: 1, marginTop: 24 },
  title: { color: colors.blanc, fontSize: fontSizes.xl, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 8,
    marginBottom: 22,
  },
  options: {},
  groupLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 12,
  },

  // ── Écran final crew ──
  crewCrestWrap: { alignItems: 'center', marginTop: 18, marginBottom: 26 },
  crewPrimary: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewPrimaryLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '600' },
  crewSecondary: {
    height: 54,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  crewSecondaryLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },
  crewLater: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  crewLaterLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  ghostSpacer: { flex: 0 },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  mirror: { transform: [{ scaleX: -1 }] },
  cta: {
    flex: 1,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.3 },
  // « Commencer à courir » (A-14 §4) — sortie totale, discrète sous le footer.
  startNow: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  startNowLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
