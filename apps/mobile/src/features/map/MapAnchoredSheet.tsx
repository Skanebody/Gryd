/**
 * GRYD — SHEET ANCRÉE de la Carte (planche E02) : « collée » au bas de l'écran,
 * juste AU-DESSUS de la barre d'onglets, pleine largeur, poignée visible,
 * TIRABLE au geste vers 52 % puis 90 % avec accrochage et retour élastique.
 *
 * POURQUOI UN NOUVEAU COMPOSANT plutôt que `ui/game/MapBottomSheet` :
 *   • celui-ci calcule ses paliers en fraction de SON CONTENEUR
 *     (`containerH * 0.85`), et ce conteneur s'arrêtait 152 px au-dessus du bord
 *     bas — l'« ouvert 85 % » mesurait 67 % d'écran, et les 29/52/90 % de la
 *     planche étaient hors d'atteinte. Ici la géométrie vient d'une fonction
 *     PURE calée sur la HAUTEUR D'ÉCRAN (`sheetSnap.ts`, testée en Deno) ;
 *   • sa poignée avait une zone de saisie de 18 pt (plancher a11y : 44) et un
 *     `accessibilityLabel` codé en dur en français, hors catalogue i18n ;
 *   • son tap CYCLAIT sur trois temps là où la planche demande une BASCULE.
 * `MapBottomSheet` reste intouché (composant partagé, hors périmètre de ce
 * chantier) — cette sheet-ci est celle de la Carte, et d'elle seule.
 *
 * CE QUI EST REPRIS À LA LETTRE de la grammaire éprouvée du repo : PanResponder
 * + `Animated` core (aucune dépendance ajoutée : ni gesture-handler ni
 * reanimated dans ce projet), VERROUILLAGE D'AXE (`|dy| > |dx|`) pour ne jamais
 * voler le pan/zoom de MapLibre, `translateY.setValue` au move (ZÉRO setState
 * par frame — sinon la caméra contrôlée se ré-applique par-dessus le geste),
 * spring au snap, et court-circuit `reduce motion`.
 *
 * DÉGRADATION WEB : sans gesture-handler, PanResponder passe par le système de
 * responders de react-native-web. Si le geste n'aboutit pas (souris, lecteur
 * d'écran, headless), le TAP sur la poignée reste un chemin garanti — le geste
 * n'est jamais le SEUL moyen d'ouvrir.
 *
 * PALIERS ADAPTÉS AU CONTENU : la sheet mesure son contenu réel et plafonne ses
 * paliers déployés dessus (`clampSheetToContent`). Tant que le bloc déployé tient
 * en 250 px, le palier 90 % est fusionné avec le 52 % — tirer jusque-là ne
 * révélerait que du carbone vide, ce qui se lit comme un écran cassé (§A). Le
 * premier palier déployé, lui, n'est jamais rogné : le geste reste franc.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gameColors, radii } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { useReduceMotion } from '../../ui/game/anim';
import { C } from '../../i18n/catalog/map';
import { useT } from '../../i18n/store';
import {
  clampSheetToContent,
  clampSheetY,
  releaseSheetStop,
  toggleSheetStop,
  SHEET_DRAG_THRESHOLD_PX,
  type MapSheetGeometry,
  type MapSheetStop,
} from './sheetSnap';

/**
 * Fraction du DERNIER trajet (avant-dernier palier → palier le plus ouvert) sur
 * laquelle le contenu déployé fond en entrée : opacité 0 tant que la sheet est
 * en deçà, 1 au palier le plus ouvert — pas de titre coupé net à mi-course.
 */
const EXPANDED_FADE_FRACTION = 0.5;
/** Plancher a11y de la zone de saisie de la poignée (jamais sous 44 pt). */
const HANDLE_HIT_HEIGHT = 44;

export interface MapAnchoredSheetProps {
  /** Paliers calculés en amont (fonction pure) — le parent les partage avec les FABs. */
  geometry: MapSheetGeometry;
  /** Contenu TOUJOURS visible : le peek honnête (inchangé par ce chantier). */
  peek: ReactNode;
  /**
   * Contenu révélé au déploiement. ABSENT ⇒ panneau FIXE : ni poignée ni geste.
   * Une poignée qui n'ouvrirait sur rien serait un contrôle mort (§ « aucun
   * bouton mort ») — et un vide de 300 px se lirait comme un écran cassé.
   */
  expanded?: ReactNode;
  /**
   * Notifié au MONTAGE puis à chaque palier ATTEINT (jamais par frame) : `stop`
   * et la hauteur VISIBLE correspondante. Le parent s'en sert pour publier la
   * géométrie (morph du bouton GO). La hauteur est passée parce que la sheet
   * peut avoir PLAFONNÉ ses paliers à son contenu réel — le parent ne peut pas
   * la recalculer seul.
   */
  onStopChange?: (stop: MapSheetStop, heightPx: number) => void;
  testID?: string;
}

export function MapAnchoredSheet({
  geometry: rawGeometry,
  peek,
  expanded,
  onStopChange,
  testID,
}: MapAnchoredSheetProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const t = useT();

  /**
   * Hauteur RÉELLE du contenu (peek + bloc déployé), mesurée une fois par le
   * ScrollView. Elle plafonne les paliers déployés : tant que le contenu tient
   * en 250 px, tirer jusqu'à 90 % ne révélerait que du carbone vide (§A).
   */
  const [contentH, setContentH] = useState(0);
  const geometry = useMemo(
    () => clampSheetToContent(rawGeometry, contentH > 0 ? contentH + HANDLE_HIT_HEIGHT : 0),
    [rawGeometry, contentH],
  );
  const draggable = expanded != null && geometry.stops.length > 1;

  const [stop, setStop] = useState<MapSheetStop>('compact');
  const stopRef = useRef<MapSheetStop>('compact');
  const translateY = useRef(new Animated.Value(geometry.offsets.compact)).current;
  /** Position réelle courante (`Animated.Value` n'est pas lisible de façon sync). */
  const currentY = useRef(geometry.offsets.compact);

  const snapTo = useCallback(
    (next: MapSheetStop, animate: boolean) => {
      const to = geometry.offsets[next];
      currentY.current = to;
      if (stopRef.current !== next) {
        stopRef.current = next;
        setStop(next);
        haptics.light();
      }
      if (!animate || reduce) {
        translateY.setValue(to); // reduce motion → snap direct, sans spring
        return;
      }
      Animated.spring(translateY, {
        toValue: to,
        friction: 9,
        tension: 90,
        useNativeDriver: true,
      }).start();
    },
    [geometry, reduce, translateY],
  );

  // (Re)cale la sheet quand la géométrie change (rotation, safe area, hauteur de
  // peek qui suit l'état honnête affiché, plafonnement au contenu mesuré) — sans
  // animation : ce n'est pas un geste de l'utilisateur, c'est une remise à
  // l'échelle. Un palier disparu (fusionné) retombe sur le compact.
  useEffect(() => {
    if (!geometry.stops.includes(stopRef.current)) {
      stopRef.current = 'compact';
      setStop('compact');
    }
    const to = geometry.offsets[stopRef.current];
    currentY.current = to;
    translateY.setValue(to);
  }, [geometry, translateY]);

  /**
   * PUBLICATION de l'état vers le parent — au montage ET à chaque palier atteint,
   * jamais par frame (publier la position du doigt re-rendrait MapScreen 60 fois
   * par seconde, et la caméra MapLibre se ré-appliquerait par-dessus le geste).
   * Callback lu via un ref : le parent peut la redéfinir à chaque rendu sans
   * relancer cet effet.
   */
  const onStopChangeRef = useRef(onStopChange);
  onStopChangeRef.current = onStopChange;
  useEffect(() => {
    onStopChangeRef.current?.(stop, geometry.heights[stop]);
  }, [stop, geometry]);

  const clamp = useCallback((y: number) => clampSheetY(y, geometry), [geometry]);

  /**
   * Palier le plus OUVERT réellement disponible. Ce n'est PAS toujours `open` :
   * quand le contenu ne remplit pas les 90 %, ce palier est fusionné avec le
   * 52 % (cf. `clampSheetToContent`). Tout ce qui décrivait « l'état ouvert »
   * (scroll, taps du contenu déployé, fin du fondu) se lit donc ici — sinon le
   * bloc déployé resterait inerte sur une sheet à deux paliers.
   */
  const topStop = geometry.stops[geometry.stops.length - 1] ?? 'compact';
  const atTop = stop === topStop;

  /** Opacité du contenu déployé, pilotée par translateY (interpolation pure). */
  const expandedOpacity = useMemo(() => {
    const stops = geometry.stops;
    const top = stops[stops.length - 1] ?? 'compact';
    const below = stops[stops.length - 2] ?? 'compact';
    const span = geometry.offsets[below] - geometry.offsets[top];
    if (span <= 0) return 1; // un seul palier : rien à faire fondre
    return translateY.interpolate({
      inputRange: [
        geometry.offsets[top],
        geometry.offsets[top] + span * EXPANDED_FADE_FRACTION,
        geometry.offsets[below],
      ],
      outputRange: [1, 0, 0],
      extrapolate: 'clamp',
    });
  }, [geometry, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // VERROUILLAGE D'AXE : un pan horizontal (carte) n'est jamais volé.
        onMoveShouldSetPanResponder: (_evt, g) =>
          Math.abs(g.dy) > SHEET_DRAG_THRESHOLD_PX && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => translateY.stopAnimation((v) => (currentY.current = v)),
        // `setValue`, JAMAIS `setState` : zéro re-rendu par frame (la caméra
        // MapLibre se ré-appliquerait par-dessus le geste).
        onPanResponderMove: (_evt, g) => translateY.setValue(clamp(currentY.current + g.dy)),
        onPanResponderRelease: (_evt, g) => {
          const y = clamp(currentY.current + g.dy);
          currentY.current = y;
          snapTo(releaseSheetStop(y, g.vy, geometry), true);
        },
        // Geste interrompu (appel, autre responder) : retour élastique au palier.
        onPanResponderTerminate: () => snapTo(stopRef.current, true),
      }),
    [clamp, geometry, snapTo, translateY],
  );

  /** Tap sur la poignée : BASCULE compact ⇄ déployé (chemin non gestuel garanti). */
  const toggle = () => snapTo(toggleSheetStop(stopRef.current, geometry), true);

  return (
    <View style={styles.container} pointerEvents="box-none" testID={testID}>
      <Animated.View
        style={[styles.sheet, { height: geometry.sheetH, transform: [{ translateY }] }]}
        // Tant que la sheet n'est pas à son palier le plus ouvert, TOUTE sa
        // surface se laisse glisser ; au palier le plus ouvert le contenu
        // appartient au ScrollView et seule la poignée referme.
        {...(draggable && !atTop ? panResponder.panHandlers : {})}
      >
        {draggable ? (
          <View {...panResponder.panHandlers}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: stop !== 'compact' }}
              accessibilityLabel={t(
                stop === 'compact' ? C.sheetHandleOpenA11y : C.sheetHandleCloseA11y,
              )}
              onPress={toggle}
              style={styles.handleZone}
              testID="map-sheet-handle"
            >
              {/* Poignée VISIBLE (planche E02) dans une zone de saisie de 44 pt. */}
              <View style={styles.handle} />
            </Pressable>
          </View>
        ) : (
          // Panneau fixe : pas de poignée, mais le même dégagement haut pour que
          // le contenu ne colle pas au bord arrondi.
          <View style={styles.fixedTopGap} />
        )}
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          // Mesure du contenu réel → plafonne les paliers déployés (cf. plus haut).
          onContentSizeChange={(_w, h) => setContentH(h)}
          scrollEnabled={atTop}
          bounces={false}
          showsVerticalScrollIndicator={atTop}
        >
          {peek}
          {expanded ? (
            <Animated.View
              style={{ opacity: expandedOpacity }}
              pointerEvents={atTop ? 'auto' : 'none'}
            >
              {expanded}
            </Animated.View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: gameColors.carbon,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
    overflow: 'hidden',
  },
  content: { flex: 1 },
  // Zone de GRAB : 44 pt de haut (plancher a11y), poignée centrée dedans.
  handleZone: { height: HANDLE_HIT_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.gris,
    opacity: 0.5,
  },
  fixedTopGap: { height: 14 },
});
