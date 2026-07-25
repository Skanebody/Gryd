/**
 * GRYD — ShareMap : mini-carte SVG pour les cards de partage (AMENDEMENT-20 §3
 * + doc « partage social viral »). « Fond carte sombre, trace chartreuse, zone
 * capturée en glow. » La géométrie est un VRAI tracé de rues (BOUCLE_REPUBLIQUE,
 * realAnchors : av. Parmentier → rue Saint-Ambroise → bd Voltaire, coins réels) —
 * jamais une ellipse. Aucune cellule H3, aucun label — juste la conquête.
 *
 * ANIMÉ (`animated`) : la trace SE DESSINE (sous-polyligne par progression —
 * fiable sur natif ET react-native-web, contrairement à strokeDashoffset), puis
 * la zone SE REMPLIT et le point de départ pulse. `replayKey` rejoue l'animation
 * (bouton Replay du partage). Reduce motion → état final direct, jamais une
 * info portée par l'animation seule. Piloté par Animated + listener → state
 * (même pattern éprouvé que l'onboarding CaptureStep).
 *
 * Deux modes :
 *  - `loop`    : polygone de la boucle rempli + trace (Carte simple / Conquête /
 *                Boucle / Crew).
 *  - `defense` : frontière rivale (orange net) tenue derrière la boucle crew
 *                (Défense — « la ligne que tu as gardée »).
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { colors, radii, spacing } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
import { useT } from '../../i18n/store';
import { SHARE_COPY } from './copy';
import {
  CORRIDOR_HALF_WIDTH_M,
  loopRing,
  ribbonRing,
} from '../map/allTerritories';
import {
  BOUCLE_REPUBLIQUE,
  REAL_M_PER_DEG_LAT,
  REAL_M_PER_DEG_LNG,
  RUE_FAUBOURG_DU_TEMPLE,
  type LatLngPoint,
} from '../map/realAnchors';
import { territoryStyle } from '../map/mapStyle';
import { PREVIEW_INTRO_MS, REPLAY_TOTAL_MS, replayPhaseAtProgress } from './replayPhase';

const VB = 100;
const PAD = 12;
const ROUTE_W = 2.4;
const RIVAL_W = 2.2;

type Project = (lng: number, lat: number) => { x: number; y: number };

/** Cadrage à aspect conservé d'un ensemble d'anneaux vers une viewBox carrée. */
function fit(
  rings: readonly (readonly [number, number][])[],
): { project: Project; vbW: number; vbH: number } {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  const spanX = Math.max(1, (maxLng - minLng) * REAL_M_PER_DEG_LNG);
  const spanY = Math.max(1, (maxLat - minLat) * REAL_M_PER_DEG_LAT);
  const k = (VB - PAD * 2) / Math.max(spanX, spanY);
  return {
    vbW: spanX * k + PAD * 2,
    vbH: spanY * k + PAD * 2,
    project: (lng, lat) => ({
      x: PAD + (lng - minLng) * REAL_M_PER_DEG_LNG * k,
      y: PAD + (maxLat - lat) * REAL_M_PER_DEG_LAT * k,
    }),
  };
}

function ringPath(ring: readonly [number, number][], project: Project): string {
  let d = '';
  ring.forEach(([lng, lat], i) => {
    const { x, y } = project(lng, lat);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${d} Z`;
}

function tracePoints(trace: readonly LatLngPoint[], project: Project): string {
  return trace
    .map((p) => {
      const { x, y } = project(p.lng, p.lat);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export type ShareMapMode = 'loop' | 'defense';

export interface ShareMapProps {
  mode?: ShareMapMode;
  /** Teinte de la zone/trace (défaut chartreuse). Toujours un token. */
  accent?: string;
  style?: ViewStyle;
  /**
   * Trace du coureur à dessiner (défaut : boucle République fermée). Le partage
   * passe une trace DÉJÀ passée par applySharePrivacy (départ/arrivée retirés) —
   * la zone conquise, elle, reste entière : c'est le territoire public, pas la
   * position du coureur.
   */
  /**
   * OBLIGATOIRE, et c'est le garde-fou. Tant que la prop était optionnelle, son
   * absence valait « dessine la boucle République » : un appelant qui oubliait
   * de la passer publiait le parcours d'un autre sous le nom du coureur, en
   * silence. Rendue requise, l'oubli ne compile plus — celui qui n'a pas de
   * tracé passe `[]` et obtient l'état vide honnête ci-dessous.
   */
  trace: readonly LatLngPoint[];
  /** Anime le dessin de la trace puis le remplissage de la zone. */
  animated?: boolean;
  /** Incrémenter pour REJOUER l'animation (bouton Replay du partage). */
  replayKey?: number;
  /** Fin d'animation (le Replay sait quand il est terminé). */
  onAnimationEnd?: () => void;
  /**
   * `false` = zone NON capturée (état « avant » du before/after) : le tracé
   * reste visible mais la zone ne se remplit jamais en chartreuse. Défaut `true`.
   */
  captured?: boolean;
  /**
   * `true` = REPLAY complet (7,5 s, partition E10 jouée en entier, déclenché par
   * le bouton « Rejouer »). Défaut : animation d'ENTRÉE comprimée — mêmes
   * proportions, 2,5× plus rapide, pour ne pas faire attendre le partageur.
   */
  fullReplay?: boolean;
}

// ─── MINUTAGE : LA PARTITION DE LA PLANCHE, PAS UNE RAMPE ───────────────────
// Ici vivaient `REPLAY_DURATION_MS = 2400` et `TRACE_PHASE = 0,72` : UNE rampe
// coupée en deux (trace / remplissage). La planche E10 en demande CINQ temps —
// contexte, tracé, fermeture, remplissage, résultat — sur 6-8 s. La partition
// est désormais une fonction PURE et TESTÉE (`replayPhase.ts`), consommée ici :
// l'écran ne peut plus dériver du minutage sans que les tests le disent.
//
// Deux vitesses, MÊMES proportions : l'aperçu s'anime court à l'ouverture
// (PREVIEW_INTRO_MS — un compositeur doit être actionnable tout de suite, §A) et
// le bouton « Rejouer » joue les 7,5 s pleines.

/**
 * Rendu carte partage. Géométrie déterministe (démo République) — en prod la
 * boucle vient du run. Aspect carré : la card gère la taille via `style`.
 */
export function ShareMap({
  mode = 'loop',
  accent = colors.chartreuse,
  style,
  trace,
  animated = false,
  replayKey = 0,
  onAnimationEnd,
  captured = true,
  fullReplay = false,
}: ShareMapProps) {
  const reduce = useReduceMotion();
  const tt = useT();
  const play = animated && !reduce;

  // 0→1 : progression NORMALISÉE de la partition (replayPhase.ts). Pattern
  // Animated + listener → state (CaptureStep) : fiable natif ET RN-web.
  // Linéaire volontairement : la partition porte déjà son propre découpage —
  // un easing par-dessus décalerait les temps de la planche.
  const anim = useRef(new Animated.Value(play ? 0 : 1)).current;
  const [progress, setProgress] = useState(play ? 0 : 1);

  useEffect(() => {
    if (!play) {
      setProgress(1);
      return;
    }
    const id = anim.addListener(({ value }) => setProgress(value));
    anim.setValue(0);
    setProgress(0);
    const run = Animated.timing(anim, {
      toValue: 1,
      duration: fullReplay ? REPLAY_TOTAL_MS : PREVIEW_INTRO_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    run.start(({ finished }) => {
      if (finished) onAnimationEnd?.();
    });
    return () => {
      anim.removeListener(id);
      run.stop();
    };
    // replayKey : chaque incrément rejoue l'animation depuis zéro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, replayKey, fullReplay]);

  // P1 C9 (MVP_CHANGESET) — le cadrage suit la VRAIE trace quand elle existe :
  // fit() ne recevait que la boucle démo République, donc une course ailleurs
  // sortait de la viewBox. Et la ZONE dessinée est la boucle réellement courue
  // (« la boucle fait la zone ») — plus jamais la forme démo sous un vrai run.
  // Le couloir rival est une géométrie DÉMO : jamais dessiné sous une vraie trace.
  const hasRealTrace = trace.length >= 3;
  // ─── FUITE COLMATÉE (21/07/2026) — trois cas, pas deux ────────────────────
  // `trace` absent (undefined) = aucune course armée → EXEMPLE assumé, la boucle
  // République est légitime. Mais `trace` FOURNI et dégénéré (< 3 points) veut
  // dire « cette course-là n'a pas de tracé connu » : replier sur République
  // dessinait alors le parcours d'un autre sous le nom du coureur — la carte
  // partagée montrait Paris à quelqu'un qui avait couru ailleurs.
  const noKnownRoute = trace.length < 3;

  // ÉTAT VIDE ≠ CARRÉ VIDE (retour fondateur 21/07/2026) : ne rien dessiner
  // était honnête mais MUET — la card montrait un carré entièrement vide, que le
  // coureur lit comme un bug de l'app, pas comme « on ne connaît pas ton tracé ».
  // On le DIT, à la place de la carte, et la card garde ses chiffres réels.
  // (Aucun hook au-delà de ce point : le retour anticipé est sûr.)
  if (noKnownRoute) {
    return (
      // §A.9 — JAMAIS de texte coupé. Ce slot fait ≈ 50 % de la largeur d'une
      // card story (soit ~100 pt) et son conteneur CLIPPE : l'icône + 2 lignes à
      // 12 pt rognaient « Tracé indisponible » en « Tracé / indis ». L'icône
      // part (le contour pointillé dit déjà l'absence, elle était redondante),
      // la typo passe à 10 pt avec un interligne EXPLICITE — RN-web n'applique
      // pas le même interligne par défaut que le natif, et c'est ce delta qui
      // débordait. Le mot entier tient, dans les 5 langues.
      <View style={[styles.wrap, style, styles.noRoute]}>
        <Text style={styles.noRouteLabel} numberOfLines={3} ellipsizeMode="clip">
          {tt(SHARE_COPY.traceUnavailable)}
        </Text>
      </View>
    );
  }

  // `noKnownRoute` a déjà rendu l'état vide : au-delà, le tracé est RÉEL.
  const loop = loopRing(trace);
  const rival = ribbonRing(RUE_FAUBOURG_DU_TEMPLE, CORRIDOR_HALF_WIDTH_M);
  // Le couloir rival est une géométrie parisienne d'AUTHORING : il ne peut plus
  // apparaître, puisqu'on ne dessine plus que de vraies courses.
  const showRival = false;
  const { project } = fit(showRival ? [loop, rival] : [loop]);
  const loopPath = ringPath(loop, project);
  const rivalPath = showRival ? ringPath(rival, project) : '';

  // Trace du run : par défaut la boucle fermée ; une trace fournie (privacy)
  // reste OUVERTE — le trou départ/arrivée EST le masquage, on ne le referme pas.
  const runTrace: readonly LatLngPoint[] = trace;

  // Partition E10 (pure, testée) : contexte → tracé → fermeture → remplissage
  // → résultat. Reduce motion / animation coupée : `progress` vaut 1 dès le
  // départ, donc l'état FINAL — aucune information n'est portée par la seule
  // animation.
  const phase = replayPhaseAtProgress(progress);
  const traceP = phase.traceP;
  // Zone : ne se remplit QUE si capturée (l'« avant » du before/after = 0).
  const fillP = captured ? phase.fillP : 0;
  // Temps « fermeture » : la jonction départ/arrivée s'affirme AVANT que la zone
  // se remplisse — c'est la boucle qui fait la zone, et l'ordre le montre.
  const closeP = captured ? phase.closeP : 0;
  const visibleCount = Math.max(2, Math.ceil(traceP * runTrace.length));
  const visibleTrace = runTrace.slice(0, visibleCount);
  const route = tracePoints(visibleTrace, project);
  const head = visibleTrace[visibleTrace.length - 1];
  const headPt = head ? project(head.lng, head.lat) : null;
  const start = runTrace[0];
  const startPt = start ? project(start.lng, start.lat) : null;

  return (
    <View style={[styles.wrap, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB} ${VB}`}>
        {/* Frontière rivale tenue (mode défense, géométrie démo) — jamais sous une vraie trace. */}
        {mode === 'defense' && rivalPath ? (
          <Path
            d={rivalPath}
            fill={territoryStyle.rivalFill}
            stroke={territoryStyle.rivalStroke}
            strokeWidth={RIVAL_W}
            strokeLinejoin="round"
          />
        ) : null}

        {/* Glow de la zone capturée : monte avec la phase de remplissage. */}
        <Path d={loopPath} fill={accent} opacity={0.14 * fillP} />
        <Path
          d={loopPath}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinejoin="round"
          opacity={0.18 * fillP}
        />

        {/* Zone : contour discret pendant le dessin, remplissage à la capture. */}
        <Path
          d={loopPath}
          fill={territoryStyle.crewFill}
          fillOpacity={fillP}
          stroke={accent}
          strokeWidth={fillP > 0 ? 2 : 0.6}
          strokeOpacity={fillP > 0 ? 1 : 0.35}
          strokeLinejoin="round"
        />

        {/* Trace brillante par-dessus — SE DESSINE point par point (vraies rues). */}
        <Polyline
          points={route}
          fill="none"
          stroke={accent}
          strokeWidth={ROUTE_W}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points={route}
          fill="none"
          stroke={colors.blanc}
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />

        {/* Point de départ. Pendant le temps « fermeture », un halo le désigne :
            c'est là que la boucle se referme, et c'est ce geste qui crée la zone. */}
        {startPt && closeP > 0 && closeP < 1 ? (
          <Circle cx={startPt.x} cy={startPt.y} r={2.2 + 4 * closeP} fill={accent} opacity={0.3} />
        ) : null}
        {startPt ? <Circle cx={startPt.x} cy={startPt.y} r={2.2} fill={colors.blanc} /> : null}
        {headPt && traceP < 1 ? (
          <>
            <Circle cx={headPt.x} cy={headPt.y} r={3.6} fill={accent} opacity={0.35} />
            <Circle cx={headPt.x} cy={headPt.y} r={1.8} fill={accent} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // AMENDEMENT-22 : PAS de double container. La zone dessinée flotte sur le fond
  // sombre de la card (elle-même l'unique surface) — ni cadre, ni mini-carré. Le
  // trace/glow clippe proprement (overflow) sans frontière visible.
  wrap: {
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  // Tracé inconnu : un cadre pointillé NEUTRE (jamais chartreuse — ce n'est pas
  // un gain) qui dit l'absence. Pas une card : un simple contour dans le slot.
  noRoute: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    padding: spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
  },
  noRouteLabel: {
    color: colors.gris,
    // 10 pt : sous l'échelle de tokens, assumé — c'est un libellé de PLACEHOLDER
    // dans un slot de ~100 pt, pas un texte de lecture. À 12 pt il se faisait
    // rogner, et un mot amputé coûte plus cher que deux points de corps (§A.9).
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
