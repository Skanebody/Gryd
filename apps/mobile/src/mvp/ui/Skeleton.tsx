/**
 * GRYD — SKELETON : la FORME du contenu à venir, jamais une valeur (L14).
 *
 * ─── POURQUOI DES BLOCS, ET PAS UNE PHRASE « CHARGEMENT… » ──────────────────
 * Une phrase dit « attends » sans rien montrer ; un skeleton dit « voilà où et
 * comment le contenu va apparaître ». C'est la différence entre L14
 * (« skeletons ; jamais de spinner bloquant ») réellement tenue et contournée
 * par un simple mot qui joue le même rôle qu'un sablier — rien ne bouge à
 * l'écran tant que la lecture n'a pas abouti, alors que L14 demande l'inverse :
 * une forme stable, qui annonce déjà la mise en page du contenu réel.
 *
 * ─── CE QU'IL NE FAIT JAMAIS (miroir de L19) ────────────────────────────────
 * Un skeleton n'écrit AUCUN chiffre, AUCUNE zone plausible : la FORME, jamais
 * la valeur. Deviner juste serait aussi malhonnête que deviner faux — les deux
 * affirment une chose que l'app ne sait pas encore. D'où des blocs opaques,
 * sans aucun texte à l'intérieur.
 *
 * ─── L15, DEUX FOIS ──────────────────────────────────────────────────────────
 * · REDUCE MOTION : le bloc reste visible mais STATIQUE — même vérification
 *   qu'à l'écran de résultat (`resultat.tsx`) : une lecture au montage, pas un
 *   abonnement, parce que personne ne bascule ce réglage pendant l'instant où
 *   un écran de chargement est ouvert.
 * · DÉCORATIF : `SkeletonGroup` porte `accessibilityElementsHidden` +
 *   `no-hide-descendants`, comme `TerritoryMark`. Un lecteur d'écran n'a rien à
 *   énumérer sur des rectangles vides — c'est à l'appelant de porter, à côté,
 *   l'annonce qui dit qu'une lecture est en cours (texte hors-écran ou
 *   `accessibilityLabel` sur le conteneur, jamais sur le skeleton lui-même).
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii } from '@klaim/shared';

/** Un aller de la pulsation — lent : c'est une attente, pas une alerte. */
const PULSE_MS = 900;
/** Bornes de l'opacité pulsée. Jamais 0 : un bloc qui disparaît se lirait comme un clignotement, pas une respiration. */
const OPACITY_LOW = 0.35;
const OPACITY_HIGH = 0.75;

/**
 * Un bloc pulsant aux dimensions du contenu qu'il annonce.
 *
 * `colors.carbone2` (surface ÉLEVÉE — `elevation.raised`) : sur `colors.noir`,
 * un aplat plus clair que le fond se lit comme un espace réservé. Plus sombre,
 * il se fondrait dans le fond et ne dirait plus rien.
 */
export function SkeletonBlock({
  width,
  height,
  radius = radii.sm,
  style,
}: {
  readonly width: number | `${number}%`;
  readonly height: number;
  readonly radius?: number;
  readonly style?: StyleProp<ViewStyle>;
}) {
  const opacite = useRef(new Animated.Value(OPACITY_HIGH)).current;

  useEffect(() => {
    let vivant = true;
    let boucle: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduit) => {
        if (!vivant) return;
        if (reduit) {
          // Bloc STATIQUE : la forme reste, seule la pulsation disparaît (L15).
          opacite.setValue(OPACITY_HIGH);
          return;
        }
        boucle = Animated.loop(
          Animated.sequence([
            Animated.timing(opacite, {
              toValue: OPACITY_LOW,
              duration: PULSE_MS,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacite, {
              toValue: OPACITY_HIGH,
              duration: PULSE_MS,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        );
        boucle.start();
      })
      // Inconnu → on préfère un bloc visible et immobile à une pulsation qu'on
      // n'a pas pu vérifier inoffensive.
      .catch(() => opacite.setValue(OPACITY_HIGH));
    return () => {
      vivant = false;
      boucle?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: radius, opacity: opacite }, style]}
    />
  );
}

/**
 * Regroupe des `SkeletonBlock` en une seule zone DÉCORATIVE (L15) : un lecteur
 * d'écran doit la traverser d'un coup, jamais énumérer des rectangles vides.
 * L'annonce du chargement (s'il en faut une) se porte sur le conteneur
 * APPELANT, pas ici — voir l'en-tête du fichier.
 */
export function SkeletonGroup({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.carbone2 },
});
