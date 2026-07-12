/**
 * GRYD — visuels des étapes d'onboarding sans friction (AMENDEMENT-30). SVG
 * react-native-svg (cross natif/web preview), TOUTES les couleurs dérivées des
 * tokens (charte : toute couleur hors tokens = bug ; jamais de chartreuse sur
 * fond clair — ici tout est sur noir). Réutilise `territoryStyle`/`traceStyle`
 * (mapStyle) et les hooks d'anim du design system (reduce motion respecté).
 *
 * VRAIS TRACÉS (demande fondateur) : plus AUCUN blob/ellipse décoratif — chaque
 * territoire et chaque trace sont projetés depuis les VRAIES géométries de rues
 * (realAnchors : BOUCLE_REPUBLIQUE, RUE_FAUBOURG_DU_TEMPLE, square Villemin,
 * avenues hôtes) via le projecteur pur `fitTracesToBox`. Le plateau devient une
 * mini-carte HONNÊTE du quartier République (mon territoire au centre, le rival
 * à l'est, l'objectif au nord se lisent à leur vraie place relative).
 *
 * Quatre briques :
 *   HookMapBackground — carte réelle animée EN FOND du splash (§1).
 *   CityBoard         — le TERRAIN DE JEU (plateau DÉMO — aucune géoloc réelle,
 *                       la copy l'assume) : zones par rôle sur vrais tracés (§2, §C).
 *   CaptureFillVisual — la vraie boucle République qui SE DESSINE puis SE REMPLIT
 *                       à la capture (§5, payoff).
 *   SyncProgressBar   — barre de progression sobre du déroulé d'import (3a).
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polyline, G } from 'react-native-svg';
import { colors, gameColors } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
import { territoryStyle, traceStyle, withAlpha } from '../map/mapStyle';
import { fitTracesToBox, tracePrefix } from '../map/projectTrace';
import {
  AVENUE_DE_LA_REPUBLIQUE,
  BOUCLE_REPUBLIQUE,
  BOUCLE_SQUARE_VILLEMIN,
  BOULEVARD_VOLTAIRE,
  EGO_REPUBLIQUE,
  QUAI_VALMY,
  RUE_FAUBOURG_DU_TEMPLE,
} from '../map/realAnchors';

// ─── Progression 0..1 pilotée par état (props SVG — driver JS) ───────────────

/** Rampe 0..1 sur durationMs (listener JS). Reduce motion → saute à 1. */
function useProgress(durationMs: number, delayMs = 0, loop = false): number {
  const reduce = useReduceMotion();
  const [p, setP] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      setP(1);
      return;
    }
    const id = anim.addListener(({ value }) => setP(value));
    const timing = Animated.timing(anim, {
      toValue: 1,
      duration: durationMs,
      delay: delayMs,
      easing: loop ? Easing.inOut(Easing.ease) : Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    const runner = loop
      ? Animated.loop(
          Animated.sequence([
            timing,
            Animated.timing(anim, {
              toValue: 0,
              duration: durationMs,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        )
      : timing;
    runner.start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [reduce, durationMs, delayMs, loop, anim]);
  return reduce ? 1 : p;
}

/** Rampe locale : 0 avant `from`, 1 après `to` (reveals décalés d'un même p). */
function ramp(p: number, from: number, to: number): number {
  if (p <= from) return 0;
  if (p >= to) return 1;
  return (p - from) / (to - from);
}

// ─── Décor de plan commun (VRAIES rues + territoires tracé-based) ────────────

const BOARD_W = 320;
const BOARD_H = 300;

/**
 * Rues hôtes RÉELLES du quartier (traits fins neutres) — décor honnête, jamais
 * un état de jeu. Ce sont les axes qui portent les couloirs de course
 * (avenue de la République, quai de Valmy, bd Voltaire) : le plan est vrai.
 */
const REAL_STREETS = [AVENUE_DE_LA_REPUBLIQUE, QUAI_VALMY, BOULEVARD_VOLTAIRE] as const;

/**
 * Projection PARTAGÉE du plateau : l'union « mon territoire (boucle République) +
 * rival (Faubourg-du-Temple) + objectif (square Villemin) » cadrée dans le board.
 * Chaque tracé garde sa forme ET sa position relative réelle (§4ter). Constante
 * de module (déterministe) — calculée une fois.
 */
const BOARD_PROJ = fitTracesToBox(
  [BOUCLE_REPUBLIQUE, RUE_FAUBOURG_DU_TEMPLE, BOUCLE_SQUARE_VILLEMIN],
  BOARD_W,
  BOARD_H,
  18,
);

/** Chemins projetés (déterministes) réutilisés par les briques du plateau. */
const MINE_PATH = BOARD_PROJ.path(BOUCLE_REPUBLIQUE, true);
const RIVAL_POINTS = BOARD_PROJ.points(RUE_FAUBOURG_DU_TEMPLE);
const TARGET_PATH = BOARD_PROJ.path(BOUCLE_SQUARE_VILLEMIN, true);
const EGO_PT = BOARD_PROJ.project(EGO_REPUBLIQUE);

/** Rues réelles projetées (décor commun ville/hook). */
function RealStreets({ proj = BOARD_PROJ, opacity = 0.08 }: { proj?: typeof BOARD_PROJ; opacity?: number }) {
  return (
    <>
      {REAL_STREETS.map((street, i) => (
        <Polyline
          key={i}
          points={proj.points(street)}
          stroke={withAlpha(colors.blanc, opacity)}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </>
  );
}

// ─── 1 — Fond de carte animé du splash (§1) ──────────────────────────────────

/**
 * Carte RÉELLE EN FOND du hook : les vraies rues + mon territoire apparaissent en
 * douceur, la vraie boucle République se dessine lentement (vie, pas décor
 * gratuit). Volontairement ATTÉNUÉ (opacity globale basse) : c'est un fond, le
 * titre domine. Reduce motion → état final direct.
 */
export function HookMapBackground() {
  const p = useProgress(3200, 0, false);
  const drawP = ramp(p, 0.1, 0.9);
  const fadeIn = ramp(p, 0, 0.4);
  const drawn = tracePrefix(BOUCLE_REPUBLIQUE, drawP);
  return (
    <View style={styles.hookBg} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} preserveAspectRatio="xMidYMid slice">
        <G opacity={0.5 * fadeIn + 0.001}>
          <RealStreets />
          <Path
            d={MINE_PATH}
            fill={territoryStyle.crewFill}
            stroke={territoryStyle.crewStroke}
            strokeWidth={1.6}
          />
        </G>
        {/* La vraie boucle qui se dessine (casing sombre + core chartreuse). */}
        <Polyline
          points={BOARD_PROJ.points(drawn)}
          stroke={traceStyle.casing}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points={BOARD_PROJ.points(drawn)}
          stroke={traceStyle.core}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}

// ─── 2 — Le terrain de jeu en plateau (§2) ───────────────────────────────────

/**
 * Le TERRAIN DE JEU (plateau DÉMO — aucune géoloc réelle, la copy de l'écran
 * l'assume) sur de VRAIS tracés : mon territoire = la boucle République remplie ;
 * le rival = le couloir Faubourg-du-Temple (orange, l'état se lit à la ligne) ;
 * l'OBJECTIF = la boucle du square Villemin, contour pointillé qui PULSE
 * (« celle-ci, prends-la »). Les 3 rôles se lisent par couleur ET forme (§C) :
 * chartreuse = moi, orange = rival, cible pointillée pulsée = objectif. Position
 * du joueur = flèche chartreuse à l'ego réel (place de la République).
 */
export function CityBoard() {
  const reveal = useProgress(1400, 0, false);
  const pulse = useProgress(1600, 0, true);
  const mineOp = ramp(reveal, 0, 0.5);
  const rivalOp = ramp(reveal, 0.25, 0.75);
  const targetOp = ramp(reveal, 0.5, 1);
  // Pulse du contour objectif : opacité qui respire (reduce motion → plein fixe).
  const targetPulse = 0.55 + 0.45 * pulse;
  return (
    <View style={styles.board}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
        <RealStreets />
        {/* Mon territoire — vraie boucle République remplie (aplat + trait net). */}
        <Path
          d={MINE_PATH}
          fill={territoryStyle.crewFill}
          stroke={territoryStyle.crewStroke}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={mineOp}
        />
        {/* Rival — vrai couloir Faubourg-du-Temple (ligne orange, §C). */}
        <Polyline
          points={RIVAL_POINTS}
          fill="none"
          stroke={territoryStyle.rivalStroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={rivalOp}
        />
        {/* Zone-objectif — vraie boucle Villemin : aplat léger + contour pointillé PULSÉ. */}
        <Path
          d={TARGET_PATH}
          fill={territoryStyle.objectiveFill}
          stroke={withAlpha(colors.chartreuse, 0.7)}
          strokeWidth={2}
          strokeDasharray="6 5"
          strokeLinejoin="round"
          opacity={targetOp * targetPulse}
        />
        {/* Position du joueur : flèche/triangle chartreuse à l'ego réel. */}
        <G opacity={mineOp}>
          <Circle cx={EGO_PT.x} cy={EGO_PT.y} r={11} fill={withAlpha(colors.chartreuse, 0.16)} />
          <Path
            d={`M${EGO_PT.x},${EGO_PT.y - 8} L${EGO_PT.x + 6},${EGO_PT.y + 6} L${EGO_PT.x},${EGO_PT.y + 2} L${EGO_PT.x - 6},${EGO_PT.y + 6} Z`}
            fill={colors.chartreuse}
          />
        </G>
      </Svg>
    </View>
  );
}

// ─── 5 — La capture : la vraie boucle se dessine et se remplit (§5) ──────────

/**
 * Projection dédiée de la boucle République seule (grande, centrée) — le payoff
 * mérite tout le cadre. Déterministe.
 */
const CAP_PROJ = fitTracesToBox([BOUCLE_REPUBLIQUE], BOARD_W, BOARD_H, 30);
const CAP_ZONE_PATH = CAP_PROJ.path(BOUCLE_REPUBLIQUE, true);
const CAP_START = CAP_PROJ.project(BOUCLE_REPUBLIQUE[0] ?? EGO_REPUBLIQUE);

/**
 * Animation de REMPLISSAGE de zone à la capture (§5) sur la VRAIE boucle
 * République. Progression pilotée par le parent (`p` 0..1 — même déroulé que le
 * compteur « +X »), pour que l'anim et le chiffre montent ensemble. La trace se
 * dessine le long des vraies rues, ferme la boucle, l'intérieur se remplit en
 * chartreuse. Reduce motion : le parent passe p=1 → état final.
 */
export function CaptureFillVisual({ p }: { p: number }) {
  const drawP = ramp(p, 0, 0.62);
  const closed = p >= 0.66;
  const fillOp = ramp(p, 0.66, 1);
  const drawn = tracePrefix(BOUCLE_REPUBLIQUE, drawP);
  const drawnPoints = CAP_PROJ.points(drawn);
  return (
    <View style={styles.capture}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
        <RealStreets proj={CAP_PROJ} opacity={0.07} />
        {/* La zone capturée qui SE REMPLIT (le payoff). */}
        <Path
          d={CAP_ZONE_PATH}
          fill={withAlpha(colors.chartreuse, 0.22)}
          stroke={territoryStyle.crewStroke}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={fillOp}
        />
        {/* Trace héros : casing sombre + core chartreuse qui se dessine et ferme. */}
        <Polyline
          points={drawnPoints}
          stroke={traceStyle.casing}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points={drawnPoints}
          stroke={traceStyle.core}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Départ = arrivée (la boucle se referme dessus). */}
        <Circle cx={CAP_START.x} cy={CAP_START.y} r={5} fill={colors.noir} stroke={traceStyle.core} strokeWidth={2.5} />
        {closed ? <Circle cx={CAP_START.x} cy={CAP_START.y} r={6.5} fill={traceStyle.core} /> : null}
      </Svg>
    </View>
  );
}

// ─── Barre de progression du déroulé d'import (branche 3a) ───────────────────

/**
 * Barre de progression sobre du déroulé d'import (3a) — remplissage chartreuse
 * (état « en cours », emploi §C.3 (4)). `p` 0..1 piloté par le hook useSyncDemo.
 * Piste carbone, jamais de skeleton chartreuse (charte §G : loaders gris).
 */
export function SyncProgressBar({ p }: { p: number }) {
  const pct = Math.max(0, Math.min(1, p));
  return (
    <View style={styles.syncTrack}>
      <View style={[styles.syncFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hookBg: { ...StyleSheet.absoluteFillObject },
  board: {
    width: '100%',
    aspectRatio: BOARD_W / BOARD_H,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: withAlpha(colors.blanc, 0.12),
    backgroundColor: gameColors.carbon,
    overflow: 'hidden',
  },
  capture: {
    width: '100%',
    aspectRatio: BOARD_W / BOARD_H,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: withAlpha(colors.chartreuse, 0.3),
    backgroundColor: gameColors.carbon,
    overflow: 'hidden',
  },
  syncTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.carbone2,
    overflow: 'hidden',
  },
  syncFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.chartreuse,
  },
});
