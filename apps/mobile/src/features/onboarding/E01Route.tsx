/**
 * GRYD — E01 : BOUCLE de parcours ANIMÉE (remplace « VOTRE RUE »). Illustre LA
 * mécanique : on court un parcours qui suit les RUES (segments droits, angles —
 * pas des courbes lisses), on FERME la boucle, et l'intérieur SE REMPLIT en
 * chartreuse (= la zone est prise). Deux temps :
 *   1. le tracé se dessine le long des rues (strokeDashoffset, ~1,5 s) ;
 *   2. la boucle refermée, l'aire intérieure se remplit en chartreuse (~0,6 s).
 * Terminaisons/jointures rondes discrètes (§B). Reduce Motion → boucle pleine +
 * remplie d'emblée.
 *
 * PUREMENT PÉDAGOGIQUE (onboarding) — pas une donnée GPS/joueur : l'illustration
 * de « ferme une boucle → prends la zone ».
 *
 * ⚠️ ELLE NE SE REND JAMAIS SANS SA CHIP « EXEMPLE ». Ce dessin est la
 * représentation EXACTE d'une capture ; posé nu sur le premier écran de l'app, il
 * affirme une conquête que personne n'a courue. Le garde-fou est chez son hôte
 * (`E01Hero`), qui pose la chip sur le visuel — il avait déjà sauté une fois, au
 * remplacement de `CaptureDemo` (qui, lui, la portait).
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, withAlpha } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game/anim';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Boucle FERMÉE le long des rues (viewBox plein écran 375×812), segments droits
// + angles = un vrai parcours urbain autour de quelques pâtés de maisons.
const LOOP_D =
  'M95 495 L95 370 L155 370 L155 285 L250 285 L250 350 L300 350 L300 455 L205 455 L205 495 Z';
// Périmètre approximatif (pour le « draw »).
const LOOP_LEN = 840;
const DRAW_MS = 1500;
const FILL_MS = 600;
/** Opacité du remplissage intérieur (chartreuse translucide = zone prise). */
const FILL_OPACITY = 0.18;
/** Casing §B : le token immersif à 55 %, jamais un `rgba()` écrit à la main. */
const CASING = withAlpha(colors.carbonImmersive, 0.55);
/** Départ de la boucle (1er point de LOOP_D). */
const START = { x: 95, y: 495 };

/**
 * REMONTÉE DU TRACÉ — CORRECTION D'UNE COLLISION MESURÉE (26/07/2026).
 *
 * ─── CE QUI A ÉTÉ MESURÉ (et pas supposé) ───────────────────────────────────
 * Le bloc de texte du bas de `E01Hero` (kicker → titre → sous-titre → CTA →
 * frise → lien de connexion) est ancré à `bottom: 0`. Sa hauteur, avec les
 * tailles RÉELLEMENT rendues (fontes Inter / Inter Tight mesurées à 375 pt) :
 * 16 (kicker) + 88 (titre 2 lignes) + 44,8 (sous-titre 2 lignes) + 56
 * (`sizes.buttonLg`) + 5 (frise) + 44 (`sizes.touchTarget`) + 5 × 12 d'écart
 * + inset bas + 20. Le bloc commence donc à y 444,2 sur un 375×812 (inset 34)
 * et à y 333,2 sur un 375×667 (inset 0).
 * Bbox du tracé rendue dans un SVG aux mêmes dimensions :
 *   375×812 — AVANT y 285 → 501 : le tracé descendait 56,8 px À L'INTÉRIEUR du
 *             bloc de texte ; APRÈS y 140 → 356, dégagement 88,2 px ;
 *   375×667 — AVANT y 234 → 411,5 (collision 78,3 px) ; APRÈS y 115 → 292,4,
 *             dégagement 40,8 px (`preserveAspectRatio` y ramène l'échelle
 *             à 0,821).
 * Concrètement, AVANT : le montant vertical à x = 95 traversait les lettres de
 * « COMMENT ÇA MARCHE » (le kicker s'étend de x 16 à x ≈ 184 en français), et
 * le point de départ tombait dans la première ligne du titre display. Le voile
 * n'y changeait rien — à cette hauteur seul `scrim1` (25 %) est posé, `scrim2`
 * ne commençant qu'à y 487. Ce n'était donc PAS un « héros derrière le texte »
 * assumé mais une collision : un trait chartreuse à 75 % d'opacité derrière un
 * sur-titre gris de 12 px.
 *
 * ─── LE CORRECTIF ───────────────────────────────────────────────────────────
 * On remonte la FENÊTRE du viewBox plutôt que de réécrire les coordonnées du
 * parcours : le dessin reste lisible tel qu'il a été tracé, et le haut du tracé
 * (y 140 sur 812, y 115 sur 667) reste sous la chip « Exemple » et le lien
 * « Passer » (y ≈ 78 et y ≈ 54).
 */
const LOOP_LIFT = 145;

export function E01Route() {
  const reduce = useReduceMotion();
  const offset = useRef(new Animated.Value(reduce ? 0 : LOOP_LEN)).current;
  const fill = useRef(new Animated.Value(reduce ? FILL_OPACITY : 0)).current;

  useEffect(() => {
    if (reduce) {
      offset.setValue(0);
      fill.setValue(FILL_OPACITY);
      return;
    }
    offset.setValue(LOOP_LEN);
    fill.setValue(0);
    const anim = Animated.sequence([
      // 1. dessine la boucle le long des rues
      Animated.timing(offset, {
        toValue: 0,
        duration: DRAW_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      // 2. boucle fermée → l'intérieur se remplit en chartreuse
      Animated.timing(fill, {
        toValue: FILL_OPACITY,
        duration: FILL_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduce, offset, fill]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 ${LOOP_LIFT} 375 812`}>
        {/* Remplissage intérieur (zone prise) — sous le tracé. */}
        <AnimatedPath d={LOOP_D} fill={colors.chartreuse} fillOpacity={fill} stroke="none" />
        {/* Casing sombre — contraste sur le fond (§B casing + core). La teinte
            DÉRIVE du token immersif : un rgba recodé à la main est une couleur
            hors charte, même quand elle tombe juste. */}
        <AnimatedPath
          d={LOOP_D}
          stroke={CASING}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={LOOP_LEN}
          strokeDashoffset={offset}
        />
        {/* Cœur chartreuse qui se dessine le long des rues. */}
        <AnimatedPath
          d={LOOP_D}
          stroke={colors.chartreuse}
          strokeWidth={4.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={LOOP_LEN}
          strokeDashoffset={offset}
        />
        {/* Point de départ (= arrivée, la boucle est fermée). */}
        <Circle
          cx={START.x}
          cy={START.y}
          r={6}
          fill={colors.chartreuse}
          stroke={colors.carbonImmersive}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
