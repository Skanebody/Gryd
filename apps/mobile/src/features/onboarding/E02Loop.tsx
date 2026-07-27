/**
 * GRYD — PLANCHE 02 « FERME LA BOUCLE » : le visuel.
 *
 * ─── CE QUE LA PLANCHE DEMANDE ──────────────────────────────────────────────
 * « AU CENTRE : une boucle FERMÉE, contour chartreuse épais, INTÉRIEUR REMPLI
 * chartreuse translucide. DEUX pastilles sur le contour, en bas : un cercle
 * CREUX (le départ) et un cercle PLEIN (l'arrivée), côte à côte. »
 * Motion : « la boucle se dessine en 900 ms à l'arrivée, PUIS la surface se
 * remplit. Reduce Motion : déjà fermée et remplie. »
 *
 * ─── LE TRACÉ EST RÉCUPÉRÉ, PAS REDESSINÉ ───────────────────────────────────
 * Ce composant est la RESURRECTION de `E01Route.tsx`, supprimé comme code mort au
 * commit b5b3e64 (« il n'avait plus aucun importeur ») et repris ici depuis
 * `git show b5b3e64^`. Il dessinait déjà EXACTEMENT la boucle de la planche 02.
 * Ce qui en vient tel quel : les sommets du parcours (segments droits + angles,
 * jamais une courbe — on court des RUES), le casing sombre sous le cœur
 * chartreuse (§B), les terminaisons rondes, le remplissage APRÈS la fermeture.
 * Ce qui a changé, et pourquoi :
 *   · les sommets vivent dans `plancheMotion.ts` (module PUR) au lieu d'une
 *     chaîne `d` écrite à la main — un test gèle la chaîne reconstruite
 *     caractère pour caractère, donc la géométrie ne peut plus dériver ;
 *   · le périmètre du dasharray est CALCULÉ (830) au lieu d'être annoté
 *     « approximatif » (840) : trop court, un bout de tracé est peint dès la
 *     première image ; trop long, le tracé démarre en retard ;
 *   · la durée du dessin passe de 1 500 à 900 ms — la valeur ÉCRITE sur la
 *     planche ;
 *   · le composant n'est plus un `absoluteFill` derrière un bloc de texte (il
 *     entrait en collision avec le kicker de E01, mesurée le 26/07) : il vit
 *     dans le PLATEAU de l'écran, au-dessus du bloc de texte, jamais dessous ;
 *   · la DEUXIÈME pastille (l'arrivée, pleine) est ajoutée : la planche en
 *     montre deux, côte à côte, et c'est ce qui raconte « tu es revenu là où tu
 *     étais parti ».
 *
 * ⚠️ IL NE SE REND JAMAIS SANS SA CHIP « EXEMPLE ». Ce dessin est la
 * représentation exacte d'une capture ; posé nu, il affirme une conquête que
 * personne n'a courue. Le garde-fou est chez son hôte (`PlancheBoard`, dans
 * `visuals.tsx`), qui pose la chip sur le plateau — il avait déjà sauté une fois,
 * au remplacement de `CaptureDemo` (qui, lui, la portait).
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Circle, G, Path } from 'react-native-svg';
import { colors, withAlpha } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game/anim';
import {
  LOOP_DRAW_MS,
  LOOP_FILL_MS,
  LOOP_FINISH,
  LOOP_FIT,
  LOOP_PATH_D,
  LOOP_PATH_LEN,
  LOOP_START,
} from './plancheMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Opacité du remplissage intérieur (chartreuse translucide = zone prise). */
const FILL_OPACITY = 0.18;
/**
 * Casing §B : le token immersif à 55 %, jamais un `rgba()` écrit à la main.
 * (Récupéré tel quel de `E01Route.tsx`.)
 */
const CASING = withAlpha(colors.carbonImmersive, 0.55);

/**
 * Épaisseurs §B en unités d'ÉCRAN. Elles sont divisées par l'échelle du
 * recadrage : sans ça, un trait de 4,5 serait rendu à 5,2 (le `scale` du `G`
 * multiplie aussi les traits) et le tracé grossirait à chaque reprise du
 * cadrage. Le contour est « épais » (planche), le casing le double.
 */
const CORE_W = 5;
const CASING_W = 10;
/** Pastilles de la planche : rayon en unités d'écran, même correction d'échelle. */
const DOT_R = 7;

export function E02Loop() {
  const reduce = useReduceMotion();
  const offset = useRef(new Animated.Value(reduce ? 0 : LOOP_PATH_LEN)).current;
  const fill = useRef(new Animated.Value(reduce ? FILL_OPACITY : 0)).current;

  useEffect(() => {
    if (reduce) {
      // Mouvement réduit : l'état FINAL, lisible d'emblée (boucle fermée +
      // surface remplie). Jamais une animation dégradée, jamais un plateau vide.
      offset.setValue(0);
      fill.setValue(FILL_OPACITY);
      return;
    }
    offset.setValue(LOOP_PATH_LEN);
    fill.setValue(0);
    const anim = Animated.sequence([
      // 1. le tracé se dessine le long des rues (planche : 900 ms)…
      Animated.timing(offset, {
        toValue: 0,
        duration: LOOP_DRAW_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      // 2. …PUIS, la boucle refermée, l'intérieur se remplit en chartreuse.
      Animated.timing(fill, {
        toValue: FILL_OPACITY,
        duration: LOOP_FILL_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduce, offset, fill]);

  const s = LOOP_FIT.scale;
  return (
    <G transform={`translate(${LOOP_FIT.tx}, ${LOOP_FIT.ty}) scale(${s})`}>
      {/* Remplissage intérieur (zone prise) — SOUS le tracé, et jamais avant lui. */}
      <AnimatedPath d={LOOP_PATH_D} fill={colors.chartreuse} fillOpacity={fill} stroke="none" />
      {/* Casing sombre — contraste sur le fond (§B casing + core). La teinte
          DÉRIVE du token immersif : un rgba recodé à la main est une couleur hors
          charte, même quand elle tombe juste. */}
      <AnimatedPath
        d={LOOP_PATH_D}
        stroke={CASING}
        strokeWidth={CASING_W / s}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={LOOP_PATH_LEN}
        strokeDashoffset={offset}
      />
      {/* Cœur chartreuse qui se dessine le long des rues. */}
      <AnimatedPath
        d={LOOP_PATH_D}
        stroke={colors.chartreuse}
        strokeWidth={CORE_W / s}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={LOOP_PATH_LEN}
        strokeDashoffset={offset}
      />
      {/* LES DEUX PASTILLES de la planche, sur le contour, en bas, côte à côte.
          CREUSE = le départ · PLEINE = l'arrivée. La forme, pas la couleur, porte
          la différence : les deux sont chartreuse (même rôle « moi »), et §C
          interdit de faire porter un sens à la seule teinte. */}
      <Circle
        cx={LOOP_START[0]}
        cy={LOOP_START[1]}
        r={DOT_R / s}
        fill={colors.carbonImmersive}
        stroke={colors.chartreuse}
        strokeWidth={CORE_W / s}
      />
      <Circle
        cx={LOOP_FINISH[0]}
        cy={LOOP_FINISH[1]}
        r={DOT_R / s}
        fill={colors.chartreuse}
        stroke={colors.carbonImmersive}
        strokeWidth={2 / s}
      />
    </G>
  );
}
