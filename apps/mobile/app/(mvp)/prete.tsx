/**
 * GRYD — LE DÉPART : préflight ET décompte, un seul écran (lot M4).
 *
 * ─── POURQUOI PAS DEUX ÉCRANS ───────────────────────────────────────────────
 * L3 : « deux taps max entre l'ouverture de l'app et le départ ». Ouvrir n'est
 * pas un tap — il n'en reste donc qu'UN, et c'est GO sur la carte. Un préflight
 * qui demanderait « confirmer » en consommerait un second : la loi serait violée
 * par un écran dont le seul rôle est de rassurer.
 *
 * Cet écran se déroule donc TOUT SEUL. Le seul geste qu'il offre est d'annuler.
 *
 * ─── LE SIGNAL EST UNE INFORMATION, PAS UNE PERMISSION ──────────────────────
 * Le décompte n'attend PAS le GPS. En ville, un premier point fiable peut
 * demander trente secondes — et quelqu'un qui a appuyé sur GO est déjà en train
 * de partir. Le retenir lui ferait perdre le début de sa trace, c'est-à-dire
 * précisément ce qui ferme la boucle. On part à l'heure, et on marque le départ
 * comme dégradé (`run_start_degraded`) pour savoir, plus tard, pourquoi
 * certaines traces sont mauvaises.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, fonts, fontSizes, spacing, EVENTS } from '@klaim/shared';
import { gpsGrade, isDegradedStart, isDone, remaining, type GpsGrade } from '../../src/mvp/run/countdown';
import { stopWatch } from '../../src/mvp/run/watch';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen, track } from '../../src/lib/analytics';

/** Cible tactile minimale (L4). */
const TOUCH_TARGET_PT = 44;

/** Pas du décompte, en ms. Une seconde ; l'affichage arrondit vers le bas. */
const TICK_MS = 200;

export default function Prete() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [ecoule, setEcoule] = useState(0);
  const [grade, setGrade] = useState<GpsGrade>('searching');
  // `ref` et pas `state` : il n'existe que pour empêcher un DOUBLE départ, et
  // le relire dans le même tick est justement ce qu'un état différé ne permet pas.
  const partiRef = useRef(false);

  useEffect(() => {
    screen('run_countdown');
  }, []);

  // Le signal, en continu — AFFICHÉ, jamais bloquant.
  useEffect(() => {
    let vivant = true;
    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }, (p) => {
      if (vivant) setGrade(gpsGrade(p.coords.accuracy));
    })
      .then((s) => {
        if (vivant) sub = s;
        else stopWatch(s);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
      stopWatch(sub);
    };
  }, []);

  // Le décompte. Mesuré sur l'horloge, pas compté en ticks : un `setInterval`
  // qui prend du retard (l'app passe en arrière-plan une seconde) décalerait le
  // départ d'autant.
  const debutRef = useRef<number | null>(null);
  useEffect(() => {
    debutRef.current = Date.now();
    const id = setInterval(() => {
      const debut = debutRef.current;
      if (debut === null) return;
      setEcoule((Date.now() - debut) / 1000);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const partir = useCallback(() => {
    if (partiRef.current) return;
    partiRef.current = true;
    track(EVENTS.runStart, { activity: 'run' });
    if (isDegradedStart(grade)) track(EVENTS.runStartDegraded, { grade });
    router.replace('/course');
  }, [grade]);

  useEffect(() => {
    if (isDone(ecoule)) partir();
  }, [ecoule, partir]);

  const restant = remaining(ecoule);
  const phraseGps =
    grade === 'good' ? t(C.gpsGood) : grade === 'weak' ? t(C.gpsWeak) : t(C.gpsSearching);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.centre}>
        {/* Le chiffre héros de cet écran (L12) — et il n'y en a qu'un. */}
        <Text style={styles.compte} accessibilityLiveRegion="polite">
          {restant}
        </Text>
        <Text style={styles.gps}>{phraseGps}</Text>
      </View>

      {/* Annuler est un TEXTE : le départ n'est pas une action à contrebalancer
          par un bouton de même poids (L2). Et il reste possible jusqu'au bout —
          un décompte dont on ne peut pas sortir est un piège, pas un départ. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaCancel)}
        onPress={() => router.back()}
        hitSlop={spacing.sm}
        style={styles.annuler}
      >
        <Text style={styles.annulerLabel}>{t(C.ctaCancel)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, paddingHorizontal: spacing.lg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  compte: { color: colors.chartreuse, fontFamily: fonts.display, fontSize: fontSizes.heroMax },
  gps: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  annuler: { minHeight: TOUCH_TARGET_PT, alignItems: 'center', justifyContent: 'center' },
  annulerLabel: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.sm },
});
