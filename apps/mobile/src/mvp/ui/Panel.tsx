/**
 * GRYD — PANEL : le matériau semi-opaque posé SUR la carte.
 *
 * ─── POURQUOI IL EXISTE ─────────────────────────────────────────────────────
 * Le bandeau haut et le pied de `/carte` étaient posés À NU sur MapLibre —
 * deux `View` absolues sans aucun fond. Ça passe tant que le terrain est
 * sombre, mais `nightStyle` peint des routes, et surtout le TERRITOIRE et le
 * TRACÉ en chartreuse vive. Dès qu'un tracé passe sous le chiffre héros blanc
 * de 64 pt, le chiffre se hache. Le HIG l'exige d'ailleurs indépendamment de
 * la lisibilité : la couche de navigation se sépare de la couche de contenu
 * par un matériau, elle ne se pose jamais directement dessus.
 *
 * ─── POURQUOI PAS DE FLOU (et pourquoi ce n'est PAS un pis-aller) ───────────
 * On cherchait un équivalent au « Liquid Glass » d'Apple. Deux faits l'ont
 * tranché, et le second est le plus intéressant :
 *
 * 1. `backdrop-filter` N'EXISTE PAS en React Native. Seul `expo-blur` floute,
 *    via une vue native — non installé, et sur Android son flou d'une
 *    `SurfaceView` GL (donc MapLibre, donc exactement notre cas) n'est pas
 *    garanti : il peut rendre un gris uni. Il re-capture en plus la hiérarchie
 *    à chaque frame, sur l'écran où une carte défile.
 * 2. L'analyse mesurée de Ron Design Lab a montré que sur leurs écrans NOIRS,
 *    ils n'utilisent AUCUN verre non plus. Les 22 éléments de leur site portant
 *    un `backdrop-filter` sont TOUS sur une photo. Sur du noir, leur matériau
 *    est un aplat plus clair + un bord d'attaque dégradé.
 *
 * Ce composant fait donc ce qu'ils font — sans dépendance nouvelle.
 *
 * ─── LE BORD D'ATTAQUE, EN DEUX COUCHES ─────────────────────────────────────
 * Mesuré au pixel sur leur carte de Live Activity : le bord haut n'est pas une
 * hairline nette mais un DÉGRADÉ (#181818 → #2C2C2C sur ~8 px source, ≈ 2 pt
 * écran). On rend les deux : la hairline (qui reste lisible à toute densité,
 * là où un dégradé de 2 pt disparaît sur un écran à 3×) et le voile dégradé
 * (qui donne l'épaisseur). Le dégradé passe par `react-native-svg`, déjà
 * présent — inutile d'ajouter `expo-linear-gradient`.
 */
import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, material, radii } from '@klaim/shared';

/** Objet LITTÉRAL, pas `StyleSheet.absoluteFill` — voir le commentaire du `Svg`. */
const ABSOLU = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Le bord par lequel le panneau « entre » dans l'écran. */
export type PanelEdge = 'top' | 'bottom';

export interface PanelProps {
  readonly children: ReactNode;
  /** `top` pour un bandeau haut, `bottom` pour un pied. */
  readonly edge?: PanelEdge;
  /** `strong` quand la carte doit cesser de distraire (sheet de course). */
  readonly weight?: 'normal' | 'strong';
  readonly radius?: number;
  readonly style?: StyleProp<ViewStyle>;
}

export function Panel({
  children,
  edge = 'top',
  weight = 'normal',
  radius = radii.tile,
  style,
}: PanelProps) {
  /**
   * ⚠️ `Defs` est GLOBAL au document SVG en react-native-svg : deux `Panel`
   * montés en même temps avec le même identifiant se voleraient leur dégradé.
   * `useId` garantit l'unicité — mais il rend `:r0:` en React 18, et les
   * deux-points cassent une référence `url(#…)`. D'où le nettoyage.
   */
  const gid = `panelRim${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fill = weight === 'strong' ? material.panelFillStrong : material.panelFill;
  const haut = edge === 'top';

  return (
    <View style={[styles.base, { borderRadius: radius, backgroundColor: fill }, style]}>
      {/* ① Le voile dégradé — l'« épaisseur » du matériau.
          ⚠️ PAS `StyleSheet.absoluteFill` ICI. C'est un style ENREGISTRÉ (un
          nombre) que `react-native-svg` ne résout pas : mesuré en preview, le
          `<svg>` rendait à sa taille par défaut de 300 × 150 au lieu de remplir
          le panneau — le dégradé aurait donc été une boîte fixe posée dans un
          coin. Objet littéral + `width`/`height` explicites : les deux voies
          fonctionnent sur web comme en natif. */}
      <Svg
        width="100%"
        height="100%"
        style={ABSOLU}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={gid} x1="0" x2="0" y1={haut ? '0' : '1'} y2={haut ? '1' : '0'}>
            <Stop offset="0" stopColor={colors.blanc} stopOpacity={material.rimGradientOpacity} />
            <Stop offset="0.14" stopColor={colors.blanc} stopOpacity={0.02} />
            <Stop offset="1" stopColor={colors.blanc} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={radius} fill={`url(#${gid})`} />
      </Svg>

      {/* ② La hairline nette au bord d'attaque. */}
      <View style={[styles.hairline, haut ? { top: 0 } : { bottom: 0 }]} pointerEvents="none" />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    // Sans lui, le `Rect` du dégradé déborderait du rayon.
    overflow: 'hidden',
    // RDL ne met AUCUNE ombre — mais RDL ne pose rien sur une carte VIVANTE.
    // Sur un terrain qui défile, un panneau sans ombre flotte mal.
    shadowColor: colors.noir,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: material.rimTop,
  },
});
