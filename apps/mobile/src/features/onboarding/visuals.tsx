/**
 * GRYD — visuels des étapes d'onboarding sans friction (AMENDEMENT-30). SVG
 * react-native-svg (cross natif/web preview), TOUTES les couleurs dérivées des
 * tokens (charte : toute couleur hors tokens = bug ; jamais de chartreuse sur
 * fond clair — ici tout est sur noir). Réutilise `territoryStyle`/`traceStyle`
 * (mapStyle) et les hooks d'anim du design system (reduce motion respecté).
 *
 * Quatre briques :
 *   HookMapBackground — carte stylisée animée EN FOND du splash (§1).
 *   CityBoard         — le TERRAIN DE JEU en plateau DÉMO (aucune localisation
 *                       réelle) : zones par rôle, rival, zone-objectif (§2, §C).
 *   CaptureFillVisual — la zone-cible qui SE REMPLIT à la capture (§5, payoff).
 *   SyncProgressBar   — barre de progression sobre du déroulé d'import (3a).
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { colors, gameColors } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
import { territoryStyle, traceStyle, withAlpha } from '../map/mapStyle';

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

// ─── Décor de plan commun (rues + territoires organiques) ────────────────────

const BOARD_W = 320;
const BOARD_H = 300;

/** Rues stylisées du plan (traits fins neutres) — décor, jamais un état de jeu. */
const STREETS: readonly string[] = [
  'M0,70 C80,60 220,84 320,66',
  'M0,138 C90,128 240,150 320,134',
  'M0,208 C100,198 226,220 320,206',
  'M62,0 C58,90 66,180 60,300',
  'M158,0 C154,96 164,196 156,300',
  'M248,0 C254,92 244,198 252,300',
];

/** Territoire de MON crew (blob organique, bas-gauche) — chartreuse discret. */
const MINE_BLOB =
  'M26,150 C18,120 44,96 84,94 C120,92 150,104 158,128 C164,146 152,158 138,164 C154,176 156,196 138,208 C112,226 60,222 40,198 C28,184 30,168 26,150 Z';
/** Territoire RIVAL (blob, haut-droite) — orange, l'état se lit à la frontière. */
const RIVAL_BLOB =
  'M198,70 C214,46 258,42 288,58 C312,72 320,102 304,124 C292,140 270,146 254,138 C242,148 222,150 206,140 C186,128 180,104 186,84 C188,76 192,74 198,70 Z';
/** ZONE-OBJECTIF (blob central, neutre) — celle que le joueur va prendre (§2). */
const TARGET_BLOB =
  'M138,150 C150,132 184,128 206,142 C226,154 230,180 210,196 C190,212 152,208 138,190 C128,178 128,164 138,150 Z';

/** Aplat + traits du plan de quartier (fond commun ville/capture). */
function BoardBase({ rivalOpacity = 1 }: { rivalOpacity?: number }) {
  return (
    <>
      {STREETS.map((d) => (
        <Path key={d} d={d} stroke={withAlpha(colors.blanc, 0.08)} strokeWidth={2} fill="none" />
      ))}
      {/* Mon territoire — aplat chartreuse discret + trait net (zéro halo). */}
      <Path
        d={MINE_BLOB}
        fill={territoryStyle.crewFill}
        stroke={territoryStyle.crewStroke}
        strokeWidth={1.8}
      />
      {/* Territoire rival — frontière orange marquée. */}
      <Path
        d={RIVAL_BLOB}
        fill={territoryStyle.rivalFill}
        stroke={territoryStyle.rivalStroke}
        strokeWidth={2.4}
        opacity={rivalOpacity}
      />
    </>
  );
}

// ─── 1 — Fond de carte animé du splash (§1) ──────────────────────────────────

/**
 * Carte stylisée EN FOND du hook : le plan + les territoires apparaissent en
 * douceur, une trace chartreuse se dessine lentement (vie, pas décor gratuit).
 * Volontairement ATTÉNUÉ (opacity globale basse) : c'est un fond, le titre
 * domine. Reduce motion → état final direct.
 */
const HOOK_TRACE =
  'M40,250 C34,210 58,176 100,162 C142,148 196,150 232,168 C262,183 268,214 244,232';
const HOOK_TRACE_LEN = 430;

export function HookMapBackground() {
  const p = useProgress(3200, 0, false);
  const drawP = ramp(p, 0.1, 0.9);
  const fadeIn = ramp(p, 0, 0.4);
  return (
    <View style={styles.hookBg} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} preserveAspectRatio="xMidYMid slice">
        <G opacity={0.5 * fadeIn + 0.001}>
          <BoardBase rivalOpacity={fadeIn} />
        </G>
        {/* Trace chartreuse qui se dessine (casing sombre dessous). */}
        <Path
          d={HOOK_TRACE}
          stroke={traceStyle.casing}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${HOOK_TRACE_LEN}`}
          strokeDashoffset={HOOK_TRACE_LEN * (1 - drawP)}
        />
        <Path
          d={HOOK_TRACE}
          stroke={traceStyle.core}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${HOOK_TRACE_LEN}`}
          strokeDashoffset={HOOK_TRACE_LEN * (1 - drawP)}
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}

// ─── 2 — Le terrain de jeu en plateau (§2) ───────────────────────────────────

/**
 * Le TERRAIN DE JEU (plateau DÉMO — aucune localisation réelle, la copy de
 * l'écran l'assume) : le plan + mon territoire + le rival + une ZONE-OBJECTIF
 * neutre qui PULSE doucement (« celle-ci, prends-la »). Les 3 rôles se lisent
 * par couleur ET forme (§C) : chartreuse = moi, orange = rival, cible pointillée
 * pulsée = objectif. Position du joueur = flèche chartreuse dans mon territoire.
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
        {STREETS.map((d) => (
          <Path key={d} d={d} stroke={withAlpha(colors.blanc, 0.08)} strokeWidth={2} fill="none" />
        ))}
        {/* Mon territoire. */}
        <Path
          d={MINE_BLOB}
          fill={territoryStyle.crewFill}
          stroke={territoryStyle.crewStroke}
          strokeWidth={1.8}
          opacity={mineOp}
        />
        {/* Rival. */}
        <Path
          d={RIVAL_BLOB}
          fill={territoryStyle.rivalFill}
          stroke={territoryStyle.rivalStroke}
          strokeWidth={2.4}
          opacity={rivalOp}
        />
        {/* Zone-objectif neutre : aplat très léger + contour pointillé PULSÉ. */}
        <Path
          d={TARGET_BLOB}
          fill={territoryStyle.objectiveFill}
          stroke={withAlpha(colors.chartreuse, 0.7)}
          strokeWidth={2}
          strokeDasharray="6 5"
          opacity={targetOp * targetPulse}
        />
        {/* Position du joueur : flèche/triangle chartreuse dans mon territoire. */}
        <G opacity={mineOp}>
          <Circle cx={82} cy={150} r={11} fill={withAlpha(colors.chartreuse, 0.16)} />
          <Path d="M82,142 L88,156 L82,152 L76,156 Z" fill={colors.chartreuse} />
        </G>
      </Svg>
    </View>
  );
}

// ─── 5 — La capture : la zone-cible se remplit (§5, moment signature) ─────────

const CAP_TRACE =
  'M96,214 C82,180 100,150 138,142 C182,133 220,146 232,178 C242,206 224,232 190,236 C158,240 120,236 108,224 C102,219 100,220 96,214';
const CAP_TRACE_LEN = 470;
/** Blob intérieur (la zone) qui se remplit une fois la boucle fermée. */
const CAP_ZONE =
  'M112,196 C100,164 124,140 162,134 C200,128 234,142 240,172 C246,198 226,222 192,226 C154,230 122,224 112,196 Z';

/**
 * Animation de REMPLISSAGE de zone à la capture (§5). Progression pilotée par le
 * parent (`p` 0..1 — même déroulé que le compteur « +X »), pour que l'anim et le
 * chiffre montent ensemble. La trace se dessine, ferme la boucle, l'intérieur se
 * remplit en chartreuse. Reduce motion : le parent passe p=1 → état final.
 */
export function CaptureFillVisual({ p }: { p: number }) {
  const drawP = ramp(p, 0, 0.62);
  const closed = p >= 0.66;
  const fillOp = ramp(p, 0.66, 1);
  return (
    <View style={styles.capture}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
        {STREETS.map((d) => (
          <Path key={d} d={d} stroke={withAlpha(colors.blanc, 0.07)} strokeWidth={2} fill="none" />
        ))}
        {/* Le rival, en retrait (contexte). */}
        <Path d={RIVAL_BLOB} fill={territoryStyle.rivalFill} stroke={territoryStyle.rivalStroke} strokeWidth={2} opacity={0.5} />
        {/* La zone capturée qui SE REMPLIT (le payoff). */}
        <Path
          d={CAP_ZONE}
          fill={withAlpha(colors.chartreuse, 0.22)}
          stroke={territoryStyle.crewStroke}
          strokeWidth={2}
          opacity={fillOp}
        />
        {/* Trace héros : casing sombre + core chartreuse qui se dessine et ferme. */}
        <Path
          d={CAP_TRACE}
          stroke={traceStyle.casing}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${CAP_TRACE_LEN}`}
          strokeDashoffset={CAP_TRACE_LEN * (1 - drawP)}
        />
        <Path
          d={CAP_TRACE}
          stroke={traceStyle.core}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${CAP_TRACE_LEN}`}
          strokeDashoffset={CAP_TRACE_LEN * (1 - drawP)}
        />
        {/* Départ = arrivée (la boucle se referme dessus). */}
        <Circle cx={96} cy={214} r={5} fill={colors.noir} stroke={traceStyle.core} strokeWidth={2.5} />
        {closed ? <Circle cx={96} cy={214} r={6.5} fill={traceStyle.core} /> : null}
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
