/**
 * GRYD — COMMUTATEUR RUN / BIKE (planche E14), composant GLOBAL.
 *
 * « Pas d'écran de choix » : un petit commutateur, discret, en haut à droite,
 * « présent sur toutes les pages utiles : carte, classements, historique,
 * profil-stats ». Un tap = bascule immédiate de la LENTILLE de la surface
 * (180 ms, haptique légère, aucune confirmation).
 *
 * ─── POURQUOI IL VIT ICI ET NON DANS `features/map` ─────────────────────────
 * Il y est né avec la Carte, seule surface câblée jusqu'au 25/07/2026. Quatre
 * surfaces le portent désormais : le laisser sous `features/map` ferait
 * dépendre le Classement, l'Historique et les Statistiques du domaine carte
 * pour un contrôle qui ne parle pas de carte. `features/map/MapActivitySwitch`
 * survit en enveloppe (libellés a11y de la Carte) — la Carte n'est pas dans le
 * périmètre de ce chantier et son import ne bouge pas.
 *
 * ─── LES DEUX SEGMENTS SONT DES PAIRS (fondateur, 26/07/2026, seconde passe) ──
 * Le matin même, ce composant portait l'inverse : segments de largeurs
 * différentes, chartreuse réservée à RUN, et une marque « PAS ENCORE » sous
 * BIKE. C'était la bonne réponse à un vrai défaut (« tu crées une fausse
 * affordance ») tant que le vélo n'existait pas sous l'écran. Le fondateur l'a
 * fait exister — « il faut avoir sa propre data, ses propres classements » — et
 * la marque est donc devenue le mensonge symétrique : dire « pas encore » d'un
 * monde qui enregistre vraiment.
 *
 * Ce qui RESTE de cet arbitrage :
 *   1. chaque segment porte TEXTE + ICÔNE (demande fondateur), donc le contrôle
 *      s'explique sans être touché ;
 *   2. l'actif est franc (fond surélevé + liseré + couleur), l'inactif est
 *      nettement secondaire (gris, sans fond).
 * Ce qui CHANGE : même largeur, même accent actif (chartreuse dans les deux
 * mondes). §C dit « couleurs par RÔLE » — ici le rôle est « lentille
 * sélectionnée », pas « territoire gagné » : le distinguer par discipline
 * fabriquerait une hiérarchie entre deux mondes que le produit a rendus égaux.
 * L'état vide d'un monde se dit dans l'ÉCRAN (un début + son action), jamais
 * par un badge collé au contrôle.
 *
 * ─── CE QUE CE COMPOSANT NE FAIT PAS ────────────────────────────────────────
 * Il est PRÉSENTATIONNEL. Il ne lit aucune préférence, ne décide pas de sa
 * propre visibilité et n'affirme RIEN sur les données : c'est l'écran qui
 * possède sa lentille (mémoire par onglet, `useActivityPref`), qui décide de
 * l'afficher (`switchVisible`) et qui rend l'état vide nommé quand la lentille
 * choisie n'a rien à montrer. Un contrôle qui déciderait lui-même du contenu de
 * quatre écrans serait la porte d'entrée du prochain mensonge.
 *
 * Il ne décide AUCUNE discipline d'enregistrement non plus : la bascule est une
 * LENTILLE D'AFFICHAGE, point. La discipline d'une sortie est DÉCLARÉE par le
 * chemin qui la lance (`features/run/gps/runActivity.ts`), et rien dans
 * `features/run/**` ne lit ce module.
 *
 * §A — il n'est PAS un CTA : fond carbone, filet gris. Le seul accent
 * chartreuse fort d'un écran reste son unique CTA.
 */
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, gameColors, radii, type Activity } from '@klaim/shared';
import { flags } from '../lib/flags';
import { haptics } from '../lib/haptics';
import { useRunInProgress } from '../features/arsenal/useRunInProgress';
import { useActivityPref } from '../features/map/mapPref';
import { Icon } from './Icon';
import { useReduceMotion } from './game/anim';
import {
  ACTIVITY_SEGMENT_HEIGHT,
  ACTIVITY_SWITCH_GEOMETRY as G,
  ACTIVITY_SWITCH_WIDTH as CAPSULE_WIDTH,
  activitySegments,
  activitySwitchVisible,
  effectiveActivity,
  type ActivitySurface,
} from './activityLens';

// Métriques de la capsule : dérivées en PUR (cf. `activityLens.ts`, qui prouve
// par test qu'aucune des cinq langues n'y est tronquée). Réexportées ici parce
// que la Carte les lit sous ce nom pour caler sa ligne mission et le plafond du
// bouton GO — un seul chiffre, une seule source.
export { ACTIVITY_SWITCH_HEIGHT, ACTIVITY_SWITCH_WIDTH } from './activityLens';

/** Bascule 180 ms (planche E14) — durée d'INTERFACE, aucune règle de jeu ici. */
const SWITCH_MS = 180;

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
 * sortie, la préférence mémorisée est mise en veille pour montrer le monde de
 * CETTE sortie.
 *
 * ⚠️ 26/07/2026 — CE POINT N'EST PLUS COSMÉTIQUE. Il valait auparavant
 * `RECORDED_ACTIVITIES[0]`, c'est-à-dire « run », parce que le vélo n'existait
 * pas : toute sortie en cours ÉTAIT une course à pied. Le vélo est désormais
 * une discipline réelle, donc la constante mentirait chez un cycliste — son
 * écran basculerait sur le territoire de course pendant tout son effort. On lit
 * maintenant la DISCIPLINE DÉCLARÉE de la sortie en cours
 * (`StoredRun.activity`, remontée par `useRunInProgress`). Quand elle est
 * inconnue (buffer d'avant le vélo, stockage illisible), `liveActivity` vaut
 * `null` et la préférence de l'utilisateur fait foi — on ne devine pas.
 */
export function useActivityLens(surface: ActivitySurface): {
  activity: Activity;
  setActivity: (value: Activity) => void;
  switchVisible: boolean;
} {
  const { activity: stored, setActivity } = useActivityPref(surface);
  const { running, activity: liveActivity } = useRunInProgress();
  return {
    activity: effectiveActivity(stored, running ? liveActivity : null),
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
 *
 * EXPORTÉ depuis le 26/07/2026 : le bouton GO de la Carte doit montrer la
 * DISCIPLINE qu'il va lancer, et il ne peut pas afficher une chaussure de
 * course pour une sortie vélo. Un second dessin recopié là-bas aurait fini par
 * diverger de celui-ci — deux vélos légèrement différents dans le même écran.
 */
export function BikeGlyph({ size, color }: { size: number; color: string }) {
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
   * volontaire : le libellé VISIBLE (« RUN » / « BIKE ») nomme la discipline,
   * pas ce que la bascule change ICI — et « Carte vélo » n'a rien à dire sur
   * l'écran Historique. Chaque surface nomme donc ce que la bascule change CHEZ
   * ELLE.
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
   * le fond actif resterait à gauche sur une lentille Bike — la couleur du
   * libellé dirait « Bike » et le fond « Run ». On le recale SANS animation :
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

  /**
   * Le fond actif ne GLISSE pas : deux fonds superposés se croisent en opacité.
   * (Les segments ont désormais la même largeur, donc un vrai glissement serait
   * possible — mais le croisement en opacité est déjà natif, sans mesure de
   * layout, et donne exactement la même lecture en 180 ms. On ne réécrit pas ce
   * qui marche pour le plaisir de la symétrie.)
   */
  const runFillOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const segments = activitySegments(activity);

  return (
    <View style={styles.capsule} testID={testID}>
      {segments.map((seg) => {
        const isBike = seg.activity === 'bike';
        // MÊME accent dans les deux mondes (26/07/2026). La chartreuse était
        // réservée à RUN tant que la lentille vélo ne pouvait rien contenir ;
        // les deux disciplines enregistrent maintenant, et un accent différent
        // se lirait comme « ce monde-là compte moins ».
        const tint = seg.selected ? gameColors.crew : colors.gris;
        // Ce que la bascule change SUR CETTE SURFACE (« Carte vélo »,
        // « Historique vélo »…) — le libellé visible, lui, nomme la discipline.
        const surfaceLabel = isBike ? bikeLabel : runLabel;
        return (
          <Pressable
            key={seg.activity}
            accessibilityRole="button"
            accessibilityState={{ selected: seg.selected }}
            accessibilityLabel={surfaceLabel}
            onPress={() => select(seg.activity)}
            style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
            testID={isBike ? bikeTestID : runTestID}
          >
            {/* Fond de l'état ACTIF : surface surélevée + liseré. La couleur du
                texte le redouble — jamais la couleur seule (§C, daltonisme). */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.fill,
                isBike ? styles.fillBike : styles.fillRun,
                { opacity: isBike ? slide : runFillOpacity },
              ]}
            />
            {isBike ? (
              <BikeGlyph size={G.iconSize} color={tint} />
            ) : (
              <Icon name="basket" size={G.iconSize} color={tint} />
            )}
            {/* §A9 : jamais tronqué. La largeur est budgétée et prouvée par test ;
                `adjustsFontSizeToFit` ne sert qu'aux tailles système agrandies —
                un texte qui rétrécit vaut mieux qu'un texte coupé. */}
            <Text
              style={[styles.label, { color: tint }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Rayon du fond actif : la capsule moins sa marge, arrondi côté extérieur. */
const FILL_RADIUS = radii.btn - G.capsulePad;

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Même grammaire que la capsule de FABs (planche) : un seul contenant arrondi,
  // fond carbone, filet gris — discret, jamais un bloc chartreuse.
  capsule: {
    width: CAPSULE_WIDTH,
    height: G.height,
    borderRadius: radii.btn,
    backgroundColor: colors.carbone,
    borderWidth: G.borderWidth,
    borderColor: colors.grisLigne,
    flexDirection: 'row',
    padding: G.capsulePad,
  },
  segment: {
    width: G.segmentWidth,
    height: ACTIVITY_SEGMENT_HEIGHT,
    paddingHorizontal: G.segmentPadH,
    alignItems: 'center',
    // Les deux contenus ont exactement la même hauteur depuis le retrait de la
    // marque : on peut CENTRER, ce qui donne la même respiration en haut et en
    // bas. (Avant : ancrage en haut + paddingTop 4, pour aligner les pictos
    // malgré la ligne supplémentaire du segment Bike.)
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
  },
  fillRun: {
    borderColor: colors.chartreuse40,
    borderTopLeftRadius: FILL_RADIUS,
    borderBottomLeftRadius: FILL_RADIUS,
    borderTopRightRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
  },
  fillBike: {
    // MÊME liseré que le segment Run : les deux mondes sont des pairs.
    borderColor: colors.chartreuse40,
    borderTopRightRadius: FILL_RADIUS,
    borderBottomRightRadius: FILL_RADIUS,
    borderTopLeftRadius: radii.sm,
    borderBottomLeftRadius: radii.sm,
  },
  label: {
    marginTop: 2,
    fontSize: G.labelSize,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: G.labelTracking,
  },
});
