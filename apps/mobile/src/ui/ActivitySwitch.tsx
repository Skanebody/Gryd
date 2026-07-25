/**
 * GRYD — COMMUTATEUR RUN / BIKE (planche E14), composant GLOBAL.
 *
 * « Pas d'écran de choix » : un petit commutateur à 2 segments, discret, en haut
 * à droite, « présent sur toutes les pages utiles : carte, classements,
 * historique, profil-stats ». Un tap = bascule immédiate de la LENTILLE de la
 * surface (180 ms, haptique légère, aucune confirmation).
 *
 * ─── POURQUOI IL VIT ICI ET NON DANS `features/map` ─────────────────────────
 * Il y est né avec la Carte, seule surface câblée jusqu'au 25/07/2026. Quatre
 * surfaces le portent désormais : le laisser sous `features/map` ferait
 * dépendre le Classement, l'Historique et les Statistiques du domaine carte
 * pour un contrôle qui ne parle pas de carte. `features/map/MapActivitySwitch`
 * survit en enveloppe (libellés a11y de la Carte) — la Carte n'est pas dans le
 * périmètre de ce chantier et son import ne bouge pas.
 *
 * ─── CE QUE CE COMPOSANT NE FAIT PAS ────────────────────────────────────────
 * Il est PRÉSENTATIONNEL. Il ne lit aucune préférence, ne décide pas de sa
 * propre visibilité et n'affirme RIEN sur les données : c'est l'écran qui
 * possède sa lentille (mémoire par onglet, `useActivityPref`), qui décide de
 * l'afficher (`useActivitySwitchVisible`) et qui rend l'état vide nommé quand
 * la lentille choisie n'a rien à montrer. Un contrôle qui déciderait lui-même
 * du contenu de quatre écrans serait la porte d'entrée du prochain mensonge.
 *
 * §A — il n'est PAS un CTA : fond carbone, filet gris, la chartreuse ne sert
 * qu'à marquer le segment ACTIF (couleur par rôle, jamais par identité). Le seul
 * accent chartreuse fort d'un écran reste son unique CTA.
 */
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, gameColors, radii, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { flags } from '../lib/flags';
import { haptics } from '../lib/haptics';
import { useRunInProgress } from '../features/arsenal/useRunInProgress';
import { useActivityPref } from '../features/map/mapPref';
import { Icon } from './Icon';
import { useReduceMotion } from './game/anim';
import {
  activitySwitchVisible,
  effectiveActivity,
  RECORDED_ACTIVITIES,
  type ActivitySurface,
} from './activityLens';

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
 * LA LENTILLE D'UNE SURFACE, en un seul appel : ce qu'elle doit montrer, comment
 * en changer, et si le commutateur a le droit d'exister. Un seul hook parce que
 * les trois sont indissociables — les séparer laisserait un écran afficher une
 * lentille sans le contrôle qui en sort, ou l'inverse.
 *
 * ÉLIGIBILITÉ (planche E14) — « visible seulement si Bike est activé ; masqué
 * sinon, jamais grisé » et « verrouillé pendant une course ». Le verrou n'est
 * PAS structurel sur ces trois écrans, contrairement à la Carte :
 * `/course-live` est poussé PAR-DESSUS les onglets et la course continue en
 * arrière-plan, donc on peut revenir sur Classement / Historique /
 * Statistiques pendant qu'elle tourne. On lit donc le vrai état de course
 * (`useRunInProgress`, lecture seule du buffer) plutôt que de le supposer.
 *
 * Tant que cette lecture n'a pas abouti (`loading`), on NE conclut PAS « tu
 * cours » : on passe `running`, jamais `loading`. Conclure au verrou sur une
 * lecture non aboutie ferait clignoter le contrôle à chaque ouverture d'écran —
 * et une lecture en cours n'affirme rien (CLAUDE.md, quatre états distincts).
 *
 * `activity` est la lentille EFFECTIVE (cf. `effectiveActivity`) : pendant une
 * course, la préférence mémorisée est mise en veille pour ne pas enfermer le
 * joueur dans un état vide qu'aucun contrôle visible ne pourrait quitter.
 * Aujourd'hui une course en cours est nécessairement une course À PIED —
 * `RECORDED_ACTIVITIES` ne contient qu'elle, et c'est la seule discipline que
 * `runActivity.ts` déclare au départ. Le jour où le vélo s'enregistrera, c'est
 * la discipline DÉCLARÉE de la course qu'il faudra passer ici.
 */
export function useActivityLens(surface: ActivitySurface): {
  activity: Activity;
  setActivity: (value: Activity) => void;
  switchVisible: boolean;
} {
  const { activity: stored, setActivity } = useActivityPref(surface);
  const { running } = useRunInProgress();
  const liveActivity: Activity | null = running ? (RECORDED_ACTIVITIES[0] ?? DEFAULT_ACTIVITY) : null;
  return {
    activity: effectiveActivity(stored, liveActivity),
    setActivity,
    switchVisible: activitySwitchVisible({ bikeEnabled: flags.bike, runLive: running }),
  };
}

/**
 * Picto VÉLO. Il vit ici, et pas dans `@klaim/shared/icons`, parce que ce
 * chantier n'a pas la main sur `packages/shared` (un autre y travaille en
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

interface ActivitySwitchProps {
  activity: Activity;
  onChange: (next: Activity) => void;
  /**
   * Libellés a11y des DEUX segments. Ils sont passés par l'écran, et c'est
   * volontaire : les segments n'ont que des pictos, donc l'a11y porte TOUT le
   * sens — et « Carte vélo » n'a rien à dire sur l'écran Historique. Chaque
   * surface nomme ce que la bascule change CHEZ ELLE.
   */
  runLabel: string;
  bikeLabel: string;
  testID?: string;
  runTestID?: string;
  bikeTestID?: string;
}

export function ActivitySwitch({
  activity,
  onChange,
  runLabel,
  bikeLabel,
  testID,
  runTestID,
  bikeTestID,
}: ActivitySwitchProps) {
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
   * le surligneur resterait à gauche sur une lentille Bike — la couleur du picto
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

  const select = (next: Activity) => {
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
    onChange(next);
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
        accessibilityLabel={runLabel}
        onPress={() => select('run')}
        // Segment 42 × 40 (planche E14) — hitSlop pour tenir le plancher a11y 44.
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
        testID={runTestID}
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
        accessibilityLabel={bikeLabel}
        onPress={() => select('bike')}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
        testID={bikeTestID}
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
  // fond carbone, filet gris — discret, jamais un bloc chartreuse.
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
