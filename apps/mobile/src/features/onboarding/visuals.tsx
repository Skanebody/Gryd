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
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Polyline, G } from 'react-native-svg';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
import { territoryStyle, traceStyle, withAlpha } from '../map/mapStyle';
import { fitTracesToBox, tracePrefix } from '../map/projectTrace';
import {
  LOGO_LEN,
  LOGO_POINTS,
  LOGO_VIEW,
  logoDrawProgress,
  logoHeadAt,
  logoHeadingAt,
} from './logoRoute';
import {
  AVENUE_DE_LA_REPUBLIQUE,
  BOUCLE_BASTILLE,
  BOUCLE_REPUBLIQUE,
  BOUCLE_SQUARE_VILLEMIN,
  BOULEVARD_VOLTAIRE,
  EGO_REPUBLIQUE,
  QUAI_VALMY,
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
 * Projection PARTAGÉE du plateau (retour terrain 20/07 : « je dois comprendre
 * quand une zone est prise, partagée, ou à quelqu'un d'autre » — le trait orange
 * nu se lisait comme un bug). L'exemple enseigne les 3 ÉTATS DE ZONE (§C), sur
 * trois VRAIES boucles à leur vraie position relative :
 *   • République (centre) = zone À TOI (chartreuse pleine) ;
 *   • square Villemin (nord) = zone CONTESTÉE (violet — deux crews se la
 *     disputent) ;
 *   • Bastille (sud) = zone À UN CREW RIVAL (orange pleine).
 * Constante de module (déterministe) — calculée une fois.
 */
const BOARD_PROJ = fitTracesToBox(
  [BOUCLE_REPUBLIQUE, BOUCLE_SQUARE_VILLEMIN, BOUCLE_BASTILLE],
  BOARD_W,
  BOARD_H,
  18,
);

/** Chemins projetés (déterministes) réutilisés par les briques du plateau. */
const MINE_PATH = BOARD_PROJ.path(BOUCLE_REPUBLIQUE, true);
const CONTESTED_PATH = BOARD_PROJ.path(BOUCLE_SQUARE_VILLEMIN, true);
const RIVAL_PATH = BOARD_PROJ.path(BOUCLE_BASTILLE, true);
const EGO_PT = BOARD_PROJ.project(EGO_REPUBLIQUE);

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
 * l'assume) : la LEÇON DES 3 ÉTATS DE ZONE (§C, retour terrain 20/07) sur trois
 * vraies boucles. Chaque état est une ZONE PLEINE — jamais un trait nu, qui se
 * lisait comme un bug :
 *   chartreuse = à toi · violet = contestée (les deux crews se la disputent,
 *   double contour) · orange = à un crew rival.
 * Les trois se révèlent en cascade ; position du joueur = flèche chartreuse à
 * l'ego réel (place de la République), DANS sa zone — comme sur la vraie carte.
 */
export function CityBoard({ exampleLabel }: { exampleLabel?: string }) {
  const reveal = useProgress(1400, 0, false);
  const mineOp = ramp(reveal, 0, 0.5);
  const contestedOp = ramp(reveal, 0.25, 0.75);
  const rivalOp = ramp(reveal, 0.5, 1);
  return (
    <View style={styles.board}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
        <RealStreets />
        {/* À TOI — vraie boucle République remplie (aplat + trait net). */}
        <Path
          d={MINE_PATH}
          fill={territoryStyle.crewFill}
          stroke={territoryStyle.crewStroke}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={mineOp}
        />
        {/* CONTESTÉE — vraie boucle Villemin en violet (§C), double contour
            (plein + pointillé décalé) : « deux crews se la disputent ». */}
        <Path
          d={CONTESTED_PATH}
          fill={withAlpha(gameColors.contested, 0.24)}
          stroke={withAlpha(gameColors.contested, 0.9)}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={contestedOp}
        />
        <Path
          d={CONTESTED_PATH}
          fill="none"
          stroke={withAlpha(gameColors.contested, 0.5)}
          strokeWidth={5}
          strokeDasharray="3 6"
          strokeLinejoin="round"
          opacity={contestedOp}
        />
        {/* AU RIVAL — vraie boucle Bastille en orange PLEIN (une zone, pas un trait). */}
        <Path
          d={RIVAL_PATH}
          fill={territoryStyle.rivalFill}
          stroke={territoryStyle.rivalStroke}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={rivalOp}
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
      <ExampleTag label={exampleLabel} />
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
export function CaptureFillVisual({ p, exampleLabel }: { p: number; exampleLabel?: string }) {
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
      <ExampleTag label={exampleLabel} />
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
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: withAlpha(colors.blanc, 0.12),
    backgroundColor: gameColors.carbon,
    overflow: 'hidden',
  },
  capture: {
    width: '100%',
    aspectRatio: BOARD_W / BOARD_H,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: withAlpha(colors.chartreuse, 0.3),
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
  syncTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    overflow: 'hidden',
  },
  syncFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// LOGO GRYD TRACÉ EN COURANT — le « G » dessiné par un parcours
// ═══════════════════════════════════════════════════════════════════════════

/**
 * L'idée : le logo n'est pas posé, il est COURU. C'est la promesse du produit
 * en une animation — « ton parcours dessine le territoire ».
 *
 * Trois choix qui comptent :
 *
 * 1. C'est une POLYLIGNE ÉCHANTILLONNÉE, pas un `<Path>` vectoriel. Une trace
 *    GPS est par nature une suite de points ; dessiner le G avec la même
 *    structure que les vrais tracés (§B) le fait lire comme un parcours et pas
 *    comme un logo animé. Une micro-ondulation déterministe (sinus, jamais
 *    Math.random — même rendu à chaque lancement) suggère le capteur sans
 *    rendre la lettre illisible.
 *
 * 2. LE PARCOURS À FAIRE EST VISIBLE D'ABORD, en gris très faible, puis se
 *    remplit en chartreuse. On voit donc l'itinéraire, puis la conquête —
 *    exactement la boucle du jeu. Sans le fantôme, l'animation ne serait qu'un
 *    trait qui pousse ; avec lui, elle raconte quelque chose.
 *
 * 3. UN SEUL TRAIT, comme on dessine un G à la main : on démarre en haut à
 *    droite, on fait le tour dans le sens antihoraire, on remonte à droite, et
 *    on termine par la barre horizontale vers l'intérieur. Un coureur ne se
 *    téléporte pas : le tracé ne doit jamais sauter.
 *
 * Chartreuse sur fond NOIR uniquement (charte : jamais sur fond clair).
 */
/* ⚠ MÊME MARQUE, DEUX OBJETS. Ces nombres doivent rester proportionnels à ceux
   de `scripts/build-brand-icons.mjs` (const G) : l'icône est la LETTRE, ceci est
   le PARCOURS qui la dessine. Ils ont divergé de 15 % le 21/07/2026 parce que
   chacun avait été relevé à l'œil de son côté — le logo de l'accueil et l'icône
   de l'app n'étaient alors plus tout à fait la même marque. Rapport largeur /
   hauteur de référence : 1,547 (rx/ry). Toucher l'un = toucher l'autre. */
/**
 * Boucle du tracé : dessine, TIENT le logo affiché, puis repart de zéro.
 * `Animated.loop` avec une séquence aller-retour rembobinerait le parcours —
 * un coureur ne défait pas sa course à reculons. On coupe donc net et on
 * recommence : c'est ce que fait un tracé qu'on rejoue.
 */
function useLogoLoop(drawMs: number, holdMs: number, enabled: boolean): number {
  const reduce = useReduceMotion();
  const [raw, setRaw] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const cycle = drawMs + holdMs;
  useEffect(() => {
    if (reduce) {
      setRaw(1);
      return;
    }
    const id = anim.addListener(({ value }) => setRaw(value));
    // UNE SEULE timing linéaire, bouclée. Les versions précédentes enchaînaient
    // une `Animated.sequence` (tracé → tenue → remise à zéro) : sur
    // react-native-web, `Animated.loop` d'une séquence ne démarre tout
    // simplement pas — le tracé restait figé à 0, mesuré sur 6 s. Le chemin
    // « une timing bouclée » est le seul solide sur les deux cibles ; la tenue
    // et la courbe d'accélération sont donc calculées au rendu, pas par
    // l'animation.
    const timing = Animated.timing(anim, {
      toValue: 1,
      duration: cycle,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    const runner = enabled ? Animated.loop(timing) : timing;
    runner.start();
    return () => {
      runner.stop();
      anim.removeListener(id);
    };
  }, [anim, cycle, enabled, reduce]);

  return reduce ? 1 : logoDrawProgress(raw, drawMs, holdMs);
}

/**
 * Le logo GRYD dessiné par un parcours qui se court.
 * `size` en points ; `loop` relance le tracé en boucle (accueil/splash).
 * Mouvement réduit respecté : `useProgress` renvoie 1 d'emblée → le G est
 * simplement affiché complet, sans animation.
 */
export function LogoRouteMark({ size = 148, loop = true }: { size?: number; loop?: boolean }) {
  const p = useLogoLoop(2600, 1500, loop);
  const drawn = p * LOGO_LEN;
  const head = logoHeadAt(p);
  const heading = logoHeadingAt(p);
  // Le repère ne s'affiche que pendant la course : une fois le tour bouclé, il
  // ne reste que le logo — sinon un point traînerait sur une marque à l'arrêt.
  const running = p > 0.001 && p < 0.999;
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${LOGO_VIEW} ${LOGO_VIEW}`}>
        {/* Le parcours À FAIRE : visible avant d'être couru. */}
        <Polyline
          points={LOGO_POINTS}
          fill="none"
          stroke={colors.blanc12}
          strokeWidth={19}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Halo du tracé conquis (casing §B : le trait ne flotte pas). */}
        <Polyline
          points={LOGO_POINTS}
          fill="none"
          stroke={colors.chartreuse40}
          strokeWidth={27}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${drawn} ${LOGO_LEN}`}
        />
        {/* Le tracé conquis. */}
        <Polyline
          points={LOGO_POINTS}
          fill="none"
          stroke={colors.chartreuse}
          strokeWidth={19}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${drawn} ${LOGO_LEN}`}
        />
        {running ? (
          /* LE REPÈRE DE LOCALISATION — exactement celui de la carte
             (MapScreen : point chartreuse cerclé de blanc + halo), pour que le
             joueur reconnaisse SA position, pas un curseur décoratif. Le cône
             de cap dit le sens de la course : sans lui, le repère se lit comme
             un point posé au lieu de quelqu'un qui avance. */
          <G x={head.x} y={head.y}>
            <G rotation={heading}>
              <Path d="M 0 0 L 26 -9 L 26 9 Z" fill={colors.chartreuse40} />
            </G>
            <Circle r={14} fill={colors.chartreuse14} stroke={colors.chartreuse40} strokeWidth={1.5} />
            <Circle r={7} fill={colors.chartreuse} stroke={colors.blanc} strokeWidth={2.5} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
