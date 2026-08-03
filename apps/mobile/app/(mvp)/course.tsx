/**
 * GRYD — LIVE RUN : ce qu'on lit à bout de souffle (lot M4).
 *
 * ─── L5 : CINQ INFORMATIONS MAXIMUM, ET ON EN MET TROIS ─────────────────────
 * Le chrono, la distance, l'état du signal. Rien d'autre. Cet écran se lit en
 * courant, à bout de souffle, dans une fraction de seconde — chaque élément
 * ajouté se paye sur la lisibilité des deux qui comptent.
 *
 * ─── CE QUI EST VRAI, ET CE QUI EST DÉCLARÉ MANQUANT ────────────────────────
 * Tout ce qui est affiché ici est MESURÉ : les points viennent du capteur, la
 * distance est leur somme, le chrono est une durée réelle. Rien n'est simulé.
 *
 * ⚠️ CE QUI N'EST PAS ENCORE LÀ, et qui est inscrit au BACKLOG plutôt que
 * maquillé :
 *   · la JAUGE DE FERMETURE (« il te manque 84 m ») — elle a besoin de
 *     `loopClosureVerdict`, qui vit dans `engine/hexing.ts` et importe h3-js :
 *     le faire tomber dans le bundle Expo est un arbitrage à part entière
 *     (SALVAGE le prévoit déjà pour `features/run/gps/**`), pas un raccourci ;
 *   · le NEVER-LOSE-A-RUN — la trace vit en mémoire. Une course perdue par un
 *     crash reste possible. C'est une faiblesse de robustesse DÉCLARÉE, pas un
 *     mensonge à l'écran : rien ici ne promet que la course est sauvegardée.
 * Tant que ces deux points ne sont pas faits, cet écran n'a pas passé son
 * `ux-gate` M5 et le groupe `(mvp)` reste sans porte d'entrée.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';
import { gpsGrade, type GpsGrade } from '../../src/mvp/run/countdown';
import { formatChrono, formatKm, traceDistanceM, type TracePoint } from '../../src/mvp/run/trace';
import { stopWatch } from '../../src/mvp/run/watch';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';

const TOUCH_TARGET_PT = 44;

/** Rafraîchissement du chrono. 500 ms : la seconde ne saute jamais. */
const TICK_MS = 500;

/** Le capteur, réglé pour une trace — pas pour une position ponctuelle. */
const SUIVI = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 5,
} as const;

export default function Course() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [grade, setGrade] = useState<GpsGrade>('searching');
  const [ecouleMs, setEcouleMs] = useState(0);
  const debutRef = useRef<number>(Date.now());

  useEffect(() => {
    screen('run_live');
  }, []);

  useEffect(() => {
    let vivant = true;
    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(SUIVI, (p) => {
      if (!vivant) return;
      setGrade(gpsGrade(p.coords.accuracy));
      setPoints((prev) => [
        ...prev,
        { lng: p.coords.longitude, lat: p.coords.latitude, t: p.timestamp },
      ]);
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

  useEffect(() => {
    const id = setInterval(() => setEcouleMs(Date.now() - debutRef.current), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const km = formatKm(traceDistanceM(points));
  const phraseGps =
    grade === 'good' ? t(C.gpsGood) : grade === 'weak' ? t(C.gpsWeak) : t(C.gpsSearching);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.centre}>
        {/* UN chiffre héros, toujours VRAI (L12).
            Avant le premier mètre, le héros est le CHRONO — parce qu'il est
            juste dès la première seconde, alors que la distance ne l'est pas.
            Un « 0,00 km » serait un zéro nu (interdit), et un tiret de 88 pt se
            lit comme une censure, pas comme une attente. Dès que la distance
            existe, elle prend la place et le chrono passe en second. */}
        {km !== null ? (
          <>
            <View style={styles.ligne}>
              <Text style={styles.hero}>{km}</Text>
              <Text style={styles.unite}>{t(C.unitKm)}</Text>
            </View>
            <Text style={styles.chrono}>{formatChrono(ecouleMs)}</Text>
          </>
        ) : (
          <Text style={styles.hero}>{formatChrono(ecouleMs)}</Text>
        )}
        <Text style={styles.gps}>{phraseGps}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaFinish)}
        onPress={() => router.replace('/carte')}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaLabel}>{t(C.ctaFinish)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, paddingHorizontal: spacing.lg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  ligne: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  hero: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.heroMax },
  unite: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xl },
  chrono: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xl },
  gps: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  cta: {
    minHeight: TOUCH_TARGET_PT,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ctaPressed: { backgroundColor: colors.chartreusePressed },
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
});
