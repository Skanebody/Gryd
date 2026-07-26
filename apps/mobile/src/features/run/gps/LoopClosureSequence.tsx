/**
 * GRYD — E08 « FERMETURE & CAPTURE » : la séquence de 900-1100 ms jouée SUR la
 * course, sans jamais l'interrompre.
 *
 * ─── CE QU'ELLE AFFIRME, ET RIEN DE PLUS ────────────────────────────────────
 * À cet instant, `ingest_run` n'a PAS encore parlé : la course n'est pas finie.
 * Le seul fait disponible est GÉOMÉTRIQUE et mesuré côté client — la trace est
 * revenue sous LOOP_CLOSE_TOLERANCE_M de son départ après au moins
 * LOOP_MIN_PERIMETER_M. La séquence dit donc « BOUCLE FERMÉE » et, si le
 * comptage local en a, « +N zones estimées » (déjà étiquetées estimées par le
 * tracker). Elle NE DIT PAS, parce qu'aucune source ne les porte :
 *   · le NOM de la zone (le serveur n'en renvoie aucun ; le résultat E09 lui-même
 *     se rabat sur « Zone », jamais sur un faux nom) ;
 *   · l'AIRE en km² (IngestRunResponse ne porte que des COMPTES d'hexes, et
 *     OFFENSIVE_HEX_AREA_KM2 porte l'interdiction explicite d'être affichée) ;
 *   · « repris », « capturé pour <crew> », « premier territoire », « partielle » —
 *     autant de VERDICTS SERVEUR, qui vivent légitimement en E09.
 * Aucune valeur d'ici ne franchit la frontière vers l'écran de résultat.
 *
 * ─── MISE EN SCÈNE (planche) ────────────────────────────────────────────────
 * Pas de modale, pas de confettis : la carte RÉELLE s'assombrit et la boucle se
 * remplit comme une encre cartographique, projetée avec EXACTEMENT la même
 * mathématique que la carte (liveView.projectOnScreen) — sinon l'encre serait à
 * côté du tracé. Puis tout se réduit en badge persistant, et le live revient.
 *   0-150   contour fermé + impulsion au point de fermeture
 *   150-550 remplissage depuis ce point
 *   550-700 libellé + haptique ferme
 *   700-900 fait chiffré (zones estimées, si le comptage en a)
 *   900-1100 réduction en badge, tenu 6 s
 * SKIPPABLE au tap. Reduce Motion → fondu court sans remplissage. Vitesse
 * ÉLEVÉE (mesurée) → badge seul, immédiatement : personne ne regarde une
 * surface animée en sécurité à 20 km/h.
 *
 * Les minutages sont des constantes LOCALES de PRÉSENTATION (patron
 * `COUNTDOWN_STEP_MS` d'E06) : ils ne décident d'aucune règle de jeu et n'ont
 * donc rien à faire dans les design-tokens partagés.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Line, Pattern, Polygon, Polyline } from 'react-native-svg';
import { type Activity, colors, fonts, fontSizes, radii, spacing, withAlpha } from '@klaim/shared';
import { C, RUN_GPS_COPY } from '../../../i18n/catalog/runGps';
import { useT } from '../../../i18n/store';
import { haptics } from '../../../lib/haptics';
import { formatInt } from '../../../ui/format';
import { useReduceMotion } from '../../../ui/game/anim';
import { traceStyle } from '../../map/mapStyle';
import { projectOnScreen, type LatLng, type LiveCamera, type ScreenBox } from './engine/liveView';

/** Paliers de la planche (ms) — présentation pure, jamais une règle de jeu. */
const STEP_CONTOUR_MS = 150;
const STEP_FILL_MS = 400;
const STEP_LABEL_MS = 150;
const STEP_FACT_MS = 200;
const STEP_COLLAPSE_MS = 200;
/** Badge persistant avant retour au live (planche : 6 s). */
const BADGE_HOLD_MS = 6_000;
/** Reduce Motion : fondu court, plafond de la planche (≤ 400 ms). */
const REDUCED_FADE_MS = 400;
/** Cadence de rafraîchissement du rayon d'encre (~30 i/s : fluide, pas coûteux). */
const INK_TICK_MS = 33;
/**
 * Hachures HORIZONTALES du territoire capturé (planche E08, -selection13 : le
 * remplissage n'est pas un aplat mais des traits horizontaux, signature « encre
 * cartographique »). Présentation PURE, au même titre que les minutages : ces
 * pixels ne décident d'aucune règle de jeu et restent donc des constantes
 * locales. `HATCH_STEP_PX` = écart vertical entre deux traits (MESURÉ ~8-10 px
 * sur la planche) ; `HATCH_STROKE_PX` = épaisseur d'un trait d'encre.
 */
const HATCH_STEP_PX = 9;
const HATCH_STROKE_PX = 1.5;

type Stage = 'contour' | 'fill' | 'label' | 'fact' | 'collapse' | 'badge';

export interface LoopClosureSequenceProps {
  /** La boucle RÉELLEMENT mesurée, dans l'ordre (le retour au départ la ferme). */
  loop: readonly LatLng[];
  /** Point de fermeture = le départ, là où l'encre naît. */
  closurePoint: LatLng;
  /** Caméra GELÉE le temps de la séquence (sinon l'encre dériverait). */
  camera: LiveCamera;
  box: ScreenBox;
  /** Comptage LOCAL de zones traversées, déjà étiqueté estimé. 0 → ligne omise. */
  zonesEstimated: number;
  /** Vitesse mesurée élevée → réduction de SÉCURITÉ (badge seul). */
  reduced: boolean;
  /**
   * Discipline de la sortie. Elle ne change RIEN à ce qui est dessiné — la
   * géométrie est la géométrie — mais elle décide du libellé LU du badge :
   * « Boucle fermée pendant cette course » était faux à vélo. Le titre visible
   * (« BOUCLE FERMÉE »), lui, est déjà neutre et n'a pas de twin.
   */
  activity: Activity;
  onDone: () => void;
}

export function LoopClosureSequence({
  loop,
  closurePoint,
  camera,
  box,
  zonesEstimated,
  reduced,
  activity,
  onDone,
}: LoopClosureSequenceProps) {
  const t = useT();
  const reduceMotion = useReduceMotion();
  // Deux raisons DISTINCTES de ne pas animer : la préférence système
  // (Réduire les animations) et la sûreté (vitesse mesurée élevée). Les deux
  // suppriment le remplissage ; la sûreté saute en plus directement au badge.
  const still = reduceMotion || reduced;

  const [stage, setStage] = useState<Stage>(reduced ? 'badge' : 'contour');
  const [inkRatio, setInkRatio] = useState(still ? 1 : 0);
  const doneRef = useRef(false);

  const anchor = useMemo(
    () => projectOnScreen(closurePoint, camera, box),
    [closurePoint, camera, box],
  );
  const polygon = useMemo(
    () =>
      loop
        .map((p) => projectOnScreen(p, camera, box))
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' '),
    [loop, camera, box],
  );
  // Rayon d'encre suffisant pour couvrir la boucle entière depuis le point de
  // fermeture (le coin le plus éloigné du viewport : jamais un remplissage
  // tronqué, quel que soit le cadrage).
  const maxRadius = useMemo(() => {
    const dx = Math.max(anchor.x, box.width - anchor.x);
    const dy = Math.max(anchor.y, box.height - anchor.y);
    return Math.hypot(dx, dy);
  }, [anchor, box]);

  const finish = useRef(onDone);
  finish.current = onDone;

  // Enchaînement des paliers. Un seul timer vivant à la fois ; `doneRef` garantit
  // qu'on ne rend la main qu'une fois (Strict Mode double-invoque les effets).
  useEffect(() => {
    if (stage === 'badge') {
      const id = setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        finish.current();
      }, BADGE_HOLD_MS);
      return () => clearTimeout(id);
    }
    const next: Record<Exclude<Stage, 'badge'>, { to: Stage; ms: number }> = {
      contour: { to: 'fill', ms: still ? 0 : STEP_CONTOUR_MS },
      fill: { to: 'label', ms: still ? 0 : STEP_FILL_MS },
      label: { to: 'fact', ms: still ? REDUCED_FADE_MS : STEP_LABEL_MS },
      fact: { to: 'collapse', ms: still ? 0 : STEP_FACT_MS },
      collapse: { to: 'badge', ms: still ? 0 : STEP_COLLAPSE_MS },
    };
    const step = next[stage];
    const id = setTimeout(() => setStage(step.to), step.ms);
    return () => clearTimeout(id);
  }, [stage, still]);

  // Haptique FERME au moment du libellé (planche). Aucun son : GRYD n'embarque
  // aucune dépendance audio — un « son court » serait un contrôle mort.
  useEffect(() => {
    if (stage === 'label') haptics.success();
  }, [stage]);

  // Remplissage : rayon qui croît depuis le point de fermeture. Piloté par un
  // pas de temps simple (et non par un attribut SVG animé) — même rendu sur
  // natif et sur le bundle web, sans dépendre du support des props animées.
  useEffect(() => {
    if (stage !== 'fill' || still) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / STEP_FILL_MS);
      setInkRatio(ratio);
      if (ratio >= 1) clearInterval(id);
    }, INK_TICK_MS);
    return () => clearInterval(id);
  }, [stage, still]);

  // Passer au tap : la séquence se réduit immédiatement à son badge.
  const skip = () => {
    if (stage === 'badge') return;
    setInkRatio(1);
    setStage('badge');
  };

  const showInk = stage !== 'badge' && !reduced;
  const showText = stage === 'label' || stage === 'fact' || stage === 'collapse';
  const showFact = (stage === 'fact' || stage === 'collapse') && zonesEstimated > 0;

  // Badge : plus rien ne doit intercepter le tap — le live a repris la main.
  if (stage === 'badge') {
    return (
      <View pointerEvents="none" style={styles.badgeWrap}>
        <View style={styles.badge} accessibilityLabel={t(RUN_GPS_COPY[activity].a11yClosureBadge)}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {t(C.loopClosedTitle)}
          </Text>
          {zonesEstimated > 0 ? (
            <Text style={styles.badgeZones} numberOfLines={1}>
              {t(C.zonesEstimated, { n: formatInt(zonesEstimated) })}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.a11ySkipClosure)}
      onPress={skip}
      style={StyleSheet.absoluteFill}
    >
      {/* La carte RÉELLE s'assombrit — aucune modale, elle reste visible dessous. */}
      <View style={[StyleSheet.absoluteFill, styles.dim]} />

      {showInk ? (
        <Svg width={box.width} height={box.height} style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id="gryd-loop-ink">
              <Circle cx={anchor.x} cy={anchor.y} r={Math.max(0.01, inkRatio * maxRadius)} />
            </ClipPath>
            {/* Trame de hachures horizontales (planche E08). Un trait par tuile,
                répété verticalement tous les HATCH_STEP_PX → lignes horizontales
                continues. Teinte = le liseré de MON territoire (token), jamais
                une couleur inventée. */}
            <Pattern
              id="gryd-loop-hatch"
              patternUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={HATCH_STEP_PX}
              height={HATCH_STEP_PX}
            >
              <Line
                x1={0}
                y1={HATCH_STEP_PX / 2}
                x2={HATCH_STEP_PX}
                y2={HATCH_STEP_PX / 2}
                stroke={colors.chartreuse40}
                strokeWidth={HATCH_STROKE_PX}
              />
            </Pattern>
          </Defs>
          {/* Encre cartographique : l'aplat de MON territoire (token), jamais
              une teinte inventée, jamais un aplat lourd. */}
          <Polygon points={polygon} fill={colors.chartreuse14} clipPath="url(#gryd-loop-ink)" />
          {/* Hachures horizontales PAR-DESSUS l'aplat (planche E08) : le
              remplissage n'est pas un aplat plat, c'est une trame d'encre. Bornée
              au polygone (le fill ne déborde pas la forme) et révélée par le même
              masque d'encre que l'aplat — les traits « poussent » avec elle. */}
          <Polygon points={polygon} fill="url(#gryd-loop-hatch)" clipPath="url(#gryd-loop-ink)" />
          {/* Le contour fermé : la boucle telle qu'elle a été COURUE. */}
          <Polyline
            points={`${polygon} ${polygon.split(' ')[0] ?? ''}`}
            fill="none"
            stroke={traceStyle.core}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Impulsion au point de fermeture (elle s'ouvre puis s'efface). */}
          <Circle
            cx={anchor.x}
            cy={anchor.y}
            r={10 + inkRatio * 14}
            fill={withAlpha(colors.chartreuse, 0.22 * (1 - inkRatio))}
          />
          <Circle cx={anchor.x} cy={anchor.y} r={5} fill={colors.chartreuse} />
        </Svg>
      ) : null}

      {showText ? (
        <View pointerEvents="none" style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {t(C.loopClosedTitle)}
          </Text>
          {/* Le SEUL chiffre disponible et vrai : le comptage local, étiqueté
              estimé. Aucune aire, aucun nom de zone — rien ne les porte. */}
          {showFact ? (
            <Text style={styles.fact} numberOfLines={1}>
              {t(C.zonesEstimated, { n: formatInt(zonesEstimated) })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: colors.scrim },

  textWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  fact: {
    color: colors.chartreuse,
    fontFamily: fonts.displaySemi,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },

  badgeWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 148,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.blanc,
    fontFamily: fonts.displaySemi,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  badgeZones: {
    color: colors.chartreuse,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
});
