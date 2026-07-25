/**
 * GRYD — COMMUTATEUR RUN / BIKE de la Carte (planche E14, visible sur E03).
 *
 * « Pas d'écran de choix » : un petit commutateur à 2 segments, discret, en haut
 * à droite, sous la pill de lieu. Un tap = bascule immédiate de la LENTILLE de
 * la carte (180 ms, haptique légère, aucune confirmation). Choix mémorisé
 * (`gryd.mapactivity`, cf. mapPref.ts).
 *
 * ─── LE POINT D'HONNÊTETÉ ───────────────────────────────────────────────────
 * Le commutateur bascule VRAIMENT, et c'est tout ce qu'il prétend faire. En
 * mode Bike, la Carte n'affiche AUCUN territoire, AUCUNE mission, AUCUN
 * classement : le vélo n'existe pas encore sous l'écran (`runs` n'a pas de
 * colonne d'activité, aucun classement n'est séparé par discipline). Montrer les
 * données Run sous une étiquette vélo serait la donnée fabriquée que la charte
 * interdit. L'univers Bike est donc honnêtement VIDE — et la sheet le DIT
 * (planche E14 : « la carte vierge assume "Votre carte Bike commence ici",
 * jamais un écran vide »).
 *
 * VERROUILLAGE PENDANT UNE COURSE (planche E14) : il est STRUCTUREL, pas peint.
 * La course vit sur `/course-live`, une route poussée par-dessus l'onglet Carte :
 * ce commutateur n'est ni visible ni atteignable tant qu'elle dure. On ne peint
 * donc pas un état « grisé » qui ne pourrait jamais s'afficher — ce serait un
 * contrôle mort de plus.
 */
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, gameColors, radii } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import { useReduceMotion } from '../../ui/game/anim';
import { C } from '../../i18n/catalog/map';
import { useT } from '../../i18n/store';
import { useMapActivity, type MapActivity } from './mapPref';

/** Côté du commutateur (planche E14 : « un petit commutateur (40 pt) »). */
export const ACTIVITY_SWITCH_HEIGHT = 40;
/** Deux segments de 42 pt : zone tactile totale 84 × 40 (planche). */
const SEGMENT_WIDTH = 42;
export const ACTIVITY_SWITCH_WIDTH = SEGMENT_WIDTH * 2;
/** Bascule 180 ms (planche E14) — durée d'INTERFACE, aucune règle de jeu ici. */
const SWITCH_MS = 180;
/** Taille des pictos dans les segments (lisibles à 40 pt de haut). */
const GLYPH_SIZE = 20;

/**
 * Picto VÉLO. Il vit ici, et pas dans `@klaim/shared/icons`, parce que ce
 * chantier n'a pas la main sur `packages/shared` (le pilote y travaille en
 * parallèle). Il respecte la MÊME grammaire que tous les autres pictos GRYD —
 * boîte 24×24, trait 1,8, terminaisons arrondies, aucun remplissage — et devra
 * rejoindre `ICONS` (clé `velo`) dès que shared se rouvre.
 */
function BikeGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[
        // Roue arrière, roue avant (r = 3,5), selle, cadre.
        'M9 17.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z',
        'M22 17.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z',
        'M16 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z',
        'M12 17.5V14l-3-3 4-3 2 3h2',
      ].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

export function MapActivitySwitch({ testID }: { testID?: string }) {
  const t = useT();
  const { activity, setActivity } = useMapActivity();
  const reduce = useReduceMotion();
  /** Position du surligneur : 0 = Run (gauche), 1 = Bike (droite). */
  const slide = useRef(new Animated.Value(activity === 'bike' ? 1 : 0)).current;

  /**
   * Une bascule VENUE DU DOIGT est déjà animée par `select` : ce drapeau empêche
   * la synchro ci-dessous de l'écraser d'un `setValue` sec.
   */
  const tappedRef = useRef(false);
  /**
   * Le choix persisté est chargé de façon LAZY (AsyncStorage) : au premier rendu
   * `activity` peut encore valoir le défaut, puis basculer. Sans cette synchro,
   * le surligneur resterait à gauche sur une carte Bike — la couleur du picto
   * dirait « Bike » et le surligneur « Run ». On le recale SANS animation :
   * personne n'a touché le commutateur, ce n'est pas une bascule.
   */
  useEffect(() => {
    if (tappedRef.current) {
      tappedRef.current = false;
      return;
    }
    slide.setValue(activity === 'bike' ? 1 : 0);
  }, [activity, slide]);

  const select = (next: MapActivity) => {
    if (next === activity) return;
    haptics.light();
    const to = next === 'bike' ? 1 : 0;
    tappedRef.current = true;
    if (reduce) {
      slide.setValue(to);
    } else {
      Animated.timing(slide, {
        toValue: to,
        duration: SWITCH_MS,
        useNativeDriver: true,
      }).start();
    }
    setActivity(next);
  };

  const highlightX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SEGMENT_WIDTH],
  });

  return (
    <View style={styles.capsule} testID={testID}>
      {/* Surligneur qui GLISSE (180 ms) — l'état actif se lit d'un coup d'œil ;
          le picto le redouble en couleur, jamais la couleur seule (§C). */}
      <Animated.View
        style={[styles.highlight, { transform: [{ translateX: highlightX }] }]}
        pointerEvents="none"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: activity === 'run' }}
        accessibilityLabel={t(C.activityRunA11y)}
        onPress={() => select('run')}
        // Segment 42 × 40 (planche E14) — hitSlop pour tenir le plancher a11y 44.
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
        testID="map-activity-run"
      >
        <Icon
          name="basket"
          size={GLYPH_SIZE}
          color={activity === 'run' ? gameColors.crew : colors.gris}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: activity === 'bike' }}
        accessibilityLabel={t(C.activityBikeA11y)}
        onPress={() => select('bike')}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
        testID="map-activity-bike"
      >
        <BikeGlyph
          size={GLYPH_SIZE}
          color={activity === 'bike' ? gameColors.crew : colors.gris}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Même grammaire que la capsule de FABs (planche) : un seul contenant arrondi,
  // fond carbone, filet gris — discret sur la carte, jamais un bloc chartreuse.
  capsule: {
    width: ACTIVITY_SWITCH_WIDTH,
    height: ACTIVITY_SWITCH_HEIGHT,
    borderRadius: radii.btn,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SEGMENT_WIDTH,
    backgroundColor: gameColors.carbon,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.chartreuse40,
  },
  segment: { width: SEGMENT_WIDTH, alignItems: 'center', justifyContent: 'center' },
});
