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
 * Trois briques :
 *   HookMapBackground — carte réelle animée EN FOND du splash (§1).
 *   TerrainVisual     — LE TERRAIN **ET** LA RÈGLE en un seul plan (§2 + §5).
 *   LogoRouteMark     — la marque GRYD dessinée par un parcours qui se court.
 *
 * ─── POURQUOI UN SEUL PLATEAU (refonte 21/07/2026) ──────────────────────────
 * Il y en avait deux : `CityBoard` montrait les 3 rôles de zone, puis
 * `CaptureFillVisual` montrait la boucle qui se remplit — deux écrans pour une
 * seule idée (« le terrain appartient à quelqu'un, voilà comment on le prend »).
 * `TerrainVisual` les FUSIONNE dans un plan unique : le quartier apparaît déjà
 * occupé (violet contesté, orange rival), puis la trace se dessine, ferme la
 * boucle, et la zone bascule en chartreuse. La règle se voit au lieu de se lire
 * deux fois. `SyncProgressBar` est parti avec le mode vitrine qu'elle animait.
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

// ─── LE TERRAIN **ET** LA RÈGLE, en un seul plan (§2 + §5 + §C) ──────────────

/** Point de départ de la boucle héros (= point d'arrivée : elle s'y referme). */
const MINE_START = BOARD_PROJ.project(BOUCLE_REPUBLIQUE[0] ?? EGO_REPUBLIQUE);

/**
 * LE PLATEAU DÉMO (aucune géoloc réelle — la chip « Exemple » et la copy de
 * l'écran l'assument), qui enseigne DEUX choses d'un seul geste :
 *
 *   1. les 3 RÔLES DE ZONE (§C, retour terrain 20/07) — chaque rôle est une
 *      ZONE PLEINE, jamais un trait nu qui se lisait comme un bug : violet =
 *      contestée (double contour : deux crews se la disputent), orange = à un
 *      crew rival, chartreuse = à toi ;
 *   2. LA RÈGLE — la trace se dessine le long des vraies rues, referme la
 *      boucle, et l'intérieur BASCULE en chartreuse.
 *
 * L'ordre de la mise en scène porte le sens : le quartier apparaît d'abord
 * OCCUPÉ PAR D'AUTRES (violet + orange), et la zone chartreuse n'existe qu'à la
 * fin, en récompense de la boucle. C'est pour ça que République démarre VIDE
 * ici alors qu'elle était déjà « à toi » sur l'ancien plateau : rien n'est
 * donné au joueur avant qu'il ait couru, pas même en exemple.
 *
 * Le repère de position suit la TÊTE de la trace pendant qu'elle se dessine
 * (même repère que la carte réelle : point chartreuse cerclé de blanc) — on
 * lit « quelqu'un court », pas « un trait pousse ». Reduce motion : `useProgress`
 * renvoie 1 d'emblée → état final, boucle fermée et zone prise, sans animation.
 */
export function TerrainVisual({ exampleLabel }: { exampleLabel?: string }) {
  const p = useProgress(2600, 0, false);
  // Le terrain occupé se révèle d'abord ; la course part ensuite ; la zone
  // bascule en dernier. Trois temps qui ne se chevauchent qu'à peine.
  const boardOp = ramp(p, 0, 0.2);
  const drawP = ramp(p, 0.18, 0.74);
  const fillOp = ramp(p, 0.74, 1);
  const running = drawP > 0 && drawP < 1;
  const drawn = tracePrefix(BOUCLE_REPUBLIQUE, drawP);
  const drawnPoints = BOARD_PROJ.points(drawn);
  const head = BOARD_PROJ.project(drawn[drawn.length - 1] ?? EGO_REPUBLIQUE);
  return (
    <View style={styles.board}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
        <RealStreets />
        {/* CONTESTÉE — vraie boucle Villemin en violet (§C), double contour
            (plein + pointillé décalé) : « deux crews se la disputent ». */}
        <G opacity={boardOp}>
          <Path
            d={CONTESTED_PATH}
            fill={withAlpha(gameColors.contested, 0.24)}
            stroke={withAlpha(gameColors.contested, 0.9)}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path
            d={CONTESTED_PATH}
            fill="none"
            stroke={withAlpha(gameColors.contested, 0.5)}
            strokeWidth={5}
            strokeDasharray="3 6"
            strokeLinejoin="round"
          />
          {/* AU RIVAL — boucle Bastille en orange PLEIN (une zone, pas un trait). */}
          <Path
            d={RIVAL_PATH}
            fill={territoryStyle.rivalFill}
            stroke={territoryStyle.rivalStroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
        {/* À TOI — la zone qui BASCULE quand la boucle se referme (le payoff). */}
        <Path
          d={MINE_PATH}
          fill={territoryStyle.crewFill}
          stroke={territoryStyle.crewStroke}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={fillOp}
        />
        {/* Trace héros §B : casing sombre + core chartreuse, bouts arrondis. */}
        {drawP > 0 ? (
          <>
            <Polyline
              points={drawnPoints}
              stroke={traceStyle.casing}
              strokeWidth={6.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Polyline
              points={drawnPoints}
              stroke={traceStyle.core}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Départ = arrivée : la boucle se referme dessus. */}
            <Circle
              cx={MINE_START.x}
              cy={MINE_START.y}
              r={4.5}
              fill={colors.noir}
              stroke={traceStyle.core}
              strokeWidth={2.5}
            />
          </>
        ) : null}
        {/* Le repère de position, exactement celui de la carte réelle. */}
        {running ? (
          <G opacity={boardOp}>
            <Circle cx={head.x} cy={head.y} r={10} fill={withAlpha(colors.chartreuse, 0.16)} />
            <Circle
              cx={head.x}
              cy={head.y}
              r={5}
              fill={colors.chartreuse}
              stroke={colors.blanc}
              strokeWidth={2}
            />
          </G>
        ) : null}
      </Svg>
      <ExampleTag label={exampleLabel} />
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
