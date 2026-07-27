/**
 * GRYD — LES VISUELS DES PLANCHES E01b (02 · 03 · 04 · 05). SVG
 * react-native-svg (cross natif / web preview), TOUTES les couleurs dérivées des
 * tokens (charte : toute couleur hors tokens = bug ; jamais de chartreuse sur
 * fond clair — ici tout est sur carbone).
 *
 *   PlancheBoard  — le plateau commun : fond carbone, GRILLE de rues (4 colonnes
 *                   × 5 lignes, filets très discrets) et chip « Exemple ».
 *   RivalrySplit  — planche 03 : une zone, moitié gauche à moi, moitié droite
 *                   REPRISE (orange), le contour rival débordant à droite.
 *   CrewAdjacent  — planche 04 : deux territoires qui se TOUCHENT, frontière
 *                   commune partagée.
 *   PrivacyRing   — planche 05 : le halo pointillé + le point « toi ».
 * (La boucle de la planche 02 vit dans `E02Loop.tsx`, récupérée depuis git.)
 *
 * ─── ELLES NE CALCULENT RIEN ────────────────────────────────────────────────
 * Géométrie et temps viennent du module PUR `plancheMotion.ts` (bornes des
 * animations, ordre des temps, sommets des zones, grille). C'est la seule façon
 * de PROUVER une animation ici : dans l'aperçu headless
 * `document.visibilityState` vaut "hidden", `requestAnimationFrame` tourne à
 * 0 fps, et toute capture d'écran montre une image figée qui ne prouve rien.
 *
 * ─── CE QUI A ÉTÉ SUPPRIMÉ PAR CE CHANTIER, ET POURQUOI ─────────────────────
 * `RivalryDemo` — le plateau animé à 4 temps de l'ancienne carte 2 (zone tenue →
 * pression rivale → contestée violet → label), monté sur de VRAIES rues
 * projetées (`demoPhases.ts`, supprimé avec lui). Les planches E01b décrivent un
 * autre écran : une grille stylisée, UNE zone, une bascule de 600 ms, le mot
 * « REPRIS ». Garder l'ancien composant à côté du nouveau, c'était garantir
 * qu'il divergerait de ce qui est à l'écran — et c'est exactement comme ça que la
 * chip « Exemple » avait disparu du premier écran de l'app.
 *
 * ─── HONNÊTETÉ ─────────────────────────────────────────────────────────────
 * Ces plateaux ILLUSTRENT une règle ; ils n'affichent aucun état du monde. Chip
 * « Exemple » posée sur le visuel, AUCUN lieu nommé, AUCUN nom de crew, AUCUN
 * chiffre attribué au joueur, AUCUNE célébration. Et ils ne se recentrent JAMAIS
 * sur la ville du joueur : le jour où l'exemple devient « ta ville », il ment sur
 * l'état de son monde.
 */
import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { colors, fontSizes, fonts, gameColors, withAlpha } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game/anim';
import {
  BOARD_H,
  BOARD_W,
  CREW_BORDER,
  CREW_MINE_D,
  CREW_OTHER_D,
  PRIVACY_BOX,
  PRIVACY_DASH,
  PRIVACY_DOT_R,
  PRIVACY_RING_R,
  RIVALRY_LABEL_ANCHOR,
  RIVALRY_OVERFLOW,
  RIVALRY_SPLIT_X,
  RIVALRY_ZONE_D,
  TAKEOVER_MS,
  gridLines,
} from './plancheMotion';
// La chip d'honnêteté est un COMPOSANT PARTAGÉ (`./ExampleTag`) : elle vivait
// dans ce fichier, et elle a disparu du premier écran de l'app le jour où il a
// cessé d'en être l'hôte. Un garde-fou ne se range pas dans le composant qu'il garde.
import { ExampleTag } from './ExampleTag';

const AnimatedG = Animated.createAnimatedComponent(G);

/** Opacités des aplats de zone — la trace/le contour restent dominants (§C). */
const ZONE_FILL = 0.17;
const RIVAL_FILL = 0.2;
const OTHER_CREW_FILL = 0.16;
/** Filets de la grille de rues : « très discrets » (planche). */
const GRID_ALPHA = 0.07;

/**
 * L'AUTRE CREW (planche 04 : « un BLEU désaturé »).
 *
 * ⚠️ ÉCART ASSUMÉ À §C, ET IL EST BORNÉ. La règle est « couleur par RÔLE, jamais
 * par identité de crew » — un voisin qui n'est ni rival ni contesté y serait
 * gris. La planche demande un bleu, parce que l'écran doit faire LIRE deux
 * territoires distincts qui se touchent, et que deux gris adjacents ne se
 * distinguent pas. La teinte DÉRIVE du token `--gryd-info` (`gameColors.verify`)
 * et reste désaturée par son alpha : c'est le rôle « un territoire qui n'est pas
 * le mien », pas la couleur d'un crew nommé. Aucun crew n'est nommé sur cet
 * écran, et cette teinte ne sort pas de l'onboarding.
 */
const OTHER_CREW = gameColors.verify;

// ═══════════════════════════════════════════════════════════════════════════
// LE PLATEAU COMMUN (planches 02 · 03 · 04)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La GRILLE DE RUES. Ce n'est PAS une carte : aucune rue réelle, aucun lieu,
 * aucune projection — un décor régulier qui dit « ville » sans rien affirmer sur
 * celle du joueur. (Les vraies rues projetées de l'ancien plateau faisaient
 * croire, à qui les reconnaissait, que la démonstration montrait un quartier
 * précis.)
 */
export function StreetGridBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* `preserveAspectRatio="none"` : une grille RÉGULIÈRE peut s'étirer au
          format de l'écran sans rien perdre de son sens — c'est un décor, pas une
          géométrie. Les visuels, eux, gardent leur ratio (ce sont des tracés). */}
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        preserveAspectRatio="none"
      >
        {gridLines().map((l, i) => (
          <Line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={withAlpha(colors.blanc, GRID_ALPHA)}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

/**
 * LE PLATEAU des planches pédagogiques : le visuel, centré, et LA CHIP
 * « EXEMPLE » à son coin haut-droit — position fixe, jamais sur le tracé : on la
 * cherche toujours au même endroit.
 *
 * ⚠️ AUCUN CADRE, AUCUN FOND. La planche décrit un écran PLEIN CADRE (« fond
 * carbone + grille de rues […] AU CENTRE : une boucle fermée »), pas une carte
 * posée sur l'écran. Le rendre en card produirait exactement le card-in-card que
 * §A interdit, et couperait la grille en deux (une dedans, une dehors).
 *
 * La chip, elle, n'est pas décorative : sans elle, une boucle qui se ferme puis
 * se remplit est la représentation exacte d'une capture que personne n'a courue.
 */
export function PlancheStage({
  exampleLabel,
  children,
}: {
  exampleLabel?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.stage}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>{children}</Svg>
      <ExampleTag label={exampleLabel} style={styles.exampleTag} />
    </View>
  );
}

/**
 * Animation d'ENTRÉE, jouée UNE fois (les planches E01b décrivent des entrées,
 * pas des boucles) : 0 → 1 sur `durationMs`. En mouvement réduit, la valeur part
 * — et reste — à 1 : l'état final, lisible d'emblée.
 *
 * ⚠️ Driver JS obligatoire (`useNativeDriver: false`) : ces valeurs pilotent des
 * props SVG (`opacity` d'un `G`), pas des transforms.
 */
function useEntrance(durationMs: number): Animated.Value {
  const reduce = useReduceMotion();
  const value = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const anim = Animated.timing(value, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [durationMs, reduce, value]);
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANCHE 03 — « ON PEUT TE LA REPRENDRE »
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UNE zone, coupée en deux : la moitié gauche reste à moi (chartreuse), la
 * moitié droite BASCULE en orange (600 ms) avec le mot « REPRIS » posé dedans, et
 * le contour rival déborde légèrement à droite — c'est ce débord qui dit « ça
 * vient de l'extérieur ».
 *
 * Couleurs par RÔLE, jamais par identité : aucun crew n'est nommé, aucun rival
 * n'existe (l'app n'a ni joueur ni classement à montrer ici). C'est une règle qui
 * est illustrée, pas un état du monde. Ton FACTUEL : « REPRIS » constate, il ne
 * menace pas — et il est peint en orange, pas en rouge de danger.
 */
export function RivalrySplit({ takenLabel }: { takenLabel: string }) {
  const taken = useEntrance(TAKEOVER_MS);
  return (
    <>
      <Defs>
        {/* Les deux moitiés de LA MÊME zone (planche) : un seul polygone, deux
            découpes — jamais deux zones côte à côte, qui diraient autre chose. */}
        <ClipPath id="planche03-mine">
          <Rect x={0} y={0} width={RIVALRY_SPLIT_X} height={BOARD_H} />
        </ClipPath>
        <ClipPath id="planche03-taken">
          <Rect x={RIVALRY_SPLIT_X} y={0} width={BOARD_W - RIVALRY_SPLIT_X} height={BOARD_H} />
        </ClipPath>
      </Defs>

      {/* MA MOITIÉ — chartreuse, contour net (c'est lui qui porte le rôle « moi »). */}
      <G clipPath="url(#planche03-mine)">
        <Path
          d={RIVALRY_ZONE_D}
          fill={withAlpha(colors.chartreuse, ZONE_FILL)}
          stroke={colors.chartreuse}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </G>

      {/* LA MOITIÉ REPRISE — elle arrive en 600 ms, par-dessus. */}
      <AnimatedG opacity={taken}>
        <G clipPath="url(#planche03-taken)">
          <Path
            d={RIVALRY_ZONE_D}
            fill={withAlpha(gameColors.rival, RIVAL_FILL)}
            stroke={gameColors.rival}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Le contour rival, DÉCALÉ vers la droite : il déborde de la zone. */}
          <Path
            d={RIVALRY_ZONE_D}
            fill="none"
            stroke={gameColors.rival}
            strokeWidth={2}
            strokeLinejoin="round"
            translateX={RIVALRY_OVERFLOW}
          />
        </G>
        {/* « REPRIS » au centre de la partie reprise. Orange (le rôle rival), et
            jamais un chiffre : nommer un état n'est pas afficher un score. */}
        <SvgText
          x={RIVALRY_LABEL_ANCHOR[0]}
          y={RIVALRY_LABEL_ANCHOR[1]}
          fill={gameColors.rival}
          fontFamily={fonts.textBold}
          fontSize={fontSizes.md}
          letterSpacing={1.5}
          textAnchor="middle"
        >
          {takenLabel}
        </SvgText>
      </AnimatedG>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANCHE 04 — « PLUS FORTS EN CREW »
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deux territoires ADJACENTS qui se touchent : le mien (chartreuse) et celui d'un
 * autre crew (bleu désaturé, cf. `OTHER_CREW`). Leur frontière commune est
 * dessinée UNE fois, en blanc discret : elle appartient aux deux — c'est tout le
 * propos de « le quartier se prend à plusieurs ».
 *
 * ⚠️ CET ÉCRAN ENSEIGNE, IL NE DEMANDE RIEN (note de planche : « la création /
 * adhésion au crew reste post-onboarding, jamais forcée ici »). Aucun bouton
 * « créer un crew », aucun nom, aucun effectif, aucun classement.
 */
export function CrewAdjacent() {
  return (
    <>
      {/* L'AUTRE CREW — peint en premier : le mien passe devant, comme partout. */}
      <Path
        d={CREW_OTHER_D}
        fill={withAlpha(OTHER_CREW, OTHER_CREW_FILL)}
        stroke={withAlpha(OTHER_CREW, 0.75)}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* LE MIEN. */}
      <Path
        d={CREW_MINE_D}
        fill={withAlpha(colors.chartreuse, ZONE_FILL)}
        stroke={colors.chartreuse}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* LA FRONTIÈRE COMMUNE : un seul trait, partagé. Deux traits parallèles
          diraient « deux crews voisins » ; un seul dit « ils se touchent ». */}
      <Line
        x1={CREW_BORDER[0][0]}
        y1={CREW_BORDER[0][1]}
        x2={CREW_BORDER[1][0]}
        y2={CREW_BORDER[1][1]}
        stroke={withAlpha(colors.blanc, 0.8)}
        strokeWidth={2}
        strokeDasharray="6 5"
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANCHE 05 — « TA POSITION CRÉE LE TRACÉ »
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le halo POINTILLÉ (la zone floutée) et le point plein (toi) au centre.
 *
 * Il ne porte NI grille NI chip « Exemple », et c'est voulu : ce n'est pas un
 * plateau de démonstration mais un PICTOGRAMME de la garantie énoncée juste en
 * dessous (« zones floutées autour des lieux sensibles »). Il n'illustre aucune
 * capture, donc il n'y a rien à étiqueter comme exemple — et il n'affiche
 * évidemment aucune position réelle : aucun capteur n'est lu par cet écran tant
 * que le joueur n'a pas touché le CTA.
 */
export function PrivacyRing() {
  const c = PRIVACY_BOX / 2;
  return (
    <View style={styles.privacy}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${PRIVACY_BOX} ${PRIVACY_BOX}`}>
        <Circle
          cx={c}
          cy={c}
          r={PRIVACY_RING_R}
          fill={withAlpha(colors.chartreuse, 0.06)}
          stroke={withAlpha(colors.chartreuse, 0.55)}
          strokeWidth={2}
          strokeDasharray={PRIVACY_DASH}
          strokeLinecap="round"
        />
        <Circle cx={c} cy={c} r={PRIVACY_DOT_R} fill={colors.chartreuse} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Le plateau : une FENÊTRE au ratio du viewBox, sans cadre ni fond (cf. le
  // docblock de `PlancheStage`) — la grille de l'écran passe dessous.
  stage: { width: '100%', aspectRatio: BOARD_W / BOARD_H },
  // POSITION de la chip « Exemple » (sa forme vit dans `./ExampleTag`) : coin
  // haut-droit du plateau, toujours le même — on la cherche au même endroit.
  exampleTag: { position: 'absolute', top: 0, right: 0 },
  privacy: { width: PRIVACY_BOX, height: PRIVACY_BOX, alignSelf: 'center' },
});
