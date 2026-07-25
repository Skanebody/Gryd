/**
 * GRYD — LA DÉMONSTRATION ANIMÉE DE L'ONBOARDING. SVG react-native-svg (cross
 * natif / web preview), TOUTES les couleurs dérivées des tokens (charte : toute
 * couleur hors tokens = bug ; jamais de chartreuse sur fond clair — ici tout est
 * sur noir). Réutilise `territoryStyle` / `traceStyle` (mapStyle) et le hook
 * `useReduceMotion` du design system.
 *
 *   RivalryDemo — carte 2 « RIVALITÉ » : la zone tenue devient contestée. (La
 *   carte 1 est rendue par `E01Hero` + `E01Route` — cf. la note plus bas.)
 *
 * VRAIS TRACÉS (demande fondateur) : plus AUCUN blob ni ellipse décoratif —
 * chaque territoire et chaque trace sont projetés depuis de VRAIES géométries de
 * boucles et de rues (`realAnchors`) par le projecteur pur `fitTracesToBox`. Un
 * tracé qui ne ressemble pas à une course n'enseigne pas une course.
 *
 * ─── ELLES NE CALCULENT RIEN (23/07/2026) ───────────────────────────────────
 * Les deux composants ne font que RENDRE l'état renvoyé par le module PUR
 * `demoPhases.ts` à l'instant t (bornes du storyboard, ordre des temps,
 * invariants de sens, géométrie projetée). C'est la seule façon de PROUVER une
 * animation ici : dans l'aperçu headless `document.visibilityState` vaut
 * "hidden", `requestAnimationFrame` tourne à 0 fps, et toute capture d'écran
 * montre une image figée qui ne prouve rien.
 *
 * ─── CE QUI A ÉTÉ SUPPRIMÉ LE 23/07/2026 (refonte « 3 cartes ») ─────────────
 * `HookMapBackground` (rues grises décoratives traversant le splash),
 * `TerrainVisual` (le plateau 3-rôles de l'écran `learn`) et `LogoRouteMark`
 * (la petite forme G flottante, avec son module `logoRoute`) figuraient mot pour
 * mot dans la liste « à supprimer » du fondateur. Leurs écrans n'existent plus :
 * on les RETIRE au lieu de les laisser en dette. Ce qu'ils avaient de vrai est
 * passé dans les démonstrations ci-dessous — géométrie réelle, chip « Exemple »,
 * mouvement réduit respecté.
 *
 * ─── HONNÊTETÉ ─────────────────────────────────────────────────────────────
 * Ces plateaux ILLUSTRENT une règle ; ils n'affichent aucun état du monde. Chip
 * « Exemple » posée sur le visuel, AUCUN lieu nommé, AUCUN nom de crew, AUCUN
 * chiffre attribué au joueur, AUCUNE célébration (le label du 4e temps est
 * BLANC : nommer n'est pas célébrer). Et ils ne se recentrent JAMAIS sur la
 * ville que le joueur vient de choisir : le jour où l'exemple devient « ta
 * ville », il ment sur l'état de son monde.
 */
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Polyline, G } from 'react-native-svg';
import { colors, fontSizes, fonts, gameColors, radii, spacing } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
import { territoryStyle, withAlpha } from '../map/mapStyle';
import { fitTracesToBox } from '../map/projectTrace';
import {
  CAPTURE_LOOP,
  DEMO_BOARD_H,
  DEMO_BOARD_W,
  DEMO_CYCLE_MS,
  DEMO_PLAY_MS,
  DEMO_STREETS,
  RIVAL_LOOP,
  RIVALRY_PROJ,
  demoElapsedMs,
  rivalryPhases,
} from './demoPhases';
import type { LatLngPoint } from '../map/realAnchors';
// La chip d'honnêteté est un COMPOSANT PARTAGÉ (`./ExampleTag`) : elle vivait ici,
// et elle a disparu du premier écran de l'app le jour où ce fichier a cessé d'en
// être l'hôte. Un garde-fou ne se range pas dans le composant qu'il garde.
import { ExampleTag } from './ExampleTag';

/**
 * Rues réelles projetées — DÉCOR, jamais un état de jeu, jamais nommé à l'écran.
 * Ni projection ni liste par défaut : chaque démonstration passe LA SIENNE (les
 * deux cartes n'ont pas le même cadrage), et un défaut invisible serait le
 * meilleur moyen de dessiner le mauvais quartier sans s'en apercevoir.
 */
function RealStreets({
  proj,
  streets,
  opacity = 0.08,
}: {
  proj: ReturnType<typeof fitTracesToBox>;
  streets: readonly (readonly LatLngPoint[])[];
  opacity?: number;
}) {
  return (
    <>
      {streets.map((street, i) => (
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

// ═══════════════════════════════════════════════════════════════════════════
// LA MICRO-DÉMONSTRATION (cartes 1 et 2) — elle DÉMONTRE, elle ne décore pas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Horloge des démonstrations : UNE seule `Animated.timing` LINÉAIRE bouclée,
 * dont la valeur brute est convertie en millisecondes par `demoElapsedMs`
 * (module pur). Deux raisons, toutes deux déjà payées :
 *
 *  · `Animated.loop(Animated.sequence([...]))` — la forme naturelle d'un
 *    storyboard à 4 temps — NE DÉMARRE PAS sur react-native-web : mesuré sur
 *    6 s le 21/07/2026, le tracé restait figé à 0. La tenue de fin est donc
 *    calculée au rendu, pas jouée par l'animation.
 *  · driver JS obligatoire (`useNativeDriver: false`) : ces valeurs pilotent des
 *    props SVG, pas des transforms.
 *
 * MOUVEMENT RÉDUIT : aucune animation dégradée, aucun écran vide — on affiche
 * l'ÉTAT FINAL lisible (boucle fermée, zone remplie, label posé), qui est très
 * exactement `capturePhases(DEMO_PLAY_MS)`.
 *
 * `replayKey` relance le cycle depuis zéro (tap sur le visuel).
 */
function useDemoElapsed(replayKey: number): { ms: number; reduce: boolean } {
  const reduce = useReduceMotion();
  const [raw, setRaw] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    anim.setValue(0);
    setRaw(0);
    const id = anim.addListener(({ value }) => setRaw(value));
    const runner = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: DEMO_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    runner.start();
    return () => {
      runner.stop();
      anim.removeListener(id);
    };
  }, [anim, reduce, replayKey]);
  return { ms: reduce ? DEMO_PLAY_MS : demoElapsedMs(raw), reduce };
}

/**
 * Cadre commun des deux démonstrations : le plateau, la chip « Exemple », le
 * label bref du 4e temps, et le tap-pour-rejouer.
 *
 * Le tap n'est peint comme BOUTON que s'il fait réellement quelque chose : sans
 * libellé d'accessibilité, ou en mouvement réduit (l'image est déjà à son état
 * final — la rejouer ne montrerait rien), aucun `Pressable` n'est monté. Un
 * bouton qui n'aboutit jamais est le bouton mort de §A4 ; son absence, elle,
 * ne ment pas.
 */
function DemoFrame({
  exampleLabel,
  label,
  labelOpacity,
  replayA11y,
  onReplay,
  children,
}: {
  exampleLabel?: string;
  label?: string;
  labelOpacity: number;
  replayA11y?: string;
  onReplay?: () => void;
  children: ReactNode;
}) {
  const board = (
    <View style={styles.board}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${DEMO_BOARD_W} ${DEMO_BOARD_H}`}>
        {children}
      </Svg>
      {/* Coin haut-DROIT du plateau — position fixe, jamais sur la trace. */}
      <ExampleTag label={exampleLabel} style={styles.exampleTag} />
      {/* Le label bref (4e temps). BLANC, jamais chartreuse : nommer ce qui
          vient de se passer est de la pédagogie ; le peindre en couleur de gain
          serait célébrer une capture que personne n'a courue. */}
      {label ? (
        <View style={[styles.demoLabel, { opacity: labelOpacity }]} pointerEvents="none">
          <Text style={styles.demoLabelText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
  if (!onReplay || !replayA11y) return board;
  return (
    <Pressable onPress={onReplay} accessibilityRole="button" accessibilityLabel={replayA11y}>
      {board}
    </Pressable>
  );
}

/** Tap-pour-rejouer : une clé qui remonte l'effet d'animation. */
function useReplay(): { key: number; replay: () => void } {
  const [key, setKey] = useState(0);
  const replay = useCallback(() => setKey((k) => k + 1), []);
  return { key, replay };
}

/**
 * ⚠️ `CaptureDemo` (carte 1) A ÉTÉ RETIRÉE LE 25/07/2026. Elle n'avait plus AUCUN
 * importeur depuis que la carte 1 est rendue par le hero plein cadre `E01Hero` et
 * sa boucle `E01Route` : ~90 lignes compilées, jamais montées. Garder du code
 * jamais rendu, c'est garantir qu'il divergera de ce qui est à l'écran — et c'est
 * exactement comme ça que la chip « Exemple » a disparu du premier écran de
 * l'app : le garde-fou vivait dans le composant remplacé.
 *
 * Ce qui lui servait reste, et pour de bonnes raisons : `capturePhases`
 * (`demoPhases.ts`) est le STORYBOARD PUR de la capture — l'ordre « la zone ne se
 * remplit qu'après la fermeture » y est verrouillé et testé, indépendamment de
 * tout composant.
 */

/**
 * CARTE 2 — LA RIVALITÉ. « Ta zone peut être reprise. »
 *
 * Même grammaire, même durée, même cadre que la carte 1 — c'est volontaire :
 * deux visuels qui se lisent pareil enseignent une suite, deux visuels
 * différents enseignent deux objets. Ici, ma zone est DÉJÀ tenue (l'acquis de
 * la carte 1) ; la zone d'à côté monte en pression (orange) ; puis la mienne
 * bascule en CONTESTÉE — violet + double contour §C (contour extérieur rival,
 * contour intérieur mon crew : deux crews sur la même zone).
 *
 * Couleurs par RÔLE, jamais par identité : aucun crew n'est nommé, aucun rival
 * n'existe (l'app n'a ni joueur ni classement à montrer). C'est une règle qui
 * est illustrée, pas un état du monde.
 */
export function RivalryDemo({
  exampleLabel,
  label,
  replayA11y,
}: {
  exampleLabel?: string;
  label?: string;
  replayA11y?: string;
}) {
  const { key, replay } = useReplay();
  const { ms, reduce } = useDemoElapsed(key);
  const p = rivalryPhases(ms);
  const minePath = RIVALRY_PROJ.path(CAPTURE_LOOP, true);
  const rivalPath = RIVALRY_PROJ.path(RIVAL_LOOP, true);
  return (
    <DemoFrame
      exampleLabel={exampleLabel}
      label={label}
      labelOpacity={p.label}
      replayA11y={reduce ? undefined : replayA11y}
      onReplay={reduce ? undefined : replay}
    >
      <RealStreets proj={RIVALRY_PROJ} streets={DEMO_STREETS} opacity={0.1} />
      {/* MA ZONE — établie, puis cédant la place à l'état contesté. */}
      <Path
        d={minePath}
        fill={territoryStyle.crewFill}
        stroke={territoryStyle.crewStroke}
        strokeWidth={2}
        strokeLinejoin="round"
        opacity={p.mine * (1 - p.contested)}
      />
      {/* LA ZONE D'À CÔTÉ — un rôle « rival », pas une identité. */}
      <Path
        d={rivalPath}
        fill={territoryStyle.rivalFill}
        stroke={territoryStyle.rivalStroke}
        strokeWidth={2}
        strokeLinejoin="round"
        opacity={p.threat}
      />
      {/* CONTESTÉE §C — double contour décalé (jamais un seul trait bicolore),
          et JAMAIS de pulsation : le contesté ne pulse plus (A-37 §5). */}
      <G opacity={p.contested}>
        <Path
          d={minePath}
          fill={territoryStyle.contestedFill}
          stroke={territoryStyle.contestedOuterStroke}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <Path
          d={minePath}
          fill="none"
          stroke={territoryStyle.contestedInnerStroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </G>
    </DemoFrame>
  );
}


const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: DEMO_BOARD_W / DEMO_BOARD_H,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: withAlpha(colors.blanc, 0.12),
    backgroundColor: gameColors.carbon,
    overflow: 'hidden',
  },
  // POSITION de la chip « Exemple » (sa forme vit dans `./ExampleTag`) : coin
  // haut-droit du plateau, toujours le même — on la cherche au même endroit.
  exampleTag: { position: 'absolute', top: spacing.xs, right: spacing.xs },
  // Label bref du 4e temps (2,1-3 s) : posé en bas à gauche du plateau, sur
  // fond noir opaque pour rester lisible par-dessus la zone remplie. BLANC —
  // nommer n'est pas célébrer (la chartreuse dirait « gain »). Jamais < 12 px.
  demoLabel: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.noir, 0.82),
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  demoLabelText: {
    color: colors.blanc,
    fontFamily: fonts.textBold, // la famille porte la graisse (jamais de fontWeight par-dessus)
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
  },
});

