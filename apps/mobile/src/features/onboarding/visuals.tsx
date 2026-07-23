/**
 * GRYD — LES DEUX DÉMONSTRATIONS DE L'ONBOARDING. SVG react-native-svg (cross
 * natif / web preview), TOUTES les couleurs dérivées des tokens (charte : toute
 * couleur hors tokens = bug ; jamais de chartreuse sur fond clair — ici tout est
 * sur noir). Réutilise `territoryStyle` / `traceStyle` (mapStyle) et le hook
 * `useReduceMotion` du design system.
 *
 *   CaptureDemo — carte 1 « MÉCANIQUE » : la boucle se ferme, la zone bascule.
 *   RivalryDemo — carte 2 « RIVALITÉ »  : la zone tenue devient contestée.
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
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
import { territoryStyle, traceStyle, withAlpha } from '../map/mapStyle';
import { fitTracesToBox, tracePrefix } from '../map/projectTrace';
import {
  CAPTURE_LOOP,
  CAPTURE_PROJ,
  DEMO_BOARD_H,
  DEMO_BOARD_W,
  DEMO_CYCLE_MS,
  DEMO_PLAY_MS,
  DEMO_STREETS,
  RIVAL_LOOP,
  RIVALRY_PROJ,
  capturePhases,
  demoElapsedMs,
  rivalryPhases,
} from './demoPhases';
import type { LatLngPoint } from '../map/realAnchors';

/**
 * Chip « Exemple » posée SUR le visuel (décision fondateur 21/07/2026 : un
 * exemple a le droit d'enseigner, à condition d'être ÉTIQUETÉ comme exemple et
 * jamais présenté comme les données du joueur). Discrète, neutre (gris — pas
 * chartreuse : ce n'est pas un gain), toujours au même endroit : coin haut-droit.
 * Le libellé vient de l'écran (copy i18n) — le visuel ne porte aucun texte propre.
 */
function ExampleTag({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <View style={styles.exampleTag} pointerEvents="none">
      <Text style={styles.exampleTagLabel}>{label}</Text>
    </View>
  );
}

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
      <ExampleTag label={exampleLabel} />
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
 * Premier point de la boucle héros (= son point d'arrivée : elle s'y referme).
 * Le repli n'est pas un lieu : c'est l'ORIGINE du plateau, choisie pour qu'un
 * tableau vide ne produise ni exception ni point posé au hasard sur une ville.
 */
const CAPTURE_START: LatLngPoint = CAPTURE_LOOP[0] ?? { lat: 0, lng: 0 };

/**
 * CARTE 1 — LA MÉCANIQUE. « Ferme une boucle. Prends la zone. »
 *
 * Quatre temps en 3 s, bouclés : la trace se dessine le long de VRAIES rues →
 * la boucle se referme sur son point de départ → l'intérieur bascule en
 * chartreuse → un label bref nomme ce qui vient de se passer. Elle doit se
 * comprendre SANS lire le texte de l'écran ; c'est pour ça qu'elle ne montre
 * qu'UNE chose (le geste), sans rival ni crew — ceux-là sont la carte 2.
 *
 * HONNÊTETÉ : géométrie réelle (un tracé crédible), mais aucun lieu nommé,
 * aucun chiffre attribué au joueur, aucune célébration, et la chip « Exemple »
 * posée sur le visuel. L'ordre est verrouillé par `demoPhases` : la zone ne peut
 * PAS se remplir avant que la boucle soit fermée — sinon l'image enseignerait
 * une règle fausse.
 */
export function CaptureDemo({
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
  const p = capturePhases(ms);
  const drawn = tracePrefix(CAPTURE_LOOP, p.draw);
  const drawnPoints = CAPTURE_PROJ.points(drawn);
  const start = CAPTURE_PROJ.project(CAPTURE_START);
  const head = CAPTURE_PROJ.project(drawn[drawn.length - 1] ?? CAPTURE_START);
  return (
    <DemoFrame
      exampleLabel={exampleLabel}
      label={label}
      labelOpacity={p.label}
      replayA11y={reduce ? undefined : replayA11y}
      onReplay={reduce ? undefined : replay}
    >
      <RealStreets proj={CAPTURE_PROJ} streets={DEMO_STREETS} opacity={0.1} />
      {/* La zone conquise — elle n'apparaît qu'APRÈS la fermeture (invariant). */}
      <Path
        d={CAPTURE_PROJ.path(CAPTURE_LOOP, true)}
        fill={territoryStyle.crewFill}
        stroke={territoryStyle.crewStroke}
        strokeWidth={2}
        strokeLinejoin="round"
        opacity={p.fill}
      />
      {/* Trace héros §B : casing sombre + core chartreuse, bouts arrondis. */}
      {p.draw > 0 ? (
        <>
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
          {/* Départ = arrivée. L'anneau se resserre pendant le temps « close » :
              on VOIT la boucle se refermer sur son point de départ. */}
          <Circle
            cx={start.x}
            cy={start.y}
            r={9 - 3.5 * p.close}
            fill="none"
            stroke={withAlpha(colors.chartreuse, 0.25 + 0.6 * p.close)}
            strokeWidth={1.5 + p.close}
          />
          <Circle
            cx={start.x}
            cy={start.y}
            r={4.5}
            fill={colors.noir}
            stroke={traceStyle.core}
            strokeWidth={2.5}
          />
        </>
      ) : null}
      {/* Le repère de position, exactement celui de la carte réelle. */}
      {p.head ? (
        <G>
          <Circle cx={head.x} cy={head.y} r={11} fill={withAlpha(colors.chartreuse, 0.16)} />
          <Circle
            cx={head.x}
            cy={head.y}
            r={5.5}
            fill={colors.chartreuse}
            stroke={colors.blanc}
            strokeWidth={2}
          />
        </G>
      ) : null}
    </DemoFrame>
  );
}

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
  // Chip « Exemple » : posée SUR le visuel, coin haut-droit, neutre et lisible
  // (fond noir opaque + contour gris — jamais chartreuse, ce n'est pas un gain).
  exampleTag: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  exampleTagLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
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
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});

