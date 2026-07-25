/**
 * GRYD — ShareMap : LA CARTE des cards de partage (planche E10). « Fond carte
 * sombre, trace chartreuse, zone capturée en glow. » La géométrie est le VRAI
 * tracé de la course — jamais une ellipse, jamais un emprunt. Aucune cellule H3,
 * aucun label : juste la conquête.
 *
 * CADRAGE (planche E10 : « la carte est recalculée par ratio, le territoire
 * n'est JAMAIS coupé ») : la forme du slot est MESURÉE, la viewBox la suit, et
 * la projection vient de `mapFrame.ts` — pure et testée pour les quatre formats.
 *
 * ANIMÉ (`animated`) : la trace SE DESSINE (sous-polyligne par progression —
 * fiable sur natif ET react-native-web, contrairement à strokeDashoffset), puis
 * la zone SE REMPLIT et le point de départ pulse. `replayKey` rejoue l'animation
 * (bouton Replay du partage). Reduce motion → état final direct, jamais une
 * info portée par l'animation seule. Piloté par Animated + listener → state
 * (même pattern éprouvé que l'onboarding CaptureStep).
 *
 * ─── LA DERNIÈRE GÉOMÉTRIE D'AUTHORING A ÉTÉ RETIRÉE (25/07/2026) ────────────
 * Un mode `defense` dessinait une « frontière rivale » : le couloir de la rue du
 * Faubourg-du-Temple, une VRAIE rue parisienne codée en dur. Il était déjà
 * neutralisé (`showRival = false`, 21/07) mais son code restait, prêt à
 * réapparaître au premier `true` — une rue de Paris sous la course de quelqu'un
 * qui a couru ailleurs. Le mode, sa géométrie et ses imports sont supprimés :
 * ce qui ne peut pas être vrai ne doit pas pouvoir être dessiné.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
import { useT } from '../../i18n/store';
import { SHARE_COPY } from './copy';
import { loopRing } from '../map/allTerritories';
import {
  REAL_M_PER_DEG_LAT,
  REAL_M_PER_DEG_LNG,
  type LatLngPoint,
} from '../map/realAnchors';
import { territoryStyle } from '../map/mapStyle';
import { frameFor, type FramePoint } from './mapFrame';
import { PREVIEW_INTRO_MS, REPLAY_TOTAL_MS, replayPhaseAtProgress } from './replayPhase';

const ROUTE_W = 2.4;

type Project = (lng: number, lat: number) => FramePoint;

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

export interface ShareMapProps {
  /** Teinte de la zone/trace (défaut chartreuse). Toujours un token. */
  accent?: string;
  style?: ViewStyle;
  /**
   * Trace du coureur à dessiner. Le partage la passe DÉJÀ masquée par
   * `applySharePrivacy` (départ/arrivée retirés) — la zone conquise, elle, reste
   * entière : c'est le territoire public, pas la position du coureur.
   *
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
  /**
   * `true` = la carte prend TOUTE la place que le slot lui laisse au lieu de
   * rester carrée (planche E10 : la carte est la PREUVE, elle tient le centre
   * optique). Sa forme suit alors le ratio de la card, et le cadrage est
   * recalculé sur la forme MESURÉE — c'est la lecture littérale de « la carte
   * est recalculée par ratio ». Le territoire, lui, n'est jamais coupé :
   * `frameFor` prend le minimum des deux échelles (mapFrame.ts, testé).
   */
  fill?: boolean;
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
 * Rendu de la carte partagée. La géométrie vient TOUJOURS de la course : la
 * boucle réellement courue fait la zone. Le slot règle la taille via `style`
 * (carré par défaut, ou `fill` pour occuper toute la place disponible).
 */
export function ShareMap({
  accent = colors.chartreuse,
  style,
  trace,
  animated = false,
  replayKey = 0,
  onAnimationEnd,
  captured = true,
  fullReplay = false,
  fill = false,
}: ShareMapProps) {
  const reduce = useReduceMotion();
  const tt = useT();
  const play = animated && !reduce;

  // FORME RÉELLE DU SLOT. Le cadrage en dépend (mapFrame.ts) : la même trace ne
  // se cadre pas pareil dans un 9:16 et dans un 1:1. Mesurée plutôt que reçue en
  // prop — l'écran /partage ne transmet pas son ratio aux templates, et une
  // mesure est de toute façon plus juste qu'un ratio déclaré (le slot peut être
  // borné par un maxWidth). Tant qu'elle n'a pas eu lieu : carré, comme avant.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const aspect = box && box.h > 0 ? box.w / box.h : 1;

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

  // Le slot mesuré sert AUSSI à calibrer l'état vide : le même libellé ne peut
  // pas s'écrire pareil dans une mini-carte de 100 pt et dans le slot héros.
  const onBox = (w: number, h: number) => {
    setBox((b) => (b && Math.abs(b.w - w) < 0.5 && Math.abs(b.h - h) < 0.5 ? b : { w, h }));
  };

  // P1 C9 (MVP_CHANGESET) — le cadrage suit la VRAIE trace quand elle existe :
  // le cadrage ne recevait que la boucle démo République, donc une course
  // ailleurs sortait de la viewBox. Et la ZONE dessinée est la boucle réellement
  // courue (« la boucle fait la zone ») — plus jamais la forme démo sous un vrai
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
    // §A.9 — JAMAIS de texte coupé, ET jamais un micro-texte perdu dans un
    // grand cadre. Le corps était figé à 10 pt : la valeur juste pour la
    // mini-carte de ~100 pt (à 12 pt, « Tracé indisponible » se rognait en
    // « Tracé / indis »), mais ridicule depuis que ce même placeholder occupe le
    // slot héros, qui fait le triple. Il suit donc la largeur MESURÉE du slot.
    const labelSize =
      box === null || box.w < 140 ? 10 : box.w < 220 ? fontSizes.sm : fontSizes.md;
    return (
      <View
        style={[fill ? styles.wrapFill : styles.wrap, style, styles.noRoute]}
        onLayout={(e) => onBox(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
      >
        <Text
          style={[styles.noRouteLabel, { fontSize: labelSize, lineHeight: labelSize * 1.2 }]}
          numberOfLines={3}
          ellipsizeMode="clip"
        >
          {tt(SHARE_COPY.traceUnavailable)}
        </Text>
      </View>
    );
  }

  // `noKnownRoute` a déjà rendu l'état vide : au-delà, le tracé est RÉEL.
  const loop = loopRing(trace);
  // CADRAGE PUR ET TESTÉ (mapFrame.ts) : la viewBox suit l'aspect RÉEL du slot
  // (donc le ratio de la card), l'échelle est le minimum des deux axes — le
  // territoire n'est jamais coupé — et le dessin est CENTRÉ (il était ancré en
  // haut : un tracé large-et-plat collait au bord supérieur du cadre).
  const { vbW, vbH, project } = frameFor([loop], aspect, REAL_M_PER_DEG_LNG, REAL_M_PER_DEG_LAT);
  const loopPath = ringPath(loop, project);

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
    <View
      style={[fill ? styles.wrapFill : styles.wrap, style]}
      onLayout={(e) => onBox(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${vbW} ${vbH}`}>
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
  // `fill` : la carte prend toute la place du slot (planche E10 — la preuve tient
  // le centre optique). Sa FORME suit donc le ratio de la card, et le cadrage
  // suit la forme (mapFrame.ts). Pas d'aspectRatio ici : c'est tout l'intérêt.
  wrapFill: {
    flex: 1,
    alignSelf: 'stretch',
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
  // Le CORPS est calculé au rendu depuis la largeur mesurée du slot (10 pt sous
  // 140, `sm` jusqu'à 220, `md` au-delà) : le même placeholder sert la mini-carte
  // et le slot héros, et un micro-texte perdu dans un grand cadre se lit comme un
  // bug autant qu'un mot tronqué (§A.9).
  noRouteLabel: {
    color: colors.gris,
    fontWeight: '600',
    textAlign: 'center',
  },
});
